#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('qkit');
var arguments = require('qkit/arguments');
var { exec, execSync } = require('qkit/syscall');
var { TTYServer } = require('./server');
var { host = '127.0.0.1', port = 8095, device_id } = utils.config.dttyd || {};

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;
var id = getDeviceId() || device_id || '';

function getDeviceId() {
	var cmd = `cat /proc/cpuinfo | grep Serial | awk {'print $3'}`;
	var { stdout } = execSync(cmd);
	return String(stdout[0] || '').trim();
}

def_opts(['help'],        0,   '--help         print help info');
def_opts(['device', 'd'], id,  '--device, -d   device id [{0}]');
def_opts(['host', 'h'], host,  '--host, -h     host [{0}]');
def_opts(['port', 'p'], port,  '--port, -p     port [{0}]');
def_opts(['ssl'],       0,     '--ssl          use ssl [{0}]');

function main() {

	if (opts.help || !opts.device) { // print help info
		process.stdout.write('Usage: dttyd [VAR=VALUE] \n')
		process.stdout.write('  ' + help_info.join('\n  ') + '\n');
		return;
	}

	opts.deviceId = opts.device;
	
	new TTYServer(opts).start();
}

main();
