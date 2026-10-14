import { Request, RequestFile, RequestOptions, Response, Route } from 'detritus-rest';

import { RestRequest } from './request';


export namespace RestClientEvents {
  export interface InvalidRequestWarningPayload {
    count: number,
    interval: number,
    limit: number,
  }

  export interface RatelimitedPayload {
    global: boolean,
    response: Response,
    restRequest: RestRequest,
    retryAfter: number,
    scope: null | string,
  }

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
    durationSecs?: number,
    hasSpoiler?: boolean,
    waveform?: string,
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

  export interface BulkAddInviteTargetUsers {
    userIds: Array<string>,
  }

  export interface BulkDeleteInviteTargetUsers {
    userIds: Array<string>,
  }

  export interface BulkGuildBan {
    deleteMessageSeconds?: number | string,
    reason?: string,
    userIds: Array<string>,
  }

  export interface BulkOverwriteApplicationGuildCommandsPermission {
    id: string,
    permissions: Array<EditApplicationGuildCommandPermission>,
  }

  export type BulkOverwriteApplicationGuildCommandsPermissions = Array<BulkOverwriteApplicationGuildCommandsPermission>;

  export interface BulkOverwriteApplicationRoleConnectionsMetadataRecord {
    description: string,
    descriptionLocalizations?: Record<string, string>,
    key: string,
    name: string,
    nameLocalizations?: Record<string, string>,
    type: number,
  }

  export interface BulkOverwriteApplicationRoleConnectionsMetadataRecordData {
    description: string,
    description_localizations?: Record<string, string>,
    key: string,
    name: string,
    name_localizations?: Record<string, string>,
    type: number,
  }

  export interface ConnectionCallback {
    code: string,
    friendSync: boolean,
    fromContinuation: boolean,
    insecure?: boolean,
    openIdParams: object,
    state: string,
  }

  export interface CreateApplicationCommand {
    contexts?: Array<number>,
    defaultMemberPermissions?: bigint | number | string,
    defaultPermission?: boolean,
    description: string,
    descriptionLocalizations?: Record<string, string | undefined>,
    dmPermission?: boolean,
    // only for `PRIMARY_ENTRY_POINT` commands
    handler?: number,
    id?: string,
    integrationTypes?: Array<number>,
    name: string,
    nameLocalizations?: Record<string, string | undefined>,
    nsfw?: boolean,
    options?: Array<CreateApplicationCommandOption | toJSON<CreateApplicationCommandOptionData>>,
    type?: number,
  }

  export interface CreateApplicationCommandData {
    contexts?: Array<number>,
    default_member_permissions?: number | bigint | string,
    default_permission?: boolean,
    description?: string,
    description_localizations?: Record<string, string | undefined>,
    dm_permission?: boolean,
    // only for `PRIMARY_ENTRY_POINT` commands
    handler?: number,
    id?: string,
    integration_types?: Array<number>,
    name: string,
    name_localizations?: Record<string, string | undefined>,
    nsfw?: boolean,
    options?: Array<CreateApplicationCommandOption | toJSON<CreateApplicationCommandOptionData>>
    type?: number,
  }

  export interface CreateApplicationCommandOption {
    autocomplete?: boolean,
    channelTypes?: Array<number>,
    choices?: Array<{name: string, nameLocalizations?: Record<string, string | undefined>, value: string | number}>,
    description?: string,
    descriptionLocalizations?: Record<string, string | undefined>,
    fileTypes?: Array<string>,
    maxLength?: number,
    maxValue?: number | bigint | string,
    minLength?: number,
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
    file_types?: Array<string>,
    max_length?: number,
    max_value?: number | bigint | string,
    min_length?: number,
    min_value?: number | bigint | string,
    name: string,
    name_localizations?: Record<string, string | undefined>,
    options?: Array<CreateApplicationCommandOptionData | toJSON<CreateApplicationCommandOptionData>>,
    required?: boolean,
    type: number,
  }

  export interface CreateApplicationEmoji {
    name: string,
    image: Buffer | string,
  }

  export interface CreateApplicationEntitlement {
    ownerId: string,
    // 1 for a guild, 2 for a user
    ownerType: number,
    skuId: string,
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

  export interface CreateChannelAttachments {
    files: Array<{
      fileSize: number,
      filename: string,
      id: number | string,
      isClip?: boolean,
      originalContentType?: string,
    }>,
  }

