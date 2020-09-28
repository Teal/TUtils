/** 表示一个异步队列，用于串行执行多个异步任务 */
export class AsyncQueue implements PromiseLike<any> {

	/** 正在执行的第一个异步任务，如果没有任务正在执行则为 `undefined` */
	private _firstTask?: {
		readonly callback: () => any
		readonly resolve: (value: any) => void
		readonly reject: (reason: any) => void
		next?: AsyncQueue["_firstTask"]
	}

	/** 正在执行的最后一个异步任务，如果没有任务正在执行则为 `undefined` */
	private _lastTask?: AsyncQueue["_firstTask"]

	/** 判断是否有异步任务正在执行 */
	get isEmpty() { return !this._lastTask }

	/**
	 * 串行执行一个同步或异步函数
	 * @param callback 待执行的函数
	 * @returns 返回表示当前函数已执行完成的确认对象
	 */
	then<T>(callback: (value?: any) => T | Promise<T>) {
		return new Promise<T>((resolve, reject) => {
			const nextTask = { callback, resolve, reject }
			if (this._lastTask) {
				this._lastTask = this._lastTask.next = nextTask
			} else {
				this._firstTask = this._lastTask = nextTask
				this._next()
			}
		})
	}

	/** 执行下一个任务 */
	private async _next() {
		const currentTask = this._firstTask!
		try {
			currentTask.resolve(await currentTask.callback())
		} catch (e) {
			currentTask.reject(e)
		} finally {
			const nextTask = this._firstTask = currentTask.next
			if (nextTask) {
				this._next()
			} else {
				this._lastTask = undefined
			}
		}
	}

}