/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2019-11-05
 */

var utils = require('nxkit');
var log = require('./log');
var cli = require('nxkit/fmt/cli');
var errno = require('./errno');
var Terminal = require('./terminal');
var req = require('nxkit/request');

/**
 * @class Client
 */
class Client extends cli.FMTClient {

	constructor(host, ...args) {
		super(...args);
		this.m_host = host;
		this.m_terminals = new Map();
	}

	_getTerminal(tid, sender) {
		var o = this.m_terminals.get(tid);
		utils.assert(o, errno.ERR_CANNOT_FIND_TERMINAL);
		utils.assert(o.sender == sender, errno.ERR_CANNOT_FIND_TERMINAL);
		return o.term;
	}

	/**
	 * @func terminal() new terminal
	 */
	terminal({ columns, rows }, sender) {
		utils.assert(sender);

		var tid = utils.id;
		var term = new Terminal(columns, rows);
		var activity = true;
		var that = this.that(sender);

		var offline = (e, trigger)=>{
			if (activity) {
				activity = false;
				if (trigger)
					that.trigger('Exit', e.data).catch(console.error);
				term.kill(0, 1);
				this.m_terminals.delete(tid);
				this.removeEventListener(`Logout-${sender}`, offline);
				this.removeEventListener(`Offline`, offline);
				console.log('terminal disconnect', sender);
			}
		};
		term.addEventListener('Data', e=>{
			if (activity)
				that.trigger('Data', e.data).catch(console.error);
		});
		term.addEventListener('Exit', e=>offline(e, 1));
		this.addEventListener(`Logout-${sender}`, offline);
		this.addEventListener('Offline', offline);

		this.m_terminals.set(tid, { sender, term });

		// test offline status
		(async ()=>{
			while (activity) {
				await utils.sleep(3e4); // 30s
				try {
					if (! await that.hasOnline()) {
						offline();
					}
				} catch(err) {
					offline();
				}
			}
		})().catch(console.error);

		console.log('terminal connect', sender);

		return tid;
	}

	terminalResize({tid, columns, rows }, sender) {
		this._getTerminal(tid, sender).resize(columns, rows);
	}

	terminalKill({tid,code=0}, sender) {
		this._getTerminal(tid, sender).kill(code);
	}

	terminalWrite([tid,data], sender) {
		this._getTerminal(tid, sender).write(data);
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
