import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from "path"
import { FileSystem } from "./fileSystem"
import { escapeRegExp } from "./misc"
import { relativePath, setName } from "./path"

/** 表示一个模块路径解析器 */
export class Resolver {

	// #region 选项

	/**
	 * 初始化新的解析器
	 * @param options 附加选项
	 * @param fs 使用的文件系统
	 */
	constructor(options: ResolverOptions = {}, fs = new FileSystem()) {
		this.fs = fs
		const browser = options.type === "browser"
		if (options.cache === false) {
			this._fsCache = this._descriptionFileCache = this._resolveCache = {
				get() { },
				set() { },
				delete() { },
				clear() { },
			} as any
		} else {
			this._cacheWithContainingDir = typeof options.cache !== "string"
			this._resolveCache = new Map()
			this._descriptionFileCache = new Map()
			this._fsCache = new Map()
		}
		this.ignoreCase = options.enforceCaseSensitive === false ? fs.isCaseInsensitive : false
		this.alias = []
		for (const key in options.alias) {
			const value = options.alias[key]
			this.alias.push({
				match: /[\*\?]/.test(key) ?
					new RegExp(`^${escapeRegExp(key).replace(/\\\*/g, "(.*)").replace(/\\\?/g, "(.)")}$`) :
					key.endsWith("$") ?
						new RegExp(`^${escapeRegExp(key.slice(0, -1))}$`) :
						new RegExp(`^${escapeRegExp(key)}(?=/|$)`),
				replacements: Array.isArray(value) ? value : [value]
			})
		}
		this.modules = options.modules ? options.modules.map(module => /[\\\/]/.test(module) ? {
			absolute: true,
			path: resolve(module)
		} : { absolute: false, path: module }) : browser ? [{
			absolute: false,
			path: "node_modules"
		}] : [{
			absolute: false,
			path: "node_modules"
		}, ...require("module").globalPaths.map((path: string) => ({ absolute: true, path: path }))]
		this.descriptionFiles = options.descriptionFiles || ["package.json"]
		this.aliasFields = options.aliasFields || (browser ? ["browser"] : [])
		this.mainFields = options.mainFields || (browser ? ["module", "jsnext:main", "browser", "main"] : ["main"])
		this.mainFiles = options.mainFiles || (browser ? ["index", ""] : ["index"])
		this.extensions = options.extensions || (browser ? ["", ".wasm", ".tsx", ".ts", ".jsx", ".mjs", ".js", ".json"] : ["", ...Object.keys(require.extensions)])
	}

	// #endregion

	// #region 解析

	/** 解析结果的缓存，键为要解析的模块名和所在文件夹 */
	private _resolveCache!: Map<string, string | null | false | Promise<string | null | false>>

	/** 缓存的键是否包含所在的文件夹 */
	private _cacheWithContainingDir?: boolean

	/**
	 * 解析指定的模块名对应的绝对路径，如果找不到模块则返回空，如果模块被忽略则返回 `false`
	 * @param moduleName 要解析的模块名，不允许是空字符串
	 * @param containingDir 所在文件夹的绝对路径
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 */
	async resolve(moduleName: string, containingDir: string, trace?: string[]) {
		const cacheKey = this._cacheWithContainingDir ? `${moduleName}|${containingDir}` : moduleName
		// 启用 trace 后禁止缓存，否则无法获取 trace 的数据
		const cache = !trace && this._resolveCache.get(cacheKey)
		if (cache) {
			if (cache instanceof Promise) {
				return await cache
			}
			return cache
		}
		const promise = this.resolveNoCache(moduleName, containingDir, trace)
		this._resolveCache.set(cacheKey, promise)
		const result = await promise
		this._resolveCache.set(cacheKey, result)
		return result
	}

	/** 获取所有模块的别名 */
	readonly alias: ({
		/** 匹配的正则表达式 */
		match: RegExp,
		/** 匹配后用于替换的内容，如果是 `false` 表示忽略该模块 */
		replacements: (string | ((input: string, ...parts: any[]) => string) | false)[]
	})[]

