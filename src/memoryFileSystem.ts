import { createReadStream, createWriteStream, Dirent, Stats } from "fs"
import { basename, dirname, join, resolve as resolvePath, sep } from "path"
import { FileSystem, WalkOptions } from "./fileSystem"
import { appendIndex, containsPath, joinPath } from "./path"
import { Readable, Writable } from "stream"
import { escapeRegExp } from "./misc"

/** 表示一个内存模拟的文件系统 */
export class MemoryFileSystem extends FileSystem {

	/** 判断当前文件系统是否是物理文件系统 */
	get native() { return false }

	/** 判断当前文件系统是否忽略大小写 */
	readonly isCaseInsensitive = false

	/**
	 * 获取原始数据，键是绝对路径，值有三种类型：
	 * - 字符串：表示文本文件内容
	 * - 缓存对象：表示二进制文件数据
	 * - null：表示一个文件夹
	 */
	readonly data = new Map<string, string | Buffer | null>()

	/**
	 * 创建一个 IO 错误
	 * @param syscall 系统调用
	 * @param code 错误码
	 * @param errno 错误代码
	 * @param path 发送错误的路径
	 * @param message 错误的信息
	 */
	protected createError(syscall: string, code: string, errno: number, path: string, message: string) {
		const error = new Error(message) as NodeJS.ErrnoException
		error.syscall = syscall
		error.code = code
		error.errno = errno
		error.path = path
		return error
	}

	/**
	 * 获取文件或文件夹的属性
	 * @param path 要获取的路径
	 * @param resolveLink 如果是软链接，是否解析链接引用的路径属性
	 */
	async getStat(path: string, resolveLink = true): Promise<Stats> {
		const fullPath = resolvePath(path)
		const data = this.data.get(fullPath)
		switch (data) {
			case undefined:
				throw this.createError(resolveLink ? "stat" : "lstat", "ENOENT", -4058, path, `ENOENT: no such file or directory, stat '${path}'`)
			case null:
				return new (Stats as any)(0, 0o40666, 1, 0, 0, 0, 4096, 0, 0, 0, Date.now(), 0, 0, 0)
			default:
				return new (Stats as any)(0, 0o100666, 1, 0, 0, 0, 4096, 0, typeof data === "string" ? Buffer.byteLength(data) : data.length, 0, Date.now(), 0, 0, 0)
		}
	}

	/**
	 * 判断指定的文件是否存在
	 * @param path 要判断的路径
	 * @returns 如果文件不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
	 */
	async existsFile(path: string) {
		return this.data.get(resolvePath(path)) != undefined
	}

	/**
	 * 判断指定的文件夹是否存在
	 * @param path 要判断的路径
	 * @returns 如果文件夹不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
	 */
	async existsDir(path: string) {
		return this.data.get(resolvePath(path)) === null
	}

	/**
	 * 如果指定的路径不存在则直接返回，否则返回重命名后的新路径
	 * @param path 要测试的文件或文件夹路径
	 * @param append 如果路径已存在则添加的文件名后缀，其中的数字会递增直到文件不存在
	 */
	async ensureNotExists(path: string, append?: string) {
		while (this.data.has(resolvePath(path))) {
			path = appendIndex(path, append)
		}
		return path
	}

