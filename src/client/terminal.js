/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2020-08-04
 */

var utils = require('somes').default;
var Client = require('./cli');

/**
 * @class Terminal
 */
module.exports = class Terminal extends Client {
	/**
	 * @overwrite
	 */
	async _exec() {
		await this.subscribe([/*'Data',*/'End']);

		var getSize = ()=>({ 
			rows: process.stdout.rows, columns: process.stdout.columns 
		});
		var offline = ()=>{
			utils.sleep(200).then(e=>{
				process.stdin.setRawMode(false);
				process.exit(0);
			});
		};

		// this.addEventListener('Data', e=>process.stdout.write(e.data));
		this.addEventListener('End', offline);
		this.addEventListener(`Logout-${this.thatId}`, offline);
		this.addEventListener('Offline', offline);

		var that = this.m_that;
		var tid = await that.call('terminal', getSize());

		process.stdout.on('resize', e=>{
			that.call('tresize', {tid, ...getSize() }).catch(console.error);
		});
		process.stdin.on('data', async e=>{
			try {
				await that.call('twrite', [tid,e]);
			} catch(err) {
				console.error(err);
				offline();
			}
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
	}

	/**
	 * @func d()
	 */
	d([data], sender) {
		if (this.thatId == sender)
			process.stdout.write(data);
	}

}
