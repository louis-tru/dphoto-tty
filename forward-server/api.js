/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('nxkit');
var session = require('./session');
var { ViewController } = require('nxkit/ctr');

/**
 * @class API
 */
module.exports = class extends ViewController {

	/**
	 * @func getSessionList()
	 */
	async getSessionList({ deviceId }) {
		return session.getSessionList(deviceId);
	}

};
