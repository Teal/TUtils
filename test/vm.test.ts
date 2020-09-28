import * as assert from "assert"
import * as vm from "../src/vm"

export namespace vmTest {

	export function runInVMTest() {
		assert.strictEqual(vm.runInVM("1"), 1)
		assert.strictEqual(vm.runInVM("x", { x: 1 }), 1)

		assert.strictEqual(vm.runInVM("global.x", { x: 1 }), 1)
		assert.strictEqual(vm.runInVM("require('util').format('hi')"), "hi")
		assert.strictEqual(vm.runInVM("__filename", undefined, { filename: "a/b" }), "a/b")
		assert.strictEqual(vm.runInVM("__dirname", undefined, "a/b"), "a")
	}

}