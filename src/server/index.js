/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2019-11-05
 */

const utils = require('somes').default;
const log = require('../log');
const net = require('net');
const cli = require('somes/fmt/cli');
const errno = require('../errno');
const Terminal = require('./terminal');
const req = require('somes/request').default;
const mbus = require('somes/mbus');
const {TerminalTask,ForwardTask} = require('./task');

require('somes/ws/conv').USE_GZIP_DATA = false; // Reduce server pressure, close gzip

/**
 * @class Client
 */
class Client extends cli.FMTClient {

	constructor(host, ...args) {
		super(...args);
		this.m_host = host;
		this.m_tasks = new Map();
		this._checkOffline().catch(console.error);;
	}

	async _checkOffline() {
		// test offline status
		while (true) {
			await utils.sleep(3e4); // 30s

			var senders = new Map();
			for (var [id, task] of this.m_tasks) {
				var tasks = senders.get(task.sender);
				if (!tasks) {
					senders.set(task.sender, tasks = []);
				}
				tasks.push(task);
			}

			for (var [sender, tasks] of senders) {
				try {
					if (! await this.that(sender).hasOnline() ) {
						tasks.forEach(e=>e.destroy());
					}
				} catch(err) {
					tasks.forEach(e=>e.destroy());
				}
			}
		}
	}

	_task(id, sender) {
		var task = this.m_tasks.get(id);
		utils.assert(task, errno.ERR_CANNOT_FIND_TASK);
		utils.assert(task.sender == sender, errno.ERR_CANNOT_FIND_TASK);
		return task;
	}

	_taskNoErr(id, sender) {
		var task = this.m_tasks.get(id);
		if (task && task.sender == sender) {
			return task;
		}
	}

	/**
	 * @func dmagic() request magic service
	 */
	async dmagic([name,params,headers], sender) {
		var host = '127.0.0.1';
		var data = await req.post(`http://${host}:8091/service-api/${name}`, {
			params, headers: { ...headers, unsafe: 1},
		});
		return [data.statusCode, data.headers, data.data];
	}

	// terminal

	/**
	 * @func terminal() new terminal
	 */
	async terminal({ columns, rows }, sender) {
		utils.assert(sender);
		var senderInfo = await this.user(sender);
		utils.assert(senderInfo.role == 'admin', errno.ERR_NOT_PERMISSION);
		var that = this.that(sender);
		var task = new TerminalTask(this, sender, new Terminal(columns, rows));

		task.instance.addEventListener('Data', e=>{
			if (task.activity)
				// that.trigger('Data', e.data).catch(console.error);
				that.send('d', [e.data]).catch(console.error);
		});
		task.instance.addEventListener('Exit', e=>task.destroy(e, true));

		console.log('terminal connect', sender);

		return task.id;
	}

	/**
	 * @func tresize() terminal resize
	 */
	tresize({tid, columns, rows }, sender) {
		this._task(tid, sender).instance.resize(columns, rows);
	}

	/**
	 * @func tkill() terminal kill
	 */
	tkill({tid,code=0}, sender) {
		this._task(tid, sender).instance.kill(code);
	}

	/**
	 * @func twrite() terminal write
	 */
	twrite([tid,data], sender) {
		this._task(tid, sender).instance.write(data);
	}

	// forward

	/**
	 * @func forward() forward port connect
	 */
	async forward({port}, sender) {
		utils.assert(sender);
		var senderInfo = await this.user(sender);
		utils.assert(senderInfo.role == 'admin', errno.ERR_NOT_PERMISSION);
		var that = this.that(sender), task;

		return await new Promise((resolve, reject)=>{

			var socket = net.createConnection({ port }, ()=>{
				task = new ForwardTask(this, sender, socket, port);
				resolve(task.id);
			});
			socket.on('data', (data)=>{
				if (task.activity)
					that.send('d', [task.id,data]).catch(console.error);
			});
			socket.on('end', ()=>{
				console.log(`remote socket end, ${task.id}`);
				task.destroy({data:task.id}, true)
			});
			socket.on('error', e=>{
				if (task) {
					that.send('err', [task.id,e]).catch(console.error);
					// console.error(`remote socker error, ${task.id}`, e);
				} else {
					reject(e);
				}
			});

			console.log('forward connect', sender);
		});
	}

	/**
	 * @func fw() forward write
	 */
	fw([tid,data], sender) {
		var task = this._taskNoErr(tid, sender);
		if (task) {
			task.instance.write(data);
		} else {
			console.warn(`Useless data, tid: ${tid}, sender: ${sender}, data length: ${data.length}`);
		}
	}

	fend([tid], sender) {
		var task = this._taskNoErr(tid, sender);
		if (task) {
			this._task(tid, sender).destroy({data:tid});
		} else {
			console.warn(`Useless fend, tid: ${tid}, sender: ${sender}`);
		}
	}

}

/**
 * @class TTYServer
 */
class TTYServer {

	get id() {
		return this.m_cli.id;
	}

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, id = '', cert = null }) {
		utils.assert(id);

		this.m_cli = new Client(this, id, 
			`fmt${ssl?'s':''}://${host}:${port}/`, { certificate: cert, role: 'device' }
		);

		this._bus = new mbus.NotificationCenter('mqtt://127.0.0.1:1883', 'default');

		mbus.default.defaultNotificationCenter = this._bus;

		this._bus.addEventListener('WifiConnected', ()=>{
			this.m_cli.close(); // close auto reconnected
			console.log('WifiConnected, close auto reconnected');
		});

	}

}

exports.TTYServer = TTYServer;
