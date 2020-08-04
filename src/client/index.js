/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2018-11-05
 */

var utils = require('somes').default;
var log = require('../log');
var readline = require('readline');
var crypto = require('crypto');
var crypto = require('crypto-tx');
var fs = require('somes/fs');
var keys = require('somes/keys').default;
var path = require('path');

require('somes/ws/conv').USE_GZIP_DATA = true;

const PRIVATE_KEY_FILE = `${process.env.HOME}/.dtty/privateKey`;

const Programs = {
	terminal: require('./terminal'),
	forward: require('./forward'),
	test: require('./test'),
};

class Signer {

	constructor(options) {
		this.options = options;
	}

	sign() {
		var role = 'admin';
		var st = Date.now();
		var {user, privateKey} = this.options;
		var key = 'a4dd53f2fefde37c07ac4824cf7086439633e1a357daacc3aaa16418275a9e40';
		var hash = Buffer.from(crypto.keccak(user + role + st + key).data);
		var sign = crypto.sign(hash, privateKey);
		sign = Buffer.concat([sign.signature, Buffer.from([sign.recovery])]).toString('base64');

		// recover public key test:
		// var sign = Buffer.from(sign, 'base64');
		// var pkey = crypto.recover(hash, sign.slice(0, 64), sign[64]).toString('hex');
		// crypto.verify(hash, publicKeyTo, sign.slice(0, 64))
		// console.log('sign confirm dev', '0x'+ pkey);

		return {role,st,sign,user};
	}
}

class Command {

	terminal(opts) {
		this._run('terminal', opts).catch(console.error);
	}

	forward(opts) {
		this._run('forward', opts).catch(console.error);
	}

	test(opts) {
		this._run('test', opts).catch(console.error);
	}

	async genkeyPair(opts) { // gen key pair
		this._startReadline();
		var user, passwd;
		do { user = await this._read('user: ') } while(!user);
		// do { passwd = await this._read('passwd: ', 1) } while(!passwd);
		this._endReadline();
		// passwd = crypto.createHash('md5').update(passwd).digest('hex');

		var privateKey = crypto.genPrivateKey();
		var publicKey = crypto.getPublic(privateKey, true);
		fs.mkdirpSync(path.dirname(PRIVATE_KEY_FILE));
		var privateKeys = {};
		if (fs.existsSync(PRIVATE_KEY_FILE)) {
			privateKeys = keys.parseFile(PRIVATE_KEY_FILE);
		}
		if (privateKeys[user] && !opts.force) {
			console.error(`Key already exists "${user}" from ${PRIVATE_KEY_FILE}`);
			process.exit(1);
		}
		// privateKeys[user] = [ privateKey.toString('hex'), publicKey.toString('hex') ];
		privateKeys[user] = privateKey.toString('hex');
		fs.writeFileSync(PRIVATE_KEY_FILE, keys.stringify(privateKeys));
		fs.chmodSync(PRIVATE_KEY_FILE, Number(0o600));
		console.log(`publicKey: ${user} ${publicKey.toString('hex')}`);
		console.log(`Write file ${PRIVATE_KEY_FILE} ok`);
	}

	_startReadline() {
		utils.assert(!this.m_rl);
		this.m_rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
	}

	_endReadline() {
		utils.assert(this.m_rl);
		this.m_rl.close();
		this.m_rl = null;
	}

	async _read(title, is_passwd) {
		var self = this;
		utils.assert(self.m_rl);
		return new Promise((ok, err)=>{
			var raw_write = process.stdout.write;
			self.m_rl.question(title, (value)=>{
				if (is_passwd) {
					process.stdout.write = raw_write;
				}
				ok(value);
			});
			if (is_passwd) {
				process.stdout.write = utils.noop;
			}
		});
	}

	async _run(cmd, options) {

		try {
			var privateKeys = keys.parseFile(PRIVATE_KEY_FILE);
			var user, privateKey;
			for (var user in privateKeys) {
				privateKey = new Buffer(privateKeys[user], 'hex');
				break;
			}
			if (!user)
				throw 'err';
		} catch(err) {
			process.stdout.write(`\nPrivatekey not found from ${PRIVATE_KEY_FILE}, \n\nPlease use \`dtty -G\` to generate key file\n\n`);
			process.exit(1);
		}
		// console.log(privateKeys)

		process.stdout.write('\nConnecting...\n');

		var { serverHost = '127.0.0.1', serverPort = 8096, ssl = false, thatId = '' } = options;
		var url = `fmt${ssl?'s':''}://${serverHost}:${serverPort}`;
		try {
			this.m_cli = new (Programs[cmd])(url, thatId);
			this.m_cli.conv.signer = new Signer({ user, privateKey });
			await this.m_cli.getFullThatId();
			await this.m_cli._exec(options);
		} catch(err) {
			// throw err;
			console.error('\n\nError: ' + err.message + `\n`/* + `Target device ${thatId} offline\n\n`*/);
			if (err.errno == -30004) {
				// Connection disconnection
				console.warn('\nPlease check whether the local time is synchronized correctly or whether the public key is uploaded\n');
			}
			process.exit(0);
		}
	}

}

exports.Command = Command;