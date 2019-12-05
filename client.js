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
var net = require('net');
var errno = require('./errno');
var crypto = require('crypto-tx');
var fs = require('nxkit/fs');
var keys = require('nxkit/keys');
var path = require('path');

// require('nxkit/ws/conv').USE_GZIP_DATA = false;

const PRIVATE_KEY_FILE = `${process.env.HOME}/.dtty/privateKey`;

/**
 * @class Client
 */
class Client extends cli.FMTClient {

	get thatId() {
		return this.m_thatId;
	}

	constructor(url, headers, thatId) {
		super(utils.hash(uuid()), url, headers);
		this.m_that = this.that(thatId);
		this.m_thatId = thatId;
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
		await this.subscribe([/*'Data',*/'End']);

		var getSize = ()=>({ 
			rows: process.stdout.rows, columns: process.stdout.columns 
		});
		var offline = ()=>{
			utils.sleep(200).then(e=>{
				process.stdin.setRawMode(false);
				process.exit(0);
			});
		};

		// this.addEventListener('Data', e=>process.stdout.write(e.data));
		this.addEventListener('End', offline);
		this.addEventListener(`Logout-${this.thatId}`, offline);
		this.addEventListener('Offline', offline);

		var that = this.m_that;
		var tid = await that.call('terminal', getSize());

		process.stdout.on('resize', e=>{
			that.call('tresize', {tid, ...getSize() }).catch(console.error);
		});
		process.stdin.on('data', async e=>{
			try {
				await that.call('twrite', [tid,e]);
			} catch(err) {
				console.error(err);
				offline();
			}
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
	}

	/**
	 * @func d()
	 */
	d([data], sender) {
		if (this.thatId == sender)
			process.stdout.write(data);
	}

}

/**
 * @class Forward
 */
class Forward extends Client {

	_task(tid, sender) {
		var task = this.m_tasks.get(tid);
		if (task && this.thatId == sender) {
			return task;
		}
	}

	_end(task, noSend) {
		if (task && task.activity) {
			task.activity = false;
			if (!noSend)
			this.m_that.send('fend', [task.id]).catch(console.error);
			if (task.instance.writable)
				task.instance.end();
			this.conv.onOverflow.off(task.id);
			this.conv.onDrain.off(task.id);
			this.m_tasks.delete(task.id);
		}
	};

	/**
	 * @overwrite
	 */
	async _exec({ forward, port }) {
		forward = Number(forward) || 0;
		port = Number(port) || 0;
		utils.assert(forward > 0 && forward < 65536);
		utils.assert(port > 0 && port < 65536);

		await this.subscribe(['End']);

		var that = this.m_that;
		var tasks = this.m_tasks = new Map();

		var offline = ()=>{
			for (var [,task] of this.m_tasks) {
				if (task.activity)
					task.instance.end(); // end all socket connect
			}
			tasks.clear();
		};

		this.addEventListener('End', e=>this._end(this._task(e.data, e.origin), true));
		this.addEventListener(`Logout-${this.thatId}`, offline);
		this.addEventListener('Offline', offline);

		// listener local port
		var server = net.createServer(async socket=>{
			var task = {instance: socket, activity: true};
			try {
				socket.pause();

				task.id = await that.call('forward', {port:forward});

				socket.on('data', data=>{
					if (task.activity)
						that.send('fw', [task.id,data]).catch(console.error);
				});

				socket.on('end', ()=>{
					console.log(`local socket end, ${task.id}`);
					this._end(task);
				});

				socket.on('error', e=>{
					console.error(`local socket error, ${task.id}`, e);
					this._end(task);
				});

				this.conv.onOverflow.on(()=>{
					if (utils.dev)
						console.log('Forward.onOverflow', task.id);
					socket.pause();
				}, task.id);

				this.conv.onDrain.on(()=>{
					if (utils.dev)
						console.log('Forward.onDrain', task.id);
					socket.resume();
				}, task.id);

				socket.resume();
			} catch(err) {
				socket.end();
			}
			tasks.set(task.id, task);
		});

		server.on('error', (err) => {
			throw err;
		});

		server.listen(port, ()=>{
			console.log(`remote device port forward, remote ${forward} to local ${port}`);
		});
	}

	/**
	 * @func d()
	 */
	d([tid,data], sender) {
		var task = this._task(tid, sender);
		if (task) {
			this._task(tid, sender).instance.write(data);
		} else {
			console.warn(`Useless socket data, tid: ${tid}, sender: ${sender}, data length: ${data.length}`);
		}
	}

	err([tid,data], sender) {
		var task = this._task(tid, sender);
		if (task) {
			console.error(`remote socket error, ${task.id}`, data);
			// this._end(task);
		} else {
			console.warn(`Useless socket err data, tid: ${tid}, sender: ${sender}, data length: ${data.length}`);
		}
	}

}

const Programs = {
	terminal: Terminal,
	forward: Forward,
};

/**
 * @class TTYClient
 */
class Command {

	terminal(opts) {
		this._run('terminal', opts).catch(console.error);
	}

	forward(opts) {
		this._run('forward', opts).catch(console.error);
	}

	async genkeyPair(opts) { // gen key pair
		this._startReadline();
		var user, passwd;
		do { user = await this._read('user: ') } while(!user);
		// do { passwd = await this._read('passwd: ', 1) } while(!passwd);
		this._endReadline();
		// passwd = crypto.createHash('md5').update(passwd).digest('hex');

		var privateKey = crypto.genPrivateKey();
		var publicKey = crypto.getPublic(privateKey, true);
		fs.mkdirpSync(path.dirname(PRIVATE_KEY_FILE));
		var privateKeys = {};
		if (fs.existsSync(PRIVATE_KEY_FILE)) {
			privateKeys = keys.parseFile(PRIVATE_KEY_FILE);
		}
		if (privateKeys[user] && !opts.force) {
			console.error(`Key already exists "${user}" from ${PRIVATE_KEY_FILE}`);
			process.exit(1);
		}
		// privateKeys[user] = [ privateKey.toString('hex'), publicKey.toString('hex') ];
		privateKeys[user] = privateKey.toString('hex');
		fs.writeFileSync(PRIVATE_KEY_FILE, keys.stringify(privateKeys));
		fs.chmodSync(PRIVATE_KEY_FILE, Number(0o600));
		console.log(`publicKey: ${user} ${publicKey.toString('hex')}`);
		console.log(`Write file ${PRIVATE_KEY_FILE} ok`);
	}

	_startReadline() {
		utils.assert(!this.m_rl);
		this.m_rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
	}

	_endReadline() {
		utils.assert(this.m_rl);
		this.m_rl.close();
		this.m_rl = null;
	}

	async _read(title, is_passwd) {
		var self = this;
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

	async _run(cmd, options) {

		try {
			var privateKeys = keys.parseFile(PRIVATE_KEY_FILE);
			var user, privateKey;
			for (var user in privateKeys) {
				privateKey = new Buffer(privateKeys[user], 'hex');
				break;
			}
			if (key)
				throw 'err';
		} catch(err) {
			process.stdout.write(`\nPrivatekey not found from ${PRIVATE_KEY_FILE}, \n\nPlease use \`dtty -G\` to generate key file\n\n`);
			process.exit(1);
		}
		// console.log(privateKeys)

		process.stdout.write('\nConnecting...\n');

		var { serverHost = '127.0.0.1', serverPort = 8096, ssl = false, thatId = '' } = options;
		var url = `fmt${ssl?'s':''}://${serverHost}:${serverPort}`;

		// sign request
		var role = 'admin';
		var st = Date.now();
		var key = 'a4dd53f2fefde37c07ac4824cf7086439633e1a357daacc3aaa16418275a9e40';
		var hash = Buffer.from(crypto.keccak(user + role + st + key).data);
		sign = crypto.sign(hash, privateKey);
		sign = Buffer.concat([sign.signature, Buffer.from([sign.recovery])]).toString('base64');

		// recover public key test:
		// var sign = Buffer.from(sign, 'base64');
		// var pkey = crypto.recover(hash, sign.slice(0, 64), sign[64]).toString('hex');
		// crypto.verify(hash, publicKeyTo, sign.slice(0, 64))
		// console.log('sign confirm dev', '0x'+ pkey);

		try {
			this.m_cli = new (Programs[cmd])(url, { user, st, role, sign }, thatId);
			await this.m_cli._exec(options);
		} catch(err) {
			process.exit(0)
		}
	}

}

exports.Command = Command;
