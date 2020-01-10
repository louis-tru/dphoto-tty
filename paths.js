/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('nxkit').default;
var fs = require('nxkit/fs');
var dphoto_tty = utils.config.temp || '/mnt/dphotos/dphoto-tty';
var variable = dphoto_tty + '/var';

fs.mkdir_p_sync(variable);
fs.writeFileSync(`${variable}/pid`, process.pid);

module.exports = {
	var: variable,
};
