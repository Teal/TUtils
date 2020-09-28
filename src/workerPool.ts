import { MessagePort, Worker as NativeWorker, WorkerOptions } from "worker_threads"

/** 表示一个线程池 */
export class WorkerPool {

	/** 获取在子线程执行的代码 */
	readonly workerCode: string

	/** 获取创建子线程的附加选项 */
	readonly workerOptions: WorkerOptions

	/** 获取允许创建的最大子线程数, 如果为 0 表示不启用线程 */
	readonly size: number

	/**
	 * 初始化新的线程池
	 * @param worker 要在子线程执行的函数，函数不可使用闭包
	 * @param worker.data 由主线程发送的附加数据
	 * @param worker.context 子线程的上下文对象
	 * @param worker.return 返回回传给主线程的对象
	 * @param options 附加选项
	 */
	constructor(worker: (data: any, context: WorkerContext) => any, options?: WorkerPoolOptions) {
		// 只有 Node v11.5+ 默认支持线程，对于不支持的版本，强制设置 size 为 0，关闭多线程
		let size = options?.size
		if (supportWorker()) {
			if (size === undefined) size = Math.ceil(require("os").cpus().length / 2)
		} else {
			size = 0
		}
		this.size = size
		this.functions = options?.functions
		this.workerOptions = { ...options, eval: true }
		// 内部父子线程通信协议：
		// 主线程发送：
		// 1) [0, 参数]: 调用子线程主函数
		// 2) [1, 调用ID, 函数名, 参数]: 调用子线程其它函数
		// 3) [2, 调用ID, 数据]: 通知子线程调用成功
		// 4) [-3, 调用ID, 错误信息]: 通知子线程调用出错
		// 子线程发送：
		// 1) [0, 数据]: 通知主线程调用成功
		// 2) [-1, 错误信息]: 通知主线程调用出错
		// 3) [1, 调用ID, 函数名，参数]: 调用主线程其它函数
		// 4) [2, 调用ID, 数据]: 通知主线程调用成功
		// 5) [-3, 调用ID, 错误信息]: 通知主线程调用出错
		this.workerCode = `(worker => {
	const {isMainThread, parentPort, workerData} = require("worker_threads")
	process.on("uncaughtException", error => {
		console.error(error)
		process.exit(-1)
	})
	process.on("unhandledRejection", error => {
		console.error(error)
		process.exit(-1)
	})
	let remoteCallId = 0
	const remoteCalls = new Map()
	const context = {
		isMainThread,
		workerData,
		call(name, data, transferList) {
			return new Promise((resolve, reject) => {
				const callId = remoteCallId++
				remoteCalls.set(callId, [resolve, reject])
				try {
					parentPort.postMessage([1, callId, name, data], transferList)
				} catch (e) {
					reject({name: e.name, message: "Cannot send data to main thread: " + e.message, stack: e.stack })
				}
			})
		},
		transferList: undefined
	}
	parentPort.on("message", async data => {
		const code = data[0]
		if (code) {
			const callId = data[1]
			const remoteCall = remoteCalls.get(callId)
			if (remoteCall) {
				remoteCalls.delete(callId)
				remoteCall[code > 0 ? 0 : 1](data[2])
			}
			return
		}
		try {
			data[1] = await worker(data[1], context)
		} catch (e) {
			data[0] = -1
			data[1] = e instanceof Error ? {name: e.name, message: e.message, stack: e.stack, code: e.code } : String(e)
		}
		try {
			const transferList = context.transferList
			if (transferList) {
				context.transferList = undefined
				parentPort.postMessage(data, transferList)
			} else {
				parentPort.postMessage(data)
			}
		} catch (e) {
			data[0] = -1
			data[1] = {name: e.name, message: "Cannot send data to main thread: " + e.message, stack: e.stack }
			parentPort.postMessage(data)
		}
	})
})(${worker})`
		if (size <= 0) {
			const context: WorkerContext = {
				isMainThread: true,
				workerData: this.workerOptions.workerData,
				call: async (name, data) => await this.onCall(name, data, []),
				set transferList(value: (ArrayBuffer | MessagePort)[]) { }
			}
			this.exec = async data => await worker(data, context)
		}
	}

	/** 获取所有子线程 */
	readonly workers: Worker[] = []

	/** 正在排队的第一个任务，如果没有任务正在执行则为 `undefined` */
	private _firstTask?: {
		readonly data?: any
		readonly transferList?: (ArrayBuffer | MessagePort)[]
		readonly resolve: (value: any) => void
		readonly reject: (reason: any) => void
		next?: WorkerPool["_firstTask"]
	}

