import { EventEmitter } from "events"
import { FSWatcher, readdir, stat, Stats, unwatchFile, watch, watchFile } from "fs"
import { Matcher, Pattern } from "./matcher"
import { containsPath, getExt, joinPath, normalizePath } from "./path"

/**
 * 表示一个文件系统监听器
 * @description
 * 本监听器的设计目标是：只针对常见场景，提供轻量、高效、稳定的实现，确保占用 CPU 极低且占用内存极小
 *
 * 1. 完全基于原生的 `fs.watch` 实现，低于 Node 10.12 版本不保证稳定性
 * 2. 可监听文件或文件夹（同时监听子文件夹），可动态调整监听列表，但监听的根路径必须已存在且不能删除
 * 3. 仅支持文件的增、删、改事件和文件夹的增、删事件，重命名操作会按先删除后创建处理
 * 4. 文件软链和硬链始终会被替换为链接的目标路径，循环链接会引发错误
 * 5. 在不支持 `fs.watch` 的系统（比如虚拟机）可开启 `usePolling`（基于原生 `fs.watchFile` 实现），但这会占用较高 CPU
 *
 * 如果以上不符合你的需求，请考虑使用 [chokidar](https://www.npmjs.com/package/chokidar)
 *
 * @example
 * const watcher = new FileSystemWatcher()
 * watcher.on("change", path => { console.log("Changed", path) })
 * watcher.on("delete", path => { console.log("Deleted", path) })
 * watcher.on("create", path => { console.log("Created", path) })
 * watcher.add(process.cwd(), () => { console.log("Start Watching...") })
 */
export class FileSystemWatcher extends EventEmitter {

	// #region 添加

	/**
	 * 初始化新的监听器
	 * @param options 附加选项
	 */
	constructor(options?: FileSystemWatcherOptions) {
		super()
		if (options) {
			if (options.delay !== undefined) {
				this.delay = options.delay
			}
			if (options.usePolling) {
				this.usePolling = true
				this.watchOptions.recursive = false
				if (options.interval !== undefined) {
					this.watchOptions.interval = options.interval
				}
				this._createWatcher = this._createPollingWatcher
			}
			if (options.persistent !== undefined) {
				this.watchOptions.persistent = options.persistent
			}
		}
		// FIXME: OSX 需要比较时间？
		this.compareModifyTime = options?.compareModifyTime ?? process.platform === "win32"
		this.ignoreMatcher = new Matcher(options?.ignore ?? [".DS_Store", "Desktop.ini", "Thumbs.db", "ehthumbs.db", "*~", "*.tmp", ".git", ".vs"], process.cwd())
	}

	/** 所有原生监听器对象，键为监听的路径，值为原生监听器对象 */
	private readonly _watchers = new Map<string, FSWatcher>()

	/**
	 * 添加要监听的文件或文件夹
	 * @param path 要添加的文件或文件夹路径
	 * @param callback 添加完成的回调函数，在回调执行前无法监听到文件的修改
	 * @param callback.error 如果添加成功则为空，否则为错误对象
	 */
	add(path: string, callback?: (error: NodeJS.ErrnoException | null) => void) {
		path = normalizePath(path)
		// 不重复监听相同路径
		if (this._watchers.has(path)) {
			callback?.(null)
			return false
		}
		if (this.watchOptions.recursive) {
			for (const key of this._watchers.keys()) {
				// 如果已监听父文件夹，则忽略当前路径
				if (containsPath(key, path)) {
					callback?.(null)
					return false
				}
				// 如果已监听子文件或文件夹，则替换之
				if (containsPath(path, key)) {
					this._deleteWatcher(key)
				}
			}
		}
		try {
			this._createWatcher(path, true, callback)
		} catch (e) {
			callback?.(e)
			return false
		}
		return true
	}

	/** 判断是否强制使用轮询监听，轮询监听可以支持更多的文件系统，但会占用大量 CPU */
	readonly usePolling = process.platform !== "win32" && process.platform !== "darwin" && process.platform !== "linux" && process.platform !== "aix"

