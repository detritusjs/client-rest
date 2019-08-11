import * as os from 'os';
import { URL } from 'url';

import {
  Client as RestClient,
  Constants as RestConstants,
  Response,
} from 'detritus-rest';

import { BucketCollection, Bucket } from './bucket';
import {
  bufferToBase64,
  Types as VerifyTypes,
  verifyData,
} from './clientsidechecks';
import { AuthTypes, Package } from './constants';
import { Api } from './endpoints';
import { RestRequest } from './request';

import * as Types from './types';


const defaultHeaders: {[key: string]: string} = {
  'user-agent': [
    'DiscordBot',
    `(${Package.URL}, v${Package.VERSION})`,
    `(${os.type()} ${os.release()}; ${os.arch()})`,
    process.version.replace(/^v/, (process.release.name || 'node') + '/'),
  ].join(' '),
};

defaultHeaders['x-super-properties'] = Buffer.from(
  JSON.stringify({
    browser: process.release.name || 'node',
    browser_user_agent: defaultHeaders['user-agent'],
    browser_version: process.version,
    device: 'Detritus',
    os: os.type(),
    os_arch: os.arch(),
    os_version: os.release(),
  })
).toString('base64');


const requestDefaults = {
  dataOnly: true,
};

export type OnNotOkResponseCallback = (response: Response) => Promise<any> | any;

export interface ClientOptions {
  authType?: string | number,
  baseUrl?: string,
  bucketsExpireIn?: number,
  clientsideChecks?: boolean,
  errorOnRatelimit?: boolean,
  fingerprint?: string,
  globalBucket?: Bucket,
  onNotOkResponse?: OnNotOkResponseCallback,
  settings?: any,
}

export class Client {
  _authType: AuthTypes;
  buckets: BucketCollection;
  clientsideChecks: boolean;
  errorOnRatelimit?: boolean;
  fingerprint?: string;
  globalBucket: Bucket;
  restClient: RestClient;
  token?: string;

  onNotOkResponse?: OnNotOkResponseCallback;

  constructor(token?: string, options?: ClientOptions) {
    options = Object.assign({
      baseUrl: Api.URL_STABLE + Api.PATH,
      bucketsExpireIn: 30,
      errorOnRatelimit: false,
    }, options);

    this.restClient = new RestClient({
      baseUrl: options.baseUrl,
      headers: {
        'user-agent': defaultHeaders['user-agent'],
      },
      settings: options.settings,
    });

    this._authType = AuthTypes.USER;
    this.buckets = new BucketCollection({
      expireIn: options.bucketsExpireIn,
    });
    this.clientsideChecks = !!(options.clientsideChecks || options.clientsideChecks === undefined);
    this.errorOnRatelimit = options.errorOnRatelimit;
    this.fingerprint = options.fingerprint,
    this.globalBucket = options.globalBucket || new Bucket('global');
    this.token = token;

    this.onNotOkResponse = options.onNotOkResponse;

    Object.defineProperties(this, {
      _authType: {enumerable: false},
      restClient: {enumerable: false, writable: false},
      onNotOkResponse: {enumerable: false},
      token: {enumerable: false, writable: false},
    });

    if (options.authType !== undefined) {
      this.setAuthType(options.authType);
    }
  }

  get authType(): string {
    switch (this._authType) {
      case AuthTypes.BOT: return 'Bot';
      case AuthTypes.OAUTH: return 'Bearer';
    }
    return '';
  }

  get tokenFormatted(): string {
    if (this.token) {
      const authType = this.authType;
      if (authType) {
        return `${authType} ${this.token}`;
      }
      return this.token;
    }
    return '';
  }

  setAuthType(type: string | number): void {
    if (typeof(type) === 'string') {
      type = type.toUpperCase();
    }
    for (let key in AuthTypes) {
      if (typeof(type) === 'string') {

      }
      if (AuthTypes[key] === type || key === type) {
        this._authType = (<any> AuthTypes)[key];
        break;
      }
    }
  }

  async request(
    options?: Types.RequestOptions | string,
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = <Types.RequestOptions> {url: options, ...requestDefaults};
    } else {
      options = Object.assign({
        errorOnRatelimit: this.errorOnRatelimit,
      }, requestDefaults, options);
    }

