import { URLSearchParams } from 'url';

import { Tools } from 'detritus-utils';

import {
  ActivityActionTypes,
  ApiVersion,
} from './constants';
import { RequestTypes } from './types';


export { replacePathParameters as formatRoute } from 'detritus-rest';


export enum Urls {
  BLOG = 'https://blog.discord.com/',
  CANARY = 'https://canary.discord.com/',
  CDN = 'https://cdn.discordapp.com/',
  FEEDBACK = 'https://feedback.discord.com/',
  GIFT = 'https://discord.gift/',
  INVITE = 'https://discord.gg/',
  MEDIA = 'https://media.discordapp.net/',
  ROUTER = 'https://router.discordapp.net/',
  STABLE = 'https://discord.com/',
  STABLE_OLD = 'https://discordapp.com/',
  STATUS = 'https://status.discord.com/',
  SUPPORT = 'https://support.discord.com/',
  SUPPORT_DEV = 'https://support-dev.discord.com/',
  TEMPLATE = 'https://discord.new/',
}

export const Assets = Tools.URIEncodeWrap({
  URL: `${Urls.STABLE.slice(0, -1)}/assets`,

  DM_GROUP:
    '/f046e2247d730629309457e902d5c5b3.svg',

  ICON: (hash: string, format: string = 'png'): string =>
    `/${hash}.${format}`,
});

export const CDN = Tools.URIEncodeWrap({
  URL: Urls.CDN.slice(0, -1),

  APP_ASSET: (applicationId: string, hash: string, format: string = 'png'): string =>
    `/app-assets/${applicationId}/${hash}.${format}`,
  APP_ASSET_ACHIEVEMENT: (applicationId: string, achievementId: string, hash: string): string =>
    `/app-assets/${applicationId}/achievements/${achievementId}/icons/${hash}`,
  APP_ASSET_STORE: (applicationId: string, assetId: string, format: string = 'png'): string =>
    `/app-assets/${applicationId}/store/${assetId}.${format}`,
  APP_ICON: (applicationId: string, hash: string, format: string = 'png'): string =>
    `/app-icons/${applicationId}/${hash}.${format}`,
  APPLICATION_BACKGROUND: (applicationId: string): string =>
    `/store-directory-assets/applications/${applicationId}/hero-background.jpg`,
  APPLICATION_TRAILER: (applicationId: string): string =>
    `/store-directory-assets/applications/${applicationId}/trailer.mp4`,
  AVATAR: (userId: string, hash: string, format: string = 'png'): string =>
    `/avatars/${userId}/${hash}.${format}`,
  AVATAR_DEFAULT: (discriminator: number | string): string =>
    `/embed/avatars/${+(discriminator) % 5}.png`,
  BANNER: (id: string, hash: string, format: string = 'png'): string =>
    `/banners/${id}/${hash}.${format}`,
  CHANNEL_ICON: (channelId: string, hash: string, format: string = 'png'): string =>
    `/channel-icons/${channelId}/${hash}.${format}`,
  EMOJI: (emojiId: string, format: string = 'png'): string =>
    `/emojis/${emojiId}.${format}`,
  GUILD_ICON: (guildId: string, hash: string, format: string = 'png'): string =>
    `/icons/${guildId}/${hash}.${format}`,
  GUILD_SPLASH: (guildId: string, hash: string, format: string = 'png'): string =>
    `/splashes/${guildId}/${hash}.${format}`,
  GUILD_USER_AVATAR: (guildId: string, userId: string, hash: string, format: string = 'png') =>
    `/guilds/${guildId}/users/${userId}/avatars/${hash}.${format}`,
  ROLE_ICON: (roleId: string, hash: string, format: string = 'png'): string =>
    `/role-icons/${roleId}/${hash}.${format}`,
  STICKER: (stickerId: string, format: string = 'png'): string =>
    `/stickers/${stickerId}.${format}`,
  STICKER_HASH: (stickerId: string, hash: string, format: string = 'png'): string =>
    `/stickers/${stickerId}/${hash}.${format}`,
  TEAM_ICON: (teamId: string, hash: string, format: string = 'png'): string =>
    `/team-icons/${teamId}/${hash}.${format}`,

  CUSTOM_SPOTIFY: (hash: string): string =>
    `https://i.scdn.co/image/${hash}`,
  CUSTOM_TWITCH: (name: string, width: number, height: number): string =>
    `https://static-cdn.jtvnw.net/previews-ttv/live_user_${name}-${width}x${height}.jpg`,
  CUSTOM_YOUTUBE: (videoId: string): string =>
    `https://img.youtube.com/vi/${videoId}/default.jpg`,
});

export const ConnectionUrls = Tools.URIEncodeWrap({
  FACEBOOK: (id: string): string =>
    `https://www.facebook.com/${id}`,
  REDDIT: (name: string): string =>
    `https://www.reddit.com/u/${name}`,
  SKYPE: (id: string): string =>
    `skype:${id}?userinfo`,
  SPOTIFY: (id: string): string =>
    `https://open.spotify.com/user/${id}`,
  STEAM: (id: string): string =>
    `https://steamcommunity.com/profiles/${id}`,
  TWITCH: (name: string): string =>
    `https://www.twitch.tv/${name}`,
  TWITTER: (name: string): string =>
    `https://twitter.com/${name}`,
  YOUTUBE: (id: string): string =>
    `https://www.youtube.com/channel/${id}`,
});

export const EmbedUrls = Tools.URIEncodeWrap({
  YOUTUBE: (videoId: string): string =>
    `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&controls=1&origin=https://discordapp.com`,
});

export const Gift = Tools.URIEncodeWrap({
  LONG: (code: string): string =>
    `${Urls.STABLE.slice(0, -1)}/gifts/${code}`,
  SHORT: (code: string): string =>
    `${Urls.GIFT.slice(0, -1)}/${code}`,
});

export const Invite = Tools.URIEncodeWrap({
  LONG: (code: string): string =>
    `${Urls.STABLE.slice(0, -1)}/invite/${code}`,
  SHORT: (code: string): string =>
    `${Urls.INVITE.slice(0, -1)}/${code}`,
});

