import * as assert from "assert"
import * as js from "../src/js"

export namespace jsTest {

	export function encodeJSStringTest() {
		assert.strictEqual(js.encodeJS("abc"), `abc`)

		assert.strictEqual(js.encodeJS("\r\n\u2028\u2029"), `\\r\\n\\u2028\\u2029`)
	}

	export function decodeJSStringTest() {
		assert.strictEqual(js.decodeJS("abc"), `abc`)

		assert.strictEqual(js.decodeJS("\\r\\n\\u2028\\u2029"), `\r\n\u2028\u2029`)
		assert.strictEqual(js.decodeJS("\\\"\\\'\\\\\\v\\\r\\\n\\t\\b\\f\\0\\2"), `\"\'\\\v\t\b\f\u00002`)
		assert.strictEqual(js.decodeJS("\\u{1122}"), `\u1122`)
	}

	export function quoteJSStringTest() {
		assert.strictEqual(js.quoteJSString("abc"), `"abc"`)

		assert.strictEqual(js.quoteJSString("abc\'"), `"abc'"`)
		assert.strictEqual(js.quoteJSString("abc\""), `'abc"'`)
		assert.strictEqual(js.quoteJSString("abc\"\'"), `"abc\\"'"`)

		assert.strictEqual(js.quoteJSString("abc\'", "'"), `'abc\\''`)
		assert.strictEqual(js.quoteJSString("abc\"", "'"), `'abc"'`)
		assert.strictEqual(js.quoteJSString("abc\"\'", "'"), `'abc"\\''`)

		assert.strictEqual(js.quoteJSString("abc\'", '"'), `"abc'"`)
		assert.strictEqual(js.quoteJSString("abc\"", '"'), `"abc\\""`)
		assert.strictEqual(js.quoteJSString("abc\"\'", '"'), `"abc\\"'"`)

		assert.strictEqual(js.quoteJSString("abc\'", "\`"), `\`abc'\``)
		assert.strictEqual(js.quoteJSString("abc\"", "\`"), `\`abc"\``)
		assert.strictEqual(js.quoteJSString("abc\"\'", "\`"), `\`abc"'\``)

		assert.strictEqual(js.quoteJSString(""), `""`)
		assert.strictEqual(js.quoteJSString("你好"), `"你好"`)
		assert.strictEqual(js.quoteJSString("\r\n\u2028\u2029"), `"\\r\\n\\u2028\\u2029"`)
		assert.strictEqual(js.quoteJSString(`"'\\\v\t\r\n\b\f\u00002`, ""), "\\\"\\\'\\\\\\v\\t\\r\\n\\b\\f\\02")

		assert.strictEqual(js.quoteJSString("abc", "'"), `'abc'`)
		assert.strictEqual(js.quoteJSString("abc\'", "'"), `'abc\\\''`)
		assert.strictEqual(js.quoteJSString("abc\'", '"'), `"abc'"`)
	}

	export function unquoteJSStringTest() {
		assert.strictEqual(js.unquoteJSString(`"abc"`), "abc")

		assert.strictEqual(js.unquoteJSString(`""`), "")
		assert.strictEqual(js.unquoteJSString(`"你好"`), "你好")
		assert.strictEqual(js.unquoteJSString(`"\\r\\n\\u2028\\u2029"`), "\r\n\u2028\u2029")
		assert.strictEqual(js.unquoteJSString(`\`\\r\\n\\u2028\\u2029\``), "\r\n\u2028\u2029")
	}

}