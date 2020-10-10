import { randomBytes, randomFillSync } from "crypto"
import { EventEmitter } from "events"
import { ClientRequest, createServer as createHTTPServer, IncomingMessage, request as httpRequest, Server as HTTPServer, STATUS_CODES } from "http"
import { createServer as createHTTPSServer, request as httpsRequest, RequestOptions, Server as HTTPSServer, ServerOptions } from "https"
import { AddressInfo, Server as NetServer, Socket } from "net"
import { format, parse, resolve, UrlObject } from "url"
import { sha1 } from "./crypto"

/** 表示一个 WebSocket 连接 */
export class WebSocket extends EventEmitter {

	// #region 连接

	/** 获取关联的 TCP/IP 协议套接字 */
	socket!: Socket

	/** 获取当前使用的子协议 */
	protocol?: string

	/** 获取当前使用的 WebSocket 扩展 */
	readonly extension?: WebSocketExtension

	/** 获取当前 WebSocket 的状态 */
	readyState = WebSocketState.connecting

	/**
	 * 初始化新的 WebSocket 客户端
	 * @param url 要连接的服务端地址
	 * @param protocols 所有可用的子协议
	 * @param options 附加选项
	 */
	constructor(url: string | UrlObject | URL, protocols?: string | readonly string[], options?: WebSocketOptions)

	/**
	 * 初始化新的 WebSocket 服务端
	 * @param socket 已连接的 TCP/IP 协议套接字
	 * @param protocol 当前使用的子协议
	 * @param options 附加选项
	 */
	constructor(socket: Socket, protocol?: string, options?: Pick<WebSocketOptions, "maxBufferSize" | "extension">)

	constructor(url: Socket | string | UrlObject | URL, protocols?: string | readonly string[], options?: WebSocketOptions) {
		super()
		if (options) {
			if (options.extension !== undefined) this.extension = options.extension
			if (options.maxBufferSize !== undefined) this.maxBufferSize = options.maxBufferSize
		}
		// 初始化服务端
		if (url instanceof Socket) {
			this.mask = false
			this.init(url, protocols as string)
			return
		}
		// 初始化客户端
		this.mask = true
		this.open(url, protocols, options)
	}

	/**
	 * 初始化指定的 TCP/IP 协议套接字
	 * @param socket 要关联的 TCP/IP 协议套接字
	 * @param protocol 子协议
	 */
	private init(socket: Socket, protocol?: string) {
		this.socket = socket
		this.protocol = protocol
		this.readyState = WebSocketState.open
		// 需要保持长连接
		socket.setTimeout(0)
		socket.setNoDelay(true)
		socket.on("data", this.handleSocketData)
		socket.on("error", this.handleSocketError)
		socket.on("close", this.handleSocketClose)
		if (this.extension) {
			this.extension.apply(this)
		}
		this.emit("open")
	}

	/** 正在挂起的请求对象 */
	private _request?: ClientRequest

	/**
	 * 连接到指定的 WebSocket 服务器
	 * @param url 要连接的服务端地址
	 * @param protocols 所有可用的子协议
	 * @param options 附加选项
	 */
	private open(url: string | UrlObject | URL, protocols?: string | readonly string[], options?: WebSocketOptions) {
		const webSocketKey = randomBytes(16).toString("base64")
		const opt = {
			method: "GET",
			...options,
			headers: {
				Connection: "Upgrade",
				Upgrade: "websocket",
				"Sec-WebSocket-Version": 13,
				"Sec-WebSocket-Key": webSocketKey,
				...options?.headers
			}
		} as RequestOptions & WebSocketOptions
		if (protocols) {
			opt.headers!["Sec-WebSocket-Protocol"] = protocols.toString()
		}
		if (typeof url === "string") {
			url = parse(url)
		}
		const isSecure = url.protocol === "wss:"
		opt.protocol = isSecure ? "https:" : "http:"
		opt.hostname = url.hostname
		opt.port = url.port
		opt.auth = (url as UrlObject).auth || ((url as URL).username != undefined && (url as URL).password != undefined ? `${(url as URL).username}:${(url as URL).password}` : (url as URL).username)
		opt.path = `${url.pathname || "/"}${url.search || ""}`
		const request = this._request = (isSecure ? httpsRequest : httpRequest)(opt, response => {
			const statusCode = response.statusCode!
			if (statusCode >= 300 && statusCode < 400 && (opt.maxRedirects === undefined || opt.maxRedirects > 0)) {
				const location = response.headers["location"]
				if (location !== undefined) {
					response.resume()
					opt.maxRedirects = opt.maxRedirects === undefined ? 9 : opt.maxRedirects - 1
					request.removeAllListeners("upgrade")
					this.open(resolve(format(url), location), protocols, options)
					return
				}
			}
			this.onConnectError(new Error(`Connection Error: Unexpected server response: ${response.statusCode}`))
			return
		})
		request.once("upgrade", (res: IncomingMessage, socket: Socket, head: Buffer) => {
			this.emit("upgrade", res, socket)
			// 检查升级头
			if (res.headers["sec-websocket-accept"] !== sha1(webSocketKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "base64")) {
				this.onConnectError(new Error(`Connection Error: Invalid Sec-WebSocket-Accept header`))
				return
			}
			// 检查子协议
			const serverProtocol = res.headers["sec-websocket-protocol"] as string | undefined
			if (serverProtocol) {
				if (!protocols) {
					this.onConnectError(new Error(`Connection Error: Server sent a subprotocol but none was requested`))
					return
				}
				if (typeof protocols === "string" ? protocols !== serverProtocol : !protocols.includes(serverProtocol)) {
					this.onConnectError(new Error(`Connection Error: Server sent an invalid subprotocol`))
					return
				}
			} else if (protocols) {
				this.onConnectError(new Error(`Connection Error: Server sent no subprotocol`))
				return
			}
			if (this.extension && res.headers["sec-websocket-extensions"] && this.extension.accept(res.headers["sec-websocket-extensions"] as string) === null) {
				this.onConnectError(new Error(`Connection Error: Not supported WebSocket extensions: ${res.headers["sec-websocket-extensions"]}`))
				return
			}
			if (head?.length) {
				socket.unshift(head)
			}
			this.init(socket, serverProtocol)
			this._request = undefined
		})
		request.once("error", (error: Error) => {
			this.onConnectError(error)
		})
		request.end()
	}