    const request = await this.restClient.createRequest(options);
    if (
      (this.restClient.baseUrl instanceof URL) &&
      (request.url.host === this.restClient.baseUrl.host)
    ) {
      if (!('x-super-properties' in request.options.headers)) {
        request.options.headers['x-super-properties'] = defaultHeaders['x-super-properties'];
      }

      if (options.useAuth || options.useAuth === undefined) {
        if (this.token) {
          request.options.headers['authorization'] = this.tokenFormatted;
        } else if (this.fingerprint) {
          request.options.headers['x-fingerprint'] = this.fingerprint;
        }
      }
    }
  
    if (options.fingerprint) {
      request.options.headers['x-fingerprint'] = options.fingerprint;
    }

    if (options.token) {
      request.options.headers['authorization'] = options.token;
    }

    let response: Response;
    const restRequest = new RestRequest(this, request, options);
    if (restRequest.bucket && !options.errorOnRatelimit) {
      const bucket = <Bucket> restRequest.bucket;
      response = await new Promise((resolve, reject) => {
        const delayed = {request: restRequest, resolve, reject};
        if (this.globalBucket.locked) {
          this.globalBucket.add(delayed);
        } else {
          bucket.add(delayed);
          this.buckets.stopExpire(bucket);
        }
      });
    } else {
      response = await restRequest.send();
    }