	/** 获取或设置传递给原生监听器的选项 */
	watchOptions = {
		/** 是否在监听时阻止进程退出 */
		persistent: true,
		/** 是否使用原生的递归监听支持 */
		recursive: process.platform === "win32" || process.platform === "darwin",
		/** 轮询的间隔毫秒数 */
		interval: 500,
	}

	/**
	 * 创建指定路径的原生监听器
	 * @param path 要监听的文件或文件夹路径
	 * @param initStats 是否初始化路径对应的状态
	 * @param callback 创建完成的回调函数，在回调执行前无法监听到文件的修改
	 * @param callback.error 如果创建成功则为空，否则为相关的错误
	 * @returns 返回监听器
	 */
	private _createWatcher(path: string, initStats?: boolean, callback?: (error: NodeJS.ErrnoException | null) => void) {
		const watcher = watch(path || ".", this.watchOptions).on("error", (error: NodeJS.ErrnoException) => {
			// Windows 下删除监听的空根文件夹引发 EPERM 错误
			if (error.code === "EPERM" && process.platform === "win32" && (error as any).filename === null) {
				return
			}
			this.onError(error, path)
		})
		this._watchers.set(path, watcher)
		const initWatcher = () => {
			watcher.on("change", typeof this._stats.get(path) === "number" ? () => {
				this.handleWatchChange(path)
			} : (event, fileName) => {
				// `event` 的值可能是 `rename` 或 `change`，`rename` 指创建、删除或重命名文件，`change` 指修改文件内容
				// 但有些 IDE 如果启用“安全保存”，则保存文件时会先新建临时文件，然后执行重命名，这会使得修改文件时也触发 `rename`
				// 因此无法通过 `rename` 区分实际的文件操作
				// 官方文档中描述 `fileName` 可能为空，但在 Node 10.12+ 中，Windows/MacOS/Linux/AIX 下 `fileName` 不可能为空
				// https://github.com/nodejs/node/blob/master/test/parallel/test-fs-watch.js
				if (fileName) {
					this.handleWatchChange(joinPath(path, fileName as string))
				} else {
					this.handleWatchChange(path)
				}
			})
			callback?.(null)
		}
		if (initStats) {
			this._initStats(path, getExt(path).length > 0, initWatcher)
		} else {
			initWatcher()
		}
		return watcher
	}

	/**
	 * 创建指定路径的轮询监听器
	 * @param path 要监听的文件或文件夹路径
	 * @param initStats 是否初始化路径对应的状态
	 * @param callback 创建完成的回调函数，在回调执行前无法监听到文件的修改
	 * @param callback.error 如果创建成功则为空，否则为相关的错误
	 * @returns 返回监听器
	 */
	private _createPollingWatcher(path: string, initStats?: boolean, callback?: (error: NodeJS.ErrnoException | null) => void) {
		const watcher: any = (stats: Stats, prevStats: Stats) => {
			// 理论上可以直接使用 stats，避免重新执行 fs.stat，但 usePolling 不常用且本身有性能问题，为简化程序，忽略 stats
			if (stats.size !== prevStats.size || stats.mtimeMs !== prevStats.mtimeMs || stats.mtimeMs === 0) {
				this.handleWatchChange(path)
			}
		}
		watcher.close = () => {
			unwatchFile(path, watcher)
		}
		watchFile(path, this.watchOptions, watcher)
		this._watchers.set(path, watcher)
		if (initStats) {
			this._initStats(path, getExt(path).length > 0, callback)
		} else {
			callback?.(null)
		}
		return watcher
	}

	/**
	 * 所有文件或文件夹状态，对象的键是路径
	 * - 如果路径是一个文件，则值为文件的最后修改时间戳
	 * - 如果路径是一个文件夹，则值为所有直接子文件和子文件夹的名称数组
	 */
	private readonly _stats = new Map<string, string[] | number>()

	/** 正在执行的异步任务数 */
	private _pending = 0

