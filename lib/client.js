'use strict';

const os = require('os');

const RestClient = require('detritus-rest').Client;
const RestEndpoints = require('./endpoints');
const RestRequest = require('./request');

const Utils = require('./utils');
const Constants = Utils.Constants;

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

class Client
{
	constructor(token, options)
	{
		this.token = token;

		options = options || {};
		this.restClient = new RestClient({
			settings: options.settings,
			headers: {'user-agent': defaultHeaders['user-agent']},
			baseUrl: Constants.Endpoints.REST.URL + Constants.Endpoints.REST.PATH
		});

		const expire = (options.bucketsExpireIn === undefined) ? 30 : options.bucketsExpireIn;
		this.buckets = new Utils.Buckets.Collection({expire});
		this.global = new Utils.Buckets.HttpBucket();

		this.endpoints = new (options.RestEndpoints || RestEndpoints)(this);

		this._authType = null;
		this.setAuthType(options.authType);
	}

	get authType()
	{
		switch (this._authType) {
			case Constants.AuthTypes.BOT: return 'Bot';
			case Constants.AuthTypes.OAUTH: return 'Bearer';
			default: return null;
		}
	}

	setAuthType(type)
	{
		if (typeof(type) === 'string') {type = type.toLowerCase();}
		for (let key in Constants.AuthTypes) {
			if (Constants.AuthTypes[key] === type) {break;}
			if (type === key.toLowerCase()) {
				type = Constants.AuthTypes[key];
				break;
			}
		}
		this._authType = type || Constants.AuthTypes.USER;
	}

	request(options)
	{
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
			});
		});
	}
}

module.exports = Client;