/** 表示一个事件触发器，支持异步事件 */
export class EventEmitter {

	/** 所有已添加的事件处理函数 */
	private _events?: Map<string, Function | Function[]>

	/**
	 * 添加一个事件处理函数
	 * @param eventName 要添加的事件名
	 * @param eventHandler 要添加的事件处理函数
	 * @example
	 * const events = new EventEmitter()
	 * events.on("error", data => console.log(data))  // 绑定 error 事件
	 * events.emit("error", "hello")                  // 触发 error 事件，输出 hello
	 */
	on(eventName: string, eventHandler: Function) {
		const events = this._events || (this._events = new Map<string, Function | Function[]>())
		const eventHandlers = events.get(eventName)
		if (eventHandlers === undefined) {
			events.set(eventName, eventHandler)
		} else if (typeof eventHandlers === "function") {
			events.set(eventName, [eventHandlers, eventHandler])
		} else {
			eventHandlers.push(eventHandler)
		}
		return this
	}

	/**
	 * 添加一个只执行一次的事件处理函数
	 * @param eventName 要添加的事件名
	 * @param eventHandler 要添加的事件处理函数
	 * @example
	 * const events = new EventEmitter()
	 * events.once("error", data => console.log(data)) // 绑定 error 事件
	 * events.emit("error", "hello")                   // 触发 error 事件，输出 hello
	 * events.emit("error", "hello")                   // 不触发事件
	 */
	once(eventName: string, eventHandler: Function) {
		function wrapper(this: EventEmitter, ...args: any[]) {
			this.off(eventName, wrapper)
			return eventHandler.apply(this, args)
		}
		return this.on(eventName, wrapper)
	}

	/**
	 * 删除一个或多个事件处理函数
	 * @param eventName 要删除的事件名，如果不传递此参数，则删除所有事件处理函数
	 * @param eventHandler 要删除的事件处理函数，如果不传递此参数，则删除指定事件的所有处理函数，如果同一个处理函数被添加多次，则只删除第一个
	 * @example
	 * const events = new EventEmitter()
	 * events.on("error", console.log)       // 绑定 error 事件
	 * events.off("error", console.log)      // 解绑 error 事件
	 * events.emit("error", "hello")		 // 触发 error 事件，不输出内容
	 */
	off(eventName?: string, eventHandler?: Function) {
		const events = this._events
		if (events) {
			if (eventName === undefined) {
				delete this._events
			} else if (eventHandler === undefined) {
				events.delete(eventName)
			} else {
				const eventHandlers = events.get(eventName)
				if (eventHandlers !== undefined) {
					if (typeof eventHandlers === "function") {
						if (eventHandlers === eventHandler) {
							events.delete(eventName)
						}
					} else {
						const index = eventHandlers.indexOf(eventHandler)
						if (index >= 0) {
							eventHandlers.splice(index, 1)
							if (eventHandlers.length === 1) {
								events.set(eventName, eventHandlers[0])
							}
						}
					}
				}
			}
		}
		return this
	}

	/**
	 * 触发一个事件，执行已添加的所有事件处理函数
	 * @param eventName 要触发的事件名
	 * @param eventArgs 传递给事件处理函数的所有参数
	 * @returns 如果任一个事件处理函数返回 `false` 则返回 `false`，否则返回 `true`
	 * @example
	 * const events = new EventEmitter()
	 * events.on("error", console.log)  // 绑定 error 事件
	 * events.emit("error", "hello")    // 触发 error 事件，输出 hello
	 */
	async emit(eventName: string, ...eventArgs: any[]) {
		const events = this._events
		if (events) {
			const eventHandlers = events.get(eventName)
			if (eventHandlers !== undefined) {
				if (typeof eventHandlers === "function") {
					return await eventHandlers.apply(this, eventArgs) !== false
				}
				// 避免在执行事件期间解绑事件，影响后续事件处理函数执行，所以需要复制一份列表
				for (const eventHandler of eventHandlers.slice(0)) {
					if (await eventHandler.apply(this, eventArgs) === false) {
						return false
					}
				}
			}
		}
		return true
	}

}