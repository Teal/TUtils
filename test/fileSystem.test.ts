import * as assert from "assert"
import * as fsSync from "fs"
import * as path from "path"
import * as fileSystem from "../src/fileSystem"
import { check, init, rootDir, simulateIOError, uninit } from "./helpers/fsHelper"

export namespace fileSystemTest {

	const fs = new fileSystem.FileSystem()

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

	export function nativeTest() {
		assert.strictEqual(fs.native, true)
		assert.strictEqual(typeof fs.isCaseInsensitive, "boolean")
	}

	export async function getStatTest() {
		assert.strictEqual((await fs.getStat("dir")).isDirectory(), true)
		assert.strictEqual((await fs.getStat("dir", false)).isDirectory(), true)

		assert.strictEqual((await fs.getStat("f1.txt")).isFile(), true)
		assert.strictEqual((await fs.getStat("f1.txt", false)).isFile(), true)

		assert.strictEqual((await fs.getStat("dir/sub2/f5.txt")).size, 6)
		assert.strictEqual((await fs.getStat("dir/sub2/f5.txt", false)).size, 6)

		await assert.rejects(async () => { await fs.getStat("404") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.getStat("404", false) }, { code: "ENOENT" })
	}

	export async function existsTest() {
		assert.strictEqual(await fs.exists("f1.txt"), true)
		assert.strictEqual(await fs.exists("dir"), true)

		assert.strictEqual(await fs.exists("404"), false)
	}

	export async function existsFileTest() {
		assert.strictEqual(await fs.existsFile("f1.txt"), true)
		assert.strictEqual(await fs.existsFile("dir"), false)

		assert.strictEqual(await fs.existsFile("404"), false)
	}

	export async function existsDirTest() {
		assert.strictEqual(await fs.existsDir("f1.txt"), false)
		assert.strictEqual(await fs.existsDir("dir"), true)

		assert.strictEqual(await fs.existsDir("404"), false)
	}

	export async function ensureNotExistsTest() {
		assert.strictEqual(await fs.ensureNotExists("dir"), "dir_2")
		assert.strictEqual(await fs.ensureNotExists("f1.txt"), "f1_2.txt")
		assert.strictEqual(await fs.ensureNotExists("f1.txt", "(0)"), "f1(0).txt")

		assert.strictEqual(await fs.ensureNotExists("404"), "404")

		fsSync.writeFileSync("f1_99.txt", "f1_99.txt")
		assert.strictEqual(await fs.ensureNotExists("f1_99.txt"), "f1_100.txt")

		fsSync.writeFileSync("f1(99).txt", "f1(99).txt")
		assert.strictEqual(await fs.ensureNotExists("f1(99).txt", "(0)"), "f1(100).txt")
	}

	export async function ensureDirExistsTest() {
		await fs.ensureDirExists("foo/goo.txt")
		assert.strictEqual(fsSync.existsSync("foo"), true)

		await fs.ensureDirExists("foo/goo.txt")
		assert.strictEqual(fsSync.existsSync("foo"), true)
	}

	export async function createDirTest() {
		await fs.createDir("foo/goo")
		assert.strictEqual(fsSync.existsSync("foo/goo"), true)

		await fs.createDir("foo/goo")
		assert.strictEqual(fsSync.existsSync("foo/goo"), true)

		await assert.rejects(async () => { await fs.createDir("f1.txt") }, { code: "EEXIST" })
	}

	export async function createTempDirTest() {
		assert.strictEqual(fsSync.existsSync(await fs.createTempDir(rootDir)), true)
	}

	export async function deleteDirTest() {
		assert.strictEqual(await fs.deleteDir("dir"), 3)
		assert.strictEqual(fsSync.existsSync("dir"), false)

		assert.strictEqual(await fs.deleteDir("dir"), 0)
		assert.strictEqual(fsSync.existsSync("dir"), false)

		await assert.rejects(async () => { await fs.deleteDir("f1.txt") }, { code: "ENOTDIR" })
	}

