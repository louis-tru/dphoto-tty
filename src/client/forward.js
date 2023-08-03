/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2020-08-04
 */

var utils = require('somes').default;
var net = require('net');
var Client = require('./cli');

/**
 * @class Forward
 */
module.exports = class Forward extends Client {

	_task(tid, sender) {
		return utils.scopeLock(this, async()=>{
			var task = this.m_tasks.get(tid);
			var retry = 5;
			while (!task && --retry) {
				await utils.sleep(10); // 10ms
				task = this.m_tasks.get(tid);
			}
			if (task && this.thatId == sender) {
				return task;
			}
		});
	}

	_end(task, sendFend) {
		if (task && task.activity) {
			task.activity = false;
			if (sendFend)
			this.m_that.send('fend', [task.id]).catch(console.error);
			if (task.instance.writable)
				task.instance.end();
			this.conv.onOverflow.off(String(task.id));
			this.conv.onDrain.off(String(task.id));
			this.m_tasks.delete(task.id);
		}
	};

	/**
	 * @overwrite
	 */
	async _exec({ forward, port, event }) {
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

		this.addEventListener('End', e=>this.end([e.data], e.origin));
		this.addEventListener(`Logout-${this.thatId}`, offline);
		this.addEventListener('Offline', offline);

		try {
			if (event) {
				await that.call('forwardBegin', {port:forward});
			}
		} catch(err) {
			console.warn(err);
		}

		// listener local port
		var server = net.createServer(async socket=>{
			var task = {instance: socket, activity: true};
			try {
				socket.pause();
				task.id = await that.call('forward', {port:forward});
				tasks.set(task.id, task);
				socket.resume();
				// socket.setNoDelay(true);

				socket.on('data', data=>{
					//console.log('data', task.id, data + '');
					if (task.activity)
						that.send('fw', [task.id,data]).catch(console.error);
					else
						console.warn(`Useless socket data send, tid: ${tid}, target: ${that.id}, data length: ${data.length}`);
				});

				socket.on('end', ()=>{
					console.log(`local socket end, tid: ${task.id}`);
					this._end(task, true);
				});

				socket.on('error', e=>{
					console.error(`local socket error, tid: ${task.id}`, e);
					// this._end(task, true);
				});

				this.conv.onOverflow.on(()=>{
					if (utils.dev)
						console.log('Forward.onOverflow tid:', task.id);
					socket.pause();
				}, task.id);

				this.conv.onDrain.on(()=>{
					if (utils.dev)
						console.log('Forward.onDrain tid:', task.id);
					socket.resume();
				}, task.id);

			} catch(err) {
				socket.end();
			}
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
	async d([tid,data], sender) {
		// console.log('d', tid, data.length, data + '');
		var task = await this._task(tid, sender);
		if (task) {
			task.instance.write(data);
		} else {
			console.warn(`Useless socket data, tid: ${tid}, sender: ${sender}, data length: ${data.length}`);
		}
	}

	async end([tid], sender) {
		//console.log('end', tid, sender);
		var task = await this._task(tid, sender);
		if (task) {
			this._end(task);
		} else {
			console.warn(`Useless socket end, tid: ${tid}, sender: ${sender}`);
		}
	}

	async err([tid,data], sender) {
		var task = await this._task(tid, sender);
		if (task) {
			console.error(`remote socket error, tid: ${task.id}`, data);
			// this._end(task);
		} else {
			console.warn(`Useless socket err data, tid: ${tid}, sender: ${sender}, data length: ${data.length}`);
		}
	}

}