	/** 获取要搜索的文件夹路径 */
	readonly modules: {
		/** 当前文件夹路径是否是绝对路径 */
		absolute: boolean
		/** 当前文件夹路径 */
		path: string
	}[]

	/** 获取所有包描述文件中包含模块别名信息的字段名 */
	readonly aliasFields: string[]

	/**
	 * 忽略缓存解析指定的模块名对应的绝对路径，如果找不到模块则返回空，如果模块被忽略则返回 `false`
	 * @param moduleName 要解析的模块名，不允许是空字符串
	 * @param containingDir 所在文件夹的绝对路径
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 * @param ignoreAliasField 是否忽略别名字段
	 * @param ignoreAlias 是否忽略别名
	 */
	protected async resolveNoCache(moduleName: string, containingDir: string, trace?: string[], ignoreAliasField?: boolean, ignoreAlias?: boolean): Promise<string | null | false> {
		// 解析相对路径
		if (moduleName.charCodeAt(0) === 46 /*.*/ && (moduleName.charCodeAt(1) === 47 /*/*/ || moduleName.charCodeAt(1) === 46 /*.*/ && (moduleName.charCodeAt(2) === 47 /*/*/ || moduleName.length === 2) || moduleName.length === 1)) {
			return await this.resolveFileOrDir(moduleName, containingDir, trace, ignoreAliasField)
		}
		// 解析别名
		if (!ignoreAlias) {
			for (const alias of this.alias) {
				if (!alias.match.test(moduleName)) {
					continue
				}
				for (const replacement of alias.replacements) {
					if (replacement === false) {
						trace?.push(`Apply alias ${alias.match} -> Got false`)
						return false
					}
					const replaced = moduleName.replace(alias.match, replacement as any)
					trace?.push(`Apply alias ${alias.match} -> '${replaced}'`)
					const result = await this.resolveNoCache(replaced, containingDir, trace, ignoreAliasField, true)
					if (result !== null) {
						return result
					}
				}
			}
		}
		// 解析别名字段
		if (!ignoreAliasField && this.aliasFields.length) {
			const descriptionFile = await this.lookupDescriptionFile(containingDir, trace)
			if (descriptionFile) {
				if (descriptionFile.aliasField === undefined) {
					trace?.push(`Test field '${this.aliasFields.join("/")}' in '${descriptionFile.path}' -> Not found`)
				} else if (typeof descriptionFile.alias !== "object" || descriptionFile.alias === null) {
					trace?.push(`Test field '${descriptionFile.aliasField}' in '${descriptionFile.path}' -> Skipped, not an object`)
				} else {
					const aliasName = descriptionFile.alias[moduleName]
					if (typeof aliasName === "string") {
						trace?.push(`Apply alias field '${descriptionFile.aliasField}["${moduleName}"]' in '${descriptionFile.path}' -> '${aliasName}'`)
						const result = await this.resolveNoCache(aliasName, dirname(descriptionFile.path), trace, true, ignoreAlias)
						if (result !== null) {
							return result
						}
					} else if (aliasName === false) {
						trace?.push(`Test field '${descriptionFile.aliasField}["${moduleName}"]' in '${descriptionFile.path}' -> Got false`)
						return false
					} else {
						trace?.push(aliasName === undefined ? `Test field '${descriptionFile.aliasField}["${moduleName}"]' in '${descriptionFile.path}' -> Not found` : `Test field '${descriptionFile.aliasField}["${moduleName}"]' in '${descriptionFile.path}' -> Skipped, not a string or false`)
					}
				}
			}
		}
		// 解析绝对路径
		if (isAbsolute(moduleName)) {
			return await this.resolveFileOrDir(moduleName, "", trace, ignoreAliasField)
		}
		// 遍历 node_modules
		for (const moduleDirectory of this.modules) {
			if (moduleDirectory.absolute) {
				const result = await this.resolveFileOrDir(moduleName, moduleDirectory.path, trace, ignoreAliasField)
				if (result !== null) {
					return result
				}
			} else {
				let currentDir = containingDir
				while (true) {
					// 跳过 node_modules 本身
					if (basename(currentDir) !== moduleDirectory.path) {
						const result = await this.resolveFileOrDir(moduleName, join(currentDir, moduleDirectory.path), trace, ignoreAliasField)
						if (result !== null) {
							return result
						}
					}
					const parent = dirname(currentDir)
					if (parent.length === currentDir.length) {
						break
					}
					currentDir = parent
				}
			}
		}
		return null
	}