    if (options.dataOnly) {
      return response.body();
    } else {
      return response;
    }
  }

  /* -- Rest Requests Start -- */

  async acceptAgreements(
    privacy: boolean = true,
    terms: boolean = true,
  ): Promise<any> {
    return this.request({
      body: {privacy, terms},
      route: {
        method: RestConstants.HTTPMethods.PATCH,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.INVITE,
        params: {code},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.TEAMS_INVITE_ACCEPT,
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
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_ACK,
        params,
      },
    });
  }

  async addConnection(
    platform: string,
    accountId: string,
    options: Types.AddConnection,
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.ME_CONNECTION,
        params,
      },
    });
  }

  async addGuildMember(
    guildId: string,
    userId: string,
    options: Types.AddGuildMember,
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async addGuildMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<any> {
    const params = {guildId, userId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.PUT,
        path: Api.GUILD_MEMBER_ROLE,
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
        method: RestConstants.HTTPMethods.PUT,
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.CHANNEL_RECIPIENT,
        params,
      },
    });
  }

  async addTeamMember(
    teamId: string,
    options: Types.AddTeamMember,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.TEAM_MEMBERS,
        params,
      },
    });
  }

  async authorizeIpAddress(
    options: Types.AuthorizeIpAddress,
  ): Promise<any> {
    const body = {
      token: options.token,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_AUTHORIZE_IP,
      },
    });
  }

  async beginGuildPrune(
    guildId: string,
    options: Types.BeginGuildPrune = {},
  ): Promise<any> {
    const params = {guildId};
    const query = {
      days: options.days,
      compute_prune_count: options.computePruneCount,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGES_BULK_DELETE,
        params,
      },
    });
  }

  async connectionCallback(
    platform: string,
    options: Types.ConnectionCallback,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.CONNECTION_CALLBACK,
        params,
      },
    });
  }

  async createApplicationNews(
    options: Types.CreateApplicationNews,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.APPLICATION_NEWS,
      },
    });
  }

  async createChannelInvite(
    channelId: string,
    options: Types.CreateChannelInvite = {},
  ): Promise<any> {
    const body = {
      max_age: options.maxAge,
      max_uses: options.maxUses,
      temporary: options.temporary,
      unique: options.unique,
    };
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_INVITES,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_STORE_LISTING_ENTITLEMENT_GRANT,
        params,
      },
    });
  }

  async createDm(
    options: Types.CreateDm = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.USER_CHANNELS,
        params: {userId: '@me'},
      },
    });
  }

  async createGuild(
    options: Types.CreateGuild,
  ): Promise<any> {
    const body = {
      channels: options.channels,
      default_message_notifications: options.defaultMessageNotifications,
      explicit_content_filter: options.explicitContentFilter,
      icon: bufferToBase64(options.icon),
      name: options.name,
      region: options.region,
      roles: options.roles,
      verification_level: options.verificationLevel,
    };

    if (this.clientsideChecks) {
      // verify channel and roles
    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILDS,
      },
    });
  }

  async createGuildBan(
    guildId: string,
    userId: string,
    options: Types.CreateGuildBan = {},
  ): Promise<any> {
    const params = {guildId, userId};
    const query = {
      'delete-message-days': options.deleteMessageDays,
      reason: options.reason,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.PUT,
        path: Api.GUILD_BAN,
        params,
      },
    });
  }

  async createGuildChannel(
    guildId: string,
    options: Types.CreateGuildChannel,
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
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_CHANNELS,
        params,
      },
    });
  }

  async createGuildEmoji(
    guildId: string,
    options: Types.CreateGuildEmoji,
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
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_EMOJIS,
        params,
      },
    });
  }

  async createGuildIntegration(
    guildId: string,
    options: Types.CreateGuildIntegration,
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
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_INTEGRATIONS,
        params,
      },
    });
  }

  async createGuildRole(
    guildId: string,
    options: Types.CreateGuildRole = {},
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
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_ROLES,
        params,
      },
    })
  }

  async createLobby(
    applicationId: string,
    options: Types.CreateLobby = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.LOBBIES,
      },
    });
  }

  async createMeBillingPaymentSource(
    options: Types.CreateMeBillingPaymentSource,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.ME_BILLING_PAYMENT_SOURCES,
      },
    });
  }

  async createMeBillingSubscription(
    options: Types.CreateMeBillingSubscription,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.ME_BILLING_SUBSCRIPTIONS,
      },
    });
  }

  async createMessage(
    channelId: string,
    options: Types.CreateMessage | string = {},
  ): Promise<any> {
    if (typeof(options) === 'string') {
      options = {content: options};
    }
    const body: {
      activity?: {
        party_id?: string,
        session_id?: string,
        type?: number,
      },
      application_id?: string,
      content?: string,
      embed?: any,
      hasSpoiler?: boolean,
      nonce?: string,
      tts?: boolean,
    } = {
      application_id: options.applicationId,
      content: options.content,
      embed: options.embed,
      hasSpoiler: options.hasSpoiler,
      nonce: options.nonce,
      tts: options.tts,
    };

    if (typeof(options.activity) === 'object') {
      body.activity = {
        party_id: options.activity.partyId,
        session_id: options.activity.sessionId,
        type: options.activity.type,
      };
    }
    if (typeof(options.embed) === 'object') {
      body.embed = Object.assign({}, options.embed);
      if (typeof(body.embed.author) === 'object') {
        body.embed.author = {
          name: body.embed.author.name,
          url: body.embed.author.url,
          icon_url: body.embed.author.iconUrl,
        };
      }
      if (typeof(body.embed.footer) === 'object') {
        body.embed.footer = {
          text: body.embed.footer.text,
          icon_url: body.embed.footer.iconUrl,
        };
      }
    }

    const files: Array<Types.RequestFile> = [];
    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        files.push(file);
      }
    }

    const params = {channelId};
    if (this.clientsideChecks) {
      verifyData(params, {
        channelId: {required: true, type: VerifyTypes.SNOWFLAKE},
      });
      verifyData(body, {
        activity: {type: VerifyTypes.OBJECT},
        application_id: {type: VerifyTypes.SNOWFLAKE},
        content: {type: VerifyTypes.STRING},
        embed: {type: VerifyTypes.OBJECT},
        hasSpoiler: {type: VerifyTypes.BOOLEAN},
        nonce: {type: VerifyTypes.STRING},
        tts: {type: VerifyTypes.BOOLEAN},
      });
      if ('activity' in body) {
        verifyData(<{[key: string]: string}> body.activity, {
          party_id: {type: VerifyTypes.STRING},
          session_id: {type: VerifyTypes.STRING},
          type: {type: VerifyTypes.NUMBER},
        });
      }
    }

    if (
      !('activity' in body) &&
      !('content' in body) &&
      !('embed' in body) &&
      !files.length
    ) {
      throw new Error('Cannot send an empty message.');
    }

    return this.request({
      body,
      files,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGES,
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.CHANNEL_MESSAGE_REACTION_USER,
        params,
      },
    });
  }

  async createTeam(
    options: Types.CreateTeam = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.TEAMS,
      },
    });
  }

  async createWebhook(
    channelId: string,
    options: Types.CreateWebhook,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_WEBHOOKS,
        params,
      },
    });
  }

  async deleteAccount(
    options: Types.DeleteAccount,
  ): Promise<any> {
    const body = {
      code: options.code,
      password: options.password,
    };
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.ME_DELETE_ACCOUNT,
      },
    });
  }

  async deleteChannel(
    channelId: string,
  ): Promise<any> {
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.CHANNEL,
        params,
      },
    });
  }

  async deleteChannelOverwrite(
    channelId: string,
    overwriteId: string,
  ): Promise<any> {
    const params = {channelId, overwriteId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.ME_CONNECTION,
        params,
      },
    });
  }

  async deleteGuild(
    guildId: string,
    options: Types.DeleteGuild = {},
  ): Promise<any> {
    const body = {code: options.code};
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_DELETE,
        params,
      },
    });
  }

  async deleteGuildEmoji(
    guildId: string,
    emojiId: string,
  ): Promise<any> {
    const params = {guildId, emojiId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_EMOJI,
        params,
      },
    });
  }

  async deleteGuildIntegration(
    guildId: string,
    integrationId: string,
  ): Promise<any> {
    const params = {guildId, integrationId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_INTEGRATIONS,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_PREMIUM_SUBSCRIPTION,
        params,
      },
    });
  }

  async deleteGuildRole(
    guildId: string,
    roleId: string,
  ): Promise<any> {
    const params = {guildId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_ROLE,
        params,
      },
    });
  }

  async deleteInvite(
    code: string,
  ): Promise<any> {
    const params = {code};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.ME_BILLING_SUBSCRIPTION,
        params,
      },
    });
  }

  async deleteMessage(
    channelId: string,
    messageId: string,
  ): Promise<any> {
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE,
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
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGE_REACTIONS,
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
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.ME_RELATIONSHIP,
        params,
      },
    });
  }

  async deleteTeam(
    teamId: string,
    options: Types.DeleteTeam = {},
  ): Promise<any> {
    const body = {code: options.code};
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.TEAM_DELETE,
        params,
      },
    });
  }

  async deleteWebhook(
    webhookId: string,
  ): Promise<any> {
    const params = {webhookId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async deleteWebhookToken(
    webhookId: string,
    token: string,
  ): Promise<any> {
    const params = {webhookId, token};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
      useAuth: false,
    });
  }

  async disableAccount(
    options: Types.DisableAccount,
  ): Promise<any> {
    const body = {
      code: options.code,
      password: options.password,
    };
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.ME_DISABLE_ACCOUNT,
      },
    });
  }

  async editApplicationNews(
    newsId: string,
    options: Types.EditApplicationNews = {},
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.APPLICATION_NEWS_ID,
        params,
      },
    })
  }

  async editChannel(
    channelId: string,
    options: Types.EditChannel = {},
  ): Promise<any> {
    const body = {
      bitrate: options.bitrate,
      icon: bufferToBase64(options.icon),
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites,
      position: options.position,
      rate_limit_per_user: options.rateLimitPerUser,
      topic: options.topic,
      type: options.type,
      user_limit: options.userLimit,
    };
    const params = {channelId};

    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.CHANNEL,
        params,
      },
    });
  }

  async editChannelOverwrite(
    channelId: string,
    overwriteId: string,
    options: Types.EditChannelOverwrite = {},
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
      route: {
        method: RestConstants.HTTPMethods.PUT,
        path: Api.CHANNEL_PERMISSION,
        params,
      },
    });
  }

  async editConnection(
    platform: string,
    accountId: string,
    options: Types.EditConnection = {},
  ): Promise<any> {
    return this.request({
      body: {
        friend_sync: options.friendSync,
        visibility: options.visibility,
      },
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME_CONNECTION,
        params: {platform, accountId},
      },
    });
  }

  async editGuild(
    guildId: string,
    options: Types.EditGuild = {},
  ): Promise<any> {
    const body = {
      afk_channel_id: options.afkChannelId,
      afk_timeout: options.afkTimeout,
      banner: bufferToBase64(options.banner),
      code: options.code,
      default_message_notifications: options.defaultMessageNotifications,
      description: options.description,
      explicit_content_filter: options.explicitContentFilter,
      features: options.features,
      icon: bufferToBase64(options.icon),
      name: options.name,
      owner_id: options.ownerId,
      preferred_locale: options.preferredLocale,
      region: options.region,
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD,
        params,
      },
    });
  }

  async editGuildChannels(
    guildId: string,
    channels: Types.EditGuildChannels,
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_CHANNELS,
        params,
      },
    });
  }

  async editGuildEmbed(
    guildId: string,
    options: Types.EditGuildEmbed,
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_EMBED,
        params,
      },
    });
  }

  async editGuildEmoji(
    guildId: string,
    emojiId: string,
    options: Types.EditGuildEmoji = {},
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_EMOJI,
        params,
      },
    });
  }

  async editGuildIntegration(
    guildId: string,
    integrationId: string,
    options: Types.EditGuildIntegration = {},
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_INTEGRATION,
        params,
      },
    });
  }

  async editGuildMember(
    guildId: string,
    userId: string,
    options: Types.EditGuildMember = {},
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async editGuildMfaLevel(
    guildId: string,
    options: Types.EditGuildMfaLevel,
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
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_MFA,
        params,
      },
    });
  }

  async editGuildNick(
    guildId: string,
    nick: string,
    userId: string = '@me',
  ): Promise<any> {
    const body = {nick};
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_MEMBER_NICK,
        params,
      },
    });
  }

  async editGuildRole(
    guildId: string,
    roleId: string,
    options: Types.EditGuildRole = {},
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_ROLE,
        params,
      },
    });
  }

  async editGuildRolePositions(
    guildId: string,
    roles: Types.EditGuildRolePositions,
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_ROLES,
        params,
      },
    })
  }

  async editGuildVanity(
    guildId: string,
    code: string,
  ): Promise<any> {
    const body = {code};
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.GUILD_VANITY_URL,
        params,
      },
    });
  }

  async editLobby(
    lobbyId: string,
    options: Types.EditLobby = {},
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.LOBBY,
        params,
      },
    });
  }

  async editLobbyMember(
    lobbyId: string,
    userId: string,
    options: Types.EditLobbyMember = {},
  ): Promise<any> {
    const body = {metadata: options.metadata};
    const params = {lobbyId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.LOBBY_MEMBER,
        params,
      },
    });
  }

  async editMe(
    options: Types.EditMe = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
      code: options.code,
      discriminator: options.discriminator,
      email: options.email,
      flags: options.flags,
      new_password: options.newPassword,
      password: options.password,
      username: options.username,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME,
      },
    });
  }

  async editMeBillingPaymentSource(
    paymentSourceId: string,
    options: Types.EditMeBillingPaymentSource = {},
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME_BILLING_PAYMENT_SOURCE,
        params,
      },
    });
  }

  async editMeBillingSubscription(
    subscriptionId: string,
    options: Types.EditMeBillingSubscription = {},
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME_BILLING_SUBSCRIPTION,
        params,
      },
    });
  }

  async editMessage(
    channelId: string,
    messageId: string,
    options: Types.EditMessage = {},
  ): Promise<any> {
    const body = {
      content: options.content,
      embed: options.embed,
    };
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME_NOTE,
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.ME_RELATIONSHIP,
        params,
      },
    });
  }

  async editSettings(
    options: Types.EditSettings = {},
  ): Promise<any> {
    const body = Object.assign({}, options);
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.ME_SETTINGS,
      },
    });
  }

  async editTeam(
    teamId: string,
    options: Types.EditTeam = {},
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
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.TEAM,
        params,
      },
    });
  }

  async editUser(options: Types.EditMe): Promise<any> {
    return this.editMe(options);
  }

  async editWebhook(
    webhookId: string,
    options: Types.EditWebhook = {},
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
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async editWebhookToken(
    webhookId: string,
    token: string,
    options: Types.EditWebhook = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
      channel_id: options.channelId,
      name: options.name,
    };
    const params = {webhookId, token};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.PATCH,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
    });
  }

  async executeWebhook(
    webhookId: string,
    token: string,
    options: Types.ExecuteWebhook = {},
    compatibleType?: string,
  ): Promise<any> {
    const body: {
      avatar_url?: string,
      content?: string,
      embeds?: Array<any>,
      tts?: boolean,
      username?: string,
    } = {
      avatar_url: options.avatarUrl,
      content: options.content,
      tts: options.tts,
      username: options.username,
    };
    const files: Array<Types.RequestFile> = [];
    const params = {webhookId, token};
    const query: {wait?: boolean} = {};
    const route = {
      method: RestConstants.HTTPMethods.POST,
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

    if (options.file) {
      files.push(options.file);
    }
    if (options.files && options.files.length) {
      for (let file of options.files) {
        files.push(file);
      }
    }

    if (options.embed) {
      body.embeds = [options.embed];
    }
    if (options.embeds && options.embeds.length) {
      if (!body.embeds) {
        body.embeds = [];
      }
      for (let embed of options.embeds) {
        body.embeds.push(embed);
      }
    }
    if (body.embeds) {
      body.embeds = body.embeds.map((embed) => {
        embed = Object.assign({}, embed);
        if (typeof(embed.author) === 'object') {
          embed.author = {
            name: embed.author.name,
            url: embed.author.url,
            icon_url: embed.author.iconUrl,
          };
        }
        if (typeof(embed.footer) === 'object') {
          embed.footer = {
            text: embed.footer.text,
            icon_url: embed.footer.iconUrl,
          };
        }
        return embed;
      });
    }

    if (options.wait) {
      query.wait = options.wait;
    }

    if (this.clientsideChecks) {
      // verify body
      // verify files?
      verifyData(params, {
        token: {required: true, type: VerifyTypes.STRING},
        webhookId: {required: true, type: VerifyTypes.SNOWFLAKE},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.ACTIVITIES,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.APPLICATION_NEWS_ID,
        params,
      },
    });
  }

  fetchApplications(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.APPLICATIONS,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.APPLICATIONS_PUBLIC,
      },
    });
  }

  async fetchApplicationsTrendingGlobal(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.APPLICATIONS_TRENDING_GLOBAL,
      },
    });
  }

  fetchAuthConsentRequired(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.AUTH_CONSENT_REQUIRED,
      },
    });
  }

  async fetchDms(userId: string = '@me'): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.USER_CHANNELS,
        params,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_STORE_LISTING,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_WEBHOOKS,
        params,
      },
    });
  }

  fetchConsentRequired(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CONNECTION_AUTHORIZE,
        params,
      },
    });
  }

  fetchExperiments(
    fingerprint?: string,
  ): Promise<any> {
    const headers: {[key: string]: string} = {};
    if (fingerprint) {
      headers['x-fingerprint'] = <string> fingerprint;
    }
    return this.request({
      headers,
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.EXPERIMENTS,
      },
    });
  }

  fetchGateway(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.GATEWAY,
      },
    });
  }

  fetchGatewayBot(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.GATEWAY_BOT,
      },
    });
  }

  async fetchGiftCode(
    code: string,
    options: Types.FetchGiftCode = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.ENTITLEMENTS_GIFT_CODE,
        params,
      },
    });
  }

  fetchGuilds(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILDS,
      },
    });
  }

  async fetchGuild(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_APPLICATIONS,
        params,
      },
    });
  }

  async fetchGuildAuditLogs(
    guildId: string,
    options: Types.FetchGuildAuditLogs,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_INVITES,
        params,
      },
    });
  }

  async fetchGuildMembers(
    guildId: string,
    options: Types.FetchGuildMembers = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_EMOJIS,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_MEMBER,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_PREMIUM_SUBSCRIPTIONS,
        params,
      },
    });
  }

  async fetchGuildPruneCount(
    guildId: string,
  ): Promise<any> {
    const params = {guildId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_ROLES,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.GUILD_WEBHOOKS,
        params,
      },
    });
  }

  async fetchInvite(
    code: string,
    options: Types.FetchInvite = {},
  ): Promise<any> {
    const params = {code};
    const query = {
      with_counts: options.withCounts,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.INVITE,
        params,
      },
    });
  }

  fetchMe(): Promise<any> {
    return this.request({
      route: {
        path: Api.ME,
      },
    });
  }

  fetchMeBillingPaymentSources(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.ME_BILLING_PAYMENT_SOURCES,
      }
    })
  }

  async fetchMeBillingPayments(
    options: Types.FetchMeBillingPayments = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.ME_BILLING_PAYMENTS,
      },
    });
  }

  fetchMeBillingSubscriptions(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.ME_BILLING_SUBSCRIPTIONS,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.ME_CONNECTION_REDDIT_SUBREDDITS,
        params,
      },
    });
  }

  async fetchMeFeedSettings(
    options: Types.FetchMeFeedSettings = {},
  ): Promise<any> {
    const query = {
      include_autosubscribed_game: options.includeAutosubscribedGames,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.ME_FEED_SETTINGS,
      },
    });
  }

  async fetchMentions(
    options: Types.FetchMentions = {},
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGE,
        params,
      },
    });
  }

  async fetchMessages(
    channelId: string,
    options: Types.FetchMessages = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGES,
        params,
      },
    });
  }

  async fetchOauth2Applications(
    options: Types.FetchOauth2Applications = {},
  ): Promise<any> {
    const query = {
      with_team_applications: options.withTeamApplications,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.OAUTH2_APPLICATION,
        params,
      },
    });
  }

  fetchOauth2Tokens(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_PINS,
        params,
      },
    });
  }

  async fetchReactions(
    channelId: string,
    messageId: string,
    emoji: string,
    options: Types.FetchReactions = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGE_REACTIONS,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.STORE_PUBLISHED_LISTINGS_SKU_SUBSCRIPTION_PLANS,
      },
    });
  }

  fetchTeams(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAMS,
      },
    });
  }

  async fetchTeam(teamId: string): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAM,
        params,
      },
    });
  }

  async fetchTeamApplications(teamId: string): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAM_APPLICATIONS,
        params,
      },
    });
  }

  async fetchTeamMembers(teamId: string): Promise<any> {
    const params = {teamId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAM_MEMBERS,
        params,
      },
    });
  }

  async fetchTeamMember(teamId: string, userId: string): Promise<any> {
    const params = {teamId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAM_MEMBER,
        params,
      },
    });
  }

  async fetchTeamPayouts(
    teamId: string,
    options: Types.FetchTeamPayouts = {},
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.TEAM_PAYOUTS,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.USER,
        params,
      },
    });
  }

  async fetchUserChannels(
    userId: string = '@me',
  ): Promise<any> {
    const params = {userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.USER_PROFILE,
        params,
      },
    });
  }

  async fetchWebhook(
    webhookId: string,
  ): Promise<any> {
    const params = {webhookId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.WEBHOOK,
        params,
      },
    });
  }

  async fetchWebhookToken(
    webhookId: string,
    token: string,
  ): Promise<any> {
    const params = {webhookId, token};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.WEBHOOK_TOKEN,
        params,
      },
    });
  }

  fetchVoiceIce(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
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
      params: {[key: string]: string},
    } = {
      method: RestConstants.HTTPMethods.GET,
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

  async forgotPassword(
    options: Types.ForgotPassword,
  ): Promise<any> {
    const body = {
      email: options.email,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_FORGOT,
      },
    });
  }

  integrationJoin(
    integrationId: string,
  ): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.INTEGRATION_JOIN,
        params: {integrationId},
      },
    });
  }

  async joinGuild(
    guildId: string,
    options: Types.JoinGuild = {},
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
        method: RestConstants.HTTPMethods.PUT,
        path: Api.GUILD_JOIN,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.ME_GUILD,
        params,
      },
    });
  }

  async login(
    options: Types.Login,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_LOGIN,
      },
    });
  }

  async loginMfaSms(
    options: Types.LoginMfaSms,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_MFA_SMS,
      },
    });
  }

  async loginMfaSmsSend(
    options: Types.LoginMfaSmsSend,
  ): Promise<any> {
    const body = {
      ticket: options.ticket,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_MFA_SMS_SEND,
      },
    });
  }

  async loginMfaTotp(
    options: Types.LoginMfaTotp,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_MFA_TOTP,
      },
    });
  }

  async logout(
    options: Types.Logout = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_LOGOUT,
      },
    });
  }

  async messageSuppressEmbeds(
    channelId: string,
    messageId: string,
    options: Types.MessageSuppressEmbeds = {},
  ): Promise<any> {
    const body = {
      suppress: options.suppress,
    };
    const params = {channelId, messageId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_MESSAGE_SUPPRESS_EMBEDS,
        params,
      },
    });
  }

  async redeemGiftCode(
    code: string,
    options: Types.RedeemGiftCode = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.ENTITLEMENTS_GIFT_CODE_REDEEM,
        params,
      },
    });
  }

  async register(
    options: Types.Register,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_REGISTER,
      },
    });
  }

  async removeGuildBan(
    guildId: string,
    userId: string,
  ): Promise<any> {
    const params = {guildId, userId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_BAN,
        params,
      },
    });
  }

  async removeGuildMember(
    guildId: string,
    userId: string,
    options: Types.RemoveGuildMember = {},
  ): Promise<any> {
    const params = {guildId, userId};
    const query = {
      reason: options.reason,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      query,
      route: {
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.GUILD_MEMBER,
        params,
      },
    });
  }

  async removeGuildMemberRole(
    guildId: string,
    userId: string,
    roleId: string,
  ): Promise<any> {
    const params = {guildId, userId, roleId};
    if (this.clientsideChecks) {

    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.ME_MENTION,
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
        method: RestConstants.HTTPMethods.DELETE,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.TEAM_MEMBER,
        params,
      },
    });
  }

  async resetPassword(
    options: Types.ResetPassword,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_RESET,
      },
    });
  }

  async resetPasswordMfa(
    options: Types.ResetPasswordMfa,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_PASSWORD_RESET,
      },
    });
  }

  async search(
    searchType: 'channel' | 'guild',
    searchId: string,
    options: Types.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    const route: {
      method: string,
      path: string,
      params: {[key: string]: string},
    } = {
      method: RestConstants.HTTPMethods.GET,
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
      max_id: options.maxId,
      mentions: options.mentions,
      min_id: options.minId,
    };
    if (this.clientsideChecks) {

    }

    const response = await this.request({
      dataOnly: false,
      query,
      route,
    });
    const body = await response.body();
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
    options: Types.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    return this.search('channel', channelId, options, retry, retryNumber);
  }

  async searchGuild(
    guildId: string,
    options: Types.SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    return this.search('guild', guildId, options, retry, retryNumber);
  }

  async searchLobbies(
    applicationId: string,
    options: {
      filter?: Array<{key: string, comparison: number, cast: number, value: string}>,
      sort?: Array<{key: string, cast: number, near_value: string}>,
      limit?: number,
      distance?: number,
    } = {},
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.LOBBY_SEARCH,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.DOWNLOAD_SMS,
      },
    });
  }

  async sendFriendRequest(
    options: Types.SendFriendRequest,
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
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.LOBBY_SEND,
        params,
      },
    });
  }

  async startChannelCallRinging(
    channelId: string,
    options: Types.StartChannelCallRinging = {},
  ): Promise<any> {
    const body = {recipients: options.recipients};
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.CHANNEL_CALL_RING,
        params,
      },
    });
  }

  async stopChannelCallRinging(
    channelId: string,
    options: Types.StopChannelCallRinging = {},
  ): Promise<any> {
    const body = {recipients: options.recipients};
    const params = {channelId};
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.GET,
        path: Api.CONNECTION_CALLBACK_CONTINUATION_PIN,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.GUILD_INTEGRATION_SYNC,
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
        method: RestConstants.HTTPMethods.POST,
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
        method: RestConstants.HTTPMethods.DELETE,
        path: Api.CHANNEL_MESSAGES_ACK,
        params,
      },
    });
  }

  async verify(
    options: Types.Verify,
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
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_VERIFY,
      },
    });
  }

  async verifyCaptcha(
    options: Types.VerifyCaptcha,
  ): Promise<any> {
    const body = {
      captcha_key: options.captchaKey,
    };
    if (this.clientsideChecks) {

    }
    return this.request({
      body,
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.ME_CAPTCHA_VERIFY,
      },
    });
  }

  verifyResend(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.AUTH_VERIFY_RESEND,
      },
    });
  }
}
