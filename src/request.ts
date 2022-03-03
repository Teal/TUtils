import { ClientRequest, IncomingMessage, OutgoingHttpHeaders, request as httpRequest } from "http"
import { request as httpsRequest, RequestOptions } from "https"
import { stringify } from "querystring"
import { Readable } from "stream"
import { format, parse, resolve, UrlObject, UrlWithStringQuery } from "url"
import { createBrotliDecompress, createGunzip, createInflate } from "zlib"

/**
 * 发送一个 HTTP/HTTPS 请求
 * @param url 要请求的地址
 * @param options 附加选项
 * @returns 返回本次请求对象，可以调用 `.abort()` 终止请求
 */
export function request(url: string | UrlObject | URL, options?: HTTPClientRequestOptions) {
	const opt = { ...options } as HTTPClientRequestOptions & RequestOptions
	// 解析请求地址
	if (typeof url === "string") {
		url = parse(url, false, true)
	}
	opt.protocol = url.protocol
	opt.hostname = url.hostname
	opt.port = url.port
	opt.auth = (url as UrlWithStringQuery).auth || ((url as URL).username != undefined && (url as URL).password != undefined ? `${(url as URL).username}:${(url as URL).password}` : (url as URL).username)
	opt.path = `${url.pathname || "/"}${url.search || ""}`
	// 生成请求头
	const headers: OutgoingHttpHeaders = {
		"accept-encoding": "gzip, deflate"
	}
	if (opt.userAgent !== null) {
		headers["user-agent"] = opt.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.0.0 Safari/537.36"
	}
	if (opt.cookieJar) {
		headers["cookie"] = opt.cookieJar.getCookiesHeader(url)
	}
	let data = opt.data
	let isStream: boolean | undefined
	if (data != undefined) {
		if (opt.method === "GET") {
			opt.path += `${opt.path.includes("?") ? "&" : "?"}${stringify(data)}`
			data = undefined
		} else {
			if (!opt.method) {
				opt.method = "POST"
			}
			isStream = typeof data === "object" && typeof data.pipe === "function"
			if (opt.dataType || !isStream) {
				switch (opt.dataType) {
					case undefined:
					case "form":
						headers["content-type"] = "application/x-www-form-urlencoded"
						data = stringify(data)
						break
					case "json":
						headers["content-type"] = "application/json"
						data = JSON.stringify(data)
						break
					case "multipart":
						const boundary = "----WebKitFormBoundary" + Date.now().toString(36) + Math.random().toString(36).substring(2)
						headers["content-type"] = `multipart/form-data; boundary=${boundary}`
						data = stringifyMultipart(data, boundary)
						break
					default:
						headers["content-type"] = opt.dataType
						if (typeof data === "string") {
							headers["content-type"] += "; charset=utf-8"
						}
						break
				}
				headers["content-length"] = Buffer.byteLength(data)
			}
		}
	}
	for (const key in opt.headers) {
		headers[key.toLowerCase()] = opt.headers[key]
	}
	opt.headers = headers
	// 底层发送请求
	const req = (!opt.protocol || opt.protocol === "http:" ? httpRequest : httpsRequest)(opt, (response: HTTPClientResponse) => {
		// 支持 Cookie
		if (opt.cookieJar) {
			const setCookies = response.headers["set-cookie"]
			if (setCookies) {
				const now = new Date()
				for (const setCookie of setCookies) {
					opt.cookieJar.setCookiesFromHeader(url, setCookie, now)
				}
			}
		}
		// 支持跳转
		// https://zh.wikipedia.org/zh-hans/HTTP状态码
		// 306：已弃用，不再支持
		const statusCode = response.statusCode!
		if (statusCode >= 300 && statusCode < 400 && (opt.maxRedirects === undefined || opt.maxRedirects > 0)) {
			const location = response.headers["location"]
			if (location !== undefined) {
				response.resume()
				// 301, 302：将 POST 改为 GET，重发请求
				if ((statusCode === 301 || statusCode === 302) && opt.method && opt.method !== "GET" && opt.method !== "HEAD") {
					opt.method = "GET"
					opt.data = undefined
					delete headers["content-length"]
					delete headers["content-type"]
				}
				opt.maxRedirects = opt.maxRedirects === undefined ? 9 : opt.maxRedirects - 1
				const newRequest = request(resolve(format(url), location), opt)
				newRequest.on("resolve", (response: HTTPClientResponse) => {
					req.emit("resolve", response)
				})
				newRequest.on("reject", (error: Error) => {
					req.emit("reject", error)
				})
				req.on("abort", () => {
					newRequest.abort()
				})
				req.emit("redirect", newRequest)
				return
			}
		}
		// 解析正文
		let stream: Readable
		switch (response.headers["content-encoding"]) {
			case "gzip":
				stream = response.pipe(createGunzip())
				break
			case "deflate":
				stream = response.pipe(createInflate())
				break
			case "br":
				// 需要 node v11.7+ 支持
				stream = response.pipe(createBrotliDecompress())
				break
			default:
				stream = response
				break
		}
		const chunks: Buffer[] = []
		stream.on("data", (chunk: Buffer) => {
			chunks.push(chunk)
		})
		stream.on("end", () => {
			response.urlObject = url as UrlObject | URL
			Object.defineProperty(response, "url", {
				get() {
					return format(url)
				}
			})
			response.body = Buffer.concat(chunks)
			Object.defineProperty(response, "text", {
				get() {
					return this.body.toString(parseCharset(this.headers["content-type"]) || "utf-8")
				}
			})
			Object.defineProperty(response, "json", {
				get() {
					return JSON.parse(this.text || "null")
				}
			})
			req.emit("resolve", response)
		})
	}) as HTTPClientRequest
	req.on("error", error => {
		req.error = error
		req.emit("reject", error)
	})
	// 支持超时后自动断开连接
	if (opt.timeout === undefined) opt.timeout = 300000
	if (opt.timeout) {
		req.on("timeout", () => {
			req.abort()
		})
	}
	if (isStream) {
		data.pipe(req)
	} else {
		req.end(data)
	}
	req.then = (onfulfilled?: ((value: HTTPClientResponse) => void) | null, onrejected?: ((reason: Error) => void) | null): any => {
		if (req.error) {
			onrejected?.(req.error)
		} else if (req.response) {
			onfulfilled?.(req.response)
		} else {
			if (onfulfilled) req.once("resolve", onfulfilled)
			if (onrejected) req.once("reject", onrejected)
		}
		return req
	}
	return req
}

