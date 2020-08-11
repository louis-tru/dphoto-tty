/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2020-08-04
 */

var utils = require('somes').default;
var Client = require('./cli');

/**
 * @class Test
 */
module.exports = class Test extends Client {
	async _exec({ index }) {
		var that = this.m_that;

		while (true) {
			try {
				console.log('test hasOnline', index, that.id, await that.hasOnline());
				// console.log('test event', await that.trigger('test'));
				await utils.sleep(utils.random(2e4, 5e4));
			} catch(err) {
				console.error(err);
			}
		}
	}
}
