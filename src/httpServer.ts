import { randomBytes } from "crypto"
import { createServer, IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http"
import { Http2SecureServer, Http2Server, Http2ServerRequest, Http2ServerResponse, SecureServerOptions } from "http2"
import { Server, ServerOptions } from "https"
import { AddressInfo } from "net"
import { posix } from "path"
import { parse as parseQueryString, ParsedUrlQuery } from "querystring"
import { Stream } from "stream"
import { TLSSocket } from "tls"
import { parse } from "url"
import { createBrotliDecompress, createGunzip, createInflate } from "zlib"

/** 表示一个 HTTP 服务器（支持 HTTPS、HTTP/2） */
export class HTTPServer {

	/**
	 * 初始化新的服务器
	 * @param options 附加选项
	 * @param onRequestHandler 处理请求的回调函数
	 */
	constructor(options?: HTTPServerOptions, onRequestHandler?: HTTPServer["processRequest"]) {
		options = { ...options }
		let server: Server | Http2Server | Http2SecureServer
		if (options.http2) {
			const http2 = require("http2") as typeof import("http2")
			options.Http1IncomingMessage = HTTPRequest
			options.Http1ServerResponse = HTTPResponse
			// @ts-ignore
			class HTTP2Request extends http2.Http2ServerRequest { }
			Object.defineProperties(HTTP2Request.prototype, Object.getOwnPropertyDescriptors(HTTPRequest.prototype))
			options.Http2ServerRequest = HTTP2Request
			// @ts-ignore
			class HTTP2Response extends http2.Http2ServerResponse { }
			Object.defineProperties(HTTP2Response.prototype, Object.getOwnPropertyDescriptors(HTTPResponse.prototype))
			options.Http2ServerResponse = HTTP2Response
			options.allowHTTP1 = options.allowHTTP1 !== false
			if (options.https) {
				server = http2.createSecureServer(options, this.handleRequest as any)
			} else {
				server = http2.createServer(options, this.handleRequest as any)
			}
		} else {
			options.IncomingMessage = HTTPRequest
			options.ServerResponse = HTTPResponse
			if (options.https) {
				const https = require("https") as typeof import("https")
				server = https.createServer(options, this.handleRequest as any)
			} else {
				server = createServer(options, this.handleRequest as any) as any
			}
		}
		// 根据用户的选项动态继承类
		const superClasses: object[] = []
		for (let superClass = new.target.prototype; superClass && superClass !== Object.prototype; superClass = Object.getPrototypeOf(superClass)) {
			superClasses.push(superClass)
		}
		for (let i = superClasses.length - 1; i >= 0; i--) {
			Object.defineProperties(server, Object.getOwnPropertyDescriptors(superClasses[i]))
		}
		Object.setPrototypeOf(this, server)
		if (onRequestHandler) {
			this.processRequest = onRequestHandler
		}
		if (options.maxAllowedContentLength !== undefined) {
			this.maxAllowedContentLength = options.maxAllowedContentLength
		}
	}

	/** 判断当前服务器是否使用了加密传输协议（HTTPS） */
	get isSecure() { return "setSecureContext" in this }

	/** 获取当前服务器的根地址，如果服务器未在监听则返回 `undefined` */
	get url() {
		const address = this.address() as AddressInfo | null
		if (!address) {
			return undefined
		}
		const https = this.isSecure
		const hostname = address.address
		const port = address.port
		return `${https ? "https:" : "http:"}//${hostname === "::" || hostname === "::1" || hostname === "0.0.0.0" ? "localhost" : address.family === "IPv6" ? `[${hostname}]` : hostname}${port === (https ? 443 : 80) ? "" : `:${port}`}`
	}

	/** 获取或设置允许请求的最大字节数 */
	maxAllowedContentLength = 20 * 1024 * 1024

	/**
	 * 处理原生 HTTP 请求事件
	 * @param request 当前的请求对象
	 * @param response 当前的响应对象
	 */
	protected handleRequest = (request: HTTPRequest, response: HTTPResponse) => {
		const urlObject = parse(request.url)
		request.path = posix.normalize(decodeURIComponent(urlObject.pathname || "/"))
		request.search = urlObject.query
		switch (request.method) {
			case "POST":
			case "PUT":
				let stream: Stream
				switch (request.headers["content-encoding"]) {
					case "gzip":
						stream = request.pipe(createGunzip())
						break
					case "deflate":
						stream = request.pipe(createInflate())
						break
					case "br":
						// 需要 node v11.7+ 支持
						stream = request.pipe(createBrotliDecompress())
						break
					default:
						stream = request
						break
				}
				const bodyChunks: Buffer[] = []
				let size = 0
				stream.on("data", (chunk: Buffer) => {
					if ((size += chunk.length) > this.maxAllowedContentLength) {
						bodyChunks.length = 0
						response.writeHead(400)
						response.end(`Request content length exceeds the limit`)
						request.socket.destroy()
						stream.removeAllListeners("end")
						return
					}
					bodyChunks.push(chunk)
				})
				stream.on("end", () => {
					request.body = Buffer.concat(bodyChunks, size)
					this.processRequest(request, response)
				})
				return
		}
		this.processRequest(request, response)
	}

	/**
	 * 处理 HTTP 请求
	 * @param request 当前的请求对象
	 * @param response 当前的响应对象
	 */
	processRequest(request: HTTPRequest, response: HTTPResponse) {
		response.end("It works!")
	}

	/** 会话管理器 */
	private _sessions?: HTTPSessionManager

	/** 获取或设置当前服务器的会话管理器 */
	get sessions() {
		if (!this._sessions) {
			this._sessions = new HTTPSessionManager()
			this.once("close", () => {
				this.sessions = null!
			})
		}
		return this._sessions
	}
	set sessions(value) {
		this._sessions?.close()
		this._sessions = value
	}

}

/** 表示 HTTP 服务器的附加选项 */
export interface HTTPServerOptions extends ServerOptions, SecureServerOptions {
	/**
	 * 是否启用加密传输协议
	 * @default false
	 */
	https?: boolean
	/**
	 * 是否启用 HTTP/2 协议
	 * @default false
	 */
	http2?: boolean
	/**
	 * 允许请求的最大字节数
	 * @default 20 * 1024 * 1024
	 */
	maxAllowedContentLength?: number
}

/** 表示一个 HTTP 请求对象 */
export class HTTPRequest extends IncomingMessage {

	/**
	 * 获取请求的方法
	 * @example "POST"
	 */
	method!: string

	/**
	 * 获取请求的地址
	 * @example "/index.html?from=tpack&type=source"
	 */
	url!: string

	/**
	 * 获取请求的路径名
	 * @example "/index.html"
	 */
	path!: string

	/**
	 * 获取请求的查询字符串
	 * @example "from=tpack&type=source"
	 */
	search!: string | null

	/** 当前请求的查询参数 */
	private _query?: ParsedUrlQuery

	/** 获取当前请求的查询参数 */
	get query() {
		if (this._query === undefined) {
			this._query = parseQueryString(this.search || "")
		}
		return this._query
	}

	/** 获取远程客户端的 IP 地址 */
	get remoteAddress() { return this.socket.remoteAddress }

	/** 获取远程客户端的端口 */
	get remotePort() { return this.socket.remotePort }

	/** 获取本地服务端的 IP 地址 */
	get localAddress() { return this.socket.localAddress }

	/** 获取本地服务端的端口 */
	get localPort() { return this.socket.localPort }

	/** 判断当前请求是否使用了加密传输协议（HTTPS） */
	get isSecure() { return (this.socket as TLSSocket).encrypted === true }

	/** 获取当前请求的传输协议 */
	get protocol() { return this.isSecure ? "https:" : "http:" }

	/** 获取当前请求的主机名和端口 */
	get host() { return this.headers["host"] || `${this.localAddress}${this.localPort === (this.isSecure ? 443 : 80) ? "" : ":" + this.localPort}` }

	/** 获取当前请求的绝对地址 */
	get href() { return `${this.protocol}//${this.host}${this.url}` }

	/** 获取客户端的 IP 地址，如果用户使用了代理，则尝试获取代理报告的原 IP 地址 */
	get ip() { return this.headers["x-forwarded-for"] || this.headers["via"] || this.localAddress }

	/** 判断当前请求是否来自本机 */
	get isLocal() { return this.socket.localAddress === this.socket.remoteAddress }

	/** 获取客户端的证书信息，如果请求未使用加密传输协议，则返回 `undefined` */
	get certificate() { return this.isSecure ? (this.socket as TLSSocket).getPeerCertificate(true) : undefined }

	/** 获取客户端的可用语言 */
	get acceptLanguages() { return parseMultiValueHeader(this.headers["accept-language"]) }

	/** 获取当前请求的来源地址 */
	get referer() { return this.headers["referer"] }

	/** 获取客户端的用户代理字符串 */
	get userAgent() { return this.headers["user-agent"] }

	/** 获取客户端的上一次缓存时间 */
	get ifModifiedSince() { return parseDateHeader(this.headers["if-modified-since"]) }

	/** 获取客户端支持的所有 MIME 类型 */
	get acceptTypes() { return parseMultiValueHeader(this.headers["accept"]) }

	/** 获取客户端支持的所有编码 */
	get acceptCharsets() { return parseMultiValueHeader(this.headers["accept-charsets"] as string) }

	/** 获取当前请求内容的 MIME 类型 */
	get contentType() { return parseContentType(this.headers["content-type"]) }

	/** 获取当前请求内容的字符编码 */
	get contentEncoding() { return parseCharset(this.headers["content-type"]) }

	/** 获取当前请求已传输的字节数 */
	get totalBytes() { return this.socket.bytesRead }

	/** 获取当前请求内容的字节长度 */
	get contentLength() { return this.body ? this.body.length : 0 }

	/** 获取当前请求的二进制内容 */
	body?: Buffer

	/** 获取用户提交的数据 */
	get data() {
		switch (this.contentType) {
			case "application/json":
				return this.json
			case "application/x-www-form-urlencoded":
			case "multipart/form-data":
				return this.forms
			default:
				if (this.contentType?.startsWith("text/")) {
					return this.text
				}
				return this.body
		}
	}

	/** 当前请求的文本 */
	private _text?: string

	/** 获取当前请求的文本内容，如果当前请求不包含内容则返回 `undefined` */
	get text() {
		if (this._text === undefined && this.body !== undefined) {
			this._text = this.body.toString(this.contentEncoding as BufferEncoding)
		}
		return this._text
	}

	/** 当前请求的表单数据 */
	private _forms?: ReturnType<typeof parseMultipart>

	/** 获取当前请求的表单数据，如果当前请求不包含表单则返回 `undefined` */
	get forms() {
		if (this._forms === undefined) {
			switch (this.contentType) {
				case "application/x-www-form-urlencoded":
					this._forms = parseQueryString(this.text || "")
					break
				case "multipart/form-data":
					const boundary = /;\s*boundary=([^;]*)/.exec(this.headers["content-type"]!)
					if (boundary) {
						this._forms = parseMultipart(this.body || Buffer.alloc(0), boundary[1])
					} else {
						this._forms = Object.create(null)
					}
					break
			}
		}
		return this._forms
	}

	/** 获取当前请求的文件，如果当前请求不包含文件则返回 `null`数组 */
	get files() {
		const files: HTTPFile[] = []
		for (const key in this.forms) {
			const value = this.forms[key]
			if (value instanceof HTTPFile) {
				files.push(value)
			}
		}
		return files
	}

	/** 当前请求的 JSON 数据 */
	private _json?: any

	/** 获取当前请求的 JSON 数据，如果当前请求不包含 JSON 数据则返回 `undefined` */
	get json() {
		if (this._json === undefined && this.contentType === "application/json") {
			this._json = JSON.parse(this.text!)
		}
		return this._json
	}

	/** 请求的 Cookies */
	private _cookies?: ParsedUrlQuery

	/** 获取请求的 Cookies */
	get cookies() { return this._cookies || (this._cookies = parseCookies(this.headers["cookie"])) }

	/** 当前请求的参数 */
	private _params?: ReturnType<typeof parseMultipart>

	/** 获取当前请求的所有参数 */
	get params() {
		if (this._params === undefined) {
			this._params = {
				...this.headers,
				...this.cookies,
				...this.forms,
				...this.json,
				...this.query
			}
		}
		return this._params!
	}

}

/** 表示一个 HTTP 响应对象 */
export class HTTPResponse extends ServerResponse {

	/** 获取或设置响应内容的 MIME 类型 */
	get contentType() { return this.getHeader("Content-Type") as string }
	set contentType(value) { this.setHeader("Content-Type", value) }

	/** 获取或设置响应内容的字节长度 */
	get contentLength() { return this.getHeader("Content-Length") as number }
	set contentLength(value) { this.setHeader("Content-Length", value) }

	/** 获取或设置本次请求在客户端缓存的失效时间，`undefined` 表示禁用缓存 */
	get expires() { return parseDateHeader(this.getHeader("Expires") as string | undefined) }
	set expires(value) {
		if (value) {
			this.setHeader("Expires", value.toUTCString())
		} else {
			this.removeHeader("Expires")
		}
	}

	/** 获取或设置响应内容的最后修改时间 */
	get lastModified() { return parseDateHeader(this.getHeader("Last-Modified") as string | undefined) }
	set lastModified(value) {
		if (value) {
			this.setHeader("Last-Modified", value.toUTCString())
		} else {
			this.removeHeader("Last-Modified")
		}
	}

	/** 获取或设置跳转的地址 */
	get redirectLocation() { return this.getHeader("Location") }
	set redirectLocation(value) {
		if (value) {
			this.setHeader("Location", value)
		} else {
			this.removeHeader("Location")
		}
	}

	/**
	 * 将客户端重定向到新的地址
	 * @param url 要重定向的新地址
	 * @param end 是否结束请求
	 */
	redirect(url: string, end = true) {
		this.statusCode = 302
		this.redirectLocation = url
		if (end) {
			this.end(`Object moved to ${url}`)
		}
	}

	/**
	 * 设置客户端的 Cookie
	 * @param name 要设置的 Cookie 名
	 * @param value 要设置的 Cookie 值
	 * @param expires Cookie 过期的秒数或客户端时间
	 * @param domain 要设置的 Cookie 所在域
	 * @param path 要设置的 Cookie 路径
	 * @param httpOnly 是否禁止在客户端脚本中获取此 Cookie
	 * @param secure 是否只在安全协议下传输 Cookie
	 * @param sameSite Cookie 的同源策略
	 */
	setCookie(name: string, value: string, expires?: Date | number, domain?: string, path?: string, httpOnly?: boolean, secure?: boolean, sameSite?: "Strict" | "None" | "Lax") {
		let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
		if (typeof expires === "number") {
			cookie += `; Max-Age=${expires}`
		}
		if (domain) {
			cookie += `; Domain=${domain}`
		}
		if (path) {
			cookie += `; Path=${path}`
		}
		if (expires instanceof Date) {
			cookie += `; Expires=${expires.toUTCString()}`
		}
		if (httpOnly) {
			cookie += "; HttpOnly"
		}
		if (secure) {
			cookie += "; Secure"
		}
		if (sameSite) {
			cookie += `; SameSite=${sameSite}`
		}
		const exists = this.getHeader("Set-Cookie") as string[] | undefined
		this.setHeader("Set-Cookie", exists ? Array.isArray(exists) ? [...exists, cookie] : [exists, cookie] : cookie)
		return cookie
	}

	/**
	 * 删除客户端的 Cookie
	 * @param name 要设置的 Cookie 名
	 */
	deleteCookie(name: string) {
		const date = new Date()
		date.setSeconds(date.getSeconds() - 1)
		return this.setCookie(name, "", date)
	}

	/**
	 * 向客户端写入一个 JSON 并关闭连接
	 * @param data 要写入的数据
	 */
	writeJSON(data: any) {
		this.statusCode = 200
		this.contentType = "application/json"
		this.end(JSON.stringify(data))
	}

	/**
	 * 向客户端写入一个 HTML 并关闭连接
	 * @param data 要写入的数据
	 */
	writeHTML(data: string) {
		this.statusCode = 200
		this.contentType = "text/html"
		this.end(data)
	}

}

/** 表示一个 HTTP 服务器（支持 HTTPS、HTTP/2） */
export interface HTTPServer extends Http2SecureServer { }
/** 表示 HTTP 服务器的附加选项 */
export interface HTTPServerOptions extends ServerOptions, SecureServerOptions { }
/** 表示一个 HTTP 请求对象 */
export interface HTTPRequest extends Omit<Http2ServerRequest, keyof IncomingMessage> { }
/** 表示一个 HTTP 响应对象 */
export interface HTTPResponse extends Omit<Http2ServerResponse, keyof ServerResponse> { }

/** 解析多个值组成的 HTTP 头 */
function parseMultiValueHeader(value: string | undefined) {
	const values: { value: string, quality: number }[] = []
	if (value) {
		for (const part of value.split(/,\s*/)) {
			const semicolon = part.indexOf(";")
			if (semicolon < 0) {
				values.push({ value: part, quality: 1 })
			} else {
				values.push({ value: part.substring(0, semicolon), quality: +(/q=(0?\.\d+|0)/.exec(part.substring(semicolon + 1)) || [0, 1])[1] })
			}
		}
		values.sort((x, y) => y.quality - x.quality)
	}
	return values
}

/** 解析包含日期的 HTTP 头 */
function parseDateHeader(value: string | undefined) {
	if (value === undefined) {
		return undefined
	}
	return new Date(value)
}

/** 解析 MIME 类型 */
function parseContentType(contentType: string | undefined) {
	if (contentType === undefined) {
		return undefined
	}
	const semicolon = contentType.indexOf(";")
	return semicolon < 0 ? contentType : contentType.substring(0, semicolon)
}

/** 解析字符集 */
function parseCharset(contentType: string | undefined) {
	if (contentType === undefined) {
		return "utf-8"
	}
	const charset = /;\s*charset=([^;]*)/.exec(contentType)
	return charset ? charset[1].toLowerCase() : "utf-8"
}

/**
 * 解析一个 `multipart/form-data` 请求内容
 * @param body 要解析的原始数据
 * @param boundary 请求头标记的分隔符
 */
export function parseMultipart(body: Buffer, boundary: string) {
	const result: { [key: string]: string | HTTPFile | (string | HTTPFile)[] } = Object.create(null)
	const boundaryBytes = Buffer.from("--" + boundary)
	// 跳过首行
	let index = body.indexOf(boundaryBytes)
	if (index < 0) {
		return result
	}
	index += boundaryBytes.length
	if (body[index] !== 13 /*\r*/ || body[index + 1] !== 10 /*\n*/) {
		return result
	}
	index += 2
	outer: while (index < body.length) {
		// 解析头
		const headers: IncomingHttpHeaders = Object.create(null)
		while (index < body.length) {
			if (body[index] === 13 /*\r*/ && body[index + 1] === 10 /*\n*/) {
				index += 2
				break
			}
			// 解析头名字
			const nameStartIndex = index
			while (index < body.length) {
				if (body[index] === 58 /*:*/) {
					break
				}
				if (body[index] === 13 /*\r*/ && body[index + 1] === 10 /*\n*/) {
					break
				}
				index++
			}
			const name = body.toString(undefined, nameStartIndex, index)
			index++
			// 解析头内容
			while (body[index] === 32 /* */) index++
			const valueStartIndex = index
			while (index < body.length) {
				if (body[index] === 13 /*\r*/ && body[index + 1] === 10 /*\n*/) {
					break
				}
				index++
			}
			const value = body.toString(undefined, valueStartIndex, index)
			index += 2
			addField(headers, name.toLowerCase(), value)
		}
		// 解析字段名
		let name = ""
		let fileName: string | undefined
		const disposition = headers["content-disposition"] || ""
		disposition.replace(/;\s*(file)?name=("([^"]*)"|[^;]*)(?=$|;)/g, (source, file, value1, value2) => {
			if (value2 === undefined) value2 = value1
			if (file !== undefined) {
				fileName = value2
			} else {
				name = value2
			}
			return ""
		})
		// 解析正文
		const startIndex = index
		while (true) {
			const endIndex = body.indexOf(boundaryBytes, index)
			if (endIndex < 0) {
				break outer
			}
			index = endIndex + boundaryBytes.length
			if (body[index] === 13 /*\r*/ && body[index + 1] === 10 /*\n*/) {
				index += 2
				addField(result, name, fileName !== undefined ? new HTTPFile(fileName, headers, body, startIndex, endIndex - 2) : body.toString(parseCharset(headers["content-type"]) as BufferEncoding, startIndex, endIndex - 2))
				continue outer
			}
			if (body[index] === 45 /*-*/ && body[index + 1] === 45 /*-*/) {
				addField(result, name, fileName !== undefined ? new HTTPFile(fileName, headers, body, startIndex, endIndex - 2) : body.toString(parseCharset(headers["content-type"]) as BufferEncoding, startIndex, endIndex - 2))
				break outer
			}
		}
	}
	return result
}

