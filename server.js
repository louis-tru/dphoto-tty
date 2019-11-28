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

	terminal() {
		
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
		this.m_cli = new Client(id, 
			`fmt${ssl?'s':''}://${host}:${port}/`, 
			{ ...certificate, role: 'device' }
		);
	}

}

exports.TTYServer = TTYServer;