  export interface AddRecipient {
    accessToken?: string,
    nick?: string,
  }

  export interface CreateChannelInvite {
    maxAge?: number,
    maxUses?: number,
    roleIds?: Array<string>,
    targetApplicationId?: string,
    targetType?: number,
    targetUserId?: string,
    targetUserIds?: Array<string>,
    // csv of user ids allowed to accept the invite, an array of user ids gets turned into one
    targetUsersFile?: Array<string> | Buffer | string,
    temporary?: boolean,
    unique?: boolean,
  }

  export interface CreateChannelMessageComponent {
    accentColor?: number,
    accessory?: CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>,
    channelTypes?: Array<number>,
    component?: CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>>,
    content?: string,
    customId?: string,
    default?: boolean,
    defaultValues?: Array<{id: string, type: string}>,
    description?: string,
    disabled?: boolean,
    divider?: boolean,
    emoji?: RawEmojiPartial,
    file?: {url: string},
    fileTypes?: Array<string>,
    items?: Array<{
      description?: string,
      media: {url: string},
      spoiler?: boolean,
    }>,
    label?: string,
    maxLength?: number,
    maxValues?: number,
    media?: {url: string},
    minLength?: number,
    minValues?: number,
    options?: Array<CreateChannelMessageComponentSelectMenuOption>,
    placeholder?: string,
    required?: boolean,
    skuId?: string,
    spacing?: number,
    spoiler?: boolean,
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
    autoArchiveDuration?: number,
    name: string,
    rateLimitPerUser?: number,
    reason?: string,
  }

  export interface CreateChannelOverwrite {
    allow: number,
    deny: number,
    id: string,
    type: number | string,
  }

  export interface CreateChannelThread {
    appliedTags?: Array<string>,
    autoArchiveDuration?: number,
    invitable?: boolean,
    // for forum and media channels, the thread's starter message
    message?: CreateMessage,
    name: string,
    rateLimitPerUser?: number,
    reason?: string,
    type?: number,
  }

  export interface CreateDm {
    // group dms, oauth2 access tokens of the users to add (with the `gdm.join` scope)
    accessTokens?: Array<string>,
    // group dms, user id to nickname
    nicks?: Record<string, string>,
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

  export interface CreateGuildAutoModerationRule {
    actions: Array<{
      metadata?: {
        channelId?: string,
        customMessage?: string,
        durationSeconds?: number,
      },
      type: number,
    }>,
    enabled?: boolean,
    eventType: number,
    exemptChannels?: Array<string>,
    exemptRoles?: Array<string>,
    name: string,
    reason?: string,
    triggerMetadata?: {
      allowList?: Array<string>,
      keywordFilter?: Array<string>,
      mentionRaidProtectionEnabled?: boolean,
      mentionTotalLimit?: number,
      presets?: Array<number>,
      regexPatterns?: Array<string>,
    },
    triggerType: number,
  }

  export interface CreateGuildBan {
    deleteMessageDays?: number | string,
    deleteMessageSeconds?: number | string,
    reason?: string,
  }

  export interface CreateGuildChannel {
    availableTags?: EditChannel['availableTags'],
    branchId?: string,
    bitrate?: number,
    defaultAutoArchiveDuration?: number,
    defaultForumLayout?: number,
    defaultReactionEmoji?: EditChannel['defaultReactionEmoji'],
    defaultSortOrder?: null | number,
    defaultThreadRateLimitPerUser?: number,
    flags?: number,
    name: string,
    nsfw?: boolean,
    parentId?: string,
    permissionOverwrites?: Array<CreateChannelOverwrite>,
    position?: number,
    rateLimitPerUser?: number,
    reason?: string,
    rtcRegion?: null | string,
    skuId?: string,
    topic?: string,
    type: number,
    userLimit?: number,
    videoQualityMode?: number,
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
    // role gradients, `color` still works for a single color
    colors?: {
      primaryColor: number,
      secondaryColor?: null | number,
      tertiaryColor?: null | number,
    },
    hoist?: boolean,
    icon?: Buffer | string | null,
    mentionable?: boolean,
    name?: string,
    permissions?: bigint | number | string,
    reason?: string,
    unicodeEmoji?: string,
  }

