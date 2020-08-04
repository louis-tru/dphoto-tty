/**
 * @copyright © 2018 Copyright dphone.com
 * @date 2020-08-04
 */

var utils = require('somes').default;
var cli = require('somes/fmt/cli');
var uuid = require('somes/hash/uuid').default;

/**
 * @class Client
 */
module.exports = class Client extends cli.FMTClient {

	get thatId() {
		return this.m_thatId;
	}

	constructor(url, thatid) {
		super(utils.hash(uuid()), url, { thatid });
		this.m_thatId = null;
	}

	async getFullThatId() {
		var {fullThatId} = await this.user();
		utils.assert(fullThatId);
		this.m_thatId = fullThatId;
		this.m_that = this.that(fullThatId);
	}

	_exec() {}
}
