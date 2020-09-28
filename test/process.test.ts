import * as assert from "assert"
import * as proc from "../src/process"

export namespace processTest {

	export async function execTest() {
		assert.strictEqual((await proc.exec("echo 1")).stdout.trim(), "1")
		assert.strictEqual((await proc.exec("exit 1")).exitCode, 1)

		assert.ok((await proc.exec("command-not-exists")).exitCode !== 0)
	}

	export async function onExitTest() {
		const fn = () => { }
		proc.onExit(fn)
		proc.offExit(fn)
	}

}