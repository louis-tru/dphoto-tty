/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('nxkit');
var Terminal = require('./terminal');
var { Monitor } = require('nxkit/monitor');
var { Request } = require('nxkit/request');

/**
 * @class TTYServer
 */
class TTYServer {

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, deviceId = '' }) {
		utils.assert(deviceId);
		this.m_monitor = null;
		this.m_sessions = {};
		this.m_hostname = host;
		this.m_port = port;
		this.m_ssl = ssl;
		this.m_device_id = deviceId;
		this.m_req = new Request(`${ssl ? 'https': 'http'}://${host}:${port}/service-api`);
	}

	/**
	 * @func start()
	 */
	start() {
		utils.assert(!this.m_monitor);
		this.m_monitor = new Monitor(30* 1000, -1);
		this.m_monitor.start(async e=>{
			try {
				var { data } = await this.m_req.get('api/getSessionList', 
					{ deviceId: this.m_device_id }
				);
				data.forEach(e=>{
					if (!this.m_sessions[e]) {
						new Session(this, e);
					}
				});
			} catch(err) {
				console.error(err.message);
			}
		}).catch(console.error);
	}

}

exports.TTYServer = TTYServer;