/** 表示 HTTP 客户端请求的附加选项 */
export interface HTTPClientRequestOptions extends Omit<RequestOptions, "protocol" | "hostname" | "host" | "port" | "auth" | "path"> {
	/**
	 * 请求的 HTTP 方法（全大写）
	 * @default "GET"
	 */
	method?: string
	/** 附加的 HTTP 请求头 */
	headers?: OutgoingHttpHeaders
	/**
	 * 请求的代理字符串
	 * @default "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.0.0 Safari/537.36"
	 */
	userAgent?: string | null
	/**
	 * 请求内容的类型
	 * - "json": 请求头的 Content-Type 会被设置为 "application/json"；请求的数据将按 JSON 格式化
	 * - "form": 请求头的 Content-Type 会被设置为 "application/x-www-form-urlencoded"；请求的数据将按表单格式化
	 * - "multipart": 请求头的 Content-Type 会被设置为 "multipart/form-data"；请求的数据将按含文件的表单格式化
	 * - "text": 请求头的 Content-Type 会被设置为 "text/plain"
	 * - 其它: 请求头的 Content-Type 会被设置为 dataType，请求的数据将原样发送
	 * @default "form"
	 */
	dataType?: "json" | "form" | "multipart" | "text" | string
	/** 请求的内容，可以是字符串、流或 JSON 对象 */
	data?: any
	/**
	 * 响应服务端的 3XX 重定向的最大次数，如果为 0 则不重定向
	 * @default 10
	 */
	maxRedirects?: number
	/** 如果需要保存 Cookie 以便下一次请求提交，可以在两次请求时传入同一个 Cookie 容器对象 */
	cookieJar?: CookieJar
}

