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
  fingerprint?: string,
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
  fingerprint?: string;
  globalBucket: Bucket;
  restClient: RestClient;
  token?: string;

  constructor(token?: string, options?: {
    authType?: string | number,
    baseUrl?: string,
    bucketsExpireIn?: number,
    clientsideChecks?: boolean,
    fingerprint?: string,
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
    this.fingerprint = options.fingerprint,
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

  async createMeBillingPaymentSource(
    options: {
      billingAddress: {
        city: string,
        country: string,
        line1: string,
        line2: string,
        name: string,
        postalCode: string,
        state: string,
      },
      paymentGateway: string,
      token: string,
    }
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
    options: {
      paymentGatewayPlanId: string,
      paymentSourceId: string,
      trialId?: string,
    },
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

  async editMeBillingPaymentSource(
    paymentSourceId: string,
    options: {
      billingAddress?: {
        city: string,
        country: string,
        line1: string,
        line2: string,
        name: string,
        postalCode: string,
        state: string,
      },
      default?: boolean,
    } = {},
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
    options: {
      paymentGatewayPlanId?: string,
      paymentSourceId?: string,
      status?: string,
    } = {},
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

  async fetchActivities(): Promise<any> {
    return this.request({
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.ACTIVITIES,
      },
    });
  }

  async fetchApplicationNews(
    applicationIds: string | Array<string>,
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
    applicationId: string,
  ): Promise<any> {
    const params = {applicationId};
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
    options: {
      actionType?: number,
      before?: string,
      limit?: number,
      userId?: string,
    },
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
    options: {
      after?: string,
      limit?: number,
    } = {},
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
    options: {
      withCounts?: boolean,
    } = {},
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
    options: {
      beforeId?: string,
      limit?: number,
    } = {},
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
    options: {
      includeAutosubscribedGames?: boolean,
    } = {},
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
    options: {
      after?: string,
      around?: string,
      before?: string,
      everyone?: boolean,
      limit?: number,
      roles?: boolean,
    } = {},
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
    options: {
      after?: string,
      around?: string,
      before?: string,
      limit?: number,
    } = {},
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
      route: {
        method: RestConstants.HTTPMethods.GET,
        path: Api.CHANNEL_MESSAGE,
        params,
      },
    });
  }

  fetchOauth2Applications(): Promise<any> {
    return this.request({
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
    options: {
      after?: string,
      before?: string,
      limit?: number,
    } = {},
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

  async search(
    searchType: 'channel' | 'guild',
    searchId: string,
    options: SearchOptions = {},
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
    options: SearchOptions = {},
    retry: boolean = true,
    retryNumber: number = 0,
  ): Promise<any> {
    return this.search('channel', channelId, options, retry, retryNumber);
  }

  async searchGuild(
    guildId: string,
    options: SearchOptions = {},
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
    const body = {number};
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
    options: {
      discriminator: string,
      username: string,
    },
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
    options: {
      recipients?: Array<string>,
    } = {},
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
    options: {
      recipients?: Array<string>,
    } = {},
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

  async verifyCaptcha(
    options: {
      captchaKey: string
    },
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

interface SearchOptions {
  attachmentFilename?: string | Array<string>,
  attachmentExtensions?: string | Array<string>,
  authorId?: string | Array<string>,
  channelId?: string,
  content?: string,
  has?: string | Array<string>,
  includeNSFW?: boolean,
  maxId?: string,
  mentions?: string | Array<string>,
  minId?: string,
}