	export async function cleanDirTest() {
		assert.strictEqual(await fs.cleanDir("dir"), 3)
		assert.strictEqual(fsSync.existsSync("dir/sub2"), false)
		assert.strictEqual(fsSync.existsSync("dir"), true)

		assert.strictEqual(await fs.cleanDir("empty-dir"), 0)
		assert.strictEqual(fsSync.existsSync("empty-dir"), true)

		assert.strictEqual(await fs.cleanDir("dir/sub3"), 0)
		assert.strictEqual(await fs.cleanDir("dir/404"), 0)

		await assert.rejects(async () => { await fs.cleanDir("f1.txt") }, { code: "ENOTDIR" })
	}

	export async function deleteParentDirIfEmptyTest() {
		assert.strictEqual(await fs.deleteParentDirIfEmpty("dir/sub3/foo.txt"), 0)
		assert.strictEqual(fsSync.existsSync("dir/sub3"), false)

		assert.strictEqual(await fs.deleteParentDirIfEmpty("dir/sub1/foo.txt"), 0)
		assert.strictEqual(fsSync.existsSync("dir/sub1"), true)

		assert.strictEqual(await fs.deleteParentDirIfEmpty("empty-dir/foo.txt"), 1)
		assert.strictEqual(fsSync.existsSync("empty-dir"), false)

		fsSync.mkdirSync("empty1/empty2", { recursive: true })
		assert.strictEqual(await fs.deleteParentDirIfEmpty("empty1/empty2/foo.txt"), 2)
		assert.strictEqual(fsSync.existsSync("empty1"), false)
	}

	export async function deleteFileTest() {
		assert.strictEqual(await fs.deleteFile("f1.txt"), true)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)

