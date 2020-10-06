import { wrapString, getStringWidth } from "./ansi"
import { offExit, onExit } from "./process"

/** 显示命令行的光标 */
export function showCursor() {
	const stdout = process.stdout
	if (stdout.isTTY) {
		offExit(showCursor)
		stdout.write("\x1b[?25h")
	}
}

/** 隐藏命令行的光标 */
export function hideCursor() {
	const stdout = process.stdout
	if (stdout.isTTY) {
		onExit(showCursor)
		stdout.write("\x1b[?25l")
	}
}

/** 清空命令行（含缓冲区）*/
export function clear() {
	const stdout = process.stdout
	if (stdout.isTTY) {
		stdout.write(process.platform === "win32" ? "\x1b[2J\x1b[0f\x1bc" : "\x1b[2J\x1b[3J\x1b[H")
	}
}

/**
 * 解析命令行参数
 * @param commandLineOptions 所有内置的命令行选项
 * @param onError 解析出错后的回调函数
 * @param argv 要解析的命令行参数列表
 * @param startIndex 开始解析的索引
 * @returns 返回一个对象，对象的键是参数名或索引，对象的值是对应的参数值（如果没有参数值则为 `true`）
 * @example
 * ```
 * // 假设启动程序的命令行是：`node a --x b --y c`
 * parseCommandLineArguments({
 * 		"--x": {
 * 			argument: "argument"
 * 		}
 * })
 * // {"0": "a", "1": "c", "x": "b", "y": true}
 * ```
 */
export function parseCommandLineArguments(commandLineOptions?: { [option: string]: CommandLineOption }, onError?: (message: string) => void, argv = process.argv, startIndex = 2) {
	const result: { [option: string]: string | string[] | true | typeof result } = { __proto__: null! }
	let index = 0
	for (; startIndex < argv.length; startIndex++) {
		let argument = argv[startIndex]
		if (argument.charCodeAt(0) === 45 /*-*/) {
			// -- 后的参数直接解析成键值对
			if (argument === "--") {
				result["--"] = parseCommandLineArguments(undefined, onError, argv, startIndex + 1)
				break
			}
			let value: string | undefined
			// 将 --x=a 转为 --x a
			const equalIndex = argument.search(/[=:]/)
			if (equalIndex >= 0) {
				value = argument.substring(equalIndex + 1)
				argument = argument.substring(0, equalIndex)
			}
			// 查找关联的选项配置
			let key = argument
			let commandLineOption: CommandLineOption | undefined
			if (commandLineOptions) {
				commandLineOption = commandLineOptions[argument]
				if (!commandLineOption) {
					for (const currentKey in commandLineOptions) {
						const current = commandLineOptions[currentKey]
						if (current.alias) {
							if (Array.isArray(current.alias)) {
								if (current.alias.indexOf(argument) >= 0) {
									key = currentKey
									commandLineOption = current
									break
								}
							} else if (current.alias === argument) {
								key = currentKey
								commandLineOption = current
								break
							}
						}
					}
				}
			}
			// 读取选项值
			const oldValue = result[key]
			if (commandLineOption) {
				if (commandLineOption.argument) {
					if (value === undefined) {
						if (startIndex + 1 < argv.length && argv[startIndex + 1].charCodeAt(0) !== 45 /*-*/) {
							value = argv[++startIndex]
						} else if (commandLineOption.default !== undefined) {
							value = commandLineOption.default
						} else {
							onError?.(`Option '${argument}' requires an argument`)
							continue
						}
					}
					if (commandLineOption.multiple) {
						if (oldValue) {
							(oldValue as string[]).push(value!)
						} else {
							result[key] = [value!]
						}
					} else {
						if (oldValue !== undefined) {
							onError?.(`Duplicate option '${argument}'`)
						}
						result[key] = value!
					}
				} else if (oldValue && !commandLineOption.multiple) {
					onError?.(`Duplicate option '${argument}'`)
				} else {
					if (value !== undefined) {
						onError?.(`Option '${argument}' has no argument, got '${value}'`)
					}
					result[key] = true
				}
			} else {
				if (value === undefined && startIndex + 1 < argv.length && argv[startIndex + 1].charCodeAt(0) !== 45 /*-*/) {
					value = argv[++startIndex]
				}
				if (value !== undefined) {
					if (Array.isArray(oldValue)) {
						oldValue.push(value)
					} else if (typeof oldValue === "string") {
						result[key] = [oldValue, value]
					} else {
						result[key] = value
					}
				} else if (oldValue === undefined) {
					result[key] = true
				}
			}
		} else {
			result[index++] = argument
		}
	}
	return result
}