	/**
	 * 当连接错误后执行
	 * @param error 处理打开错误
	 */
	protected onConnectError(error: Error) {
		this.readyState = WebSocketState.closing
		this.emit("error", error)
		this.handleSocketClose()
	}

	/** 使当前进程等待当前连接停止后退出 */
	ref() {
		if (this.socket) {
			this.socket.ref()
		} else {
			this.once("open", () => { this.ref() })
		}
		return this
	}

	/** 允许当前进程不等待当前连接停止直接退出 */
	unref() {
		if (this.socket) {
			this.socket.unref()
		} else {
			this.once("open", () => { this.unref() })
		}
		return this
	}

	// #endregion

	// #region 发送

	/** 判断发送数据前是否添加掩码以避免缓存服务器攻击 */
	readonly mask: boolean

	/**
	 * 向远程发送一段数据
	 * @param data 要发送的数据
	 * @param callback 发送成功后的回调函数
	 */
	send(data: string | Buffer | ArrayBuffer | SharedArrayBuffer | Uint8Array, callback?: (error?: Error) => void) {
		this.sendPayload(data, typeof data === "string" ? WebSocketOpcode.textFrame : WebSocketOpcode.binaryFrame, true, 0, this.mask, true, callback)
	}

	/**
	 * 向远程发送一个“乒”消息
	 * @param callback 发送成功后的回调函数
	 */
	ping(callback?: (error?: Error) => void) {
		this.sendPayload(Buffer.allocUnsafe(0), WebSocketOpcode.pingFrame, true, 0, this.mask, false, callback)
	}

	/**
	 * 底层发送一个 WebSocket 帧
	 * @param data 要发送的数据
	 * @param opcode 操作码
	 * @param final 当前帧是否是最后一帧
	 * @param rsv 扩展码
	 * @param mask 是否添加掩码以避免缓存服务器攻击
	 * @param dataImmutable 是否禁止函数修改 *data*
	 * @param callback 发送完成后的回调函数
	 */
	sendPayload(data: string | Buffer | ArrayBuffer | SharedArrayBuffer | Uint8Array, opcode: WebSocketOpcode, final?: boolean, rsv?: WebSocketExtensionRSV, mask?: boolean, dataImmutable?: boolean, callback?: (error?: Error) => void) {
		if (this.readyState !== WebSocketState.open) {
			if (this.readyState === WebSocketState.connecting) {
				throw new Error(`WebSocket is not open`)
			}
			callback?.(new Error(`WebSocket is closed`))
			return
		}
		// 计算帧长度
		if (mask === false || typeof data === "string") {
			dataImmutable = false
		}
		if (!Buffer.isBuffer(data)) data = Buffer.from(data as string) as never
		let headerLength = mask !== false ? 6 : 2
		let payloadLength = data.length
		if (payloadLength > 125) {
			if (payloadLength < 65536) {
				headerLength += 2
				payloadLength = 126
			} else {
				headerLength += 8
				payloadLength = 127
			}
		}
		// 生成数据
		const frame = Buffer.allocUnsafe(dataImmutable !== false ? headerLength + data.length : headerLength)
		frame[0] = (final !== false ? 0b10000000 : 0) | rsv! | opcode
		frame[1] = mask !== false ? 0b10000000 | payloadLength : payloadLength
		if (payloadLength >= 126) {
			if (payloadLength === 126) {
				frame.writeUInt16BE(data.length, 2)
			} else {
				frame.writeUInt32BE(0, 2)
				frame.writeUInt32BE(data.length, 6)
			}
		}
		// 掩码
		if (mask !== false) {
			const maskOffset = headerLength - 4
			randomFillSync(frame, maskOffset, 4)
			if (dataImmutable !== false) {
				addMask(data, frame, maskOffset, frame, headerLength, data.length)
				this.socket.write(frame, callback)
				return
			}
			addMask(data, frame, maskOffset, data, 0, data.length)
		}
		this.socket.cork()
		this.socket.write(frame)
		this.socket.write(data, callback)
		this.socket.uncork()
	}

