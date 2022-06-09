import { access, appendFile, constants, copyFile, createReadStream, createWriteStream, Dirent, link, lstat, mkdir, mkdtemp, readdir, readFile, readlink, realpath, rename, rmdir, stat, Stats, symlink, unlink, writeFile } from "fs"
import { dirname, join, relative, resolve as resolvePath, sep } from "path"
import { Matcher, Pattern } from "./matcher"
import { escapeRegExp, replaceString } from "./misc"
import { appendIndex, isCaseInsensitive, joinPath } from "./path"

/** 表示一个文件系统 */
export class FileSystem {

	/** 判断当前文件系统是否是物理文件系统 */
	get native() { return true }

	/** 判断当前文件系统是否忽略大小写 */
	readonly isCaseInsensitive = isCaseInsensitive

	/**
	 * 获取文件或文件夹的属性
	 * @param path 要获取的路径
	 * @param resolveLink 如果是软链接，是否解析链接引用的路径属性
	 */
	getStat(path: string, resolveLink = true) {
		return new Promise<Stats>((resolve, reject) => {
			(resolveLink ? stat : lstat)(path, (error, stats) => {
				if (error) {
					reject(error)
				} else {
					resolve(stats)
				}
			})
		})
	}

	/**
	 * 判断指定的文件是否存在
	 * @param path 要判断的路径
	 * @returns 如果文件不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
	 */
	existsFile(path: string) {
		return new Promise<boolean>((resolve, reject) => {
			stat(path, (error, stats) => {
				if (error) {
					if (error.code === "ENOENT" || error.code === "ENOTDIR") {
						resolve(false)
					} else {
						reject(error)
					}
				} else {
					resolve(stats.isFile())
				}
			})
		})
	}

	/**
	 * 判断指定的文件夹是否存在
	 * @param path 要判断的路径
	 * @returns 如果文件夹不存在或路径不是一个文件，则返回 `false`，否则返回 `true`
	 */
	existsDir(path: string) {
		return new Promise<boolean>((resolve, reject) => {
			stat(path, (error, stats) => {
				if (error) {
					if (error.code === "ENOENT" || error.code === "ENOTDIR") {
						resolve(false)
					} else {
						reject(error)
					}
				} else {
					resolve(stats.isDirectory())
				}
			})
		})
	}

	/**
	 * 如果指定的路径不存在则直接返回，否则返回重命名后的新路径
	 * @param path 要测试的文件或文件夹路径
	 * @param append 如果路径已存在则添加的文件名后缀，其中的数字会递增直到文件不存在
	 */
	async ensureNotExists(path: string, append?: string) {
		return new Promise<string>((resolve, reject) => {
			access(path, error => {
				if (error && error.code === "ENOENT") {
					resolve(path)
				} else {
					this.ensureNotExists(appendIndex(path, append), append).then(resolve, reject)
				}
			})
		})
	}

	/**
	 * 如果路径所在的文件夹不存在则创建一个
	 * @param path 相关的路径
	 */
	ensureDirExists(path: string) {
		return this.createDir(dirname(resolvePath(path)))
	}

	/**
	 * 创建一个文件夹
	 * @param path 要创建的文件夹路径
	 */
	createDir(path: string) {
		return new Promise<void>((resolve, reject) => {
			mkdir(path, {
				// 取消用户缺少的权限
				mode: 0o777 & ~process.umask(),
				recursive: true
			}, error => {
				if (error) {
					reject(error)
				} else {
					resolve()
				}
			})
		})
	}

	/**
	 * 创建一个临时文件夹
	 * @param parent 临时文件夹的根目录
	 * @returns 返回已创建文件夹路径
	 */
	createTempDir(parent = (require("os") as typeof import("os")).tmpdir()) {
		return new Promise<string>((resolve, reject) => {
			mkdtemp(parent + sep, (error, path) => {
				if (error) {
					reject(error)
				} else {
					resolve(path)
				}
			})
		})
	}

