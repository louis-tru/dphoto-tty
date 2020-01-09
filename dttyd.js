#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('nxkit');
var arguments = require('nxkit/arguments');
var { TTYServer } = require('./server');
var req = require('nxkit/request').default;
var { host = '127.0.0.1', port = 8096, id, cert } = utils.config.dttyd || {};

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;
var device_details = null;

async function readDevice() {
	if (!device_details) {
		device_details = {};
		var retry = 5;
		while (--retry) {
			try {
				var {data} = await req.get('http://127.0.0.1:8090/service-api/account/details');
				device_details = JSON.parse(data + '').data;
				break;
			} catch(err) {
			}
			await utils.sleep(200);
		}
	}
	return device_details;
}

async function main() {
	id = id || (await readDevice()).serialNumber || '';
	cert = cert || (await readDevice()).deviceId || 'None';

	def_opts(['help'],      0,                 '--help         print help info');
	def_opts(['id'],        id,                '--id, -id      device id [{0}]');
	def_opts(['host', 'h'], host,              '--host, -h     host [{0}]');
	def_opts(['port', 'p'], port,              '--port, -p     port [{0}]');
	def_opts(['ssl'],       0,                 '--ssl          use ssl [{0}]');
	def_opts(['cert', 'c'], cert,              '--cert, -c     certificate [{0}]');

	if (opts.help || !opts.id) { // print help info
		process.stdout.write('Usage: dttyd [VAR=VALUE] \n')
		process.stdout.write('  ' + help_info.join('\n  ') + '\n');
	} else {
		new TTYServer(opts);
	}
}

main();
