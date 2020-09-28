import * as assert from "assert"
import * as request from "../src/request"

export namespace requestTest {

	export namespace cookieJarTest {

		export function basicTest() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("/", { name: "n1", value: "v1" })
			assert.strictEqual(cookieJar.getCookie("/", "n1"), "v1")

			cookieJar.setCookie("/", { name: "n1", value: "v1" })
			assert.strictEqual(cookieJar.getCookies("/").length, 1)
			assert.strictEqual(cookieJar.getCookies("/")[0].name, "n1")
			assert.strictEqual(cookieJar.getCookies("/")[0].value, "v1")

		}

		export function shouldExpires() {
			const cookieJar = new request.CookieJar()
			const date = new Date()
			cookieJar.setCookie("/", { name: "n1", value: "v1", expires: date }, date)
			assert.strictEqual(cookieJar.getCookie("/", "n1"), undefined)

			const lastSecond = new Date(date.getTime() - 1000)
			cookieJar.setCookie("http://example.com/req", { name: "c2", value: "c2", path: "/path", expires: lastSecond }, date)
			cookieJar.setCookie("http://example.com/req", { name: "c3", value: "c3", path: "/path", expires: lastSecond })
			assert.strictEqual(cookieJar.getCookie("http://example.com/path/sub", "c2", date, undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookies("http://example.com/path/sub", date, undefined, true).find(cookie => cookie.name === "c2"), undefined)
			assert.strictEqual(cookieJar.getCookie("http://example.com/path/sub", "c3", date, undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookies("http://example.com/path/sub", date, undefined, true).find(cookie => cookie.name === "c3"), undefined)

			cookieJar.setCookie("http://example.com/req", { name: "c3", value: "c3", path: "/path", expires: lastSecond }, date)
		}

		export function shouldFollowAttributes() {
			const cookieJar = new request.CookieJar()

			cookieJar.setCookie("https://example.com", { name: "n1", value: "v1", domain: "www.example.com", path: "/path", httpOnly: true, secure: true })
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path/", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path/any", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.other.com/path", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1", undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookie("http://www.example.com/path", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1", undefined, undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookie("wss://www.example.com/path", "n1"), "v1")

			assert.strictEqual(cookieJar.getCookies("https://www.example.com/path").length, 1)
			assert.strictEqual(cookieJar.getCookies("https://www.example.com/path/").length, 1)
			assert.strictEqual(cookieJar.getCookies("https://www.example.com/path/any").length, 1)
			assert.strictEqual(cookieJar.getCookies("https://www.example.com/").length, 0)
			assert.strictEqual(cookieJar.getCookies("https://www.other.com/path").length, 0)
			assert.strictEqual(cookieJar.getCookies("https://www.example.com/path", undefined, true).length, 0)
			assert.strictEqual(cookieJar.getCookies("https://www.example.com/path", undefined, undefined, true).length, 0)
		}

		export function shouldFollowDomain() {
			const cookieJar = new request.CookieJar()

			cookieJar.setCookie("https://example.com", { name: "n1", value: "v1", domain: "www.example.com", path: "/path", httpOnly: true, secure: true })
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path/", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path/any", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.other.com/path", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1", undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookie("https://www.example.com/path", "n1", undefined, undefined, true), undefined)
		}

		export function shouldFollowPath() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie(new URL("http://example.com/req"), { name: "c2", value: "c2", path: "/path" })
			assert.strictEqual(cookieJar.getCookie(new URL("http://example.com/path/sub"), "c2", undefined, undefined, true), "c2")
			assert.strictEqual(cookieJar.getCookie("http://sub.example.com/path/sub", "c2", undefined, undefined, true), undefined)
			assert.strictEqual(cookieJar.getCookies(new URL("http://sub.example.com/path/sub"), undefined, undefined, true).length, 0)
		}

		export function shouldIgnorePort() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("http://example.com/req", { name: "n1", value: "v1" })
			assert.strictEqual(cookieJar.getCookie("http://example.com:82", "n1"), "v1")
			assert.strictEqual(cookieJar.getCookies("http://example.com:82")[0].value, "v1")
			assert.strictEqual(cookieJar.getCookie("http://my.com", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookies("http://my.com:82").length, 0)
		}

		export function shouldIgnoreInvalidDomain() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("http://example.com/req", { name: "n1", value: "v1", domain: "my.com" })
			assert.strictEqual(cookieJar.getCookie("http://example.com", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookies("http://example.com").find(cookie => cookie.name === "n1"), undefined)
			assert.strictEqual(cookieJar.getCookie("http://my.com", "n1"), undefined)
			assert.strictEqual(cookieJar.getCookies("http://my.com").find(cookie => cookie.name === "n1"), undefined)

			cookieJar.setCookie("http://example.com", { name: "n2", value: "v2", domain: ".example.com" })
			assert.strictEqual(cookieJar.getCookie("http://EXAMPLE.COM", "n2"), "v2")
			assert.strictEqual(cookieJar.getCookie("http://example.com", "n2"), "v2")
			assert.strictEqual(cookieJar.getCookie("http://www.example.com", "n2"), "v2")
			assert.strictEqual(cookieJar.getCookie("http://sub.2.example.com", "n2"), "v2")
		}

		export function shouldSupportIP() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("http://127.0.0.1/req", { name: "n1", value: "v1", domain: "127.0.0.1" })
			assert.strictEqual(cookieJar.getCookie("http://127.0.0.1", "n1"), "v1")

			cookieJar.setCookie("http://[::FFFF:127.0.0.0]/req", { name: "n2", value: "v2", domain: "::FFFF:127.0.0.0" })
			assert.strictEqual(cookieJar.getCookie("http://[::FFFF:127.0.0.0]", "n2"), "v2")

			cookieJar.setCookie("http://0.0.1/req", { name: "n3", value: "v3" })
			assert.strictEqual(cookieJar.getCookie("http://127.0.0.1", "n3"), undefined)
		}