/** 表示一个 HTTP 请求文件 */
export class HTTPFile {

	/** 获取文件名 */
	readonly fileName: string

	/** 获取当前文件的请求头 */
	readonly headers: IncomingHttpHeaders

	/** 文件的内容所在的二进制缓存对象 */
	private _body: Buffer

	/** 文件的内容在二进制缓存对象的开始索引（从 0 开始） */
	private _startIndex: number

	/** 文件的内容在二进制缓存对象的结束索引（从 0 开始）（不含） */
	private _endIndex: number

	/**
	 * 初始化新的 HTTP 请求文件
	 * @param headers 请求头
	 * @param body 文件的内容所在的二进制缓存对象
	 * @param startIndex 文件的内容在二进制缓存对象的开始索引（从 0 开始）
	 * @param endIndex 文件的内容在二进制缓存对象的结束索引（从 0 开始）（不含）
	 */
	constructor(fileName: string, headers: IncomingHttpHeaders, body: Buffer, startIndex = 0, endIndex = body.length) {
		this.fileName = fileName
		this.headers = headers
		this._body = body
		this._startIndex = startIndex
		this._endIndex = endIndex
	}

	/** 获取文件的字节大小 */
	get contentLength() { return this._endIndex - this._startIndex }

	/** 获取当前文件的 MIME 类型 */
	get contentType() { return parseContentType(this.headers["content-type"]) }

