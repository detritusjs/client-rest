'use strict';

const Utils = require('./utils');
const RestEndpoints = Utils.Constants.Endpoints.REST;

class Endpoints
{
	constructor(rest)
	{
		this.rest = rest;
	}

	addMember(guildId, userId)
	{

	}

	addMemberRole(guildId, userId, roleId)
	{

	}

	addPinnedMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			this.rest.request({
				route: {
					method: 'put',
					path: RestEndpoints.CHANNELS.MESSAGE_PIN,
					params: {channelId, messageId}
				}
			}).then(resolve).catch(reject);
		});
	}

	addRecipient(channelId, userId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(userId) === 'object') {userId = userId.id;}

			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!userId) {return reject(new Error('UserId is required!'));}

			body = this.createBody(body, {
				'access_token': {type: 'string'},
				'nick': {type: 'string'}
			});

			if (!Object.keys(body).length) {body = undefined;}

			this.rest.request({
				route: {
					method: 'put',
					path: RestEndpoints.CHANNELS.RECIPIENT,
					params: {channelId, userId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	beginPrune(guildId, body)
	{
		body = body || {};
	}

	bulkDeleteMessages(channelId, messageIds)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageIds) {return reject(new Error('MessageIds are required!'));}
			if (typeof(messageIds) === 'string') {messageIds = [messageIds];}

			if (messageIds.length < 2 || 100 < messageIds.length) {
				return reject(new Error('Can only send in between 2 and 100 message ids at a time!'));
			}

			//add a timestamp check

			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.CHANNELS.BULK_DELETE,
					params: {channelId}
				},
				body: messageIds
			}).then(resolve).catch(reject);
		});
	}

	createBan(guildId, userId, body)
	{
		body = body || {};
	}

	createChannel(guildId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (!guildId) {return reject(new Error('GuildID is required!'));}
			
			if (typeof(body) === 'string') {
				body = {name: body};
			}

			body = this.createBody(body, {
				name: {type: 'string'},
				type: {type: 'integer'},
				topic: {type: 'string'},
				bitrate: {type: 'integer'},
				user_limit: {type: 'integer'},
				permission_overwrites: {type: 'array'},
				parent_id: {type: 'snowflake'},
				nsfw: {type: 'bool'}
			});

			if (!body.name) {return reject(new Error('Name cannot be empty!'));}

			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.GUILDS.CHANNELS,
					params: {guildId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	createDm(recipientId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(recipientId) === 'object') {recipientId = recipientId.id;}
			if (!recipientId) {return reject(new Error('RecipientId is required!'));}

			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.USERS.CHANNELS,
					params: {userId: '@me'}
				},
				body: {recipient_id: recipientId}
			}).then(resolve).catch(reject);
		});
	}

	createEmoji(guildId, body)
	{
		body = body || {};
	}

	createGuild(body)
	{
		body = body || {};
	}

	createGuildIntegration(guildId, body)
	{
		body = body || {};
	}

	createInvite(channelId, body)
	{
		body = body || {};
	}

	createMessage(channelId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}

			if (typeof(body) === 'string' || typeof(body) === 'number') {
				body = {content: body};
			}

			if (body.file) {
				body.files = body.files || [];
				body.files.push(body.file);
			}

			body = this.createBody(body, {
				content: {type: 'string'},
				tts: {type: 'bool'},
				embed: {type: 'object'},
				files: {type: 'array'},
				nonce: {}
			});

			const files = [];
			if (body.files && body.files.length) {
				body.files.forEach((file) => files.push(file));
				delete body.files;
			}

			if (!body.content && !body.embed && !files.length) {
				return reject(new Error('Cannot send an empty message.'));
			}

			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.CHANNELS.MESSAGES,
					params: {channelId}
				},
				body,
				files
			}).then(resolve).catch(reject);
		});
	}

	createReaction(channelId, messageId, emoji)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (typeof(emoji) === 'object') {emoji = emoji.endpointFormat;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}
			if (!emoji) {return reject(new Error('Emoji is required!'));}

			this.rest.request({
				route: {
					method: 'put',
					path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER,
					params: {channelId, messageId, emoji, userId: '@me'}
				}
			}).then(resolve).catch(reject);
		});
	}

	createRole(guildId, body)
	{
		body = body || {};
	}

	createWebhook(channelId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			
			if (typeof(body) === 'string') {
				body = {name: body};
			}

			body = this.createBody(body, {
				name: {type: 'string'},
				avatar: {type: 'string'}
			});
			
			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.CHANNELS.WEBHOOKS,
					params: {channelId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	deleteChannel(channelId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.ID,
					params: {channelId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteChannelOverwrite(channelId, overwriteId)
	{

	}

	deleteEmoji(guildId, emojiId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (typeof(emojiId) === 'object') {emojiId = emojiId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}
			if (!emojiId) {return reject(new Error('EmojiId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.GUILDS.EMOJI,
					params: {guildId, emojiId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteGuild(guildId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.GUILDS.ID,
					params: {guildId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteGuildIntegration(guildId, integrationId)
	{

	}

	deleteInvite(code)
	{
		return new Promise((resolve, reject) => {
			if (typeof(code) === 'object') {code = code.code;}
			if (!code) {return reject(new Error('Code is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.INVITE,
					params: {code}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.MESSAGE,
					params: {channelId, messageId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deletePinnedMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.MESSAGE_PIN,
					params: {channelId, messageId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteReaction(channelId, messageId, emoji, userId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (typeof(emoji) === 'object') {emoji = emoji.endpointFormat;}
			if (typeof(userId) === 'object') {userId = userId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}
			if (!emoji) {return reject(new Error('Emoji is required!'));}
			if (!userId) {return reject(new Error('UserId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER,
					params: {channelId, messageId, emoji, userId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteReactions(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.MESSAGE_REACTIONS,
					params: {channelId, messageId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteRole(guildId, roleId)
	{

	}

	deleteWebhook(webhookId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.WEBHOOKS.ID,
					params: {webhookId}
				}
			}).then(resolve).catch(reject);
		});
	}

	deleteWebhookToken(webhookId, token)
	{
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}
			if (!token) {return reject(new Error('Webhook Token is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.WEBHOOKS.TOKEN,
					params: {webhookId, token}
				},
				useAuth: false
			}).then(resolve).catch(reject);
		});
	}

	editChannel(channelId, body)
	{
		body = body || {};
	}

	editChannelPositions(guildId, body)
	{
		body = body || {};
	}

	editChannelPermissions(channelId, overwriteId, body)
	{
		body = body || {};
	}

	editEmoji(guildId, emojiId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (typeof(emojiId) === 'object') {emojiId = emojiId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}
			if (!emojiId) {return reject(new Error('EmojiId is required!'));}

			if (typeof(body) === 'string') {body = {name: body};}

			body = this.createBody(body, {
				roles: {type: 'array'},
				name: {type: 'string'}
			});
			
			if (!Object.keys(body).length || (!(body.roles && body.roles.length) && !body.name)) {
				return reject(new Error('Emoji Roles and Name cannot be empty!'));
			}

			if (body.roles) {
				body.roles = body.roles.map((role) => {
					return (typeof(role) === 'object') ? role.id : role;
				});
			}

			this.rest.request({
				route: {
					method: 'patch',
					path: RestEndpoints.GUILDS.EMOJI,
					params: {guildId, emojiId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	editGuild(guildId)
	{

	}

	editGuildEmbed(guildId, body)
	{
		body = body || {};
	}

	editGuildIntegration(guildId, integrationId, body)
	{
		body = body || {};
	}

	editGuildVanityUrl(guildId, body)
	{
		body = body || {};
	}

	editMember(guildId, userId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (typeof(userId) === 'object') {userId = userId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}
			if (!userId) {return reject(new Error('UserId is required!'));}

			body = this.createBody(body, {
				mute: {type: 'bool'},
				deafen: {type: 'bool'},
				channel_id: {type: 'string'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {
					method: 'patch',
					path: RestEndpoints.GUILDS.MEMBER,
					params: {guildId, memberId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	editMessage(channelId, messageId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			if (typeof(body) === 'string') {body = {content: body};}

			body = this.createBody({
				content: {type: 'string'},
				embed: {type: 'object'}
			}, body);

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {
					method: 'patch',
					path: RestEndpoints.CHANNELS.MESSAGE,
					params: {channelId, messageId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	editNick(guildId, body)
	{
		body = body || {};
	}

	editRole(guildId, roleId, body)
	{
		body = body || {};
	}

	editRolePositions(guildId, body)
	{
		body = body || {};
	}

	editUser(userId, body)
	{
		body = body || {};
	}

	editWebhook(webhookId, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}

			body = this.createBody(body, {
				name: {type: 'string'},
				avatar: {type: 'string'},
				channel_id: {type: 'snowflake'}
			});
			
			this.rest.request({
				route: {
					method: 'patch',
					path: RestEndpoints.WEBHOOKS.ID,
					params: {webhookId}
				},
				body
			}).then(resolve).catch(reject);
		});
	}

	editWebhookToken(webhookId, token, body)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}
			if (!token) {return reject(new Error('Webhook Token is required!'));}

			body = this.createBody(body, {
				name: {type: 'string'},
				avatar: {type: 'string'}
			});
			
			this.rest.request({
				route: {
					method: 'patch',
					path: RestEndpoints.WEBHOOKS.TOKEN,
					params: {webhookId, token}
				},
				body,
				useAuth: false
			}).then(resolve).catch(reject);
		});
	}

	executeWebhook(webhookId, token, body, compatible)
	{
		body = body || {};
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}
			if (!token) {return reject(new Error('Webhook Token is required!'));}

			const route = {
				method: 'post',
				path: RestEndpoints.WEBHOOKS.TOKEN,
				params: {webhookId, token}
			};

			if (compatible) {
				switch (compatible) {
					case 'github': route.path = RestEndpoints.WEBHOOKS.TOKEN_GITHUB; break;
					case 'slack': route.path = RestEndpoints.WEBHOOKS.TOKEN_SLACK; break;
					default: return reject(new Error('Invalid Webhook Compatibility'));
				}
			}

			if (typeof(body) === 'string') {
				body = {content: body};
			}

			if (body.file) {
				body.files = body.files || [];
				body.files.push(body.file);
			}
			
			if (body.embed) {
				body.embeds = body.embeds || [];
				body.embeds.push(body.embed);
			}
			
			const query = {};
			if (body.wait) {
				query.wait = !!body.wait;
			}

			body = this.createBody(body, {
				avatar_url: {type: 'string'},
				username: {type: 'string'},
				content: {type: 'string'},
				tts: {type: 'bool'},
				embeds: {type: 'array'},
				files: {type: 'array'}
			});

			const files = [];
			if (body.files && body.files.length) {
				body.files.forEach((file) => files.push(file));
				delete body.files;
			}

			if (!body.content && !body.embeds && !files.length) {
				return reject(new Error('Cannot send an empty message.'));
			}

			this.rest.request({
				route,
				query,
				body,
				files,
				useAuth: false
			}).then(resolve).catch(reject);
		});
	}

	fetchBans(guildId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}

			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.GUILDS.BANS,
					params: {guildId}
				}
			}).then(resolve).catch(reject);
		});
	}

	fetchChannelInvites(channelId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}

			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.CHANNELS.INVITES,
					params: {channelId}
				}
			}).then(resolve).catch(reject);
		});
	}

	fetchChannelWebhooks(channelId)
	{

	}

	fetchConnections()
	{
		'@me';
	}

	fetchDMs()
	{
		return this.rest.request({
			route: {
				method: 'get',
				path: Endpoints.USERS.CHANNELS,
				params: {userId: '@me'}
			}
		});
	}

	fetchEmoji(guildId, emojiId)
	{

	}

	fetchEmojis(guildId)
	{

	}

	fetchGateway()
	{
		return this.rest.request({
			route: {method: 'get', path: RestEndpoints.GATEWAY}
		});
	}

	fetchGuilds(userId)
	{

	}

	fetchGuild(guildId)
	{

	}

	fetchGuildAuditLogs(guild, query)
	{
		query = query || {};
	}

	fetchGuildEmbed(guildId)
	{

	}

	fetchGuildIntegrations(guildId)
	{

	}

	fetchGuildInvites(guildId)
	{

	}

	fetchGuildVanityUrl(guildId)
	{

	}

	fetchGuildWebhooks(guildId)
	{

	}

	fetchInvite(code, query)
	{
		query = query || {};
		return new Promise((resolve, reject) => {
			if (typeof(code) === 'object') {code = code.code;}
			if (!code) {return reject(new Error('Code is required!'));}

			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.INVITE,
					params: {code}
				},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchMember(guild, user)
	{

	}

	fetchMembers(guildId)
	{

	}

	fetchPinnedMessages(channelId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}

			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.CHANNELS.PINS,
					params: {channelId}
				}
			}).then(resolve).catch(reject);
		});
	}

	fetchPruneCount(guildId)
	{

	}

	fetchReactions(channelId, messageId, emoji)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(messageId) === 'object') {messageId = messageId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!messageId) {return reject(new Error('MessageId is required!'));}

			const route = {
				method: 'get',
				path: null,
				params: {channelId, messageId}
			};
			if (emoji) {
				if (typeof(emoji) === 'object') {emoji = emoji.endpointFormat;}
				route.path = RestEndpoints.CHANNELS.MESSAGE_REACTION;
				route.params.emoji = emoji;
				this.rest.request({route}).then(resolve).catch(reject);
			} else {
				route.path = RestEndpoints.CHANNELS.MESSAGE_REACTIONS;
				this.rest.request({route}).then(resolve).catch(reject);
			}
		});
		//if no emoji, just /reactions
	}

	fetchRoles(guildId)
	{

	}

	fetchUser(userId)
	{
		//work
		return new Promise((resolve, reject) => {
			if (typeof(userId) === 'object') {userId = userId.id;}
			if (!userId) {return reject(new Error('UserId is required!'));}

			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.USERS.ID,
					params: {userId}
				}
			}).then(resolve).catch(reject);
		});
	}

	fetchWebhook(webhookId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}
			
			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.WEBHOOKS.ID,
					params: {webhookId}
				}
			}).then(resolve).catch(reject);
		});
	}

	fetchWebhookToken(webhookId, token)
	{
		return new Promise((resolve, reject) => {
			if (typeof(webhookId) === 'object') {webhookId = webhookId.id;}
			if (!webhookId) {return reject(new Error('WebhookId is required!'));}
			if (!token) {return reject(new Error('Webhook Token is required!'));}
			
			this.rest.request({
				route: {
					method: 'get',
					path: RestEndpoints.WEBHOOKS.TOKEN,
					params: {webhookId, token}
				},
				useAuth: false
			}).then(resolve).catch(reject);
		});
	}

	fetchVoiceRegions(guildId)
	{
		return new Promise((resolve, reject) => {
			const route = {
				method: 'get',
				path: RestEndpoints.VOICE_REGIONS
			};
			if (guildId) {
				route.path = RestEndpoints.GUILDS.REGIONS;
				if (typeof(guildId) === 'object') {
					guildId = guildId.id;
				}
				route.params = {guildId};
			}

			this.rest.request({route}).then(resolve).catch(reject);
		});
	}

	leaveGuild(guildId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(guildId) === 'object') {guildId = guildId.id;}
			if (!guildId) {return reject(new Error('GuildId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.USERS.GUILD,
					params: {guildId}
				}
			}).then(resolve).catch(reject);
		});
	}

	removeBan(guildId, userId)
	{

	}

	removeMember(guildId, userId)
	{

	}

	removeMemberRole(guildId, userId, roleId)
	{

	}

	removeRecipient(channelId, userId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (typeof(userId) === 'object') {userId = userId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}
			if (!userId) {return reject(new Error('UserId is required!'));}

			this.rest.request({
				route: {
					method: 'delete',
					path: RestEndpoints.CHANNELS.RECIPIENT,
					params: {channelId, userId}
				}
			}).then(resolve).catch(reject);
		});
		//work
	}

	syncIntegration(guildId, integrationId)
	{

	}

	triggerTyping(channelId)
	{
		return new Promise((resolve, reject) => {
			if (typeof(channelId) === 'object') {channelId = channelId.id;}
			if (!channelId) {return reject(new Error('ChannelId is required!'));}

			this.rest.request({
				route: {
					method: 'post',
					path: RestEndpoints.CHANNELS.TYPING,
					params: {channelId}
				}
			}).then(resolve).catch(reject);
		});
	}

	createBody(data, defaults)
	{
		const body = {};
		for (let key in defaults) {
			if (!(key in data)) {
				if (defaults[key].notOptional) {
					throw new Error(`${key} is not optional.`);
				} else {
					continue;
				}
			}
			switch (defaults[key].type) {
				case 'bool': data[key] = Boolean(data[key]); break;
				case 'string': data[key] = String(data[key]); break;
				case 'integer':
					data[key] = parseInt(data[key]);
					if (data[key] === NaN) {
						throw new Error(`${key} has to be an integer.`);
					}
					break;
				case 'array':
					if (!Array.isArray(data[key])) {
						throw new Error(`${key} has to be an array!`);
					}
					break;
				case 'snowflake':
					if (!(/\d+/).exec(data[key])) {
						throw new Error(`${key} has to be a snowflake!`);
					}
					break;
				case 'object':
					if (typeof(data[key]) !== 'object') {
						throw new Error(`${key} has to be an object!`);
					}
					break;
			}
			body[key] = data[key];
		}
		return body;
	}
}

module.exports = Endpoints;