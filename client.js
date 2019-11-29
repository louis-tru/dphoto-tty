/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('nxkit');
var log = require('./log');
var readline = require('readline');
var crypto = require('crypto');
var cli = require('nxkit/fmt/cli');
var uuid = require('nxkit/hash/uuid');
// var errno = require('./errno');

/**
 * @class Client
 */
class Client extends cli.FMTClient {
	get thatId() {
		return this.m_host.thatId;
	}
	constructor(host, ...args) {
		super(uuid(), ...args);
		this.m_host = host;
		this.m_that = this.that(host.thatId);
	}
	_exec() {}
}

/**
 * @class Terminal
 */
class Terminal extends Client {
	/**
	 * @overwrite
	 */
	async _exec() {
		await this.subscribe(['Data','Exit']);

		var getSize = ()=>({ 
			rows: process.stdout.rows, columns: process.stdout.columns 
		});
		var offline = ()=>{
			utils.sleep(200).then(e=>{
				process.stdin.setRawMode(false);
				process.exit(0);
			});
		};

		this.addEventListener('Data', e=>process.stdout.write(e.data));
		this.addEventListener('Exit', offline);
		this.addEventListener(`Logout-${this.thatId}`, offline);
		this.addEventListener('Offline', offline);

		var that = this.m_that;
		var tid = await that.call('terminal', getSize());

		process.stdout.on('resize', e=>{
			that.call('terminalResize', {tid, ...getSize() }).catch(console.error);
		});
		process.stdin.on('data', async e=>{
			try {
				await that.call('terminalWrite', [tid,e]);
			} catch(err) {
				console.log(err);
				offline();
			}
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
	}
}

const Programs = {
	terminal: Terminal,
};

/**
 * @class TTYClient
 */
class TTYClient {

	get user() {
		return this.m_user;
	}

	get id() {
		this.m_cli.id;
	}

	get thatId() {
		return this.m_thatId;
	}

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, thatId = '' }) {
		utils.assert(thatId);
		this.m_user = '';
		this.m_url = `fmt${ssl?'s':''}://${host}:${port}/`;
		this.m_thatId = thatId;
		this.m_cli = null;
	}

	/**
	 * @func terminal()
	 */
	terminal() {
		this._run('terminal').catch(console.error);
	}

	async _run(cmd, ...args) {
		utils.assert(!this._is_run);
		this._is_run = true;

		var self = this;

		function start_readline() {
			utils.assert(!self.m_rl);
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			self.m_rl = rl;
		}

		function end_readline() {
			utils.assert(self.m_rl);
			self.m_rl.close();
			self.m_rl = null;
		}

		async function read(title, is_passwd) {
			utils.assert(self.m_rl);
			return new Promise((ok, err)=>{
				var raw_write = process.stdout.write;
				self.m_rl.question(title, (value)=>{
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

		start_readline();

		var user, passwd;

		do { user = await read('user: ') } while(!user);
		do { passwd = await read('passwd: ', 1) } while(!passwd);

		end_readline();

		// passwd = passwd.split('').join('d') + '\n';
		passwd = crypto.createHash('md5').update(passwd).digest('hex');

		this.m_user = user;

		process.stdout.write('\nConnecting...\n');

		try {
			this.m_cli = new (Programs[cmd])(this, this.m_url,
				{ user, certificate: passwd, role: 'admin', cmd });
			await this.m_cli._exec(...args);
		} catch(err) {
			console.error(err);
			process.exit(0)
		}
	}

}

exports.TTYClient = TTYClient;
