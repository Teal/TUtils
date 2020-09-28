import Module = require("module")
import { dirname, resolve } from "path"
import { Context, runInNewContext, RunningScriptOptions } from "vm"

/**
 * 在沙盒中执行指定的 JavaScript 代码
 * @param code 要执行的代码
 * @param context 传入的全局变量，键为变量名，值为变量值
 * @param options 附加选项
 * @returns 返回代码的执行结果
 * @description 注意本函数不提供安全隔离，不能用于执行不信任的代码
 */
export function runInVM(code: string, context?: Context, options?: RunningScriptOptions | string) {
	const path = typeof options === "string" ? options : options?.filename ?? "<vm>"
	let require: typeof module.require | undefined
	context = {
		__proto__: global,
		get global() { return context },
		// @ts-ignore
		get require() { return require || (require = Module.createRequire ? Module.createRequire(resolve(path)) : Module.createRequireFromPath(path)) },
		get __filename() { return path },
		get __dirname() { return dirname(path) },
		...context
	}
	return runInNewContext(code, context, options)
}