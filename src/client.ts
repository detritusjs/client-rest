import * as os from 'os';
import { URL } from 'url';

import {
  Client as RestClient,
  ClientOptions as RestClientOptions,
  Response,
  createHeaders,
} from 'detritus-rest';
import { ContentTypes, HTTPHeaders } from 'detritus-rest/lib/constants';
import { BaseCollection, EventSpewer } from 'detritus-utils';

import { Bucket } from './bucket';
import { BucketCollection } from './bucketcollection';
import {
  bufferToBase64,
  Types as VerifyTypes,
  verifyData,
} from './clientsidechecks';
import {
  AuthTypes,
  DiscordHeaders,
  HTTPMethods,
  Package,
  RestEvents,
  SPOILER_ATTACHMENT_PREFIX,
} from './constants';
import { Api } from './endpoints';
import { RestRequest } from './request';
import { spoilerfy } from './utils';

import { RequestTypes, ResponseTypes, RestClientEvents } from './types';


const defaultHeaders: Record<string, string> = {
  [HTTPHeaders.USER_AGENT]: [
    'DiscordBot',
    `(${Package.URL}, v${Package.VERSION})`,
    `(${os.type()} ${os.release()}; ${os.arch()})`,
    process.version.replace(/^v/, (process.release.name || 'node') + '/'),
  ].join(' '),
};

defaultHeaders[DiscordHeaders.SUPER_PROPERTIES] = Buffer.from(
  JSON.stringify({
    browser: process.release.name || 'node',
    browser_user_agent: defaultHeaders[HTTPHeaders.USER_AGENT],
    browser_version: process.version,
    device: 'Detritus',
    os: os.type(),
    os_arch: os.arch(),
    os_version: os.release(),
  })
).toString('base64');


const requestDefaults = {
  dataOnly: true,
  skipRatelimitCheck: false,
};

export interface ClientOptions extends RestClientOptions {
  authType?: AuthTypes | string,
  bucketsExpireIn?: number,
  clientsideChecks?: boolean,
  errorOnRatelimit?: boolean,
  fingerprint?: string,
  globalBucket?: Bucket,
  routesCollection?: BaseCollection<string, string>,
}

export class Client extends EventSpewer {
  readonly buckets: BucketCollection;
  readonly routes: BaseCollection<string, string>;

  authType: AuthTypes = AuthTypes.BOT;
  clientsideChecks: boolean = true;
  errorOnRatelimit: boolean = false;
  fingerprint?: string;
  globalBucket: Bucket;
  restClient: RestClient;
  token?: string;

  constructor(token?: string, options?: ClientOptions) {
    super();

    options = Object.assign({
      baseUrl: Api.URL_STABLE + Api.PATH,
      bucketsExpireIn: (60 * 60) * 1000, // 1 hour
      errorOnRatelimit: false,
    }, options);

    options.headers = createHeaders(options.headers);
    if (!options.headers.has(HTTPHeaders.USER_AGENT)) {
      options.headers.set(HTTPHeaders.USER_AGENT, defaultHeaders[HTTPHeaders.USER_AGENT]);
    }
    this.restClient = new RestClient(options);

    this.buckets = new BucketCollection({expire: options.bucketsExpireIn});
    this.clientsideChecks = !!(options.clientsideChecks || options.clientsideChecks === undefined);
    this.errorOnRatelimit = !!options.errorOnRatelimit;
    this.fingerprint = options.fingerprint,
    this.globalBucket = options.globalBucket || new Bucket('global');
    this.routes = options.routesCollection || new BaseCollection<string, string>();
    this.token = token;

    Object.defineProperties(this, {
      restClient: {enumerable: false, writable: false},
      token: {enumerable: false, writable: false},
    });

    if (options.authType !== undefined) {
      this.setAuthType(options.authType);
    }
  }

  get authTypeText(): string {
    switch (this.authType) {
      case AuthTypes.BEARER: return 'Bearer';
      case AuthTypes.BOT: return 'Bot';
    }
    return '';
  }

  get isBearer(): boolean {
    return this.authType === AuthTypes.BEARER;
  }

  get isBot(): boolean {
    return this.authType === AuthTypes.BOT;
  }

  get isUser(): boolean {
    return this.authType === AuthTypes.USER;
  }

  get tokenFormatted(): string {
    if (this.token) {
      const prepend = this.authTypeText;
      if (prepend) {
        return `${prepend} ${this.token}`;
      }
      return this.token;
    }
    return '';
  }

  setAuthType(type: AuthTypes | string): void {
    if (typeof(type) === 'string') {
      type = type.toUpperCase();
    }
    for (let key in AuthTypes) {
      if (key === type) {
        this.authType = key as AuthTypes;
        break;
      }
    }
  }

  async request(
    info: RequestTypes.Options | string | URL,
    init?: RequestTypes.Options,
  ): Promise<any> {
    if (typeof(info) !== 'string' && !(info instanceof URL)) {
      init = Object.assign({
        errorOnRatelimit: this.errorOnRatelimit,
      }, requestDefaults, info, init);
    } else {
      init = Object.assign({
        errorOnRatelimit: this.errorOnRatelimit,
      }, requestDefaults, init);
    }

    const request = await this.restClient.createRequest(info, init);
    if (
      (this.restClient.baseUrl instanceof URL) &&
      (this.restClient.baseUrl.host === request.parsedUrl.host)
    ) {
      if (!request.headers.has(DiscordHeaders.SUPER_PROPERTIES)) {
        request.headers.set(DiscordHeaders.SUPER_PROPERTIES, defaultHeaders[DiscordHeaders.SUPER_PROPERTIES]);
      }

      if (init.useAuth || init.useAuth === undefined) {
        if (this.token) {
          request.headers.set('authorization', this.tokenFormatted);
        } else if (this.fingerprint) {
          request.headers.set(DiscordHeaders.FINGERPRINT, this.fingerprint);
        }
      }
    }

    if (init.fingerprint) {
      request.headers.set(DiscordHeaders.FINGERPRINT, init.fingerprint);
    }

    if (init.token) {
      request.headers.set('authorization', init.token);
    }

    let response: Response;
    const restRequest = new RestRequest(this, request, init);
    this.emit(RestEvents.REQUEST, {request, restRequest: restRequest});

    if (restRequest.shouldRatelimitCheck && !init.errorOnRatelimit) {
      response = await new Promise((resolve, reject) => {
        const delayed = {request: restRequest, resolve, reject};
        if (this.globalBucket.locked) {
          this.globalBucket.add(delayed);
        } else {
          const bucket = restRequest.bucket;
          if (bucket) {
            bucket.add(delayed);
            this.buckets.resetExpire(bucket);
          } else {
            resolve(restRequest.send());
          }
        }
      });
    } else {
      response = await restRequest.send();
    }

    if (init.dataOnly) {
      switch (response.headers.get(HTTPHeaders.CONTENT_TYPE)) {
        case ContentTypes.APPLICATION_JSON: {
          return response.json();
        };
        case ContentTypes.TEXT_PLAIN: {
          return response.text();
        };
      }
      return response.buffer();
    } else {
      return response;
    }
  }

