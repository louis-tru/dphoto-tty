/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var log = require('./log');
var { WSConversation, Client } = require('ngui-utils/cli');
var pty = require('pty.js');

/**
 * @class TTYClient
 */
class TTYClient {

	constructor({
		host = '127.0.0.1',
		port = 8095,
		ssl = false,
		deviceId = '',
	}) {
		utils.assert(deviceId);
		this.m_url = `${ssl ? 'wss': 'ws'}://${host}:${port}?device_id=${deviceId}`
		this.m_cli = null;
	}

	/**
	 * @func start()
	 */
	start() {
		utils.assert(!this.m_conv);
		this.m_conv = new WSConversation(this.m_url);
		this.m_conv.onOpen.on(e=>this.m_open());
		this.m_conv.onClose.on(e=>this.m_close().catch(console.error));
		this.m_cli = new Client('ttyd', this.m_conv);
		this.m_cli.addEventListener('Message', e=>this.m_message(e.data));
		this.m_cli.addEventListener('Status', e=>this.m_status(e.data));
		this.m_cli.addEventListener('Exit', e=>this.m_exit(e.data));

		var term = pty.spawn('bash', [], {
			name: 'xterm-color',
			cols: 100,
			rows: 60,
			cwd: process.cwd(),
			env: process.env,
		});
		
		term.on('exit', e=>{
			process.exit(e);
		});

		term.on('data', (data)=>{
			process.stdout.write(data);
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', e=>{
			term.write(e);
		});
	}

	m_open() {
		// TODO ...
	}

	m_close() {
		process.exit(0);
	}

	m_message(data) {
		// TODO ...
	}

	m_status(status) {
		// TODO ...
	}

	m_exit(code) {
		process.exit(code);
	}

}

exports.TTYClient = TTYClient;
