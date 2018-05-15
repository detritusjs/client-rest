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
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.GUILDS.MEMBER, params}
			}).then(resolve).catch(reject);
		});
	}

	addMemberRole(guildId, userId, roleId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.GUILDS.MEMBER_ROLE, params}
			}).then(resolve).catch(reject);
		});
	}

	addPinnedMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.CHANNELS.MESSAGE_PIN, params}
			}).then(resolve).catch(reject);
		});
	}

	addRecipient(channelId, userId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, userId}, {
				channelId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				access_token: {type: 'string'},
				nick: {type: 'string'}
			});

			if (!Object.keys(body).length) {body = undefined;}

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.CHANNELS.RECIPIENT, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	beginPrune(guildId, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = this.createBody(query, {'days': {type: 'integer'}});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.PRUNE, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	bulkDeleteMessages(channelId, messageIds)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageIds}, {
				channelId: {type: 'snowflake', required: true},
				messageIds: {type: 'array', required: true}
			});

			if (messageIds.length < 2 || 100 < messageIds.length) {
				return reject(new Error('Message Ids amount need to be a length between 2 and 100!'));
			}

			//add a timestamp check for the messageids

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.CHANNELS.BULK_DELETE, params},
				body: messageIds
			}).then(resolve).catch(reject);
		});
	}

	createBan(guildId, userId, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			query = this.createBody(query, {
				'delete-message-days': {type: 'integer'},
				reason: {type: 'string'}
			});

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.GUILDS.BAN, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	createChannel(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				name: {type: 'string', required: true},
				type: {type: 'integer'},
				topic: {type: 'string'},
				bitrate: {type: 'integer'},
				user_limit: {type: 'integer'},
				permission_overwrites: {type: 'array'},
				parent_id: {type: 'snowflake'},
				nsfw: {type: 'bool'}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.CHANNELS, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	createDm(recipient_id)
	{
		return new Promise((resolve, reject) => {
			this.rest.request({
				route: {method: 'post', path: RestEndpoints.USERS.CHANNELS, params: {userId: '@me'}},
				body: this.createBody({recipient_id}, {recipient_id: {type: 'snowflake', required: true}})
			}).then(resolve).catch(reject);
		});
	}

	createEmoji(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				name: {type: 'string', required: true},
				image: {type: 'string', required: true}, //256kb add check, base64 required, if buffer then make b64?
				roles: {type: 'array'}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.EMOJIS, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	createGuild(body)
	{
		return new Promise((resolve, reject) => {
			body = this.createBody(body, {
				name: {type: 'string', required: true},
				region: {type: 'string', required: true}, //maybe not optional?
				icon: {type: 'string'}, //base64, 256kb im assuming, 128x128 jpeg image
				verification_level: {type: 'integer'},
				default_message_notifications: {type: 'integer'},
				explicit_content_filter: {type: 'integer'},
				roles: {type: 'array'},
				channels: {type: 'array'}
			});
			//verify channels?

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.ALL},
				body
			}).then(resolve).catch(reject);
		});
	}

	createGuildIntegration(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				id: {type: 'string', required: true},
				type: {type: 'string', required: true}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.INTEGRATIONS, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	createInvite(channelId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				max_age: {type: 'integer'},
				max_uses: {type: 'integer'},
				temporary: {type: 'bool'},
				unique: {type: 'bool'}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.CHANNELS.INVITES, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	createMessage(channelId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			if (body && body.file) {
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
				route: {method: 'post', path: RestEndpoints.CHANNELS.MESSAGES, params},
				body,
				files
			}).then(resolve).catch(reject);
		});
	}

	createReaction(channelId, messageId, emoji)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId, emoji}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true}
			});
			
			params.userId = '@me';

			this.rest.request({
				route: {method: 'put', path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER, params}
			}).then(resolve).catch(reject);
		});
	}

	createRole(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				name: {type: 'string'},
				permissions: {type: 'integer'},
				color: {type: 'integer'},
				hoist: {type: 'bool'},
				mentionable: {type: 'bool'}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.ROLES, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	createWebhook(channelId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				name: {type: 'string', required: true},
				avatar: {type: 'string'}
			});
			
			this.rest.request({
				route: {method: 'post', path: RestEndpoints.CHANNELS.WEBHOOKS, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	deleteChannel(channelId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteChannelOverwrite(channelId, overwriteId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, overwriteId}, {
				channelId: {type: 'snowflake', required: true},
				overwriteId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.PERMISSION, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteEmoji(guildId, emojiId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.EMOJI, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteGuild(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteGuildIntegration(guildId, integrationId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.INTEGRATION, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteInvite(code)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({code}, {code: {type: 'string', required: true}});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.INVITE, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE, params}
			}).then(resolve).catch(reject);
		});
	}

	deletePinnedMessage(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_PIN, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteReaction(channelId, messageId, emoji, userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId, emoji, userId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteReactions(channelId, messageId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_REACTIONS, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteRole(guildId, roleId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.ROLE, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteWebhook(webhookId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId}, {webhookId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.WEBHOOKS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	deleteWebhookToken(webhookId, token)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.WEBHOOKS.TOKEN, params},
				useAuth: false
			}).then(resolve).catch(reject);
		});
	}

	editChannel(channelId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				bitrate: {type: 'integer'},
				name: {type: 'string'},
				nsfw: {type: 'bool'},
				parent_id: {type: 'snowflake'},
				permission_overwrites: {type: 'array'},
				position: {type: 'integer'},
				topic: {type: 'string'},
				user_limit: {type: 'integer'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty.'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.CHANNELS.ID, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editChannelPositions(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			if (typeof(body) !== 'object' || !Array.isArray(body)) {
				return reject(new Error('Body has to be an array!'));
			}
			
			body = body.map((channel) => this.createBody(channel, {id: {type: 'snowflake', required: true}, position: {type: 'integer', required: true}}));
			
			if (!body.length) {
				return reject(new Error('Body cannot be empty.'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.CHANNELS, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editChannelPermissions(channelId, overwriteId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, overwriteId}, {
				channelId: {type: 'snowflake', required: true},
				overwriteId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				allow: {type: 'integer'},
				deny: {type: 'integer'},
				type: {type: 'string'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty.'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.CHANNELS.PERMISSION, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editEmoji(guildId, emojiId, body)
	{

		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				name: {type: 'string'},
				roles: {type: 'array'}
			});
			
			if (!Object.keys(body).length || (!(body.roles && body.roles.length) && !body.name)) {
				return reject(new Error('Emoji Roles and Name cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.EMOJI, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editGuild(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				afk_channel_id: {type: 'snowflake'},
				afk_timeout: {type: 'snowflake'},
				default_message_notifications: {type: 'integer'},
				explicit_content_filter: {type: 'integer'},
				icon: {type: 'string'}, //128x128 jpeg image base64
				name: {type: 'string'},
				owner_id: {type: 'snowflake'},
				region: {type: 'string'},
				splash: {type: 'string'}, //128x128 jpeg image base64, vip only,
				system_channel_id: {type: 'snowflake'},
				verification_level: {type: 'integer'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.ID, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editGuildEmbed(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				channel_id: {type: 'snowflake'},
				enabled: {type: 'bool'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.EMBED, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editGuildIntegration(guildId, integrationId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				expire_behavior: {type: 'integer'},
				expire_emoticons: {type: 'bool'},
				expire_grace_period: {type: 'integer'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.INTEGRATION, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editGuildVanityUrl(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {code: {type: 'string'}});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.VANITY_URL, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editMember(guildId, userId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				channel_id: {type: 'snowflake'},
				deaf: {type: 'bool'},
				mute: {type: 'bool'},
				nick: {type: 'string'},
				roles: {type: 'array'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.MEMBER, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editMessage(channelId, messageId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				content: {type: 'string'},
				embed: {type: 'object'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.CHANNELS.MESSAGE, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editNick(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {nick: {type: 'string', required: true}});

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.MEMBER_NICK, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editRole(guildId, roleId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			body = this.createBody(body, {
				color: {type: 'integer'},
				hoist: {type: 'bool'},
				mentionable: {type: 'bool'},
				name: {type: 'string'},
				permissions: {type: 'integer'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.ROLE, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editRolePositions(guildId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			if (typeof(body) !== 'object' || !Array.isArray(body)) {
				return reject(new Error('Body has to be an array!'));
			}
			
			body = body.map((role) => this.createBody(role, {id: {type: 'snowflake', required: true}, position: {type: 'integer', required: true}}));
			
			if (!body.length) {
				return reject(new Error('Body cannot be empty.'));
			}

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.GUILDS.ROLES, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editUser(body)
	{
		return new Promise((resolve, reject) => {
			body = this.createBody(body, {
				avatar: {type: 'string'}, //base64
				discriminator: {type: 'string'},
				email: {type: 'string'},
				new_password: {type: 'string'},
				password: {type: 'string'},
				username: {type: 'string'}
			});

			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.USERS.ID, params: {userId: '@me'}},
				body
			}).then(resolve).catch(reject);
		});
	}

	editWebhook(webhookId, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId}, {webhookId: {type: 'snowflake', required: true}});

			body = this.createBody(body, {
				avatar: {type: 'string'},
				channel_id: {type: 'snowflake'},
				name: {type: 'string'}
			});
			
			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.WEBHOOKS.ID, params},
				body
			}).then(resolve).catch(reject);
		});
	}

	editWebhookToken(webhookId, token, body)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			body = this.createBody(body, {
				name: {type: 'string'},
				avatar: {type: 'string'}
			});
			
			this.rest.request({
				route: {method: 'patch', path: RestEndpoints.WEBHOOKS.TOKEN, params},
				useAuth: false,
				body
			}).then(resolve).catch(reject);
		});
	}

	executeWebhook(webhookId, token, body, compatible)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			const route = {
				method: 'post',
				path: RestEndpoints.WEBHOOKS.TOKEN,
				params
			};

			if (compatible) {
				switch (compatible) {
					case 'github': route.path = RestEndpoints.WEBHOOKS.TOKEN_GITHUB; break;
					case 'slack': route.path = RestEndpoints.WEBHOOKS.TOKEN_SLACK; break;
					default: return reject(new Error('Invalid Webhook Compatibility'));
				}
			}

			body = body || {};

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

			this.rest.request({route, query, body, files, useAuth: false}).then(resolve).catch(reject);
		});
	}

	fetchBans(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.BANS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchChannelInvites(channelId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.CHANNELS.INVITES, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchChannelWebhooks(channelId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.CHANNELS.WEBHOOKS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchConnections()
	{
		return this.rest.request({route: {method: 'get', path: RestEndpoints.USERS.CONNECTIONS}});
	}

	fetchConnectionAuthorize(providerId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({providerId}, {providerId: {type: 'string', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.CONNECTIONS.AUTHORIZE, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchDMs()
	{
		return this.rest.request({route: {method: 'get', path: Endpoints.USERS.CHANNELS, params: {userId: '@me'}}});
	}

	fetchEmoji(guildId, emojiId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.EMOJI, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchEmojis(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.EMOJIS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGateway()
	{
		return this.rest.request({route: {method: 'get', path: RestEndpoints.GATEWAY}});
	}

	fetchGuilds()
	{
		return this.rest.request({route: {method: 'get', path: RestEndpoints.USERS.GUILDS}});
	}

	fetchGuild(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildAuditLogs(guildId, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = this.createBody(query, {
				action_type: {type: 'integer'},
				before: {type: 'snowflake'},
				limit: {type: 'integer'},
				user_id: {type: 'snowflake'}
			});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.AUDIT_LOGS, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildEmbed(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.EMBED, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildIntegrations(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.INTEGRATIONS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildInvites(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.INVITES, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildVanityUrl(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.VANITY_URL, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchGuildWebhooks(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.WEBHOOKS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchInvite(code, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({code}, {code: {type: 'string', required: true}});

			query = this.createBody(query, {with_counts: {type: 'bool'}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.INVITE, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchMember(guildId, userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.MEMBER, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchMembers(guildId, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = this.createBody(query, {
				limit: {type: 'integer'},
				after: {type: 'snowflake'}
			});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.MEMBERS, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchMessages(channelId, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			query = this.createBody(query, {
				around: {type: 'snowflake'},
				before: {type: 'snowflake'},
				after: {type: 'snowflake'},
				limit: {type: 'integer'}
			});

			if (['around', 'before', 'after'].map((v) => query[v]).filter((v) => v).length > 1) {
				return reject(new Error('Choose between around, before, or after, cannot have more than one.'));
			}

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.MEMBERS, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchPinnedMessages(channelId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.CHANNELS.PINS, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchPruneCount(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.PRUNE, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchReactions(channelId, messageId, emoji, query)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, messageId, emoji}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true}
			});

			query = this.createBody(query, {
				before: {type: 'snowflake'},
				after: {type: 'snowflake'},
				limit: {type: 'integer'}
			});

			if (['before', 'after'].map((v) => query[v]).filter((v) => v).length > 1) {
				return reject(new Error('Choose between before or after, not both.'));
			}

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.CHANNELS.MESSAGE_REACTION, params},
				query
			}).then(resolve).catch(reject);
		});
	}

	fetchRoles(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.GUILDS.ROLES, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchUser(userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({userId}, {userId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'get', path: RestEndpoints.USERS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchWebhook(webhookId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId}, {webhookId: {type: 'snowflake', required: true}});
			
			this.rest.request({
				route: {method: 'get', path: RestEndpoints.WEBHOOKS.ID, params}
			}).then(resolve).catch(reject);
		});
	}

	fetchWebhookToken(webhookId, token)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});
			
			this.rest.request({
				route: {method: 'get', path: RestEndpoints.WEBHOOKS.TOKEN, params},
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
				route.params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});
			}

			this.rest.request({route}).then(resolve).catch(reject);
		});
	}

	leaveGuild(guildId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId}, {guildId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.USERS.GUILD, params}
			}).then(resolve).catch(reject);
		});
	}

	removeBan(guildId, userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.BAN, params}
			}).then(resolve).catch(reject);
		});
	}

	removeMember(guildId, userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.MEMBER, params}
			}).then(resolve).catch(reject);
		});
	}

	removeMemberRole(guildId, userId, roleId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, userId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.GUILDS.MEMBER_ROLE, params}
			}).then(resolve).catch(reject);
		});
	}

	removeRecipient(channelId, userId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId, userId}, {
				channelId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'delete', path: RestEndpoints.CHANNELS.RECIPIENT, params}
			}).then(resolve).catch(reject);
		});
	}

	syncIntegration(guildId, integrationId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.GUILDS.INTEGRATION_SYNC, params}
			}).then(resolve).catch(reject);
		});
	}

	triggerTyping(channelId)
	{
		return new Promise((resolve, reject) => {
			const params = this.createBody({channelId}, {channelId: {type: 'snowflake', required: true}});

			this.rest.request({
				route: {method: 'post', path: RestEndpoints.CHANNELS.TYPING, params}
			}).then(resolve).catch(reject);
		});
	}

	createBody(data, defaults)
	{
		data = data || {};
		const body = {};
		for (let key in defaults) {
			if (!(key in data)) {
				if (defaults[key].required) {
					throw new Error(`${key} is required.`);
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
					if ((typeof(data[key]) !== 'string' && typeof(data[key]) !== 'number') || (!(/\d+/).exec(data[key]) && data[key] !== '@me')) {
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