	/**
	 * 删除指定的文件夹
	 * @param path 要删除的文件夹路径
	 * @param recursive 是否删除所有所有子文件夹和文件，如果为 `false` 则只删除空文件夹
	 * @returns 返回删除的文件数
	 */
	deleteDir(path: string, recursive = true) {
		return new Promise<number>((resolve, reject) => {
			rmdir(path, error => {
				if (error) {
					switch (error.code) {
						case "ENOENT":
							// Windows 下 ENOTDIR 会误报为 ENOENT
							// https://github.com/nodejs/node/issues/18014
							if (process.platform === "win32") {
								access(path, error2 => {
									if (error2) {
										resolve(0)
									} else {
										error.code = "ENOTDIR"
										reject(error)
									}
								})
							} else {
								resolve(0)
							}
							break
						case "ENOTEMPTY":
						case "EEXIST":
							if (recursive) {
								this.cleanDir(path).then(result => {
									this.deleteDir(path, false).then(() => {
										resolve(result)
									}, reject)
								}, reject)
								break
							}
						// fall through
						default:
							reject(error)
							break
					}
				} else {
					resolve(0)
				}
			})
		})
	}

	/**
	 * 清空指定的文件夹
	 * @param path 要清空的文件夹路径
	 * @returns 返回删除的文件数
	 */
	cleanDir(path: string) {
		return new Promise<number>((resolve, reject) => {
			safeCall(readdir, [path, { withFileTypes: true }], (error, entries: Dirent[]) => {
				if (error) {
					if (error.code === "ENOENT") {
						resolve(0)
					} else {
						reject(error)
					}
				} else {
					let pending = entries.length
					if (pending) {
						let count = 0
						for (const entry of entries) {
							const child = join(path, entry.name)
							const promise: Promise<number | boolean> = entry.isDirectory() ? this.deleteDir(child) : this.deleteFile(child)
							promise.then(childCount => {
								count += childCount as number
								if (--pending === 0) {
									resolve(count)
								}
							}, reject)
						}
					} else {
						resolve(0)
					}
				}
			})
		})
	}

	/**
	 * 如果路径所在的文件夹是空的则删除所在文件夹
	 * @param path 文件夹内的文件路径
	 * @returns 返回已删除的文件夹数，如果文件夹不空，返回 `0`
	 */
	deleteParentDirIfEmpty(path: string) {
		path = resolvePath(path)
		const parent = dirname(path)
		if (parent.length === path.length || parent === ".") {
			return Promise.resolve(0)
		}
		return new Promise<number>((resolve, reject) => {
			rmdir(parent, error => {
				if (error && error.code !== "ENOENT") {
					resolve(0)
				} else {
					this.deleteParentDirIfEmpty(parent).then(value => {
						resolve(value + (error ? 0 : 1))
					}, reject)
				}
			})
		})
	}

	/**
	 * 删除指定的文件或软链接
	 * @param path 要删除的文件路径
	 * @returns 如果删除成功则返回 `true`，否则说明文件不存在，返回 `false`
	 */
	deleteFile(path: string) {
		return new Promise<boolean>((resolve, reject) => {
			unlink(path, error => {
				if (error) {
					if (error.code === "ENOENT") {
						resolve(false)
					} else {
						reject(error)
					}
				} else {
					resolve(true)
				}
			})
		})
	}

	/**
	 * 深度遍历指定的路径并执行回调
	 * @param path 要遍历的文件或文件夹路径
	 * @param options 遍历的选项
	 */
	walk(path: string, options: WalkOptions) {
		return new Promise<void>((resolve, reject) => {
			let pending = 0
			walk(path)

			async function walk(path: string, _stats?: Dirent | Stats) {
				pending++
				if (!_stats || _stats.isDirectory()) {
					safeCall(readdir, [path || ".", { withFileTypes: true }], async (error: NodeJS.ErrnoException | null, entries: Dirent[]) => {
						try {
							if (error) {
								if (error.code === "ENOTDIR") {
									(options.follow !== false ? stat : lstat)(path, async (error, stats) => {
										try {
											if (error) {
												if (options.error) {
													await options.error(error, path, _stats)
												}
											} else {
												walk(path, stats)
											}
											if (--pending === 0) {
												resolve()
											}
										} catch (e) {
											reject(e)
										}
									})
									return
								} else if (options.error) {
									await options.error(error, path, _stats)
								}
							} else if (!options.dir || await options.dir(path, entries) !== false) {
								for (const entry of entries) {
									walk(joinPath(path, entry.name), entry)
								}
							}
							if (--pending === 0) {
								resolve()
							}
						} catch (e) {
							reject(e)
						}
					})
					return
				} else if (_stats.isFile()) {
					if (options.file) {
						await options.file(path, _stats)
					}
				} else if (options.follow !== false && _stats.isSymbolicLink()) {
					stat(path, async (error, stats) => {
						try {
							if (error) {
								if (options.error) {
									await options.error(error, path, _stats)
								}
							} else {
								walk(path, stats)
							}
							if (--pending === 0) {
								resolve()
							}
						} catch (e) {
							reject(e)
						}
					})
					return
				} else if (options.other) {
					await options.other(path, _stats)
				}
				if (--pending === 0) {
					resolve()
				}
			}
		})
	}

