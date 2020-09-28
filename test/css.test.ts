import * as assert from "assert"
import * as css from "../src/css"

export namespace cssTest {

	export function encodeCSSTest() {
		assert.strictEqual(css.encodeCSS("a.b"), "a\\.b")

		// https://github.com/mathiasbynens/CSS.escape/blob/master/tests/tests.js
		assert.strictEqual(css.encodeCSS("abc"), "abc")

		assert.strictEqual(css.encodeCSS("\uFFFD"), "\uFFFD")
		assert.strictEqual(css.encodeCSS("a\uFFFD"), "a\uFFFD")
		assert.strictEqual(css.encodeCSS("\uFFFDb"), "\uFFFDb")
		assert.strictEqual(css.encodeCSS("a\uFFFDb"), "a\uFFFDb")

		assert.strictEqual(css.encodeCSS("\x01\x02\x1E\x1F"), "\\1 \\2 \\1e \\1f ")

		assert.strictEqual(css.encodeCSS("0a"), "\\30 a")
		assert.strictEqual(css.encodeCSS("1a"), "\\31 a")
		assert.strictEqual(css.encodeCSS("2a"), "\\32 a")
		assert.strictEqual(css.encodeCSS("3a"), "\\33 a")
		assert.strictEqual(css.encodeCSS("4a"), "\\34 a")
		assert.strictEqual(css.encodeCSS("5a"), "\\35 a")
		assert.strictEqual(css.encodeCSS("6a"), "\\36 a")
		assert.strictEqual(css.encodeCSS("7a"), "\\37 a")
		assert.strictEqual(css.encodeCSS("8a"), "\\38 a")
		assert.strictEqual(css.encodeCSS("9a"), "\\39 a")

		assert.strictEqual(css.encodeCSS("a0b"), "a0b")
		assert.strictEqual(css.encodeCSS("a1b"), "a1b")
		assert.strictEqual(css.encodeCSS("a2b"), "a2b")
		assert.strictEqual(css.encodeCSS("a3b"), "a3b")
		assert.strictEqual(css.encodeCSS("a4b"), "a4b")
		assert.strictEqual(css.encodeCSS("a5b"), "a5b")
		assert.strictEqual(css.encodeCSS("a6b"), "a6b")
		assert.strictEqual(css.encodeCSS("a7b"), "a7b")
		assert.strictEqual(css.encodeCSS("a8b"), "a8b")
		assert.strictEqual(css.encodeCSS("a9b"), "a9b")

		assert.strictEqual(css.encodeCSS("-0a"), "-\\30 a")
		assert.strictEqual(css.encodeCSS("-1a"), "-\\31 a")
		assert.strictEqual(css.encodeCSS("-2a"), "-\\32 a")
		assert.strictEqual(css.encodeCSS("-3a"), "-\\33 a")
		assert.strictEqual(css.encodeCSS("-4a"), "-\\34 a")
		assert.strictEqual(css.encodeCSS("-5a"), "-\\35 a")
		assert.strictEqual(css.encodeCSS("-6a"), "-\\36 a")
		assert.strictEqual(css.encodeCSS("-7a"), "-\\37 a")
		assert.strictEqual(css.encodeCSS("-8a"), "-\\38 a")
		assert.strictEqual(css.encodeCSS("-9a"), "-\\39 a")

		assert.strictEqual(css.encodeCSS("-"), "\\-")
		assert.strictEqual(css.encodeCSS("-a"), "-a")
		assert.strictEqual(css.encodeCSS("--"), "--")
		assert.strictEqual(css.encodeCSS("--a"), "--a")

		assert.strictEqual(css.encodeCSS("\x80\x2D\x5F\xA9"), "\x80\x2D\x5F\xA9")
		assert.strictEqual(css.encodeCSS("\x7F\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F"), "\\7f \x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F")
		assert.strictEqual(css.encodeCSS("\xA0\xA1\xA2"), "\xA0\xA1\xA2")
		assert.strictEqual(css.encodeCSS("a0123456789b"), "a0123456789b")
		assert.strictEqual(css.encodeCSS("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnopqrstuvwxyz")
		assert.strictEqual(css.encodeCSS("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

		assert.strictEqual(css.encodeCSS("\x20\x21\x78\x79"), "\\ \\!xy")

		// astral symbol (U+1D306 TETRAGRAM FOR CENTRE)
		assert.strictEqual(css.encodeCSS("\uD834\uDF06"), "\uD834\uDF06")
		// lone surrogates
		assert.strictEqual(css.encodeCSS("\uDF06"), "\uDF06")
		assert.strictEqual(css.encodeCSS("\uD834"), "\uD834")
	}

	export function decodeCSSTest() {
		assert.strictEqual(css.decodeCSS("a\\.b"), "a.b")

		assert.strictEqual(css.decodeCSS("\\0"), "\uFFFD")
		assert.strictEqual(css.decodeCSS("\\00"), "\uFFFD")
		assert.strictEqual(css.decodeCSS("\\0 "), "\uFFFD")
		assert.strictEqual(css.decodeCSS("\\00 "), "\uFFFD")

		assert.strictEqual(css.decodeCSS("\uFFFD"), "\uFFFD")
		assert.strictEqual(css.decodeCSS("a\uFFFD"), "a\uFFFD")
		assert.strictEqual(css.decodeCSS("\uFFFDb"), "\uFFFDb")
		assert.strictEqual(css.decodeCSS("a\uFFFDb"), "a\uFFFDb")

		assert.strictEqual(css.decodeCSS("\\1 \\2 \\1e \\1f "), "\x01\x02\x1E\x1F")

		assert.strictEqual(css.decodeCSS("\\30 a"), "0a")
		assert.strictEqual(css.decodeCSS("\\31 a"), "1a")
		assert.strictEqual(css.decodeCSS("\\32 a"), "2a")
		assert.strictEqual(css.decodeCSS("\\33 a"), "3a")
		assert.strictEqual(css.decodeCSS("\\34 a"), "4a")
		assert.strictEqual(css.decodeCSS("\\35 a"), "5a")
		assert.strictEqual(css.decodeCSS("\\36 a"), "6a")
		assert.strictEqual(css.decodeCSS("\\37 a"), "7a")
		assert.strictEqual(css.decodeCSS("\\38 a"), "8a")
		assert.strictEqual(css.decodeCSS("\\39 a"), "9a")

		assert.strictEqual(css.decodeCSS("a0b"), "a0b")
		assert.strictEqual(css.decodeCSS("a1b"), "a1b")
		assert.strictEqual(css.decodeCSS("a2b"), "a2b")
		assert.strictEqual(css.decodeCSS("a3b"), "a3b")
		assert.strictEqual(css.decodeCSS("a4b"), "a4b")
		assert.strictEqual(css.decodeCSS("a5b"), "a5b")
		assert.strictEqual(css.decodeCSS("a6b"), "a6b")
		assert.strictEqual(css.decodeCSS("a7b"), "a7b")
		assert.strictEqual(css.decodeCSS("a8b"), "a8b")
		assert.strictEqual(css.decodeCSS("a9b"), "a9b")

		assert.strictEqual(css.decodeCSS("-\\30 a"), "-0a")
		assert.strictEqual(css.decodeCSS("-\\31 a"), "-1a")
		assert.strictEqual(css.decodeCSS("-\\32 a"), "-2a")
		assert.strictEqual(css.decodeCSS("-\\33 a"), "-3a")
		assert.strictEqual(css.decodeCSS("-\\34 a"), "-4a")
		assert.strictEqual(css.decodeCSS("-\\35 a"), "-5a")
		assert.strictEqual(css.decodeCSS("-\\36 a"), "-6a")
		assert.strictEqual(css.decodeCSS("-\\37 a"), "-7a")
		assert.strictEqual(css.decodeCSS("-\\38 a"), "-8a")
		assert.strictEqual(css.decodeCSS("-\\39 a"), "-9a")

		assert.strictEqual(css.decodeCSS("\\-"), "-")
		assert.strictEqual(css.decodeCSS("-a"), "-a")
		assert.strictEqual(css.decodeCSS("--"), "--")
		assert.strictEqual(css.decodeCSS("--a"), "--a")

		assert.strictEqual(css.decodeCSS("\x80\x2D\x5F\xA9"), "\x80\x2D\x5F\xA9")
		assert.strictEqual(css.decodeCSS("\\7f \x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F"), "\x7F\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F")
		assert.strictEqual(css.decodeCSS("\xA0\xA1\xA2"), "\xA0\xA1\xA2")
		assert.strictEqual(css.decodeCSS("a0123456789b"), "a0123456789b")
		assert.strictEqual(css.decodeCSS("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnopqrstuvwxyz")
		assert.strictEqual(css.decodeCSS("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

		assert.strictEqual(css.decodeCSS("\\ \\!xy"), "\x20\x21\x78\x79")

		// astral symbol (U+1D306 TETRAGRAM FOR CENTRE)
		assert.strictEqual(css.decodeCSS("\uD834\uDF06"), "\uD834\uDF06")
		// lone surrogates
		assert.strictEqual(css.decodeCSS("\uDF06"), "\uDF06")
		assert.strictEqual(css.decodeCSS("\uD834"), "\uD834")
	}

	export function quoteCSSStringTest() {
		assert.strictEqual(css.quoteCSSString("abc"), `abc`)
		assert.strictEqual(css.quoteCSSString("abc(0)"), `"abc(0)"`)
		assert.strictEqual(css.quoteCSSString("abc", '"'), `"abc"`)

		assert.strictEqual(css.quoteCSSString("abc'"), `"abc'"`)
		assert.strictEqual(css.quoteCSSString("abc'", "'"), `'abc\\''`)
		assert.strictEqual(css.quoteCSSString("abc\""), `"abc\\""`)
		assert.strictEqual(css.quoteCSSString("abc", '"'), `"abc"`)
		assert.strictEqual(css.quoteCSSString("abc", "'"), `'abc'`)

		assert.strictEqual(css.quoteCSSString("\uFFFD"), "\uFFFD")
		assert.strictEqual(css.quoteCSSString("a\uFFFD"), "a\uFFFD")
		assert.strictEqual(css.quoteCSSString("\uFFFDb"), "\uFFFDb")
		assert.strictEqual(css.quoteCSSString("a\uFFFDb"), "a\uFFFDb")

		assert.strictEqual(css.quoteCSSString("\x01\x02\x1E\x1F"), "\\1 \\2 \\1e \\1f ")
		assert.strictEqual(css.quoteCSSString("\\"), "\\\\")
	}

	export function unquoteCSSStringTest() {
		assert.strictEqual(css.unquoteCSSString(`abc`), "abc")
		assert.strictEqual(css.unquoteCSSString(`"abc"`), "abc")
		assert.strictEqual(css.unquoteCSSString(`'abc'`), "abc")
	}

}