import { accessSync, appendFileSync, constants, copyFileSync, Dirent, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmdirSync, Stats, statSync, symlinkSync, unlinkSync, writeFileSync } from "fs"
import { dirname, join, relative, resolve as resolvePath, sep } from "path"
import { WalkOptions } from "./fileSystem"
import { Matcher, Pattern } from "./matcher"
import { appendIndex, joinPath } from "./path"

/**
 * 获取文件或文件夹的属性
 * @param path 要获取的路径
 * @param resolveLink 如果是软链接，是否解析链接引用的路径属性
 */
export function getStat(path: string, resolveLink = true) {
	return (resolveLink ? statSync : lstatSync)(path)
}

/**
 * 判断指定的文件是否存在
 * @param path 要判断的路径
 * @returns 如果文件不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
 */
export function existsFile(path: string) {
	try {
		return statSync(path).isFile()
	} catch (e) {
		if (e.code === "ENOENT" || e.code === "ENOTDIR") {
			return false
		}
		throw e
	}
}

/**
 * 判断指定的文件夹是否存在
 * @param path 要判断的路径
 * @returns 如果文件夹不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
 */
export function existsDir(path: string) {
	try {
		return statSync(path).isDirectory()
	} catch (e) {
		if (e.code === "ENOENT" || e.code === "ENOTDIR") {
			return false
		}
		throw e
	}
}

/**
 * 如果指定的路径不存在则直接返回，否则返回重命名后的新路径
 * @param path 要测试的文件或文件夹路径
 * @param append 如果路径已存在则添加的文件名后缀，其中的数字会递增直到文件不存在
 */
export function ensureNotExists(path: string, append?: string) {
	while (existsSync(path)) {
		path = appendIndex(path, append)
	}
	return path
}

/**
 * 如果路径所在的文件夹不存在则创建一个
 * @param path 相关的路径
 */
export function ensureDirExists(path: string) {
	return createDir(dirname(resolvePath(path)))
}

/**
 * 创建一个文件夹
 * @param path 要创建的文件夹路径
 */
export function createDir(path: string) {
	mkdirSync(path, {
		// 取消用户缺少的权限
		mode: 0o777 & ~process.umask(),
		recursive: true
	})
}

/**
 * 创建一个临时文件夹
 * @param parent 临时文件夹的根目录
 * @returns 返回已创建文件夹路径
 */
export function createTempDir(parent = (require("os") as typeof import("os")).tmpdir()) {
	return mkdtempSync(parent + sep)
}

/**
 * 删除指定的文件夹
 * @param path 要删除的文件夹路径
 * @param recursive 是否删除所有所有子文件夹和文件，如果为 `false` 则只删除空文件夹
 * @returns 返回删除的文件数
 */
export function deleteDir(path: string, recursive = true) {
	try {
		rmdirSync(path)
	} catch (e) {
		switch (e.code) {
			case "ENOENT":
				// Windows 下 ENOTDIR 会误报为 ENOENT
				// https://github.com/nodejs/node/issues/18014
				if (process.platform === "win32" && existsSync(path)) {
					e.code = "ENOTDIR"
					throw e
				}
				break
			case "ENOTEMPTY":
			case "EEXIST":
				if (recursive) {
					const result = cleanDir(path)
					deleteDir(path, false)
					return result
				}
			// fall through
			default:
				throw e
		}
	}
	return 0
}

/**
 * 清空指定的文件夹
 * @param path 要清空的文件夹路径
 * @returns 返回删除的文件数
 */
export function cleanDir(path: string) {
	let entries: Dirent[]
	try {
		entries = readdirSync(path, { withFileTypes: true })
	} catch (e) {
		if (e.code === "ENOENT") {
			return 0
		}
		throw e
	}
	let count = 0
	for (const entry of entries) {
		const child = join(path, entry.name)
		if (entry.isDirectory()) {
			count += deleteDir(child)
		} else if (deleteFile(child)) {
			count++
		}
	}
	return count
}

