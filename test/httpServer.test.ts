import * as assert from "assert"
import { brotliCompressSync, deflateSync, gzipSync } from "zlib"
import * as httpServer from "../src/httpServer"
import { CookieJar, request } from "../src/request"

export namespace httpServerTest {

	export async function basicTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			res.end("Hello")
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url)).text, "Hello")
		server.close()
	}

	export async function getTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.query.q, undefined)
			assert.strictEqual(req.data, undefined)
			assert.strictEqual(req.body, undefined)
			assert.strictEqual(req.text, undefined)
			assert.strictEqual(req.json, undefined)
			assert.strictEqual(req.forms, undefined)
			res.end("Hello")
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url, { userAgent: null, method: "GET" })).text, "Hello")
		server.close()
	}

	export async function queryTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.deepStrictEqual(req.query.q1, ["x1", "x2"])
			assert.strictEqual(req.query.q2, "y")
			assert.strictEqual(req.body, undefined)
			assert.strictEqual(req.text, undefined)
			assert.strictEqual(req.json, undefined)
			assert.strictEqual(req.forms, undefined)
			res.end("Hello")
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "?q1=x1&q1=x2", { userAgent: null, method: "GET", data: { q2: "y" } })).text, "Hello")
		assert.strictEqual((await request(server.url, { userAgent: null, method: "GET", data: { q2: "y", q1: ["x1", "x2"] } })).text, "Hello")
		server.close()
	}

	export async function postTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.method, "POST")
			assert.strictEqual(req.path, "/path")
			assert.strictEqual(req.search, "q1=v1")
			assert.strictEqual(req.isLocal, true)
			assert.strictEqual(req.remoteAddress, req.localAddress)
			assert.strictEqual(req.ip, req.remoteAddress)
			assert.ok(req.remotePort > 0)
			assert.ok(req.localPort > 0)
			assert.strictEqual(req.isSecure, false)
			assert.strictEqual(req.protocol, "http:")
			assert.strictEqual(req.host, `localhost:${req.localPort}`)
			assert.strictEqual(req.href, `http://localhost:${req.localPort}/path?q1=v1`)
			assert.strictEqual(req.certificate, undefined)
			assert.deepStrictEqual(req.acceptLanguages, [{ value: "zh-cn", quality: 1 }, { value: "zh", quality: 0.5 }])
			assert.strictEqual(req.referer, undefined)
			assert.strictEqual(req.ifModifiedSince, undefined)
			assert.deepStrictEqual(req.acceptTypes, [])
			assert.deepStrictEqual(req.acceptCharsets, [])
			assert.ok(req.userAgent)
			assert.ok(req.totalBytes > 0)
			assert.ok(req.contentLength > 0)
			assert.strictEqual(req.cookies.c1, undefined)
			assert.strictEqual(req.contentType, "application/x-www-form-urlencoded")
			assert.strictEqual(req.query.q1, "v1")
			assert.strictEqual(req.data, req.forms)
			assert.strictEqual(req.forms.f1, "v2")
			assert.strictEqual(req.params.q1, "v1")
			assert.strictEqual(req.params.f1, "v2")
			res.end("Hello")
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q1=v1", {
			headers: {
				"accept-language": "zh-cn, zh;q=0.5"
			},
			data: {
				f1: "v2"
			},
			timeout: 300
		})).text, "Hello")
		server.close()

		const server2 = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.data, req.forms)
			assert.strictEqual(req.forms.f1, undefined)
			res.end("Hello")
		})
		server2.unref()
		server2.listen(0)
		assert.strictEqual((await request(server2.url + "/path?q1=v1", {
			dataType: "application/x-www-form-urlencoded",
			data: "",
			timeout: 300
		})).text, "Hello")

		const server3 = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.data, req.forms)
			assert.strictEqual(req.forms.f1, undefined)
			res.end("Hello")
		})
		server3.unref()
		server3.listen(0)
		assert.strictEqual((await request(server3.url + "/path?q1=v1", {
			dataType: "multipart/form-data; boundary=error",
			data: "",
			timeout: 300
		})).text, "Hello")

		const server4 = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.data, req.forms)
			assert.deepStrictEqual(req.forms.f1, ["x1", "x2"])
			res.end("Hello")
		})
		server4.unref()
		server4.listen(0)
		assert.strictEqual((await request(server4.url + "/path?q1=v1", {
			dataType: "form",
			data: {
				"f1": ["x1", "x2"]
			},
			timeout: 300
		})).text, "Hello")
	}

	export async function textTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.data, req.text)
			assert.strictEqual(req.text, "text")
			res.end("Hello")
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url, { dataType: "text/plain", data: "text" })).text, "Hello")
		server.close()
	}

	export async function jsonTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.data, req.json)
			assert.strictEqual(req.json.f1, "v1")
			assert.deepStrictEqual(JSON.parse(req.text), req.json)

			res.contentType = "application/json"
			assert.strictEqual(res.contentType, "application/json")

			const date = new Date()
			date.setMilliseconds(0)

			res.expires = date
			assert.strictEqual(res.expires.getTime(), date.getTime())
			res.expires = undefined
			assert.strictEqual(res.expires, undefined)
			res.expires = null
			assert.strictEqual(res.expires, undefined)

			res.lastModified = date
			assert.deepEqual(res.lastModified.getTime(), date.getTime())
			res.lastModified = undefined
			assert.strictEqual(res.lastModified, undefined)

			res.writeJSON({
				n1: "v2"
			})
		})
		server.unref()
		server.listen(0)
		assert.deepStrictEqual((await request(server.url + "/path?q1=v1", {
			dataType: "json",
			data: {
				f1: "v1"
			},
			timeout: 300
		})).json, {
			n1: "v2"
		})
		server.close()
	}

	export async function optionsTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.method, "OPTIONS")
			assert.strictEqual(req.contentLength, 0)
			res.contentLength = 0
			assert.strictEqual(res.contentLength, 0)
			res.end()
		})
		server.unref()
		server.listen(0)
		await request(server.url, {
			method: "OPTIONS",
			timeout: 300
		})
		server.close()
	}

	export async function redirectTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			res.contentType = "text/plain"
			switch (req.query.q) {
				case "1":
					assert.strictEqual(res.redirectLocation, undefined)
					res.redirectLocation = undefined
					res.redirect(server.url + "/path?q=2")
					assert.strictEqual(res.redirectLocation, server.url + "/path?q=2")
					break
				case "2":
					res.writeHTML("Hello")
					break
			}
		})
		server.unref()
		server.listen(0)
		assert.deepStrictEqual((await request(server.url + "/path?q=1", {
			timeout: 300
		})).text, "Hello")
		server.close()
	}

	export async function maxRedirectTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			res.redirect(server.url, false)
			res.statusCode = 301
			res.end()
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			dataType: "json",
			data: {},
			timeout: 300
		})).statusCode, 301)
		server.close()
	}

	export async function cookieTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			res.contentType = "text/plain"
			switch (req.query.q) {
				case "1":
					res.setCookie("c2", "c2")
					res.setCookie("c3", "")
					const date = new Date()
					date.setDate(date.getDate() + 1)
					res.setCookie("c4", "c4", date, "domain", "path", true, true, "None")
					res.end("c1")
					break
				case "2":
					assert.strictEqual(req.cookies.c2, "c2")
					assert.strictEqual(req.cookies.c3, "")
					res.end(req.cookies.c2)
					break
			}
		})
		server.unref()
		server.listen(0)
		const cookieJar = new CookieJar()
		assert.deepStrictEqual((await request(server.url + "/path?q=1", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c1")
		assert.deepStrictEqual((await request(server.url + "/path?q=2", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c2")
		assert.strictEqual(cookieJar.getCookie(server.url, "c4"), undefined)
		server.close()
	}

	export async function uploadTest() {
		const buffer = Buffer.from("text")
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.contentType, "multipart/form-data")
			assert.strictEqual(req.forms.f1, "v1")
			assert.strictEqual((req.forms.f2 as httpServer.HTTPFile).fileName, "f2.txt")
			assert.strictEqual((req.forms.f2 as httpServer.HTTPFile).contentType, undefined)
			assert.strictEqual((req.forms.f2 as httpServer.HTTPFile).contentLength, buffer.length)
			assert.deepStrictEqual((req.forms.f2 as httpServer.HTTPFile).body, buffer)
			assert.strictEqual((req.forms.f2 as httpServer.HTTPFile).text, buffer.toString())

			assert.strictEqual((req.forms.f3 as httpServer.HTTPFile).fileName, "f3.txt")
			assert.strictEqual((req.forms.f3 as httpServer.HTTPFile).contentType, "text/plain")
			assert.strictEqual((req.forms.f3 as httpServer.HTTPFile).contentLength, buffer.length)
			assert.deepStrictEqual((req.forms.f3 as httpServer.HTTPFile).body, buffer)
			assert.strictEqual((req.forms.f3 as httpServer.HTTPFile).text, buffer.toString())

			assert.strictEqual(req.files[0].fileName, "f2.txt")
			assert.strictEqual(req.files[1].fileName, "f3.txt")
			assert.strictEqual(req.files.length, 2)

			res.end()
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			dataType: "multipart",
			data: {
				"f1": "v1",
				"f2": {
					fileName: "f2.txt",
					body: buffer
				},
				"f3": {
					fileName: "f3.txt",
					contentType: "text/plain",
					body: buffer
				}
			},
			timeout: 300
		})).text, "")
		server.close()
	}

	export async function invalidUploadTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.forms.f1, undefined)

			res.end()
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			dataType: "multipart/form-data",
			data: `INVALID`,
			timeout: 300
		})).text, "")
		server.close()
	}

	export async function defaultServerTest() {
		const server = new httpServer.HTTPServer()
		assert.strictEqual(server.url, undefined)

		const server2 = new httpServer.HTTPServer({ https: true })
		assert.strictEqual(server2.url, undefined)

		const server3 = new httpServer.HTTPServer({ http2: true })
		assert.strictEqual(server3.url, undefined)

		const server4 = new httpServer.HTTPServer({ https: true, http2: true })
		assert.strictEqual(server4.url, undefined)
	}

	export async function gzipTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.text, "123")
			res.end(req.body)
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			headers: {
				"content-encoding": "gzip"
			},
			dataType: "text/plain",
			data: gzipSync("123"),
			timeout: 300
		})).text, "123")
	}

	export async function deflateTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.text, "123")
			res.end(req.body)
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			headers: {
				"content-encoding": "deflate"
			},
			dataType: "text/plain",
			data: deflateSync("123"),
			timeout: 300
		})).text, "123")
	}

	export async function brTest() {
		// 忽略不支持的 Node 版本
		if (!brotliCompressSync) {
			return
		}
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			assert.strictEqual(req.text, "123")
			res.end(req.body)
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url + "/path?q=1", {
			headers: {
				"content-encoding": "br"
			},
			dataType: "text/plain",
			data: brotliCompressSync("123"),
			timeout: 300
		})).text, "123")
	}

	export async function maxAllowedContentLengthTest() {
		const server = new httpServer.HTTPServer({
			maxAllowedContentLength: 0
		})
		server.unref()
		server.listen(0)
		assert.strictEqual((await request(server.url, {
			method: "POST",
			dataType: "text",
			data: "text"
		})).statusCode, 400)
		server.close()
	}

	export async function sessionTest() {
		const server = new httpServer.HTTPServer(undefined, (req, res) => {
			res.contentType = "text/plain"
			switch (req.query.q) {
				case "1":
					server.sessions.getSession(req, res).login = true
					server.sessions.getSession(req, res).login = true
					res.end("c1")
					break
				case "2":
					assert.strictEqual(server.sessions.getSession(req, res).login, true)
					res.end("c2")
					break
				case "3":
					server.sessions.deleteSession(req, res)
					res.end("c3")
					break
				case "4":
					assert.strictEqual(server.sessions.getSession(req, res).login, undefined)
					res.end("c4")
					break
			}
		})
		server.unref()
		server.listen(0)
		const cookieJar = new CookieJar()
		assert.deepStrictEqual((await request(server.url + "/path?q=1", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c1")
		assert.deepStrictEqual((await request(server.url + "/path?q=2", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c2")
		assert.deepStrictEqual((await request(server.url + "/path?q=3", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c3")
		assert.deepStrictEqual((await request(server.url + "/path?q=4", {
			cookieJar: cookieJar,
			timeout: 300
		})).text, "c4")
		server.close()
		server.sessions.clean()
		server.sessions = null
	}

}