import * as assert from "assert"
import * as fsSync from "fs"
import * as path from "path"
import * as fileSystemSync from "../src/fileSystemSync"
import { isCaseInsensitive } from "../src/path"
import { init, rootDir, simulateIOError, uninit } from "./helpers/fsHelper"

export namespace fileSystemSyncTest {

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

	export function getStatTest() {
		assert.strictEqual(fileSystemSync.getStat("dir").isDirectory(), true)
		assert.strictEqual(fileSystemSync.getStat("dir", false).isDirectory(), true)

		assert.strictEqual(fileSystemSync.getStat("f1.txt").isFile(), true)
		assert.strictEqual(fileSystemSync.getStat("f1.txt", false).isFile(), true)

		assert.strictEqual(fileSystemSync.getStat("dir/sub2/f5.txt").size, 6)
		assert.strictEqual(fileSystemSync.getStat("dir/sub2/f5.txt", false).size, 6)

		assert.throws(() => { fileSystemSync.getStat("404") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.getStat("404", false) }, { code: "ENOENT" })
	}

	export function existsFileTest() {
		assert.strictEqual(fileSystemSync.existsFile("f1.txt"), true)
		assert.strictEqual(fileSystemSync.existsFile("dir"), false)

		assert.strictEqual(fileSystemSync.existsFile("404"), false)
	}

	export function existsDirTest() {
		assert.strictEqual(fileSystemSync.existsDir("f1.txt"), false)
		assert.strictEqual(fileSystemSync.existsDir("dir"), true)

		assert.strictEqual(fileSystemSync.existsDir("404"), false)
	}

	export function ensureNotExistsTest() {
		assert.strictEqual(fileSystemSync.ensureNotExists("dir"), "dir_2")
		assert.strictEqual(fileSystemSync.ensureNotExists("f1.txt"), "f1_2.txt")
		assert.strictEqual(fileSystemSync.ensureNotExists("f1.txt", "(0)"), "f1(0).txt")

		assert.strictEqual(fileSystemSync.ensureNotExists("404"), "404")

		fsSync.writeFileSync("f1_99.txt", "f1_99.txt")
		assert.strictEqual(fileSystemSync.ensureNotExists("f1_99.txt"), "f1_100.txt")

		fsSync.writeFileSync("f1(99).txt", "f1(99).txt")
		assert.strictEqual(fileSystemSync.ensureNotExists("f1(99).txt", "(0)"), "f1(100).txt")
	}

	export function ensureDirExistsTest() {
		fileSystemSync.ensureDirExists("foo/goo.txt")
		assert.strictEqual(fsSync.existsSync("foo"), true)

		fileSystemSync.ensureDirExists("foo/goo.txt")
		assert.strictEqual(fsSync.existsSync("foo"), true)
	}

	export function createDirTest() {
		fileSystemSync.createDir("foo/goo")
		assert.strictEqual(fsSync.existsSync("foo/goo"), true)

		fileSystemSync.createDir("foo/goo")
		assert.strictEqual(fsSync.existsSync("foo/goo"), true)

		assert.throws(() => { fileSystemSync.createDir("f1.txt") }, { code: "EEXIST" })
	}

	export function createTempDirTest() {
		assert.strictEqual(fsSync.existsSync(fileSystemSync.createTempDir(rootDir)), true)
	}

	export function deleteDirTest() {
		assert.strictEqual(fileSystemSync.deleteDir("dir"), 3)
		assert.strictEqual(fsSync.existsSync("dir"), false)

		assert.strictEqual(fileSystemSync.deleteDir("dir"), 0)
		assert.strictEqual(fsSync.existsSync("dir"), false)

		assert.throws(() => { fileSystemSync.deleteDir("f1.txt") }, { code: "ENOTDIR" })
	}

	export function cleanDirTest() {
		assert.strictEqual(fileSystemSync.cleanDir("dir"), 3)
		assert.strictEqual(fsSync.existsSync("dir/sub2"), false)
		assert.strictEqual(fsSync.existsSync("dir"), true)

		assert.strictEqual(fileSystemSync.cleanDir("empty-dir"), 0)
		assert.strictEqual(fsSync.existsSync("empty-dir"), true)

		assert.strictEqual(fileSystemSync.cleanDir("dir/sub3"), 0)
		assert.strictEqual(fileSystemSync.cleanDir("dir/404"), 0)

		assert.throws(() => { fileSystemSync.cleanDir("f1.txt") }, { code: "ENOTDIR" })
	}

