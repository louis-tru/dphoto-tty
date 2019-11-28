/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2019-11-05
 */

var utils = require('nxkit');
var cli = require('nxkit/fmt/cli');
var Terminal = require('./terminal');

/**
 * @class Client
 */
class Client extends cli.FMTClient {

	constructor(...args) {
		super(...args);
		this.m_terminals = {};
	}
}

/**
 * @class TTYServer
 */
class TTYServer {

	get id() {
		return this.m_cli.id;
	}

	constructor({ host = '127.0.0.1', port = 8095, ssl = false, id = '', certificate = null }) {
		utils.assert(id);
		certificate = { ...certificate, role: 'device' };
		var url = `fmt${ssl?'s':''}://${host}:${port}/`;
		this.m_cli = new Client(id, url, certificate);
	}

}

exports.TTYServer = TTYServer;