	/** 获取已缓存但未发送的字节数 */
	get bufferedAmount() { return this.socket ? this.socket.bufferSize : 0 }

	// #endregion

	// #region 接收

	/** 所有已接收但未解析的二进制数据 */
	private readonly _receivedBuffers: Buffer[] = []

	/** 已接收但未解析的字节长度 */
	private _receivedLength = 0

	/** 已接收的第一个二进制数据中已解析的字节数 */
	private _receivedOffset = 0

	/** 已接收的单个数据包的解析状态 */
	private _receivedPayloadParseState = PayloadParseState.header

	/** 已接收的单个数据包是否已结束 */
	private _receivedPayloadFinal = true

	/** 已接收的单个数据包是否已添加掩码 */
	private _receivedPayloadMask?: boolean

	/** 已接收的单个数据包的长度 */
	private _receivedPayloadLength = 0

	/** 已接收的单个数据包的掩码 */
	private _receivedPayloadMaskKey?: Buffer

	/** 已接收的数据块的扩展码 */
	private _receivedPayloadRSV?: WebSocketExtensionRSV

	/** 已接收的数据块的操作码 */
	private _receivedPayloadOpcode?: WebSocketOpcode

	/** 已接收的数据块的所有二进制数据 */
	private readonly _receivedChunks: Buffer[] = []

	/** 已接收的数据块的总字节长度 */
	private _receivedChunkLength = 0

	/** 获取允许的每个数据块的最大字节长度 */
	maxBufferSize = 100 * 1024 * 1024