	export function deleteParentDirIfEmptyTest() {
		assert.strictEqual(fileSystemSync.deleteParentDirIfEmpty("dir/sub3/foo.txt"), 0)
		assert.strictEqual(fsSync.existsSync("dir/sub3"), false)

		assert.strictEqual(fileSystemSync.deleteParentDirIfEmpty("dir/sub1/foo.txt"), 0)
		assert.strictEqual(fsSync.existsSync("dir/sub1"), true)

		assert.strictEqual(fileSystemSync.deleteParentDirIfEmpty("empty-dir/foo.txt"), 1)
		assert.strictEqual(fsSync.existsSync("empty-dir"), false)

		fsSync.mkdirSync("empty1/empty2", { recursive: true })
		assert.strictEqual(fileSystemSync.deleteParentDirIfEmpty("empty1/empty2/foo.txt"), 2)
		assert.strictEqual(fsSync.existsSync("empty1"), false)
	}

	export function deleteFileTest() {
		assert.strictEqual(fileSystemSync.deleteFile("f1.txt"), true)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)

		assert.strictEqual(fileSystemSync.deleteFile("404.txt"), false)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)

		assert.throws(() => { fileSystemSync.deleteFile("dir") })
	}

	export function walkTest() {
		const dirs: string[] = []
		const files: string[] = []
		fileSystemSync.walk("", {
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
		fileSystemSync.walk("empty-dir", {
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
		fileSystemSync.walk("dir/sub1/f3.txt", {
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

		fileSystemSync.walk("404", {
			error(e) {
				assert.strictEqual(e.code, "ENOENT")
			}
		})
	}

	export function globTest() {
		assert.deepStrictEqual((fileSystemSync.glob("*")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt", "f1.txt", "f2.txt"])
		assert.deepStrictEqual((fileSystemSync.glob("dir")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt"])
		assert.deepStrictEqual((fileSystemSync.glob(["dir", "!dir"])), [])

		assert.deepStrictEqual((fileSystemSync.glob("*", "dir")).sort(), ["dir/sub1/f3.txt", "dir/sub1/f4.txt", "dir/sub2/f5.txt"])
	}

	export function readDirTest() {
		assert.deepStrictEqual((fileSystemSync.readDir(".")).sort(), ["dir", "empty-dir", "f1.txt", "f2.txt"])
		assert.deepStrictEqual((fileSystemSync.readDir(".", true)).map(entry => `${entry.name}${entry.isDirectory() ? "/" : ""}`).sort(), ["dir/", "empty-dir/", "f1.txt", "f2.txt"])

		assert.throws(() => { fileSystemSync.readDir("f1.txt") }, { code: "ENOTDIR" })
		assert.throws(() => { fileSystemSync.readDir("404") }, { code: "ENOENT" })
	}

	export function readFileTest() {
		assert.strictEqual(fileSystemSync.readFile("f1.txt", "utf-8"), "f1.txt")
		assert.strictEqual(fileSystemSync.readFile("dir/sub1/f4.txt", "utf-8"), "f4.txt")

		assert.strictEqual((fileSystemSync.readFile("f1.txt")).toString(), "f1.txt")

		assert.throws(() => { fileSystemSync.readFile("dir") }, { code: "EISDIR" })
		assert.throws(() => { fileSystemSync.readFile("404") }, { code: "ENOENT" })
	}

	export function readTextTest() {
		assert.strictEqual(fileSystemSync.readText("f1.txt"), "f1.txt")
		assert.strictEqual(fileSystemSync.readText("dir/sub1/f4.txt"), "f4.txt")

		assert.strictEqual(fileSystemSync.readText("404", false), null)
	}

	export function writeFileTest() {
		assert.strictEqual(fileSystemSync.writeFile("foo/goo.txt", "A"), true)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A")
		assert.strictEqual(fileSystemSync.writeFile("foo/goo.txt", "A", false), false)

		assert.strictEqual(fileSystemSync.writeFile("foo/goo.txt", "你好"), true)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "你好")

		assert.strictEqual(fileSystemSync.writeFile("foo/goo.txt", "你不好", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "你好")

		assert.throws(() => { fileSystemSync.writeFile("dir", "你好", true) }, { code: "EISDIR" })
	}

	export function appendFileTest() {
		fileSystemSync.appendFile("foo/goo.txt", "A")
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A")
		fileSystemSync.appendFile("foo/goo.txt", "你好")
		assert.strictEqual(fsSync.readFileSync("foo/goo.txt", "utf-8"), "A你好")

		assert.throws(() => { fileSystemSync.appendFile("dir", "你好") }, { code: "EISDIR" })
	}

	export async function searchTextTest() {
		assert.deepStrictEqual(fileSystemSync.searchText("dir/sub1/f3.txt", "f3"), [
			{
				path: "dir/sub1/f3.txt",
				start: 0,
				end: 2,
				content: "f3.txt"
			}
		])
		assert.deepStrictEqual(fileSystemSync.searchText("dir/sub1/f4.txt", /F(\d+)/ig), [
			{
				path: "dir/sub1/f4.txt",
				start: 0,
				end: 2,
				content: "f4.txt"
			}
		])
	}

	export async function searchAllTextTest() {
		assert.deepStrictEqual(fileSystemSync.searchAllText("f3.txt", "f3"), [
			{
				path: "dir/sub1/f3.txt",
				start: 0,
				end: 2,
				content: "f3.txt"
			}
		])
		assert.deepStrictEqual(fileSystemSync.searchAllText("f4.txt", /F(\d+)/ig), [
			{
				path: "dir/sub1/f4.txt",
				start: 0,
				end: 2,
				content: "f4.txt"
			}
		])
	}

	export async function replaceTextTest() {
		assert.strictEqual(fileSystemSync.replaceText("dir/sub1/f3.txt", "f3", "$&"), true)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f3.txt", "utf-8"), "$&.txt")
		assert.strictEqual(fileSystemSync.replaceText("dir/sub1/f4.txt", /F(\d+)/ig, "$1"), true)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
		assert.strictEqual(fileSystemSync.replaceText("dir/sub1/f4.txt", /X(\d+)/ig, "$1"), false)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
		assert.strictEqual(fileSystemSync.replaceText("dir/sub1/not-exists.txt", /X(\d+)/ig, "$1"), false)
	}
	export async function replaceAllTextTest() {
		assert.strictEqual(fileSystemSync.replaceAllText("f3.txt", "f3", "$&"), 1)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f3.txt", "utf-8"), "$&.txt")
		assert.strictEqual(fileSystemSync.replaceAllText("f4.txt", /F(\d+)/ig, "$1"), 1)
		assert.strictEqual(fsSync.readFileSync("dir/sub1/f4.txt", "utf-8"), "4.txt")
	}

	export function createLinkTest() {
		assert.strictEqual(fileSystemSync.createLink("foo/lnk", "f1.txt"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk", "utf-8"), "f1.txt")

		assert.strictEqual(fileSystemSync.createLink("foo/lnk", "f2.txt", false), false)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk", "utf-8"), "f1.txt")

		assert.strictEqual(fileSystemSync.createLink("foo/lnk", "f2.txt"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk", "utf-8"), "f2.txt")

		assert.strictEqual(fileSystemSync.createLink("foo/lnk2", "dir"), true)
		assert.strictEqual(fileSystemSync.createLink("foo/lnk2", "dir", false), false)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk2/sub2/f5.txt", "utf-8"), "f5.txt")
	}

	export function readLinkTest() {
		assert.strictEqual(fileSystemSync.createLink("lnk", "dir"), true)
		assert.strictEqual(path.relative(rootDir, fileSystemSync.readLink("lnk")), "dir")

		assert.throws(() => { fileSystemSync.readLink("404") }, { code: "ENOENT" })
	}

	export function copyDirTest() {
		assert.strictEqual(fileSystemSync.copyDir("dir", "foo/copydir"), 3)
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub2/f5.txt", "utf-8"), "f5.txt")

		fsSync.writeFileSync("foo/copydir/sub2/f5.txt", "f5.txt_1")
		assert.strictEqual(fileSystemSync.copyDir("dir", "foo/copydir", false), 0)
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/copydir/sub2/f5.txt", "utf-8"), "f5.txt_1")

		assert.strictEqual(fileSystemSync.copyDir("empty-dir", "foo/empty-dir"), 0)
		assert.strictEqual(fsSync.existsSync("foo/empty-dir"), true)

		assert.throws(() => { fileSystemSync.copyDir("404", "foo/copydir") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.copyDir("f1.txt", "foo/copydir") }, { code: "ENOTDIR" })
	}

	export function copyFileTest() {
		assert.strictEqual(fileSystemSync.copyFile("f1.txt", "foo/copyf1.txt"), true)
		assert.strictEqual(fsSync.readFileSync("foo/copyf1.txt", "utf-8"), "f1.txt")

		fsSync.writeFileSync("foo/copyf1.txt", "f1.txt_1")
		assert.strictEqual(fileSystemSync.copyFile("f1.txt", "foo/copyf1.txt", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/copyf1.txt", "utf-8"), "f1.txt_1")

		assert.throws(() => { fileSystemSync.copyFile("404", "f1.txt") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.copyFile("404", "copy.txt") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.copyFile("404", "dir") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.copyFile("404", "goo/copyf1.txt") }, { code: "ENOENT" })
		if (process.platform === "win32") {
			assert.throws(() => { fileSystemSync.copyFile("empty-dir", "foo/copydir") })
		}
		assert.throws(() => { fileSystemSync.copyFile("f1.txt", "dir") })
	}

	export function copyLinkTest() {
		assert.strictEqual(fileSystemSync.createLink("lnk", "f2.txt"), true)
		assert.strictEqual(fileSystemSync.copyLink("lnk", "foo/copy-link"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/copy-link", "utf-8"), "f2.txt")

		assert.strictEqual(fileSystemSync.createLink("lnk2", "dir"), true)
		assert.strictEqual(fileSystemSync.copyLink("lnk2", "foo/lnk2"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")

		assert.strictEqual(fileSystemSync.createLink("lnk3", "empty-dir"), true)
		assert.strictEqual(fileSystemSync.copyLink("lnk2", "foo/lnk2", false), false)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
	}

	export function moveDirTest() {
		assert.strictEqual(fileSystemSync.moveDir("dir", "foo/movedir"), 3)
		assert.strictEqual(fsSync.existsSync("dir"), false)
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub2/f5.txt", "utf-8"), "f5.txt")

		fsSync.writeFileSync("foo/movedir/sub2/f5.txt", "f5.txt_1")
		assert.strictEqual(fileSystemSync.moveDir("foo/movedir", "foo/movedir", false), 0)
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub1/f4.txt", "utf-8"), "f4.txt")
		assert.strictEqual(fsSync.readFileSync("foo/movedir/sub2/f5.txt", "utf-8"), "f5.txt_1")

		assert.strictEqual(fileSystemSync.moveDir("empty-dir", "foo/empty-dir"), 0)
		assert.strictEqual(fsSync.existsSync("empty-dir"), false)
		assert.strictEqual(fsSync.existsSync("foo/empty-dir"), true)

		assert.throws(() => { fileSystemSync.moveDir("404", "foo/movedir") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.moveDir("f1.txt", "foo/movedir") }, { code: "ENOTDIR" })
	}

	export function moveFileTest() {
		assert.strictEqual(fileSystemSync.moveFile("f1.txt", "foo/movef1.txt"), true)
		assert.strictEqual(fsSync.existsSync("f1.txt"), false)
		assert.strictEqual(fsSync.readFileSync("foo/movef1.txt", "utf-8"), "f1.txt")

		assert.strictEqual(fileSystemSync.moveFile("foo/movef1.txt", "foo/movef1.txt", false), false)
		assert.strictEqual(fsSync.readFileSync("foo/movef1.txt", "utf-8"), "f1.txt")

		assert.throws(() => { fileSystemSync.moveFile("404", "dir") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.moveFile("404", "dir", false) }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.moveFile("404", "goo/copyf1.txt") }, { code: "ENOENT" })
		assert.throws(() => { fileSystemSync.moveFile("404", "goo/copyf1.txt", false) }, { code: "ENOENT" })
	}

	export function moveLinkTest() {
		assert.strictEqual(fileSystemSync.createLink("lnk", "f2.txt"), true)
		assert.strictEqual(fileSystemSync.moveLink("lnk", "foo/copy-link"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/copy-link", "utf-8"), "f2.txt")
		assert.strictEqual(fsSync.existsSync("lnk"), false)

		assert.strictEqual(fileSystemSync.createLink("lnk2", "dir"), true)
		assert.strictEqual(fileSystemSync.moveLink("lnk2", "foo/lnk2"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
		assert.strictEqual(fsSync.existsSync("lnk2"), false)

		assert.strictEqual(fileSystemSync.createLink("lnk2", "dir"), true)
		assert.strictEqual(fileSystemSync.createLink("lnk3", "empty-dir"), true)
		assert.strictEqual(fileSystemSync.moveLink("lnk2", "foo/lnk2", false), false)
		assert.strictEqual(fsSync.existsSync("lnk2"), true)
		assert.strictEqual(fileSystemSync.readFile("foo/lnk2/sub1/f3.txt", "utf-8"), "f3.txt")
	}

	export function getRealPathTest() {
		assert.strictEqual(path.relative(process.cwd(), fileSystemSync.getRealPath("f1.txt")), "f1.txt")
		if (isCaseInsensitive) {
			assert.strictEqual(path.relative(process.cwd(), fileSystemSync.getRealPath("F1.txt")), "f1.txt")
		}

		assert.strictEqual(fileSystemSync.getRealPath("404"), null)
	}

	export namespace errorTest {

		for (const key in fileSystemSyncTest) {
			if (key !== "beforeEach" && key !== "afterEach" && typeof fileSystemSyncTest[key] === "function" && key !== "ensureNotExistsTest" && key !== "deleteParentDirIfEmptyTest") {
				errorTest[key] = () => {
					simulateIOError(() => {
						assert.throws(fileSystemSyncTest[key])
					})
				}
			}
		}

	}

}