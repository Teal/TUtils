import * as assert from "assert"
import * as deferred from "../src/deferred"

export namespace deferredTest {

	export async function deferredTest() {
		const q = new deferred.Deferred()
		await q

		let value = 1
		q.reject()
		q.reject()
		q.resolve()
		setTimeout(() => {
			q.resolve()
			assert.strictEqual(++value, 3)
		}, 1)
		assert.strictEqual(++value, 2)

		await q
		assert.strictEqual(++value, 4)
	}

	export async function errorTest() {
		const q = new deferred.Deferred()
		let value = 1
		q.reject()
		q.then(() => {
			throw "error"
		})
		q.then(() => {
			value = 3
		})
		setTimeout(() => {
			value = 2
			q.resolve()
		}, 10)
		await assert.rejects(async () => {
			await q
			value = 4
		})
		q.reject()
		q.resolve()
		assert.strictEqual(value, 2)
	}

	export async function errorTest2() {
		const q = new deferred.Deferred()
		let value = 1
		q.reject()
		q.then(() => {
			throw "error"
		})
		await assert.rejects(async () => {
			value = 2
			q.resolve()
			await q
			value = 4
		})
		q.then(() => {
			value = 3
		})
		q.reject()
		q.resolve()
		assert.strictEqual(value, 2)
	}

}