	/**
	 * 处理 TCP/IP 套接字接收数据事件
	 * @param data 接收的数据
	 */
	protected handleSocketData = (data: Buffer) => {
		// 忽略关闭桢后的所有数据
		if (this._receivedPayloadOpcode === WebSocketOpcode.connectionCloseFrame && this._receivedPayloadParseState === PayloadParseState.header || !data.length) {
			return
		}
		this._receivedBuffers.push(data)
		this._receivedLength += data.length
		// 解析数据
		while (true) {
			switch (this._receivedPayloadParseState) {
				case PayloadParseState.header:
					if (this._receivedLength < 2) {
						return
					}
					// 字节 1 = FIN, RSV1, RSV2, RSV3, OpCode(4),
					const byte1 = this._readReceivedByte()
					const payloadFinal = (byte1 & 0b10000000) !== 0
					const payloadRSV = byte1 & 0b01110000
					const payloadOpcode = byte1 & 0b00001111
					// 字节 2 = Mask, Len(7)
					const byte2 = this._readReceivedByte()
					const payloadMask = (byte2 & 0b10000000) !== 0
					const payloadLength = byte2 & 0b01111111
					switch (payloadOpcode) {
						case WebSocketOpcode.textFrame:
						case WebSocketOpcode.binaryFrame:
							if (!this._receivedPayloadFinal) {
								this.onParseError(1002, `Received invalid WebSocket frame: Invalid opcode '${payloadOpcode}'`)
								return
							}
							this._receivedPayloadRSV = payloadRSV
							this._receivedPayloadOpcode = payloadOpcode
							break
						case WebSocketOpcode.continueFrame:
							if (payloadRSV) {
								this.onParseError(1002, `Received invalid WebSocket frame: RSV must be clear for opcode '${payloadOpcode}'`)
								return
							}
							if (this._receivedPayloadFinal) {
								this.onParseError(1002, `Received invalid WebSocket frame: Invalid opcode '${payloadOpcode}'`)
								return
							}
							break
						case WebSocketOpcode.connectionCloseFrame:
						case WebSocketOpcode.pingFrame:
						case WebSocketOpcode.pongFrame:
							if (!payloadFinal) {
								this.onParseError(1002, `Received invalid WebSocket frame: FIN must be set for opcode '${payloadOpcode}'`)
								return
							}
							if (payloadRSV) {
								this.onParseError(1002, `Received invalid WebSocket frame: RSV must be clear for opcode '${payloadOpcode}'`)
								return
							}
							if (!this._receivedPayloadFinal) {
								this.onParseError(1002, `Received invalid WebSocket frame: Invalid opcode '${payloadOpcode}'`)
								return
							}
							if (payloadLength > 0x7d) {
								this.onParseError(1002, `Received invalid WebSocket frame: Invalid payload length '${this._receivedPayloadLength}' for opcode '${payloadOpcode}'`)
								return
							}
							this._receivedPayloadRSV = payloadRSV
							this._receivedPayloadOpcode = payloadOpcode
							break
						default:
							this.onParseError(1002, `Received invalid WebSocket frame: Invalid opcode '${payloadOpcode}'`)
							return
					}
					this._receivedPayloadFinal = payloadFinal
					this._receivedPayloadMask = payloadMask
					if (payloadLength >= 126) {
						if (payloadLength === 126) {
							this._receivedPayloadParseState = PayloadParseState.extendedLength16
						} else {
							this._receivedPayloadParseState = PayloadParseState.extendedLength64
						}
						continue
					}
					this._receivedPayloadLength = payloadLength
					break
				case PayloadParseState.extendedLength16:
					if (this._receivedLength < 2) {
						return
					}
					this._receivedPayloadLength = (this._readReceivedByte() << 8) | this._readReceivedByte()
					break
				case PayloadParseState.extendedLength64:
					if (this._receivedLength < 8) {
						return
					}
					const buffer = this._readReceivedBytes(8)
					const left = buffer.readUInt32BE(0)
					if (left) {
						// JavaScript 中缺少 long 类型，double 类型的数字最大只能精确表示 2 ** 53 - 1
						if (left >= 2 ** (53 - 32)) {
							this.onParseError(1009, `Received invalid WebSocket frame: Unsupported payload length >= 2 ** 53`)
							return
						}
						this._receivedPayloadLength = left * (2 ** 32) + buffer.readUInt32BE(4)
					} else {
						this._receivedPayloadLength = buffer.readUInt32BE(4)
					}
					break
				case PayloadParseState.maskKey:
					if (this._receivedLength < 4) {
						return
					}
					this._receivedPayloadMaskKey = this._readReceivedBytes(4)
					this._receivedPayloadParseState = PayloadParseState.data
					continue
				default:
					// 解析数据
					if (this._receivedPayloadLength) {
						if (this._receivedLength < this._receivedPayloadLength) {
							return
						}
						const buffer = this._readReceivedBytes(this._receivedPayloadLength)
						if (this._receivedPayloadMask) {
							removeMask(buffer, this._receivedPayloadMaskKey!)
						}
						this._receivedChunks.push(buffer)
					}
					this._receivedPayloadParseState = PayloadParseState.header
					if (!this._receivedPayloadFinal) {
						continue
					}
					this.onReceive(this._receivedChunks, this._receivedChunkLength, this._receivedPayloadOpcode!, this._receivedPayloadRSV!)
					this._receivedChunks.length = this._receivedChunkLength = 0
					if (this._receivedPayloadOpcode === WebSocketOpcode.connectionCloseFrame) {
						return
					}
					continue
			}
			// 当已解析长度后执行
			if ((this._receivedChunkLength += this._receivedPayloadLength) > this.maxBufferSize) {
				this.onParseError(1009, `Received invalid WebSocket frame: Max payload size exceeded`)
				return
			}
			if (this._receivedPayloadMask) {
				this._receivedPayloadParseState = PayloadParseState.maskKey
			} else {
				this._receivedPayloadParseState = PayloadParseState.data
			}
		}
	}

	/** 从已接收的缓存中读取一个字节 */
	private _readReceivedByte() {
		this._receivedLength--
		const firstBuffer = this._receivedBuffers[0]
		const byte = firstBuffer[this._receivedOffset++]
		if (this._receivedOffset === firstBuffer.length) {
			this._receivedBuffers.shift()
			this._receivedOffset = 0
		}
		return byte
	}

	/**
	 * 从缓存中读取指定数目的字节
	 * @param count 要读取的字节数
	 * @param outputBuffers 接收已读取的所有二进制数据的数组
	 */
	private _readReceivedBytes(count: number) {
		this._receivedLength -= count
		const firstBuffer = this._receivedBuffers[0]
		const firstBufferLength = firstBuffer.length - this._receivedOffset
		if (count <= firstBufferLength) {
			const buffer = firstBuffer.slice(this._receivedOffset, this._receivedOffset + count)
			if (count === firstBufferLength) {
				this._receivedBuffers.shift()
				this._receivedOffset = 0
			} else {
				this._receivedOffset += count
			}
			return buffer
		}
		const newBuffer = Buffer.allocUnsafe(count)
		do {
			const firstBuffer = this._receivedBuffers[0]
			if (firstBuffer.length < count) {
				this._receivedBuffers.shift()!.copy(newBuffer, newBuffer.length - count)
				this._receivedOffset = 0
			} else {
				firstBuffer.copy(newBuffer, newBuffer.length - count, 0, count)
				this._receivedOffset = count
			}
			count -= firstBuffer.length
		} while (count > 0)
		return newBuffer
	}