/** 表示一个 HTTP 客户端响应 */
export interface HTTPClientRequest extends ClientRequest, PromiseLike<HTTPClientResponse> {
	/** 获取请求的错误 */
	error?: Error
	/** 获取服务端的响应 */
	response?: HTTPClientResponse
}

/** 表示一个 HTTP 客户端响应 */
export interface HTTPClientResponse extends IncomingMessage {
	/** 获取响应的实际地址 */
	urlObject?: UrlObject
	/** 获取响应的二进制数据 */
	body?: Buffer
	/** 获取响应的文本数据 */
	text?: string
	/** 获取响应的 JSON 数据 */
	json?: any
}

/** 解析字符集 */
function parseCharset(contentType: string | undefined) {
	if (contentType === undefined) {
		return undefined
	}
	const charset = /;\s*charset=([^;]*)/.exec(contentType)
	return charset ? charset[1] : undefined
}

/** 格式化多段数据 */
function stringifyMultipart(data: any, boundary: string) {
	const boundaryBuffer = Buffer.from("--" + boundary)
	const crlf = Buffer.from([13, 10])
	const buffers = []
	let size = 0
	for (const key in data) {
		const value = data[key]
		buffers.push(boundaryBuffer, crlf)
		size += boundaryBuffer.length + crlf.length
		if (value && typeof value === "object") {
			let headers = `Content-Disposition: form-data; name="${key}"`
			if (value.fileName) {
				headers += `; filename="${value.fileName}"`
			}
			headers += "\r\n"
			if (value.contentType) {
				headers += `Content-Type: ${value.contentType}\r\n`
			}
			for (const key in value.headers) {
				if (key === "content-disposition" || key === "content-type") {
					continue
				}
				headers += `${key}: ${value.headers[key]}\r\n`
			}
			headers += "\r\n"
			const buffer = Buffer.from(headers)
			buffers.push(buffer)
			size += buffer.length
			let body = value.body
			if (body) {
				if (typeof body !== "object") {
					body = Buffer.from(String(body))
				}
				buffers.push(body)
				size += body.length
			}
			buffers.push(crlf)
			size += crlf.length
		} else {
			const buffer = Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n${String(value)}\r\n`)
			buffers.push(buffer)
			size += buffer.length
		}
	}
	buffers.push(boundaryBuffer, Buffer.from("--"))
	size += boundaryBuffer.length + 2
	return Buffer.concat(buffers, size)
}

/** 表示一个 Cookie 容器 */
export class CookieJar {

	/**
	 * 获取发送指定请求时提交的 Cookie 请求头
	 * @param url 要发送的地址
	 */
	getCookiesHeader(url: string | URL | UrlObject) {
		let header = ""
		for (const cookie of this.getCookies(url)) {
			if (header) {
				header += "; "
			}
			header += cookie.name.replace(/=/g, "%3D")
			header += "="
			header += cookie.value.replace(/;/g, "%3B")
		}
		return header
	}

	/**
	 * 从 HTTP 响应的 Set-Cookie 头更新 Cookie
	 * @param url 当前请求的地址
	 * @param header 响应的 Set-Cookie 头
	 * @param now 当前客户端时间
	 */
	setCookiesFromHeader(url: string | URL | UrlObject, header: string, now = new Date()) {
		this.setCookie(url, parseSetCookie(header, now), now)
	}

	/** 所有 Cookies，存储所属的域到所属的路径到 Cookie 名到 Cookie 对象的映射关系 */
	private readonly _cookies = new Map<string, Map<string, Map<string, HTTPCookie>>>()

	/**
	 * 获取属于某个地址的所有 Cookie
	 * @param url 所属的地址
	 * @param now 如果提供了当前时间，则过滤已过期的 Cookie
	 * @param noHttpOnly 是否过滤不能在客户端脚本获取的 Cookie
	 * @param noSecure 是否过滤只能在加密协议传输的 Cookie
	 */
	getCookies(url: string | URL | UrlObject, now?: Date, noHttpOnly?: boolean, noSecure?: boolean) {
		const cookies: HTTPCookie[] = []
		const urlObject = typeof url === "string" ? parse(url) : url
		const domain = getCookieDomain(urlObject.hostname)
		const path = getCookiePath(urlObject.pathname)
		if (noSecure === undefined) noSecure = urlObject.protocol !== "https:" && urlObject.protocol !== "wss:"
		for (const [cookieDomain, paths] of this._cookies.entries()) {
			if (!matchDomain(domain, cookieDomain)) {
				continue
			}
			for (const [cookiePath, names] of paths.entries()) {
				if (!matchPath(path, cookiePath)) {
					continue
				}
				for (const cookie of names.values()) {
					if (noHttpOnly && cookie.httpOnly) {
						continue
					}
					if (noSecure && cookie.secure) {
						continue
					}
					if (now && cookie.expires && cookie.expires <= now) {
						continue
					}
					// 如果 Cookie 不存在 Domain，则不允许从子域获取 Cookie
					if (!cookie.domain && cookieDomain !== domain) {
						continue
					}
					cookies.push(cookie)
				}
			}
		}
		return cookies
	}

	/**
	 * 添加指定地址所属的 Cookie
	 * @param url 所属的地址
	 * @param cookie 要添加的 Cookie
	 * @param now 如果提供了当前时间，则删除已过期的 Cookie
	 */
	setCookie(url: string | URL | UrlObject, cookie: HTTPCookie, now?: Date) {
		const urlObject = typeof url === "string" ? parse(url) : url
		// 只能设置同源的域
		let domain = getCookieDomain(urlObject.hostname)
		if (cookie.domain) {
			const cookieDomain = getCookieDomain(cookie.domain).replace(/^\./, "")
			if (matchDomain(cookieDomain, domain)) {
				domain = cookieDomain
			} else {
				return
			}
		}
		let paths = this._cookies.get(domain)
		if (!paths) {
			this._cookies.set(domain, paths = new Map())
		}
		const path = getCookiePath(cookie.path)
		let cookies = paths.get(path)
		if (!cookies) {
			paths.set(path, cookies = new Map())
		}
		if (now && cookie.expires && cookie.expires <= now) {
			cookies.delete(cookie.name)
		} else {
			cookies.set(cookie.name, cookie)
		}
	}

	/**
	 * 获取属于某个地址的指定名称的 Cookie 值，如果不存在则返回 `undefined`
	 * @param url 所属的地址
	 * @param name 要获取的 Cookie 名
	 * @param now 如果提供了当前时间，则过滤已过期的 Cookie
	 * @param noHttpOnly 是否过滤不能在客户端脚本获取的 Cookie
	 * @param noSecure 是否过滤只能在加密协议传输的 Cookie
	 */
	getCookie(url: string | URL | UrlObject, name: string, now?: Date, noHttpOnly?: boolean, noSecure?: boolean) {
		const urlObject = typeof url === "string" ? parse(url) : url
		const domain = getCookieDomain(urlObject.hostname)
		const path = getCookiePath(urlObject.pathname)
		if (noSecure === undefined) noSecure = urlObject.protocol !== "https:" && urlObject.protocol !== "wss:"
		for (const [cookieDomain, paths] of this._cookies.entries()) {
			if (!matchDomain(domain, cookieDomain)) {
				continue
			}
			for (const [cookiePath, names] of paths.entries()) {
				if (!matchPath(path, cookiePath)) {
					continue
				}
				const cookie = names.get(name)
				if (cookie === undefined) {
					continue
				}
				if (noHttpOnly && cookie.httpOnly) {
					continue
				}
				if (noSecure && cookie.secure) {
					continue
				}
				if (now && cookie.expires && cookie.expires <= now) {
					continue
				}
				// 如果 Cookie 不存在 Domain，则不允许从子域获取 Cookie
				if (!cookie.domain && cookieDomain !== domain) {
					continue
				}
				return cookie.value
			}
		}
		return undefined
	}

}

/** 表示一个 HTTP Cookie */
export interface HTTPCookie {
	/** Cookie 的名字（不能包含：`( ) < > @ , ; : \ " /  [ ] ? = { }`） */
	name: string
	/** Cookie 的值 */
	value: string
	/** Cookie 的过期时间 */
	expires?: Date
	/** Cookie 所属的域 */
	domain?: string
	/** Cookie 所属的路径 */
	path?: string
	/** 是否禁止在客户端脚本中获取此 Cookie */
	httpOnly?: boolean
	/** 是否只在安全协议下才能传输此 Cookie */
	secure?: boolean
	/** Cookie 的同源策略 */
	sameSite?: boolean
}

/**
 * 解析一个 HTTP Set-Cookie 响应头
 * @param header 要解析的 Set-Cookie 响应头
 * @param now 当前客户端时间
 * @see https://tools.ietf.org/html/rfc6265#section-5.2
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 */
function parseSetCookie(header: string, now: Date) {
	const cookie = {} as HTTPCookie & { [name: string]: string }
	const parts = header.split(";")
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const equalIndex = part.indexOf("=")
		const name = equalIndex < 0 ? part.trim() : part.substring(0, equalIndex).trim()
		const value = equalIndex < 0 ? "" : part.substring(equalIndex + 1).trim()
		if (i === 0) {
			cookie.name = name
			cookie.value = value
			continue
		}
		switch (name.toLowerCase()) {
			case "expires":
				// Max-Age 优先级更高
				if (!cookie.expires) {
					cookie.expires = new Date(value)
				}
				break
			case "max-age":
				const maxAge = parseInt(value)
				if (maxAge > 0) {
					cookie.expires = new Date(now.getTime() + maxAge * 1000)
				}
				break
			case "httponly":
				cookie.httpOnly = true
				break
			case "secure":
				cookie.secure = true
				break
			default:
				cookie[name] = value
				break
		}
	}
	return cookie
}

/**
 * 获取实际的域名
 * @param domain 要获取的域名
 */
function getCookieDomain(domain?: string | null) {
	domain = (domain || "").toLowerCase()
	try { domain = decodeURIComponent(domain) } catch { }
	return domain
}

/**
 * 获取实际的 Cookie 路径
 * @param pathname 要获取的路径名
 */
function getCookiePath(pathname?: string | null) {
	if (!pathname || pathname.charCodeAt(0) !== 47 /*/*/ || pathname.length === 1) {
		return "/"
	}
	pathname = pathname.toLowerCase()
	if (pathname.charCodeAt(pathname.length - 1) === 47 /*/*/) {
		pathname = pathname.slice(0, -1)
	}
	try { pathname = decodeURIComponent(pathname) } catch { }
	return pathname
}

/** 测试是否匹配域 */
function matchDomain(domain: string, cookieDomain: string) {
	// https://tools.ietf.org/html/rfc6265#section-5.1.3
	if (!domain.endsWith(cookieDomain)) {
		return false
	}
	if (domain.length === cookieDomain.length) {
		return true
	}
	if (domain.charCodeAt(domain.length - cookieDomain.length - 1) !== 46 /*.*/) {
		return false
	}
	// 忽略 IPv4 & IPv6
	if (/\.\d+$|%|::/.test(domain)) {
		return false
	}
	return true
}

/** 测试是否匹配路径 */
function matchPath(path: string, cookiePath: string) {
	// https://tools.ietf.org/html/rfc6265#section-5.1.4
	if (!path.startsWith(cookiePath)) {
		return false
	}
	if (cookiePath.length === path.length) {
		return true
	}
	if (cookiePath.charCodeAt(cookiePath.length - 1) === 47 /*/*/) {
		return true
	}
	if (path.charCodeAt(cookiePath.length) === 47 /*/*/) {
		return true
	}
	return false
}