	/**
	 * 初始化指定文件或文件夹的状态
	 * @param path 要添加的文件或文件夹路径
	 * @param isFile 是否优先将路径作为文件处理
	 * @param callback 已添加完成的回调函数
	 * @param depth 遍历的深度
	 */
	private _initStats(path: string, isFile: boolean, callback?: (error: NodeJS.ErrnoException | null) => void) {
		this._pending++
		if (isFile) {
			stat(path, (error, stats) => {
				if (error) {
					callback?.(error)
				} else if (stats.isFile()) {
					this._stats.set(path, stats.mtimeMs)
					if (this.usePolling && this.isWatching && !this._watchers.has(path)) {
						this._createPollingWatcher(path)
					}
					callback?.(null)
				} else if (stats.isDirectory()) {
					this._initStats(path, false, callback)
				}
				if (--this._pending === 0) {
					this._emitReady()
				}
			})
		} else {
			readdir(path, (error, entries) => {
				if (error) {
					if (error.code === "ENOTDIR" || error.code === "EEXIST") {
						this._initStats(path, true, callback)
					} else if (error.code === "EMFILE" || error.code === "ENFILE") {
						this._pending++
						setTimeout(() => {
							this._initStats(path, false, callback)
							if (--this._pending === 0) {
								this._emitReady()
							}
						}, this.delay)
					} else {
						callback?.(error)
					}
				} else {
					this._stats.set(path, entries)
					let firstError: NodeJS.ErrnoException | null = null
					if (!this.watchOptions.recursive && this.isWatching && !this._watchers.has(path)) {
						try {
							this._createWatcher(path)
						} catch (e) {
							firstError = e
						}
					}
					let pending = 0
					for (const entry of entries) {
						const child = joinPath(path, entry)
						if (this.ignored(child)) {
							continue
						}
						pending++
						this._initStats(child, entry.includes(".", 1), error => {
							if (error && !firstError) {
								firstError = error
							}
							if (--pending === 0) {
								callback?.(firstError)
							}
						})
					}
					if (pending === 0) {
						callback?.(firstError)
					}
				}
				if (--this._pending === 0) {
					this._emitReady()
				}
			})
		}
	}

	/** 通知所有异步任务已执行结束 */
	private _emitReady() {
		// 如果期间存在新的文件改动，则继续更新
		if (this._pendingUpdates.size) {
			this._emitUpdates()
		} else {
			this.onReady()
		}
	}

	/**
	 * 当所有异步任务已执行结束执行
	 */
	protected onReady() { this.emit("ready") }

	/**
	 * 等待所有异步任务都完成后执行指定的回调函数
	 * @param callback 要执行的回调函数
	 */
	ready(callback: () => void) {
		if (this._pending > 0) {
			this.once("ready", callback)
		} else {
			callback()
		}
	}

	/** 忽略匹配器 */
	readonly ignoreMatcher: Matcher

	/**
	 * 判断是否忽略指定的路径
	 * @param path 要判断的文件或文件夹路径，路径的分隔符同操作系统
	 */
	ignored(path: string) {
		return this.ignoreMatcher.test(path)
	}

	/**
	 * 判断是否正在监听指定的文件或文件夹
	 * @param path 要判断的路径
	 */
	isWatchingPath(path: string) {
		path = normalizePath(path)
		for (const key of this._watchers.keys()) {
			if (containsPath(key, path)) {
				return true
			}
		}
		return false
	}

	/** 判断当前监听器是否正在监听 */
	get isWatching() { return this._watchers.size > 0 }

	// #endregion

	// #region 移除

	/**
	 * 移除指定路径的监听器
	 * @param path 要移除的文件或文件夹路径
	 * @param callback 移除完成后的回调函数
	 * @description 注意如果已监听路径所在的文件夹，移除操作将无效
	 */
	remove(path: string, callback?: () => void) {
		path = normalizePath(path)
		if (this.watchOptions.recursive) {
			this._deleteWatcher(path)
			if (this.isWatchingPath(path)) {
				callback?.()
				return false
			}
		} else {
			// 如果存在根监听器，不允许删除
			for (const key of this._watchers.keys()) {
				if (containsPath(key, path) && key !== path) {
					callback?.()
					return false
				}
			}
			// 删除当前监听器和子监听器
			for (const key of this._watchers.keys()) {
				if (containsPath(path, key)) {
					this._deleteWatcher(key)
				}
			}
		}
		// 移除不再监听的文件状态
		this.ready(() => {
			for (const key of this._stats.keys()) {
				if (containsPath(path, key)) {
					this._stats.delete(key)
				}
			}
			callback?.()
		})
		return true
	}