	/** 正在排队的最后一个异步任务，如果没有任务正在排队则为 `undefined` */
	private _lastTask?: WorkerPool["_firstTask"]

	/**
	 * 在子线程中执行任务
	 * @param data 传递给子线程的数据，数据的类型必须可复制
	 * @param transferList 要移动的内存对象，移动后当前线程将无法使用该对象，如果未设置，则对象将被复制到其它线程
	 */
	exec(data?: any, transferList?: (ArrayBuffer | MessagePort)[]) {
		// 先使用空闲的线程
		const idleWorker = this.workers.find(worker => !worker.running) || (this.workers.length < this.size ? this.createNativeWorker() as Worker : null)
		if (idleWorker) {
			return this._execWorker(idleWorker, data, transferList)
		}
		// 排队等待
		return new Promise<any>((resolve, reject) => {
			const nextTask = { data, transferList, resolve, reject }
			if (this._lastTask) {
				this._lastTask = this._lastTask.next = nextTask
			} else {
				this._firstTask = this._lastTask = nextTask
			}
		})
	}

	/**
	 * 创建原生子线程
	 */
	protected createNativeWorker() {
		const worker = new ((require("worker_threads") as typeof import("worker_threads")).Worker)(this.workerCode, this.workerOptions)
		worker.unref()
		this.workers.push(worker)
		const removeSelf = () => {
			const index = this.workers.indexOf(worker)
			if (index >= 0) {
				this.workers.splice(index, 1)
			}
		}
		worker.on("exit", removeSelf)
		worker.on("error", removeSelf)
		return worker
	}

	/**
	 * 在指定的子线程执行任务
	 * @param worker 要使用的子线程
	 * @param data 传递给子线程的数据，数据的类型必须可复制
	 * @param transferList 要移动的内存对象，移动后当前线程将无法使用该对象，如果未设置，则对象将被复制到其它线程
	 */
	private _execWorker(worker: Worker, data?: any, transferList?: (ArrayBuffer | MessagePort)[]) {
		worker.running = true
		return new Promise<any>((resolve, reject) => {
			const handleMessage = async (data: any[]) => {
				const code = data[0]
				if (code === 1) {
					const transferList: (ArrayBuffer | MessagePort)[] = []
					try {
						data[2] = await this.onCall(data[2], data[3], transferList, worker)
						data[0] = 2
					} catch (e) {
						data[2] = e instanceof Error ? { name: e.name, message: e.message, stack: e.stack, code: (e as any).code, filename: (e as any).filename } : String(e)
						data[0] = -3
					}
					data.length = 3
					try {
						worker.postMessage(data, transferList)
					} catch (e) {
						data[2] = { name: e.name, message: `Cannot send data to child thread: ${e.message}`, stack: e.stack }
						data[0] = -3
						worker.postMessage(data)
					}
					return
				}
				worker.off("message", handleMessage)
				worker.off("error", handleError)
				worker.off("exit", handleExit)
				worker.running = false
				if (code) {
					reject(data[1])
				} else {
					resolve(data[1])
				}
				// 当前线程已空闲，尝试执行下一个任务
				const currentTask = this._firstTask
				if (currentTask) {
					const nextTask = this._firstTask = currentTask.next
					if (!nextTask) {
						this._lastTask = this._firstTask = undefined
					}
					this._execWorker(code === 0 ? worker : this.createNativeWorker(), currentTask.data, currentTask.transferList).then(currentTask.resolve, currentTask.reject)
				}
			}
			const handleError = (error: Error) => {
				handleMessage([-11, error])
			}
			const handleExit = (code: number) => {
				handleMessage([-10, new Error(`The worker exited with code '${code}'`)])
			}
			worker.on("message", handleMessage)
			worker.on("error", handleError)
			worker.on("exit", handleExit)
			try {
				worker.postMessage([0, data], transferList)
			} catch (e) {
				reject({
					name: e.name,
					message: `Cannot send data to child thread: ${e.message}`,
					stack: e.stack
				})
			}
		})
	}

	/** 获取供子线程调用的全局函数 */
	readonly functions?: { [name: string]: (data: any, transferList: (ArrayBuffer | MessagePort)[], worker?: Worker) => any }

