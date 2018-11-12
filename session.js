/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var server = require('ngui-utils/server');
var { ClientService } = require('ngui-utils/cli_service');
var crypto = require('crypto');
var fs = require('ngui-utils/fs');

// check users
if (!fs.existsSync(__dirname + '/users.js')) {
	fs.cp_sync(__dirname + '/.users.js', __dirname + '/users.js');
}
var users = require('./users');

var all_device_session = {
	/**
	['deviceId_0']: {
		['session_id_0']: { ttyd, tty },
		['session_id_1']: { ttyd, tty }
	}
	 */
};

/**
 * @class Session
 */
class Session {
	get id() { return this.m_id }
	get device() { return this.m_device }
	get tty() { return this.m_tty }
	get ttyd() { return this.m_ttyd }
	set ttyd(value) { this.m_ttyd = value }
	constructor(device, tty) {
		this.m_id = utils.id;
		this.m_device = device;
		this.m_tty = tty;
		this.m_ttyd = null;
	}
}

/**
 * @class Basic
 */
var Basic = utils.class('Basic', ClientService, {

	m_message: null,
	m_recipient: null, // conv
	m_session_id: 0,
	m_device_id: 0,
	m_session: null,

	m_open: function() {},
	m_close: function() {},

	// @public:

	get recipient() { return this.m_recipient },
	get sessionId() { return this.m_session_id },
	get deviceId() { return this.m_device_id },
	
	/**
	 * @constructor
	 */
	constructor: function(conv) {
		ClientService.call(this, conv);
		this.m_message = [];
		this.m_device_id = this.params.device_id;
		conv.onOpen.on(e=>this.m_open());
		conv.onClose.on(e=>this.m_close());
		conv.onMessage.on(e=>this.m_send_data(e.data));
	},

	m_send_data: function({ type, data }) {
		if (type == 1) {
			if (this.m_recipient) {
				this.m_recipient.conv.send(data);
			} else {
				this.m_message.push(data);
			}
		}
	},

	/**
	 * @func getSessionId()
	 */
	getSessionId: async function() {
		return this.m_session_id;
	},

});

/**
 * @class DTTYServer
 */
var DTTYClient = utils.class('DTTYClient', Basic, {

	m_status: 0,
	m_cols: 80,
	m_rows: 30,

	/**
	 *@event ConnectRequest
	 */
	onExit: null,
	onStatus: null,

	/**
	 * @get status
	 */
	get status() { return this.m_status },

	/**
	 * @set status
	 */
	set status(value) {
		if (value != this.m_status) {
			this.m_status = value;
			if (value) {
				utils.assert(this.m_recipient);
				var message = this.m_message;
				this.m_message = [];
				message.forEach(e=>this.m_send_data(e));
			}
			this.trigger('Status', value);
		}
	},

	// @overwrite
	m_open: function() {
		utils.assert(this.m_session.tty);
		for (var [k,session] of Object.entries(this.m_session.device)) {
			if (session.ttyd) {
				// 通知有新的连接进入
				session.ttyd.trigger('ConnectRequest', this.sessionId);
				break;
			}
		}
	},

	// @overwrite
	m_close: function() {
		utils.assert(this.m_session.tty);
		this.m_session.tty = null;
		if (this.m_recipient) {
			this.m_recipient.m_recipient = null;
			this.m_recipient.conv.close();
			this.m_recipient = null;
		}
		delete all_device_session[this.deviceId][this.sessionId];
	},

	/**
	 * @func requestAuth()
	 */
	requestAuth: async function() {
		if (this.deviceId) {
			var device = all_device_session[this.deviceId];
			if (!device) {
				all_device_session[this.deviceId] = device = {};
			}
			var { user, passwd, cols, rows, } = this.params;
			// var md5 = crypto.createHash('md5');
			// md5.update(String(users[user]).split('').join('d'));
			if (users[user] == passwd) {
				var session = new Session(device, this);
				device[session.id] = session; // add session
				this.m_session_id = session.id;
				this.m_session = session;
				this.m_cols = Number(cols) || 80;
				this.m_rows = Number(rows) || 30;
				return true;
			}
		}
		return false;
	},

	get cols() {
		return this.m_cols;
	},

	get rows() {
		return this.m_rows;
	},

	/**
	 *@get status
	 */
	getStatus: async function() {
		return this.m_status;
	},

	setSize: function({ cols = 80, rows = 30 }) {
		this.m_cols = cols;
		this.m_rows = rows;
		if (this.m_recipient) {
			this.m_recipient.$setSizeChange(cols, rows);
		}
	},

});

/**
 * @class DTTYServer
 */
var DTTYServer = utils.class('DTTYServer', Basic, {

	/**
	 *@event onConnectRequest
	 */
	onConnectRequest: null,
	onSizeChange: null,

	// @overwrite
	m_open: function() {
		utils.assert(!this.m_session.ttyd);
		this.m_session.ttyd = this;
		this.m_recipient = this.m_session.tty;
		this.m_recipient.m_recipient = this;
		this.m_recipient.status = 1;
	},

	// @overwrite
	m_close: function() {
		utils.assert(this.m_session.ttyd);
		this.m_session.ttyd = null;
		if (this.m_recipient) {
			this.m_recipient.m_recipient = null;
			this.m_recipient.status = 0;
			this.m_recipient = null;
		}
	},

	$setSizeChange: function(cols, rows) {
		this.trigger('SizeChange', { cols, rows });
	},

	/**
	 * @func requestAuth()
	 */
	requestAuth: async function() {
		if (this.deviceId && this.params.session) {
			if (all_device_session[this.deviceId]) {
				var session = all_device_session[this.deviceId][this.params.session];
				if (session && !session.ttyd) {
					this.m_session = session;
					this.m_session_id = session.id;
					return true;
				}
			}
		}
		return false;
	},

	/**
	 * @func exit()
	 */
	exit: async function({ code = 0 }) {
		if (this.m_recipient) {
			this.m_recipient.trigger('Exit', code);
			this.m_recipient.conv.close();
		}
		this.conv.close();
	},

	/**
	 * @func getSize()
	 */
	getSize: async function() {
		return {
			cols: this.m_recipient.cols,
			rows: this.m_recipient.rows,
		};
	},

});

/**
 * @func getSessionList(deviceId)
 */
function getSessionList(deviceId) {
	utils.assert(deviceId);
	return Object.keys(all_device_session[deviceId] || {});
}

/**
 * @func closeSession(deviceId)
 */
function closeSession(deviceId, sessionId) {
	var device = all_device_session[deviceId];
	if (device) {
		var session = device[sessionId];
		if (session) {
			utils.assert(session.tty);
			session.tty.close();
		}
	}
}

module.exports = {
	DTTYClient,
	DTTYServer,
	getSessionList,
	closeSession,
};