/**
 * 如果路径所在的文件夹是空的则删除所在文件夹
 * @param path 文件夹内的文件路径
 * @returns 返回已删除的文件夹数，如果文件夹不空，返回 `0`
 */
export function deleteParentDirIfEmpty(path: string): number {
	path = resolvePath(path)
	const parent = dirname(path)
	if (parent.length === path.length || parent === ".") {
		return 0
	}
	let count = 0
	try {
		rmdirSync(parent)
		count++
	} catch (e) {
		if (e.code !== "ENOENT") {
			return 0
		}
	}
	return deleteParentDirIfEmpty(parent) + count
}

/**
 * 删除指定的文件或软链接
 * @param path 要删除的文件路径
 * @returns 如果删除成功则返回 `true`，否则说明文件不存在，返回 `false`
 */
export function deleteFile(path: string) {
	try {
		unlinkSync(path)
	} catch (e) {
		if (e.code === "ENOENT") {
			return false
		}
		throw e
	}
	return true
}

/**
 * 深度遍历指定的路径并执行回调
 * @param path 要遍历的文件或文件夹路径
 * @param options 遍历的选项
 */
export function walk(path: string, options: WalkOptions, /**@internal */ _stats?: Dirent | Stats) {
	if (!_stats || _stats.isDirectory()) {
		let entries: Dirent[]
		try {
			entries = readdirSync(path || ".", { withFileTypes: true })
		} catch (e) {
			if (e.code === "ENOTDIR") {
				let stats: Stats
				try {
					stats = (options.follow !== false ? statSync : lstatSync)(path)
				} catch (e) {
					options.error?.(e, path)
					return
				}
				walk(path, options, stats)
			} else {
				options.error?.(e, path)
			}
			return
		}
		if (!options.dir || options.dir(path, entries) !== false) {
			for (const entry of entries) {
				walk(joinPath(path, entry.name), options, entry)
			}
		}
	} else if (_stats.isFile()) {
		options.file?.(path)
	} else if (options.follow !== false && _stats.isSymbolicLink()) {
		let stats: Stats
		try {
			stats = statSync(path)
		} catch (e) {
			options.error?.(e, path)
			return
		}
		walk(path, options, stats)
	} else {
		options.other?.(path, _stats)
	}
}

/**
 * 查找匹配指定模式的所有文件
 * @param pattern 要匹配的模式
 * @param baseDir 查找的基文件夹路径
 * @returns 返回所有匹配文件的路径
 */
export function glob(pattern: Pattern, baseDir?: string) {
	const matcher = new Matcher(pattern, baseDir)
	const excludeMatcher = matcher.excludeMatcher
	const files: string[] = []
	matcher.getBases().forEach(base => walk(base, {
		error(e) {
			throw e
		},
		dir: excludeMatcher ? path => !excludeMatcher.test(path) : undefined,
		file(path) {
			if (matcher.test(path)) {
				files.push(path)
			}
		}
	}))
	return files
}

/**
 * 获取文件夹内的所有文件和文件夹组成的数组
 * @param path 要读取的文件夹路径
 * @param withFileTypes 是否包含文件类型信息
 */
export function readDir(path: string, withFileTypes: true): Dirent[]

/**
 * 获取文件夹内的所有文件和文件夹组成的数组
 * @param path 要读取的文件夹路径
 * @param withFileTypes 是否包含文件类型信息
 */
export function readDir(path: string, withFileTypes?: boolean): string[]

export function readDir(path: string, withFileTypes?: boolean) {
	return readdirSync(path, { withFileTypes: withFileTypes as any }) as Dirent[] | string[]
}

/**
 * 读取指定文件的二进制内容
 * @param path 要读取的文件路径
 */
export function readFile(path: string): Buffer

/**
 * 读取指定文件的文本内容
 * @param path 要读取的文件路径
 * @param encoding 文件的编码
 */
export function readFile(path: string, encoding: BufferEncoding): string

export function readFile(path: string, encoding?: any) {
	return readFileSync(path, encoding) as string | Buffer
}

