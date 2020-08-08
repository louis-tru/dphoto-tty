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

	constructor(host, sender, instance) {
		this.activity = true;
		this.sender = sender;
		this.id = utils.id;
		this.instance = instance;
		this.host = host;
		host.addEventListener(`Logout-${sender}`, this.destroy, this, this.id);
		host.addEventListener('Offline', this.destroy, this, this.id);
		host.conv.onOverflow.on(this.overflow, this, this.id);
		host.conv.onDrain.on(this.drain, this, this.id);
		host.m_tasks.set(this.id, this);
	}

	destroy(e, trigger) {
		if (this.activity) {
			this.activity = false;
			if (trigger)
				this.host.that(this.sender).trigger('End', e.data).catch(console.error);
			this.end();
			this.host.m_tasks.delete(this.id);
			var id = String(this.id);
			this.host.removeEventListener(`Logout-${this.sender}`, id);
			this.host.removeEventListener(`Offline`, id);
			this.host.conv.onOverflow.off(id);
			this.host.conv.onDrain.off(id);
			console.log('task disconnect', this.sender);
		}
	}

	end() {}
	overflow(){}
	drain(){}
}

exports.Task = Task;

exports.TerminalTask = class TerminalTask extends Task {
	end() {
		this.instance.kill(0, 1);
	}
}

exports.ForwardTask = class ForwardTask extends Task {

	constructor(host, sender, instance, port) {
		super(host, sender, instance);
		this._port = port;
	}

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
