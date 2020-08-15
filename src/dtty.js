#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var arguments = require('somes/arguments');
var { Command } = require('./client');

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;

def_opts(['help', 'h'],       0,   '--help, -h         print help info');
def_opts(['ssl'],             0,   '--ssl              use ssl [{0}]');
def_opts(['forward', 'f'],    0,   '--forward -f       forward remote port to local [{0}]');
def_opts(['event', 'e'],      1,   '--event -e         forward remote port forward begin event [{0}]');
def_opts(['test'],            '',  '--test             test fmt client [{0}]');
def_opts(['port', 'p'],       0,   '--port -p          local port [{0}]');
def_opts(['gen', 'G'],        0,   '--gen -G           gen key pair [{0}]');
def_opts(['force', 'F'],      0,   '--force -F         force exec [{0}]');

function main() {
	var cmd = new Command();

	if (opts.gen) {
		return cmd.genkeyPair(opts);
	}

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

	if (opts.forward) {
		opts.port = opts.port || opts.forward;
		cmd.forward(opts);
	} else if (opts.test) {
		cmd.test(opts);
	} else {
		cmd.terminal(opts);
	}
}

main();