	/**
	 * 当数据解析错误后执行
	 * @param code 错误的状态码
	 * @param message 错误的信息
	 */
	protected onParseError(code: number, message: string) {
		this.close(code, message)
	}

	/**
	 * 当数据解析完成后执行
	 * @param buffers 接收到的所有数据
	 * @param length 接收到的所有数据字节长度
	 * @param opcode 操作码
	 * @param rsv 扩展码
	 */
	protected onReceive(buffers: Buffer[], length: number, opcode: WebSocketOpcode, rsv: WebSocketExtensionRSV) {
		const buffer = Buffer.concat(buffers, length)
		switch (opcode) {
			case WebSocketOpcode.textFrame:
				this.onMessage(buffer.toString())
				break
			case WebSocketOpcode.binaryFrame:
				this.onMessage(buffer)
				break
			case WebSocketOpcode.connectionCloseFrame:
				switch (buffer.length) {
					case 0:
						this.onClose(buffer)
						break
					case 1:
						this.onParseError(1002, `Received invalid WebSocket frame: Invalid payload length '${buffer.length}' for opcode '${WebSocketOpcode.connectionCloseFrame}'`)
						break
					default:
						this.onClose(buffer, buffer.readUInt16BE(0), buffer.toString("utf-8", 2))
						break
				}
			case WebSocketOpcode.pingFrame:
				this.onPing(buffer)
				break
			default:
				this.onPong(buffer)
				break
		}
	}

	/**
	 * 当接收到数据后执行
	 * @param data 接收的数据
	 */
	protected onMessage(data: string | Buffer) {
		this.emit("message", data)
	}

	/**
	 * 当接收到“乒”请求后执行
	 * @param data 请求的附加数据
	 */
	protected onPing(data: Buffer) {
		this.emit("ping", data)
		this.sendPayload(data, WebSocketOpcode.pongFrame, true, 0, this.mask, false)
	}

	/**
	 * 当接收到“乓”响应后执行
	 * @param data 请求的附加数据
	 */
	protected onPong(data: Buffer) {
		this.emit("pong", data)
	}

	/**
	 * 当接收到关闭请求后执行
	 * @param data 请求的附加数据
	 * @param code 远程发送的状态码
	 * @param reason 远程关闭的原因
	 */
	protected onClose(data: Buffer, code?: number, reason?: string) {
		this._closeCode = code
		this._closeReason = reason
		// 本地主动关闭连接后，远程会回复关闭桢，此时可安全断开连接
		if (this.readyState === WebSocketState.closing) {
			this.socket.end()
			return
		}
		// 远程主动关闭连接，先回复关闭桢然后断开连接
		this.sendPayload(data, WebSocketOpcode.connectionCloseFrame, true, 0, this.mask, false, () => {
			this.socket.end()
		})
		this.readyState = WebSocketState.closing
	}

	// #endregion

	// #region 关闭

	/** 退出的状态码 */
	private _closeCode?: number

	/** 退出的原因 */
	private _closeReason?: string

	/** 等待强制关闭的计时器 */
	private _destroyTimer?: ReturnType<typeof setTimeout>

	/**
	 * 发送一个关闭连接帧并关闭连接
	 * @param code 关闭的状态码
	 * @param reason 关闭的原因
	 * @param timeout 等待服务器响应的超时毫秒数，如果为 0 则不设置超时
	 */
	close(code?: number, reason?: string, timeout = 30000) {
		// 只有连接已打开时才能关闭
		if (this.readyState !== WebSocketState.open) {
			if (this.readyState === WebSocketState.connecting) {
				this.uninit()
			}
			return
		}
		let buffer: Buffer
		if (code == undefined) {
			buffer = Buffer.allocUnsafe(0)
		} else if (!isValidCode(code)) {
			throw new TypeError(`Invalid code: '${code}'`)
		} else if (reason == undefined) {
			buffer = Buffer.allocUnsafe(2)
			buffer.writeUInt16BE(code, 0)
		} else {
			buffer = Buffer.allocUnsafe(2 + Buffer.byteLength(reason))
			buffer.writeUInt16BE(code, 0)
			buffer.write(reason, 2)
		}
		this._closeCode = code || 1005
		this._closeReason = reason
		this.sendPayload(buffer, WebSocketOpcode.connectionCloseFrame, true, 0, this.mask, false)
		// 如果远程在规定时间不返回关闭响应，强制关闭连接
		if (timeout) {
			this._destroyTimer = setTimeout(() => {
				this.destroy()
			}, timeout)
		}
		this.readyState = WebSocketState.closing
	}

	/**
	 * 强制关闭连接
	 * @param error 关联的错误对象
	 */
	destroy(error?: Error) {
		switch (this.readyState) {
			case WebSocketState.connecting:
				this.uninit()
				break
			case WebSocketState.open:
			case WebSocketState.closing:
				this.readyState = WebSocketState.closing
				this._closeCode = 1006
				this._closeReason = error ? error.message : undefined
				this.socket.destroy()
				this.handleSocketClose()
				break
		}
	}

