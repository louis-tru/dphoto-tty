/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('langoukit');
var log = require('./log');
var { WSConversation, Client } = require('langoukit/cli');
var readline = require('readline');
var crypto = require('crypto');
var paths = require('./paths');

/**
 * @class TTYClient
 */
class TTYClient {

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, deviceId = '' }) {
		utils.assert(deviceId);
		this.m_cli = null;
		this.m_status = 0;
		this.m_user = '';
		this.m_passwd = '';
		this.m_url = `${ssl ? 'wss': 'ws'}://${host}:${port}`;
		this.m_url += '?device_id=' + deviceId;
		this.m_init = false;
	}

	start() {
		utils.assert(!this.m_is_start);
		this.m_is_start = true;
		this.m_start().catch(console.error);
	}

	m_start_readline() {
		utils.assert(!this.m_rl);
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		this.m_rl = rl;
	}

	m_end_readline() {
		utils.assert(this.m_rl);
		this.m_rl.close();
		this.m_rl = null;
	}

	async m_read(title, is_passwd) {
		utils.assert(this.m_rl);
		return new Promise((ok, err)=>{
			var raw_write = process.stdout.write;
			this.m_rl.question(title, (value)=>{
				if (is_passwd) {
					process.stdout.write = raw_write;
				}
				ok(value);
			});
			if (is_passwd) {
				process.stdout.write = utils.noop;
			}
		});
	}

	/**
	 * @func start()
	 */
	async m_start() {
		this.m_start_readline();

		var user, passwd;

		do { user = await this.m_read('user: ') } while(!user);
		do { passwd = await this.m_read('passwd: ', 1) } while(!passwd);

		this.m_end_readline();

		var { rows, columns } = process.stdout;

		passwd = passwd.split('').join('d') + '\n';

		var md5 = crypto.createHash('md5');
		md5.update(passwd);
		passwd = md5.digest('hex');

		this.m_url += '&cols=' + columns;
		this.m_url += '&rows=' + rows;
		this.m_url += '&user=' + user;
		this.m_url += '&passwd=' + passwd;
		if (utils.dev) {
			process.stdout.write('\n');
			console.dlog(this.m_url);
		}
		this.m_conv = new WSConversation(this.m_url);
		this.m_conv.onOpen.on(e=>this.m_open());
		this.m_conv.onClose.on(e=>this.m_close());
		this.m_conv.onMessage.on(e=>this.m_data(e.data));
		this.m_conv.onError.on(e=>this.m_error(e.data));
		this.m_cli = new Client('tty', this.m_conv);
		this.m_cli.addEventListener('Status', e=>this.m_set_status(e.data));
		this.m_cli.addEventListener('Exit', e=>this.m_exit(e.data));

		process.stdout.write('\nConnecting...\n');
	}

	m_open() {
		process.stdout.on('resize', e=>{
			if (this.m_status) {
				var { rows, columns } = process.stdout;
				this.m_cli.send('setSize', { rows, cols: columns });
			}
		});
		process.stdin.on('data', e=>{
			if (this.m_status) {
				this.m_conv.send(e);
			}
		});
	}

	m_close() {
		process.exit(0);
	}

	m_error(err) {
		console.error(err.message);
		process.exit(0);
	}

	m_data({ type, data }) {
		if (type == 1) {
			process.stdout.write(data);
		}
	}

	m_set_status(status) {
		if (status && !this.m_init) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			this.m_init = true;
			this.m_raw_log = console.log;
			this.m_raw_error = console.error;
			// TODO ? 屏蔽node日志
			// console.log = utils.noop;
			// console.error = utils.noop;
		}
		this.m_status = status;
	}

	m_exit(code) {
		process.exit(code);
	}

}

exports.TTYClient = TTYClient;
