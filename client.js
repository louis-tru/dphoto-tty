/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var log = require('./log');

/**
 * @class TTYClient
 */
class TTYClient {

	/**
	 * @func start()
	 */
	start({
		host = '127.0.0.1',
		port = 8095,
		ssl = false,
		deviceId = '',
	}) {
		utils.assert(deviceId);
	}

}

exports.TTYClient = TTYClient;
