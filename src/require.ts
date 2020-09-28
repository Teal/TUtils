import { delimiter } from "path"

/**
 * 注册 ES6 模块加载器（使 .js 文件支持使用 `import`/`export` 语法）
 * @param extension 支持的模块扩展名
 * @returns 返回原加载器
 */
export function registerESMLoader(extension = ".js") {
	const originalLoader = require.extensions[extension]
	const loader = require.extensions[extension] = function (module: any, filename: string) {
		const compile = module._compile
		module._compile = function (code: string, fileName: string) {
			return compile.call(this, transformESModuleToCommonJS(code), fileName)
		}
		return originalLoader.call(this, module, filename)
	}
	// @ts-ignore
	loader._originalLoader = originalLoader
}

/**
 * 取消注册 ES6 模块加载器
 * @param extension 支持的模块扩展名
 */
export function unregisterESMLoader(extension = ".js") {
	const loader = require.extensions[extension] as any
	if (loader._originalLoader) {
		require.extensions[extension] = loader._originalLoader
	}
}

/**
 * 快速转换 ES6 模块代码到 CommonJS 模块
 * @param code 要转换的 ES6 模块代码
 * @description 出于性能考虑，本函数有以下功能限制：
 * - 不支持同时导出多个变量（`export let a, b`/`export let [a, b]`），需逐个导出
 * - 模板字符串或正则表达式内出现 `import/export` 语句可能会出错，可写成如 `i\mport`
 * - 导出赋值操作会在最后执行，如果有循环依赖可能无法获取导出项
 */
export function transformESModuleToCommonJS(code: string) {
	let exportCode = ""
	code = code.replace(/'(?:[^\\'\n\r\u2028\u2029]|\\.)*'|"(?:[^\\"\n\r\u2028\u2029]|\\.)*"|\/\/[^\n\r\u2028\u2029]*|\/\*.*?(?:\*\/|$)|\/(?:[^\\/\n\r\u2028\u2029]|\\.)+\/|`(?:[^\\`$]|\\.|\$\{(?:[^{]|\{[^}]*\})*?\}|\$(?!\{))*`|\b(export\s+(?:(default\s+)?((?:const\s|let\s|var\s|(?:async\s+)?function\b(?:\s*\*)?|class\s)\s*)([a-zA-Z0-9_$\xAA-\uDDEF]+)|default\b)|(?:import\s*(?:\*\s*as\s*([a-zA-Z0-9_$\xAA-\uDDEF]+)|(\{.*?\})|\s([a-zA-Z0-9_$\xAA-\uDDEF]+)\s*(?:,\s*(\{.*?\}))?)\s*from|import\s*|export\s*(\*)\s*from|export\s*(\{.*?\})\s*from)\s*('(?:[^\\'\n\r\u2028\u2029]|\\.)*'|"(?:[^\\"\n\r\u2028\u2029]|\\.)*"))/sg, (source, importExport?: string, exportDefault?: string, exportPrefix?: string, exportName?: string, importAll?: string, importNames?: string, importDefault?: string, importNames2?: string, exportAll?: string, exportNames?: string, fromModule?: string) => {
		if (importExport) {
			if (fromModule) {
				if (importAll) {
					return `const ${importAll} = require(${fromModule});`
				}
				if (importNames) {
					return `const ${importNames.replace(/([a-zA-Z0-9_$\xAA-\uDDEF]\s*)\bas\b/g, "$1:")} = require(${fromModule});`
				}
				if (importDefault) {
					return `const __${importDefault} = require(${fromModule}), ${importDefault} = __${importDefault}.__esModule ? __${importDefault}.default : __${importDefault}${importNames2 ? `, ${importNames2.replace(/([a-zA-Z0-9_$\xAA-\uDDEF]\s*)\bas\b/g, "$1:")} = __${importDefault}` : ""};`
				}
				if (exportAll) {
					return `Object.assign(module.exports, require(${fromModule}));`
				}
				if (exportNames) {
					exportNames = exportNames.replace(/([a-zA-Z0-9_$\xAA-\uDDEF]\s*)\bas\b/g, "$1:")
					return `const ${exportNames} = require(${fromModule}); Object.assign(module.exports, ${exportNames});`
				}
				return `require(${fromModule});`
			}
			if (exportDefault || !exportName) {
				exportCode += `\nObject.defineProperty(module.exports, "__esModule", { value: true });`
			}
			if (exportName) {
				exportCode += `\nmodule.exports.${exportDefault ? "default" : exportName} = ${exportName};`
				return `${exportPrefix}${exportName}`
			}
			return `module.exports.default =`
		}
		return source
	})
	return code + exportCode
}

/**
 * 将指定的目录添加到全局请求路径
 * @param dir 要添加的绝对路径
 */
export function addGlobalPath(dir: string) {
	// HACK 使用内部 API 添加
	const Module = require("module")
	if (!Module.globalPaths.includes(dir)) {
		process.env.NODE_PATH = process.env.NODE_PATH ? `${process.env.NODE_PATH}${delimiter}${dir}` : dir
		Module._initPaths()
	}
}