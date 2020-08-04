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
	async _exec({ test }) {
		var that = this.that(test);

		while (true) {
			console.log('test', test, await that.hasOnline());
			await utils.sleep(5e3);
		}
	}
}