  export interface CreateGuildScheduledEvent {
    channelId?: string,
    description?: string,
    entityMetadata?: Record<string, any>,
    entityType: number,
    image?: Buffer | string | null,
    name: string,
    privacyLevel: number,
    reason?: string,
    recurrenceRule?: GuildScheduledEventRecurrenceRule,
    scheduledEndTime?: Date | string,
    scheduledStartTime: Date | string,
    // not supported on create, events always start as scheduled
    status?: number,
  }

  export interface CreateGuildSoundboardSound {
    emojiId?: null | string,
    emojiName?: null | string,
    name: string,
    reason?: string,
    // mp3 or ogg, max 512kb and 5.2 seconds
    sound: Buffer | string,
    volume?: number,
  }

  export interface CreateGuildSticker {
    description: string,
    file: File,
    name: string,
    reason?: string,
    tags: string,
  }

  export interface CreateGuildTemplate {
    description?: null | string,
    name: string,
  }

  export interface CreateInteractionResponse {
    data?: CreateInteractionResponseInnerPayload | toJSON<CreateInteractionResponseInnerPayloadData>,
    type: number,
    withResponse?: boolean,
  }

  export interface CreateInteractionResponseInnerPayload {
    allowedMentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{
      description?: string,
      durationSecs?: number,
      filename?: string,
      id: number | string,
      originalContentType?: string,
      uploadedFilename?: string,
      waveform?: string,
    }>,
    choices?: Array<{name: string, nameLocalizations?: Record<string, string | undefined>, value: number | string}>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    customId?: string,
    embed?: CreateChannelMessageEmbed | toJSON<CreateChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<CreateChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
    poll?: CreateMessage['poll'],
    title?: string,
    tts?: boolean,
    withResponse?: boolean,
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
    attachments?: Array<{
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      original_content_type?: string,
      uploaded_filename?: string,
      waveform?: string,
    }>,
    choices?: Array<{name: string, name_localizations?: Record<string, string | undefined>, value: number | string}>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    custom_id?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
    poll?: CreateMessageData['poll'],
    title?: string,
    tts?: boolean,
  }

  export interface CreateLobby {
    idleTimeoutSeconds?: number,
    members?: Array<LobbyMember>,
    metadata?: Record<string, string> | null,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    capacity?: number,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    locked?: boolean,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    ownerId?: string,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    type?: number,
  }

  export interface CreateLobbyMessage {
    content: string,
    flags?: number,
    metadata?: Record<string, string>,
  }

  export interface CreateOrJoinLobby {
    idleTimeoutSeconds?: number,
    lobbyMetadata?: Record<string, string> | null,
    memberMetadata?: Record<string, string> | null,
    secret: string,
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
    attachments?: Array<{
      description?: string,
      durationSecs?: number,
      filename?: string,
      id: number | string,
      originalContentType?: string,
      uploadedFilename?: string,
      waveform?: string,
    }>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    enforceNonce?: boolean,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
    messageReference?: {
      channelId?: string,
      failIfNotExists?: boolean,
      guildId?: string,
      messageId?: string,
      type?: number,
    },
    nonce?: string,
    poll?: {
      allowMultiselect: boolean,
      answers: Array<{
        pollMedia: {
          emoji?: RawEmojiPartial,
          text?: string,
        },
      }>,
      duration: number,
      layoutType?: number,
      question: {
        emoji?: RawEmojiPartial,
        text?: string,
      },
    },
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
    attachments?: Array<{
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      original_content_type?: string,
      uploaded_filename?: string,
      waveform?: string,
    }>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    enforce_nonce?: boolean,
    flags?: number,
    message_reference?: {
      channel_id?: string,
      fail_if_not_exists?: boolean,
      guild_id?: string,
      message_id?: string,
      type?: number,
    },
    nonce?: string,
    poll?: {
      allow_multiselect: boolean,
      answers: Array<{
        poll_media: {
          emoji?: RawEmojiPartial,
          text?: string,
        },
      }>,
      duration: number,
      layout_type?: number,
      question: {
        emoji?: RawEmojiPartial,
        text?: string,
      },
    },
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
    guildScheduledEventId?: string,
    privacyLevel?: number,
    reason?: string,
    // needs MENTION_EVERYONE to notify @everyone
    sendStartNotification?: boolean,
    topic: string,
  }

