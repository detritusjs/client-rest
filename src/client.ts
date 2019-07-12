import * as os from 'os';
import { URL } from 'url';

import {
  Client as RestClient,
  Constants as RestConstants,
  Response,
  Route,
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


interface RequestFile {
  contentType?: string,
  data: any,
  filename?: string,
  name?: string,
};

interface RequestOptions {
  body?: any,
  dataOnly?: boolean,
  files?: Array<RequestFile>,
  headers?: {[key: string]: string},
  jsonify?: boolean,
  method?: string,
  multipart?: boolean,
  path?: string,
  query?: {
    [key: string]: any,
  },
  route?: Route | {
    method?: string,
    params?: {[key: string]: string},
    path?: string,
    urlPath?: null,
  },
  settings?: {
    multipartJsonKey?: string,
    timeout?: number,
  },
  token?: string,
  url?: string | URL,
  useAuth?: boolean,
};


const defaults = {
  dataOnly: true,
};


export class Client {
  _authType: AuthTypes;
  buckets: BucketCollection;
  clientsideChecks: boolean;
  globalBucket: Bucket;
  restClient: RestClient;
  token: string;

  constructor(token: string, options?: {
    authType?: string | number,
    baseUrl?: string,
    bucketsExpireIn?: number,
    clientsideChecks?: boolean,
    globalBucket?: Bucket,
    settings?: any,
  }) {
    options = Object.assign({
      baseUrl: Api.URL_STABLE + Api.PATH,
      bucketsExpireIn: 30,
      clientsideChecks: true,
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
    this.clientsideChecks = <boolean> options.clientsideChecks;
    this.globalBucket = options.globalBucket || new Bucket('global');
    this.token = token;

    Object.defineProperties(this, {
      restClient: {enumerable: false, writable: false},
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
    const authType = this.authType;
    if (authType) {
      return `${authType} ${this.token}`;
    }
    return this.token;
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

  async request(options?: RequestOptions | string): Promise<any> {
    if (typeof(options) === 'string') {
      options = <RequestOptions> {url: options, ...defaults};
    } else {
      options = Object.assign({}, defaults, options);
    }

    const request = await this.restClient.createRequest(options);
    if (request.options.headers['user-agent'] !== defaultHeaders['user-agent']) {
      request.options.headers['user-agent'] = defaultHeaders['user-agent'];
    }

    if (
      (this.restClient.baseUrl instanceof URL) &&
      (request.url.host === this.restClient.baseUrl.host)
    ) {
      request.options.headers['x-super-properties'] = defaultHeaders['x-super-properties'];

      if (options.useAuth || options.useAuth === undefined) {
        request.options.headers['authorization'] = this.tokenFormatted;
      }
    }

    if (options.token) {
      request.options.headers['authorization'] = options.token;
    }

    let response: Response;
    const restRequest = new RestRequest(this, request);
    if (restRequest.bucket) {
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
    options: {
      name: string,
      friendSync?: boolean,
    },
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
    options: {
      accessToken: string,
      deaf?: boolean,
      mute?: boolean,
      nick?: string,
      roles?: Array<string>,
    },
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

  async beginGuildPrune(
    guildId: string,
    options: {
      days?: number,
      computePruneCount?: boolean,
    } = {},
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
    options: {
      code: string,
      friendSync: boolean,
      fromContinuation: boolean,
      insecure?: boolean,
      openIdParams: Object,
      state: string, 
    },
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

  async createDm(
    options: {
      recipientId?: string,
      recipients?: Array<string>,
    } = {},
  ): Promise<any> {
    const body = {
      recipient_id: options.recipientId,
      recipients: options.recipients,
    };
    if (this.clientsideChecks) {
      // both cannot be empty
    }
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.POST,
        path: Api.USER_CHANNELS,
      },
    });
  }

  async createChannelInvite(
    channelId: string,
    options: {
      maxAge?: number,
      maxUses?: number,
      temporary?: boolean,
      unique?: boolean,
    } = {},
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

  async createGuild(
    options: {
      channels?: Array<CreateGuildChannel>,
      defaultMessageNotifications?: number,
      explicitContentFilter?: number,
      icon?: Buffer | string,
      name: string,
      region: string,
      roles?: Array<CreateGuildRole>,
      verificationLevel?: number,
    }
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
    options: {
      deleteMessageDays?: string,
      reason?: string,
    } = {},
  ): Promise<any> {
    const query = {
      'delete-message-days': options.deleteMessageDays,
      reason: options.reason,
    };
    const params = {guildId, userId};
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
    options: CreateGuildChannel,
  ): Promise<any> {
    const body = {
      bitrate: options.bitrate,
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites,
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
    options: {
      name: string,
      image: Buffer | string,
      roles?: Array<string>,
    },
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
    options: {
      id: string,
      type: string,
    },
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
    options: CreateGuildRole = {},
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
    options: {
      capacity?: number,
      locked?: boolean,
      metadata?: any,
      ownerId?: string,
      type?: number,
    } = {},
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

  async createMessage(channelId: string, options: {
    activity?: {
      partyId?: string,
      sessionId?: string,
      type?: number,
    },
    applicationId?: string,
    content?: string,
    embed?: CreateChannelMessageEmbed,
    file?: RequestFile,
    files?: Array<RequestFile>,
    hasSpoiler?: boolean,
    nonce?: string,
    tts?: boolean,
  } = {}): Promise<any> {
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

    const files: Array<RequestFile> = [];
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

  async createWebhook(
    channelId: string,
    options: {
      avatar?: string,
      name: string,
    },
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
    options: {
      code?: string,
      password: string,
    },
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

  async deleteChannelPermission(
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
    options: {
      code?: string,
    },
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
    options: {
      code?: string,
      password: string,
    },
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

  async editChannel(
    channelId: string,
    options: {
      bitrate?: number,
      icon?: Buffer | string,
      name?: string,
      nsfw?: boolean,
      parentId?: string,
      permissionOverwrites?: Array<CreatePermissionOverwrite>,
      position?: string,
      topic?: string,
      userLimit?: number,
      rateLimitPerUser?: number,
    } = {},
  ): Promise<any> {
    const body = {
      bitrate: options.bitrate,
      icon: bufferToBase64(options.icon),
      name: options.name,
      nsfw: options.nsfw,
      parent_id: options.parentId,
      permission_overwrites: options.permissionOverwrites,
      position: options.position,
      topic: options.topic,
      user_limit: options.userLimit,
      rate_limit_per_user: options.rateLimitPerUser,
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

  async editChannelPermission(
    channelId: string,
    overwriteId: string,
    options: {
      allow?: number,
      deny?: number,
      type?: 'member' | 'role',
    } = {},
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
    options: {
      friendSync?: boolean,
      visibility?: boolean,
    } = {},
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
    options: {
      afkChannelId?: string,
      afkTimeout?: number,
      banner?: Buffer | string,
      code?: string,
      defaultMessageNotifications?: string,
      description?: string,
      explicitContentFilter?: number,
      features?: Array<string>,
      icon?: Buffer | string | null,
      name?: string,
      ownerId?: string,
      preferredLocale?: string,
      region?: string,
      splash?: Buffer | string | null,
      systemChannelFlags?: number,
      systemChannelId?: string,
      verificationLevel?: number,
    } = {},
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
    channels: Array<{
      id: string,
      lockPermissions?: boolean,
      parentId?: string,
      position?: number,
    }>,
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
    options: {
      channelId?: string,
      enabled: boolean,
    },
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
    options: {
      name?: string,
      roles?: Array<string>,
    } = {},
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
    options: {
      enableEmoticons?: boolean,
      expireBehavior?: number,
      expireGracePeriod?: number,
    } = {},
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
    options: {
      channelId?: string | null,
      deaf?: boolean,
      mute?: boolean,
      nick?: string,
      roles?: Array<string>,
    } = {},
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

  async editGuildMFALevel(
    guildId: string,
    options: {
      code: string,
      level: number,
    },
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
    options: {
      color?: number,
      hoist?: boolean,
      mentionable?: boolean,
      name?: string,
      permissions?: number,
    } = {},
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

  async editGuildRoles(
    guildId: string,
    roles: Array<{
      id: string,
      lockPermissions?: boolean,
      position?: number,
    }>
  ): Promise<any> {
    const body: Array<{
      id: string,
      lock_permissions?: boolean,
      position?: number,
    }> = [];
    const params = {guildId};
    for (let oldRole of roles) {
      const role = {
        id: oldRole.id,
        lock_permissions: oldRole.lockPermissions,
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
    options: {
      capacity?: number,
      locked?: boolean,
      metadata?: any,
      ownerId?: string,
      type?: number,
    } = {},
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
    options: {
      metadata?: any,
    } = {},
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
    options: {
      flags?: number,
    } = {},
  ): Promise<any> {
    const body = {
      flags: options.flags,
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

  async editMessage(
    channelId: string,
    messageId: string,
    options: {
      content?: string,
      embed?: CreateChannelMessageEmbed,
      mentions?: Array<any>, // idk, the sourcecode has this
    } = {},
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
    options: any = {},
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

  async editUser(
    options: {
      avatar?: Buffer | string | null,
      discriminator?: number | string,
      email?: string,
      newPassword?: string,
      password?: string,
      username?: string,
    } = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
      discriminator: options.discriminator,
      email: options.email,
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

  async editWebhook(
    webhookId: string,
    options: {
      avatar?: Buffer | string | null,
      channelId?: string,
      name?: string,
    } = {},
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
    options: {
      avatar?: Buffer | string | null,
      name?: string,
    } = {},
  ): Promise<any> {
    const body = {
      avatar: bufferToBase64(options.avatar),
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
    options: {
      avatarUrl?: string,
      content?: string,
      embed?: CreateChannelMessageEmbed,
      embeds?: Array<CreateChannelMessageEmbed>,
      file?: RequestFile,
      files?: Array<RequestFile>,
      tts?: boolean,
      username?: string,
      wait?: boolean,
    } = {},
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
    const files: Array<RequestFile> = [];
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

  async fetchApplications(
    guildId: string,
    channelId?: string,
  ): Promise<any> {
    const query = {channel_id: channelId};
    const params = {guildId};
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

  fetchMe(): Promise<any> {
    return this.request({
      route: {
        path: Api.ME,
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

  integrationJoin(integrationId: string): Promise<any> {
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
    options: {
      lurker?: boolean,
      sessionId?: string,
    } = {},
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

  async leaveGuild(guildId: string): Promise<any> {
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
    options: {reason?: string} = {},
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

  async unAckChannel(channelId: string): Promise<any> {
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
}

interface CreateChannelMessageEmbed {
  author?: {
    iconUrl?: string,
    name?: string,
    url?: string,
  },
  color?: number,
  description?: string,
  fields: Array<{
    inline?: boolean,
    name: string,
    value: string,
  }>,
  footer?: {
    iconUrl?: string,
    text: string,
  },
  image?: {
    url?: string,
  },
  provider?: {
    name?: string,
    url?: string,
  },
  thumbnail?: {
    url?: string,
  },
  timestamp?: string,
  title?: string,
  type?: string,
  url?: string,
  video?: {
    url?: string,
  },
}


interface CreatePermissionOverwrite {
  id: string,
  type: 'role' | 'member',
  allow: number,
  deny: number,
}

interface CreateGuildChannel {
  bitrate?: number,
  name: string,
  nsfw?: boolean,
  parentId?: string,
  permissionOverwrites?: Array<CreatePermissionOverwrite>,
  topic?: string,
  type: number,
  userLimit?: number,
}

interface CreateGuildRole {
  color?: number,
  hoist?: boolean,
  mentionable?: boolean,
  name?: string,
  permissions?: number,
}