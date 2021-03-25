/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('somes').default;
var fs = require('somes/fs');
var path = require('path');
var dphoto_tty = utils.config.temp || 
	(fs.existsSync('/mnt/dphotos') ? '/mnt/dphotos/dphoto-tty': `${__dirname}/..`);
var variable = path.resolve(dphoto_tty + '/var');

fs.mkdir_p_sync(variable);
fs.writeFileSync(`${variable}/pid`, String(process.pid));

module.exports = {
	var: variable,
};
