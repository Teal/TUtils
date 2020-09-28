import * as assert from "assert"
import * as logger from "../src/logger"
import { captureStdio } from "./helpers/consoleHelper"

export namespace loggerTest {

	export async function traceTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.trace("trace")
			assert.strictEqual(stdout.join("\n"), "")

			l.logLevel = logger.LogLevel.trace
			l.trace("trace")
			assert.strictEqual(stdout.join("\n").includes("trace"), true)
		})
	}

	export async function debugTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.debug("debug")
			assert.strictEqual(stdout.join("\n"), "")

			l.logLevel = logger.LogLevel.debug
			l.debug("debug")
			assert.strictEqual(stdout.join("\n").includes("debug"), true)
		})
	}

	export async function logTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.log("log")
			assert.strictEqual(stdout.join("\n").includes("log"), true)
		})
	}

	export async function infoTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.info("info")
			assert.strictEqual(stdout.join("\n").includes("info"), true)
		})
	}

	export async function successTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.success("success")
			assert.strictEqual(stdout.join("\n").includes("success"), true)
		})
	}

	export async function warningTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.warning("warning")
			assert.strictEqual(stderr.join("\n").includes("warning"), true)
		})
	}

	export async function errorTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.error("error")
			assert.strictEqual(stderr.join("\n").includes("error"), true)
		})
	}

	export async function fatalTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.fatal("fatal")
			assert.strictEqual(stderr.join("\n").includes("fatal"), true)
		})
	}

	export async function formatLogTest() {
		const l = new logger.Logger({ timestamp: false })
		assert.ok(l.formatLog({
			source: "source",
			message: "message",
			stack: new Error("error").stack,
			showStack: true,
			fileName: "fileName",
			content: "content",
			line: 1,
			column: 2,
			endLine: 3,
			endColumn: 4,
			detail: "detail"
		}).includes("message"))

		assert.ok(l.formatLog({
			message: "message",
			fileName: "fileName",
			line: 1,
			endLine: 3,
		}, logger.LogLevel.success, false).includes("message"))

		assert.strictEqual(l.formatLog({}), "")
		assert.strictEqual(l.formatLog(""), "")
	}

	export async function taskTest() {
		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.logLevel = logger.LogLevel.trace
			l.end(l.begin("Current"))
			assert.strictEqual(stdout.join("\n").includes("Current"), true)
		})

		await captureStdio((stdout, stderr) => {
			const l = new logger.Logger()
			l.progressPercent = 10
			l.showProgress("Current")
			l.hideProgress()
		})
	}

}