	/** 释放所有资源 */
	private uninit() {
		// 如果正在连接状态，停止连接
		if (this._request) {
			this._request.removeAllListeners("response")
			this._request.removeAllListeners("upgrade")
			this._request.abort()
			this._request = undefined
		}
		// 停止计时器
		if (this._destroyTimer) {
			clearTimeout(this._destroyTimer)
			this._destroyTimer = undefined
		}
		if (this.socket) {
			this.socket.off("data", this.handleSocketData)
			this.socket.off("close", this.handleSocketClose)
		}
		this._receivedBuffers.length = this._receivedChunks.length = this._receivedChunkLength = this._receivedOffset = this._receivedLength = 0
		this._receivedPayloadMaskKey = undefined
	}

	/** 处理连接关闭事件 */
	protected handleSocketClose = () => {
		this.readyState = WebSocketState.closed
		this.emit("close", this._closeCode || 1006, this._closeReason)
		this.uninit()
	}

	/** 处理连接错误事件 */
	protected handleSocketError = (error: Error) => {
		this.destroy(error)
	}

	// #endregion

}

/** 表示一个 WebSocket 连接的附加选项 */
export interface WebSocketOptions extends Omit<RequestOptions, "protocol" | "hostname" | "host" | "port" | "auth" | "path"> {
	/** WebSocket 扩展 */
	extension?: WebSocketExtension
	/**
	 * 允许远程发送的每个数据块的最大字节数
	 * @default 100 * 1024 * 1024
	 */
	maxBufferSize?: number
	/**
	 * 响应服务端的 3XX 重定向的最大次数，如果为 0 则不重定向
	 * @default 10
	 */
	maxRedirects?: number
}

/** 表示一个 WebSocket 扩展 */
export interface WebSocketExtension {
	/**
	 * 处理客户端提交的扩展头并返回支持的扩展头，如果都不支持则返回 `null`
	 * @param header 客户端请求的扩展头
	 * @returns 返回传递给客户端的扩展头
	 */
	accept(header: string): string | null
	/**
	 * 应用到 WebSocket 对象以实现扩展功能
	 * @param webSocket 要修改的 WebSocket 对象
	 */
	apply(webSocket: WebSocket): void
}

/** 表示 WebSocket 的扩展标记位 */
export const enum WebSocketExtensionRSV {
	/** 扩展字段 1 */
	rsv1 = 0b01000000,
	/** 扩展字段 2 */
	rsv2 = 0b00100000,
	/** 扩展字段 3 */
	rsv3 = 0b00010000,
}

/** 表示 WebSocket 的连接状态 */
export const enum WebSocketState {
	/** 正在连接 */
	connecting,
	/** 已连接 */
	open,
	/** 正在关闭 */
	closing,
	/** 已关闭 */
	closed
}

/** 表示 WebSocket 的操作码 */
export const enum WebSocketOpcode {
	/** 继续发送帧 */
	continueFrame = 0,
	/** 文本（UTF-8 编码）帧 */
	textFrame = 1,
	/** 二进制数据帧 */
	binaryFrame = 2,
	/** 关闭连接 */
	connectionCloseFrame = 8,
	/** “乒”帧 */
	pingFrame = 9,
	/** “乓”帧 */
	pongFrame = 10,
}

/** 表示数据包的解析状态 */
const enum PayloadParseState {
	/** 正在解析开头的两字节数据 */
	header,
	/** 正在解析扩展的 16 位长度 */
	extendedLength16,
	/** 正在解析扩展的 64 位长度 */
	extendedLength64,
	/** 正在解析掩码 */
	maskKey,
	/** 正在解析数据 */
	data,
}

/**
 * 添加掩码
 * @param buffer 原始数据
 * @param maskKey 掩码数据
 * @param maskKeyOffset *maskKey* 中的开始索引
 * @param outputBuffer 输出的数据
 * @param outputBufferOffset *outputBuffer* 中的开始索引
 * @param length 计算的长度
 */
function addMask(buffer: Buffer, maskKey: Buffer, maskKeyOffset: number, outputBuffer: Buffer, outputBufferOffset: number, length: number) {
	for (let i = 0; i < length; i++) {
		outputBuffer[outputBufferOffset + i] = buffer[i] ^ maskKey[maskKeyOffset + (i & 3)]
	}
}

/**
 * 删除掩码
 * @param buffer 原始数据
 * @param maskKey 掩码数据
 */
function removeMask(buffer: Buffer, maskKey: Buffer) {
	for (let i = 0; i < buffer.length; i++) {
		buffer[i] ^= maskKey[i & 3]
	}
}

/**
 * 判断指定的状态码是否可作为关闭帧的状态码
 * @param code 要判断的状态码
 */
