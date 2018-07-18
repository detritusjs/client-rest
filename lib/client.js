'use strict';

const os = require('os');

const RestClient = require('detritus-rest').Client;
const RestRequest = require('./request');

const Utils = require('./utils');
const Constants = Utils.Constants;
const RestEndpoints = Constants.Endpoints.REST;

const Tools = Utils.Tools;

const defaultHeaders = {
	'user-agent': [
			'DiscordBot',
			`(https://github.com/detritusjs/detritus-client-rest, v${Constants.VERSION})`,
			`(${os.type()} ${os.release()}; ${os.arch()})`,
			process.version.replace(/^v/, (process.release.name || 'node') + '/')
		].join(' '),
	'x-super-properties': Buffer.from(JSON.stringify({
			os: os.type(),
			os_version: `${os.release()} ${os.arch()}`,
			browser: process.version.replace(/^v/, (process.release.name || 'node') + '/'),
			device: 'Detritus',
			client_version: Constants.VERSION
		})).toString('base64')
};

const defaults = {
	dataOnly: true
};

class Client {
	constructor(token, options) {
		options = Object.assign({
			baseUrl: RestEndpoints.URL + RestEndpoints.PATH
		}, options);

		const restClient = new RestClient({
			settings: options.settings,
			headers: {'user-agent': defaultHeaders['user-agent']},
			baseUrl: options.baseUrl
		});

		Object.defineProperties(this, {
			'_authType': {configurable: true, value: null},
			buckets: {enumerable: true, value: new Utils.Buckets.HTTPCollection({expire: (options.bucketsExpireIn === undefined) ? 30 : options.bucketsExpireIn})},
			global: {value: options.globalBucket || new Utils.Buckets.HTTPBucket()},
			restClient: {value: restClient},
			token: {value: token}
		});

		this.setAuthType(options.authType || Constants.AuthTypes.USER);
	}

	get authType() {
		switch (this._authType) {
			case Constants.AuthTypes.BOT: return 'Bot';
			case Constants.AuthTypes.OAUTH: return 'Bearer';
			default: return null;
		}
	}

	setAuthType(type) {
		let authType;
		if (typeof(type) === 'string') {type = type.toUpperCase();}
		for (let key in Constants.AuthTypes) {
			if (Constants.AuthTypes[key] === type || key === type) {
				authType = Constants.AuthTypes[key];
				break;
			}
		}
		Object.defineProperty(this, '_authType', {value: authType});
	}

	request(options) {
		options = Object.assign({}, defaults, options);
		return this.restClient.createRequest(options).then((request) => {
			request.options.headers['user-agent'] = defaultHeaders['user-agent'];
			if (request.url.host === this.restClient.baseUrl.host) {
				request.options.headers['x-super-properties'] = defaultHeaders['x-super-properties'];
			}

			if (options.useAuth || (options.useAuth === undefined && request.url.host === this.restClient.baseUrl.host)) {
				request.options.headers['authorization'] = [this.authType, options.token || this.token].filter((v)=>v).join(' ');
			}

			return new RestRequest(this, request);
		}).then((request) => {
			return new Promise((resolve, reject) => {
				if (request.bucket) {
					const delayed = {request, resolve, reject};
					if (this.global.locked) {
						this.global.add(delayed);
					} else {
						request.bucket.add(delayed);
						this.buckets.stopExpire(request.bucket);
					}
				} else {
					request.send().then(resolve).catch(reject);
				}
			}).then((response) => (options.dataOnly) ? response.data : response);
		});
	}


