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
		this.m_activity = false; // 是否活着

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
		this.m_conv.onOpen.on(e=>this.m_open().catch(console.error));
		this.m_conv.onClose.on(e=>this.m_close().catch(console.error));
		this.m_conv.onMessage.on(e=>this.m_data(e.data));
		this.m_conv.onError.on(e=>this.m_error(e.data));
		this.m_cli = new Client('ttyd', this.m_conv);
		this.m_cli.addEventListener('ConnectRequest', e=>this.m_connect_request(e.data));
		this.m_cli.addEventListener('SizeChange', e=>this.m_size_change(e.data));
	}

	async m_open() {

		var { cols, rows } = await this.m_cli.call('getSize');

		if (this.m_term) {
			this.m_term.resize(cols, rows);
			return;
		}

		// create child process
		var term = pty.spawn('bash', [], {
			name: 'xterm-color',
			cols: cols,
			rows: rows,
			cwd: process.env.HOME,
			env: process.env,
		});

		term.on('data', (e)=>{
			if (this.m_activity) {
				this.m_cli.conv.send(new Buffer(e, 'binary'));
			}
		});

		term.on('exit', (code)=>{
			if (this.m_activity) {
				this.m_activity = false;
				this.m_cli.send('exit', { code });
			}
		});

		this.m_term = term;
		this.m_activity = true;
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

	m_data({ type, data }) {
		if (type == 1 && this.m_activity) {
			this.m_term.write(data);
		}
	}

	m_error(e) {}

	m_connect_request(session_id) {
		if (!this.m_ttyd.m_sessions[session_id]) {
			new Session(this.m_ttyd, session_id);
		}
	}

	m_size_change({ cols, rows }) {
		if (this.m_activity) {
			this.m_term.resize(cols, rows);
		}
	}

}

/**
 * @class TTYServer
 */
class TTYServer {

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, deviceId = '' }) {
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
				var { data } = await this.m_req.get('api/getSessionList', 
					{ deviceId: this.m_device_id }
				);
				data.forEach(e=>{
					if (!this.m_sessions[e]) {
						new Session(this, e);
					}
				});
			} catch(err) {
				console.error(err.message);
			}
		}).catch(console.error);
	}

}

exports.TTYServer = TTYServer;