	/** 获取所有包描述文件中包含入口模块的字段名 */
	readonly mainFields: string[]

	/** 获取所有默认的入口模块名 */
	readonly mainFiles: string[]

	/** 获取所有解析模块名时尝试自动追加的扩展名 */
	readonly extensions: string[]

	/**
	 * 解析一个文件或文件夹路径，如果找不到模块则返回空，如果模块被忽略则返回 `false`
	 * @param moduleName 要解析的模块名，不允许是空字符串
	 * @param containingDir 所在文件夹的绝对路径
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 * @param ignoreAliasField 如果路径已成功解析为文件，是否忽略别名字段
	 * @param ignoreMainFields 如果路径是文件夹，是否忽略入口模块字段
	 * @param noExtension 如果为 `true`，则解析文件路径时允许不追加扩展名，如果为 `false`，则强制解析文件路径时追加扩展名
	 */
	protected async resolveFileOrDir(moduleName: string, containingDir: string, trace?: string[], ignoreAliasField?: boolean, ignoreMainFields?: boolean, noExtension?: boolean): Promise<string | null | false> {
		// 读取所在文件夹
		const path = join(containingDir, moduleName)
		const dir = dirname(path)
		let entries: Set<string> & { realPath?: string } | false | null
		try {
			entries = await this.readDir(dir)
		} catch (e) {
			trace?.push(`Test '${dir}' -> ${e.message}`)
			return null
		}
		// 文件夹不存在(false)或是一个文件(null)
		if (!entries) {
			trace?.push(entries === null ? `Test '${dir}' -> Not found` : `Test '${dir}' -> Skipped, not a directory`)
			return null
		}
		// 路径存在但大小写错误
		const name = basename(path)
		if (entries.realPath) {
			// 如果大小写错误属于 containingDir，忽略问题
			// 如果大小写错误属于 moduleName，向用户报告错误
			let base = containingDir
			let actualName = normalize(moduleName)
			let prefix = ""
			while (actualName.startsWith(".." + sep)) {
				base = dirname(base)
				prefix += moduleName.substring(0, 3)
				actualName = actualName.substring(3)
			}
			if (!base.endsWith(sep)) base += sep
			const realName = join(entries.realPath.substring(base.length), name)
			if (realName !== actualName) {
				trace?.push(`Case mismatched: '${moduleName}' should be '${(prefix || (moduleName.startsWith("./") ? "./" : "")) + (sep === "\\" ? realName.replace(/\\/g, "/") : realName)}'`)
				return null
			}
		}
		// 测试文件
		if (!path.endsWith(sep)) {
			for (const extension of noExtension && this.extensions[0] !== "" ? ["", ...this.extensions.filter(extension => extension)] : this.extensions) {
				if (noExtension === false && !extension) {
					continue
				}
				if (!entries.has(this.ignoreCase ? (name + extension).toLowerCase() : name + extension)) {
					if (trace) {
						const matched = !this.ignoreCase && findIgnoreCase(entries, name + extension)
						if (matched) {
							trace.push(`Case mismatched: '${moduleName}' should be '${setName(moduleName, matched.endsWith(extension) ? matched.substring(0, matched.length - extension.length) : matched)}'`)
						} else {
							trace.push(`Test '${path + extension}' -> Not found`)
						}
					}
					continue
				}
				const fullPath = path + extension
				let existsFile: boolean | null
				try {
					existsFile = await this.existsFile(fullPath)
				} catch (e) {
					trace?.push(`Test '${fullPath}' -> ${e.message}`)
					continue
				}
				if (existsFile) {
					trace?.push(`Test '${fullPath}' -> Succeed`)
					// 应用所在包的别名
					if (this.aliasFields.length && !ignoreAliasField) {
						const descriptionFile = await this.lookupDescriptionFile(dir, trace)
						if (descriptionFile) {
							if (descriptionFile.aliasField === undefined) {
								trace?.push(`Test field '${this.aliasFields.join("/")}' in '${descriptionFile.path}' -> Not found`)
							} else if (typeof descriptionFile.alias !== "object" || descriptionFile.alias === null) {
								trace?.push(`Test field '${descriptionFile.aliasField}' in '${descriptionFile.path}' -> Skipped, not an object`)
							} else {
								const name = "./" + relativePath(dirname(descriptionFile.path), fullPath)
								const aliasName = descriptionFile.alias[name]
								if (typeof aliasName === "string") {
									trace?.push(`Apply alias field '${descriptionFile.aliasField}["${name}"]' in '${descriptionFile.path}' -> '${aliasName}'`)
									const result = await this.resolveNoCache(aliasName, dirname(descriptionFile.path), trace, true, undefined)
									if (result !== null) {
										return result
									}
								} else if (aliasName === false) {
									trace?.push(`Test field '${descriptionFile.aliasField}["${name}"]' in '${descriptionFile.path}' -> Got false`)
									return false
								} else {
									trace?.push(aliasName === undefined ? `Test field '${descriptionFile.aliasField}["${name}"]' in '${descriptionFile.path}' -> Not found` : `Test field '${descriptionFile.aliasField}["${name}"]' in '${descriptionFile.path}' -> Skipped, not a string or false`)
								}
							}
						}
					}
					return fullPath
				}
				trace?.push(existsFile === null ? `Test '${fullPath}' -> Not found` : `Test '${fullPath}' -> Skipped, not a file`)
			}
		}
		// 测试文件夹
		if (noExtension !== false) {
			if (entries.has(this.ignoreCase ? name.toLowerCase() : name)) {
				// 测试入口字段
				if (!ignoreMainFields && this.mainFields.length) {
					const descriptionFile = await this.readDescriptionFile(path, trace)
					if (descriptionFile) {
						if (descriptionFile.mainField === undefined) {
							trace?.push(`Test field '${this.mainFields.join("/")}' in '${descriptionFile.path}' -> Not found`)
						} else {
							const mainValue = descriptionFile.main
							if (typeof mainValue !== "string") {
								trace?.push(`Test field '${descriptionFile.mainField}' in '${descriptionFile.path}' -> Skipped, not a string`)
							} else if (!mainValue) {
								trace?.push(`Test field '${descriptionFile.mainField}' in '${descriptionFile.path}' -> Skipped, is empty string`)
							} else {
								trace?.push(`Test field '${descriptionFile.mainField}' in '${descriptionFile.path}' -> '${join(path, mainValue)}'`)
								const result = await this.resolveFileOrDir(mainValue, path, trace, ignoreAliasField, true, true)
								if (result !== null) {
									return result
								}
							}
						}
					}
				}
				// 测试入口模块
				for (const mainFileName of this.mainFiles) {
					const result = await this.resolveFileOrDir(mainFileName || basename(path), path, trace, ignoreAliasField, ignoreMainFields, false)
					if (result !== null) {
						return result
					}
				}
			} else if (trace && (path.endsWith(sep) || !noExtension && !this.extensions.includes(""))) {
				const matched = !this.ignoreCase && findIgnoreCase(entries, name)
				if (matched) {
					trace.push(`Case mismatched: '${moduleName}' should be '${setName(moduleName, matched)}'`)
				} else {
					trace.push(`Test '${path}' -> Not found`)
				}
			}
		}
		return null

		/** 在集合中搜索不区分大小写的匹配项 */
		function findIgnoreCase(set: Set<string>, search: string) {
			search = search.toLowerCase()
			for (const item of set) {
				if (item.toLowerCase() === search) {
					return item
				}
			}
			return null
		}
	}