	/**
	 * 创建一个文件夹
	 * @param path 要创建的文件夹路径
	 */
	async createDir(path: string) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				return
			case undefined:
				const parent = dirname(fullPath)
				if (parent.length !== fullPath.length) {
					await this.createDir(parent)
				}
				this.data.set(fullPath, null)
				break
			default:
				throw this.createError("mkdir", "EEXIST", -4075, path, `EEXIST: file already exists, mkdir '${path}'`)
		}
	}

	/**
	 * 创建一个临时文件夹
	 * @param parent 临时文件夹的根目录
	 * @returns 返回已创建文件夹路径
	 */
	async createTempDir(parent = ".TMP~") {
		parent = resolvePath(parent) + sep
		await this.createDir(parent)
		return parent
	}

	/**
	 * 删除指定的文件夹
	 * @param path 要删除的文件夹路径
	 * @param recursive 是否删除所有所有子文件夹和文件，如果为 `false` 则只删除空文件夹
	 * @returns 返回删除的文件数
	 */
	async deleteDir(path: string, recursive = true) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				if (recursive) {
					let count = 0
					for (const [key, value] of this.data.entries()) {
						if (containsPath(fullPath, key)) {
							this.data.delete(key)
							if (value !== null) {
								count++
							}
						}
					}
					return count
				} else {
					for (const key of this.data.keys()) {
						if (containsPath(fullPath, key) && key !== fullPath) {
							throw this.createError("rmdir", "ENOTEMPTY", -4051, path, `ENOTEMPTY: directory not empty, rmdir '${path}'`)
						}
					}
					this.data.delete(fullPath)
					return 0
				}
			case undefined:
				return 0
			default:
				throw this.createError("rmdir", "ENOTDIR", -4052, path, `ENOTDIR: not a directory, scandir '${path}'`)
		}
	}

	/**
	 * 清空指定的文件夹
	 * @param path 要清空的文件夹路径
	 * @returns 返回删除的文件数
	 */
	async cleanDir(path: string) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				let count = 0
				for (const [key, value] of this.data.entries()) {
					if (containsPath(fullPath, key) && key !== fullPath) {
						this.data.delete(key)
						if (value !== null) {
							count++
						}
					}
				}
				return count
			case undefined:
				return 0
			default:
				throw this.createError("rmdir", "ENOTDIR", -4052, path, `ENOTDIR: not a directory, scandir '${path}'`)
		}
	}

	/**
	 * 如果路径所在的文件夹是空的则删除所在文件夹
	 * @param path 文件夹内的文件路径
	 * @returns 返回已删除的文件夹数，如果文件夹不空，返回 `0`
	 */
	async deleteParentDirIfEmpty(path: string): Promise<number> {
		path = resolvePath(path)
		const parent = dirname(path)
		if (parent.length === path.length || parent === ".") {
			return 0
		}
		const count = await this.existsDir(parent) ? 1 : 0
		try {
			await this.deleteDir(parent, false)
		} catch (e) {
			return 0
		}
		return (await this.deleteParentDirIfEmpty(parent)) + count
	}

	/**
	 * 删除指定的文件或软链接
	 * @param path 要删除的文件路径
	 * @returns 如果删除成功则返回 `true`，否则说明文件不存在，返回 `false`
	 */
	async deleteFile(path: string) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				throw this.createError("unlink", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, read '${path}'`)
			case undefined:
				return false
			default:
				this.data.delete(fullPath)
				return true
		}
	}

	/**
	 * 深度遍历指定的路径并执行回调
	 * @param path 要遍历的文件或文件夹路径
	 * @param options 遍历的选项
	 */
	async walk(path: string, options: WalkOptions) {
		const fullPath = resolvePath(path)
		const data = this.data.get(fullPath)
		switch (data) {
			case null:
				const entries = await this.readDir(path || ".", true)
				if (!options.dir || options.dir(path, entries) !== false) {
					for (const entry of entries) {
						await this.walk(joinPath(path, entry.name), options)
					}
				}
				break
			case undefined:
				options.error?.(this.createError("scandir", "ENOENT", -4058, path, `ENOENT: no such file or directory, scandir '${path}'`), path)
				break
			default:
				options.file?.(path)
				break
		}
	}

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 * @param withFileTypes 是否包含文件类型信息
	 */
	async readDir(path: string, withFileTypes: true): Promise<Dirent[]>

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 * @param withFileTypes 是否包含文件类型信息
	 */
	async readDir(path: string, withFileTypes?: boolean): Promise<string[]>

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 */
	async readDir(path: string, withFileTypes?: boolean) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				const entries: string[] | Dirent[] = []
				for (const key of this.data.keys()) {
					if (dirname(key) === fullPath && key !== fullPath) {
						const name = basename(key)
						entries.push(withFileTypes ? new (Dirent as any)(name, this.data.get(key) === null ? 2 : 1) : name)
					}
				}
				return entries
			case undefined:
				throw this.createError("scandir", "ENOENT", -4058, path, `ENOENT: no such file or directory, scandir '${path}'`)
			default:
				throw this.createError("scandir", "ENOTDIR", -4052, path, `ENOTDIR: not a directory, scandir '${path}'`)
		}

	}

	/**
	 * 读取指定文件的二进制内容
	 * @param path 要读取的文件路径
	 */
	async readFile(path: string): Promise<Buffer>

	/**
	 * 读取指定文件的文本内容
	 * @param path 要读取的文件路径
	 * @param encoding 文件的编码
	 */
	async readFile(path: string, encoding: BufferEncoding): Promise<string>

	async readFile(path: string, encoding?: any) {
		const fullPath = resolvePath(path)
		const data = this.data.get(fullPath)
		switch (data) {
			case null:
				throw this.createError("read", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, read '${path}'`)
			case undefined:
				throw this.createError("open", "ENOENT", -4058, path, `ENOENT: no such file or directory, open '${path}'`)
			default:
				return encoding ? data.toString(encoding) : data
		}
	}

	/**
	 * 将内容写入指定的文件
	 * @param path 要写入的文件路径
	 * @param data 要写入的文件数据
	 * @param overwrite 是否允许覆盖现有的目标
	 * @returns 如果写入成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	async writeFile(path: string, data: string | Buffer, overwrite = true) {
		const fullPath = resolvePath(path)
		switch (this.data.get(fullPath)) {
			case null:
				throw this.createError("open", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, open '${path}'`)
			case undefined:
				await this.ensureDirExists(fullPath)
				this.data.set(fullPath, data)
				return true
			default:
				if (!overwrite) {
					return false
				}
				this.data.set(fullPath, data)
				return true
		}
	}

	/**
	 * 在指定文件末尾追加内容
	 * @param path 要创建的文件路径
	 * @param data 要写入的文件数据
	 */
	async appendFile(path: string, data: string | Buffer) {
		const fullPath = resolvePath(path)
		const exists = this.data.get(fullPath)
		switch (exists) {
			case null:
				throw this.createError("open", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, open '${path}'`)
			case undefined:
				await this.ensureDirExists(fullPath)
				this.data.set(fullPath, data)
				break
			default:
				this.data.set(fullPath, typeof data === "string" && typeof exists === "string" ? exists + data : Buffer.concat([
					typeof exists === "string" ? Buffer.from(exists) : exists,
					typeof data === "string" ? Buffer.from(data) : data
				]))
				break
		}
	}

	/**
	 * 创建一个软链接
	 * @param path 要创建的文件路径
	 * @param target 要链接的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @returns 如果创建成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	async createLink(path: string, target: string, overwrite = true): Promise<boolean> {
		throw this.createError("link", "EPERM", -4048, path, `EPERM: operation not permitted, link '${target}' -> '${path}'`)
	}

	/**
	 * 读取软链接的实际地址
	 * @param path 要读取的软链接路径
	 */
	async readLink(path: string): Promise<string> {
		throw this.createError("readlink", "UNKNOWN", -4094, path, `UNKNOWN: unknown error, readlink '${path}'`)
	}

	/**
	 * 创建一个用于读取指定文件的流
	 * @param path 要读取的文件路径
	 * @param options 附加选项
	 */
	createReadStream(path: string, options?: Parameters<typeof createReadStream>[1]) {
		const fs = this
		return new class MemoryReadStream extends Readable {
			readonly path: string
			readonly data?: string | Buffer | null
			readonly bytesRead: number
			get pending() { return false }
			constructor(path: string) {
				super()
				this.path = path
				this.data = fs.data.get(resolvePath(path))
				this.bytesRead = this.data == undefined ? 0 : Buffer.byteLength(this.data)
			}
			_read(size: number) {
				switch (this.data) {
					case null:
						this.emit("error", fs.createError("read", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, read '${path}'`))
						break
					case undefined:
						this.emit("error", fs.createError("open", "ENOENT", -4058, path, `ENOENT: no such file or directory, open '${path}'`))
						break
					default:
						this.push(this.data)
						break
				}
				this.push(null)
			}
			close() { }
		}(path)
	}

	/**
	 * 创建一个用于写入指定文件的流
	 * @param path 要读取的文件路径
	 * @param options 附加选项
	 */
	createWriteStream(path: string, options?: Parameters<typeof createWriteStream>[1]) {
		const fs = this
		return new class MemoryWriteStream extends Writable {
			readonly path: string
			bytesWritten = 0
			error?: Error
			get pending() { return false }
			constructor(path: string) {
				super()
				this.path = path
				const fullPath = resolvePath(path)
				switch (fs.data.get(fullPath)) {
					case null:
						this.error = fs.createError("open", "EISDIR", -4068, path, `EISDIR: illegal operation on a directory, open '${path}'`)
						break
					case undefined:
						if (fs.data.get(dirname(fullPath)) !== null) {
							this.error = fs.createError("open", "ENOENT", -4058, path, `ENOENT: no such file or directory, open '${path}'`)
						} else {
							fs.data.set(fullPath, "")
						}
						break
					default:
						fs.data.set(fullPath, "")
						break
				}
			}
			async _write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
				if (this.error) {
					callback(this.error)
					return
				}
				if (typeof chunk === "string") {
					chunk = Buffer.from(chunk, encoding as BufferEncoding)
				}
				try {
					await fs.appendFile(path, chunk)
					callback(null)
				} catch (e) {
					callback(e)
				}
			}
			_final(callback: (error?: Error | null) => void) {
				this.emit("close")
				callback(this.error)
			}
			close() {
				return this.end()
			}
		}(path)
	}

	/**
	 * 复制指定的文件夹
	 * @param src 要复制的源路径
	 * @param dest 要复制的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @param preserveLinks 是否保留链接
	 * @returns 返回已复制的文件数
	 */
	async copyDir(src: string, dest: string, overwrite = true, preserveLinks?: boolean) {
		await this.createDir(dest)
		const entries = await this.readDir(src, true)
		let count = 0
		let firstError: NodeJS.ErrnoException | undefined
		for (const entry of entries) {
			const fromChild = join(src, entry.name)
			const toChild = join(dest, entry.name)
			try {
				if (entry.isDirectory()) {
					count += await this.copyDir(fromChild, toChild, overwrite, preserveLinks)
				} else {
					if (await this.copyFile(fromChild, toChild, overwrite)) {
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
	async copyFile(src: string, dest: string, overwrite = true) {
		return await this.writeFile(dest, await this.readFile(src), overwrite)
	}

	/**
	 * 移动指定的文件夹
	 * @param src 要移动的源路径
	 * @param dest 要移动的目标路径
	 * @param overwrite 是否允许覆盖现有的目标
	 * @param preserveLinks 是否保留链接
	 * @returns 返回已移动的文件数
	 */
	async moveDir(src: string, dest: string, overwrite = true, preserveLinks?: boolean) {
		await this.createDir(dest)
		const entries = await this.readDir(src, true)
		let count = 0
		let firstError: NodeJS.ErrnoException | undefined
		for (const entry of entries) {
			const fromChild = join(src, entry.name)
			const toChild = join(dest, entry.name)
			try {
				if (entry.isDirectory()) {
					count += await this.moveDir(fromChild, toChild, overwrite, preserveLinks)
				} else {
					if (await this.moveFile(fromChild, toChild, overwrite)) {
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
			await this.deleteDir(src, false)
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
	async moveFile(src: string, dest: string, overwrite = true) {
		if (await this.copyFile(src, dest, overwrite)) {
			await this.deleteFile(src)
			return true
		}
		return false
	}

	/**
	 * 获取指定路径区分大小写的实际路径，如果地址不存在则返回 `null`
	 * @param path 原路径
	 */
	async getRealPath(path: string) {
		path = resolvePath(path)
		return this.data.has(path) ? path : null
	}

}