	/**
	 * 遍历通配符匹配的所有文件
	 * @param pattern 要匹配的模式
	 * @param callback 遍历的回调函数
	 * @param baseDir 查找的基文件夹路径
	 * @param followLinks 是否展开链接，默认 `true`
	 */
	walkGlob(pattern: Pattern, callback: (path: string) => any, baseDir?: string, followLinks?: boolean) {
		const matcher = new Matcher(pattern, baseDir, this.isCaseInsensitive)
		const excludeMatcher = matcher.excludeMatcher
		return Promise.all(matcher.getBases().map(base => this.walk(base, {
			follow: followLinks,
			error(e) {
				if (e.code === "ENOENT") {
					return
				}
				throw e
			},
			dir: excludeMatcher ? path => !excludeMatcher.test(path) : undefined,
			async file(path) {
				if (matcher.test(path)) {
					await callback(path)
				}
			}
		})))
	}

	/**
	 * 查找匹配指定模式的所有文件
	 * @param pattern 要匹配的模式
	 * @param baseDir 查找的基文件夹路径
	 * @param followLinks 是否展开链接，默认 `true`
	 * @returns 返回所有匹配文件的路径
	 */
	async glob(pattern: Pattern, baseDir?: string, followLinks?: boolean) {
		const files: string[] = []
		await this.walkGlob(pattern, path => {
			files.push(path)
		}, baseDir, followLinks)
		return files
	}

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 * @param withFileTypes 是否包含文件类型信息
	 */
	readDir(path: string, withFileTypes: true): Promise<Dirent[]>

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 * @param withFileTypes 是否包含文件类型信息
	 */
	readDir(path: string, withFileTypes?: boolean): Promise<string[]>

	/**
	 * 获取文件夹内的所有文件和文件夹组成的数组
	 * @param path 要读取的文件夹路径
	 */
	readDir(path: string, withFileTypes?: boolean) {
		return new Promise<string[] | Dirent[]>((resolve, reject) => {
			safeCall(readdir, [path, { withFileTypes }], (error, entries: string[] | Dirent[]) => {
				if (error) {
					reject(error)
				} else {
					resolve(entries)
				}
			})
		})
	}

	/**
	 * 读取指定文件的二进制内容
	 * @param path 要读取的文件路径
	 */
	readFile(path: string): Promise<Buffer>

	/**
	 * 读取指定文件的文本内容
	 * @param path 要读取的文件路径
	 * @param encoding 文件的编码
	 */
	readFile(path: string, encoding: BufferEncoding): Promise<string>

	readFile(path: string, encoding?: any) {
		return new Promise<string | Buffer>((resolve, reject) => {
			safeCall(readFile, [path, encoding], (error, data: string | Buffer) => {
				if (error) {
					reject(error)
				} else {
					resolve(data)
				}
			})
		})
	}

	/**
	 * 使用 UTF-8 编码读取指定的文本文件
	 * @param path 要读取的文件路径
	 * @param throwIfNotFound 如果文件不存在，是否抛出异常，如果值为 `false`，则文件不存在时返回 `null`
	 */
	async readText(path: string, throwIfNotFound: false): Promise<string | null>

