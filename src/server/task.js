/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2020-08-04
 */

const utils = require('somes').default;
const mbus = require('somes/mbus');
const paths = require('../paths');
const fs = require('somes/fs');

/**
 * @class Task
 */
class Task {

	constructor(host, sender, instance, tid) {
		this.id = tid || utils.getId();
		var id = String(this.id);
		this.activity = true;
		this.sender = sender;
		this.instance = instance;
		this.host = host;
		this.host.addEventListener(`Logout-${sender}`, ()=>this.destroy(), id);
		this.host.addEventListener('Offline', ()=>this.destroy(), id);
		this.host.conv.onOverflow.on(()=>this.overflow(), id);
		this.host.conv.onDrain.on(()=>this.drain(), id);
		this.host.m_tasks.set(this.id, this);
		this.begin();
	}

	destroy(triggerEnd) {
		if (this.activity) {
			var id = String(this.id);
			this.activity = false;
			if (triggerEnd)
				this.host.that(this.sender).trigger('End', id).catch(console.error);
			this.end();
			this.host.m_tasks.delete(id);
			this.host.removeEventListener(`Logout-${this.sender}`, id);
			this.host.removeEventListener(`Offline`, id);
			this.host.conv.onOverflow.off(id);
			this.host.conv.onDrain.off(id);
			console.log('task disconnect', this.sender);
		}
	}

	begin() {}
	end() {}
	overflow(){}
	drain(){}
}

class TerminalTask extends Task {
	end() {
		this.instance.kill(0, 1);
	}
}

class ForwardBeginTask extends Task {

	begin() {
		if (mbus.default.defaultNotificationCenter)
			mbus.default.defaultNotificationCenter.publish('DTTYD_PORT_FORWARD', {port: this.instance});
	}

	end() {
		if (mbus.default.defaultNotificationCenter)
			mbus.default.defaultNotificationCenter.publish('DTTYD_PORT_FORWARD_END', {port: this.instance});
	}

}

class ForwardTask extends Task {

	end() {
		if (this.instance.writable)
			this.instance.end();
	}

	overflow() {
		if (utils.dev)
			console.log('ForwardTask.overflow', this.id);
		this.instance.pause();
	}

	drain(){
		if (utils.dev)
			console.log('ForwardTask.drain', this.id);
		this.instance.resume();
	}
}

exports.Task = Task;
exports.TerminalTask = TerminalTask;
exports.ForwardBeginTask = ForwardBeginTask;
exports.ForwardTask = ForwardTask;