	/**
	 * 当收到子线程的远程调用后执行
	 * @param name 要调用的函数名
	 * @param data 要调用的函数参数
	 * @param transferList 设置要移动的内存对象，移动后当前线程将无法使用该对象，如果未设置，则对象将被复制到其它线程
	 * @param worker 来源的子线程，如果是主线程则为 `undefined`
	 */
	protected onCall(name: string, data: any, transferList: (ArrayBuffer | MessagePort)[], worker?: Worker) {
		return this.functions![name](data, transferList, worker)
	}

	/** 关闭所有线程 */
	async close() {
		const promises: Promise<number>[] = []
		for (const worker of this.workers) {
			worker.removeAllListeners()
			promises.push(worker.terminate())
		}
		this.workers.length = 0
		this._lastTask = this._firstTask = undefined
		return await Promise.all(promises)
	}

}

/** 表示一个线程池的选项 */
export interface WorkerPoolOptions extends Omit<WorkerOptions, "eval"> {
	/**
	 * 最大允许同时执行的线程数, 如果为 0 表示不启用多线程
	 * @default Math.ceil(require("os").cpus().length / 2)
	 */
	size?: number
	/** 供子线程调用的全局函数，在子线程中可以使用 `await this.call("name", ...)` 调用 */
	functions?: { [name: string]: (data: any, transferList: (ArrayBuffer | MessagePort)[], worker?: Worker) => any }
}

/** 表示一个子线程 */
export interface Worker extends NativeWorker {
	/** 判断当前线程是否正在运行 */
	running?: boolean
}

/** 表示执行线程的上下文 */
export interface WorkerContext {
	[key: string]: any
	/** 判断当前线程是否是主线程 */
	isMainThread: boolean
	/** 由主线程发送的全局数据 */
	workerData: any
	/**
	 * 调用主线程定义的函数
	 * @param name 要调用的函数名
	 * @param data 同时发送的数据，数据的类型必须可复制
	 * @param transferList 要移动的内存对象，移动后当前线程将无法使用该对象，如果未设置，则对象将被复制到其它线程
	 */
	call(name: string, data?: any, transferList?: (ArrayBuffer | MessagePort)[]): Promise<any>
	/** 获取或设置本次要移动的内存对象，移动后当前线程将无法使用该对象，如果未设置，则对象将被复制到其它线程 */
	transferList?: (ArrayBuffer | MessagePort)[]
}

/**
 * 判断指定的对象是否可在线程之间传递
 * @param obj 要判断的对象
 * @see https://nodejs.org/api/worker_threads.html
 */
export function isStructuredCloneable(obj: any, _processed = new Set<object>()) {
	switch (typeof obj) {
		case "object":
			if (obj === null || _processed.has(obj)) {
				return true
			}
			const prototype = Object.getPrototypeOf(obj)
			switch (prototype) {
				case Object.prototype:
				case Array.prototype:
					_processed.add(obj)
					for (const key in obj) {
						if (!isStructuredCloneable(obj[key], _processed)) {
							return false
						}
					}
					return true
				case Set.prototype:
					_processed.add(obj)
					for (const item of (obj as Set<any>).values()) {
						if (!isStructuredCloneable(item, _processed)) {
							return false
						}
					}
					return true
				case Map.prototype:
					_processed.add(obj)
					for (const [key, value] of (obj as Map<any, any>).entries()) {
						if (!isStructuredCloneable(value, _processed) || !isStructuredCloneable(key, _processed)) {
							return false
						}
					}
					return true
				case Date.prototype:
				case RegExp.prototype:
				case Boolean.prototype:
				case Number.prototype:
				case ArrayBuffer.prototype:
				case SharedArrayBuffer.prototype:
				case Buffer.prototype:
				case Int8Array.prototype:
				case Uint8Array.prototype:
				case Uint8ClampedArray.prototype:
				case Int16Array.prototype:
				case Uint16Array.prototype:
				case Int32Array.prototype:
				case Uint32Array.prototype:
				case Float32Array.prototype:
				case Float64Array.prototype:
				case BigInt64Array.prototype:
				case BigUint64Array.prototype:
				case String.prototype:
					return true
				default:
					if (prototype.constructor === "MessagePort" && supportWorker()) {
						const { MessagePort } = require("worker_threads") as typeof import("worker_threads")
						if (prototype === MessagePort.prototype) {
							return true
						}
					}
					return false
			}
		case "function":
		case "symbol":
			return false
		default:
			return true
	}
}

/** 判断是否原生支持 Worker */
function supportWorker() {
	return require("module").builtinModules.includes("worker_threads")
}