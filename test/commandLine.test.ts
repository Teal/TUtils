import * as assert from "assert"
import * as commandLine from "../src/commandLine"

export namespace commandLineTest {

	export function showCursorTest() {
		commandLine.showCursor()
		commandLine.hideCursor()
		commandLine.showCursor()
	}

	export function parseCommandLineArgumentsTest() {
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["--x", "foo", "--y"], 0), { __proto__: null, "--x": "foo", "--y": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["foo"], 0), { __proto__: null, "0": "foo" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--full": { alias: "-f" } }, undefined, ["-f"], 0), { __proto__: null, "--full": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--full": { alias: "-f" } }, undefined, ["-f2"], 0), { __proto__: null, "-f2": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--full": { alias: ["-f"] } }, undefined, ["-f"], 0), { __proto__: null, "--full": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "-x": {}, "--full": { alias: ["-f", "-g"] } }, undefined, ["-f"], 0), { __proto__: null, "--full": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "-x": {}, "--full": { alias: ["-f", "-g"] } }, undefined, ["-g"], 0), { __proto__: null, "--full": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["--", "-x"], 0), { __proto__: null, "--": { __proto__: null, "-x": true } })

		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["--x=foo"], 0), { __proto__: null, "--x": "foo" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["--x:foo"], 0), { __proto__: null, "--x": "foo" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({}, undefined, ["--x", "f", "--x=g", "--x:h"], 0), { __proto__: null, "--x": ["f", "g", "h"] })

		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", default: "foo" } }, undefined, ["--x"], 0), { __proto__: null, "--x": "foo" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo" } }, undefined, ["--x"], 0), { __proto__: null })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", multiple: true } }, undefined, ["--x", "x"], 0), { __proto__: null, "--x": ["x"] })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", multiple: true, default: "default" } }, undefined, ["--x", "--x", "x"], 0), { __proto__: null, "--x": ["default", "x"] })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", multiple: true, default: "default" } }, undefined, ["--x"], 0), { __proto__: null, "--x": ["default"] })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", default: "default" } }, () => { }, ["--x", "--x", "x"], 0), { __proto__: null, "--x": "x" })

		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo", default: "default" } }, () => { }, ["--x", "--x", "x"], 0), { __proto__: null, "--x": "x" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": {} }, () => { }, ["--x", "--x", "x"], 0), { __proto__: null, "0": "x", "--x": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": {} }, () => { }, ["--x:x"], 0), { __proto__: null, "--x": true })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo" } }, () => { }, ["--x:y"], 0), { __proto__: null, "--x": "y" })
		assert.deepStrictEqual(commandLine.parseCommandLineArguments({ "--x": { argument: "foo" } }, () => { }, ["--x"], 0), { __proto__: null })
	}

	export function formatCommandLineOptionsTest() {
		assert.strictEqual(commandLine.formatCommandLineOptions({
			"--help": {
				description: "help"
			}
		}, Infinity), `  --help  help`)
		assert.strictEqual(commandLine.formatCommandLineOptions({
			"--help": {
				description: "help",
				alias: "-h"
			}
		}, Infinity), `  -h, --help  help`)
		assert.strictEqual(commandLine.formatCommandLineOptions({
			"--help": {
				description: "help",
				alias: ["-h", "-?"]
			}
		}, Infinity), `  -h, -?, --help  help`)
		assert.strictEqual(commandLine.formatCommandLineOptions({
			"--help": {
				description: "help",
				argument: "help"
			}
		}, Infinity), `  --help <help>  help`)

		assert.strictEqual(commandLine.formatCommandLineOptions({
			"--help": {
				group: "HELP",
				description: "help",
				argument: "help"
			},
			"--help2": {
				group: "HELP2",
				description: "help",
				argument: "help",
				default: ""
			},
			"--help3": {
			},
			"--help4": {
				description: "help"
			}
		}, Infinity), [
			``,
			`HELP:`,
			`  --help <help>   help`,
			``,
			`HELP2:`,
			`  --help2 [help]  help`,
			`  --help4         help`
		].join("\n"))
	}

}