	/** 获取当前文件的编码 */
	get contentEncoding() { return parseCharset(this.headers["content-type"]) }

	/** 获取请求文件的二进制内容 */
	get body() {
		if (this._startIndex > 0 || this._endIndex < this._body.length) {
			this._body = this._body.slice(this._startIndex, this._endIndex)
			this._startIndex = 0
			this._endIndex = this._body.length
		}
		return this._body
	}

	/** 获取请求文件的文本内容 */
	get text() { return this.body.toString(this.contentEncoding as BufferEncoding) }

}

/**
 * 解析请求的数据
 * @param request 请求数据
 * @param maxAllowedContentLength 最大允许的内容长度
 */
export function parseBodyAsBuffer(request: IncomingMessage, maxAllowedContentLength?: number) {
	return new Promise<Buffer>((resolve, reject) => {
		const bodyChunks: Buffer[] = []
		let size = 0
		request.on("data", (chunk: Buffer) => {
			size += chunk.length
			if (maxAllowedContentLength !== undefined && size > maxAllowedContentLength) {
				bodyChunks.length = 0
				reject(`Request content length exceeds the limit`)
				return
			}
			bodyChunks.push(chunk)
		})
		request.on("end", () => {
			resolve(Buffer.concat(bodyChunks, size))
		})
	})
}

