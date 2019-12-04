/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-07-09
 */

var utils = require('nxkit');
var paths = require('./paths');
var log = require('nxkit/log');

if (!utils.dev || utils.options.caught_exception) {

	console.log('BA')

	process.on('uncaughtException', function(err) {
		console.error(err);
	});
	process.on('unhandledRejection', (err, promise) => {
		console.error(err);
	});
}

new log.Console(paths.var + '/log.txt').makeDefault();

