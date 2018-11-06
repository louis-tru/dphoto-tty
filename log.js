/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-07-09
 */

var utils = require('ngui-utils');
var paths = require('./paths');
var log = require('ngui-utils/log');

if (!log.defaultConsole) {
	if (!utils.dev || utils.options.caught_exception) {
		process.on('uncaughtException', function(e) {
			console.error(`Caught exception: ${e}\n`);
		});
	}
	new log.Console(paths.var + '/log.txt').makeDefault();
}
