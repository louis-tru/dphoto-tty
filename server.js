/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var log = require('./log');
var child_process = require('child_process');
var { WSConversation, Client } = require('ngui-utils/cli');
var { Monitor } = require('ngui-utils/monitor');
var { Request } = require('ngui-utils/request');
var pty = require('pty.js');

/**
 * @class Session
 */
class Session {

	constructor(ttyd, session_id) {
		utils.assert(!ttyd.m_sessions[session_id]);
		this.m_ttyd = ttyd;
		this.m_session_id = session_id;
		this.m_device_id = ttyd.m_device_id;
		this.m_term = null;
		this.m_activity = true; // 是否活着

		ttyd.m_sessions[session_id] = this;

		var { m_hostname, m_port, m_ssl, m_device_id } = ttyd;

		var url = String.format(
			'{0}://{1}:{2}?device_id={3}&session={4}',
			m_ssl ? 'wss': 'ws', 
			m_hostname, 
			m_port, 
			m_device_id, 
			session_id
		);
		this.m_conv = new WSConversation(url);
		this.m_conv.onOpen.on(e=>this.m_open());
		this.m_conv.onClose.on(e=>this.m_close().catch(console.error));
		this.m_cli = new Client('ttyd', this.m_conv);
		this.m_cli.addEventListener('Message', e=>this.m_message(e.data));
		this.m_cli.addEventListener('ConnectRequest', e=>this.m_connect_request(e.data));
	}

	m_open() {
		if (this.m_term) {
			return;
		}

		// create child process
		var term = pty.spawn('bash', [], {
			name: 'xterm-color',
			cols: 80,
			rows: 30,
			cwd: process.env.HOME,
			env: process.env,
		});

		term.on('data', function(e) {
			if (this.m_activity) {
				var data = { 
					data: e.toString('utf8'),
					type: '',
				};
				this.m_cli.call('sendMessage', data).catch(console.error);
			}
		});

		term.on('exit', function(code) {
			if (this.m_activity) {
				this.m_activity = false;
				this.m_cli.call('exit', { code }).catch(console.error);
			}
		});

		this.m_term = term;
	}

	async m_close() {

		if (this.m_activity) {
			try {
				var r = this.m_ttyd.m_req.get('getSessionList', { deviceId: this.m_device_id });
				if (r.indexOf(this.m_session_id)) {
					this.m_conv.connect(); // reconnect
					return;
				}
			} catch(err) {}

			this.m_activity = false;
		}

		while (this.m_term.writable) {
			this.m_term.kill(); // kill 
			await utils.sleep(200);
		}

		this.m_term = null;
		delete this.m_ttyd.m_sessions[this.m_session_id];
	}

	m_message(data) {
		if (this.m_activity) {
			this.m_term.write(data);
		}
	}

	m_connect_request(session_id) {
		if (!this.m_ttyd.m_sessions[session_id]) {
			new Session(this.m_ttyd, session_id);
		}
	}
}

/**
 * @class TTYServer
 */
class TTYServer {

	constructor({
		host = '127.0.0.1',
		port = 8095,
		ssl = false,
		deviceId = '',
	}) {
		utils.assert(deviceId);
		this.m_monitor = null;
		this.m_sessions = {};
		this.m_hostname = host;
		this.m_port = port;
		this.m_ssl = ssl;
		this.m_device_id = deviceId;
		this.m_req = new Request(`${ssl ? 'https': 'http'}://${host}:${port}/service-api`);
	}

	/**
	 * @func start()
	 */
	start() {
		utils.assert(!this.m_monitor);
		this.m_monitor = new Monitor(30* 1000, -1);
		this.m_monitor.start(async e=>{
			try {
				(await this.m_req.get('getSessionList', 
					{ deviceId: this.m_device_id })
				).forEach(e=>{
					if (!this.m_sessions[e]) {
						new Session(this, e);
					}
				});
			} catch(err) {
				console.error(err);
			}
		}).catch(console.error);
	}

}

exports.TTYServer = TTYServer;
