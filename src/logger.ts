import { ANSIColor, bold, color, removeANSICodes, truncateString } from "./ansi"
import { clear, hideCursor, showCursor } from "./commandLine"
import { formatDate } from "./misc"
import { relativePath, resolvePath } from "./path"

/** 表示一个日志记录器 */
export class Logger {

	// #region 选项

	/**
	 * 初始化新的日志输出器
	 * @param options 附加选项
	 */
	constructor(options: LoggerOptions = {}) {
		// @ts-ignore
		this.logLevel = options.logLevel !== undefined ? typeof options.logLevel === "string" ? LogLevel[options.logLevel] : options.logLevel : LogLevel.log
		this.ignore = options.ignore instanceof RegExp ? log => (options.ignore as RegExp).test(typeof log === "string" ? log : log instanceof Error ? log.message : String(log)) : options.ignore
		this.colors = options.colors !== undefined ? options.colors : process.env["NODE_DISABLE_COLORS"] ? false : undefined
		this.emoji = process.platform !== "win32" || !/^\d\./.test(require("os").release())
		this.timestamp = options.timestamp !== false
		this.fullPath = !!options.fullPath
		this.baseDir = options.baseDir || process.cwd()
		this.codeFrame = options.codeFrame !== false
		this.progress = options.progress !== undefined ? options.progress : this.logLevel === LogLevel.silent ? false : options.colors !== undefined ? options.colors : process.stdout.isTTY === true && !process.env["NODE_DISABLE_COLORS"]
		this.persistent = options.persistent !== undefined ? options.persistent : !this.progress
		this.spinnerFrames = options.spinnerFrames || (this.emoji ? ["⠋ ", "⠙ ", "⠹ ", "⠸ ", "⠼ ", "⠴ ", "⠦ ", "⠧ ", "⠇ ", "⠏ "] : ["-", "\\", "|", "/"])
		this.spinnerInterval = options.spinnerInterval || 90
		this.hideCursor = options.hideCursor !== false
		this.errorOrWarningCounter = options.errorOrWarningCounter !== undefined ? options.errorOrWarningCounter : 1
		this.successIcon = options.successIcon !== undefined ? options.successIcon : this.emoji ? process.platform === "win32" ? `✔ ` : `√ ` : "[info]"
		this.warningIcon = options.warningIcon !== undefined ? options.warningIcon : this.emoji ? process.platform === "win32" ? `⚠ ` : `⚠️ ` : "[warning]"
		this.errorIcon = options.errorIcon !== undefined ? options.errorIcon : this.emoji ? process.platform === "win32" ? `✘ ` : `× ` : "[error]"
		this.fatalIcon = options.fatalIcon !== undefined ? options.fatalIcon : this.errorIcon
	}

	// #endregion

	// #region 日志

	/**
	 * 记录一条跟踪日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	trace(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.trace, persistent)
	}

	/**
	 * 记录一条调试日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	debug(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.debug, persistent)
	}

	/**
	 * 记录一条普通日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	log(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.log, persistent)
	}

	/**
	 * 记录一条信息日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	info(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.info, persistent)
	}

	/**
	 * 记录一条成功日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	success(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.success, persistent)
	}

	/**
	 * 记录一条警告日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	warning(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.warning, persistent)
	}

	/**
	 * 记录一条错误日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	error(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.error, persistent)
	}

	/**
	 * 记录一条致命错误日志
	 * @param log 要记录的日志或错误对象
	 * @param persistent 是否在清屏时保留此日志
	 */
	fatal(log: string | Error | LogEntry, persistent?: boolean) {
		return this.write(log, LogLevel.fatal, persistent)
	}

	/** 获取或设置允许打印的最低日志等级 */
	logLevel: LogLevel

	/**
	 * 判断是否忽略指定日志的回调函数
	 * @param log 要记录的日志或错误对象
	 * @param logLevel 日志等级
	 * @param persistent 是否在清屏时保留此日志
	 */
	ignore?: (log: string | Error | LogEntry, logLevel: LogLevel, persistent?: boolean) => boolean