		assert.strictEqual(await fs.deleteFile("404.txt"), false)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)

		await assert.rejects(async () => { await fs.deleteFile("dir") })
	}

	export async function walkTest() {
		const dirs: string[] = []
		const files: string[] = []
		await fs.walk("", {
			error(e) {
				assert.ifError(e)
			},
			dir(path) {
				dirs.push(path)
			},
			file(path) {
				files.push(path)
			},
			other(path) {
				files.push(path)
			}
		})
		assert.deepStrictEqual(dirs.sort(), ["", "dir", "dir/sub1", "dir/sub2", "empty-dir"])
		assert.deepStrictEqual(files.sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt", "f1.txt", "f2.txt"])

		files.length = dirs.length = 0
		await fs.walk("empty-dir", {
			error(e) {
				assert.ifError(e)
			},
			dir(path) {
				dirs.push(path)
			},
			file(path) {
				files.push(path)
			},
			other(path) {
				files.push(path)
			}
		})
		assert.deepStrictEqual(dirs.sort(), ["empty-dir"])
		assert.deepStrictEqual(files.sort(), [])

		files.length = dirs.length = 0
		await fs.walk("dir/sub1/f3.txt", {
			error(e) {
				assert.ifError(e)
			},
			dir(path) {
				dirs.push(path)
			},
			file(path) {
				files.push(path)
			},
			other(path) {
				files.push(path)
			}
		})
		assert.deepStrictEqual(dirs.sort(), [])
		assert.deepStrictEqual(files.sort(), ["dir/sub1/f3.txt"])

		await fs.walk("404", {
			error(e) {
				assert.strictEqual(e.code, "ENOENT")
			}
		})
	}

	export async function globTest() {
		assert.deepStrictEqual((await fs.glob("*")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt", "f1.txt", "f2.txt"])
		assert.deepStrictEqual((await fs.glob("dir")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt"])
		assert.deepStrictEqual((await fs.glob(["dir", "!dir"])), [])

		assert.deepStrictEqual((await fs.glob("*", "dir")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt"])
	}

	export async function readDirTest() {
		assert.deepStrictEqual((await fs.readDir(".")).sort(), ["dir", "empty-dir", "f1.txt", "f2.txt"])
		assert.deepStrictEqual((await fs.readDir(".", true)).map(entry => `${entry.name}${entry.isDirectory() ? "/" : ""}`).sort(), ["dir/", "empty-dir/", "f1.txt", "f2.txt"])

		await assert.rejects(async () => { await fs.readDir("f1.txt") }, { code: "ENOTDIR" })
		await assert.rejects(async () => { await fs.readDir("404") }, { code: "ENOENT" })
	}

	export async function readFileTest() {
		assert.strictEqual(await fs.readFile("f1.txt", "utf-8"), "f1.txt")
		assert.strictEqual(await fs.readFile("dir/sub1/f4.txt", "utf-8"), "f4.txt")

		assert.strictEqual((await fs.readFile("f1.txt")).toString(), "f1.txt")

		await assert.rejects(async () => { await fs.readFile("dir") }, { code: "EISDIR" })
		await assert.rejects(async () => { await fs.readFile("404") }, { code: "ENOENT" })
	}

	export async function readTextTest() {
		assert.strictEqual(await fs.readText("f1.txt"), "f1.txt")
		assert.strictEqual(await fs.readText("dir/sub1/f4.txt"), "f4.txt")

		assert.strictEqual(await fs.readText("404", false), null)
	}

	export async function writeFileTest() {
		assert.strictEqual(await fs.writeFile("foo/goo.txt", "A"), true)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A")
		assert.strictEqual(await fs.writeFile("foo/goo.txt", "A", false), false)

		assert.strictEqual(await fs.writeFile("foo/goo.txt", "你好"), true)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "你好")

		assert.strictEqual(await fs.writeFile("foo/goo.txt", "你不好", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "你好")

		await assert.rejects(async () => { await fs.writeFile("dir", "你好", true) }, { code: "EISDIR" })
	}

	export async function appendFileTest() {
		await fs.appendFile("foo/goo.txt", "A")
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A")
		await fs.appendFile("foo/goo.txt", "你好")
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A你好")

		await assert.rejects(async () => { await fs.appendFile("dir", "你好") }, { code: "EISDIR" })
	}

	export async function readJSONTest() {
		await fs.writeFile("foo/goo.json", "[1]")
		assert.deepStrictEqual(await fs.readJSON("foo/goo.json"), [1])
		await fs.writeFile("foo/goo2.json", "")
		assert.deepStrictEqual(await fs.readJSON("foo/goo2.json"), undefined)
		assert.deepStrictEqual(await fs.readJSON("foo/goo3.json"), undefined)
	}

	export async function writeJSONTest() {
		await fs.writeJSON("foo/main.json", "main.json")
		check({ "foo/main.json": `"main.json"` })

		assert.rejects(async () => { await fs.writeJSON("dir", "main.json") })

		await simulateIOError(() => {
			assert.rejects(async () => { await fs.writeJSON("foo/main.json", "main.json") })
		})
	}

	export async function searchTextTest() {
		assert.deepStrictEqual(await fs.searchText("dir/sub1/f3.txt", "f3"), [
			{
				path: "dir/sub1/f3.txt",
				start: 0,
				end: 2,
				content: "f3.txt"
			}
		])
		assert.deepStrictEqual(await fs.searchText("dir/sub1/f4.txt", /F(\d+)/ig), [
			{
				path: "dir/sub1/f4.txt",
				start: 0,
				end: 2,
				content: "f4.txt"
			}
		])
	}

	export async function searchAllTextTest() {
		assert.deepStrictEqual(await fs.searchAllText("f3.txt", "f3"), [
			{
				path: "dir/sub1/f3.txt",
				start: 0,
				end: 2,
				content: "f3.txt"
			}
		])
		assert.deepStrictEqual(await fs.searchAllText("f4.txt", /F(\d+)/ig), [
			{
				path: "dir/sub1/f4.txt",
				start: 0,
				end: 2,
				content: "f4.txt"
			}
		])
	}

	export async function replaceTextTest() {
		assert.strictEqual(await fs.replaceText("dir/sub1/f3.txt", "f3", "$&"), true)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f3.txt", "utf-8"), "$&.txt")
		assert.strictEqual(await fs.replaceText("dir/sub1/f4.txt", /F(\d+)/ig, "$1"), true)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
		assert.strictEqual(await fs.replaceText("dir/sub1/f4.txt", /X(\d+)/ig, "$1"), false)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
	}

	export async function replaceAllTextTest() {
		assert.strictEqual(await fs.replaceAllText("f3.txt", "f3", "$&"), 1)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f3.txt", "utf-8"), "$&.txt")
		assert.strictEqual(await fs.replaceAllText("f4.txt", /F(\d+)/ig, "$1"), 1)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
		assert.strictEqual(await fs.replaceAllText("f4.txt", /X(\d+)/ig, "$1"), 0)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
	}

	export async function createLinkTest() {
		assert.strictEqual(await fs.createLink("foo/lnk", "f1.txt"), true)
		assert.strictEqual(await fs.readFile("foo/lnk", "utf-8"), "f1.txt")

		assert.strictEqual(await fs.createLink("foo/lnk", "f2.txt", false), false)
		assert.strictEqual(await fs.readFile("foo/lnk", "utf-8"), "f1.txt")

		assert.strictEqual(await fs.createLink("foo/lnk", "f2.txt"), true)
		assert.strictEqual(await fs.readFile("foo/lnk", "utf-8"), "f2.txt")

		assert.strictEqual(await fs.createLink("foo/lnk2", "dir"), true)
		assert.strictEqual(await fs.createLink("foo/lnk2", "dir", false), false)
		assert.strictEqual(await fs.readFile("foo/lnk2/sub2/f5.txt", "utf-8"), "f5.txt")
	}

	export async function readLinkTest() {
		assert.strictEqual(await fs.createLink("lnk", "dir"), true)
		assert.strictEqual(path.relative(rootDir, await fs.readLink("lnk")), "dir")

		await assert.rejects(async () => { await fs.readLink("404") }, { code: "ENOENT" })
	}

	export async function createReadStreamTest() {
		await new Promise((resolve, reject) => {
			const stream = fs.createReadStream("f1.txt")
			stream.on("data", data => {
				assert.strictEqual(data.toString(), "f1.txt")
			})
			stream.on("error", reject)
			stream.on("end", resolve)
		})
		await assert.rejects(async () => {
			await new Promise((resolve, reject) => {
				const stream = fs.createReadStream("dir")
				stream.on("data", data => {
					assert.strictEqual(data.toString(), "f1.txt")
				})
				stream.on("error", reject)
				stream.on("end", resolve)
			})
		}, { code: "EISDIR" })
		await assert.rejects(async () => {
			await new Promise((resolve, reject) => {
				const stream = fs.createReadStream("404")
				stream.on("data", data => {
					assert.strictEqual(data.toString(), "f1.txt")
				})
				stream.on("error", reject)
				stream.on("end", resolve)
			})
		}, { code: "ENOENT" })
	}

	export async function createWriteStreamTest() {
		await new Promise((resolve, reject) => {
			const stream = fs.createWriteStream("file")
			stream.on("error", reject)
			stream.on("close", resolve)
			stream.end("file")
		})
		assert.strictEqual(fsSync.readFileSync("file", "utf-8"), "file")

		await new Promise((resolve, reject) => {
			const stream = fs.createWriteStream("f2.txt")
			stream.on("error", reject)
			stream.on("close", resolve)
			stream.write("f2.txt_1")
			stream.end()
		})
		assert.strictEqual(await fs.readFile("f2.txt", "utf-8"), "f2.txt_1")

		await assert.rejects(async () => {
			await new Promise((resolve, reject) => {
				const stream = fs.createWriteStream("dir")
				stream.on("error", reject)
				stream.on("close", resolve)
				stream.end("file")
			})
		}, { code: "EISDIR" })
		await assert.rejects(async () => {
			await new Promise((resolve, reject) => {
				const stream = fs.createWriteStream("foo/404")
				stream.on("error", reject)
				stream.on("close", resolve)
				stream.end("file")
			})
		}, { code: "ENOENT" })
	}

	export async function copyDirTest() {
		assert.strictEqual(await fs.copyDir("dir", "foo/copydir"), 3)
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub2/f5.txt", "utf-8"), "f5.txt")

		fsSync.writeFileSync("foo/copydir/sub2/f5.txt", "f5.txt_1")
		assert.strictEqual(await fs.copyDir("dir", "foo/copydir", false), 0)
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub2/f5.txt", "utf-8"), "f5.txt_1")

		assert.strictEqual(await fs.copyDir("empty-dir", "foo/empty-dir"), 0)
		assert.strictEqual(fsSync.existsSync("foo/empty-dir"), true)

		assert.strictEqual(await fs.copyDir("dir", "foo/copydir2", undefined, undefined, "f3.txt"), 2)
		assert.strictEqual(fsSync.existsSync("foo/copydir2/sub1/f3.txt"), false)
		assert.strictEqual(fsSync.readFileSync("foo/copydir2/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir2/sub2/f5.txt", "utf-8"), "f5.txt")

		await assert.rejects(async () => { await fs.copyDir("404", "foo/copydir") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.copyDir("f1.txt", "foo/copydir") }, { code: "ENOTDIR" })
	}

	export async function copyFileTest() {
		assert.strictEqual(await fs.copyFile("f1.txt", "foo/copyf1.txt"), true)
		assert.strictEqual(fsSync.readFileSync("foo/copyf1.txt", "utf-8"), "f1.txt")

		fsSync.writeFileSync("foo/copyf1.txt", "f1.txt_1")
		assert.strictEqual(await fs.copyFile("f1.txt", "foo/copyf1.txt", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/copyf1.txt", "utf-8"), "f1.txt_1")

		await assert.rejects(async () => { await fs.copyFile("404", "f1.txt") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.copyFile("404", "copy.txt") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.copyFile("404", "dir") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.copyFile("404", "goo/copyf1.txt") }, { code: "ENOENT" })
		// https://github.com/nodejs/node/issues/28279
		if (process.platform === "win32") {
			await assert.rejects(async () => { await fs.copyFile("empty-dir", "foo/copydir") })
		}
		await assert.rejects(async () => { await fs.copyFile("f1.txt", "dir") })
	}

	export async function copyLinkTest() {
		assert.strictEqual(await fs.createLink("lnk", "f2.txt"), true)
		assert.strictEqual(await fs.copyLink("lnk", "foo/copy-link"), true)
		assert.strictEqual(await fs.readFile("foo/copy-link", "utf-8"), "f2.txt")

		assert.strictEqual(await fs.createLink("lnk2", "dir"), true)
		assert.strictEqual(await fs.copyLink("lnk2", "foo/lnk2"), true)
		assert.strictEqual(await fs.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")

		assert.strictEqual(await fs.createLink("lnk3", "empty-dir"), true)
		assert.strictEqual(await fs.copyLink("lnk2", "foo/lnk2", false), false)
		assert.strictEqual(await fs.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
	}

	export async function moveDirTest() {
		await fs.moveDir("dir", "foo/movedir")
		assert.strictEqual(fsSync.existsSync("dir"), false)
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub2/f5.txt", "utf-8"), "f5.txt")

		fsSync.writeFileSync("foo/movedir/sub2/f5.txt", "f5.txt_1")
		await fs.moveDir("foo/movedir", "foo/movedir", false)
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub2/f5.txt", "utf-8"), "f5.txt_1")

		await fs.moveDir("empty-dir", "foo/empty-dir")
		assert.strictEqual(fsSync.existsSync("empty-dir"), false)
		assert.strictEqual(fsSync.existsSync("foo/empty-dir"), true)

		await assert.rejects(async () => { await fs.moveDir("404", "foo/movedir") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.moveDir("f1.txt", "foo/movedir") }, { code: "ENOTDIR" })
	}

	export async function moveFileTest() {
		assert.strictEqual(await fs.moveFile("f1.txt", "foo/movef1.txt"), true)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)
		assert.strictEqual(fsSync.readFileSync("foo/movef1.txt", "utf-8"), "f1.txt")

		assert.strictEqual(await fs.moveFile("foo/movef1.txt", "foo/movef1.txt", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/movef1.txt", "utf-8"), "f1.txt")

		await assert.rejects(async () => { await fs.moveFile("404", "dir") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.moveFile("404", "dir", false) }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.moveFile("404", "goo/copyf1.txt") }, { code: "ENOENT" })
		await assert.rejects(async () => { await fs.moveFile("404", "goo/copyf1.txt", false) }, { code: "ENOENT" })
	}

	export async function moveLinkTest() {
		assert.strictEqual(await fs.createLink("lnk", "f2.txt"), true)
		assert.strictEqual(await fs.moveLink("lnk", "foo/copy-link"), true)
		assert.strictEqual(await fs.readFile("foo/copy-link", "utf-8"), "f2.txt")
		assert.strictEqual(fsSync.existsSync("lnk"), false)

		assert.strictEqual(await fs.createLink("lnk2", "dir"), true)
		assert.strictEqual(await fs.moveLink("lnk2", "foo/lnk2"), true)
		assert.strictEqual(await fs.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.existsSync("lnk2"), false)

		assert.strictEqual(await fs.createLink("lnk2", "dir"), true)
		assert.strictEqual(await fs.createLink("lnk3", "empty-dir"), true)
		assert.strictEqual(await fs.moveLink("lnk2", "foo/lnk2", false), false)
		assert.strictEqual(fsSync.existsSync("lnk2"), true)
		assert.strictEqual(await fs.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
	}

	export async function getRealPathTest() {
		assert.strictEqual(path.relative(process.cwd(), await fs.getRealPath("f1.txt") ?? "f1.txt"), "f1.txt")
		if (fs.isCaseInsensitive) {
			assert.strictEqual(path.relative(process.cwd(), await fs.getRealPath("F1.txt") ?? "f1.txt"), "f1.txt")
		}

		assert.strictEqual(await fs.getRealPath("404"), null)
	}

	export namespace errorTest {

		for (const key in fileSystemTest) {
			if (key !== "beforeEach" && key !== "afterEach" && typeof fileSystemTest[key] === "function" && key !== "nativeTest" && key !== "ensureNotExistsTest" && key !== "deleteParentDirIfEmptyTest" && key !== "createReadStreamTest" && key !== "createWriteStreamTest") {
				errorTest[key] = async () => {
					await simulateIOError(() => assert.rejects(fileSystemTest[key]))
				}
			}
		}

		export async function shouldOmitEMFiles() {
			await simulateIOError(async () => {
				const promises: Promise<string>[] = []
				promises.push(fs.readFile("f1.txt", "utf-8"))
				promises.push(fs.readFile("f1.txt", "utf-8"))
				promises.push(fs.readFile("f1.txt", "utf-8"))
				promises.push(fs.readFile("f1.txt", "utf-8"))
				promises.push(fs.readFile("f1.txt", "utf-8"))
				assert.deepStrictEqual(await Promise.all(promises), ["f1.txt", "f1.txt", "f1.txt", "f1.txt", "f1.txt"])
			}, ["EMFILE", "ENFILE", "EAGAIN"])
		}

	}

}