function isValidCode(code: number) {
	return code >= 1000 && code <= 1003 || code >= 1007 && code <= 1013 || code >= 3000 && code <= 4999
}

/** 表示一个 WebSocket 服务器 */
export class WebSocketServer extends EventEmitter {

	/** 获取关联的 HTTP 服务器 */
	readonly server: HTTPServer | HTTPSServer

	/** 判断当前服务器对象是否关联了已在外部创建的服务器对象 */
	readonly existingServer: boolean

	/**
	 * 初始化新的 WebSocket 服务器
	 * @param server 关联的 HTTP 服务器或服务器地址（如 `ws://0.0.0.0/chat`）
	 * @param options 附加选项
	 */
	constructor(server: HTTPServer | HTTPSServer | string | UrlObject | URL, options?: WebSocketServerOptions) {
		super()
		if (server instanceof NetServer) {
			this.existingServer = true
		} else {
			if (typeof server === "string") {
				server = parse(server, false, true)
			}
			this.existingServer = false
			this.port = +server.port! || undefined
			this.hostname = server.hostname!
			this.path = server.pathname!
			server = (server.protocol === "wss:" || server.protocol === "https:" ? createHTTPSServer : createHTTPServer)(options!, (req, res) => {
				res.writeHead(426, {
					"Content-Type": "text/plain"
				});
				res.end("426 - Upgrade Required")
			})
		}
		this.server = server
		if (options) {
			if (options.backlog) this.backlog = options.backlog
			if (options.path && options.path !== "/") this.path = options.path
			if (options.selectProtocol) this.selectProtocol = options.selectProtocol
			if (options.verify) this.verify = options.verify
			if (options.extension) this.extension = options.extension
			if (options.maxBufferSize) this.maxBufferSize = options.maxBufferSize
		}
		server.on("listening", this.handleListening)
		server.on("error", this.handleError)
		server.on("upgrade", this.handleUpgrade)
	}

	/** 获取当前服务器正在监听的地址，如果服务未启动则返回 `null` */
	address() { return this.server.address() as AddressInfo | null }

	/** 判断当前服务器是否使用了加密传输协议（HTTPS） */
	get isSecure() { return "setSecureContext" in this.server }

	/** 获取当前服务器的根地址，如果服务器未在监听则返回 `undefined` */
	get url() {
		const address = this.address()
		if (!address) {
			return undefined
		}
		const wss = this.isSecure
		const hostname = this.hostname || address.address
		const port = address.port
		return `${wss ? "wss:" : "ws:"}//${hostname === "::" || hostname === "::1" || hostname === "0.0.0.0" ? "localhost" : address.family === "IPv6" ? `[${hostname}]` : hostname}${port === (wss ? 443 : 80) ? "" : `:${port}`}${this.path || ""}`
	}

	/** 获取配置的服务器主机地址 */
	readonly hostname?: string

	/** 获取配置的服务器端口 */
	readonly port?: number

	/** 获取允许的最大连接数 */
	readonly backlog?: number

	/**
	 * 启动服务器
	 * @returns 如果服务器已成功启动，返回 `true`，如果当前实例关联了外部服务器，返回 `false`
	 */
	start() {
		return new Promise<boolean>((resolve, reject) => {
			if (this.existingServer) {
				return resolve(false)
			}
			this.on("error", reject)
			this.server.listen(this.port, this.hostname, this.backlog, () => {
				this.off("error", reject)
				resolve(true)
			})
		})
	}

	/**
	 * 处理服务器开始监听事件
	 */
	protected handleListening = () => {
		this.emit("listening")
	}

	/**
	 * 处理服务器错误事件
	 * @param error 发生的错误对象
	 */
	protected handleError = (error: Error) => {
		this.emit("error", error)
	}

	/** 获取所有已打开的连接 */
	readonly connections = new Set<WebSocket>()

	/** 获取允许客户端发送的每个数据块的最大字节数 */
	readonly maxBufferSize = 100 * 1024 * 1024

	/** 获取监听的服务器路径 */
	readonly path?: string

	/** 获取所有扩展协议 */
	readonly extension?: WebSocketExtension

	/**
	 * 当被子类重写后负责验证是否允许指定的客户端连接
	 * @param request 当前的请求对象
	 * @param socket 当前的 TCP/IP 套接字对象
	 * @param server 当前的 WebSocket 服务器
	 */
	protected verify?: (request: IncomingMessage, socket: Socket, server: WebSocketServer) => boolean | Promise<boolean>