  export interface DeleteStageInstance {
    reason?: string,
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
    avatar?: Buffer | string | null,
    name: string,
    reason?: string,
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

  export interface DeleteGuildAutoModerationRule{
    reason?: string,
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

  export interface DeleteGuildScheduledEvent {
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

  export interface DeleteWebhookTokenMessage {
    threadId?: string,
  }

  export interface DisableAccount {
    code?: string,
    password: string,
  }

  export type EditApplicationCommand = Partial<CreateApplicationCommand>;
  export type EditApplicationCommandData = Partial<CreateApplicationCommandData>;

  export interface EditApplication {
    coverImage?: Buffer | string | null,
    customInstallUrl?: string,
    description?: string,
    eventWebhooksStatus?: number,
    eventWebhooksTypes?: Array<string>,
    eventWebhooksUrl?: string,
    flags?: number,
    icon?: Buffer | string | null,
    installParams?: {
      permissions: string,
      scopes: Array<string>,
    },
    integrationTypesConfig?: Record<string, {
      oauth2InstallParams?: {
        permissions: string,
        scopes: Array<string>,
      },
    }>,
    interactionsEndpointUrl?: string,
    roleConnectionsVerificationUrl?: string,
    tags?: Array<string>,
  }

  export interface EditApplicationData {
    cover_image?: string | null,
    custom_install_url?: string,
    description?: string,
    event_webhooks_status?: number,
    event_webhooks_types?: Array<string>,
    event_webhooks_url?: string,
    flags?: number,
    icon?: string | null,
    install_params?: {
      permissions: string,
      scopes: Array<string>,
    },
    integration_types_config?: Record<string, {
      oauth2_install_params?: {
        permissions: string,
        scopes: Array<string>,
      },
    }>,
    interactions_endpoint_url?: string,
    role_connections_verification_url?: string,
    tags?: Array<string>,
  }

  export interface EditApplicationEmoji {
    name?: string,
  }

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
    appliedTags?: Array<string>,
    archived?: boolean,
    autoArchiveDuration?: number,
    availableTags?: Array<{
      emojiId?: null | string,
      emojiName?: null | string,
      id?: string,
      moderated?: boolean,
      name: string,
    }>,
    bitrate?: number,
    defaultAutoArchiveDuration?: number,
    defaultForumLayout?: number,
    defaultReactionEmoji?: {
      emojiId?: null | string,
      emojiName?: null | string,
    } | null,
    defaultSortOrder?: null | number,
    defaultThreadRateLimitPerUser?: number,
    flags?: number,
    icon?: Buffer | string | null,
    invitable?: boolean,
    locked?: boolean,
    name?: string,
    nsfw?: boolean,
    parentId?: null | string,
    permissionOverwrites?: Array<CreateChannelOverwrite>,
    position?: number | string,
    rateLimitPerUser?: number,
    reason?: string,
    rtcRegion?: string,
    topic?: string,
    type?: number,
    userLimit?: number,
    videoQualityMode?: number,
  }

  export interface EditChannelVoiceStatus {
    status: null | string,
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
    defaultMessageNotifications?: number,
    description?: null | string,
    discoverySplash?: Buffer | string | null,
    explicitContentFilter?: number,
    features?: Array<string>,
    icon?: Buffer | string | null,
    name?: string,
    ownerId?: string,
    preferredLocale?: string,
    premiumProgressBarEnabled?: boolean,
    publicUpdatesChannelId?: null | string,
    reason?: string,
    region?: string,
    rulesChannelId?: null | string,
    safetyAlertsChannelId?: null | string,
    splash?: Buffer | string | null,
    systemChannelFlags?: number,
    systemChannelId?: null | string,
    verificationLevel?: number,
  }

  export interface EditGuildAutoModerationRule {
    actions?: Array<{
      metadata?: {
        channelId?: string,
        customMessage?: string,
        durationSeconds?: number,
      },
      type: number,
    }>,
    enabled?: boolean,
    eventType?: number,
    exemptChannels?: Array<string>,
    exemptRoles?: Array<string>,
    name?: string,
    reason?: string,
    triggerMetadata?: {
      allowList?: Array<string>,
      keywordFilter?: Array<string>,
      mentionRaidProtectionEnabled?: boolean,
      mentionTotalLimit?: number,
      presets?: Array<number>,
      regexPatterns?: Array<string>,
    },
    triggerType?: number,
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

