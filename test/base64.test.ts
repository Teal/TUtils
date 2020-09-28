import * as assert from "assert"
import * as base64 from "../src/base64"

export namespace base64Test {

	export function encodeBase64Test() {
		assert.strictEqual(base64.encodeBase64("foo"), "Zm9v")
		assert.strictEqual(base64.encodeBase64(Buffer.from("foo")), "Zm9v")

		assert.strictEqual(base64.encodeBase64("A"), "QQ==")
		assert.strictEqual(base64.encodeBase64(""), "")
		assert.strictEqual(base64.encodeBase64(Buffer.from("")), "")
	}

	export function decodeBase64Test() {
		assert.strictEqual(base64.decodeBase64("Zm9v"), "foo")

		assert.strictEqual(base64.decodeBase64("QQ=="), "A")
		assert.strictEqual(base64.decodeBase64(""), "")
		assert.strictEqual(base64.decodeBase64("A"), "", "Should ignore error")
	}

	export function encodeDataURITest() {
		assert.strictEqual(base64.encodeDataURI("text/plain", "foo"), "data:text/plain,foo")
		assert.strictEqual(base64.encodeDataURI("text/plain", Buffer.from("foo")), "data:text/plain;base64,Zm9v")

		assert.strictEqual(base64.encodeDataURI("text/plain", "<h1>Hello, World!</h1>"), "data:text/plain,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E")
	}

	export function decodeDataURITest() {
		assert.deepStrictEqual(base64.decodeDataURI("data:text/plain,foo"), { mimeType: "text/plain", data: "foo" })
		assert.deepStrictEqual(base64.decodeDataURI("data:text/plain;base64,Zm9v"), { mimeType: "text/plain", data: Buffer.from("foo") })

		assert.deepStrictEqual(base64.decodeDataURI("data:text/plain;base64,QQ=="), { mimeType: "text/plain", data: Buffer.from("A") })
		assert.deepStrictEqual(base64.decodeDataURI("data:text/plain;base64,"), { mimeType: "text/plain", data: Buffer.from("") })
		assert.deepStrictEqual(base64.decodeDataURI("data:text/plain,"), { mimeType: "text/plain", data: "" })

		assert.strictEqual(base64.decodeDataURI("data:text/javascript;base64"), null)
		assert.strictEqual(base64.decodeDataURI("data:text/javascript"), null)
		assert.strictEqual(base64.decodeDataURI("data:"), null)
		assert.strictEqual(base64.decodeDataURI(""), null)
	}

}