export const Routes = Tools.URIEncodeWrap({
  URL: Urls.STABLE.slice(0, -1),
  INDEX:
    '/',
  INDEX_WORD:
    '/index',
  INDEX_BUCKET: (bucketId: string): string =>
    `/index/${bucketId}`,
  404:
    '/404',
  APP:
    '/app',
  ACKNOWLEDGEMENTS:
    '/acknowledgements',
  ACTIVITY:
    '/activity',
  APPLICATION_LIBRARY:
    '/library',
  APPLICATION_LIBRARY_INVENTORY:
    '/library/inventory',
  APPLICATION_LIBRARY_ACTION: (gameId: string, action: string): string =>
    `/library/${gameId}/${action}`,
  APPLICATION_STORE:
    '/store',
  APPLICATION_STORE_BROWSE:
    '/store/browse',
  APPLICATION_STORE_BROWSE_SORT: (sort: string): string =>
    `/store/browse?genre=all&sort=${sort}`,
  APPLICATION_STORE_LISTING_APPLICATION: (applicationId: string, slug?: string): string =>
    `/store/applications/${applicationId}` + ((slug) ? `/${slug}` : ''),
  APPLICATION_STORE_LISTING_SKU: (skuId: string, slug?: string): string =>
    `/store/skus/${skuId}` + ((slug) ? `/${slug}` : ''),
  AUTHORIZE_IP:
    '/authorize-ip',
  BILLING_BRAINTREE_POPUP_BRIDGE_CALLBACK:
    '/billing/braintree/popup-bridge/callback',
  BILLING_GUILD_SUBSCRIPTIONS_PURCHASE:
    '/billing/guild-subscriptions/purchase',
  BILLING_PAYMENTS:
    '/billing/payments',
  BILLING_PAYMENT_SOURCES_CREATE:
    '/billing/payment-sources/create',
  BILLING_PREMIUM:
    '/billing/premium',
  BILLING_PREMIUM_SUBSCRIBE:
    '/billing/premium/subscribe',
  BILLING_PREMIUM_SWITCH_PLAN:
    '/billing/premium/switch-plan',
  BRANDING:
    '/branding',
  CHANGELOGS:
    '/settings/changelogs',
  CHANGELOGS_DATE: (date: string): string =>
    `/settings/changelogs/${date}`,
  CHANNEL: (guildId: string | null, channelId: string): string => 
    `/channels/${guildId || '@me'}/${channelId}`,
  COMPANY:
    '/company',
  CONNECTIONS: (platform: string): string =>
    `/connections/${platform}`,
  CONNECTIONS_XBOX_EDU:
    '/connections/xbox/intro',
  CONNECTIONS_XBOX_PIN:
    '/connections/xbox/pin',
  DEV_NEWSLETTER:
    '/dev-newsletter',
  DISABLE_EMAIL_NOTIFICATIONS:
    '/disable-email-notifications',
  DOWNLOAD:
    '/download',
  FRIENDS:
    '/channels/@me',
  GIFT_CODE: (code: string): string =>
    `/gifts/${code}`,
  GIFT_CODE_LOGIN: (code: string): string =>
    `/gifts/${code}/login`,
  GUIDELINES:
    '/guidelines',
  GUILD: (guildId: string): string =>
    `/channels/${guildId || '@me'}`,
  GUILD_CREATE:
    '/guilds/create',
  GUILD_DISCOVERY:
    '/guild-discovery',
  HANDOFF:
    '/handoff',
  HYPESQUAD:
    '/hypesquad',
  HYPESQUAD_RIOT:
    '/hypesquad-riot',
  INVITE: (code: string): string =>
    `/invite/${code}`,
  INVITE_PROXY: (channelId: string): string =>
    `/invite-proxy/${channelId}`,
  JOBS:
    '/jobs',
  JOB: (jobId: string) =>
    `/jobs/${jobId}`,
  LICENSES:
    '/licenses',
  LOGIN:
    '/login',
  LOGIN_HANDOFF:
    '/login/handoff',
  LOGIN_REDIRECT_TO: (redirectTo: string) =>
    `/login?redirect_to=${redirectTo}`,
  ME:
    '/channels/@me',
  MESSAGE: (guildId: string | null, channelId: string, messageId: string): string =>
    `/channels/${guildId || '@me'}/${channelId}/${messageId}`,
  NEWSLETTER:
    '/newsletter',
  NITRO:
    '/nitro',
  OAUTH2_AUTHORIZE:
    '/oauth2/authorize',
  OAUTH2_AUTHORIZED:
    '/oauth2/authorized',
  OAUTH2_ERROR:
    '/oauth2/error',
  OAUTH2_WHITELIST_ACCEPT:
    '/oauth2/whitelist/accept',
  OPEN_SOURCE:
    '/open-source',
  OVERLAY: (buildId: string, port: number): string =>
    `/overlay?build_id=${buildId}&rpc=${port}`,
  PARTNERS:
    '/partners',
  POPOUT_WINDOW:
    '/popout',
  PRIVACY:
    '/privacy',
  PRIVACY_2017:
    '/privacy-2017',
  PROMOTIONS_XBOX_GAME_PASS_REDEEM: (token: string) =>
    `/promotions/xbox-game-pass/redeem/${token}`,
  REGISTER:
    '/register',
  REGISTER_REDIRECT_TO: (redirectTo: string) =>
    `/register?redirect_to=${redirectTo}`,
  RESET:
    '/reset',
  RICH_PRESENCE:
    '/rich-presence',
  SECURITY:
    '/security',
  SELL_YOUR_GAME:
    '/sell-your-game',
  SELL_YOUR_GAMES:
    '/sell-your-games',
  SETTINGS: (section: string): string =>
    `/settings/${section}`,
  SETTINGS_HYPESQUAD_ONLINE:
    '/settings/hypesquad-online',
  SETTINGS_SUB: (section: string, subsection: string) =>
    `/settings/${section}/${subsection}`,
  STORE_BROWSE:
    '/store/browse',
  STORE_BROWSE_NITRO:
    '/store/browse?type=nitro',
  STORE_SKU: (skuId: string) =>
    `/store/skus/${skuId}`,
  STORE_SKU_STORE_LISTING_ID: (skuId: string, storeListingId: string) =>
    `/store/skus/${skuId}?store_listing_id=${storeListingId}`,
  STORE_TERMS:
    '/store-terms',
  STREAMKIT:
    '/streamkit',
  TEMPLATE: (templateId: string) =>
    `/template/${templateId}`,
  TEMPLATE_LOGIN: (templateId: string) =>
    `/template/${templateId}/login`,
  TERMS:
    '/terms',
  USER: (userId: string): string =>
    `/users/${userId}`,
  VERIFICATION:
    '/verification',
  VERIFY:
    '/verify',
  WARFRAME:
    '/warframe',
  WELCOME: (guildId: string, channelId: string, type: number | string): string =>
    `/welcome/${guildId}/${channelId}/${type}`,
  WIDGET:
    '/widget',
  XBOX_OFFER:
    '/discord-xbox-offer-2019',
});

