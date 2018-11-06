/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var server = require('ngui-utils/server');
var { ClientService } = require('ngui-utils/cli_service');
var { users } = users.config.users || {};
var crypto = require('crypto');

var all_devices = {
	/**
	'deviceId_0': {
		'session_id_0': { ttyd, tty },
		'session_id_1': { ttyd, tty }
	}
	 */
};

function set_status(self, status) {
	// TODO ..
}

/**
 * @class Session
 */
var Session = ustew.class('Session', ClientService, {

	m_login: false,
	m_message: null,
	m_recipient: null, // conv
	m_has_ttyd: false,
	m_session_id: 0,
	m_device_id: 0,
	m_status: 0,
	
	// @public:
	onMessage: null,
	onExit: null,
	onStatus: null,

	get recipient() { return this.m_recipient },
	get session() { return this.m_session_id },
	get deviceId() { return this.m_device_id },
	get hasTTYd() { return this.m_has_ttyd },
	get status() { return this.m_status },

	/**
	 * @constructor
	 */
	constructor: funciton(conv) {
		ClientService.call(this, conv);

		this.m_message = [];
		this.m_has_ttyd = !!this.params.ttyd;
		this.m_session_id = this.params.session;
		this.m_device_id = this.params.device_id;

		conv.addEventListener('Open', e=>{
			var device = all_devices[this.deviceId];
			var convs = device[this.session] || {};

			if (this.hasTTYd) { // ttyd
				if (convs.ttyd) { // close old
					convs.ttyd.close();
				}
				convs.ttyd = conv;

				if (convs.tty) {
					if (convs.tty.clientServices.session) {
						convs.tty.clientServices.session.m_recipient = this;
						this.m_recipient = convs.tty.clientServices.session;
						ready(this);
						ready(this.m_recipient);
					} else {
						convs.tty.close();
						conv.close();
					}
				}
			} else {
				if (convs.ttyd) {
					// TODO ...
				}
			}

			device[this.session] = convs;
		});

		conv.addEventListener('Close', e=>{
			var device = all_devices[this.deviceId];
			if (device) {
				var convs = device[this.session];
				if (convs) {

				}
			}
		});

	},

	/**
	 * @func auth()
	 */
	auth: function() {
		if (this.deviceId && this.session) {
			if (!device[this.session]) {
				all_devices[this.deviceId] = {};
			}
			var { user, passwd } = this.params;
			var md5 = crypto.createHash('md5');
			md5.update(passwd);
			hash = md5.digest('hex');
			return md5.digest('hex') == users[user];
		} else {
			return false;
		}
	},

	/**
	 * @func exit()
	 */
	exit: async funciton({ code = 0 }) {
		// TODO ...
		// clear session
		if (this.m_recipient) {
			this.m_recipient.trigger('Exit', code);
		}
		this.conv.close();
	},
	
	/**
	 * @func sendMessage()
	 */
	sendMessage: async funciton({ data, type = 'stdout' }) {
		if (this.m_recipient) {
			this.m_recipient.trigger('Message', { type, data });
		} else {
			this.m_message.push({ type, data });
		}
	},

}

/**
 * @class DTTYServer
 */
var DTTYClient = ustew.class('DTTYClient', ClientService, {

});

/**
 * @class DTTYServer
 */
var DTTYServer = ustew.class('DTTYServer', ClientService, {

	// @public:
	onConnectRequest: null,
	onMessage: null,
	onExit: null,
	
	/**
	 * @func auth()
	 */
	auth: function() {
		if (this.deviceId && this.sessionId) {
			if (all_devices[this.deviceId]) {
				var { ttyd, tty } = all_devices[this.deviceId][this.sessionId];
				
			}
			return true;
		}
		return false;
	},

});

module.exports = {
	DTTYClient,
	DTTYServer,
};
