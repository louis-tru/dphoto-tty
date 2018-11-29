/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('ngui-utils');
var fs = require('ngui-utils/fs');
var log = require('./log');
var server = require('ngui-utils/server');
var service = require('ngui-utils/service');
var fs = require('ngui-utils/fs');
var paths = require('./paths');
var session = require('./session');
var api = require('./api');

service.set('tty', session.DTTYClient);
service.set('ttyd', session.DTTYServer);
service.set('api', api);

server.setShared(new server.Server({
	temp: `${paths.var}`,
	root: `${__dirname}/public`,
	port: 8095,
	host: '0.0.0.0',
	autoIndex: utils.dev,
	printLog: utils.dev,
}));

// start api server
server.shared.start();