/**
 * 使用 UTF-8 编码读取指定的文本文件
 * @param path 要读取的文件路径
 * @param throwIfNotFound 如果文件不存在，是否抛出异常，如果值为 `false`，则文件不存在时返回 `null`
 */
export function readText(path: string, throwIfNotFound: false): string | null

/**
 * 使用 UTF-8 编码读取指定的文本文件
 * @param path 要读取的文件路径
 * @param throwIfNotFound 如果文件不存在，是否抛出异常，如果值为 `false`，则文件不存在时返回 `null`
 */
export function readText(path: string, throwIfNotFound?: boolean): string

export function readText(path: string, throwIfNotFound?: boolean) {
	try {
		return readFile(path, "utf-8")
	} catch (e) {
		if (throwIfNotFound === false && (e.code === "ENOENT" || e.code === "ENOTDIR" || e.code === "EISDIR")) {
			return null
		}
		throw e
	}
}

/**
 * 将内容写入指定的文件
 * @param path 要写入的文件路径
 * @param data 要写入的文件数据
 * @param overwrite 是否允许覆盖现有的目标
 * @returns 如果写入成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function writeFile(path: string, data: string | Buffer, overwrite = true): boolean {
	try {
		writeFileSync(path, data, overwrite ? undefined : { flag: "wx" })
	} catch (e) {
		switch (e.code) {
			case "ENOENT":
				ensureDirExists(path)
				return writeFile(path, data, overwrite)
			case "EEXIST":
				return false
			default:
				throw e
		}
	}
	return true
}

/**
 * 在指定文件末尾追加内容
 * @param path 要创建的文件路径
 * @param data 要写入的文件数据
 */
export function appendFile(path: string, data: string | Buffer) {
	try {
		appendFileSync(path, data)
	} catch (e) {
		switch (e.code) {
			case "ENOENT":
				ensureDirExists(path)
				appendFile(path, data)
				break
			default:
				throw e
		}
	}
}

/**
 * 创建一个软链接
 * @param path 要创建的文件路径
 * @param target 要链接的目标路径
 * @param overwrite 是否覆盖已有的目标
 * @returns 如果创建成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function createLink(path: string, target: string, overwrite = true): boolean {
	try {
		if (process.platform === "win32") {
			const isDir = existsDir(target)
			try {
				symlinkSync(relative(dirname(path), target), path, isDir ? "dir" : "file")
			} catch (e) {
				// Windows 需要管理员权限才能创建软链接，尝试使用其它方式
				if (e.code === "EPERM") {
					if (isDir) {
						symlinkSync(resolvePath(target), path, "junction")
					} else {
						linkSync(target, path)
					}
				} else {
					throw e
				}
			}
		} else {
			symlinkSync(relative(dirname(path), target), path)
		}
	} catch (e) {
		switch (e.code) {
			case "ENOENT":
				if (existsSync(target)) {
					ensureDirExists(path)
					return createLink(path, target, overwrite)
				}
				throw e
			case "EEXIST":
				if (overwrite) {
					deleteFile(path)
					return createLink(path, target, false)
				} else {
					return false
				}
			default:
				throw e
		}
	}
	return true
}

/**
 * 读取软链接的实际地址
 * @param path 要读取的软链接路径
 */
export function readLink(path: string) {
	return readlinkSync(path)
}

/**
 * 复制指定的文件夹
 * @param src 要复制的源路径
 * @param dest 要复制的目标路径
 * @param overwrite 是否覆盖已有的目标
 * @returns 返回已复制的文件数
 */
export function copyDir(src: string, dest: string, overwrite = true) {
	createDir(dest)
	const entries = readdirSync(src, { withFileTypes: true })
	let count = 0
	let firstError: NodeJS.ErrnoException | undefined
	for (const entry of entries) {
		const fromChild = join(src, entry.name)
		const toChild = join(dest, entry.name)
		try {
			if (entry.isDirectory()) {
				count += copyDir(fromChild, toChild, overwrite)
			} else if (entry.isSymbolicLink()) {
				if (copyLink(fromChild, toChild, overwrite)) {
					count++
				}
			} else {
				if (copyFile(fromChild, toChild, overwrite)) {
					count++
				}
			}
		} catch (e) {
			firstError = firstError || e
		}
	}
	if (firstError) {
		throw firstError
	}
	return count
}