	/** 获取所有包描述文件名 */
	readonly descriptionFiles: string[]

	/** 描述文件数据的缓存 */
	private readonly _descriptionFileCache: Map<string, PackageFile | null | Promise<PackageFile | null>>

	/**
	 * 查找并解析属于某个文件夹的描述文件（如 `package.json`），如果文件不存在或解析失败则返回空
	 * @param dir 要查找的文件夹
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 */
	async lookupDescriptionFile(dir: string, trace?: string[]) {
		while (true) {
			// 查找本级
			const descriptionFile = await this.readDescriptionFile(dir, trace)
			if (descriptionFile) {
				return descriptionFile
			}
			// 继续查找上级
			const parent = dirname(dir)
			if (parent.length === dir.length) {
				return null
			}
			dir = parent
		}
	}

	/**
	 * 读取属于某个文件夹的描述文件（如 `package.json`），如果文件不存在或解析失败则返回空
	 * @param dir 要查找的文件夹
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 */
	protected async readDescriptionFile(dir: string, trace?: string[]) {
		const cache = !trace && this._descriptionFileCache.get(dir)
		if (cache) {
			if (cache instanceof Promise) {
				return await cache
			}
			return cache
		}
		const promise = this.readDescriptionFileNoCache(dir, trace)
		this._descriptionFileCache.set(dir, promise)
		const result = await promise
		this._descriptionFileCache.set(dir, result)
		return result
	}