  export interface EditGuildEmoji {
    name?: string,
    reason?: string,
    // null clears the role restriction
    roles?: Array<string> | null,
  }

  export interface EditGuildIntegration {
    enableEmoticons?: boolean,
    expireBehavior?: number,
    expireGracePeriod?: number,
    reason?: string,
  }

  export interface EditGuildMember {
    avatar?: Buffer | null | string,
    banner?: Buffer | null | string,
    bio?: string | null,
    channelId?: string | null,
    communicationDisabledUntil?: Date | string | null,
    deaf?: boolean,
    flags?: number,
    mute?: boolean,
    nick?: string | null,
    reason?: string,
    roles?: Array<string>,
  }

  export interface EditGuildIncidentActions {
    // null to turn back on, max 24 hours in the future
    dmsDisabledUntil?: Date | string | null,
    invitesDisabledUntil?: Date | string | null,
  }

  export interface EditGuildOnboarding {
    defaultChannelIds?: Array<string>,
    enabled?: boolean,
    mode?: number,
    prompts?: Array<GuildOnboardingPrompt>,
    reason?: string,
  }

  export interface EditGuildWelcomeScreen {
    description?: null | string,
    enabled?: boolean,
    reason?: string,
    welcomeChannels?: Array<{
      channelId: string,
      description: string,
      emojiId?: null | string,
      emojiName?: null | string,
    }> | null,
  }

  export interface GuildOnboardingPrompt {
    id?: string,
    inOnboarding: boolean,
    options: Array<{
      channelIds?: Array<string>,
      description?: null | string,
      emojiAnimated?: boolean,
      emojiId?: string,
      emojiName?: string,
      id?: string,
      roleIds?: Array<string>,
      title: string,
    }>,
    required: boolean,
    singleSelect: boolean,
    title: string,
    type: number,
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
    // role gradients, `color` still works for a single color
    colors?: {
      primaryColor: number,
      secondaryColor?: null | number,
      tertiaryColor?: null | number,
    },
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

  export interface EditGuildTemplate {
    description?: null | string,
    name?: string,
  }

  export interface EditInviteTargetUsers {
    // csv of user ids, an array of user ids gets turned into one
    targetUsersFile: Array<string> | Buffer | string,
  }

  export interface EditGuildScheduledEvent {
    channelId?: string | null,
    description?: string | null,
    entityMetadata?: Record<string, any> | null,
    entityType?: number,
    image?: Buffer | string | null,
    name?: string,
    privacyLevel?: number,
    reason?: string,
    recurrenceRule?: GuildScheduledEventRecurrenceRule | null,
    scheduledEndTime?: Date | string,
    scheduledStartTime?: Date | string,
    status?: number,
  }

  export interface EditGuildSoundboardSound {
    emojiId?: null | string,
    emojiName?: null | string,
    name?: string,
    reason?: string,
    volume?: null | number,
  }

  export interface DeleteGuildSoundboardSound {
    reason?: string,
  }

  export interface SendSoundboardSound {
    soundId: string,
    // required when playing a sound from another guild
    sourceGuildId?: string,
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
    channelId?: string,
    requestToSpeakTimestamp?: null | Date | string,
    suppress?: boolean,
  }

  export interface EditGuildWidget {
    channelId?: string,
    enabled: boolean,
    reason?: string,
  }

  export interface EditLobby {
    idleTimeoutSeconds?: number,
    // replaces the member list, members not included are removed
    members?: Array<LobbyMember>,
    metadata?: Record<string, string> | null,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    capacity?: number,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    locked?: boolean,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    ownerId?: string,
    /** @deprecated old GameSDK lobbies, not sent anymore */
    type?: number,
  }

  export interface EditLobbyChannelLinking {
    // leave empty to unlink
    channelId?: string,
  }

  export interface EditLobbyMember {
    // null clears it
    additionalName?: null | string,
    flags?: number,
    metadata?: Record<string, string> | null,
  }

  export interface EditLobbyMembersBulk extends Array<LobbyMember & {removeMember?: boolean}> {

  }

  export interface FetchLobbyMessages {
    limit?: number,
  }

  export interface LobbyMember extends EditLobbyMember {
    id: string,
  }