/**
 * 解析请求的数据为文本
 * @param request 请求数据
 * @param maxAllowedContentLength 最大允许的内容长度
 */
export async function parseBodyAsText(request: IncomingMessage, maxAllowedContentLength?: number) {
	return new Promise<string>((resolve, reject) => {
		let body = ""
		let size = 0
		request.on("data", (chunk: Buffer) => {
			if (maxAllowedContentLength !== undefined && (size += chunk.length) > maxAllowedContentLength) {
				body = ""
				reject(`Request content length exceeds the limit`)
				return
			}
			body += chunk.toString()
		})
		request.on("end", () => {
			resolve(body)
		})
	})
}

/**
 * 解析请求的数据为 JSON
 * @param request 请求数据
 * @param maxAllowedContentLength 最大允许的内容长度
 */
export async function parseBodyAsJSON(request: IncomingMessage, maxAllowedContentLength?: number) {
	return JSON.parse(await parseBodyAsText(request, maxAllowedContentLength))
}

/**
 * 解析含表单的请求数据
 * @param request 请求数据
 * @param maxAllowedContentLength 最大允许的内容长度
 */
export async function parseBodyAsMultipartForm(request: IncomingMessage, maxAllowedContentLength?: number) {
	const boundary = /;\s*boundary=([^;]*)/.exec(request.headers["content-type"])
	if (!boundary) {
		return null
	}
	const buffer = await parseBodyAsBuffer(request, maxAllowedContentLength)
	return parseMultipart(buffer, boundary[1])
}