	/**
	 * 使用 UTF-8 编码读取指定的文本文件
	 * @param path 要读取的文件路径
	 * @param throwIfNotFound 如果文件不存在，是否抛出异常，如果值为 `false`，则文件不存在时返回 `null`
	 */
	async readText(path: string, throwIfNotFound?: boolean): Promise<string>

	async readText(path: string, throwIfNotFound?: boolean) {
		try {
			return await this.readFile(path, "utf-8")
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
	writeFile(path: string, data: string | Buffer, overwrite = true) {
		return new Promise<boolean>((resolve, reject) => {
			safeCall(writeFile, [path, data, overwrite ? undefined : { flag: "wx" }], error => {
				if (error) {
					switch (error.code) {
						case "ENOENT":
							this.ensureDirExists(path).then(() => {
								this.writeFile(path, data, overwrite).then(resolve, reject)
							}, reject)
							break
						case "EEXIST":
							resolve(false)
							break
						default:
							reject(error)
							break
					}
				} else {
					resolve(true)
				}
			})
		})
	}

	/**
	 * 在指定文件末尾追加内容
	 * @param path 要创建的文件路径
	 * @param data 要写入的文件数据
	 */
	appendFile(path: string, data: string | Buffer) {
		return new Promise<void>((resolve, reject) => {
			safeCall(appendFile, [path, data], error => {
				if (error) {
					switch (error.code) {
						case "ENOENT":
							this.ensureDirExists(path).then(() => {
								this.appendFile(path, data).then(resolve, reject)
							}, reject)
							break
						default:
							reject(error)
							break
					}
				} else {
					resolve()
				}
			})
		})
	}

	/**
	 * 创建一个软链接
	 * @param path 要创建的文件路径
	 * @param target 要链接的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @returns 如果创建成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	createLink(path: string, target: string, overwrite = true) {
		return new Promise<boolean>((resolve, reject) => {
			const callback = (error: NodeJS.ErrnoException | null) => {
				if (error) {
					switch (error.code) {
						case "ENOENT":
							access(target, error2 => {
								if (error2) {
									reject(error)
								} else {
									this.ensureDirExists(path).then(() => {
										this.createLink(path, target, overwrite).then(resolve, reject)
									}, reject)
								}
							})
							break
						case "EEXIST":
							if (overwrite) {
								this.deleteFile(path).then(() => {
									this.createLink(path, target, false).then(resolve, reject)
								}, reject)
							} else {
								resolve(false)
							}
							break
						default:
							reject(error)
							break
					}
				} else {
					resolve(true)
				}
			}
			if (process.platform === "win32") {
				this.existsDir(target).then(isDir => {
					symlink(relative(dirname(path), target), path, isDir ? "dir" : "file", error => {
						// Windows 需要管理员权限才能创建软链接，尝试使用其它方式
						if (error && error.code === "EPERM") {
							if (isDir) {
								symlink(resolvePath(target), path, "junction", callback)
							} else {
								link(target, path, callback)
							}
						} else {
							callback(error)
						}
					})
				}, reject)
			} else {
				symlink(relative(dirname(path), target), path, callback)
			}
		})
	}

	/**
	 * 读取软链接的实际地址
	 * @param path 要读取的软链接路径
	 */
	readLink(path: string) {
		return new Promise<string>((resolve, reject) => {
			safeCall(readlink, [path], (error, link) => {
				if (error) {
					reject(error)
				} else {
					resolve(link)
				}
			})
		})
	}

	/**
	 * 创建一个用于读取指定文件的流
	 * @param path 要读取的文件路径
	 * @param options 附加选项
	 */
	createReadStream(path: string, options?: Parameters<typeof createReadStream>[1]) {
		return createReadStream(path, options)
	}

	/**
	 * 创建一个用于写入指定文件的流
	 * @param path 要读取的文件路径
	 * @param options 附加选项
	 */
	createWriteStream(path: string, options?: Parameters<typeof createWriteStream>[1]) {
		return createWriteStream(path, options)
	}

	/**
	 * 搜索匹配的文件
	 * @param pattern 要搜索的通配符
	 * @param search 搜索的源
	 * @param baseDir 搜索的根目录
	 * @param limit 限制匹配的数目
	 * @param followLinks 是否展开链接，默认 `false`
	 */
	async searchAllText(pattern: string, search: string | RegExp, baseDir?: string, limit?: number, followLinks?: boolean) {
		const regexp = typeof search === "string" ? new RegExp(escapeRegExp(search), "g") : search
		const result: SearchTextResult[] = []
		await this.walkGlob(pattern, async path => {
			if (result.length === limit) {
				return
			}
			const content = await this.readText(path)
			for (const match of content.matchAll(regexp)) {
				if (result.length === limit) {
					return
				}
				result.push({
					path,
					start: match.index,
					end: match.index + match[0].length,
					content,
				})
			}
		}, baseDir, !!followLinks)
		return result
	}

	/**
	 * 替换匹配的文件
	 * @param pattern 要搜索的通配符
	 * @param search 替换的源
	 * @param replacer 替换的目标
	 * @param followLinks 是否展开链接，默认 `false`
	 * @returns 返回受影响的文件数
	 */
	async replaceAllText(pattern: string, search: string | RegExp, replacer: string | ((source: string, ...args: any[]) => string), baseDir?: string, followLinks?: boolean) {
		const regexp = typeof search === "string" ? new RegExp(escapeRegExp(search), "g") : search
		let result = 0
		await this.walkGlob(pattern, async path => {
			const content = await this.readText(path)
			const repalced = replaceString(content, regexp, typeof search === "string" && typeof replacer !== "function" ? () => replacer : replacer)
			if (repalced !== null) {
				result++
				await this.writeFile(path, repalced)
			}
		}, baseDir, !!followLinks)
		return result
	}

	/**
	 * 复制指定的文件夹
	 * @param src 要复制的源路径
	 * @param dest 要复制的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @param preserveLinks 是否保留链接
	 * @returns 返回已复制的文件数
	 */
	copyDir(src: string, dest: string, overwrite = true, preserveLinks = true) {
		return new Promise<number>((resolve, reject) => {
			this.createDir(dest).then(() => {
				safeCall(readdir, [src, { withFileTypes: true }], (error, entries: Dirent[]) => {
					if (error) {
						reject(error)
					} else {
						let pending = entries.length
						if (pending) {
							let count = 0
							let promise: Promise<boolean | number>
							for (const entry of entries) {
								const fromChild = join(src, entry.name)
								const toChild = join(dest, entry.name)
								if (entry.isDirectory()) {
									promise = this.copyDir(fromChild, toChild, overwrite)
								} else if (preserveLinks && entry.isSymbolicLink()) {
									promise = this.copyLink(fromChild, toChild, overwrite)
								} else {
									promise = this.copyFile(fromChild, toChild, overwrite)
								}
								promise.then(childCount => {
									count += childCount as number
									if (--pending === 0) {
										resolve(count)
									}
								}, reject)
							}
						} else {
							resolve(0)
						}
					}
				})
			}, reject)
		})
	}

	/**
	 * 复制指定的文件
	 * @param src 要复制的源路径
	 * @param dest 要复制的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @returns 如果复制成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	copyFile(src: string, dest: string, overwrite = true) {
		return new Promise<boolean>((resolve, reject) => {
			safeCall(copyFile, [src, dest, overwrite ? undefined : constants.COPYFILE_EXCL], error => {
				if (error) {
					switch (error.code) {
						case "ENOENT":
							// 区分是源文件不存在还是目标目录不存在
							access(dest, error2 => {
								if (error2) {
									access(src, error3 => {
										if (error3) {
											reject(error)
										} else {
											this.ensureDirExists(dest).then(() => {
												this.copyFile(src, dest, false).then(resolve, reject)
											}, reject)
										}
									})
								} else {
									reject(error)
								}
							})
							break
						case "EEXIST":
							resolve(false)
							break
						default:
							reject(error)
							break
					}
				} else {
					resolve(true)
				}
			})
		})
	}

	/**
	 * 复制指定的软链接
	 * @param src 要复制的源路径
	 * @param dest 要复制的目标路径
	 * @param overwrite 是否覆盖已有的目标
	 * @returns 如果复制成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	async copyLink(src: string, dest: string, overwrite = true) {
		try {
			src = resolvePath(dirname(src), await this.readLink(src))
		} catch { }
		return this.createLink(dest, src, overwrite)
	}

	/**
	 * 移动指定的文件夹
	 * @param src 要移动的源路径
	 * @param dest 要移动的目标路径
	 * @param overwrite 是否允许覆盖现有的目标
	 * @returns 返回已移动的文件数
	 */
	moveDir(src: string, dest: string, overwrite = true, preserveLinks = true) {
		return new Promise<number>((resolve, reject) => {
			this.createDir(dest).then(() => {
				safeCall(readdir, [src, { withFileTypes: true }], (error, entries: Dirent[]) => {
					if (error) {
						reject(error)
					} else {
						let pending = entries.length
						if (pending) {
							let count = 0
							for (const entry of entries) {
								const fromChild = join(src, entry.name)
								const toChild = join(dest, entry.name)
								let promise: Promise<boolean | number>
								if (entry.isDirectory()) {
									promise = this.moveDir(fromChild, toChild, overwrite)
								} else if (preserveLinks && entry.isSymbolicLink()) {
									promise = this.moveLink(fromChild, toChild, overwrite)
								} else {
									promise = this.moveFile(fromChild, toChild, overwrite)
								}
								promise.then(childCount => {
									count += childCount as number
									if (--pending === 0) {
										this.deleteDir(src, false).then(() => {
											resolve(count)
										}, overwrite ? reject : (error: NodeJS.ErrnoException) => {
											if (error.code === "ENOTEMPTY") {
												resolve(count)
											} else {
												reject(error)
											}
										})
									}
								}, reject)
							}
						} else {
							this.deleteDir(src, false).then(() => {
								resolve(0)
							}, reject)
						}
					}
				})
			}, reject)
		})
	}

	/**
	 * 移动指定的文件
	 * @param src 要移动的源路径
	 * @param dest 要移动的目标路径
	 * @param overwrite 是否允许覆盖现有的目标
	 * @returns 如果移动成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	moveFile(src: string, dest: string, overwrite = true) {
		return new Promise<boolean>((resolve, reject) => {
			// 原生的 rename 会直接覆盖且不抛错误
			if (overwrite) {
				rename(src, dest, error => {
					if (error) {
						this.copyFile(src, dest).then(() => {
							this.deleteFile(src).then(() => {
								resolve(true)
							}, reject)
						}, reject)
					} else {
						resolve(true)
					}
				})
			} else {
				access(dest, error => {
					if (error) {
						if (error.code === "ENOENT") {
							this.moveFile(src, dest, true).then(resolve, reject)
						} else {
							reject(error)
						}
					} else {
						access(src, error => {
							if (error) {
								reject(error)
							} else {
								resolve(false)
							}
						})
					}
				})
			}
		})
	}

	/**
	 * 移动指定的软链接
	 * @param src 要移动的源路径
	 * @param dest 要移动的目标路径
	 * @param overwrite 是否允许覆盖现有的目标
	 * @returns 如果移动成功则返回 `true`，否则说明目标已存在，返回 `false`
	 */
	async moveLink(src: string, dest: string, overwrite = true) {
		const result = await this.copyLink(src, dest, overwrite)
		if (result) {
			await this.deleteFile(src)
			return true
		}
		return false
	}

	/**
	 * 获取指定路径区分大小写的实际路径，如果地址不存在则返回 `null`
	 * @param path 原路径
	 */
	getRealPath(path: string) {
		return new Promise<string | null>((resolve, reject) => {
			safeCall(realpath.native, [path], (error, link) => {
				if (error) {
					if (error.code === "ENOENT") {
						resolve(null)
					} else {
						reject(error)
					}
				} else {
					resolve(link)
				}
			})
		})
	}

}

/** 表示遍历文件或文件夹的选项 */
export interface WalkOptions {
	/**
	 * 如果为 `true` 则软链接被解析为实际的路径，否则不解析软链接
	 * @default true
	 */
	follow?: boolean
	/**
	 * 处理错误的回调函数
	 * @param error 错误对象
	 * @param path 出现错误的路径
	 * @param stats 文件的属性
	 */
	error?(error: NodeJS.ErrnoException, path: string, stats?: Dirent | Stats): any
	/**
	 * 处理一个文件夹的回调函数，如果函数返回 `false` 则跳过遍历此文件夹
	 * @param path 当前文件夹的路径
	 * @param entries 当前文件夹下的所有项
	 * @param stats 文件的属性
	 */
	dir?(path: string, entries: Dirent[], stats?: Dirent | Stats): any
	/**
	 * 处理一个文件的回调函数
	 * @param path 当前文件的路径
	 * @param stats 文件的属性
	 */
	file?(path: string, stats: Dirent | Stats): any
	/**
	 * 处理一个其它类型文件（如软链接）的回调函数
	 * @param path 当前文件的路径
	 * @param stats 文件的属性
	 */
	other?(path: string, stats: Dirent | Stats): any
}

/** 表示一个搜索结果 */
export interface SearchTextResult {
	/** 文件路径 */
	path: string
	/** 文件中匹配结果的开始索引 */
	start: number
	/** 文件中匹配结果的结束索引 */
	end: number
	/** 文件源码 */
	content: string
}

/** 安全调用系统 IO 函数，如果出现 EMFILE 错误则自动延时 */
function safeCall(func: DelayedCall["syscall"], args: DelayedCall["arguments"], callback: DelayedCall["callback"]) {
	func(...args, (error: NodeJS.ErrnoException, data: any) => {
		if (error) {
			switch (error.code) {
				case "EMFILE":
				case "ENFILE":
					delay(func, args, callback)
					break
				case "EAGAIN":
					safeCall(func, args, callback)
					break
				default:
					resume()
					callback(error, data)
					break
			}
		} else {
			resume()
			callback(error, data)
		}
	})
}

/** 表示一个延时调用 */
interface DelayedCall {
	/** 调用的函数 */
	syscall: (...args: readonly any[]) => void
	/** 调用的参数 */
	arguments: readonly any[]
	/** 调用的回调函数 */
	callback: (error: NodeJS.ErrnoException, data: any) => void
	/** 下一个调用 */
	next?: DelayedCall
}

/** 一个已延时的调用链表尾 */
var delayedCallQueue: DelayedCall | undefined

/** 全局回调计时器 */
var delayedCallTimer: ReturnType<typeof setTimeout> | undefined

/** 延时执行指定的调用 */
function delay(func: DelayedCall["syscall"], args: DelayedCall["arguments"], callback: DelayedCall["callback"]) {
	// 为节约内存，所有延时调用使用单链表保存
	const delayedCall: DelayedCall = { syscall: func, arguments: args, callback }
	if (delayedCallQueue) {
		delayedCall.next = delayedCallQueue.next
		delayedCallQueue = delayedCallQueue.next = delayedCall
	} else {
		delayedCallQueue = delayedCall.next = delayedCall
	}
	// 假设系统允许最多同时打开 1000 个文件句柄，那么第 1001 次会触发 EMFILE 错误，这次调用会被延时
	// 如果前 1000 次都是由 `safeCall` 发起的，那么在每次句柄释放后都会主动调用 `resume` 执行延时的操作
	// 但如果前 1000 次是用户直接调用（比如通过 `fs.read`）的，那么 `resume` 就永远不会被调用，即使句柄已经释放了
	// 为确保 `resume` 函数被执行，等待几秒后自动重试
	if (delayedCallTimer) {
		clearTimeout(delayedCallTimer)
	}
	delayedCallTimer = setTimeout(resume, 3000)
}

/** 恢复执行一个已延时的调用 */
function resume() {
	if (delayedCallQueue) {
		const head = delayedCallQueue.next!
		if (head === delayedCallQueue) {
			delayedCallQueue = undefined
		} else {
			delayedCallQueue.next = head.next
		}
		safeCall(head.syscall, head.arguments, head.callback)
		// 如果所有延时操作都已执行完成，则删除计时器
		if (!delayedCallQueue && delayedCallTimer) {
			clearTimeout(delayedCallTimer)
			delayedCallTimer = undefined
		}
	}
}