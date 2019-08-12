#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var arguments = require('langoukit/arguments');
var { TTYClient } = require('./client');

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;

def_opts(['help', 'h'], 0,   '--help, -h     print help info');
def_opts(['ssl'],       0,   '--ssl          use ssl [{0}]');

function main() {
	var [ id, hosts ] = String(process.argv[2] || '').split('@');
	if (opts.help || !id || !hosts) {
		process.stdout.write('Usage:\n  dtty device_id@host[:port] [-ssl]\n');
		process.stdout.write('  ' + help_info.join('\n  ') + '\n');
		return;
	}
	var [ host, port = 8095 ] = hosts.split(':');

	opts.deviceId = id;
	opts.host = host;
	opts.port = port;

	new TTYClient(opts).start();
}

main();
