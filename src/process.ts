import { ChildProcess as NativeChildProcess, spawn, SpawnOptions } from "child_process"

/**
 * 执行一个命令
 * @param command 要执行的命令
 * @param options 附加选项
 * @param options.args 启动命令时的附加参数
 * @param options.timeout 执行超时毫秒数，设置 0 表示不超时
 * @returns 返回子进程
 */
export function exec(command: string, options: SpawnOptions & { args?: readonly string[], timeout?: number } = {}) {
	if (options.shell === undefined) {
		options.shell = true
	}
	const cp = spawn(command, options.args || [], options) as ChildProcess
	const result = cp.result = {} as ExecResult
	if (cp.stdout) {
		result.stdout = ""
		cp.stdout.setEncoding("utf8").on("data", d => {
			result.stdout! += d
		})
	}
	if (cp.stderr) {
		result.stderr = ""
		cp.stderr.setEncoding("utf8").on("data", d => {
			result.stderr! += d
		})
	}
	let timer: ReturnType<typeof setTimeout> | undefined
	if (options.timeout !== 0) {
		timer = setTimeout(() => {
			timer = undefined
			cp.kill()
			cp.emit("error", new Error("Exec Timeout"))
		}, options.timeout || 300000)
	}
	cp.on("error", error => {
		if (timer) clearTimeout(timer)
		cp.result.error = error
		cp.emit("reject", error)
	})
	cp.on("close", code => {
		if (timer) clearTimeout(timer)
		cp.result.exitCode = code
		cp.emit("resolve", result)
	})
	cp.then = (onfulfilled?: ((value: ExecResult) => void) | null, onrejected?: ((reason: Error) => void) | null): any => {
		if (cp.result.exitCode !== undefined) {
			if (cp.result.error) {
				onrejected?.(cp.result.error)
			} else {
				onfulfilled?.(cp.result)
			}
		} else {
			if (onfulfilled) cp.once("resolve", onfulfilled)
			if (onrejected) cp.once("reject", onrejected)
		}
		return cp
	}
	return cp
}

/** 表示一个子进程 */
export interface ChildProcess extends NativeChildProcess, PromiseLike<ExecResult> {
	/** 获取进程的执行结果 */
	result: ExecResult
}

/** 表示执行命令的结果 */
export interface ExecResult {
	/** 获取执行的错误 */
	error?: Error
	/** 获取命令的退出码 */
	exitCode?: number
	/** 获取命令的标准流输出 */
	stdout?: string
	/** 获取命令的错误流输出 */
	stderr?: string
}

/**
 * 在浏览器打开指定的地址
 * @param url 要打开的地址
 * @param wait 是否等待浏览器启动后再返回
 * @param app 使用的浏览器程序，默认由操作系统决定
 * @param appArgs 浏览器程序的附加启动参数
 */
export function open(url: string, wait = false, app?: string, appArgs?: readonly string[]) {
	let cmd: string
	const args: string[] = []
	let options: SpawnOptions | undefined
	if (process.platform === "win32") {
		cmd = "cmd"
		args.push("/c", "start", '""', "/b")
		url = url.replace(/&/g, "^&")
		if (wait) args.push("/wait")
		if (app) args.push(app)
		if (appArgs) args.push(...appArgs)
		args.push(url)
	} else if (process.platform === "darwin") {
		cmd = "open"
		if (wait) args.push("-W")
		if (app) args.push("-a", app)
		args.push(url)
		if (appArgs) args.push("--args", ...appArgs)
	} else {
		cmd = app || "xdg-open"
		if (appArgs) args.push(...appArgs)
		if (!wait) {
			options = {
				stdio: "ignore",
				detached: true
			}
		}
		args.push(url)
	}

	const cp = spawn(cmd, args, options!)
	if (wait) {
		return new Promise((resolve, reject) => {
			cp.on("error", reject)
			cp.on("close", code => {
				if (code > 0) {
					reject(new Error(`The 'open' command exited with code '${code}'`))
				} else {
					resolve(cp)
				}
			})
		})
	}
	cp.unref()
	return Promise.resolve(cp)
}

/** 所有退出函数 */
const handlers: Function[] = []

/**
 * 添加当前程序即将退出的回调函数
 * @param callback 要执行的回调函数，函数可以返回 `Promise` 表示正在执行异步任务，但在通过主动调用 `process.exit()` 退出进程时，`Promise` 会被忽略
 */
export function onExit(callback: (reason: "exit" | (ReturnType<typeof signals> extends IterableIterator<infer T> ? T : never), code: number) => void) {
	if (handlers.push(callback) > 1) {
		return
	}
	process.once("beforeExit", emitExit)
	for (const signal of signals()) {
		try {
			process.once(signal, signalHandler as any)
		} catch { }
	}
}

/**
 * 删除当前程序即将退出的回调函数
 * @param callback 要执行的回调函数
 */
export function offExit(callback: Parameters<typeof onExit>[0]) {
	const index = handlers.indexOf(callback)
	if (index < 0) {
		return
	}
	handlers.splice(index, 1)
	if (handlers.length) {
		return
	}
	process.off("beforeExit", emitExit)
	for (const signal of signals()) {
		try {
			process.off(signal, signalHandler as any)
		} catch { }
	}
}

/**
 * 触发退出事件
 * @param code 退出的状态码
 * @param signal 退出的信号名
 */
async function emitExit(code?: number, signal?: NodeJS.Signals) {
	if (handlers.length === 1) {
		const handler = handlers[0]
		handlers.length = 0
		await handler(signal || "exit", code)
	} else {
		const cloned = handlers.slice(0)
		handlers.length = 0
		for (const handler of cloned) {
			await handler(signal || "exit", code)
		}
	}
}

/** 当前进程被终止的回调 */
async function signalHandler(signal: NodeJS.Signals, code: number) {
	await emitExit(code, signal)
	if (process.listenerCount(signal) === 0) {
		process.kill(process.pid, signal)
	}
}

/**
 * 获取所有退出信号名
 * @see https://github.com/tapjs/signal-exit/blob/master/signals.js
 */
function* signals() {
	yield "SIGABRT"
	yield "SIGALRM"
	yield "SIGHUP"
	yield "SIGINT"
	yield "SIGTERM"
	if (process.platform !== "win32") {
		yield "SIGVTALRM"
		yield "SIGXCPU"
		yield "SIGXFSZ"
		yield "SIGUSR2"
		yield "SIGTRAP"
		yield "SIGSYS"
		yield "SIGQUIT"
		yield "SIGIOT"
	}
	if (process.platform === "linux") {
		yield "SIGIO"
		yield "SIGPOLL"
		yield "SIGPWR"
		yield "SIGSTKFLT"
		yield "SIGUNUSED"
	}
}