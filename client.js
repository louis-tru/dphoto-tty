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

/**
 * @class Client
 */
class Client extends cli.FMTClient {
	get thatId() {
		return this.m_host.thatId;
	}
	constructor(host, ...args) {
		super(utils.hash(uuid()), ...args);
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
		await this.subscribe(['Data','End']);

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
				console.log(err);
				offline();
			}
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
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
					this._end(task);
				});

				socket.on('error', e=>{
					console.error(`local socker error, ${task.id}`, e);
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
		if (task)
			this._task(tid, sender).instance.write(data);
	}

	err([tid,data], sender) {
		var task = this._task(tid, sender);
		if (task) {
			console.error(`remote socket error, ${task.id}`, Error.new(data));
			// this._end(task);
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

	constructor({ serverHost = '127.0.0.1', serverPort = 8096, ssl = false, thatId = '' }) {
		utils.assert(thatId);
		this.m_user = '';
		this.m_url = `fmt${ssl?'s':''}://${serverHost}:${serverPort}/`;
		this.m_thatId = thatId;
		this.m_cli = null;
	}

	/**
	 * @func terminal()
	 */
	terminal() {
		this._run('terminal').catch(console.error);
	}

	forward(options) {
		this._run('forward', options).catch(console.error);
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
