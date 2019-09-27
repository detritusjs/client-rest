import { Request, Response, Route } from 'detritus-rest';

import { RestRequest } from './request';


export namespace RestClientEvents {
  export interface RequestPayload {
    request: Request,
    restRequest: RestRequest,
  }

  export interface ResponsePayload {
    response: Response,
    restRequest: RestRequest,
  }
}

export namespace RequestTypes {
  export interface RequestFile {
    contentType?: string,
    data: any,
    filename?: string,
    name?: string,
  };

  export interface RequestOptions {
    body?: any,
    dataOnly?: boolean,
    errorOnRatelimit?: boolean,
    files?: Array<RequestFile>,
    fingerprint?: string,
    headers?: {[key: string]: string | undefined},
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
    skipRatelimitCheck?: boolean,
    token?: string,
    url?: string | URL,
    useAuth?: boolean,
  };


  /* Option Interfaces */

  export interface ActivateOauth2ApplicationLicense {
    code?: string,
    guildId: string,
  }

  export interface AddConnection {
    name: string,
    friendSync?: boolean,
  }

  export interface AddGuildMember {
    accessToken: string,
    deaf?: boolean,
    mute?: boolean,
    nick?: string,
    roles?: Array<string>,
  }

  export interface AddGuildMemberRole {
    reason?: string,
  }

  export interface AddTeamMember {
    discriminator: string,
    username: string,
  }

  export interface AddOauth2ApplicationWhitelistUser {
    branchIds?: Array<string>,
    discriminator: string,
    username: string,
  }

  export interface AuthorizeIpAddress {
    token: string,
  }

  export interface BeginGuildPrune {
    computePruneCount?: boolean,
    days?: number,
    reason?: string,
  }

  export interface ConnectionCallback {
    code: string,
    friendSync: boolean,
    fromContinuation: boolean,
    insecure?: boolean,
    openIdParams: object,
    state: string,
  }

  export interface CreateApplicationNews {
    applicationId: string,
    channelId: string,
    description?: string,
    messageId: string,
    thumbnailOverride?: Buffer | string,
    title?: string,
    url?: string,
  }

  export interface CreateChannelInvite {
    maxAge?: number,
    maxUses?: number,
    temporary?: boolean,
    unique?: boolean,
  }

