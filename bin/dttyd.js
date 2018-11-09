/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var arguments = require('ngui-utils/arguments');
var { TTYServer } = require('../server');

new TTYServer({ deviceId: 1 }).start();