		export function shouldIgnoreInvalidPath() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("http://example.com/req", { name: "n1", value: "v1", path: "x" })
			assert.strictEqual(cookieJar.getCookie("http://example.com", "n1"), "v1")

			cookieJar.setCookie("http://example.com/req", { name: "n2", value: "v2", path: "/x" })
			assert.strictEqual(cookieJar.getCookie("http://example.com/xp", "n2"), undefined)
			assert.strictEqual(cookieJar.getCookie("http://example.com/x/", "n2"), "v2")
			assert.strictEqual(cookieJar.getCookie("http://example.com/x", "n2"), "v2")
			assert.strictEqual(cookieJar.getCookie("http://example.com/x/y", "n2"), "v2")
		}

		export function getCookiesHeaderTest() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookie("http://example.com/req", { name: "n1", value: "v1" })
			assert.strictEqual(cookieJar.getCookiesHeader("http://example.com"), "n1=v1")

			cookieJar.setCookie("http://example.com/req", { name: "n2", value: "v2" })
			assert.strictEqual(cookieJar.getCookiesHeader("http://example.com"), "n1=v1; n2=v2")
		}

		export function setCookiesFromHeaderTest() {
			const cookieJar = new request.CookieJar()
			cookieJar.setCookiesFromHeader("http://example.com", "n1=v1")
			assert.strictEqual(cookieJar.getCookie("http://example.com", "n1"), "v1")

			cookieJar.setCookiesFromHeader("https://example.com", "n2=v2; Domain=example.com; Path=/; Max-Age=1; Expires=Wed, 30 Aug 2019 00:00:00 GM; HttpOnly; Secure")
			assert.strictEqual(cookieJar.getCookie("https://example.com", "n2"), "v2")

			cookieJar.setCookiesFromHeader("https://example.com", "n3=v3; Domain=example.com; Path=/; Expires=Wed, 30 Aug 2019 00:00:00 GM; HttpOnly; Secure")
			assert.strictEqual(cookieJar.getCookie("https://example.com", "n3"), "v3")
		}

	}

}