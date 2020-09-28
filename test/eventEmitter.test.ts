import * as assert from "assert"
import * as eventEmitter from "../src/eventEmitter"

export namespace eventEmitterTest {

	export async function onTest() {
		const events = new eventEmitter.EventEmitter()
		const func = (arg1: any, arg2: any) => {
			assert.strictEqual(arg1, "arg1")
			assert.strictEqual(arg2, "arg2")
		}
		events.on("foo", func)
		await events.emit("foo", "arg1", "arg2")
		events.off("foo", func)
		await events.emit("foo", "arg1-error", "arg2-error")

		events.on("foo", func)
		events.on("foo", func)
		events.on("foo", func)
		await events.emit("foo", "arg1", "arg2")
		events.off("foo", func)
		await events.emit("foo", "arg1", "arg2")
		events.off("foo", func)
		events.off("foo", func)
		await events.emit("foo", "arg1-error", "arg2-error")

		events.on("foo", () => false)
		events.on("foo", () => { assert.ok(false, "Returning false will prevent rest event listeners") })
		events.off("foo")
		await events.emit("foo")

		events.on("foo", () => false)
		events.on("foo", () => { assert.ok(false, "Returning false will prevent rest event listeners") })
		await events.emit("foo")
		events.off()
		await events.emit("foo")

		events.once("once", (argument: any) => {
			assert.strictEqual(argument, "1")
		})
		await events.emit("once", "1")
		await events.emit("once", "2")
	}

	export async function offTest() {
		const events = new eventEmitter.EventEmitter()
		const func = (arg1: any, arg2: any) => {
			assert.strictEqual(arg1, "arg1")
			assert.strictEqual(arg2, "arg2")
		}

		events.off()
		events.off("foo")
		events.off("foo", func)

		events.on("foo", func)
		events.off("goo", () => { })
		events.off("goo")
		events.off("foo")

		events.on("foo", func)
		events.off()

		events.on("foo", func)
		events.off("foo", () => { })

		events.on("foo", func)
		events.off("foo", () => { })
		events.off("foo")

		let value = 0
		events.once("goo", (arg: any) => assert.strictEqual(++value, 1))
		await events.emit("goo")
		await events.emit("goo")
	}

}