	/**
	 * 删除指定路径的原生监听器
	 * @param path 要删除监听的文件或文件夹路径
	 */
	private _deleteWatcher(path: string) {
		const watcher = this._watchers.get(path)
		if (watcher) {
			// Windows: Node 10.0-10.4：调用 close() 会导致进程崩溃
			watcher.close()
			this._watchers.delete(path)
		}
	}

	/**
	 * 移除已添加的所有监听器
	 * @param callback 移除完成后的回调函数
	 */
	close(callback?: () => void) {
		for (const key of this._watchers.keys()) {
			this._deleteWatcher(key)
		}
		if (this._emitUpdatesTimer) {
			clearTimeout(this._emitUpdatesTimer)
			this._emitUpdatesTimer = undefined
		}
		this._pendingUpdates.clear()
		this.ready(() => {
			this._stats.clear()
			callback?.()
		})
	}

	// #endregion

	// #region 更新

	/** 暂停更新的次数 */
	private _pauseCount = 0

	/** 判断当前监听器是否已赞同触发事件 */
	get paused() { return this._pauseCount > 0 }

	/** 暂停触发监听事件 */
	pause() {
		this._pauseCount++
	}

	/** 恢复触发监听事件 */
	resume() {
		if (--this._pauseCount === 0 && this._pendingUpdates.size && !this._emitUpdatesTimer) {
			this._emitUpdates()
		}
	}

	/** 所有已更新但未处理的文件或文件夹路径 */
	private _pendingUpdates = new Set<string>()

	/** 是否正在使用 _pendingUpdates */
	private _pendingUpdatesLocked = false

	/** 等待处理更新的计时器 */
	private _emitUpdatesTimer?: ReturnType<typeof setTimeout>

	/** 获取或设置监听延时回调的毫秒数 */
	delay = 380

	/** 判断或设置是否仅当文件的最后修改时间发生变化才触发更新 */
	compareModifyTime: boolean

	/**
	 * 处理原生更改事件
	 * @param path 更改的文件或文件夹路径
	 */
	protected handleWatchChange(path: string) {
		// 如果用户明确不需要监听某些文件，在源头彻底忽略它们可以提升性能
		if (this.ignored(path)) {
			return
		}
		// 处理更新期间需要使用 _pendingUpdates，如果正在处理更新，需要申请新的 _pendingUpdates
		if (this._pendingUpdatesLocked) {
			this._pendingUpdates = new Set()
			this._pendingUpdatesLocked = false
		}
		// 添加到列表
		this._pendingUpdates.add(path)
		if (this._emitUpdatesTimer || this._pending > 0 || this._pauseCount > 0) {
			return
		}
		this._emitUpdatesTimer = setTimeout(this._emitUpdates, this.delay)
	}

	/** 处理所有更新 */
	private _emitUpdates = () => {
		this._emitUpdatesTimer = undefined
		// 实际更新到处理更新期间被暂停更新
		if (this._pauseCount > 0) {
			return
		}
		// 锁定 _pendingUpdates 避免在处理更新时被修改
		this._pendingUpdatesLocked = true
		const pendingUpdates = this._pendingUpdates
		for (const pendingChange of pendingUpdates) {
			const stats = this._stats.get(pendingChange)
			this._emitUpdate(pendingChange, stats === undefined ? pendingChange.includes(".") : typeof stats === "number", !this.compareModifyTime, pendingUpdates)
		}
	}

