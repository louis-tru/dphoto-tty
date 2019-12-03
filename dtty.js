#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var arguments = require('nxkit/arguments');
var { TTYClient } = require('./client');

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;

def_opts(['help', 'h'],       0,   '--help, -h         print help info');
def_opts(['ssl'],             0,   '--ssl              use ssl [{0}]');
def_opts(['forward', 'f'],    0,   '--forward -f       forward remote port to local [{0}]');
def_opts(['port', 'p'],       0,   '--port -p          local port [{0}]');

function main() {
	var [ id, hosts ] = String(process.argv[2] || '').split('@');
	if (opts.help || !id || !hosts) {
		process.stdout.write('Usage:\n  dtty device_id@host[:port] [-ssl]\n');
		process.stdout.write('  ' + help_info.join('\n  ') + '\n');
		process.exit();
	}
	var [ serverHost, serverPort = 8096 ] = hosts.split(':');

	opts.thatId = id;
	opts.serverHost = serverHost;
	opts.serverPort = serverPort;

	var cli = new TTYClient(opts);

	if (opts.forward) {
		opts.port = opts.port || opts.forward;
		cli.forward(opts);
	} else {
		cli.terminal(opts);
	}
}

main();
