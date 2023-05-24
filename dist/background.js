/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/tmi.js/index.js":
/*!**************************************!*\
  !*** ./node_modules/tmi.js/index.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const client = __webpack_require__(/*! ./lib/client */ "./node_modules/tmi.js/lib/client.js");
module.exports = {
	client,
	Client: client
};


/***/ }),

/***/ "./node_modules/tmi.js/lib/api.js":
/*!****************************************!*\
  !*** ./node_modules/tmi.js/lib/api.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const fetch = __webpack_require__(/*! node-fetch */ "?641d");
const _ = __webpack_require__(/*! ./utils */ "./node_modules/tmi.js/lib/utils.js");

module.exports = function api(options, callback) {
	// Set the url to options.uri or options.url..
	let url = options.url !== undefined ? options.url : options.uri;

	// Make sure it is a valid url..
	if(!_.isURL(url)) {
		url = `https://api.twitch.tv/kraken${url[0] === '/' ? url : `/${url}`}`;
	}

	// We are inside a Node application, so we can use the node-fetch module..
	if(_.isNode()) {
		const opts = Object.assign({ method: 'GET', json: true }, options);
		if(opts.qs) {
			const qs = new URLSearchParams(opts.qs);
			url += `?${qs}`;
		}
		/** @type {import('node-fetch').RequestInit} */
		const fetchOptions = {};
		if('fetchAgent' in this.opts.connection) {
			fetchOptions.agent = this.opts.connection.fetchAgent;
		}
		/** @type {ReturnType<import('node-fetch')['default']>} */
		const fetchPromise = fetch(url, {
			...fetchOptions,
			method: opts.method,
			headers: opts.headers,
			body: opts.body
		});
		let response = {};
		fetchPromise.then(res => {
			response = { statusCode: res.status, headers: res.headers };
			return opts.json ? res.json() : res.text();
		})
		.then(
			data => callback(null, response, data),
			err => callback(err, response, null)
		);
	}
	// Web application, extension, React Native etc.
	else {
		const opts = Object.assign({ method: 'GET', headers: {} }, options, { url });
		// prepare request
		const xhr = new XMLHttpRequest();
		xhr.open(opts.method, opts.url, true);
		for(const name in opts.headers) {
			xhr.setRequestHeader(name, opts.headers[name]);
		}
		xhr.responseType = 'json';
		// set request handler
		xhr.addEventListener('load', _ev => {
			if(xhr.readyState === 4) {
				if(xhr.status !== 200) {
					callback(xhr.status, null, null);
				}
				else {
					callback(null, null, xhr.response);
				}
			}
		});
		// submit
		xhr.send();
	}
};


/***/ }),

/***/ "./node_modules/tmi.js/lib/client.js":
/*!*******************************************!*\
  !*** ./node_modules/tmi.js/lib/client.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const _global = typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g : typeof window !== 'undefined' ? window : {};
const _WebSocket = _global.WebSocket || __webpack_require__(/*! ws */ "?6264");
const _fetch = _global.fetch || __webpack_require__(/*! node-fetch */ "?641d");
const api = __webpack_require__(/*! ./api */ "./node_modules/tmi.js/lib/api.js");
const commands = __webpack_require__(/*! ./commands */ "./node_modules/tmi.js/lib/commands.js");
const EventEmitter = (__webpack_require__(/*! ./events */ "./node_modules/tmi.js/lib/events.js").EventEmitter);
const logger = __webpack_require__(/*! ./logger */ "./node_modules/tmi.js/lib/logger.js");
const parse = __webpack_require__(/*! ./parser */ "./node_modules/tmi.js/lib/parser.js");
const Queue = __webpack_require__(/*! ./timer */ "./node_modules/tmi.js/lib/timer.js");
const _ = __webpack_require__(/*! ./utils */ "./node_modules/tmi.js/lib/utils.js");

let _apiWarned = false;

// Client instance..
const client = function client(opts) {
	if(this instanceof client === false) { return new client(opts); }
	this.opts = _.get(opts, {});
	this.opts.channels = this.opts.channels || [];
	this.opts.connection = this.opts.connection || {};
	this.opts.identity = this.opts.identity || {};
	this.opts.options = this.opts.options || {};

	this.clientId = _.get(this.opts.options.clientId, null);
	this._globalDefaultChannel = _.channel(_.get(this.opts.options.globalDefaultChannel, '#tmijs'));
	this._skipMembership = _.get(this.opts.options.skipMembership, false);
	this._skipUpdatingEmotesets = _.get(this.opts.options.skipUpdatingEmotesets, false);
	this._updateEmotesetsTimer = null;
	this._updateEmotesetsTimerDelay = _.get(this.opts.options.updateEmotesetsTimer, 60000);

	this.maxReconnectAttempts = _.get(this.opts.connection.maxReconnectAttempts, Infinity);
	this.maxReconnectInterval = _.get(this.opts.connection.maxReconnectInterval, 30000);
	this.reconnect = _.get(this.opts.connection.reconnect, true);
	this.reconnectDecay = _.get(this.opts.connection.reconnectDecay, 1.5);
	this.reconnectInterval = _.get(this.opts.connection.reconnectInterval, 1000);

	this.reconnecting = false;
	this.reconnections = 0;
	this.reconnectTimer = this.reconnectInterval;

	this.secure = _.get(
		this.opts.connection.secure,
		!this.opts.connection.server && !this.opts.connection.port
	);

	// Raw data and object for emote-sets..
	this.emotes = '';
	this.emotesets = {};

	this.channels = [];
	this.currentLatency = 0;
	this.globaluserstate = {};
	this.lastJoined = '';
	this.latency = new Date();
	this.moderators = {};
	this.pingLoop = null;
	this.pingTimeout = null;
	this.reason = '';
	this.username = '';
	this.userstate = {};
	this.wasCloseCalled = false;
	this.ws = null;

	// Create the logger..
	let level = 'error';
	if(this.opts.options.debug) { level = 'info'; }
	this.log = this.opts.logger || logger;

	try { logger.setLevel(level); } catch(err) {}

	// Format the channel names..
	this.opts.channels.forEach((part, index, theArray) =>
		theArray[index] = _.channel(part)
	);

	EventEmitter.call(this);
	this.setMaxListeners(0);
};

_.inherits(client, EventEmitter);

// Put all commands in prototype..
for(const methodName in commands) {
	client.prototype[methodName] = commands[methodName];
}

// Emit multiple events..
client.prototype.emits = function emits(types, values) {
	for(let i = 0; i < types.length; i++) {
		const val = i < values.length ? values[i] : values[values.length - 1];
		this.emit.apply(this, [ types[i] ].concat(val));
	}
};
/** @deprecated */
client.prototype.api = function(...args) {
	if(!_apiWarned) {
		this.log.warn('Client.prototype.api is deprecated and will be removed for version 2.0.0');
		_apiWarned = true;
	}
	api(...args);
};
// Handle parsed chat server message..
client.prototype.handleMessage = function handleMessage(message) {
	if(!message) {
		return;
	}

	if(this.listenerCount('raw_message')) {
		this.emit('raw_message', JSON.parse(JSON.stringify(message)), message);
	}

	const channel = _.channel(_.get(message.params[0], null));
	let msg = _.get(message.params[1], null);
	const msgid = _.get(message.tags['msg-id'], null);

	// Parse badges, badge-info and emotes..
	const tags = message.tags = parse.badges(parse.badgeInfo(parse.emotes(message.tags)));

	// Transform IRCv3 tags..
	for(const key in tags) {
		if(key === 'emote-sets' || key === 'ban-duration' || key === 'bits') {
			continue;
		}
		let value = tags[key];
		if(typeof value === 'boolean') { value = null; }
		else if(value === '1') { value = true; }
		else if(value === '0') { value = false; }
		else if(typeof value === 'string') { value = _.unescapeIRC(value); }
		tags[key] = value;
	}

	// Messages with no prefix..
	if(message.prefix === null) {
		switch(message.command) {
			// Received PING from server..
			case 'PING':
				this.emit('ping');
				if(this._isConnected()) {
					this.ws.send('PONG');
				}
				break;

			// Received PONG from server, return current latency..
			case 'PONG': {
				const currDate = new Date();
				this.currentLatency = (currDate.getTime() - this.latency.getTime()) / 1000;
				this.emits([ 'pong', '_promisePing' ], [ [ this.currentLatency ] ]);

				clearTimeout(this.pingTimeout);
				break;
			}

			default:
				this.log.warn(`Could not parse message with no prefix:\n${JSON.stringify(message, null, 4)}`);
				break;
		}
	}


	// Messages with "tmi.twitch.tv" as a prefix..
	else if(message.prefix === 'tmi.twitch.tv') {
		switch(message.command) {
			case '002':
			case '003':
			case '004':
			case '372':
			case '375':
			case 'CAP':
				break;

			// Retrieve username from server..
			case '001':
				this.username = message.params[0];
				break;

			// Connected to server..
			case '376': {
				this.log.info('Connected to server.');
				this.userstate[this._globalDefaultChannel] = {};
				this.emits([ 'connected', '_promiseConnect' ], [ [ this.server, this.port ], [ null ] ]);
				this.reconnections = 0;
				this.reconnectTimer = this.reconnectInterval;

				// Set an internal ping timeout check interval..
				this.pingLoop = setInterval(() => {
					// Make sure the connection is opened before sending the message..
					if(this._isConnected()) {
						this.ws.send('PING');
					}
					this.latency = new Date();
					this.pingTimeout = setTimeout(() => {
						if(this.ws !== null) {
							this.wasCloseCalled = false;
							this.log.error('Ping timeout.');
							this.ws.close();

							clearInterval(this.pingLoop);
							clearTimeout(this.pingTimeout);
							clearTimeout(this._updateEmotesetsTimer);
						}
					}, _.get(this.opts.connection.timeout, 9999));
				}, 60000);

				// Join all the channels from the config with an interval..
				let joinInterval = _.get(this.opts.options.joinInterval, 2000);
				if(joinInterval < 300) {
					joinInterval = 300;
				}
				const joinQueue = new Queue(joinInterval);
				const joinChannels = [ ...new Set([ ...this.opts.channels, ...this.channels ]) ];
				this.channels = [];

				for(let i = 0; i < joinChannels.length; i++) {
					const channel = joinChannels[i];
					joinQueue.add(() => {
						if(this._isConnected()) {
							this.join(channel).catch(err => this.log.error(err));
						}
					});
				}

				joinQueue.next();
				break;
			}

			// https://github.com/justintv/Twitch-API/blob/master/chat/capabilities.md#notice
			case 'NOTICE': {
				const nullArr = [ null ];
				const noticeArr = [ channel, msgid, msg ];
				const msgidArr = [ msgid ];
				const channelTrueArr = [ channel, true ];
				const channelFalseArr = [ channel, false ];
				const noticeAndNull = [ noticeArr, nullArr ];
				const noticeAndMsgid = [ noticeArr, msgidArr ];
				const basicLog = `[${channel}] ${msg}`;
				switch(msgid) {
					// This room is now in subscribers-only mode.
					case 'subs_on':
						this.log.info(`[${channel}] This room is now in subscribers-only mode.`);
						this.emits([ 'subscriber', 'subscribers', '_promiseSubscribers' ], [ channelTrueArr, channelTrueArr, nullArr ]);
						break;

					// This room is no longer in subscribers-only mode.
					case 'subs_off':
						this.log.info(`[${channel}] This room is no longer in subscribers-only mode.`);
						this.emits([ 'subscriber', 'subscribers', '_promiseSubscribersoff' ], [ channelFalseArr, channelFalseArr, nullArr ]);
						break;

					// This room is now in emote-only mode.
					case 'emote_only_on':
						this.log.info(`[${channel}] This room is now in emote-only mode.`);
						this.emits([ 'emoteonly', '_promiseEmoteonly' ], [ channelTrueArr, nullArr ]);
						break;

					// This room is no longer in emote-only mode.
					case 'emote_only_off':
						this.log.info(`[${channel}] This room is no longer in emote-only mode.`);
						this.emits([ 'emoteonly', '_promiseEmoteonlyoff' ], [ channelFalseArr, nullArr ]);
						break;

					// Do not handle slow_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.
					case 'slow_on':
					case 'slow_off':
						break;

					// Do not handle followers_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.
					case 'followers_on_zero':
					case 'followers_on':
					case 'followers_off':
						break;

					// This room is now in r9k mode.
					case 'r9k_on':
						this.log.info(`[${channel}] This room is now in r9k mode.`);
						this.emits([ 'r9kmode', 'r9kbeta', '_promiseR9kbeta' ], [ channelTrueArr, channelTrueArr, nullArr ]);
						break;

					// This room is no longer in r9k mode.
					case 'r9k_off':
						this.log.info(`[${channel}] This room is no longer in r9k mode.`);
						this.emits([ 'r9kmode', 'r9kbeta', '_promiseR9kbetaoff' ], [ channelFalseArr, channelFalseArr, nullArr ]);
						break;

					// The moderators of this room are: [..., ...]
					case 'room_mods': {
						const listSplit = msg.split(': ');
						const mods = (listSplit.length > 1 ? listSplit[1] : '').toLowerCase()
						.split(', ')
						.filter(n => n);

						this.emits([ '_promiseMods', 'mods' ], [ [ null, mods ], [ channel, mods ] ]);
						break;
					}

					// There are no moderators for this room.
					case 'no_mods':
						this.emits([ '_promiseMods', 'mods' ], [ [ null, [] ], [ channel, [] ] ]);
						break;

					// The VIPs of this channel are: [..., ...]
					case 'vips_success': {
						if(msg.endsWith('.')) {
							msg = msg.slice(0, -1);
						}
						const listSplit = msg.split(': ');
						const vips = (listSplit.length > 1 ? listSplit[1] : '').toLowerCase()
						.split(', ')
						.filter(n => n);

						this.emits([ '_promiseVips', 'vips' ], [ [ null, vips ], [ channel, vips ] ]);
						break;
					}

					// There are no VIPs for this room.
					case 'no_vips':
						this.emits([ '_promiseVips', 'vips' ], [ [ null, [] ], [ channel, [] ] ]);
						break;

					// Ban command failed..
					case 'already_banned':
					case 'bad_ban_admin':
					case 'bad_ban_anon':
					case 'bad_ban_broadcaster':
					case 'bad_ban_global_mod':
					case 'bad_ban_mod':
					case 'bad_ban_self':
					case 'bad_ban_staff':
					case 'usage_ban':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseBan' ], noticeAndMsgid);
						break;

					// Ban command success..
					case 'ban_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseBan' ], noticeAndNull);
						break;

					// Clear command failed..
					case 'usage_clear':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseClear' ], noticeAndMsgid);
						break;

					// Mods command failed..
					case 'usage_mods':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseMods' ], [ noticeArr, [ msgid, [] ] ]);
						break;

					// Mod command success..
					case 'mod_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseMod' ], noticeAndNull);
						break;

					// VIPs command failed..
					case 'usage_vips':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseVips' ], [ noticeArr, [ msgid, [] ] ]);
						break;

					// VIP command failed..
					case 'usage_vip':
					case 'bad_vip_grantee_banned':
					case 'bad_vip_grantee_already_vip':
					case 'bad_vip_max_vips_reached':
					case 'bad_vip_achievement_incomplete':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseVip' ], [ noticeArr, [ msgid, [] ] ]);
						break;

					// VIP command success..
					case 'vip_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseVip' ], noticeAndNull);
						break;

					// Mod command failed..
					case 'usage_mod':
					case 'bad_mod_banned':
					case 'bad_mod_mod':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseMod' ], noticeAndMsgid);
						break;

					// Unmod command success..
					case 'unmod_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnmod' ], noticeAndNull);
						break;

					// Unvip command success...
					case 'unvip_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnvip' ], noticeAndNull);
						break;

					// Unmod command failed..
					case 'usage_unmod':
					case 'bad_unmod_mod':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnmod' ], noticeAndMsgid);
						break;

					// Unvip command failed..
					case 'usage_unvip':
					case 'bad_unvip_grantee_not_vip':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnvip' ], noticeAndMsgid);
						break;

					// Color command success..
					case 'color_changed':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseColor' ], noticeAndNull);
						break;

					// Color command failed..
					case 'usage_color':
					case 'turbo_only_color':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseColor' ], noticeAndMsgid);
						break;

					// Commercial command success..
					case 'commercial_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseCommercial' ], noticeAndNull);
						break;

					// Commercial command failed..
					case 'usage_commercial':
					case 'bad_commercial_error':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseCommercial' ], noticeAndMsgid);
						break;

					// Host command success..
					case 'hosts_remaining': {
						this.log.info(basicLog);
						const remainingHost = (!isNaN(msg[0]) ? parseInt(msg[0]) : 0);
						this.emits([ 'notice', '_promiseHost' ], [ noticeArr, [ null, ~~remainingHost ] ]);
						break;
					}

					// Host command failed..
					case 'bad_host_hosting':
					case 'bad_host_rate_exceeded':
					case 'bad_host_error':
					case 'usage_host':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseHost' ], [ noticeArr, [ msgid, null ] ]);
						break;

					// r9kbeta command failed..
					case 'already_r9k_on':
					case 'usage_r9k_on':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseR9kbeta' ], noticeAndMsgid);
						break;

					// r9kbetaoff command failed..
					case 'already_r9k_off':
					case 'usage_r9k_off':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseR9kbetaoff' ], noticeAndMsgid);
						break;

					// Timeout command success..
					case 'timeout_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseTimeout' ], noticeAndNull);
						break;

					case 'delete_message_success':
						this.log.info(`[${channel} ${msg}]`);
						this.emits([ 'notice', '_promiseDeletemessage' ], noticeAndNull);
						break;

					// Subscribersoff command failed..
					case 'already_subs_off':
					case 'usage_subs_off':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseSubscribersoff' ], noticeAndMsgid);
						break;

					// Subscribers command failed..
					case 'already_subs_on':
					case 'usage_subs_on':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseSubscribers' ], noticeAndMsgid);
						break;

					// Emoteonlyoff command failed..
					case 'already_emote_only_off':
					case 'usage_emote_only_off':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseEmoteonlyoff' ], noticeAndMsgid);
						break;

					// Emoteonly command failed..
					case 'already_emote_only_on':
					case 'usage_emote_only_on':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseEmoteonly' ], noticeAndMsgid);
						break;

					// Slow command failed..
					case 'usage_slow_on':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseSlow' ], noticeAndMsgid);
						break;

					// Slowoff command failed..
					case 'usage_slow_off':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseSlowoff' ], noticeAndMsgid);
						break;

					// Timeout command failed..
					case 'usage_timeout':
					case 'bad_timeout_admin':
					case 'bad_timeout_anon':
					case 'bad_timeout_broadcaster':
					case 'bad_timeout_duration':
					case 'bad_timeout_global_mod':
					case 'bad_timeout_mod':
					case 'bad_timeout_self':
					case 'bad_timeout_staff':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseTimeout' ], noticeAndMsgid);
						break;

					// Unban command success..
					// Unban can also be used to cancel an active timeout.
					case 'untimeout_success':
					case 'unban_success':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnban' ], noticeAndNull);
						break;

					// Unban command failed..
					case 'usage_unban':
					case 'bad_unban_no_ban':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnban' ], noticeAndMsgid);
						break;

					// Delete command failed..
					case 'usage_delete':
					case 'bad_delete_message_error':
					case 'bad_delete_message_broadcaster':
					case 'bad_delete_message_mod':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseDeletemessage' ], noticeAndMsgid);
						break;

					// Unhost command failed..
					case 'usage_unhost':
					case 'not_hosting':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseUnhost' ], noticeAndMsgid);
						break;

					// Whisper command failed..
					case 'whisper_invalid_login':
					case 'whisper_invalid_self':
					case 'whisper_limit_per_min':
					case 'whisper_limit_per_sec':
					case 'whisper_restricted':
					case 'whisper_restricted_recipient':
						this.log.info(basicLog);
						this.emits([ 'notice', '_promiseWhisper' ], noticeAndMsgid);
						break;

					// Permission error..
					case 'no_permission':
					case 'msg_banned':
					case 'msg_room_not_found':
					case 'msg_channel_suspended':
					case 'tos_ban':
					case 'invalid_user':
						this.log.info(basicLog);
						this.emits([
							'notice',
							'_promiseBan',
							'_promiseClear',
							'_promiseUnban',
							'_promiseTimeout',
							'_promiseDeletemessage',
							'_promiseMods',
							'_promiseMod',
							'_promiseUnmod',
							'_promiseVips',
							'_promiseVip',
							'_promiseUnvip',
							'_promiseCommercial',
							'_promiseHost',
							'_promiseUnhost',
							'_promiseJoin',
							'_promisePart',
							'_promiseR9kbeta',
							'_promiseR9kbetaoff',
							'_promiseSlow',
							'_promiseSlowoff',
							'_promiseFollowers',
							'_promiseFollowersoff',
							'_promiseSubscribers',
							'_promiseSubscribersoff',
							'_promiseEmoteonly',
							'_promiseEmoteonlyoff',
							'_promiseWhisper'
						], [ noticeArr, [ msgid, channel ] ]);
						break;

					// Automod-related..
					case 'msg_rejected':
					case 'msg_rejected_mandatory':
						this.log.info(basicLog);
						this.emit('automod', channel, msgid, msg);
						break;

					// Unrecognized command..
					case 'unrecognized_cmd':
						this.log.info(basicLog);
						this.emit('notice', channel, msgid, msg);
						break;

					// Send the following msg-ids to the notice event listener..
					case 'cmds_available':
					case 'host_target_went_offline':
					case 'msg_censored_broadcaster':
					case 'msg_duplicate':
					case 'msg_emoteonly':
					case 'msg_verified_email':
					case 'msg_ratelimit':
					case 'msg_subsonly':
					case 'msg_timedout':
					case 'msg_bad_characters':
					case 'msg_channel_blocked':
					case 'msg_facebook':
					case 'msg_followersonly':
					case 'msg_followersonly_followed':
					case 'msg_followersonly_zero':
					case 'msg_slowmode':
					case 'msg_suspended':
					case 'no_help':
					case 'usage_disconnect':
					case 'usage_help':
					case 'usage_me':
					case 'unavailable_command':
						this.log.info(basicLog);
						this.emit('notice', channel, msgid, msg);
						break;

					// Ignore this because we are already listening to HOSTTARGET..
					case 'host_on':
					case 'host_off':
						break;

					default:
						if(msg.includes('Login unsuccessful') || msg.includes('Login authentication failed')) {
							this.wasCloseCalled = false;
							this.reconnect = false;
							this.reason = msg;
							this.log.error(this.reason);
							this.ws.close();
						}
						else if(msg.includes('Error logging in') || msg.includes('Improperly formatted auth')) {
							this.wasCloseCalled = false;
							this.reconnect = false;
							this.reason = msg;
							this.log.error(this.reason);
							this.ws.close();
						}
						else if(msg.includes('Invalid NICK')) {
							this.wasCloseCalled = false;
							this.reconnect = false;
							this.reason = 'Invalid NICK.';
							this.log.error(this.reason);
							this.ws.close();
						}
						else {
							this.log.warn(`Could not parse NOTICE from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
							this.emit('notice', channel, msgid, msg);
						}
						break;
				}
				break;
			}

			// Handle subanniversary / resub..
			case 'USERNOTICE': {
				const username = tags['display-name'] || tags['login'];
				const plan = tags['msg-param-sub-plan'] || '';
				const planName = _.unescapeIRC(_.get(tags['msg-param-sub-plan-name'], '')) || null;
				const prime = plan.includes('Prime');
				const methods = { prime, plan, planName };
				const streakMonths = ~~(tags['msg-param-streak-months'] || 0);
				const recipient = tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name'];
				const giftSubCount = ~~tags['msg-param-mass-gift-count'];
				tags['message-type'] = msgid;

				switch(msgid) {
					// Handle resub
					case 'resub':
						this.emits([ 'resub', 'subanniversary' ], [
							[ channel, username, streakMonths, msg, tags, methods ]
						]);
						break;

					// Handle sub
					case 'sub':
						this.emits([ 'subscription', 'sub' ], [
							[ channel, username, methods, msg, tags ]
						]);
						break;

					// Handle gift sub
					case 'subgift':
						this.emit('subgift', channel, username, streakMonths, recipient, methods, tags);
						break;

					// Handle anonymous gift sub
					// Need proof that this event occur
					case 'anonsubgift':
						this.emit('anonsubgift', channel, streakMonths, recipient, methods, tags);
						break;

					// Handle random gift subs
					case 'submysterygift':
						this.emit('submysterygift', channel, username, giftSubCount, methods, tags);
						break;

					// Handle anonymous random gift subs
					// Need proof that this event occur
					case 'anonsubmysterygift':
						this.emit('anonsubmysterygift', channel, giftSubCount, methods, tags);
						break;

					// Handle user upgrading from Prime to a normal tier sub
					case 'primepaidupgrade':
						this.emit('primepaidupgrade', channel, username, methods, tags);
						break;

					// Handle user upgrading from a gifted sub
					case 'giftpaidupgrade': {
						const sender = tags['msg-param-sender-name'] || tags['msg-param-sender-login'];
						this.emit('giftpaidupgrade', channel, username, sender, tags);
						break;
					}

					// Handle user upgrading from an anonymous gifted sub
					case 'anongiftpaidupgrade':
						this.emit('anongiftpaidupgrade', channel, username, tags);
						break;

					// Handle raid
					case 'raid': {
						const username = tags['msg-param-displayName'] || tags['msg-param-login'];
						const viewers = +tags['msg-param-viewerCount'];
						this.emit('raided', channel, username, viewers, tags);
						break;
					}
					// Handle ritual
					case 'ritual': {
						const ritualName = tags['msg-param-ritual-name'];
						switch(ritualName) {
							// Handle new chatter ritual
							case 'new_chatter':
								this.emit('newchatter', channel, username, tags, msg);
								break;
							// All unknown rituals should be passed through
							default:
								this.emit('ritual', ritualName, channel, username, tags, msg);
								break;
						}
						break;
					}
					// All other msgid events should be emitted under a usernotice event
					// until it comes up and needs to be added..
					default:
						this.emit('usernotice', msgid, channel, tags, msg);
						break;
				}
				break;
			}

			// Channel is now hosting another channel or exited host mode..
			case 'HOSTTARGET': {
				const msgSplit = msg.split(' ');
				const viewers = ~~msgSplit[1] || 0;
				// Stopped hosting..
				if(msgSplit[0] === '-') {
					this.log.info(`[${channel}] Exited host mode.`);
					this.emits([ 'unhost', '_promiseUnhost' ], [ [ channel, viewers ], [ null ] ]);
				}

				// Now hosting..
				else {
					this.log.info(`[${channel}] Now hosting ${msgSplit[0]} for ${viewers} viewer(s).`);
					this.emit('hosting', channel, msgSplit[0], viewers);
				}
				break;
			}

			// Someone has been timed out or chat has been cleared by a moderator..
			case 'CLEARCHAT':
				// User has been banned / timed out by a moderator..
				if(message.params.length > 1) {
					// Duration returns null if it's a ban, otherwise it's a timeout..
					const duration = _.get(message.tags['ban-duration'], null);

					if(duration === null) {
						this.log.info(`[${channel}] ${msg} has been banned.`);
						this.emit('ban', channel, msg, null, message.tags);
					}
					else {
						this.log.info(`[${channel}] ${msg} has been timed out for ${duration} seconds.`);
						this.emit('timeout', channel, msg, null, ~~duration, message.tags);
					}
				}

				// Chat was cleared by a moderator..
				else {
					this.log.info(`[${channel}] Chat was cleared by a moderator.`);
					this.emits([ 'clearchat', '_promiseClear' ], [ [ channel ], [ null ] ]);
				}
				break;

			// Someone's message has been deleted
			case 'CLEARMSG':
				if(message.params.length > 1) {
					const deletedMessage = msg;
					const username = tags['login'];
					tags['message-type'] = 'messagedeleted';

					this.log.info(`[${channel}] ${username}'s message has been deleted.`);
					this.emit('messagedeleted', channel, username, deletedMessage, tags);
				}
				break;

			// Received a reconnection request from the server..
			case 'RECONNECT':
				this.log.info('Received RECONNECT request from Twitch..');
				this.log.info(`Disconnecting and reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
				this.disconnect().catch(err => this.log.error(err));
				setTimeout(() => this.connect().catch(err => this.log.error(err)), this.reconnectTimer);
				break;

			// Received when joining a channel and every time you send a PRIVMSG to a channel.
			case 'USERSTATE':
				message.tags.username = this.username;

				// Add the client to the moderators of this room..
				if(message.tags['user-type'] === 'mod') {
					if(!this.moderators[channel]) {
						this.moderators[channel] = [];
					}
					if(!this.moderators[channel].includes(this.username)) {
						this.moderators[channel].push(this.username);
					}
				}

				// Logged in and username doesn't start with justinfan..
				if(!_.isJustinfan(this.getUsername()) && !this.userstate[channel]) {
					this.userstate[channel] = tags;
					this.lastJoined = channel;
					this.channels.push(channel);
					this.log.info(`Joined ${channel}`);
					this.emit('join', channel, _.username(this.getUsername()), true);
				}

				// Emote-sets has changed, update it..
				if(message.tags['emote-sets'] !== this.emotes) {
					this._updateEmoteset(message.tags['emote-sets']);
				}

				this.userstate[channel] = tags;
				break;

			// Describe non-channel-specific state informations..
			case 'GLOBALUSERSTATE':
				this.globaluserstate = tags;
				this.emit('globaluserstate', tags);

				// Received emote-sets..
				if(typeof message.tags['emote-sets'] !== 'undefined') {
					this._updateEmoteset(message.tags['emote-sets']);
				}
				break;

			// Received when joining a channel and every time one of the chat room settings, like slow mode, change.
			// The message on join contains all room settings.
			case 'ROOMSTATE':
				// We use this notice to know if we successfully joined a channel..
				if(_.channel(this.lastJoined) === channel) { this.emit('_promiseJoin', null, channel); }

				// Provide the channel name in the tags before emitting it..
				message.tags.channel = channel;
				this.emit('roomstate', channel, message.tags);

				if(!_.hasOwn(message.tags, 'subs-only')) {
					// Handle slow mode here instead of the slow_on/off notice..
					// This room is now in slow mode. You may send messages every slow_duration seconds.
					if(_.hasOwn(message.tags, 'slow')) {
						if(typeof message.tags.slow === 'boolean' && !message.tags.slow) {
							const disabled = [ channel, false, 0 ];
							this.log.info(`[${channel}] This room is no longer in slow mode.`);
							this.emits([ 'slow', 'slowmode', '_promiseSlowoff' ], [ disabled, disabled, [ null ] ]);
						}
						else {
							const seconds = ~~message.tags.slow;
							const enabled = [ channel, true, seconds ];
							this.log.info(`[${channel}] This room is now in slow mode.`);
							this.emits([ 'slow', 'slowmode', '_promiseSlow' ], [ enabled, enabled, [ null ] ]);
						}
					}

					// Handle followers only mode here instead of the followers_on/off notice..
					// This room is now in follower-only mode.
					// This room is now in <duration> followers-only mode.
					// This room is no longer in followers-only mode.
					// duration is in minutes (string)
					// -1 when /followersoff (string)
					// false when /followers with no duration (boolean)
					if(_.hasOwn(message.tags, 'followers-only')) {
						if(message.tags['followers-only'] === '-1') {
							const disabled = [ channel, false, 0 ];
							this.log.info(`[${channel}] This room is no longer in followers-only mode.`);
							this.emits([ 'followersonly', 'followersmode', '_promiseFollowersoff' ], [ disabled, disabled, [ null ] ]);
						}
						else {
							const minutes = ~~message.tags['followers-only'];
							const enabled = [ channel, true, minutes ];
							this.log.info(`[${channel}] This room is now in follower-only mode.`);
							this.emits([ 'followersonly', 'followersmode', '_promiseFollowers' ], [ enabled, enabled, [ null ] ]);
						}
					}
				}
				break;

			// Wrong cluster..
			case 'SERVERCHANGE':
				break;

			default:
				this.log.warn(`Could not parse message from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
				break;
		}
	}


	// Messages from jtv..
	else if(message.prefix === 'jtv') {
		switch(message.command) {
			case 'MODE':
				if(msg === '+o') {
					// Add username to the moderators..
					if(!this.moderators[channel]) {
						this.moderators[channel] = [];
					}
					if(!this.moderators[channel].includes(message.params[2])) {
						this.moderators[channel].push(message.params[2]);
					}

					this.emit('mod', channel, message.params[2]);
				}
				else if(msg === '-o') {
					// Remove username from the moderators..
					if(!this.moderators[channel]) {
						this.moderators[channel] = [];
					}
					this.moderators[channel].filter(value => value !== message.params[2]);

					this.emit('unmod', channel, message.params[2]);
				}
				break;

			default:
				this.log.warn(`Could not parse message from jtv:\n${JSON.stringify(message, null, 4)}`);
				break;
		}
	}


	// Anything else..
	else {
		switch(message.command) {
			case '353':
				this.emit('names', message.params[2], message.params[3].split(' '));
				break;

			case '366':
				break;

			// Someone has joined the channel..
			case 'JOIN': {
				const nick = message.prefix.split('!')[0];
				// Joined a channel as a justinfan (anonymous) user..
				if(_.isJustinfan(this.getUsername()) && this.username === nick) {
					this.lastJoined = channel;
					this.channels.push(channel);
					this.log.info(`Joined ${channel}`);
					this.emit('join', channel, nick, true);
				}

				// Someone else joined the channel, just emit the join event..
				if(this.username !== nick) {
					this.emit('join', channel, nick, false);
				}
				break;
			}

			// Someone has left the channel..
			case 'PART': {
				let isSelf = false;
				const nick = message.prefix.split('!')[0];
				// Client left a channel..
				if(this.username === nick) {
					isSelf = true;
					if(this.userstate[channel]) { delete this.userstate[channel]; }

					let index = this.channels.indexOf(channel);
					if(index !== -1) { this.channels.splice(index, 1); }

					index = this.opts.channels.indexOf(channel);
					if(index !== -1) { this.opts.channels.splice(index, 1); }

					this.log.info(`Left ${channel}`);
					this.emit('_promisePart', null);
				}

				// Client or someone else left the channel, emit the part event..
				this.emit('part', channel, nick, isSelf);
				break;
			}

			// Received a whisper..
			case 'WHISPER': {
				const nick = message.prefix.split('!')[0];
				this.log.info(`[WHISPER] <${nick}>: ${msg}`);

				// Update the tags to provide the username..
				if(!_.hasOwn(message.tags, 'username')) {
					message.tags.username = nick;
				}
				message.tags['message-type'] = 'whisper';

				const from = _.channel(message.tags.username);
				// Emit for both, whisper and message..
				this.emits([ 'whisper', 'message' ], [
					[ from, message.tags, msg, false ]
				]);
				break;
			}

			case 'PRIVMSG':
				// Add username (lowercase) to the tags..
				message.tags.username = message.prefix.split('!')[0];

				// Message from JTV..
				if(message.tags.username === 'jtv') {
					const name = _.username(msg.split(' ')[0]);
					const autohost = msg.includes('auto');
					// Someone is hosting the channel and the message contains how many viewers..
					if(msg.includes('hosting you for')) {
						const count = _.extractNumber(msg);

						this.emit('hosted', channel, name, count, autohost);
					}


					// Some is hosting the channel, but no viewer(s) count provided in the message..
					else if(msg.includes('hosting you')) {
						this.emit('hosted', channel, name, 0, autohost);
					}
				}

				else {
					const messagesLogLevel = _.get(this.opts.options.messagesLogLevel, 'info');

					// Message is an action (/me <message>)..
					const actionMessage = _.actionMessage(msg);
					message.tags['message-type'] = actionMessage ? 'action' : 'chat';
					msg = actionMessage ? actionMessage[1] : msg;
					// Check for Bits prior to actions message
					if(_.hasOwn(message.tags, 'bits')) {
						this.emit('cheer', channel, message.tags, msg);
					}
					else {
						//Handle Channel Point Redemptions (Require's Text Input)
						if(_.hasOwn(message.tags, 'msg-id')) {
							if(message.tags['msg-id'] === 'highlighted-message') {
								const rewardtype = message.tags['msg-id'];
								this.emit('redeem', channel, message.tags.username, rewardtype, message.tags, msg);
							}
							else if(message.tags['msg-id'] === 'skip-subs-mode-message') {
								const rewardtype = message.tags['msg-id'];
								this.emit('redeem', channel, message.tags.username, rewardtype, message.tags, msg);
							}
						}
						else if(_.hasOwn(message.tags, 'custom-reward-id')) {
							const rewardtype = message.tags['custom-reward-id'];
							this.emit('redeem', channel, message.tags.username, rewardtype, message.tags, msg);
						}
						if(actionMessage) {
							this.log[messagesLogLevel](`[${channel}] *<${message.tags.username}>: ${msg}`);
							this.emits([ 'action', 'message' ], [
								[ channel, message.tags, msg, false ]
							]);
						}

						// Message is a regular chat message..
						else {
							this.log[messagesLogLevel](`[${channel}] <${message.tags.username}>: ${msg}`);
							this.emits([ 'chat', 'message' ], [
								[ channel, message.tags, msg, false ]
							]);
						}
					}
				}
				break;

			default:
				this.log.warn(`Could not parse message:\n${JSON.stringify(message, null, 4)}`);
				break;
		}
	}
};
// Connect to server..
client.prototype.connect = function connect() {
	return new Promise((resolve, reject) => {
		this.server = _.get(this.opts.connection.server, 'irc-ws.chat.twitch.tv');
		this.port = _.get(this.opts.connection.port, 80);

		// Override port if using a secure connection..
		if(this.secure) { this.port = 443; }
		if(this.port === 443) { this.secure = true; }

		this.reconnectTimer = this.reconnectTimer * this.reconnectDecay;
		if(this.reconnectTimer >= this.maxReconnectInterval) {
			this.reconnectTimer = this.maxReconnectInterval;
		}

		// Connect to server from configuration..
		this._openConnection();
		this.once('_promiseConnect', err => {
			if(!err) { resolve([ this.server, ~~this.port ]); }
			else { reject(err); }
		});
	});
};
// Open a connection..
client.prototype._openConnection = function _openConnection() {
	const url = `${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`;
	/** @type {import('ws').ClientOptions} */
	const connectionOptions = {};
	if('agent' in this.opts.connection) {
		connectionOptions.agent = this.opts.connection.agent;
	}
	this.ws = new _WebSocket(url, 'irc', connectionOptions);

	this.ws.onmessage = this._onMessage.bind(this);
	this.ws.onerror = this._onError.bind(this);
	this.ws.onclose = this._onClose.bind(this);
	this.ws.onopen = this._onOpen.bind(this);
};
// Called when the WebSocket connection's readyState changes to OPEN.
// Indicates that the connection is ready to send and receive data..
client.prototype._onOpen = function _onOpen() {
	if(!this._isConnected()) {
		return;
	}

	// Emitting "connecting" event..
	this.log.info(`Connecting to ${this.server} on port ${this.port}..`);
	this.emit('connecting', this.server, ~~this.port);

	this.username = _.get(this.opts.identity.username, _.justinfan());
	this._getToken()
	.then(token => {
		const password = _.password(token);

		// Emitting "logon" event..
		this.log.info('Sending authentication to server..');
		this.emit('logon');

		let caps = 'twitch.tv/tags twitch.tv/commands';
		if(!this._skipMembership) {
			caps += ' twitch.tv/membership';
		}
		this.ws.send('CAP REQ :' + caps);

		// Authentication..
		if(password) {
			this.ws.send(`PASS ${password}`);
		}
		else if(_.isJustinfan(this.username)) {
			this.ws.send('PASS SCHMOOPIIE');
		}
		this.ws.send(`NICK ${this.username}`);
	})
	.catch(err => {
		this.emits([ '_promiseConnect', 'disconnected' ], [ [ err ], [ 'Could not get a token.' ] ]);
	});
};
// Fetches a token from the option.
client.prototype._getToken = function _getToken() {
	const passwordOption = this.opts.identity.password;
	let password;
	if(typeof passwordOption === 'function') {
		password = passwordOption();
		if(password instanceof Promise) {
			return password;
		}
		return Promise.resolve(password);
	}
	return Promise.resolve(passwordOption);
};
// Called when a message is received from the server..
client.prototype._onMessage = function _onMessage(event) {
	const parts = event.data.trim().split('\r\n');

	parts.forEach(str => {
		const msg = parse.msg(str);
		if(msg) {
			this.handleMessage(msg);
		}
	});
};
// Called when an error occurs..
client.prototype._onError = function _onError() {
	this.moderators = {};
	this.userstate = {};
	this.globaluserstate = {};

	// Stop the internal ping timeout check interval..
	clearInterval(this.pingLoop);
	clearTimeout(this.pingTimeout);
	clearTimeout(this._updateEmotesetsTimer);

	this.reason = this.ws === null ? 'Connection closed.' : 'Unable to connect.';

	this.emits([ '_promiseConnect', 'disconnected' ], [ [ this.reason ] ]);

	// Reconnect to server..
	if(this.reconnect && this.reconnections === this.maxReconnectAttempts) {
		this.emit('maxreconnect');
		this.log.error('Maximum reconnection attempts reached.');
	}
	if(this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
		this.reconnecting = true;
		this.reconnections = this.reconnections + 1;
		this.log.error(`Reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
		this.emit('reconnect');
		setTimeout(() => {
			this.reconnecting = false;
			this.connect().catch(err => this.log.error(err));
		}, this.reconnectTimer);
	}

	this.ws = null;
};
// Called when the WebSocket connection's readyState changes to CLOSED..
client.prototype._onClose = function _onClose() {
	this.moderators = {};
	this.userstate = {};
	this.globaluserstate = {};

	// Stop the internal ping timeout check interval..
	clearInterval(this.pingLoop);
	clearTimeout(this.pingTimeout);
	clearTimeout(this._updateEmotesetsTimer);

	// User called .disconnect(), don't try to reconnect.
	if(this.wasCloseCalled) {
		this.wasCloseCalled = false;
		this.reason = 'Connection closed.';
		this.log.info(this.reason);
		this.emits([ '_promiseConnect', '_promiseDisconnect', 'disconnected' ], [ [ this.reason ], [ null ], [ this.reason ] ]);
	}

	// Got disconnected from server..
	else {
		this.emits([ '_promiseConnect', 'disconnected' ], [ [ this.reason ] ]);

		// Reconnect to server..
		if(this.reconnect && this.reconnections === this.maxReconnectAttempts) {
			this.emit('maxreconnect');
			this.log.error('Maximum reconnection attempts reached.');
		}
		if(this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
			this.reconnecting = true;
			this.reconnections = this.reconnections + 1;
			this.log.error(`Could not connect to server. Reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
			this.emit('reconnect');
			setTimeout(() => {
				this.reconnecting = false;
				this.connect().catch(err => this.log.error(err));
			}, this.reconnectTimer);
		}
	}

	this.ws = null;
};
// Minimum of 600ms for command promises, if current latency exceeds, add 100ms to it to make sure it doesn't get timed out..
client.prototype._getPromiseDelay = function _getPromiseDelay() {
	if(this.currentLatency <= 600) { return 600; }
	else { return this.currentLatency + 100; }
};
// Send command to server or channel..
client.prototype._sendCommand = function _sendCommand(delay, channel, command, fn) {
	// Race promise against delay..
	return new Promise((resolve, reject) => {
		// Make sure the socket is opened..
		if(!this._isConnected()) {
			// Disconnected from server..
			return reject('Not connected to server.');
		}
		else if(delay === null || typeof delay === 'number') {
			if(delay === null) {
				delay = this._getPromiseDelay();
			}
			_.promiseDelay(delay).then(() => reject('No response from Twitch.'));
		}

		// Executing a command on a channel..
		if(channel !== null) {
			const chan = _.channel(channel);
			this.log.info(`[${chan}] Executing command: ${command}`);
			this.ws.send(`PRIVMSG ${chan} :${command}`);
		}
		// Executing a raw command..
		else {
			this.log.info(`Executing command: ${command}`);
			this.ws.send(command);
		}
		if(typeof fn === 'function') {
			fn(resolve, reject);
		}
		else {
			resolve();
		}
	});
};
// Send a message to channel..
client.prototype._sendMessage = function _sendMessage(delay, channel, message, fn) {
	// Promise a result..
	return new Promise((resolve, reject) => {
		// Make sure the socket is opened and not logged in as a justinfan user..
		if(!this._isConnected()) {
			return reject('Not connected to server.');
		}
		else if(_.isJustinfan(this.getUsername())) {
			return reject('Cannot send anonymous messages.');
		}
		const chan = _.channel(channel);
		if(!this.userstate[chan]) { this.userstate[chan] = {}; }

		// Split long lines otherwise they will be eaten by the server..
		if(message.length >= 500) {
			const msg = _.splitLine(message, 500);
			message = msg[0];

			setTimeout(() => {
				this._sendMessage(delay, channel, msg[1], () => {});
			}, 350);
		}

		this.ws.send(`PRIVMSG ${chan} :${message}`);

		const emotes = {};

		// Parse regex and string emotes..
		Object.keys(this.emotesets).forEach(id => this.emotesets[id].forEach(emote => {
			const emoteFunc = _.isRegex(emote.code) ? parse.emoteRegex : parse.emoteString;
			return emoteFunc(message, emote.code, emote.id, emotes);
		})
		);

		// Merge userstate with parsed emotes..
		const userstate = Object.assign(
			this.userstate[chan],
			parse.emotes({ emotes: parse.transformEmotes(emotes) || null })
		);

		const messagesLogLevel = _.get(this.opts.options.messagesLogLevel, 'info');

		// Message is an action (/me <message>)..
		const actionMessage = _.actionMessage(message);
		if(actionMessage) {
			userstate['message-type'] = 'action';
			this.log[messagesLogLevel](`[${chan}] *<${this.getUsername()}>: ${actionMessage[1]}`);
			this.emits([ 'action', 'message' ], [
				[ chan, userstate, actionMessage[1], true ]
			]);
		}


		// Message is a regular chat message..
		else {
			userstate['message-type'] = 'chat';
			this.log[messagesLogLevel](`[${chan}] <${this.getUsername()}>: ${message}`);
			this.emits([ 'chat', 'message' ], [
				[ chan, userstate, message, true ]
			]);
		}
		if(typeof fn === 'function') {
			fn(resolve, reject);
		}
		else {
			resolve();
		}
	});
};
// Grab the emote-sets object from the API..
client.prototype._updateEmoteset = function _updateEmoteset(sets) {
	let setsChanges = sets !== undefined;
	if(setsChanges) {
		if(sets === this.emotes) {
			setsChanges = false;
		}
		else {
			this.emotes = sets;
		}
	}
	if(this._skipUpdatingEmotesets) {
		if(setsChanges) {
			this.emit('emotesets', sets, {});
		}
		return;
	}
	const setEmotesetTimer = () => {
		if(this._updateEmotesetsTimerDelay > 0) {
			clearTimeout(this._updateEmotesetsTimer);
			this._updateEmotesetsTimer = setTimeout(() => this._updateEmoteset(sets), this._updateEmotesetsTimerDelay);
		}
	};
	this._getToken()
	.then(token => {
		const url = `https://api.twitch.tv/kraken/chat/emoticon_images?emotesets=${sets}`;
		/** @type {import('node-fetch').RequestInit} */
		const fetchOptions = {};
		if('fetchAgent' in this.opts.connection) {
			fetchOptions.agent = this.opts.connection.fetchAgent;
		}
		/** @type {import('node-fetch').Response} */
		return _fetch(url, {
			...fetchOptions,
			headers: {
				'Accept': 'application/vnd.twitchtv.v5+json',
				'Authorization': `OAuth ${_.token(token)}`,
				'Client-ID': this.clientId
			}
		});
	})
	.then(res => res.json())
	.then(data => {
		this.emotesets = data.emoticon_sets || {};
		this.emit('emotesets', sets, this.emotesets);
		setEmotesetTimer();
	})
	.catch(() => setEmotesetTimer());
};
// Get current username..
client.prototype.getUsername = function getUsername() {
	return this.username;
};
// Get current options..
client.prototype.getOptions = function getOptions() {
	return this.opts;
};
// Get current channels..
client.prototype.getChannels = function getChannels() {
	return this.channels;
};
// Check if username is a moderator on a channel..
client.prototype.isMod = function isMod(channel, username) {
	const chan = _.channel(channel);
	if(!this.moderators[chan]) { this.moderators[chan] = []; }
	return this.moderators[chan].includes(_.username(username));
};
// Get readyState..
client.prototype.readyState = function readyState() {
	if(this.ws === null) { return 'CLOSED'; }
	return [ 'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED' ][this.ws.readyState];
};
// Determine if the client has a WebSocket and it's open..
client.prototype._isConnected = function _isConnected() {
	return this.ws !== null && this.ws.readyState === 1;
};
// Disconnect from server..
client.prototype.disconnect = function disconnect() {
	return new Promise((resolve, reject) => {
		if(this.ws !== null && this.ws.readyState !== 3) {
			this.wasCloseCalled = true;
			this.log.info('Disconnecting from server..');
			this.ws.close();
			this.once('_promiseDisconnect', () => resolve([ this.server, ~~this.port ]));
		}
		else {
			this.log.error('Cannot disconnect from server. Socket is not opened or connection is already closing.');
			reject('Cannot disconnect from server. Socket is not opened or connection is already closing.');
		}
	});
};
client.prototype.off = client.prototype.removeListener;

// Expose everything, for browser and Node..
if( true && module.exports) {
	module.exports = client;
}
if(typeof window !== 'undefined') {
	window.tmi = {
		client,
		Client: client
	};
}


/***/ }),

/***/ "./node_modules/tmi.js/lib/commands.js":
/*!*********************************************!*\
  !*** ./node_modules/tmi.js/lib/commands.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const _ = __webpack_require__(/*! ./utils */ "./node_modules/tmi.js/lib/utils.js");

// Enable followers-only mode on a channel..
function followersonly(channel, minutes) {
	channel = _.channel(channel);
	minutes = _.get(minutes, 30);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, `/followers ${minutes}`, (resolve, reject) => {
		// Received _promiseFollowers event, resolve or reject..
		this.once('_promiseFollowers', err => {
			if(!err) { resolve([ channel, ~~minutes ]); }
			else { reject(err); }
		});
	});
}

// Disable followers-only mode on a channel..
function followersonlyoff(channel) {
	channel = _.channel(channel);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, '/followersoff', (resolve, reject) => {
		// Received _promiseFollowersoff event, resolve or reject..
		this.once('_promiseFollowersoff', err => {
			if(!err) { resolve([ channel ]); }
			else { reject(err); }
		});
	});
}

// Leave a channel..
function part(channel) {
	channel = _.channel(channel);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, null, `PART ${channel}`, (resolve, reject) => {
		// Received _promisePart event, resolve or reject..
		this.once('_promisePart', err => {
			if(!err) { resolve([ channel ]); }
			else { reject(err); }
		});
	});
}

// Enable R9KBeta mode on a channel..
function r9kbeta(channel) {
	channel = _.channel(channel);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, '/r9kbeta', (resolve, reject) => {
		// Received _promiseR9kbeta event, resolve or reject..
		this.once('_promiseR9kbeta', err => {
			if(!err) { resolve([ channel ]); }
			else { reject(err); }
		});
	});
}

// Disable R9KBeta mode on a channel..
function r9kbetaoff(channel) {
	channel = _.channel(channel);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, '/r9kbetaoff', (resolve, reject) => {
		// Received _promiseR9kbetaoff event, resolve or reject..
		this.once('_promiseR9kbetaoff', err => {
			if(!err) { resolve([ channel ]); }
			else { reject(err); }
		});
	});
}

// Enable slow mode on a channel..
function slow(channel, seconds) {
	channel = _.channel(channel);
	seconds = _.get(seconds, 300);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, `/slow ${seconds}`, (resolve, reject) => {
		// Received _promiseSlow event, resolve or reject..
		this.once('_promiseSlow', err => {
			if(!err) { resolve([ channel, ~~seconds ]); }
			else { reject(err); }
		});
	});
}

// Disable slow mode on a channel..
function slowoff(channel) {
	channel = _.channel(channel);
	// Send the command to the server and race the Promise against a delay..
	return this._sendCommand(null, channel, '/slowoff', (resolve, reject) => {
		// Received _promiseSlowoff event, resolve or reject..
		this.once('_promiseSlowoff', err => {
			if(!err) { resolve([ channel ]); }
			else { reject(err); }
		});
	});
}

module.exports = {
	// Send action message (/me <message>) on a channel..
	action(channel, message) {
		channel = _.channel(channel);
		message = `\u0001ACTION ${message}\u0001`;
		// Send the command to the server and race the Promise against a delay..
		return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, _reject) => {
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			resolve([ channel, message ]);
		});
	},

	// Ban username on channel..
	ban(channel, username, reason) {
		channel = _.channel(channel);
		username = _.username(username);
		reason = _.get(reason, '');
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/ban ${username} ${reason}`, (resolve, reject) => {
			// Received _promiseBan event, resolve or reject..
			this.once('_promiseBan', err => {
				if(!err) { resolve([ channel, username, reason ]); }
				else { reject(err); }
			});
		});
	},

	// Clear all messages on a channel..
	clear(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/clear', (resolve, reject) => {
			// Received _promiseClear event, resolve or reject..
			this.once('_promiseClear', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Change the color of your username..
	color(channel, newColor) {
		newColor = _.get(newColor, channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, '#tmijs', `/color ${newColor}`, (resolve, reject) => {
			// Received _promiseColor event, resolve or reject..
			this.once('_promiseColor', err => {
				if(!err) { resolve([ newColor ]); }
				else { reject(err); }
			});
		});
	},

	// Run commercial on a channel for X seconds..
	commercial(channel, seconds) {
		channel = _.channel(channel);
		seconds = _.get(seconds, 30);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/commercial ${seconds}`, (resolve, reject) => {
			// Received _promiseCommercial event, resolve or reject..
			this.once('_promiseCommercial', err => {
				if(!err) { resolve([ channel, ~~seconds ]); }
				else { reject(err); }
			});
		});
	},
	
	// Delete a specific message on a channel
	deletemessage(channel, messageUUID) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/delete ${messageUUID}`, (resolve, reject) => {
			// Received _promiseDeletemessage event, resolve or reject..
			this.once('_promiseDeletemessage', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Enable emote-only mode on a channel..
	emoteonly(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/emoteonly', (resolve, reject) => {
			// Received _promiseEmoteonly event, resolve or reject..
			this.once('_promiseEmoteonly', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Disable emote-only mode on a channel..
	emoteonlyoff(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/emoteonlyoff', (resolve, reject) => {
			// Received _promiseEmoteonlyoff event, resolve or reject..
			this.once('_promiseEmoteonlyoff', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Enable followers-only mode on a channel..
	followersonly,

	// Alias for followersonly()..
	followersmode: followersonly,

	// Disable followers-only mode on a channel..
	followersonlyoff,

	// Alias for followersonlyoff()..
	followersmodeoff: followersonlyoff,

	// Host a channel..
	host(channel, target) {
		channel = _.channel(channel);
		target = _.username(target);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(2000, channel, `/host ${target}`, (resolve, reject) => {
			// Received _promiseHost event, resolve or reject..
			this.once('_promiseHost', (err, remaining) => {
				if(!err) { resolve([ channel, target, ~~remaining ]); }
				else { reject(err); }
			});
		});
	},

	// Join a channel..
	join(channel) {
		channel = _.channel(channel);
		// Send the command to the server ..
		return this._sendCommand(undefined, null, `JOIN ${channel}`, (resolve, reject) => {
			const eventName = '_promiseJoin';
			let hasFulfilled = false;
			const listener = (err, joinedChannel) => {
				if(channel === _.channel(joinedChannel)) {
					// Received _promiseJoin event for the target channel, resolve or reject..
					this.removeListener(eventName, listener);
					hasFulfilled = true;
					if(!err) { resolve([ channel ]); }
					else { reject(err); }
				}
			};
			this.on(eventName, listener);
			// Race the Promise against a delay..
			const delay = this._getPromiseDelay();
			_.promiseDelay(delay).then(() => {
				if(!hasFulfilled) {
					this.emit(eventName, 'No response from Twitch.', channel);
				}
			});
		});
	},

	// Mod username on channel..
	mod(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/mod ${username}`, (resolve, reject) => {
			// Received _promiseMod event, resolve or reject..
			this.once('_promiseMod', err => {
				if(!err) { resolve([ channel, username ]); }
				else { reject(err); }
			});
		});
	},

	// Get list of mods on a channel..
	mods(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/mods', (resolve, reject) => {
			// Received _promiseMods event, resolve or reject..
			this.once('_promiseMods', (err, mods) => {
				if(!err) {
					// Update the internal list of moderators..
					mods.forEach(username => {
						if(!this.moderators[channel]) { this.moderators[channel] = []; }
						if(!this.moderators[channel].includes(username)) { this.moderators[channel].push(username); }
					});
					resolve(mods);
				}
				else { reject(err); }
			});
		});
	},

	// Leave a channel..
	part,

	// Alias for part()..
	leave: part,

	// Send a ping to the server..
	ping() {
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, null, 'PING', (resolve, _reject) => {
			// Update the internal ping timeout check interval..
			this.latency = new Date();
			this.pingTimeout = setTimeout(() => {
				if(this.ws !== null) {
					this.wasCloseCalled = false;
					this.log.error('Ping timeout.');
					this.ws.close();

					clearInterval(this.pingLoop);
					clearTimeout(this.pingTimeout);
				}
			}, _.get(this.opts.connection.timeout, 9999));

			// Received _promisePing event, resolve or reject..
			this.once('_promisePing', latency => resolve([ parseFloat(latency) ]));
		});
	},

	// Enable R9KBeta mode on a channel..
	r9kbeta,

	// Alias for r9kbeta()..
	r9kmode: r9kbeta,

	// Disable R9KBeta mode on a channel..
	r9kbetaoff,

	// Alias for r9kbetaoff()..
	r9kmodeoff: r9kbetaoff,

	// Send a raw message to the server..
	raw(message) {
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, null, message, (resolve, _reject) => {
			resolve([ message ]);
		});
	},

	// Send a message on a channel..
	say(channel, message) {
		channel = _.channel(channel);

		if((message.startsWith('.') && !message.startsWith('..')) || message.startsWith('/') || message.startsWith('\\')) {
			// Check if the message is an action message..
			if(message.substr(1, 3) === 'me ') {
				return this.action(channel, message.substr(4));
			}
			else {
				// Send the command to the server and race the Promise against a delay..
				return this._sendCommand(null, channel, message, (resolve, _reject) => {
					// At this time, there is no possible way to detect if a message has been sent has been eaten
					// by the server, so we can only resolve the Promise.
					resolve([ channel, message ]);
				});
			}
		}
		// Send the command to the server and race the Promise against a delay..
		return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, _reject) => {
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			resolve([ channel, message ]);
		});
	},

	// Enable slow mode on a channel..
	slow,

	// Alias for slow()..
	slowmode: slow,

	// Disable slow mode on a channel..
	slowoff,

	// Alias for slowoff()..
	slowmodeoff: slowoff,

	// Enable subscribers mode on a channel..
	subscribers(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/subscribers', (resolve, reject) => {
			// Received _promiseSubscribers event, resolve or reject..
			this.once('_promiseSubscribers', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Disable subscribers mode on a channel..
	subscribersoff(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/subscribersoff', (resolve, reject) => {
			// Received _promiseSubscribersoff event, resolve or reject..
			this.once('_promiseSubscribersoff', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Timeout username on channel for X seconds..
	timeout(channel, username, seconds, reason) {
		channel = _.channel(channel);
		username = _.username(username);

		if(seconds !== null && !_.isInteger(seconds)) {
			reason = seconds;
			seconds = 300;
		}

		seconds = _.get(seconds, 300);
		reason = _.get(reason, '');
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/timeout ${username} ${seconds} ${reason}`, (resolve, reject) => {
			// Received _promiseTimeout event, resolve or reject..
			this.once('_promiseTimeout', err => {
				if(!err) { resolve([ channel, username, ~~seconds, reason ]); }
				else { reject(err); }
			});
		});
	},

	// Unban username on channel..
	unban(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/unban ${username}`, (resolve, reject) => {
			// Received _promiseUnban event, resolve or reject..
			this.once('_promiseUnban', err => {
				if(!err) { resolve([ channel, username ]); }
				else { reject(err); }
			});
		});
	},

	// End the current hosting..
	unhost(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(2000, channel, '/unhost', (resolve, reject) => {
			// Received _promiseUnhost event, resolve or reject..
			this.once('_promiseUnhost', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Unmod username on channel..
	unmod(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/unmod ${username}`, (resolve, reject) => {
			// Received _promiseUnmod event, resolve or reject..
			this.once('_promiseUnmod', err => {
				if(!err) { resolve([ channel, username ]); }
				else { reject(err); }
			});
		});
	},

	// Unvip username on channel..
	unvip(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/unvip ${username}`, (resolve, reject) => {
			// Received _promiseUnvip event, resolve or reject..
			this.once('_promiseUnvip', err => {
				if(!err) { resolve([ channel, username ]); }
				else { reject(err); }
			});
		});
	},

	// Add username to VIP list on channel..
	vip(channel, username) {
		channel = _.channel(channel);
		username = _.username(username);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, `/vip ${username}`, (resolve, reject) => {
			// Received _promiseVip event, resolve or reject..
			this.once('_promiseVip', err => {
				if(!err) { resolve([ channel, username ]); }
				else { reject(err); }
			});
		});
	},

	// Get list of VIPs on a channel..
	vips(channel) {
		channel = _.channel(channel);
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, channel, '/vips', (resolve, reject) => {
			// Received _promiseVips event, resolve or reject..
			this.once('_promiseVips', (err, vips) => {
				if(!err) { resolve(vips); }
				else { reject(err); }
			});
		});
	},

	// Send an whisper message to a user..
	whisper(username, message) {
		username = _.username(username);

		// The server will not send a whisper to the account that sent it.
		if(username === this.getUsername()) {
			return Promise.reject('Cannot send a whisper to the same account.');
		}
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, '#tmijs', `/w ${username} ${message}`, (_resolve, reject) => {
			this.once('_promiseWhisper', err => {
				if (err) { reject(err); }
			});
		}).catch(err => {
			// Either an "actual" error occured or the timeout triggered
			// the latter means no errors have occured and we can resolve
			// else just elevate the error
			if(err && typeof err === 'string' && err.indexOf('No response from Twitch.') !== 0) {
				throw err;
			}
			const from = _.channel(username);
			const userstate = Object.assign({
				'message-type': 'whisper',
				'message-id': null,
				'thread-id': null,
				username: this.getUsername()
			}, this.globaluserstate);

			// Emit for both, whisper and message..
			this.emits([ 'whisper', 'message' ], [
				[ from, userstate, message, true ],
				[ from, userstate, message, true ]
			]);
			return [ username, message ];
		});
	}
};


/***/ }),

/***/ "./node_modules/tmi.js/lib/events.js":
/*!*******************************************!*\
  !*** ./node_modules/tmi.js/lib/events.js ***!
  \*******************************************/
/***/ ((module) => {

/* istanbul ignore file */
/* eslint-disable */
/*
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function EventEmitter() {
	this._events = this._events || {};
	this._maxListeners = this._maxListeners || undefined;
}

module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
	if (!isNumber(n) || n < 0 || isNaN(n)) {
		throw TypeError("n must be a positive number");
	}

	this._maxListeners = n;

	return this;
};

EventEmitter.prototype.emit = function(type) {
	var er, handler, len, args, i, listeners;

	if (!this._events) { this._events = {}; }

	// If there is no 'error' event listener then throw.
	if (type === "error") {
		if (!this._events.error || (isObject(this._events.error) && !this._events.error.length)) {
			er = arguments[1];
			if (er instanceof Error) { throw er; }
			throw TypeError("Uncaught, unspecified \"error\" event.");
		}
	}

	handler = this._events[type];

	if (isUndefined(handler)) { return false; }

	if (isFunction(handler)) {
		switch (arguments.length) {
			// fast cases
			case 1:
				handler.call(this);
				break;
			case 2:
				handler.call(this, arguments[1]);
				break;
			case 3:
				handler.call(this, arguments[1], arguments[2]);
				break;
				// slower
			default:
				args = Array.prototype.slice.call(arguments, 1);
				handler.apply(this, args);
		}
	} else if (isObject(handler)) {
		args = Array.prototype.slice.call(arguments, 1);
		listeners = handler.slice();
		len = listeners.length;
		for (i = 0; i < len; i++) { listeners[i].apply(this, args); }
	}

	return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
	var m;

	if (!isFunction(listener)) { throw TypeError("listener must be a function"); }

	if (!this._events) { this._events = {}; }

	// To avoid recursion in the case that type === "newListener"! Before
	// adding it to the listeners, first emit "newListener".
	if (this._events.newListener) {
		this.emit("newListener", type, isFunction(listener.listener) ? listener.listener : listener);
	}

	// Optimize the case of one listener. Don't need the extra array object.
	if (!this._events[type]) { this._events[type] = listener; }
	// If we've already got an array, just append.
	else if (isObject(this._events[type])) { this._events[type].push(listener); }
	// Adding the second element, need to change to array.
	else { this._events[type] = [this._events[type], listener]; }

	// Check for listener leak
	if (isObject(this._events[type]) && !this._events[type].warned) {
		if (!isUndefined(this._maxListeners)) {
			m = this._maxListeners;
		} else {
			m = EventEmitter.defaultMaxListeners;
		}

		if (m && m > 0 && this._events[type].length > m) {
			this._events[type].warned = true;
			console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[type].length);
			// Not supported in IE 10
			if (typeof console.trace === "function") {
				console.trace();
			}
		}
	}

	return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

// Modified to support multiple calls..
EventEmitter.prototype.once = function(type, listener) {
	if (!isFunction(listener)) { throw TypeError("listener must be a function"); }

	var fired = false;

	if (this._events.hasOwnProperty(type) && type.charAt(0) === "_") {
		var count = 1;
		var searchFor = type;

		for (var k in this._events){
			if (this._events.hasOwnProperty(k) && k.startsWith(searchFor)) {
				count++;
			}
		}
		type = type + count;
	}

	function g() {
		if (type.charAt(0) === "_" && !isNaN(type.substr(type.length - 1))) {
			type = type.substring(0, type.length - 1);
		}
		this.removeListener(type, g);

		if (!fired) {
			fired = true;
			listener.apply(this, arguments);
		}
	}

	g.listener = listener;
	this.on(type, g);

	return this;
};

// Emits a "removeListener" event if the listener was removed..
// Modified to support multiple calls from .once()..
EventEmitter.prototype.removeListener = function(type, listener) {
	var list, position, length, i;

	if (!isFunction(listener)) { throw TypeError("listener must be a function"); }

	if (!this._events || !this._events[type]) { return this; }

	list = this._events[type];
	length = list.length;
	position = -1;
	if (list === listener || (isFunction(list.listener) && list.listener === listener)) {
		delete this._events[type];

		if (this._events.hasOwnProperty(type + "2") && type.charAt(0) === "_") {
			var searchFor = type;
			for (var k in this._events){
				if (this._events.hasOwnProperty(k) && k.startsWith(searchFor)) {
					if (!isNaN(parseInt(k.substr(k.length - 1)))) {
						this._events[type + parseInt(k.substr(k.length - 1) - 1)] = this._events[k];
						delete this._events[k];
					}
				}
			}

			this._events[type] = this._events[type + "1"];
			delete this._events[type + "1"];
		}
		if (this._events.removeListener) { this.emit("removeListener", type, listener); }
	}
	else if (isObject(list)) {
		for (i = length; i-- > 0;) {
			if (list[i] === listener ||
				(list[i].listener && list[i].listener === listener)) {
				position = i;
				break;
			}
		}

		if (position < 0) { return this; }

		if (list.length === 1) {
			list.length = 0;
			delete this._events[type];
		}
		else { list.splice(position, 1); }

		if (this._events.removeListener) { this.emit("removeListener", type, listener); }
	}

	return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
	var key, listeners;

	if (!this._events) { return this; }

	// not listening for removeListener, no need to emit
	if (!this._events.removeListener) {
		if (arguments.length === 0) { this._events = {}; }
		else if (this._events[type]) { delete this._events[type]; }
		return this;
	}

	// emit removeListener for all listeners on all events
	if (arguments.length === 0) {
		for (key in this._events) {
			if (key === "removeListener") { continue; }
			this.removeAllListeners(key);
		}
		this.removeAllListeners("removeListener");
		this._events = {};
		return this;
	}

	listeners = this._events[type];

	if (isFunction(listeners)) { this.removeListener(type, listeners); }
	else if (listeners) { while (listeners.length) { this.removeListener(type, listeners[listeners.length - 1]); } }
	delete this._events[type];

	return this;
};

EventEmitter.prototype.listeners = function(type) {
	var ret;
	if (!this._events || !this._events[type]) { ret = []; }
	else if (isFunction(this._events[type])) { ret = [this._events[type]]; }
	else { ret = this._events[type].slice(); }
	return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
	if (this._events) {
		var evlistener = this._events[type];

		if (isFunction(evlistener)) { return 1; }
		else if (evlistener) { return evlistener.length; }
	}
	return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
	return emitter.listenerCount(type);
};

function isFunction(arg) {
	return typeof arg === "function";
}

function isNumber(arg) {
	return typeof arg === "number";
}

function isObject(arg) {
	return typeof arg === "object" && arg !== null;
}

function isUndefined(arg) {
	return arg === void 0;
}


/***/ }),

/***/ "./node_modules/tmi.js/lib/logger.js":
/*!*******************************************!*\
  !*** ./node_modules/tmi.js/lib/logger.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const _ = __webpack_require__(/*! ./utils */ "./node_modules/tmi.js/lib/utils.js");

let currentLevel = 'info';
const levels = { 'trace': 0, 'debug': 1, 'info': 2, 'warn': 3, 'error': 4, 'fatal': 5 };

// Logger implementation..
function log(level) {
	// Return a console message depending on the logging level..
	return function(message) {
		if(levels[level] >= levels[currentLevel]) {
			console.log(`[${_.formatDate(new Date())}] ${level}: ${message}`);
		}
	};
}

module.exports = {
	// Change the current logging level..
	setLevel(level) {
		currentLevel = level;
	},
	trace: log('trace'),
	debug: log('debug'),
	info: log('info'),
	warn: log('warn'),
	error: log('error'),
	fatal: log('fatal')
};


/***/ }),

/***/ "./node_modules/tmi.js/lib/parser.js":
/*!*******************************************!*\
  !*** ./node_modules/tmi.js/lib/parser.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
	Copyright (c) 2013-2015, Fionn Kelleher All rights reserved.

	Redistribution and use in source and binary forms, with or without modification,
	are permitted provided that the following conditions are met:

		Redistributions of source code must retain the above copyright notice,
		this list of conditions and the following disclaimer.

		Redistributions in binary form must reproduce the above copyright notice,
		this list of conditions and the following disclaimer in the documentation and/or other materials
		provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
	IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
	INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
	OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
	ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
	OF SUCH DAMAGE.
*/
const _ = __webpack_require__(/*! ./utils */ "./node_modules/tmi.js/lib/utils.js");
const nonspaceRegex = /\S+/g;

function parseComplexTag(tags, tagKey, splA = ',', splB = '/', splC) {
	const raw = tags[tagKey];
	
	if(raw === undefined) {
		return tags;
	}

	const tagIsString = typeof raw === 'string';
	tags[tagKey + '-raw'] = tagIsString ? raw : null;

	if(raw === true) {
		tags[tagKey] = null;
		return tags;
	}

	tags[tagKey] = {};

	if(tagIsString) {
		const spl = raw.split(splA);

		for (let i = 0; i < spl.length; i++) {
			const parts = spl[i].split(splB);
			let val = parts[1];
			if(splC !== undefined && val) {
				val = val.split(splC);
			}
			tags[tagKey][parts[0]] = val || null;
		}
	}
	return tags;
}

module.exports = {
	// Parse Twitch badges..
	badges: tags => parseComplexTag(tags, 'badges'),

	// Parse Twitch badge-info..
	badgeInfo: tags => parseComplexTag(tags, 'badge-info'),

	// Parse Twitch emotes..
	emotes: tags => parseComplexTag(tags, 'emotes', '/', ':', ','),

	// Parse regex emotes..
	emoteRegex(msg, code, id, obj) {
		nonspaceRegex.lastIndex = 0;
		const regex = new RegExp('(\\b|^|\\s)' + _.unescapeHtml(code) + '(\\b|$|\\s)');
		let match;

		// Check if emote code matches using RegExp and push it to the object..
		while ((match = nonspaceRegex.exec(msg)) !== null) {
			if(regex.test(match[0])) {
				obj[id] = obj[id] || [];
				obj[id].push([ match.index, nonspaceRegex.lastIndex - 1 ]);
			}
		}
	},

	// Parse string emotes..
	emoteString(msg, code, id, obj) {
		nonspaceRegex.lastIndex = 0;
		let match;

		// Check if emote code matches and push it to the object..
		while ((match = nonspaceRegex.exec(msg)) !== null) {
			if(match[0] === _.unescapeHtml(code)) {
				obj[id] = obj[id] || [];
				obj[id].push([ match.index, nonspaceRegex.lastIndex - 1 ]);
			}
		}
	},

	// Transform the emotes object to a string with the following format..
	// emote_id:first_index-last_index,another_first-another_last/another_emote_id:first_index-last_index
	transformEmotes(emotes) {
		let transformed = '';

		Object.keys(emotes).forEach(id => {
			transformed = `${transformed+id}:`;
			emotes[id].forEach(
				index => transformed = `${transformed+index.join('-')},`
			);
			transformed = `${transformed.slice(0, -1)}/`;
		});
		return transformed.slice(0, -1);
	},

	formTags(tags) {
		const result = [];
		for(const key in tags) {
			const value = _.escapeIRC(tags[key]);
			result.push(`${key}=${value}`);
		}
		return `@${result.join(';')}`;
	},

	// Parse Twitch messages..
	msg(data) {
		const message = {
			raw: data,
			tags: {},
			prefix: null,
			command: null,
			params: []
		};

		// Position and nextspace are used by the parser as a reference..
		let position = 0;
		let nextspace = 0;

		// The first thing we check for is IRCv3.2 message tags.
		// http://ircv3.atheme.org/specification/message-tags-3.2
		if(data.charCodeAt(0) === 64) {
			nextspace = data.indexOf(' ');

			// Malformed IRC message..
			if(nextspace === -1) {
				return null;
			}

			// Tags are split by a semi colon..
			const rawTags = data.slice(1, nextspace).split(';');

			for (let i = 0; i < rawTags.length; i++) {
				// Tags delimited by an equals sign are key=value tags.
				// If there's no equals, we assign the tag a value of true.
				const tag = rawTags[i];
				const pair = tag.split('=');
				message.tags[pair[0]] = tag.substring(tag.indexOf('=') + 1) || true;
			}

			position = nextspace + 1;
		}

		// Skip any trailing whitespace..
		while (data.charCodeAt(position) === 32) {
			position++;
		}

		// Extract the message's prefix if present. Prefixes are prepended with a colon..
		if(data.charCodeAt(position) === 58) {
			nextspace = data.indexOf(' ', position);

			// If there's nothing after the prefix, deem this message to be malformed.
			if(nextspace === -1) {
				return null;
			}

			message.prefix = data.slice(position + 1, nextspace);
			position = nextspace + 1;

			// Skip any trailing whitespace..
			while (data.charCodeAt(position) === 32) {
				position++;
			}
		}

		nextspace = data.indexOf(' ', position);

		// If there's no more whitespace left, extract everything from the
		// current position to the end of the string as the command..
		if(nextspace === -1) {
			if(data.length > position) {
				message.command = data.slice(position);
				return message;
			}
			return null;
		}

		// Else, the command is the current position up to the next space. After
		// that, we expect some parameters.
		message.command = data.slice(position, nextspace);

		position = nextspace + 1;

		// Skip any trailing whitespace..
		while (data.charCodeAt(position) === 32) {
			position++;
		}

		while (position < data.length) {
			nextspace = data.indexOf(' ', position);

			// If the character is a colon, we've got a trailing parameter.
			// At this point, there are no extra params, so we push everything
			// from after the colon to the end of the string, to the params array
			// and break out of the loop.
			if(data.charCodeAt(position) === 58) {
				message.params.push(data.slice(position + 1));
				break;
			}

			// If we still have some whitespace...
			if(nextspace !== -1) {
				// Push whatever's between the current position and the next
				// space to the params array.
				message.params.push(data.slice(position, nextspace));
				position = nextspace + 1;

				// Skip any trailing whitespace and continue looping.
				while (data.charCodeAt(position) === 32) {
					position++;
				}

				continue;
			}

			// If we don't have any more whitespace and the param isn't trailing,
			// push everything remaining to the params array.
			if(nextspace === -1) {
				message.params.push(data.slice(position));
				break;
			}
		}
		return message;
	}
};


/***/ }),

/***/ "./node_modules/tmi.js/lib/timer.js":
/*!******************************************!*\
  !*** ./node_modules/tmi.js/lib/timer.js ***!
  \******************************************/
/***/ ((module) => {

// Initialize the queue with a specific delay..
class Queue {
	constructor(defaultDelay) {
		this.queue = [];
		this.index = 0;
		this.defaultDelay = defaultDelay === undefined ? 3000 : defaultDelay;
	}
	// Add a new function to the queue..
	add(fn, delay) {
		this.queue.push({ fn, delay });
	}
	// Go to the next in queue..
	next() {
		const i = this.index++;
		const at = this.queue[i];
		if(!at) {
			return;
		}
		const next = this.queue[this.index];
		at.fn();
		if(next) {
			const delay = next.delay === undefined ? this.defaultDelay : next.delay;
			setTimeout(() => this.next(), delay);
		}
	}
}

module.exports = Queue;


/***/ }),

/***/ "./node_modules/tmi.js/lib/utils.js":
/*!******************************************!*\
  !*** ./node_modules/tmi.js/lib/utils.js ***!
  \******************************************/
/***/ ((module) => {

// eslint-disable-next-line no-control-regex
const actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
const justinFanRegex = /^(justinfan)(\d+$)/;
const unescapeIRCRegex = /\\([sn:r\\])/g;
const escapeIRCRegex = /([ \n;\r\\])/g;
const ircEscapedChars = { s: ' ', n: '', ':': ';', r: '' };
const ircUnescapedChars = { ' ': 's', '\n': 'n', ';': ':', '\r': 'r' };
const urlRegex = new RegExp('^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$', 'i');
const regexEmoteRegex = /[|\\^$*+?:#]/;
const _ = module.exports = {
	// Return the second value if the first value is undefined..
	get: (a, b) => typeof a === 'undefined' ? b : a,

	// Indirectly use hasOwnProperty
	hasOwn: (obj, key) => ({}).hasOwnProperty.call(obj, key),

	// Race a promise against a delay..
	promiseDelay: time => new Promise(resolve => setTimeout(resolve, time)),

	// Value is a finite number..
	isFinite: int => isFinite(int) && !isNaN(parseFloat(int)),

	// Parse string to number. Returns NaN if string can't be parsed to number..
	toNumber(num, precision) {
		if(num === null) {
			return 0;
		}
		const factor = Math.pow(10, _.isFinite(precision) ? precision : 0);
		return Math.round(num * factor) / factor;
	},

	// Value is an integer..
	isInteger: int => !isNaN(_.toNumber(int, 0)),

	// Value is a regex..
	isRegex: str => regexEmoteRegex.test(str),

	// Value is a valid url..
	isURL: str => urlRegex.test(str),

	// Return a random justinfan username..
	justinfan: () => `justinfan${Math.floor((Math.random() * 80000) + 1000)}`,

	// Username is a justinfan username..
	isJustinfan: username => justinFanRegex.test(username),

	// Return a valid channel name..
	channel(str) {
		const channel = (str ? str : '').toLowerCase();
		return channel[0] === '#' ? channel : '#' + channel;
	},

	// Return a valid username..
	username(str) {
		const username = (str ? str : '').toLowerCase();
		return username[0] === '#' ? username.slice(1) : username;
	},

	// Return a valid token..
	token: str => str ? str.toLowerCase().replace('oauth:', '') : '',

	// Return a valid password..
	password(str) {
		const token = _.token(str);
		return token ? `oauth:${token}` : '';
	},

	actionMessage: msg => msg.match(actionMessageRegex),

	// Replace all occurences of a string using an object..
	replaceAll(str, obj) {
		if(str === null || typeof str === 'undefined') {
			return null;
		}
		for (const x in obj) {
			str = str.replace(new RegExp(x, 'g'), obj[x]);
		}
		return str;
	},

	unescapeHtml: safe =>
		safe.replace(/\\&amp\\;/g, '&')
		.replace(/\\&lt\\;/g, '<')
		.replace(/\\&gt\\;/g, '>')
		.replace(/\\&quot\\;/g, '"')
		.replace(/\\&#039\\;/g, '\''),

	// Escaping values:
	// http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
	unescapeIRC(msg) {
		if(!msg || typeof msg !== 'string' || !msg.includes('\\')) {
			return msg;
		}
		return msg.replace(
			unescapeIRCRegex,
			(m, p) => p in ircEscapedChars ? ircEscapedChars[p] : p
		);
	},
	
	escapeIRC(msg) {
		if(!msg || typeof msg !== 'string') {
			return msg;
		}
		return msg.replace(
			escapeIRCRegex,
			(m, p) => p in ircUnescapedChars ? `\\${ircUnescapedChars[p]}` : p
		);
	},

	// Add word to a string..
	addWord: (line, word) => line.length ? line + ' ' + word : line + word,

	// Split a line but try not to cut a word in half..
	splitLine(input, length) {
		let lastSpace = input.substring(0, length).lastIndexOf(' ');
		// No spaces found, split at the very end to avoid a loop..
		if(lastSpace === -1) {
			lastSpace = length - 1;
		}
		return [ input.substring(0, lastSpace), input.substring(lastSpace + 1) ];
	},

	// Extract a number from a string..
	extractNumber(str) {
		const parts = str.split(' ');
		for (let i = 0; i < parts.length; i++) {
			if(_.isInteger(parts[i])) {
				return ~~parts[i];
			}
		}
		return 0;
	},

	// Format the date..
	formatDate(date) {
		let hours = date.getHours();
		let mins  = date.getMinutes();

		hours = (hours < 10 ? '0' : '') + hours;
		mins = (mins < 10 ? '0' : '') + mins;
		return `${hours}:${mins}`;
	},

	// Inherit the prototype methods from one constructor into another..
	inherits(ctor, superCtor) {
		ctor.super_ = superCtor;
		const TempCtor = function () {};
		TempCtor.prototype = superCtor.prototype;
		ctor.prototype = new TempCtor();
		ctor.prototype.constructor = ctor;
	},

	// Return whether inside a Node application or not..
	isNode() {
		try {
			return typeof process === 'object' &&
				Object.prototype.toString.call(process) === '[object process]';
		} catch(e) {}
		return false;
	}
};


/***/ }),

/***/ "?641d":
/*!****************************!*\
  !*** node-fetch (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?6264":
/*!********************!*\
  !*** ws (ignored) ***!
  \********************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "./node_modules/axios/dist/browser/axios.cjs":
/*!***************************************************!*\
  !*** ./node_modules/axios/dist/browser/axios.cjs ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
// Axios v1.4.0 Copyright (c) 2023 Matt Zabriskie and contributors


function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// utils is a library of generic helper functions non-specific to axios

const {toString} = Object.prototype;
const {getPrototypeOf} = Object;

const kindOf = (cache => thing => {
    const str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type
};

const typeOfTest = type => thing => typeof thing === type;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 *
 * @returns {boolean} True if value is an Array, otherwise false
 */
const {isArray} = Array;

/**
 * Determine if a value is undefined
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if the value is undefined, otherwise false
 */
const isUndefined = typeOfTest('undefined');

/**
 * Determine if a value is a Buffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
const isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  let result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a String, otherwise false
 */
const isString = typeOfTest('string');

/**
 * Determine if a value is a Function
 *
 * @param {*} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
const isFunction = typeOfTest('function');

/**
 * Determine if a value is a Number
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Number, otherwise false
 */
const isNumber = typeOfTest('number');

/**
 * Determine if a value is an Object
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an Object, otherwise false
 */
const isObject = (thing) => thing !== null && typeof thing === 'object';

/**
 * Determine if a value is a Boolean
 *
 * @param {*} thing The value to test
 * @returns {boolean} True if value is a Boolean, otherwise false
 */
const isBoolean = thing => thing === true || thing === false;

/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
const isPlainObject = (val) => {
  if (kindOf(val) !== 'object') {
    return false;
  }

  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
};

/**
 * Determine if a value is a Date
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Date, otherwise false
 */
const isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Blob, otherwise false
 */
const isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Stream
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Stream, otherwise false
 */
const isStream = (val) => isObject(val) && isFunction(val.pipe);

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
const isFormData = (thing) => {
  let kind;
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) || (
      isFunction(thing.append) && (
        (kind = kindOf(thing)) === 'formdata' ||
        // detect form-data instance
        (kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]')
      )
    )
  )
};

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
const isURLSearchParams = kindOfTest('URLSearchParams');

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 *
 * @returns {String} The String freed of excess whitespace
 */
const trim = (str) => str.trim ?
  str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 *
 * @param {Boolean} [allOwnKeys = false]
 * @returns {any}
 */
function forEach(obj, fn, {allOwnKeys = false} = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;

    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

function findKey(obj, key) {
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}

const _global = (() => {
  /*eslint no-undef:0*/
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : __webpack_require__.g)
})();

const isContextDefined = (context) => !isUndefined(context) && context !== _global;

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 *
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  const {caseless} = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else {
      result[targetKey] = val;
    }
  };

  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Boolean} [allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, {allOwnKeys});
  return a;
};

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 *
 * @returns {string} content value without BOM
 */
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 *
 * @returns {void}
 */
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  Object.defineProperty(constructor, 'super', {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function|Boolean} [filter]
 * @param {Function} [propFilter]
 *
 * @returns {Object}
 */
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};

  destObj = destObj || {};
  // eslint-disable-next-line no-eq-null,eqeqeq
  if (sourceObj == null) return destObj;

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
};

/**
 * Determines whether a string ends with the characters of a specified string
 *
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 *
 * @returns {boolean}
 */
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};


/**
 * Returns new array from array like object or null if failed
 *
 * @param {*} [thing]
 *
 * @returns {?Array}
 */
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};

/**
 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
 * thing passed in is an instance of Uint8Array
 *
 * @param {TypedArray}
 *
 * @returns {Array}
 */
// eslint-disable-next-line func-names
const isTypedArray = (TypedArray => {
  // eslint-disable-next-line func-names
  return thing => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

/**
 * For each entry in the object, call the function with the key and value.
 *
 * @param {Object<any, any>} obj - The object to iterate over.
 * @param {Function} fn - The function to call for each entry.
 *
 * @returns {void}
 */
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[Symbol.iterator];

  const iterator = generator.call(obj);

  let result;

  while ((result = iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};

/**
 * It takes a regular expression and a string, and returns an array of all the matches
 *
 * @param {string} regExp - The regular expression to match against.
 * @param {string} str - The string to search.
 *
 * @returns {Array<boolean>}
 */
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];

  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }

  return arr;
};

/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
const isHTMLForm = kindOfTest('HTMLFormElement');

const toCamelCase = str => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};

/* Creating a function that will check if an object has a property. */
const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

/**
 * Determine if a value is a RegExp object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a RegExp object, otherwise false
 */
const isRegExp = kindOfTest('RegExp');

const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};

  forEach(descriptors, (descriptor, name) => {
    if (reducer(descriptor, name, obj) !== false) {
      reducedDescriptors[name] = descriptor;
    }
  });

  Object.defineProperties(obj, reducedDescriptors);
};

/**
 * Makes all methods read-only
 * @param {Object} obj
 */

const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    // skip restricted props in strict mode
    if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
      return false;
    }

    const value = obj[name];

    if (!isFunction(value)) return;

    descriptor.enumerable = false;

    if ('writable' in descriptor) {
      descriptor.writable = false;
      return;
    }

    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error('Can not rewrite read-only method \'' + name + '\'');
      };
    }
  });
};

const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};

  const define = (arr) => {
    arr.forEach(value => {
      obj[value] = true;
    });
  };

  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

  return obj;
};

const noop = () => {};

const toFiniteNumber = (value, defaultValue) => {
  value = +value;
  return Number.isFinite(value) ? value : defaultValue;
};

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

const DIGIT = '0123456789';

const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};

const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = '';
  const {length} = alphabet;
  while (size--) {
    str += alphabet[Math.random() * length|0];
  }

  return str;
};

/**
 * If the thing is a FormData object, return true, otherwise return false.
 *
 * @param {unknown} thing - The thing to check.
 *
 * @returns {boolean}
 */
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
}

const toJSONObject = (obj) => {
  const stack = new Array(10);

  const visit = (source, i) => {

    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }

      if(!('toJSON' in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};

        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });

        stack[i] = undefined;

        return target;
      }
    }

    return source;
  };

  return visit(obj, 0);
};

const isAsyncFn = kindOfTest('AsyncFunction');

const isThenable = (thing) =>
  thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

var utils = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  ALPHABET,
  generateString,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable
};

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 *
 * @returns {Error} The created error.
 */
function AxiosError(message, code, config, request, response) {
  Error.call(this);

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = (new Error()).stack;
  }

  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

utils.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: utils.toJSONObject(this.config),
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});

const prototype$1 = AxiosError.prototype;
const descriptors = {};

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED',
  'ERR_NOT_SUPPORT',
  'ERR_INVALID_URL'
// eslint-disable-next-line func-names
].forEach(code => {
  descriptors[code] = {value: code};
});

Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

// eslint-disable-next-line func-names
AxiosError.from = (error, code, config, request, response, customProps) => {
  const axiosError = Object.create(prototype$1);

  utils.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  }, prop => {
    return prop !== 'isAxiosError';
  });

  AxiosError.call(axiosError, error.message, code, config, request, response);

  axiosError.cause = error;

  axiosError.name = error.name;

  customProps && Object.assign(axiosError, customProps);

  return axiosError;
};

// eslint-disable-next-line strict
var httpAdapter = null;

/**
 * Determines if the given thing is a array or js object.
 *
 * @param {string} thing - The object or array to be visited.
 *
 * @returns {boolean}
 */
function isVisitable(thing) {
  return utils.isPlainObject(thing) || utils.isArray(thing);
}

/**
 * It removes the brackets from the end of a string
 *
 * @param {string} key - The key of the parameter.
 *
 * @returns {string} the key without the brackets.
 */
function removeBrackets(key) {
  return utils.endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * It takes a path, a key, and a boolean, and returns a string
 *
 * @param {string} path - The path to the current key.
 * @param {string} key - The key of the current object being iterated over.
 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
 *
 * @returns {string} The path to the current key.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    // eslint-disable-next-line no-param-reassign
    token = removeBrackets(token);
    return !dots && i ? '[' + token + ']' : token;
  }).join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 *
 * @param {Array<any>} arr - The array to check
 *
 * @returns {boolean}
 */
function isFlatArray(arr) {
  return utils.isArray(arr) && !arr.some(isVisitable);
}

const predicates = utils.toFlatObject(utils, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});

/**
 * Convert a data object to FormData
 *
 * @param {Object} obj
 * @param {?Object} [formData]
 * @param {?Object} [options]
 * @param {Function} [options.visitor]
 * @param {Boolean} [options.metaTokens = true]
 * @param {Boolean} [options.dots = false]
 * @param {?Boolean} [options.indexes = false]
 *
 * @returns {Object}
 **/

/**
 * It converts an object into a FormData object
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData(obj, formData, options) {
  if (!utils.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (FormData)();

  // eslint-disable-next-line no-param-reassign
  options = utils.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    return !utils.isUndefined(source[option]);
  });

  const metaTokens = options.metaTokens;
  // eslint-disable-next-line no-use-before-define
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
  const useBlob = _Blob && utils.isSpecCompliantForm(formData);

  if (!utils.isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }

  function convertValue(value) {
    if (value === null) return '';

    if (utils.isDate(value)) {
      return value.toISOString();
    }

    if (!useBlob && utils.isBlob(value)) {
      throw new AxiosError('Blob is not supported. Use a Buffer instead.');
    }

    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  /**
   * Default visitor.
   *
   * @param {*} value
   * @param {String|Number} key
   * @param {Array<String|Number>} path
   * @this {FormData}
   *
   * @returns {boolean} return true to visit the each prop of the value recursively
   */
  function defaultVisitor(value, key, path) {
    let arr = value;

    if (value && !path && typeof value === 'object') {
      if (utils.endsWith(key, '{}')) {
        // eslint-disable-next-line no-param-reassign
        key = metaTokens ? key : key.slice(0, -2);
        // eslint-disable-next-line no-param-reassign
        value = JSON.stringify(value);
      } else if (
        (utils.isArray(value) && isFlatArray(value)) ||
        ((utils.isFileList(value) || utils.endsWith(key, '[]')) && (arr = utils.toArray(value))
        )) {
        // eslint-disable-next-line no-param-reassign
        key = removeBrackets(key);

        arr.forEach(function each(el, index) {
          !(utils.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
            convertValue(el)
          );
        });
        return false;
      }
    }

    if (isVisitable(value)) {
      return true;
    }

    formData.append(renderKey(path, key, dots), convertValue(value));

    return false;
  }

  const stack = [];

  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });

  function build(value, path) {
    if (utils.isUndefined(value)) return;

    if (stack.indexOf(value) !== -1) {
      throw Error('Circular reference detected in ' + path.join('.'));
    }

    stack.push(value);

    utils.forEach(value, function each(el, key) {
      const result = !(utils.isUndefined(el) || el === null) && visitor.call(
        formData, el, utils.isString(key) ? key.trim() : key, path, exposedHelpers
      );

      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });

    stack.pop();
  }

  if (!utils.isObject(obj)) {
    throw new TypeError('data must be an object');
  }

  build(obj);

  return formData;
}

/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode$1(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00'
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * It takes a params object and converts it to a FormData object
 *
 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
 *
 * @returns {void}
 */
function AxiosURLSearchParams(params, options) {
  this._pairs = [];

  params && toFormData(params, this, options);
}

const prototype = AxiosURLSearchParams.prototype;

prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};

prototype.toString = function toString(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;

  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + '=' + _encode(pair[1]);
  }, '').join('&');
};

/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?object} options
 *
 * @returns {string} The formatted url
 */
function buildURL(url, params, options) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }
  
  const _encode = options && options.encode || encode;

  const serializeFn = options && options.serialize;

  let serializedParams;

  if (serializeFn) {
    serializedParams = serializeFn(params, options);
  } else {
    serializedParams = utils.isURLSearchParams(params) ?
      params.toString() :
      new AxiosURLSearchParams(params, options).toString(_encode);
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}

var InterceptorManager$1 = InterceptorManager;

var transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 *
 * @returns {boolean}
 */
const isStandardBrowserEnv = (() => {
  let product;
  if (typeof navigator !== 'undefined' && (
    (product = navigator.product) === 'ReactNative' ||
    product === 'NativeScript' ||
    product === 'NS')
  ) {
    return false;
  }

  return typeof window !== 'undefined' && typeof document !== 'undefined';
})();

/**
 * Determine if we're running in a standard browser webWorker environment
 *
 * Although the `isStandardBrowserEnv` method indicates that
 * `allows axios to run in a web worker`, the WebWorker will still be
 * filtered out due to its judgment standard
 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
 * This leads to a problem when axios post `FormData` in webWorker
 */
 const isStandardBrowserWebWorkerEnv = (() => {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts === 'function'
  );
})();


var platform = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1
  },
  isStandardBrowserEnv,
  isStandardBrowserWebWorkerEnv,
  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
};

function toURLEncodedForm(data, options) {
  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }

      return helpers.defaultVisitor.apply(this, arguments);
    }
  }, options));
}

/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param {string} name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name) {
  // foo[x][y][z]
  // foo.x.y.z
  // foo-x-y-z
  // foo x y z
  return utils.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
    return match[0] === '[]' ? '' : match[1] || match[0];
  });
}

/**
 * Convert an array to an object.
 *
 * @param {Array<any>} arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param {string} formData The FormData object to convert to JSON.
 *
 * @returns {Object<string, any> | null} The converted object.
 */
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils.isArray(target) ? target.length : name;

    if (isLast) {
      if (utils.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }

      return !isNumericKey;
    }

    if (!target[name] || !utils.isObject(target[name])) {
      target[name] = [];
    }

    const result = buildPath(path, value, target[name], index);

    if (result && utils.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }

    return !isNumericKey;
  }

  if (utils.isFormData(formData) && utils.isFunction(formData.entries)) {
    const obj = {};

    utils.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });

    return obj;
  }

  return null;
}

const DEFAULT_CONTENT_TYPE = {
  'Content-Type': undefined
};

/**
 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
 * of the input
 *
 * @param {any} rawValue - The value to be stringified.
 * @param {Function} parser - A function that parses a string into a JavaScript object.
 * @param {Function} encoder - A function that takes a value and returns a string.
 *
 * @returns {string} A stringified version of the rawValue.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

const defaults = {

  transitional: transitionalDefaults,

  adapter: ['xhr', 'http'],

  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.indexOf('application/json') > -1;
    const isObjectPayload = utils.isObject(data);

    if (isObjectPayload && utils.isHTMLForm(data)) {
      data = new FormData(data);
    }

    const isFormData = utils.isFormData(data);

    if (isFormData) {
      if (!hasJSONContentType) {
        return data;
      }
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }

    if (utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
      return data.toString();
    }

    let isFileList;

    if (isObjectPayload) {
      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }

      if ((isFileList = utils.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
        const _FormData = this.env && this.env.FormData;

        return toFormData(
          isFileList ? {'files[]': data} : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }

    if (isObjectPayload || hasJSONContentType ) {
      headers.setContentType('application/json', false);
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === 'json';

    if (data && utils.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;

      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

var defaults$1 = defaults;

// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = utils.toObjectSet([
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]);

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders Headers needing to be parsed
 *
 * @returns {Object} Headers parsed into an object
 */
var parseHeaders = rawHeaders => {
  const parsed = {};
  let key;
  let val;
  let i;

  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
    i = line.indexOf(':');
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();

    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
      return;
    }

    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

const $internals = Symbol('internals');

function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }

  return utils.isArray(value) ? value.map(normalizeValue) : String(value);
}

function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;

  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }

  return tokens;
}

const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (utils.isFunction(filter)) {
    return filter.call(this, value, header);
  }

  if (isHeaderNameFilter) {
    value = header;
  }

  if (!utils.isString(value)) return;

  if (utils.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }

  if (utils.isRegExp(filter)) {
    return filter.test(value);
  }
}

function formatHeader(header) {
  return header.trim()
    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
}

function buildAccessors(obj, header) {
  const accessorName = utils.toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach(methodName => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = utils.findKey(self, lHeader);

      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (utils.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if(utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils.findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils.isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (utils.isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils.findKey(this, header);

      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = utils.findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];

          deleted = true;
        }
      }
    }

    if (utils.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format) {
    const self = this;
    const headers = {};

    utils.forEach(this, (value, header) => {
      const key = utils.findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : String(header).trim();

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }

  toJSON(asStrings) {
    const obj = Object.create(null);

    utils.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }

  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }

  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first, ...targets) {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header) {
    const internals = this[$internals] = (this[$internals] = {
      accessors: {}
    });

    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);

      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

    return this;
  }
}

AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

utils.freezeMethods(AxiosHeaders.prototype);
utils.freezeMethods(AxiosHeaders);

var AxiosHeaders$1 = AxiosHeaders;

/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 *
 * @returns {*} The resulting transformed data
 */
function transformData(fns, response) {
  const config = this || defaults$1;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;

  utils.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  headers.normalize();

  return data;
}

function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @param {string=} message The message.
 * @param {Object=} config The config.
 * @param {Object=} request The request.
 *
 * @returns {CanceledError} The created error.
 */
function CanceledError(message, config, request) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
  this.name = 'CanceledError';
}

utils.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status code ' + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}

var cookies = platform.isStandardBrowserEnv ?

// Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        const cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

// Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })();

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 *
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 *
 * @returns {string} The combined URL
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 *
 * @returns {string} The combined full path
 */
function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

var isURLSameOrigin = platform.isStandardBrowserEnv ?

// Standard browser envs have full support of the APIs needed to test
// whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    const msie = /(msie|trident)/i.test(navigator.userAgent);
    const urlParsingNode = document.createElement('a');
    let originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      let href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
          urlParsingNode.pathname :
          '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      const parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
          parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })();

function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;

  min = min !== undefined ? min : 1000;

  return function push(chunkLength) {
    const now = Date.now();

    const startedAt = timestamps[tail];

    if (!firstSampleTS) {
      firstSampleTS = now;
    }

    bytes[head] = chunkLength;
    timestamps[head] = now;

    let i = tail;
    let bytesCount = 0;

    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }

    head = (head + 1) % samplesCount;

    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }

    if (now - firstSampleTS < min) {
      return;
    }

    const passed = startedAt && now - startedAt;

    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}

function progressEventReducer(listener, isDownloadStream) {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;

    bytesNotified = loaded;

    const data = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e
    };

    data[isDownloadStream ? 'download' : 'upload'] = true;

    listener(data);
  };
}

const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

var xhrAdapter = isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    let requestData = config.data;
    const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
    const responseType = config.responseType;
    let onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData)) {
      if (platform.isStandardBrowserEnv || platform.isStandardBrowserWebWorkerEnv) {
        requestHeaders.setContentType(false); // Let the browser set it
      } else {
        requestHeaders.setContentType('multipart/form-data;', false); // mobile/desktop app frameworks
      }
    }

    let request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      const username = config.auth.username || '';
      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
    }

    const fullPath = buildFullPath(config.baseURL, config.url);

    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      const responseHeaders = AxiosHeaders$1.from(
        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
        request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      const transitional = config.transitional || transitionalDefaults;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (platform.isStandardBrowserEnv) {
      // Add xsrf header
      const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
        && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

      if (xsrfValue) {
        requestHeaders.set(config.xsrfHeaderName, xsrfValue);
      }
    }

    // Remove Content-Type if data is undefined
    requestData === undefined && requestHeaders.setContentType(null);

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = cancel => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    const protocol = parseProtocol(fullPath);

    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    }


    // Send the request
    request.send(requestData || null);
  });
};

const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter
};

utils.forEach(knownAdapters, (fn, value) => {
  if(fn) {
    try {
      Object.defineProperty(fn, 'name', {value});
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', {value});
  }
});

var adapters = {
  getAdapter: (adapters) => {
    adapters = utils.isArray(adapters) ? adapters : [adapters];

    const {length} = adapters;
    let nameOrAdapter;
    let adapter;

    for (let i = 0; i < length; i++) {
      nameOrAdapter = adapters[i];
      if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
        break;
      }
    }

    if (!adapter) {
      if (adapter === false) {
        throw new AxiosError(
          `Adapter ${nameOrAdapter} is not supported by the environment`,
          'ERR_NOT_SUPPORT'
        );
      }

      throw new Error(
        utils.hasOwnProp(knownAdapters, nameOrAdapter) ?
          `Adapter '${nameOrAdapter}' is not available in the build` :
          `Unknown adapter '${nameOrAdapter}'`
      );
    }

    if (!utils.isFunction(adapter)) {
      throw new TypeError('adapter is not a function');
    }

    return adapter;
  },
  adapters: knownAdapters
};

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders$1.from(config.headers);

  // Transform request data
  config.data = transformData.call(
    config,
    config.transformRequest
  );

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );

    response.headers = AxiosHeaders$1.from(response.headers);

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  });
}

const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? thing.toJSON() : thing;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  const config = {};

  function getMergedValue(target, source, caseless) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge.call({caseless}, target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(a, b, caseless) {
    if (!utils.isUndefined(b)) {
      return getMergedValue(a, b, caseless);
    } else if (!utils.isUndefined(a)) {
      return getMergedValue(undefined, a, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!utils.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!utils.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }

  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
  };

  utils.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
    const merge = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge(config1[prop], config2[prop], prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
}

const VERSION = "1.4.0";

const validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

const deprecatedWarnings = {};

/**
 * Transitional option validator
 *
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 *
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

var validator = {
  assertOptions,
  validators: validators$1
};

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager$1(),
      response: new InterceptorManager$1()
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig(this.defaults, config);

    const {transitional, paramsSerializer, headers} = config;

    if (transitional !== undefined) {
      validator.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }

    if (paramsSerializer != null) {
      if (utils.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    let contextHeaders;

    // Flatten headers
    contextHeaders = headers && utils.merge(
      headers.common,
      headers[config.method]
    );

    contextHeaders && utils.forEach(
      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
      (method) => {
        delete headers[method];
      }
    );

    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});

var Axios$1 = Axios;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;

    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(cancel => {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // eslint-disable-next-line func-names
    this.promise.then = onfulfilled => {
      let _resolve;
      // eslint-disable-next-line func-names
      const promise = new Promise(resolve => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */

  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */

  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}

var CancelToken$1 = CancelToken;

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 *
 * @returns {Function}
 */
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 *
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
function isAxiosError(payload) {
  return utils.isObject(payload) && (payload.isAxiosError === true);
}

const HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
};

Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});

var HttpStatusCode$1 = HttpStatusCode;

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind(Axios$1.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

  // Copy context to instance
  utils.extend(instance, context, null, {allOwnKeys: true});

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
const axios = createInstance(defaults$1);

// Expose Axios class to allow class inheritance
axios.Axios = Axios$1;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;

// Expose AxiosError class
axios.AxiosError = AxiosError;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

// Expose mergeConfig
axios.mergeConfig = mergeConfig;

axios.AxiosHeaders = AxiosHeaders$1;

axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.HttpStatusCode = HttpStatusCode$1;

axios.default = axios;

module.exports = axios;
//# sourceMappingURL=axios.cjs.map


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!***************************!*\
  !*** ./src/background.js ***!
  \***************************/
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function (obj, key, desc) { obj[key] = desc.value; }, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; defineProperty(this, "_invoke", { value: function value(method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; } function maybeInvokeDelegate(delegate, context) { var methodName = context.method, method = delegate.iterator[methodName]; if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator["return"] && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel; var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (val) { var object = Object(val), keys = []; for (var key in object) keys.push(key); return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, "catch": function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// Import required modules
var tmi = __webpack_require__(/*! tmi.js */ "./node_modules/tmi.js/index.js");
var axios = __webpack_require__(/*! axios */ "./node_modules/axios/dist/browser/axios.cjs");

// Variables for Twitch, Perspective, and Netlify API
var twitchClientId = 'YOUR_TWITCH_CLIENT_ID';
var netlifyFunctionUrl = 'YOUR_NETLIFY_FUNCTION_URL'; // Add your Netlify function URL here

// Create a new instance of the Perspective API client
var client = new perspective.ApiClient();
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({
    url: 'options.html'
  });
});

// Listen for messages from the options page
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === 'initiateTwitchOAuth') {
    initiateTwitchOAuth();
  }
});
function initiateTwitchOAuth() {
  return _initiateTwitchOAuth.apply(this, arguments);
}
function _initiateTwitchOAuth() {
  _initiateTwitchOAuth = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    var response, accessToken;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return axios.get(netlifyFunctionUrl);
        case 3:
          response = _context2.sent;
          if (!(response.status !== 200)) {
            _context2.next = 6;
            break;
          }
          throw new Error("Error initiating Twitch OAuth: HTTP ".concat(response.status));
        case 6:
          accessToken = response.data.access_token;
          if (accessToken) {
            _context2.next = 9;
            break;
          }
          throw new Error('Error initiating Twitch OAuth: No access token returned');
        case 9:
          // Encrypt the access token using the encryption key
          chrome.storage.sync.get(['encryptionKey'], function (data) {
            if (chrome.runtime.lastError) {
              console.error('Error loading encryption key:', chrome.runtime.lastError);
              displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
              return;
            }
            var encryptionKey = data.encryptionKey;
            if (!encryptionKey) {
              console.error('Error: Encryption key not found');
              displayError('Error: Encryption key not found');
              return;
            }
            var encryptedAccessToken = encrypt(accessToken, encryptionKey);
            // Store the encrypted access token securely in Chrome's sync storage
            chrome.storage.sync.set({
              twitchAccessToken: encryptedAccessToken
            }, function () {
              if (chrome.runtime.lastError) {
                console.error('Error storing Twitch access token:', chrome.runtime.lastError);
                displayError('Error storing Twitch access token: ' + chrome.runtime.lastError.message);
              }
            });
          });
          _context2.next = 16;
          break;
        case 12:
          _context2.prev = 12;
          _context2.t0 = _context2["catch"](0);
          console.error('Error initiating Twitch OAuth:', _context2.t0);
          displayError('Error initiating Twitch OAuth: ' + _context2.t0.message);
        case 16:
        case "end":
          return _context2.stop();
      }
    }, _callee2, null, [[0, 12]]);
  }));
  return _initiateTwitchOAuth.apply(this, arguments);
}
function savePreferences() {
  chrome.storage.sync.get(['encryptionKey'], function (data) {
    if (chrome.runtime.lastError) {
      console.error('Error loading encryption key:', chrome.runtime.lastError);
      displayError('Error loading encryption key: ' + chrome.runtime.lastError.message);
      return;
    }
    var encryptionKey = data.encryptionKey;
    if (!encryptionKey) {
      console.error('Error: Encryption key not found');
      displayError('Error: Encryption key not found');
      return;
    }
    var preferences = {
      darkMode: themeToggle.checked,
      sentiment: {
        enabled: features.sentiment.toggle.checked,
        options: {
          sensitivity: features.sentiment.sensitivity.value,
          showTopScorers: features.sentiment.showTopScorers.checked,
          showBottomScorers: features.sentiment.showBottomScorers.checked,
          leaderboardDuration: features.sentiment.leaderboardDuration.value
        }
      },
      toxicity: {
        enabled: features.toxicity.toggle.checked,
        options: {
          message: features.toxicitymessage.value,
          modNotification: features.toxicity.modNotification.checked,
          selfNotification: features.toxicity.selfNotification.checked,
          modMessage: features.toxicity.modMessage.value,
          selfMessage: features.toxicity.selfMessage.value
        }
      }
    };
    // Encrypt the preferences using the encryption key
    var encryptedPreferences = encrypt(preferences, encryptionKey);
    // Store the encrypted preferences securely in Chrome's sync storage
    chrome.storage.sync.set({
      preferences: encryptedPreferences
    }, function () {
      if (chrome.runtime.lastError) {
        console.error('Error saving preferences:', chrome.runtime.lastError);
        displayError('Error saving preferences: ' + chrome.runtime.lastError.message);
      }
    });
  });
}

// Function to get the current Twitch channel
function getCurrentChannel(_x, _x2) {
  return _getCurrentChannel.apply(this, arguments);
}
function _getCurrentChannel() {
  _getCurrentChannel = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(token, clientId) {
    var response, data;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return fetch('https://api.twitch.tv/helix/users', {
            headers: {
              'Authorization': "Bearer ".concat(token),
              'Client-Id': clientId
            }
          });
        case 3:
          response = _context3.sent;
          if (!(response.status !== 200)) {
            _context3.next = 6;
            break;
          }
          throw new Error("Error getting current Twitch channel: HTTP ".concat(response.status));
        case 6:
          _context3.next = 8;
          return response.json();
        case 8:
          data = _context3.sent;
          return _context3.abrupt("return", data.data[0].login);
        case 12:
          _context3.prev = 12;
          _context3.t0 = _context3["catch"](0);
          console.error('Error getting current Twitch channel:', _context3.t0);
          sendWarningToExtUser('Error getting current Twitch channel: ' + _context3.t0.message);
        case 16:
        case "end":
          return _context3.stop();
      }
    }, _callee3, null, [[0, 12]]);
  }));
  return _getCurrentChannel.apply(this, arguments);
}
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === 'analyzeSentiment' || request.type === 'analyzeToxicity') {
    var comment = request.comment;
    var url = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=".concat(OAUTH_CLIENT_ID);
    var data = {
      comment: {
        text: comment
      },
      languages: ['en'],
      requestedAttributes: {
        TOXICITY: {}
      }
    };
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      var score = data.attributeScores.TOXICITY.summaryScore.value;
      sendResponse({
        score: score
      });
    })["catch"](function (error) {
      console.error('Error:', error);
      sendResponse({
        error: 'Error analyzing comment'
      });
    });
    return true; // Will respond asynchronously.
  }
  // Other message handling...
});

// Function to handle Twitch chat messages
var handleChatMessage = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(channel, userstate, message, self) {
    var sentimentScore, toxicityScore;
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!self) {
            _context.next = 2;
            break;
          }
          return _context.abrupt("return");
        case 2:
          // Variables to store the sentiment and toxicity scores
          sentimentScore = null;
          toxicityScore = null;
          _context.prev = 4;
          if (enableSentimentAnalysis) {
            sentimentScore = analyzeSentiment(message);
          }
          if (!enableToxicityDetection) {
            _context.next = 10;
            break;
          }
          _context.next = 9;
          return analyzeToxicity(message);
        case 9:
          toxicityScore = _context.sent;
        case 10:
          _context.next = 15;
          break;
        case 12:
          _context.prev = 12;
          _context.t0 = _context["catch"](4);
          console.error('Error analyzing message:', _context.t0);
        case 15:
          // Handle the message based on the sentiment and toxicity scores
          if (sentimentScore !== null && toxicityScore !== null) {
            handleBothScores(sentimentScore, toxicityScore, userstate.username);
          } else if (sentimentScore !== null) {
            handleSentimentScore(sentimentScore, userstate.username);
          } else if (toxicityScore !== null) {
            handleToxicityScore(toxicityScore, userstate.username);
          }
          // If neither sentiment analysis nor toxicity detection are enabled, just display the message
          // as is
        case 16:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[4, 12]]);
  }));
  return function handleChatMessage(_x3, _x4, _x5, _x6) {
    return _ref.apply(this, arguments);
  };
}();
var handleBothScores = function handleBothScores(sentimentScore, toxicityScore, username) {
  if (sentimentScore < sentimentOptions.threshold && toxicityScore > toxicityOptions.threshold) {
    takeAction(username);
  }
};
var handleSentimentScore = function handleSentimentScore(sentimentScore, username) {
  if (sentimentScore < sentimentOptions.threshold) {
    takeAction(username);
  }
};
var handleToxicityScore = function handleToxicityScore(toxicityScore, username) {
  if (toxicityScore > toxicityOptions.threshold) {
    takeAction(username);
  }
};
var takeAction = function takeAction(username) {
  if (warningToxicUser) {
    sendWarning(username, warningMessageToxic);
  }
  if (customMessageToxicUser) {
    sendCustomMessage(username, customMessageToxic);
  }
  if (customMessageNegativeUser) {
    sendCustomMessage(username, customMessageNegative);
  }
};

// Function to send a warning to the extension user
function sendWarningToExtUser(warningMessage) {
  // Display the warning message to the extension user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'StreamMatey Warning',
    message: warningMessage
  });
}
function monitorTwitchChat() {
  return _monitorTwitchChat.apply(this, arguments);
} // Start monitoring Twitch chat when the extension is installed or updated
function _monitorTwitchChat() {
  _monitorTwitchChat = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
    return _regeneratorRuntime().wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          try {
            // Get the encrypted Twitch access token and encryption key from Chrome's sync storage
            chrome.storage.sync.get(['twitchAccessToken', 'encryptionKey'], /*#__PURE__*/function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4(data) {
                var encryptedAccessToken, encryptionKey, twitchAccessToken, channel, options, client;
                return _regeneratorRuntime().wrap(function _callee4$(_context4) {
                  while (1) switch (_context4.prev = _context4.next) {
                    case 0:
                      if (!chrome.runtime.lastError) {
                        _context4.next = 4;
                        break;
                      }
                      console.error('Error loading Twitch access token or encryption key:', chrome.runtime.lastError);
                      displayError('Error loading Twitch access token or encryption key: ' + chrome.runtime.lastError.message);
                      return _context4.abrupt("return");
                    case 4:
                      encryptedAccessToken = data.twitchAccessToken;
                      encryptionKey = data.encryptionKey;
                      if (!(!encryptedAccessToken || !encryptionKey)) {
                        _context4.next = 10;
                        break;
                      }
                      console.error('Error: Twitch access token or encryption key not found');
                      displayError('Error: Twitch access token or encryption key not found');
                      return _context4.abrupt("return");
                    case 10:
                      _context4.next = 12;
                      return decrypt(encryptedAccessToken, encryptionKey);
                    case 12:
                      twitchAccessToken = _context4.sent;
                      _context4.next = 15;
                      return getCurrentChannel(twitchAccessToken, twitchClientId);
                    case 15:
                      channel = _context4.sent;
                      // Configure the Twitch chat client
                      options = {
                        options: {
                          debug: true
                        },
                        connection: {
                          reconnect: true
                        },
                        identity: {
                          username: channel,
                          password: "oauth:".concat(twitchAccessToken)
                        },
                        channels: [channel]
                      };
                      client = new tmi.client(options); // Connect to the Twitch chat
                      client.connect();
                      // Listen for chat messages
                      client.on('message', handleChatMessage);
                    case 20:
                    case "end":
                      return _context4.stop();
                  }
                }, _callee4);
              }));
              return function (_x11) {
                return _ref2.apply(this, arguments);
              };
            }());
          } catch (error) {
            console.error('Error monitoring Twitch chat:', error);
            displayError('Error monitoring Twitch chat: ' + error.message);
          }
        case 1:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _monitorTwitchChat.apply(this, arguments);
}
chrome.runtime.onInstalled.addListener(monitorTwitchChat);

// Listen for messages from the options page
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === 'initiateTwitchOAuth') {
    initiateTwitchOAuth();
  } else if (request.message === 'fetchChatMessages') {
    fetchChatMessages(request.channel).then(function (chatMessages) {
      return sendResponse(chatMessages);
    })["catch"](function (error) {
      return console.error('Error fetching chat messages:', error);
    });
  } else if (request.message === 'monitorTwitchChat') {
    monitorTwitchChat();
  }
});

// Get Twitch Access Token from Chrome Storage
var twitchAccessToken;
chrome.storage.sync.get('twitchAccessToken', function (data) {
  twitchAccessToken = data.twitchAccessToken;
  if (!twitchAccessToken) {
    console.error('Error: Twitch access token not found');
    displayError('Error: Twitch access token not found');
  }
});
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({
    url: 'options.html'
  });
});

// Function to handle errors
function handleError(error, message) {
  console.error(message, error);
  sendWarningToExtUser("".concat(message, ": ").concat(error.message));
}

// Function to display an error to the extension user
function displayError(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'StreamMatey Error',
    message: message
  });
}

// Function to convert ArrayBuffer to Hexadecimal
function buf2hex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), function (x) {
    return ('00' + x.toString(16)).slice(-2);
  }).join('');
}

// Encryption function
function encrypt(_x7, _x8) {
  return _encrypt.apply(this, arguments);
}
function _encrypt() {
  _encrypt = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee6(data, jwk) {
    var key, encoded, iv, encrypted, encryptedStr;
    return _regeneratorRuntime().wrap(function _callee6$(_context6) {
      while (1) switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return window.crypto.subtle.importKey('jwk', jwk, {
            name: "AES-GCM"
          }, false, ["encrypt", "decrypt"]);
        case 2:
          key = _context6.sent;
          encoded = new TextEncoder().encode(JSON.stringify(data));
          iv = window.crypto.getRandomValues(new Uint8Array(12));
          _context6.prev = 5;
          _context6.next = 8;
          return window.crypto.subtle.encrypt({
            name: "AES-GCM",
            iv: iv
          }, key, encoded);
        case 8:
          encrypted = _context6.sent;
          // Convert to Base64 and prepend IV for storage
          encryptedStr = btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(encrypted)))));
          return _context6.abrupt("return", btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, iv)))) + ',' + encryptedStr);
        case 13:
          _context6.prev = 13;
          _context6.t0 = _context6["catch"](5);
          console.error(_context6.t0);
          displayError('Error encrypting data: ' + _context6.t0.message);
          throw _context6.t0;
        case 18:
        case "end":
          return _context6.stop();
      }
    }, _callee6, null, [[5, 13]]);
  }));
  return _encrypt.apply(this, arguments);
}
function decrypt(_x9, _x10) {
  return _decrypt.apply(this, arguments);
}
function _decrypt() {
  _decrypt = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee7(data, jwk) {
    var key, parts, iv, encrypted, decrypted;
    return _regeneratorRuntime().wrap(function _callee7$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          _context7.next = 2;
          return window.crypto.subtle.importKey('jwk', jwk, {
            name: "AES-GCM"
          }, false, ["encrypt", "decrypt"]);
        case 2:
          key = _context7.sent;
          parts = data.split(',');
          iv = new Uint8Array(decodeURIComponent(escape(atob(parts[0]))).split('').map(function (c) {
            return c.charCodeAt(0);
          }));
          encrypted = new Uint8Array(decodeURIComponent(escape(atob(parts[1]))).split('').map(function (c) {
            return c.charCodeAt(0);
          }));
          _context7.prev = 6;
          _context7.next = 9;
          return window.crypto.subtle.decrypt({
            name: "AES-GCM",
            iv: iv
          }, key, encrypted);
        case 9:
          decrypted = _context7.sent;
          return _context7.abrupt("return", JSON.parse(new TextDecoder().decode(decrypted)));
        case 13:
          _context7.prev = 13;
          _context7.t0 = _context7["catch"](6);
          console.error(_context7.t0);
          displayError('Error decrypting data: ' + _context7.t0.message);
          throw _context7.t0;
        case 18:
        case "end":
          return _context7.stop();
      }
    }, _callee7, null, [[6, 13]]);
  }));
  return _decrypt.apply(this, arguments);
}
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixTQUFTLEVBQUUsSUFBSTtBQUN2QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFHQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxHQUFHO0FBQ2QsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxHQUFHO0FBQ2Q7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkLGFBQWEsU0FBUztBQUN0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxHQUFHO0FBQ2Q7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkO0FBQ0EsYUFBYSxTQUFTO0FBQ3RCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxHQUFHO0FBQ2Q7QUFDQSxhQUFhLFNBQVM7QUFDdEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQjtBQUNBLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxjQUFjO0FBQ3pCLFdBQVcsVUFBVTtBQUNyQjtBQUNBLFdBQVcsU0FBUztBQUNwQixhQUFhO0FBQ2I7QUFDQSwyQkFBMkIsb0JBQW9CLElBQUk7QUFDbkQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxnQ0FBZ0MsT0FBTztBQUN2QztBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBLGdCQUFnQixTQUFTO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esd0ZBQXdGLHFCQUFNO0FBQzlGLENBQUM7O0FBRUQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsU0FBUyxHQUFHLFNBQVM7QUFDNUMsNEJBQTRCO0FBQzVCO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkI7QUFDQSxhQUFhLFFBQVE7QUFDckI7QUFDQTtBQUNBLFNBQVMsVUFBVTtBQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOLGtDQUFrQztBQUNsQyxNQUFNO0FBQ047QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBLHdDQUF3QyxPQUFPO0FBQy9DO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CO0FBQ0EsV0FBVyxTQUFTO0FBQ3BCLGFBQWEsUUFBUTtBQUNyQjtBQUNBLGdDQUFnQyxXQUFXLElBQUk7QUFDL0M7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQSxHQUFHLEdBQUcsV0FBVztBQUNqQjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQjtBQUNBLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsV0FBVyxVQUFVO0FBQ3JCLFdBQVcsVUFBVTtBQUNyQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBOztBQUVBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CLFdBQVcsa0JBQWtCO0FBQzdCLFdBQVcsVUFBVTtBQUNyQjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJOztBQUVKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkI7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsR0FBRztBQUNkO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0EsV0FBVyxrQkFBa0I7QUFDN0IsV0FBVyxVQUFVO0FBQ3JCO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkI7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDBCQUEwQixlQUFlOztBQUV6QztBQUNBO0FBQ0E7QUFDQSxXQUFXLEdBQUc7QUFDZDtBQUNBLGFBQWEsU0FBUztBQUN0QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25COztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUyxRQUFRO0FBQ2pCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsU0FBUztBQUNwQjtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkI7QUFDQSxhQUFhLE9BQU87QUFDcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVCQUF1QjtBQUN2QixDQUFDOztBQUVEO0FBQ0Esb0RBQW9ELFlBQVk7O0FBRWhFO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0EsR0FBRzs7QUFFSDs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQjtBQUNBLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CLFdBQVcsUUFBUTtBQUNuQjtBQUNBLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFlBQVk7QUFDdkI7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsK0NBQStDO0FBQy9DO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxTQUFTO0FBQ3BCLFdBQVcsU0FBUztBQUNwQixXQUFXLFVBQVU7QUFDckIsV0FBVyxTQUFTO0FBQ3BCLFdBQVcsU0FBUztBQUNwQixXQUFXLFVBQVU7QUFDckI7QUFDQSxhQUFhO0FBQ2I7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxrQkFBa0I7QUFDN0IsV0FBVyxRQUFRO0FBQ25CLFdBQVcscUJBQXFCO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsR0FBRztBQUNoQixhQUFhLGVBQWU7QUFDNUIsYUFBYSxzQkFBc0I7QUFDbkMsWUFBWTtBQUNaO0FBQ0EsZUFBZSxTQUFTO0FBQ3hCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGlDQUFpQztBQUNqQztBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQjtBQUNBLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLHFCQUFxQjtBQUNoQyxXQUFXLHFCQUFxQjtBQUNoQztBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSTs7QUFFSjtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CO0FBQ0EsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixXQUFXLFFBQVE7QUFDbkIsV0FBVyxTQUFTO0FBQ3BCO0FBQ0EsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLFVBQVU7QUFDdkIsYUFBYSxVQUFVO0FBQ3ZCO0FBQ0EsY0FBYyxRQUFRO0FBQ3RCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYSxRQUFRO0FBQ3JCO0FBQ0EsZUFBZSxTQUFTO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxlQUFlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsVUFBVTtBQUN2QjtBQUNBLGVBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOzs7QUFHRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtB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QUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxX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QUFFQTtBQUNBO0FBQ0EsOENBQThDO0FBQzlDLFFBQVE7QUFDUiwyREFBMkQsV0FBVztBQUN0RTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBLE9BQU87O0FBRVA7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztB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Q0FBQztVQUFBTixTQUFBLENBQUF0TixJQUFBO1VBQUFzTixTQUFBLENBQUE1UCxJQUFBO1VBQUEsT0FHbEZ5TyxNQUFNLENBQUNDLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDbkMsT0FBTyxDQUNoRDtZQUNJaEwsSUFBSSxFQUFFLFNBQVM7WUFDZjRNLEVBQUUsRUFBRUE7VUFDUixDQUFDLEVBQ0RoVCxHQUFHLEVBQ0hpVCxTQUNKLENBQUM7UUFBQTtVQVBLcUIsU0FBUyxHQUFBRSxTQUFBLENBQUF0USxJQUFBO1VBQUEsT0FBQXNRLFNBQUEsQ0FBQW5RLE1BQUEsV0FRUjRKLElBQUksQ0FBQzhHLEtBQUssQ0FBQyxJQUFJQyxXQUFXLENBQUMsQ0FBQyxDQUFDQyxNQUFNLENBQUNYLFNBQVMsQ0FBQyxDQUFDO1FBQUE7VUFBQUUsU0FBQSxDQUFBdE4sSUFBQTtVQUFBc04sU0FBQSxDQUFBbEosRUFBQSxHQUFBa0osU0FBQTtVQUV0RHpKLE9BQU8sQ0FBQ3RILEtBQUssQ0FBQStRLFNBQUEsQ0FBQWxKLEVBQUksQ0FBQztVQUNsQk4sWUFBWSxDQUFDLHlCQUF5QixHQUFHd0osU0FBQSxDQUFBbEosRUFBQSxDQUFJdkIsT0FBTyxDQUFDO1VBQUMsTUFBQXlLLFNBQUEsQ0FBQWxKLEVBQUE7UUFBQTtRQUFBO1VBQUEsT0FBQWtKLFNBQUEsQ0FBQW5OLElBQUE7TUFBQTtJQUFBLEdBQUErTSxRQUFBO0VBQUEsQ0FJM0Q7RUFBQSxPQUFBRCxRQUFBLENBQUF4TCxLQUFBLE9BQUFELFNBQUE7QUFBQSxDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvLi9ub2RlX21vZHVsZXMvdG1pLmpzL2luZGV4LmpzIiwid2VicGFjazovL3N0cmVhbW1hdGV5Ly4vbm9kZV9tb2R1bGVzL3RtaS5qcy9saWIvYXBpLmpzIiwid2VicGFjazovL3N0cmVhbW1hdGV5Ly4vbm9kZV9tb2R1bGVzL3RtaS5qcy9saWIvY2xpZW50LmpzIiwid2VicGFjazovL3N0cmVhbW1hdGV5Ly4vbm9kZV9tb2R1bGVzL3RtaS5qcy9saWIvY29tbWFuZHMuanMiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvLi9ub2RlX21vZHVsZXMvdG1pLmpzL2xpYi9ldmVudHMuanMiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvLi9ub2RlX21vZHVsZXMvdG1pLmpzL2xpYi9sb2dnZXIuanMiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvLi9ub2RlX21vZHVsZXMvdG1pLmpzL2xpYi9wYXJzZXIuanMiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvLi9ub2RlX21vZHVsZXMvdG1pLmpzL2xpYi90aW1lci5qcyIsIndlYnBhY2s6Ly9zdHJlYW1tYXRleS8uL25vZGVfbW9kdWxlcy90bWkuanMvbGliL3V0aWxzLmpzIiwid2VicGFjazovL3N0cmVhbW1hdGV5L2lnbm9yZWR8QzpcXFVzZXJzXFx3YXRlclxcc291cmNlXFxyZXBvc1xcU3RyZWFtTWF0ZXlcXG5vZGVfbW9kdWxlc1xcdG1pLmpzXFxsaWJ8bm9kZS1mZXRjaCIsIndlYnBhY2s6Ly9zdHJlYW1tYXRleS9pZ25vcmVkfEM6XFxVc2Vyc1xcd2F0ZXJcXHNvdXJjZVxccmVwb3NcXFN0cmVhbU1hdGV5XFxub2RlX21vZHVsZXNcXHRtaS5qc1xcbGlifHdzIiwid2VicGFjazovL3N0cmVhbW1hdGV5Ly4vbm9kZV9tb2R1bGVzL2F4aW9zL2Rpc3QvYnJvd3Nlci9heGlvcy5janMiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vc3RyZWFtbWF0ZXkvd2VicGFjay9ydW50aW1lL2dsb2JhbCIsIndlYnBhY2s6Ly9zdHJlYW1tYXRleS8uL3NyYy9iYWNrZ3JvdW5kLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNsaWVudCA9IHJlcXVpcmUoJy4vbGliL2NsaWVudCcpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNsaWVudCxcblx0Q2xpZW50OiBjbGllbnRcbn07XG4iLCJjb25zdCBmZXRjaCA9IHJlcXVpcmUoJ25vZGUtZmV0Y2gnKTtcbmNvbnN0IF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXBpKG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdC8vIFNldCB0aGUgdXJsIHRvIG9wdGlvbnMudXJpIG9yIG9wdGlvbnMudXJsLi5cblx0bGV0IHVybCA9IG9wdGlvbnMudXJsICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLnVybCA6IG9wdGlvbnMudXJpO1xuXG5cdC8vIE1ha2Ugc3VyZSBpdCBpcyBhIHZhbGlkIHVybC4uXG5cdGlmKCFfLmlzVVJMKHVybCkpIHtcblx0XHR1cmwgPSBgaHR0cHM6Ly9hcGkudHdpdGNoLnR2L2tyYWtlbiR7dXJsWzBdID09PSAnLycgPyB1cmwgOiBgLyR7dXJsfWB9YDtcblx0fVxuXG5cdC8vIFdlIGFyZSBpbnNpZGUgYSBOb2RlIGFwcGxpY2F0aW9uLCBzbyB3ZSBjYW4gdXNlIHRoZSBub2RlLWZldGNoIG1vZHVsZS4uXG5cdGlmKF8uaXNOb2RlKCkpIHtcblx0XHRjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG1ldGhvZDogJ0dFVCcsIGpzb246IHRydWUgfSwgb3B0aW9ucyk7XG5cdFx0aWYob3B0cy5xcykge1xuXHRcdFx0Y29uc3QgcXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKG9wdHMucXMpO1xuXHRcdFx0dXJsICs9IGA/JHtxc31gO1xuXHRcdH1cblx0XHQvKiogQHR5cGUge2ltcG9ydCgnbm9kZS1mZXRjaCcpLlJlcXVlc3RJbml0fSAqL1xuXHRcdGNvbnN0IGZldGNoT3B0aW9ucyA9IHt9O1xuXHRcdGlmKCdmZXRjaEFnZW50JyBpbiB0aGlzLm9wdHMuY29ubmVjdGlvbikge1xuXHRcdFx0ZmV0Y2hPcHRpb25zLmFnZW50ID0gdGhpcy5vcHRzLmNvbm5lY3Rpb24uZmV0Y2hBZ2VudDtcblx0XHR9XG5cdFx0LyoqIEB0eXBlIHtSZXR1cm5UeXBlPGltcG9ydCgnbm9kZS1mZXRjaCcpWydkZWZhdWx0J10+fSAqL1xuXHRcdGNvbnN0IGZldGNoUHJvbWlzZSA9IGZldGNoKHVybCwge1xuXHRcdFx0Li4uZmV0Y2hPcHRpb25zLFxuXHRcdFx0bWV0aG9kOiBvcHRzLm1ldGhvZCxcblx0XHRcdGhlYWRlcnM6IG9wdHMuaGVhZGVycyxcblx0XHRcdGJvZHk6IG9wdHMuYm9keVxuXHRcdH0pO1xuXHRcdGxldCByZXNwb25zZSA9IHt9O1xuXHRcdGZldGNoUHJvbWlzZS50aGVuKHJlcyA9PiB7XG5cdFx0XHRyZXNwb25zZSA9IHsgc3RhdHVzQ29kZTogcmVzLnN0YXR1cywgaGVhZGVyczogcmVzLmhlYWRlcnMgfTtcblx0XHRcdHJldHVybiBvcHRzLmpzb24gPyByZXMuanNvbigpIDogcmVzLnRleHQoKTtcblx0XHR9KVxuXHRcdC50aGVuKFxuXHRcdFx0ZGF0YSA9PiBjYWxsYmFjayhudWxsLCByZXNwb25zZSwgZGF0YSksXG5cdFx0XHRlcnIgPT4gY2FsbGJhY2soZXJyLCByZXNwb25zZSwgbnVsbClcblx0XHQpO1xuXHR9XG5cdC8vIFdlYiBhcHBsaWNhdGlvbiwgZXh0ZW5zaW9uLCBSZWFjdCBOYXRpdmUgZXRjLlxuXHRlbHNlIHtcblx0XHRjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7IG1ldGhvZDogJ0dFVCcsIGhlYWRlcnM6IHt9IH0sIG9wdGlvbnMsIHsgdXJsIH0pO1xuXHRcdC8vIHByZXBhcmUgcmVxdWVzdFxuXHRcdGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKG9wdHMubWV0aG9kLCBvcHRzLnVybCwgdHJ1ZSk7XG5cdFx0Zm9yKGNvbnN0IG5hbWUgaW4gb3B0cy5oZWFkZXJzKSB7XG5cdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCBvcHRzLmhlYWRlcnNbbmFtZV0pO1xuXHRcdH1cblx0XHR4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuXHRcdC8vIHNldCByZXF1ZXN0IGhhbmRsZXJcblx0XHR4aHIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIF9ldiA9PiB7XG5cdFx0XHRpZih4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0XHRpZih4aHIuc3RhdHVzICE9PSAyMDApIHtcblx0XHRcdFx0XHRjYWxsYmFjayh4aHIuc3RhdHVzLCBudWxsLCBudWxsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCBudWxsLCB4aHIucmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Ly8gc3VibWl0XG5cdFx0eGhyLnNlbmQoKTtcblx0fVxufTtcbiIsImNvbnN0IF9nbG9iYWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge307XHJcbmNvbnN0IF9XZWJTb2NrZXQgPSBfZ2xvYmFsLldlYlNvY2tldCB8fCByZXF1aXJlKCd3cycpO1xyXG5jb25zdCBfZmV0Y2ggPSBfZ2xvYmFsLmZldGNoIHx8IHJlcXVpcmUoJ25vZGUtZmV0Y2gnKTtcclxuY29uc3QgYXBpID0gcmVxdWlyZSgnLi9hcGknKTtcclxuY29uc3QgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzJyk7XHJcbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xyXG5jb25zdCBsb2dnZXIgPSByZXF1aXJlKCcuL2xvZ2dlcicpO1xyXG5jb25zdCBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2VyJyk7XHJcbmNvbnN0IFF1ZXVlID0gcmVxdWlyZSgnLi90aW1lcicpO1xyXG5jb25zdCBfID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxubGV0IF9hcGlXYXJuZWQgPSBmYWxzZTtcclxuXHJcbi8vIENsaWVudCBpbnN0YW5jZS4uXHJcbmNvbnN0IGNsaWVudCA9IGZ1bmN0aW9uIGNsaWVudChvcHRzKSB7XHJcblx0aWYodGhpcyBpbnN0YW5jZW9mIGNsaWVudCA9PT0gZmFsc2UpIHsgcmV0dXJuIG5ldyBjbGllbnQob3B0cyk7IH1cclxuXHR0aGlzLm9wdHMgPSBfLmdldChvcHRzLCB7fSk7XHJcblx0dGhpcy5vcHRzLmNoYW5uZWxzID0gdGhpcy5vcHRzLmNoYW5uZWxzIHx8IFtdO1xyXG5cdHRoaXMub3B0cy5jb25uZWN0aW9uID0gdGhpcy5vcHRzLmNvbm5lY3Rpb24gfHwge307XHJcblx0dGhpcy5vcHRzLmlkZW50aXR5ID0gdGhpcy5vcHRzLmlkZW50aXR5IHx8IHt9O1xyXG5cdHRoaXMub3B0cy5vcHRpb25zID0gdGhpcy5vcHRzLm9wdGlvbnMgfHwge307XHJcblxyXG5cdHRoaXMuY2xpZW50SWQgPSBfLmdldCh0aGlzLm9wdHMub3B0aW9ucy5jbGllbnRJZCwgbnVsbCk7XHJcblx0dGhpcy5fZ2xvYmFsRGVmYXVsdENoYW5uZWwgPSBfLmNoYW5uZWwoXy5nZXQodGhpcy5vcHRzLm9wdGlvbnMuZ2xvYmFsRGVmYXVsdENoYW5uZWwsICcjdG1panMnKSk7XHJcblx0dGhpcy5fc2tpcE1lbWJlcnNoaXAgPSBfLmdldCh0aGlzLm9wdHMub3B0aW9ucy5za2lwTWVtYmVyc2hpcCwgZmFsc2UpO1xyXG5cdHRoaXMuX3NraXBVcGRhdGluZ0Vtb3Rlc2V0cyA9IF8uZ2V0KHRoaXMub3B0cy5vcHRpb25zLnNraXBVcGRhdGluZ0Vtb3Rlc2V0cywgZmFsc2UpO1xyXG5cdHRoaXMuX3VwZGF0ZUVtb3Rlc2V0c1RpbWVyID0gbnVsbDtcclxuXHR0aGlzLl91cGRhdGVFbW90ZXNldHNUaW1lckRlbGF5ID0gXy5nZXQodGhpcy5vcHRzLm9wdGlvbnMudXBkYXRlRW1vdGVzZXRzVGltZXIsIDYwMDAwKTtcclxuXHJcblx0dGhpcy5tYXhSZWNvbm5lY3RBdHRlbXB0cyA9IF8uZ2V0KHRoaXMub3B0cy5jb25uZWN0aW9uLm1heFJlY29ubmVjdEF0dGVtcHRzLCBJbmZpbml0eSk7XHJcblx0dGhpcy5tYXhSZWNvbm5lY3RJbnRlcnZhbCA9IF8uZ2V0KHRoaXMub3B0cy5jb25uZWN0aW9uLm1heFJlY29ubmVjdEludGVydmFsLCAzMDAwMCk7XHJcblx0dGhpcy5yZWNvbm5lY3QgPSBfLmdldCh0aGlzLm9wdHMuY29ubmVjdGlvbi5yZWNvbm5lY3QsIHRydWUpO1xyXG5cdHRoaXMucmVjb25uZWN0RGVjYXkgPSBfLmdldCh0aGlzLm9wdHMuY29ubmVjdGlvbi5yZWNvbm5lY3REZWNheSwgMS41KTtcclxuXHR0aGlzLnJlY29ubmVjdEludGVydmFsID0gXy5nZXQodGhpcy5vcHRzLmNvbm5lY3Rpb24ucmVjb25uZWN0SW50ZXJ2YWwsIDEwMDApO1xyXG5cclxuXHR0aGlzLnJlY29ubmVjdGluZyA9IGZhbHNlO1xyXG5cdHRoaXMucmVjb25uZWN0aW9ucyA9IDA7XHJcblx0dGhpcy5yZWNvbm5lY3RUaW1lciA9IHRoaXMucmVjb25uZWN0SW50ZXJ2YWw7XHJcblxyXG5cdHRoaXMuc2VjdXJlID0gXy5nZXQoXHJcblx0XHR0aGlzLm9wdHMuY29ubmVjdGlvbi5zZWN1cmUsXHJcblx0XHQhdGhpcy5vcHRzLmNvbm5lY3Rpb24uc2VydmVyICYmICF0aGlzLm9wdHMuY29ubmVjdGlvbi5wb3J0XHJcblx0KTtcclxuXHJcblx0Ly8gUmF3IGRhdGEgYW5kIG9iamVjdCBmb3IgZW1vdGUtc2V0cy4uXHJcblx0dGhpcy5lbW90ZXMgPSAnJztcclxuXHR0aGlzLmVtb3Rlc2V0cyA9IHt9O1xyXG5cclxuXHR0aGlzLmNoYW5uZWxzID0gW107XHJcblx0dGhpcy5jdXJyZW50TGF0ZW5jeSA9IDA7XHJcblx0dGhpcy5nbG9iYWx1c2Vyc3RhdGUgPSB7fTtcclxuXHR0aGlzLmxhc3RKb2luZWQgPSAnJztcclxuXHR0aGlzLmxhdGVuY3kgPSBuZXcgRGF0ZSgpO1xyXG5cdHRoaXMubW9kZXJhdG9ycyA9IHt9O1xyXG5cdHRoaXMucGluZ0xvb3AgPSBudWxsO1xyXG5cdHRoaXMucGluZ1RpbWVvdXQgPSBudWxsO1xyXG5cdHRoaXMucmVhc29uID0gJyc7XHJcblx0dGhpcy51c2VybmFtZSA9ICcnO1xyXG5cdHRoaXMudXNlcnN0YXRlID0ge307XHJcblx0dGhpcy53YXNDbG9zZUNhbGxlZCA9IGZhbHNlO1xyXG5cdHRoaXMud3MgPSBudWxsO1xyXG5cclxuXHQvLyBDcmVhdGUgdGhlIGxvZ2dlci4uXHJcblx0bGV0IGxldmVsID0gJ2Vycm9yJztcclxuXHRpZih0aGlzLm9wdHMub3B0aW9ucy5kZWJ1ZykgeyBsZXZlbCA9ICdpbmZvJzsgfVxyXG5cdHRoaXMubG9nID0gdGhpcy5vcHRzLmxvZ2dlciB8fCBsb2dnZXI7XHJcblxyXG5cdHRyeSB7IGxvZ2dlci5zZXRMZXZlbChsZXZlbCk7IH0gY2F0Y2goZXJyKSB7fVxyXG5cclxuXHQvLyBGb3JtYXQgdGhlIGNoYW5uZWwgbmFtZXMuLlxyXG5cdHRoaXMub3B0cy5jaGFubmVscy5mb3JFYWNoKChwYXJ0LCBpbmRleCwgdGhlQXJyYXkpID0+XHJcblx0XHR0aGVBcnJheVtpbmRleF0gPSBfLmNoYW5uZWwocGFydClcclxuXHQpO1xyXG5cclxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHR0aGlzLnNldE1heExpc3RlbmVycygwKTtcclxufTtcclxuXHJcbl8uaW5oZXJpdHMoY2xpZW50LCBFdmVudEVtaXR0ZXIpO1xyXG5cclxuLy8gUHV0IGFsbCBjb21tYW5kcyBpbiBwcm90b3R5cGUuLlxyXG5mb3IoY29uc3QgbWV0aG9kTmFtZSBpbiBjb21tYW5kcykge1xyXG5cdGNsaWVudC5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBjb21tYW5kc1ttZXRob2ROYW1lXTtcclxufVxyXG5cclxuLy8gRW1pdCBtdWx0aXBsZSBldmVudHMuLlxyXG5jbGllbnQucHJvdG90eXBlLmVtaXRzID0gZnVuY3Rpb24gZW1pdHModHlwZXMsIHZhbHVlcykge1xyXG5cdGZvcihsZXQgaSA9IDA7IGkgPCB0eXBlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc3QgdmFsID0gaSA8IHZhbHVlcy5sZW5ndGggPyB2YWx1ZXNbaV0gOiB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdO1xyXG5cdFx0dGhpcy5lbWl0LmFwcGx5KHRoaXMsIFsgdHlwZXNbaV0gXS5jb25jYXQodmFsKSk7XHJcblx0fVxyXG59O1xyXG4vKiogQGRlcHJlY2F0ZWQgKi9cclxuY2xpZW50LnByb3RvdHlwZS5hcGkgPSBmdW5jdGlvbiguLi5hcmdzKSB7XHJcblx0aWYoIV9hcGlXYXJuZWQpIHtcclxuXHRcdHRoaXMubG9nLndhcm4oJ0NsaWVudC5wcm90b3R5cGUuYXBpIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBmb3IgdmVyc2lvbiAyLjAuMCcpO1xyXG5cdFx0X2FwaVdhcm5lZCA9IHRydWU7XHJcblx0fVxyXG5cdGFwaSguLi5hcmdzKTtcclxufTtcclxuLy8gSGFuZGxlIHBhcnNlZCBjaGF0IHNlcnZlciBtZXNzYWdlLi5cclxuY2xpZW50LnByb3RvdHlwZS5oYW5kbGVNZXNzYWdlID0gZnVuY3Rpb24gaGFuZGxlTWVzc2FnZShtZXNzYWdlKSB7XHJcblx0aWYoIW1lc3NhZ2UpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGlmKHRoaXMubGlzdGVuZXJDb3VudCgncmF3X21lc3NhZ2UnKSkge1xyXG5cdFx0dGhpcy5lbWl0KCdyYXdfbWVzc2FnZScsIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpLCBtZXNzYWdlKTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGNoYW5uZWwgPSBfLmNoYW5uZWwoXy5nZXQobWVzc2FnZS5wYXJhbXNbMF0sIG51bGwpKTtcclxuXHRsZXQgbXNnID0gXy5nZXQobWVzc2FnZS5wYXJhbXNbMV0sIG51bGwpO1xyXG5cdGNvbnN0IG1zZ2lkID0gXy5nZXQobWVzc2FnZS50YWdzWydtc2ctaWQnXSwgbnVsbCk7XHJcblxyXG5cdC8vIFBhcnNlIGJhZGdlcywgYmFkZ2UtaW5mbyBhbmQgZW1vdGVzLi5cclxuXHRjb25zdCB0YWdzID0gbWVzc2FnZS50YWdzID0gcGFyc2UuYmFkZ2VzKHBhcnNlLmJhZGdlSW5mbyhwYXJzZS5lbW90ZXMobWVzc2FnZS50YWdzKSkpO1xyXG5cclxuXHQvLyBUcmFuc2Zvcm0gSVJDdjMgdGFncy4uXHJcblx0Zm9yKGNvbnN0IGtleSBpbiB0YWdzKSB7XHJcblx0XHRpZihrZXkgPT09ICdlbW90ZS1zZXRzJyB8fCBrZXkgPT09ICdiYW4tZHVyYXRpb24nIHx8IGtleSA9PT0gJ2JpdHMnKSB7XHJcblx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0fVxyXG5cdFx0bGV0IHZhbHVlID0gdGFnc1trZXldO1xyXG5cdFx0aWYodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHsgdmFsdWUgPSBudWxsOyB9XHJcblx0XHRlbHNlIGlmKHZhbHVlID09PSAnMScpIHsgdmFsdWUgPSB0cnVlOyB9XHJcblx0XHRlbHNlIGlmKHZhbHVlID09PSAnMCcpIHsgdmFsdWUgPSBmYWxzZTsgfVxyXG5cdFx0ZWxzZSBpZih0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7IHZhbHVlID0gXy51bmVzY2FwZUlSQyh2YWx1ZSk7IH1cclxuXHRcdHRhZ3Nba2V5XSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gTWVzc2FnZXMgd2l0aCBubyBwcmVmaXguLlxyXG5cdGlmKG1lc3NhZ2UucHJlZml4ID09PSBudWxsKSB7XHJcblx0XHRzd2l0Y2gobWVzc2FnZS5jb21tYW5kKSB7XHJcblx0XHRcdC8vIFJlY2VpdmVkIFBJTkcgZnJvbSBzZXJ2ZXIuLlxyXG5cdFx0XHRjYXNlICdQSU5HJzpcclxuXHRcdFx0XHR0aGlzLmVtaXQoJ3BpbmcnKTtcclxuXHRcdFx0XHRpZih0aGlzLl9pc0Nvbm5lY3RlZCgpKSB7XHJcblx0XHRcdFx0XHR0aGlzLndzLnNlbmQoJ1BPTkcnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHQvLyBSZWNlaXZlZCBQT05HIGZyb20gc2VydmVyLCByZXR1cm4gY3VycmVudCBsYXRlbmN5Li5cclxuXHRcdFx0Y2FzZSAnUE9ORyc6IHtcclxuXHRcdFx0XHRjb25zdCBjdXJyRGF0ZSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50TGF0ZW5jeSA9IChjdXJyRGF0ZS5nZXRUaW1lKCkgLSB0aGlzLmxhdGVuY3kuZ2V0VGltZSgpKSAvIDEwMDA7XHJcblx0XHRcdFx0dGhpcy5lbWl0cyhbICdwb25nJywgJ19wcm9taXNlUGluZycgXSwgWyBbIHRoaXMuY3VycmVudExhdGVuY3kgXSBdKTtcclxuXHJcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucGluZ1RpbWVvdXQpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHRoaXMubG9nLndhcm4oYENvdWxkIG5vdCBwYXJzZSBtZXNzYWdlIHdpdGggbm8gcHJlZml4OlxcbiR7SlNPTi5zdHJpbmdpZnkobWVzc2FnZSwgbnVsbCwgNCl9YCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHJcblx0Ly8gTWVzc2FnZXMgd2l0aCBcInRtaS50d2l0Y2gudHZcIiBhcyBhIHByZWZpeC4uXHJcblx0ZWxzZSBpZihtZXNzYWdlLnByZWZpeCA9PT0gJ3RtaS50d2l0Y2gudHYnKSB7XHJcblx0XHRzd2l0Y2gobWVzc2FnZS5jb21tYW5kKSB7XHJcblx0XHRcdGNhc2UgJzAwMic6XHJcblx0XHRcdGNhc2UgJzAwMyc6XHJcblx0XHRcdGNhc2UgJzAwNCc6XHJcblx0XHRcdGNhc2UgJzM3Mic6XHJcblx0XHRcdGNhc2UgJzM3NSc6XHJcblx0XHRcdGNhc2UgJ0NBUCc6XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHQvLyBSZXRyaWV2ZSB1c2VybmFtZSBmcm9tIHNlcnZlci4uXHJcblx0XHRcdGNhc2UgJzAwMSc6XHJcblx0XHRcdFx0dGhpcy51c2VybmFtZSA9IG1lc3NhZ2UucGFyYW1zWzBdO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Ly8gQ29ubmVjdGVkIHRvIHNlcnZlci4uXHJcblx0XHRcdGNhc2UgJzM3Nic6IHtcclxuXHRcdFx0XHR0aGlzLmxvZy5pbmZvKCdDb25uZWN0ZWQgdG8gc2VydmVyLicpO1xyXG5cdFx0XHRcdHRoaXMudXNlcnN0YXRlW3RoaXMuX2dsb2JhbERlZmF1bHRDaGFubmVsXSA9IHt9O1xyXG5cdFx0XHRcdHRoaXMuZW1pdHMoWyAnY29ubmVjdGVkJywgJ19wcm9taXNlQ29ubmVjdCcgXSwgWyBbIHRoaXMuc2VydmVyLCB0aGlzLnBvcnQgXSwgWyBudWxsIF0gXSk7XHJcblx0XHRcdFx0dGhpcy5yZWNvbm5lY3Rpb25zID0gMDtcclxuXHRcdFx0XHR0aGlzLnJlY29ubmVjdFRpbWVyID0gdGhpcy5yZWNvbm5lY3RJbnRlcnZhbDtcclxuXHJcblx0XHRcdFx0Ly8gU2V0IGFuIGludGVybmFsIHBpbmcgdGltZW91dCBjaGVjayBpbnRlcnZhbC4uXHJcblx0XHRcdFx0dGhpcy5waW5nTG9vcCA9IHNldEludGVydmFsKCgpID0+IHtcclxuXHRcdFx0XHRcdC8vIE1ha2Ugc3VyZSB0aGUgY29ubmVjdGlvbiBpcyBvcGVuZWQgYmVmb3JlIHNlbmRpbmcgdGhlIG1lc3NhZ2UuLlxyXG5cdFx0XHRcdFx0aWYodGhpcy5faXNDb25uZWN0ZWQoKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLndzLnNlbmQoJ1BJTkcnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMubGF0ZW5jeSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdFx0XHR0aGlzLnBpbmdUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmKHRoaXMud3MgIT09IG51bGwpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLndhc0Nsb3NlQ2FsbGVkID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2cuZXJyb3IoJ1BpbmcgdGltZW91dC4nKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLndzLmNsb3NlKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNsZWFySW50ZXJ2YWwodGhpcy5waW5nTG9vcCk7XHJcblx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMucGluZ1RpbWVvdXQpO1xyXG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dCh0aGlzLl91cGRhdGVFbW90ZXNldHNUaW1lcik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIF8uZ2V0KHRoaXMub3B0cy5jb25uZWN0aW9uLnRpbWVvdXQsIDk5OTkpKTtcclxuXHRcdFx0XHR9LCA2MDAwMCk7XHJcblxyXG5cdFx0XHRcdC8vIEpvaW4gYWxsIHRoZSBjaGFubmVscyBmcm9tIHRoZSBjb25maWcgd2l0aCBhbiBpbnRlcnZhbC4uXHJcblx0XHRcdFx0bGV0IGpvaW5JbnRlcnZhbCA9IF8uZ2V0KHRoaXMub3B0cy5vcHRpb25zLmpvaW5JbnRlcnZhbCwgMjAwMCk7XHJcblx0XHRcdFx0aWYoam9pbkludGVydmFsIDwgMzAwKSB7XHJcblx0XHRcdFx0XHRqb2luSW50ZXJ2YWwgPSAzMDA7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNvbnN0IGpvaW5RdWV1ZSA9IG5ldyBRdWV1ZShqb2luSW50ZXJ2YWwpO1xyXG5cdFx0XHRcdGNvbnN0IGpvaW5DaGFubmVscyA9IFsgLi4ubmV3IFNldChbIC4uLnRoaXMub3B0cy5jaGFubmVscywgLi4udGhpcy5jaGFubmVscyBdKSBdO1xyXG5cdFx0XHRcdHRoaXMuY2hhbm5lbHMgPSBbXTtcclxuXHJcblx0XHRcdFx0Zm9yKGxldCBpID0gMDsgaSA8IGpvaW5DaGFubmVscy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0Y29uc3QgY2hhbm5lbCA9IGpvaW5DaGFubmVsc1tpXTtcclxuXHRcdFx0XHRcdGpvaW5RdWV1ZS5hZGQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRpZih0aGlzLl9pc0Nvbm5lY3RlZCgpKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5qb2luKGNoYW5uZWwpLmNhdGNoKGVyciA9PiB0aGlzLmxvZy5lcnJvcihlcnIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRqb2luUXVldWUubmV4dCgpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vanVzdGludHYvVHdpdGNoLUFQSS9ibG9iL21hc3Rlci9jaGF0L2NhcGFiaWxpdGllcy5tZCNub3RpY2VcclxuXHRcdFx0Y2FzZSAnTk9USUNFJzoge1xyXG5cdFx0XHRcdGNvbnN0IG51bGxBcnIgPSBbIG51bGwgXTtcclxuXHRcdFx0XHRjb25zdCBub3RpY2VBcnIgPSBbIGNoYW5uZWwsIG1zZ2lkLCBtc2cgXTtcclxuXHRcdFx0XHRjb25zdCBtc2dpZEFyciA9IFsgbXNnaWQgXTtcclxuXHRcdFx0XHRjb25zdCBjaGFubmVsVHJ1ZUFyciA9IFsgY2hhbm5lbCwgdHJ1ZSBdO1xyXG5cdFx0XHRcdGNvbnN0IGNoYW5uZWxGYWxzZUFyciA9IFsgY2hhbm5lbCwgZmFsc2UgXTtcclxuXHRcdFx0XHRjb25zdCBub3RpY2VBbmROdWxsID0gWyBub3RpY2VBcnIsIG51bGxBcnIgXTtcclxuXHRcdFx0XHRjb25zdCBub3RpY2VBbmRNc2dpZCA9IFsgbm90aWNlQXJyLCBtc2dpZEFyciBdO1xyXG5cdFx0XHRcdGNvbnN0IGJhc2ljTG9nID0gYFske2NoYW5uZWx9XSAke21zZ31gO1xyXG5cdFx0XHRcdHN3aXRjaChtc2dpZCkge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyByb29tIGlzIG5vdyBpbiBzdWJzY3JpYmVycy1vbmx5IG1vZGUuXHJcblx0XHRcdFx0XHRjYXNlICdzdWJzX29uJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBub3cgaW4gc3Vic2NyaWJlcnMtb25seSBtb2RlLmApO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ3N1YnNjcmliZXInLCAnc3Vic2NyaWJlcnMnLCAnX3Byb21pc2VTdWJzY3JpYmVycycgXSwgWyBjaGFubmVsVHJ1ZUFyciwgY2hhbm5lbFRydWVBcnIsIG51bGxBcnIgXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFRoaXMgcm9vbSBpcyBubyBsb25nZXIgaW4gc3Vic2NyaWJlcnMtb25seSBtb2RlLlxyXG5cdFx0XHRcdFx0Y2FzZSAnc3Vic19vZmYnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfV0gVGhpcyByb29tIGlzIG5vIGxvbmdlciBpbiBzdWJzY3JpYmVycy1vbmx5IG1vZGUuYCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnc3Vic2NyaWJlcicsICdzdWJzY3JpYmVycycsICdfcHJvbWlzZVN1YnNjcmliZXJzb2ZmJyBdLCBbIGNoYW5uZWxGYWxzZUFyciwgY2hhbm5lbEZhbHNlQXJyLCBudWxsQXJyIF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBUaGlzIHJvb20gaXMgbm93IGluIGVtb3RlLW9ubHkgbW9kZS5cclxuXHRcdFx0XHRcdGNhc2UgJ2Vtb3RlX29ubHlfb24nOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfV0gVGhpcyByb29tIGlzIG5vdyBpbiBlbW90ZS1vbmx5IG1vZGUuYCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnZW1vdGVvbmx5JywgJ19wcm9taXNlRW1vdGVvbmx5JyBdLCBbIGNoYW5uZWxUcnVlQXJyLCBudWxsQXJyIF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBUaGlzIHJvb20gaXMgbm8gbG9uZ2VyIGluIGVtb3RlLW9ubHkgbW9kZS5cclxuXHRcdFx0XHRcdGNhc2UgJ2Vtb3RlX29ubHlfb2ZmJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBubyBsb25nZXIgaW4gZW1vdGUtb25seSBtb2RlLmApO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ2Vtb3Rlb25seScsICdfcHJvbWlzZUVtb3Rlb25seW9mZicgXSwgWyBjaGFubmVsRmFsc2VBcnIsIG51bGxBcnIgXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIERvIG5vdCBoYW5kbGUgc2xvd19vbi9vZmYgaGVyZSwgbGlzdGVuIHRvIHRoZSBST09NU1RBVEUgbm90aWNlIGluc3RlYWQgYXMgaXQgcmV0dXJucyB0aGUgZGVsYXkuXHJcblx0XHRcdFx0XHRjYXNlICdzbG93X29uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3Nsb3dfb2ZmJzpcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gRG8gbm90IGhhbmRsZSBmb2xsb3dlcnNfb24vb2ZmIGhlcmUsIGxpc3RlbiB0byB0aGUgUk9PTVNUQVRFIG5vdGljZSBpbnN0ZWFkIGFzIGl0IHJldHVybnMgdGhlIGRlbGF5LlxyXG5cdFx0XHRcdFx0Y2FzZSAnZm9sbG93ZXJzX29uX3plcm8nOlxyXG5cdFx0XHRcdFx0Y2FzZSAnZm9sbG93ZXJzX29uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2ZvbGxvd2Vyc19vZmYnOlxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBUaGlzIHJvb20gaXMgbm93IGluIHI5ayBtb2RlLlxyXG5cdFx0XHRcdFx0Y2FzZSAncjlrX29uJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBub3cgaW4gcjlrIG1vZGUuYCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAncjlrbW9kZScsICdyOWtiZXRhJywgJ19wcm9taXNlUjlrYmV0YScgXSwgWyBjaGFubmVsVHJ1ZUFyciwgY2hhbm5lbFRydWVBcnIsIG51bGxBcnIgXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFRoaXMgcm9vbSBpcyBubyBsb25nZXIgaW4gcjlrIG1vZGUuXHJcblx0XHRcdFx0XHRjYXNlICdyOWtfb2ZmJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBubyBsb25nZXIgaW4gcjlrIG1vZGUuYCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAncjlrbW9kZScsICdyOWtiZXRhJywgJ19wcm9taXNlUjlrYmV0YW9mZicgXSwgWyBjaGFubmVsRmFsc2VBcnIsIGNoYW5uZWxGYWxzZUFyciwgbnVsbEFyciBdKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVGhlIG1vZGVyYXRvcnMgb2YgdGhpcyByb29tIGFyZTogWy4uLiwgLi4uXVxyXG5cdFx0XHRcdFx0Y2FzZSAncm9vbV9tb2RzJzoge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBsaXN0U3BsaXQgPSBtc2cuc3BsaXQoJzogJyk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1vZHMgPSAobGlzdFNwbGl0Lmxlbmd0aCA+IDEgPyBsaXN0U3BsaXRbMV0gOiAnJykudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHRcdFx0XHQuc3BsaXQoJywgJylcclxuXHRcdFx0XHRcdFx0LmZpbHRlcihuID0+IG4pO1xyXG5cclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdfcHJvbWlzZU1vZHMnLCAnbW9kcycgXSwgWyBbIG51bGwsIG1vZHMgXSwgWyBjaGFubmVsLCBtb2RzIF0gXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIFRoZXJlIGFyZSBubyBtb2RlcmF0b3JzIGZvciB0aGlzIHJvb20uXHJcblx0XHRcdFx0XHRjYXNlICdub19tb2RzJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdfcHJvbWlzZU1vZHMnLCAnbW9kcycgXSwgWyBbIG51bGwsIFtdIF0sIFsgY2hhbm5lbCwgW10gXSBdKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVGhlIFZJUHMgb2YgdGhpcyBjaGFubmVsIGFyZTogWy4uLiwgLi4uXVxyXG5cdFx0XHRcdFx0Y2FzZSAndmlwc19zdWNjZXNzJzoge1xyXG5cdFx0XHRcdFx0XHRpZihtc2cuZW5kc1dpdGgoJy4nKSkge1xyXG5cdFx0XHRcdFx0XHRcdG1zZyA9IG1zZy5zbGljZSgwLCAtMSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Y29uc3QgbGlzdFNwbGl0ID0gbXNnLnNwbGl0KCc6ICcpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCB2aXBzID0gKGxpc3RTcGxpdC5sZW5ndGggPiAxID8gbGlzdFNwbGl0WzFdIDogJycpLnRvTG93ZXJDYXNlKClcclxuXHRcdFx0XHRcdFx0LnNwbGl0KCcsICcpXHJcblx0XHRcdFx0XHRcdC5maWx0ZXIobiA9PiBuKTtcclxuXHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnX3Byb21pc2VWaXBzJywgJ3ZpcHMnIF0sIFsgWyBudWxsLCB2aXBzIF0sIFsgY2hhbm5lbCwgdmlwcyBdIF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBUaGVyZSBhcmUgbm8gVklQcyBmb3IgdGhpcyByb29tLlxyXG5cdFx0XHRcdFx0Y2FzZSAnbm9fdmlwcyc6XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnX3Byb21pc2VWaXBzJywgJ3ZpcHMnIF0sIFsgWyBudWxsLCBbXSBdLCBbIGNoYW5uZWwsIFtdIF0gXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIEJhbiBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICdhbHJlYWR5X2Jhbm5lZCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfYmFuX2FkbWluJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF9iYW5fYW5vbic6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfYmFuX2Jyb2FkY2FzdGVyJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF9iYW5fZ2xvYmFsX21vZCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfYmFuX21vZCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfYmFuX3NlbGYnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX2Jhbl9zdGFmZic6XHJcblx0XHRcdFx0XHRjYXNlICd1c2FnZV9iYW4nOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VCYW4nIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQmFuIGNvbW1hbmQgc3VjY2Vzcy4uXHJcblx0XHRcdFx0XHRjYXNlICdiYW5fc3VjY2Vzcyc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZUJhbicgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIENsZWFyIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX2NsZWFyJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlQ2xlYXInIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gTW9kcyBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICd1c2FnZV9tb2RzJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlTW9kcycgXSwgWyBub3RpY2VBcnIsIFsgbXNnaWQsIFtdIF0gXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIE1vZCBjb21tYW5kIHN1Y2Nlc3MuLlxyXG5cdFx0XHRcdFx0Y2FzZSAnbW9kX3N1Y2Nlc3MnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VNb2QnIF0sIG5vdGljZUFuZE51bGwpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBWSVBzIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3ZpcHMnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VWaXBzJyBdLCBbIG5vdGljZUFyciwgWyBtc2dpZCwgW10gXSBdKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVklQIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3ZpcCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfdmlwX2dyYW50ZWVfYmFubmVkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF92aXBfZ3JhbnRlZV9hbHJlYWR5X3ZpcCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfdmlwX21heF92aXBzX3JlYWNoZWQnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX3ZpcF9hY2hpZXZlbWVudF9pbmNvbXBsZXRlJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlVmlwJyBdLCBbIG5vdGljZUFyciwgWyBtc2dpZCwgW10gXSBdKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVklQIGNvbW1hbmQgc3VjY2Vzcy4uXHJcblx0XHRcdFx0XHRjYXNlICd2aXBfc3VjY2Vzcyc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVZpcCcgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIE1vZCBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICd1c2FnZV9tb2QnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX21vZF9iYW5uZWQnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX21vZF9tb2QnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VNb2QnIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVW5tb2QgY29tbWFuZCBzdWNjZXNzLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VubW9kX3N1Y2Nlc3MnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VVbm1vZCcgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVudmlwIGNvbW1hbmQgc3VjY2Vzcy4uLlxyXG5cdFx0XHRcdFx0Y2FzZSAndW52aXBfc3VjY2Vzcyc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVVudmlwJyBdLCBub3RpY2VBbmROdWxsKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVW5tb2QgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfdW5tb2QnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX3VubW9kX21vZCc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVVubW9kJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVudmlwIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3VudmlwJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF91bnZpcF9ncmFudGVlX25vdF92aXAnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VVbnZpcCcgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBDb2xvciBjb21tYW5kIHN1Y2Nlc3MuLlxyXG5cdFx0XHRcdFx0Y2FzZSAnY29sb3JfY2hhbmdlZCc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZUNvbG9yJyBdLCBub3RpY2VBbmROdWxsKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ29sb3IgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfY29sb3InOlxyXG5cdFx0XHRcdFx0Y2FzZSAndHVyYm9fb25seV9jb2xvcic6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZUNvbG9yJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIENvbW1lcmNpYWwgY29tbWFuZCBzdWNjZXNzLi5cclxuXHRcdFx0XHRcdGNhc2UgJ2NvbW1lcmNpYWxfc3VjY2Vzcyc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZUNvbW1lcmNpYWwnIF0sIG5vdGljZUFuZE51bGwpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBDb21tZXJjaWFsIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX2NvbW1lcmNpYWwnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX2NvbW1lcmNpYWxfZXJyb3InOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VDb21tZXJjaWFsJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIEhvc3QgY29tbWFuZCBzdWNjZXNzLi5cclxuXHRcdFx0XHRcdGNhc2UgJ2hvc3RzX3JlbWFpbmluZyc6IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHJlbWFpbmluZ0hvc3QgPSAoIWlzTmFOKG1zZ1swXSkgPyBwYXJzZUludChtc2dbMF0pIDogMCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlSG9zdCcgXSwgWyBub3RpY2VBcnIsIFsgbnVsbCwgfn5yZW1haW5pbmdIb3N0IF0gXSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEhvc3QgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX2hvc3RfaG9zdGluZyc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfaG9zdF9yYXRlX2V4Y2VlZGVkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF9ob3N0X2Vycm9yJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX2hvc3QnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VIb3N0JyBdLCBbIG5vdGljZUFyciwgWyBtc2dpZCwgbnVsbCBdIF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyByOWtiZXRhIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ2FscmVhZHlfcjlrX29uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3I5a19vbic6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVI5a2JldGEnIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gcjlrYmV0YW9mZiBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICdhbHJlYWR5X3I5a19vZmYnOlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfcjlrX29mZic6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVI5a2JldGFvZmYnIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVGltZW91dCBjb21tYW5kIHN1Y2Nlc3MuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndGltZW91dF9zdWNjZXNzJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlVGltZW91dCcgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdGNhc2UgJ2RlbGV0ZV9tZXNzYWdlX3N1Y2Nlc3MnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfSAke21zZ31dYCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlRGVsZXRlbWVzc2FnZScgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFN1YnNjcmliZXJzb2ZmIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ2FscmVhZHlfc3Vic19vZmYnOlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2Vfc3Vic19vZmYnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VTdWJzY3JpYmVyc29mZicgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBTdWJzY3JpYmVycyBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICdhbHJlYWR5X3N1YnNfb24nOlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2Vfc3Vic19vbic6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVN1YnNjcmliZXJzJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIEVtb3Rlb25seW9mZiBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICdhbHJlYWR5X2Vtb3RlX29ubHlfb2ZmJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX2Vtb3RlX29ubHlfb2ZmJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlRW1vdGVvbmx5b2ZmJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIEVtb3Rlb25seSBjb21tYW5kIGZhaWxlZC4uXHJcblx0XHRcdFx0XHRjYXNlICdhbHJlYWR5X2Vtb3RlX29ubHlfb24nOlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfZW1vdGVfb25seV9vbic6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZUVtb3Rlb25seScgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBTbG93IGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3Nsb3dfb24nOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VTbG93JyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNsb3dvZmYgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2Vfc2xvd19vZmYnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VTbG93b2ZmJyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFRpbWVvdXQgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfdGltZW91dCc6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfdGltZW91dF9hZG1pbic6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfdGltZW91dF9hbm9uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF90aW1lb3V0X2Jyb2FkY2FzdGVyJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF90aW1lb3V0X2R1cmF0aW9uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF90aW1lb3V0X2dsb2JhbF9tb2QnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX3RpbWVvdXRfbW9kJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF90aW1lb3V0X3NlbGYnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX3RpbWVvdXRfc3RhZmYnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VUaW1lb3V0JyBdLCBub3RpY2VBbmRNc2dpZCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVuYmFuIGNvbW1hbmQgc3VjY2Vzcy4uXHJcblx0XHRcdFx0XHQvLyBVbmJhbiBjYW4gYWxzbyBiZSB1c2VkIHRvIGNhbmNlbCBhbiBhY3RpdmUgdGltZW91dC5cclxuXHRcdFx0XHRcdGNhc2UgJ3VudGltZW91dF9zdWNjZXNzJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VuYmFuX3N1Y2Nlc3MnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VVbmJhbicgXSwgbm90aWNlQW5kTnVsbCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVuYmFuIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3VuYmFuJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF91bmJhbl9ub19iYW4nOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdub3RpY2UnLCAnX3Byb21pc2VVbmJhbicgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBEZWxldGUgY29tbWFuZCBmYWlsZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfZGVsZXRlJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2JhZF9kZWxldGVfbWVzc2FnZV9lcnJvcic6XHJcblx0XHRcdFx0XHRjYXNlICdiYWRfZGVsZXRlX21lc3NhZ2VfYnJvYWRjYXN0ZXInOlxyXG5cdFx0XHRcdFx0Y2FzZSAnYmFkX2RlbGV0ZV9tZXNzYWdlX21vZCc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZURlbGV0ZW1lc3NhZ2UnIF0sIG5vdGljZUFuZE1zZ2lkKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gVW5ob3N0IGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX3VuaG9zdCc6XHJcblx0XHRcdFx0XHRjYXNlICdub3RfaG9zdGluZyc6XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYmFzaWNMb2cpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ25vdGljZScsICdfcHJvbWlzZVVuaG9zdCcgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBXaGlzcGVyIGNvbW1hbmQgZmFpbGVkLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3doaXNwZXJfaW52YWxpZF9sb2dpbic6XHJcblx0XHRcdFx0XHRjYXNlICd3aGlzcGVyX2ludmFsaWRfc2VsZic6XHJcblx0XHRcdFx0XHRjYXNlICd3aGlzcGVyX2xpbWl0X3Blcl9taW4nOlxyXG5cdFx0XHRcdFx0Y2FzZSAnd2hpc3Blcl9saW1pdF9wZXJfc2VjJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3doaXNwZXJfcmVzdHJpY3RlZCc6XHJcblx0XHRcdFx0XHRjYXNlICd3aGlzcGVyX3Jlc3RyaWN0ZWRfcmVjaXBpZW50JzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnbm90aWNlJywgJ19wcm9taXNlV2hpc3BlcicgXSwgbm90aWNlQW5kTXNnaWQpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBQZXJtaXNzaW9uIGVycm9yLi5cclxuXHRcdFx0XHRcdGNhc2UgJ25vX3Blcm1pc3Npb24nOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX2Jhbm5lZCc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfcm9vbV9ub3RfZm91bmQnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX2NoYW5uZWxfc3VzcGVuZGVkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3Rvc19iYW4nOlxyXG5cdFx0XHRcdFx0Y2FzZSAnaW52YWxpZF91c2VyJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhiYXNpY0xvZyk7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoW1xyXG5cdFx0XHRcdFx0XHRcdCdub3RpY2UnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZUJhbicsXHJcblx0XHRcdFx0XHRcdFx0J19wcm9taXNlQ2xlYXInLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVVuYmFuJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VUaW1lb3V0JyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VEZWxldGVtZXNzYWdlJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VNb2RzJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VNb2QnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVVubW9kJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VWaXBzJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VWaXAnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVVudmlwJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VDb21tZXJjaWFsJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VIb3N0JyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VVbmhvc3QnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZUpvaW4nLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVBhcnQnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVI5a2JldGEnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVI5a2JldGFvZmYnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVNsb3cnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZVNsb3dvZmYnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZUZvbGxvd2VycycsXHJcblx0XHRcdFx0XHRcdFx0J19wcm9taXNlRm9sbG93ZXJzb2ZmJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VTdWJzY3JpYmVycycsXHJcblx0XHRcdFx0XHRcdFx0J19wcm9taXNlU3Vic2NyaWJlcnNvZmYnLFxyXG5cdFx0XHRcdFx0XHRcdCdfcHJvbWlzZUVtb3Rlb25seScsXHJcblx0XHRcdFx0XHRcdFx0J19wcm9taXNlRW1vdGVvbmx5b2ZmJyxcclxuXHRcdFx0XHRcdFx0XHQnX3Byb21pc2VXaGlzcGVyJ1xyXG5cdFx0XHRcdFx0XHRdLCBbIG5vdGljZUFyciwgWyBtc2dpZCwgY2hhbm5lbCBdIF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBBdXRvbW9kLXJlbGF0ZWQuLlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX3JlamVjdGVkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ21zZ19yZWplY3RlZF9tYW5kYXRvcnknOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdhdXRvbW9kJywgY2hhbm5lbCwgbXNnaWQsIG1zZyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIFVucmVjb2duaXplZCBjb21tYW5kLi5cclxuXHRcdFx0XHRcdGNhc2UgJ3VucmVjb2duaXplZF9jbWQnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdub3RpY2UnLCBjaGFubmVsLCBtc2dpZCwgbXNnKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gU2VuZCB0aGUgZm9sbG93aW5nIG1zZy1pZHMgdG8gdGhlIG5vdGljZSBldmVudCBsaXN0ZW5lci4uXHJcblx0XHRcdFx0XHRjYXNlICdjbWRzX2F2YWlsYWJsZSc6XHJcblx0XHRcdFx0XHRjYXNlICdob3N0X3RhcmdldF93ZW50X29mZmxpbmUnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX2NlbnNvcmVkX2Jyb2FkY2FzdGVyJzpcclxuXHRcdFx0XHRcdGNhc2UgJ21zZ19kdXBsaWNhdGUnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX2Vtb3Rlb25seSc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfdmVyaWZpZWRfZW1haWwnOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX3JhdGVsaW1pdCc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfc3Vic29ubHknOlxyXG5cdFx0XHRcdFx0Y2FzZSAnbXNnX3RpbWVkb3V0JzpcclxuXHRcdFx0XHRcdGNhc2UgJ21zZ19iYWRfY2hhcmFjdGVycyc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfY2hhbm5lbF9ibG9ja2VkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ21zZ19mYWNlYm9vayc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfZm9sbG93ZXJzb25seSc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfZm9sbG93ZXJzb25seV9mb2xsb3dlZCc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfZm9sbG93ZXJzb25seV96ZXJvJzpcclxuXHRcdFx0XHRcdGNhc2UgJ21zZ19zbG93bW9kZSc6XHJcblx0XHRcdFx0XHRjYXNlICdtc2dfc3VzcGVuZGVkJzpcclxuXHRcdFx0XHRcdGNhc2UgJ25vX2hlbHAnOlxyXG5cdFx0XHRcdFx0Y2FzZSAndXNhZ2VfZGlzY29ubmVjdCc6XHJcblx0XHRcdFx0XHRjYXNlICd1c2FnZV9oZWxwJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VzYWdlX21lJzpcclxuXHRcdFx0XHRcdGNhc2UgJ3VuYXZhaWxhYmxlX2NvbW1hbmQnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGJhc2ljTG9nKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdub3RpY2UnLCBjaGFubmVsLCBtc2dpZCwgbXNnKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSWdub3JlIHRoaXMgYmVjYXVzZSB3ZSBhcmUgYWxyZWFkeSBsaXN0ZW5pbmcgdG8gSE9TVFRBUkdFVC4uXHJcblx0XHRcdFx0XHRjYXNlICdob3N0X29uJzpcclxuXHRcdFx0XHRcdGNhc2UgJ2hvc3Rfb2ZmJzpcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0aWYobXNnLmluY2x1ZGVzKCdMb2dpbiB1bnN1Y2Nlc3NmdWwnKSB8fCBtc2cuaW5jbHVkZXMoJ0xvZ2luIGF1dGhlbnRpY2F0aW9uIGZhaWxlZCcpKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy53YXNDbG9zZUNhbGxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmVjb25uZWN0ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZWFzb24gPSBtc2c7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2cuZXJyb3IodGhpcy5yZWFzb24pO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMud3MuY2xvc2UoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKG1zZy5pbmNsdWRlcygnRXJyb3IgbG9nZ2luZyBpbicpIHx8IG1zZy5pbmNsdWRlcygnSW1wcm9wZXJseSBmb3JtYXR0ZWQgYXV0aCcpKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy53YXNDbG9zZUNhbGxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmVjb25uZWN0ID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZWFzb24gPSBtc2c7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2cuZXJyb3IodGhpcy5yZWFzb24pO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMud3MuY2xvc2UoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKG1zZy5pbmNsdWRlcygnSW52YWxpZCBOSUNLJykpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLndhc0Nsb3NlQ2FsbGVkID0gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5yZWNvbm5lY3QgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnJlYXNvbiA9ICdJbnZhbGlkIE5JQ0suJztcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxvZy5lcnJvcih0aGlzLnJlYXNvbik7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy53cy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMubG9nLndhcm4oYENvdWxkIG5vdCBwYXJzZSBOT1RJQ0UgZnJvbSB0bWkudHdpdGNoLnR2OlxcbiR7SlNPTi5zdHJpbmdpZnkobWVzc2FnZSwgbnVsbCwgNCl9YCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdub3RpY2UnLCBjaGFubmVsLCBtc2dpZCwgbXNnKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBzdWJhbm5pdmVyc2FyeSAvIHJlc3ViLi5cclxuXHRcdFx0Y2FzZSAnVVNFUk5PVElDRSc6IHtcclxuXHRcdFx0XHRjb25zdCB1c2VybmFtZSA9IHRhZ3NbJ2Rpc3BsYXktbmFtZSddIHx8IHRhZ3NbJ2xvZ2luJ107XHJcblx0XHRcdFx0Y29uc3QgcGxhbiA9IHRhZ3NbJ21zZy1wYXJhbS1zdWItcGxhbiddIHx8ICcnO1xyXG5cdFx0XHRcdGNvbnN0IHBsYW5OYW1lID0gXy51bmVzY2FwZUlSQyhfLmdldCh0YWdzWydtc2ctcGFyYW0tc3ViLXBsYW4tbmFtZSddLCAnJykpIHx8IG51bGw7XHJcblx0XHRcdFx0Y29uc3QgcHJpbWUgPSBwbGFuLmluY2x1ZGVzKCdQcmltZScpO1xyXG5cdFx0XHRcdGNvbnN0IG1ldGhvZHMgPSB7IHByaW1lLCBwbGFuLCBwbGFuTmFtZSB9O1xyXG5cdFx0XHRcdGNvbnN0IHN0cmVha01vbnRocyA9IH5+KHRhZ3NbJ21zZy1wYXJhbS1zdHJlYWstbW9udGhzJ10gfHwgMCk7XHJcblx0XHRcdFx0Y29uc3QgcmVjaXBpZW50ID0gdGFnc1snbXNnLXBhcmFtLXJlY2lwaWVudC1kaXNwbGF5LW5hbWUnXSB8fCB0YWdzWydtc2ctcGFyYW0tcmVjaXBpZW50LXVzZXItbmFtZSddO1xyXG5cdFx0XHRcdGNvbnN0IGdpZnRTdWJDb3VudCA9IH5+dGFnc1snbXNnLXBhcmFtLW1hc3MtZ2lmdC1jb3VudCddO1xyXG5cdFx0XHRcdHRhZ3NbJ21lc3NhZ2UtdHlwZSddID0gbXNnaWQ7XHJcblxyXG5cdFx0XHRcdHN3aXRjaChtc2dpZCkge1xyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIHJlc3ViXHJcblx0XHRcdFx0XHRjYXNlICdyZXN1Yic6XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAncmVzdWInLCAnc3ViYW5uaXZlcnNhcnknIF0sIFtcclxuXHRcdFx0XHRcdFx0XHRbIGNoYW5uZWwsIHVzZXJuYW1lLCBzdHJlYWtNb250aHMsIG1zZywgdGFncywgbWV0aG9kcyBdXHJcblx0XHRcdFx0XHRcdF0pO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgc3ViXHJcblx0XHRcdFx0XHRjYXNlICdzdWInOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ3N1YnNjcmlwdGlvbicsICdzdWInIF0sIFtcclxuXHRcdFx0XHRcdFx0XHRbIGNoYW5uZWwsIHVzZXJuYW1lLCBtZXRob2RzLCBtc2csIHRhZ3MgXVxyXG5cdFx0XHRcdFx0XHRdKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIGdpZnQgc3ViXHJcblx0XHRcdFx0XHRjYXNlICdzdWJnaWZ0JzpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdzdWJnaWZ0JywgY2hhbm5lbCwgdXNlcm5hbWUsIHN0cmVha01vbnRocywgcmVjaXBpZW50LCBtZXRob2RzLCB0YWdzKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIGFub255bW91cyBnaWZ0IHN1YlxyXG5cdFx0XHRcdFx0Ly8gTmVlZCBwcm9vZiB0aGF0IHRoaXMgZXZlbnQgb2NjdXJcclxuXHRcdFx0XHRcdGNhc2UgJ2Fub25zdWJnaWZ0JzpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdhbm9uc3ViZ2lmdCcsIGNoYW5uZWwsIHN0cmVha01vbnRocywgcmVjaXBpZW50LCBtZXRob2RzLCB0YWdzKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIHJhbmRvbSBnaWZ0IHN1YnNcclxuXHRcdFx0XHRcdGNhc2UgJ3N1Ym15c3RlcnlnaWZ0JzpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdzdWJteXN0ZXJ5Z2lmdCcsIGNoYW5uZWwsIHVzZXJuYW1lLCBnaWZ0U3ViQ291bnQsIG1ldGhvZHMsIHRhZ3MpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgYW5vbnltb3VzIHJhbmRvbSBnaWZ0IHN1YnNcclxuXHRcdFx0XHRcdC8vIE5lZWQgcHJvb2YgdGhhdCB0aGlzIGV2ZW50IG9jY3VyXHJcblx0XHRcdFx0XHRjYXNlICdhbm9uc3VibXlzdGVyeWdpZnQnOlxyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ2Fub25zdWJteXN0ZXJ5Z2lmdCcsIGNoYW5uZWwsIGdpZnRTdWJDb3VudCwgbWV0aG9kcywgdGFncyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdC8vIEhhbmRsZSB1c2VyIHVwZ3JhZGluZyBmcm9tIFByaW1lIHRvIGEgbm9ybWFsIHRpZXIgc3ViXHJcblx0XHRcdFx0XHRjYXNlICdwcmltZXBhaWR1cGdyYWRlJzpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdwcmltZXBhaWR1cGdyYWRlJywgY2hhbm5lbCwgdXNlcm5hbWUsIG1ldGhvZHMsIHRhZ3MpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgdXNlciB1cGdyYWRpbmcgZnJvbSBhIGdpZnRlZCBzdWJcclxuXHRcdFx0XHRcdGNhc2UgJ2dpZnRwYWlkdXBncmFkZSc6IHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc2VuZGVyID0gdGFnc1snbXNnLXBhcmFtLXNlbmRlci1uYW1lJ10gfHwgdGFnc1snbXNnLXBhcmFtLXNlbmRlci1sb2dpbiddO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ2dpZnRwYWlkdXBncmFkZScsIGNoYW5uZWwsIHVzZXJuYW1lLCBzZW5kZXIsIHRhZ3MpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgdXNlciB1cGdyYWRpbmcgZnJvbSBhbiBhbm9ueW1vdXMgZ2lmdGVkIHN1YlxyXG5cdFx0XHRcdFx0Y2FzZSAnYW5vbmdpZnRwYWlkdXBncmFkZSc6XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdCgnYW5vbmdpZnRwYWlkdXBncmFkZScsIGNoYW5uZWwsIHVzZXJuYW1lLCB0YWdzKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIHJhaWRcclxuXHRcdFx0XHRcdGNhc2UgJ3JhaWQnOiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHVzZXJuYW1lID0gdGFnc1snbXNnLXBhcmFtLWRpc3BsYXlOYW1lJ10gfHwgdGFnc1snbXNnLXBhcmFtLWxvZ2luJ107XHJcblx0XHRcdFx0XHRcdGNvbnN0IHZpZXdlcnMgPSArdGFnc1snbXNnLXBhcmFtLXZpZXdlckNvdW50J107XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdCgncmFpZGVkJywgY2hhbm5lbCwgdXNlcm5hbWUsIHZpZXdlcnMsIHRhZ3MpO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vIEhhbmRsZSByaXR1YWxcclxuXHRcdFx0XHRcdGNhc2UgJ3JpdHVhbCc6IHtcclxuXHRcdFx0XHRcdFx0Y29uc3Qgcml0dWFsTmFtZSA9IHRhZ3NbJ21zZy1wYXJhbS1yaXR1YWwtbmFtZSddO1xyXG5cdFx0XHRcdFx0XHRzd2l0Y2gocml0dWFsTmFtZSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBuZXcgY2hhdHRlciByaXR1YWxcclxuXHRcdFx0XHRcdFx0XHRjYXNlICduZXdfY2hhdHRlcic6XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ25ld2NoYXR0ZXInLCBjaGFubmVsLCB1c2VybmFtZSwgdGFncywgbXNnKTtcclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHRcdC8vIEFsbCB1bmtub3duIHJpdHVhbHMgc2hvdWxkIGJlIHBhc3NlZCB0aHJvdWdoXHJcblx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuZW1pdCgncml0dWFsJywgcml0dWFsTmFtZSwgY2hhbm5lbCwgdXNlcm5hbWUsIHRhZ3MsIG1zZyk7XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vIEFsbCBvdGhlciBtc2dpZCBldmVudHMgc2hvdWxkIGJlIGVtaXR0ZWQgdW5kZXIgYSB1c2Vybm90aWNlIGV2ZW50XHJcblx0XHRcdFx0XHQvLyB1bnRpbCBpdCBjb21lcyB1cCBhbmQgbmVlZHMgdG8gYmUgYWRkZWQuLlxyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCd1c2Vybm90aWNlJywgbXNnaWQsIGNoYW5uZWwsIHRhZ3MsIG1zZyk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hhbm5lbCBpcyBub3cgaG9zdGluZyBhbm90aGVyIGNoYW5uZWwgb3IgZXhpdGVkIGhvc3QgbW9kZS4uXHJcblx0XHRcdGNhc2UgJ0hPU1RUQVJHRVQnOiB7XHJcblx0XHRcdFx0Y29uc3QgbXNnU3BsaXQgPSBtc2cuc3BsaXQoJyAnKTtcclxuXHRcdFx0XHRjb25zdCB2aWV3ZXJzID0gfn5tc2dTcGxpdFsxXSB8fCAwO1xyXG5cdFx0XHRcdC8vIFN0b3BwZWQgaG9zdGluZy4uXHJcblx0XHRcdFx0aWYobXNnU3BsaXRbMF0gPT09ICctJykge1xyXG5cdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIEV4aXRlZCBob3N0IG1vZGUuYCk7XHJcblx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ3VuaG9zdCcsICdfcHJvbWlzZVVuaG9zdCcgXSwgWyBbIGNoYW5uZWwsIHZpZXdlcnMgXSwgWyBudWxsIF0gXSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBOb3cgaG9zdGluZy4uXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfV0gTm93IGhvc3RpbmcgJHttc2dTcGxpdFswXX0gZm9yICR7dmlld2Vyc30gdmlld2VyKHMpLmApO1xyXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdob3N0aW5nJywgY2hhbm5lbCwgbXNnU3BsaXRbMF0sIHZpZXdlcnMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU29tZW9uZSBoYXMgYmVlbiB0aW1lZCBvdXQgb3IgY2hhdCBoYXMgYmVlbiBjbGVhcmVkIGJ5IGEgbW9kZXJhdG9yLi5cclxuXHRcdFx0Y2FzZSAnQ0xFQVJDSEFUJzpcclxuXHRcdFx0XHQvLyBVc2VyIGhhcyBiZWVuIGJhbm5lZCAvIHRpbWVkIG91dCBieSBhIG1vZGVyYXRvci4uXHJcblx0XHRcdFx0aWYobWVzc2FnZS5wYXJhbXMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRcdFx0Ly8gRHVyYXRpb24gcmV0dXJucyBudWxsIGlmIGl0J3MgYSBiYW4sIG90aGVyd2lzZSBpdCdzIGEgdGltZW91dC4uXHJcblx0XHRcdFx0XHRjb25zdCBkdXJhdGlvbiA9IF8uZ2V0KG1lc3NhZ2UudGFnc1snYmFuLWR1cmF0aW9uJ10sIG51bGwpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGR1cmF0aW9uID09PSBudWxsKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYFske2NoYW5uZWx9XSAke21zZ30gaGFzIGJlZW4gYmFubmVkLmApO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoJ2JhbicsIGNoYW5uZWwsIG1zZywgbnVsbCwgbWVzc2FnZS50YWdzKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfV0gJHttc2d9IGhhcyBiZWVuIHRpbWVkIG91dCBmb3IgJHtkdXJhdGlvbn0gc2Vjb25kcy5gKTtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCd0aW1lb3V0JywgY2hhbm5lbCwgbXNnLCBudWxsLCB+fmR1cmF0aW9uLCBtZXNzYWdlLnRhZ3MpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2hhdCB3YXMgY2xlYXJlZCBieSBhIG1vZGVyYXRvci4uXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFubmVsfV0gQ2hhdCB3YXMgY2xlYXJlZCBieSBhIG1vZGVyYXRvci5gKTtcclxuXHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnY2xlYXJjaGF0JywgJ19wcm9taXNlQ2xlYXInIF0sIFsgWyBjaGFubmVsIF0sIFsgbnVsbCBdIF0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdC8vIFNvbWVvbmUncyBtZXNzYWdlIGhhcyBiZWVuIGRlbGV0ZWRcclxuXHRcdFx0Y2FzZSAnQ0xFQVJNU0cnOlxyXG5cdFx0XHRcdGlmKG1lc3NhZ2UucGFyYW1zLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IGRlbGV0ZWRNZXNzYWdlID0gbXNnO1xyXG5cdFx0XHRcdFx0Y29uc3QgdXNlcm5hbWUgPSB0YWdzWydsb2dpbiddO1xyXG5cdFx0XHRcdFx0dGFnc1snbWVzc2FnZS10eXBlJ10gPSAnbWVzc2FnZWRlbGV0ZWQnO1xyXG5cclxuXHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYFske2NoYW5uZWx9XSAke3VzZXJuYW1lfSdzIG1lc3NhZ2UgaGFzIGJlZW4gZGVsZXRlZC5gKTtcclxuXHRcdFx0XHRcdHRoaXMuZW1pdCgnbWVzc2FnZWRlbGV0ZWQnLCBjaGFubmVsLCB1c2VybmFtZSwgZGVsZXRlZE1lc3NhZ2UsIHRhZ3MpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdC8vIFJlY2VpdmVkIGEgcmVjb25uZWN0aW9uIHJlcXVlc3QgZnJvbSB0aGUgc2VydmVyLi5cclxuXHRcdFx0Y2FzZSAnUkVDT05ORUNUJzpcclxuXHRcdFx0XHR0aGlzLmxvZy5pbmZvKCdSZWNlaXZlZCBSRUNPTk5FQ1QgcmVxdWVzdCBmcm9tIFR3aXRjaC4uJyk7XHJcblx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgRGlzY29ubmVjdGluZyBhbmQgcmVjb25uZWN0aW5nIGluICR7TWF0aC5yb3VuZCh0aGlzLnJlY29ubmVjdFRpbWVyIC8gMTAwMCl9IHNlY29uZHMuLmApO1xyXG5cdFx0XHRcdHRoaXMuZGlzY29ubmVjdCgpLmNhdGNoKGVyciA9PiB0aGlzLmxvZy5lcnJvcihlcnIpKTtcclxuXHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHRoaXMuY29ubmVjdCgpLmNhdGNoKGVyciA9PiB0aGlzLmxvZy5lcnJvcihlcnIpKSwgdGhpcy5yZWNvbm5lY3RUaW1lcik7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHQvLyBSZWNlaXZlZCB3aGVuIGpvaW5pbmcgYSBjaGFubmVsIGFuZCBldmVyeSB0aW1lIHlvdSBzZW5kIGEgUFJJVk1TRyB0byBhIGNoYW5uZWwuXHJcblx0XHRcdGNhc2UgJ1VTRVJTVEFURSc6XHJcblx0XHRcdFx0bWVzc2FnZS50YWdzLnVzZXJuYW1lID0gdGhpcy51c2VybmFtZTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIHRoZSBjbGllbnQgdG8gdGhlIG1vZGVyYXRvcnMgb2YgdGhpcyByb29tLi5cclxuXHRcdFx0XHRpZihtZXNzYWdlLnRhZ3NbJ3VzZXItdHlwZSddID09PSAnbW9kJykge1xyXG5cdFx0XHRcdFx0aWYoIXRoaXMubW9kZXJhdG9yc1tjaGFubmVsXSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1vZGVyYXRvcnNbY2hhbm5lbF0gPSBbXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKCF0aGlzLm1vZGVyYXRvcnNbY2hhbm5lbF0uaW5jbHVkZXModGhpcy51c2VybmFtZSkpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5tb2RlcmF0b3JzW2NoYW5uZWxdLnB1c2godGhpcy51c2VybmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBMb2dnZWQgaW4gYW5kIHVzZXJuYW1lIGRvZXNuJ3Qgc3RhcnQgd2l0aCBqdXN0aW5mYW4uLlxyXG5cdFx0XHRcdGlmKCFfLmlzSnVzdGluZmFuKHRoaXMuZ2V0VXNlcm5hbWUoKSkgJiYgIXRoaXMudXNlcnN0YXRlW2NoYW5uZWxdKSB7XHJcblx0XHRcdFx0XHR0aGlzLnVzZXJzdGF0ZVtjaGFubmVsXSA9IHRhZ3M7XHJcblx0XHRcdFx0XHR0aGlzLmxhc3RKb2luZWQgPSBjaGFubmVsO1xyXG5cdFx0XHRcdFx0dGhpcy5jaGFubmVscy5wdXNoKGNoYW5uZWwpO1xyXG5cdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgSm9pbmVkICR7Y2hhbm5lbH1gKTtcclxuXHRcdFx0XHRcdHRoaXMuZW1pdCgnam9pbicsIGNoYW5uZWwsIF8udXNlcm5hbWUodGhpcy5nZXRVc2VybmFtZSgpKSwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBFbW90ZS1zZXRzIGhhcyBjaGFuZ2VkLCB1cGRhdGUgaXQuLlxyXG5cdFx0XHRcdGlmKG1lc3NhZ2UudGFnc1snZW1vdGUtc2V0cyddICE9PSB0aGlzLmVtb3Rlcykge1xyXG5cdFx0XHRcdFx0dGhpcy5fdXBkYXRlRW1vdGVzZXQobWVzc2FnZS50YWdzWydlbW90ZS1zZXRzJ10pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy51c2Vyc3RhdGVbY2hhbm5lbF0gPSB0YWdzO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Ly8gRGVzY3JpYmUgbm9uLWNoYW5uZWwtc3BlY2lmaWMgc3RhdGUgaW5mb3JtYXRpb25zLi5cclxuXHRcdFx0Y2FzZSAnR0xPQkFMVVNFUlNUQVRFJzpcclxuXHRcdFx0XHR0aGlzLmdsb2JhbHVzZXJzdGF0ZSA9IHRhZ3M7XHJcblx0XHRcdFx0dGhpcy5lbWl0KCdnbG9iYWx1c2Vyc3RhdGUnLCB0YWdzKTtcclxuXHJcblx0XHRcdFx0Ly8gUmVjZWl2ZWQgZW1vdGUtc2V0cy4uXHJcblx0XHRcdFx0aWYodHlwZW9mIG1lc3NhZ2UudGFnc1snZW1vdGUtc2V0cyddICE9PSAndW5kZWZpbmVkJykge1xyXG5cdFx0XHRcdFx0dGhpcy5fdXBkYXRlRW1vdGVzZXQobWVzc2FnZS50YWdzWydlbW90ZS1zZXRzJ10pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdC8vIFJlY2VpdmVkIHdoZW4gam9pbmluZyBhIGNoYW5uZWwgYW5kIGV2ZXJ5IHRpbWUgb25lIG9mIHRoZSBjaGF0IHJvb20gc2V0dGluZ3MsIGxpa2Ugc2xvdyBtb2RlLCBjaGFuZ2UuXHJcblx0XHRcdC8vIFRoZSBtZXNzYWdlIG9uIGpvaW4gY29udGFpbnMgYWxsIHJvb20gc2V0dGluZ3MuXHJcblx0XHRcdGNhc2UgJ1JPT01TVEFURSc6XHJcblx0XHRcdFx0Ly8gV2UgdXNlIHRoaXMgbm90aWNlIHRvIGtub3cgaWYgd2Ugc3VjY2Vzc2Z1bGx5IGpvaW5lZCBhIGNoYW5uZWwuLlxyXG5cdFx0XHRcdGlmKF8uY2hhbm5lbCh0aGlzLmxhc3RKb2luZWQpID09PSBjaGFubmVsKSB7IHRoaXMuZW1pdCgnX3Byb21pc2VKb2luJywgbnVsbCwgY2hhbm5lbCk7IH1cclxuXHJcblx0XHRcdFx0Ly8gUHJvdmlkZSB0aGUgY2hhbm5lbCBuYW1lIGluIHRoZSB0YWdzIGJlZm9yZSBlbWl0dGluZyBpdC4uXHJcblx0XHRcdFx0bWVzc2FnZS50YWdzLmNoYW5uZWwgPSBjaGFubmVsO1xyXG5cdFx0XHRcdHRoaXMuZW1pdCgncm9vbXN0YXRlJywgY2hhbm5lbCwgbWVzc2FnZS50YWdzKTtcclxuXHJcblx0XHRcdFx0aWYoIV8uaGFzT3duKG1lc3NhZ2UudGFncywgJ3N1YnMtb25seScpKSB7XHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgc2xvdyBtb2RlIGhlcmUgaW5zdGVhZCBvZiB0aGUgc2xvd19vbi9vZmYgbm90aWNlLi5cclxuXHRcdFx0XHRcdC8vIFRoaXMgcm9vbSBpcyBub3cgaW4gc2xvdyBtb2RlLiBZb3UgbWF5IHNlbmQgbWVzc2FnZXMgZXZlcnkgc2xvd19kdXJhdGlvbiBzZWNvbmRzLlxyXG5cdFx0XHRcdFx0aWYoXy5oYXNPd24obWVzc2FnZS50YWdzLCAnc2xvdycpKSB7XHJcblx0XHRcdFx0XHRcdGlmKHR5cGVvZiBtZXNzYWdlLnRhZ3Muc2xvdyA9PT0gJ2Jvb2xlYW4nICYmICFtZXNzYWdlLnRhZ3Muc2xvdykge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGRpc2FibGVkID0gWyBjaGFubmVsLCBmYWxzZSwgMCBdO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYFske2NoYW5uZWx9XSBUaGlzIHJvb20gaXMgbm8gbG9uZ2VyIGluIHNsb3cgbW9kZS5gKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ3Nsb3cnLCAnc2xvd21vZGUnLCAnX3Byb21pc2VTbG93b2ZmJyBdLCBbIGRpc2FibGVkLCBkaXNhYmxlZCwgWyBudWxsIF0gXSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2Vjb25kcyA9IH5+bWVzc2FnZS50YWdzLnNsb3c7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZW5hYmxlZCA9IFsgY2hhbm5lbCwgdHJ1ZSwgc2Vjb25kcyBdO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYFske2NoYW5uZWx9XSBUaGlzIHJvb20gaXMgbm93IGluIHNsb3cgbW9kZS5gKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ3Nsb3cnLCAnc2xvd21vZGUnLCAnX3Byb21pc2VTbG93JyBdLCBbIGVuYWJsZWQsIGVuYWJsZWQsIFsgbnVsbCBdIF0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIGZvbGxvd2VycyBvbmx5IG1vZGUgaGVyZSBpbnN0ZWFkIG9mIHRoZSBmb2xsb3dlcnNfb24vb2ZmIG5vdGljZS4uXHJcblx0XHRcdFx0XHQvLyBUaGlzIHJvb20gaXMgbm93IGluIGZvbGxvd2VyLW9ubHkgbW9kZS5cclxuXHRcdFx0XHRcdC8vIFRoaXMgcm9vbSBpcyBub3cgaW4gPGR1cmF0aW9uPiBmb2xsb3dlcnMtb25seSBtb2RlLlxyXG5cdFx0XHRcdFx0Ly8gVGhpcyByb29tIGlzIG5vIGxvbmdlciBpbiBmb2xsb3dlcnMtb25seSBtb2RlLlxyXG5cdFx0XHRcdFx0Ly8gZHVyYXRpb24gaXMgaW4gbWludXRlcyAoc3RyaW5nKVxyXG5cdFx0XHRcdFx0Ly8gLTEgd2hlbiAvZm9sbG93ZXJzb2ZmIChzdHJpbmcpXHJcblx0XHRcdFx0XHQvLyBmYWxzZSB3aGVuIC9mb2xsb3dlcnMgd2l0aCBubyBkdXJhdGlvbiAoYm9vbGVhbilcclxuXHRcdFx0XHRcdGlmKF8uaGFzT3duKG1lc3NhZ2UudGFncywgJ2ZvbGxvd2Vycy1vbmx5JykpIHtcclxuXHRcdFx0XHRcdFx0aWYobWVzc2FnZS50YWdzWydmb2xsb3dlcnMtb25seSddID09PSAnLTEnKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZGlzYWJsZWQgPSBbIGNoYW5uZWwsIGZhbHNlLCAwIF07XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBubyBsb25nZXIgaW4gZm9sbG93ZXJzLW9ubHkgbW9kZS5gKTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmVtaXRzKFsgJ2ZvbGxvd2Vyc29ubHknLCAnZm9sbG93ZXJzbW9kZScsICdfcHJvbWlzZUZvbGxvd2Vyc29mZicgXSwgWyBkaXNhYmxlZCwgZGlzYWJsZWQsIFsgbnVsbCBdIF0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1pbnV0ZXMgPSB+fm1lc3NhZ2UudGFnc1snZm9sbG93ZXJzLW9ubHknXTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBlbmFibGVkID0gWyBjaGFubmVsLCB0cnVlLCBtaW51dGVzIF07XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgWyR7Y2hhbm5lbH1dIFRoaXMgcm9vbSBpcyBub3cgaW4gZm9sbG93ZXItb25seSBtb2RlLmApO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnZm9sbG93ZXJzb25seScsICdmb2xsb3dlcnNtb2RlJywgJ19wcm9taXNlRm9sbG93ZXJzJyBdLCBbIGVuYWJsZWQsIGVuYWJsZWQsIFsgbnVsbCBdIF0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Ly8gV3JvbmcgY2x1c3Rlci4uXHJcblx0XHRcdGNhc2UgJ1NFUlZFUkNIQU5HRSc6XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHRoaXMubG9nLndhcm4oYENvdWxkIG5vdCBwYXJzZSBtZXNzYWdlIGZyb20gdG1pLnR3aXRjaC50djpcXG4ke0pTT04uc3RyaW5naWZ5KG1lc3NhZ2UsIG51bGwsIDQpfWApO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblxyXG5cdC8vIE1lc3NhZ2VzIGZyb20ganR2Li5cclxuXHRlbHNlIGlmKG1lc3NhZ2UucHJlZml4ID09PSAnanR2Jykge1xyXG5cdFx0c3dpdGNoKG1lc3NhZ2UuY29tbWFuZCkge1xyXG5cdFx0XHRjYXNlICdNT0RFJzpcclxuXHRcdFx0XHRpZihtc2cgPT09ICcrbycpIHtcclxuXHRcdFx0XHRcdC8vIEFkZCB1c2VybmFtZSB0byB0aGUgbW9kZXJhdG9ycy4uXHJcblx0XHRcdFx0XHRpZighdGhpcy5tb2RlcmF0b3JzW2NoYW5uZWxdKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMubW9kZXJhdG9yc1tjaGFubmVsXSA9IFtdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0aWYoIXRoaXMubW9kZXJhdG9yc1tjaGFubmVsXS5pbmNsdWRlcyhtZXNzYWdlLnBhcmFtc1syXSkpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5tb2RlcmF0b3JzW2NoYW5uZWxdLnB1c2gobWVzc2FnZS5wYXJhbXNbMl0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHRoaXMuZW1pdCgnbW9kJywgY2hhbm5lbCwgbWVzc2FnZS5wYXJhbXNbMl0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmKG1zZyA9PT0gJy1vJykge1xyXG5cdFx0XHRcdFx0Ly8gUmVtb3ZlIHVzZXJuYW1lIGZyb20gdGhlIG1vZGVyYXRvcnMuLlxyXG5cdFx0XHRcdFx0aWYoIXRoaXMubW9kZXJhdG9yc1tjaGFubmVsXSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm1vZGVyYXRvcnNbY2hhbm5lbF0gPSBbXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHRoaXMubW9kZXJhdG9yc1tjaGFubmVsXS5maWx0ZXIodmFsdWUgPT4gdmFsdWUgIT09IG1lc3NhZ2UucGFyYW1zWzJdKTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3VubW9kJywgY2hhbm5lbCwgbWVzc2FnZS5wYXJhbXNbMl0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0dGhpcy5sb2cud2FybihgQ291bGQgbm90IHBhcnNlIG1lc3NhZ2UgZnJvbSBqdHY6XFxuJHtKU09OLnN0cmluZ2lmeShtZXNzYWdlLCBudWxsLCA0KX1gKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cclxuXHQvLyBBbnl0aGluZyBlbHNlLi5cclxuXHRlbHNlIHtcclxuXHRcdHN3aXRjaChtZXNzYWdlLmNvbW1hbmQpIHtcclxuXHRcdFx0Y2FzZSAnMzUzJzpcclxuXHRcdFx0XHR0aGlzLmVtaXQoJ25hbWVzJywgbWVzc2FnZS5wYXJhbXNbMl0sIG1lc3NhZ2UucGFyYW1zWzNdLnNwbGl0KCcgJykpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAnMzY2JzpcclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdC8vIFNvbWVvbmUgaGFzIGpvaW5lZCB0aGUgY2hhbm5lbC4uXHJcblx0XHRcdGNhc2UgJ0pPSU4nOiB7XHJcblx0XHRcdFx0Y29uc3QgbmljayA9IG1lc3NhZ2UucHJlZml4LnNwbGl0KCchJylbMF07XHJcblx0XHRcdFx0Ly8gSm9pbmVkIGEgY2hhbm5lbCBhcyBhIGp1c3RpbmZhbiAoYW5vbnltb3VzKSB1c2VyLi5cclxuXHRcdFx0XHRpZihfLmlzSnVzdGluZmFuKHRoaXMuZ2V0VXNlcm5hbWUoKSkgJiYgdGhpcy51c2VybmFtZSA9PT0gbmljaykge1xyXG5cdFx0XHRcdFx0dGhpcy5sYXN0Sm9pbmVkID0gY2hhbm5lbDtcclxuXHRcdFx0XHRcdHRoaXMuY2hhbm5lbHMucHVzaChjaGFubmVsKTtcclxuXHRcdFx0XHRcdHRoaXMubG9nLmluZm8oYEpvaW5lZCAke2NoYW5uZWx9YCk7XHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoJ2pvaW4nLCBjaGFubmVsLCBuaWNrLCB0cnVlKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFNvbWVvbmUgZWxzZSBqb2luZWQgdGhlIGNoYW5uZWwsIGp1c3QgZW1pdCB0aGUgam9pbiBldmVudC4uXHJcblx0XHRcdFx0aWYodGhpcy51c2VybmFtZSAhPT0gbmljaykge1xyXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCdqb2luJywgY2hhbm5lbCwgbmljaywgZmFsc2UpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU29tZW9uZSBoYXMgbGVmdCB0aGUgY2hhbm5lbC4uXHJcblx0XHRcdGNhc2UgJ1BBUlQnOiB7XHJcblx0XHRcdFx0bGV0IGlzU2VsZiA9IGZhbHNlO1xyXG5cdFx0XHRcdGNvbnN0IG5pY2sgPSBtZXNzYWdlLnByZWZpeC5zcGxpdCgnIScpWzBdO1xyXG5cdFx0XHRcdC8vIENsaWVudCBsZWZ0IGEgY2hhbm5lbC4uXHJcblx0XHRcdFx0aWYodGhpcy51c2VybmFtZSA9PT0gbmljaykge1xyXG5cdFx0XHRcdFx0aXNTZWxmID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGlmKHRoaXMudXNlcnN0YXRlW2NoYW5uZWxdKSB7IGRlbGV0ZSB0aGlzLnVzZXJzdGF0ZVtjaGFubmVsXTsgfVxyXG5cclxuXHRcdFx0XHRcdGxldCBpbmRleCA9IHRoaXMuY2hhbm5lbHMuaW5kZXhPZihjaGFubmVsKTtcclxuXHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkgeyB0aGlzLmNoYW5uZWxzLnNwbGljZShpbmRleCwgMSk7IH1cclxuXHJcblx0XHRcdFx0XHRpbmRleCA9IHRoaXMub3B0cy5jaGFubmVscy5pbmRleE9mKGNoYW5uZWwpO1xyXG5cdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7IHRoaXMub3B0cy5jaGFubmVscy5zcGxpY2UoaW5kZXgsIDEpOyB9XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5sb2cuaW5mbyhgTGVmdCAke2NoYW5uZWx9YCk7XHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoJ19wcm9taXNlUGFydCcsIG51bGwpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2xpZW50IG9yIHNvbWVvbmUgZWxzZSBsZWZ0IHRoZSBjaGFubmVsLCBlbWl0IHRoZSBwYXJ0IGV2ZW50Li5cclxuXHRcdFx0XHR0aGlzLmVtaXQoJ3BhcnQnLCBjaGFubmVsLCBuaWNrLCBpc1NlbGYpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWNlaXZlZCBhIHdoaXNwZXIuLlxyXG5cdFx0XHRjYXNlICdXSElTUEVSJzoge1xyXG5cdFx0XHRcdGNvbnN0IG5pY2sgPSBtZXNzYWdlLnByZWZpeC5zcGxpdCgnIScpWzBdO1xyXG5cdFx0XHRcdHRoaXMubG9nLmluZm8oYFtXSElTUEVSXSA8JHtuaWNrfT46ICR7bXNnfWApO1xyXG5cclxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHRhZ3MgdG8gcHJvdmlkZSB0aGUgdXNlcm5hbWUuLlxyXG5cdFx0XHRcdGlmKCFfLmhhc093bihtZXNzYWdlLnRhZ3MsICd1c2VybmFtZScpKSB7XHJcblx0XHRcdFx0XHRtZXNzYWdlLnRhZ3MudXNlcm5hbWUgPSBuaWNrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRtZXNzYWdlLnRhZ3NbJ21lc3NhZ2UtdHlwZSddID0gJ3doaXNwZXInO1xyXG5cclxuXHRcdFx0XHRjb25zdCBmcm9tID0gXy5jaGFubmVsKG1lc3NhZ2UudGFncy51c2VybmFtZSk7XHJcblx0XHRcdFx0Ly8gRW1pdCBmb3IgYm90aCwgd2hpc3BlciBhbmQgbWVzc2FnZS4uXHJcblx0XHRcdFx0dGhpcy5lbWl0cyhbICd3aGlzcGVyJywgJ21lc3NhZ2UnIF0sIFtcclxuXHRcdFx0XHRcdFsgZnJvbSwgbWVzc2FnZS50YWdzLCBtc2csIGZhbHNlIF1cclxuXHRcdFx0XHRdKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y2FzZSAnUFJJVk1TRyc6XHJcblx0XHRcdFx0Ly8gQWRkIHVzZXJuYW1lIChsb3dlcmNhc2UpIHRvIHRoZSB0YWdzLi5cclxuXHRcdFx0XHRtZXNzYWdlLnRhZ3MudXNlcm5hbWUgPSBtZXNzYWdlLnByZWZpeC5zcGxpdCgnIScpWzBdO1xyXG5cclxuXHRcdFx0XHQvLyBNZXNzYWdlIGZyb20gSlRWLi5cclxuXHRcdFx0XHRpZihtZXNzYWdlLnRhZ3MudXNlcm5hbWUgPT09ICdqdHYnKSB7XHJcblx0XHRcdFx0XHRjb25zdCBuYW1lID0gXy51c2VybmFtZShtc2cuc3BsaXQoJyAnKVswXSk7XHJcblx0XHRcdFx0XHRjb25zdCBhdXRvaG9zdCA9IG1zZy5pbmNsdWRlcygnYXV0bycpO1xyXG5cdFx0XHRcdFx0Ly8gU29tZW9uZSBpcyBob3N0aW5nIHRoZSBjaGFubmVsIGFuZCB0aGUgbWVzc2FnZSBjb250YWlucyBob3cgbWFueSB2aWV3ZXJzLi5cclxuXHRcdFx0XHRcdGlmKG1zZy5pbmNsdWRlcygnaG9zdGluZyB5b3UgZm9yJykpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgY291bnQgPSBfLmV4dHJhY3ROdW1iZXIobXNnKTtcclxuXHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdCgnaG9zdGVkJywgY2hhbm5lbCwgbmFtZSwgY291bnQsIGF1dG9ob3N0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHRcdFx0Ly8gU29tZSBpcyBob3N0aW5nIHRoZSBjaGFubmVsLCBidXQgbm8gdmlld2VyKHMpIGNvdW50IHByb3ZpZGVkIGluIHRoZSBtZXNzYWdlLi5cclxuXHRcdFx0XHRcdGVsc2UgaWYobXNnLmluY2x1ZGVzKCdob3N0aW5nIHlvdScpKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdCgnaG9zdGVkJywgY2hhbm5lbCwgbmFtZSwgMCwgYXV0b2hvc3QpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zdCBtZXNzYWdlc0xvZ0xldmVsID0gXy5nZXQodGhpcy5vcHRzLm9wdGlvbnMubWVzc2FnZXNMb2dMZXZlbCwgJ2luZm8nKTtcclxuXHJcblx0XHRcdFx0XHQvLyBNZXNzYWdlIGlzIGFuIGFjdGlvbiAoL21lIDxtZXNzYWdlPikuLlxyXG5cdFx0XHRcdFx0Y29uc3QgYWN0aW9uTWVzc2FnZSA9IF8uYWN0aW9uTWVzc2FnZShtc2cpO1xyXG5cdFx0XHRcdFx0bWVzc2FnZS50YWdzWydtZXNzYWdlLXR5cGUnXSA9IGFjdGlvbk1lc3NhZ2UgPyAnYWN0aW9uJyA6ICdjaGF0JztcclxuXHRcdFx0XHRcdG1zZyA9IGFjdGlvbk1lc3NhZ2UgPyBhY3Rpb25NZXNzYWdlWzFdIDogbXNnO1xyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgZm9yIEJpdHMgcHJpb3IgdG8gYWN0aW9ucyBtZXNzYWdlXHJcblx0XHRcdFx0XHRpZihfLmhhc093bihtZXNzYWdlLnRhZ3MsICdiaXRzJykpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdjaGVlcicsIGNoYW5uZWwsIG1lc3NhZ2UudGFncywgbXNnKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvL0hhbmRsZSBDaGFubmVsIFBvaW50IFJlZGVtcHRpb25zIChSZXF1aXJlJ3MgVGV4dCBJbnB1dClcclxuXHRcdFx0XHRcdFx0aWYoXy5oYXNPd24obWVzc2FnZS50YWdzLCAnbXNnLWlkJykpIHtcclxuXHRcdFx0XHRcdFx0XHRpZihtZXNzYWdlLnRhZ3NbJ21zZy1pZCddID09PSAnaGlnaGxpZ2h0ZWQtbWVzc2FnZScpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJld2FyZHR5cGUgPSBtZXNzYWdlLnRhZ3NbJ21zZy1pZCddO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWRlZW0nLCBjaGFubmVsLCBtZXNzYWdlLnRhZ3MudXNlcm5hbWUsIHJld2FyZHR5cGUsIG1lc3NhZ2UudGFncywgbXNnKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0ZWxzZSBpZihtZXNzYWdlLnRhZ3NbJ21zZy1pZCddID09PSAnc2tpcC1zdWJzLW1vZGUtbWVzc2FnZScpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJld2FyZHR5cGUgPSBtZXNzYWdlLnRhZ3NbJ21zZy1pZCddO1xyXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWRlZW0nLCBjaGFubmVsLCBtZXNzYWdlLnRhZ3MudXNlcm5hbWUsIHJld2FyZHR5cGUsIG1lc3NhZ2UudGFncywgbXNnKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihfLmhhc093bihtZXNzYWdlLnRhZ3MsICdjdXN0b20tcmV3YXJkLWlkJykpIHtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCByZXdhcmR0eXBlID0gbWVzc2FnZS50YWdzWydjdXN0b20tcmV3YXJkLWlkJ107XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5lbWl0KCdyZWRlZW0nLCBjaGFubmVsLCBtZXNzYWdlLnRhZ3MudXNlcm5hbWUsIHJld2FyZHR5cGUsIG1lc3NhZ2UudGFncywgbXNnKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRpZihhY3Rpb25NZXNzYWdlKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2dbbWVzc2FnZXNMb2dMZXZlbF0oYFske2NoYW5uZWx9XSAqPCR7bWVzc2FnZS50YWdzLnVzZXJuYW1lfT46ICR7bXNnfWApO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZW1pdHMoWyAnYWN0aW9uJywgJ21lc3NhZ2UnIF0sIFtcclxuXHRcdFx0XHRcdFx0XHRcdFsgY2hhbm5lbCwgbWVzc2FnZS50YWdzLCBtc2csIGZhbHNlIF1cclxuXHRcdFx0XHRcdFx0XHRdKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gTWVzc2FnZSBpcyBhIHJlZ3VsYXIgY2hhdCBtZXNzYWdlLi5cclxuXHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5sb2dbbWVzc2FnZXNMb2dMZXZlbF0oYFske2NoYW5uZWx9XSA8JHttZXNzYWdlLnRhZ3MudXNlcm5hbWV9PjogJHttc2d9YCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5lbWl0cyhbICdjaGF0JywgJ21lc3NhZ2UnIF0sIFtcclxuXHRcdFx0XHRcdFx0XHRcdFsgY2hhbm5lbCwgbWVzc2FnZS50YWdzLCBtc2csIGZhbHNlIF1cclxuXHRcdFx0XHRcdFx0XHRdKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0dGhpcy5sb2cud2FybihgQ291bGQgbm90IHBhcnNlIG1lc3NhZ2U6XFxuJHtKU09OLnN0cmluZ2lmeShtZXNzYWdlLCBudWxsLCA0KX1gKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcbn07XHJcbi8vIENvbm5lY3QgdG8gc2VydmVyLi5cclxuY2xpZW50LnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdCgpIHtcclxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0dGhpcy5zZXJ2ZXIgPSBfLmdldCh0aGlzLm9wdHMuY29ubmVjdGlvbi5zZXJ2ZXIsICdpcmMtd3MuY2hhdC50d2l0Y2gudHYnKTtcclxuXHRcdHRoaXMucG9ydCA9IF8uZ2V0KHRoaXMub3B0cy5jb25uZWN0aW9uLnBvcnQsIDgwKTtcclxuXHJcblx0XHQvLyBPdmVycmlkZSBwb3J0IGlmIHVzaW5nIGEgc2VjdXJlIGNvbm5lY3Rpb24uLlxyXG5cdFx0aWYodGhpcy5zZWN1cmUpIHsgdGhpcy5wb3J0ID0gNDQzOyB9XHJcblx0XHRpZih0aGlzLnBvcnQgPT09IDQ0MykgeyB0aGlzLnNlY3VyZSA9IHRydWU7IH1cclxuXHJcblx0XHR0aGlzLnJlY29ubmVjdFRpbWVyID0gdGhpcy5yZWNvbm5lY3RUaW1lciAqIHRoaXMucmVjb25uZWN0RGVjYXk7XHJcblx0XHRpZih0aGlzLnJlY29ubmVjdFRpbWVyID49IHRoaXMubWF4UmVjb25uZWN0SW50ZXJ2YWwpIHtcclxuXHRcdFx0dGhpcy5yZWNvbm5lY3RUaW1lciA9IHRoaXMubWF4UmVjb25uZWN0SW50ZXJ2YWw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29ubmVjdCB0byBzZXJ2ZXIgZnJvbSBjb25maWd1cmF0aW9uLi5cclxuXHRcdHRoaXMuX29wZW5Db25uZWN0aW9uKCk7XHJcblx0XHR0aGlzLm9uY2UoJ19wcm9taXNlQ29ubmVjdCcsIGVyciA9PiB7XHJcblx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIHRoaXMuc2VydmVyLCB+fnRoaXMucG9ydCBdKTsgfVxyXG5cdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59O1xyXG4vLyBPcGVuIGEgY29ubmVjdGlvbi4uXHJcbmNsaWVudC5wcm90b3R5cGUuX29wZW5Db25uZWN0aW9uID0gZnVuY3Rpb24gX29wZW5Db25uZWN0aW9uKCkge1xyXG5cdGNvbnN0IHVybCA9IGAke3RoaXMuc2VjdXJlID8gJ3dzcycgOiAnd3MnfTovLyR7dGhpcy5zZXJ2ZXJ9OiR7dGhpcy5wb3J0fS9gO1xyXG5cdC8qKiBAdHlwZSB7aW1wb3J0KCd3cycpLkNsaWVudE9wdGlvbnN9ICovXHJcblx0Y29uc3QgY29ubmVjdGlvbk9wdGlvbnMgPSB7fTtcclxuXHRpZignYWdlbnQnIGluIHRoaXMub3B0cy5jb25uZWN0aW9uKSB7XHJcblx0XHRjb25uZWN0aW9uT3B0aW9ucy5hZ2VudCA9IHRoaXMub3B0cy5jb25uZWN0aW9uLmFnZW50O1xyXG5cdH1cclxuXHR0aGlzLndzID0gbmV3IF9XZWJTb2NrZXQodXJsLCAnaXJjJywgY29ubmVjdGlvbk9wdGlvbnMpO1xyXG5cclxuXHR0aGlzLndzLm9ubWVzc2FnZSA9IHRoaXMuX29uTWVzc2FnZS5iaW5kKHRoaXMpO1xyXG5cdHRoaXMud3Mub25lcnJvciA9IHRoaXMuX29uRXJyb3IuYmluZCh0aGlzKTtcclxuXHR0aGlzLndzLm9uY2xvc2UgPSB0aGlzLl9vbkNsb3NlLmJpbmQodGhpcyk7XHJcblx0dGhpcy53cy5vbm9wZW4gPSB0aGlzLl9vbk9wZW4uYmluZCh0aGlzKTtcclxufTtcclxuLy8gQ2FsbGVkIHdoZW4gdGhlIFdlYlNvY2tldCBjb25uZWN0aW9uJ3MgcmVhZHlTdGF0ZSBjaGFuZ2VzIHRvIE9QRU4uXHJcbi8vIEluZGljYXRlcyB0aGF0IHRoZSBjb25uZWN0aW9uIGlzIHJlYWR5IHRvIHNlbmQgYW5kIHJlY2VpdmUgZGF0YS4uXHJcbmNsaWVudC5wcm90b3R5cGUuX29uT3BlbiA9IGZ1bmN0aW9uIF9vbk9wZW4oKSB7XHJcblx0aWYoIXRoaXMuX2lzQ29ubmVjdGVkKCkpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIEVtaXR0aW5nIFwiY29ubmVjdGluZ1wiIGV2ZW50Li5cclxuXHR0aGlzLmxvZy5pbmZvKGBDb25uZWN0aW5nIHRvICR7dGhpcy5zZXJ2ZXJ9IG9uIHBvcnQgJHt0aGlzLnBvcnR9Li5gKTtcclxuXHR0aGlzLmVtaXQoJ2Nvbm5lY3RpbmcnLCB0aGlzLnNlcnZlciwgfn50aGlzLnBvcnQpO1xyXG5cclxuXHR0aGlzLnVzZXJuYW1lID0gXy5nZXQodGhpcy5vcHRzLmlkZW50aXR5LnVzZXJuYW1lLCBfLmp1c3RpbmZhbigpKTtcclxuXHR0aGlzLl9nZXRUb2tlbigpXHJcblx0LnRoZW4odG9rZW4gPT4ge1xyXG5cdFx0Y29uc3QgcGFzc3dvcmQgPSBfLnBhc3N3b3JkKHRva2VuKTtcclxuXHJcblx0XHQvLyBFbWl0dGluZyBcImxvZ29uXCIgZXZlbnQuLlxyXG5cdFx0dGhpcy5sb2cuaW5mbygnU2VuZGluZyBhdXRoZW50aWNhdGlvbiB0byBzZXJ2ZXIuLicpO1xyXG5cdFx0dGhpcy5lbWl0KCdsb2dvbicpO1xyXG5cclxuXHRcdGxldCBjYXBzID0gJ3R3aXRjaC50di90YWdzIHR3aXRjaC50di9jb21tYW5kcyc7XHJcblx0XHRpZighdGhpcy5fc2tpcE1lbWJlcnNoaXApIHtcclxuXHRcdFx0Y2FwcyArPSAnIHR3aXRjaC50di9tZW1iZXJzaGlwJztcclxuXHRcdH1cclxuXHRcdHRoaXMud3Muc2VuZCgnQ0FQIFJFUSA6JyArIGNhcHMpO1xyXG5cclxuXHRcdC8vIEF1dGhlbnRpY2F0aW9uLi5cclxuXHRcdGlmKHBhc3N3b3JkKSB7XHJcblx0XHRcdHRoaXMud3Muc2VuZChgUEFTUyAke3Bhc3N3b3JkfWApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihfLmlzSnVzdGluZmFuKHRoaXMudXNlcm5hbWUpKSB7XHJcblx0XHRcdHRoaXMud3Muc2VuZCgnUEFTUyBTQ0hNT09QSUlFJyk7XHJcblx0XHR9XHJcblx0XHR0aGlzLndzLnNlbmQoYE5JQ0sgJHt0aGlzLnVzZXJuYW1lfWApO1xyXG5cdH0pXHJcblx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHR0aGlzLmVtaXRzKFsgJ19wcm9taXNlQ29ubmVjdCcsICdkaXNjb25uZWN0ZWQnIF0sIFsgWyBlcnIgXSwgWyAnQ291bGQgbm90IGdldCBhIHRva2VuLicgXSBdKTtcclxuXHR9KTtcclxufTtcclxuLy8gRmV0Y2hlcyBhIHRva2VuIGZyb20gdGhlIG9wdGlvbi5cclxuY2xpZW50LnByb3RvdHlwZS5fZ2V0VG9rZW4gPSBmdW5jdGlvbiBfZ2V0VG9rZW4oKSB7XHJcblx0Y29uc3QgcGFzc3dvcmRPcHRpb24gPSB0aGlzLm9wdHMuaWRlbnRpdHkucGFzc3dvcmQ7XHJcblx0bGV0IHBhc3N3b3JkO1xyXG5cdGlmKHR5cGVvZiBwYXNzd29yZE9wdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0cGFzc3dvcmQgPSBwYXNzd29yZE9wdGlvbigpO1xyXG5cdFx0aWYocGFzc3dvcmQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XHJcblx0XHRcdHJldHVybiBwYXNzd29yZDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUocGFzc3dvcmQpO1xyXG5cdH1cclxuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHBhc3N3b3JkT3B0aW9uKTtcclxufTtcclxuLy8gQ2FsbGVkIHdoZW4gYSBtZXNzYWdlIGlzIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4uXHJcbmNsaWVudC5wcm90b3R5cGUuX29uTWVzc2FnZSA9IGZ1bmN0aW9uIF9vbk1lc3NhZ2UoZXZlbnQpIHtcclxuXHRjb25zdCBwYXJ0cyA9IGV2ZW50LmRhdGEudHJpbSgpLnNwbGl0KCdcXHJcXG4nKTtcclxuXHJcblx0cGFydHMuZm9yRWFjaChzdHIgPT4ge1xyXG5cdFx0Y29uc3QgbXNnID0gcGFyc2UubXNnKHN0cik7XHJcblx0XHRpZihtc2cpIHtcclxuXHRcdFx0dGhpcy5oYW5kbGVNZXNzYWdlKG1zZyk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbi8vIENhbGxlZCB3aGVuIGFuIGVycm9yIG9jY3Vycy4uXHJcbmNsaWVudC5wcm90b3R5cGUuX29uRXJyb3IgPSBmdW5jdGlvbiBfb25FcnJvcigpIHtcclxuXHR0aGlzLm1vZGVyYXRvcnMgPSB7fTtcclxuXHR0aGlzLnVzZXJzdGF0ZSA9IHt9O1xyXG5cdHRoaXMuZ2xvYmFsdXNlcnN0YXRlID0ge307XHJcblxyXG5cdC8vIFN0b3AgdGhlIGludGVybmFsIHBpbmcgdGltZW91dCBjaGVjayBpbnRlcnZhbC4uXHJcblx0Y2xlYXJJbnRlcnZhbCh0aGlzLnBpbmdMb29wKTtcclxuXHRjbGVhclRpbWVvdXQodGhpcy5waW5nVGltZW91dCk7XHJcblx0Y2xlYXJUaW1lb3V0KHRoaXMuX3VwZGF0ZUVtb3Rlc2V0c1RpbWVyKTtcclxuXHJcblx0dGhpcy5yZWFzb24gPSB0aGlzLndzID09PSBudWxsID8gJ0Nvbm5lY3Rpb24gY2xvc2VkLicgOiAnVW5hYmxlIHRvIGNvbm5lY3QuJztcclxuXHJcblx0dGhpcy5lbWl0cyhbICdfcHJvbWlzZUNvbm5lY3QnLCAnZGlzY29ubmVjdGVkJyBdLCBbIFsgdGhpcy5yZWFzb24gXSBdKTtcclxuXHJcblx0Ly8gUmVjb25uZWN0IHRvIHNlcnZlci4uXHJcblx0aWYodGhpcy5yZWNvbm5lY3QgJiYgdGhpcy5yZWNvbm5lY3Rpb25zID09PSB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XHJcblx0XHR0aGlzLmVtaXQoJ21heHJlY29ubmVjdCcpO1xyXG5cdFx0dGhpcy5sb2cuZXJyb3IoJ01heGltdW0gcmVjb25uZWN0aW9uIGF0dGVtcHRzIHJlYWNoZWQuJyk7XHJcblx0fVxyXG5cdGlmKHRoaXMucmVjb25uZWN0ICYmICF0aGlzLnJlY29ubmVjdGluZyAmJiB0aGlzLnJlY29ubmVjdGlvbnMgPD0gdGhpcy5tYXhSZWNvbm5lY3RBdHRlbXB0cyAtIDEpIHtcclxuXHRcdHRoaXMucmVjb25uZWN0aW5nID0gdHJ1ZTtcclxuXHRcdHRoaXMucmVjb25uZWN0aW9ucyA9IHRoaXMucmVjb25uZWN0aW9ucyArIDE7XHJcblx0XHR0aGlzLmxvZy5lcnJvcihgUmVjb25uZWN0aW5nIGluICR7TWF0aC5yb3VuZCh0aGlzLnJlY29ubmVjdFRpbWVyIC8gMTAwMCl9IHNlY29uZHMuLmApO1xyXG5cdFx0dGhpcy5lbWl0KCdyZWNvbm5lY3QnKTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnJlY29ubmVjdGluZyA9IGZhbHNlO1xyXG5cdFx0XHR0aGlzLmNvbm5lY3QoKS5jYXRjaChlcnIgPT4gdGhpcy5sb2cuZXJyb3IoZXJyKSk7XHJcblx0XHR9LCB0aGlzLnJlY29ubmVjdFRpbWVyKTtcclxuXHR9XHJcblxyXG5cdHRoaXMud3MgPSBudWxsO1xyXG59O1xyXG4vLyBDYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gQ0xPU0VELi5cclxuY2xpZW50LnByb3RvdHlwZS5fb25DbG9zZSA9IGZ1bmN0aW9uIF9vbkNsb3NlKCkge1xyXG5cdHRoaXMubW9kZXJhdG9ycyA9IHt9O1xyXG5cdHRoaXMudXNlcnN0YXRlID0ge307XHJcblx0dGhpcy5nbG9iYWx1c2Vyc3RhdGUgPSB7fTtcclxuXHJcblx0Ly8gU3RvcCB0aGUgaW50ZXJuYWwgcGluZyB0aW1lb3V0IGNoZWNrIGludGVydmFsLi5cclxuXHRjbGVhckludGVydmFsKHRoaXMucGluZ0xvb3ApO1xyXG5cdGNsZWFyVGltZW91dCh0aGlzLnBpbmdUaW1lb3V0KTtcclxuXHRjbGVhclRpbWVvdXQodGhpcy5fdXBkYXRlRW1vdGVzZXRzVGltZXIpO1xyXG5cclxuXHQvLyBVc2VyIGNhbGxlZCAuZGlzY29ubmVjdCgpLCBkb24ndCB0cnkgdG8gcmVjb25uZWN0LlxyXG5cdGlmKHRoaXMud2FzQ2xvc2VDYWxsZWQpIHtcclxuXHRcdHRoaXMud2FzQ2xvc2VDYWxsZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMucmVhc29uID0gJ0Nvbm5lY3Rpb24gY2xvc2VkLic7XHJcblx0XHR0aGlzLmxvZy5pbmZvKHRoaXMucmVhc29uKTtcclxuXHRcdHRoaXMuZW1pdHMoWyAnX3Byb21pc2VDb25uZWN0JywgJ19wcm9taXNlRGlzY29ubmVjdCcsICdkaXNjb25uZWN0ZWQnIF0sIFsgWyB0aGlzLnJlYXNvbiBdLCBbIG51bGwgXSwgWyB0aGlzLnJlYXNvbiBdIF0pO1xyXG5cdH1cclxuXHJcblx0Ly8gR290IGRpc2Nvbm5lY3RlZCBmcm9tIHNlcnZlci4uXHJcblx0ZWxzZSB7XHJcblx0XHR0aGlzLmVtaXRzKFsgJ19wcm9taXNlQ29ubmVjdCcsICdkaXNjb25uZWN0ZWQnIF0sIFsgWyB0aGlzLnJlYXNvbiBdIF0pO1xyXG5cclxuXHRcdC8vIFJlY29ubmVjdCB0byBzZXJ2ZXIuLlxyXG5cdFx0aWYodGhpcy5yZWNvbm5lY3QgJiYgdGhpcy5yZWNvbm5lY3Rpb25zID09PSB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XHJcblx0XHRcdHRoaXMuZW1pdCgnbWF4cmVjb25uZWN0Jyk7XHJcblx0XHRcdHRoaXMubG9nLmVycm9yKCdNYXhpbXVtIHJlY29ubmVjdGlvbiBhdHRlbXB0cyByZWFjaGVkLicpO1xyXG5cdFx0fVxyXG5cdFx0aWYodGhpcy5yZWNvbm5lY3QgJiYgIXRoaXMucmVjb25uZWN0aW5nICYmIHRoaXMucmVjb25uZWN0aW9ucyA8PSB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzIC0gMSkge1xyXG5cdFx0XHR0aGlzLnJlY29ubmVjdGluZyA9IHRydWU7XHJcblx0XHRcdHRoaXMucmVjb25uZWN0aW9ucyA9IHRoaXMucmVjb25uZWN0aW9ucyArIDE7XHJcblx0XHRcdHRoaXMubG9nLmVycm9yKGBDb3VsZCBub3QgY29ubmVjdCB0byBzZXJ2ZXIuIFJlY29ubmVjdGluZyBpbiAke01hdGgucm91bmQodGhpcy5yZWNvbm5lY3RUaW1lciAvIDEwMDApfSBzZWNvbmRzLi5gKTtcclxuXHRcdFx0dGhpcy5lbWl0KCdyZWNvbm5lY3QnKTtcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5yZWNvbm5lY3RpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHR0aGlzLmNvbm5lY3QoKS5jYXRjaChlcnIgPT4gdGhpcy5sb2cuZXJyb3IoZXJyKSk7XHJcblx0XHRcdH0sIHRoaXMucmVjb25uZWN0VGltZXIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0dGhpcy53cyA9IG51bGw7XHJcbn07XHJcbi8vIE1pbmltdW0gb2YgNjAwbXMgZm9yIGNvbW1hbmQgcHJvbWlzZXMsIGlmIGN1cnJlbnQgbGF0ZW5jeSBleGNlZWRzLCBhZGQgMTAwbXMgdG8gaXQgdG8gbWFrZSBzdXJlIGl0IGRvZXNuJ3QgZ2V0IHRpbWVkIG91dC4uXHJcbmNsaWVudC5wcm90b3R5cGUuX2dldFByb21pc2VEZWxheSA9IGZ1bmN0aW9uIF9nZXRQcm9taXNlRGVsYXkoKSB7XHJcblx0aWYodGhpcy5jdXJyZW50TGF0ZW5jeSA8PSA2MDApIHsgcmV0dXJuIDYwMDsgfVxyXG5cdGVsc2UgeyByZXR1cm4gdGhpcy5jdXJyZW50TGF0ZW5jeSArIDEwMDsgfVxyXG59O1xyXG4vLyBTZW5kIGNvbW1hbmQgdG8gc2VydmVyIG9yIGNoYW5uZWwuLlxyXG5jbGllbnQucHJvdG90eXBlLl9zZW5kQ29tbWFuZCA9IGZ1bmN0aW9uIF9zZW5kQ29tbWFuZChkZWxheSwgY2hhbm5lbCwgY29tbWFuZCwgZm4pIHtcclxuXHQvLyBSYWNlIHByb21pc2UgYWdhaW5zdCBkZWxheS4uXHJcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdC8vIE1ha2Ugc3VyZSB0aGUgc29ja2V0IGlzIG9wZW5lZC4uXHJcblx0XHRpZighdGhpcy5faXNDb25uZWN0ZWQoKSkge1xyXG5cdFx0XHQvLyBEaXNjb25uZWN0ZWQgZnJvbSBzZXJ2ZXIuLlxyXG5cdFx0XHRyZXR1cm4gcmVqZWN0KCdOb3QgY29ubmVjdGVkIHRvIHNlcnZlci4nKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoZGVsYXkgPT09IG51bGwgfHwgdHlwZW9mIGRlbGF5ID09PSAnbnVtYmVyJykge1xyXG5cdFx0XHRpZihkZWxheSA9PT0gbnVsbCkge1xyXG5cdFx0XHRcdGRlbGF5ID0gdGhpcy5fZ2V0UHJvbWlzZURlbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Xy5wcm9taXNlRGVsYXkoZGVsYXkpLnRoZW4oKCkgPT4gcmVqZWN0KCdObyByZXNwb25zZSBmcm9tIFR3aXRjaC4nKSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXhlY3V0aW5nIGEgY29tbWFuZCBvbiBhIGNoYW5uZWwuLlxyXG5cdFx0aWYoY2hhbm5lbCAhPT0gbnVsbCkge1xyXG5cdFx0XHRjb25zdCBjaGFuID0gXy5jaGFubmVsKGNoYW5uZWwpO1xyXG5cdFx0XHR0aGlzLmxvZy5pbmZvKGBbJHtjaGFufV0gRXhlY3V0aW5nIGNvbW1hbmQ6ICR7Y29tbWFuZH1gKTtcclxuXHRcdFx0dGhpcy53cy5zZW5kKGBQUklWTVNHICR7Y2hhbn0gOiR7Y29tbWFuZH1gKTtcclxuXHRcdH1cclxuXHRcdC8vIEV4ZWN1dGluZyBhIHJhdyBjb21tYW5kLi5cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0aGlzLmxvZy5pbmZvKGBFeGVjdXRpbmcgY29tbWFuZDogJHtjb21tYW5kfWApO1xyXG5cdFx0XHR0aGlzLndzLnNlbmQoY29tbWFuZCk7XHJcblx0XHR9XHJcblx0XHRpZih0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0Zm4ocmVzb2x2ZSwgcmVqZWN0KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRyZXNvbHZlKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcbi8vIFNlbmQgYSBtZXNzYWdlIHRvIGNoYW5uZWwuLlxyXG5jbGllbnQucHJvdG90eXBlLl9zZW5kTWVzc2FnZSA9IGZ1bmN0aW9uIF9zZW5kTWVzc2FnZShkZWxheSwgY2hhbm5lbCwgbWVzc2FnZSwgZm4pIHtcclxuXHQvLyBQcm9taXNlIGEgcmVzdWx0Li5cclxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG5cdFx0Ly8gTWFrZSBzdXJlIHRoZSBzb2NrZXQgaXMgb3BlbmVkIGFuZCBub3QgbG9nZ2VkIGluIGFzIGEganVzdGluZmFuIHVzZXIuLlxyXG5cdFx0aWYoIXRoaXMuX2lzQ29ubmVjdGVkKCkpIHtcclxuXHRcdFx0cmV0dXJuIHJlamVjdCgnTm90IGNvbm5lY3RlZCB0byBzZXJ2ZXIuJyk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKF8uaXNKdXN0aW5mYW4odGhpcy5nZXRVc2VybmFtZSgpKSkge1xyXG5cdFx0XHRyZXR1cm4gcmVqZWN0KCdDYW5ub3Qgc2VuZCBhbm9ueW1vdXMgbWVzc2FnZXMuJyk7XHJcblx0XHR9XHJcblx0XHRjb25zdCBjaGFuID0gXy5jaGFubmVsKGNoYW5uZWwpO1xyXG5cdFx0aWYoIXRoaXMudXNlcnN0YXRlW2NoYW5dKSB7IHRoaXMudXNlcnN0YXRlW2NoYW5dID0ge307IH1cclxuXHJcblx0XHQvLyBTcGxpdCBsb25nIGxpbmVzIG90aGVyd2lzZSB0aGV5IHdpbGwgYmUgZWF0ZW4gYnkgdGhlIHNlcnZlci4uXHJcblx0XHRpZihtZXNzYWdlLmxlbmd0aCA+PSA1MDApIHtcclxuXHRcdFx0Y29uc3QgbXNnID0gXy5zcGxpdExpbmUobWVzc2FnZSwgNTAwKTtcclxuXHRcdFx0bWVzc2FnZSA9IG1zZ1swXTtcclxuXHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuX3NlbmRNZXNzYWdlKGRlbGF5LCBjaGFubmVsLCBtc2dbMV0sICgpID0+IHt9KTtcclxuXHRcdFx0fSwgMzUwKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLndzLnNlbmQoYFBSSVZNU0cgJHtjaGFufSA6JHttZXNzYWdlfWApO1xyXG5cclxuXHRcdGNvbnN0IGVtb3RlcyA9IHt9O1xyXG5cclxuXHRcdC8vIFBhcnNlIHJlZ2V4IGFuZCBzdHJpbmcgZW1vdGVzLi5cclxuXHRcdE9iamVjdC5rZXlzKHRoaXMuZW1vdGVzZXRzKS5mb3JFYWNoKGlkID0+IHRoaXMuZW1vdGVzZXRzW2lkXS5mb3JFYWNoKGVtb3RlID0+IHtcclxuXHRcdFx0Y29uc3QgZW1vdGVGdW5jID0gXy5pc1JlZ2V4KGVtb3RlLmNvZGUpID8gcGFyc2UuZW1vdGVSZWdleCA6IHBhcnNlLmVtb3RlU3RyaW5nO1xyXG5cdFx0XHRyZXR1cm4gZW1vdGVGdW5jKG1lc3NhZ2UsIGVtb3RlLmNvZGUsIGVtb3RlLmlkLCBlbW90ZXMpO1xyXG5cdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gTWVyZ2UgdXNlcnN0YXRlIHdpdGggcGFyc2VkIGVtb3Rlcy4uXHJcblx0XHRjb25zdCB1c2Vyc3RhdGUgPSBPYmplY3QuYXNzaWduKFxyXG5cdFx0XHR0aGlzLnVzZXJzdGF0ZVtjaGFuXSxcclxuXHRcdFx0cGFyc2UuZW1vdGVzKHsgZW1vdGVzOiBwYXJzZS50cmFuc2Zvcm1FbW90ZXMoZW1vdGVzKSB8fCBudWxsIH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IG1lc3NhZ2VzTG9nTGV2ZWwgPSBfLmdldCh0aGlzLm9wdHMub3B0aW9ucy5tZXNzYWdlc0xvZ0xldmVsLCAnaW5mbycpO1xyXG5cclxuXHRcdC8vIE1lc3NhZ2UgaXMgYW4gYWN0aW9uICgvbWUgPG1lc3NhZ2U+KS4uXHJcblx0XHRjb25zdCBhY3Rpb25NZXNzYWdlID0gXy5hY3Rpb25NZXNzYWdlKG1lc3NhZ2UpO1xyXG5cdFx0aWYoYWN0aW9uTWVzc2FnZSkge1xyXG5cdFx0XHR1c2Vyc3RhdGVbJ21lc3NhZ2UtdHlwZSddID0gJ2FjdGlvbic7XHJcblx0XHRcdHRoaXMubG9nW21lc3NhZ2VzTG9nTGV2ZWxdKGBbJHtjaGFufV0gKjwke3RoaXMuZ2V0VXNlcm5hbWUoKX0+OiAke2FjdGlvbk1lc3NhZ2VbMV19YCk7XHJcblx0XHRcdHRoaXMuZW1pdHMoWyAnYWN0aW9uJywgJ21lc3NhZ2UnIF0sIFtcclxuXHRcdFx0XHRbIGNoYW4sIHVzZXJzdGF0ZSwgYWN0aW9uTWVzc2FnZVsxXSwgdHJ1ZSBdXHJcblx0XHRcdF0pO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHQvLyBNZXNzYWdlIGlzIGEgcmVndWxhciBjaGF0IG1lc3NhZ2UuLlxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHVzZXJzdGF0ZVsnbWVzc2FnZS10eXBlJ10gPSAnY2hhdCc7XHJcblx0XHRcdHRoaXMubG9nW21lc3NhZ2VzTG9nTGV2ZWxdKGBbJHtjaGFufV0gPCR7dGhpcy5nZXRVc2VybmFtZSgpfT46ICR7bWVzc2FnZX1gKTtcclxuXHRcdFx0dGhpcy5lbWl0cyhbICdjaGF0JywgJ21lc3NhZ2UnIF0sIFtcclxuXHRcdFx0XHRbIGNoYW4sIHVzZXJzdGF0ZSwgbWVzc2FnZSwgdHJ1ZSBdXHJcblx0XHRcdF0pO1xyXG5cdFx0fVxyXG5cdFx0aWYodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdGZuKHJlc29sdmUsIHJlamVjdCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59O1xyXG4vLyBHcmFiIHRoZSBlbW90ZS1zZXRzIG9iamVjdCBmcm9tIHRoZSBBUEkuLlxyXG5jbGllbnQucHJvdG90eXBlLl91cGRhdGVFbW90ZXNldCA9IGZ1bmN0aW9uIF91cGRhdGVFbW90ZXNldChzZXRzKSB7XHJcblx0bGV0IHNldHNDaGFuZ2VzID0gc2V0cyAhPT0gdW5kZWZpbmVkO1xyXG5cdGlmKHNldHNDaGFuZ2VzKSB7XHJcblx0XHRpZihzZXRzID09PSB0aGlzLmVtb3Rlcykge1xyXG5cdFx0XHRzZXRzQ2hhbmdlcyA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuZW1vdGVzID0gc2V0cztcclxuXHRcdH1cclxuXHR9XHJcblx0aWYodGhpcy5fc2tpcFVwZGF0aW5nRW1vdGVzZXRzKSB7XHJcblx0XHRpZihzZXRzQ2hhbmdlcykge1xyXG5cdFx0XHR0aGlzLmVtaXQoJ2Vtb3Rlc2V0cycsIHNldHMsIHt9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybjtcclxuXHR9XHJcblx0Y29uc3Qgc2V0RW1vdGVzZXRUaW1lciA9ICgpID0+IHtcclxuXHRcdGlmKHRoaXMuX3VwZGF0ZUVtb3Rlc2V0c1RpbWVyRGVsYXkgPiAwKSB7XHJcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLl91cGRhdGVFbW90ZXNldHNUaW1lcik7XHJcblx0XHRcdHRoaXMuX3VwZGF0ZUVtb3Rlc2V0c1RpbWVyID0gc2V0VGltZW91dCgoKSA9PiB0aGlzLl91cGRhdGVFbW90ZXNldChzZXRzKSwgdGhpcy5fdXBkYXRlRW1vdGVzZXRzVGltZXJEZWxheSk7XHJcblx0XHR9XHJcblx0fTtcclxuXHR0aGlzLl9nZXRUb2tlbigpXHJcblx0LnRoZW4odG9rZW4gPT4ge1xyXG5cdFx0Y29uc3QgdXJsID0gYGh0dHBzOi8vYXBpLnR3aXRjaC50di9rcmFrZW4vY2hhdC9lbW90aWNvbl9pbWFnZXM/ZW1vdGVzZXRzPSR7c2V0c31gO1xyXG5cdFx0LyoqIEB0eXBlIHtpbXBvcnQoJ25vZGUtZmV0Y2gnKS5SZXF1ZXN0SW5pdH0gKi9cclxuXHRcdGNvbnN0IGZldGNoT3B0aW9ucyA9IHt9O1xyXG5cdFx0aWYoJ2ZldGNoQWdlbnQnIGluIHRoaXMub3B0cy5jb25uZWN0aW9uKSB7XHJcblx0XHRcdGZldGNoT3B0aW9ucy5hZ2VudCA9IHRoaXMub3B0cy5jb25uZWN0aW9uLmZldGNoQWdlbnQ7XHJcblx0XHR9XHJcblx0XHQvKiogQHR5cGUge2ltcG9ydCgnbm9kZS1mZXRjaCcpLlJlc3BvbnNlfSAqL1xyXG5cdFx0cmV0dXJuIF9mZXRjaCh1cmwsIHtcclxuXHRcdFx0Li4uZmV0Y2hPcHRpb25zLFxyXG5cdFx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdFx0J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi92bmQudHdpdGNodHYudjUranNvbicsXHJcblx0XHRcdFx0J0F1dGhvcml6YXRpb24nOiBgT0F1dGggJHtfLnRva2VuKHRva2VuKX1gLFxyXG5cdFx0XHRcdCdDbGllbnQtSUQnOiB0aGlzLmNsaWVudElkXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pXHJcblx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblx0LnRoZW4oZGF0YSA9PiB7XHJcblx0XHR0aGlzLmVtb3Rlc2V0cyA9IGRhdGEuZW1vdGljb25fc2V0cyB8fCB7fTtcclxuXHRcdHRoaXMuZW1pdCgnZW1vdGVzZXRzJywgc2V0cywgdGhpcy5lbW90ZXNldHMpO1xyXG5cdFx0c2V0RW1vdGVzZXRUaW1lcigpO1xyXG5cdH0pXHJcblx0LmNhdGNoKCgpID0+IHNldEVtb3Rlc2V0VGltZXIoKSk7XHJcbn07XHJcbi8vIEdldCBjdXJyZW50IHVzZXJuYW1lLi5cclxuY2xpZW50LnByb3RvdHlwZS5nZXRVc2VybmFtZSA9IGZ1bmN0aW9uIGdldFVzZXJuYW1lKCkge1xyXG5cdHJldHVybiB0aGlzLnVzZXJuYW1lO1xyXG59O1xyXG4vLyBHZXQgY3VycmVudCBvcHRpb25zLi5cclxuY2xpZW50LnByb3RvdHlwZS5nZXRPcHRpb25zID0gZnVuY3Rpb24gZ2V0T3B0aW9ucygpIHtcclxuXHRyZXR1cm4gdGhpcy5vcHRzO1xyXG59O1xyXG4vLyBHZXQgY3VycmVudCBjaGFubmVscy4uXHJcbmNsaWVudC5wcm90b3R5cGUuZ2V0Q2hhbm5lbHMgPSBmdW5jdGlvbiBnZXRDaGFubmVscygpIHtcclxuXHRyZXR1cm4gdGhpcy5jaGFubmVscztcclxufTtcclxuLy8gQ2hlY2sgaWYgdXNlcm5hbWUgaXMgYSBtb2RlcmF0b3Igb24gYSBjaGFubmVsLi5cclxuY2xpZW50LnByb3RvdHlwZS5pc01vZCA9IGZ1bmN0aW9uIGlzTW9kKGNoYW5uZWwsIHVzZXJuYW1lKSB7XHJcblx0Y29uc3QgY2hhbiA9IF8uY2hhbm5lbChjaGFubmVsKTtcclxuXHRpZighdGhpcy5tb2RlcmF0b3JzW2NoYW5dKSB7IHRoaXMubW9kZXJhdG9yc1tjaGFuXSA9IFtdOyB9XHJcblx0cmV0dXJuIHRoaXMubW9kZXJhdG9yc1tjaGFuXS5pbmNsdWRlcyhfLnVzZXJuYW1lKHVzZXJuYW1lKSk7XHJcbn07XHJcbi8vIEdldCByZWFkeVN0YXRlLi5cclxuY2xpZW50LnByb3RvdHlwZS5yZWFkeVN0YXRlID0gZnVuY3Rpb24gcmVhZHlTdGF0ZSgpIHtcclxuXHRpZih0aGlzLndzID09PSBudWxsKSB7IHJldHVybiAnQ0xPU0VEJzsgfVxyXG5cdHJldHVybiBbICdDT05ORUNUSU5HJywgJ09QRU4nLCAnQ0xPU0lORycsICdDTE9TRUQnIF1bdGhpcy53cy5yZWFkeVN0YXRlXTtcclxufTtcclxuLy8gRGV0ZXJtaW5lIGlmIHRoZSBjbGllbnQgaGFzIGEgV2ViU29ja2V0IGFuZCBpdCdzIG9wZW4uLlxyXG5jbGllbnQucHJvdG90eXBlLl9pc0Nvbm5lY3RlZCA9IGZ1bmN0aW9uIF9pc0Nvbm5lY3RlZCgpIHtcclxuXHRyZXR1cm4gdGhpcy53cyAhPT0gbnVsbCAmJiB0aGlzLndzLnJlYWR5U3RhdGUgPT09IDE7XHJcbn07XHJcbi8vIERpc2Nvbm5lY3QgZnJvbSBzZXJ2ZXIuLlxyXG5jbGllbnQucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xyXG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcblx0XHRpZih0aGlzLndzICE9PSBudWxsICYmIHRoaXMud3MucmVhZHlTdGF0ZSAhPT0gMykge1xyXG5cdFx0XHR0aGlzLndhc0Nsb3NlQ2FsbGVkID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5sb2cuaW5mbygnRGlzY29ubmVjdGluZyBmcm9tIHNlcnZlci4uJyk7XHJcblx0XHRcdHRoaXMud3MuY2xvc2UoKTtcclxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZURpc2Nvbm5lY3QnLCAoKSA9PiByZXNvbHZlKFsgdGhpcy5zZXJ2ZXIsIH5+dGhpcy5wb3J0IF0pKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0aGlzLmxvZy5lcnJvcignQ2Fubm90IGRpc2Nvbm5lY3QgZnJvbSBzZXJ2ZXIuIFNvY2tldCBpcyBub3Qgb3BlbmVkIG9yIGNvbm5lY3Rpb24gaXMgYWxyZWFkeSBjbG9zaW5nLicpO1xyXG5cdFx0XHRyZWplY3QoJ0Nhbm5vdCBkaXNjb25uZWN0IGZyb20gc2VydmVyLiBTb2NrZXQgaXMgbm90IG9wZW5lZCBvciBjb25uZWN0aW9uIGlzIGFscmVhZHkgY2xvc2luZy4nKTtcclxuXHRcdH1cclxuXHR9KTtcclxufTtcclxuY2xpZW50LnByb3RvdHlwZS5vZmYgPSBjbGllbnQucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xyXG5cclxuLy8gRXhwb3NlIGV2ZXJ5dGhpbmcsIGZvciBicm93c2VyIGFuZCBOb2RlLi5cclxuaWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNsaWVudDtcclxufVxyXG5pZih0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xyXG5cdHdpbmRvdy50bWkgPSB7XHJcblx0XHRjbGllbnQsXHJcblx0XHRDbGllbnQ6IGNsaWVudFxyXG5cdH07XHJcbn1cclxuIiwiY29uc3QgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLy8gRW5hYmxlIGZvbGxvd2Vycy1vbmx5IG1vZGUgb24gYSBjaGFubmVsLi5cbmZ1bmN0aW9uIGZvbGxvd2Vyc29ubHkoY2hhbm5lbCwgbWludXRlcykge1xuXHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRtaW51dGVzID0gXy5nZXQobWludXRlcywgMzApO1xuXHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsIGAvZm9sbG93ZXJzICR7bWludXRlc31gLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VGb2xsb3dlcnMgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHR0aGlzLm9uY2UoJ19wcm9taXNlRm9sbG93ZXJzJywgZXJyID0+IHtcblx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwsIH5+bWludXRlcyBdKTsgfVxuXHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0fSk7XG5cdH0pO1xufVxuXG4vLyBEaXNhYmxlIGZvbGxvd2Vycy1vbmx5IG1vZGUgb24gYSBjaGFubmVsLi5cbmZ1bmN0aW9uIGZvbGxvd2Vyc29ubHlvZmYoY2hhbm5lbCkge1xuXHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvZm9sbG93ZXJzb2ZmJywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlRm9sbG93ZXJzb2ZmIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0dGhpcy5vbmNlKCdfcHJvbWlzZUZvbGxvd2Vyc29mZicsIGVyciA9PiB7XG5cdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHR9KTtcblx0fSk7XG59XG5cbi8vIExlYXZlIGEgY2hhbm5lbC4uXG5mdW5jdGlvbiBwYXJ0KGNoYW5uZWwpIHtcblx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBudWxsLCBgUEFSVCAke2NoYW5uZWx9YCwgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlUGFydCBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdHRoaXMub25jZSgnX3Byb21pc2VQYXJ0JywgZXJyID0+IHtcblx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwgXSk7IH1cblx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLy8gRW5hYmxlIFI5S0JldGEgbW9kZSBvbiBhIGNoYW5uZWwuLlxuZnVuY3Rpb24gcjlrYmV0YShjaGFubmVsKSB7XG5cdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgY2hhbm5lbCwgJy9yOWtiZXRhJywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlUjlrYmV0YSBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdHRoaXMub25jZSgnX3Byb21pc2VSOWtiZXRhJywgZXJyID0+IHtcblx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwgXSk7IH1cblx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLy8gRGlzYWJsZSBSOUtCZXRhIG1vZGUgb24gYSBjaGFubmVsLi5cbmZ1bmN0aW9uIHI5a2JldGFvZmYoY2hhbm5lbCkge1xuXHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvcjlrYmV0YW9mZicsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZVI5a2JldGFvZmYgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHR0aGlzLm9uY2UoJ19wcm9taXNlUjlrYmV0YW9mZicsIGVyciA9PiB7XG5cdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHR9KTtcblx0fSk7XG59XG5cbi8vIEVuYWJsZSBzbG93IG1vZGUgb24gYSBjaGFubmVsLi5cbmZ1bmN0aW9uIHNsb3coY2hhbm5lbCwgc2Vjb25kcykge1xuXHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRzZWNvbmRzID0gXy5nZXQoc2Vjb25kcywgMzAwKTtcblx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL3Nsb3cgJHtzZWNvbmRzfWAsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZVNsb3cgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHR0aGlzLm9uY2UoJ19wcm9taXNlU2xvdycsIGVyciA9PiB7XG5cdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsLCB+fnNlY29uZHMgXSk7IH1cblx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuLy8gRGlzYWJsZSBzbG93IG1vZGUgb24gYSBjaGFubmVsLi5cbmZ1bmN0aW9uIHNsb3dvZmYoY2hhbm5lbCkge1xuXHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvc2xvd29mZicsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZVNsb3dvZmYgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHR0aGlzLm9uY2UoJ19wcm9taXNlU2xvd29mZicsIGVyciA9PiB7XG5cdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHR9KTtcblx0fSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHQvLyBTZW5kIGFjdGlvbiBtZXNzYWdlICgvbWUgPG1lc3NhZ2U+KSBvbiBhIGNoYW5uZWwuLlxuXHRhY3Rpb24oY2hhbm5lbCwgbWVzc2FnZSkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0bWVzc2FnZSA9IGBcXHUwMDAxQUNUSU9OICR7bWVzc2FnZX1cXHUwMDAxYDtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZE1lc3NhZ2UodGhpcy5fZ2V0UHJvbWlzZURlbGF5KCksIGNoYW5uZWwsIG1lc3NhZ2UsIChyZXNvbHZlLCBfcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBBdCB0aGlzIHRpbWUsIHRoZXJlIGlzIG5vIHBvc3NpYmxlIHdheSB0byBkZXRlY3QgaWYgYSBtZXNzYWdlIGhhcyBiZWVuIHNlbnQgaGFzIGJlZW4gZWF0ZW5cblx0XHRcdC8vIGJ5IHRoZSBzZXJ2ZXIsIHNvIHdlIGNhbiBvbmx5IHJlc29sdmUgdGhlIFByb21pc2UuXG5cdFx0XHRyZXNvbHZlKFsgY2hhbm5lbCwgbWVzc2FnZSBdKTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBCYW4gdXNlcm5hbWUgb24gY2hhbm5lbC4uXG5cdGJhbihjaGFubmVsLCB1c2VybmFtZSwgcmVhc29uKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHR1c2VybmFtZSA9IF8udXNlcm5hbWUodXNlcm5hbWUpO1xuXHRcdHJlYXNvbiA9IF8uZ2V0KHJlYXNvbiwgJycpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL2JhbiAke3VzZXJuYW1lfSAke3JlYXNvbn1gLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZUJhbiBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZUJhbicsIGVyciA9PiB7XG5cdFx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwsIHVzZXJuYW1lLCByZWFzb24gXSk7IH1cblx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBDbGVhciBhbGwgbWVzc2FnZXMgb24gYSBjaGFubmVsLi5cblx0Y2xlYXIoY2hhbm5lbCkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvY2xlYXInLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZUNsZWFyIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlQ2xlYXInLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gQ2hhbmdlIHRoZSBjb2xvciBvZiB5b3VyIHVzZXJuYW1lLi5cblx0Y29sb3IoY2hhbm5lbCwgbmV3Q29sb3IpIHtcblx0XHRuZXdDb2xvciA9IF8uZ2V0KG5ld0NvbG9yLCBjaGFubmVsKTtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgJyN0bWlqcycsIGAvY29sb3IgJHtuZXdDb2xvcn1gLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZUNvbG9yIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlQ29sb3InLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBuZXdDb2xvciBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIFJ1biBjb21tZXJjaWFsIG9uIGEgY2hhbm5lbCBmb3IgWCBzZWNvbmRzLi5cblx0Y29tbWVyY2lhbChjaGFubmVsLCBzZWNvbmRzKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHRzZWNvbmRzID0gXy5nZXQoc2Vjb25kcywgMzApO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL2NvbW1lcmNpYWwgJHtzZWNvbmRzfWAsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlQ29tbWVyY2lhbCBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZUNvbW1lcmNpYWwnLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsLCB+fnNlY29uZHMgXSk7IH1cblx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0XG5cdC8vIERlbGV0ZSBhIHNwZWNpZmljIG1lc3NhZ2Ugb24gYSBjaGFubmVsXG5cdGRlbGV0ZW1lc3NhZ2UoY2hhbm5lbCwgbWVzc2FnZVVVSUQpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL2RlbGV0ZSAke21lc3NhZ2VVVUlEfWAsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlRGVsZXRlbWVzc2FnZSBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZURlbGV0ZW1lc3NhZ2UnLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gRW5hYmxlIGVtb3RlLW9ubHkgbW9kZSBvbiBhIGNoYW5uZWwuLlxuXHRlbW90ZW9ubHkoY2hhbm5lbCkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvZW1vdGVvbmx5JywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VFbW90ZW9ubHkgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHRcdHRoaXMub25jZSgnX3Byb21pc2VFbW90ZW9ubHknLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gRGlzYWJsZSBlbW90ZS1vbmx5IG1vZGUgb24gYSBjaGFubmVsLi5cblx0ZW1vdGVvbmx5b2ZmKGNoYW5uZWwpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCAnL2Vtb3Rlb25seW9mZicsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlRW1vdGVvbmx5b2ZmIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlRW1vdGVvbmx5b2ZmJywgZXJyID0+IHtcblx0XHRcdFx0aWYoIWVycikgeyByZXNvbHZlKFsgY2hhbm5lbCBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIEVuYWJsZSBmb2xsb3dlcnMtb25seSBtb2RlIG9uIGEgY2hhbm5lbC4uXG5cdGZvbGxvd2Vyc29ubHksXG5cblx0Ly8gQWxpYXMgZm9yIGZvbGxvd2Vyc29ubHkoKS4uXG5cdGZvbGxvd2Vyc21vZGU6IGZvbGxvd2Vyc29ubHksXG5cblx0Ly8gRGlzYWJsZSBmb2xsb3dlcnMtb25seSBtb2RlIG9uIGEgY2hhbm5lbC4uXG5cdGZvbGxvd2Vyc29ubHlvZmYsXG5cblx0Ly8gQWxpYXMgZm9yIGZvbGxvd2Vyc29ubHlvZmYoKS4uXG5cdGZvbGxvd2Vyc21vZGVvZmY6IGZvbGxvd2Vyc29ubHlvZmYsXG5cblx0Ly8gSG9zdCBhIGNoYW5uZWwuLlxuXHRob3N0KGNoYW5uZWwsIHRhcmdldCkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0dGFyZ2V0ID0gXy51c2VybmFtZSh0YXJnZXQpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZCgyMDAwLCBjaGFubmVsLCBgL2hvc3QgJHt0YXJnZXR9YCwgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VIb3N0IGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlSG9zdCcsIChlcnIsIHJlbWFpbmluZykgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsLCB0YXJnZXQsIH5+cmVtYWluaW5nIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gSm9pbiBhIGNoYW5uZWwuLlxuXHRqb2luKGNoYW5uZWwpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciAuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZCh1bmRlZmluZWQsIG51bGwsIGBKT0lOICR7Y2hhbm5lbH1gLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRjb25zdCBldmVudE5hbWUgPSAnX3Byb21pc2VKb2luJztcblx0XHRcdGxldCBoYXNGdWxmaWxsZWQgPSBmYWxzZTtcblx0XHRcdGNvbnN0IGxpc3RlbmVyID0gKGVyciwgam9pbmVkQ2hhbm5lbCkgPT4ge1xuXHRcdFx0XHRpZihjaGFubmVsID09PSBfLmNoYW5uZWwoam9pbmVkQ2hhbm5lbCkpIHtcblx0XHRcdFx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZUpvaW4gZXZlbnQgZm9yIHRoZSB0YXJnZXQgY2hhbm5lbCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0XHRcdHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lcik7XG5cdFx0XHRcdFx0aGFzRnVsZmlsbGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR0aGlzLm9uKGV2ZW50TmFtZSwgbGlzdGVuZXIpO1xuXHRcdFx0Ly8gUmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdFx0Y29uc3QgZGVsYXkgPSB0aGlzLl9nZXRQcm9taXNlRGVsYXkoKTtcblx0XHRcdF8ucHJvbWlzZURlbGF5KGRlbGF5KS50aGVuKCgpID0+IHtcblx0XHRcdFx0aWYoIWhhc0Z1bGZpbGxlZCkge1xuXHRcdFx0XHRcdHRoaXMuZW1pdChldmVudE5hbWUsICdObyByZXNwb25zZSBmcm9tIFR3aXRjaC4nLCBjaGFubmVsKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gTW9kIHVzZXJuYW1lIG9uIGNoYW5uZWwuLlxuXHRtb2QoY2hhbm5lbCwgdXNlcm5hbWUpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdHVzZXJuYW1lID0gXy51c2VybmFtZSh1c2VybmFtZSk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsIGAvbW9kICR7dXNlcm5hbWV9YCwgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VNb2QgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHRcdHRoaXMub25jZSgnX3Byb21pc2VNb2QnLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsLCB1c2VybmFtZSBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIEdldCBsaXN0IG9mIG1vZHMgb24gYSBjaGFubmVsLi5cblx0bW9kcyhjaGFubmVsKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgY2hhbm5lbCwgJy9tb2RzJywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VNb2RzIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlTW9kcycsIChlcnIsIG1vZHMpID0+IHtcblx0XHRcdFx0aWYoIWVycikge1xuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgaW50ZXJuYWwgbGlzdCBvZiBtb2RlcmF0b3JzLi5cblx0XHRcdFx0XHRtb2RzLmZvckVhY2godXNlcm5hbWUgPT4ge1xuXHRcdFx0XHRcdFx0aWYoIXRoaXMubW9kZXJhdG9yc1tjaGFubmVsXSkgeyB0aGlzLm1vZGVyYXRvcnNbY2hhbm5lbF0gPSBbXTsgfVxuXHRcdFx0XHRcdFx0aWYoIXRoaXMubW9kZXJhdG9yc1tjaGFubmVsXS5pbmNsdWRlcyh1c2VybmFtZSkpIHsgdGhpcy5tb2RlcmF0b3JzW2NoYW5uZWxdLnB1c2godXNlcm5hbWUpOyB9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0cmVzb2x2ZShtb2RzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIExlYXZlIGEgY2hhbm5lbC4uXG5cdHBhcnQsXG5cblx0Ly8gQWxpYXMgZm9yIHBhcnQoKS4uXG5cdGxlYXZlOiBwYXJ0LFxuXG5cdC8vIFNlbmQgYSBwaW5nIHRvIHRoZSBzZXJ2ZXIuLlxuXHRwaW5nKCkge1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBudWxsLCAnUElORycsIChyZXNvbHZlLCBfcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBVcGRhdGUgdGhlIGludGVybmFsIHBpbmcgdGltZW91dCBjaGVjayBpbnRlcnZhbC4uXG5cdFx0XHR0aGlzLmxhdGVuY3kgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0dGhpcy5waW5nVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHRpZih0aGlzLndzICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0dGhpcy53YXNDbG9zZUNhbGxlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdHRoaXMubG9nLmVycm9yKCdQaW5nIHRpbWVvdXQuJyk7XG5cdFx0XHRcdFx0dGhpcy53cy5jbG9zZSgpO1xuXG5cdFx0XHRcdFx0Y2xlYXJJbnRlcnZhbCh0aGlzLnBpbmdMb29wKTtcblx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGhpcy5waW5nVGltZW91dCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIF8uZ2V0KHRoaXMub3B0cy5jb25uZWN0aW9uLnRpbWVvdXQsIDk5OTkpKTtcblxuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VQaW5nIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlUGluZycsIGxhdGVuY3kgPT4gcmVzb2x2ZShbIHBhcnNlRmxvYXQobGF0ZW5jeSkgXSkpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIEVuYWJsZSBSOUtCZXRhIG1vZGUgb24gYSBjaGFubmVsLi5cblx0cjlrYmV0YSxcblxuXHQvLyBBbGlhcyBmb3IgcjlrYmV0YSgpLi5cblx0cjlrbW9kZTogcjlrYmV0YSxcblxuXHQvLyBEaXNhYmxlIFI5S0JldGEgbW9kZSBvbiBhIGNoYW5uZWwuLlxuXHRyOWtiZXRhb2ZmLFxuXG5cdC8vIEFsaWFzIGZvciByOWtiZXRhb2ZmKCkuLlxuXHRyOWttb2Rlb2ZmOiByOWtiZXRhb2ZmLFxuXG5cdC8vIFNlbmQgYSByYXcgbWVzc2FnZSB0byB0aGUgc2VydmVyLi5cblx0cmF3KG1lc3NhZ2UpIHtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgbnVsbCwgbWVzc2FnZSwgKHJlc29sdmUsIF9yZWplY3QpID0+IHtcblx0XHRcdHJlc29sdmUoWyBtZXNzYWdlIF0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIFNlbmQgYSBtZXNzYWdlIG9uIGEgY2hhbm5lbC4uXG5cdHNheShjaGFubmVsLCBtZXNzYWdlKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblxuXHRcdGlmKChtZXNzYWdlLnN0YXJ0c1dpdGgoJy4nKSAmJiAhbWVzc2FnZS5zdGFydHNXaXRoKCcuLicpKSB8fCBtZXNzYWdlLnN0YXJ0c1dpdGgoJy8nKSB8fCBtZXNzYWdlLnN0YXJ0c1dpdGgoJ1xcXFwnKSkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIG1lc3NhZ2UgaXMgYW4gYWN0aW9uIG1lc3NhZ2UuLlxuXHRcdFx0aWYobWVzc2FnZS5zdWJzdHIoMSwgMykgPT09ICdtZSAnKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmFjdGlvbihjaGFubmVsLCBtZXNzYWdlLnN1YnN0cig0KSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0XHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBtZXNzYWdlLCAocmVzb2x2ZSwgX3JlamVjdCkgPT4ge1xuXHRcdFx0XHRcdC8vIEF0IHRoaXMgdGltZSwgdGhlcmUgaXMgbm8gcG9zc2libGUgd2F5IHRvIGRldGVjdCBpZiBhIG1lc3NhZ2UgaGFzIGJlZW4gc2VudCBoYXMgYmVlbiBlYXRlblxuXHRcdFx0XHRcdC8vIGJ5IHRoZSBzZXJ2ZXIsIHNvIHdlIGNhbiBvbmx5IHJlc29sdmUgdGhlIFByb21pc2UuXG5cdFx0XHRcdFx0cmVzb2x2ZShbIGNoYW5uZWwsIG1lc3NhZ2UgXSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZE1lc3NhZ2UodGhpcy5fZ2V0UHJvbWlzZURlbGF5KCksIGNoYW5uZWwsIG1lc3NhZ2UsIChyZXNvbHZlLCBfcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBBdCB0aGlzIHRpbWUsIHRoZXJlIGlzIG5vIHBvc3NpYmxlIHdheSB0byBkZXRlY3QgaWYgYSBtZXNzYWdlIGhhcyBiZWVuIHNlbnQgaGFzIGJlZW4gZWF0ZW5cblx0XHRcdC8vIGJ5IHRoZSBzZXJ2ZXIsIHNvIHdlIGNhbiBvbmx5IHJlc29sdmUgdGhlIFByb21pc2UuXG5cdFx0XHRyZXNvbHZlKFsgY2hhbm5lbCwgbWVzc2FnZSBdKTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBFbmFibGUgc2xvdyBtb2RlIG9uIGEgY2hhbm5lbC4uXG5cdHNsb3csXG5cblx0Ly8gQWxpYXMgZm9yIHNsb3coKS4uXG5cdHNsb3dtb2RlOiBzbG93LFxuXG5cdC8vIERpc2FibGUgc2xvdyBtb2RlIG9uIGEgY2hhbm5lbC4uXG5cdHNsb3dvZmYsXG5cblx0Ly8gQWxpYXMgZm9yIHNsb3dvZmYoKS4uXG5cdHNsb3dtb2Rlb2ZmOiBzbG93b2ZmLFxuXG5cdC8vIEVuYWJsZSBzdWJzY3JpYmVycyBtb2RlIG9uIGEgY2hhbm5lbC4uXG5cdHN1YnNjcmliZXJzKGNoYW5uZWwpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCAnL3N1YnNjcmliZXJzJywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VTdWJzY3JpYmVycyBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZVN1YnNjcmliZXJzJywgZXJyID0+IHtcblx0XHRcdFx0aWYoIWVycikgeyByZXNvbHZlKFsgY2hhbm5lbCBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIERpc2FibGUgc3Vic2NyaWJlcnMgbW9kZSBvbiBhIGNoYW5uZWwuLlxuXHRzdWJzY3JpYmVyc29mZihjaGFubmVsKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgY2hhbm5lbCwgJy9zdWJzY3JpYmVyc29mZicsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlU3Vic2NyaWJlcnNvZmYgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHRcdHRoaXMub25jZSgnX3Byb21pc2VTdWJzY3JpYmVyc29mZicsIGVyciA9PiB7XG5cdFx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwgXSk7IH1cblx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBUaW1lb3V0IHVzZXJuYW1lIG9uIGNoYW5uZWwgZm9yIFggc2Vjb25kcy4uXG5cdHRpbWVvdXQoY2hhbm5lbCwgdXNlcm5hbWUsIHNlY29uZHMsIHJlYXNvbikge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0dXNlcm5hbWUgPSBfLnVzZXJuYW1lKHVzZXJuYW1lKTtcblxuXHRcdGlmKHNlY29uZHMgIT09IG51bGwgJiYgIV8uaXNJbnRlZ2VyKHNlY29uZHMpKSB7XG5cdFx0XHRyZWFzb24gPSBzZWNvbmRzO1xuXHRcdFx0c2Vjb25kcyA9IDMwMDtcblx0XHR9XG5cblx0XHRzZWNvbmRzID0gXy5nZXQoc2Vjb25kcywgMzAwKTtcblx0XHRyZWFzb24gPSBfLmdldChyZWFzb24sICcnKTtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgY2hhbm5lbCwgYC90aW1lb3V0ICR7dXNlcm5hbWV9ICR7c2Vjb25kc30gJHtyZWFzb259YCwgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VUaW1lb3V0IGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlVGltZW91dCcsIGVyciA9PiB7XG5cdFx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwsIHVzZXJuYW1lLCB+fnNlY29uZHMsIHJlYXNvbiBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIFVuYmFuIHVzZXJuYW1lIG9uIGNoYW5uZWwuLlxuXHR1bmJhbihjaGFubmVsLCB1c2VybmFtZSkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0dXNlcm5hbWUgPSBfLnVzZXJuYW1lKHVzZXJuYW1lKTtcblx0XHQvLyBTZW5kIHRoZSBjb21tYW5kIHRvIHRoZSBzZXJ2ZXIgYW5kIHJhY2UgdGhlIFByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0XHRyZXR1cm4gdGhpcy5fc2VuZENvbW1hbmQobnVsbCwgY2hhbm5lbCwgYC91bmJhbiAke3VzZXJuYW1lfWAsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlVW5iYW4gZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHRcdHRoaXMub25jZSgnX3Byb21pc2VVbmJhbicsIGVyciA9PiB7XG5cdFx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZShbIGNoYW5uZWwsIHVzZXJuYW1lIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gRW5kIHRoZSBjdXJyZW50IGhvc3RpbmcuLlxuXHR1bmhvc3QoY2hhbm5lbCkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKDIwMDAsIGNoYW5uZWwsICcvdW5ob3N0JywgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VVbmhvc3QgZXZlbnQsIHJlc29sdmUgb3IgcmVqZWN0Li5cblx0XHRcdHRoaXMub25jZSgnX3Byb21pc2VVbmhvc3QnLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsIF0pOyB9XG5cdFx0XHRcdGVsc2UgeyByZWplY3QoZXJyKTsgfVxuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH0sXG5cblx0Ly8gVW5tb2QgdXNlcm5hbWUgb24gY2hhbm5lbC4uXG5cdHVubW9kKGNoYW5uZWwsIHVzZXJuYW1lKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHR1c2VybmFtZSA9IF8udXNlcm5hbWUodXNlcm5hbWUpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL3VubW9kICR7dXNlcm5hbWV9YCwgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Ly8gUmVjZWl2ZWQgX3Byb21pc2VVbm1vZCBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZVVubW9kJywgZXJyID0+IHtcblx0XHRcdFx0aWYoIWVycikgeyByZXNvbHZlKFsgY2hhbm5lbCwgdXNlcm5hbWUgXSk7IH1cblx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBVbnZpcCB1c2VybmFtZSBvbiBjaGFubmVsLi5cblx0dW52aXAoY2hhbm5lbCwgdXNlcm5hbWUpIHtcblx0XHRjaGFubmVsID0gXy5jaGFubmVsKGNoYW5uZWwpO1xuXHRcdHVzZXJuYW1lID0gXy51c2VybmFtZSh1c2VybmFtZSk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsIGAvdW52aXAgJHt1c2VybmFtZX1gLCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHQvLyBSZWNlaXZlZCBfcHJvbWlzZVVudmlwIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlVW52aXAnLCBlcnIgPT4ge1xuXHRcdFx0XHRpZighZXJyKSB7IHJlc29sdmUoWyBjaGFubmVsLCB1c2VybmFtZSBdKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIEFkZCB1c2VybmFtZSB0byBWSVAgbGlzdCBvbiBjaGFubmVsLi5cblx0dmlwKGNoYW5uZWwsIHVzZXJuYW1lKSB7XG5cdFx0Y2hhbm5lbCA9IF8uY2hhbm5lbChjaGFubmVsKTtcblx0XHR1c2VybmFtZSA9IF8udXNlcm5hbWUodXNlcm5hbWUpO1xuXHRcdC8vIFNlbmQgdGhlIGNvbW1hbmQgdG8gdGhlIHNlcnZlciBhbmQgcmFjZSB0aGUgUHJvbWlzZSBhZ2FpbnN0IGEgZGVsYXkuLlxuXHRcdHJldHVybiB0aGlzLl9zZW5kQ29tbWFuZChudWxsLCBjaGFubmVsLCBgL3ZpcCAke3VzZXJuYW1lfWAsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlVmlwIGV2ZW50LCByZXNvbHZlIG9yIHJlamVjdC4uXG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlVmlwJywgZXJyID0+IHtcblx0XHRcdFx0aWYoIWVycikgeyByZXNvbHZlKFsgY2hhbm5lbCwgdXNlcm5hbWUgXSk7IH1cblx0XHRcdFx0ZWxzZSB7IHJlamVjdChlcnIpOyB9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblxuXHQvLyBHZXQgbGlzdCBvZiBWSVBzIG9uIGEgY2hhbm5lbC4uXG5cdHZpcHMoY2hhbm5lbCkge1xuXHRcdGNoYW5uZWwgPSBfLmNoYW5uZWwoY2hhbm5lbCk7XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsIGNoYW5uZWwsICcvdmlwcycsIChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdC8vIFJlY2VpdmVkIF9wcm9taXNlVmlwcyBldmVudCwgcmVzb2x2ZSBvciByZWplY3QuLlxuXHRcdFx0dGhpcy5vbmNlKCdfcHJvbWlzZVZpcHMnLCAoZXJyLCB2aXBzKSA9PiB7XG5cdFx0XHRcdGlmKCFlcnIpIHsgcmVzb2x2ZSh2aXBzKTsgfVxuXHRcdFx0XHRlbHNlIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXG5cdC8vIFNlbmQgYW4gd2hpc3BlciBtZXNzYWdlIHRvIGEgdXNlci4uXG5cdHdoaXNwZXIodXNlcm5hbWUsIG1lc3NhZ2UpIHtcblx0XHR1c2VybmFtZSA9IF8udXNlcm5hbWUodXNlcm5hbWUpO1xuXG5cdFx0Ly8gVGhlIHNlcnZlciB3aWxsIG5vdCBzZW5kIGEgd2hpc3BlciB0byB0aGUgYWNjb3VudCB0aGF0IHNlbnQgaXQuXG5cdFx0aWYodXNlcm5hbWUgPT09IHRoaXMuZ2V0VXNlcm5hbWUoKSkge1xuXHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdDYW5ub3Qgc2VuZCBhIHdoaXNwZXIgdG8gdGhlIHNhbWUgYWNjb3VudC4nKTtcblx0XHR9XG5cdFx0Ly8gU2VuZCB0aGUgY29tbWFuZCB0byB0aGUgc2VydmVyIGFuZCByYWNlIHRoZSBQcm9taXNlIGFnYWluc3QgYSBkZWxheS4uXG5cdFx0cmV0dXJuIHRoaXMuX3NlbmRDb21tYW5kKG51bGwsICcjdG1panMnLCBgL3cgJHt1c2VybmFtZX0gJHttZXNzYWdlfWAsIChfcmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLm9uY2UoJ19wcm9taXNlV2hpc3BlcicsIGVyciA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHsgcmVqZWN0KGVycik7IH1cblx0XHRcdH0pO1xuXHRcdH0pLmNhdGNoKGVyciA9PiB7XG5cdFx0XHQvLyBFaXRoZXIgYW4gXCJhY3R1YWxcIiBlcnJvciBvY2N1cmVkIG9yIHRoZSB0aW1lb3V0IHRyaWdnZXJlZFxuXHRcdFx0Ly8gdGhlIGxhdHRlciBtZWFucyBubyBlcnJvcnMgaGF2ZSBvY2N1cmVkIGFuZCB3ZSBjYW4gcmVzb2x2ZVxuXHRcdFx0Ly8gZWxzZSBqdXN0IGVsZXZhdGUgdGhlIGVycm9yXG5cdFx0XHRpZihlcnIgJiYgdHlwZW9mIGVyciA9PT0gJ3N0cmluZycgJiYgZXJyLmluZGV4T2YoJ05vIHJlc3BvbnNlIGZyb20gVHdpdGNoLicpICE9PSAwKSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGZyb20gPSBfLmNoYW5uZWwodXNlcm5hbWUpO1xuXHRcdFx0Y29uc3QgdXNlcnN0YXRlID0gT2JqZWN0LmFzc2lnbih7XG5cdFx0XHRcdCdtZXNzYWdlLXR5cGUnOiAnd2hpc3BlcicsXG5cdFx0XHRcdCdtZXNzYWdlLWlkJzogbnVsbCxcblx0XHRcdFx0J3RocmVhZC1pZCc6IG51bGwsXG5cdFx0XHRcdHVzZXJuYW1lOiB0aGlzLmdldFVzZXJuYW1lKClcblx0XHRcdH0sIHRoaXMuZ2xvYmFsdXNlcnN0YXRlKTtcblxuXHRcdFx0Ly8gRW1pdCBmb3IgYm90aCwgd2hpc3BlciBhbmQgbWVzc2FnZS4uXG5cdFx0XHR0aGlzLmVtaXRzKFsgJ3doaXNwZXInLCAnbWVzc2FnZScgXSwgW1xuXHRcdFx0XHRbIGZyb20sIHVzZXJzdGF0ZSwgbWVzc2FnZSwgdHJ1ZSBdLFxuXHRcdFx0XHRbIGZyb20sIHVzZXJzdGF0ZSwgbWVzc2FnZSwgdHJ1ZSBdXG5cdFx0XHRdKTtcblx0XHRcdHJldHVybiBbIHVzZXJuYW1lLCBtZXNzYWdlIF07XG5cdFx0fSk7XG5cdH1cbn07XG4iLCIvKiBpc3RhbmJ1bCBpZ25vcmUgZmlsZSAqL1xuLyogZXNsaW50LWRpc2FibGUgKi9cbi8qXG4gKiBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuICogY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuICogXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4gKiBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4gKiBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbiAqIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4gKiBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4gKiBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gKiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4gKiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbiAqIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuICogT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuICogVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiovXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcblx0dGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuXHR0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcblx0aWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSkge1xuXHRcdHRocm93IFR5cGVFcnJvcihcIm4gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlclwiKTtcblx0fVxuXG5cdHRoaXMuX21heExpc3RlbmVycyA9IG47XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG5cdHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cblx0aWYgKCF0aGlzLl9ldmVudHMpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cblxuXHQvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG5cdGlmICh0eXBlID09PSBcImVycm9yXCIpIHtcblx0XHRpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fCAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcblx0XHRcdGVyID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0aWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHsgdGhyb3cgZXI7IH1cblx0XHRcdHRocm93IFR5cGVFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCBcXFwiZXJyb3JcXFwiIGV2ZW50LlwiKTtcblx0XHR9XG5cdH1cblxuXHRoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG5cdGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuXHRcdHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0Ly8gZmFzdCBjYXNlc1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHRoYW5kbGVyLmNhbGwodGhpcyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHRoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDM6XG5cdFx0XHRcdGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHQvLyBzbG93ZXJcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdFx0XHRoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuXHRcdH1cblx0fSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuXHRcdGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcblx0XHRsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgeyBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7IH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG5cdHZhciBtO1xuXG5cdGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpIHsgdGhyb3cgVHlwZUVycm9yKFwibGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpOyB9XG5cblx0aWYgKCF0aGlzLl9ldmVudHMpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cblxuXHQvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuXHQvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG5cdGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHtcblx0XHR0aGlzLmVtaXQoXCJuZXdMaXN0ZW5lclwiLCB0eXBlLCBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/IGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXHR9XG5cblx0Ly8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG5cdGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7IHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyOyB9XG5cdC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cblx0ZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSkgeyB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7IH1cblx0Ly8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG5cdGVsc2UgeyB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07IH1cblxuXHQvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuXHRpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuXHRcdGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuXHRcdFx0bSA9IHRoaXMuX21heExpc3RlbmVycztcblx0XHR9IGVsc2Uge1xuXHRcdFx0bSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuXHRcdH1cblxuXHRcdGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCIobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LlwiLCB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcblx0XHRcdC8vIE5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcblx0XHRcdGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdGNvbnNvbGUudHJhY2UoKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG4vLyBNb2RpZmllZCB0byBzdXBwb3J0IG11bHRpcGxlIGNhbGxzLi5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG5cdGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpIHsgdGhyb3cgVHlwZUVycm9yKFwibGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpOyB9XG5cblx0dmFyIGZpcmVkID0gZmFsc2U7XG5cblx0aWYgKHRoaXMuX2V2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSAmJiB0eXBlLmNoYXJBdCgwKSA9PT0gXCJfXCIpIHtcblx0XHR2YXIgY291bnQgPSAxO1xuXHRcdHZhciBzZWFyY2hGb3IgPSB0eXBlO1xuXG5cdFx0Zm9yICh2YXIgayBpbiB0aGlzLl9ldmVudHMpe1xuXHRcdFx0aWYgKHRoaXMuX2V2ZW50cy5oYXNPd25Qcm9wZXJ0eShrKSAmJiBrLnN0YXJ0c1dpdGgoc2VhcmNoRm9yKSkge1xuXHRcdFx0XHRjb3VudCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR0eXBlID0gdHlwZSArIGNvdW50O1xuXHR9XG5cblx0ZnVuY3Rpb24gZygpIHtcblx0XHRpZiAodHlwZS5jaGFyQXQoMCkgPT09IFwiX1wiICYmICFpc05hTih0eXBlLnN1YnN0cih0eXBlLmxlbmd0aCAtIDEpKSkge1xuXHRcdFx0dHlwZSA9IHR5cGUuc3Vic3RyaW5nKDAsIHR5cGUubGVuZ3RoIC0gMSk7XG5cdFx0fVxuXHRcdHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cblx0XHRpZiAoIWZpcmVkKSB7XG5cdFx0XHRmaXJlZCA9IHRydWU7XG5cdFx0XHRsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdH1cblx0fVxuXG5cdGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcblx0dGhpcy5vbih0eXBlLCBnKTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8vIEVtaXRzIGEgXCJyZW1vdmVMaXN0ZW5lclwiIGV2ZW50IGlmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZC4uXG4vLyBNb2RpZmllZCB0byBzdXBwb3J0IG11bHRpcGxlIGNhbGxzIGZyb20gLm9uY2UoKS4uXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcblx0dmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cblx0aWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSkgeyB0aHJvdyBUeXBlRXJyb3IoXCJsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb25cIik7IH1cblxuXHRpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKSB7IHJldHVybiB0aGlzOyB9XG5cblx0bGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblx0bGVuZ3RoID0gbGlzdC5sZW5ndGg7XG5cdHBvc2l0aW9uID0gLTE7XG5cdGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fCAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcblx0XHRkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG5cdFx0aWYgKHRoaXMuX2V2ZW50cy5oYXNPd25Qcm9wZXJ0eSh0eXBlICsgXCIyXCIpICYmIHR5cGUuY2hhckF0KDApID09PSBcIl9cIikge1xuXHRcdFx0dmFyIHNlYXJjaEZvciA9IHR5cGU7XG5cdFx0XHRmb3IgKHZhciBrIGluIHRoaXMuX2V2ZW50cyl7XG5cdFx0XHRcdGlmICh0aGlzLl9ldmVudHMuaGFzT3duUHJvcGVydHkoaykgJiYgay5zdGFydHNXaXRoKHNlYXJjaEZvcikpIHtcblx0XHRcdFx0XHRpZiAoIWlzTmFOKHBhcnNlSW50KGsuc3Vic3RyKGsubGVuZ3RoIC0gMSkpKSkge1xuXHRcdFx0XHRcdFx0dGhpcy5fZXZlbnRzW3R5cGUgKyBwYXJzZUludChrLnN1YnN0cihrLmxlbmd0aCAtIDEpIC0gMSldID0gdGhpcy5fZXZlbnRzW2tdO1xuXHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXMuX2V2ZW50c1trXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZXZlbnRzW3R5cGVdID0gdGhpcy5fZXZlbnRzW3R5cGUgKyBcIjFcIl07XG5cdFx0XHRkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGUgKyBcIjFcIl07XG5cdFx0fVxuXHRcdGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHsgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgdHlwZSwgbGlzdGVuZXIpOyB9XG5cdH1cblx0ZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcblx0XHRmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG5cdFx0XHRpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcblx0XHRcdFx0KGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG5cdFx0XHRcdHBvc2l0aW9uID0gaTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHBvc2l0aW9uIDwgMCkgeyByZXR1cm4gdGhpczsgfVxuXG5cdFx0aWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRsaXN0Lmxlbmd0aCA9IDA7XG5cdFx0XHRkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXHRcdH1cblx0XHRlbHNlIHsgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpOyB9XG5cblx0XHRpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7IHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIHR5cGUsIGxpc3RlbmVyKTsgfVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcblx0dmFyIGtleSwgbGlzdGVuZXJzO1xuXG5cdGlmICghdGhpcy5fZXZlbnRzKSB7IHJldHVybiB0aGlzOyB9XG5cblx0Ly8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuXHRpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9XG5cdFx0ZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKSB7IGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07IH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuXHRcdFx0aWYgKGtleSA9PT0gXCJyZW1vdmVMaXN0ZW5lclwiKSB7IGNvbnRpbnVlOyB9XG5cdFx0XHR0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuXHRcdH1cblx0XHR0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhcInJlbW92ZUxpc3RlbmVyXCIpO1xuXHRcdHRoaXMuX2V2ZW50cyA9IHt9O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0bGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG5cdGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHsgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpOyB9XG5cdGVsc2UgaWYgKGxpc3RlbmVycykgeyB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aCkgeyB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pOyB9IH1cblx0ZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuXHR2YXIgcmV0O1xuXHRpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKSB7IHJldCA9IFtdOyB9XG5cdGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSkgeyByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTsgfVxuXHRlbHNlIHsgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7IH1cblx0cmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcblx0aWYgKHRoaXMuX2V2ZW50cykge1xuXHRcdHZhciBldmxpc3RlbmVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG5cdFx0aWYgKGlzRnVuY3Rpb24oZXZsaXN0ZW5lcikpIHsgcmV0dXJuIDE7IH1cblx0XHRlbHNlIGlmIChldmxpc3RlbmVyKSB7IHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDsgfVxuXHR9XG5cdHJldHVybiAwO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG5cdHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuXHRyZXR1cm4gdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcblx0cmV0dXJuIHR5cGVvZiBhcmcgPT09IFwibnVtYmVyXCI7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuXHRyZXR1cm4gdHlwZW9mIGFyZyA9PT0gXCJvYmplY3RcIiAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuXHRyZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJjb25zdCBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5sZXQgY3VycmVudExldmVsID0gJ2luZm8nO1xuY29uc3QgbGV2ZWxzID0geyAndHJhY2UnOiAwLCAnZGVidWcnOiAxLCAnaW5mbyc6IDIsICd3YXJuJzogMywgJ2Vycm9yJzogNCwgJ2ZhdGFsJzogNSB9O1xuXG4vLyBMb2dnZXIgaW1wbGVtZW50YXRpb24uLlxuZnVuY3Rpb24gbG9nKGxldmVsKSB7XG5cdC8vIFJldHVybiBhIGNvbnNvbGUgbWVzc2FnZSBkZXBlbmRpbmcgb24gdGhlIGxvZ2dpbmcgbGV2ZWwuLlxuXHRyZXR1cm4gZnVuY3Rpb24obWVzc2FnZSkge1xuXHRcdGlmKGxldmVsc1tsZXZlbF0gPj0gbGV2ZWxzW2N1cnJlbnRMZXZlbF0pIHtcblx0XHRcdGNvbnNvbGUubG9nKGBbJHtfLmZvcm1hdERhdGUobmV3IERhdGUoKSl9XSAke2xldmVsfTogJHttZXNzYWdlfWApO1xuXHRcdH1cblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdC8vIENoYW5nZSB0aGUgY3VycmVudCBsb2dnaW5nIGxldmVsLi5cblx0c2V0TGV2ZWwobGV2ZWwpIHtcblx0XHRjdXJyZW50TGV2ZWwgPSBsZXZlbDtcblx0fSxcblx0dHJhY2U6IGxvZygndHJhY2UnKSxcblx0ZGVidWc6IGxvZygnZGVidWcnKSxcblx0aW5mbzogbG9nKCdpbmZvJyksXG5cdHdhcm46IGxvZygnd2FybicpLFxuXHRlcnJvcjogbG9nKCdlcnJvcicpLFxuXHRmYXRhbDogbG9nKCdmYXRhbCcpXG59O1xuIiwiLypcclxuXHRDb3B5cmlnaHQgKGMpIDIwMTMtMjAxNSwgRmlvbm4gS2VsbGVoZXIgQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuXHJcblx0UmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0IG1vZGlmaWNhdGlvbixcclxuXHRhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XHJcblxyXG5cdFx0UmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLFxyXG5cdFx0dGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cclxuXHJcblx0XHRSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UsXHJcblx0XHR0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZSBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHNcclxuXHRcdHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cclxuXHJcblx0VEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCIgQU5EXHJcblx0QU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFIElNUExJRURcclxuXHRXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFIERJU0NMQUlNRUQuXHJcblx0SU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVCBIT0xERVIgT1IgQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCxcclxuXHRJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcclxuXHQoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7IExPU1MgT0YgVVNFLCBEQVRBLFxyXG5cdE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLFxyXG5cdFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSlcclxuXHRBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0YgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWVxyXG5cdE9GIFNVQ0ggREFNQUdFLlxyXG4qL1xyXG5jb25zdCBfID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5jb25zdCBub25zcGFjZVJlZ2V4ID0gL1xcUysvZztcclxuXHJcbmZ1bmN0aW9uIHBhcnNlQ29tcGxleFRhZyh0YWdzLCB0YWdLZXksIHNwbEEgPSAnLCcsIHNwbEIgPSAnLycsIHNwbEMpIHtcclxuXHRjb25zdCByYXcgPSB0YWdzW3RhZ0tleV07XHJcblx0XHJcblx0aWYocmF3ID09PSB1bmRlZmluZWQpIHtcclxuXHRcdHJldHVybiB0YWdzO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgdGFnSXNTdHJpbmcgPSB0eXBlb2YgcmF3ID09PSAnc3RyaW5nJztcclxuXHR0YWdzW3RhZ0tleSArICctcmF3J10gPSB0YWdJc1N0cmluZyA/IHJhdyA6IG51bGw7XHJcblxyXG5cdGlmKHJhdyA9PT0gdHJ1ZSkge1xyXG5cdFx0dGFnc1t0YWdLZXldID0gbnVsbDtcclxuXHRcdHJldHVybiB0YWdzO1xyXG5cdH1cclxuXHJcblx0dGFnc1t0YWdLZXldID0ge307XHJcblxyXG5cdGlmKHRhZ0lzU3RyaW5nKSB7XHJcblx0XHRjb25zdCBzcGwgPSByYXcuc3BsaXQoc3BsQSk7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzcGwubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgcGFydHMgPSBzcGxbaV0uc3BsaXQoc3BsQik7XHJcblx0XHRcdGxldCB2YWwgPSBwYXJ0c1sxXTtcclxuXHRcdFx0aWYoc3BsQyAhPT0gdW5kZWZpbmVkICYmIHZhbCkge1xyXG5cdFx0XHRcdHZhbCA9IHZhbC5zcGxpdChzcGxDKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0YWdzW3RhZ0tleV1bcGFydHNbMF1dID0gdmFsIHx8IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiB0YWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHQvLyBQYXJzZSBUd2l0Y2ggYmFkZ2VzLi5cclxuXHRiYWRnZXM6IHRhZ3MgPT4gcGFyc2VDb21wbGV4VGFnKHRhZ3MsICdiYWRnZXMnKSxcclxuXHJcblx0Ly8gUGFyc2UgVHdpdGNoIGJhZGdlLWluZm8uLlxyXG5cdGJhZGdlSW5mbzogdGFncyA9PiBwYXJzZUNvbXBsZXhUYWcodGFncywgJ2JhZGdlLWluZm8nKSxcclxuXHJcblx0Ly8gUGFyc2UgVHdpdGNoIGVtb3Rlcy4uXHJcblx0ZW1vdGVzOiB0YWdzID0+IHBhcnNlQ29tcGxleFRhZyh0YWdzLCAnZW1vdGVzJywgJy8nLCAnOicsICcsJyksXHJcblxyXG5cdC8vIFBhcnNlIHJlZ2V4IGVtb3Rlcy4uXHJcblx0ZW1vdGVSZWdleChtc2csIGNvZGUsIGlkLCBvYmopIHtcclxuXHRcdG5vbnNwYWNlUmVnZXgubGFzdEluZGV4ID0gMDtcclxuXHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cCgnKFxcXFxifF58XFxcXHMpJyArIF8udW5lc2NhcGVIdG1sKGNvZGUpICsgJyhcXFxcYnwkfFxcXFxzKScpO1xyXG5cdFx0bGV0IG1hdGNoO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGVtb3RlIGNvZGUgbWF0Y2hlcyB1c2luZyBSZWdFeHAgYW5kIHB1c2ggaXQgdG8gdGhlIG9iamVjdC4uXHJcblx0XHR3aGlsZSAoKG1hdGNoID0gbm9uc3BhY2VSZWdleC5leGVjKG1zZykpICE9PSBudWxsKSB7XHJcblx0XHRcdGlmKHJlZ2V4LnRlc3QobWF0Y2hbMF0pKSB7XHJcblx0XHRcdFx0b2JqW2lkXSA9IG9ialtpZF0gfHwgW107XHJcblx0XHRcdFx0b2JqW2lkXS5wdXNoKFsgbWF0Y2guaW5kZXgsIG5vbnNwYWNlUmVnZXgubGFzdEluZGV4IC0gMSBdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdC8vIFBhcnNlIHN0cmluZyBlbW90ZXMuLlxyXG5cdGVtb3RlU3RyaW5nKG1zZywgY29kZSwgaWQsIG9iaikge1xyXG5cdFx0bm9uc3BhY2VSZWdleC5sYXN0SW5kZXggPSAwO1xyXG5cdFx0bGV0IG1hdGNoO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGVtb3RlIGNvZGUgbWF0Y2hlcyBhbmQgcHVzaCBpdCB0byB0aGUgb2JqZWN0Li5cclxuXHRcdHdoaWxlICgobWF0Y2ggPSBub25zcGFjZVJlZ2V4LmV4ZWMobXNnKSkgIT09IG51bGwpIHtcclxuXHRcdFx0aWYobWF0Y2hbMF0gPT09IF8udW5lc2NhcGVIdG1sKGNvZGUpKSB7XHJcblx0XHRcdFx0b2JqW2lkXSA9IG9ialtpZF0gfHwgW107XHJcblx0XHRcdFx0b2JqW2lkXS5wdXNoKFsgbWF0Y2guaW5kZXgsIG5vbnNwYWNlUmVnZXgubGFzdEluZGV4IC0gMSBdKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdC8vIFRyYW5zZm9ybSB0aGUgZW1vdGVzIG9iamVjdCB0byBhIHN0cmluZyB3aXRoIHRoZSBmb2xsb3dpbmcgZm9ybWF0Li5cclxuXHQvLyBlbW90ZV9pZDpmaXJzdF9pbmRleC1sYXN0X2luZGV4LGFub3RoZXJfZmlyc3QtYW5vdGhlcl9sYXN0L2Fub3RoZXJfZW1vdGVfaWQ6Zmlyc3RfaW5kZXgtbGFzdF9pbmRleFxyXG5cdHRyYW5zZm9ybUVtb3RlcyhlbW90ZXMpIHtcclxuXHRcdGxldCB0cmFuc2Zvcm1lZCA9ICcnO1xyXG5cclxuXHRcdE9iamVjdC5rZXlzKGVtb3RlcykuZm9yRWFjaChpZCA9PiB7XHJcblx0XHRcdHRyYW5zZm9ybWVkID0gYCR7dHJhbnNmb3JtZWQraWR9OmA7XHJcblx0XHRcdGVtb3Rlc1tpZF0uZm9yRWFjaChcclxuXHRcdFx0XHRpbmRleCA9PiB0cmFuc2Zvcm1lZCA9IGAke3RyYW5zZm9ybWVkK2luZGV4LmpvaW4oJy0nKX0sYFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0cmFuc2Zvcm1lZCA9IGAke3RyYW5zZm9ybWVkLnNsaWNlKDAsIC0xKX0vYDtcclxuXHRcdH0pO1xyXG5cdFx0cmV0dXJuIHRyYW5zZm9ybWVkLnNsaWNlKDAsIC0xKTtcclxuXHR9LFxyXG5cclxuXHRmb3JtVGFncyh0YWdzKSB7XHJcblx0XHRjb25zdCByZXN1bHQgPSBbXTtcclxuXHRcdGZvcihjb25zdCBrZXkgaW4gdGFncykge1xyXG5cdFx0XHRjb25zdCB2YWx1ZSA9IF8uZXNjYXBlSVJDKHRhZ3Nba2V5XSk7XHJcblx0XHRcdHJlc3VsdC5wdXNoKGAke2tleX09JHt2YWx1ZX1gKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBgQCR7cmVzdWx0LmpvaW4oJzsnKX1gO1xyXG5cdH0sXHJcblxyXG5cdC8vIFBhcnNlIFR3aXRjaCBtZXNzYWdlcy4uXHJcblx0bXNnKGRhdGEpIHtcclxuXHRcdGNvbnN0IG1lc3NhZ2UgPSB7XHJcblx0XHRcdHJhdzogZGF0YSxcclxuXHRcdFx0dGFnczoge30sXHJcblx0XHRcdHByZWZpeDogbnVsbCxcclxuXHRcdFx0Y29tbWFuZDogbnVsbCxcclxuXHRcdFx0cGFyYW1zOiBbXVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBQb3NpdGlvbiBhbmQgbmV4dHNwYWNlIGFyZSB1c2VkIGJ5IHRoZSBwYXJzZXIgYXMgYSByZWZlcmVuY2UuLlxyXG5cdFx0bGV0IHBvc2l0aW9uID0gMDtcclxuXHRcdGxldCBuZXh0c3BhY2UgPSAwO1xyXG5cclxuXHRcdC8vIFRoZSBmaXJzdCB0aGluZyB3ZSBjaGVjayBmb3IgaXMgSVJDdjMuMiBtZXNzYWdlIHRhZ3MuXHJcblx0XHQvLyBodHRwOi8vaXJjdjMuYXRoZW1lLm9yZy9zcGVjaWZpY2F0aW9uL21lc3NhZ2UtdGFncy0zLjJcclxuXHRcdGlmKGRhdGEuY2hhckNvZGVBdCgwKSA9PT0gNjQpIHtcclxuXHRcdFx0bmV4dHNwYWNlID0gZGF0YS5pbmRleE9mKCcgJyk7XHJcblxyXG5cdFx0XHQvLyBNYWxmb3JtZWQgSVJDIG1lc3NhZ2UuLlxyXG5cdFx0XHRpZihuZXh0c3BhY2UgPT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRhZ3MgYXJlIHNwbGl0IGJ5IGEgc2VtaSBjb2xvbi4uXHJcblx0XHRcdGNvbnN0IHJhd1RhZ3MgPSBkYXRhLnNsaWNlKDEsIG5leHRzcGFjZSkuc3BsaXQoJzsnKTtcclxuXHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcmF3VGFncy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdC8vIFRhZ3MgZGVsaW1pdGVkIGJ5IGFuIGVxdWFscyBzaWduIGFyZSBrZXk9dmFsdWUgdGFncy5cclxuXHRcdFx0XHQvLyBJZiB0aGVyZSdzIG5vIGVxdWFscywgd2UgYXNzaWduIHRoZSB0YWcgYSB2YWx1ZSBvZiB0cnVlLlxyXG5cdFx0XHRcdGNvbnN0IHRhZyA9IHJhd1RhZ3NbaV07XHJcblx0XHRcdFx0Y29uc3QgcGFpciA9IHRhZy5zcGxpdCgnPScpO1xyXG5cdFx0XHRcdG1lc3NhZ2UudGFnc1twYWlyWzBdXSA9IHRhZy5zdWJzdHJpbmcodGFnLmluZGV4T2YoJz0nKSArIDEpIHx8IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHBvc2l0aW9uID0gbmV4dHNwYWNlICsgMTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTa2lwIGFueSB0cmFpbGluZyB3aGl0ZXNwYWNlLi5cclxuXHRcdHdoaWxlIChkYXRhLmNoYXJDb2RlQXQocG9zaXRpb24pID09PSAzMikge1xyXG5cdFx0XHRwb3NpdGlvbisrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4dHJhY3QgdGhlIG1lc3NhZ2UncyBwcmVmaXggaWYgcHJlc2VudC4gUHJlZml4ZXMgYXJlIHByZXBlbmRlZCB3aXRoIGEgY29sb24uLlxyXG5cdFx0aWYoZGF0YS5jaGFyQ29kZUF0KHBvc2l0aW9uKSA9PT0gNTgpIHtcclxuXHRcdFx0bmV4dHNwYWNlID0gZGF0YS5pbmRleE9mKCcgJywgcG9zaXRpb24pO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlcmUncyBub3RoaW5nIGFmdGVyIHRoZSBwcmVmaXgsIGRlZW0gdGhpcyBtZXNzYWdlIHRvIGJlIG1hbGZvcm1lZC5cclxuXHRcdFx0aWYobmV4dHNwYWNlID09PSAtMSkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRtZXNzYWdlLnByZWZpeCA9IGRhdGEuc2xpY2UocG9zaXRpb24gKyAxLCBuZXh0c3BhY2UpO1xyXG5cdFx0XHRwb3NpdGlvbiA9IG5leHRzcGFjZSArIDE7XHJcblxyXG5cdFx0XHQvLyBTa2lwIGFueSB0cmFpbGluZyB3aGl0ZXNwYWNlLi5cclxuXHRcdFx0d2hpbGUgKGRhdGEuY2hhckNvZGVBdChwb3NpdGlvbikgPT09IDMyKSB7XHJcblx0XHRcdFx0cG9zaXRpb24rKztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdG5leHRzcGFjZSA9IGRhdGEuaW5kZXhPZignICcsIHBvc2l0aW9uKTtcclxuXHJcblx0XHQvLyBJZiB0aGVyZSdzIG5vIG1vcmUgd2hpdGVzcGFjZSBsZWZ0LCBleHRyYWN0IGV2ZXJ5dGhpbmcgZnJvbSB0aGVcclxuXHRcdC8vIGN1cnJlbnQgcG9zaXRpb24gdG8gdGhlIGVuZCBvZiB0aGUgc3RyaW5nIGFzIHRoZSBjb21tYW5kLi5cclxuXHRcdGlmKG5leHRzcGFjZSA9PT0gLTEpIHtcclxuXHRcdFx0aWYoZGF0YS5sZW5ndGggPiBwb3NpdGlvbikge1xyXG5cdFx0XHRcdG1lc3NhZ2UuY29tbWFuZCA9IGRhdGEuc2xpY2UocG9zaXRpb24pO1xyXG5cdFx0XHRcdHJldHVybiBtZXNzYWdlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVsc2UsIHRoZSBjb21tYW5kIGlzIHRoZSBjdXJyZW50IHBvc2l0aW9uIHVwIHRvIHRoZSBuZXh0IHNwYWNlLiBBZnRlclxyXG5cdFx0Ly8gdGhhdCwgd2UgZXhwZWN0IHNvbWUgcGFyYW1ldGVycy5cclxuXHRcdG1lc3NhZ2UuY29tbWFuZCA9IGRhdGEuc2xpY2UocG9zaXRpb24sIG5leHRzcGFjZSk7XHJcblxyXG5cdFx0cG9zaXRpb24gPSBuZXh0c3BhY2UgKyAxO1xyXG5cclxuXHRcdC8vIFNraXAgYW55IHRyYWlsaW5nIHdoaXRlc3BhY2UuLlxyXG5cdFx0d2hpbGUgKGRhdGEuY2hhckNvZGVBdChwb3NpdGlvbikgPT09IDMyKSB7XHJcblx0XHRcdHBvc2l0aW9uKys7XHJcblx0XHR9XHJcblxyXG5cdFx0d2hpbGUgKHBvc2l0aW9uIDwgZGF0YS5sZW5ndGgpIHtcclxuXHRcdFx0bmV4dHNwYWNlID0gZGF0YS5pbmRleE9mKCcgJywgcG9zaXRpb24pO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbG9uLCB3ZSd2ZSBnb3QgYSB0cmFpbGluZyBwYXJhbWV0ZXIuXHJcblx0XHRcdC8vIEF0IHRoaXMgcG9pbnQsIHRoZXJlIGFyZSBubyBleHRyYSBwYXJhbXMsIHNvIHdlIHB1c2ggZXZlcnl0aGluZ1xyXG5cdFx0XHQvLyBmcm9tIGFmdGVyIHRoZSBjb2xvbiB0byB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHRvIHRoZSBwYXJhbXMgYXJyYXlcclxuXHRcdFx0Ly8gYW5kIGJyZWFrIG91dCBvZiB0aGUgbG9vcC5cclxuXHRcdFx0aWYoZGF0YS5jaGFyQ29kZUF0KHBvc2l0aW9uKSA9PT0gNTgpIHtcclxuXHRcdFx0XHRtZXNzYWdlLnBhcmFtcy5wdXNoKGRhdGEuc2xpY2UocG9zaXRpb24gKyAxKSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHdlIHN0aWxsIGhhdmUgc29tZSB3aGl0ZXNwYWNlLi4uXHJcblx0XHRcdGlmKG5leHRzcGFjZSAhPT0gLTEpIHtcclxuXHRcdFx0XHQvLyBQdXNoIHdoYXRldmVyJ3MgYmV0d2VlbiB0aGUgY3VycmVudCBwb3NpdGlvbiBhbmQgdGhlIG5leHRcclxuXHRcdFx0XHQvLyBzcGFjZSB0byB0aGUgcGFyYW1zIGFycmF5LlxyXG5cdFx0XHRcdG1lc3NhZ2UucGFyYW1zLnB1c2goZGF0YS5zbGljZShwb3NpdGlvbiwgbmV4dHNwYWNlKSk7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBuZXh0c3BhY2UgKyAxO1xyXG5cclxuXHRcdFx0XHQvLyBTa2lwIGFueSB0cmFpbGluZyB3aGl0ZXNwYWNlIGFuZCBjb250aW51ZSBsb29waW5nLlxyXG5cdFx0XHRcdHdoaWxlIChkYXRhLmNoYXJDb2RlQXQocG9zaXRpb24pID09PSAzMikge1xyXG5cdFx0XHRcdFx0cG9zaXRpb24rKztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBJZiB3ZSBkb24ndCBoYXZlIGFueSBtb3JlIHdoaXRlc3BhY2UgYW5kIHRoZSBwYXJhbSBpc24ndCB0cmFpbGluZyxcclxuXHRcdFx0Ly8gcHVzaCBldmVyeXRoaW5nIHJlbWFpbmluZyB0byB0aGUgcGFyYW1zIGFycmF5LlxyXG5cdFx0XHRpZihuZXh0c3BhY2UgPT09IC0xKSB7XHJcblx0XHRcdFx0bWVzc2FnZS5wYXJhbXMucHVzaChkYXRhLnNsaWNlKHBvc2l0aW9uKSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBtZXNzYWdlO1xyXG5cdH1cclxufTtcclxuIiwiLy8gSW5pdGlhbGl6ZSB0aGUgcXVldWUgd2l0aCBhIHNwZWNpZmljIGRlbGF5Li5cbmNsYXNzIFF1ZXVlIHtcblx0Y29uc3RydWN0b3IoZGVmYXVsdERlbGF5KSB7XG5cdFx0dGhpcy5xdWV1ZSA9IFtdO1xuXHRcdHRoaXMuaW5kZXggPSAwO1xuXHRcdHRoaXMuZGVmYXVsdERlbGF5ID0gZGVmYXVsdERlbGF5ID09PSB1bmRlZmluZWQgPyAzMDAwIDogZGVmYXVsdERlbGF5O1xuXHR9XG5cdC8vIEFkZCBhIG5ldyBmdW5jdGlvbiB0byB0aGUgcXVldWUuLlxuXHRhZGQoZm4sIGRlbGF5KSB7XG5cdFx0dGhpcy5xdWV1ZS5wdXNoKHsgZm4sIGRlbGF5IH0pO1xuXHR9XG5cdC8vIEdvIHRvIHRoZSBuZXh0IGluIHF1ZXVlLi5cblx0bmV4dCgpIHtcblx0XHRjb25zdCBpID0gdGhpcy5pbmRleCsrO1xuXHRcdGNvbnN0IGF0ID0gdGhpcy5xdWV1ZVtpXTtcblx0XHRpZighYXQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Y29uc3QgbmV4dCA9IHRoaXMucXVldWVbdGhpcy5pbmRleF07XG5cdFx0YXQuZm4oKTtcblx0XHRpZihuZXh0KSB7XG5cdFx0XHRjb25zdCBkZWxheSA9IG5leHQuZGVsYXkgPT09IHVuZGVmaW5lZCA/IHRoaXMuZGVmYXVsdERlbGF5IDogbmV4dC5kZWxheTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5uZXh0KCksIGRlbGF5KTtcblx0XHR9XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBRdWV1ZTtcbiIsIi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250cm9sLXJlZ2V4XG5jb25zdCBhY3Rpb25NZXNzYWdlUmVnZXggPSAvXlxcdTAwMDFBQ1RJT04gKFteXFx1MDAwMV0rKVxcdTAwMDEkLztcbmNvbnN0IGp1c3RpbkZhblJlZ2V4ID0gL14oanVzdGluZmFuKShcXGQrJCkvO1xuY29uc3QgdW5lc2NhcGVJUkNSZWdleCA9IC9cXFxcKFtzbjpyXFxcXF0pL2c7XG5jb25zdCBlc2NhcGVJUkNSZWdleCA9IC8oWyBcXG47XFxyXFxcXF0pL2c7XG5jb25zdCBpcmNFc2NhcGVkQ2hhcnMgPSB7IHM6ICcgJywgbjogJycsICc6JzogJzsnLCByOiAnJyB9O1xuY29uc3QgaXJjVW5lc2NhcGVkQ2hhcnMgPSB7ICcgJzogJ3MnLCAnXFxuJzogJ24nLCAnOyc6ICc6JywgJ1xccic6ICdyJyB9O1xuY29uc3QgdXJsUmVnZXggPSBuZXcgUmVnRXhwKCdeKD86KD86aHR0cHM/fGZ0cCk6Ly8pKD86XFxcXFMrKD86OlxcXFxTKik/QCk/KD86KD8hKD86MTB8MTI3KSg/OlxcXFwuXFxcXGR7MSwzfSl7M30pKD8hKD86MTY5XFxcXC4yNTR8MTkyXFxcXC4xNjgpKD86XFxcXC5cXFxcZHsxLDN9KXsyfSkoPyExNzJcXFxcLig/OjFbNi05XXwyXFxcXGR8M1swLTFdKSg/OlxcXFwuXFxcXGR7MSwzfSl7Mn0pKD86WzEtOV1cXFxcZD98MVxcXFxkXFxcXGR8MlswMV1cXFxcZHwyMlswLTNdKSg/OlxcXFwuKD86MT9cXFxcZHsxLDJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pKXsyfSg/OlxcXFwuKD86WzEtOV1cXFxcZD98MVxcXFxkXFxcXGR8MlswLTRdXFxcXGR8MjVbMC00XSkpfCg/Oig/OlthLXpcXFxcdTAwYTEtXFxcXHVmZmZmMC05XS0qKSpbYS16XFxcXHUwMGExLVxcXFx1ZmZmZjAtOV0rKSg/OlxcXFwuKD86W2EtelxcXFx1MDBhMS1cXFxcdWZmZmYwLTldLSopKlthLXpcXFxcdTAwYTEtXFxcXHVmZmZmMC05XSspKig/OlxcXFwuKD86W2EtelxcXFx1MDBhMS1cXFxcdWZmZmZdezIsfSkpXFxcXC4/KSg/OjpcXFxcZHsyLDV9KT8oPzpbLz8jXVxcXFxTKik/JCcsICdpJyk7XG5jb25zdCByZWdleEVtb3RlUmVnZXggPSAvW3xcXFxcXiQqKz86I10vO1xuY29uc3QgXyA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHQvLyBSZXR1cm4gdGhlIHNlY29uZCB2YWx1ZSBpZiB0aGUgZmlyc3QgdmFsdWUgaXMgdW5kZWZpbmVkLi5cblx0Z2V0OiAoYSwgYikgPT4gdHlwZW9mIGEgPT09ICd1bmRlZmluZWQnID8gYiA6IGEsXG5cblx0Ly8gSW5kaXJlY3RseSB1c2UgaGFzT3duUHJvcGVydHlcblx0aGFzT3duOiAob2JqLCBrZXkpID0+ICh7fSkuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSksXG5cblx0Ly8gUmFjZSBhIHByb21pc2UgYWdhaW5zdCBhIGRlbGF5Li5cblx0cHJvbWlzZURlbGF5OiB0aW1lID0+IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCB0aW1lKSksXG5cblx0Ly8gVmFsdWUgaXMgYSBmaW5pdGUgbnVtYmVyLi5cblx0aXNGaW5pdGU6IGludCA9PiBpc0Zpbml0ZShpbnQpICYmICFpc05hTihwYXJzZUZsb2F0KGludCkpLFxuXG5cdC8vIFBhcnNlIHN0cmluZyB0byBudW1iZXIuIFJldHVybnMgTmFOIGlmIHN0cmluZyBjYW4ndCBiZSBwYXJzZWQgdG8gbnVtYmVyLi5cblx0dG9OdW1iZXIobnVtLCBwcmVjaXNpb24pIHtcblx0XHRpZihudW0gPT09IG51bGwpIHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRjb25zdCBmYWN0b3IgPSBNYXRoLnBvdygxMCwgXy5pc0Zpbml0ZShwcmVjaXNpb24pID8gcHJlY2lzaW9uIDogMCk7XG5cdFx0cmV0dXJuIE1hdGgucm91bmQobnVtICogZmFjdG9yKSAvIGZhY3Rvcjtcblx0fSxcblxuXHQvLyBWYWx1ZSBpcyBhbiBpbnRlZ2VyLi5cblx0aXNJbnRlZ2VyOiBpbnQgPT4gIWlzTmFOKF8udG9OdW1iZXIoaW50LCAwKSksXG5cblx0Ly8gVmFsdWUgaXMgYSByZWdleC4uXG5cdGlzUmVnZXg6IHN0ciA9PiByZWdleEVtb3RlUmVnZXgudGVzdChzdHIpLFxuXG5cdC8vIFZhbHVlIGlzIGEgdmFsaWQgdXJsLi5cblx0aXNVUkw6IHN0ciA9PiB1cmxSZWdleC50ZXN0KHN0ciksXG5cblx0Ly8gUmV0dXJuIGEgcmFuZG9tIGp1c3RpbmZhbiB1c2VybmFtZS4uXG5cdGp1c3RpbmZhbjogKCkgPT4gYGp1c3RpbmZhbiR7TWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIDgwMDAwKSArIDEwMDApfWAsXG5cblx0Ly8gVXNlcm5hbWUgaXMgYSBqdXN0aW5mYW4gdXNlcm5hbWUuLlxuXHRpc0p1c3RpbmZhbjogdXNlcm5hbWUgPT4ganVzdGluRmFuUmVnZXgudGVzdCh1c2VybmFtZSksXG5cblx0Ly8gUmV0dXJuIGEgdmFsaWQgY2hhbm5lbCBuYW1lLi5cblx0Y2hhbm5lbChzdHIpIHtcblx0XHRjb25zdCBjaGFubmVsID0gKHN0ciA/IHN0ciA6ICcnKS50b0xvd2VyQ2FzZSgpO1xuXHRcdHJldHVybiBjaGFubmVsWzBdID09PSAnIycgPyBjaGFubmVsIDogJyMnICsgY2hhbm5lbDtcblx0fSxcblxuXHQvLyBSZXR1cm4gYSB2YWxpZCB1c2VybmFtZS4uXG5cdHVzZXJuYW1lKHN0cikge1xuXHRcdGNvbnN0IHVzZXJuYW1lID0gKHN0ciA/IHN0ciA6ICcnKS50b0xvd2VyQ2FzZSgpO1xuXHRcdHJldHVybiB1c2VybmFtZVswXSA9PT0gJyMnID8gdXNlcm5hbWUuc2xpY2UoMSkgOiB1c2VybmFtZTtcblx0fSxcblxuXHQvLyBSZXR1cm4gYSB2YWxpZCB0b2tlbi4uXG5cdHRva2VuOiBzdHIgPT4gc3RyID8gc3RyLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgnb2F1dGg6JywgJycpIDogJycsXG5cblx0Ly8gUmV0dXJuIGEgdmFsaWQgcGFzc3dvcmQuLlxuXHRwYXNzd29yZChzdHIpIHtcblx0XHRjb25zdCB0b2tlbiA9IF8udG9rZW4oc3RyKTtcblx0XHRyZXR1cm4gdG9rZW4gPyBgb2F1dGg6JHt0b2tlbn1gIDogJyc7XG5cdH0sXG5cblx0YWN0aW9uTWVzc2FnZTogbXNnID0+IG1zZy5tYXRjaChhY3Rpb25NZXNzYWdlUmVnZXgpLFxuXG5cdC8vIFJlcGxhY2UgYWxsIG9jY3VyZW5jZXMgb2YgYSBzdHJpbmcgdXNpbmcgYW4gb2JqZWN0Li5cblx0cmVwbGFjZUFsbChzdHIsIG9iaikge1xuXHRcdGlmKHN0ciA9PT0gbnVsbCB8fCB0eXBlb2Ygc3RyID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGZvciAoY29uc3QgeCBpbiBvYmopIHtcblx0XHRcdHN0ciA9IHN0ci5yZXBsYWNlKG5ldyBSZWdFeHAoeCwgJ2cnKSwgb2JqW3hdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHN0cjtcblx0fSxcblxuXHR1bmVzY2FwZUh0bWw6IHNhZmUgPT5cblx0XHRzYWZlLnJlcGxhY2UoL1xcXFwmYW1wXFxcXDsvZywgJyYnKVxuXHRcdC5yZXBsYWNlKC9cXFxcJmx0XFxcXDsvZywgJzwnKVxuXHRcdC5yZXBsYWNlKC9cXFxcJmd0XFxcXDsvZywgJz4nKVxuXHRcdC5yZXBsYWNlKC9cXFxcJnF1b3RcXFxcOy9nLCAnXCInKVxuXHRcdC5yZXBsYWNlKC9cXFxcJiMwMzlcXFxcOy9nLCAnXFwnJyksXG5cblx0Ly8gRXNjYXBpbmcgdmFsdWVzOlxuXHQvLyBodHRwOi8vaXJjdjMubmV0L3NwZWNzL2NvcmUvbWVzc2FnZS10YWdzLTMuMi5odG1sI2VzY2FwaW5nLXZhbHVlc1xuXHR1bmVzY2FwZUlSQyhtc2cpIHtcblx0XHRpZighbXNnIHx8IHR5cGVvZiBtc2cgIT09ICdzdHJpbmcnIHx8ICFtc2cuaW5jbHVkZXMoJ1xcXFwnKSkge1xuXHRcdFx0cmV0dXJuIG1zZztcblx0XHR9XG5cdFx0cmV0dXJuIG1zZy5yZXBsYWNlKFxuXHRcdFx0dW5lc2NhcGVJUkNSZWdleCxcblx0XHRcdChtLCBwKSA9PiBwIGluIGlyY0VzY2FwZWRDaGFycyA/IGlyY0VzY2FwZWRDaGFyc1twXSA6IHBcblx0XHQpO1xuXHR9LFxuXHRcblx0ZXNjYXBlSVJDKG1zZykge1xuXHRcdGlmKCFtc2cgfHwgdHlwZW9mIG1zZyAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiBtc2c7XG5cdFx0fVxuXHRcdHJldHVybiBtc2cucmVwbGFjZShcblx0XHRcdGVzY2FwZUlSQ1JlZ2V4LFxuXHRcdFx0KG0sIHApID0+IHAgaW4gaXJjVW5lc2NhcGVkQ2hhcnMgPyBgXFxcXCR7aXJjVW5lc2NhcGVkQ2hhcnNbcF19YCA6IHBcblx0XHQpO1xuXHR9LFxuXG5cdC8vIEFkZCB3b3JkIHRvIGEgc3RyaW5nLi5cblx0YWRkV29yZDogKGxpbmUsIHdvcmQpID0+IGxpbmUubGVuZ3RoID8gbGluZSArICcgJyArIHdvcmQgOiBsaW5lICsgd29yZCxcblxuXHQvLyBTcGxpdCBhIGxpbmUgYnV0IHRyeSBub3QgdG8gY3V0IGEgd29yZCBpbiBoYWxmLi5cblx0c3BsaXRMaW5lKGlucHV0LCBsZW5ndGgpIHtcblx0XHRsZXQgbGFzdFNwYWNlID0gaW5wdXQuc3Vic3RyaW5nKDAsIGxlbmd0aCkubGFzdEluZGV4T2YoJyAnKTtcblx0XHQvLyBObyBzcGFjZXMgZm91bmQsIHNwbGl0IGF0IHRoZSB2ZXJ5IGVuZCB0byBhdm9pZCBhIGxvb3AuLlxuXHRcdGlmKGxhc3RTcGFjZSA9PT0gLTEpIHtcblx0XHRcdGxhc3RTcGFjZSA9IGxlbmd0aCAtIDE7XG5cdFx0fVxuXHRcdHJldHVybiBbIGlucHV0LnN1YnN0cmluZygwLCBsYXN0U3BhY2UpLCBpbnB1dC5zdWJzdHJpbmcobGFzdFNwYWNlICsgMSkgXTtcblx0fSxcblxuXHQvLyBFeHRyYWN0IGEgbnVtYmVyIGZyb20gYSBzdHJpbmcuLlxuXHRleHRyYWN0TnVtYmVyKHN0cikge1xuXHRcdGNvbnN0IHBhcnRzID0gc3RyLnNwbGl0KCcgJyk7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYoXy5pc0ludGVnZXIocGFydHNbaV0pKSB7XG5cdFx0XHRcdHJldHVybiB+fnBhcnRzW2ldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gMDtcblx0fSxcblxuXHQvLyBGb3JtYXQgdGhlIGRhdGUuLlxuXHRmb3JtYXREYXRlKGRhdGUpIHtcblx0XHRsZXQgaG91cnMgPSBkYXRlLmdldEhvdXJzKCk7XG5cdFx0bGV0IG1pbnMgID0gZGF0ZS5nZXRNaW51dGVzKCk7XG5cblx0XHRob3VycyA9IChob3VycyA8IDEwID8gJzAnIDogJycpICsgaG91cnM7XG5cdFx0bWlucyA9IChtaW5zIDwgMTAgPyAnMCcgOiAnJykgKyBtaW5zO1xuXHRcdHJldHVybiBgJHtob3Vyc306JHttaW5zfWA7XG5cdH0sXG5cblx0Ly8gSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLi5cblx0aW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG5cdFx0Y3Rvci5zdXBlcl8gPSBzdXBlckN0b3I7XG5cdFx0Y29uc3QgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fTtcblx0XHRUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlO1xuXHRcdGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKCk7XG5cdFx0Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXHR9LFxuXG5cdC8vIFJldHVybiB3aGV0aGVyIGluc2lkZSBhIE5vZGUgYXBwbGljYXRpb24gb3Igbm90Li5cblx0aXNOb2RlKCkge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmXG5cdFx0XHRcdE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nO1xuXHRcdH0gY2F0Y2goZSkge31cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn07XG4iLCIvKiAoaWdub3JlZCkgKi8iLCIvKiAoaWdub3JlZCkgKi8iLCIvLyBBeGlvcyB2MS40LjAgQ29weXJpZ2h0IChjKSAyMDIzIE1hdHQgWmFicmlza2llIGFuZCBjb250cmlidXRvcnNcbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gYmluZChmbiwgdGhpc0FyZykge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcCgpIHtcbiAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuLy8gdXRpbHMgaXMgYSBsaWJyYXJ5IG9mIGdlbmVyaWMgaGVscGVyIGZ1bmN0aW9ucyBub24tc3BlY2lmaWMgdG8gYXhpb3NcblxuY29uc3Qge3RvU3RyaW5nfSA9IE9iamVjdC5wcm90b3R5cGU7XG5jb25zdCB7Z2V0UHJvdG90eXBlT2Z9ID0gT2JqZWN0O1xuXG5jb25zdCBraW5kT2YgPSAoY2FjaGUgPT4gdGhpbmcgPT4ge1xuICAgIGNvbnN0IHN0ciA9IHRvU3RyaW5nLmNhbGwodGhpbmcpO1xuICAgIHJldHVybiBjYWNoZVtzdHJdIHx8IChjYWNoZVtzdHJdID0gc3RyLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpKTtcbn0pKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG5jb25zdCBraW5kT2ZUZXN0ID0gKHR5cGUpID0+IHtcbiAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuICh0aGluZykgPT4ga2luZE9mKHRoaW5nKSA9PT0gdHlwZVxufTtcblxuY29uc3QgdHlwZU9mVGVzdCA9IHR5cGUgPT4gdGhpbmcgPT4gdHlwZW9mIHRoaW5nID09PSB0eXBlO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgdW5kZWZpbmVkXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNVbmRlZmluZWQgPSB0eXBlT2ZUZXN0KCd1bmRlZmluZWQnKTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0J1ZmZlcih2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiAhaXNVbmRlZmluZWQodmFsKSAmJiB2YWwuY29uc3RydWN0b3IgIT09IG51bGwgJiYgIWlzVW5kZWZpbmVkKHZhbC5jb25zdHJ1Y3RvcilcbiAgICAmJiBpc0Z1bmN0aW9uKHZhbC5jb25zdHJ1Y3Rvci5pc0J1ZmZlcikgJiYgdmFsLmNvbnN0cnVjdG9yLmlzQnVmZmVyKHZhbCk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNBcnJheUJ1ZmZlciA9IGtpbmRPZlRlc3QoJ0FycmF5QnVmZmVyJyk7XG5cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgdmlldyBvbiBhbiBBcnJheUJ1ZmZlciwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3KHZhbCkge1xuICBsZXQgcmVzdWx0O1xuICBpZiAoKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcpICYmIChBcnJheUJ1ZmZlci5pc1ZpZXcpKSB7XG4gICAgcmVzdWx0ID0gQXJyYXlCdWZmZXIuaXNWaWV3KHZhbCk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ID0gKHZhbCkgJiYgKHZhbC5idWZmZXIpICYmIChpc0FycmF5QnVmZmVyKHZhbC5idWZmZXIpKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyaW5nXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmluZywgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmNvbnN0IGlzU3RyaW5nID0gdHlwZU9mVGVzdCgnc3RyaW5nJyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGdW5jdGlvblxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNGdW5jdGlvbiA9IHR5cGVPZlRlc3QoJ2Z1bmN0aW9uJyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBOdW1iZXJcbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgTnVtYmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNOdW1iZXIgPSB0eXBlT2ZUZXN0KCdudW1iZXInKTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBPYmplY3RcbiAqXG4gKiBAcGFyYW0geyp9IHRoaW5nIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gT2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNPYmplY3QgPSAodGhpbmcpID0+IHRoaW5nICE9PSBudWxsICYmIHR5cGVvZiB0aGluZyA9PT0gJ29iamVjdCc7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBCb29sZWFuXG4gKlxuICogQHBhcmFtIHsqfSB0aGluZyBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBCb29sZWFuLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNCb29sZWFuID0gdGhpbmcgPT4gdGhpbmcgPT09IHRydWUgfHwgdGhpbmcgPT09IGZhbHNlO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgcGxhaW4gT2JqZWN0XG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIHBsYWluIE9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmNvbnN0IGlzUGxhaW5PYmplY3QgPSAodmFsKSA9PiB7XG4gIGlmIChraW5kT2YodmFsKSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBwcm90b3R5cGUgPSBnZXRQcm90b3R5cGVPZih2YWwpO1xuICByZXR1cm4gKHByb3RvdHlwZSA9PT0gbnVsbCB8fCBwcm90b3R5cGUgPT09IE9iamVjdC5wcm90b3R5cGUgfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvdHlwZSkgPT09IG51bGwpICYmICEoU3ltYm9sLnRvU3RyaW5nVGFnIGluIHZhbCkgJiYgIShTeW1ib2wuaXRlcmF0b3IgaW4gdmFsKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBEYXRlXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIERhdGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5jb25zdCBpc0RhdGUgPSBraW5kT2ZUZXN0KCdEYXRlJyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZpbGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5jb25zdCBpc0ZpbGUgPSBraW5kT2ZUZXN0KCdGaWxlJyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBCbG9iXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEJsb2IsIG90aGVyd2lzZSBmYWxzZVxuICovXG5jb25zdCBpc0Jsb2IgPSBraW5kT2ZUZXN0KCdCbG9iJyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBGaWxlTGlzdFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGaWxlLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNGaWxlTGlzdCA9IGtpbmRPZlRlc3QoJ0ZpbGVMaXN0Jyk7XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJlYW1cbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyZWFtLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNTdHJlYW0gPSAodmFsKSA9PiBpc09iamVjdCh2YWwpICYmIGlzRnVuY3Rpb24odmFsLnBpcGUpO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcbiAqXG4gKiBAcGFyYW0geyp9IHRoaW5nIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gRm9ybURhdGEsIG90aGVyd2lzZSBmYWxzZVxuICovXG5jb25zdCBpc0Zvcm1EYXRhID0gKHRoaW5nKSA9PiB7XG4gIGxldCBraW5kO1xuICByZXR1cm4gdGhpbmcgJiYgKFxuICAgICh0eXBlb2YgRm9ybURhdGEgPT09ICdmdW5jdGlvbicgJiYgdGhpbmcgaW5zdGFuY2VvZiBGb3JtRGF0YSkgfHwgKFxuICAgICAgaXNGdW5jdGlvbih0aGluZy5hcHBlbmQpICYmIChcbiAgICAgICAgKGtpbmQgPSBraW5kT2YodGhpbmcpKSA9PT0gJ2Zvcm1kYXRhJyB8fFxuICAgICAgICAvLyBkZXRlY3QgZm9ybS1kYXRhIGluc3RhbmNlXG4gICAgICAgIChraW5kID09PSAnb2JqZWN0JyAmJiBpc0Z1bmN0aW9uKHRoaW5nLnRvU3RyaW5nKSAmJiB0aGluZy50b1N0cmluZygpID09PSAnW29iamVjdCBGb3JtRGF0YV0nKVxuICAgICAgKVxuICAgIClcbiAgKVxufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3RcbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmNvbnN0IGlzVVJMU2VhcmNoUGFyYW1zID0ga2luZE9mVGVzdCgnVVJMU2VhcmNoUGFyYW1zJyk7XG5cbi8qKlxuICogVHJpbSBleGNlc3Mgd2hpdGVzcGFjZSBvZmYgdGhlIGJlZ2lubmluZyBhbmQgZW5kIG9mIGEgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgU3RyaW5nIHRvIHRyaW1cbiAqXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXG4gKi9cbmNvbnN0IHRyaW0gPSAoc3RyKSA9PiBzdHIudHJpbSA/XG4gIHN0ci50cmltKCkgOiBzdHIucmVwbGFjZSgvXltcXHNcXHVGRUZGXFx4QTBdK3xbXFxzXFx1RkVGRlxceEEwXSskL2csICcnKTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYW4gQXJyYXkgb3IgYW4gT2JqZWN0IGludm9raW5nIGEgZnVuY3Rpb24gZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiBgb2JqYCBpcyBhbiBBcnJheSBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGluZGV4LCBhbmQgY29tcGxldGUgYXJyYXkgZm9yIGVhY2ggaXRlbS5cbiAqXG4gKiBJZiAnb2JqJyBpcyBhbiBPYmplY3QgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBrZXksIGFuZCBjb21wbGV0ZSBvYmplY3QgZm9yIGVhY2ggcHJvcGVydHkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iaiBUaGUgb2JqZWN0IHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBjYWxsYmFjayB0byBpbnZva2UgZm9yIGVhY2ggaXRlbVxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW2FsbE93bktleXMgPSBmYWxzZV1cbiAqIEByZXR1cm5zIHthbnl9XG4gKi9cbmZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbiwge2FsbE93bktleXMgPSBmYWxzZX0gPSB7fSkge1xuICAvLyBEb24ndCBib3RoZXIgaWYgbm8gdmFsdWUgcHJvdmlkZWRcbiAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBpO1xuICBsZXQgbDtcblxuICAvLyBGb3JjZSBhbiBhcnJheSBpZiBub3QgYWxyZWFkeSBzb21ldGhpbmcgaXRlcmFibGVcbiAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKSB7XG4gICAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gICAgb2JqID0gW29ial07XG4gIH1cblxuICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFycmF5IHZhbHVlc1xuICAgIGZvciAoaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBmbi5jYWxsKG51bGwsIG9ialtpXSwgaSwgb2JqKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIG9iamVjdCBrZXlzXG4gICAgY29uc3Qga2V5cyA9IGFsbE93bktleXMgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopIDogT2JqZWN0LmtleXMob2JqKTtcbiAgICBjb25zdCBsZW4gPSBrZXlzLmxlbmd0aDtcbiAgICBsZXQga2V5O1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgZm4uY2FsbChudWxsLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kS2V5KG9iaiwga2V5KSB7XG4gIGtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgbGV0IGkgPSBrZXlzLmxlbmd0aDtcbiAgbGV0IF9rZXk7XG4gIHdoaWxlIChpLS0gPiAwKSB7XG4gICAgX2tleSA9IGtleXNbaV07XG4gICAgaWYgKGtleSA9PT0gX2tleS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICByZXR1cm4gX2tleTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNvbnN0IF9nbG9iYWwgPSAoKCkgPT4ge1xuICAvKmVzbGludCBuby11bmRlZjowKi9cbiAgaWYgKHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gZ2xvYmFsVGhpcztcbiAgcmV0dXJuIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGdsb2JhbClcbn0pKCk7XG5cbmNvbnN0IGlzQ29udGV4dERlZmluZWQgPSAoY29udGV4dCkgPT4gIWlzVW5kZWZpbmVkKGNvbnRleHQpICYmIGNvbnRleHQgIT09IF9nbG9iYWw7XG5cbi8qKlxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxuICogaW1tdXRhYmx5IG1lcmdlcyB0aGUgcHJvcGVydGllcyBvZiBlYWNoIG9iamVjdCBhbmQgcmV0dXJucyByZXN1bHQuXG4gKlxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cbiAqIHRoZSBhcmd1bWVudHMgbGlzdCB3aWxsIHRha2UgcHJlY2VkZW5jZS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XG4gKiBjb25zb2xlLmxvZyhyZXN1bHQuZm9vKTsgLy8gb3V0cHV0cyA0NTZcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmoxIE9iamVjdCB0byBtZXJnZVxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJlc3VsdCBvZiBhbGwgbWVyZ2UgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBtZXJnZSgvKiBvYmoxLCBvYmoyLCBvYmozLCAuLi4gKi8pIHtcbiAgY29uc3Qge2Nhc2VsZXNzfSA9IGlzQ29udGV4dERlZmluZWQodGhpcykgJiYgdGhpcyB8fCB7fTtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIGNvbnN0IGFzc2lnblZhbHVlID0gKHZhbCwga2V5KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0S2V5ID0gY2FzZWxlc3MgJiYgZmluZEtleShyZXN1bHQsIGtleSkgfHwga2V5O1xuICAgIGlmIChpc1BsYWluT2JqZWN0KHJlc3VsdFt0YXJnZXRLZXldKSAmJiBpc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgIHJlc3VsdFt0YXJnZXRLZXldID0gbWVyZ2UocmVzdWx0W3RhcmdldEtleV0sIHZhbCk7XG4gICAgfSBlbHNlIGlmIChpc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgIHJlc3VsdFt0YXJnZXRLZXldID0gbWVyZ2Uoe30sIHZhbCk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbCkpIHtcbiAgICAgIHJlc3VsdFt0YXJnZXRLZXldID0gdmFsLnNsaWNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFt0YXJnZXRLZXldID0gdmFsO1xuICAgIH1cbiAgfTtcblxuICBmb3IgKGxldCBpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBhcmd1bWVudHNbaV0gJiYgZm9yRWFjaChhcmd1bWVudHNbaV0sIGFzc2lnblZhbHVlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEV4dGVuZHMgb2JqZWN0IGEgYnkgbXV0YWJseSBhZGRpbmcgdG8gaXQgdGhlIHByb3BlcnRpZXMgb2Ygb2JqZWN0IGIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGEgVGhlIG9iamVjdCB0byBiZSBleHRlbmRlZFxuICogQHBhcmFtIHtPYmplY3R9IGIgVGhlIG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgZnJvbVxuICogQHBhcmFtIHtPYmplY3R9IHRoaXNBcmcgVGhlIG9iamVjdCB0byBiaW5kIGZ1bmN0aW9uIHRvXG4gKlxuICogQHBhcmFtIHtCb29sZWFufSBbYWxsT3duS2V5c11cbiAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSByZXN1bHRpbmcgdmFsdWUgb2Ygb2JqZWN0IGFcbiAqL1xuY29uc3QgZXh0ZW5kID0gKGEsIGIsIHRoaXNBcmcsIHthbGxPd25LZXlzfT0ge30pID0+IHtcbiAgZm9yRWFjaChiLCAodmFsLCBrZXkpID0+IHtcbiAgICBpZiAodGhpc0FyZyAmJiBpc0Z1bmN0aW9uKHZhbCkpIHtcbiAgICAgIGFba2V5XSA9IGJpbmQodmFsLCB0aGlzQXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYVtrZXldID0gdmFsO1xuICAgIH1cbiAgfSwge2FsbE93bktleXN9KTtcbiAgcmV0dXJuIGE7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBieXRlIG9yZGVyIG1hcmtlci4gVGhpcyBjYXRjaGVzIEVGIEJCIEJGICh0aGUgVVRGLTggQk9NKVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjb250ZW50IHdpdGggQk9NXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gY29udGVudCB2YWx1ZSB3aXRob3V0IEJPTVxuICovXG5jb25zdCBzdHJpcEJPTSA9IChjb250ZW50KSA9PiB7XG4gIGlmIChjb250ZW50LmNoYXJDb2RlQXQoMCkgPT09IDB4RkVGRikge1xuICAgIGNvbnRlbnQgPSBjb250ZW50LnNsaWNlKDEpO1xuICB9XG4gIHJldHVybiBjb250ZW50O1xufTtcblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gW3Byb3BzXVxuICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yc11cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuY29uc3QgaW5oZXJpdHMgPSAoY29uc3RydWN0b3IsIHN1cGVyQ29uc3RydWN0b3IsIHByb3BzLCBkZXNjcmlwdG9ycykgPT4ge1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gIGNvbnN0cnVjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29uc3RydWN0b3IsICdzdXBlcicsIHtcbiAgICB2YWx1ZTogc3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgfSk7XG4gIHByb3BzICYmIE9iamVjdC5hc3NpZ24oY29uc3RydWN0b3IucHJvdG90eXBlLCBwcm9wcyk7XG59O1xuXG4vKipcbiAqIFJlc29sdmUgb2JqZWN0IHdpdGggZGVlcCBwcm90b3R5cGUgY2hhaW4gdG8gYSBmbGF0IG9iamVjdFxuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZU9iaiBzb3VyY2Ugb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gW2Rlc3RPYmpdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufEJvb2xlYW59IFtmaWx0ZXJdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcHJvcEZpbHRlcl1cbiAqXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5jb25zdCB0b0ZsYXRPYmplY3QgPSAoc291cmNlT2JqLCBkZXN0T2JqLCBmaWx0ZXIsIHByb3BGaWx0ZXIpID0+IHtcbiAgbGV0IHByb3BzO1xuICBsZXQgaTtcbiAgbGV0IHByb3A7XG4gIGNvbnN0IG1lcmdlZCA9IHt9O1xuXG4gIGRlc3RPYmogPSBkZXN0T2JqIHx8IHt9O1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZXEtbnVsbCxlcWVxZXFcbiAgaWYgKHNvdXJjZU9iaiA9PSBudWxsKSByZXR1cm4gZGVzdE9iajtcblxuICBkbyB7XG4gICAgcHJvcHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2VPYmopO1xuICAgIGkgPSBwcm9wcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSA+IDApIHtcbiAgICAgIHByb3AgPSBwcm9wc1tpXTtcbiAgICAgIGlmICgoIXByb3BGaWx0ZXIgfHwgcHJvcEZpbHRlcihwcm9wLCBzb3VyY2VPYmosIGRlc3RPYmopKSAmJiAhbWVyZ2VkW3Byb3BdKSB7XG4gICAgICAgIGRlc3RPYmpbcHJvcF0gPSBzb3VyY2VPYmpbcHJvcF07XG4gICAgICAgIG1lcmdlZFtwcm9wXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvdXJjZU9iaiA9IGZpbHRlciAhPT0gZmFsc2UgJiYgZ2V0UHJvdG90eXBlT2Yoc291cmNlT2JqKTtcbiAgfSB3aGlsZSAoc291cmNlT2JqICYmICghZmlsdGVyIHx8IGZpbHRlcihzb3VyY2VPYmosIGRlc3RPYmopKSAmJiBzb3VyY2VPYmogIT09IE9iamVjdC5wcm90b3R5cGUpO1xuXG4gIHJldHVybiBkZXN0T2JqO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBzdHJpbmcgZW5kcyB3aXRoIHRoZSBjaGFyYWN0ZXJzIG9mIGEgc3BlY2lmaWVkIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hTdHJpbmdcbiAqIEBwYXJhbSB7TnVtYmVyfSBbcG9zaXRpb249IDBdXG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmNvbnN0IGVuZHNXaXRoID0gKHN0ciwgc2VhcmNoU3RyaW5nLCBwb3NpdGlvbikgPT4ge1xuICBzdHIgPSBTdHJpbmcoc3RyKTtcbiAgaWYgKHBvc2l0aW9uID09PSB1bmRlZmluZWQgfHwgcG9zaXRpb24gPiBzdHIubGVuZ3RoKSB7XG4gICAgcG9zaXRpb24gPSBzdHIubGVuZ3RoO1xuICB9XG4gIHBvc2l0aW9uIC09IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gIGNvbnN0IGxhc3RJbmRleCA9IHN0ci5pbmRleE9mKHNlYXJjaFN0cmluZywgcG9zaXRpb24pO1xuICByZXR1cm4gbGFzdEluZGV4ICE9PSAtMSAmJiBsYXN0SW5kZXggPT09IHBvc2l0aW9uO1xufTtcblxuXG4vKipcbiAqIFJldHVybnMgbmV3IGFycmF5IGZyb20gYXJyYXkgbGlrZSBvYmplY3Qgb3IgbnVsbCBpZiBmYWlsZWRcbiAqXG4gKiBAcGFyYW0geyp9IFt0aGluZ11cbiAqXG4gKiBAcmV0dXJucyB7P0FycmF5fVxuICovXG5jb25zdCB0b0FycmF5ID0gKHRoaW5nKSA9PiB7XG4gIGlmICghdGhpbmcpIHJldHVybiBudWxsO1xuICBpZiAoaXNBcnJheSh0aGluZykpIHJldHVybiB0aGluZztcbiAgbGV0IGkgPSB0aGluZy5sZW5ndGg7XG4gIGlmICghaXNOdW1iZXIoaSkpIHJldHVybiBudWxsO1xuICBjb25zdCBhcnIgPSBuZXcgQXJyYXkoaSk7XG4gIHdoaWxlIChpLS0gPiAwKSB7XG4gICAgYXJyW2ldID0gdGhpbmdbaV07XG4gIH1cbiAgcmV0dXJuIGFycjtcbn07XG5cbi8qKlxuICogQ2hlY2tpbmcgaWYgdGhlIFVpbnQ4QXJyYXkgZXhpc3RzIGFuZCBpZiBpdCBkb2VzLCBpdCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjaGVja3MgaWYgdGhlXG4gKiB0aGluZyBwYXNzZWQgaW4gaXMgYW4gaW5zdGFuY2Ugb2YgVWludDhBcnJheVxuICpcbiAqIEBwYXJhbSB7VHlwZWRBcnJheX1cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLW5hbWVzXG5jb25zdCBpc1R5cGVkQXJyYXkgPSAoVHlwZWRBcnJheSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLW5hbWVzXG4gIHJldHVybiB0aGluZyA9PiB7XG4gICAgcmV0dXJuIFR5cGVkQXJyYXkgJiYgdGhpbmcgaW5zdGFuY2VvZiBUeXBlZEFycmF5O1xuICB9O1xufSkodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnICYmIGdldFByb3RvdHlwZU9mKFVpbnQ4QXJyYXkpKTtcblxuLyoqXG4gKiBGb3IgZWFjaCBlbnRyeSBpbiB0aGUgb2JqZWN0LCBjYWxsIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSBrZXkgYW5kIHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0PGFueSwgYW55Pn0gb2JqIC0gVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiAtIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGVudHJ5LlxuICpcbiAqIEByZXR1cm5zIHt2b2lkfVxuICovXG5jb25zdCBmb3JFYWNoRW50cnkgPSAob2JqLCBmbikgPT4ge1xuICBjb25zdCBnZW5lcmF0b3IgPSBvYmogJiYgb2JqW1N5bWJvbC5pdGVyYXRvcl07XG5cbiAgY29uc3QgaXRlcmF0b3IgPSBnZW5lcmF0b3IuY2FsbChvYmopO1xuXG4gIGxldCByZXN1bHQ7XG5cbiAgd2hpbGUgKChyZXN1bHQgPSBpdGVyYXRvci5uZXh0KCkpICYmICFyZXN1bHQuZG9uZSkge1xuICAgIGNvbnN0IHBhaXIgPSByZXN1bHQudmFsdWU7XG4gICAgZm4uY2FsbChvYmosIHBhaXJbMF0sIHBhaXJbMV0pO1xuICB9XG59O1xuXG4vKipcbiAqIEl0IHRha2VzIGEgcmVndWxhciBleHByZXNzaW9uIGFuZCBhIHN0cmluZywgYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHRoZSBtYXRjaGVzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHJlZ0V4cCAtIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2ggYWdhaW5zdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgLSBUaGUgc3RyaW5nIHRvIHNlYXJjaC5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXk8Ym9vbGVhbj59XG4gKi9cbmNvbnN0IG1hdGNoQWxsID0gKHJlZ0V4cCwgc3RyKSA9PiB7XG4gIGxldCBtYXRjaGVzO1xuICBjb25zdCBhcnIgPSBbXTtcblxuICB3aGlsZSAoKG1hdGNoZXMgPSByZWdFeHAuZXhlYyhzdHIpKSAhPT0gbnVsbCkge1xuICAgIGFyci5wdXNoKG1hdGNoZXMpO1xuICB9XG5cbiAgcmV0dXJuIGFycjtcbn07XG5cbi8qIENoZWNraW5nIGlmIHRoZSBraW5kT2ZUZXN0IGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSB3aGVuIHBhc3NlZCBhbiBIVE1MRm9ybUVsZW1lbnQuICovXG5jb25zdCBpc0hUTUxGb3JtID0ga2luZE9mVGVzdCgnSFRNTEZvcm1FbGVtZW50Jyk7XG5cbmNvbnN0IHRvQ2FtZWxDYXNlID0gc3RyID0+IHtcbiAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1stX1xcc10oW2EtelxcZF0pKFxcdyopL2csXG4gICAgZnVuY3Rpb24gcmVwbGFjZXIobSwgcDEsIHAyKSB7XG4gICAgICByZXR1cm4gcDEudG9VcHBlckNhc2UoKSArIHAyO1xuICAgIH1cbiAgKTtcbn07XG5cbi8qIENyZWF0aW5nIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGNoZWNrIGlmIGFuIG9iamVjdCBoYXMgYSBwcm9wZXJ0eS4gKi9cbmNvbnN0IGhhc093blByb3BlcnR5ID0gKCh7aGFzT3duUHJvcGVydHl9KSA9PiAob2JqLCBwcm9wKSA9PiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpKE9iamVjdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuY29uc3QgaXNSZWdFeHAgPSBraW5kT2ZUZXN0KCdSZWdFeHAnKTtcblxuY29uc3QgcmVkdWNlRGVzY3JpcHRvcnMgPSAob2JqLCByZWR1Y2VyKSA9PiB7XG4gIGNvbnN0IGRlc2NyaXB0b3JzID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMob2JqKTtcbiAgY29uc3QgcmVkdWNlZERlc2NyaXB0b3JzID0ge307XG5cbiAgZm9yRWFjaChkZXNjcmlwdG9ycywgKGRlc2NyaXB0b3IsIG5hbWUpID0+IHtcbiAgICBpZiAocmVkdWNlcihkZXNjcmlwdG9yLCBuYW1lLCBvYmopICE9PSBmYWxzZSkge1xuICAgICAgcmVkdWNlZERlc2NyaXB0b3JzW25hbWVdID0gZGVzY3JpcHRvcjtcbiAgICB9XG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iaiwgcmVkdWNlZERlc2NyaXB0b3JzKTtcbn07XG5cbi8qKlxuICogTWFrZXMgYWxsIG1ldGhvZHMgcmVhZC1vbmx5XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuY29uc3QgZnJlZXplTWV0aG9kcyA9IChvYmopID0+IHtcbiAgcmVkdWNlRGVzY3JpcHRvcnMob2JqLCAoZGVzY3JpcHRvciwgbmFtZSkgPT4ge1xuICAgIC8vIHNraXAgcmVzdHJpY3RlZCBwcm9wcyBpbiBzdHJpY3QgbW9kZVxuICAgIGlmIChpc0Z1bmN0aW9uKG9iaikgJiYgWydhcmd1bWVudHMnLCAnY2FsbGVyJywgJ2NhbGxlZSddLmluZGV4T2YobmFtZSkgIT09IC0xKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBvYmpbbmFtZV07XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm47XG5cbiAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBmYWxzZTtcblxuICAgIGlmICgnd3JpdGFibGUnIGluIGRlc2NyaXB0b3IpIHtcbiAgICAgIGRlc2NyaXB0b3Iud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICBkZXNjcmlwdG9yLnNldCA9ICgpID0+IHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ0NhbiBub3QgcmV3cml0ZSByZWFkLW9ubHkgbWV0aG9kIFxcJycgKyBuYW1lICsgJ1xcJycpO1xuICAgICAgfTtcbiAgICB9XG4gIH0pO1xufTtcblxuY29uc3QgdG9PYmplY3RTZXQgPSAoYXJyYXlPclN0cmluZywgZGVsaW1pdGVyKSA9PiB7XG4gIGNvbnN0IG9iaiA9IHt9O1xuXG4gIGNvbnN0IGRlZmluZSA9IChhcnIpID0+IHtcbiAgICBhcnIuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICBvYmpbdmFsdWVdID0gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcblxuICBpc0FycmF5KGFycmF5T3JTdHJpbmcpID8gZGVmaW5lKGFycmF5T3JTdHJpbmcpIDogZGVmaW5lKFN0cmluZyhhcnJheU9yU3RyaW5nKS5zcGxpdChkZWxpbWl0ZXIpKTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG5jb25zdCB0b0Zpbml0ZU51bWJlciA9ICh2YWx1ZSwgZGVmYXVsdFZhbHVlKSA9PiB7XG4gIHZhbHVlID0gK3ZhbHVlO1xuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHZhbHVlKSA/IHZhbHVlIDogZGVmYXVsdFZhbHVlO1xufTtcblxuY29uc3QgQUxQSEEgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonO1xuXG5jb25zdCBESUdJVCA9ICcwMTIzNDU2Nzg5JztcblxuY29uc3QgQUxQSEFCRVQgPSB7XG4gIERJR0lULFxuICBBTFBIQSxcbiAgQUxQSEFfRElHSVQ6IEFMUEhBICsgQUxQSEEudG9VcHBlckNhc2UoKSArIERJR0lUXG59O1xuXG5jb25zdCBnZW5lcmF0ZVN0cmluZyA9IChzaXplID0gMTYsIGFscGhhYmV0ID0gQUxQSEFCRVQuQUxQSEFfRElHSVQpID0+IHtcbiAgbGV0IHN0ciA9ICcnO1xuICBjb25zdCB7bGVuZ3RofSA9IGFscGhhYmV0O1xuICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgc3RyICs9IGFscGhhYmV0W01hdGgucmFuZG9tKCkgKiBsZW5ndGh8MF07XG4gIH1cblxuICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBJZiB0aGUgdGhpbmcgaXMgYSBGb3JtRGF0YSBvYmplY3QsIHJldHVybiB0cnVlLCBvdGhlcndpc2UgcmV0dXJuIGZhbHNlLlxuICpcbiAqIEBwYXJhbSB7dW5rbm93bn0gdGhpbmcgLSBUaGUgdGhpbmcgdG8gY2hlY2suXG4gKlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzU3BlY0NvbXBsaWFudEZvcm0odGhpbmcpIHtcbiAgcmV0dXJuICEhKHRoaW5nICYmIGlzRnVuY3Rpb24odGhpbmcuYXBwZW5kKSAmJiB0aGluZ1tTeW1ib2wudG9TdHJpbmdUYWddID09PSAnRm9ybURhdGEnICYmIHRoaW5nW1N5bWJvbC5pdGVyYXRvcl0pO1xufVxuXG5jb25zdCB0b0pTT05PYmplY3QgPSAob2JqKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IEFycmF5KDEwKTtcblxuICBjb25zdCB2aXNpdCA9IChzb3VyY2UsIGkpID0+IHtcblxuICAgIGlmIChpc09iamVjdChzb3VyY2UpKSB7XG4gICAgICBpZiAoc3RhY2suaW5kZXhPZihzb3VyY2UpID49IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZighKCd0b0pTT04nIGluIHNvdXJjZSkpIHtcbiAgICAgICAgc3RhY2tbaV0gPSBzb3VyY2U7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGlzQXJyYXkoc291cmNlKSA/IFtdIDoge307XG5cbiAgICAgICAgZm9yRWFjaChzb3VyY2UsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVkdWNlZFZhbHVlID0gdmlzaXQodmFsdWUsIGkgKyAxKTtcbiAgICAgICAgICAhaXNVbmRlZmluZWQocmVkdWNlZFZhbHVlKSAmJiAodGFyZ2V0W2tleV0gPSByZWR1Y2VkVmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBzdGFja1tpXSA9IHVuZGVmaW5lZDtcblxuICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzb3VyY2U7XG4gIH07XG5cbiAgcmV0dXJuIHZpc2l0KG9iaiwgMCk7XG59O1xuXG5jb25zdCBpc0FzeW5jRm4gPSBraW5kT2ZUZXN0KCdBc3luY0Z1bmN0aW9uJyk7XG5cbmNvbnN0IGlzVGhlbmFibGUgPSAodGhpbmcpID0+XG4gIHRoaW5nICYmIChpc09iamVjdCh0aGluZykgfHwgaXNGdW5jdGlvbih0aGluZykpICYmIGlzRnVuY3Rpb24odGhpbmcudGhlbikgJiYgaXNGdW5jdGlvbih0aGluZy5jYXRjaCk7XG5cbnZhciB1dGlscyA9IHtcbiAgaXNBcnJheSxcbiAgaXNBcnJheUJ1ZmZlcixcbiAgaXNCdWZmZXIsXG4gIGlzRm9ybURhdGEsXG4gIGlzQXJyYXlCdWZmZXJWaWV3LFxuICBpc1N0cmluZyxcbiAgaXNOdW1iZXIsXG4gIGlzQm9vbGVhbixcbiAgaXNPYmplY3QsXG4gIGlzUGxhaW5PYmplY3QsXG4gIGlzVW5kZWZpbmVkLFxuICBpc0RhdGUsXG4gIGlzRmlsZSxcbiAgaXNCbG9iLFxuICBpc1JlZ0V4cCxcbiAgaXNGdW5jdGlvbixcbiAgaXNTdHJlYW0sXG4gIGlzVVJMU2VhcmNoUGFyYW1zLFxuICBpc1R5cGVkQXJyYXksXG4gIGlzRmlsZUxpc3QsXG4gIGZvckVhY2gsXG4gIG1lcmdlLFxuICBleHRlbmQsXG4gIHRyaW0sXG4gIHN0cmlwQk9NLFxuICBpbmhlcml0cyxcbiAgdG9GbGF0T2JqZWN0LFxuICBraW5kT2YsXG4gIGtpbmRPZlRlc3QsXG4gIGVuZHNXaXRoLFxuICB0b0FycmF5LFxuICBmb3JFYWNoRW50cnksXG4gIG1hdGNoQWxsLFxuICBpc0hUTUxGb3JtLFxuICBoYXNPd25Qcm9wZXJ0eSxcbiAgaGFzT3duUHJvcDogaGFzT3duUHJvcGVydHksIC8vIGFuIGFsaWFzIHRvIGF2b2lkIEVTTGludCBuby1wcm90b3R5cGUtYnVpbHRpbnMgZGV0ZWN0aW9uXG4gIHJlZHVjZURlc2NyaXB0b3JzLFxuICBmcmVlemVNZXRob2RzLFxuICB0b09iamVjdFNldCxcbiAgdG9DYW1lbENhc2UsXG4gIG5vb3AsXG4gIHRvRmluaXRlTnVtYmVyLFxuICBmaW5kS2V5LFxuICBnbG9iYWw6IF9nbG9iYWwsXG4gIGlzQ29udGV4dERlZmluZWQsXG4gIEFMUEhBQkVULFxuICBnZW5lcmF0ZVN0cmluZyxcbiAgaXNTcGVjQ29tcGxpYW50Rm9ybSxcbiAgdG9KU09OT2JqZWN0LFxuICBpc0FzeW5jRm4sXG4gIGlzVGhlbmFibGVcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBtZXNzYWdlLCBjb25maWcsIGVycm9yIGNvZGUsIHJlcXVlc3QgYW5kIHJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBlcnJvciBtZXNzYWdlLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnXSBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBjcmVhdGVkIGVycm9yLlxuICovXG5mdW5jdGlvbiBBeGlvc0Vycm9yKG1lc3NhZ2UsIGNvZGUsIGNvbmZpZywgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgRXJyb3IuY2FsbCh0aGlzKTtcblxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnN0YWNrID0gKG5ldyBFcnJvcigpKS5zdGFjaztcbiAgfVxuXG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIHRoaXMubmFtZSA9ICdBeGlvc0Vycm9yJztcbiAgY29kZSAmJiAodGhpcy5jb2RlID0gY29kZSk7XG4gIGNvbmZpZyAmJiAodGhpcy5jb25maWcgPSBjb25maWcpO1xuICByZXF1ZXN0ICYmICh0aGlzLnJlcXVlc3QgPSByZXF1ZXN0KTtcbiAgcmVzcG9uc2UgJiYgKHRoaXMucmVzcG9uc2UgPSByZXNwb25zZSk7XG59XG5cbnV0aWxzLmluaGVyaXRzKEF4aW9zRXJyb3IsIEVycm9yLCB7XG4gIHRvSlNPTjogZnVuY3Rpb24gdG9KU09OKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyBTdGFuZGFyZFxuICAgICAgbWVzc2FnZTogdGhpcy5tZXNzYWdlLFxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgLy8gTWljcm9zb2Z0XG4gICAgICBkZXNjcmlwdGlvbjogdGhpcy5kZXNjcmlwdGlvbixcbiAgICAgIG51bWJlcjogdGhpcy5udW1iZXIsXG4gICAgICAvLyBNb3ppbGxhXG4gICAgICBmaWxlTmFtZTogdGhpcy5maWxlTmFtZSxcbiAgICAgIGxpbmVOdW1iZXI6IHRoaXMubGluZU51bWJlcixcbiAgICAgIGNvbHVtbk51bWJlcjogdGhpcy5jb2x1bW5OdW1iZXIsXG4gICAgICBzdGFjazogdGhpcy5zdGFjayxcbiAgICAgIC8vIEF4aW9zXG4gICAgICBjb25maWc6IHV0aWxzLnRvSlNPTk9iamVjdCh0aGlzLmNvbmZpZyksXG4gICAgICBjb2RlOiB0aGlzLmNvZGUsXG4gICAgICBzdGF0dXM6IHRoaXMucmVzcG9uc2UgJiYgdGhpcy5yZXNwb25zZS5zdGF0dXMgPyB0aGlzLnJlc3BvbnNlLnN0YXR1cyA6IG51bGxcbiAgICB9O1xuICB9XG59KTtcblxuY29uc3QgcHJvdG90eXBlJDEgPSBBeGlvc0Vycm9yLnByb3RvdHlwZTtcbmNvbnN0IGRlc2NyaXB0b3JzID0ge307XG5cbltcbiAgJ0VSUl9CQURfT1BUSU9OX1ZBTFVFJyxcbiAgJ0VSUl9CQURfT1BUSU9OJyxcbiAgJ0VDT05OQUJPUlRFRCcsXG4gICdFVElNRURPVVQnLFxuICAnRVJSX05FVFdPUksnLFxuICAnRVJSX0ZSX1RPT19NQU5ZX1JFRElSRUNUUycsXG4gICdFUlJfREVQUkVDQVRFRCcsXG4gICdFUlJfQkFEX1JFU1BPTlNFJyxcbiAgJ0VSUl9CQURfUkVRVUVTVCcsXG4gICdFUlJfQ0FOQ0VMRUQnLFxuICAnRVJSX05PVF9TVVBQT1JUJyxcbiAgJ0VSUl9JTlZBTElEX1VSTCdcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLW5hbWVzXG5dLmZvckVhY2goY29kZSA9PiB7XG4gIGRlc2NyaXB0b3JzW2NvZGVdID0ge3ZhbHVlOiBjb2RlfTtcbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhBeGlvc0Vycm9yLCBkZXNjcmlwdG9ycyk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG90eXBlJDEsICdpc0F4aW9zRXJyb3InLCB7dmFsdWU6IHRydWV9KTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtbmFtZXNcbkF4aW9zRXJyb3IuZnJvbSA9IChlcnJvciwgY29kZSwgY29uZmlnLCByZXF1ZXN0LCByZXNwb25zZSwgY3VzdG9tUHJvcHMpID0+IHtcbiAgY29uc3QgYXhpb3NFcnJvciA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlJDEpO1xuXG4gIHV0aWxzLnRvRmxhdE9iamVjdChlcnJvciwgYXhpb3NFcnJvciwgZnVuY3Rpb24gZmlsdGVyKG9iaikge1xuICAgIHJldHVybiBvYmogIT09IEVycm9yLnByb3RvdHlwZTtcbiAgfSwgcHJvcCA9PiB7XG4gICAgcmV0dXJuIHByb3AgIT09ICdpc0F4aW9zRXJyb3InO1xuICB9KTtcblxuICBBeGlvc0Vycm9yLmNhbGwoYXhpb3NFcnJvciwgZXJyb3IubWVzc2FnZSwgY29kZSwgY29uZmlnLCByZXF1ZXN0LCByZXNwb25zZSk7XG5cbiAgYXhpb3NFcnJvci5jYXVzZSA9IGVycm9yO1xuXG4gIGF4aW9zRXJyb3IubmFtZSA9IGVycm9yLm5hbWU7XG5cbiAgY3VzdG9tUHJvcHMgJiYgT2JqZWN0LmFzc2lnbihheGlvc0Vycm9yLCBjdXN0b21Qcm9wcyk7XG5cbiAgcmV0dXJuIGF4aW9zRXJyb3I7XG59O1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgc3RyaWN0XG52YXIgaHR0cEFkYXB0ZXIgPSBudWxsO1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIGdpdmVuIHRoaW5nIGlzIGEgYXJyYXkgb3IganMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0aGluZyAtIFRoZSBvYmplY3Qgb3IgYXJyYXkgdG8gYmUgdmlzaXRlZC5cbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWaXNpdGFibGUodGhpbmcpIHtcbiAgcmV0dXJuIHV0aWxzLmlzUGxhaW5PYmplY3QodGhpbmcpIHx8IHV0aWxzLmlzQXJyYXkodGhpbmcpO1xufVxuXG4vKipcbiAqIEl0IHJlbW92ZXMgdGhlIGJyYWNrZXRzIGZyb20gdGhlIGVuZCBvZiBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBUaGUga2V5IG9mIHRoZSBwYXJhbWV0ZXIuXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gdGhlIGtleSB3aXRob3V0IHRoZSBicmFja2V0cy5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlQnJhY2tldHMoa2V5KSB7XG4gIHJldHVybiB1dGlscy5lbmRzV2l0aChrZXksICdbXScpID8ga2V5LnNsaWNlKDAsIC0yKSA6IGtleTtcbn1cblxuLyoqXG4gKiBJdCB0YWtlcyBhIHBhdGgsIGEga2V5LCBhbmQgYSBib29sZWFuLCBhbmQgcmV0dXJucyBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gVGhlIHBhdGggdG8gdGhlIGN1cnJlbnQga2V5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIFRoZSBrZXkgb2YgdGhlIGN1cnJlbnQgb2JqZWN0IGJlaW5nIGl0ZXJhdGVkIG92ZXIuXG4gKiBAcGFyYW0ge3N0cmluZ30gZG90cyAtIElmIHRydWUsIHRoZSBrZXkgd2lsbCBiZSByZW5kZXJlZCB3aXRoIGRvdHMgaW5zdGVhZCBvZiBicmFja2V0cy5cbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgcGF0aCB0byB0aGUgY3VycmVudCBrZXkuXG4gKi9cbmZ1bmN0aW9uIHJlbmRlcktleShwYXRoLCBrZXksIGRvdHMpIHtcbiAgaWYgKCFwYXRoKSByZXR1cm4ga2V5O1xuICByZXR1cm4gcGF0aC5jb25jYXQoa2V5KS5tYXAoZnVuY3Rpb24gZWFjaCh0b2tlbiwgaSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgIHRva2VuID0gcmVtb3ZlQnJhY2tldHModG9rZW4pO1xuICAgIHJldHVybiAhZG90cyAmJiBpID8gJ1snICsgdG9rZW4gKyAnXScgOiB0b2tlbjtcbiAgfSkuam9pbihkb3RzID8gJy4nIDogJycpO1xufVxuXG4vKipcbiAqIElmIHRoZSBhcnJheSBpcyBhbiBhcnJheSBhbmQgbm9uZSBvZiBpdHMgZWxlbWVudHMgYXJlIHZpc2l0YWJsZSwgdGhlbiBpdCdzIGEgZmxhdCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5PGFueT59IGFyciAtIFRoZSBhcnJheSB0byBjaGVja1xuICpcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0ZsYXRBcnJheShhcnIpIHtcbiAgcmV0dXJuIHV0aWxzLmlzQXJyYXkoYXJyKSAmJiAhYXJyLnNvbWUoaXNWaXNpdGFibGUpO1xufVxuXG5jb25zdCBwcmVkaWNhdGVzID0gdXRpbHMudG9GbGF0T2JqZWN0KHV0aWxzLCB7fSwgbnVsbCwgZnVuY3Rpb24gZmlsdGVyKHByb3ApIHtcbiAgcmV0dXJuIC9eaXNbQS1aXS8udGVzdChwcm9wKTtcbn0pO1xuXG4vKipcbiAqIENvbnZlcnQgYSBkYXRhIG9iamVjdCB0byBGb3JtRGF0YVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7P09iamVjdH0gW2Zvcm1EYXRhXVxuICogQHBhcmFtIHs/T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtvcHRpb25zLnZpc2l0b3JdXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLm1ldGFUb2tlbnMgPSB0cnVlXVxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5kb3RzID0gZmFsc2VdXG4gKiBAcGFyYW0gez9Cb29sZWFufSBbb3B0aW9ucy5pbmRleGVzID0gZmFsc2VdXG4gKlxuICogQHJldHVybnMge09iamVjdH1cbiAqKi9cblxuLyoqXG4gKiBJdCBjb252ZXJ0cyBhbiBvYmplY3QgaW50byBhIEZvcm1EYXRhIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0PGFueSwgYW55Pn0gb2JqIC0gVGhlIG9iamVjdCB0byBjb252ZXJ0IHRvIGZvcm0gZGF0YS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBmb3JtRGF0YSAtIFRoZSBGb3JtRGF0YSBvYmplY3QgdG8gYXBwZW5kIHRvLlxuICogQHBhcmFtIHtPYmplY3Q8c3RyaW5nLCBhbnk+fSBvcHRpb25zXG4gKlxuICogQHJldHVybnNcbiAqL1xuZnVuY3Rpb24gdG9Gb3JtRGF0YShvYmosIGZvcm1EYXRhLCBvcHRpb25zKSB7XG4gIGlmICghdXRpbHMuaXNPYmplY3Qob2JqKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RhcmdldCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gIGZvcm1EYXRhID0gZm9ybURhdGEgfHwgbmV3IChGb3JtRGF0YSkoKTtcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgb3B0aW9ucyA9IHV0aWxzLnRvRmxhdE9iamVjdChvcHRpb25zLCB7XG4gICAgbWV0YVRva2VuczogdHJ1ZSxcbiAgICBkb3RzOiBmYWxzZSxcbiAgICBpbmRleGVzOiBmYWxzZVxuICB9LCBmYWxzZSwgZnVuY3Rpb24gZGVmaW5lZChvcHRpb24sIHNvdXJjZSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1lcS1udWxsLGVxZXFlcVxuICAgIHJldHVybiAhdXRpbHMuaXNVbmRlZmluZWQoc291cmNlW29wdGlvbl0pO1xuICB9KTtcblxuICBjb25zdCBtZXRhVG9rZW5zID0gb3B0aW9ucy5tZXRhVG9rZW5zO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdXNlLWJlZm9yZS1kZWZpbmVcbiAgY29uc3QgdmlzaXRvciA9IG9wdGlvbnMudmlzaXRvciB8fCBkZWZhdWx0VmlzaXRvcjtcbiAgY29uc3QgZG90cyA9IG9wdGlvbnMuZG90cztcbiAgY29uc3QgaW5kZXhlcyA9IG9wdGlvbnMuaW5kZXhlcztcbiAgY29uc3QgX0Jsb2IgPSBvcHRpb25zLkJsb2IgfHwgdHlwZW9mIEJsb2IgIT09ICd1bmRlZmluZWQnICYmIEJsb2I7XG4gIGNvbnN0IHVzZUJsb2IgPSBfQmxvYiAmJiB1dGlscy5pc1NwZWNDb21wbGlhbnRGb3JtKGZvcm1EYXRhKTtcblxuICBpZiAoIXV0aWxzLmlzRnVuY3Rpb24odmlzaXRvcikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2aXNpdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29udmVydFZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSByZXR1cm4gJyc7XG5cbiAgICBpZiAodXRpbHMuaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLnRvSVNPU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgaWYgKCF1c2VCbG9iICYmIHV0aWxzLmlzQmxvYih2YWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBBeGlvc0Vycm9yKCdCbG9iIGlzIG5vdCBzdXBwb3J0ZWQuIFVzZSBhIEJ1ZmZlciBpbnN0ZWFkLicpO1xuICAgIH1cblxuICAgIGlmICh1dGlscy5pc0FycmF5QnVmZmVyKHZhbHVlKSB8fCB1dGlscy5pc1R5cGVkQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdXNlQmxvYiAmJiB0eXBlb2YgQmxvYiA9PT0gJ2Z1bmN0aW9uJyA/IG5ldyBCbG9iKFt2YWx1ZV0pIDogQnVmZmVyLmZyb20odmFsdWUpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IHZpc2l0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBrZXlcbiAgICogQHBhcmFtIHtBcnJheTxTdHJpbmd8TnVtYmVyPn0gcGF0aFxuICAgKiBAdGhpcyB7Rm9ybURhdGF9XG4gICAqXG4gICAqIEByZXR1cm5zIHtib29sZWFufSByZXR1cm4gdHJ1ZSB0byB2aXNpdCB0aGUgZWFjaCBwcm9wIG9mIHRoZSB2YWx1ZSByZWN1cnNpdmVseVxuICAgKi9cbiAgZnVuY3Rpb24gZGVmYXVsdFZpc2l0b3IodmFsdWUsIGtleSwgcGF0aCkge1xuICAgIGxldCBhcnIgPSB2YWx1ZTtcblxuICAgIGlmICh2YWx1ZSAmJiAhcGF0aCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAodXRpbHMuZW5kc1dpdGgoa2V5LCAne30nKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAga2V5ID0gbWV0YVRva2VucyA/IGtleSA6IGtleS5zbGljZSgwLCAtMik7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICh1dGlscy5pc0FycmF5KHZhbHVlKSAmJiBpc0ZsYXRBcnJheSh2YWx1ZSkpIHx8XG4gICAgICAgICgodXRpbHMuaXNGaWxlTGlzdCh2YWx1ZSkgfHwgdXRpbHMuZW5kc1dpdGgoa2V5LCAnW10nKSkgJiYgKGFyciA9IHV0aWxzLnRvQXJyYXkodmFsdWUpKVxuICAgICAgICApKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICBrZXkgPSByZW1vdmVCcmFja2V0cyhrZXkpO1xuXG4gICAgICAgIGFyci5mb3JFYWNoKGZ1bmN0aW9uIGVhY2goZWwsIGluZGV4KSB7XG4gICAgICAgICAgISh1dGlscy5pc1VuZGVmaW5lZChlbCkgfHwgZWwgPT09IG51bGwpICYmIGZvcm1EYXRhLmFwcGVuZChcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXN0ZWQtdGVybmFyeVxuICAgICAgICAgICAgaW5kZXhlcyA9PT0gdHJ1ZSA/IHJlbmRlcktleShba2V5XSwgaW5kZXgsIGRvdHMpIDogKGluZGV4ZXMgPT09IG51bGwgPyBrZXkgOiBrZXkgKyAnW10nKSxcbiAgICAgICAgICAgIGNvbnZlcnRWYWx1ZShlbClcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc1Zpc2l0YWJsZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvcm1EYXRhLmFwcGVuZChyZW5kZXJLZXkocGF0aCwga2V5LCBkb3RzKSwgY29udmVydFZhbHVlKHZhbHVlKSk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBzdGFjayA9IFtdO1xuXG4gIGNvbnN0IGV4cG9zZWRIZWxwZXJzID0gT2JqZWN0LmFzc2lnbihwcmVkaWNhdGVzLCB7XG4gICAgZGVmYXVsdFZpc2l0b3IsXG4gICAgY29udmVydFZhbHVlLFxuICAgIGlzVmlzaXRhYmxlXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGJ1aWxkKHZhbHVlLCBwYXRoKSB7XG4gICAgaWYgKHV0aWxzLmlzVW5kZWZpbmVkKHZhbHVlKSkgcmV0dXJuO1xuXG4gICAgaWYgKHN0YWNrLmluZGV4T2YodmFsdWUpICE9PSAtMSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZSBkZXRlY3RlZCBpbiAnICsgcGF0aC5qb2luKCcuJykpO1xuICAgIH1cblxuICAgIHN0YWNrLnB1c2godmFsdWUpO1xuXG4gICAgdXRpbHMuZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gZWFjaChlbCwga2V5KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSAhKHV0aWxzLmlzVW5kZWZpbmVkKGVsKSB8fCBlbCA9PT0gbnVsbCkgJiYgdmlzaXRvci5jYWxsKFxuICAgICAgICBmb3JtRGF0YSwgZWwsIHV0aWxzLmlzU3RyaW5nKGtleSkgPyBrZXkudHJpbSgpIDoga2V5LCBwYXRoLCBleHBvc2VkSGVscGVyc1xuICAgICAgKTtcblxuICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICBidWlsZChlbCwgcGF0aCA/IHBhdGguY29uY2F0KGtleSkgOiBba2V5XSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzdGFjay5wb3AoKTtcbiAgfVxuXG4gIGlmICghdXRpbHMuaXNPYmplY3Qob2JqKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2RhdGEgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIGJ1aWxkKG9iaik7XG5cbiAgcmV0dXJuIGZvcm1EYXRhO1xufVxuXG4vKipcbiAqIEl0IGVuY29kZXMgYSBzdHJpbmcgYnkgcmVwbGFjaW5nIGFsbCBjaGFyYWN0ZXJzIHRoYXQgYXJlIG5vdCBpbiB0aGUgdW5yZXNlcnZlZCBzZXQgd2l0aFxuICogdGhlaXIgcGVyY2VudC1lbmNvZGVkIGVxdWl2YWxlbnRzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciAtIFRoZSBzdHJpbmcgdG8gZW5jb2RlLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBlbmNvZGVkIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZW5jb2RlJDEoc3RyKSB7XG4gIGNvbnN0IGNoYXJNYXAgPSB7XG4gICAgJyEnOiAnJTIxJyxcbiAgICBcIidcIjogJyUyNycsXG4gICAgJygnOiAnJTI4JyxcbiAgICAnKSc6ICclMjknLFxuICAgICd+JzogJyU3RScsXG4gICAgJyUyMCc6ICcrJyxcbiAgICAnJTAwJzogJ1xceDAwJ1xuICB9O1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cikucmVwbGFjZSgvWyEnKCl+XXwlMjB8JTAwL2csIGZ1bmN0aW9uIHJlcGxhY2VyKG1hdGNoKSB7XG4gICAgcmV0dXJuIGNoYXJNYXBbbWF0Y2hdO1xuICB9KTtcbn1cblxuLyoqXG4gKiBJdCB0YWtlcyBhIHBhcmFtcyBvYmplY3QgYW5kIGNvbnZlcnRzIGl0IHRvIGEgRm9ybURhdGEgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtPYmplY3Q8c3RyaW5nLCBhbnk+fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyB0byBiZSBjb252ZXJ0ZWQgdG8gYSBGb3JtRGF0YSBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdDxzdHJpbmcsIGFueT59IG9wdGlvbnMgLSBUaGUgb3B0aW9ucyBvYmplY3QgcGFzc2VkIHRvIHRoZSBBeGlvcyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZnVuY3Rpb24gQXhpb3NVUkxTZWFyY2hQYXJhbXMocGFyYW1zLCBvcHRpb25zKSB7XG4gIHRoaXMuX3BhaXJzID0gW107XG5cbiAgcGFyYW1zICYmIHRvRm9ybURhdGEocGFyYW1zLCB0aGlzLCBvcHRpb25zKTtcbn1cblxuY29uc3QgcHJvdG90eXBlID0gQXhpb3NVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlO1xuXG5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gYXBwZW5kKG5hbWUsIHZhbHVlKSB7XG4gIHRoaXMuX3BhaXJzLnB1c2goW25hbWUsIHZhbHVlXSk7XG59O1xuXG5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyhlbmNvZGVyKSB7XG4gIGNvbnN0IF9lbmNvZGUgPSBlbmNvZGVyID8gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZW5jb2Rlci5jYWxsKHRoaXMsIHZhbHVlLCBlbmNvZGUkMSk7XG4gIH0gOiBlbmNvZGUkMTtcblxuICByZXR1cm4gdGhpcy5fcGFpcnMubWFwKGZ1bmN0aW9uIGVhY2gocGFpcikge1xuICAgIHJldHVybiBfZW5jb2RlKHBhaXJbMF0pICsgJz0nICsgX2VuY29kZShwYWlyWzFdKTtcbiAgfSwgJycpLmpvaW4oJyYnKTtcbn07XG5cbi8qKlxuICogSXQgcmVwbGFjZXMgYWxsIGluc3RhbmNlcyBvZiB0aGUgY2hhcmFjdGVycyBgOmAsIGAkYCwgYCxgLCBgK2AsIGBbYCwgYW5kIGBdYCB3aXRoIHRoZWlyXG4gKiBVUkkgZW5jb2RlZCBjb3VudGVycGFydHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsIFRoZSB2YWx1ZSB0byBiZSBlbmNvZGVkLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBlbmNvZGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBlbmNvZGUodmFsKSB7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsKS5cbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXG4gICAgcmVwbGFjZSgvJTI0L2csICckJykuXG4gICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxuICAgIHJlcGxhY2UoLyU1Qi9naSwgJ1snKS5cbiAgICByZXBsYWNlKC8lNUQvZ2ksICddJyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgYmFzZSBvZiB0aGUgdXJsIChlLmcuLCBodHRwOi8vd3d3Lmdvb2dsZS5jb20pXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxuICogQHBhcmFtIHs/b2JqZWN0fSBvcHRpb25zXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm1hdHRlZCB1cmxcbiAqL1xuZnVuY3Rpb24gYnVpbGRVUkwodXJsLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIGlmICghcGFyYW1zKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICBcbiAgY29uc3QgX2VuY29kZSA9IG9wdGlvbnMgJiYgb3B0aW9ucy5lbmNvZGUgfHwgZW5jb2RlO1xuXG4gIGNvbnN0IHNlcmlhbGl6ZUZuID0gb3B0aW9ucyAmJiBvcHRpb25zLnNlcmlhbGl6ZTtcblxuICBsZXQgc2VyaWFsaXplZFBhcmFtcztcblxuICBpZiAoc2VyaWFsaXplRm4pIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gc2VyaWFsaXplRm4ocGFyYW1zLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gdXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMocGFyYW1zKSA/XG4gICAgICBwYXJhbXMudG9TdHJpbmcoKSA6XG4gICAgICBuZXcgQXhpb3NVUkxTZWFyY2hQYXJhbXMocGFyYW1zLCBvcHRpb25zKS50b1N0cmluZyhfZW5jb2RlKTtcbiAgfVxuXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XG4gICAgY29uc3QgaGFzaG1hcmtJbmRleCA9IHVybC5pbmRleE9mKFwiI1wiKTtcblxuICAgIGlmIChoYXNobWFya0luZGV4ICE9PSAtMSkge1xuICAgICAgdXJsID0gdXJsLnNsaWNlKDAsIGhhc2htYXJrSW5kZXgpO1xuICAgIH1cbiAgICB1cmwgKz0gKHVybC5pbmRleE9mKCc/JykgPT09IC0xID8gJz8nIDogJyYnKSArIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufVxuXG5jbGFzcyBJbnRlcmNlcHRvck1hbmFnZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmhhbmRsZXJzID0gW107XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgbmV3IGludGVyY2VwdG9yIHRvIHRoZSBzdGFja1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdWxmaWxsZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgdGhlbmAgZm9yIGEgYFByb21pc2VgXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHJlamVjdGAgZm9yIGEgYFByb21pc2VgXG4gICAqXG4gICAqIEByZXR1cm4ge051bWJlcn0gQW4gSUQgdXNlZCB0byByZW1vdmUgaW50ZXJjZXB0b3IgbGF0ZXJcbiAgICovXG4gIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkLCBvcHRpb25zKSB7XG4gICAgdGhpcy5oYW5kbGVycy5wdXNoKHtcbiAgICAgIGZ1bGZpbGxlZCxcbiAgICAgIHJlamVjdGVkLFxuICAgICAgc3luY2hyb25vdXM6IG9wdGlvbnMgPyBvcHRpb25zLnN5bmNocm9ub3VzIDogZmFsc2UsXG4gICAgICBydW5XaGVuOiBvcHRpb25zID8gb3B0aW9ucy5ydW5XaGVuIDogbnVsbFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLmhhbmRsZXJzLmxlbmd0aCAtIDE7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFuIGludGVyY2VwdG9yIGZyb20gdGhlIHN0YWNrXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgSUQgdGhhdCB3YXMgcmV0dXJuZWQgYnkgYHVzZWBcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgaW50ZXJjZXB0b3Igd2FzIHJlbW92ZWQsIGBmYWxzZWAgb3RoZXJ3aXNlXG4gICAqL1xuICBlamVjdChpZCkge1xuICAgIGlmICh0aGlzLmhhbmRsZXJzW2lkXSkge1xuICAgICAgdGhpcy5oYW5kbGVyc1tpZF0gPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciBhbGwgaW50ZXJjZXB0b3JzIGZyb20gdGhlIHN0YWNrXG4gICAqXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgY2xlYXIoKSB7XG4gICAgaWYgKHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvdmVyIGFsbCB0aGUgcmVnaXN0ZXJlZCBpbnRlcmNlcHRvcnNcbiAgICpcbiAgICogVGhpcyBtZXRob2QgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3Igc2tpcHBpbmcgb3ZlciBhbnlcbiAgICogaW50ZXJjZXB0b3JzIHRoYXQgbWF5IGhhdmUgYmVjb21lIGBudWxsYCBjYWxsaW5nIGBlamVjdGAuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGludGVyY2VwdG9yXG4gICAqXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgZm9yRWFjaChmbikge1xuICAgIHV0aWxzLmZvckVhY2godGhpcy5oYW5kbGVycywgZnVuY3Rpb24gZm9yRWFjaEhhbmRsZXIoaCkge1xuICAgICAgaWYgKGggIT09IG51bGwpIHtcbiAgICAgICAgZm4oaCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxudmFyIEludGVyY2VwdG9yTWFuYWdlciQxID0gSW50ZXJjZXB0b3JNYW5hZ2VyO1xuXG52YXIgdHJhbnNpdGlvbmFsRGVmYXVsdHMgPSB7XG4gIHNpbGVudEpTT05QYXJzaW5nOiB0cnVlLFxuICBmb3JjZWRKU09OUGFyc2luZzogdHJ1ZSxcbiAgY2xhcmlmeVRpbWVvdXRFcnJvcjogZmFsc2Vcbn07XG5cbnZhciBVUkxTZWFyY2hQYXJhbXMkMSA9IHR5cGVvZiBVUkxTZWFyY2hQYXJhbXMgIT09ICd1bmRlZmluZWQnID8gVVJMU2VhcmNoUGFyYW1zIDogQXhpb3NVUkxTZWFyY2hQYXJhbXM7XG5cbnZhciBGb3JtRGF0YSQxID0gdHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJyA/IEZvcm1EYXRhIDogbnVsbDtcblxudmFyIEJsb2IkMSA9IHR5cGVvZiBCbG9iICE9PSAndW5kZWZpbmVkJyA/IEJsb2IgOiBudWxsO1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSdyZSBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudFxuICpcbiAqIFRoaXMgYWxsb3dzIGF4aW9zIHRvIHJ1biBpbiBhIHdlYiB3b3JrZXIsIGFuZCByZWFjdC1uYXRpdmUuXG4gKiBCb3RoIGVudmlyb25tZW50cyBzdXBwb3J0IFhNTEh0dHBSZXF1ZXN0LCBidXQgbm90IGZ1bGx5IHN0YW5kYXJkIGdsb2JhbHMuXG4gKlxuICogd2ViIHdvcmtlcnM6XG4gKiAgdHlwZW9mIHdpbmRvdyAtPiB1bmRlZmluZWRcbiAqICB0eXBlb2YgZG9jdW1lbnQgLT4gdW5kZWZpbmVkXG4gKlxuICogcmVhY3QtbmF0aXZlOlxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdSZWFjdE5hdGl2ZSdcbiAqIG5hdGl2ZXNjcmlwdFxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdOYXRpdmVTY3JpcHQnIG9yICdOUydcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuY29uc3QgaXNTdGFuZGFyZEJyb3dzZXJFbnYgPSAoKCkgPT4ge1xuICBsZXQgcHJvZHVjdDtcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIChcbiAgICAocHJvZHVjdCA9IG5hdmlnYXRvci5wcm9kdWN0KSA9PT0gJ1JlYWN0TmF0aXZlJyB8fFxuICAgIHByb2R1Y3QgPT09ICdOYXRpdmVTY3JpcHQnIHx8XG4gICAgcHJvZHVjdCA9PT0gJ05TJylcbiAgKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG59KSgpO1xuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSdyZSBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciB3ZWJXb3JrZXIgZW52aXJvbm1lbnRcbiAqXG4gKiBBbHRob3VnaCB0aGUgYGlzU3RhbmRhcmRCcm93c2VyRW52YCBtZXRob2QgaW5kaWNhdGVzIHRoYXRcbiAqIGBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlcmAsIHRoZSBXZWJXb3JrZXIgd2lsbCBzdGlsbCBiZVxuICogZmlsdGVyZWQgb3V0IGR1ZSB0byBpdHMganVkZ21lbnQgc3RhbmRhcmRcbiAqIGB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnYC5cbiAqIFRoaXMgbGVhZHMgdG8gYSBwcm9ibGVtIHdoZW4gYXhpb3MgcG9zdCBgRm9ybURhdGFgIGluIHdlYldvcmtlclxuICovXG4gY29uc3QgaXNTdGFuZGFyZEJyb3dzZXJXZWJXb3JrZXJFbnYgPSAoKCkgPT4ge1xuICByZXR1cm4gKFxuICAgIHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgICBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGUgJiZcbiAgICB0eXBlb2Ygc2VsZi5pbXBvcnRTY3JpcHRzID09PSAnZnVuY3Rpb24nXG4gICk7XG59KSgpO1xuXG5cbnZhciBwbGF0Zm9ybSA9IHtcbiAgaXNCcm93c2VyOiB0cnVlLFxuICBjbGFzc2VzOiB7XG4gICAgVVJMU2VhcmNoUGFyYW1zOiBVUkxTZWFyY2hQYXJhbXMkMSxcbiAgICBGb3JtRGF0YTogRm9ybURhdGEkMSxcbiAgICBCbG9iOiBCbG9iJDFcbiAgfSxcbiAgaXNTdGFuZGFyZEJyb3dzZXJFbnYsXG4gIGlzU3RhbmRhcmRCcm93c2VyV2ViV29ya2VyRW52LFxuICBwcm90b2NvbHM6IFsnaHR0cCcsICdodHRwcycsICdmaWxlJywgJ2Jsb2InLCAndXJsJywgJ2RhdGEnXVxufTtcblxuZnVuY3Rpb24gdG9VUkxFbmNvZGVkRm9ybShkYXRhLCBvcHRpb25zKSB7XG4gIHJldHVybiB0b0Zvcm1EYXRhKGRhdGEsIG5ldyBwbGF0Zm9ybS5jbGFzc2VzLlVSTFNlYXJjaFBhcmFtcygpLCBPYmplY3QuYXNzaWduKHtcbiAgICB2aXNpdG9yOiBmdW5jdGlvbih2YWx1ZSwga2V5LCBwYXRoLCBoZWxwZXJzKSB7XG4gICAgICBpZiAocGxhdGZvcm0uaXNOb2RlICYmIHV0aWxzLmlzQnVmZmVyKHZhbHVlKSkge1xuICAgICAgICB0aGlzLmFwcGVuZChrZXksIHZhbHVlLnRvU3RyaW5nKCdiYXNlNjQnKSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhlbHBlcnMuZGVmYXVsdFZpc2l0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH0sIG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBJdCB0YWtlcyBhIHN0cmluZyBsaWtlIGBmb29beF1beV1bel1gIGFuZCByZXR1cm5zIGFuIGFycmF5IGxpa2UgYFsnZm9vJywgJ3gnLCAneScsICd6J11cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKlxuICogQHJldHVybnMgQW4gYXJyYXkgb2Ygc3RyaW5ncy5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQcm9wUGF0aChuYW1lKSB7XG4gIC8vIGZvb1t4XVt5XVt6XVxuICAvLyBmb28ueC55LnpcbiAgLy8gZm9vLXgteS16XG4gIC8vIGZvbyB4IHkgelxuICByZXR1cm4gdXRpbHMubWF0Y2hBbGwoL1xcdyt8XFxbKFxcdyopXS9nLCBuYW1lKS5tYXAobWF0Y2ggPT4ge1xuICAgIHJldHVybiBtYXRjaFswXSA9PT0gJ1tdJyA/ICcnIDogbWF0Y2hbMV0gfHwgbWF0Y2hbMF07XG4gIH0pO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gYXJyYXkgdG8gYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7QXJyYXk8YW55Pn0gYXJyIC0gVGhlIGFycmF5IHRvIGNvbnZlcnQgdG8gYW4gb2JqZWN0LlxuICpcbiAqIEByZXR1cm5zIEFuIG9iamVjdCB3aXRoIHRoZSBzYW1lIGtleXMgYW5kIHZhbHVlcyBhcyB0aGUgYXJyYXkuXG4gKi9cbmZ1bmN0aW9uIGFycmF5VG9PYmplY3QoYXJyKSB7XG4gIGNvbnN0IG9iaiA9IHt9O1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoYXJyKTtcbiAgbGV0IGk7XG4gIGNvbnN0IGxlbiA9IGtleXMubGVuZ3RoO1xuICBsZXQga2V5O1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIG9ialtrZXldID0gYXJyW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBJdCB0YWtlcyBhIEZvcm1EYXRhIG9iamVjdCBhbmQgcmV0dXJucyBhIEphdmFTY3JpcHQgb2JqZWN0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGZvcm1EYXRhIFRoZSBGb3JtRGF0YSBvYmplY3QgdG8gY29udmVydCB0byBKU09OLlxuICpcbiAqIEByZXR1cm5zIHtPYmplY3Q8c3RyaW5nLCBhbnk+IHwgbnVsbH0gVGhlIGNvbnZlcnRlZCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGZvcm1EYXRhVG9KU09OKGZvcm1EYXRhKSB7XG4gIGZ1bmN0aW9uIGJ1aWxkUGF0aChwYXRoLCB2YWx1ZSwgdGFyZ2V0LCBpbmRleCkge1xuICAgIGxldCBuYW1lID0gcGF0aFtpbmRleCsrXTtcbiAgICBjb25zdCBpc051bWVyaWNLZXkgPSBOdW1iZXIuaXNGaW5pdGUoK25hbWUpO1xuICAgIGNvbnN0IGlzTGFzdCA9IGluZGV4ID49IHBhdGgubGVuZ3RoO1xuICAgIG5hbWUgPSAhbmFtZSAmJiB1dGlscy5pc0FycmF5KHRhcmdldCkgPyB0YXJnZXQubGVuZ3RoIDogbmFtZTtcblxuICAgIGlmIChpc0xhc3QpIHtcbiAgICAgIGlmICh1dGlscy5oYXNPd25Qcm9wKHRhcmdldCwgbmFtZSkpIHtcbiAgICAgICAgdGFyZ2V0W25hbWVdID0gW3RhcmdldFtuYW1lXSwgdmFsdWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0W25hbWVdID0gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAhaXNOdW1lcmljS2V5O1xuICAgIH1cblxuICAgIGlmICghdGFyZ2V0W25hbWVdIHx8ICF1dGlscy5pc09iamVjdCh0YXJnZXRbbmFtZV0pKSB7XG4gICAgICB0YXJnZXRbbmFtZV0gPSBbXTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBidWlsZFBhdGgocGF0aCwgdmFsdWUsIHRhcmdldFtuYW1lXSwgaW5kZXgpO1xuXG4gICAgaWYgKHJlc3VsdCAmJiB1dGlscy5pc0FycmF5KHRhcmdldFtuYW1lXSkpIHtcbiAgICAgIHRhcmdldFtuYW1lXSA9IGFycmF5VG9PYmplY3QodGFyZ2V0W25hbWVdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gIWlzTnVtZXJpY0tleTtcbiAgfVxuXG4gIGlmICh1dGlscy5pc0Zvcm1EYXRhKGZvcm1EYXRhKSAmJiB1dGlscy5pc0Z1bmN0aW9uKGZvcm1EYXRhLmVudHJpZXMpKSB7XG4gICAgY29uc3Qgb2JqID0ge307XG5cbiAgICB1dGlscy5mb3JFYWNoRW50cnkoZm9ybURhdGEsIChuYW1lLCB2YWx1ZSkgPT4ge1xuICAgICAgYnVpbGRQYXRoKHBhcnNlUHJvcFBhdGgobmFtZSksIHZhbHVlLCBvYmosIDApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jb25zdCBERUZBVUxUX0NPTlRFTlRfVFlQRSA9IHtcbiAgJ0NvbnRlbnQtVHlwZSc6IHVuZGVmaW5lZFxufTtcblxuLyoqXG4gKiBJdCB0YWtlcyBhIHN0cmluZywgdHJpZXMgdG8gcGFyc2UgaXQsIGFuZCBpZiBpdCBmYWlscywgaXQgcmV0dXJucyB0aGUgc3RyaW5naWZpZWQgdmVyc2lvblxuICogb2YgdGhlIGlucHV0XG4gKlxuICogQHBhcmFtIHthbnl9IHJhd1ZhbHVlIC0gVGhlIHZhbHVlIHRvIGJlIHN0cmluZ2lmaWVkLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGFyc2VyIC0gQSBmdW5jdGlvbiB0aGF0IHBhcnNlcyBhIHN0cmluZyBpbnRvIGEgSmF2YVNjcmlwdCBvYmplY3QuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbmNvZGVyIC0gQSBmdW5jdGlvbiB0aGF0IHRha2VzIGEgdmFsdWUgYW5kIHJldHVybnMgYSBzdHJpbmcuXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gQSBzdHJpbmdpZmllZCB2ZXJzaW9uIG9mIHRoZSByYXdWYWx1ZS5cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5U2FmZWx5KHJhd1ZhbHVlLCBwYXJzZXIsIGVuY29kZXIpIHtcbiAgaWYgKHV0aWxzLmlzU3RyaW5nKHJhd1ZhbHVlKSkge1xuICAgIHRyeSB7XG4gICAgICAocGFyc2VyIHx8IEpTT04ucGFyc2UpKHJhd1ZhbHVlKTtcbiAgICAgIHJldHVybiB1dGlscy50cmltKHJhd1ZhbHVlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5uYW1lICE9PSAnU3ludGF4RXJyb3InKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIChlbmNvZGVyIHx8IEpTT04uc3RyaW5naWZ5KShyYXdWYWx1ZSk7XG59XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuXG4gIHRyYW5zaXRpb25hbDogdHJhbnNpdGlvbmFsRGVmYXVsdHMsXG5cbiAgYWRhcHRlcjogWyd4aHInLCAnaHR0cCddLFxuXG4gIHRyYW5zZm9ybVJlcXVlc3Q6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXF1ZXN0KGRhdGEsIGhlYWRlcnMpIHtcbiAgICBjb25zdCBjb250ZW50VHlwZSA9IGhlYWRlcnMuZ2V0Q29udGVudFR5cGUoKSB8fCAnJztcbiAgICBjb25zdCBoYXNKU09OQ29udGVudFR5cGUgPSBjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgPiAtMTtcbiAgICBjb25zdCBpc09iamVjdFBheWxvYWQgPSB1dGlscy5pc09iamVjdChkYXRhKTtcblxuICAgIGlmIChpc09iamVjdFBheWxvYWQgJiYgdXRpbHMuaXNIVE1MRm9ybShkYXRhKSkge1xuICAgICAgZGF0YSA9IG5ldyBGb3JtRGF0YShkYXRhKTtcbiAgICB9XG5cbiAgICBjb25zdCBpc0Zvcm1EYXRhID0gdXRpbHMuaXNGb3JtRGF0YShkYXRhKTtcblxuICAgIGlmIChpc0Zvcm1EYXRhKSB7XG4gICAgICBpZiAoIWhhc0pTT05Db250ZW50VHlwZSkge1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNKU09OQ29udGVudFR5cGUgPyBKU09OLnN0cmluZ2lmeShmb3JtRGF0YVRvSlNPTihkYXRhKSkgOiBkYXRhO1xuICAgIH1cblxuICAgIGlmICh1dGlscy5pc0FycmF5QnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0J1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNTdHJlYW0oZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzRmlsZShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCbG9iKGRhdGEpXG4gICAgKSB7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzQXJyYXlCdWZmZXJWaWV3KGRhdGEpKSB7XG4gICAgICByZXR1cm4gZGF0YS5idWZmZXI7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhkYXRhKSkge1xuICAgICAgaGVhZGVycy5zZXRDb250ZW50VHlwZSgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9dXRmLTgnLCBmYWxzZSk7XG4gICAgICByZXR1cm4gZGF0YS50b1N0cmluZygpO1xuICAgIH1cblxuICAgIGxldCBpc0ZpbGVMaXN0O1xuXG4gICAgaWYgKGlzT2JqZWN0UGF5bG9hZCkge1xuICAgICAgaWYgKGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpID4gLTEpIHtcbiAgICAgICAgcmV0dXJuIHRvVVJMRW5jb2RlZEZvcm0oZGF0YSwgdGhpcy5mb3JtU2VyaWFsaXplcikudG9TdHJpbmcoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKChpc0ZpbGVMaXN0ID0gdXRpbHMuaXNGaWxlTGlzdChkYXRhKSkgfHwgY29udGVudFR5cGUuaW5kZXhPZignbXVsdGlwYXJ0L2Zvcm0tZGF0YScpID4gLTEpIHtcbiAgICAgICAgY29uc3QgX0Zvcm1EYXRhID0gdGhpcy5lbnYgJiYgdGhpcy5lbnYuRm9ybURhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRvRm9ybURhdGEoXG4gICAgICAgICAgaXNGaWxlTGlzdCA/IHsnZmlsZXNbXSc6IGRhdGF9IDogZGF0YSxcbiAgICAgICAgICBfRm9ybURhdGEgJiYgbmV3IF9Gb3JtRGF0YSgpLFxuICAgICAgICAgIHRoaXMuZm9ybVNlcmlhbGl6ZXJcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaXNPYmplY3RQYXlsb2FkIHx8IGhhc0pTT05Db250ZW50VHlwZSApIHtcbiAgICAgIGhlYWRlcnMuc2V0Q29udGVudFR5cGUoJ2FwcGxpY2F0aW9uL2pzb24nLCBmYWxzZSk7XG4gICAgICByZXR1cm4gc3RyaW5naWZ5U2FmZWx5KGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICB0cmFuc2Zvcm1SZXNwb25zZTogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlKGRhdGEpIHtcbiAgICBjb25zdCB0cmFuc2l0aW9uYWwgPSB0aGlzLnRyYW5zaXRpb25hbCB8fCBkZWZhdWx0cy50cmFuc2l0aW9uYWw7XG4gICAgY29uc3QgZm9yY2VkSlNPTlBhcnNpbmcgPSB0cmFuc2l0aW9uYWwgJiYgdHJhbnNpdGlvbmFsLmZvcmNlZEpTT05QYXJzaW5nO1xuICAgIGNvbnN0IEpTT05SZXF1ZXN0ZWQgPSB0aGlzLnJlc3BvbnNlVHlwZSA9PT0gJ2pzb24nO1xuXG4gICAgaWYgKGRhdGEgJiYgdXRpbHMuaXNTdHJpbmcoZGF0YSkgJiYgKChmb3JjZWRKU09OUGFyc2luZyAmJiAhdGhpcy5yZXNwb25zZVR5cGUpIHx8IEpTT05SZXF1ZXN0ZWQpKSB7XG4gICAgICBjb25zdCBzaWxlbnRKU09OUGFyc2luZyA9IHRyYW5zaXRpb25hbCAmJiB0cmFuc2l0aW9uYWwuc2lsZW50SlNPTlBhcnNpbmc7XG4gICAgICBjb25zdCBzdHJpY3RKU09OUGFyc2luZyA9ICFzaWxlbnRKU09OUGFyc2luZyAmJiBKU09OUmVxdWVzdGVkO1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKHN0cmljdEpTT05QYXJzaW5nKSB7XG4gICAgICAgICAgaWYgKGUubmFtZSA9PT0gJ1N5bnRheEVycm9yJykge1xuICAgICAgICAgICAgdGhyb3cgQXhpb3NFcnJvci5mcm9tKGUsIEF4aW9zRXJyb3IuRVJSX0JBRF9SRVNQT05TRSwgdGhpcywgbnVsbCwgdGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgLyoqXG4gICAqIEEgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgdG8gYWJvcnQgYSByZXF1ZXN0LiBJZiBzZXQgdG8gMCAoZGVmYXVsdCkgYVxuICAgKiB0aW1lb3V0IGlzIG5vdCBjcmVhdGVkLlxuICAgKi9cbiAgdGltZW91dDogMCxcblxuICB4c3JmQ29va2llTmFtZTogJ1hTUkYtVE9LRU4nLFxuICB4c3JmSGVhZGVyTmFtZTogJ1gtWFNSRi1UT0tFTicsXG5cbiAgbWF4Q29udGVudExlbmd0aDogLTEsXG4gIG1heEJvZHlMZW5ndGg6IC0xLFxuXG4gIGVudjoge1xuICAgIEZvcm1EYXRhOiBwbGF0Zm9ybS5jbGFzc2VzLkZvcm1EYXRhLFxuICAgIEJsb2I6IHBsYXRmb3JtLmNsYXNzZXMuQmxvYlxuICB9LFxuXG4gIHZhbGlkYXRlU3RhdHVzOiBmdW5jdGlvbiB2YWxpZGF0ZVN0YXR1cyhzdGF0dXMpIHtcbiAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gIH0sXG5cbiAgaGVhZGVyczoge1xuICAgIGNvbW1vbjoge1xuICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L3BsYWluLCAqLyonXG4gICAgfVxuICB9XG59O1xuXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHt9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHV0aWxzLm1lcmdlKERFRkFVTFRfQ09OVEVOVF9UWVBFKTtcbn0pO1xuXG52YXIgZGVmYXVsdHMkMSA9IGRlZmF1bHRzO1xuXG4vLyBSYXdBeGlvc0hlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXG4vLyBjLmYuIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2h0dHBfbWVzc2FnZV9oZWFkZXJzXG5jb25zdCBpZ25vcmVEdXBsaWNhdGVPZiA9IHV0aWxzLnRvT2JqZWN0U2V0KFtcbiAgJ2FnZScsICdhdXRob3JpemF0aW9uJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2NvbnRlbnQtdHlwZScsICdldGFnJyxcbiAgJ2V4cGlyZXMnLCAnZnJvbScsICdob3N0JywgJ2lmLW1vZGlmaWVkLXNpbmNlJywgJ2lmLXVubW9kaWZpZWQtc2luY2UnLFxuICAnbGFzdC1tb2RpZmllZCcsICdsb2NhdGlvbicsICdtYXgtZm9yd2FyZHMnLCAncHJveHktYXV0aG9yaXphdGlvbicsXG4gICdyZWZlcmVyJywgJ3JldHJ5LWFmdGVyJywgJ3VzZXItYWdlbnQnXG5dKTtcblxuLyoqXG4gKiBQYXJzZSBoZWFkZXJzIGludG8gYW4gb2JqZWN0XG4gKlxuICogYGBgXG4gKiBEYXRlOiBXZWQsIDI3IEF1ZyAyMDE0IDA4OjU4OjQ5IEdNVFxuICogQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXG4gKiBUcmFuc2Zlci1FbmNvZGluZzogY2h1bmtlZFxuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHJhd0hlYWRlcnMgSGVhZGVycyBuZWVkaW5nIHRvIGJlIHBhcnNlZFxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9IEhlYWRlcnMgcGFyc2VkIGludG8gYW4gb2JqZWN0XG4gKi9cbnZhciBwYXJzZUhlYWRlcnMgPSByYXdIZWFkZXJzID0+IHtcbiAgY29uc3QgcGFyc2VkID0ge307XG4gIGxldCBrZXk7XG4gIGxldCB2YWw7XG4gIGxldCBpO1xuXG4gIHJhd0hlYWRlcnMgJiYgcmF3SGVhZGVycy5zcGxpdCgnXFxuJykuZm9yRWFjaChmdW5jdGlvbiBwYXJzZXIobGluZSkge1xuICAgIGkgPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBrZXkgPSBsaW5lLnN1YnN0cmluZygwLCBpKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSBsaW5lLnN1YnN0cmluZyhpICsgMSkudHJpbSgpO1xuXG4gICAgaWYgKCFrZXkgfHwgKHBhcnNlZFtrZXldICYmIGlnbm9yZUR1cGxpY2F0ZU9mW2tleV0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XG4gICAgICBpZiAocGFyc2VkW2tleV0pIHtcbiAgICAgICAgcGFyc2VkW2tleV0ucHVzaCh2YWwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkW2tleV0gPSBbdmFsXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGFyc2VkW2tleV0gPSBwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldICsgJywgJyArIHZhbCA6IHZhbDtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwYXJzZWQ7XG59O1xuXG5jb25zdCAkaW50ZXJuYWxzID0gU3ltYm9sKCdpbnRlcm5hbHMnKTtcblxuZnVuY3Rpb24gbm9ybWFsaXplSGVhZGVyKGhlYWRlcikge1xuICByZXR1cm4gaGVhZGVyICYmIFN0cmluZyhoZWFkZXIpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IGZhbHNlIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gdXRpbHMuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5tYXAobm9ybWFsaXplVmFsdWUpIDogU3RyaW5nKHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUb2tlbnMoc3RyKSB7XG4gIGNvbnN0IHRva2VucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGNvbnN0IHRva2Vuc1JFID0gLyhbXlxccyw7PV0rKVxccyooPzo9XFxzKihbXiw7XSspKT8vZztcbiAgbGV0IG1hdGNoO1xuXG4gIHdoaWxlICgobWF0Y2ggPSB0b2tlbnNSRS5leGVjKHN0cikpKSB7XG4gICAgdG9rZW5zW21hdGNoWzFdXSA9IG1hdGNoWzJdO1xuICB9XG5cbiAgcmV0dXJuIHRva2Vucztcbn1cblxuY29uc3QgaXNWYWxpZEhlYWRlck5hbWUgPSAoc3RyKSA9PiAvXlstX2EtekEtWjAtOV5gfH4sISMkJSYnKisuXSskLy50ZXN0KHN0ci50cmltKCkpO1xuXG5mdW5jdGlvbiBtYXRjaEhlYWRlclZhbHVlKGNvbnRleHQsIHZhbHVlLCBoZWFkZXIsIGZpbHRlciwgaXNIZWFkZXJOYW1lRmlsdGVyKSB7XG4gIGlmICh1dGlscy5pc0Z1bmN0aW9uKGZpbHRlcikpIHtcbiAgICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcywgdmFsdWUsIGhlYWRlcik7XG4gIH1cblxuICBpZiAoaXNIZWFkZXJOYW1lRmlsdGVyKSB7XG4gICAgdmFsdWUgPSBoZWFkZXI7XG4gIH1cblxuICBpZiAoIXV0aWxzLmlzU3RyaW5nKHZhbHVlKSkgcmV0dXJuO1xuXG4gIGlmICh1dGlscy5pc1N0cmluZyhmaWx0ZXIpKSB7XG4gICAgcmV0dXJuIHZhbHVlLmluZGV4T2YoZmlsdGVyKSAhPT0gLTE7XG4gIH1cblxuICBpZiAodXRpbHMuaXNSZWdFeHAoZmlsdGVyKSkge1xuICAgIHJldHVybiBmaWx0ZXIudGVzdCh2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZm9ybWF0SGVhZGVyKGhlYWRlcikge1xuICByZXR1cm4gaGVhZGVyLnRyaW0oKVxuICAgIC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyhbYS16XFxkXSkoXFx3KikvZywgKHcsIGNoYXIsIHN0cikgPT4ge1xuICAgICAgcmV0dXJuIGNoYXIudG9VcHBlckNhc2UoKSArIHN0cjtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gYnVpbGRBY2Nlc3NvcnMob2JqLCBoZWFkZXIpIHtcbiAgY29uc3QgYWNjZXNzb3JOYW1lID0gdXRpbHMudG9DYW1lbENhc2UoJyAnICsgaGVhZGVyKTtcblxuICBbJ2dldCcsICdzZXQnLCAnaGFzJ10uZm9yRWFjaChtZXRob2ROYW1lID0+IHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBtZXRob2ROYW1lICsgYWNjZXNzb3JOYW1lLCB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb24oYXJnMSwgYXJnMiwgYXJnMykge1xuICAgICAgICByZXR1cm4gdGhpc1ttZXRob2ROYW1lXS5jYWxsKHRoaXMsIGhlYWRlciwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICB9LFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH0pO1xufVxuXG5jbGFzcyBBeGlvc0hlYWRlcnMge1xuICBjb25zdHJ1Y3RvcihoZWFkZXJzKSB7XG4gICAgaGVhZGVycyAmJiB0aGlzLnNldChoZWFkZXJzKTtcbiAgfVxuXG4gIHNldChoZWFkZXIsIHZhbHVlT3JSZXdyaXRlLCByZXdyaXRlKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBzZXRIZWFkZXIoX3ZhbHVlLCBfaGVhZGVyLCBfcmV3cml0ZSkge1xuICAgICAgY29uc3QgbEhlYWRlciA9IG5vcm1hbGl6ZUhlYWRlcihfaGVhZGVyKTtcblxuICAgICAgaWYgKCFsSGVhZGVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignaGVhZGVyIG5hbWUgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qga2V5ID0gdXRpbHMuZmluZEtleShzZWxmLCBsSGVhZGVyKTtcblxuICAgICAgaWYoIWtleSB8fCBzZWxmW2tleV0gPT09IHVuZGVmaW5lZCB8fCBfcmV3cml0ZSA9PT0gdHJ1ZSB8fCAoX3Jld3JpdGUgPT09IHVuZGVmaW5lZCAmJiBzZWxmW2tleV0gIT09IGZhbHNlKSkge1xuICAgICAgICBzZWxmW2tleSB8fCBfaGVhZGVyXSA9IG5vcm1hbGl6ZVZhbHVlKF92YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc2V0SGVhZGVycyA9IChoZWFkZXJzLCBfcmV3cml0ZSkgPT5cbiAgICAgIHV0aWxzLmZvckVhY2goaGVhZGVycywgKF92YWx1ZSwgX2hlYWRlcikgPT4gc2V0SGVhZGVyKF92YWx1ZSwgX2hlYWRlciwgX3Jld3JpdGUpKTtcblxuICAgIGlmICh1dGlscy5pc1BsYWluT2JqZWN0KGhlYWRlcikgfHwgaGVhZGVyIGluc3RhbmNlb2YgdGhpcy5jb25zdHJ1Y3Rvcikge1xuICAgICAgc2V0SGVhZGVycyhoZWFkZXIsIHZhbHVlT3JSZXdyaXRlKTtcbiAgICB9IGVsc2UgaWYodXRpbHMuaXNTdHJpbmcoaGVhZGVyKSAmJiAoaGVhZGVyID0gaGVhZGVyLnRyaW0oKSkgJiYgIWlzVmFsaWRIZWFkZXJOYW1lKGhlYWRlcikpIHtcbiAgICAgIHNldEhlYWRlcnMocGFyc2VIZWFkZXJzKGhlYWRlciksIHZhbHVlT3JSZXdyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGVhZGVyICE9IG51bGwgJiYgc2V0SGVhZGVyKHZhbHVlT3JSZXdyaXRlLCBoZWFkZXIsIHJld3JpdGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZ2V0KGhlYWRlciwgcGFyc2VyKSB7XG4gICAgaGVhZGVyID0gbm9ybWFsaXplSGVhZGVyKGhlYWRlcik7XG5cbiAgICBpZiAoaGVhZGVyKSB7XG4gICAgICBjb25zdCBrZXkgPSB1dGlscy5maW5kS2V5KHRoaXMsIGhlYWRlcik7XG5cbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzW2tleV07XG5cbiAgICAgICAgaWYgKCFwYXJzZXIpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFyc2VyID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlVG9rZW5zKHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc0Z1bmN0aW9uKHBhcnNlcikpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VyLmNhbGwodGhpcywgdmFsdWUsIGtleSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNSZWdFeHAocGFyc2VyKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZXIuZXhlYyh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwYXJzZXIgbXVzdCBiZSBib29sZWFufHJlZ2V4cHxmdW5jdGlvbicpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhcyhoZWFkZXIsIG1hdGNoZXIpIHtcbiAgICBoZWFkZXIgPSBub3JtYWxpemVIZWFkZXIoaGVhZGVyKTtcblxuICAgIGlmIChoZWFkZXIpIHtcbiAgICAgIGNvbnN0IGtleSA9IHV0aWxzLmZpbmRLZXkodGhpcywgaGVhZGVyKTtcblxuICAgICAgcmV0dXJuICEhKGtleSAmJiB0aGlzW2tleV0gIT09IHVuZGVmaW5lZCAmJiAoIW1hdGNoZXIgfHwgbWF0Y2hIZWFkZXJWYWx1ZSh0aGlzLCB0aGlzW2tleV0sIGtleSwgbWF0Y2hlcikpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBkZWxldGUoaGVhZGVyLCBtYXRjaGVyKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgbGV0IGRlbGV0ZWQgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGRlbGV0ZUhlYWRlcihfaGVhZGVyKSB7XG4gICAgICBfaGVhZGVyID0gbm9ybWFsaXplSGVhZGVyKF9oZWFkZXIpO1xuXG4gICAgICBpZiAoX2hlYWRlcikge1xuICAgICAgICBjb25zdCBrZXkgPSB1dGlscy5maW5kS2V5KHNlbGYsIF9oZWFkZXIpO1xuXG4gICAgICAgIGlmIChrZXkgJiYgKCFtYXRjaGVyIHx8IG1hdGNoSGVhZGVyVmFsdWUoc2VsZiwgc2VsZltrZXldLCBrZXksIG1hdGNoZXIpKSkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmW2tleV07XG5cbiAgICAgICAgICBkZWxldGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh1dGlscy5pc0FycmF5KGhlYWRlcikpIHtcbiAgICAgIGhlYWRlci5mb3JFYWNoKGRlbGV0ZUhlYWRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZUhlYWRlcihoZWFkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWxldGVkO1xuICB9XG5cbiAgY2xlYXIobWF0Y2hlcikge1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKTtcbiAgICBsZXQgaSA9IGtleXMubGVuZ3RoO1xuICAgIGxldCBkZWxldGVkID0gZmFsc2U7XG5cbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYoIW1hdGNoZXIgfHwgbWF0Y2hIZWFkZXJWYWx1ZSh0aGlzLCB0aGlzW2tleV0sIGtleSwgbWF0Y2hlciwgdHJ1ZSkpIHtcbiAgICAgICAgZGVsZXRlIHRoaXNba2V5XTtcbiAgICAgICAgZGVsZXRlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGV0ZWQ7XG4gIH1cblxuICBub3JtYWxpemUoZm9ybWF0KSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgaGVhZGVycyA9IHt9O1xuXG4gICAgdXRpbHMuZm9yRWFjaCh0aGlzLCAodmFsdWUsIGhlYWRlcikgPT4ge1xuICAgICAgY29uc3Qga2V5ID0gdXRpbHMuZmluZEtleShoZWFkZXJzLCBoZWFkZXIpO1xuXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHNlbGZba2V5XSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgZGVsZXRlIHNlbGZbaGVhZGVyXTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBub3JtYWxpemVkID0gZm9ybWF0ID8gZm9ybWF0SGVhZGVyKGhlYWRlcikgOiBTdHJpbmcoaGVhZGVyKS50cmltKCk7XG5cbiAgICAgIGlmIChub3JtYWxpemVkICE9PSBoZWFkZXIpIHtcbiAgICAgICAgZGVsZXRlIHNlbGZbaGVhZGVyXTtcbiAgICAgIH1cblxuICAgICAgc2VsZltub3JtYWxpemVkXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKTtcblxuICAgICAgaGVhZGVyc1tub3JtYWxpemVkXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGNvbmNhdCguLi50YXJnZXRzKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IuY29uY2F0KHRoaXMsIC4uLnRhcmdldHMpO1xuICB9XG5cbiAgdG9KU09OKGFzU3RyaW5ncykge1xuICAgIGNvbnN0IG9iaiA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICB1dGlscy5mb3JFYWNoKHRoaXMsICh2YWx1ZSwgaGVhZGVyKSA9PiB7XG4gICAgICB2YWx1ZSAhPSBudWxsICYmIHZhbHVlICE9PSBmYWxzZSAmJiAob2JqW2hlYWRlcl0gPSBhc1N0cmluZ3MgJiYgdXRpbHMuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5qb2luKCcsICcpIDogdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiBPYmplY3QuZW50cmllcyh0aGlzLnRvSlNPTigpKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmVudHJpZXModGhpcy50b0pTT04oKSkubWFwKChbaGVhZGVyLCB2YWx1ZV0pID0+IGhlYWRlciArICc6ICcgKyB2YWx1ZSkuam9pbignXFxuJyk7XG4gIH1cblxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7XG4gICAgcmV0dXJuICdBeGlvc0hlYWRlcnMnO1xuICB9XG5cbiAgc3RhdGljIGZyb20odGhpbmcpIHtcbiAgICByZXR1cm4gdGhpbmcgaW5zdGFuY2VvZiB0aGlzID8gdGhpbmcgOiBuZXcgdGhpcyh0aGluZyk7XG4gIH1cblxuICBzdGF0aWMgY29uY2F0KGZpcnN0LCAuLi50YXJnZXRzKSB7XG4gICAgY29uc3QgY29tcHV0ZWQgPSBuZXcgdGhpcyhmaXJzdCk7XG5cbiAgICB0YXJnZXRzLmZvckVhY2goKHRhcmdldCkgPT4gY29tcHV0ZWQuc2V0KHRhcmdldCkpO1xuXG4gICAgcmV0dXJuIGNvbXB1dGVkO1xuICB9XG5cbiAgc3RhdGljIGFjY2Vzc29yKGhlYWRlcikge1xuICAgIGNvbnN0IGludGVybmFscyA9IHRoaXNbJGludGVybmFsc10gPSAodGhpc1skaW50ZXJuYWxzXSA9IHtcbiAgICAgIGFjY2Vzc29yczoge31cbiAgICB9KTtcblxuICAgIGNvbnN0IGFjY2Vzc29ycyA9IGludGVybmFscy5hY2Nlc3NvcnM7XG4gICAgY29uc3QgcHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG5cbiAgICBmdW5jdGlvbiBkZWZpbmVBY2Nlc3NvcihfaGVhZGVyKSB7XG4gICAgICBjb25zdCBsSGVhZGVyID0gbm9ybWFsaXplSGVhZGVyKF9oZWFkZXIpO1xuXG4gICAgICBpZiAoIWFjY2Vzc29yc1tsSGVhZGVyXSkge1xuICAgICAgICBidWlsZEFjY2Vzc29ycyhwcm90b3R5cGUsIF9oZWFkZXIpO1xuICAgICAgICBhY2Nlc3NvcnNbbEhlYWRlcl0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHV0aWxzLmlzQXJyYXkoaGVhZGVyKSA/IGhlYWRlci5mb3JFYWNoKGRlZmluZUFjY2Vzc29yKSA6IGRlZmluZUFjY2Vzc29yKGhlYWRlcik7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG5BeGlvc0hlYWRlcnMuYWNjZXNzb3IoWydDb250ZW50LVR5cGUnLCAnQ29udGVudC1MZW5ndGgnLCAnQWNjZXB0JywgJ0FjY2VwdC1FbmNvZGluZycsICdVc2VyLUFnZW50JywgJ0F1dGhvcml6YXRpb24nXSk7XG5cbnV0aWxzLmZyZWV6ZU1ldGhvZHMoQXhpb3NIZWFkZXJzLnByb3RvdHlwZSk7XG51dGlscy5mcmVlemVNZXRob2RzKEF4aW9zSGVhZGVycyk7XG5cbnZhciBBeGlvc0hlYWRlcnMkMSA9IEF4aW9zSGVhZGVycztcblxuLyoqXG4gKiBUcmFuc2Zvcm0gdGhlIGRhdGEgZm9yIGEgcmVxdWVzdCBvciBhIHJlc3BvbnNlXG4gKlxuICogQHBhcmFtIHtBcnJheXxGdW5jdGlvbn0gZm5zIEEgc2luZ2xlIGZ1bmN0aW9uIG9yIEFycmF5IG9mIGZ1bmN0aW9uc1xuICogQHBhcmFtIHs/T2JqZWN0fSByZXNwb25zZSBUaGUgcmVzcG9uc2Ugb2JqZWN0XG4gKlxuICogQHJldHVybnMgeyp9IFRoZSByZXN1bHRpbmcgdHJhbnNmb3JtZWQgZGF0YVxuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGZucywgcmVzcG9uc2UpIHtcbiAgY29uc3QgY29uZmlnID0gdGhpcyB8fCBkZWZhdWx0cyQxO1xuICBjb25zdCBjb250ZXh0ID0gcmVzcG9uc2UgfHwgY29uZmlnO1xuICBjb25zdCBoZWFkZXJzID0gQXhpb3NIZWFkZXJzJDEuZnJvbShjb250ZXh0LmhlYWRlcnMpO1xuICBsZXQgZGF0YSA9IGNvbnRleHQuZGF0YTtcblxuICB1dGlscy5mb3JFYWNoKGZucywgZnVuY3Rpb24gdHJhbnNmb3JtKGZuKSB7XG4gICAgZGF0YSA9IGZuLmNhbGwoY29uZmlnLCBkYXRhLCBoZWFkZXJzLm5vcm1hbGl6ZSgpLCByZXNwb25zZSA/IHJlc3BvbnNlLnN0YXR1cyA6IHVuZGVmaW5lZCk7XG4gIH0pO1xuXG4gIGhlYWRlcnMubm9ybWFsaXplKCk7XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIGlzQ2FuY2VsKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcbn1cblxuLyoqXG4gKiBBIGBDYW5jZWxlZEVycm9yYCBpcyBhbiBvYmplY3QgdGhhdCBpcyB0aHJvd24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FuY2VsZWQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmc9fSBtZXNzYWdlIFRoZSBtZXNzYWdlLlxuICogQHBhcmFtIHtPYmplY3Q9fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcmVxdWVzdCBUaGUgcmVxdWVzdC5cbiAqXG4gKiBAcmV0dXJucyB7Q2FuY2VsZWRFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXG4gKi9cbmZ1bmN0aW9uIENhbmNlbGVkRXJyb3IobWVzc2FnZSwgY29uZmlnLCByZXF1ZXN0KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1lcS1udWxsLGVxZXFlcVxuICBBeGlvc0Vycm9yLmNhbGwodGhpcywgbWVzc2FnZSA9PSBudWxsID8gJ2NhbmNlbGVkJyA6IG1lc3NhZ2UsIEF4aW9zRXJyb3IuRVJSX0NBTkNFTEVELCBjb25maWcsIHJlcXVlc3QpO1xuICB0aGlzLm5hbWUgPSAnQ2FuY2VsZWRFcnJvcic7XG59XG5cbnV0aWxzLmluaGVyaXRzKENhbmNlbGVkRXJyb3IsIEF4aW9zRXJyb3IsIHtcbiAgX19DQU5DRUxfXzogdHJ1ZVxufSk7XG5cbi8qKlxuICogUmVzb2x2ZSBvciByZWplY3QgYSBQcm9taXNlIGJhc2VkIG9uIHJlc3BvbnNlIHN0YXR1cy5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIEEgZnVuY3Rpb24gdGhhdCByZXNvbHZlcyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBBIGZ1bmN0aW9uIHRoYXQgcmVqZWN0cyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSBUaGUgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybnMge29iamVjdH0gVGhlIHJlc3BvbnNlLlxuICovXG5mdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSkge1xuICBjb25zdCB2YWxpZGF0ZVN0YXR1cyA9IHJlc3BvbnNlLmNvbmZpZy52YWxpZGF0ZVN0YXR1cztcbiAgaWYgKCFyZXNwb25zZS5zdGF0dXMgfHwgIXZhbGlkYXRlU3RhdHVzIHx8IHZhbGlkYXRlU3RhdHVzKHJlc3BvbnNlLnN0YXR1cykpIHtcbiAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZWplY3QobmV3IEF4aW9zRXJyb3IoXG4gICAgICAnUmVxdWVzdCBmYWlsZWQgd2l0aCBzdGF0dXMgY29kZSAnICsgcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgW0F4aW9zRXJyb3IuRVJSX0JBRF9SRVFVRVNULCBBeGlvc0Vycm9yLkVSUl9CQURfUkVTUE9OU0VdW01hdGguZmxvb3IocmVzcG9uc2Uuc3RhdHVzIC8gMTAwKSAtIDRdLFxuICAgICAgcmVzcG9uc2UuY29uZmlnLFxuICAgICAgcmVzcG9uc2UucmVxdWVzdCxcbiAgICAgIHJlc3BvbnNlXG4gICAgKSk7XG4gIH1cbn1cblxudmFyIGNvb2tpZXMgPSBwbGF0Zm9ybS5pc1N0YW5kYXJkQnJvd3NlckVudiA/XG5cbi8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XG4gICAgICAgIGNvbnN0IGNvb2tpZSA9IFtdO1xuICAgICAgICBjb29raWUucHVzaChuYW1lICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzTnVtYmVyKGV4cGlyZXMpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2V4cGlyZXM9JyArIG5ldyBEYXRlKGV4cGlyZXMpLnRvR01UU3RyaW5nKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKHBhdGgpKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3BhdGg9JyArIHBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzU3RyaW5nKGRvbWFpbikpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZG9tYWluPScgKyBkb21haW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlY3VyZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdzZWN1cmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZS5qb2luKCc7ICcpO1xuICAgICAgfSxcblxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZChuYW1lKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gZG9jdW1lbnQuY29va2llLm1hdGNoKG5ldyBSZWdFeHAoJyhefDtcXFxccyopKCcgKyBuYW1lICsgJyk9KFteO10qKScpKTtcbiAgICAgICAgcmV0dXJuIChtYXRjaCA/IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaFszXSkgOiBudWxsKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcbiAgICAgICAgdGhpcy53cml0ZShuYW1lLCAnJywgRGF0ZS5ub3coKSAtIDg2NDAwMDAwKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KSgpIDpcblxuLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52ICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUoKSB7fSxcbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoKSB7fVxuICAgIH07XG4gIH0pKCk7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgVVJMIGlzIGFic29sdXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgVVJMIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQWJzb2x1dGVVUkwodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkK1xcLS5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFVSTCBieSBjb21iaW5pbmcgdGhlIHNwZWNpZmllZCBVUkxzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVsYXRpdmVVUkwgVGhlIHJlbGF0aXZlIFVSTFxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xuZnVuY3Rpb24gY29tYmluZVVSTHMoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIHJlbGF0aXZlVVJMXG4gICAgPyBiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpICsgJy8nICsgcmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJylcbiAgICA6IGJhc2VVUkw7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBiYXNlVVJMIHdpdGggdGhlIHJlcXVlc3RlZFVSTCxcbiAqIG9ubHkgd2hlbiB0aGUgcmVxdWVzdGVkVVJMIGlzIG5vdCBhbHJlYWR5IGFuIGFic29sdXRlIFVSTC5cbiAqIElmIHRoZSByZXF1ZXN0VVJMIGlzIGFic29sdXRlLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIHJlcXVlc3RlZFVSTCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGJhc2VVUkwgVGhlIGJhc2UgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gcmVxdWVzdGVkVVJMIEFic29sdXRlIG9yIHJlbGF0aXZlIFVSTCB0byBjb21iaW5lXG4gKlxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGNvbWJpbmVkIGZ1bGwgcGF0aFxuICovXG5mdW5jdGlvbiBidWlsZEZ1bGxQYXRoKGJhc2VVUkwsIHJlcXVlc3RlZFVSTCkge1xuICBpZiAoYmFzZVVSTCAmJiAhaXNBYnNvbHV0ZVVSTChyZXF1ZXN0ZWRVUkwpKSB7XG4gICAgcmV0dXJuIGNvbWJpbmVVUkxzKGJhc2VVUkwsIHJlcXVlc3RlZFVSTCk7XG4gIH1cbiAgcmV0dXJuIHJlcXVlc3RlZFVSTDtcbn1cblxudmFyIGlzVVJMU2FtZU9yaWdpbiA9IHBsYXRmb3JtLmlzU3RhbmRhcmRCcm93c2VyRW52ID9cblxuLy8gU3RhbmRhcmQgYnJvd3NlciBlbnZzIGhhdmUgZnVsbCBzdXBwb3J0IG9mIHRoZSBBUElzIG5lZWRlZCB0byB0ZXN0XG4vLyB3aGV0aGVyIHRoZSByZXF1ZXN0IFVSTCBpcyBvZiB0aGUgc2FtZSBvcmlnaW4gYXMgY3VycmVudCBsb2NhdGlvbi5cbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICBjb25zdCBtc2llID0gLyhtc2llfHRyaWRlbnQpL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgICBjb25zdCB1cmxQYXJzaW5nTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBsZXQgb3JpZ2luVVJMO1xuXG4gICAgLyoqXG4gICAgKiBQYXJzZSBhIFVSTCB0byBkaXNjb3ZlciBpdCdzIGNvbXBvbmVudHNcbiAgICAqXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBVUkwgdG8gYmUgcGFyc2VkXG4gICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICovXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVVSTCh1cmwpIHtcbiAgICAgIGxldCBocmVmID0gdXJsO1xuXG4gICAgICBpZiAobXNpZSkge1xuICAgICAgICAvLyBJRSBuZWVkcyBhdHRyaWJ1dGUgc2V0IHR3aWNlIHRvIG5vcm1hbGl6ZSBwcm9wZXJ0aWVzXG4gICAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuICAgICAgICBocmVmID0gdXJsUGFyc2luZ05vZGUuaHJlZjtcbiAgICAgIH1cblxuICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG5cbiAgICAgIC8vIHVybFBhcnNpbmdOb2RlIHByb3ZpZGVzIHRoZSBVcmxVdGlscyBpbnRlcmZhY2UgLSBodHRwOi8vdXJsLnNwZWMud2hhdHdnLm9yZy8jdXJsdXRpbHNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhyZWY6IHVybFBhcnNpbmdOb2RlLmhyZWYsXG4gICAgICAgIHByb3RvY29sOiB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbCA/IHVybFBhcnNpbmdOb2RlLnByb3RvY29sLnJlcGxhY2UoLzokLywgJycpIDogJycsXG4gICAgICAgIGhvc3Q6IHVybFBhcnNpbmdOb2RlLmhvc3QsXG4gICAgICAgIHNlYXJjaDogdXJsUGFyc2luZ05vZGUuc2VhcmNoID8gdXJsUGFyc2luZ05vZGUuc2VhcmNoLnJlcGxhY2UoL15cXD8vLCAnJykgOiAnJyxcbiAgICAgICAgaGFzaDogdXJsUGFyc2luZ05vZGUuaGFzaCA/IHVybFBhcnNpbmdOb2RlLmhhc2gucmVwbGFjZSgvXiMvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdG5hbWU6IHVybFBhcnNpbmdOb2RlLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiB1cmxQYXJzaW5nTm9kZS5wb3J0LFxuICAgICAgICBwYXRobmFtZTogKHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSA/XG4gICAgICAgICAgdXJsUGFyc2luZ05vZGUucGF0aG5hbWUgOlxuICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXG4gICAgICB9O1xuICAgIH1cblxuICAgIG9yaWdpblVSTCA9IHJlc29sdmVVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuXG4gICAgLyoqXG4gICAgKiBEZXRlcm1pbmUgaWYgYSBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiBhcyB0aGUgY3VycmVudCBsb2NhdGlvblxuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxuICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4sIG90aGVyd2lzZSBmYWxzZVxuICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSAodXRpbHMuaXNTdHJpbmcocmVxdWVzdFVSTCkpID8gcmVzb2x2ZVVSTChyZXF1ZXN0VVJMKSA6IHJlcXVlc3RVUkw7XG4gICAgICByZXR1cm4gKHBhcnNlZC5wcm90b2NvbCA9PT0gb3JpZ2luVVJMLnByb3RvY29sICYmXG4gICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnZzICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9KSgpO1xuXG5mdW5jdGlvbiBwYXJzZVByb3RvY29sKHVybCkge1xuICBjb25zdCBtYXRjaCA9IC9eKFstK1xcd117MSwyNX0pKDo/XFwvXFwvfDopLy5leGVjKHVybCk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFsxXSB8fCAnJztcbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgZGF0YSBtYXhSYXRlXG4gKiBAcGFyYW0ge051bWJlcn0gW3NhbXBsZXNDb3VudD0gMTBdXG4gKiBAcGFyYW0ge051bWJlcn0gW21pbj0gMTAwMF1cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gc3BlZWRvbWV0ZXIoc2FtcGxlc0NvdW50LCBtaW4pIHtcbiAgc2FtcGxlc0NvdW50ID0gc2FtcGxlc0NvdW50IHx8IDEwO1xuICBjb25zdCBieXRlcyA9IG5ldyBBcnJheShzYW1wbGVzQ291bnQpO1xuICBjb25zdCB0aW1lc3RhbXBzID0gbmV3IEFycmF5KHNhbXBsZXNDb3VudCk7XG4gIGxldCBoZWFkID0gMDtcbiAgbGV0IHRhaWwgPSAwO1xuICBsZXQgZmlyc3RTYW1wbGVUUztcblxuICBtaW4gPSBtaW4gIT09IHVuZGVmaW5lZCA/IG1pbiA6IDEwMDA7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHB1c2goY2h1bmtMZW5ndGgpIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgY29uc3Qgc3RhcnRlZEF0ID0gdGltZXN0YW1wc1t0YWlsXTtcblxuICAgIGlmICghZmlyc3RTYW1wbGVUUykge1xuICAgICAgZmlyc3RTYW1wbGVUUyA9IG5vdztcbiAgICB9XG5cbiAgICBieXRlc1toZWFkXSA9IGNodW5rTGVuZ3RoO1xuICAgIHRpbWVzdGFtcHNbaGVhZF0gPSBub3c7XG5cbiAgICBsZXQgaSA9IHRhaWw7XG4gICAgbGV0IGJ5dGVzQ291bnQgPSAwO1xuXG4gICAgd2hpbGUgKGkgIT09IGhlYWQpIHtcbiAgICAgIGJ5dGVzQ291bnQgKz0gYnl0ZXNbaSsrXTtcbiAgICAgIGkgPSBpICUgc2FtcGxlc0NvdW50O1xuICAgIH1cblxuICAgIGhlYWQgPSAoaGVhZCArIDEpICUgc2FtcGxlc0NvdW50O1xuXG4gICAgaWYgKGhlYWQgPT09IHRhaWwpIHtcbiAgICAgIHRhaWwgPSAodGFpbCArIDEpICUgc2FtcGxlc0NvdW50O1xuICAgIH1cblxuICAgIGlmIChub3cgLSBmaXJzdFNhbXBsZVRTIDwgbWluKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFzc2VkID0gc3RhcnRlZEF0ICYmIG5vdyAtIHN0YXJ0ZWRBdDtcblxuICAgIHJldHVybiBwYXNzZWQgPyBNYXRoLnJvdW5kKGJ5dGVzQ291bnQgKiAxMDAwIC8gcGFzc2VkKSA6IHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvZ3Jlc3NFdmVudFJlZHVjZXIobGlzdGVuZXIsIGlzRG93bmxvYWRTdHJlYW0pIHtcbiAgbGV0IGJ5dGVzTm90aWZpZWQgPSAwO1xuICBjb25zdCBfc3BlZWRvbWV0ZXIgPSBzcGVlZG9tZXRlcig1MCwgMjUwKTtcblxuICByZXR1cm4gZSA9PiB7XG4gICAgY29uc3QgbG9hZGVkID0gZS5sb2FkZWQ7XG4gICAgY29uc3QgdG90YWwgPSBlLmxlbmd0aENvbXB1dGFibGUgPyBlLnRvdGFsIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHByb2dyZXNzQnl0ZXMgPSBsb2FkZWQgLSBieXRlc05vdGlmaWVkO1xuICAgIGNvbnN0IHJhdGUgPSBfc3BlZWRvbWV0ZXIocHJvZ3Jlc3NCeXRlcyk7XG4gICAgY29uc3QgaW5SYW5nZSA9IGxvYWRlZCA8PSB0b3RhbDtcblxuICAgIGJ5dGVzTm90aWZpZWQgPSBsb2FkZWQ7XG5cbiAgICBjb25zdCBkYXRhID0ge1xuICAgICAgbG9hZGVkLFxuICAgICAgdG90YWwsXG4gICAgICBwcm9ncmVzczogdG90YWwgPyAobG9hZGVkIC8gdG90YWwpIDogdW5kZWZpbmVkLFxuICAgICAgYnl0ZXM6IHByb2dyZXNzQnl0ZXMsXG4gICAgICByYXRlOiByYXRlID8gcmF0ZSA6IHVuZGVmaW5lZCxcbiAgICAgIGVzdGltYXRlZDogcmF0ZSAmJiB0b3RhbCAmJiBpblJhbmdlID8gKHRvdGFsIC0gbG9hZGVkKSAvIHJhdGUgOiB1bmRlZmluZWQsXG4gICAgICBldmVudDogZVxuICAgIH07XG5cbiAgICBkYXRhW2lzRG93bmxvYWRTdHJlYW0gPyAnZG93bmxvYWQnIDogJ3VwbG9hZCddID0gdHJ1ZTtcblxuICAgIGxpc3RlbmVyKGRhdGEpO1xuICB9O1xufVxuXG5jb25zdCBpc1hIUkFkYXB0ZXJTdXBwb3J0ZWQgPSB0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnO1xuXG52YXIgeGhyQWRhcHRlciA9IGlzWEhSQWRhcHRlclN1cHBvcnRlZCAmJiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBkaXNwYXRjaFhoclJlcXVlc3QocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgbGV0IHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XG4gICAgY29uc3QgcmVxdWVzdEhlYWRlcnMgPSBBeGlvc0hlYWRlcnMkMS5mcm9tKGNvbmZpZy5oZWFkZXJzKS5ub3JtYWxpemUoKTtcbiAgICBjb25zdCByZXNwb25zZVR5cGUgPSBjb25maWcucmVzcG9uc2VUeXBlO1xuICAgIGxldCBvbkNhbmNlbGVkO1xuICAgIGZ1bmN0aW9uIGRvbmUoKSB7XG4gICAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgICAgIGNvbmZpZy5jYW5jZWxUb2tlbi51bnN1YnNjcmliZShvbkNhbmNlbGVkKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5zaWduYWwpIHtcbiAgICAgICAgY29uZmlnLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQ2FuY2VsZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh1dGlscy5pc0Zvcm1EYXRhKHJlcXVlc3REYXRhKSkge1xuICAgICAgaWYgKHBsYXRmb3JtLmlzU3RhbmRhcmRCcm93c2VyRW52IHx8IHBsYXRmb3JtLmlzU3RhbmRhcmRCcm93c2VyV2ViV29ya2VyRW52KSB7XG4gICAgICAgIHJlcXVlc3RIZWFkZXJzLnNldENvbnRlbnRUeXBlKGZhbHNlKTsgLy8gTGV0IHRoZSBicm93c2VyIHNldCBpdFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdEhlYWRlcnMuc2V0Q29udGVudFR5cGUoJ211bHRpcGFydC9mb3JtLWRhdGE7JywgZmFsc2UpOyAvLyBtb2JpbGUvZGVza3RvcCBhcHAgZnJhbWV3b3Jrc1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XG4gICAgICBjb25zdCB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgY29uc3QgcGFzc3dvcmQgPSBjb25maWcuYXV0aC5wYXNzd29yZCA/IHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChjb25maWcuYXV0aC5wYXNzd29yZCkpIDogJyc7XG4gICAgICByZXF1ZXN0SGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCAnQmFzaWMgJyArIGJ0b2EodXNlcm5hbWUgKyAnOicgKyBwYXNzd29yZCkpO1xuICAgIH1cblxuICAgIGNvbnN0IGZ1bGxQYXRoID0gYnVpbGRGdWxsUGF0aChjb25maWcuYmFzZVVSTCwgY29uZmlnLnVybCk7XG5cbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChmdWxsUGF0aCwgY29uZmlnLnBhcmFtcywgY29uZmlnLnBhcmFtc1NlcmlhbGl6ZXIpLCB0cnVlKTtcblxuICAgIC8vIFNldCB0aGUgcmVxdWVzdCB0aW1lb3V0IGluIE1TXG4gICAgcmVxdWVzdC50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG5cbiAgICBmdW5jdGlvbiBvbmxvYWRlbmQoKSB7XG4gICAgICBpZiAoIXJlcXVlc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcbiAgICAgIGNvbnN0IHJlc3BvbnNlSGVhZGVycyA9IEF4aW9zSGVhZGVycyQxLmZyb20oXG4gICAgICAgICdnZXRBbGxSZXNwb25zZUhlYWRlcnMnIGluIHJlcXVlc3QgJiYgcmVxdWVzdC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKVxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc3BvbnNlRGF0YSA9ICFyZXNwb25zZVR5cGUgfHwgcmVzcG9uc2VUeXBlID09PSAndGV4dCcgfHwgcmVzcG9uc2VUeXBlID09PSAnanNvbicgP1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICBjb25zdCByZXNwb25zZSA9IHtcbiAgICAgICAgZGF0YTogcmVzcG9uc2VEYXRhLFxuICAgICAgICBzdGF0dXM6IHJlcXVlc3Quc3RhdHVzLFxuICAgICAgICBzdGF0dXNUZXh0OiByZXF1ZXN0LnN0YXR1c1RleHQsXG4gICAgICAgIGhlYWRlcnM6IHJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgY29uZmlnLFxuICAgICAgICByZXF1ZXN0XG4gICAgICB9O1xuXG4gICAgICBzZXR0bGUoZnVuY3Rpb24gX3Jlc29sdmUodmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH0sIGZ1bmN0aW9uIF9yZWplY3QoZXJyKSB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9LCByZXNwb25zZSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICgnb25sb2FkZW5kJyBpbiByZXF1ZXN0KSB7XG4gICAgICAvLyBVc2Ugb25sb2FkZW5kIGlmIGF2YWlsYWJsZVxuICAgICAgcmVxdWVzdC5vbmxvYWRlbmQgPSBvbmxvYWRlbmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIExpc3RlbiBmb3IgcmVhZHkgc3RhdGUgdG8gZW11bGF0ZSBvbmxvYWRlbmRcbiAgICAgIHJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gaGFuZGxlTG9hZCgpIHtcbiAgICAgICAgaWYgKCFyZXF1ZXN0IHx8IHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSByZXF1ZXN0IGVycm9yZWQgb3V0IGFuZCB3ZSBkaWRuJ3QgZ2V0IGEgcmVzcG9uc2UsIHRoaXMgd2lsbCBiZVxuICAgICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxuICAgICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xuICAgICAgICAvLyB3aWxsIHJldHVybiBzdGF0dXMgYXMgMCBldmVuIHRob3VnaCBpdCdzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0XG4gICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyByZWFkeXN0YXRlIGhhbmRsZXIgaXMgY2FsbGluZyBiZWZvcmUgb25lcnJvciBvciBvbnRpbWVvdXQgaGFuZGxlcnMsXG4gICAgICAgIC8vIHNvIHdlIHNob3VsZCBjYWxsIG9ubG9hZGVuZCBvbiB0aGUgbmV4dCAndGljaydcbiAgICAgICAgc2V0VGltZW91dChvbmxvYWRlbmQpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgYnJvd3NlciByZXF1ZXN0IGNhbmNlbGxhdGlvbiAoYXMgb3Bwb3NlZCB0byBhIG1hbnVhbCBjYW5jZWxsYXRpb24pXG4gICAgcmVxdWVzdC5vbmFib3J0ID0gZnVuY3Rpb24gaGFuZGxlQWJvcnQoKSB7XG4gICAgICBpZiAoIXJlcXVlc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZWplY3QobmV3IEF4aW9zRXJyb3IoJ1JlcXVlc3QgYWJvcnRlZCcsIEF4aW9zRXJyb3IuRUNPTk5BQk9SVEVELCBjb25maWcsIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSBsb3cgbGV2ZWwgbmV0d29yayBlcnJvcnNcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiBoYW5kbGVFcnJvcigpIHtcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxuICAgICAgLy8gb25lcnJvciBzaG91bGQgb25seSBmaXJlIGlmIGl0J3MgYSBuZXR3b3JrIGVycm9yXG4gICAgICByZWplY3QobmV3IEF4aW9zRXJyb3IoJ05ldHdvcmsgRXJyb3InLCBBeGlvc0Vycm9yLkVSUl9ORVRXT1JLLCBjb25maWcsIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSB0aW1lb3V0XG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xuICAgICAgbGV0IHRpbWVvdXRFcnJvck1lc3NhZ2UgPSBjb25maWcudGltZW91dCA/ICd0aW1lb3V0IG9mICcgKyBjb25maWcudGltZW91dCArICdtcyBleGNlZWRlZCcgOiAndGltZW91dCBleGNlZWRlZCc7XG4gICAgICBjb25zdCB0cmFuc2l0aW9uYWwgPSBjb25maWcudHJhbnNpdGlvbmFsIHx8IHRyYW5zaXRpb25hbERlZmF1bHRzO1xuICAgICAgaWYgKGNvbmZpZy50aW1lb3V0RXJyb3JNZXNzYWdlKSB7XG4gICAgICAgIHRpbWVvdXRFcnJvck1lc3NhZ2UgPSBjb25maWcudGltZW91dEVycm9yTWVzc2FnZTtcbiAgICAgIH1cbiAgICAgIHJlamVjdChuZXcgQXhpb3NFcnJvcihcbiAgICAgICAgdGltZW91dEVycm9yTWVzc2FnZSxcbiAgICAgICAgdHJhbnNpdGlvbmFsLmNsYXJpZnlUaW1lb3V0RXJyb3IgPyBBeGlvc0Vycm9yLkVUSU1FRE9VVCA6IEF4aW9zRXJyb3IuRUNPTk5BQk9SVEVELFxuICAgICAgICBjb25maWcsXG4gICAgICAgIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxuICAgIC8vIFNwZWNpZmljYWxseSBub3QgaWYgd2UncmUgaW4gYSB3ZWIgd29ya2VyLCBvciByZWFjdC1uYXRpdmUuXG4gICAgaWYgKHBsYXRmb3JtLmlzU3RhbmRhcmRCcm93c2VyRW52KSB7XG4gICAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAgIGNvbnN0IHhzcmZWYWx1ZSA9IChjb25maWcud2l0aENyZWRlbnRpYWxzIHx8IGlzVVJMU2FtZU9yaWdpbihmdWxsUGF0aCkpXG4gICAgICAgICYmIGNvbmZpZy54c3JmQ29va2llTmFtZSAmJiBjb29raWVzLnJlYWQoY29uZmlnLnhzcmZDb29raWVOYW1lKTtcblxuICAgICAgaWYgKHhzcmZWYWx1ZSkge1xuICAgICAgICByZXF1ZXN0SGVhZGVycy5zZXQoY29uZmlnLnhzcmZIZWFkZXJOYW1lLCB4c3JmVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBDb250ZW50LVR5cGUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgICByZXF1ZXN0RGF0YSA9PT0gdW5kZWZpbmVkICYmIHJlcXVlc3RIZWFkZXJzLnNldENvbnRlbnRUeXBlKG51bGwpO1xuXG4gICAgLy8gQWRkIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3RcbiAgICBpZiAoJ3NldFJlcXVlc3RIZWFkZXInIGluIHJlcXVlc3QpIHtcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMudG9KU09OKCksIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcbiAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB3aXRoQ3JlZGVudGlhbHMgdG8gcmVxdWVzdCBpZiBuZWVkZWRcbiAgICBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMpKSB7XG4gICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscyA9ICEhY29uZmlnLndpdGhDcmVkZW50aWFscztcbiAgICB9XG5cbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKHJlc3BvbnNlVHlwZSAmJiByZXNwb25zZVR5cGUgIT09ICdqc29uJykge1xuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBjb25maWcucmVzcG9uc2VUeXBlO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwcm9ncmVzcyBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBwcm9ncmVzc0V2ZW50UmVkdWNlcihjb25maWcub25Eb3dubG9hZFByb2dyZXNzLCB0cnVlKSk7XG4gICAgfVxuXG4gICAgLy8gTm90IGFsbCBicm93c2VycyBzdXBwb3J0IHVwbG9hZCBldmVudHNcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nICYmIHJlcXVlc3QudXBsb2FkKSB7XG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIHByb2dyZXNzRXZlbnRSZWR1Y2VyKGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbiB8fCBjb25maWcuc2lnbmFsKSB7XG4gICAgICAvLyBIYW5kbGUgY2FuY2VsbGF0aW9uXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZnVuYy1uYW1lc1xuICAgICAgb25DYW5jZWxlZCA9IGNhbmNlbCA9PiB7XG4gICAgICAgIGlmICghcmVxdWVzdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZWplY3QoIWNhbmNlbCB8fCBjYW5jZWwudHlwZSA/IG5ldyBDYW5jZWxlZEVycm9yKG51bGwsIGNvbmZpZywgcmVxdWVzdCkgOiBjYW5jZWwpO1xuICAgICAgICByZXF1ZXN0LmFib3J0KCk7XG4gICAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgICAgfTtcblxuICAgICAgY29uZmlnLmNhbmNlbFRva2VuICYmIGNvbmZpZy5jYW5jZWxUb2tlbi5zdWJzY3JpYmUob25DYW5jZWxlZCk7XG4gICAgICBpZiAoY29uZmlnLnNpZ25hbCkge1xuICAgICAgICBjb25maWcuc2lnbmFsLmFib3J0ZWQgPyBvbkNhbmNlbGVkKCkgOiBjb25maWcuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25DYW5jZWxlZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJvdG9jb2wgPSBwYXJzZVByb3RvY29sKGZ1bGxQYXRoKTtcblxuICAgIGlmIChwcm90b2NvbCAmJiBwbGF0Zm9ybS5wcm90b2NvbHMuaW5kZXhPZihwcm90b2NvbCkgPT09IC0xKSB7XG4gICAgICByZWplY3QobmV3IEF4aW9zRXJyb3IoJ1Vuc3VwcG9ydGVkIHByb3RvY29sICcgKyBwcm90b2NvbCArICc6JywgQXhpb3NFcnJvci5FUlJfQkFEX1JFUVVFU1QsIGNvbmZpZykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSB8fCBudWxsKTtcbiAgfSk7XG59O1xuXG5jb25zdCBrbm93bkFkYXB0ZXJzID0ge1xuICBodHRwOiBodHRwQWRhcHRlcixcbiAgeGhyOiB4aHJBZGFwdGVyXG59O1xuXG51dGlscy5mb3JFYWNoKGtub3duQWRhcHRlcnMsIChmbiwgdmFsdWUpID0+IHtcbiAgaWYoZm4pIHtcbiAgICB0cnkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGZuLCAnbmFtZScsIHt2YWx1ZX0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1lbXB0eVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZm4sICdhZGFwdGVyTmFtZScsIHt2YWx1ZX0pO1xuICB9XG59KTtcblxudmFyIGFkYXB0ZXJzID0ge1xuICBnZXRBZGFwdGVyOiAoYWRhcHRlcnMpID0+IHtcbiAgICBhZGFwdGVycyA9IHV0aWxzLmlzQXJyYXkoYWRhcHRlcnMpID8gYWRhcHRlcnMgOiBbYWRhcHRlcnNdO1xuXG4gICAgY29uc3Qge2xlbmd0aH0gPSBhZGFwdGVycztcbiAgICBsZXQgbmFtZU9yQWRhcHRlcjtcbiAgICBsZXQgYWRhcHRlcjtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIG5hbWVPckFkYXB0ZXIgPSBhZGFwdGVyc1tpXTtcbiAgICAgIGlmKChhZGFwdGVyID0gdXRpbHMuaXNTdHJpbmcobmFtZU9yQWRhcHRlcikgPyBrbm93bkFkYXB0ZXJzW25hbWVPckFkYXB0ZXIudG9Mb3dlckNhc2UoKV0gOiBuYW1lT3JBZGFwdGVyKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWFkYXB0ZXIpIHtcbiAgICAgIGlmIChhZGFwdGVyID09PSBmYWxzZSkge1xuICAgICAgICB0aHJvdyBuZXcgQXhpb3NFcnJvcihcbiAgICAgICAgICBgQWRhcHRlciAke25hbWVPckFkYXB0ZXJ9IGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGVudmlyb25tZW50YCxcbiAgICAgICAgICAnRVJSX05PVF9TVVBQT1JUJ1xuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIHV0aWxzLmhhc093blByb3Aoa25vd25BZGFwdGVycywgbmFtZU9yQWRhcHRlcikgP1xuICAgICAgICAgIGBBZGFwdGVyICcke25hbWVPckFkYXB0ZXJ9JyBpcyBub3QgYXZhaWxhYmxlIGluIHRoZSBidWlsZGAgOlxuICAgICAgICAgIGBVbmtub3duIGFkYXB0ZXIgJyR7bmFtZU9yQWRhcHRlcn0nYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWxzLmlzRnVuY3Rpb24oYWRhcHRlcikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FkYXB0ZXIgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWRhcHRlcjtcbiAgfSxcbiAgYWRhcHRlcnM6IGtub3duQWRhcHRlcnNcbn07XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGVkRXJyb3JgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnIHRoYXQgaXMgdG8gYmUgdXNlZCBmb3IgdGhlIHJlcXVlc3RcbiAqXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqL1xuZnVuY3Rpb24gdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpIHtcbiAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xuICAgIGNvbmZpZy5jYW5jZWxUb2tlbi50aHJvd0lmUmVxdWVzdGVkKCk7XG4gIH1cblxuICBpZiAoY29uZmlnLnNpZ25hbCAmJiBjb25maWcuc2lnbmFsLmFib3J0ZWQpIHtcbiAgICB0aHJvdyBuZXcgQ2FuY2VsZWRFcnJvcihudWxsLCBjb25maWcpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIGNvbmZpZ3VyZWQgYWRhcHRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcbiAqL1xuZnVuY3Rpb24gZGlzcGF0Y2hSZXF1ZXN0KGNvbmZpZykge1xuICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgY29uZmlnLmhlYWRlcnMgPSBBeGlvc0hlYWRlcnMkMS5mcm9tKGNvbmZpZy5oZWFkZXJzKTtcblxuICAvLyBUcmFuc2Zvcm0gcmVxdWVzdCBkYXRhXG4gIGNvbmZpZy5kYXRhID0gdHJhbnNmb3JtRGF0YS5jYWxsKFxuICAgIGNvbmZpZyxcbiAgICBjb25maWcudHJhbnNmb3JtUmVxdWVzdFxuICApO1xuXG4gIGlmIChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10uaW5kZXhPZihjb25maWcubWV0aG9kKSAhPT0gLTEpIHtcbiAgICBjb25maWcuaGVhZGVycy5zZXRDb250ZW50VHlwZSgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJywgZmFsc2UpO1xuICB9XG5cbiAgY29uc3QgYWRhcHRlciA9IGFkYXB0ZXJzLmdldEFkYXB0ZXIoY29uZmlnLmFkYXB0ZXIgfHwgZGVmYXVsdHMkMS5hZGFwdGVyKTtcblxuICByZXR1cm4gYWRhcHRlcihjb25maWcpLnRoZW4oZnVuY3Rpb24gb25BZGFwdGVyUmVzb2x1dGlvbihyZXNwb25zZSkge1xuICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgcmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEuY2FsbChcbiAgICAgIGNvbmZpZyxcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZSxcbiAgICAgIHJlc3BvbnNlXG4gICAgKTtcblxuICAgIHJlc3BvbnNlLmhlYWRlcnMgPSBBeGlvc0hlYWRlcnMkMS5mcm9tKHJlc3BvbnNlLmhlYWRlcnMpO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LCBmdW5jdGlvbiBvbkFkYXB0ZXJSZWplY3Rpb24ocmVhc29uKSB7XG4gICAgaWYgKCFpc0NhbmNlbChyZWFzb24pKSB7XG4gICAgICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgICBpZiAocmVhc29uICYmIHJlYXNvbi5yZXNwb25zZSkge1xuICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEuY2FsbChcbiAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlLFxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZVxuICAgICAgICApO1xuICAgICAgICByZWFzb24ucmVzcG9uc2UuaGVhZGVycyA9IEF4aW9zSGVhZGVycyQxLmZyb20ocmVhc29uLnJlc3BvbnNlLmhlYWRlcnMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZWFzb24pO1xuICB9KTtcbn1cblxuY29uc3QgaGVhZGVyc1RvT2JqZWN0ID0gKHRoaW5nKSA9PiB0aGluZyBpbnN0YW5jZW9mIEF4aW9zSGVhZGVycyQxID8gdGhpbmcudG9KU09OKCkgOiB0aGluZztcblxuLyoqXG4gKiBDb25maWctc3BlY2lmaWMgbWVyZ2UtZnVuY3Rpb24gd2hpY2ggY3JlYXRlcyBhIG5ldyBjb25maWctb2JqZWN0XG4gKiBieSBtZXJnaW5nIHR3byBjb25maWd1cmF0aW9uIG9iamVjdHMgdG9nZXRoZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZzFcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcyXG4gKlxuICogQHJldHVybnMge09iamVjdH0gTmV3IG9iamVjdCByZXN1bHRpbmcgZnJvbSBtZXJnaW5nIGNvbmZpZzIgdG8gY29uZmlnMVxuICovXG5mdW5jdGlvbiBtZXJnZUNvbmZpZyhjb25maWcxLCBjb25maWcyKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICBjb25maWcyID0gY29uZmlnMiB8fCB7fTtcbiAgY29uc3QgY29uZmlnID0ge307XG5cbiAgZnVuY3Rpb24gZ2V0TWVyZ2VkVmFsdWUodGFyZ2V0LCBzb3VyY2UsIGNhc2VsZXNzKSB7XG4gICAgaWYgKHV0aWxzLmlzUGxhaW5PYmplY3QodGFyZ2V0KSAmJiB1dGlscy5pc1BsYWluT2JqZWN0KHNvdXJjZSkpIHtcbiAgICAgIHJldHVybiB1dGlscy5tZXJnZS5jYWxsKHtjYXNlbGVzc30sIHRhcmdldCwgc291cmNlKTtcbiAgICB9IGVsc2UgaWYgKHV0aWxzLmlzUGxhaW5PYmplY3Qoc291cmNlKSkge1xuICAgICAgcmV0dXJuIHV0aWxzLm1lcmdlKHt9LCBzb3VyY2UpO1xuICAgIH0gZWxzZSBpZiAodXRpbHMuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICByZXR1cm4gc291cmNlLnNsaWNlKCk7XG4gICAgfVxuICAgIHJldHVybiBzb3VyY2U7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbiAgZnVuY3Rpb24gbWVyZ2VEZWVwUHJvcGVydGllcyhhLCBiLCBjYXNlbGVzcykge1xuICAgIGlmICghdXRpbHMuaXNVbmRlZmluZWQoYikpIHtcbiAgICAgIHJldHVybiBnZXRNZXJnZWRWYWx1ZShhLCBiLCBjYXNlbGVzcyk7XG4gICAgfSBlbHNlIGlmICghdXRpbHMuaXNVbmRlZmluZWQoYSkpIHtcbiAgICAgIHJldHVybiBnZXRNZXJnZWRWYWx1ZSh1bmRlZmluZWQsIGEsIGNhc2VsZXNzKTtcbiAgICB9XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbiAgZnVuY3Rpb24gdmFsdWVGcm9tQ29uZmlnMihhLCBiKSB7XG4gICAgaWYgKCF1dGlscy5pc1VuZGVmaW5lZChiKSkge1xuICAgICAgcmV0dXJuIGdldE1lcmdlZFZhbHVlKHVuZGVmaW5lZCwgYik7XG4gICAgfVxuICB9XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGNvbnNpc3RlbnQtcmV0dXJuXG4gIGZ1bmN0aW9uIGRlZmF1bHRUb0NvbmZpZzIoYSwgYikge1xuICAgIGlmICghdXRpbHMuaXNVbmRlZmluZWQoYikpIHtcbiAgICAgIHJldHVybiBnZXRNZXJnZWRWYWx1ZSh1bmRlZmluZWQsIGIpO1xuICAgIH0gZWxzZSBpZiAoIXV0aWxzLmlzVW5kZWZpbmVkKGEpKSB7XG4gICAgICByZXR1cm4gZ2V0TWVyZ2VkVmFsdWUodW5kZWZpbmVkLCBhKTtcbiAgICB9XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29uc2lzdGVudC1yZXR1cm5cbiAgZnVuY3Rpb24gbWVyZ2VEaXJlY3RLZXlzKGEsIGIsIHByb3ApIHtcbiAgICBpZiAocHJvcCBpbiBjb25maWcyKSB7XG4gICAgICByZXR1cm4gZ2V0TWVyZ2VkVmFsdWUoYSwgYik7XG4gICAgfSBlbHNlIGlmIChwcm9wIGluIGNvbmZpZzEpIHtcbiAgICAgIHJldHVybiBnZXRNZXJnZWRWYWx1ZSh1bmRlZmluZWQsIGEpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IG1lcmdlTWFwID0ge1xuICAgIHVybDogdmFsdWVGcm9tQ29uZmlnMixcbiAgICBtZXRob2Q6IHZhbHVlRnJvbUNvbmZpZzIsXG4gICAgZGF0YTogdmFsdWVGcm9tQ29uZmlnMixcbiAgICBiYXNlVVJMOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIHRyYW5zZm9ybVJlcXVlc3Q6IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgdHJhbnNmb3JtUmVzcG9uc2U6IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgcGFyYW1zU2VyaWFsaXplcjogZGVmYXVsdFRvQ29uZmlnMixcbiAgICB0aW1lb3V0OiBkZWZhdWx0VG9Db25maWcyLFxuICAgIHRpbWVvdXRNZXNzYWdlOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIHdpdGhDcmVkZW50aWFsczogZGVmYXVsdFRvQ29uZmlnMixcbiAgICBhZGFwdGVyOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIHJlc3BvbnNlVHlwZTogZGVmYXVsdFRvQ29uZmlnMixcbiAgICB4c3JmQ29va2llTmFtZTogZGVmYXVsdFRvQ29uZmlnMixcbiAgICB4c3JmSGVhZGVyTmFtZTogZGVmYXVsdFRvQ29uZmlnMixcbiAgICBvblVwbG9hZFByb2dyZXNzOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIG9uRG93bmxvYWRQcm9ncmVzczogZGVmYXVsdFRvQ29uZmlnMixcbiAgICBkZWNvbXByZXNzOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIG1heENvbnRlbnRMZW5ndGg6IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgbWF4Qm9keUxlbmd0aDogZGVmYXVsdFRvQ29uZmlnMixcbiAgICBiZWZvcmVSZWRpcmVjdDogZGVmYXVsdFRvQ29uZmlnMixcbiAgICB0cmFuc3BvcnQ6IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgaHR0cEFnZW50OiBkZWZhdWx0VG9Db25maWcyLFxuICAgIGh0dHBzQWdlbnQ6IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgY2FuY2VsVG9rZW46IGRlZmF1bHRUb0NvbmZpZzIsXG4gICAgc29ja2V0UGF0aDogZGVmYXVsdFRvQ29uZmlnMixcbiAgICByZXNwb25zZUVuY29kaW5nOiBkZWZhdWx0VG9Db25maWcyLFxuICAgIHZhbGlkYXRlU3RhdHVzOiBtZXJnZURpcmVjdEtleXMsXG4gICAgaGVhZGVyczogKGEsIGIpID0+IG1lcmdlRGVlcFByb3BlcnRpZXMoaGVhZGVyc1RvT2JqZWN0KGEpLCBoZWFkZXJzVG9PYmplY3QoYiksIHRydWUpXG4gIH07XG5cbiAgdXRpbHMuZm9yRWFjaChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCBjb25maWcxLCBjb25maWcyKSksIGZ1bmN0aW9uIGNvbXB1dGVDb25maWdWYWx1ZShwcm9wKSB7XG4gICAgY29uc3QgbWVyZ2UgPSBtZXJnZU1hcFtwcm9wXSB8fCBtZXJnZURlZXBQcm9wZXJ0aWVzO1xuICAgIGNvbnN0IGNvbmZpZ1ZhbHVlID0gbWVyZ2UoY29uZmlnMVtwcm9wXSwgY29uZmlnMltwcm9wXSwgcHJvcCk7XG4gICAgKHV0aWxzLmlzVW5kZWZpbmVkKGNvbmZpZ1ZhbHVlKSAmJiBtZXJnZSAhPT0gbWVyZ2VEaXJlY3RLZXlzKSB8fCAoY29uZmlnW3Byb3BdID0gY29uZmlnVmFsdWUpO1xuICB9KTtcblxuICByZXR1cm4gY29uZmlnO1xufVxuXG5jb25zdCBWRVJTSU9OID0gXCIxLjQuMFwiO1xuXG5jb25zdCB2YWxpZGF0b3JzJDEgPSB7fTtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtbmFtZXNcblsnb2JqZWN0JywgJ2Jvb2xlYW4nLCAnbnVtYmVyJywgJ2Z1bmN0aW9uJywgJ3N0cmluZycsICdzeW1ib2wnXS5mb3JFYWNoKCh0eXBlLCBpKSA9PiB7XG4gIHZhbGlkYXRvcnMkMVt0eXBlXSA9IGZ1bmN0aW9uIHZhbGlkYXRvcih0aGluZykge1xuICAgIHJldHVybiB0eXBlb2YgdGhpbmcgPT09IHR5cGUgfHwgJ2EnICsgKGkgPCAxID8gJ24gJyA6ICcgJykgKyB0eXBlO1xuICB9O1xufSk7XG5cbmNvbnN0IGRlcHJlY2F0ZWRXYXJuaW5ncyA9IHt9O1xuXG4vKipcbiAqIFRyYW5zaXRpb25hbCBvcHRpb24gdmFsaWRhdG9yXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbnxib29sZWFuP30gdmFsaWRhdG9yIC0gc2V0IHRvIGZhbHNlIGlmIHRoZSB0cmFuc2l0aW9uYWwgb3B0aW9uIGhhcyBiZWVuIHJlbW92ZWRcbiAqIEBwYXJhbSB7c3RyaW5nP30gdmVyc2lvbiAtIGRlcHJlY2F0ZWQgdmVyc2lvbiAvIHJlbW92ZWQgc2luY2UgdmVyc2lvblxuICogQHBhcmFtIHtzdHJpbmc/fSBtZXNzYWdlIC0gc29tZSBtZXNzYWdlIHdpdGggYWRkaXRpb25hbCBpbmZvXG4gKlxuICogQHJldHVybnMge2Z1bmN0aW9ufVxuICovXG52YWxpZGF0b3JzJDEudHJhbnNpdGlvbmFsID0gZnVuY3Rpb24gdHJhbnNpdGlvbmFsKHZhbGlkYXRvciwgdmVyc2lvbiwgbWVzc2FnZSkge1xuICBmdW5jdGlvbiBmb3JtYXRNZXNzYWdlKG9wdCwgZGVzYykge1xuICAgIHJldHVybiAnW0F4aW9zIHYnICsgVkVSU0lPTiArICddIFRyYW5zaXRpb25hbCBvcHRpb24gXFwnJyArIG9wdCArICdcXCcnICsgZGVzYyArIChtZXNzYWdlID8gJy4gJyArIG1lc3NhZ2UgOiAnJyk7XG4gIH1cblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgZnVuYy1uYW1lc1xuICByZXR1cm4gKHZhbHVlLCBvcHQsIG9wdHMpID0+IHtcbiAgICBpZiAodmFsaWRhdG9yID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEF4aW9zRXJyb3IoXG4gICAgICAgIGZvcm1hdE1lc3NhZ2Uob3B0LCAnIGhhcyBiZWVuIHJlbW92ZWQnICsgKHZlcnNpb24gPyAnIGluICcgKyB2ZXJzaW9uIDogJycpKSxcbiAgICAgICAgQXhpb3NFcnJvci5FUlJfREVQUkVDQVRFRFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodmVyc2lvbiAmJiAhZGVwcmVjYXRlZFdhcm5pbmdzW29wdF0pIHtcbiAgICAgIGRlcHJlY2F0ZWRXYXJuaW5nc1tvcHRdID0gdHJ1ZTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGZvcm1hdE1lc3NhZ2UoXG4gICAgICAgICAgb3B0LFxuICAgICAgICAgICcgaGFzIGJlZW4gZGVwcmVjYXRlZCBzaW5jZSB2JyArIHZlcnNpb24gKyAnIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gdGhlIG5lYXIgZnV0dXJlJ1xuICAgICAgICApXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB2YWxpZGF0b3IgPyB2YWxpZGF0b3IodmFsdWUsIG9wdCwgb3B0cykgOiB0cnVlO1xuICB9O1xufTtcblxuLyoqXG4gKiBBc3NlcnQgb2JqZWN0J3MgcHJvcGVydGllcyB0eXBlXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7b2JqZWN0fSBzY2hlbWFcbiAqIEBwYXJhbSB7Ym9vbGVhbj99IGFsbG93VW5rbm93blxuICpcbiAqIEByZXR1cm5zIHtvYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gYXNzZXJ0T3B0aW9ucyhvcHRpb25zLCBzY2hlbWEsIGFsbG93VW5rbm93bikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IEF4aW9zRXJyb3IoJ29wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QnLCBBeGlvc0Vycm9yLkVSUl9CQURfT1BUSU9OX1ZBTFVFKTtcbiAgfVxuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMob3B0aW9ucyk7XG4gIGxldCBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0gPiAwKSB7XG4gICAgY29uc3Qgb3B0ID0ga2V5c1tpXTtcbiAgICBjb25zdCB2YWxpZGF0b3IgPSBzY2hlbWFbb3B0XTtcbiAgICBpZiAodmFsaWRhdG9yKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbnNbb3B0XTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsaWRhdG9yKHZhbHVlLCBvcHQsIG9wdGlvbnMpO1xuICAgICAgaWYgKHJlc3VsdCAhPT0gdHJ1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgQXhpb3NFcnJvcignb3B0aW9uICcgKyBvcHQgKyAnIG11c3QgYmUgJyArIHJlc3VsdCwgQXhpb3NFcnJvci5FUlJfQkFEX09QVElPTl9WQUxVRSk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGFsbG93VW5rbm93biAhPT0gdHJ1ZSkge1xuICAgICAgdGhyb3cgbmV3IEF4aW9zRXJyb3IoJ1Vua25vd24gb3B0aW9uICcgKyBvcHQsIEF4aW9zRXJyb3IuRVJSX0JBRF9PUFRJT04pO1xuICAgIH1cbiAgfVxufVxuXG52YXIgdmFsaWRhdG9yID0ge1xuICBhc3NlcnRPcHRpb25zLFxuICB2YWxpZGF0b3JzOiB2YWxpZGF0b3JzJDFcbn07XG5cbmNvbnN0IHZhbGlkYXRvcnMgPSB2YWxpZGF0b3IudmFsaWRhdG9ycztcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqL1xuY2xhc3MgQXhpb3Mge1xuICBjb25zdHJ1Y3RvcihpbnN0YW5jZUNvbmZpZykge1xuICAgIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcbiAgICB0aGlzLmludGVyY2VwdG9ycyA9IHtcbiAgICAgIHJlcXVlc3Q6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIkMSgpLFxuICAgICAgcmVzcG9uc2U6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIkMSgpXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwYXRjaCBhIHJlcXVlc3RcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBjb25maWdPclVybCBUaGUgY29uZmlnIHNwZWNpZmljIGZvciB0aGlzIHJlcXVlc3QgKG1lcmdlZCB3aXRoIHRoaXMuZGVmYXVsdHMpXG4gICAqIEBwYXJhbSB7P09iamVjdH0gY29uZmlnXG4gICAqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBUaGUgUHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcbiAgICovXG4gIHJlcXVlc3QoY29uZmlnT3JVcmwsIGNvbmZpZykge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIC8vIEFsbG93IGZvciBheGlvcygnZXhhbXBsZS91cmwnWywgY29uZmlnXSkgYSBsYSBmZXRjaCBBUElcbiAgICBpZiAodHlwZW9mIGNvbmZpZ09yVXJsID09PSAnc3RyaW5nJykge1xuICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgICAgY29uZmlnLnVybCA9IGNvbmZpZ09yVXJsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWcgPSBjb25maWdPclVybCB8fCB7fTtcbiAgICB9XG5cbiAgICBjb25maWcgPSBtZXJnZUNvbmZpZyh0aGlzLmRlZmF1bHRzLCBjb25maWcpO1xuXG4gICAgY29uc3Qge3RyYW5zaXRpb25hbCwgcGFyYW1zU2VyaWFsaXplciwgaGVhZGVyc30gPSBjb25maWc7XG5cbiAgICBpZiAodHJhbnNpdGlvbmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhbGlkYXRvci5hc3NlcnRPcHRpb25zKHRyYW5zaXRpb25hbCwge1xuICAgICAgICBzaWxlbnRKU09OUGFyc2luZzogdmFsaWRhdG9ycy50cmFuc2l0aW9uYWwodmFsaWRhdG9ycy5ib29sZWFuKSxcbiAgICAgICAgZm9yY2VkSlNPTlBhcnNpbmc6IHZhbGlkYXRvcnMudHJhbnNpdGlvbmFsKHZhbGlkYXRvcnMuYm9vbGVhbiksXG4gICAgICAgIGNsYXJpZnlUaW1lb3V0RXJyb3I6IHZhbGlkYXRvcnMudHJhbnNpdGlvbmFsKHZhbGlkYXRvcnMuYm9vbGVhbilcbiAgICAgIH0sIGZhbHNlKTtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zU2VyaWFsaXplciAhPSBudWxsKSB7XG4gICAgICBpZiAodXRpbHMuaXNGdW5jdGlvbihwYXJhbXNTZXJpYWxpemVyKSkge1xuICAgICAgICBjb25maWcucGFyYW1zU2VyaWFsaXplciA9IHtcbiAgICAgICAgICBzZXJpYWxpemU6IHBhcmFtc1NlcmlhbGl6ZXJcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbGlkYXRvci5hc3NlcnRPcHRpb25zKHBhcmFtc1NlcmlhbGl6ZXIsIHtcbiAgICAgICAgICBlbmNvZGU6IHZhbGlkYXRvcnMuZnVuY3Rpb24sXG4gICAgICAgICAgc2VyaWFsaXplOiB2YWxpZGF0b3JzLmZ1bmN0aW9uXG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNldCBjb25maWcubWV0aG9kXG4gICAgY29uZmlnLm1ldGhvZCA9IChjb25maWcubWV0aG9kIHx8IHRoaXMuZGVmYXVsdHMubWV0aG9kIHx8ICdnZXQnKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgbGV0IGNvbnRleHRIZWFkZXJzO1xuXG4gICAgLy8gRmxhdHRlbiBoZWFkZXJzXG4gICAgY29udGV4dEhlYWRlcnMgPSBoZWFkZXJzICYmIHV0aWxzLm1lcmdlKFxuICAgICAgaGVhZGVycy5jb21tb24sXG4gICAgICBoZWFkZXJzW2NvbmZpZy5tZXRob2RdXG4gICAgKTtcblxuICAgIGNvbnRleHRIZWFkZXJzICYmIHV0aWxzLmZvckVhY2goXG4gICAgICBbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdwb3N0JywgJ3B1dCcsICdwYXRjaCcsICdjb21tb24nXSxcbiAgICAgIChtZXRob2QpID0+IHtcbiAgICAgICAgZGVsZXRlIGhlYWRlcnNbbWV0aG9kXTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uZmlnLmhlYWRlcnMgPSBBeGlvc0hlYWRlcnMkMS5jb25jYXQoY29udGV4dEhlYWRlcnMsIGhlYWRlcnMpO1xuXG4gICAgLy8gZmlsdGVyIG91dCBza2lwcGVkIGludGVyY2VwdG9yc1xuICAgIGNvbnN0IHJlcXVlc3RJbnRlcmNlcHRvckNoYWluID0gW107XG4gICAgbGV0IHN5bmNocm9ub3VzUmVxdWVzdEludGVyY2VwdG9ycyA9IHRydWU7XG4gICAgdGhpcy5pbnRlcmNlcHRvcnMucmVxdWVzdC5mb3JFYWNoKGZ1bmN0aW9uIHVuc2hpZnRSZXF1ZXN0SW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgICBpZiAodHlwZW9mIGludGVyY2VwdG9yLnJ1bldoZW4gPT09ICdmdW5jdGlvbicgJiYgaW50ZXJjZXB0b3IucnVuV2hlbihjb25maWcpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHN5bmNocm9ub3VzUmVxdWVzdEludGVyY2VwdG9ycyA9IHN5bmNocm9ub3VzUmVxdWVzdEludGVyY2VwdG9ycyAmJiBpbnRlcmNlcHRvci5zeW5jaHJvbm91cztcblxuICAgICAgcmVxdWVzdEludGVyY2VwdG9yQ2hhaW4udW5zaGlmdChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlSW50ZXJjZXB0b3JDaGFpbiA9IFtdO1xuICAgIHRoaXMuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gcHVzaFJlc3BvbnNlSW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgICByZXNwb25zZUludGVyY2VwdG9yQ2hhaW4ucHVzaChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgICB9KTtcblxuICAgIGxldCBwcm9taXNlO1xuICAgIGxldCBpID0gMDtcbiAgICBsZXQgbGVuO1xuXG4gICAgaWYgKCFzeW5jaHJvbm91c1JlcXVlc3RJbnRlcmNlcHRvcnMpIHtcbiAgICAgIGNvbnN0IGNoYWluID0gW2Rpc3BhdGNoUmVxdWVzdC5iaW5kKHRoaXMpLCB1bmRlZmluZWRdO1xuICAgICAgY2hhaW4udW5zaGlmdC5hcHBseShjaGFpbiwgcmVxdWVzdEludGVyY2VwdG9yQ2hhaW4pO1xuICAgICAgY2hhaW4ucHVzaC5hcHBseShjaGFpbiwgcmVzcG9uc2VJbnRlcmNlcHRvckNoYWluKTtcbiAgICAgIGxlbiA9IGNoYWluLmxlbmd0aDtcblxuICAgICAgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShjb25maWcpO1xuXG4gICAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGNoYWluW2krK10sIGNoYWluW2krK10pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBsZW4gPSByZXF1ZXN0SW50ZXJjZXB0b3JDaGFpbi5sZW5ndGg7XG5cbiAgICBsZXQgbmV3Q29uZmlnID0gY29uZmlnO1xuXG4gICAgaSA9IDA7XG5cbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgY29uc3Qgb25GdWxmaWxsZWQgPSByZXF1ZXN0SW50ZXJjZXB0b3JDaGFpbltpKytdO1xuICAgICAgY29uc3Qgb25SZWplY3RlZCA9IHJlcXVlc3RJbnRlcmNlcHRvckNoYWluW2krK107XG4gICAgICB0cnkge1xuICAgICAgICBuZXdDb25maWcgPSBvbkZ1bGZpbGxlZChuZXdDb25maWcpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgb25SZWplY3RlZC5jYWxsKHRoaXMsIGVycm9yKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHByb21pc2UgPSBkaXNwYXRjaFJlcXVlc3QuY2FsbCh0aGlzLCBuZXdDb25maWcpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIGkgPSAwO1xuICAgIGxlbiA9IHJlc3BvbnNlSW50ZXJjZXB0b3JDaGFpbi5sZW5ndGg7XG5cbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2UudGhlbihyZXNwb25zZUludGVyY2VwdG9yQ2hhaW5baSsrXSwgcmVzcG9uc2VJbnRlcmNlcHRvckNoYWluW2krK10pO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgZ2V0VXJpKGNvbmZpZykge1xuICAgIGNvbmZpZyA9IG1lcmdlQ29uZmlnKHRoaXMuZGVmYXVsdHMsIGNvbmZpZyk7XG4gICAgY29uc3QgZnVsbFBhdGggPSBidWlsZEZ1bGxQYXRoKGNvbmZpZy5iYXNlVVJMLCBjb25maWcudXJsKTtcbiAgICByZXR1cm4gYnVpbGRVUkwoZnVsbFBhdGgsIGNvbmZpZy5wYXJhbXMsIGNvbmZpZy5wYXJhbXNTZXJpYWxpemVyKTtcbiAgfVxufVxuXG4vLyBQcm92aWRlIGFsaWFzZXMgZm9yIHN1cHBvcnRlZCByZXF1ZXN0IG1ldGhvZHNcbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAnb3B0aW9ucyddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kTm9EYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChtZXJnZUNvbmZpZyhjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZCxcbiAgICAgIHVybCxcbiAgICAgIGRhdGE6IChjb25maWcgfHwge30pLmRhdGFcbiAgICB9KSk7XG4gIH07XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cblxuICBmdW5jdGlvbiBnZW5lcmF0ZUhUVFBNZXRob2QoaXNGb3JtKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGh0dHBNZXRob2QodXJsLCBkYXRhLCBjb25maWcpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QobWVyZ2VDb25maWcoY29uZmlnIHx8IHt9LCB7XG4gICAgICAgIG1ldGhvZCxcbiAgICAgICAgaGVhZGVyczogaXNGb3JtID8ge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnbXVsdGlwYXJ0L2Zvcm0tZGF0YSdcbiAgICAgICAgfSA6IHt9LFxuICAgICAgICB1cmwsXG4gICAgICAgIGRhdGFcbiAgICAgIH0pKTtcbiAgICB9O1xuICB9XG5cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBnZW5lcmF0ZUhUVFBNZXRob2QoKTtcblxuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kICsgJ0Zvcm0nXSA9IGdlbmVyYXRlSFRUUE1ldGhvZCh0cnVlKTtcbn0pO1xuXG52YXIgQXhpb3MkMSA9IEF4aW9zO1xuXG4vKipcbiAqIEEgYENhbmNlbFRva2VuYCBpcyBhbiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byByZXF1ZXN0IGNhbmNlbGxhdGlvbiBvZiBhbiBvcGVyYXRpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZXhlY3V0b3IgVGhlIGV4ZWN1dG9yIGZ1bmN0aW9uLlxuICpcbiAqIEByZXR1cm5zIHtDYW5jZWxUb2tlbn1cbiAqL1xuY2xhc3MgQ2FuY2VsVG9rZW4ge1xuICBjb25zdHJ1Y3RvcihleGVjdXRvcikge1xuICAgIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4ZWN1dG9yIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG5cbiAgICBsZXQgcmVzb2x2ZVByb21pc2U7XG5cbiAgICB0aGlzLnByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiBwcm9taXNlRXhlY3V0b3IocmVzb2x2ZSkge1xuICAgICAgcmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgdG9rZW4gPSB0aGlzO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtbmFtZXNcbiAgICB0aGlzLnByb21pc2UudGhlbihjYW5jZWwgPT4ge1xuICAgICAgaWYgKCF0b2tlbi5fbGlzdGVuZXJzKSByZXR1cm47XG5cbiAgICAgIGxldCBpID0gdG9rZW4uX2xpc3RlbmVycy5sZW5ndGg7XG5cbiAgICAgIHdoaWxlIChpLS0gPiAwKSB7XG4gICAgICAgIHRva2VuLl9saXN0ZW5lcnNbaV0oY2FuY2VsKTtcbiAgICAgIH1cbiAgICAgIHRva2VuLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGZ1bmMtbmFtZXNcbiAgICB0aGlzLnByb21pc2UudGhlbiA9IG9uZnVsZmlsbGVkID0+IHtcbiAgICAgIGxldCBfcmVzb2x2ZTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBmdW5jLW5hbWVzXG4gICAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHRva2VuLnN1YnNjcmliZShyZXNvbHZlKTtcbiAgICAgICAgX3Jlc29sdmUgPSByZXNvbHZlO1xuICAgICAgfSkudGhlbihvbmZ1bGZpbGxlZCk7XG5cbiAgICAgIHByb21pc2UuY2FuY2VsID0gZnVuY3Rpb24gcmVqZWN0KCkge1xuICAgICAgICB0b2tlbi51bnN1YnNjcmliZShfcmVzb2x2ZSk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9O1xuXG4gICAgZXhlY3V0b3IoZnVuY3Rpb24gY2FuY2VsKG1lc3NhZ2UsIGNvbmZpZywgcmVxdWVzdCkge1xuICAgICAgaWYgKHRva2VuLnJlYXNvbikge1xuICAgICAgICAvLyBDYW5jZWxsYXRpb24gaGFzIGFscmVhZHkgYmVlbiByZXF1ZXN0ZWRcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0b2tlbi5yZWFzb24gPSBuZXcgQ2FuY2VsZWRFcnJvcihtZXNzYWdlLCBjb25maWcsIHJlcXVlc3QpO1xuICAgICAgcmVzb2x2ZVByb21pc2UodG9rZW4ucmVhc29uKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaHJvd3MgYSBgQ2FuY2VsZWRFcnJvcmAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAgICovXG4gIHRocm93SWZSZXF1ZXN0ZWQoKSB7XG4gICAgaWYgKHRoaXMucmVhc29uKSB7XG4gICAgICB0aHJvdyB0aGlzLnJlYXNvbjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIHRvIHRoZSBjYW5jZWwgc2lnbmFsXG4gICAqL1xuXG4gIHN1YnNjcmliZShsaXN0ZW5lcikge1xuICAgIGlmICh0aGlzLnJlYXNvbikge1xuICAgICAgbGlzdGVuZXIodGhpcy5yZWFzb24pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9saXN0ZW5lcnMpIHtcbiAgICAgIHRoaXMuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbGlzdGVuZXJzID0gW2xpc3RlbmVyXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW5zdWJzY3JpYmUgZnJvbSB0aGUgY2FuY2VsIHNpZ25hbFxuICAgKi9cblxuICB1bnN1YnNjcmliZShsaXN0ZW5lcikge1xuICAgIGlmICghdGhpcy5fbGlzdGVuZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMuX2xpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXG4gICAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXG4gICAqL1xuICBzdGF0aWMgc291cmNlKCkge1xuICAgIGxldCBjYW5jZWw7XG4gICAgY29uc3QgdG9rZW4gPSBuZXcgQ2FuY2VsVG9rZW4oZnVuY3Rpb24gZXhlY3V0b3IoYykge1xuICAgICAgY2FuY2VsID0gYztcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgdG9rZW4sXG4gICAgICBjYW5jZWxcbiAgICB9O1xuICB9XG59XG5cbnZhciBDYW5jZWxUb2tlbiQxID0gQ2FuY2VsVG9rZW47XG5cbi8qKlxuICogU3ludGFjdGljIHN1Z2FyIGZvciBpbnZva2luZyBhIGZ1bmN0aW9uIGFuZCBleHBhbmRpbmcgYW4gYXJyYXkgZm9yIGFyZ3VtZW50cy5cbiAqXG4gKiBDb21tb24gdXNlIGNhc2Ugd291bGQgYmUgdG8gdXNlIGBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHlgLlxuICpcbiAqICBgYGBqc1xuICogIGZ1bmN0aW9uIGYoeCwgeSwgeikge31cbiAqICB2YXIgYXJncyA9IFsxLCAyLCAzXTtcbiAqICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xuICogIGBgYFxuICpcbiAqIFdpdGggYHNwcmVhZGAgdGhpcyBleGFtcGxlIGNhbiBiZSByZS13cml0dGVuLlxuICpcbiAqICBgYGBqc1xuICogIHNwcmVhZChmdW5jdGlvbih4LCB5LCB6KSB7fSkoWzEsIDIsIDNdKTtcbiAqICBgYGBcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICpcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gc3ByZWFkKGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xuICAgIHJldHVybiBjYWxsYmFjay5hcHBseShudWxsLCBhcnIpO1xuICB9O1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgcGF5bG9hZCBpcyBhbiBlcnJvciB0aHJvd24gYnkgQXhpb3NcbiAqXG4gKiBAcGFyYW0geyp9IHBheWxvYWQgVGhlIHZhbHVlIHRvIHRlc3RcbiAqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGF5bG9hZCBpcyBhbiBlcnJvciB0aHJvd24gYnkgQXhpb3MsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0F4aW9zRXJyb3IocGF5bG9hZCkge1xuICByZXR1cm4gdXRpbHMuaXNPYmplY3QocGF5bG9hZCkgJiYgKHBheWxvYWQuaXNBeGlvc0Vycm9yID09PSB0cnVlKTtcbn1cblxuY29uc3QgSHR0cFN0YXR1c0NvZGUgPSB7XG4gIENvbnRpbnVlOiAxMDAsXG4gIFN3aXRjaGluZ1Byb3RvY29sczogMTAxLFxuICBQcm9jZXNzaW5nOiAxMDIsXG4gIEVhcmx5SGludHM6IDEwMyxcbiAgT2s6IDIwMCxcbiAgQ3JlYXRlZDogMjAxLFxuICBBY2NlcHRlZDogMjAyLFxuICBOb25BdXRob3JpdGF0aXZlSW5mb3JtYXRpb246IDIwMyxcbiAgTm9Db250ZW50OiAyMDQsXG4gIFJlc2V0Q29udGVudDogMjA1LFxuICBQYXJ0aWFsQ29udGVudDogMjA2LFxuICBNdWx0aVN0YXR1czogMjA3LFxuICBBbHJlYWR5UmVwb3J0ZWQ6IDIwOCxcbiAgSW1Vc2VkOiAyMjYsXG4gIE11bHRpcGxlQ2hvaWNlczogMzAwLFxuICBNb3ZlZFBlcm1hbmVudGx5OiAzMDEsXG4gIEZvdW5kOiAzMDIsXG4gIFNlZU90aGVyOiAzMDMsXG4gIE5vdE1vZGlmaWVkOiAzMDQsXG4gIFVzZVByb3h5OiAzMDUsXG4gIFVudXNlZDogMzA2LFxuICBUZW1wb3JhcnlSZWRpcmVjdDogMzA3LFxuICBQZXJtYW5lbnRSZWRpcmVjdDogMzA4LFxuICBCYWRSZXF1ZXN0OiA0MDAsXG4gIFVuYXV0aG9yaXplZDogNDAxLFxuICBQYXltZW50UmVxdWlyZWQ6IDQwMixcbiAgRm9yYmlkZGVuOiA0MDMsXG4gIE5vdEZvdW5kOiA0MDQsXG4gIE1ldGhvZE5vdEFsbG93ZWQ6IDQwNSxcbiAgTm90QWNjZXB0YWJsZTogNDA2LFxuICBQcm94eUF1dGhlbnRpY2F0aW9uUmVxdWlyZWQ6IDQwNyxcbiAgUmVxdWVzdFRpbWVvdXQ6IDQwOCxcbiAgQ29uZmxpY3Q6IDQwOSxcbiAgR29uZTogNDEwLFxuICBMZW5ndGhSZXF1aXJlZDogNDExLFxuICBQcmVjb25kaXRpb25GYWlsZWQ6IDQxMixcbiAgUGF5bG9hZFRvb0xhcmdlOiA0MTMsXG4gIFVyaVRvb0xvbmc6IDQxNCxcbiAgVW5zdXBwb3J0ZWRNZWRpYVR5cGU6IDQxNSxcbiAgUmFuZ2VOb3RTYXRpc2ZpYWJsZTogNDE2LFxuICBFeHBlY3RhdGlvbkZhaWxlZDogNDE3LFxuICBJbUFUZWFwb3Q6IDQxOCxcbiAgTWlzZGlyZWN0ZWRSZXF1ZXN0OiA0MjEsXG4gIFVucHJvY2Vzc2FibGVFbnRpdHk6IDQyMixcbiAgTG9ja2VkOiA0MjMsXG4gIEZhaWxlZERlcGVuZGVuY3k6IDQyNCxcbiAgVG9vRWFybHk6IDQyNSxcbiAgVXBncmFkZVJlcXVpcmVkOiA0MjYsXG4gIFByZWNvbmRpdGlvblJlcXVpcmVkOiA0MjgsXG4gIFRvb01hbnlSZXF1ZXN0czogNDI5LFxuICBSZXF1ZXN0SGVhZGVyRmllbGRzVG9vTGFyZ2U6IDQzMSxcbiAgVW5hdmFpbGFibGVGb3JMZWdhbFJlYXNvbnM6IDQ1MSxcbiAgSW50ZXJuYWxTZXJ2ZXJFcnJvcjogNTAwLFxuICBOb3RJbXBsZW1lbnRlZDogNTAxLFxuICBCYWRHYXRld2F5OiA1MDIsXG4gIFNlcnZpY2VVbmF2YWlsYWJsZTogNTAzLFxuICBHYXRld2F5VGltZW91dDogNTA0LFxuICBIdHRwVmVyc2lvbk5vdFN1cHBvcnRlZDogNTA1LFxuICBWYXJpYW50QWxzb05lZ290aWF0ZXM6IDUwNixcbiAgSW5zdWZmaWNpZW50U3RvcmFnZTogNTA3LFxuICBMb29wRGV0ZWN0ZWQ6IDUwOCxcbiAgTm90RXh0ZW5kZWQ6IDUxMCxcbiAgTmV0d29ya0F1dGhlbnRpY2F0aW9uUmVxdWlyZWQ6IDUxMSxcbn07XG5cbk9iamVjdC5lbnRyaWVzKEh0dHBTdGF0dXNDb2RlKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgSHR0cFN0YXR1c0NvZGVbdmFsdWVdID0ga2V5O1xufSk7XG5cbnZhciBIdHRwU3RhdHVzQ29kZSQxID0gSHR0cFN0YXR1c0NvZGU7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqXG4gKiBAcmV0dXJucyB7QXhpb3N9IEEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRDb25maWcpIHtcbiAgY29uc3QgY29udGV4dCA9IG5ldyBBeGlvcyQxKGRlZmF1bHRDb25maWcpO1xuICBjb25zdCBpbnN0YW5jZSA9IGJpbmQoQXhpb3MkMS5wcm90b3R5cGUucmVxdWVzdCwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBBeGlvcyQxLnByb3RvdHlwZSwgY29udGV4dCwge2FsbE93bktleXM6IHRydWV9KTtcblxuICAvLyBDb3B5IGNvbnRleHQgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBjb250ZXh0LCBudWxsLCB7YWxsT3duS2V5czogdHJ1ZX0pO1xuXG4gIC8vIEZhY3RvcnkgZm9yIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXNcbiAgaW5zdGFuY2UuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKGluc3RhbmNlQ29uZmlnKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUluc3RhbmNlKG1lcmdlQ29uZmlnKGRlZmF1bHRDb25maWcsIGluc3RhbmNlQ29uZmlnKSk7XG4gIH07XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vLyBDcmVhdGUgdGhlIGRlZmF1bHQgaW5zdGFuY2UgdG8gYmUgZXhwb3J0ZWRcbmNvbnN0IGF4aW9zID0gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdHMkMSk7XG5cbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxuYXhpb3MuQXhpb3MgPSBBeGlvcyQxO1xuXG4vLyBFeHBvc2UgQ2FuY2VsICYgQ2FuY2VsVG9rZW5cbmF4aW9zLkNhbmNlbGVkRXJyb3IgPSBDYW5jZWxlZEVycm9yO1xuYXhpb3MuQ2FuY2VsVG9rZW4gPSBDYW5jZWxUb2tlbiQxO1xuYXhpb3MuaXNDYW5jZWwgPSBpc0NhbmNlbDtcbmF4aW9zLlZFUlNJT04gPSBWRVJTSU9OO1xuYXhpb3MudG9Gb3JtRGF0YSA9IHRvRm9ybURhdGE7XG5cbi8vIEV4cG9zZSBBeGlvc0Vycm9yIGNsYXNzXG5heGlvcy5BeGlvc0Vycm9yID0gQXhpb3NFcnJvcjtcblxuLy8gYWxpYXMgZm9yIENhbmNlbGVkRXJyb3IgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbmF4aW9zLkNhbmNlbCA9IGF4aW9zLkNhbmNlbGVkRXJyb3I7XG5cbi8vIEV4cG9zZSBhbGwvc3ByZWFkXG5heGlvcy5hbGwgPSBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn07XG5cbmF4aW9zLnNwcmVhZCA9IHNwcmVhZDtcblxuLy8gRXhwb3NlIGlzQXhpb3NFcnJvclxuYXhpb3MuaXNBeGlvc0Vycm9yID0gaXNBeGlvc0Vycm9yO1xuXG4vLyBFeHBvc2UgbWVyZ2VDb25maWdcbmF4aW9zLm1lcmdlQ29uZmlnID0gbWVyZ2VDb25maWc7XG5cbmF4aW9zLkF4aW9zSGVhZGVycyA9IEF4aW9zSGVhZGVycyQxO1xuXG5heGlvcy5mb3JtVG9KU09OID0gdGhpbmcgPT4gZm9ybURhdGFUb0pTT04odXRpbHMuaXNIVE1MRm9ybSh0aGluZykgPyBuZXcgRm9ybURhdGEodGhpbmcpIDogdGhpbmcpO1xuXG5heGlvcy5IdHRwU3RhdHVzQ29kZSA9IEh0dHBTdGF0dXNDb2RlJDE7XG5cbmF4aW9zLmRlZmF1bHQgPSBheGlvcztcblxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWF4aW9zLmNqcy5tYXBcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJfX3dlYnBhY2tfcmVxdWlyZV9fLmcgPSAoZnVuY3Rpb24oKSB7XG5cdGlmICh0eXBlb2YgZ2xvYmFsVGhpcyA9PT0gJ29iamVjdCcpIHJldHVybiBnbG9iYWxUaGlzO1xuXHR0cnkge1xuXHRcdHJldHVybiB0aGlzIHx8IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0aWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnKSByZXR1cm4gd2luZG93O1xuXHR9XG59KSgpOyIsIi8vIEltcG9ydCByZXF1aXJlZCBtb2R1bGVzXHJcbmNvbnN0IHRtaSA9IHJlcXVpcmUoJ3RtaS5qcycpO1xyXG5jb25zdCBheGlvcyA9IHJlcXVpcmUoJ2F4aW9zJyk7XHJcblxyXG4vLyBWYXJpYWJsZXMgZm9yIFR3aXRjaCwgUGVyc3BlY3RpdmUsIGFuZCBOZXRsaWZ5IEFQSVxyXG5sZXQgdHdpdGNoQ2xpZW50SWQgPSAnWU9VUl9UV0lUQ0hfQ0xJRU5UX0lEJztcclxubGV0IG5ldGxpZnlGdW5jdGlvblVybCA9ICdZT1VSX05FVExJRllfRlVOQ1RJT05fVVJMJzsgLy8gQWRkIHlvdXIgTmV0bGlmeSBmdW5jdGlvbiBVUkwgaGVyZVxyXG5cclxuLy8gQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBQZXJzcGVjdGl2ZSBBUEkgY2xpZW50XHJcbmNvbnN0IGNsaWVudCA9IG5ldyBwZXJzcGVjdGl2ZS5BcGlDbGllbnQoKTtcclxuXHJcbmNocm9tZS5hY3Rpb24ub25DbGlja2VkLmFkZExpc3RlbmVyKGZ1bmN0aW9uKCkge1xyXG4gIGNocm9tZS50YWJzLmNyZWF0ZSh7dXJsOiAnb3B0aW9ucy5odG1sJ30pO1xyXG59KTtcclxuXHJcbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgb3B0aW9ucyBwYWdlXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICBpZiAocmVxdWVzdC5tZXNzYWdlID09PSAnaW5pdGlhdGVUd2l0Y2hPQXV0aCcpIHtcclxuICAgIGluaXRpYXRlVHdpdGNoT0F1dGgoKTtcclxuICB9XHJcbn0pO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gaW5pdGlhdGVUd2l0Y2hPQXV0aCgpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvcy5nZXQobmV0bGlmeUZ1bmN0aW9uVXJsKTtcclxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIGluaXRpYXRpbmcgVHdpdGNoIE9BdXRoOiBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xyXG4gICAgfVxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSByZXNwb25zZS5kYXRhLmFjY2Vzc190b2tlbjtcclxuICAgIGlmICghYWNjZXNzVG9rZW4pIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciBpbml0aWF0aW5nIFR3aXRjaCBPQXV0aDogTm8gYWNjZXNzIHRva2VuIHJldHVybmVkJyk7XHJcbiAgICB9XHJcbiAgICAvLyBFbmNyeXB0IHRoZSBhY2Nlc3MgdG9rZW4gdXNpbmcgdGhlIGVuY3J5cHRpb24ga2V5XHJcbiAgICBjaHJvbWUuc3RvcmFnZS5zeW5jLmdldChbJ2VuY3J5cHRpb25LZXknXSwgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBlbmNyeXB0aW9uIGtleTonLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRXJyb3IgbG9hZGluZyBlbmNyeXB0aW9uIGtleTogJyArIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgZW5jcnlwdGlvbktleSA9IGRhdGEuZW5jcnlwdGlvbktleTtcclxuICAgICAgaWYgKCFlbmNyeXB0aW9uS2V5KSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IEVuY3J5cHRpb24ga2V5IG5vdCBmb3VuZCcpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRXJyb3I6IEVuY3J5cHRpb24ga2V5IG5vdCBmb3VuZCcpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBlbmNyeXB0ZWRBY2Nlc3NUb2tlbiA9IGVuY3J5cHQoYWNjZXNzVG9rZW4sIGVuY3J5cHRpb25LZXkpO1xyXG4gICAgICAvLyBTdG9yZSB0aGUgZW5jcnlwdGVkIGFjY2VzcyB0b2tlbiBzZWN1cmVseSBpbiBDaHJvbWUncyBzeW5jIHN0b3JhZ2VcclxuICAgICAgY2hyb21lLnN0b3JhZ2Uuc3luYy5zZXQoe3R3aXRjaEFjY2Vzc1Rva2VuOiBlbmNyeXB0ZWRBY2Nlc3NUb2tlbn0sIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgVHdpdGNoIGFjY2VzcyB0b2tlbjonLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICAgICAgZGlzcGxheUVycm9yKCdFcnJvciBzdG9yaW5nIFR3aXRjaCBhY2Nlc3MgdG9rZW46ICcgKyBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbml0aWF0aW5nIFR3aXRjaCBPQXV0aDonLCBlcnJvcik7XHJcbiAgICBkaXNwbGF5RXJyb3IoJ0Vycm9yIGluaXRpYXRpbmcgVHdpdGNoIE9BdXRoOiAnICsgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzYXZlUHJlZmVyZW5jZXMoKSB7XHJcbiAgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoWydlbmNyeXB0aW9uS2V5J10sIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBlbmNyeXB0aW9uIGtleTonLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICBkaXNwbGF5RXJyb3IoJ0Vycm9yIGxvYWRpbmcgZW5jcnlwdGlvbiBrZXk6ICcgKyBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgZW5jcnlwdGlvbktleSA9IGRhdGEuZW5jcnlwdGlvbktleTtcclxuICAgIGlmICghZW5jcnlwdGlvbktleSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogRW5jcnlwdGlvbiBrZXkgbm90IGZvdW5kJyk7XHJcbiAgICAgIGRpc3BsYXlFcnJvcignRXJyb3I6IEVuY3J5cHRpb24ga2V5IG5vdCBmb3VuZCcpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBsZXQgcHJlZmVyZW5jZXMgPSB7XHJcbiAgICAgIGRhcmtNb2RlOiB0aGVtZVRvZ2dsZS5jaGVja2VkLFxyXG4gICAgICBzZW50aW1lbnQ6IHtcclxuICAgICAgICBlbmFibGVkOiBmZWF0dXJlcy5zZW50aW1lbnQudG9nZ2xlLmNoZWNrZWQsXHJcbiAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgc2Vuc2l0aXZpdHk6IGZlYXR1cmVzLnNlbnRpbWVudC5zZW5zaXRpdml0eS52YWx1ZSxcclxuICAgICAgICAgIHNob3dUb3BTY29yZXJzOiBmZWF0dXJlcy5zZW50aW1lbnQuc2hvd1RvcFNjb3JlcnMuY2hlY2tlZCxcclxuICAgICAgICAgIHNob3dCb3R0b21TY29yZXJzOiBmZWF0dXJlcy5zZW50aW1lbnQuc2hvd0JvdHRvbVNjb3JlcnMuY2hlY2tlZCxcclxuICAgICAgICAgIGxlYWRlcmJvYXJkRHVyYXRpb246IGZlYXR1cmVzLnNlbnRpbWVudC5sZWFkZXJib2FyZER1cmF0aW9uLnZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICB0b3hpY2l0eToge1xyXG4gICAgICAgIGVuYWJsZWQ6IGZlYXR1cmVzLnRveGljaXR5LnRvZ2dsZS5jaGVja2VkLFxyXG4gICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgIG1lc3NhZ2U6IGZlYXR1cmVzLnRveGljaXR5bWVzc2FnZS52YWx1ZSxcclxuICAgICAgICAgIG1vZE5vdGlmaWNhdGlvbjogZmVhdHVyZXMudG94aWNpdHkubW9kTm90aWZpY2F0aW9uLmNoZWNrZWQsXHJcbiAgICAgICAgICBzZWxmTm90aWZpY2F0aW9uOiBmZWF0dXJlcy50b3hpY2l0eS5zZWxmTm90aWZpY2F0aW9uLmNoZWNrZWQsXHJcbiAgICAgICAgICBtb2RNZXNzYWdlOiBmZWF0dXJlcy50b3hpY2l0eS5tb2RNZXNzYWdlLnZhbHVlLFxyXG4gICAgICAgICAgc2VsZk1lc3NhZ2U6IGZlYXR1cmVzLnRveGljaXR5LnNlbGZNZXNzYWdlLnZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgLy8gRW5jcnlwdCB0aGUgcHJlZmVyZW5jZXMgdXNpbmcgdGhlIGVuY3J5cHRpb24ga2V5XHJcbiAgICBjb25zdCBlbmNyeXB0ZWRQcmVmZXJlbmNlcyA9IGVuY3J5cHQocHJlZmVyZW5jZXMsIGVuY3J5cHRpb25LZXkpO1xyXG4gICAgLy8gU3RvcmUgdGhlIGVuY3J5cHRlZCBwcmVmZXJlbmNlcyBzZWN1cmVseSBpbiBDaHJvbWUncyBzeW5jIHN0b3JhZ2VcclxuICAgIGNocm9tZS5zdG9yYWdlLnN5bmMuc2V0KHtwcmVmZXJlbmNlczogZW5jcnlwdGVkUHJlZmVyZW5jZXN9LCBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNhdmluZyBwcmVmZXJlbmNlczonLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRXJyb3Igc2F2aW5nIHByZWZlcmVuY2VzOiAnICsgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuLy8gRnVuY3Rpb24gdG8gZ2V0IHRoZSBjdXJyZW50IFR3aXRjaCBjaGFubmVsXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRDaGFubmVsKHRva2VuLCBjbGllbnRJZCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS50d2l0Y2gudHYvaGVsaXgvdXNlcnMnLCB7XHJcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke3Rva2VufWAsXHJcbiAgICAgICAgICAgICAgICAnQ2xpZW50LUlkJzogY2xpZW50SWRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIGdldHRpbmcgY3VycmVudCBUd2l0Y2ggY2hhbm5lbDogSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICByZXR1cm4gZGF0YS5kYXRhWzBdLmxvZ2luO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGN1cnJlbnQgVHdpdGNoIGNoYW5uZWw6JywgZXJyb3IpO1xyXG4gICAgICAgIHNlbmRXYXJuaW5nVG9FeHRVc2VyKCdFcnJvciBnZXR0aW5nIGN1cnJlbnQgVHdpdGNoIGNoYW5uZWw6ICcgKyBlcnJvci5tZXNzYWdlKTtcclxuICAgIH1cclxufVxyXG5cclxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChyZXF1ZXN0LCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG5pZiAoKHJlcXVlc3QudHlwZSA9PT0gJ2FuYWx5emVTZW50aW1lbnQnKSB8fCAocmVxdWVzdC50eXBlID09PSAnYW5hbHl6ZVRveGljaXR5JykpIHtcclxuICAgIGNvbnN0IGNvbW1lbnQgPSByZXF1ZXN0LmNvbW1lbnQ7XHJcbiAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9jb21tZW50YW5hbHl6ZXIuZ29vZ2xlYXBpcy5jb20vdjFhbHBoYTEvY29tbWVudHM6YW5hbHl6ZT9rZXk9JHtPQVVUSF9DTElFTlRfSUR9YDtcclxuICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgICAgY29tbWVudDogeyB0ZXh0OiBjb21tZW50IH0sXHJcbiAgICAgICAgbGFuZ3VhZ2VzOiBbJ2VuJ10sXHJcbiAgICAgICAgcmVxdWVzdGVkQXR0cmlidXRlczogeyBUT1hJQ0lUWToge30gfVxyXG4gICAgfTtcclxuXHJcbiAgICBmZXRjaCh1cmwsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfVxyXG4gICAgfSlcclxuICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNjb3JlID0gZGF0YS5hdHRyaWJ1dGVTY29yZXMuVE9YSUNJVFkuc3VtbWFyeVNjb3JlLnZhbHVlO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHNjb3JlIH0pO1xyXG4gICAgfSlcclxuICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IGVycm9yOiAnRXJyb3IgYW5hbHl6aW5nIGNvbW1lbnQnIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRydWU7ICAvLyBXaWxsIHJlc3BvbmQgYXN5bmNocm9ub3VzbHkuXHJcbn1cclxuLy8gT3RoZXIgbWVzc2FnZSBoYW5kbGluZy4uLlxyXG59KTtcclxuXHJcbi8vIEZ1bmN0aW9uIHRvIGhhbmRsZSBUd2l0Y2ggY2hhdCBtZXNzYWdlc1xyXG5jb25zdCBoYW5kbGVDaGF0TWVzc2FnZSA9IGFzeW5jIChjaGFubmVsLCB1c2Vyc3RhdGUsIG1lc3NhZ2UsIHNlbGYpID0+IHtcclxuICAvLyBJZ25vcmUgbWVzc2FnZXMgZnJvbSB0aGUgYm90IGl0c2VsZlxyXG4gIGlmIChzZWxmKSByZXR1cm47XHJcblxyXG4gIC8vIFZhcmlhYmxlcyB0byBzdG9yZSB0aGUgc2VudGltZW50IGFuZCB0b3hpY2l0eSBzY29yZXNcclxuICBsZXQgc2VudGltZW50U2NvcmUgPSBudWxsO1xyXG4gIGxldCB0b3hpY2l0eVNjb3JlID0gbnVsbDtcclxuXHJcbiAgdHJ5IHtcclxuICAgICAgaWYgKGVuYWJsZVNlbnRpbWVudEFuYWx5c2lzKSB7XHJcbiAgICAgICAgICBzZW50aW1lbnRTY29yZSA9IGFuYWx5emVTZW50aW1lbnQobWVzc2FnZSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGVuYWJsZVRveGljaXR5RGV0ZWN0aW9uKSB7XHJcbiAgICAgICAgICB0b3hpY2l0eVNjb3JlID0gYXdhaXQgYW5hbHl6ZVRveGljaXR5KG1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYW5hbHl6aW5nIG1lc3NhZ2U6JywgZXJyb3IpO1xyXG4gIH1cclxuXHJcbiAgLy8gSGFuZGxlIHRoZSBtZXNzYWdlIGJhc2VkIG9uIHRoZSBzZW50aW1lbnQgYW5kIHRveGljaXR5IHNjb3Jlc1xyXG4gIGlmIChzZW50aW1lbnRTY29yZSAhPT0gbnVsbCAmJiB0b3hpY2l0eVNjb3JlICE9PSBudWxsKSB7XHJcbiAgICAgIGhhbmRsZUJvdGhTY29yZXMoc2VudGltZW50U2NvcmUsIHRveGljaXR5U2NvcmUsIHVzZXJzdGF0ZS51c2VybmFtZSk7XHJcbiAgfSBlbHNlIGlmIChzZW50aW1lbnRTY29yZSAhPT0gbnVsbCkge1xyXG4gICAgICBoYW5kbGVTZW50aW1lbnRTY29yZShzZW50aW1lbnRTY29yZSwgdXNlcnN0YXRlLnVzZXJuYW1lKTtcclxuICB9IGVsc2UgaWYgKHRveGljaXR5U2NvcmUgIT09IG51bGwpIHtcclxuICAgICAgaGFuZGxlVG94aWNpdHlTY29yZSh0b3hpY2l0eVNjb3JlLCB1c2Vyc3RhdGUudXNlcm5hbWUpO1xyXG4gIH1cclxuICAvLyBJZiBuZWl0aGVyIHNlbnRpbWVudCBhbmFseXNpcyBub3IgdG94aWNpdHkgZGV0ZWN0aW9uIGFyZSBlbmFibGVkLCBqdXN0IGRpc3BsYXkgdGhlIG1lc3NhZ2VcclxuICAvLyBhcyBpc1xyXG59XHJcblxyXG5jb25zdCBoYW5kbGVCb3RoU2NvcmVzID0gKHNlbnRpbWVudFNjb3JlLCB0b3hpY2l0eVNjb3JlLCB1c2VybmFtZSkgPT4ge1xyXG4gIGlmIChzZW50aW1lbnRTY29yZSA8IHNlbnRpbWVudE9wdGlvbnMudGhyZXNob2xkICYmIHRveGljaXR5U2NvcmUgPiB0b3hpY2l0eU9wdGlvbnMudGhyZXNob2xkKSB7XHJcbiAgICAgIHRha2VBY3Rpb24odXNlcm5hbWUpO1xyXG4gIH1cclxufVxyXG5cclxuY29uc3QgaGFuZGxlU2VudGltZW50U2NvcmUgPSAoc2VudGltZW50U2NvcmUsIHVzZXJuYW1lKSA9PiB7XHJcbiAgaWYgKHNlbnRpbWVudFNjb3JlIDwgc2VudGltZW50T3B0aW9ucy50aHJlc2hvbGQpIHtcclxuICAgICAgdGFrZUFjdGlvbih1c2VybmFtZSk7XHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBoYW5kbGVUb3hpY2l0eVNjb3JlID0gKHRveGljaXR5U2NvcmUsIHVzZXJuYW1lKSA9PiB7XHJcbiAgaWYgKHRveGljaXR5U2NvcmUgPiB0b3hpY2l0eU9wdGlvbnMudGhyZXNob2xkKSB7XHJcbiAgICAgIHRha2VBY3Rpb24odXNlcm5hbWUpO1xyXG4gIH1cclxufVxyXG5cclxuY29uc3QgdGFrZUFjdGlvbiA9ICh1c2VybmFtZSkgPT4ge1xyXG4gIGlmICh3YXJuaW5nVG94aWNVc2VyKSB7XHJcbiAgICAgIHNlbmRXYXJuaW5nKHVzZXJuYW1lLCB3YXJuaW5nTWVzc2FnZVRveGljKTtcclxuICB9XHJcblxyXG4gIGlmIChjdXN0b21NZXNzYWdlVG94aWNVc2VyKSB7XHJcbiAgICAgIHNlbmRDdXN0b21NZXNzYWdlKHVzZXJuYW1lLCBjdXN0b21NZXNzYWdlVG94aWMpO1xyXG4gIH1cclxuICBpZiAoY3VzdG9tTWVzc2FnZU5lZ2F0aXZlVXNlcikge1xyXG4gICAgICBzZW5kQ3VzdG9tTWVzc2FnZSh1c2VybmFtZSwgY3VzdG9tTWVzc2FnZU5lZ2F0aXZlKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEZ1bmN0aW9uIHRvIHNlbmQgYSB3YXJuaW5nIHRvIHRoZSBleHRlbnNpb24gdXNlclxyXG5mdW5jdGlvbiBzZW5kV2FybmluZ1RvRXh0VXNlcih3YXJuaW5nTWVzc2FnZSkge1xyXG4gIC8vIERpc3BsYXkgdGhlIHdhcm5pbmcgbWVzc2FnZSB0byB0aGUgZXh0ZW5zaW9uIHVzZXJcclxuICBjaHJvbWUubm90aWZpY2F0aW9ucy5jcmVhdGUoe1xyXG4gICAgdHlwZTogJ2Jhc2ljJyxcclxuICAgIGljb25Vcmw6ICdpY29uLnBuZycsXHJcbiAgICB0aXRsZTogJ1N0cmVhbU1hdGV5IFdhcm5pbmcnLFxyXG4gICAgbWVzc2FnZTogd2FybmluZ01lc3NhZ2VcclxuICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbW9uaXRvclR3aXRjaENoYXQoKSB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEdldCB0aGUgZW5jcnlwdGVkIFR3aXRjaCBhY2Nlc3MgdG9rZW4gYW5kIGVuY3J5cHRpb24ga2V5IGZyb20gQ2hyb21lJ3Mgc3luYyBzdG9yYWdlXHJcbiAgICBjaHJvbWUuc3RvcmFnZS5zeW5jLmdldChbJ3R3aXRjaEFjY2Vzc1Rva2VuJywgJ2VuY3J5cHRpb25LZXknXSwgYXN5bmMgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBUd2l0Y2ggYWNjZXNzIHRva2VuIG9yIGVuY3J5cHRpb24ga2V5OicsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XHJcbiAgICAgICAgZGlzcGxheUVycm9yKCdFcnJvciBsb2FkaW5nIFR3aXRjaCBhY2Nlc3MgdG9rZW4gb3IgZW5jcnlwdGlvbiBrZXk6ICcgKyBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGVuY3J5cHRlZEFjY2Vzc1Rva2VuID0gZGF0YS50d2l0Y2hBY2Nlc3NUb2tlbjtcclxuICAgICAgY29uc3QgZW5jcnlwdGlvbktleSA9IGRhdGEuZW5jcnlwdGlvbktleTtcclxuICAgICAgaWYgKCFlbmNyeXB0ZWRBY2Nlc3NUb2tlbiB8fCAhZW5jcnlwdGlvbktleSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOiBUd2l0Y2ggYWNjZXNzIHRva2VuIG9yIGVuY3J5cHRpb24ga2V5IG5vdCBmb3VuZCcpO1xyXG4gICAgICAgIGRpc3BsYXlFcnJvcignRXJyb3I6IFR3aXRjaCBhY2Nlc3MgdG9rZW4gb3IgZW5jcnlwdGlvbiBrZXkgbm90IGZvdW5kJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIERlY3J5cHQgdGhlIFR3aXRjaCBhY2Nlc3MgdG9rZW4gdXNpbmcgdGhlIGVuY3J5cHRpb24ga2V5XHJcbiAgICAgIGNvbnN0IHR3aXRjaEFjY2Vzc1Rva2VuID0gYXdhaXQgZGVjcnlwdChlbmNyeXB0ZWRBY2Nlc3NUb2tlbiwgZW5jcnlwdGlvbktleSk7XHJcbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBUd2l0Y2ggY2hhbm5lbFxyXG4gICAgICBjb25zdCBjaGFubmVsID0gYXdhaXQgZ2V0Q3VycmVudENoYW5uZWwodHdpdGNoQWNjZXNzVG9rZW4sIHR3aXRjaENsaWVudElkKTtcclxuICAgICAgLy8gQ29uZmlndXJlIHRoZSBUd2l0Y2ggY2hhdCBjbGllbnRcclxuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgICBvcHRpb25zOiB7IGRlYnVnOiB0cnVlIH0sXHJcbiAgICAgICAgY29ubmVjdGlvbjogeyByZWNvbm5lY3Q6IHRydWUgfSxcclxuICAgICAgICBpZGVudGl0eTogeyB1c2VybmFtZTogY2hhbm5lbCwgcGFzc3dvcmQ6IGBvYXV0aDoke3R3aXRjaEFjY2Vzc1Rva2VufWAgfSxcclxuICAgICAgICBjaGFubmVsczogW2NoYW5uZWxdXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnN0IGNsaWVudCA9IG5ldyB0bWkuY2xpZW50KG9wdGlvbnMpO1xyXG4gICAgICAvLyBDb25uZWN0IHRvIHRoZSBUd2l0Y2ggY2hhdFxyXG4gICAgICBjbGllbnQuY29ubmVjdCgpO1xyXG4gICAgICAvLyBMaXN0ZW4gZm9yIGNoYXQgbWVzc2FnZXNcclxuICAgICAgY2xpZW50Lm9uKCdtZXNzYWdlJywgaGFuZGxlQ2hhdE1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIG1vbml0b3JpbmcgVHdpdGNoIGNoYXQ6JywgZXJyb3IpO1xyXG4gICAgZGlzcGxheUVycm9yKCdFcnJvciBtb25pdG9yaW5nIFR3aXRjaCBjaGF0OiAnICsgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuLy8gU3RhcnQgbW9uaXRvcmluZyBUd2l0Y2ggY2hhdCB3aGVuIHRoZSBleHRlbnNpb24gaXMgaW5zdGFsbGVkIG9yIHVwZGF0ZWRcclxuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIobW9uaXRvclR3aXRjaENoYXQpO1xyXG5cclxuXHJcbi8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgb3B0aW9ucyBwYWdlXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuaWYgKHJlcXVlc3QubWVzc2FnZSA9PT0gJ2luaXRpYXRlVHdpdGNoT0F1dGgnKSB7XHJcbiAgaW5pdGlhdGVUd2l0Y2hPQXV0aCgpO1xyXG59IGVsc2UgaWYgKHJlcXVlc3QubWVzc2FnZSA9PT0gJ2ZldGNoQ2hhdE1lc3NhZ2VzJykge1xyXG4gIGZldGNoQ2hhdE1lc3NhZ2VzKHJlcXVlc3QuY2hhbm5lbClcclxuICAudGhlbihjaGF0TWVzc2FnZXMgPT4gc2VuZFJlc3BvbnNlKGNoYXRNZXNzYWdlcykpXHJcbiAgLmNhdGNoKGVycm9yID0+IGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIGNoYXQgbWVzc2FnZXM6JywgZXJyb3IpKTtcclxufSBlbHNlIGlmIChyZXF1ZXN0Lm1lc3NhZ2UgPT09ICdtb25pdG9yVHdpdGNoQ2hhdCcpIHtcclxuICBtb25pdG9yVHdpdGNoQ2hhdCgpO1xyXG59XHJcblxyXG59KTtcclxuXHJcbi8vIEdldCBUd2l0Y2ggQWNjZXNzIFRva2VuIGZyb20gQ2hyb21lIFN0b3JhZ2VcclxubGV0IHR3aXRjaEFjY2Vzc1Rva2VuO1xyXG5jaHJvbWUuc3RvcmFnZS5zeW5jLmdldCgndHdpdGNoQWNjZXNzVG9rZW4nLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgdHdpdGNoQWNjZXNzVG9rZW4gPSBkYXRhLnR3aXRjaEFjY2Vzc1Rva2VuO1xyXG4gIGlmICghdHdpdGNoQWNjZXNzVG9rZW4pIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOiBUd2l0Y2ggYWNjZXNzIHRva2VuIG5vdCBmb3VuZCcpO1xyXG4gICAgZGlzcGxheUVycm9yKCdFcnJvcjogVHdpdGNoIGFjY2VzcyB0b2tlbiBub3QgZm91bmQnKTtcclxuICB9XHJcbn0pO1xyXG5cclxuY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoZnVuY3Rpb24oKSB7XHJcbiAgY2hyb21lLnRhYnMuY3JlYXRlKHt1cmw6ICdvcHRpb25zLmh0bWwnfSk7XHJcbn0pO1xyXG5cclxuLy8gRnVuY3Rpb24gdG8gaGFuZGxlIGVycm9yc1xyXG5mdW5jdGlvbiBoYW5kbGVFcnJvcihlcnJvciwgbWVzc2FnZSkge1xyXG4gIGNvbnNvbGUuZXJyb3IobWVzc2FnZSwgZXJyb3IpO1xyXG4gIHNlbmRXYXJuaW5nVG9FeHRVc2VyKGAke21lc3NhZ2V9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbn1cclxuXHJcbi8vIEZ1bmN0aW9uIHRvIGRpc3BsYXkgYW4gZXJyb3IgdG8gdGhlIGV4dGVuc2lvbiB1c2VyXHJcbmZ1bmN0aW9uIGRpc3BsYXlFcnJvcihtZXNzYWdlKSB7XHJcbiAgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKHtcclxuICAgICAgdHlwZTogJ2Jhc2ljJyxcclxuICAgICAgaWNvblVybDogJ2ljb24ucG5nJyxcclxuICAgICAgdGl0bGU6ICdTdHJlYW1NYXRleSBFcnJvcicsXHJcbiAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcclxuICB9KTtcclxufVxyXG5cclxuLy8gRnVuY3Rpb24gdG8gY29udmVydCBBcnJheUJ1ZmZlciB0byBIZXhhZGVjaW1hbFxyXG5mdW5jdGlvbiBidWYyaGV4KGJ1ZmZlcikgeyBcclxuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIHggPT4gKCcwMCcgKyB4LnRvU3RyaW5nKDE2KSkuc2xpY2UoLTIpKS5qb2luKCcnKTtcclxufVxyXG5cclxuLy8gRW5jcnlwdGlvbiBmdW5jdGlvblxyXG5hc3luYyBmdW5jdGlvbiBlbmNyeXB0KGRhdGEsIGp3aykge1xyXG4gIC8vIEltcG9ydCB0aGUgSldLIGJhY2sgdG8gYSBDcnlwdG9LZXlcclxuICBjb25zdCBrZXkgPSBhd2FpdCB3aW5kb3cuY3J5cHRvLnN1YnRsZS5pbXBvcnRLZXkoJ2p3aycsIGp3aywgeyBuYW1lOiBcIkFFUy1HQ01cIiB9LCBmYWxzZSwgW1wiZW5jcnlwdFwiLCBcImRlY3J5cHRcIl0pO1xyXG5cclxuICBsZXQgZW5jb2RlZCA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShKU09OLnN0cmluZ2lmeShkYXRhKSk7XHJcbiAgbGV0IGl2ID0gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoMTIpKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgICAgY29uc3QgZW5jcnlwdGVkID0gYXdhaXQgd2luZG93LmNyeXB0by5zdWJ0bGUuZW5jcnlwdChcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBuYW1lOiBcIkFFUy1HQ01cIixcclxuICAgICAgICAgICAgICBpdjogaXYsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAga2V5LFxyXG4gICAgICAgICAgZW5jb2RlZFxyXG4gICAgICApO1xyXG4gICAgIC8vIENvbnZlcnQgdG8gQmFzZTY0IGFuZCBwcmVwZW5kIElWIGZvciBzdG9yYWdlXHJcbiAgICAgbGV0IGVuY3J5cHRlZFN0ciA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQ4QXJyYXkoZW5jcnlwdGVkKSkpKSk7XHJcbiAgICAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgaXYpKSkpICsgJywnICsgZW5jcnlwdGVkU3RyO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgIGRpc3BsYXlFcnJvcignRXJyb3IgZW5jcnlwdGluZyBkYXRhOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICB0aHJvdyBlcnI7IC8vIFByb3BhZ2F0ZSB0aGUgZXJyb3JcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGRlY3J5cHQoZGF0YSwgandrKSB7XHJcbiAgLy8gSW1wb3J0IHRoZSBKV0sgYmFjayB0byBhIENyeXB0b0tleVxyXG4gIGNvbnN0IGtleSA9IGF3YWl0IHdpbmRvdy5jcnlwdG8uc3VidGxlLmltcG9ydEtleSgnandrJywgandrLCB7IG5hbWU6IFwiQUVTLUdDTVwiIH0sIGZhbHNlLCBbXCJlbmNyeXB0XCIsIFwiZGVjcnlwdFwiXSk7XHJcblxyXG4gIGxldCBwYXJ0cyA9IGRhdGEuc3BsaXQoJywnKTtcclxuICBsZXQgaXYgPSBuZXcgVWludDhBcnJheShkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IocGFydHNbMF0pKSkuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSkpO1xyXG4gIGxldCBlbmNyeXB0ZWQgPSBuZXcgVWludDhBcnJheShkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IocGFydHNbMV0pKSkuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSkpO1xyXG5cclxuICB0cnkge1xyXG4gICAgICBjb25zdCBkZWNyeXB0ZWQgPSBhd2FpdCB3aW5kb3cuY3J5cHRvLnN1YnRsZS5kZWNyeXB0KFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAgIG5hbWU6IFwiQUVTLUdDTVwiLFxyXG4gICAgICAgICAgICAgIGl2OiBpdixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBrZXksXHJcbiAgICAgICAgICBlbmNyeXB0ZWRcclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuIEpTT04ucGFyc2UobmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGRlY3J5cHRlZCkpO1xyXG4gIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgIGRpc3BsYXlFcnJvcignRXJyb3IgZGVjcnlwdGluZyBkYXRhOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICB0aHJvdyBlcnI7IC8vIFByb3BhZ2F0ZSB0aGUgZXJyb3JcclxuICB9XHJcblxyXG59XHJcbiJdLCJuYW1lcyI6WyJfcmVnZW5lcmF0b3JSdW50aW1lIiwiZXhwb3J0cyIsIk9wIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duIiwiaGFzT3duUHJvcGVydHkiLCJkZWZpbmVQcm9wZXJ0eSIsIm9iaiIsImtleSIsImRlc2MiLCJ2YWx1ZSIsIiRTeW1ib2wiLCJTeW1ib2wiLCJpdGVyYXRvclN5bWJvbCIsIml0ZXJhdG9yIiwiYXN5bmNJdGVyYXRvclN5bWJvbCIsImFzeW5jSXRlcmF0b3IiLCJ0b1N0cmluZ1RhZ1N5bWJvbCIsInRvU3RyaW5nVGFnIiwiZGVmaW5lIiwiZW51bWVyYWJsZSIsImNvbmZpZ3VyYWJsZSIsIndyaXRhYmxlIiwiZXJyIiwid3JhcCIsImlubmVyRm4iLCJvdXRlckZuIiwic2VsZiIsInRyeUxvY3NMaXN0IiwicHJvdG9HZW5lcmF0b3IiLCJHZW5lcmF0b3IiLCJnZW5lcmF0b3IiLCJjcmVhdGUiLCJjb250ZXh0IiwiQ29udGV4dCIsIm1ha2VJbnZva2VNZXRob2QiLCJ0cnlDYXRjaCIsImZuIiwiYXJnIiwidHlwZSIsImNhbGwiLCJDb250aW51ZVNlbnRpbmVsIiwiR2VuZXJhdG9yRnVuY3Rpb24iLCJHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSIsIkl0ZXJhdG9yUHJvdG90eXBlIiwiZ2V0UHJvdG8iLCJnZXRQcm90b3R5cGVPZiIsIk5hdGl2ZUl0ZXJhdG9yUHJvdG90eXBlIiwidmFsdWVzIiwiR3AiLCJkZWZpbmVJdGVyYXRvck1ldGhvZHMiLCJmb3JFYWNoIiwibWV0aG9kIiwiX2ludm9rZSIsIkFzeW5jSXRlcmF0b3IiLCJQcm9taXNlSW1wbCIsImludm9rZSIsInJlc29sdmUiLCJyZWplY3QiLCJyZWNvcmQiLCJyZXN1bHQiLCJfdHlwZW9mIiwiX19hd2FpdCIsInRoZW4iLCJ1bndyYXBwZWQiLCJlcnJvciIsInByZXZpb3VzUHJvbWlzZSIsImNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnIiwic3RhdGUiLCJFcnJvciIsImRvbmVSZXN1bHQiLCJkZWxlZ2F0ZSIsImRlbGVnYXRlUmVzdWx0IiwibWF5YmVJbnZva2VEZWxlZ2F0ZSIsInNlbnQiLCJfc2VudCIsImRpc3BhdGNoRXhjZXB0aW9uIiwiYWJydXB0IiwiZG9uZSIsIm1ldGhvZE5hbWUiLCJ1bmRlZmluZWQiLCJUeXBlRXJyb3IiLCJpbmZvIiwicmVzdWx0TmFtZSIsIm5leHQiLCJuZXh0TG9jIiwicHVzaFRyeUVudHJ5IiwibG9jcyIsImVudHJ5IiwidHJ5TG9jIiwiY2F0Y2hMb2MiLCJmaW5hbGx5TG9jIiwiYWZ0ZXJMb2MiLCJ0cnlFbnRyaWVzIiwicHVzaCIsInJlc2V0VHJ5RW50cnkiLCJjb21wbGV0aW9uIiwicmVzZXQiLCJpdGVyYWJsZSIsIml0ZXJhdG9yTWV0aG9kIiwiaXNOYU4iLCJsZW5ndGgiLCJpIiwiZGlzcGxheU5hbWUiLCJpc0dlbmVyYXRvckZ1bmN0aW9uIiwiZ2VuRnVuIiwiY3RvciIsImNvbnN0cnVjdG9yIiwibmFtZSIsIm1hcmsiLCJzZXRQcm90b3R5cGVPZiIsIl9fcHJvdG9fXyIsImF3cmFwIiwiYXN5bmMiLCJQcm9taXNlIiwiaXRlciIsImtleXMiLCJ2YWwiLCJvYmplY3QiLCJyZXZlcnNlIiwicG9wIiwic2tpcFRlbXBSZXNldCIsInByZXYiLCJjaGFyQXQiLCJzbGljZSIsInN0b3AiLCJyb290UmVjb3JkIiwicnZhbCIsImV4Y2VwdGlvbiIsImhhbmRsZSIsImxvYyIsImNhdWdodCIsImhhc0NhdGNoIiwiaGFzRmluYWxseSIsImZpbmFsbHlFbnRyeSIsImNvbXBsZXRlIiwiZmluaXNoIiwiX2NhdGNoIiwidGhyb3duIiwiZGVsZWdhdGVZaWVsZCIsImFzeW5jR2VuZXJhdG9yU3RlcCIsImdlbiIsIl9uZXh0IiwiX3Rocm93IiwiX2FzeW5jVG9HZW5lcmF0b3IiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJ0bWkiLCJyZXF1aXJlIiwiYXhpb3MiLCJ0d2l0Y2hDbGllbnRJZCIsIm5ldGxpZnlGdW5jdGlvblVybCIsImNsaWVudCIsInBlcnNwZWN0aXZlIiwiQXBpQ2xpZW50IiwiY2hyb21lIiwiYWN0aW9uIiwib25DbGlja2VkIiwiYWRkTGlzdGVuZXIiLCJ0YWJzIiwidXJsIiwicnVudGltZSIsIm9uTWVzc2FnZSIsInJlcXVlc3QiLCJzZW5kZXIiLCJzZW5kUmVzcG9uc2UiLCJtZXNzYWdlIiwiaW5pdGlhdGVUd2l0Y2hPQXV0aCIsIl9pbml0aWF0ZVR3aXRjaE9BdXRoIiwiX2NhbGxlZTIiLCJyZXNwb25zZSIsImFjY2Vzc1Rva2VuIiwiX2NhbGxlZTIkIiwiX2NvbnRleHQyIiwiZ2V0Iiwic3RhdHVzIiwiY29uY2F0IiwiZGF0YSIsImFjY2Vzc190b2tlbiIsInN0b3JhZ2UiLCJzeW5jIiwibGFzdEVycm9yIiwiY29uc29sZSIsImRpc3BsYXlFcnJvciIsImVuY3J5cHRpb25LZXkiLCJlbmNyeXB0ZWRBY2Nlc3NUb2tlbiIsImVuY3J5cHQiLCJzZXQiLCJ0d2l0Y2hBY2Nlc3NUb2tlbiIsInQwIiwic2F2ZVByZWZlcmVuY2VzIiwicHJlZmVyZW5jZXMiLCJkYXJrTW9kZSIsInRoZW1lVG9nZ2xlIiwiY2hlY2tlZCIsInNlbnRpbWVudCIsImVuYWJsZWQiLCJmZWF0dXJlcyIsInRvZ2dsZSIsIm9wdGlvbnMiLCJzZW5zaXRpdml0eSIsInNob3dUb3BTY29yZXJzIiwic2hvd0JvdHRvbVNjb3JlcnMiLCJsZWFkZXJib2FyZER1cmF0aW9uIiwidG94aWNpdHkiLCJ0b3hpY2l0eW1lc3NhZ2UiLCJtb2ROb3RpZmljYXRpb24iLCJzZWxmTm90aWZpY2F0aW9uIiwibW9kTWVzc2FnZSIsInNlbGZNZXNzYWdlIiwiZW5jcnlwdGVkUHJlZmVyZW5jZXMiLCJnZXRDdXJyZW50Q2hhbm5lbCIsIl94IiwiX3gyIiwiX2dldEN1cnJlbnRDaGFubmVsIiwiX2NhbGxlZTMiLCJ0b2tlbiIsImNsaWVudElkIiwiX2NhbGxlZTMkIiwiX2NvbnRleHQzIiwiZmV0Y2giLCJoZWFkZXJzIiwianNvbiIsImxvZ2luIiwic2VuZFdhcm5pbmdUb0V4dFVzZXIiLCJjb21tZW50IiwiT0FVVEhfQ0xJRU5UX0lEIiwidGV4dCIsImxhbmd1YWdlcyIsInJlcXVlc3RlZEF0dHJpYnV0ZXMiLCJUT1hJQ0lUWSIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5Iiwic2NvcmUiLCJhdHRyaWJ1dGVTY29yZXMiLCJzdW1tYXJ5U2NvcmUiLCJoYW5kbGVDaGF0TWVzc2FnZSIsIl9yZWYiLCJfY2FsbGVlIiwiY2hhbm5lbCIsInVzZXJzdGF0ZSIsInNlbnRpbWVudFNjb3JlIiwidG94aWNpdHlTY29yZSIsIl9jYWxsZWUkIiwiX2NvbnRleHQiLCJlbmFibGVTZW50aW1lbnRBbmFseXNpcyIsImFuYWx5emVTZW50aW1lbnQiLCJlbmFibGVUb3hpY2l0eURldGVjdGlvbiIsImFuYWx5emVUb3hpY2l0eSIsImhhbmRsZUJvdGhTY29yZXMiLCJ1c2VybmFtZSIsImhhbmRsZVNlbnRpbWVudFNjb3JlIiwiaGFuZGxlVG94aWNpdHlTY29yZSIsIl94MyIsIl94NCIsIl94NSIsIl94NiIsInNlbnRpbWVudE9wdGlvbnMiLCJ0aHJlc2hvbGQiLCJ0b3hpY2l0eU9wdGlvbnMiLCJ0YWtlQWN0aW9uIiwid2FybmluZ1RveGljVXNlciIsInNlbmRXYXJuaW5nIiwid2FybmluZ01lc3NhZ2VUb3hpYyIsImN1c3RvbU1lc3NhZ2VUb3hpY1VzZXIiLCJzZW5kQ3VzdG9tTWVzc2FnZSIsImN1c3RvbU1lc3NhZ2VUb3hpYyIsImN1c3RvbU1lc3NhZ2VOZWdhdGl2ZVVzZXIiLCJjdXN0b21NZXNzYWdlTmVnYXRpdmUiLCJ3YXJuaW5nTWVzc2FnZSIsIm5vdGlmaWNhdGlvbnMiLCJpY29uVXJsIiwidGl0bGUiLCJtb25pdG9yVHdpdGNoQ2hhdCIsIl9tb25pdG9yVHdpdGNoQ2hhdCIsIl9jYWxsZWU1IiwiX2NhbGxlZTUkIiwiX2NvbnRleHQ1IiwiX3JlZjIiLCJfY2FsbGVlNCIsIl9jYWxsZWU0JCIsIl9jb250ZXh0NCIsImRlY3J5cHQiLCJkZWJ1ZyIsImNvbm5lY3Rpb24iLCJyZWNvbm5lY3QiLCJpZGVudGl0eSIsInBhc3N3b3JkIiwiY2hhbm5lbHMiLCJjb25uZWN0Iiwib24iLCJfeDExIiwib25JbnN0YWxsZWQiLCJmZXRjaENoYXRNZXNzYWdlcyIsImNoYXRNZXNzYWdlcyIsImhhbmRsZUVycm9yIiwiYnVmMmhleCIsImJ1ZmZlciIsIkFycmF5IiwibWFwIiwiVWludDhBcnJheSIsIngiLCJ0b1N0cmluZyIsImpvaW4iLCJfeDciLCJfeDgiLCJfZW5jcnlwdCIsIl9jYWxsZWU2IiwiandrIiwiZW5jb2RlZCIsIml2IiwiZW5jcnlwdGVkIiwiZW5jcnlwdGVkU3RyIiwiX2NhbGxlZTYkIiwiX2NvbnRleHQ2Iiwid2luZG93IiwiY3J5cHRvIiwic3VidGxlIiwiaW1wb3J0S2V5IiwiVGV4dEVuY29kZXIiLCJlbmNvZGUiLCJnZXRSYW5kb21WYWx1ZXMiLCJidG9hIiwidW5lc2NhcGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJfeDkiLCJfeDEwIiwiX2RlY3J5cHQiLCJfY2FsbGVlNyIsInBhcnRzIiwiZGVjcnlwdGVkIiwiX2NhbGxlZTckIiwiX2NvbnRleHQ3Iiwic3BsaXQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJlc2NhcGUiLCJhdG9iIiwiYyIsImNoYXJDb2RlQXQiLCJwYXJzZSIsIlRleHREZWNvZGVyIiwiZGVjb2RlIl0sInNvdXJjZVJvb3QiOiIifQ==