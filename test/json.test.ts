import * as assert from "assert"
import * as json from "../src/json"
import { check, init, simulateIOError, uninit } from "./helpers/fsHelper"

export namespace jsonTest {

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

	export async function readJSONTest() {
		await init({ "main.json": `"main.json" //comment` })
		try {
			assert.strictEqual(json.readJSON("main.json"), "main.json")

			assert.throws(() => { json.readJSON("404") })
		} finally {
			await uninit()
		}
	}

	export async function writeJSONTest() {
		await init({
			"dir": {}
		})
		try {
			json.writeJSON("foo/main.json", "main.json")
			await check({ "foo/main.json": `"main.json"` })

			assert.throws(() => { json.writeJSON("dir", "main.json") })

			await simulateIOError(() => {
				assert.throws(() => { json.writeJSON("foo/main.json", "main.json") })
			})
		} finally {
			await uninit()
		}
	}

}