/** 解析 HTTP Cookies 头 */
export function parseCookies(value: string | undefined) {
	const cookies = Object.create(null)
	if (value) {
		for (const cookie of value.split(/\s*;\s*/)) {
			const eq = cookie.indexOf("=")
			if (eq < 0) {
				addField(cookies, decodeURIComponent(cookie), null)
			} else {
				addField(cookies, decodeURIComponent(cookie.substring(0, eq)), decodeURIComponent(cookie.substring(eq + 1)))
			}
		}
	}
	return cookies
}

/** 添加已解析的字段 */
function addField(fields: { [key: string]: any }, name: string, value: any) {
	const exists = fields[name]
	if (exists === undefined) {
		fields[name] = value
	} else if (Array.isArray(exists)) {
		exists.push(value)
	} else {
		fields[name] = [exists, value]
	}
}

/** 表示一个 HTTP 会话状态管理对象 */
export class HTTPSessionManager {

	/** 获取用户存储会话 ID 的 Cookie 名 */
	readonly cookieName: string

	/** 获取会话共享的域 */
	readonly domain?: string

	/** 获取会话过期的秒数 */
	readonly maxAge: number

	/** 是否只允许在安全协议下传输会话 ID */
	readonly secure: boolean

	/** 清理过期会话的计时器 */
	private timer: ReturnType<typeof setInterval>