/**
 * 格式化所有选项
 * @param commandLineOptions 所有内置的命令行选项
 * @param maxWidth 允许布局的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 */
export function formatCommandLineOptions(commandLineOptions: { [option: string]: CommandLineOption }, maxWidth = process.stdout.columns || Infinity) {
	// 计算所有的标题
	const keys = new Map<string, CommandLineOption>()
	let width = 0
	for (const key in commandLineOptions) {
		const commandOption = commandLineOptions[key]
		if (!commandOption.description) {
			continue
		}
		let title = key
		if (commandOption.alias) {
			title = `${Array.isArray(commandOption.alias) ? commandOption.alias.join(", ") : commandOption.alias}, ${title}`
		}
		if (commandOption.argument) {
			title += commandOption.default === undefined ? ` <${commandOption.argument}>` : ` [${commandOption.argument}]`
		}
		width = Math.max(width, getStringWidth(title))
		keys.set(title, commandOption)
	}
	// 加上左右各两个空格
	width += 4
	// 生成最终结果
	let result = ""
	for (const [title, commandOption] of keys.entries()) {
		if (result) {
			result += "\n"
		}
		if (commandOption.group) {
			result += `\n${commandOption.group}:\n`
		}
		result += `  ${title.padEnd(width - 2)}${wrapString(commandOption.description! + (commandOption.default ? ` [default: ${commandOption.default}]` : ""), 2, maxWidth - width).join(`\n${" ".repeat(width)}`)}`
	}
	return result
}

/** 表示一个命令行选项 */
export interface CommandLineOption {
	/** 当前选项所属的分组，主要用于格式化时显示 */
	group?: string
	/** 当前选项的别名 */
	alias?: string | string[]
	/** 当前选项的描述，主要用于格式化时显示 */
	description?: string
	/** 当前选项的参数名，如果未设置说明没有参数 */
	argument?: string
	/** 当前选项的默认值，如果未设置则表示当前选项是必填的 */
	default?: string | null
	/** 是否允许重复使用当前选项 */
	multiple?: boolean
}

/**
 * 读取命令行的输入
 * @param message 提示的信息
 * @example await commandLine.input("请输入名字：")
 */
export async function input(message = "") {
	return new Promise<string>(resolve => {
		const result = (require("readline") as typeof import("readline")).createInterface({
			input: process.stdin,
			output: process.stdout
		})
		result.question(message, answer => {
			result.close()
			resolve(answer)
		})
	})
}

/**
 * 让用户选择一项
 * @param choices 要展示的选择项
 * @param message 提示的信息
 * @param defaultValue 默认值
 * @example await commandLine.select(["打开", "关闭"], "请选择一个：")
 */
export async function select(choices: string[], message = "", defaultValue?: string) {
	message = `\n${choices.map((choice, index) => `[${index + 1}] ${choice}`).join("\n")} \n\n${message || ""} `
	while (true) {
		const line = await input(message)
		if (line) {
			const index = +line - 1
			if (index >= 0 && index < choices.length) {
				return choices[index]
			}
			return line
		}
		if (defaultValue !== undefined) {
			return defaultValue
		}
	}
}