/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2019-11-05
 */

var utils = require('nxkit');
var log = require('./log');
var net = require('net');
var cli = require('nxkit/fmt/cli');
var errno = require('./errno');
var Terminal = require('./terminal');
var req = require('nxkit/request');

/**
 * @class Task
 */
class Task {

	constructor(host, sender, instance) {
		this.activity = true;
		this.sender = sender;
		this.id = utils.id;
		this.instance = instance;
		this.host = host;
		host.addEventListener(`Logout-${sender}`, this.destroy, this, this.id);
		host.addEventListener('Offline', this.destroy, this, this.id);
		this.host.m_tasks.set(this.id, this);
	}

	destroy(e, trigger) {
		if (this.activity) {
			this.activity = false;
			if (trigger)
				this.host.that(this.sender).trigger('End', e.data).catch(console.error);
			this.end();
			this.host.m_tasks.delete(this.id);
			this.removeEventListener(`Logout-${sender}`, this.id);
			this.removeEventListener(`Offline`, this.id);
			console.log('task disconnect', sender);
		}
	}

	end() {}

}

class TerminalTask extends Task {
	end() {
		this.instance.kill(0, 1);
	}
}

class ForwardTask extends Task {
	end() {
		if (this.instance.writable)
			this.instance.end();
	}
}

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

	/**
	 * @func dmagic() request magic service
	 */
	async dmagic([name,params,headers]) {
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
	terminal({ columns, rows }, sender) {
		utils.assert(sender);

		var that = this.that(sender);
		var task = new TerminalTask(this, sender, new Terminal(columns, rows));

		task.instance.addEventListener('Data', e=>{
			if (task.activity)
				that.trigger('Data', e.data).catch(console.error);
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
	forward({port}, sender) {
		utils.assert(sender);
		return new Promise((resolve, reject)=>{

			var that = this.that(sender), task;

			var socket = net.createConnection({ port }, ()=>{
				task = new ForwardTask(this, sender, socket);
				resolve(task.id);
			});

			socket.on('data', (data)=>(
				task.activity&&that.send('d', [task.id,data]).catch(console.error)
			));
			socket.on('end', ()=>task.destroy({data:task.id}, true));

			socket.on('error', e=>{
				if (task) {
					that.send('err', [task.id,e]).catch(console.error);
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
		this._task(tid, sender).instance.write(data);
	}

	fend([tid], sender) {
		var task = this._task(tid, sender);
		task.destroy({data:tid});
	}

}

/**
 * @class TTYServer
 */
class TTYServer {

	get id() {
		return this.m_cli.id;
	}

	constructor({
		host = '127.0.0.1', port = 8095,
		ssl = false, id = '', cert = null,
	}) {
		utils.assert(id);
		this.m_cli = new Client(this, id, 
			`fmt${ssl?'s':''}://${host}:${port}/`, 
			{ certificate: cert, role: 'device' }
		);
	}

}

exports.TTYServer = TTYServer;