	/**
	 * 底层实现打印一条日志
	 * @param log 要格式化的日志或错误对象或错误信息
	 * @param level 日志的等级
	 * @param persistent 是否在清屏时保留此日志
	 */
	write(log: string | Error | LogEntry, level: LogLevel, persistent?: boolean) {
		if (level < this.logLevel || this.ignore?.(log, level, persistent)) {
			return
		}
		const content = this.formatLog(log, level)
		if (persistent) {
			if (this._persistentLogs == undefined) {
				this._persistentLogs = content
			} else {
				this._persistentLogs += `\n${content}`
			}
		}
		return this.writeRaw(content, level)
	}

	/**
	 * 当被子类重写后负责自定义打印日志的方式
	 * @param content 要写入的内容
	 * @param level 日志的等级
	 */
	protected writeRaw(content: string, level: LogLevel) {
		switch (level) {
			case LogLevel.error:
			case LogLevel.fatal:
				return console.error(content)
			case LogLevel.warning:
				return console.warn(content)
			case LogLevel.info:
			case LogLevel.success:
				return console.info(content)
			case LogLevel.debug:
			case LogLevel.trace:
				return console.debug(content)
			default:
				// tslint:disable-next-line: no-console
				return console.log(content)
		}
	}

	/** 获取或设置当前错误或警告的编号 */
	errorOrWarningCounter: number | false

	/** 在成功日志前追加的前缀 */
	successIcon: string

	/** 在警告日志前追加的前缀 */
	warningIcon: string

	/** 在错误日志前追加的前缀 */
	errorIcon: string

	/** 在致命错误日志前追加的前缀 */
	fatalIcon: string

	/** 判断或设置是否打印带颜色 ANSI 控制符的日志 */
	colors?: boolean

	/** 判断或设置是否打印图形表情 */
	emoji: boolean

	/** 判断或设置是否打印时间戳 */
	timestamp: boolean

	/** 判断或设置是否打印代码片段 */
	codeFrame: boolean

