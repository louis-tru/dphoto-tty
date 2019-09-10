/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('lkit');
// var server = require('lkit/server');
var { ClientService } = require('lkit/cli_service');
// var crypto = require('crypto');
// var fs = require('lkit/fs');
var { users = {} } = utils.config;

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
class Basic extends ClientService {
	// m_message: null,
	// m_recipient: null, // conv
	// m_session_id: 0,
	// m_device_id: 0,
	// m_session: null,

	m_OnOpen() {}
	m_OnClose() {}

	// @public:
	get recipient() { return this.m_recipient }
	get sessionId() { return this.m_session_id }
	get deviceId() { return this.m_device_id }

	/**
	 * @constructor
	 */
	constructor(conv) {
		super(conv);
		this.m_message = [];
		this.m_recipient = null;
		this.m_session_id = 0;
		this.m_device_id = this.params.device_id;
		this.m_session = null;
		conv.onOpen.on(e=>this.m_OnOpen());
		conv.onClose.on(e=>this.m_OnClose());
		conv.onMessage.on(e=>this.m_Handle_send_data(e.data));
	}

	m_Handle_send_data({ type, data }) {
		if (type == 1) {
			if (this.m_recipient) {
				this.m_recipient.conv.send(data);
			} else {
				this.m_message.push(data);
			}
		}
	}

	/**
	 * @func getSessionId()
	 */
	getSessionId() { return this.m_session_id }

}

/**
 * @class DTTYServer
 */
class DTTYClient extends Basic {
	// m_status: 0,
	// m_cols: 80,
	// m_rows: 30,

	// public:
	// onExit: null
	// onStatus: null

	/**
	 * @get status
	 */
	get status() { return this.m_status }
	get cols() { return this.m_cols }
	get rows() { return this.m_rows }

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
	}

	/**
	 * @func requestAuth()
	 */
	requestAuth() {
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
	}

	constructor(conv) {
		super(conv);
		this.m_status = 0;
		this.m_cols = 80;
		this.m_rows = 30;
	}

	// @overwrite
	m_OnOpen() {
		utils.assert(this.m_session.tty);
		for (var [k,session] of Object.entries(this.m_session.device)) {
			if (session.ttyd) {
				// 通知有新的连接进入
				session.ttyd.m_OuterConnectRequest(this.sessionId);
				break;
			}
		}
	}

	// @overwrite
	m_OnClose() {
		utils.assert(this.m_session.tty);
		this.m_session.tty = null;
		if (this.m_recipient) {
			this.m_recipient.m_recipient = null;
			this.m_recipient.conv.close();
			this.m_recipient = null;
		}
		delete all_device_session[this.deviceId][this.sessionId];
	}

	/**
	 *@get status
	 */
	getStatus() {
		return this.m_status;
	}

	setSize({ cols = 80, rows = 30 }) {
		this.m_cols = cols;
		this.m_rows = rows;
		if (this.m_recipient) {
			this.m_recipient.m_SetSizeChange(cols, rows);
		}
	}

}

/**
 * @class DTTYServer
 */
class DTTYServer extends Basic {

	// onOuterConnectRequest: null,
	// onTerminalSizeChange: null,

	/**
	 * @func requestAuth()
	 */
	requestAuth() {
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
	}

	// @overwrite
	m_OnOpen() {
		utils.assert(!this.m_session.ttyd);
		this.m_session.ttyd = this;
		this.m_recipient = this.m_session.tty;
		this.m_recipient.m_recipient = this;
		this.m_recipient.status = 1;
	}

	// @overwrite
	m_OnClose() {
		utils.assert(this.m_session.ttyd);
		this.m_session.ttyd = null;
		if (this.m_recipient) {
			this.m_recipient.m_recipient = null;
			this.m_recipient.status = 0;
			this.m_recipient = null;
		}
	}

	m_OuterConnectRequest(sessionId) {
		this.trigger('OuterConnectRequest', sessionId);
	}

	m_SetSizeChange(cols, rows) {
		this.trigger('TerminalSizeChange', { cols, rows });
	}

	/**
	 * @func exit()
	 */
	exit({ code = 0 }) {
		if (this.m_recipient) {
			this.m_recipient.trigger('Exit', code);
			this.m_recipient.conv.close();
		}
		this.conv.close();
	}

	/**
	 * @func getSize()
	 */
	getSize() {
		return {
			cols: this.m_recipient.cols,
			rows: this.m_recipient.rows,
		};
	}

}

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
