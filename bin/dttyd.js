#!/usr/bin/env node
/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('somes').default;
var arguments = require('somes/arguments');
var { TTYServer } = require('../src/server');
var { execSync } = require('somes/syscall');
var paths = require('../src/paths');
var { host = '127.0.0.1', port = 8096, id, cert } = utils.config.dttyd || {};
var errno = require('../src/errno');
var fs = require('fs');

var opts = arguments.options;
var help_info = arguments.helpInfo;
var def_opts = arguments.defOpts;
var __device_id, __serial_number;

function getDeviceId() {
	if (!__device_id) {
		try {
			var cmd = `cat /proc/cpuinfo | grep Serial | awk {'print $3'}`;
			var { first } = execSync(cmd);
			__device_id = String(first || '').trim();
		} catch(e) {
			console.error(e);
		}
		if (!__device_id) {
			if (fs.existsSync(paths.var + '/device_id')) {
				__device_id = fs.readFileSync(paths.var + '/device_id', 'utf-8').trim();
			} else if (fs.existsSync('/mnt/dphotos/dphoto-hw/var/device_id')) {
				__device_id = fs.readFileSync('/mnt/dphotos/dphoto-hw/var/device_id', 'utf-8').trim();
			} else {
				throw Error.new(errno.ERR_UNABLE_TO_READ_DEVICE_ID);
			}
		}
	}
	return __device_id;
}

function getSerialNumber() {
	if (!__serial_number) {
		try {
			var cmd = `cat /proc/cpuinfo | grep SN | awk {'print $3'}`;
			var { first } = execSync(cmd);
			__serial_number = String(first || '').slice(0, 20);
			for (var i = 0; i < __serial_number.length; i++) {
				if (__serial_number.charCodeAt(i) > 127) { // 非法字符
					__serial_number = getDeviceId();
					break;
				}
			}
		} catch(e) {
			console.error(e);
		}
	}
	return __serial_number || getDeviceId();
}

async function main() {
	id = id || getSerialNumber() || '';
	cert = cert || getDeviceId() || 'None';

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
