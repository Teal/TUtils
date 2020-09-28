import { dirname, resolve } from "path"
import { encodeHTML } from "./html"
import { quoteJSString } from "./js"
import { transformESModuleToCommonJS } from "./require"

/**
 * 编译指定的模板为函数
 * @param content 要编译的模板内容
 * @param async 是否返回异步函数
 * @param path 模块的路径，用于在模块内部导入其它模块
 * @param paramName 函数接收的参数名，在模板中可以直接使用此参数值
 * @param escape 编码模板中表达式计算结果的回调函数
 */
export function compileTPL(content: string, async?: boolean, path = "<stdin>", paramName = "$", escape = (s: any) => encodeHTML(String(s))): (data?: any) => string | Promise<string> {
	const code = compileTPLWorker(content)
	const dir = dirname(path)
	const Module = module.constructor as any as typeof import("module")
	// @ts-expect-error
	const require = Module.createRequire ? Module.createRequire(resolve(path)) : Module.createRequireFromPath(path)
	if (async) {
		const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
		return new AsyncFunction("require", "__dirname", "__filename", "__escape__", paramName, code).bind(null, require, dir, path, escape)
	}
	return new Function("require", "__dirname", "__filename", "__escape__", paramName, code).bind(null, require, dir, path, escape)
}

/**
 * 解析模板并返回生成的 JavaScript 代码
 * @param content 要解析的模板内容
 */
function compileTPLWorker(content: string) {
	let result = `var __result__="",__t__;`
	let index = 0
	for (; ; index++) {
		const braceStart = content.indexOf("{", index)
		if (braceStart < 0) {
			break
		}
		const hasAt = content.charCodeAt(braceStart - 1) === 0x40 /*@*/
		const prefixStart = index
		let prefixEnd = hasAt ? braceStart - 1 : braceStart
		let code: string | undefined
		const keywordStart = braceStart + 1
		if (content.charCodeAt(keywordStart) === 0x2F /*/*/) {
			index = findBrace(content, keywordStart + 1)
			switch (content.substring(keywordStart + 1, index).trim()) {
				case "if":
				case "switch":
				case "for":
				case "while":
				case "try":
					code = "}"
					break
				case "function":
					code = "return __result__}"
					break
				default:
					index = findBrace(content, keywordStart)
					break
			}
		} else {
			const keywordEnd = readKeyword(content, keywordStart)
			index = findBrace(content, keywordEnd)
			switch (content.substring(keywordStart, keywordEnd)) {
				case "void":
					code = `${content.substring(keywordEnd, index)};`
					break
				case "if":
				case "switch":
				case "for":
				case "while":
				case "try":
					code = `${content.substring(keywordStart, index)}{`
					break
				case "else":
				case "catch":
				case "finally":
					code = `}${content.substring(keywordStart, index)}{`
					break
				case "let":
				case "const":
				case "var":
				case "break":
				case "continue":
				case "return":
					code = `${content.substring(keywordStart, index)};`
					break
				case "case":
				case "default":
					code = `${content.substring(keywordStart, index)}:`
					break
				case "function":
					code = `${content.substring(keywordStart, index)}{var __result__="",__t__;`
					break
				case "import":
					code = `${transformESModuleToCommonJS(content.substring(keywordStart, index))};`
					break
			}
		}
		if (code) {
			let end = prefixEnd - 1
			while (isSpace(content.charCodeAt(end))) {
				end--
			}
			if (isLineBreak(content.charCodeAt(end))) {
				if (content.charCodeAt(end) === 10 /*\n*/ && content.charCodeAt(end - 1) === 13 /*\r*/) {
					end--
				}
				prefixEnd = end
			}
			let start = index + 1
			while (isSpace(content.charCodeAt(start))) {
				start++
			}
			if (isLineBreak(content.charCodeAt(start))) {
				index = start - 1
			}
		} else if (keywordStart < index) {
			code = `if((__t__=${content.substring(keywordStart, index)})!=null)__result__+=${hasAt ? "__t__" : "__escape__(__t__)"};`
		} else {
			code = ""
		}
		if (prefixStart < prefixEnd) {
			result += `__result__+=${quoteJSString(content.substring(prefixStart, prefixEnd))};`
		}
		result += code
	}
	if (index < content.length) {
		result += `__result__+=${quoteJSString(content.substring(index))};`
	}
	return result + `return __result__;`
}

/** 判断指定的字符是否是空格 */
function isSpace(char: number) {
	return char === 0x20 || char === 9 /*\t*/ || char === 0x00A0
}

/** 判断指定的字符是否是空格 */
function isLineBreak(char: number) {
	return char === 10 /*\n*/ || char === 13 /*\r*/ || char === 0x2028 || char === 0x2029 || isNaN(char)
}

/** 获取开头的关键字 */
function readKeyword(content: string, index: number) {
	for (; index < content.length; index++) {
		const char = content.charCodeAt(index)
		if (char <= 0x2F /*/*/ || char >= 0x3A /*:*/ && char <= 0x40 /*@*/ || char >= 0x5B /*[*/ && char <= 0x60 /*`*/ || char >= 0x7B /*{*/ && char <= 0x7F /*DEL*/) {
			break
		}
	}
	return index
}

/** 查找匹配的右大括号 */
function findBrace(content: string, index: number) {
	let braceCount = 1
	outer: for (; index < content.length; index++) {
		const char = content.charCodeAt(index)
		switch (char) {
			case 0x7D /*}*/:
				if (--braceCount < 1) {
					break outer
				}
				break
			case 0x7B /*{*/:
				braceCount++
				break
			case 0x2F /*/*/:
				switch (content.charCodeAt(index + 1)) {
					case 0x2A/***/:
						index = content.indexOf("*/", index + 2)
						if (index < 0) {
							return content.length
						}
						index++
						continue
					case 0x2F/*/*/:
						index++
						while (++index < content.length) {
							switch (content.charCodeAt(index)) {
								case 10/*\n*/:
								case 13/*\r*/:
								case 0x2028:
								case 0x2029:
									continue outer
							}
						}
						break outer
					default:
						const startIndex = index
						while (++index < content.length) {
							switch (content.charCodeAt(index)) {
								case char:
									continue outer
								case 10/*\n*/:
								case 13/*\r*/:
								case 0x2028:
								case 0x2029:
									index = startIndex + 1
									continue outer
								case 0x5C /*\*/:
									index++
									continue
							}
						}
						index = startIndex + 1
						continue
				}
			case 0x27 /*'*/:
			case 0x22 /*"*/:
				while (++index < content.length) {
					switch (content.charCodeAt(index)) {
						case char:
						case 10/*\n*/:
						case 13/*\r*/:
						case 0x2028:
						case 0x2029:
							continue outer
						case 0x5C /*\*/:
							index++
							continue
					}
				}
				break outer
			case 0x60 /*`*/:
				while (++index < content.length) {
					switch (content.charCodeAt(index)) {
						case char:
							continue outer
						case 0x5C /*\*/:
							index++
							continue
						case 0x24 /*$*/:
							if (content.charCodeAt(index + 1) === 0x7B /*{*/) {
								index = findBrace(content, index + 2)
							}
							continue
					}
				}
				break outer
		}
	}
	return index
}