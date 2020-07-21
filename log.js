/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-07-09
 */

var paths = require('./paths');
var log = require('somes/log');

process.on('uncaughtException', function(err) {
	console.error(err);
});
process.on('unhandledRejection', (err, promise) => {
	console.error(err);
});

new log.Console(paths.var + '/log.txt').makeDefault();
