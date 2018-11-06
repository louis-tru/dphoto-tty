/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var log = require('./log');
var paths = require('./paths');
var { exec } = require('ngui-utils/syscall');

/**
 * @class TTYServer
 */
class TTYServer {

	/**
	 * @func start()
	 */
	start({
		host = '127.0.0.1',
		port = 8095,
		ssl = false,
		user = 'admin',
		passwd = '',
		id = '',
	}) {
		console.log('------------ start ttyd ------------');
		
	}

}

exports.TTYServer = TTYServer;