  export interface CreateChannelMessageEmbed {
    author?: {
      iconUrl?: string,
      name?: string,
      url?: string,
    },
    color?: number,
    description?: string,
    fields?: Array<{
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

  export interface CreateChannelMessageEmbedFunction {
    toJSON: () => RawChannelMessageEmbed,
  }

  export interface CreateChannelOverwrite {
    id: string,
    type: 'role' | 'member',
    allow: number,
    deny: number,
  }

  export interface CreateDm {
    recipientId?: string,
    recipients?: Array<string>,
  }

  export interface CreateGuild {
    channels?: Array<CreateGuildChannel>,
    defaultMessageNotifications?: number,
    explicitContentFilter?: number,
    icon?: Buffer | string,
    name: string,
    region: string,
    roles?: Array<CreateGuildRole>,
    verificationLevel?: number,
  }

  export interface CreateGuildBan {
    deleteMessageDays?: string,
    reason?: string,
  }

  export interface CreateGuildChannel {
    branchId?: string,
    bitrate?: number,
    name: string,
    nsfw?: boolean,
    parentId?: string,
    permissionOverwrites?: Array<CreateChannelOverwrite>,
    reason?: string,
    skuId?: string,
    topic?: string,
    type: number,
    userLimit?: number,
  }

  export interface CreateGuildEmoji {
    name: string,
    image: Buffer | string,
    reason?: string,
    roles?: Array<string>,
  }

  export interface CreateGuildIntegration {
    id: string,
    reason?: string,
    type: string,
  }

  export interface CreateGuildRole {
    color?: number,
    hoist?: boolean,
    mentionable?: boolean,
    name?: string,
    permissions?: number,
    reason?: string,
  }

  export interface CreateLobby {
    capacity?: number,
    locked?: boolean,
    metadata?: any,
    ownerId?: string,
    type?: number,
  }

  export interface CreateMeBillingPaymentSource {
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

  export interface CreateMeBillingSubscription {
    paymentGatewayPlanId: string,
    paymentSourceId: string,
    trialId?: string,
  }

  export interface CreateMessage {
    activity?: {
      partyId?: string,
      sessionId?: string,
      type?: number,
    },
    applicationId?: string,
    content?: string,
    embed?: CreateChannelMessageEmbed | CreateChannelMessageEmbedFunction,
    file?: RequestFile,
    files?: Array<RequestFile>,
    hasSpoiler?: boolean,
    nonce?: string,
    tts?: boolean,
  }

  export interface CreateOauth2Application {
    name: string,
    teamId?: string,
  }

  export interface CreateOauth2ApplicationAsset {
    image: Buffer | string,
    name: string,
    type: string,
  }

  export interface CreateStoreApplicationAsset {
    file?: RequestFile,
    files?: Array<RequestFile>,
  }

  export interface CreateTeam {
    icon?: Buffer | string | null,
    name?: string,
  }

  export interface CreateWebhook {
    avatar?: string,
    name: string,
  }

  export interface DeleteAccount {
    code?: string,
    password: string,
  }

  export interface DeleteChannel {
    reason?: string,
  }

  export interface DeleteChannelOverwrite {
    reason?: string,
  }

  export interface DeleteGuild {
    code?: string,
  }

  export interface DeleteGuildEmoji {
    reason?: string,
  }

  export interface DeleteGuildIntegration {
    reason?: string,
  }

  export interface DeleteGuildRole {
    reason?: string,
  }

  export interface DeleteInvite {
    reason?: string,
  }

  export interface DeleteMessage {
    reason?: string,
  }

  export interface DeleteOauth2Application {
    code?: string,
  }

  export interface DeleteTeam {
    code?: string,
  }

  export interface DeleteWebhook {
    reason?: string,
  }

  export interface DisableAccount {
    code?: string,
    password: string,
  }

  export interface EditApplicationNews {
    channelId?: string,
    description?: string,
    messageId?: string,
    thumbnail?: Buffer | string,
    title?: string,
  }

  export interface EditChannel {
    bitrate?: number,
    icon?: Buffer | string,
    name?: string,
    nsfw?: boolean,
    parentId?: string,
    permissionOverwrites?: Array<CreateChannelOverwrite>,
    position?: string,
    rateLimitPerUser?: number,
    reason?: string,
    topic?: string,
    type?: number,
    userLimit?: number,
  }

  export interface EditChannelOverwrite {
    allow?: number,
    deny?: number,
    reason?: string,
    type?: string,
  }

  export interface EditConnection {
    friendSync?: boolean,
    visibility?: boolean,
  }

  export interface EditGuild {
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
    reason?: string,
    region?: string,
    splash?: Buffer | string | null,
    systemChannelFlags?: number,
    systemChannelId?: string,
    verificationLevel?: number,
  }

  export interface EditGuildChannel {
    id: string,
    lockPermissions?: boolean,
    parentId?: string,
    position?: number,
  }

  export interface EditGuildChannels extends Array<EditGuildChannel> {
    
  }

  export interface EditGuildChannelsExtra {
    reason?: string,
  }

  export interface EditGuildEmbed {
    channelId?: string,
    enabled: boolean,
    reason?: string,
  }

  export interface EditGuildEmoji {
    name?: string,
    reason?: string,
    roles?: Array<string>,
  }

  export interface EditGuildIntegration {
    enableEmoticons?: boolean,
    expireBehavior?: number,
    expireGracePeriod?: number,
    reason?: string,
  }

  export interface EditGuildMember {
    channelId?: string | null,
    deaf?: boolean,
    mute?: boolean,
    nick?: string,
    reason?: string,
    roles?: Array<string>,
  }

  export interface EditGuildMfaLevel {
    code: string,
    level: number,
    reason?: string,
  }

  export interface EditGuildNick {
    reason?: string,
  }

  export interface EditGuildRole {
    color?: number,
    hoist?: boolean,
    mentionable?: boolean,
    name?: string,
    permissions?: number,
    reason?: string,
  }

  export interface EditGuildRolePosition {
    id: string,
    position?: number,
  }

  export interface EditGuildRolePositions extends Array<EditGuildRolePosition> {

  }

  export interface EditGuildRolePositionsExtra {
    reason?: string,
  }

  export interface EditGuildVanity {
    reason?: string,
  }

  export interface EditLobby {
    capacity?: number,
    locked?: boolean,
    metadata?: any,
    ownerId?: string,
    type?: number,
  }

  export interface EditLobbyMember {
    metadata?: any,
  }

  export interface EditMe {
    avatar?: Buffer | null | string,
    code?: string,
    discriminator?: number | string,
    email?: string,
    flags?: number,
    newPassword?: string,
    password?: string,
    username?: string,
  }

  export interface EditMeBillingPaymentSource {
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
  }

  export interface EditMeBillingSubscription {
    paymentGatewayPlanId?: string,
    paymentSourceId?: string,
    status?: string,
  }

  export interface EditMessage {
    content?: string,
    embed?: CreateChannelMessageEmbed | CreateChannelMessageEmbedFunction,
    mentions?: Array<any>, // idk, the sourcecode has this
  }

  export interface EditOauth2Application {
    description?: string,
    icon?: Buffer | string,
    name?: string,
    redirectUris?: Array<string>,
  }

  export interface EditSettings {
    [key: string]: any,
  }

  export interface EditTeam {
    code?: string,
    icon?: Buffer | string | null,
    name?: string,
    ownerUserId?: string,
  }

  export interface EditWebhook {
    avatar?: Buffer | string | null,
    channelId?: string,
    name?: string,
    reason?: string,
  }

  export interface ExecuteWebhook {
    avatarUrl?: string,
    content?: string,
    embed?: CreateChannelMessageEmbed | CreateChannelMessageEmbedFunction,
    embeds?: Array<CreateChannelMessageEmbed | CreateChannelMessageEmbedFunction>,
    file?: RequestFile,
    files?: Array<RequestFile>,
    tts?: boolean,
    username?: string,
    wait?: boolean,
  }

  export interface FetchGiftCode {
    countryCode?: string,
    withApplication?: boolean,
    withSubscriptionPlan?: boolean,
  }

  export interface FetchGuildAuditLogs {
    actionType?: number,
    before?: string,
    limit?: number,
    userId?: string,
  }

  export interface FetchGuildMembers {
    after?: string,
    limit?: number,
  }

  export interface FetchGuildWidgetPng {
    style?: string,
  }

  export interface FetchInvite {
    withCounts?: boolean,
  }

  export interface FetchMeBillingPayments {
    beforeId?: string,
    limit?: number,
  }

  export interface FetchMeFeedSettings {
    includeAutosubscribedGames?: boolean,
  }

  export interface FetchMentions {
    after?: string,
    around?: string,
    before?: string,
    everyone?: boolean,
    limit?: number,
    roles?: boolean,
  }

  export interface FetchMessages {
    after?: string,
    around?: string,
    before?: string,
    limit?: number,
  }

  export interface FetchOauth2Applications {
    withTeamApplications?: boolean,
  }

  export interface FetchOauth2Authorize {
    clientId?: string,
    responseType?: string,
    scope?: string,
  }

  export interface FetchReactions {
    after?: string,
    before?: string,
    limit?: number,
  }

  export interface FetchTeamPayouts {
    limit?: number,
  }

  export interface ForgotPassword {
    email: string,
  }

  export interface JoinGuild {
    lurker?: boolean,
    sessionId?: string,
  }

  export interface Login {
    captchaKey?: string,
    email: string,
    giftCodeSKUId?: string,
    loginSource?: string,
    password: string,
    undelete?: boolean,
  }

  export interface LoginMfaSms {
    code: string,
    giftCodeSKUId?: string,
    loginSource?: string,
    ticket: string,
  }

  export interface LoginMfaSmsSend {
    ticket: string,
  }

  export interface LoginMfaTotp {
    code: string,
    giftCodeSKUId?: string,
    loginSource?: string,
    ticket: string,
  }

  export interface Logout {
    provider?: string,
    token?: string,
    voipProvider?: string,
    voipToken?: string,
  }

  export interface MessageSuppressEmbeds {
    suppress?: boolean,
  }

  export interface Oauth2Authorize {
    authorize?: boolean,
    botGuildId?: string,
    captchaKey?: string,
    clientId?: string,
    permissions?: number,
    prompt?: string,
    redirectUri?: string,
    responseType?: string,
    scope?: string,
    webhookChannelId?: string,
    webhookGuildId?: string,
  }

  export interface RedeemGiftCode {
    channelId?: string,
  }

  export interface Register {
    captchaKey?: string,
    consent: boolean,
    email: string,
    fingerprint?: string,
    giftCodeSKUId?: string,
    invite?: string,
    password: string,
    username: string,
  }

  export interface RemoveGuildBan {
    reason?: string,
  }

  export interface RemoveGuildMember {
    reason?: string,
  }

  export interface RemoveGuildMemberRole {
    reason?: string,
  }

  export interface ResetPassword {
    password: string,
    pushProvider?: string,
    pushToken?: string,
    pushVoipProvider?: string,
    pushVoipToken?: string,
    token: string,
  }

  export interface ResetPasswordMfa {
    code: string,
    password: string,
    ticket: string,
    token: string,
  }

  export interface SearchOptions {
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

  export interface SendFriendRequest {
    discriminator: string,
    username: string,
  }

  export interface StartChannelCallRinging {
    recipients?: Array<string>,
  }

  export interface StopChannelCallRinging {
    recipients?: Array<string>,
  }

  export interface TransferOauth2Application {
    code?: string,
    teamId: string,
  }

  export interface Verify {
    captchaKey: string,
    token?: string,
  }

  export interface VerifyCaptcha {
    captchaKey: string,
  }

  /* Raw Types */
  export interface RawChannelMessageEmbed {
    author?: {
      icon_url?: string,
      name?: string,
      url?: string,
    },
    color?: number,
    description?: string,
    fields?: Array<{
      inline?: boolean,
      name: string,
      value: string,
    }>,
    footer?: {
      icon_url?: string,
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

  /* Route Types */

  export interface RouteInvite {
    username?: string,
  }

  export interface RouteWidget {
    id?: string,
    theme?: string,
    username?: string,
  }
}