	/**
	 * 忽略缓存读取属于某个文件夹的描述文件（如 `package.json`），如果文件不存在或解析失败则返回空
	 * @param dir 要查找的文件夹
	 * @param trace 如果提供了数组，则用于收集本次解析的日志
	 */
	protected async readDescriptionFileNoCache(dir: string, trace?: string[]) {
		for (const descriptionFileName of this.descriptionFiles) {
			// 判断文件是否存在
			const descriptionFilePath = join(dir, descriptionFileName)
			let descriptionFileContent: string
			try {
				descriptionFileContent = await this.fs.readFile(descriptionFilePath, "utf-8")
			} catch (e) {
				if (e.code === "ENOENT") {
					trace?.push(`Test '${descriptionFilePath}' -> Not found`)
					continue
				}
				trace?.push(`Test '${descriptionFilePath}' -> ${e.message}`)
				return { path: descriptionFilePath }
			}
			// 解析 JSON 文件
			const result: PackageFile = {
				path: descriptionFilePath
			}
			let descriptionFileData: any
			try {
				descriptionFileData = JSON.parse(descriptionFileContent)
			} catch (e) {
				trace?.push(`Test '${descriptionFilePath}' -> Cannot parse JSON: ${e.message}`)
				return result
			}
			if (!descriptionFileData || typeof descriptionFileData !== "object") {
				trace?.push(`Test '${descriptionFilePath}' -> Skipped, not a object`)
				return result
			}
			// 读取字段
			for (const field of this.aliasFields) {
				if (descriptionFileData.hasOwnProperty(field)) {
					result.aliasField = field
					result.alias = descriptionFileData[field]
					break
				}
			}
			for (const field of this.mainFields) {
				if (typeof descriptionFileData[field] === "string") {
					result.mainField = field
					result.main = descriptionFileData[field]
					break
				}
			}
			trace?.push(`Test '${descriptionFilePath}' -> Ok`)
			return result
		}
		return null
	}

	// #endregion

	// #region 文件

