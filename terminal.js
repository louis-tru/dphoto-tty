/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2019-11-127
 */

var utils = require('somes').default;
var pty = require('ptyjs2');
var log = require('./log');
var {Notification} = require('somes/event');
var { exec } = require('somes/syscall');

/**
 * @class Terminal
 */
class Terminal extends Notification {

	constructor(cols, rows) {
		super();
		this._init(cols, rows).catch(console.error);
	}

	async _init(cols, rows) {
		var sh = 'sh';

		if ((await exec('which bash')).first) {
			sh = 'bash';
		} else if ((await exec('which ash')).first) {
			sh = 'ash';
		} else if ((await exec('which zsh')).first) {
			sh = 'zsh';
		} else if ((await exec('which csh')).first) {
			sh = 'csh';
		}

		// create child process
		var term = pty.spawn(sh, [], {
			name: 'xterm-color',
			cols: cols,
			rows: rows,
			cwd: process.env.HOME,
			env: { LC_ALL:'zh_CN.UTF-8', ...process.env },
		});

		term.on('data', e=>{
			this.trigger('Data', Buffer.from(e));
		});

		term.on('exit', code=>{
			this.m_term = null;
			this.trigger('Exit', code);
		});

		this.m_term = term;
	}

	resize(cols, rows) {
		if (this.m_term)
			this.m_term.resize(cols, rows);
	}

	write(data) {
		if (this.m_term)
			this.m_term.write(data);
	}

	async _kill() {
		await utils.sleep(200);
		while (this.m_term && this.m_term.writable) {
			this.m_term.kill(9); // kill 
			await utils.sleep(200);
		}
	}

	kill(code, force) {
		if (this.m_term && this.m_term.writable) {
			this.m_term.kill(code); // kill 
			if (force) {
				this._kill().catch(console.error);
			}
		}
	}
}

module.exports = Terminal;