	/**
	 * 更新指定文件或文件夹的状态
	 * @param path 要更新的文件或文件夹路径
	 * @param isFile 是否优先将路径作为文件处理
	 * @param force 是否强制更新文件
	 * @param pendingUpdates 本次同时更新的所有路径，提供此参数可避免重复更新
	 */
	private _emitUpdate(path: string, isFile: boolean, force: boolean, pendingUpdates: Set<string>) {
		this._pending++
		if (isFile) {
			stat(path, (error, stats) => {
				if (error) {
					if (error.code === "ENOENT") {
						// * -> 不存在
						this._emitDelete(path, pendingUpdates)
					} else {
						this.onError(error, path)
					}
				} else if (stats.isFile()) {
					// * -> 文件
					const prevStats = this._stats.get(path)
					const newWriteTime = stats.mtimeMs
					if (typeof prevStats === "number") {
						// 文件 -> 文件
						if (force || prevStats !== newWriteTime) {
							this._stats.set(path, newWriteTime)
							this.onChange(path, stats, prevStats)
						}
					} else {
						// * -> 文件
						if (prevStats !== undefined) {
							this._emitDelete(path, pendingUpdates)
						}
						// 轮询需要将每个文件加入监听
						if (this.usePolling && this.isWatching && !this._watchers.has(path)) {
							try {
								this._createPollingWatcher(path)
							} catch (e) {
								this.onError(e, path)
							}
						}
						this._stats.set(path, newWriteTime)
						this.onCreate(path, stats)
					}
				} else if (stats.isDirectory()) {
					// * -> 文件夹
					this._emitUpdate(path, false, force, pendingUpdates)
				}
				if (--this._pending === 0) {
					this._endUpdate()
				}
			})
		} else {
			readdir(path, (error, entries) => {
				if (error) {
					if (error.code === "ENOENT") {
						// * -> 不存在
						this._emitDelete(path, pendingUpdates)
					} else if (error.code === "ENOTDIR" || error.code === "EEXIST") {
						// * -> 文件
						this._emitUpdate(path, true, force, pendingUpdates)
					} else if (error.code === "EMFILE" || error.code === "ENFILE") {
						this._pending++
						setTimeout(() => {
							this._emitUpdate(path, isFile, force, pendingUpdates)
							if (--this._pending === 0) {
								this._endUpdate()
							}
						}, this.delay)
					} else {
						this.onError(error, path)
					}
				} else {
					const prevStats = this._stats.get(path)
					if (typeof prevStats === "object") {
						this._stats.set(path, entries)
						// 查找删除的文件
						for (const entry of prevStats) {
							if (entries.includes(entry)) {
								continue
							}
							this._emitDelete(joinPath(path, entry), pendingUpdates)
						}
						// 轮询模式需手动查找新增的文件
						if (this.usePolling) {
							for (const entry of entries) {
								if (prevStats.includes(entry)) {
									continue
								}
								const child = joinPath(path, entry)
								if (this.ignored(child)) {
									continue
								}
								this._emitUpdate(child, entry.includes(".", 1), false, pendingUpdates)
							}
						}
						// 其它情况无需处理文件夹的修改事件，如果文件被修改或新文件创建，将会触发相应文件的事件
					} else {
						// * -> 文件夹
						if (prevStats !== undefined) {
							this._emitDelete(path, pendingUpdates)
						}
						// 非递归模式需要将每个文件夹加入监听
						this._stats.set(path, entries)
						if (!this.watchOptions.recursive && this.isWatching && !this._watchers.has(path)) {
							try {
								this._createWatcher(path)
							} catch (e) {
								this.onError(e, path)
							}
						}
						this.onCreateDir(path, entries)
						for (const entry of entries) {
							const child = joinPath(path, entry)
							if (this.ignored(child) || pendingUpdates.has(child)) {
								continue
							}
							const childStats = this._stats.get(child)
							this._emitUpdate(child, childStats !== undefined ? typeof childStats === "number" : entry.includes(".", 1), false, pendingUpdates)
						}
					}
				}
				if (--this._pending === 0) {
					this._endUpdate()
				}
			})
		}
	}

