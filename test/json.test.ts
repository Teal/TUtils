import * as assert from "assert"
import * as json from "../src/json"

export namespace jsonTest {

	export function parseJSONTest() {
		assert.deepStrictEqual(json.parseJSON(`{}`), {})
		assert.strictEqual(json.parseJSON(`3`), 3)
		assert.strictEqual(json.parseJSON(``), undefined)
		assert.strictEqual(json.parseJSON(`x`), undefined)
	}

	export function formatJSONTest() {
		assert.deepStrictEqual(json.formatJSON({}), `{}`)
		assert.deepStrictEqual(json.formatJSON(3), `3`)
	}

	export function normalizeJSONTest() {
		// https://github.com/sindresorhus/strip-json-comments/blob/master/test.js
		assert.strictEqual(json.normalizeJSON('//comment\n{"a":"b"}'), '         \n{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('/*//comment*/{"a":"b"}'), '             {"a":"b"}')

		assert.strictEqual(json.normalizeJSON('{"a":"b"//comment\n}'), '{"a":"b"         \n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"/*comment*/}'), '{"a":"b"           }')
		assert.strictEqual(json.normalizeJSON('{"a"/*\n\n\ncomment\r\n*/:"b"}'), '{"a"  \n\n\n       \r\n  :"b"}')
		assert.strictEqual(json.normalizeJSON('/*!\n * comment\n */\n{"a":"b"}'), '   \n          \n   \n{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('{/*comment*/"a":"b"}'), '{           "a":"b"}')

		assert.strictEqual(json.normalizeJSON('//comment\n{"a":"b"}', false), '\n{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('/*//comment*/{"a":"b"}', false), '{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"//comment\n}', false), '{"a":"b"\n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"/*comment*/}', false), '{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('{"a"/*\n\n\ncomment\r\n*/:"b"}', false), '{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('/*!\n * comment\n */\n{"a":"b"}', false), '\n{"a":"b"}')
		assert.strictEqual(json.normalizeJSON('{/*comment*/"a":"b"}', false), '{"a":"b"}')

		assert.strictEqual(json.normalizeJSON('{"a":"b//c"}'), '{"a":"b//c"}')
		assert.strictEqual(json.normalizeJSON('{"a":"b/*c*/"}'), '{"a":"b/*c*/"}')
		assert.strictEqual(json.normalizeJSON('{"/*a":"b"}'), '{"/*a":"b"}')
		assert.strictEqual(json.normalizeJSON('{"\\"/*a":"b"}'), '{"\\"/*a":"b"}')

		assert.strictEqual(json.normalizeJSON('{"\\\\":"https://foobar.com"}'), '{"\\\\":"https://foobar.com"}')
		assert.strictEqual(json.normalizeJSON('{"foo\\"":"https://foobar.com"}'), '{"foo\\"":"https://foobar.com"}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"\n}'), '{"a":"b"\n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"\r\n}'), '{"a":"b"\r\n}')

		assert.strictEqual(json.normalizeJSON('{"a":"b"//c\n}'), '{"a":"b"   \n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"//c\r\n}'), '{"a":"b"   \r\n}')

		assert.strictEqual(json.normalizeJSON('{"a":"b"/*c*/\n}'), '{"a":"b"     \n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b"/*c*/\r\n}'), '{"a":"b"     \r\n}')

		assert.strictEqual(json.normalizeJSON('{"a":"b",/*c\nc2*/"x":"y"\n}'), '{"a":"b",   \n    "x":"y"\n}')
		assert.strictEqual(json.normalizeJSON('{"a":"b",/*c\r\nc2*/"x":"y"\r\n}'), '{"a":"b",   \r\n    "x":"y"\r\n}')

		assert.strictEqual(json.normalizeJSON('{\r\n\t"a":"b"\r\n} //EOF'), '{\r\n\t"a":"b"\r\n}      ')
		assert.strictEqual(json.normalizeJSON('{\r\n\t"a":"b"\r\n} //EOF', false), '{\r\n\t"a":"b"\r\n} ')

		assert.strictEqual(json.normalizeJSON(String.raw`{"x":"x \"sed -e \\\"s/^.\\\\{46\\\\}T//\\\" -e \\\"s/#033/\\\\x1b/g\\\"\""}`), String.raw`{"x":"x \"sed -e \\\"s/^.\\\\{46\\\\}T//\\\" -e \\\"s/#033/\\\\x1b/g\\\"\""}`)

		assert.strictEqual(json.normalizeJSON('{\r\n\t"a":"b"\r\n,} //EOF', false), '{\r\n\t"a":"b"\r\n} ')

	}

	export function readJSONByPathTest() {
		assert.strictEqual(json.readJSONByPath({ a: 1 }, "a"), 1)
		assert.strictEqual(json.readJSONByPath({ a: { b: 1 } }, "a/b"), 1)
		assert.strictEqual(json.readJSONByPath({ a: [1] }, "a/0"), 1)
		assert.strictEqual(json.readJSONByPath({ a: [1] }, "a/length"), 1)
		assert.strictEqual(json.readJSONByPath({ a: [1] }, "b"), undefined)
		assert.strictEqual(json.readJSONByPath({ a: [1] }, "b/d"), undefined)
	}

	export function writeJSONByPathTest() {
		const obj: any = {}
		json.writeJSONByPath(obj, `a`, 1)
		assert.strictEqual(obj.a, 1)
		json.writeJSONByPath(obj, `b/c`, 1)
		assert.deepStrictEqual(obj.b, { c: 1 })
		json.writeJSONByPath(obj, `b/b`, 1)
		assert.deepStrictEqual(obj.b, { c: 1, b: 1 })
		json.writeJSONByPath(obj, `a/x`, 0)
		assert.deepStrictEqual(obj.a, { x: 0 })
	}

	export function moveJSONByPathTest() {
		const obj: any = {
			a: 1,
			b: 2,
			c: {
				d: 1
			}
		}
		json.moveJSONByPath(obj, [`b`], 'c/d')
		assert.deepStrictEqual(obj, {
			a: 1,
			c: {
				b: 2,
				d: 1
			}
		})
		json.moveJSONByPath(obj, [`a`], 'c/')
		assert.deepStrictEqual(obj, {
			c: {
				b: 2,
				d: 1,
				a: 1,
			}
		})
		json.moveJSONByPath(obj, [`c/b`, 'c/a'], null)
		assert.deepStrictEqual(obj, {
			c: {
				d: 1,
			},
			b: 2,
			a: 1,
		})
		json.moveJSONByPath(obj, [`c/b/d`, 'c/a/d'], null)
		assert.deepStrictEqual(obj, {
			c: {
				d: 1,
			},
			b: 2,
			a: 1,
		})
	}

	export function deleteJSONByPathTest() {
		const obj: any = { a: 1, b: { x: 2 } }
		json.deleteJSONByPath(obj, `a`)
		assert.strictEqual(obj.a, undefined)
		json.deleteJSONByPath(obj, `b/x`)
		assert.deepStrictEqual(obj.b, {})
		json.deleteJSONByPath(obj, `c`)
		assert.deepStrictEqual(obj.b, {})
		json.deleteJSONByPath(obj, `c/d`)
		assert.deepStrictEqual(obj.b, {})
	}

}