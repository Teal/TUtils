import { format } from "util"

/**
 * 执行一个函数并捕获执行期间标准流的所有输出
 * @param callback 要执行的函数
 * @param callback.stdout 获取已捕获的标准输出流的所有内容
 * @param callback.stderr 获取已捕获的标准错误流的所有内容
 * @returns 返回函数的返回值
 */
export async function captureStdio<T>(callback: (stdout: (string | Buffer | Uint8Array)[], stderr: (string | Buffer | Uint8Array)[]) => T | Promise<T>) {
	const stdouts: (string | Buffer | Uint8Array)[] = []
	const stderrs: (string | Buffer | Uint8Array)[] = []
	// Node.js 并未提供标准流输出事件，只能劫持对应函数
	const originalStdoutWrite = process.stdout.write
	const originalStdErrorWrite = process.stderr.write
	process.stdout.write = (buffer: string | Buffer | Uint8Array, encoding?: string | Function, callback?: Function) => {
		stdouts.push(buffer)
		if (typeof encoding === "function") {
			encoding()
		}
		if (typeof callback === "function") {
			callback()
		}
		return true
	}
	process.stderr.write = (buffer: string | Buffer | Uint8Array, encoding?: string | Function, callback?: Function) => {
		stderrs.push(buffer)
		if (typeof encoding === "function") {
			encoding()
		}
		if (typeof callback === "function") {
			callback()
		}
		return true
	}
	// console.log 等内部会调用 process.stdout.write，理论上可以被正常捕获
	// 但有些场景（比如使用 VSCode 调试代码）也会劫持 console.log 等，使得捕获失败，因此这里需要再次劫持 console
	// tslint:disable-next-line: no-console
	const originalConsoleLog = console.log
	const originalConsoleInfo = console.info
	const originalConsoleDebug = console.debug
	const originalConsoleWarn = console.warn
	const originalConsoleError = console.error
	// tslint:disable-next-line: no-console
	console.debug = console.info = console.log = (...args: any[]) => {
		stdouts.push(format(args))
	}
	console.warn = console.error = (...args: any[]) => {
		stderrs.push(format(args))
	}
	// 无论函数是否出现异常，都要确保捕获被还原
	try {
		return await callback(stdouts, stderrs)
	} finally {
		// 还原劫持的函数
		process.stdout.write = originalStdoutWrite
		process.stderr.write = originalStdErrorWrite
		// tslint:disable-next-line: no-console
		console.log = originalConsoleLog
		console.info = originalConsoleInfo
		console.debug = originalConsoleDebug
		console.warn = originalConsoleWarn
		console.error = originalConsoleError
	}
}

/**
 * 模拟非 TTY 的输出流并执行函数
 * @param callback 要执行的函数
 * @returns 返回函数的返回值
 */
export async function simulateNoneTTYStream(callback: () => any | Promise<any>) {
	const originalStdOutIsITY = process.stdout.isTTY
	const originalStdOutColumns = process.stdout.columns
	const originalStdOutRows = process.stdout.rows
	const originalStdErrIsITY = process.stderr.isTTY
	const originalStdErrColumns = process.stderr.columns
	const originalStdErrRows = process.stderr.rows
	process.stderr.isTTY = process.stdout.isTTY = undefined
	process.stderr.rows = process.stderr.columns = process.stdout.columns = process.stdout.rows = undefined
	try {
		return await callback()
	} finally {
		process.stdout.isTTY = originalStdOutIsITY
		process.stdout.columns = originalStdOutColumns
		process.stdout.rows = originalStdOutRows
		process.stderr.isTTY = originalStdErrIsITY
		process.stdout.columns = originalStdErrColumns
		process.stdout.rows = originalStdErrRows
	}
}