/**
 * 复制指定的文件
 * @param src 要复制的源路径
 * @param dest 要复制的目标路径
 * @param overwrite 是否覆盖已有的目标
 * @returns 如果复制成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function copyFile(src: string, dest: string, overwrite = true): boolean {
	try {
		copyFileSync(src, dest, overwrite ? undefined : constants.COPYFILE_EXCL)
	} catch (e) {
		switch (e.code) {
			case "ENOENT":
				// 区分是源文件不存在还是目标目录不存在
				if (!existsSync(dest) && existsSync(src)) {
					ensureDirExists(dest)
					return copyFile(src, dest, false)
				}
				throw e
			case "EEXIST":
				return false
			default:
				throw e
		}
	}
	return true
}

/**
 * 复制指定的软链接
 * @param src 要复制的源路径
 * @param dest 要复制的目标路径
 * @param overwrite 是否覆盖已有的目标
 * @returns 如果复制成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function copyLink(src: string, dest: string, overwrite = true) {
	try {
		src = readlinkSync(src)
	} catch { }
	return createLink(dest, src, overwrite)
}

/**
 * 移动指定的文件夹
 * @param src 要移动的源路径
 * @param dest 要移动的目标路径
 * @param overwrite 是否允许覆盖现有的目标
 * @returns 返回已移动的文件数
 */
export function moveDir(src: string, dest: string, overwrite = true): number {
	createDir(dest)
	const entries = readdirSync(src, { withFileTypes: true })
	let count = 0
	let firstError: NodeJS.ErrnoException | undefined
	for (const entry of entries) {
		const fromChild = join(src, entry.name)
		const toChild = join(dest, entry.name)
		try {
			if (entry.isDirectory()) {
				count += moveDir(fromChild, toChild, overwrite)
			} else if (entry.isSymbolicLink()) {
				if (moveLink(fromChild, toChild, overwrite)) {
					count++
				}
			} else {
				if (moveFile(fromChild, toChild, overwrite)) {
					count++
				}
			}
		} catch (e) {
			firstError = firstError || e
		}
	}
	if (firstError) {
		throw firstError
	}
	try {
		deleteDir(src, false)
	} catch (e) {
		if (overwrite || e.code !== "ENOTEMPTY") {
			throw e
		}
	}
	return count
}

/**
 * 移动指定的文件
 * @param src 要移动的源路径
 * @param dest 要移动的目标路径
 * @param overwrite 是否允许覆盖现有的目标
 * @returns 如果移动成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function moveFile(src: string, dest: string, overwrite = true): boolean {
	// 原生的 rename 会直接覆盖且不抛错误
	if (overwrite) {
		try {
			renameSync(src, dest)
		} catch (e) {
			copyFile(src, dest)
			deleteFile(src)
		}
		return true
	} else if (existsSync(dest)) {
		accessSync(src)
		return false
	} else {
		return moveFile(src, dest, true)
	}
}

/**
 * 移动指定的软链接
 * @param src 要移动的源路径
 * @param dest 要移动的目标路径
 * @param overwrite 是否允许覆盖现有的目标
 * @returns 如果移动成功则返回 `true`，否则说明目标已存在，返回 `false`
 */
export function moveLink(src: string, dest: string, overwrite = true) {
	const result = copyLink(src, dest, overwrite)
	if (result) {
		deleteFile(src)
		return true
	}
	return false
}

/**
 * 获取指定路径区分大小写的实际路径，如果地址不存在则返回 `null`
 * @param path 原路径
 */
export function getRealPath(path: string) {
	try {
		return realpathSync.native(path)
	} catch (e) {
		if (e.code === "ENOENT") {
			return null
		}
		throw e
	}
}