  export interface EditMe {
    avatar?: Buffer | null | string,
    banner?: Buffer | null | string,
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

  export interface EditMeApplicationRoleConnection {
    metadata?: Record<string, any>,
    platformName?: string,
    platformUsername?: string,
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
    attachments?: Array<{
      description?: string,
      durationSecs?: number,
      filename?: string,
      id: number | string,
      originalContentType?: string,
      uploadedFilename?: string,
      waveform?: string,
    }>,
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
    attachments?: Array<{
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      original_content_type?: string,
      uploaded_filename?: string,
      waveform?: string,
    }>,
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
    privacyLevel?: number,
    reason?: string,
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
    attachments?: Array<{
      description?: string,
      durationSecs?: number,
      filename?: string,
      id: number | string,
      originalContentType?: string,
      uploadedFilename?: string,
      waveform?: string,
    }>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embed?: CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed> | null,
    embeds?: Array<CreateChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    file?: File,
    files?: Array<File>,
    flags?: number,
    hasSpoiler?: boolean,
    // only when editing a deferred interaction response
    poll?: CreateMessage['poll'],
    threadId?: string,
    withComponents?: boolean,
  }

  export interface EditWebhookTokenMessageData {
    allowed_mentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    attachments?: Array<{
      description?: string,
      duration_secs?: number,
      filename?: string,
      id: number | string,
      original_content_type?: string,
      uploaded_filename?: string,
      waveform?: string,
    }>,
    components?: Array<CreateChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
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
    poll?: CreateMessage['poll'],
    // forum and media channels, tags for the new thread
    appliedTags?: Array<string>,
    threadId?: string,
    // forum and media channels, creates a thread with this name
    threadName?: string,
    tts?: boolean,
    username?: string,
    wait?: boolean,
    withComponents?: boolean,
  }

  export interface ExecuteWebhookData {
    allowed_mentions?: {
      parse?: Array<string>,
      roles?: Array<string>,
      users?: Array<string>,
    },
    applied_tags?: Array<string>,
    attachments?: CreateMessageData['attachments'],
    avatar_url?: string,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>> | toJSON<Array<RawChannelMessageComponent>>,
    content?: string,
    embeds?: Array<RawChannelMessageEmbed | toJSON<RawChannelMessageEmbed>>,
    flags?: number,
    poll?: CreateMessageData['poll'],
    thread_name?: string,
    tts?: boolean,
    username?: string,
  }

  export interface FetchApplicationCommands {
    withLocalizations?: boolean,
  }

  export interface FetchApplicationEntitlements {
    after?: string,
    before?: string,
    excludeDeleted?: boolean,
    excludeEnded?: boolean,
    guildId?: string,
    limit?: number,
    skuIds?: Array<string> | string,
    userId?: string,
  }

  export interface FetchApplicationGuildCommands {
    withLocalizations?: boolean,
  }

  export interface FetchChannelPollAnswerVoters {
    after?: string,
    limit?: number,
  }

  export interface FetchChannelThreadsActive {
    guildId?: string,
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

  export interface FetchConnectionAuthorizeUrl {
    continuation?: boolean,
  }

  export interface FetchGiftCode {
    countryCode?: string,
    withApplication?: boolean,
    withSubscriptionPlan?: boolean,
  }

  export interface FetchGuild {
    withCounts?: boolean,
  }

  export interface FetchThreadMember {
    withMember?: boolean,
  }

  export interface FetchThreadMembers {
    after?: string,
    limit?: number,
    withMember?: boolean,
  }

  export interface FetchGuildAuditLogs {
    actionType?: number,
    after?: string,
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

  export interface GuildScheduledEventRecurrenceRule {
    byMonth?: Array<number> | null,
    byMonthDay?: Array<number> | null,
    byNWeekday?: Array<{day: number, n: number}> | null,
    byWeekday?: Array<number> | null,
    frequency: number,
    interval: number,
    start: Date | string,
  }

  export interface GuildScheduledEventRecurrenceRuleData {
    by_month?: Array<number> | null,
    by_month_day?: Array<number> | null,
    by_n_weekday?: Array<{day: number, n: number}> | null,
    by_weekday?: Array<number> | null,
    frequency: number,
    interval: number,
    start: Date | string,
  }

