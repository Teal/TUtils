import * as assert from "assert"
import * as workerPool from "../src/workerPool"

export namespace workerPoolTest {

	var pool: workerPool.WorkerPool

	export async function afterEach() {
		if (pool) {
			pool.close()
		}
	}

	export async function execTest() {
		pool = new workerPool.WorkerPool(([taskName, x, y]: [string, number, number]) => {
			switch (taskName) {
				case "t1":
					return x + y
				case "t2":
					return Promise.resolve(x + y)
				case "t3":
					return new Promise(resolve => setTimeout(() => { resolve(x + y) }, 10))
				case "t4":
					throw "ERROR"
			}
		}, { size: 2 })
		await Promise.all([
			(async () => { assert.strictEqual(await pool.exec(["t1", 1, 2]), 3) })(),
			(async () => { assert.strictEqual(await pool.exec(["t2", 1, 2]), 3) })(),
			(async () => { assert.strictEqual(await pool.exec(["t3", 1, 2]), 3) })(),
			(async () => { await assert.rejects(async () => { await pool.exec(["t4", 1, 2]) }) })(),
		])
	}

	export async function exitTest() {
		pool = new workerPool.WorkerPool(() => { process.exit(3) }, { size: 1 })
		if (pool.size <= 0) {
			return
		}
		await Promise.all([
			(async () => { await assert.rejects(async () => { await pool.exec("t2") }) })(),
			(async () => { await assert.rejects(async () => { await pool.exec("t2") }) })()
		])
	}

	export async function errorTest() {
		pool = new workerPool.WorkerPool(() => { throw "ERROR" }, { size: 1 })
		if (pool.size <= 0) {
			return
		}
		await Promise.all([
			(async () => { await assert.rejects(async () => { await pool.exec("t2") }) })(),
			(async () => { await assert.rejects(async () => { await pool.exec("t2") }) })()
		])
	}

	export async function cannotCloneTest() {
		pool = new workerPool.WorkerPool(() => { throw new Error("E") }, { size: 1 })
		if (pool.size <= 0) {
			return
		}
		await assert.rejects(async () => { await pool.exec() })
		await assert.rejects(async () => { await pool.exec(new Error("E")) })
	}

	export async function simulateTest() {
		new workerPool.WorkerPool(() => { }).close()

		pool = new workerPool.WorkerPool(([taskName, x, y]: [string, number, number]) => {
			switch (taskName) {
				case "t1":
					return x + y
				case "t2":
					return Promise.resolve(x + y)
				case "t3":
					return new Promise(resolve => setTimeout(() => { resolve(x + y) }, 10))
				case "t4":
					throw "ERROR"
			}
		}, { size: 0 })
		await Promise.all([
			(async () => { assert.strictEqual(await pool.exec(["t1", 1, 2]), 3) })(),
			(async () => { assert.strictEqual(await pool.exec(["t2", 1, 2]), 3) })(),
			(async () => { assert.strictEqual(await pool.exec(["t3", 1, 2]), 3) })(),
			(async () => { await assert.rejects(async () => { await pool.exec(["t4", 1, 2]) }) })(),
		])
	}

	export async function callTest() {
		pool = new workerPool.WorkerPool(async (data: any, context: workerPool.WorkerContext) => {
			return await context.call("hello", 3)
		}, { size: 2, functions: { hello(x: number) { return x - 2 } } })
		assert.strictEqual(await pool.exec(), 1)
	}

	export async function callTest2() {
		pool = new workerPool.WorkerPool(async (data: any, context: workerPool.WorkerContext) => {
			return await context.call("hello", 3)
		}, { size: 2, functions: { hello(x: number) { throw "ERROR" } } })
		await assert.rejects(async () => { await pool.exec() })
	}

	export async function callTest3() {
		pool = new workerPool.WorkerPool(async (data: any, context: workerPool.WorkerContext) => {
			return await context.call("hello", 3)
		}, { size: -1, functions: { hello(x: number) { return x - 2 } } })
		assert.strictEqual(await pool.exec(), 1)
	}

	export async function callTest4() {
		pool = new workerPool.WorkerPool(async (data: any, context: workerPool.WorkerContext) => {
			return await context.call("hello", 3)
		}, { size: -1, functions: { hello(x: number) { throw "ERROR" } } })
		await assert.rejects(async () => { await pool.exec() })
	}

	export async function callTest5() {
		pool = new workerPool.WorkerPool(async (data: any, context: workerPool.WorkerContext) => {
			return await context.call("hello", undefined)
		}, { size: 2, functions: { hello() { throw new Error("E") } } })
		await assert.rejects(async () => { await pool.exec(new Error("E")) })
		await assert.rejects(async () => { await pool.exec() })
	}

	export function isStructuredCloneableTest() {
		assert.strictEqual(workerPool.isStructuredCloneable({ x: 1, y: [1, 2] }), true)

		assert.strictEqual(workerPool.isStructuredCloneable(true), true)
		assert.strictEqual(workerPool.isStructuredCloneable(false), true)
		assert.strictEqual(workerPool.isStructuredCloneable(0), true)
		assert.strictEqual(workerPool.isStructuredCloneable("string"), true)
		assert.strictEqual(workerPool.isStructuredCloneable(null), true)
		assert.strictEqual(workerPool.isStructuredCloneable(undefined), true)
		assert.strictEqual(workerPool.isStructuredCloneable([1, 2]), true)
		assert.strictEqual(workerPool.isStructuredCloneable(() => { }), false)
		assert.strictEqual(workerPool.isStructuredCloneable(new Set([1, 2])), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new Map([["x", 1], ["y", 2]])), true)
		assert.strictEqual(workerPool.isStructuredCloneable({ x: 1, y: 2 }), true)
		assert.strictEqual(workerPool.isStructuredCloneable({ foo() { } }), false)
		assert.strictEqual(workerPool.isStructuredCloneable(new Set([1, () => { }])), false)
		assert.strictEqual(workerPool.isStructuredCloneable(new Map([[() => { }, () => { }]])), false)
		assert.strictEqual(workerPool.isStructuredCloneable(new class { }), false)

		assert.strictEqual(workerPool.isStructuredCloneable(new Date()), true)
		assert.strictEqual(workerPool.isStructuredCloneable(/re/), true)
		assert.strictEqual(workerPool.isStructuredCloneable(Buffer.alloc(0)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new Uint16Array(0)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new Uint8Array(0)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new ArrayBuffer(0)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new SharedArrayBuffer(0)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new String("0")), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new Number(false)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(new Boolean(false)), true)
		assert.strictEqual(workerPool.isStructuredCloneable(Symbol("symbol")), false)
		assert.strictEqual(workerPool.isStructuredCloneable(BigInt(0)), true)
	}

}