	/**
	 * 格式化一条日志
	 * @param log 要格式化的日志或错误对象或错误信息
	 * @param level 日志的等级
	 * @param colors 是否追加颜色控制符
	 */
	formatLog(log: string | LogEntry, level = LogLevel.log, colors = this.colors !== undefined ? this.colors : (level < LogLevel.warning ? process.stdout : process.stderr).isTTY === true) {
		let result: string
		if (typeof log === "string") {
			result = log
		} else {
			result = ""
			// 添加路径
			if (log.fileName) {
				result += bold(this.formatPath(log.fileName))
				if (log.line != undefined) {
					let loc = `(${log.line + 1}`
					if (log.column != undefined) {
						loc += `,${log.column + 1}`
					}
					// 如果输出的内容带颜色，一般是用于供人阅读的，用户一般不在意结束位置，不打印这些信息可以简化输出
					if (!colors && log.endLine != undefined) {
						loc += `-${log.endLine + 1}`
						if (log.endColumn != undefined) {
							loc += `,${log.endColumn + 1}`
						}
					}
					loc += ")"
					result += color(loc, ANSIColor.brightBlack)
				}
				if (log.message != undefined || log.source) {
					result += color(": ", ANSIColor.brightBlack)
				}
			}
			// 添加来源
			if (log.source) {
				result += color(`[${log.source}]`, ANSIColor.brightCyan)
			}
			// 添加信息
			if (log.message != undefined) {
				result += log.message
			}
			// 添加详情
			if (log.detail) {
				result += `\n${color(log.detail, ANSIColor.brightBlack)}`
			}
			// 添加源代码片段
			if (this.codeFrame) {
				const codeFrame = log.codeFrame
				if (codeFrame) {
					result += `\n\n${color(codeFrame, ANSIColor.brightBlack)}\n`
				}
			}
			// 添加堆栈信息
			const stack = log.stack ? this.formatStack(log.stack) : undefined
			if (stack) {
				result += `\n\n${color(stack, ANSIColor.brightBlack)}\n`
			}
		}
		// 添加图标
		switch (level) {
			case LogLevel.error:
				result = `${color(this.errorOrWarningCounter ? `${this.errorOrWarningCounter++}) ${this.errorIcon}` : this.errorIcon, ANSIColor.brightRed)}${result}`
				break
			case LogLevel.warning:
				result = `${color(this.errorOrWarningCounter ? `${this.errorOrWarningCounter++}) ${this.warningIcon}` : this.warningIcon, ANSIColor.brightYellow)}${result}`
				break
			case LogLevel.success:
				result = `${color(this.successIcon, ANSIColor.brightGreen)}${result}`
				break
			case LogLevel.fatal:
				result = `${color(this.fatalIcon, ANSIColor.brightRed)}${result}`
				break
		}
		// 添加时间戳
		if (this.timestamp) {
			result = `${color(formatDate(new Date(), "[HH:mm:ss]"), ANSIColor.brightBlack)} ${result}`
		}
		// 去除颜色信息
		if (!colors) {
			result = removeANSICodes(result)
		}
		return result
	}

	/**
	 * 格式化指定的错误堆栈信息
	 * @param stack 要格式化的错误堆栈信息
	 */
	formatStack(stack: string) {
		if (this.logLevel <= LogLevel.debug) {
			return stack
		}
		return stack.split("\n").filter(line => line.startsWith("    at ") && !/\((?:(?:(?:node|(?:internal\/[\w/]*|.*?[\\/]node_modules[\\/](?:v8-compile-cache|babel-polyfill|pirates|ts-node)\/.*)?\w+)\.js:\d+:\d+)|native|\[worker eval\](?:-wrapper)?:\d+:\d+)\)$/.test(line)).join("\n")
	}

	/** 判断或设置是否打印完整绝对路径 */
	fullPath: boolean

	/** 获取或设置路径的基路径 */
	baseDir: string

	/**
	 * 格式化指定的路径
	 * @param path 要格式化的路径
	 */
	formatPath(path: string) {
		if (!this.fullPath) {
			// 为避免显示 ../，外部路径仍然显示绝对路径
			const relative = relativePath(this.baseDir, path)
			if (relative && !relative.startsWith("../")) {
				return relative
			}
		}
		return resolvePath(path)
	}

	/** 判断或设置是否禁止清除日志 */
	persistent: boolean

	/** 已保留的固定日志 */
	private _persistentLogs?: string

	/**
	 * 清除控制台中的所有日志
	 * @param all 是否清除所有日志
	 */
	clear(all?: boolean) {
		this.errorOrWarningCounter = 1
		if (all) {
			this._persistentLogs = undefined
		}
		if (this.persistent || this.logLevel === LogLevel.silent) {
			return
		}
		clear()
		if (this._persistentLogs) {
			console.info(this._persistentLogs)
		}
		if (this._updateTimer) {
			this._updateProgress()
		}
	}

	// #endregion

	// #region 进度

	/** 获取或设置当前的进度百分比（0 到 100 之间）*/
	progressPercent?: number

	/** 获取或设置当前的进度条文案 */
	progressText?: string

	/** 获取或设置进度指示器更新的间隔毫秒数 */
	spinnerInterval: number

	/** 判断是否需要隐藏光标 */
	hideCursor: boolean

	/** 原输出流写入函数 */
	private _originalStdoutWrite?: typeof process.stdout.write

	/** 原错误流写入函数 */
	private _originalStderrWrite?: typeof process.stderr.write

	/** 自动更新进度条的定时器 */
	private _updateTimer?: ReturnType<typeof setInterval>

	/**
	 * 显示或更新进度条
	 * @param value 要设置的进度条文案
	 */
	showProgress(value?: string) {
		this.progressText = value
		const updateProgressBar = this._updateProgress
		if (this._updateTimer) {
			updateProgressBar()
			return
		}
		if (this.hideCursor) hideCursor()
		// 劫持 process.stdout.write，如果发现有新内容输出则先删除进度条，避免只显示部分进度条
		const oldStdoutWrite: Function = this._originalStdoutWrite = process.stdout.write
		process.stdout.write = function () {
			oldStdoutWrite.call(this, "\x1b[0J")
			const result = oldStdoutWrite.apply(this, arguments)
			updateProgressBar()
			return result
		}
		const oldStderrWrite: Function = this._originalStderrWrite = process.stderr.write
		process.stderr.write = function () {
			oldStderrWrite.call(this, "\x1b[0J")
			const result = oldStderrWrite.apply(this, arguments)
			updateProgressBar()
			return result
		}
		this._updateTimer = setInterval(updateProgressBar, this.spinnerInterval)
	}

	/** 获取或设置进度指示器的所有桢 */
	spinnerFrames: string[]

	/** 存储进度指示器的当前桢号 */
	private _spinnerFrameIndex = -1

	/** 上一次更新进度条的时间戳 */
	private _lastUpdateTime = 0

	/** 更新进度条 */
	private _updateProgress = () => {
		// 更新进度条
		const now = Date.now()
		if (now - this._lastUpdateTime >= this.spinnerInterval) {
			this._lastUpdateTime = now
			if (++this._spinnerFrameIndex === this.spinnerFrames.length) {
				this._spinnerFrameIndex = 0
			}
		}
		// 计算文案
		// FIXME: 缓存文案？
		const spinner = this.spinnerFrames[this._spinnerFrameIndex]
		const progressPercent = this.progressPercent
		this._originalStdoutWrite!.call(process.stdout, `\x1b[0J\x1b[96m${spinner}\x1b[39m${progressPercent === undefined ? "" : progressPercent < 10 ? `\x1b[1m ${Math.floor(progressPercent)}%\x1b[22m ` : `\x1b[1m${Math.floor(progressPercent)}%\x1b[22m `}${truncateString(this.progressText || "", undefined, (process.stdout.columns || Infinity) - spinner.length - (progressPercent === undefined ? 0 : 4))}\x1b[1G`)
	}

	/** 隐藏进度条 */
	hideProgress() {
		// 如果进度条未显示则忽略
		if (!this._updateTimer) {
			return
		}
		clearInterval(this._updateTimer)
		// 还原劫持的 process.stdout.write
		process.stdout.write = this._originalStdoutWrite!
		process.stderr.write = this._originalStderrWrite!
		this._originalStderrWrite = this._originalStdoutWrite = this._updateTimer = undefined
		process.stdout.write("\x1b[0J")
		if (this.hideCursor) showCursor()
	}

	// #endregion

	// #region 任务

	/** 获取或设置是否打印进度条 */
	progress: boolean

	/** 最后一个任务 */
	private _lastTask?: {
		/** 上一条任务 */
		prev?: Logger["_lastTask"]
		/** 下一条任务 */
		next?: Logger["_lastTask"]
		/** 当前任务关联的日志 */
		content: string
	}

	/** 优先提示的任务 */
	private _persistentTasks?: Logger["_lastTask"][]

	/**
	 * 记录将开始执行指定的任务
	 * @param taskName 要执行的任务名
	 * @param detail 要执行的任务详情
	 * @param persistent 在任务未完成前是否持续提示此任务
	 * @returns 返回任务编号
	 */
	begin(taskName: string, detail?: string, persistent?: boolean) {
		const content = `${color(taskName, ANSIColor.brightCyan)}${detail ? " " + detail : ""}`
		const taskId: Logger["_lastTask"] = { content }
		if (this.logLevel === LogLevel.trace) {
			this.trace(`${color(`+`, ANSIColor.brightMagenta)} ${content}`)
		}
		if (this.progress) {
			if (!this._persistentTasks || !this._persistentTasks.length) {
				this.showProgress(content)
			}
			if (persistent) {
				if (this._persistentTasks) {
					this._persistentTasks.push(taskId)
				} else {
					this._persistentTasks = [taskId]
				}
			}
		}
		if (this._lastTask) {
			this._lastTask.next = taskId
			taskId.prev = this._lastTask
		}
		return this._lastTask = taskId
	}

	/**
	 * 记录指定的任务已结束
	 * @param taskId 要结束的任务编号
	 */
	end(taskId: ReturnType<Logger["begin"]>) {
		if (this.logLevel === LogLevel.trace) {
			this.trace(`${color(`-`, ANSIColor.brightBlue)} ${taskId.content}`)
		}
		if (this._persistentTasks?.length) {
			const index = this._persistentTasks.indexOf(taskId)
			if (index >= 0) {
				this._persistentTasks.splice(index, 1)
				if (index === 0 && this._persistentTasks.length) {
					this.progressText = this._persistentTasks[0]!.content
				}
			}
		}
		const prev = taskId.prev
		const next = taskId.next
		if (prev) {
			prev.next = next
		}
		if (next) {
			next.prev = prev
		} else {
			this._lastTask = prev
			if (prev) {
				if (this.progress && (!this._persistentTasks || !this._persistentTasks.length)) {
					this.progressText = prev.content
				}
			} else {
				this.hideProgress()
				this.progressText = undefined
			}
		}
		// 防止用户重复关闭任务
		taskId.next = taskId.prev = taskId
	}

	/**
	 * 重置日志记录器
	 */
	reset() {
		this.hideProgress()
		this.errorOrWarningCounter = 1
		this.progressPercent = this.progressText = this._lastTask = undefined
	}

	// #endregion

}

/** 表示日志记录器的选项 */
export interface LoggerOptions {
	/**
	 * 允许打印的最低日志等级
	 * @default "log"
	 */
	logLevel?: LogLevel | keyof typeof LogLevel
	/**
	 * 判断是否忽略指定日志的正则表达式或回调函数
	 * @param log 要记录的日志或错误对象
	 * @param logLevel 日志等级
	 * @param persistent 是否在清屏时保留此日志
	 */
	ignore?: RegExp | ((log: string | Error | LogEntry, logLevel: LogLevel, persistent?: boolean) => boolean)
	/**
	 * 是否打印带颜色控制符的日志
	 * @default process.stdout.isTTY && !process.env["NODE_DISABLE_COLORS"]
	 */
	colors?: boolean
	/**
	 * 是否打印图形表情
	 * @default process.platform !== "win32" || !/^\d\./.test(require("os").release())
	 */
	emoji?: boolean
	/**
	 * 是否打印时间戳
	 * @default true
	 */
	timestamp?: boolean
	/**
	 * 是否打印完整绝对路径
	 * @default false
	 */
	fullPath?: boolean
	/**
	 * 打印相对路径时使用的基路径
	 * @default process.cwd()
	 */
	baseDir?: string
	/**
	 * 是否打印代码片段
	 * @default true
	 */
	codeFrame?: boolean
	/**
	 * 是否禁止清屏
	 * @default !this.colors
	 */
	persistent?: boolean
	/**
	 * 是否打印进度条
	 * @default this.colors
	 */
	progress?: boolean
	/**
	 * 进度指示器的所有桢
	 * @default this.emoji ? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] : ["-", "\\", "|", "/"]
	 */
	spinnerFrames?: string[]
	/**
	 * 进度指示器自动切换桢的毫秒数
	 * @default 90
	 */
	spinnerInterval?: number
	/**
	 * 是否需要隐藏控制台光标
	 * @default true
	 */
	hideCursor?: boolean
	/**
	 * 在错误或警告前追加的起始编号，设为 `false` 则不追加编号
	 */
	errorOrWarningCounter?: number | false
	/**
	 * 在成功日志前追加的前缀
	 * @default this.emoji ? process.platform === "win32" ? "✔ " : "√ " : "[info]"
	 */
	successIcon?: string
	/**
	 * 在警告日志前追加的前缀
	 * @default this.emoji ? process.platform === "win32" ? "⚠ " : "⚠️ " : "[warning]"
	 */
	warningIcon?: string
	/**
	 * 在错误日志前追加的前缀
	 * @default this.emoji ? process.platform === "win32" ? "✘ " : "× " : "[error]"
	 */
	errorIcon?: string
	/**
	 * 在致命错误日志前追加的前缀
	 * @default options.fatalIcon !== undefined ? options.fatalIcon : this.errorIcon
	 */
	fatalIcon?: string
}

/** 表示日志的等级 */
export const enum LogLevel {
	/** 跟踪信息 */
	trace,
	/** 调试信息 */
	debug,
	/** 普通日志 */
	log,
	/** 重要信息 */
	info,
	/** 成功信息 */
	success,
	/** 警告 */
	warning,
	/** 错误 */
	error,
	/** 致命错误 */
	fatal,
	/** 无日志 */
	silent
}

/** 表示一条日志项 */
export interface LogEntry {
	[key: string]: any
	/** 日志的来源 */
	source?: string
	/** 日志的信息 */
	message?: string
	/** 日志相关的文件名 */
	fileName?: string
	/** 日志相关的行号（从 0 开始）*/
	line?: number
	/** 日志相关的列号（从 0 开始）*/
	column?: number
	/** 日志相关的结束行号（从 0 开始）*/
	endLine?: number
	/** 日志相关的结束列号（从 0 开始）*/
	endColumn?: number
	/** 日志的详情 */
	detail?: string
	/** 日志相关的源代码片段 */
	codeFrame?: string
	/** 错误堆栈信息 */
	stack?: string
}