import * as assert from "assert"
import { Agent, createServer } from "http"
import { AddressInfo } from "net"
import * as webSocket from "../src/webSocket"

export namespace webSocketTest {

	class NoRequestAgent extends Agent {
		addRequest() { }
	}

	export async function sendTest() {
		const buffer = Buffer.allocUnsafe(40 * 1024)
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				assert.throws(() => {
					ws.send("hi")
				})
				assert.throws(() => {
					ws.send("hi", () => { })
				})
				ws.on("open", () => {
					ws.send("hi")
					ws.on("message", (data: string) => {
						assert.strictEqual(data, "hi2")
						wss.close().then(resolve)
					})
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.on("message", (data: string) => {
					ws.send(data + "2")
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("open", () => {
					ws.send(buffer)
					ws.on("message", (data: Buffer) => {
						assert.deepStrictEqual(data, buffer)
						wss.close().then(resolve)
					})
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.on("message", (data: Buffer) => {
					assert.deepStrictEqual(data, buffer)
					ws.send(data)
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("open", () => {
					ws.send(Buffer.allocUnsafe(65537))
					ws.on("message", () => {
						wss.close().then(resolve)
					})
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.on("message", (data: Buffer) => {
					assert.strictEqual(data.length, 65537)
					ws.send(data)
				})
			})
		})
	}

	export async function pingPongTest() {
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("ping", (data) => {
					assert.strictEqual(data.toString(), "hi")
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.sendPayload("hi", webSocket.WebSocketOpcode.pingFrame)
				ws.on("pong", (data) => {
					assert.strictEqual(data.toString(), "hi")
					wss.close().then(resolve)
				})
			})
		})
	}

	export async function bufferedAmountTest() {
		assert.strictEqual(new webSocket.WebSocket('ws://localhost', undefined, { agent: new NoRequestAgent() }).bufferedAmount, 0)

		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("open", () => {
					assert.strictEqual(ws.bufferedAmount, 0)
					wss.close().then(resolve)
				})
			})
		})

		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("open", () => {
					const data = Buffer.alloc(1024, 61)
					while (ws.bufferedAmount === 0) {
						ws.send(data)
					}
					assert.ok(ws.bufferedAmount > 0)
					wss.close().then(resolve)
				})
			})
		})
	}

	export async function protocolTest() {
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 }, { path: "/game" })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, "foo")
				ws.on("open", () => {
					assert.ok(ws.protocol, "foo")
					wss.close().then(resolve)
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, ["foo", "goo"])
				ws.on("open", () => {
					assert.ok(ws.protocol, "foo")
					wss.close().then(resolve)
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 }, { selectProtocol: () => "baz" })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, ["foo", "goo"])
				ws.on("error", () => {
					wss.close().then(resolve)
				})
			})
		})
	}

	export async function readyStateTest() {
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, "foo")
				assert.strictEqual(ws.readyState, webSocket.WebSocketState.connecting)
				ws.on("open", () => {
					assert.strictEqual(ws.readyState, webSocket.WebSocketState.open)
					ws.close()
				})
				ws.on("close", () => {
					assert.strictEqual(ws.readyState, webSocket.WebSocketState.closed)
					wss.close().then(resolve)
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, "foo")
				assert.strictEqual(ws.readyState, webSocket.WebSocketState.connecting)
				ws.on("open", () => {
					assert.strictEqual(ws.readyState, webSocket.WebSocketState.open)
					wss.close().then(resolve)
				})
				ws.on("close", () => {
					assert.strictEqual(ws.readyState, webSocket.WebSocketState.closed)
				})
			})
		})
	}

	export async function errorTest() {
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("close", (code, reason) => {
					assert.strictEqual(code, 1002)
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0x85, 0x00]))
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("close", (code, reason) => {
					assert.strictEqual(code, 1002)
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10001000, 1, 0]))
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("close", (code, reason) => {
					assert.strictEqual(code, 1002)
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000000, 0, 0]))
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("message", (data) => {
					assert.strictEqual(data, "hi")
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000001, 2]))
				ws.socket.write("hi")
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("message", (data) => {
					assert.strictEqual(data, "hi")
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000001, 126, 0]))
				setTimeout(() => {
					ws.socket.write(Buffer.from([2]))
					ws.socket.write("hi")
				}, 10)
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("message", (data) => {
					assert.strictEqual(data, "hi")
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000001, 127, 0]))
				ws.socket.write(Buffer.from([0, 0, 0]))
				ws.socket.write(Buffer.from([0, 0, 0, 2]))
				ws.socket.write("hi")
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				new webSocket.WebSocket(wss.url)
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000001, 127]))
				ws.socket.write(Buffer.from([0, 0, 1, 0]))
				setTimeout(() => {
					ws.socket.write(Buffer.from([0, 0, 0, 2]))
				}, 10)
				setTimeout(() => {
					wss.close().then(resolve)
				}, 100)
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 }, { maxBufferSize: 1 })
			wss.start()
			wss.on("listening", () => {
				new webSocket.WebSocket(wss.url)
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.send("hello")
				setTimeout(() => {
					wss.close().then(resolve)
				}, 100)
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				new webSocket.WebSocket(wss.url)
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.socket.write(Buffer.from([0b10000001, 127]))
				ws.socket.write(Buffer.from([255, 255, 255, 255]))
				setTimeout(() => {
					ws.socket.write(Buffer.from([0, 0, 0, 2]))
				}, 10)
				setTimeout(() => {
					wss.close().then(resolve)
				}, 100)
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				ws.on("close", (code, reason) => {
					assert.strictEqual(code, 1006)
					resolve()
				})
			})
			wss.on("connection", () => {
				wss.close()
			})
		})
	}

	export async function closeTest() {
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url)
				const messages = []
				ws.on("message", (message) => messages.push(message))
				ws.on("close", (code) => {
					assert.strictEqual(code, 1006)
					assert.deepStrictEqual(messages, ["foo", "bar", "baz", "qux"])
					wss.close().then(resolve)
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.send("foo")
				ws.send("bar")
				ws.send("baz")
				ws.send("qux", () => ws.destroy())
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				new webSocket.WebSocket(wss.url)
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.send("foo")
				assert.throws(() => { ws.close(1005) })
				ws.close(1000, "normal", 0)
				ws.on("close", () => {
					wss.close().then(resolve)
				})
			})
		})
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 })
			wss.start()
			wss.on("listening", () => {
				new class extends webSocket.WebSocket {
					onClose() {
						this.socket.end()
					}
				}(wss.url)
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.send("foo")
				assert.throws(() => { ws.close(1005) })
				ws.close(1000, undefined, 1)
				ws.on("close", () => {
					ws.close()
					wss.close().then(resolve)
				})
			})
		})
		const ws = new webSocket.WebSocket({})
		ws.close()
		ws.on("error", () => { })
		ws.close()
		ws.ref()
		ws.unref()
	}

	export function destroyTest() {
		const ws = new webSocket.WebSocket({})
		ws.destroy()
		ws.on("error", () => { })
		ws.destroy()
	}

	export async function extensionTest() {
		const wss = new webSocket.WebSocketServer({ port: 0 }, {
			extension: {
				accept() { return null },
				apply() { }
			}
		})
		await wss.start()
		await wss.close()
		await new Promise(resolve => {
			const wss = new webSocket.WebSocketServer({ port: 0 }, {
				extension: {
					accept() { return null },
					apply() { }
				}
			})
			wss.start()
			wss.on("listening", () => {
				const ws = new webSocket.WebSocket(wss.url, undefined, {
					extension: {
						accept() { return null },
						apply() { }
					}
				})
				assert.throws(() => {
					ws.send("hi")
				})
				assert.throws(() => {
					ws.send("hi", () => { })
				})
				ws.on("open", () => {
					ws.send("hi")
					ws.on("message", (data: string) => {
						assert.strictEqual(data, "hi2")
						wss.close().then(resolve)
					})
				})
			})
			wss.on("connection", (ws: webSocket.WebSocket) => {
				ws.on("message", (data: string) => {
					ws.send(data + "2")
				})
			})
		})
	}

	export async function serverTest() {
		const httpServer = createServer((req, res) => res.end(""))
		const wss = new webSocket.WebSocketServer(httpServer)
		assert.strictEqual(wss.url, undefined)
		assert.strictEqual(wss.address(), null)
		wss.close()
		wss.ref()
		wss.unref()
	}

	export async function redirectTest() {
		const wss = new webSocket.WebSocketServer("ws://localhost:0")
		const httpServer = createServer((req, res) => {
			res.writeHead(301, {
				Location: wss.url
			})
			res.end()
		}).listen()
		await new Promise(resolve => {
			wss
			wss.start()
			wss.on("listening", () => {
				new webSocket.WebSocket(`ws://localhost:${(httpServer.address() as AddressInfo).port}`)
			})
			wss.on("connection", () => {
				wss.close().then(resolve)
			})
		})
		await new Promise(resolve => {
			httpServer.close(resolve)
		})
	}

	export async function errorServerTest() {
		const httpServer = createServer((req, res) => {
			switch (req.url) {
				case "/end":
					break
				case "/noHeader":
					res.writeHead(101)
					break
				case "/invalidVersion":
					res.writeHead(101, {
						Connection: "Upgrade",
						Upgrade: "websocket",
						"Sec-WebSocket-Version": 1000
					})
					break
				case "/invalidAccept":
					res.writeHead(101, {
						Connection: "Upgrade",
						Upgrade: "websocket",
						"Sec-WebSocket-Version": 13,
						"Sec-WebSocket-Key": "error"
					})
					break
			}
			res.end()
		})
		await new Promise(resolve => {
			httpServer.listen(0, resolve)
		})
		await new Promise(resolve => {
			const ws = new webSocket.WebSocket(`ws://localhost:${(httpServer.address() as AddressInfo).port}/end`)
			ws.on("error", () => {
				ws.close()
				resolve()
			})
		})
		await new Promise(resolve => {
			const ws = new webSocket.WebSocket(`ws://localhost:${(httpServer.address() as AddressInfo).port}/noHeader`)
			ws.on("error", () => {
				ws.close()
				resolve()
			})
		})
		await new Promise(resolve => {
			const ws = new webSocket.WebSocket(`ws://localhost:${(httpServer.address() as AddressInfo).port}/invalidVersion`)
			ws.on("error", () => {
				ws.close()
				resolve()
			})
		})
		await new Promise(resolve => {
			const ws = new webSocket.WebSocket(`ws://localhost:${(httpServer.address() as AddressInfo).port}/invalidAccept`)
			ws.on("error", () => {
				ws.close()
				resolve()
			})
		})
		await new Promise(resolve => {
			httpServer.close(resolve)
		})
	}

}