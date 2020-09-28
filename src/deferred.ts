/** 表示一个延时等待对象，用于同时等待多个异步任务 */
export class Deferred implements PromiseLike<any> {

	/** 第一个待执行的任务 */
	private _firstTask?: {
		resolve(data?: any): any
		reject?(reason: any): any
		next?: Deferred["_firstTask"]
	}

	/** 最后一个待执行的任务 */
	private _lastTask?: Deferred["_firstTask"]

	/** 是否已触发错误 */
	private _rejected?: boolean

	/** 关联的错误对象 */
	private _error?: any

	/** 获取正在执行的异步任务数 */
	rejectCount = 0

	/** 记录即将执行一个异步任务 */
	reject() {
		this.rejectCount++
	}

	/** 记录一个异步任务已完成 */
	resolve() {
		if (--this.rejectCount === 0) {
			process.nextTick(() => {
				if (this._rejected) {
					while (this._firstTask) {
						const task = this._firstTask
						this._firstTask = this._firstTask.next
						if (task.reject) {
							try {
								task.reject(this._error)
							} catch { }
						}
					}
				} else {
					while (this.rejectCount === 0 && this._firstTask) {
						let task = this._firstTask
						this._firstTask = this._firstTask.next
						try {
							task.resolve()
						} catch (e) {
							this._rejected = true
							this._error = e
							this._lastTask = this._firstTask = undefined
							do {
								if (task.reject) {
									try {
										task.reject(e)
									} catch { }
								}
							} while (task = task.next!)
							return
						}
					}
				}
			})
		}
	}

	/**
	 * 添加所有异步任务执行完成后的回调函数
	 * @param resolve 要执行的回调函数
	 * @param reject 执行出现错误的回调函数
	 */
	then(resolve: (_?: any) => any, reject?: (reason: any) => any) {
		if (this._firstTask) {
			this._lastTask = this._lastTask!.next = {
				resolve,
				reject
			}
		} else {
			this._lastTask = this._firstTask = {
				resolve,
				reject
			}
		}
		if (this.rejectCount === 0) {
			this.reject()
			this.resolve()
		}
		return this
	}

}