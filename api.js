/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('qgr-utils');
var session = require('./session');
var { ViewController } = require('qgr-utils/ctr');

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