	/**
	 * 初始化新的 HTTP 会话状态管理对象
	 * @param maxAge 会话过期的秒数
	 * @param domain 会话共享的域
	 * @param secure 只允许在安全协议下传输会话 ID
	 * @param cookieName 存储会话 ID 的 Cookie 名
	 */
	constructor(maxAge = 2 * 60 * 60, domain?: string, secure = false, cookieName = "_SESSION_ID") {
		this.maxAge = maxAge
		this.domain = domain
		this.secure = secure
		this.cookieName = cookieName
		this.timer = setInterval(() => {
			this.clean()
		}, maxAge)
		this.timer.unref()
	}

	/** 所有会话状态对象，键为远程 IP + 会话 ID */
	private readonly _sessions = new Map<string, { session: { [key: string]: any }, expires: number }>()

	/**
	 * 获取属于某个请求的会话对象
	 * @param request 当前的请求对象
	 * @param response 当前的响应对象
	 */
	getSession(request: HTTPRequest, response: HTTPResponse) {
		let sessionID = request.cookies[this.cookieName]
		let data = sessionID ? this._sessions.get(request.remoteAddress + sessionID) : undefined
		if (!data || data.expires <= Date.now()) {
			response.setCookie(this.cookieName, request.cookies[this.cookieName] = sessionID = this.createSessionId(request), this.maxAge, this.domain, undefined, true, this.secure)
			this._sessions.set(request.remoteAddress + sessionID, data = {
				session: Object.create(null),
				expires: Date.now() + this.maxAge * 1000
			})
		} else {
			data.expires = Date.now() + this.maxAge * 1000
		}
		return data.session
	}

	/**
	 * 清除属于某个请求的会话对象
	 * @param request 当前的请求对象
	 * @param response 当前的响应对象
	 */
	deleteSession(request: HTTPRequest, response: HTTPResponse) {
		const sessionID = request.cookies[this.cookieName]
		if (sessionID !== undefined) {
			this._sessions.delete(request.remoteAddress + sessionID)
			delete request.cookies[this.cookieName]
			response.deleteCookie(this.cookieName)
		}
	}

	/**
	 * 生成一个新的会话 ID
	 * @param request 当前的请求对象
	 */
	private createSessionId(request: HTTPRequest) {
		while (true) {
			const sessionID = randomBytes(16).toString("hex")
			if (!((request.remoteAddress + sessionID) in this._sessions)) {
				return sessionID
			}
		}
	}

	/** 清理已过期的会话数据 */
	clean() {
		const now = Date.now()
		for (const [key, value] of this._sessions) {
			if (value.expires <= now) {
				this._sessions.delete(key)
			}
		}
	}

	/** 释放占用的系统资源 */
	close() {
		clearInterval(this.timer)
		this._sessions.clear()
	}

}