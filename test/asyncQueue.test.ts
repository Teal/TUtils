import * as assert from "assert"
import * as asyncQueue from "../src/asyncQueue"

export namespace asyncQueueTest {

	export async function asyncQueueTest() {
		const q = new asyncQueue.AsyncQueue()
		let value = 1
		assert.strictEqual(await q.then(async () => {
			await sleep(2)
			return ++value
		}), 2)

		assert.deepStrictEqual(await Promise.all([q.then(async () => {
			assert.strictEqual(q.isEmpty, false)
			await sleep(2)
			return ++value
		}), q.then(async () => {
			await sleep(1)
			return ++value
		})]), [3, 4])
		assert.strictEqual(q.isEmpty, true)

		try {
			await q.then(async () => {
				throw "error"
			})
		} catch (e) {
			assert.strictEqual(e.toString(), "error")
		}

		function sleep(ms: number) {
			return new Promise(r => setTimeout(r, ms))
		}
	}

}