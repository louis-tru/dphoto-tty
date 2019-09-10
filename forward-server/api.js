/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('lkit');
var session = require('./session');
var { ViewController } = require('lkit/ctr');

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