  export interface FetchGuildScheduledEvent {
    withUserCount?: boolean,
  }

  export interface FetchGuildScheduledEvents {
    withUserCount?: boolean,
  }

  export interface FetchGuildScheduledEventUsers {
    after?: string,
    before?: string,
    limit?: number,
    withMember?: boolean,
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
    shard?: number,
    withCounts?: boolean,
  }

  export interface FetchSkuSubscriptions {
    after?: string,
    before?: string,
    limit?: number,
    // required unless using an oauth2 token
    userId?: string,
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
    // 0 for normal reactions, 1 for super reactions
    type?: number,
  }

  export interface FetchChannelPins {
    // iso8601 timestamp, get pins pinned before this
    before?: Date | string,
    limit?: number,
  }

  export interface BulkDeleteMessages {
    reason?: string,
  }

  export interface PinMessage {
    reason?: string,
  }

  export interface FetchTeamPayouts {
    limit?: number,
  }

  export interface FetchWebhookTokenMessage {
    threadId?: string,
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
    // user, bot or webhook, prefix with `-` to exclude
    authorType?: string | Array<string>,
    channelId?: string | Array<string>,
    content?: string,
    embedProvider?: string | Array<string>,
    embedType?: string | Array<string>,
    has?: string | Array<string>,
    includeNSFW?: boolean,
    limit?: number,
    linkHostname?: string | Array<string>,
    maxId?: string,
    mentionEveryone?: boolean,
    mentions?: string | Array<string>,
    mentionsRoleId?: string | Array<string>,
    minId?: string,
    offset?: number,
    pinned?: boolean,
    repliedToMessageId?: string | Array<string>,
    repliedToUserId?: string | Array<string>,
    slop?: number,
    sortBy?: 'relevance' | 'timestamp',
    sortOrder?: 'asc' | 'desc',
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
    accent_color?: number,
    accessory?: RawChannelMessageComponent | toJSON<RawChannelMessageComponent>,
    channel_types?: Array<number>,
    component?: RawChannelMessageComponent | toJSON<RawChannelMessageComponent>,
    components?: Array<RawChannelMessageComponent | toJSON<RawChannelMessageComponent>>,
    content?: string,
    custom_id?: string,
    default?: boolean,
    default_values?: Array<{id: string, type: string}>,
    description?: string,
    disabled?: boolean,
    divider?: boolean,
    emoji?: RawEmojiPartial,
    file?: {url: string},
    file_types?: Array<string>,
    items?: Array<{
      description?: string,
      media: {url: string},
      spoiler?: boolean,
    }>,
    label?: string,
    max_length?: number,
    max_values?: number,
    media?: {url: string},
    min_length?: number,
    min_values?: number,
    options?: Array<RawChannelMessageComponentSelectMenuOption>,
    placeholder?: string,
    required?: boolean,
    sku_id?: string,
    spacing?: number,
    spoiler?: boolean,
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
  export type CreateInteractionResponse = DiscordTypes.InteractionCallbackResponse;
  export type FetchApplicationActivityInstance = DiscordTypes.ApplicationActivityInstance;
  export type CreateMessage = DiscordTypes.Message;
  export type EditMessage = DiscordTypes.Message;
}


export namespace DiscordTypes {
  export interface ApplicationActivityInstance {
    application_id: string,
    instance_id: string,
    launch_id: string,
    location: ApplicationActivityLocation,
    users: Array<string>,
  }

  export interface ApplicationActivityLocation {
    channel_id: string,
    guild_id?: null | string,
    id: string,
    kind: string,
  }

  export interface ChannelPartial {
    id: string,
    name: string,
  }

  export interface InteractionCallback {
    activity_instance_id?: string,
    id: string,
    response_message_ephemeral?: boolean,
    response_message_id?: string,
    response_message_loading?: boolean,
    type: number,
  }

  export interface InteractionCallbackResource {
    activity_instance?: {
      id: string,
    },
    message?: Message,
    type: number,
  }

  export interface InteractionCallbackResponse {
    interaction: InteractionCallback,
    resource?: InteractionCallbackResource,
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
    description?: string,
    duration_secs?: number,
    content_type: string | null,
    filename: string,
    height?: number,
    id: string,
    proxy_url: string,
    size: number,
    url: string,
    waveform?: string,
    width?: number,
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