export const Template = Tools.URIEncodeWrap({
  LONG: (code: string): string =>
    `${Urls.STABLE.slice(0, -1)}/template/${code}`,
  SHORT: (code: string): string =>
    `${Urls.TEMPLATE.slice(0, -1)}/${code}`,
});


export const RoutesQuery = Object.freeze({
  INVITE: (code: string, options: RequestTypes.RouteInvite = {}) => {
    const query = new URLSearchParams();
    if (options.username) {
      query.set('username', options.username);
    }
    return `${Routes.INVITE(code)}?${query}`;
  },
  WIDGET: (guildId: string, options: RequestTypes.RouteWidget = {}) => {
    const query = new URLSearchParams({id: guildId});
    if (options.theme) {
      query.append('theme', options.theme);
    }
    if (options.username) {
      query.append('username', options.username);
    }
    return `${Routes.WIDGET}?${query}`;
  },
});

export const Api = {
  URL_STABLE: Urls.STABLE.slice(0, -1),
  URL_CANARY: Urls.CANARY.slice(0, -1),
  PATH: `/api/v${ApiVersion}`,
  VERSION: ApiVersion,

  ACTIVITIES:
    '/activities',
  ACTIVITIES_APPLICATION_JOIN_TICKET:
    '/activities/applications/:applicationId/:ticketId/join-ticket',
  ACTIVITIES_STATISTICS_APPLICATION:
    '/activities/statistics/applications/:applicationId',

  APPLICATION_NEWS:
    '/application-news',
  APPLICATION_NEWS_ID:
    '/application-news/:newsId',

  APPLICATIONS:
    '/applications',
  APPLICATIONS_BOTS_COMMANDS:
    '/applications/bots/:applicationId/commands',
  APPLICATIONS_DETECTABLE:
    '/applications/detectable',
  APPLICATIONS_PUBLIC:
    '/applications/public',
  APPLICATIONS_TRENDING_GLOBAL:
    '/applications/trending/global',
  APPLICATION:
    '/applications/:applicationId',
  APPLICATION_BRANCHES:
    '/applications/:applicationId/branches',
  APPLICATION_BRANCH_BUILDS:
    '/applications/:applicationId/branches/:branchId/builds',
  APPLICATION_BRANCH_BUILDS_LIVE:
    '/applications/:applicationId/branches/:branchId/builds/live',
  APPLICATION_BRANCH_BUILD_PUBLISH:
    '/applications/:applicationId/branches/:branchId/builds/:buildId/publish',
  APPLICATION_BRANCH_BUILD_SIZE:
    '/applications/:applicationId/branches/:branchId/builds/:buildId/size',
  APPLICATION_BRANCH_STORAGE:
    '/applications/:applicationId/branches/:branchId/storage',
  APPLICATION_COMMANDS:
    '/applications/:applicationId/commands',
  APPLICATION_COMMAND:
    '/applications/:applicationId/commands/:commandId',
  APPLICATION_GIFT_CODE_BATCHES:
    '/applications/:applicationId/gift-code-batches',
  APPLICATION_GIFT_CODE_BATCHES_CSV_DOWNLOAD:
    '/applications/:applicationId/gift-code-batches/:batchId',
  APPLICATION_GUILD_COMMANDS:
    '/applications/:applicationId/guilds/:guildId/commands',
  APPLICATION_GUILD_COMMANDS_PERMISSIONS:
    '/applications/:applicationId/guilds/:guildId/commands/permissions',
  APPLICATION_GUILD_COMMAND:
    '/applications/:applicationId/guilds/:guildId/commands/:commandId',
  APPLICATION_GUILD_COMMAND_PERMISSIONS:
    '/applications/:applicationId/guilds/:guildId/commands/:commandId/permissions',
  APPLICATION_ICON:
    '/applications/:applicationId/app-icons/:hash.png',
  APPLICATION_MANIFEST_LABELS:
    '/applications/:applicationId/manifest-labels',
  APPLICATION_PURCHASE:
    '/applications/:applicationId/purchase',
  APPLICATION_SKUS:
    '/applications/:applicationId/skus',

  // these ones are weird lmao
  APPLICATION_ANALYTICS_ACQUISITIONS_ACQUIRERS:
    '/application/:applicationId/analytics/acquisitions/acquirers',
  APPLICATION_ANALYTICS_ACQUISITIONS_EXTERNAL:
    '/application/:applicationId/analytics/acquisitions/external',
  APPLICATION_ANALYTICS_ACQUISITIONS_FUNNEL:
    '/application/:applicationId/analytics/acquisitions/funnel',
  APPLICATION_ANALYTICS_ACQUISITIONS_IMPRESSIONS:
    '/application/:applicationId/analytics/acquisitions/impressions',
  APPLICATION_ANALYTICS_ACQUISITIONS_STORE_LISTING_VIEWS:
    '/application/:applicationId/analytics/acquisitions/store-listing-views',
  APPLICATION_ANALYTICS_ACQUISITIONS_UTM:
    '/application/:applicationId/analytics/acquisitions/utm',
  APPLICATION_ANALYTICS_ACTIVATIONS_FUNNEL:
    '/application/:applicationId/analytics/activations/funnel',
  APPLICATION_ANALYTICS_ACTIVATIONS_INSTALLATIONS:
    '/application/:applicationId/analytics/activations/installations',
  APPLICATION_ANALYTICS_ACTIVATIONS_NEW_PLAYERS:
    '/application/:applicationId/analytics/activations/new-players',
  APPLICATION_ANALYTICS_ACTIVATIONS_REACTIVATED_PLAYERS:
    '/application/:applicationId/analytics/activations/reactivated-players',
  APPLICATION_ANALYTICS_ENGAGEMENT_ACTIVE_PLAYERS:
    '/application/:applicationId/analytics/engagement/active-players',
  APPLICATION_ANALYTICS_ENGAGEMENT_PLAYER_RETENTION:
    '/application/:applicationId/analytics/engagement/player-retention',
  APPLICATION_ANALYTICS_REVENUE:
    '/application/:applicationId/analytics/revenue',
  APPLICATION_ANALYTICS_STATUS:
    '/application/:applicationId/analytics/status',
  APPLICATION_ANALYTICS_UNITS:
    '/application/:applicationId/analytics/units',

  AUTH_AUTHORIZE_IP:
    '/auth/authorize-ip',
  AUTH_CONSENT_REQUIRED:
    '/auth/consent-required',
  AUTH_HANDOFF:
    '/auth/handoff',
  AUTH_HANDOFF_EXCHANGE:
    '/auth/handoff/exchange',
  AUTH_LOGIN:
    '/auth/login',
  AUTH_LOGOUT:
    '/auth/logout',
  AUTH_MFA_SMS:
    '/auth/mfa/sms',
  AUTH_MFA_SMS_SEND:
    '/auth/mfa/sms/send',
  AUTH_MFA_TOTP:
    '/auth/mfa/totp',
  AUTH_PASSWORD_FORGOT:
    '/auth/forgot',
  AUTH_PASSWORD_RESET:
    '/auth/reset',
  AUTH_REGISTER:
    '/auth/register',
  AUTH_VERIFY:
    '/auth/verify',
  AUTH_VERIFY_RESEND:
    '/auth/verify/resend',

  BILLING_APPLE_RECEIPT:
    '/billing/apple/apply-receipt',
  BILLING_BRAINTREE_POPUP_BRIDGE:
    '/billing/braintree/popup-bridge',
  BILLING_BRAINTREE_POPUP_BRIDGE_CALLBACK:
    '/billing/braintree/popup-bridge/callback',
  BILLING_BRAINTREE_POPUP_BRIDGE_CALLBACK_STATE:
    '/billing/braintree/popup-bridge/callback/:state/',

  BRANCHES:
    '/branches',

  CHANNELS:
    '/channels',
  CHANNEL:
    '/channels/:channelId',
  CHANNEL_CALL:
    '/channels/:channelId/call',
  CHANNEL_CALL_RING:
    '/channels/:channelId/call/ring',
  CHANNEL_CALL_STOP_RINGING:
    '/channels/:channelId/call/stop-ringing',
  CHANNEL_FOLLOWER_MESSAGE_STATS:
    '/channels/:channelId/follower-message-stats',
  CHANNEL_FOLLOWER_STATS:
    '/channels/:channelId/follower-stats',
  CHANNEL_FOLLOWERS:
    '/channels/:channelId/followers',
  CHANNEL_ICON:
    '/channels/:channelId/icons/:hash.jgp',
  CHANNEL_INVITES:
    '/channels/:channelId/invites',
  CHANNEL_MESSAGES:
    '/channels/:channelId/messages',
  CHANNEL_MESSAGES_ACK:
    '/channels/:channelId/messages/ack',
  CHANNEL_MESSAGES_BULK_DELETE:
    '/channels/:channelId/messages/bulk-delete',
  CHANNEL_MESSAGES_SEARCH:
    '/channels/:channelId/messages/search',
  CHANNEL_MESSAGE:
    '/channels/:channelId/messages/:messageId',
  CHANNEL_MESSAGE_ACK:
    '/channels/:channelId/messages/:messageId/ack',
  CHANNEL_MESSAGE_CROSSPOST:
    '/channels/:channelId/messages/:messageId/crosspost',
  CHANNEL_MESSAGE_REACTIONS:
    '/channels/:channelId/messages/:messageId/reactions',
  CHANNEL_MESSAGE_REACTION:
    '/channels/:channelId/messages/:messageId/reactions/:emoji',
  CHANNEL_MESSAGE_REACTION_USER:
    '/channels/:channelId/messages/:messageId/reactions/:emoji/:userId',
  CHANNEL_MESSAGE_THREADS:
    '/channels/:channelId/messages/:messageId/threads',
  CHANNEL_PERMISSIONS:
    '/channels/:channelId/permissions',
  CHANNEL_PERMISSION:
    '/channels/:channelId/permissions/:overwriteId',
  CHANNEL_PINS:
    '/channels/:channelId/pins',
  CHANNEL_PINS_ACK:
    '/channels/:channelId/pins/ack',
  CHANNEL_PIN:
    '/channels/:channelId/pins/:messageId',
  CHANNEL_RECIPIENTS:
    '/channels/:channelId/recipients',
  CHANNEL_RECIPIENT:
    '/channels/:channelId/recipients/:userId',
  CHANNEL_STORE_LISTING:
    '/channels/:channelId/store-listing',
  CHANNEL_STORE_LISTING_ENTITLEMENT_GRANT:
    '/channels/:channelId/store-listing/entitlement-grant',
  CHANNEL_STORE_LISTINGS_SKU:
    '/channels/:channelId/store-listings/:skuId',
  CHANNEL_THREADS:
    '/channels/:channelId/threads',
  CHANNEL_THREADS_ACTIVE:
    '/channels/:channelId/threads/active',
  CHANNEL_THREADS_ARCHIVED_PRIVATE:
    '/channels/:channelId/threads/archived/private',
  CHANNEL_THREADS_ARCHIVED_PUBLIC:
    '/channels/:channelId/threads/archived/public',
  CHANNEL_THREAD_MEMBERS:
    '/channels/:channelId/thread-members',
  CHANNEL_THREAD_MEMBER:
    '/channels/:channelId/thread-members/:userId',
  CHANNEL_THREAD_MEMBER_ME:
    '/channels/:channelId/thread-members/@me',
  CHANNEL_TYPING:
    '/channels/:channelId/typing',
  CHANNEL_USER_THREADS_ARCHIVED_PRIVATE:
    '/channels/:channelId/users/:userId/threads/archived/private',
  CHANNEL_WEBHOOKS:
    '/channels/:channelId/webhooks',

  COMPANIES:
    '/companies',
  COMPANY:
    '/companies/:companyId',

  CONNECTION_AUTHORIZE:
    '/connections/:platform/authorize',
  CONNECTION_AUTHORIZE_CONTINUATION:
    '/connections/:platform/authorize?continuation=true',
  CONNECTION_CALLBACK:
    '/connections/:platform/callback',
  CONNECTION_CALLBACK_CONTINUATION:
    '/connections/:platform/callback-continuation',
  CONNECTION_CALLBACK_CONTINUATION_PIN:
    '/connections/:platform/callback-continuation/:pin',

  DISCOVERABLE_GUILDS:
    '/discoverable-guilds',

  DOWNLOAD_EMAIL:
    '/download/email', // disabled
  DOWNLOAD_SMS:
    '/download/sms',

  EMOJI:
    '/emojis/:emojiId.:format',
  EMOJI_GUILD:
    '/emojis/:emojiId/guild',

  ENTITLEMENTS_GIFT_CODE:
    '/entitlements/gift-codes/:code',
  ENTITLEMENTS_GIFT_CODE_REDEEM:
    '/entitlements/gift-codes/:code/redeem',

  EXPERIMENTS:
    '/experiments',

  FRIEND_SUGGESTIONS:
    '/friend-suggestions',
  FRIEND_SUGGESTIONS_ACCEPT_MUTUAL_CONTACTS:
    '/friend-suggestions/accept-mutual-contacts',
  FRIEND_SUGGESTIONS_SYNC:
    '/friend-suggestions/sync',
  FRIEND_SUGGESTION:
    '/friend-suggestions/:userId',

  GAME_NEWS:
    '/game-news',
  GAME_NEWS_ID:
    '/game-news?game_ids=:gameIds',

  GATEWAY:
    '/gateway',
  GATEWAY_BOT:
    '/gateway/bot',

  GIFS_SEARCH:
    '/gifs/search',
  GIFS_SELECT:
    '/gifs/select',
  GIFS_SUGGEST:
    '/gifs/suggest',
  GIFS_TRENDING:
    '/gifs/trending',
  GIFS_TRENDING_GIFS:
    '/gifs/trending-gifs',

  GUILDS:
    '/guilds',
  GUILDS_DISCOVERY:
    '/guilds/discoverable',
  GUILDS_TEMPLATE:
    '/guilds/templates/:templateId',
  GUILD:
    '/guilds/:guildId',
  GUILD_ACK:
    '/guilds/:guildId/ack',
  GUILD_ANALYTICS_OVERVIEW:
    '/guilds/:guildId/analytics/overview',
  GUILD_APPLICATIONS:
    '/guilds/:guildId/applications',
  GUILD_AUDIT_LOGS:
    '/guilds/:guildId/audit-logs',
  GUILD_BANS:
    '/guilds/:guildId/bans',
  GUILD_BAN:
    '/guilds/:guildId/bans/:userId',
  GUILD_BANNER:
    '/guilds/:guildId/banners/:hash.jpg',
  GUILD_CHANNELS:
    '/guilds/:guildId/channels',
  GUILD_DELETE:
    '/guilds/:guildId/delete',
  GUILD_DISCOVERY_CATEGORIES:
    '/guilds/:guildId/discovery-categories',
  GUILD_DISCOVERY_CHECKLIST:
    '/guilds/:guildId/discovery-checklist',
  GUILD_DISCOVERY_METADATA:
    '/guilds/:guildId/discovery-metadata',
  GUILD_DISCOVERY_VALID_TERM:
    '/guilds/:guildId/valid-term',
  GUILD_EMBED:
    '/guilds/:guildId/embed',
  GUILD_EMBED_JSON:
    '/guilds/:guildId/embed.json',
  GUILD_EMBED_PNG:
    '/guilds/:guildId/embed.png',
  GUILD_EMOJIS:
    '/guilds/:guildId/emojis',
  GUILD_EMOJI:
    '/guilds/:guildId/emojis/:emojiId',
  GUILD_ICON:
    '/guilds/:guildId/icons/:hash.:format',
  GUILD_INTEGRATIONS:
    '/guilds/:guildId/integrations',
  GUILD_INTEGRATION:
    '/guilds/:guildId/integrations/:integrationId',
  GUILD_INTEGRATION_SYNC:
    '/guilds/:guildId/integrations/:integrationId/sync',
  GUILD_INVITES:
    '/guilds/:guildId/invites',
  GUILD_MEMBER_VERIFICATION:
    '/guilds/:guildId/member-verification',
  GUILD_JOIN:
    '/guilds/:guildId/members/@me',
  GUILD_MEMBERS:
    '/guilds/:guildId/members',
  GUILD_MEMBERS_SEARCH:
    '/guilds/:guildId/members/search',
  GUILD_MEMBER:
    '/guilds/:guildId/members/:userId',
  GUILD_MEMBER_NICK:
    '/guilds/:guildId/members/@me/nick',
  GUILD_MEMBER_ROLE:
    '/guilds/:guildId/members/:userId/roles/:roleId',
  GUILD_MFA:
    '/guilds/:guildId/mfa',
  GUILD_PREMIUM_SUBSCRIPTIONS:
    '/guilds/:guildId/premium/subscriptions',
  GUILD_PREMIUM_SUBSCRIPTION:
    '/guilds/:guildId/premium/subscriptions/:subscriptionId',
  GUILD_PREVIEW:
    '/guilds/:guildId/preview',
  GUILD_PRUNE:
    '/guilds/:guildId/prune',
  GUILD_REGIONS:
    '/guilds/:guildId/regions',
  GUILD_ROLES:
    '/guilds/:guildId/roles',
  GUILD_ROLE:
    '/guilds/:guildId/roles/:roleId',
  GUILD_SCHEDULED_EVENTS:
    '/guilds/:guildId/scheduled-events',
  GUILD_SCHEDULED_EVENT:
    '/guilds/:guildId/scheduled-events/:scheduledEventId',
  GUILD_SCHEDULED_EVENT_USERS:
    '/guilds/:guildId/scheduled-events/:scheduledEventId/users',
  GUILD_SEARCH:
    '/guilds/:guildId/messages/search',
  GUILD_SPLASH:
    '/guilds/:guildId/splashes/:hash.jpg',
  GUILD_STICKERS:
    '/guilds/:guildId/stickers',
  GUILD_STICKER:
    '/guilds/:guildId/stickers/:stickerId',
  GUILD_TEMPLATES:
    '/guilds/:guildId/templates',
  GUILD_TEMPLATE:
    '/guilds/:guildId/templates/:templateId',
  GUILD_VANITY_URL:
    '/guilds/:guildId/vanity-url',
  GUILD_VOICE_STATE:
    '/guilds/:guildId/voice-states/:userId',
  GUILD_WEBHOOKS:
    '/guilds/:guildId/webhooks',
  GUILD_WIDGET:
    '/guilds/:guildId/widget',
  GUILD_WIDGET_JSON:
    '/guilds/:guildId/widget.json',
  GUILD_WIDGET_PNG:
    '/guilds/:guildId/widget.png',

  HYPESQUAD_APPLY:
    '/hypesquad/apply',
  HYPESQUAD_ONLINE:
    '/hypesquad/online',

  INTEGRATIONS:
    '/integrations',
  INTEGRATION:
    '/integrations/:integrationId',
  INTEGRATION_JOIN:
    '/integrations/:integrationId/join',
  INTEGRATION_SEARCH:
    '/integrations/:integrationId/search',

  INTERACTIONS:
    '/interactions',
  INTERACTION_CALLBACK:
    '/interactions/:interactionId/:token/callback',

  INVITE:
    '/invites/:code',

  JOBS:
    '/jobs/:jobId',

  LOBBIES:
    '/lobbies',
  LOBBIES_SEARCH:
    '/lobbies/search',
  LOBBY:
    '/lobbies/:lobbyId',
  LOBBY_MEMBER:
    '/lobbies/:lobbyId/members/:userId',
  LOBBY_SEND:
    '/lobbies/:lobbyId/send',

  ME:
    '/users/@me',
  ME_ACTIVITIES_STATISTICS:
    '/users/@me/activities/statistics/applications',
  ME_ACTIVITY_JOIN_INVITE:
    `/users/@me/sessions/:currentSessionId/activities/:applicationId/${ActivityActionTypes.JOIN_REQUEST}/:userId`,
  ME_AFFINITIES_GUILDS:
    '/users/@me/affinities/guilds',
  ME_AFFINITIES_USERS:
    '/users/@me/affinities/users',
  ME_AGREEMENTS:
    '/users/@me/agreements',
  ME_APPLICATION_achievementS:
    '/users/@me/applications/:applicationId/achievements',
  ME_APPLICATION_ENTITLEMENTS:
    '/users/@me/applications/:applicationId/entitlements',
  ME_APPLICATION_ENTITLEMENT_TICKET:
    '/users/@me/applications/:applicationId/entitlement-ticket',
  ME_APPLICATION_TICKET:
    '/users/@me/applications/:applicationId/ticket',
  ME_BILLING_INVOICES_PREVIEW:
    '/users/@me/billing/invoices/preview',
  ME_BILLING_PAYMENT_SOURCES:
    '/users/@me/billing/payment-sources',
  ME_BILLING_PAYMENT_SOURCE:
    '/users/@me/billing/payment-sources/:paymentSourceId',
  ME_BILLING_PAYMENTS:
    '/users/@me/billing/payments',
  ME_BILLING_PAYMENT_VOID:
    '/users/@me/billing/payments/:paymentId/void',
  ME_BILLING_STRIPE_SETUP_INTENT:
    '/users/@me/billing/stripe/setup-intents',
  ME_BILLING_STRIPE_PAYMENT_INTENTS_PAYMENT:
    '/users/@me/billing/stripe/payment-intents/payments/:paymentId',
  ME_BILLING_SUBSCRIPTIONS:
    '/users/@me/billing/subscriptions',
  ME_BILLING_SUBSCRIPTION:
    '/users/@me/billing/subscriptions/:subscriptionId',
  ME_BILLING_TRIAL_ELIGIBILITY:
    '/users/@me/billings/trials/:trialId/eligibility',
  ME_CAPTCHA_VERIFY:
    '/users/@me/captcha/verify',
  ME_CHANNELS:
    '/users/@me/channels',
  ME_CONNECTIONS:
    '/users/@me/connections',
  ME_CONNECTION:
    '/users/@me/connections/:platform/:accountId',
  ME_CONNECTION_ACCESS_TOKEN:
    '/users/@me/connections/:platform/:accountId/access-token',
  ME_CONNECTION_REDDIT_SUBREDDITS:
    '/users/@me/connections/reddit/:accountId/subreddits',
  ME_CONSENT:
    '/users/@me/consent',
  ME_DELETE_ACCOUNT:
    '/users/@me/delete',
  ME_DEVICES:
    '/users/@me/devices',
  ME_DISABLE_ACCOUNT:
    '/users/@me/disable',
  ME_ENTITLEMENTS_GIFTS:
    '/users/@me/entitlements/gifts',
  ME_ENTITLEMENTS_GIFT_CODES:
    '/users/@me/entitlements/gift-codes',
  ME_ENTITLEMENTS_GIFT_CODE:
    '/users/@me/entitlements/gift-codes/:code',
  ME_FEED_SETTINGS:
    '/users/@me/feed/settings',
  ME_FEED_UNSUBSCRIBED_USERS:
    '/users/@me/feed/unsubscribed_users',
  ME_GUILDS:
    '/users/@me/guilds',
  ME_GUILDS_PREMIUM_SUBSCRIPTIONS:
    '/users/@me/guilds/premium/subscriptions',
  ME_GUILDS_PREMIUM_SUBSCRIPTIONS_COOLDOWN:
    '/users/@me/guilds/premium/subscriptions/cooldown',
  ME_GUILDS_PREMIUM_SUBSCRIPTION_SLOTS:
    '/users/@me/guilds/premium/subscription-slots',
  ME_GUILDS_PREMIUM_SUBSCRIPTION_SLOT_CANCEL:
    '/users/@me/guilds/premium/subscription-slots/:subscriptionId/cancel',
  ME_GUILDS_PREMIUM_SUBSCRIPTION_SLOT_UNCANCEL:
    '/users/@me/guilds/premium/subscription-slots/:subscriptionId/uncancel',
  ME_GUILD:
    '/users/@me/guilds/:guildId',
  ME_GUILD_SETTINGS:
    '/users/@me/guilds/:guildId/settings',
  ME_HARVEST:
    '/users/@me/harvest',
  ME_LIBRARY:
    '/users/@me/library',
  ME_LIBRARY_APPLICATION:
    '/users/@me/library/:applicationId',
  ME_LIBRARY_APPLICATION_BRANCH:
    '/users/@me/library/:applicationId/:branchId',
  ME_LIBRARY_APPLICATION_BRANCH_INSTALLED:
    '/users/@me/library/:applicationId/:branchId/installed',
  ME_MENTIONS:
    '/users/@me/mentions',
  ME_MENTION:
    '/users/@me/mentions/:messageId',
  ME_MFA_CODES:
    '/users/@me/mfa/codes',
  ME_MFA_SMS_DISABLE:
    '/users/@me/mfa/sms/disable',
  ME_MFA_SMS_ENABLE:
    '/users/@me/mfa/sms/enable',
  ME_MFA_TOTP_DISABLE:
    '/users/@me/mfa/totp/disable',
  ME_MFA_TOTP_ENABLE:
    '/users/@me/mfa/totp/enable',
  ME_NOTES:
    '/users/@me/notes',
  ME_NOTE:
    '/users/@me/notes/:userId',
  ME_PHONE:
    '/users/@me/phone',
  ME_PHONE_VERIFY:
    '/users/@me/phone/verify',
  ME_RELATIONSHIPS:
    '/users/@me/relationships',
  ME_RELATIONSHIP:
    '/users/@me/relationships/:userId',
  ME_REMOTE_AUTH:
    '/users/@me/remote-auth',
  ME_REMOTE_AUTH_CANCEL:
    '/users/@me/remote-auth/cancel',
  ME_REMOTE_AUTH_FINISH:
    '/users/@me/remote-auth/finish',
  ME_SETTINGS:
    '/users/@me/settings',
  ME_SETTINGS_GAME_NOTIFICATIONS:
    '/users/@me/settings/game-notifications',
  ME_SETTINGS_GAME_NOTIFICATIONS_OVERRIDES:
    '/users/@me/settings/game-notifications/overrides',
  ME_STICKER_PACKS:
    '/users/@me/sticker-packs',

  NATIVE_DEBUG_LOGS:
    '/native/debug-logs',

  NETWORKING_TOKEN:
    '/networking/token',

  OAUTH2_APPLICATIONS:
    '/oauth2/applications',
  OAUTH2_APPLICATION:
    '/oauth2/applications/:applicationId',
  OAUTH2_APPLICATION_ACHIEVEMENTS:
    '/oauth2/applications/:applicationId/achievements',
  OAUTH2_APPLICATION_ACHIEVEMENT:
    '/oauth2/applications/:applicationId/achievements/:achievementId',
  OAUTH2_APPLICATION_ACTIVATE_LICENSE:
    '/oauth2/applications/:applicationId/activate-license',
  OAUTH2_APPLICATION_APPROVALS:
    '/oauth2/applications/:applicationId/approvals',
  OAUTH2_APPLICATION_ASSETS:
    '/oauth2/applications/:applicationId/assets',
  OAUTH2_APPLICATION_ASSETS_ENABLE:
    '/oauth2/applications/:applicationId/assets/enable',
  OAUTH2_APPLICATION_ASSET:
    '/oauth2/applications/:applicationId/assets/:assetId',
  OAUTH2_APPLICATION_BOT:
    '/oauth2/applications/:applicationId/bot',
  OAUTH2_APPLICATION_BOT_RESET:
    '/oauth2/applications/:applicationId/bot/reset',
  OAUTH2_APPLICATION_DELETE:
    '/oauth2/applications/:applicationId/delete',
  OAUTH2_APPLICATION_RESET:
    '/oauth2/applications/:applicationId/reset',
  OAUTH2_APPLICATION_RICH_PRESENCE_APPROVAL_FORM:
    '/oauth2/applications/:applicationId/rich-presence/approval-form',
  OAUTH2_APPLICATION_RICH_PRESENCE_APPROVAL_FORM_SCREENSHOTS:
    '/oauth2/applications/:applicationId/rich-presence/approval-form/screenshots',
  OAUTH2_APPLICATION_RICH_PRESENCE_APPROVAL_FORM_SCREENSHOT:
    '/oauth2/applications/:applicationId/rich-presence/approval-form/screenshots/:screenshotId',
  OAUTH2_APPLICATION_RICH_PRESENCE_APPROVAL_FORM_SCREENSHOT_IMAGE:
    '/oauth2/applications/:applicationId/rich-presence/approval-form/screenshots/:screenshotId.jpg',
  OAUTH2_APPLICATION_RPC:
    '/oauth2/applications/:applicationId/rpc',
  OAUTH2_APPLICATION_RPC_APPLY:
    '/oauth2/applications/:applicationId/rpc/apply',
  OAUTH2_APPLICATION_RPC_ENABLE:
    '/oauth2/applications/:applicationId/rpc/enable',
  OAUTH2_APPLICATION_SKUS:
    '/oauth2/applications/:applicationId/skus',
  OAUTH2_APPLICATION_TRANSFER:
    '/oauth2/applications/:applicationId/transfer',
  OAUTH2_APPLICATION_WHITELIST:
    '/oauth2/applications/:applicationId/whitelist',
  OAUTH2_APPLICATION_WHITELIST_USER:
    '/oauth2/applications/:applicationId/whitelist/:userId',
  OAUTH2_AUTHORIZE:
    '/oauth2/authorize',
  OAUTH2_AUTHORIZE_WEBHOOK_CHANNELS:
    '/oauth2/authorize/webhook-channels',
  OAUTH2_ME:
    '/oauth2/@me',
  OAUTH2_TOKEN:
    '/oauth2/token',
  OAUTH2_TOKEN_REVOKE:
    '/oauth2/token/revoke',
  OAUTH2_TOKENS:
    '/oauth2/tokens',
  OAUTH2_TOKENS_SINGLE:
    '/oauth2/tokens/:tokenId',
  OAUTH2_TOKEN_RPC:
    '/oauth2/token/rpc',
  OAUTH2_WHITELIST_ACCEPT:
    '/oauth2/whitelist/accept',

  PARTNERS_APPLY:
    '/partners/apply',
  PARTNERS_CONNECTIONS:
    '/partners/connections',
  PARTNER_REQUIREMENTS:
    '/partners/:guildId/requirements',

  PROMOTIONS:
    '/promotions',
  PROMOTIONS_ACK:
    '/promotions/ack',
  PROMOTIONS_FUNIMATION:
    '/promotions/funimation',
  PROMOTIONS_FUNIMATION_REDEEM:
    '/promotions/funimation/redeem',
  PROMOTIONS_XBOX_GAME_PASS:
    '/promotions/xbox-game-pass',
  PROMOTIONS_XBOX_GAME_PASS_REDEEM:
    '/promotions/xbox-game-pass/redeem',

  READ_STATES_ACK_BULK:
    '/read-states/ack-bulk',

  REPORT:
    '/report',

  RTC_QUALITY_REPORT:
    '/rtc/quality-report',

  SSO:
    '/sso',

  STAGE_INSTANCES:
    '/stage-instances',
  STAGE_INSTANCE:
    '/stage-instances/:channelId',

  STICKER_ASSET:
    '/stickers/:stickerId/:assetId.:format',

  STICKER_PACKS_DIRECTORY:
    '/sticker-packs/directory/:directoryId',
  STICKER_PACK:
    '/sticker-packs/:stickerPackId',

  STORE_APPLICATION_ASSETS:
    '/store/applications/:applicationId/assets',
  STORE_APPLICATION_ASSET:
    '/store/applications/:applicationId/assets/:assetId',
  STORE_APPLICATION_ASSET_IMAGE:
    '/store/applications/:applicationId/assets/:assetId.:format',
  STORE_DIRECTORY_LAYOUT:
    '/store/directory-layouts/:layoutId',
  STORE_DIRECTORY:
    '/store/directory/:layoutId',
  STORE_EULA:
    '/store/eulas/:eulaId',
  STORE_LISTINGS:
    '/store/listings',
  STORE_LISTING:
    '/store/listings/:listingId',
  STORE_PRICE_TIERS:
    '/store/price-tiers',
  STORE_PRICE_TIER:
    '/store/price-tiers/:priceTier',
  STORE_PUBLISHED_LISTINGS_APPLICATIONS:
    '/store/published-listings/applications',
  STORE_PUBLISHED_LISTINGS_APPLICATION:
    '/store/published-listings/applications/:applicationId',
  STORE_PUBLISHED_LISTINGS_SKUS:
    '/store/published-listings/skus',
  STORE_PUBLISHED_LISTINGS_SKU:
    '/store/published-listings/skus/:skuId',
  STORE_PUBLISHED_LISTINGS_SKU_JOIN_GUILD:
    '/store/published-listings/skus/:skuId/guild/join',
  STORE_PUBLISHED_LISTINGS_SKU_SUBSCRIPTION_PLANS:
    '/store/published-listings/skus/:skuId/subscription-plans',
  STORE_SKUS:
    '/store/skus',
  STORE_SKU:
    '/store/skus/:skuId',
  STORE_SKU_LISTINGS:
    '/store/skus/:skuId/listings',
  STORE_SKU_PURCHASE:
    '/store/skus/:skuId/purchase',

  STREAM_NOTIFY:
    '/streams/:streamKey/notify',
  STREAM_PREVIEW:
    '/streams/:streamKey/preview',

  TEAMS:
    '/teams',
  TEAMS_INVITE_ACCEPT:
    '/teams/invite/accept',
  TEAM:
    '/teams/:teamId',
  TEAM_APPLICATIONS:
    '/teams/:teamId/applications',
  TEAM_COMPANIES:
    '/teams/:teamId/companies',
  TEAM_DELETE:
    '/teams/:teamId/delete',
  TEAM_MEMBERS:
    '/teams/:teamId/members',
  TEAM_MEMBER:
    '/teams/:teamId/members/:userId',
  TEAM_PAYOUTS:
    '/teams/:teamId/payouts',
  TEAM_PAYOUTS_IFRAME:
    '/teams/:teamId/payouts/onboarding',

  TEMPLATE_ICON:
    '/templates/:templateId/icons/:hash.jpg',

  TRACK:
    '/science',

  TUTORIAL:
    '/tutorial',
  TUTORIAL_INDICATORS:
    '/tutorial/indicators',
  TUTORIAL_INDICATORS_SUPPRESS:
    '/tutorial/indicators/suppress',
  TUTORIAL_INDICATOR:
    '/tutorial/indicators/:indicatorId',

  UNVERIFIED_APPLICATIONS:
    '/unverified-applications',
  UNVERIFIED_APPLICATIONS_ICONS:
    '/unverified-applications/icons',

  USERS:
    '/users',
  USERS_DISABLE_EMAIL_NOTIFICATIONS:
    '/users/disable-email-notifications',
  USER:
    '/users/:userId',
  USER_ACTIVITY_METADATA:
    '/users/:userId/sessions/:sessionId/activities/:activityId/metadata',
  USER_ACTIVITY_JOIN:
    `/users/:userId/sessions/:sessionId/activities/:activityId/${ActivityActionTypes.JOIN}`,
  USER_ACTIVITY_JOIN_REQUEST:
    `/users/:userId/sessions/:sessionId/activities/:activityId/${ActivityActionTypes.JOIN_REQUEST}`,
  USER_ACTIVITY_SPECTATE:
    `/users/:userId/sessions/:sessionId/activities/:activityId/${ActivityActionTypes.SPECTATE}`,
  USER_APPLICATION_ACHIEVEMENT:
    '/users/:userId/applications/:applicationId/achievements/:achievementId',
  USER_AVATAR:
    '/users/:userId/avatars/:hash.jpg',
  USER_CHANNELS:
    '/users/:userId/channels',
  USER_PROFILE:
    '/users/:userId/profile',
  USER_RELATIONSHIPS:
    '/users/:userId/relationships',

  VERIFIED_SERVERS_APPLY:
    '/verified-servers/apply',
  VERIFIED_SERVERS_NEWSLETTER:
    '/verified-servers/newsletter',

  VOICE_DEBUG_FILE:
    '/voice/debug/file',
  VOICE_ICE:
    '/voice/ice',
  VOICE_REGIONS:
    '/voice/regions',

  WEBHOOK:
    '/webhooks/:webhookId',
  WEBHOOK_TOKEN:
    '/webhooks/:webhookId/:webhookToken',
  WEBHOOK_TOKEN_MESSAGE:
    '/webhooks/:webhookId/:webhookToken/messages/:messageId',
  WEBHOOK_TOKEN_GITHUB:
    '/webhooks/:webhookId/:webhookToken/github',
  WEBHOOK_TOKEN_SLACK:
    '/webhooks/:webhookId/:webhookToken/slack',
};
