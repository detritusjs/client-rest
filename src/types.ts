import { Request, RequestFile, RequestOptions, Response, Route } from 'detritus-rest';

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
  export type Snowflake = bigint | string;

  export interface File extends RequestFile {
    description?: string,
    hasSpoiler?: boolean,
  }

  export interface Options extends RequestOptions {
    dataOnly?: boolean,
    errorOnRatelimit?: boolean,
    fingerprint?: string,
    skipRatelimitCheck?: boolean,
    token?: string,
    useAuth?: boolean,
  }

  export interface toJSON<X> {
    toJSON: () => X,
  }


  /* Option Interfaces */

  export interface AcceptTemplate {
    icon?: Buffer | string | null,
    name: string,
  }

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
    includeRoles?: Array<string>,
    reason?: string,
  }

  export interface BulkOverwriteApplicationGuildCommandsPermission {
    id: string,
    permissions: Array<EditApplicationGuildCommandPermission>,
  }

  export type BulkOverwriteApplicationGuildCommandsPermissions = Array<BulkOverwriteApplicationGuildCommandsPermission>;

  export interface ConnectionCallback {
    code: string,
    friendSync: boolean,
    fromContinuation: boolean,
    insecure?: boolean,
    openIdParams: object,
    state: string,
  }

  export interface CreateApplicationCommand {
    defaultMemberPermissions?: bigint | number | string,
    defaultPermission?: boolean,
    description: string,
    descriptionLocalizations?: Record<string, string | undefined>,
    dmPermission?: boolean,
    id?: string,
    name: string,
    nameLocalizations?: Record<string, string | undefined>,
    options?: Array<CreateApplicationCommandOption | toJSON<CreateApplicationCommandOptionData>>,
    type?: number,
  }

  export interface CreateApplicationCommandData {
    default_member_permissions?: number | bigint | string,
    default_permission?: boolean,
    description?: string,
    description_localizations?: Record<string, string | undefined>,
    dm_permission?: boolean,
    id?: string,
    name: string,
    name_localizations?: Record<string, string | undefined>,
    options?: Array<CreateApplicationCommandOption | toJSON<CreateApplicationCommandOptionData>>
    type?: number,
  }

  export interface CreateApplicationCommandOption {
    autocomplete?: boolean,
    channelTypes?: Array<number>,
    choices?: Array<{name: string, nameLocalizations?: Record<string, string | undefined>, value: string | number}>,
    description?: string,
    descriptionLocalizations?: Record<string, string | undefined>,
    maxValue?: number | bigint | string,
    minValue?: number | bigint | string,
    name: string,
    nameLocalizations?: Record<string, string | undefined>,
    options?: Array<CreateApplicationCommandOption | toJSON<CreateApplicationCommandOptionData>>,
    required?: boolean,
    type: number,
  }

  export interface CreateApplicationCommandOptionData {
    autocomplete?: boolean,
    channel_types?: Array<number>,
    choices?: Array<{name: string, name_localizations?: Record<string, string | undefined>, value: string | number}>,
    description?: string,
    description_localizations?: Record<string, string | undefined>,
    max_value?: number | bigint | string,
    min_value?: number | bigint | string,
    name: string,
    name_localizations?: Record<string, string | undefined>,
    options?: Array<CreateApplicationCommandOptionData | toJSON<CreateApplicationCommandOptionData>>,
    required?: boolean,
    type: number,
  }

  export interface CreateApplicationGuildCommand extends CreateApplicationCommand {

  }

  export interface CreateApplicationGuildCommandData extends CreateApplicationCommandData {

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
    targetApplicationId?: string,
    targetType?: number,
    targetUserId?: string,
    temporary?: boolean,
    unique?: boolean,
  }

  export interface CreateChannelMessageComponent {
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>>,
    customId?: string,
    disabled?: boolean,
    emoji?: RawEmojiPartial,
    label?: string,
    maxLength?: number,
    maxValues?: number,
    minLength?: number,
    minValues?: number,
    options?: Array<CreateChannelMessageComponentSelectMenuOption>,
    placeholder?: string,
    required?: boolean,
    style?: number,
    type: number,
    url?: string,
    value?: string,
  }

  export interface CreateChannelMessageComponentSelectMenuOption {
    default?: boolean,
    description?: string,
    emoji?: RawEmojiPartial,
    label: string,
    value: string,
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

  export interface CreateChannelMessageThread {
    autoArchiveDuration: number,
    name: string,
    reason?: string,
  }

  export interface CreateChannelOverwrite {
    allow: number,
    deny: number,
    id: string,
    type: number | string,
  }

  export interface CreateChannelThread {
    autoArchiveDuration: number,
    name: string,
    reason?: string,
    type?: number,
  }

  export interface CreateDm {
    recipientId?: string,
    recipients?: Array<string>,
  }

  export interface CreateGuild {
    afkChannelId?: string,
    afkTimeout?: number,
    channels?: Array<CreateGuildChannel & {id?: string}>,
    defaultMessageNotifications?: number,
    explicitContentFilter?: number,
    icon?: Buffer | string | null,
    name: string,
    region: string,
    roles?: Array<CreateGuildRole>,
    systemChannelFlags?: number,
    systemChannelId?: string,
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
    icon?: Buffer | string | null,
    mentionable?: boolean,
    name?: string,
    permissions?: bigint | number | string,
    reason?: string,
    unicodeEmoji?: string,
  }

  export interface CreateGuildSticker {
    description: string,
    file: File,
    name: string,
    reason?: string,
    tags: string,
  }

  export interface CreateGuildTemplate {
    description?: string,
    name: string,
  }

  export interface CreateInteractionResponse {
    data?: CreateInteractionResponseInnerPayload | toJSON<CreateInteractionResponseInnerPayloadData>,
    type: number,
  }

  export interface CreateInteractionResponseInnerPayload {
    allowedMentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    choices?: Array<{name: string, value: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    customId?: string,
    embed?: CreateChannelMessageEmbed | toJSON<CreateChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<CreateChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
    title?: string,
    tts?: boolean,
  }

  export interface CreateInteractionResponseData {
    data?: CreateInteractionResponseInnerPayloadData | toJSON<CreateInteractionResponseInnerPayloadData>,
    type: number,
  }

  export interface CreateInteractionResponseInnerPayloadData {
    allowed_mentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    choices?: Array<{name: string, value: number | string}>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    custom_id?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
    title?: string,
    tts?: boolean,
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
    allowedMentions?: {
      parse?: Array<string>,
      repliedUser?: boolean,
      roles?: Array<string>,
      users?: Array<string>,
    },
    applicationId?: string,
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    hasSpoiler?: boolean,
    messageReference?: {
      channelId?: string,
      failIfNotExists?: boolean,
      guildId?: string,
      messageId: string,
    },
    nonce?: string,
    stickerIds?: Array<string>,
    tts?: boolean,
  }

  export interface CreateMessageData {
    activity?: {
      party_id?: string,
      session_id?: string,
      type?: number,
    },
    allowed_mentions?: {
      parse?: Array<string>,
      replied_user?: boolean,
      roles?: Array<string>,
      users?: Array<string>,
    },
    application_id?: string,
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    message_reference?: {
      channel_id?: string,
      fail_if_not_exists?: boolean,
      guild_id?: string,
      message_id: string,
    },
    nonce?: string,
    sticker_ids?: Array<string>,
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

  export interface CreateOauth2Token {
    clientId?: string,
    clientSecret?: string,
    code?: string,
    grantType: string,
    redirectUri?: string,
    scope?: Array<string> | string,
  }

  export interface CreateStageInstance {
    channelId: string,
    topic: string,
  }

  export interface CreateStoreApplicationAsset {
    file?: File,
    files?: Array<File>,
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

  export interface DeleteGuildSticker {
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

  export type EditApplicationCommand = Partial<CreateApplicationCommand>;
  export type EditApplicationCommandData = Partial<CreateApplicationCommandData>;

  export type EditApplicationGuildCommand = Partial<CreateApplicationCommand>;
  export type EditApplicationGuildCommandData = Partial<CreateApplicationCommandData>;

  export interface EditApplicationGuildCommandPermission {
    id: Snowflake,
    permission: boolean,
    type: string,
  }

  export interface EditApplicationGuildCommandPermissionData {
    id: string,
    permission: boolean,
    type: string,
  }

  export interface EditApplicationGuildCommandPermissions {
    permissions: Array<EditApplicationGuildCommandPermission>,
  }

  export interface EditApplicationNews {
    channelId?: string,
    description?: string,
    messageId?: string,
    thumbnail?: Buffer | string,
    title?: string,
  }

  export interface EditChannel {
    archived?: boolean,
    autoArchiveDuration?: number,
    bitrate?: number,
    defaultAutoArchiveDuration?: number,
    icon?: Buffer | string | null,
    invitable?: boolean,
    locked?: boolean,
    name?: string,
    nsfw?: boolean,
    parentId?: string,
    permissionOverwrites?: Array<CreateChannelOverwrite>,
    position?: string,
    rateLimitPerUser?: number,
    reason?: string,
    rtcRegion?: string,
    topic?: string,
    type?: number,
    userLimit?: number,
    videoQualityMode?: number,
  }

  export interface EditChannelOverwrite {
    allow?: number,
    deny?: number,
    reason?: string,
    type?: number | string,
  }

  export interface EditConnection {
    friendSync?: boolean,
    visibility?: boolean,
  }

  export interface EditGuild {
    afkChannelId?: null | string,
    afkTimeout?: number,
    banner?: Buffer | string,
    code?: string,
    defaultMessageNotifications?: string,
    description?: string,
    discoverySplash?: Buffer | string | null,
    explicitContentFilter?: number,
    features?: Array<string>,
    icon?: Buffer | string | null,
    name?: string,
    ownerId?: string,
    preferredLocale?: string,
    publicUpdatesChannelId?: string,
    reason?: string,
    region?: string,
    rulesChannelId?: null | string,
    splash?: Buffer | string | null,
    systemChannelFlags?: number,
    systemChannelId?: null | string,
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
    communicationDisabledUntil?: string | null,
    deaf?: boolean,
    mute?: boolean,
    nick?: string,
    reason?: string,
    roles?: Array<string>,
  }

  export interface EditGuildMemberVerification {
    description?: string,
    enabled?: boolean,
    formFields?: Array<string>,
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
    icon?: Buffer | string | null,
    mentionable?: boolean,
    name?: string,
    permissions?: bigint | number | string,
    reason?: string,
    unicodeEmoji?: string,
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

  export interface EditGuildSticker {
    description?: string,
    name?: string,
    reason?: string,
    tags?: string,
  }

  export interface EditGuildVanity {
    reason?: string,
  }

  export interface EditGuildVoiceState {
    channelId: string,
    requestToSpeakTimestamp?: null | Date | string,
    suppress?: boolean,
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
    customStatus?: {
      emojiId?: string,
      emojiName?: string,
      expiresAt?: Date | string,
      text?: string,
    },
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
    allowedMentions?: {
      parse?: Array<string>,
      repliedUser?: boolean,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<CreateChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
  }

  export interface EditMessageData {
    allowed_mentions?: {
      parse?: Array<string>,
      replied_user?: boolean,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
  }

  export interface EditOauth2Application {
    description?: string,
    icon?: Buffer | string | null,
    name?: string,
    redirectUris?: Array<string>,
  }

  export interface EditSettings {
    [key: string]: any,
  }

  export interface EditStageInstance {
    topic?: string,
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

  export interface EditWebhookToken {
    avatar?: Buffer | string | null,
    name?: string,
  }

  export interface EditWebhookTokenMessage {
    allowedMentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    hasSpoiler?: boolean,
  }

  export interface EditWebhookTokenMessageData {
    allowed_mentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{description?: string, filename?: string, id: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
  }

  export interface ExecuteWebhook {
    allowedMentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    avatarUrl?: string,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
    threadId?: string,
    tts?: boolean,
    username?: string,
    wait?: boolean,
  }

  export interface ExecuteWebhookData {
    allowed_mentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    avatar_url?: string,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
    tts?: boolean,
    username?: string,
  }

  export interface FetchChannelThreadsArchivedPrivate {
    before?: Date | string,
    limit?: number,
  }

  export interface FetchChannelThreadsArchivedPrivateJoined {
    before?: string,
    limit?: number,
  }

  export interface FetchChannelThreadsArchivedPublic {
    before?: Date | string,
    limit?: number,
  }

  export interface FetchGiftCode {
    countryCode?: string,
    withApplication?: boolean,
    withSubscriptionPlan?: boolean,
  }

  export interface FetchGuild {
    withCounts?: boolean,
  }

  export interface FetchGuildAuditLogs {
    actionType?: number,
    before?: string,
    limit?: number,
    userId?: string,
  }

  export interface FetchGuildBans {
    after?: string,
    around?: string,
    before?: string,
    limit?: number,
  }

  export interface FetchGuildMembers {
    after?: string,
    limit?: number,
  }

  export interface FetchGuildMembersSearch {
    limit?: number,
    query: string,
  }

  export interface FetchGuildPruneCount {
    days?: number,
    includeRoles?: Array<string>,
  }

  export interface FetchGuildScheduledEvents {
    withUserCount?: number,
  }

  export interface FetchGuildScheduledEventUsers {
    after?: string,
    before?: string,
    limit?: number,
    withMember?: number,
  }

  export interface FetchGuildWidgetPng {
    style?: string,
  }

  export interface FetchInvite {
    guildScheduledEventId?: string,
    withCounts?: boolean,
    withExpiration?: boolean,
  }

  export interface FetchMe {
    withAnalyticsToken?: boolean,
  }

  export interface FetchMeBillingPayments {
    beforeId?: string,
    limit?: number,
  }

  export interface FetchMeFeedSettings {
    includeAutosubscribedGames?: boolean,
  }

  export interface FetchMeGuilds {
    after?: string,
    before?: string,
    limit?: number,
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

  export interface FollowChannel {
    webhookChannelId: string,
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
    permissions?: bigint | number | string,
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

  export interface SearchLobbies {
    filter?: Array<{key: string, comparison: number, cast: number, value: string}>,
    sort?: Array<{key: string, cast: number, near_value: string}>,
    limit?: number,
    distance?: number,
  }

  export interface SearchOptions {
    attachmentFilename?: string | Array<string>,
    attachmentExtensions?: string | Array<string>,
    authorId?: string | Array<string>,
    channelId?: string,
    content?: string,
    has?: string | Array<string>,
    includeNSFW?: boolean,
    limit?: number,
    maxId?: string,
    mentions?: string | Array<string>,
    minId?: string,
    offset?: number,
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
  export interface RawChannelMessageComponent {
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>>,
    custom_id?: string,
    disabled?: boolean,
    emoji?: RawEmojiPartial,
    label?: string,
    max_length?: number,
    max_values?: number,
    min_length?: number,
    min_values?: number,
    options?: Array<RawChannelMessageComponentSelectMenuOption>,
    placeholder?: string,
    required?: boolean,
    style?: number,
    type: number,
    url?: string,
    value?: string,
  }

  export interface RawChannelMessageComponentSelectMenuOption {
    default?: boolean,
    description?: string,
    emoji?: RawEmojiPartial,
    label: string,
    value: string,
  }

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

  export interface RawEmojiPartial  {
    animated?: boolean,
    id?: string,
    name?: string,
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

export namespace ResponseTypes {
  export type CreateMessage = DiscordTypes.Message;
  export type EditMessage = DiscordTypes.Message;
}


export namespace DiscordTypes {
  export interface ChannelPartial {
    id: string,
    name: string,
  }

  export interface Message {
    activity?: {
      cover_image?: string,
      name?: string,
      party_id: string,
      type: number,
    },
    application?: {
      cover_image: null | string,
      description: string,
      icon: null | string,
      id: string,
      name: string,
      primary_sku_id: string,
    },
    attachments?: Array<MessageAttachment>,
    author: User,
    call?: {
      ended_timestamp: null | string,
      participiants: Array<string>,
    },
    channel_id: string,
    content: string,
    edited_timestamp?: string,
    embeds?: Array<MessageEmbed>,
    guild_id?: string,
    id: string,
    mention_channels?: Array<ChannelPartial>,
    mention_everyone: boolean,
    mention_roles: Array<string>,
    mentions: Array<{
      bot: boolean,
      discriminator: string,
      id: string,
      username: string,
    }>,
    message_reference?: {
      channel_id: string,
      guild_id?: string,
      message_id: string,
    },
    nonce: null | string,
    pinned: boolean,
    timestamp: string,
    tts: boolean,
    type: number,
    webhook_id?: string,
  }

  export interface MessageAttachment {
    filename: string,
    height: number,
    id: string,
    proxy_url: string,
    size: number,
    url: string,
    width: number,
  }

  export interface MessageEmbed {
    author?: {
      icon_url?: string,
      name?: string,
      proxy_icon_url?: string,
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
      proxy_icon_url?: string,
      text: string,
    },
    image?: {
      height?: number,
      proxy_url?: string,
      url?: string,
      width?: number,
    },
    provider?: {
      name?: string,
      url?: string,
    },
    reference_id?: string,
    thumbnail?: {
      height?: number,
      proxy_url?: string,
      url?: string,
      width?: number,
    },
    timestamp?: string,
    title?: string,
    type?: string,
    url?: string,
    video?: {
      height?: number,
      url?: string,
      width?: number,
    },
  }

  export interface User {
    avatar: null | string,
    bot: boolean,
    discriminator: string,
    id: string,
    username: string,
  }
}
