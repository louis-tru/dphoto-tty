/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var fs = require('ngui-utils/fs');
var variable = '/mnt/dphotos/dphoto-tty/var';

fs.mkdir_p_sync(variable);

module.exports = {
	var: variable,
};