	/**
	 * 删除指定文件或文件夹
	 * @param path 要删除的文件或文件夹路径
	 * @param pendingUpdates 本次同时更新的所有路径，提供此参数可避免重复更新
	 */
	private _emitDelete(path: string, pendingUpdates: Set<string>) {
		// 不处理未添加的路径
		const prevStats = this._stats.get(path)
		if (prevStats === undefined) {
			return
		}
		// 更新路径对应的监听器
		this._deleteWatcher(path)
		this._stats.delete(path)
		if (typeof prevStats === "number") {
			this.onDelete(path, prevStats)
		} else {
			for (const entry of prevStats) {
				const child = joinPath(path, entry)
				if (pendingUpdates.has(child)) {
					continue
				}
				this._emitDelete(child, pendingUpdates)
			}
			this.onDeleteDir(path, prevStats)
		}
	}

	/** 通知更新结束 */
	private _endUpdate() {
		// 如果锁被解开，说明更新期间又有新的改动
		if (this._pendingUpdatesLocked) {
			this._pendingUpdates.clear()
			this._pendingUpdatesLocked = false
		}
		this._emitReady()
	}

	/**
	 * 当监听到文件夹创建后执行
	 * @param path 相关的文件夹路径
	 * @param entries 文件夹内的文件列表
	 */
	protected onCreateDir(path: string, entries: string[]) { this.emit("createDir", path, entries) }

	/**
	 * 当监听到文件夹删除后执行
	 * @param path 相关的文件夹路径
	 * @param prevEntries 文件夹被删除前的文件列表
	 */
	protected onDeleteDir(path: string, prevEntries: string[]) { this.emit("deleteDir", path, prevEntries) }

	/**
	 * 当监听到文件创建后执行
	 * @param path 相关的文件路径
	 * @param stats 文件属性对象
	 */
	protected onCreate(path: string, stats: Stats) { this.emit("create", path, stats) }

	/**
	 * 当监听到文件修改后执行
	 * @param path 相关的文件路径
	 * @param stats 相关的文件属性对象
	 * @param prevWriteTime 文件的上一次修改时间戳
	 */
	protected onChange(path: string, stats: Stats, prevWriteTime: number) { this.emit("change", path, stats, prevWriteTime) }

	/**
	 * 当监听到文件删除后执行
	 * @param path 相关的文件路径
	 * @param prevWriteTime 文件被删除前最后一次的修改时间戳
	 */
	protected onDelete(path: string, prevWriteTime: number) { this.emit("delete", path, prevWriteTime) }

	/**
	 * 当监听发生错误后执行
	 * @param error 相关的错误对象
	 * @param path 原始监听的路径
	 */
	protected onError(error: NodeJS.ErrnoException, path: string) {
		if (this.listenerCount("error")) {
			this.emit("error", error, path)
		}
	}

	// #endregion

}

/** 表示监听器的附加选项 */
export interface FileSystemWatcherOptions {
	/**
	 * 监听延时回调的毫秒数
	 * @description 设置一定的延时可以避免在短时间内重复处理相同的文件
	 * @default 2500
	 */
	delay?: number
	/**
	 * 是否在监听时阻止进程退出
	 * @default true
	 */
	persistent?: boolean
	/**
	 * 是否强制使用轮询监听，轮询监听可以支持更多的文件系统，但会占用大量 CPU
	 * @default process.platform !== "win32" && process.platform !== "darwin" && process.platform !== "linux" && process.platform !== "aix"
	 */
	usePolling?: boolean
	/**
	 * 轮询的间隔毫秒数
	 * @default 512
	 */
	interval?: number
	/**
	 * 是否仅当文件的最后修改时间发生变化才触发更新
	 * @default false
	 */
	compareModifyTime?: boolean
	/**
	 * 指定监听时忽略哪些文件，可以是通配符或正则表达式
	 * @default [".DS_Store", "Desktop.ini", "Thumbs.db", "ehthumbs.db", "*~", "*.tmp", ".git", ".vs"]
	 */
	ignore?: Pattern
}