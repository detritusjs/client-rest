const Constants = require('detritus-utils').Constants;

const ApiVersions = {
	REST: 7
};

module.exports = Object.assign({
	VERSION: '0.1.9',
	ApiVersions,
	AuthTypes: {
		USER:  0,
		BOT:   1,
		OAUTH: 2
	},
	Endpoints: {
		ASSETS: {
			URL:      'https://discordapp.com/assets',
			DM_GROUP: '/f046e2247d730629309457e902d5c5b3.svg',
			XBOX: {
				SVG:      '/5693b73a047e27ac19c1f01611a6a628.svg',
				GREY:     '/4c59c8e37dda86294d3cf237b2695dde.png',
				COLOR_3D: '/d8e257d7526932dcf7f88e8816a49b30.png',
				WHITE:    '/850ed4fcf5839b7a32651f5959e8511e.png',
				COLOR:    '/0d44ba28e39303de3832db580a252456.png'
			},
			ICON: (hash, format='png') => `/${hash}.${format}`
		},

		CDN: {
			URL:                                               'https://cdn.discordapp.com',
			APP_ASSETS: (applicationId, hash, format='png') => `/app-assets/${applicationId}/${hash}.${format}`,
			APP_ICON:   (applicationId, hash, format='png') => `/app-icons/${applicationId}/${hash}.${format}`,
			AVATAR:            (userId, hash, format='png') => `/avatars/${userId}/${hash}.${format}`,
			AVATAR_DEFAULT:           (discriminatorModulo) => `/embed/avatars/${discriminatorModulo}.png`,
			DM_ICON:        (channelId, hash, format='png') => `/channel-icons/${channelId}/${hash}.${format}`,
			GAME_ICON:         (gameId, hash, format='png') => `/game-assets/${gameId}/${hash}.${format}`,
			GUILD_ICON:       (guildId, hash, format='png') => `/icons/${guildId}/${hash}.${format}`,
			GUILD_SPLASH:     (guildId, hash, format='png') => `/splashes/${guildId}/${hash}.${format}`,
			EMOJI:                  (emojiId, format='png') => `/emojis/${emojiId}.${format}`,
			ACTIVITY: {
				SPOTIFY: (hash) => `https://i.scdn.co/image/${hash}`
			}
		},

		INVITE: {
			LONG:  (code) => `https://discordapp.com/invites/${code}`,
			SHORT: (code) => `https://discord.gg/${code}`
		},

		REST: {
			URL: 'https://discordapp.com',
			PATH: `/api/v${ApiVersions.REST}`,

			APPLICATIONS: {
				ALL: '/applications',
				ID:  '/applications/:applicationId:'
			},

			AUTH: {
				AUTHORIZE_IP:     '/auth/authorize-ip',
				CONSENT_REQUIRED: '/auth/consent-required',
				HANDOFF:          '/auth/handoff',
				HANDOFF_EXCHANGE: '/auth/handoff/exchange',
				LOGIN:            '/auth/login',
				PASSWORD_FORGOT:  '/auth/forgot',
				PASSWORD_RESET:   '/auth/reset',
				REGISTER:         '/auth/register',
				VERIFIY:          '/auth/verify',
				VERIFIY_RESEND:   '/auth/verify/resend'
			},

			BILLING: {
				BRAINTREE_POPUP_BRIDGE:                   '/billing/braintree/popup-bridge',
				BRAINTREE_POPUP_BRIDGE_CALLBACK:          '/billing/braintree/popup-bridge/callback',
				BRAINTREE_POPUP_BRIDGE_CALLBACK_REDIRECT: '/billing/braintree/popup-bridge/callback/:redirect:/'
			},

			CHANNELS: {
				ALL:                   '/channels',
				ID:                    '/channels/:channelId:',
				CALL:                  '/channels/:channelId:/call',
				CALL_RING:             '/channels/:channelId:/call/ring',
				CALL_STOP_RINGING:     '/channels/:channelId:/call/stop-ringing',
				CONVERT:               '/channels/:channelId:/convert',
				BULK_DELETE:           '/channels/:channelId:/messages/bulk-delete',
				INVITES:               '/channels/:channelId:/invites',
				MESSAGES:              '/channels/:channelId:/messages',
				MESSAGES_ACK:          '/channels/:channelId:/messages/ack',
				MESSAGE:               '/channels/:channelId:/messages/:messageId:',
				MESSAGE_ACK:           '/channels/:channelId:/messages/:messageId:/ack',
				MESSAGE_REACTIONS:     '/channels/:channelId:/messages/:messageId:/reactions',
				MESSAGE_REACTION:      '/channels/:channelId:/messages/:messageId:/reactions/:emoji:',
				MESSAGE_REACTION_USER: '/channels/:channelId:/messages/:messageId:/reactions/:emoji:/:userId:',
				PERMISSIONS:           '/channels/:channelId:/permissions',
				PERMISSION:            '/channels/:channelId:/permissions/:overwriteId:',
				PINS:                  '/channels/:channelId:/pins',
				PINS_ACK:              '/channels/:channelId:/pins/ack',
				PIN:                   '/channels/:channelId:/pins/:messageId:',
				RECIPIENT:             '/channels/:channelId:/recipients/:userId:',
				SEARCH:                '/channels/:channelId:/messages/search',
				TYPING:                '/channels/:channelId:/typing',
				WEBHOOKS:              '/channels/:channelId:/webhooks'
			},

			CONNECTIONS: {
				AUTHORIZE:                '/connections/:providerId:/authorize',
				AUTHORIZE_CONTINUATION:   '/connections/:providerId:/authorize?continuation=true',
				CALLBACK:                 '/connections/:providerId:/callback',
				CALLBACK_CONTINUATION:    '/connections/:providerId:/callback-continuation',
				CALLBACK_CONTINUATION_ID: '/connections/:providerId:/callback-continuation/:id:' //idk what id is
			},
			
			DOWNLOAD: {
				EMAIL: '/download/email',
				SMS:   '/download/sms'
			},

			GAMES: {
				ALL:   '/games',
				ID:    '/games/:gameId:',
				NEWS:  '/game-news?game_ids=:gameId:'
			},
		
			GUILDS: {
				ALL:              '/guilds',
				ID:               '/guilds/:guildId:',
				ACK:              '/guilds/:guildId:/ack',
				AUDIT_LOGS:       '/guilds/:guildId:/audit-logs',
				BANS:             '/guilds/:guildId:/bans',
				BAN:              '/guilds/:guildId:/bans/:userId:',
				CHANNELS:         '/guilds/:guildId:/channels',
				EMBED:            '/guilds/:guildId:/embed',
				EMOJIS:           '/guilds/:guildId:/emojis',
				EMOJI:            '/guilds/:guildId:/emojis/:emojiId:',
				INTEGRATIONS:     '/guilds/:guildId:/integrations',
				INTEGRATION:      '/guilds/:guildId:/integrations/:integrationId:',
				INTEGRATION_SYNC: '/guilds/:guildId:/integrations/:integrationId:/sync',
				INVITES:          '/guilds/:guildId:/invites',
				MFA:              '/guilds/:guildId:/mfa',
				MEMBERS:          '/guilds/:guildId:/members',
				MEMBER:           '/guilds/:guildId:/members/:userId:',
				MEMBER_NICK:      '/guilds/:guildId:/members/@me/nick',
				MEMBER_ROLE:      '/guilds/:guildId:/members/:userId:/roles/:roleId:',
				PRUNE:            '/guilds/:guildId:/prune',
				REGIONS:          '/guilds/:guildId:/regions',
				ROLES:            '/guilds/:guildId:/roles',
				ROLE:             '/guilds/:guildId:/roles/:roleId:',
				SEARCH:           '/guilds/:guildId:/messages/search',
				VANITY_URL:       '/guilds/:guildId:/vanity-url',
				WEBHOOKS:         '/guilds/:guildId:/webhooks'
			},

			INTEGRATIONS: {
				ALL:  '/integrations',
				ID:   '/integrations/:integrationId:',
				JOIN: '/integrations/:integrationId:/join'
			},

			LOBBIES: {
				ALL:    '/lobbies',
				ID:     '/lobbies/:lobbyId:',
				MEMBER: '/lobbies/:lobbyId:/members/:userId:',
				SEARCH: '/lobbies/:lobbyId:/search',
				SEND:   '/lobbies/:lobbyId:/send'
			},
			
			OAUTH2: {
				APPLICATIONS: {
					ALL:                                          '/oauth2/applications',
					ID:                                           '/oauth2/applications/:applicationId:',
					ASSETS:                                       '/oauth2/applications/:applicationId:/assets',
					ASSET:                                        '/oauth2/applications/:applicationId:/assets/:assetId:',
					ASSETS_ENABLE:                                '/oauth2/applications/:applicationId:/assets/enable',
					BOT:                                          '/oauth2/applications/:applicationId:/bot',
					BOT_RESET:                                    '/oauth2/applications/:applicationId:/bot/reset',
					RESET:                                        '/oauth2/applications/:applicationId:/reset',
					RICH_PRESENCE_APPROVAL_FORM:                  '/oauth2/applications/:applicationId:/rich-presence/approval-form',
					RICH_PRESENCE_APPROVAL_FORM_SCREENSHOTS:      '/oauth2/applications/:applicationId:/rich-presence/approval-form/screenshots',
					RICH_PRESENCE_APPROVAL_FORM_SCREENSHOT:       '/oauth2/applications/:applicationId:/rich-presence/approval-form/screenshots/:screenshotId:',
					RICH_PRESENCE_APPROVAL_FORM_SCREENSHOT_IMAGE: '/oauth2/applications/:applicationId:/rich-presence/approval-form/screenshots/:screenshotId:.jpg',
					RPC:                                          '/oauth2/applications/:applicationId:/rpc',
					RPC_APPLY:                                    '/oauth2/applications/:applicationId:/rpc/apply',
					RPC_ENABLE:                                   '/oauth2/applications/:applicationId:/rpc/enable',
					WHITELIST:                                    '/oauth2/applications/:applicationId:/whitelist'
				},
				AUTHORIZE:                  '/oauth2/authorize',
				AUTHORIZE_WEBHOOK_CHANNELS: '/oauth2/authorize/webhook-channels',
				ME:                         '/oauth2/@me',
				TOKENS:                     '/oauth2/tokens',
				TOKEN:                      '/oauth2/tokens/:tokenId:',
				TOKEN_RPC:                  '/oauth2/token/rpc',
				WHITELIST_ACCEPT:           '/oauth2/whitelist/accept'
			},

			PARTNERS: {
				APPLY:       '/partners/apply',
				CONNECTIONS: '/partners/connections'
			},

			UNVERIFIED_APPLICATIONS: {
				ALL:   '/unverified-applications',
				ICONS: '/unverified-applications/icons'
			},

			UNVERIFIED_GAMES: {
				ALL:   '/unverified-games',
				ICONS: '/unverified-games/icons'
			},
		
			USERS: {
				ID:                            '/users/:userId:',
				AGREEMENTS:                    '/users/@me/agreements',
				ACTIVITY_JOIN:                 `/users/:userId:/sessions/:sessionId:/activity/${Constants.Discord.ActivityActionTypes.JOIN}`,
				ACTIVITY_JOIN_INVITE:          `/users/:userId:/sessions/:sessionId:/activity/${Constants.Discord.ActivityActionTypes.JOIN_REQUEST}/:invite:`, //is it invite? invite code? idk
				ACTIVITY_JOIN_REQUEST:         `/users/:userId:/sessions/:sessionId:/activity/${Constants.Discord.ActivityActionTypes.JOIN_REQUEST}`,
				ACTIVITY_METADATA:             '/users/:userId:/sessions/:sessionId:/activity/metadata',
				ACTIVITY_SPECTATE:             `/users/:userId:/sessions/:sessionId:/activity/${Constants.Discord.ActivityActionTypes.SPECTATE}`,
				ACTIVITY_STATISTICS:           `/users/@me/activities/statistics/applications`,
				BILLING:                       '/users/@me/billing',
				BILLING_PAYMENTS:              '/users/@me/billing/payments',
				BILLING_PAYMENT_SOURCE:        '/users/@me/billing/payment-source',
				BILLING_PREMIUM_SUBSCRIPTION:  '/users/@me/billing/premium-subscription',
				CAPTCHA:                       '/users/@me/captcha/verify',
				CHANNELS:                      '/users/:userId:/channels',
				CONNECTIONS:                   '/users/@me/connections',
				CONNECTION:                    '/users/@me/connections/:providerId:/:connectionId:',
				CONNECTION_ACCESS_TOKEN:       '/users/@me/connections/:providerId:/:connectionId:/access-token',
				CONNECTION_REDDIT_SUBREDDITS:  '/users/@me/connections/reddit/:connectionId:/subreddits',
				DISABLE_EMAIL_NOTIFICATIONS:   '/users/disable-email-notifications',
				DELETE_ACCOUNT:                '/users/@me/delete',
				DEVICES:                       '/users/@me/devices',
				FEED_SETTINGS:                 '/users/@me/feed/settings',
				GAMES_FOLLOWING:               '/users/@me/following',
				GAMES_NOTIFICATIONS:           '/users/@me/settings/games-notifications',
				GAMES_NOTIFICATIONS_OVERRIDES: '/users/@me/settings/games-notifications/overrides',
				GUILDS:                        '/users/@me/guilds',
				GUILD:                         '/users/@me/guilds/:guildId:',
				GUILD_SETTINGS:                '/users/@me/guilds/:guildId:/settings',
				HARVEST:                       '/users/@me/harvest',
				LIBRARY:                       '/users/@me/library',
				LIBRARY_BRANCH:                '/users/@me/library/:branch:/:branch:',
				LIBRARY_IMPORT:                '/users/@me/library/import',
				LIBRARY_DELETE:                '/users/@me/library/:branch:',
				MFA_CODES:                     '/users/@me/mfa/codes',
				MFA_SMS_ENABLE:                '/users/@me/mfa/sms/enable',
				MFA_SMS_DISABLE:               '/users/@me/mfa/sms/disable',
				MFA_TOTP_ENABLE:               '/users/@me/mfa/totp/enable',
				MFA_TOTP_DISABLE:              '/users/@me/mfa/totp/disable',
				MENTIONS:                      '/users/@me/mentions',
				MENTION:                       '/users/@me/mentions/:messageId:',
				NOTE:                          '/users/@me/notes/:userId:',
				PHONE:                         '/users/@me/phone',
				PHONE_VERIFY:                  '/users/@me/phone/verify',
				PROFILE:                       '/users/:userId:/profile',
				RELATIONSHIPS:                 '/users/:userId:/relationships',
				RELATIONSHIP:                  '/users/@me/relationships/:userId:',
				SETTINGS:                      '/users/@me/settings'
			},
			
			VERIFIED_SERVERS: {
				APPLY:      '/verified-servers/apply',
				NEWSLETTER: '/verified-servers/newsletter'
			},
		
			WEBHOOKS: {
				ID:           '/webhooks/:webhookId:',
				TOKEN:        '/webhooks/:webhookId:/:token:',
				TOKEN_GITHUB: '/webhooks/:webhookId:/:token:/github',
				TOKEN_SLACK:  '/webhooks/:webhookId:/:token:/slack'
			},

			ACTIVITIES:         '/activities',
			EXPERIMENTS:        '/experiments',
			FRIEND_SUGGESTIONS: '/friend-suggestions',
			GAMEBRIDGE_APPLY:   '/gamebridge/apply',
			GATEWAY:            '/gateway',
			GATEWAY_BOT:        '/gateway/bot',
			HYPESQUAD_APPLY:    '/hypesquad/apply',
			INVITE:             '/invites/:code:',
			JOB_APPLICATIONS:   '/jobs/applications',
			REPORT:             '/report',
			RTC_QUALITY_REPORT: '/rtc/quality-report',
			SSO:                '/sso',
			TRACK:              '/science',
			TUTORIAL:           '/tutorial',
			VOICE_ICE:          '/voice/ice',
			VOICE_REGIONS:      '/voice/regions'
		}
	}
}, Constants);