  async delete(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.DELETE});
    return this.request(info, init);
  }

  async get(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.GET});
    return this.request(info, init);
  }

  async head(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.HEAD});
    return this.request(info, init);
  }

  async options(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.OPTIONS});
    return this.request(info, init);
  }

  async patch(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.PATCH});
    return this.request(info, init);
  }

  async post(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.POST});
    return this.request(info, init);
  }

  async put(
    info: string | URL | RequestTypes.Options,
    init?: RequestTypes.Options,
  ): Promise<Response> {
    init = Object.assign({}, init, {method: HTTPMethods.PUT});
    return this.request(info, init);
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this;
  on(event: 'request', listener: (payload: RestClientEvents.RequestPayload) => any): this;
  on(event: 'response', listener: (payload: RestClientEvents.ResponsePayload) => any): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  /* -- Rest Requests Start -- */

  async acceptAgreements(
    privacy: boolean = true,
    terms: boolean = true,
  ): Promise<any> {
    return this.request({
      body: {privacy, terms},
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME_AGREEMENTS,
      },
    });
  }

  async acceptInvite(code: string): Promise<any> {
    const params = {code};
    if (this.clientsideChecks) {
      verifyData(params, {
        code: {required: true, type: VerifyTypes.STRING},
      });
    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.INVITE,
        params,
      },
    });
  }

  async acceptTeamInvite(token: string): Promise<any> {
    const body = {token};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.TEAMS_INVITE_ACCEPT,
      },
    });
  }

  async acceptTemplate(templateId: string, options: RequestTypes.AcceptTemplate): Promise<any> {
    const body = {
      icon: bufferToBase64(options.icon),
      name: options.name,
    };
    const params = {templateId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILDS_TEMPLATE,
        params,
      },
    });
  }

  async ackChannelMessage(
    channelId: string,
    messageId: string,
    token: string,
  ): Promise<any> {
    const body = {token};
    const params = {channelId, messageId};
    if (this.clientsideChecks) {
      verifyData(body, {
        token: {required: true, type: VerifyTypes.STRING},
      });
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
        messageId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGE_ACK,
        params,
      },
    });
  }

  async ackChannelPins(channelId: string): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_PINS_ACK,
        params,
      },
    });
  }

  async ackGuild(guildId: string): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {
      verifyData(params, {
        guildId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_ACK,
        params,
      },
    });
  }

  async activateOauth2ApplicationLicense(
    applicationId: string,
    options: RequestTypes.ActivateOauth2ApplicationLicense,
  ): Promise<any> {
    const body = {
      code: options.code,
      guild_id: options.guildId,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_ACTIVATE_LICENSE,
        params,
      },
    });
  }

  async addConnection(
    platform: string,
    accountId: string,
    options: RequestTypes.AddConnection,
  ): Promise<any> {
    const body = {
      name: options.name,
      friend_sync: !!options.friendSync,
    };
    const params = {platform, accountId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.ME_CONNECTION,
        params,
      },
    });
  }

  async addGuildMember(
    guildId: string,
    userId: string,
    options: RequestTypes.AddGuildMember,
  ): Promise<any> {
    const body = {
      access_token: options.accessToken,
      deaf: options.deaf,
      mute: options.mute,
      nick: options.nick,
      roles: options.roles,
    };
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async addGuildMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    options: RequestTypes.AddGuildMemberRole = {},
  ): Promise<any> {
    const params = {guildId, userId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PUT,
        path: Api.GUILD_MEMBER_ROLE,
        params,
      },
    });
  }

  async addThreadMember(
    channelId: string,
    userId: string,
  ): Promise<any> {
    const params = {channelId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_THREAD_MEMBER,
        params,
      },
    });
  }

  async addPinnedMessage(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_PIN,
        params,
      },
    });
  }

  async addRecipient(
    channelId: string,
    userId: string,
  ): Promise<any> {
    const params = {channelId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_RECIPIENT,
        params,
      },
    });
  }

  async addOauth2ApplicationWhitelistUser(
    applicationId: string,
    options: RequestTypes.AddOauth2ApplicationWhitelistUser,
  ): Promise<any> {
    const body = {
      branch_ids: options.branchIds,
      discriminator: options.discriminator,
      username: options.username,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_WHITELIST,
        params,
      },
    });
  }

  async addTeamMember(
    teamId: string,
    options: RequestTypes.AddTeamMember,
  ): Promise<any> {
    const body = {
      discriminator: options.discriminator,
      username: options.username,
    };
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.TEAM_MEMBERS,
        params,
      },
    });
  }

  async authorizeIpAddress(
    options: RequestTypes.AuthorizeIpAddress,
  ): Promise<any> {
    const body = {
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_AUTHORIZE_IP,
      },
    });
  }

  async beginGuildPrune(
    guildId: string,
    options: RequestTypes.BeginGuildPrune = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      compute_prune_count: options.computePruneCount,
      days: options.days,
      include_roles: options.includeRoles,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      query,
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_PRUNE,
        params,
      },
    });
  }

  async bulkDeleteMessages(
    channelId: string,
    messageIds: Array<string>,
  ): Promise<any> {
    const body = {messages: messageIds};
    const params = {channelId};
    if (this.clientsideChecks) {
      if (body.messages.length < 2 || 100 < body.messages.length) {
        throw new Error('Message Ids amount needs to be between 2 and 100');
      }
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGES_BULK_DELETE,
        params,
      },
    });
  }

  async bulkOverwriteApplicationCommands(
    applicationId: string,
    commands: Array<RequestTypes.CreateApplicationCommand | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData>>,
  ): Promise<any> {
    const params = {applicationId};
    const body = commands.map((options) => {
      if ('toJSON' in options) {
        return options;
      }
      return {
        default_permission: options.defaultPermission,
        description: options.description,
        id: options.id,
        name: options.name,
        options: options.options,
      };
    });
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.APPLICATION_COMMANDS,
        params,
      },
    });
  }

  async bulkOverwriteApplicationGuildCommands(
    applicationId: string,
    guildId: string,
    commands: Array<RequestTypes.CreateApplicationGuildCommand | RequestTypes.toJSON<RequestTypes.CreateApplicationGuildCommandData>>,
  ): Promise<any> {
    const params = {applicationId, guildId};
    const body = commands.map((options) => {
      if ('toJSON' in options) {
        return options;
      }
      return {
        default_permission: options.defaultPermission,
        description: options.description,
        id: options.id,
        name: options.name,
        options: options.options,
      };
    });
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.APPLICATION_GUILD_COMMANDS,
        params,
      },
    });
  }

  async bulkOverwriteApplicationGuildCommandsPermissions(
    applicationId: string,
    guildId: string,
    permissions: RequestTypes.BulkOverwriteApplicationGuildCommandsPermissions,
  ): Promise<any> {
    const params = {applicationId, guildId};
    const body = permissions.map((command) => {
      return {
        id: command.id,
        permissions: command.permissions.map((permission) => {
          return {
            id: permission.id,
            permission: permission.permission,
            type: permission.type,
          };
        }),
      };
    });
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.APPLICATION_GUILD_COMMANDS_PERMISSIONS,
        params,
      },
    });
  }

  async connectionCallback(
    platform: string,
    options: RequestTypes.ConnectionCallback,
  ): Promise<any> {
    const body = {
      code: options.code,
      friend_sync: !!options.friendSync,
      from_continuation: !!options.fromContinuation,
      insecure: !!options.insecure,
      openid_params: options.openIdParams,
      state: options.state,
    };
    const params = {platform};
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CONNECTION_CALLBACK,
        params,
      },
    });
  }


  async createApplicationCommand(
    applicationId: string,
    options: RequestTypes.CreateApplicationCommand | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData>,
  ): Promise<any> {
    const params = {applicationId};
    let body: RequestTypes.CreateApplicationCommandData | RequestTypes.toJSON<RequestTypes.CreateApplicationCommandData>;
    if ('toJSON' in options) {
      body = options;
    } else {
      body = {
        default_permission: options.defaultPermission,
        description: options.description,
        name: options.name,
        options: options.options,
      };
    }
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.APPLICATION_COMMANDS,
        params,
      },
    });
  }

  async createApplicationGuildCommand(
    applicationId: string,
    guildId: string,
    options: RequestTypes.CreateApplicationGuildCommand | RequestTypes.toJSON<RequestTypes.CreateApplicationGuildCommandData>,
  ): Promise<any> {
    const params = {applicationId, guildId};
    let body: RequestTypes.CreateApplicationGuildCommandData | RequestTypes.toJSON<RequestTypes.CreateApplicationGuildCommandData>;
    if ('toJSON' in options) {
      body = options;
    } else {
      body = {
        default_permission: options.defaultPermission,
        description: options.description,
        name: options.name,
        options: options.options,
      };
    }
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.APPLICATION_GUILD_COMMANDS,
        params,
      },
    });
  }

  async createApplicationNews(
    options: RequestTypes.CreateApplicationNews,
  ): Promise<any> {
    const body = {
      application_id: options.applicationId,
      channel_id: options.channelId,
      description: options.description,
      message_id: options.messageId,
      thumbnail_override: bufferToBase64(options.thumbnailOverride),
      title: options.title,
      url: options.url,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.APPLICATION_NEWS,
      },
    });
  }

  async createChannelInvite(
    channelId: string,
    options: RequestTypes.CreateChannelInvite = {},
  ): Promise<any> {
    const body = {
      max_age: options.maxAge,
      max_uses: options.maxUses,
      target_application_id: options.targetApplicationId,
      target_type: options.targetType,
      target_user_id: options.targetUserId,
      temporary: options.temporary,
      unique: options.unique,
    };
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_INVITES,
        params,
      },
    });
  }

  async createChannelMessageThread(
    channelId: string,
    messageId: string,
    options: RequestTypes.CreateChannelMessageThread,
  ): Promise<any> {
    const body = {
      auto_archive_duration: options.autoArchiveDuration,
      name: options.name,
    };
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGE_THREADS,
        params,
      },
    });
  }

  async createChannelStoreListingGrantEntitlement(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_STORE_LISTING_ENTITLEMENT_GRANT,
        params,
      },
    });
  }

  async createChannelThread(
    channelId: string,
    options: RequestTypes.CreateChannelThread,
  ): Promise<any> {
    const body = {
      auto_archive_duration: options.autoArchiveDuration,
      name: options.name,
    };
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_THREADS,
        params,
      },
    });
  }

  async createDm(
    options: RequestTypes.CreateDm = {},
  ): Promise<any> {
    const body = {
      recipient_id: options.recipientId,
      recipients: options.recipients,
    };
    if (this.clientsideChecks) {
      // both cannot be empty
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_CHANNELS,
      },
    });
  }

  async createGuild(
    options: RequestTypes.CreateGuild,
  ): Promise<any> {
    const body = {
      afk_channel_id: options.afkChannelId,
      afk_timeout: options.afkTimeout,
      channels: options.channels,
      default_message_notifications: options.defaultMessageNotifications,
      explicit_content_filter: options.explicitContentFilter,
      icon: bufferToBase64(options.icon),
      name: options.name,
      region: options.region,
      roles: options.roles,
      system_channel_flags: options.systemChannelFlags,
      system_channel_id: options.systemChannelId,
      verification_level: options.verificationLevel,
    };

    if (this.clientsideChecks) {
      // verify channel and roles
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILDS,
      },
    });
  }

  async createGuildBan(
    guildId: string,
    userId: string,
    options: RequestTypes.CreateGuildBan = {},
  ): Promise<any> {
    const params = {guildId, userId};
    const query = {
      delete_message_days: options.deleteMessageDays,
      reason: options.reason,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.PUT,
        path: Api.GUILD_BAN,
        params,
      },
    });
  }

  async createGuildChannel(
    guildId: string,
    options: RequestTypes.CreateGuildChannel,
  ): Promise<any> {
    const body = {
      branch_id: options.branchId,
      bitrate: options.bitrate,
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites,
      sku_id: options.skuId,
      topic: options.topic,
      type: options.type,
      user_limit: options.userLimit,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_CHANNELS,
        params,
      },
    });
  }

  async createGuildEmoji(
    guildId: string,
    options: RequestTypes.CreateGuildEmoji,
  ): Promise<any> {
    const body = {
      name: options.name,
      image: bufferToBase64(options.image),
      roles: options.roles,
    };
    const params = {guildId};

    if (this.clientsideChecks) {
      // 256kb limit
    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_EMOJIS,
        params,
      },
    });
  }

  async createGuildIntegration(
    guildId: string,
    options: RequestTypes.CreateGuildIntegration,
  ): Promise<any> {
    const body = {
      id: options.id,
      type: options.type,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_INTEGRATIONS,
        params,
      },
    });
  }

  async createGuildRole(
    guildId: string,
    options: RequestTypes.CreateGuildRole = {},
  ): Promise<any> {
    const body = {
      color: options.color,
      hoist: options.hoist,
      mentionable: options.mentionable,
      name: options.name,
      permissions: options.permissions,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_ROLES,
        params,
      },
    })
  }

  async createGuildTemplate(
    guildId: string,
    options: RequestTypes.CreateGuildTemplate,
  ): Promise<any> {
    const body = {
      description: options.description,
      name: options.name,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_TEMPLATES,
        params,
      },
    });
  }

  async createInteractionResponse(
    interactionId: string,
    token: string,
    optionsOrType: RequestTypes.CreateInteractionResponse | number,
    innerData?: RequestTypes.CreateInteractionResponseInnerPayload | string,
  ): Promise<any> {
    let options: RequestTypes.CreateInteractionResponse;
    if (typeof(optionsOrType) === 'number') {
      options = {type: optionsOrType};
    } else {
      options = optionsOrType;
    }
    if (innerData) {
      if (typeof(innerData) === 'string') {
        innerData = {content: innerData};
      }
      options.data = (options.data) ? Object.assign(options.data, innerData) : innerData;
    }

    const body: RequestTypes.CreateInteractionResponseData = {
      type: options.type,
    };
    const params = {interactionId, token};

    const files: Array<RequestTypes.File> = [];
    if (options.data) {
      const { data } = options;
      body.data = {
        content: data.content,
        flags: data.flags,
        tts: data.tts,
      };

      if (data.allowedMentions && typeof(data.allowedMentions) === 'object') {
        body.data.allowed_mentions = {
          parse: data.allowedMentions.parse,
          roles: data.allowedMentions.roles,
          users: data.allowedMentions.users,
        };
      }

      if (data.components && typeof(data.components) === 'object') {
        body.data.components = data.components.map((component) => {
          if ('toJSON' in component) {
            return component;
          }
          return {
            components: component.components && component.components.map((child) => {
              if ('toJSON' in child) {
                return child;
              }
              return {
                custom_id: child.customId,
                disabled: child.disabled,
                emoji: child.emoji,
                label: child.label,
                max_values: child.maxValues,
                min_values: child.minValues,
                options: child.options,
                placeholder: child.placeholder,
                style: child.style,
                type: child.type,
                url: child.url,
              };
            }),
            custom_id: component.customId,
            disabled: component.disabled,
            emoji: component.emoji,
            label: component.label,
            max_values: component.maxValues,
            min_values: component.minValues,
            options: component.options,
            placeholder: component.placeholder,
            style: component.style,
            type: component.type,
            url: component.url,
          };
        });
      }

      if (data.embed !== undefined) {
        if (data.embed) {
          if (data.embeds) {
            data.embeds = [data.embed, ...data.embeds];
          } else {
            data.embeds = [data.embed];
          }
        } else if (!data.embeds) {
          data.embeds = [];
        }
      }
      if (data.embeds && data.embeds.length) {
        body.data.embeds = data.embeds.map((embed) => {
          if ('toJSON' in embed) {
            return embed;
          }
          const raw = Object.assign({}, embed) as RequestTypes.RawChannelMessageEmbed;
          if (typeof(embed.author) === 'object') {
            raw.author = {
              name: embed.author.name,
              url: embed.author.url,
              icon_url: embed.author.iconUrl,
            };
          }
          if (typeof(embed.footer) === 'object') {
            raw.footer = {
              text: embed.footer.text,
              icon_url: embed.footer.iconUrl,
            };
          }
          return raw;
        });
      }

      if (data.file) {
        files.push(data.file);
      }
      if (data.files && data.files.length) {
        for (let file of data.files) {
          if (file.hasSpoiler) {
            spoilerfy(file);
          }
          files.push(file);
        }
      }
      if (data.hasSpoiler) {
        for (let file of files) {
          spoilerfy(file);
        }
      }
    }

    return this.request({
      body,
      files,
      route: {
        method: HTTPMethods.POST,
        path: Api.INTERACTION_CALLBACK,
        params,
      },
      useAuth: false,
    });
  }

  async createLobby(
    applicationId: string,
    options: RequestTypes.CreateLobby = {},
  ): Promise<any> {
    const body = {
      application_id: applicationId,
      capacity: options.capacity,
      locked: options.locked,
      metadata: options.metadata,
      owner_id: options.ownerId,
      type: options.type,
    };
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.LOBBIES,
      },
    });
  }

  async createMeBillingPaymentSource(
    options: RequestTypes.CreateMeBillingPaymentSource,
  ): Promise<any> {
    const body = {
      billing_address: {
        city: options.billingAddress.city,
        country: options.billingAddress.country,
        line_1: options.billingAddress.line1,
        line_2: options.billingAddress.line2,
        name: options.billingAddress.name,
        postal_code: options.billingAddress.postalCode,
        state: options.billingAddress.state,
      },
      payment_gateway: options.paymentGateway,
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_BILLING_PAYMENT_SOURCES,
      },
    });
  }

  async createMeBillingSubscription(
    options: RequestTypes.CreateMeBillingSubscription,
  ): Promise<any> {
    const body = {
      payment_gateway_plan_id: options.paymentGatewayPlanId,
      payment_source_id: options.paymentSourceId,
      trial_id: options.trialId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_BILLING_SUBSCRIPTIONS,
      },
    });
  }

  async createMessage(
    channelId: string,
    options: RequestTypes.CreateMessage | string = {},
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = {content: options};
    }
    const body: RequestTypes.CreateMessageData = {
      application_id: options.applicationId,
      content: options.content,
      nonce: options.nonce,
      sticker_ids: options.stickerIds,
      tts: options.tts,
    };

    if (options.activity && typeof(options.activity) === 'object') {
      body.activity = {
        party_id: options.activity.partyId,
        session_id: options.activity.sessionId,
        type: options.activity.type,
      };
    }
    if (options.allowedMentions && typeof(options.allowedMentions) === 'object') {
      body.allowed_mentions = {
        parse: options.allowedMentions.parse,
        replied_user: options.allowedMentions.repliedUser,
        roles: options.allowedMentions.roles,
        users: options.allowedMentions.users,
      };
    }
    if (options.components && typeof(options.components) === 'object') {
      body.components = options.components.map((component) => {
        if ('toJSON' in component) {
          return component;
        }
        return {
          components: component.components && component.components.map((child) => {
            if ('toJSON' in child) {
              return child;
            }
            return {
              custom_id: child.customId,
              disabled: child.disabled,
              emoji: child.emoji,
              label: child.label,
              max_values: child.maxValues,
              min_values: child.minValues,
              options: child.options,
              placeholder: child.placeholder,
              style: child.style,
              type: child.type,
              url: child.url,
            };
          }),
          custom_id: component.customId,
          disabled: component.disabled,
          emoji: component.emoji,
          label: component.label,
          max_values: component.maxValues,
          min_values: component.minValues,
          options: component.options,
          placeholder: component.placeholder,
          style: component.style,
          type: component.type,
          url: component.url,
        };
      });
    }
    if (options.embed && typeof(options.embed) === 'object') {
      if ('toJSON' in options.embed) {
        body.embed = options.embed;
      } else {
        body.embed = Object.assign({}, options.embed);
        if (typeof(options.embed.author) === 'object') {
          body.embed.author = {
            name: options.embed.author.name,
            url: options.embed.author.url,
            icon_url: options.embed.author.iconUrl,
          };
        }
        if (typeof(options.embed.footer) === 'object') {
          body.embed.footer = {
            text: options.embed.footer.text,
            icon_url: options.embed.footer.iconUrl,
          };
        }
      }
    }
    if (options.messageReference && typeof(options.messageReference) === 'object') {
      body.message_reference = {
        channel_id: options.messageReference.channelId,
        fail_if_not_exists: options.messageReference.failIfNotExists,
        guild_id: options.messageReference.guildId,
        message_id: options.messageReference.messageId,
      };
    }

    const files: Array<RequestTypes.File> = [];
    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        if (file.hasSpoiler) {
          spoilerfy(file);
        }
        files.push(file);
      }
    }
    if (options.hasSpoiler) {
      for (let file of files) {
        spoilerfy(file);
      }
    }

    const params = {channelId};
    if (this.clientsideChecks) {
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
      verifyData(body, {
        activity: {type: VerifyTypes.OBJECT},
        allowed_mentions: {type: VerifyTypes.OBJECT},
        application_id: {type: VerifyTypes.SNOWFLAKE},
        content: {type: VerifyTypes.STRING},
        embed: {type: VerifyTypes.OBJECT},
        message_reference: {type: VerifyTypes.OBJECT},
        nonce: {type: VerifyTypes.STRING},
        sticker_ids: {type: VerifyTypes.ARRAY},
        tts: {type: VerifyTypes.BOOLEAN},
      });
      if ('activity' in body) {
        verifyData(<Record<string, string>> body.activity, {
          party_id: {type: VerifyTypes.STRING},
          session_id: {type: VerifyTypes.STRING},
          type: {type: VerifyTypes.NUMBER},
        });
      }
      if ('message_reference' in body) {
        verifyData(<Record<string, any>> body.message_reference, {
          channel_id: {type: VerifyTypes.STRING},
          fail_if_not_exists: {type: VerifyTypes.BOOLEAN},
          guild_id: {type: VerifyTypes.STRING},
          message_id: {type: VerifyTypes.STRING},
        });
      }
    }

    if (
      !('activity' in body) &&
      !('content' in body) &&
      !('embed' in body) &&
      !('sticker_ids' in body) &&
      !files.length
    ) {
      throw new Error('Cannot send an empty message.');
    }

    return this.request({
      body,
      files,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGES,
        params,
      },
    });
  }

  async createOauth2Application(
    options: RequestTypes.CreateOauth2Application,
  ): Promise<any> {
    const body = {
      name: options.name,
      team_id: options.teamId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION,
      },
    });
  }

  async createOauth2ApplicationAsset(
    applicationId: string,
    options: RequestTypes.CreateOauth2ApplicationAsset,
  ): Promise<any> {
    const body = {
      image: bufferToBase64(options.image),
      name: options.name,
      type: options.type,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_ASSETS,
        params,
      },
    });
  }

  async createOauth2ApplicationBot(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body: {},
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_BOT,
        params,
      },
    });
  }

  async createReaction(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    const params = {channelId, messageId, emoji, userId: '@me'};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_MESSAGE_REACTION_USER,
        params,
      },
    });
  }

  async createStageInstance(
    options: RequestTypes.CreateStageInstance,
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
      topic: options.topic,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.STAGE_INSTANCES,
      },
    });
  }

  async createStoreApplicationAsset(
    applicationId: string,
    options: RequestTypes.CreateStoreApplicationAsset = {},
  ): Promise<any> {
    const files: Array<RequestTypes.File> = [];
    const params = {applicationId};

    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        files.push(file);
      }
    }
    if (this.clientsideChecks) {

    }
    return this.request({
      files,
      route: {
        method: HTTPMethods.POST,
        path: Api.STORE_APPLICATION_ASSETS,
        params,
      },
    });
  }

  async createTeam(
    options: RequestTypes.CreateTeam = {},
  ): Promise<any> {
    const body = {
      icon: bufferToBase64(options.icon),
      name: options.name,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.TEAMS,
      },
    });
  }

  async createWebhook(
    channelId: string,
    options: RequestTypes.CreateWebhook,
  ): Promise<any> {
    const body = {
      avatar: options.avatar,
      name: options.name,
    };
    const params = {channelId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_WEBHOOKS,
        params,
      },
    });
  }

  async crosspostMessage(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGE_CROSSPOST,
        params,
      },
    });
  }

  async deleteAccount(
    options: RequestTypes.DeleteAccount,
  ): Promise<any> {
    const body = {
      code: options.code,
      password: options.password,
    };
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_DELETE_ACCOUNT,
      },
    });
  }

  async deleteApplicationCommand(
    applicationId: string,
    commandId: string,
  ): Promise<any> {
    const params = {applicationId, commandId};
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.APPLICATION_COMMAND,
        params,
      },
    });
  }

  async deleteApplicationGuildCommand(
    applicationId: string,
    guildId: string,
    commandId: string,
  ): Promise<any> {
    const params = {applicationId, guildId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.APPLICATION_GUILD_COMMAND,
        params,
      },
    });
  }

  async deleteChannel(
    channelId: string,
    options: RequestTypes.DeleteChannel = {},
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL,
        params,
      },
    });
  }

  async deleteChannelOverwrite(
    channelId: string,
    overwriteId: string,
    options: RequestTypes.DeleteChannelOverwrite = {},
  ): Promise<any> {
    const params = {channelId, overwriteId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_PERMISSION,
        params,
      },
    });
  }

  async deleteConnection(
    platform: string,
    accountId: string,
  ): Promise<any> {
    const params = {platform, accountId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_CONNECTION,
        params,
      },
    });
  }

  async deleteGuild(
    guildId: string,
    options: RequestTypes.DeleteGuild = {},
  ): Promise<any> {
    const body = {code: options.code};
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_DELETE,
        params,
      },
    });
  }

  async deleteGuildEmoji(
    guildId: string,
    emojiId: string,
    options: RequestTypes.DeleteGuildEmoji = {},
  ): Promise<any> {
    const params = {guildId, emojiId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_EMOJI,
        params,
      },
    });
  }

  async deleteGuildIntegration(
    guildId: string,
    integrationId: string,
    options: RequestTypes.DeleteGuildIntegration = {},
  ): Promise<any> {
    const params = {guildId, integrationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_INTEGRATION,
        params,
      },
    });
  }

  async deleteGuildPremiumSubscription(
    guildId: string,
    subscriptionId: string,
  ): Promise<any> {
    const params = {guildId, subscriptionId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_PREMIUM_SUBSCRIPTION,
        params,
      },
    });
  }

  async deleteGuildRole(
    guildId: string,
    roleId: string,
    options: RequestTypes.DeleteGuildRole = {},
  ): Promise<any> {
    const params = {guildId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_ROLE,
        params,
      },
    });
  }

  async deleteGuildTemplate(
    guildId: string,
    templateId: string,
  ): Promise<any> {
    const params = {guildId, templateId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_TEMPLATE,
        params,
      },
    });
  }

  async deleteInvite(
    code: string,
    options: RequestTypes.DeleteInvite = {},
  ): Promise<any> {
    const params = {code};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.INVITE,
        params,
      },
    });
  }

  async deleteLobby(
    lobbyId: string,
  ): Promise<any> {
    const params = {lobbyId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.LOBBY,
        params,
      },
    });
  }

  async deleteMeBillingPaymentSource(
    paymentSourceId: string,
  ): Promise<any> {
    const params = {paymentSourceId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_BILLING_PAYMENT_SOURCE,
        params,
      },
    });
  }

  async deleteMeBillingSubscription(
    subscriptionId: string,
  ): Promise<any> {
    const params = {subscriptionId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_BILLING_SUBSCRIPTION,
        params,
      },
    });
  }

  async deleteMessage(
    channelId: string,
    messageId: string,
    options: RequestTypes.DeleteMessage = {},
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
        messageId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE,
        params,
      },
    });
  }

  async deleteOauth2Application(
    applicationId: string,
    options: RequestTypes.DeleteOauth2Application = {},
  ): Promise<any> {
    const body = {
      code: options.code,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_DELETE,
        params,
      },
    });
  }

  async deleteOauth2ApplicationAsset(
    applicationId: string,
    assetId: string,
  ): Promise<any> {
    const params = {applicationId, assetId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.OAUTH2_APPLICATION_ASSET,
        params,
      },
    });
  }

  async deletePinnedMessage(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_PIN,
        params,
      },
    });
  }

  async deleteReactions(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE_REACTIONS,
        params,
      },
    });
  }

  async deleteReactionsEmoji(
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<any> {
    const params = {channelId, messageId, emoji};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE_REACTION,
        params,
      },
    });
  }

  async deleteReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string = '@me',
  ): Promise<any> {
    const params = {channelId, messageId, emoji, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE_REACTION_USER,
        params,
      },
    });
  }

  async deleteRelationship(
    userId: string,
  ): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_RELATIONSHIP,
        params,
      },
    });
  }

  async deleteStageInstance(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.STAGE_INSTANCE,
        params,
      },
    });
  }

  async deleteStoreApplicationAsset(
    applicationId: string,
    assetId: string,
  ): Promise<any> {
    const params = {applicationId, assetId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.STORE_APPLICATION_ASSET,
        params,
      },
    });
  }

  async deleteTeam(
    teamId: string,
    options: RequestTypes.DeleteTeam = {},
  ): Promise<any> {
    const body = {code: options.code};
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.TEAM_DELETE,
        params,
      },
    });
  }

  async deleteWebhook(
    webhookId: string,
    options: RequestTypes.DeleteWebhook = {},
  ): Promise<any> {
    const params = {webhookId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async deleteWebhookToken(
    webhookId: string,
    webhookToken: string,
    options: RequestTypes.DeleteWebhook = {},
  ): Promise<any> {
    const params = {webhookId, webhookToken};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
      useAuth: false,
    });
  }

  async deleteWebhookTokenMessage(
    webhookId: string,
    webhookToken: string,
    messageId: string,
  ): Promise<any> {
    const params = {webhookId, webhookToken, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.WEBHOOK_TOKEN_MESSAGE,
        params,
      },
      useAuth: false,
    });
  }

  async disableAccount(
    options: RequestTypes.DisableAccount,
  ): Promise<any> {
    const body = {
      code: options.code,
      password: options.password,
    };
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_DISABLE_ACCOUNT,
      },
    });
  }

  async editApplicationCommand(
    applicationId: string,
    commandId: string,
    options: RequestTypes.EditApplicationCommand | RequestTypes.toJSON<RequestTypes.EditApplicationCommandData> = {},
  ): Promise<any> {
    let body: RequestTypes.EditApplicationCommandData | RequestTypes.toJSON<RequestTypes.EditApplicationCommandData>;
    if ('toJSON' in options) {
      body = options;
    } else {
      body = {
        default_permission: options.defaultPermission,
        description: options.description,
        name: options.name,
        options: options.options,
      };
    }
    const params = {applicationId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.APPLICATION_COMMAND,
        params,
      },
    });
  }

  async editApplicationGuildCommand(
    applicationId: string,
    guildId: string,
    commandId: string,
    options: RequestTypes.EditApplicationGuildCommand | RequestTypes.toJSON<RequestTypes.EditApplicationGuildCommandData> = {},
  ): Promise<any> {
    let body: RequestTypes.EditApplicationGuildCommandData | RequestTypes.toJSON<RequestTypes.EditApplicationCommandData>;
    if ('toJSON' in options) {
      body = options;
    } else {
      body = {
        default_permission: options.defaultPermission,
        description: options.description,
        name: options.name,
        options: options.options,
      };
    }
    const params = {applicationId, guildId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.APPLICATION_GUILD_COMMAND,
        params,
      },
    });
  }

  async editApplicationGuildCommandPermissions(
    applicationId: string,
    guildId: string,
    commandId: string,
    options: RequestTypes.EditApplicationGuildCommandPermissions,
  ): Promise<any> {
    const params = {applicationId, commandId, guildId};
    const body = {
      permissions: options.permissions,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.APPLICATION_GUILD_COMMAND_PERMISSIONS,
        params,
      },
    });
  }

  async editApplicationNews(
    newsId: string,
    options: RequestTypes.EditApplicationNews = {},
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
      description: options.description,
      message_id: options.messageId,
      thumbnail: bufferToBase64(options.thumbnail),
      title: options.title,
    };
    const params = {newsId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.APPLICATION_NEWS_ID,
        params,
      },
    })
  }

  async editChannel(
    channelId: string,
    options: RequestTypes.EditChannel = {},
  ): Promise<any> {
    const body = {
      archived: options.archived,
      auto_archive_duration: options.autoArchiveDuration,
      bitrate: options.bitrate,
      icon: bufferToBase64(options.icon),
      locked: options.locked,
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites,
      position: options.position,
      rate_limit_per_user: options.rateLimitPerUser,
      rtc_region: options.rtcRegion,
      topic: options.topic,
      type: options.type,
      user_limit: options.userLimit,
      video_quality_mode: options.videoQualityMode,
    };
    const params = {channelId};

    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.CHANNEL,
        params,
      },
    });
  }

  async editChannelOverwrite(
    channelId: string,
    overwriteId: string,
    options: RequestTypes.EditChannelOverwrite = {},
  ): Promise<any> {
    const body = {
      allow: options.allow,
      deny: options.deny,
      type: options.type,
    };
    const params = {channelId, overwriteId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_PERMISSION,
        params,
      },
    });
  }

  async editConnection(
    platform: string,
    accountId: string,
    options: RequestTypes.EditConnection = {},
  ): Promise<any> {
    return this.request({
      body: {
        friend_sync: options.friendSync,
        visibility: options.visibility,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME_CONNECTION,
        params: {platform, accountId},
      },
    });
  }

  async editGuild(
    guildId: string,
    options: RequestTypes.EditGuild = {},
  ): Promise<any> {
    const body = {
      afk_channel_id: options.afkChannelId,
      afk_timeout: options.afkTimeout,
      banner: bufferToBase64(options.banner),
      code: options.code,
      default_message_notifications: options.defaultMessageNotifications,
      description: options.description,
      discovery_splash: bufferToBase64(options.discoverySplash),
      explicit_content_filter: options.explicitContentFilter,
      features: options.features,
      icon: bufferToBase64(options.icon),
      name: options.name,
      owner_id: options.ownerId,
      preferred_locale: options.preferredLocale,
      public_updates_channel_id: options.publicUpdatesChannelId,
      region: options.region,
      rules_channel_id: options.rulesChannelId,
      splash: bufferToBase64(options.splash),
      system_channel_flags: options.systemChannelFlags,
      system_channel_id: options.systemChannelId,
      verification_level: options.verificationLevel,
    };
    const params = {guildId};

    if (this.clientsideChecks) {
      // one check is if owner_id, check if code is also in
    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD,
        params,
      },
    });
  }

  async editGuildChannels(
    guildId: string,
    channels: RequestTypes.EditGuildChannels,
    options: RequestTypes.EditGuildChannelsExtra = {},
  ): Promise<any> {
    const body: Array<{
      id: string,
      lock_permissions?: boolean,
      parent_id?: string,
      position?: number,
    }> = [];
    const params = {guildId};
    for (let oldChannel of channels) {
      const channel = {
        id: oldChannel.id,
        lock_permissions: oldChannel.lockPermissions,
        parent_id: oldChannel.parentId,
        position: oldChannel.position,
      };
      if (this.clientsideChecks) {

      }
      body.push(channel);
    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_CHANNELS,
        params,
      },
    });
  }

  async editGuildEmbed(
    guildId: string,
    options: RequestTypes.EditGuildEmbed,
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
      enabled: options.enabled,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_EMBED,
        params,
      },
    });
  }

  async editGuildEmoji(
    guildId: string,
    emojiId: string,
    options: RequestTypes.EditGuildEmoji = {},
  ): Promise<any> {
    const body = {
      name: options.name,
      roles: options.roles,
    };
    const params = {guildId, emojiId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_EMOJI,
        params,
      },
    });
  }

  async editGuildIntegration(
    guildId: string,
    integrationId: string,
    options: RequestTypes.EditGuildIntegration = {},
  ): Promise<any> {
    const body = {
      enable_emoticons: options.enableEmoticons,
      expire_behavior: options.expireBehavior,
      expire_grace_period: options.expireGracePeriod,
    };
    const params = {guildId, integrationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_INTEGRATION,
        params,
      },
    });
  }

  async editGuildMember(
    guildId: string,
    userId: string,
    options: RequestTypes.EditGuildMember = {},
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
      deaf: options.deaf,
      mute: options.mute,
      nick: options.nick,
      roles: options.roles,
    };
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async editGuildMemberVerification(
    guildId: string,
    options: RequestTypes.EditGuildMemberVerification = {},
  ): Promise<any> {
    const body = {
      description: options.description,
      enabled: options.enabled,
      form_fields: options.formFields,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_MEMBER_VERIFICATION,
        params,
      },
    });
  }

  async editGuildMfaLevel(
    guildId: string,
    options: RequestTypes.EditGuildMfaLevel,
  ): Promise<any> {
    const body = {
      code: options.code,
      level: options.level,
    };
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_MFA,
        params,
      },
    });
  }

  async editGuildNick(
    guildId: string,
    nick: string,
    options: RequestTypes.EditGuildNick = {},
  ): Promise<any> {
    const body = {nick};
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_MEMBER_NICK,
        params,
      },
    });
  }

  async editGuildRole(
    guildId: string,
    roleId: string,
    options: RequestTypes.EditGuildRole = {},
  ): Promise<any> {
    const body = {
      color: options.color,
      hoist: options.hoist,
      mentionable: options.mentionable,
      name: options.name,
      permissions: options.permissions,
    };
    const params = {guildId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_ROLE,
        params,
      },
    });
  }

  async editGuildRolePositions(
    guildId: string,
    roles: RequestTypes.EditGuildRolePositions,
    options: RequestTypes.EditGuildRolePositionsExtra = {},
  ): Promise<any> {
    const body: Array<{
      id: string,
      position?: number,
    }> = [];
    const params = {guildId};
    for (let oldRole of roles) {
      const role = {
        id: oldRole.id,
        position: oldRole.position,
      };
      if (this.clientsideChecks) {

      }
      body.push(role);
    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_ROLES,
        params,
      },
    })
  }

  async editGuildVanity(
    guildId: string,
    code: string,
    options: RequestTypes.EditGuildVanity = {},
  ): Promise<any> {
    const body = {code};
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_VANITY_URL,
        params,
      },
    });
  }

  async editGuildVoiceState(
    guildId: string,
    userId: string = '@me',
    options: RequestTypes.EditGuildVoiceState,
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
      request_to_speak_timestamp: options.requestToSpeakTimestamp,
      suppress: options.suppress,
    };
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.GUILD_VOICE_STATE,
        params,
      },
    });
  }

  async editLobby(
    lobbyId: string,
    options: RequestTypes.EditLobby = {},
  ): Promise<any> {
    const body = {
      capacity: options.capacity,
      locked: options.locked,
      metadata: options.metadata,
      owner_id: options.ownerId,
      type: options.type,
    };
    const params = {lobbyId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.LOBBY,
        params,
      },
    });
  }

  async editLobbyMember(
    lobbyId: string,
    userId: string,
    options: RequestTypes.EditLobbyMember = {},
  ): Promise<any> {
    const body = {
      metadata: options.metadata,
    };
    const params = {lobbyId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.LOBBY_MEMBER,
        params,
      },
    });
  }

  async editMe(
    options: RequestTypes.EditMe = {},
  ): Promise<any> {
    const body: any = {
      avatar: bufferToBase64(options.avatar),
      code: options.code,
      custom_status: undefined,
      discriminator: options.discriminator,
      email: options.email,
      flags: options.flags,
      new_password: options.newPassword,
      password: options.password,
      username: options.username,
    };
    if (options.customStatus) {
      body.custom_status = {
        emoji_id: options.customStatus.emojiId,
        emoji_name: options.customStatus.emojiName,
        expires_at: options.customStatus.expiresAt,
        text: options.customStatus.text,
      };
    }
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME,
      },
    });
  }

  async editMeBillingPaymentSource(
    paymentSourceId: string,
    options: RequestTypes.EditMeBillingPaymentSource = {},
  ): Promise<any> {
    const body = {
      billing_address: (options.billingAddress) && {
        city: options.billingAddress.city,
        country: options.billingAddress.country,
        line_1: options.billingAddress.line1,
        line_2: options.billingAddress.line2,
        name: options.billingAddress.name,
        postal_code: options.billingAddress.postalCode,
        state: options.billingAddress.state,
      },
      default: options.default,
    };
    const params = {paymentSourceId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME_BILLING_PAYMENT_SOURCE,
        params,
      },
    });
  }

  async editMeBillingSubscription(
    subscriptionId: string,
    options: RequestTypes.EditMeBillingSubscription = {},
  ): Promise<any> {
    const body = {
      payment_gateway_plan_id: options.paymentGatewayPlanId,
      payment_source_id: options.paymentSourceId,
      status: options.status,
    };
    const params = {subscriptionId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME_BILLING_SUBSCRIPTION,
        params,
      },
    });
  }

  async editMessage(
    channelId: string,
    messageId: string,
    options: RequestTypes.EditMessage | string = {},
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = {content: options};
    }
    const body: RequestTypes.EditMessageData = {
      attachments: options.attachments,
      content: options.content,
      embed: options.embed,
      flags: options.flags,
    };
    const params = {channelId, messageId};

    if (options.allowedMentions && typeof(options.allowedMentions) === 'object') {
      body.allowed_mentions = {
        parse: options.allowedMentions.parse,
        replied_user: options.allowedMentions.repliedUser,
        roles: options.allowedMentions.roles,
        users: options.allowedMentions.users,
      };
    }
    if (options.components && typeof(options.components) === 'object') {
      body.components = options.components.map((component) => {
        if ('toJSON' in component) {
          return component;
        }
        return {
          components: component.components && component.components.map((child) => {
            if ('toJSON' in child) {
              return child;
            }
            return {
              custom_id: child.customId,
              disabled: child.disabled,
              emoji: child.emoji,
              label: child.label,
              max_values: child.maxValues,
              min_values: child.minValues,
              options: child.options,
              placeholder: child.placeholder,
              style: child.style,
              type: child.type,
              url: child.url,
            };
          }),
          custom_id: component.customId,
          disabled: component.disabled,
          emoji: component.emoji,
          label: component.label,
          max_values: component.maxValues,
          min_values: component.minValues,
          options: component.options,
          placeholder: component.placeholder,
          style: component.style,
          type: component.type,
          url: component.url,
        };
      });
    }
    if (options.embed && typeof(options.embed) === 'object') {
      if ('toJSON' in options.embed) {
        body.embed = options.embed;
      } else {
        body.embed = Object.assign({}, options.embed);
        if (typeof(options.embed.author) === 'object') {
          body.embed.author = {
            name: options.embed.author.name,
            url: options.embed.author.url,
            icon_url: options.embed.author.iconUrl,
          };
        }
        if (typeof(options.embed.footer) === 'object') {
          body.embed.footer = {
            text: options.embed.footer.text,
            icon_url: options.embed.footer.iconUrl,
          };
        }
      }
    }

    const files: Array<RequestTypes.File> = [];
    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        if (file.hasSpoiler) {
          spoilerfy(file);
        }
        files.push(file);
      }
    }
    if (options.hasSpoiler) {
      for (let file of files) {
        spoilerfy(file);
      }
    }

    if (this.clientsideChecks) {

    }

    return this.request({
      body,
      files,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.CHANNEL_MESSAGE,
        params,
      },
    });
  }

  async editNote(
    userId: string,
    note: string,
  ): Promise<any> {
    const body = {note};
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.ME_NOTE,
        params,
      },
    });
  }

  async editOauth2Application(
    applicationId: string,
    options: RequestTypes.EditOauth2Application = {},
  ): Promise<any> {
    const body = {
      description: options.description,
      icon: bufferToBase64(options.icon),
      name: options.name,
      redirect_uris: options.redirectUris,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.OAUTH2_APPLICATION,
        params,
      },
    });
  }

  async editRelationship(
    userId: string,
    type: number,
  ): Promise<any> {
    const body = {type};
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PUT,
        path: Api.ME_RELATIONSHIP,
        params,
      },
    });
  }

  async editSettings(
    options: RequestTypes.EditSettings = {},
  ): Promise<any> {
    const body = Object.assign({}, options);
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.ME_SETTINGS,
      },
    });
  }

  async editStageInstance(
    channelId: string,
    options: RequestTypes.EditStageInstance = {},
  ): Promise<any> {
    const body = {
      topic: options.topic,
    };
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.STAGE_INSTANCE,
        params,
      },
    });
  }

  async editTeam(
    teamId: string,
    options: RequestTypes.EditTeam = {},
  ): Promise<any> {
    const body = {
      code: options.code,
      icon: bufferToBase64(options.icon),
      name: options.name,
      owner_user_id: options.ownerUserId,
    };
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.TEAM,
        params,
      },
    });
  }

  async editUser(options: RequestTypes.EditMe = {}): Promise<any> {
    return this.editMe(options);
  }

  async editWebhook(
    webhookId: string,
    options: RequestTypes.EditWebhook = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
      channel_id: options.channelId,
      name: options.name,
    };
    const params = {webhookId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async editWebhookToken(
    webhookId: string,
    webhookToken: string,
    options: RequestTypes.EditWebhook = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
      channel_id: options.channelId,
      name: options.name,
    };
    const params = {webhookId, webhookToken};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.PATCH,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
      useAuth: false,
    });
  }

  async editWebhookTokenMessage(
    webhookId: string,
    webhookToken: string,
    messageId: string,
    options: RequestTypes.EditWebhookTokenMessage | string = {},
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = {content: options};
    }
    const body: RequestTypes.EditWebhookTokenMessageData = {
      attachments: options.attachments,
      content: options.content,
    };
    const params = {webhookId, webhookToken, messageId};
    if (options.allowedMentions && typeof(options.allowedMentions) === 'object') {
      body.allowed_mentions = {
        parse: options.allowedMentions.parse,
        roles: options.allowedMentions.roles,
        users: options.allowedMentions.users,
      };
    }
    if (options.components && typeof(options.components) === 'object') {
      body.components = options.components.map((component) => {
        if ('toJSON' in component) {
          return component;
        }
        return {
          components: component.components && component.components.map((child) => {
            if ('toJSON' in child) {
              return child;
            }
            return {
              custom_id: child.customId,
              disabled: child.disabled,
              emoji: child.emoji,
              label: child.label,
              max_values: child.maxValues,
              min_values: child.minValues,
              options: child.options,
              placeholder: child.placeholder,
              style: child.style,
              type: child.type,
              url: child.url,
            };
          }),
          custom_id: component.customId,
          disabled: component.disabled,
          emoji: component.emoji,
          label: component.label,
          max_values: component.maxValues,
          min_values: component.minValues,
          options: component.options,
          placeholder: component.placeholder,
          style: component.style,
          type: component.type,
          url: component.url,
        };
      });
    }
    if (options.embed !== undefined) {
      if (options.embed) {
        if (options.embeds) {
          options.embeds = [options.embed, ...options.embeds];
        } else {
          options.embeds = [options.embed];
        }
      } else if (!options.embeds) {
        options.embeds = [];
      }
    }
    if (options.embeds && options.embeds.length) {
      body.embeds = options.embeds.map((embed) => {
        if ('toJSON' in embed) {
          return embed;
        }
        const raw = Object.assign({}, embed) as RequestTypes.RawChannelMessageEmbed;
        if (typeof(embed.author) === 'object') {
          raw.author = {
            name: embed.author.name,
            url: embed.author.url,
            icon_url: embed.author.iconUrl,
          };
        }
        if (typeof(embed.footer) === 'object') {
          raw.footer = {
            text: embed.footer.text,
            icon_url: embed.footer.iconUrl,
          };
        }
        return raw;
      });
    }

    const files: Array<RequestTypes.File> = [];
    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        if (file.hasSpoiler) {
          spoilerfy(file);
        }
        files.push(file);
      }
    }
    if (options.hasSpoiler) {
      for (let file of files) {
        spoilerfy(file);
      }
    }

    if (this.clientsideChecks) {
      // verify body
      // verify files?
      verifyData(params, {
        messageId: {required: true, type: VerifyTypes.SNOWFLAKE},
        webhookId: {required: true, type: VerifyTypes.SNOWFLAKE},
        webhookToken: {required: true, type: VerifyTypes.STRING},
      });
      if (
        !('content' in body) &&
        !('embeds' in body)
      ) {
        throw new Error('Cannot send an empty message.');
      }
    }

    return this.request({
      body,
      files,
      route: {
        method: HTTPMethods.PATCH,
        path: Api.WEBHOOK_TOKEN_MESSAGE,
        params,
      },
      useAuth: false,
    });
  }


  async enableOauth2ApplicationAssets(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body: {},
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_ASSETS_ENABLE,
        params,
      },
    });
  }

  async enableOauth2ApplicationRpc(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body: {},
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_RPC_ENABLE,
        params,
      },
    });
  }

  async executeWebhook(
    webhookId: string,
    webhookToken: string,
    options: RequestTypes.ExecuteWebhook | string = {},
    compatibleType?: string,
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = {content: options};
    }
    const body: RequestTypes.ExecuteWebhookData = {
      avatar_url: options.avatarUrl,
      content: options.content,
      flags: options.flags,
      tts: options.tts,
      username: options.username,
    };
    const files: Array<RequestTypes.File> = [];
    const params = {webhookId, webhookToken};
    const query = {
      thread_id: options.threadId,
      wait: options.wait,
    }
    const route = {
      method: HTTPMethods.POST,
      path: Api.WEBHOOK_TOKEN,
      params,
    };

    if (compatibleType) {
      switch (compatibleType) {
        case 'github': {
          route.path = Api.WEBHOOK_TOKEN_GITHUB;
        }; break;
        case 'slack': {
          route.path = Api.WEBHOOK_TOKEN_SLACK;
        }; break;
        default: {
          throw new Error('Invalid Webhook Compatibility Type');
        };
      }
    }

    if (options.allowedMentions && typeof(options.allowedMentions) === 'object') {
      body.allowed_mentions = {
        parse: options.allowedMentions.parse,
        roles: options.allowedMentions.roles,
        users: options.allowedMentions.users,
      };
    }
    if (options.components && typeof(options.components) === 'object') {
      body.components = options.components.map((component) => {
        if ('toJSON' in component) {
          return component;
        }
        return {
          components: component.components && component.components.map((child) => {
            if ('toJSON' in child) {
              return child;
            }
            return {
              custom_id: child.customId,
              disabled: child.disabled,
              emoji: child.emoji,
              label: child.label,
              max_values: child.maxValues,
              min_values: child.minValues,
              options: child.options,
              placeholder: child.placeholder,
              style: child.style,
              type: child.type,
              url: child.url,
            };
          }),
          custom_id: component.customId,
          disabled: component.disabled,
          emoji: component.emoji,
          label: component.label,
          max_values: component.maxValues,
          min_values: component.minValues,
          options: component.options,
          placeholder: component.placeholder,
          style: component.style,
          type: component.type,
          url: component.url,
        };
      });
    }
    if (options.embed !== undefined) {
      if (options.embed) {
        if (options.embeds) {
          options.embeds = [options.embed, ...options.embeds];
        } else {
          options.embeds = [options.embed];
        }
      } else if (!options.embeds) {
        options.embeds = [];
      }
    }
    if (options.embeds && options.embeds.length) {
      body.embeds = options.embeds.map((embed) => {
        if ('toJSON' in embed) {
          return embed;
        }
        const raw = Object.assign({}, embed) as RequestTypes.RawChannelMessageEmbed;
        if (typeof(embed.author) === 'object') {
          raw.author = {
            name: embed.author.name,
            url: embed.author.url,
            icon_url: embed.author.iconUrl,
          };
        }
        if (typeof(embed.footer) === 'object') {
          raw.footer = {
            text: embed.footer.text,
            icon_url: embed.footer.iconUrl,
          };
        }
        return raw;
      });
    }

    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        if (file.hasSpoiler && file.filename && !file.filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
          file.filename = `${SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
        }
        files.push(file);
      }
    }

    if (options.hasSpoiler) {
      for (let file of files) {
        if (file.filename && !file.filename.startsWith(SPOILER_ATTACHMENT_PREFIX)) {
          file.filename = `${SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
        }
      }
    }

    if (this.clientsideChecks) {
      // verify body
      // verify files?
      verifyData(params, {
        webhookId: {required: true, type: VerifyTypes.SNOWFLAKE},
        webhookToken: {required: true, type: VerifyTypes.STRING},
      });
      if (
        !('content' in body) &&
        !('embeds' in body) &&
        !(files.length)
      ) {
        throw new Error('Cannot send an empty message.');
      }
    }

    return this.request({
      body,
      files,
      query,
      route,
      useAuth: false,
    });
  }

  async fetchActivities(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.ACTIVITIES,
      },
    });
  }

  async fetchApplicationCommands(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_COMMANDS,
        params,
      },
    });
  }

  async fetchApplicationCommand(
    applicationId: string,
    commandId: string,
  ): Promise<any> {
    const params = {applicationId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_COMMAND,
        params,
      },
    });
  }

  async fetchApplicationGuildCommands(
    applicationId: string,
    guildId: string,
  ): Promise<any> {
    const params = {applicationId, guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_GUILD_COMMANDS,
        params,
      },
    });
  }

  async fetchApplicationGuildCommandsPermissions(
    applicationId: string,
    guildId: string,
  ): Promise<any> {
    const params = {applicationId, guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_GUILD_COMMANDS_PERMISSIONS,
        params,
      },
    });
  }

  async fetchApplicationGuildCommand(
    applicationId: string,
    guildId: string,
    commandId: string,
  ): Promise<any> {
    const params = {applicationId, guildId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_GUILD_COMMAND,
        params,
      },
    });
  }

  async fetchApplicationGuildCommandPermissions(
    applicationId: string,
    guildId: string,
    commandId: string,
  ): Promise<any> {
    const params = {applicationId, guildId, commandId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_GUILD_COMMAND_PERMISSIONS,
        params,
      },
    });
  }

  async fetchApplicationNews(
    applicationIds?: string | Array<string>,
  ): Promise<any> {
    // this one requires the array to be urlencoded in one param
    const query = {
      application_ids: String(applicationIds),
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_NEWS,
      },
    });
  }

  async fetchApplicationNewsId(
    newsId: string,
  ): Promise<any> {
    const params = {newsId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION_NEWS_ID,
        params,
      },
    });
  }

  fetchApplications(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATIONS,
      },
    });
  }

  async fetchApplication(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATION,
        params,
      },
    });
  }

  async fetchApplicationsDetectable(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATIONS_DETECTABLE,
      },
    });
  }

  async fetchApplicationsPublic(
    applicationIds: string | Array<string>,
  ): Promise<any> {
    const query = {application_ids: applicationIds};
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATIONS_PUBLIC,
      },
    });
  }

  async fetchApplicationsTrendingGlobal(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.APPLICATIONS_TRENDING_GLOBAL,
      },
    });
  }

  fetchAuthConsentRequired(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.AUTH_CONSENT_REQUIRED,
      },
    });
  }

  async fetchChannel(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL,
        params,
      },
    });
  }

  async fetchChannelCall(
    channelId: string,
  ): Promise<any> {
    // checks if the channel is callable
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_CALL,
        params,
      },
    });
  }

  async fetchChannelInvites(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_INVITES,
        params,
      },
    });
  }

  async fetchChannelStoreListing(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_STORE_LISTING,
        params,
      },
    });
  }

  async fetchChannelThreadsActive(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_THREADS_ACTIVE,
        params,
      },
    });
  }

  async fetchChannelThreadsArchivedPrivate(
    channelId: string,
    options: RequestTypes.FetchChannelThreadsArchivedPrivate = {},
  ): Promise<any> {
    const params = {channelId};
    const query = {
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_THREADS_ARCHIVED_PRIVATE,
        params,
      },
    });
  }

  async fetchChannelThreadsArchivedPrivateJoined(
    channelId: string,
    options: RequestTypes.FetchChannelThreadsArchivedPrivateJoined = {},
  ): Promise<any> {
    const params = {channelId, userId: '@me'};
    const query = {
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_USER_THREADS_ARCHIVED_PRIVATE,
        params,
      },
    });
  }

  async fetchChannelThreadsArchivedPublic(
    channelId: string,
    options: RequestTypes.FetchChannelThreadsArchivedPublic = {},
  ): Promise<any> {
    const params = {channelId};
    const query = {
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_THREADS_ARCHIVED_PUBLIC,
        params,
      },
    });
  }

  async fetchChannelWebhooks(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_WEBHOOKS,
        params,
      },
    });
  }

  fetchConsentRequired(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.AUTH_CONSENT_REQUIRED,
      },
    });
  }

  async fetchConnectionAuthorizeUrl(
    platform: string,
  ): Promise<any> {
    const params = {platform};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CONNECTION_AUTHORIZE,
        params,
      },
    });
  }

  fetchDiscoverableGuilds(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.DISCOVERABLE_GUILDS,
      },
    });
  }

  async fetchDms(userId: string = '@me'): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.USER_CHANNELS,
        params,
      },
    });
  }

  fetchEmojiGuild(
    emojiId: string,
  ): Promise<any> {
    const params = {emojiId};
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.EMOJI_GUILD,
        params,
      },
    });
  }

  fetchExperiments(
    fingerprint?: string,
  ): Promise<any> {
    const headers: Record<string, string> = {};
    if (fingerprint) {
      headers['x-fingerprint'] = <string> fingerprint;
    }
    return this.request({
      headers,
      route: {
        method: HTTPMethods.GET,
        path: Api.EXPERIMENTS,
      },
    });
  }

  fetchGateway(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GATEWAY,
      },
    });
  }

  fetchGatewayBot(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GATEWAY_BOT,
      },
    });
  }

  async fetchGiftCode(
    code: string,
    options: RequestTypes.FetchGiftCode = {},
  ): Promise<any> {
    const params = {code};
    const query = {
      country_code: options.countryCode,
      with_application: options.withApplication,
      with_subscription_plan: options.withSubscriptionPlan,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ENTITLEMENTS_GIFT_CODE,
        params,
      },
    });
  }

  async fetchGuild(
    guildId: string,
    options: RequestTypes.FetchGuild = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      with_counts: options.withCounts,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD,
        params,
      },
    });
  }

  async fetchGuildApplications(
    guildId: string,
    channelId?: string,
  ): Promise<any> {
    const params = {guildId};
    const query = {channel_id: channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_APPLICATIONS,
        params,
      },
    });
  }

  async fetchGuildAuditLogs(
    guildId: string,
    options: RequestTypes.FetchGuildAuditLogs,
  ): Promise<any> {
    const params = {guildId};
    const query = {
      action_type: options.actionType,
      before: options.before,
      limit: options.limit,
      user_id: options.userId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_AUDIT_LOGS,
        params,
      },
    });
  }

  async fetchGuildBans(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_BANS,
        params,
      },
    });
  }

  async fetchGuildChannels(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_CHANNELS,
        params,
      },
    });
  }

  async fetchGuildEmbed(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_EMBED,
        params,
      },
    });
  }

  async fetchGuildEmojis(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_EMOJIS,
        params,
      },
    });
  }

  async fetchGuildEmoji(
    guildId: string,
    emojiId: string,
  ): Promise<any> {
    const params = {guildId, emojiId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_EMOJI,
        params,
      },
    });
  }

  async fetchGuildIntegrations(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_INTEGRATIONS,
        params,
      },
    });
  }

  async fetchGuildInvites(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_INVITES,
        params,
      },
    });
  }

  async fetchGuildMembers(
    guildId: string,
    options: RequestTypes.FetchGuildMembers = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      after: options.after,
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_MEMBERS,
        params,
      },
    });
  }

  async fetchGuildMembersSearch(
    guildId: string,
    options: RequestTypes.FetchGuildMembersSearch,
  ): Promise<any> {
    const params = {guildId};
    const query = {
      limit: options.limit,
      query: options.query,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_MEMBERS_SEARCH,
        params,
      },
    });
  }

  async fetchGuildMember(
    guildId: string,
    userId: string,
  ): Promise<any> {
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async fetchGuildMemberVerification(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_MEMBER_VERIFICATION,
        params,
      },
    });
  }

  async fetchGuildPremiumSubscriptions(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_PREMIUM_SUBSCRIPTIONS,
        params,
      },
    });
  }

  async fetchGuildPreview(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_PREVIEW,
        params,
      },
    });
  }

  async fetchGuildPruneCount(
    guildId: string,
    options: RequestTypes.FetchGuildPruneCount = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      days: options.days,
      include_roles: options.includeRoles,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_PRUNE,
        params,
      },
    });
  }

  async fetchGuildRoles(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_ROLES,
        params,
      },
    });
  }

  async fetchGuildTemplates(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_TEMPLATES,
        params,
      },
    });
  }

  async fetchGuildVanityUrl(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_VANITY_URL,
        params,
      },
    });
  }

  async fetchGuildWebhooks(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_WEBHOOKS,
        params,
      },
    });
  }

  async fetchGuildWidget(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_WIDGET,
        params,
      },
    });
  }

  async fetchGuildWidgetJson(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_WIDGET_JSON,
        params,
      },
    });
  }

  async fetchGuildWidgetPng(
    guildId: string,
    options: RequestTypes.FetchGuildWidgetPng = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      style: options.style,
    };
    if (this.clientsideChecks) {
      
    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILD_WIDGET_PNG,
        params,
      },
    });
  }

  async fetchInvite(
    code: string,
    options: RequestTypes.FetchInvite = {},
  ): Promise<any> {
    const params = {code};
    const query = {
      with_counts: options.withCounts,
      with_expiration: options.withExpiration,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.INVITE,
        params,
      },
    });
  }

  async fetchMe(
    options: RequestTypes.FetchMe = {},
  ): Promise<any> {
    const query = {
      with_analytics_token: options.withAnalyticsToken,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ME,
      },
    });
  }

  fetchMeBillingPaymentSources(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_BILLING_PAYMENT_SOURCES,
      }
    })
  }

  async fetchMeBillingPayments(
    options: RequestTypes.FetchMeBillingPayments = {},
  ): Promise<any> {
    const query = {
      limit: options.limit,
      before_id: options.beforeId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_BILLING_PAYMENTS,
      },
    });
  }

  fetchMeBillingSubscriptions(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_BILLING_SUBSCRIPTIONS,
      },
    });
  }

  fetchMeChannels(): Promise<any> {
    return this.request({
      route: {
        path: Api.ME_CHANNELS,
      },
    });
  }

  fetchMeConnections(): Promise<any> {
    return this.request({
      route: {
        path: Api.ME_CONNECTIONS,
      },
    });
  }

  async fetchMeConnectionAccessToken(
    platform: string,
    accountId: string,
  ): Promise<any> {
    const params = {platform, accountId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_CONNECTION_ACCESS_TOKEN,
        params,
      },
    });
  }

  async fetchMeConnectionSubreddits(
    accountId: string,
  ): Promise<any> {
    const params = {accountId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_CONNECTION_REDDIT_SUBREDDITS,
        params,
      },
    });
  }

  async fetchMeFeedSettings(
    options: RequestTypes.FetchMeFeedSettings = {},
  ): Promise<any> {
    const query = {
      include_autosubscribed_game: options.includeAutosubscribedGames,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_FEED_SETTINGS,
      },
    });
  }

  async fetchMeGuilds(
    options: RequestTypes.FetchMeGuilds = {},
  ): Promise<any> {
    const query = {
      after: options.after,
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        path: Api.ME_GUILDS,
      },
    });
  }

  async fetchMentions(
    options: RequestTypes.FetchMentions = {},
  ): Promise<any> {
    const query = {
      after: options.after,
      around: options.around,
      before: options.before,
      everyone: options.everyone,
      limit: options.limit,
      roles: options.roles,
    };
    if (this.clientsideChecks) {
      if (query.limit !== undefined) {
        if (query.limit < 1 || 100 < query.limit) {
          throw new Error('Limit has to be between 1 and 100');
        }
      }
      if (
        (query.after && query.around) ||
        (query.after && query.before) ||
        (query.around && query.before)
      ) {
        throw new Error('Choose between around, before, or after, cannot have more than one.');
      }
    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_MENTIONS,
      },
    });
  }

  async fetchMessage(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGE,
        params,
      },
    });
  }

  async fetchMessages(
    channelId: string,
    options: RequestTypes.FetchMessages = {},
  ): Promise<any> {
    const params = {channelId};
    const query = {
      after: options.after,
      around: options.around,
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {
      if (query.limit !== undefined) {
        if (query.limit < 1 || 100 < query.limit) {
          throw new Error('Limit has to be between 1 and 100');
        }
      }
      if (
        (query.after && query.around) ||
        (query.after && query.before) ||
        (query.around && query.before)
      ) {
        throw new Error('Choose between around, before, or after, cannot have more than one.');
      }
    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGES,
        params,
      },
    });
  }

  async fetchMeStickerPacks(countryCode?: string): Promise<any> {
    const query = {
      country_code: countryCode,
    };
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.ME_STICKER_PACKS,
      },
    });
  }

  async fetchOauth2Applications(
    options: RequestTypes.FetchOauth2Applications = {},
  ): Promise<any> {
    const query = {
      with_team_applications: options.withTeamApplications,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_APPLICATIONS,
      },
    });
  }

  async fetchOauth2Application(
    applicationId: string = '@me',
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_APPLICATION,
        params,
      },
    });
  }

  async fetchOauth2ApplicationAssets(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_APPLICATION_ASSETS,
        params,
      },
    });
  }

  async fetchOauth2ApplicationWhitelist(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_APPLICATION_WHITELIST,
        params,
      },
    });
  }

  async fetchOauth2Authorize(
    options: RequestTypes.FetchOauth2Authorize = {},
  ): Promise<any> {
    const query = {
      client_id: options.clientId,
      response_type: options.responseType,
      scope: options.scope,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_AUTHORIZE,
      },
    });
  }

  async fetchOauth2AuthorizeWebhookChannels(
    guildId: string,
  ): Promise<any> {
    const query = {
      guild_id: guildId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_AUTHORIZE_WEBHOOK_CHANNELS,
      },
    });
  }

  fetchOauth2Tokens(): Promise<any> {
    // fetchAuthorizedApplications
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_TOKENS,
      },
    });
  }

  async fetchOauth2Token(
    tokenId: string,
  ): Promise<any> {
    const params = {tokenId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.OAUTH2_TOKEN,
        params,
      },
    });
  }

  async fetchPinnedMessages(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_PINS,
        params,
      },
    });
  }

  async fetchReactions(
    channelId: string,
    messageId: string,
    emoji: string,
    options: RequestTypes.FetchReactions = {},
  ): Promise<any> {
    const params = {channelId, messageId, emoji};
    const query = {
      after: options.after,
      before: options.before,
      limit: options.limit,
    };
    if (this.clientsideChecks) {
      //params
      if (query.limit !== undefined) {
        if (query.limit < 1 || 100 < query.limit) {
          throw new Error('Limit has to be between 1 and 100');
        }
      }
      if (query.after && query.before) {
        throw new Error('Choose between after or before, cannot have more than one.');
      }
    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGE_REACTION,
        params,
      },
    });
  }

  async fetchStageInstance(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.STAGE_INSTANCE,
        params,
      },
    });
  }

  async fetchStoreApplicationAssets(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.STORE_APPLICATION_ASSETS,
        params,
      },
    });
  }

  async fetchStorePublishedListingsSkus(
    applicationId: string,
  ): Promise<any> {
    const query = {
      application_id: applicationId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.STORE_PUBLISHED_LISTINGS_SKUS,
      },
      useAuth: false,
    });
  }

  async fetchStorePublishedListingsSku(
    skuId: string,
  ): Promise<any> {
    const query = {skuId};
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.STORE_PUBLISHED_LISTINGS_SKU,
      },
    });
  }

  async fetchStorePublishedListingsSkuSubscriptionPlans(
    skuId: string,
  ): Promise<any> {
    const query = {skuId};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.STORE_PUBLISHED_LISTINGS_SKU_SUBSCRIPTION_PLANS,
      },
    });
  }

  async fetchStreamPreview(streamKey: string): Promise<any> {
    const params = {streamKey};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.STREAM_PREVIEW,
        params,
      }
    });
  }

  fetchTeams(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAMS,
      },
    });
  }

  async fetchTeam(
    teamId: string,
  ): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAM,
        params,
      },
    });
  }

  async fetchTeamApplications(
    teamId: string,
  ): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAM_APPLICATIONS,
        params,
      },
    });
  }

  async fetchTeamMembers(
    teamId: string,
  ): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAM_MEMBERS,
        params,
      },
    });
  }

  async fetchTeamMember(
    teamId: string,
    userId: string,
  ): Promise<any> {
    const params = {teamId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAM_MEMBER,
        params,
      },
    });
  }

  async fetchTeamPayouts(
    teamId: string,
    options: RequestTypes.FetchTeamPayouts = {},
  ): Promise<any> {
    const params = {teamId};
    const query = {
      limit: options.limit,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.GET,
        path: Api.TEAM_PAYOUTS,
        params,
      },
    });
  }

  async fetchTemplate(
    templateId: string,
  ): Promise<any> {
    const params = {templateId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.GUILDS_TEMPLATE,
        params,
      },
    });
  }

  async fetchThreadMembers(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CHANNEL_THREAD_MEMBERS,
        params,
      },
    });
  }

  async fetchUser(
    userId: string,
  ): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.USER,
        params,
      },
    });
  }

  async fetchUserActivityMetadata(
    userId: string,
    sessionId: string,
    activityId: string,
  ): Promise<any> {
    const params = {userId, sessionId, activityId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.USER_ACTIVITY_METADATA,
        params,
      },
    });
  }

  async fetchUserChannels(
    userId: string,
  ): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.USER_CHANNELS,
        params,
      },
    });
  }

  async fetchUserProfile(
    userId: string,
  ): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.USER_PROFILE,
        params,
      },
    });
  }

  fetchVoiceIce(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.VOICE_ICE,
      },
    });
  }

  async fetchVoiceRegions(
    guildId?: string,
  ): Promise<any> {
    const route: {
      method: string,
      path: string,
      params: Record<string, string>,
    } = {
      method: HTTPMethods.GET,
      path: Api.VOICE_REGIONS,
      params: {},
    };

    if (guildId) {
      route.path = Api.GUILD_REGIONS;
      route.params.guildId = <string> guildId;
      if (this.clientsideChecks) {

      }
    }

    return this.request({route});
  }

  async fetchWebhook(
    webhookId: string,
  ): Promise<any> {
    const params = {webhookId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async fetchWebhookToken(
    webhookId: string,
    webhookToken: string,
  ): Promise<any> {
    const params = {webhookId, webhookToken};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
      useAuth: false,
    });
  }

  async fetchWebhookTokenMessage(
    webhookId: string,
    webhookToken: string,
    messageId: string,
  ): Promise<any> {
    const params = {webhookId, webhookToken, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.WEBHOOK_TOKEN_MESSAGE,
        params,
      },
      useAuth: false,
    });
  }

  async followChannel(
    channelId: string,
    options: RequestTypes.FollowChannel,
  ): Promise<any> {
    const body = {
      webhook_channel_id: options.webhookChannelId,
    };
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_FOLLOWERS,
        params,
      },
    });
  }

  async forgotPassword(
    options: RequestTypes.ForgotPassword,
  ): Promise<any> {
    const body = {
      email: options.email,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_FORGOT,
      },
    });
  }

  integrationJoin(
    integrationId: string,
  ): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.INTEGRATION_JOIN,
        params: {integrationId},
      },
    });
  }

  async joinGuild(
    guildId: string,
    options: RequestTypes.JoinGuild = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      lurker: options.lurker,
      session_id: options.sessionId,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: HTTPMethods.PUT,
        path: Api.GUILD_JOIN,
        params,
      },
    });
  }

  joinThread(channelId: string): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.PUT,
        path: Api.CHANNEL_THREAD_MEMBER_ME,
        params,
      },
    });
  }

  async leaveGuild(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_GUILD,
        params,
      },
    });
  }

  leaveThread(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_THREAD_MEMBER_ME,
        params,
      },
    });
  }

  async login(
    options: RequestTypes.Login,
  ): Promise<any> {
    const body = {
      captcha_key: options.captchaKey,
      email: options.email,
      gift_code_sku_id: options.giftCodeSKUId,
      login_source: options.loginSource,
      password: options.password,
      undelete: options.undelete,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_LOGIN,
      },
    });
  }

  async loginMfaSms(
    options: RequestTypes.LoginMfaSms,
  ): Promise<any> {
    const body = {
      code: options.code,
      gift_code_sku_id: options.giftCodeSKUId,
      login_source: options.loginSource,
      ticket: options.ticket,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_MFA_SMS,
      },
    });
  }

  async loginMfaSmsSend(
    options: RequestTypes.LoginMfaSmsSend,
  ): Promise<any> {
    const body = {
      ticket: options.ticket,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_MFA_SMS_SEND,
      },
    });
  }

  async loginMfaTotp(
    options: RequestTypes.LoginMfaTotp,
  ): Promise<any> {
    const body = {
      code: options.code,
      gift_code_sku_id: options.giftCodeSKUId,
      login_source: options.loginSource,
      ticket: options.ticket,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_MFA_TOTP,
      },
    });
  }

  async logout(
    options: RequestTypes.Logout = {},
  ): Promise<any> {
    const body = {
      provider: options.provider,
      token: options.token,
      voip_provider: options.voipProvider,
      voip_token: options.voipToken,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_LOGOUT,
      },
    });
  }

  async oauth2Authorize(
    options: RequestTypes.Oauth2Authorize = {},
  ): Promise<any> {
    const body = {
      authorize: options.authorize,
      bot_guild_id: options.botGuildId,
      captcha_key: options.captchaKey,
      permissions: options.permissions,
      webhook_channel_id: options.webhookChannelId,
      webhook_guild_id: options.webhookGuildId,
    };
    const query = {
      client_id: options.clientId,
      prompt: options.prompt,
      redirect_uri: options.redirectUri,
      response_type: options.responseType,
      scope: options.scope,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      query,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_AUTHORIZE,
      },
    });
  }

  async redeemGiftCode(
    code: string,
    options: RequestTypes.RedeemGiftCode = {},
  ): Promise<any> {
    const body = {
      channel_id: options.channelId,
    };
    const params = {code};
    if (this.clientsideChecks) {
      
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ENTITLEMENTS_GIFT_CODE_REDEEM,
        params,
      },
    });
  }

  async register(
    options: RequestTypes.Register,
  ): Promise<any> {
    const body = {
      captcha_key: options.captchaKey,
      consent: options.consent,
      email: options.email,
      fingerprint: options.fingerprint,
      gift_code_sku_id: options.giftCodeSKUId,
      invite: options.invite,
      password: options.password,
      username: options.username,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_REGISTER,
      },
    });
  }

  async removeGuildBan(
    guildId: string,
    userId: string,
    options: RequestTypes.RemoveGuildBan = {},
  ): Promise<any> {
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_BAN,
        params,
      },
    });
  }

  async removeGuildMember(
    guildId: string,
    userId: string,
    options: RequestTypes.RemoveGuildMember = {},
  ): Promise<any> {
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async removeGuildMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
    options: RequestTypes.RemoveGuildMemberRole = {},
  ): Promise<any> {
    const params = {guildId, userId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      headers: {
        [DiscordHeaders.AUDIT_LOG_REASON]: (options.reason) ? encodeURIComponent(options.reason) : options.reason,
      },
      route: {
        method: HTTPMethods.DELETE,
        path: Api.GUILD_MEMBER_ROLE,
        params,
      },
    });
  }

  async removeMention(
    messageId: string,
  ): Promise<any> {
    const params = {messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.ME_MENTION,
        params,
      },
    });
  }

  async removeOauth2ApplicationWhitelistUser(
    applicationId: string,
    userId: string,
  ): Promise<any> {
    const params = {applicationId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.OAUTH2_APPLICATION_WHITELIST_USER,
        params,
      },
    });
  }

  async removeRecipient(
    channelId: string,
    userId: string,
  ): Promise<any> {
    const params = {channelId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_RECIPIENT,
        params,
      },
    });
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
  ): Promise<any> {
    const params = {teamId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.TEAM_MEMBER,
        params,
      },
    });
  }

  async removeThreadMember(
    channelId: string,
    userId: string,
  ): Promise<any> {
    const params = {channelId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_THREAD_MEMBER,
        params,
      },
    });
  }

  async resetOauth2Application(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body: {},
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_RESET,
        params,
      },
    });
  }

  async resetOauth2ApplicationBot(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body: {},
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_BOT_RESET,
        params,
      },
    });
  }

  async resetPassword(
    options: RequestTypes.ResetPassword,
  ): Promise<any> {
    const body = {
      password: options.password,
      push_provider: options.pushProvider,
      push_token: options.pushToken,
      push_voip_provider: options.pushVoipProvider,
      push_voip_token: options.pushVoipToken,
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_RESET,
      },
    });
  }

  async resetPasswordMfa(
    options: RequestTypes.ResetPasswordMfa,
  ): Promise<any> {
    const body = {
      code: options.code,
      password: options.password,
      ticket: options.ticket,
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_RESET,
      },
    });
  }

  async search(
    searchType: 'channel' | 'guild',
    searchId: string,
    options: RequestTypes.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    const route: {
      method: string,
      path: string,
      params: Record<string, string>,
    } = {
      method: HTTPMethods.GET,
      path: '',
      params: {},
    };
    switch (searchType) {
      case 'channel': {
        route.path = Api.CHANNEL_MESSAGES_SEARCH;
        route.params.channelId = searchId;
      }; break;
      case 'guild': {
        route.path = Api.GUILD_SEARCH;
        route.params.guildId = searchId;
      }; break;
      default: {
        throw new Error('Invalid Search Type');
      };
    }

    const query = {
      attachment_extensions: options.attachmentExtensions,
      attachment_filename: options.attachmentFilename,
      author_id: options.authorId,
      channel_id: options.channelId,
      content: options.content,
      has: options.has,
      include_nsfw: options.includeNSFW,
      limit: options.limit,
      max_id: options.maxId,
      mentions: options.mentions,
      min_id: options.minId,
      offset: options.offset,
    };
    if (this.clientsideChecks) {

    }

    const response = await this.request({
      dataOnly: false,
      query,
      route,
    });
    const body = await response.json();
    if (response.status === 202 && retry) {
      if (5 < ++retryNumber) {
        throw new Error('Retried 5 times, stopping the search.');
      }
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this.search(searchType, searchId, options, retry, retryNumber)
            .then(resolve)
            .catch(reject);
        }, body['retry_after'] || 5000);
      });
    }
    return body;
  }

  async searchChannel(
    channelId: string,
    options: RequestTypes.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    return this.search('channel', channelId, options, retry, retryNumber);
  }

  async searchGuild(
    guildId: string,
    options: RequestTypes.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    return this.search('guild', guildId, options, retry, retryNumber);
  }

  async searchLobbies(
    applicationId: string,
    options: RequestTypes.SearchLobbies = {},
  ): Promise<any> {
    const body = {
      application_id: applicationId,
      filter: options.filter,
      sort: options.sort,
      limit: options.limit,
      distance: options.distance,
    };
    if (this.clientsideChecks) {
      
    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.LOBBIES_SEARCH,
      },
    });
  }

  async sendDownloadText(
    number: string,
  ): Promise<any> {
    const body = {
      phone_number: number,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.DOWNLOAD_SMS,
      },
    });
  }

  async sendFriendRequest(
    options: RequestTypes.SendFriendRequest,
  ): Promise<any> {
    const body = {
      discriminator: options.discriminator,
      username: options.username,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_RELATIONSHIPS,
      },
    });
  }

  async sendLobbyData(
    lobbyId: string,
    data: string,
  ): Promise<any> {
    const body = {data};
    const params = {lobbyId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.LOBBY_SEND,
        params,
      },
    });
  }

  async startChannelCallRinging(
    channelId: string,
    options: RequestTypes.StartChannelCallRinging = {},
  ): Promise<any> {
    const body = {recipients: options.recipients};
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_CALL_RING,
        params,
      },
    });
  }

  async stopChannelCallRinging(
    channelId: string,
    options: RequestTypes.StopChannelCallRinging = {},
  ): Promise<any> {
    const body = {recipients: options.recipients};
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_CALL_STOP_RINGING,
        params,
      },
    });
  }

  async submitConnectionPinCode(
    platform: string,
    pin: string,
  ): Promise<any> {
    const params = {platform, pin};
    if (this.clientsideChecks) {

    }
    // after this request, continue to callback?
    return this.request({
      route: {
        method: HTTPMethods.GET,
        path: Api.CONNECTION_CALLBACK_CONTINUATION_PIN,
        params,
      },
    });
  }

  async submitOauth2ApplicationApproval(
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_APPROVALS,
        params,
      },
    });
  }

  async syncGuildIntegration(
    guildId: string,
    integrationId: string,
  ): Promise<any> {
    const params = {guildId, integrationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.GUILD_INTEGRATION_SYNC,
        params,
      },
    });
  }

  async transferOauth2Application(
    applicationId: string,
    options: RequestTypes.TransferOauth2Application,
  ): Promise<any> {
    const body = {
      code: options.code,
      team_id: options.teamId,
    };
    const params = {applicationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.OAUTH2_APPLICATION_TRANSFER,
        params,
      },
    });
  }

  async triggerTyping(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.CHANNEL_TYPING,
        params,
      },
    });
  }

  async unAckChannel(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
    }
    return this.request({
      route: {
        method: HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGES_ACK,
        params,
      },
    });
  }

  async verify(
    options: RequestTypes.Verify,
  ): Promise<any> {
    const body = {
      captcha_key: options.captchaKey,
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_VERIFY,
      },
    });
  }

  async verifyCaptcha(
    options: RequestTypes.VerifyCaptcha,
  ): Promise<any> {
    const body = {
      captcha_key: options.captchaKey,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: HTTPMethods.POST,
        path: Api.ME_CAPTCHA_VERIFY,
      },
    });
  }

  verifyResend(): Promise<any> {
    return this.request({
      route: {
        method: HTTPMethods.POST,
        path: Api.AUTH_VERIFY_RESEND,
      },
    });
  }
}