	acceptInvite(code) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({code}, {code: {type: 'string', required: true}});
			const route = {method: 'post', path: RestEndpoints.INVITE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	ackChannel(channelId, messageId, token) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const body = Tools.checkData({token}, {
				token: {type: 'string', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.MESSAGE_ACK, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	ackGuild(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'post', path: RestEndpoints.GUILDS.ACK, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	ackMessage(channelId, messageId, token) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const body = Tools.checkData({token}, {
				token: {type: 'string', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.MESSAGE_ACK, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	addGuildMember(guildId, userId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				access_token: {type: 'string', required: true},
				nick: {type: 'string'},
				roles: {type: 'array'},
				mute: {type: 'bool'},
				deaf: {type: 'bool'}
			});

			const route = {method: 'put', path: RestEndpoints.GUILDS.MEMBER, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	addGuildMemberRole(guildId, userId, roleId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			const route = {method: 'put', path: RestEndpoints.GUILDS.MEMBER_ROLE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	addPinnedMessage(channelId, messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const route = {method: 'put', path: RestEndpoints.CHANNELS.MESSAGE_PIN, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	addRecipient(channelId, userId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, userId}, {
				channelId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				access_token: {type: 'string'},
				nick: {type: 'string'}
			});

			if (!Object.keys(body).length) {body = undefined;}

			const route = {method: 'put', path: RestEndpoints.CHANNELS.RECIPIENT, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	beginPrune(guildId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {'days': {type: 'integer'}});

			const route = {method: 'post', path: RestEndpoints.GUILDS.PRUNE, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	bulkDeleteMessages(channelId, messageIds) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const body = Tools.checkData({messageIds}, {
				messageIds: {type: 'array', required: true}
			});

			if (body.messageIds.length < 2 || 100 < body.messageIds.length) {
				return reject(new Error('Message Ids amount needs to be between 2 and 100!'));
			}

			//add a timestamp check for the messageids

			const route = {method: 'post', path: RestEndpoints.CHANNELS.BULK_DELETE, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createDm(recipient_id) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData({recipient_id}, {recipient_id: {type: 'snowflake', required: true}});

			const route = {method: 'post', path: RestEndpoints.USERS.CHANNELS, params: {userId: '@me'}};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createGuild(body) {
		return new Promise((resolve, reject) => {
			body = Tools.checkData(body, {
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

			const route = {method: 'post', path: RestEndpoints.GUILDS.ALL};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createGuildBan(guildId, userId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			query = Tools.checkData(query, {
				'delete-message-days': {type: 'integer'},
				reason: {type: 'string'}
			});

			const route = {method: 'put', path: RestEndpoints.GUILDS.BAN, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	createGuildChannel(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				name: {type: 'string', required: true},
				type: {type: 'integer'},
				topic: {type: 'string'},
				bitrate: {type: 'integer'},
				user_limit: {type: 'integer'},
				permission_overwrites: {type: 'array'},
				parent_id: {type: 'snowflake'},
				nsfw: {type: 'bool'}
			});

			const route = {method: 'post', path: RestEndpoints.GUILDS.CHANNELS, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createGuildEmoji(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				name: {type: 'string', required: true},
				image: {type: 'string', required: true}, //256kb add check, base64 required, if buffer then make b64?
				roles: {type: 'array'}
			});

			const route = {method: 'post', path: RestEndpoints.GUILDS.EMOJIS, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createGuildIntegration(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				id: {type: 'string', required: true},
				type: {type: 'string', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.GUILDS.INTEGRATIONS, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createGuildRole(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				name: {type: 'string'},
				permissions: {type: 'integer'},
				color: {type: 'integer'},
				hoist: {type: 'bool'},
				mentionable: {type: 'bool'}
			});

			const route = {method: 'post', path: RestEndpoints.GUILDS.ROLES, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createInvite(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				max_age: {type: 'integer'},
				max_uses: {type: 'integer'},
				temporary: {type: 'bool'},
				unique: {type: 'bool'}
			});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.INVITES, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	createMessage(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			if (body && body.file) {
				body.files = body.files || [];
				body.files.push(body.file);
			}

			body = Tools.checkData(body, {
				content: {type: 'string'},
				tts: {type: 'bool'},
				embed: {type: 'object'},
				files: {type: 'array'},
				nonce: {type: 'string'}
			});

			//nonce, if sent is as a true, will turn into string
			if (body.nonce === 'true') {
				body.nonce = Utils.Snowflake.generate();
			}

			const files = [];
			if (body.files && body.files.length) {
				body.files.forEach((file) => files.push(file));
				delete body.files;
			}

			if (!body.content && !body.embed && !files.length) {
				return reject(new Error('Cannot send an empty message.'));
			}

			const route = {method: 'post', path: RestEndpoints.CHANNELS.MESSAGES, params};
			this.request({route, files, body}).then(resolve).catch(reject);
		});
	}

	createReaction(channelId, messageId, emoji) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId, emoji}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true}
			});
			
			params.userId = '@me';

			const route = {method: 'put', path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	createWebhook(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				name: {type: 'string', required: true},
				avatar: {type: 'string'}
			});
			
			const route = {method: 'post', path: RestEndpoints.CHANNELS.WEBHOOKS, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}
	
	deleteAccount() {
		return this.request({route: {method: 'post', path: RestEndpoints.USERS.DELETE_ACCOUNT}});
	}

	deleteChannel(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteChannelOverwrite(channelId, overwriteId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, overwriteId}, {
				channelId: {type: 'snowflake', required: true},
				overwriteId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.PERMISSION, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteGuild(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteGuildEmoji(guildId, emojiId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.EMOJI, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteGuildIntegration(guildId, integrationId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.INTEGRATION, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteGuildRole(guildId, roleId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.ROLE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteInvite(code) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({code}, {code: {type: 'string', required: true}});

			const route = {method: 'delete', path: RestEndpoints.INVITE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteMessage(channelId, messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deletePinnedMessage(channelId, messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_PIN, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteReaction(channelId, messageId, emoji, userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId, emoji, userId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true},
				userId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_REACTION_USER, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteReactions(channelId, messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.MESSAGE_REACTIONS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteRelationship(userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.USERS.RELATIONSHIP, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteWebhook(webhookId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId}, {webhookId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.WEBHOOKS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	deleteWebhookToken(webhookId, token) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.WEBHOOKS.TOKEN, params};
			this.request({route, useAuth: false}).then(resolve).catch(reject);
		});
	}

	editChannel(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
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

			const route = {method: 'patch', path: RestEndpoints.CHANNELS.ID, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editChannelOverwrite(channelId, overwriteId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, overwriteId}, {
				channelId: {type: 'snowflake', required: true},
				overwriteId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				allow: {type: 'integer'},
				deny: {type: 'integer'},
				type: {type: 'string'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty.'));
			}

			const route = {method: 'put', path: RestEndpoints.CHANNELS.PERMISSION, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuild(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
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

			const route = {method: 'patch', path: RestEndpoints.GUILDS.ID, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildChannelPositions(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			if (typeof(body) !== 'object' || !Array.isArray(body)) {
				return reject(new Error('Body has to be an array!'));
			}
			
			body = body.map((channel) => {
				return Tools.checkData(channel, {
					id: {type: 'snowflake', required: true},
					position: {type: 'integer', required: true}
				});
			});
			
			if (!body.length) {
				return reject(new Error('Body cannot be empty.'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.CHANNELS, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildEmbed(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				channel_id: {type: 'snowflake'},
				enabled: {type: 'bool'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.EMBED, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildEmoji(guildId, emojiId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				name: {type: 'string'},
				roles: {type: 'array'}
			});
			
			if (!Object.keys(body).length || (!(body.roles && body.roles.length) && !body.name)) {
				return reject(new Error('Emoji Roles and Name cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.EMOJI, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildIntegration(guildId, integrationId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				expire_behavior: {type: 'integer'},
				expire_emoticons: {type: 'bool'},
				expire_grace_period: {type: 'integer'}
			});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.INTEGRATION, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildMember(guildId, userId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				channel_id: {type: 'snowflake'},
				deaf: {type: 'bool'},
				mute: {type: 'bool'},
				nick: {type: 'string'},
				roles: {type: 'array'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.MEMBER, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildNick(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {nick: {type: 'string'}});

			const route = {method: 'patch', path: RestEndpoints.GUILDS.MEMBER_NICK, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildRole(guildId, roleId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				color: {type: 'integer'},
				hoist: {type: 'bool'},
				mentionable: {type: 'bool'},
				name: {type: 'string'},
				permissions: {type: 'integer'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.ROLE, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildRolePositions(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			if (typeof(body) !== 'object' || !Array.isArray(body)) {
				return reject(new Error('Body has to be an array!'));
			}
			
			body = body.map((role) => {
				return Tools.checkData(role, {
					id: {type: 'snowflake', required: true},
					position: {type: 'integer', required: true}
				});
			});
			
			if (!body.length) {
				return reject(new Error('Body cannot be empty.'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.ROLES, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editGuildVanityUrl(guildId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {code: {type: 'string'}});
			
			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.GUILDS.VANITY_URL, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editMessage(channelId, messageId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			body = Tools.checkData(body, {
				content: {type: 'string'},
				embed: {type: 'object'}
			});

			if (!Object.keys(body).length) {
				return reject(new Error('Body cannot be empty!'));
			}

			const route = {method: 'patch', path: RestEndpoints.CHANNELS.MESSAGE, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editNote(userId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {note: {type: 'string'}});

			const route = {method: 'put', path: RestEndpoints.USERS.NOTE, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editRelationship(userId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {type: {type: 'integer'}});

			const route = {method: 'put', path: RestEndpoints.USERS.RELATIONSHIP, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editSettings(body) {
		return new Promise((resolve, reject) => {
			body = Object.assign({}, body);

			const route = {method: 'patch', path: RestEndpoints.USERS.SETTINGS};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editUser(body) {
		return new Promise((resolve, reject) => {
			body = Tools.checkData(body, {
				avatar: {type: 'string'}, //base64
				discriminator: {type: 'string'},
				email: {type: 'string'},
				new_password: {type: 'string'},
				password: {type: 'string'},
				username: {type: 'string'}
			});

			const route = {method: 'patch', path: RestEndpoints.USERS.ID, params: {userId: '@me'}};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editWebhook(webhookId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId}, {webhookId: {type: 'snowflake', required: true}});

			body = Tools.checkData(body, {
				avatar: {type: 'string'},
				channel_id: {type: 'snowflake'},
				name: {type: 'string'}
			});
			
			const route = {method: 'patch', path: RestEndpoints.WEBHOOKS.ID, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	editWebhookToken(webhookId, token, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			body = Tools.checkData(body, {
				name: {type: 'string'},
				avatar: {type: 'string'}
			});
			
			const route = {method: 'patch', path: RestEndpoints.WEBHOOKS.TOKEN, params};
			this.request({route, body, useAuth: false}).then(resolve).catch(reject);
		});
	}

	executeWebhook(webhookId, token, body, compatible) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId, token}, {
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

			body = Tools.checkData(body, {
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

			this.request({route, query, body, files, useAuth: false}).then(resolve).catch(reject);
		});
	}

	fetchActivityMetadata(userId, sessionId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId, sessionId}, {
				userId: {type: 'snowflake', required: true},
				sessionId: {type: 'string', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.USERS.ACTIVITY_METADATA, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}
	
	fetchActivities() {
		return this.request({route: {method: 'get', path: RestEndpoints.ACTIVITIES}});
	}

	//same as fetchGames
	fetchApplications() {
		return this.request({route: {method: 'get', path: RestEndpoints.APPLICATIONS.ALL}});
	}

	fetchApplication(applicationId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({applicationId}, {applicationId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.APPLICATIONS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchBilling() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.BILLING}});
	}

	fetchBillingPayments() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.BILLING_PAYMENTS}});
	}

	fetchBillingPremiumSubscription() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.BILLING_PREMIUM_SUBSCRIPTION}});
	}

	fetchCall(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'GET', path: RestEndpoints.CHANNELS.CALL, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchChannels(userId) {
		userId = userId || '@me';
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.USERS.CHANNELS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchChannel(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.CHANNELS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchChannelInvites(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.CHANNELS.INVITES, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchChannelWebhooks(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.CHANNELS.WEBHOOKS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchConnections() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.CONNECTIONS}});
	}

	fetchConnectionRedditSubreddits(connectionId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({connectionId}, {connectionId: {type: 'string', required: true}});

			const route = {method: 'get', path: RestEndpoints.USERS.CONNECTION_REDDIT_SUBREDDITS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchConnectionAccessToken(providerId, connectionId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({providerId, connectionId}, {
				providerId: {type: 'string', required: true},
				connectionId: {type: 'string', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.USERS.CONNECTION_ACCESS_TOKEN, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchConnectionAuthorize(providerId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({providerId}, {providerId: {type: 'string', required: true}});

			const route = {method: 'get', path: RestEndpoints.CONNECTIONS.AUTHORIZE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchDms() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.CHANNELS, params: {userId: '@me'}}});
	}

	fetchExperiments() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.EXPERIMENTS}});
	}

	fetchFeedSettings() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.FEED_SETTINGS}});
	}

	fetchGames() {
		return this.request({route: {method: 'get', path: RestEndpoints.GAMES.ALL}});
	}

	fetchGame(gameId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({gameId}, {gameId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GAMES.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}
	
	fetchGameNews(gameId) {
		return new Promise((resolve, reject) => {
			if (typeof(gameId) === 'string') {gameId = [gameId];}
			const params = Tools.checkData({gameId}, {gameId: {type: 'array', required: true}});

			const route = {method: 'get', path: RestEndpoints.GAMES.NEWS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGateway() {
		return this.request({route: {method: 'get', path: RestEndpoints.GATEWAY}});
	}

	fetchGatewayBot() {
		return this.request({route: {method: 'get', path: RestEndpoints.GATEWAY_BOT}});
	}

	fetchGuilds() {
		return this.request({route: {method: 'get', path: RestEndpoints.USERS.GUILDS}});
	}

	fetchGuild(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildAuditLogs(guildId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {
				action_type: {type: 'integer'},
				before: {type: 'snowflake'},
				limit: {type: 'integer'},
				user_id: {type: 'snowflake'}
			});

			const route = {method: 'get', path: RestEndpoints.GUILDS.AUDIT_LOGS, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchGuildBans(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.BANS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildChannels(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.CHANNELS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildEmbed(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.EMBED, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildEmojis(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.EMOJIS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildEmoji(guildId, emojiId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, emojiId}, {
				guildId: {type: 'snowflake', required: true},
				emojiId: {type: 'snowflake', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.GUILDS.EMOJI, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildIntegrations(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.INTEGRATIONS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildInvites(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.INVITES, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildMembers(guildId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {
				limit: {type: 'integer'},
				after: {type: 'snowflake'}
			});

			const route = {method: 'get', path: RestEndpoints.GUILDS.MEMBERS, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchGuildMember(guildId, userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.GUILDS.MEMBER, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildPruneCount(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.PRUNE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildRoles(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.ROLES, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildVanityUrl(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.VANITY_URL, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchGuildWebhooks(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.GUILDS.WEBHOOKS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchInvite(code, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({code}, {code: {type: 'string', required: true}});

			query = Tools.checkData(query, {with_counts: {type: 'bool'}});

			const route = {method: 'get', path: RestEndpoints.INVITE, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchMentions(query) {
		return new Promise((resolve, reject) => {
			query = Tools.checkData(query, {
				around: {type: 'snowflake'},
				before: {type: 'snowflake'},
				after: {type: 'snowflake'},
				limit: {type: 'integer'},
				roles: {type: 'bool'},
				everyone: {type: 'bool'}
			});

			if (limit < 1 || 100 < limit) {
				return reject(new Error('Limit should be 1 <= x <= 100.'));
			}

			if (['around', 'before', 'after'].map((v) => query[v]).filter((v) => v).length > 1) {
				return reject(new Error('Choose between around, before, or after, cannot have more than one.'));
			}

			const route = {method: 'get', path: RestEndpoints.USERS.MENTIONS, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchMessage(channelId, messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.CHANNELS.MESSAGE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchMessages(channelId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {
				around: {type: 'snowflake'},
				before: {type: 'snowflake'},
				after: {type: 'snowflake'},
				limit: {type: 'integer'}
			});

			if (['around', 'before', 'after'].map((v) => query[v]).filter((v) => v).length > 1) {
				return reject(new Error('Choose between around, before, or after, cannot have more than one.'));
			}

			const route = {method: 'get', path: RestEndpoints.CHANNELS.MESSAGES, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchOauth2Applications() {
		return this.request({route: {method: 'get', path: RestEndpoints.OAUTH2.APPLICATIONS.ALL}});
	}

	fetchOauth2Application(applicationId) {
		return new Promise((resolve, reject) => {
			if (!applicationId) {applicationId = '@me';}
			const params = Tools.checkData({applicationId}, {applicationId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.OAUTH2.APPLICATIONS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchOauth2Tokens() {
		return this.request({route: {method: 'get', path: RestEndpoints.OAUTH2.TOKENS}});
	}

	fetchOauth2Token(tokenId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({tokenId}, {tokenId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.OAUTH2.TOKEN, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchPinnedMessages(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.CHANNELS.PINS, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchProfile(userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.USERS.PROFILE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchReactions(channelId, messageId, emoji, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, messageId, emoji}, {
				channelId: {type: 'snowflake', required: true},
				messageId: {type: 'snowflake', required: true},
				emoji: {type: 'string', required: true}
			});

			query = Tools.checkData(query, {
				before: {type: 'snowflake'},
				after: {type: 'snowflake'},
				limit: {type: 'integer'}
			});

			if (['before', 'after'].map((v) => query[v]).filter((v) => v).length > 1) {
				return reject(new Error('Choose between before or after, not both.'));
			}

			const route = {method: 'get', path: RestEndpoints.CHANNELS.MESSAGE_REACTION, params};
			this.request({route, query}).then(resolve).catch(reject);
		});
	}

	fetchUser(userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({userId}, {userId: {type: 'snowflake', required: true}});

			const route = {method: 'get', path: RestEndpoints.USERS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchWebhook(webhookId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId}, {webhookId: {type: 'snowflake', required: true}});
			
			const route = {method: 'get', path: RestEndpoints.WEBHOOKS.ID, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	fetchWebhookToken(webhookId, token) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({webhookId, token}, {
				webhookId: {type: 'snowflake', required: true},
				token: {type: 'string', required: true}
			});

			const route = {method: 'get', path: RestEndpoints.WEBHOOKS.TOKEN, params};
			this.request({route, useAuth: false}).then(resolve).catch(reject);
		});
	}

	fetchVoiceIce() {
		return this.request({route: {method: 'get', path: RestEndpoints.VOICE_ICE}});
	}

	fetchVoiceRegions(guildId) {
		return new Promise((resolve, reject) => {
			const route = {
				method: 'get',
				path: RestEndpoints.VOICE_REGIONS
			};

			if (guildId) {
				route.params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});
				route.path = RestEndpoints.GUILDS.REGIONS;
			}

			this.request({route}).then(resolve).catch(reject);
		});
	}

	leaveGuild(guildId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.USERS.GUILD, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	removeGuildBan(guildId, userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.BAN, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	removeGuildMember(guildId, userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.MEMBER, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	removeGuildMemberRole(guildId, userId, roleId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, userId, roleId}, {
				guildId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true},
				roleId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.GUILDS.MEMBER_ROLE, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	removeMention(messageId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({messageId}, {messageId: {type: 'snowflake', required: true}});

			const route = {method: 'delete', path: RestEndpoints.USERS.MENTION, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	removeRecipient(channelId, userId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId, userId}, {
				channelId: {type: 'snowflake', required: true},
				userId: {type: 'snowflake', required: true}
			});

			const route = {method: 'delete', path: RestEndpoints.CHANNELS.RECIPIENT, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	rtcQualityReport(token, reports) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData({token, reports}, {
				token: {type: 'string'},
				reports: {type: 'array', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.RTC_QUALITY_REPORT};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	searchChannel(channelId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {
				attachment_extensions: {type: 'string'},
				attachment_filename: {type: 'string'},
				content: {type: 'string'},
				has: {type: 'string'},
				mentions: {type: 'snowflake'},
				max_id: {type: 'snowflake'},
				min_id: {type: 'snowflake'}
			});

			if (!Object.keys(query).length) {return reject(new Error('Query cannot be empty!'));}

			const route = {method: 'get', path: RestEndpoints.CHANNELS.SEARCH, params};
			this.request({route, query}).then((response) => {
				if (response.status !== 202 && response.data.code !== 110000) {
					return resolve(response);
				}
				setTimeout(() => {
					this.searchChannel(...arguments).then(resolve).catch(reject);
				}, response.data.retry_after);
			}).catch(reject);
		});
	}
	
	searchGuild(guildId, query) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId}, {guildId: {type: 'snowflake', required: true}});

			query = Tools.checkData(query, {
				attachment_extensions: {type: 'string'},
				attachment_filename: {type: 'string'},
				author_id: {type: 'snowflake'},
				channel_id: {type: 'snowflake'},
				content: {type: 'string'},
				has: {type: 'string'},
				mentions: {type: 'snowflake'},
				max_id: {type: 'snowflake'},
				min_id: {type: 'snowflake'}
			});

			if (!Object.keys(query).length) {return reject(new Error('Query cannot be empty!'));}

			const route = {method: 'get', path: RestEndpoints.GUILDS.SEARCH, params};
			this.request({route, query}).then((response) => {
				if (response.status !== 202 && response.data.code !== 110000) {
					return resolve(response);
				}
				setTimeout(() => {
					this.searchGuild(...arguments).then(resolve).catch(reject);
				}, response.data.retry_after);
			}).catch(reject);
		});
	}

	sendDownloadEmail(email) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData({email}, {email: {type: 'string', required: true}});

			const route = {method: 'post', path: RestEndpoints.DOWNLOAD.EMAIL};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	sendDownloadText(number) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData({number}, {number: {type: 'string', required: true}});

			const route = {method: 'post', path: RestEndpoints.DOWNLOAD.SMS};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	sendFriendRequest(body) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData(body, {
				username: {type: 'string', required: true},
				discriminator: {type: 'string', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.USERS.RELATIONSHIPS};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	startRing(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const body = Tools.checkData(body, {
				recipients: {type: 'array'}
			});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.CALL_RING, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	stopRing(channelId, body) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const body = Tools.checkData(body, {
				recipients: {type: 'array'}
			});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.CALL_STOP_RINGING, params};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}

	syncGuildIntegration(guildId, integrationId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({guildId, integrationId}, {
				guildId: {type: 'snowflake', required: true},
				integrationId: {type: 'snowflake', required: true}
			});

			const route = {method: 'post', path: RestEndpoints.GUILDS.INTEGRATION_SYNC, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	triggerTyping(channelId) {
		return new Promise((resolve, reject) => {
			const params = Tools.checkData({channelId}, {channelId: {type: 'snowflake', required: true}});

			const route = {method: 'post', path: RestEndpoints.CHANNELS.TYPING, params};
			this.request({route}).then(resolve).catch(reject);
		});
	}

	verifyCaptcha(captcha_key) {
		return new Promise((resolve, reject) => {
			const body = Tools.checkData({captcha_key}, {captcha_key: {type: 'string', required: true}});

			const route = {method: 'post', path: RestEndpoints.USERS.CAPTCHA};
			this.request({route, body}).then(resolve).catch(reject);
		});
	}
}

module.exports = Client;