	/**
	 * 路径读取结果的缓存，键是文件或文件夹绝对路径，对象的值是：
	 * - `Promise`: 正在读取该路径的数据
	 * - `null`: 该路径不存在
	 * - `true`: 该路径是一个文件
	 * - `false`: 该路径是一个文件夹，但未读取内部文件项
	 * - `Set<string>`: 该路径是一个文件夹，值是内部所有直接子文件或子文件夹项，如果文件名大小写不匹配，则 `realPath` 存储了实际的文件名
	 */
	private _fsCache!: Map<string, null | boolean | Set<string> & { realPath?: string } | Promise<Set<string> & { realPath?: string } | boolean | null>>

	/** 获取使用的文件系统 */
	readonly fs: FileSystem

	/** 是否忽略路径的大小写 */
	readonly ignoreCase: boolean

	/**
	 * 读取文件夹内所有文件的列表，如果文件夹不存在则返回 `null`，如果路径存在但不是文件夹则返回 `false`，如果路径存在但大小写错误则返回实际路径字符串
	 * @param path 要读取的绝对路径
	 */
	protected async readDir(path: string) {
		// Windows：process.cwd() 可能返回小写盘符
		if (sep === "\\") {
			path = path.replace(/^[a-z]:/, driver => driver.toUpperCase())
		}
		let data = this._fsCache.get(path)
		if (data !== undefined) {
			if (data instanceof Promise) {
				data = await data
			}
			if (data !== undefined && data !== false) {
				if (data === true) {
					return false
				}
				return data
			}
		}
		const promise = this._readDirNoCache(path)
		this._fsCache.set(path, promise)
		return await promise
	}

	/** 底层读取文件夹 */
	private async _readDirNoCache(path: string) {
		let entries: string[]
		try {
			entries = await this.fs.readDir(path)
		} catch (e) {
			if (e.code === "ENOENT") {
				this._fsCache.set(path, null)
				return null
			}
			this._fsCache.delete(path)
			if (e.code === "ENOTDIR") {
				return false
			}
			throw e
		}
		let data: Set<string> & { realPath?: string }
		if (this.ignoreCase) {
			data = new Set<string>()
			for (const entry of entries) {
				data.add(entry.toLowerCase())
			}
		} else {
			data = new Set<string>(entries)
			// 如果设置为强制区分大小写，且系统不区分大小写，手动检查大小写
			if (this.fs.isCaseInsensitive) {
				const realPath = await this.fs.getRealPath(path)
				if (realPath !== null && realPath !== path && realPath.toLowerCase() === path.toLowerCase()) {
					data.realPath = realPath
				}
			}
		}
		this._fsCache.set(path, data)
		return data
	}

	/**
	 * 判断指定的路径是否是文件
	 * @param path 要判断的绝对路径
	 * @returns 如果文件不存在则返回 `null`，如果路径存在但不是文件则返回 `false`
	 */
	protected async existsFile(path: string): Promise<boolean | null> {
		// Windows：process.cwd() 可能返回小写盘符
		if (sep === "\\") {
			path = path.replace(/^[a-z]:/, driver => driver.toUpperCase())
		}
		let data = this._fsCache.get(path)
		if (data !== undefined) {
			if (data instanceof Promise) {
				data = await data
			}
			if (data !== undefined) {
				if (data === null || data === true) {
					return data as null | true
				}
				return false
			}
		}
		const promise = this._existsFileNoCache(path)
		this._fsCache.set(path, promise)
		return await promise
	}

	/** 底层读取文件 */
	private async _existsFileNoCache(path: string) {
		let data: boolean
		try {
			data = (await this.fs.getStat(path)).isFile()
		} catch (e) {
			if (e.code === "ENOENT") {
				this._fsCache.set(path, null)
				return null
			}
			this._fsCache.delete(path)
			throw e
		}
		this._fsCache.set(path, data)
		return data
	}

	/** 清除所有缓存 */
	clearCache() {
		this._resolveCache.clear()
		this._fsCache.clear()
		this._descriptionFileCache.clear()
	}