	/**
	 * 处理 HTTP 协议升级事件
	 * @param request 当前的请求对象
	 * @param socket 当前的 TCP/IP 套接字对象
	 * @param head 请求头的原始流
	 */
	handleUpgrade = async (request: IncomingMessage, socket: Socket, head: Buffer) => {
		// 检查当前服务器是否应处理本次 upgrade 事件
		if (request.method !== "GET" || !/^websocket$/i.test(request.headers["upgrade"]!) || this.path && this.path !== request.url!.replace(/\?.*$/, "")) {
			// 如果当前处理器是 upgrade 事件的最后一个处理器，则关闭连接，否则由下一个处理器处理
			const listeners = this.server.listeners("upgrade")
			if (listeners[listeners.length - 1] !== this.handleUpgrade) {
				return
			}
			return this.abortUpgrade(socket, 400)
		}
		// 验证协议版本
		const webSocketVersion = +(request.headers["sec-websocket-version"] as string)
		if (webSocketVersion !== 8 && webSocketVersion !== 13) {
			return this.abortUpgrade(socket, 400)
		}
		// 验证密钥
		const webSocketKey = (request.headers["sec-websocket-key"] as string || "").trim()
		if (!/^[+/0-9A-Za-z]{22}==$/.test(webSocketKey)) {
			return this.abortUpgrade(socket, 400)
		}
		// 验证连接
		if (this.verify && !await this.verify(request, socket, this)) {
			return this.abortUpgrade(socket, 401)
		}
		// 提升协议
		let response = `HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Accept: ${sha1(webSocketKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "base64")}\r\n`
		const protocolHeader = request.headers["sec-websocket-protocol"] as string
		let protocol: string | undefined
		if (protocolHeader) {
			const protocols = protocolHeader.trim().split(/ *, */)
			protocol = this.selectProtocol(protocols)
			if (protocol) {
				response += `Sec-WebSocket-Protocol: ${protocol}\r\n`
			}
		}
		// 验证扩展
		if (this.extension) {
			const extensionHeader = this.extension.accept(request.headers["sec-websocket-extensions"] as string)
			if (extensionHeader !== null) {
				response += `Sec-WebSocket-Extensions: ${extensionHeader}\r\n`
			}
		}
		if (!socket.readable || !socket.writable) {
			return socket.destroy()
		}
		response += "\r\n"
		socket.write(response)
		// 提升完成
		if (head?.length) {
			socket.unshift(head)
		}
		const ws = new WebSocket(socket, protocol, this)
		this.connections.add(ws)
		ws.on("close", () => {
			this.connections.delete(ws)
		})
		this.onConnection(ws)
	}

	/**
	 * 当有新的客户端连接时执行
	 * @param ws 用于和客户端通信的 WebSocket 对象
	 */
	protected onConnection(ws: WebSocket) {
		this.emit("connection", ws)
	}

	/**
	 * 当被子类重写后负责停止升级操作
	 * @param socket 当前的 TCP/IP 套接字对象
	 * @param code 响应的 HTTP 错误码
	 */
	protected abortUpgrade(socket: Socket, code: number) {
		if (socket.writable) {
			const body = `${code} - ${STATUS_CODES[code]}`
			socket.write(`HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\nConnection: Close\r\nContent-type: text/html\r\nContent-Length: ${body.length}\r\n\r\n${body}`)
		}
		socket.destroy()
	}

	/**
	 * 当被子类重写后负责选择合适的子协议
	 * @param protocols 所有可用的子协议
	 */
	protected selectProtocol(protocols: string[]) {
		return protocols[0]
	}

	/**
	 * 向所有客户端发送数据
	 * @param data 要发送的数据
	 */
	send(data: string | Buffer) {
		for (const connection of this.connections) {
			connection.send(data)
		}
	}

	/**
	 * 关闭当前服务器
	 * @returns 如果服务器已成功关闭，返回 `true`，如果当前实例关联了外部服务器，返回 `false`
	 */
	close() {
		return new Promise<boolean>((resolve, reject) => {
			for (const connection of this.connections) {
				connection.destroy()
			}
			this.connections.clear()
			if (this.existingServer) {
				resolve(false)
				return
			}
			this.server.close((error: any) => {
				if (error) {
					if (error.code === "ERR_SERVER_NOT_RUNNING") {
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
	 * 使当前进程等待当前服务器停止后退出
	 */
	ref() {
		this.server.ref()
		return this
	}

	/**
	 * 允许当前进程不等待当前服务器停止直接退出
	 */
	unref() {
		this.server.unref()
		return this
	}

}

/** 表示 WebSocket 服务器的附加选项 */
export interface WebSocketServerOptions extends Pick<WebSocketOptions, "maxBufferSize" | "extension">, ServerOptions {
	/**
	 * 服务器的路径
	 * @default ""
	 */
	path?: string
	/** 允许的最大连接数 */
	backlog?: number
	/**
	 * 验证是否允许指定的客户端连接
	 * @param request 当前的请求对象
	 * @param socket 当前的 TCP/IP 套接字对象
	 * @param server 当前的 WebSocket 服务器
	 */
	verify?: (request: IncomingMessage, socket: Socket, server: WebSocketServer) => boolean | Promise<boolean>
	/**
	 * 选择合适的子协议
	 * @param protocols 所有可用的子协议
	 */
	selectProtocol?: (protocols: string[]) => string
}