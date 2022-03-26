import * as assert from "assert"
import { existsSync } from "fs"
import * as  zipFile from "../src/zipFile"
import { check, init, rootDir, simulateIOError, uninit } from "./helpers/fsHelper"

export namespace zipFileTest {

	export async function beforeEach() {
		await init({
			"dir": {
				"sub1": {
					"f3.txt": "f3.txt",
					"f4.txt": "f4.txt"
				},
				"sub2": {
					"f5.txt": "f5.txt"
				}
			},
			"empty-dir": {},
			"f1.txt": "f1.txt",
			"f2.txt": "f2.txt"
		})
	}

	export async function afterEach() {
		await uninit()
	}

	export function basicTest() {
		zipFile.compressFolder("dir")
		assert.ok(existsSync("dir.zip"))
		zipFile.extractZip("dir.zip", "dir2")
		check({
			"dir2": {
				"sub1": {
					"f3.txt": "f3.txt",
					"f4.txt": "f4.txt"
				},
				"sub2": {
					"f5.txt": "f5.txt"
				}
			}
		})
	}


}