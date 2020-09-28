import * as assert from "assert"
import * as crypto from "../src/crypto"

export namespace cryptoTest {

	export function md5Test() {
		assert.strictEqual(crypto.md5("foo"), "acbd18db4cc2f85cedef654fccc4a4d8")

		assert.strictEqual(crypto.md5("A"), "7fc56270e7a70fa81a5935b72eacbe29")
		assert.strictEqual(crypto.md5(""), "d41d8cd98f00b204e9800998ecf8427e")
	}

	export function sha1Test() {
		assert.strictEqual(crypto.sha1("foo"), "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33")

		assert.strictEqual(crypto.sha1("A"), "6dcd4ce23d88e2ee9568ba546c007c63d9131c1b")
		assert.strictEqual(crypto.sha1(""), "da39a3ee5e6b4b0d3255bfef95601890afd80709")
	}

}