	// #endregion

}

/** 表示模块解析器的附加选项 */
export interface ResolverOptions {
	/**
	 * 快速设置所有选项
	 * - `"node"`: 采用和 Node.js 中 `require` 相同的方式解析路径
	 * - `"browser"`: 类似 `"node"`，但针对浏览器运行环境提供适配方案
	 * @default "node"
	 */
	type?: "node" | "browser"
	/**
	 * 是否允许缓存解析结果
	 * - `true`: 启用完整缓存
	 * - `"name"`: 根据模块名缓存，忽略所在文件夹，如果只有一个全局搜索文件夹，启用后可以加速解析
	 * - `false`: 不缓存
	 * @description 注意如果启用了缓存，则在少数极端情况会得到错误的解析结果
	 * @default true
	 */
	cache?: boolean | "name"
	/**
	 * 是否强制区分路径大小写
	 * @description 启用后可以在避免不同环境得到不同的解析结果
	 * @default this.type === "browser" ? true : false
	 */
	enforceCaseSensitive?: boolean
	/**
	 * 所有模块的别名
	 * @example
	 * {
	 *      alias: {
	 *          "abc": "xyz", // import "abc/foo" 将等价于 import "xyz/foo"
	 *          "abc$": "xyz", // import "abc" 将等价于 import "xyz"，但 import "abc/foo" 不变
	 *          "tealui-*": [
	 * 				"./tealui/*",
	 * 				(input, match) => input + "/" + match
	 * 			],
	 * 			"ignore": false // 忽略本模块
	 *      }
	 * }
	 */
	alias?: { [name: string]: string | ((source: string, ...parts: string[]) => string) | false | (string | ((source: string, ...parts: string[]) => string) | false)[] }
	/**
	 * 要搜索的文件夹路径
	 * @description
	 * 如果路径名包含了 `/` 或 `\`（比如 `./src` 和绝对路径），则解析时会在指定的单个文件夹内搜索模块
	 * 如果路径名不含 `/` 和 `\`（比如 `bower_components`），则解析时会从当前层级一直往上查找同名文件夹，依次搜索模块
	 * @default ["node_modules"]
	 */
	modules?: string[]
	/**
	 * 所有包描述文件名，包描述文件应该是一个 JSON 文件
	 * @default ["package.json"]
	 */
	descriptionFiles?: string[]
	/**
	 * 所有包描述文件中包含模块别名信息的字段名
	 * @see https://github.com/defunctzombie/package-browser-field-spec
	 * @default  this.type === "browser" ? ["browser"] : []
	 */
	aliasFields?: string[]
	/**
	 * 所有包描述文件中包含入口模块的字段名
	 * @default this.type === "browser" ? ["module", "jsnext:main", "browser", "main"] : ["main"]
	 */
	mainFields?: string[]
	/**
	 * 所有默认的入口模块名，其中 `""` 表示所在文件夹的名称
	 * @default this.type === "browser" ? ["index", ""] : ["index"]
	 */
	mainFiles?: string[]
	/**
	 * 所有解析模块名时尝试自动追加的扩展名
	 * @description
	 * 如果希望支持引用模块时不省略扩展名，需要在数组插入空字符串（建议插入到第一项）
	 * 如果希望强制引用模块时不省略扩展名，即不自动插入扩展名，可以设置为空数组
	 * @default this.type === "browser" ? ["", ".wasm", ".tsx", ".ts", ".jsx", ".mjs", ".js", ".json"] : ["", ".js", ".json", ".node"]
	 */
	extensions?: string[]
}

/** 表示一个包描述文件 */
export interface PackageFile {
	/** 文件绝对路径 */
	path: string
	/** 别名字段 */
	aliasField?: string
	/** 所有别名字段的值 */
	alias?: any
	/** 入口模块字段 */
	mainField?: string
	/** 入口模块名 */
	main?: any
}