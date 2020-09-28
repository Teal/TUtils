import * as assert from "assert"
import * as fs from "fs"
import { resolve as resolvePath } from "path"
import * as fileSystemWatcher from "../src/fileSystemWatcher"
import { init, rootDir, uninit } from "./helpers/fsHelper"

export namespace fileSystemWatcherTest {

	export async function beforeEach() {
		await init({})
	}

	export async function afterEach() {
		await uninit()
	}

	export async function watchDirAndCreateFile() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndCreateFile.txt"))
				assert.strictEqual(fs.readFileSync("foo/watchDirAndCreateFile.txt", "utf-8"), "A")
				watcher.close(resolve)
			})
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/watchDirAndCreateFile.txt", "A")
			})
		})
	}

	export async function watchDirAndChangeFile() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndChangeFile.txt"))
				assert.strictEqual(fs.readFileSync("foo/watchDirAndChangeFile.txt", "utf-8"), "A")
				fs.writeFileSync("foo/watchDirAndChangeFile.txt", "B")
			})
			watcher.on("change", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndChangeFile.txt"))
				assert.strictEqual(fs.readFileSync("foo/watchDirAndChangeFile.txt", "utf-8"), "B")
				watcher.close(resolve)
			})
			watcher.on("delete", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/watchDirAndChangeFile.txt", "A")
			})
		})
	}

	export async function watchDirAndDeleteFile() {
		fs.mkdirSync("foo")
		fs.writeFileSync("foo/watchDirAndDeleteFile.txt", "A")
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndDeleteFile.txt"))
				assert.strictEqual(fs.existsSync("foo/watchDirAndDeleteFile.txt"), false)
				watcher.close(resolve)
			})
			watcher.add(rootDir, () => {
				fs.unlinkSync("foo/watchDirAndDeleteFile.txt")
			})
		})
	}

	export async function watchDirAndDeleteFileAndCreateDir() {
		fs.mkdirSync("foo")
		fs.writeFileSync("foo/watchDirAndDeleteFileAndCreateDir.txt", "A")
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			let fileDeleted = false
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => {
				fileDeleted = true
				assert.strictEqual(path, resolvePath("foo/watchDirAndDeleteFileAndCreateDir.txt"))
			})
			watcher.on("createDir", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndDeleteFileAndCreateDir.txt"))
				assert.ok(fileDeleted)
				watcher.close(resolve)
			})
			watcher.add(rootDir, () => {
				fs.unlinkSync("foo/watchDirAndDeleteFileAndCreateDir.txt")
				fs.mkdirSync("foo/watchDirAndDeleteFileAndCreateDir.txt")
			})
		})
	}

	export async function watchDirAndDeleteFileFast() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/watchDirAndDeleteFileFast.txt", "A")
				fs.unlinkSync("foo/watchDirAndDeleteFileFast.txt")
				watcher.close(resolve)
			})
		})
	}

	export async function watchDirAndCreateDir() {
		fs.mkdirSync("foo")
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => { assert.fail(path) })
			watcher.on("createDir", path => {
				assert.strictEqual(path, resolvePath("foo/watchDirAndCreateDir"))
				watcher.close(resolve)
			})
			watcher.on("deleteDir", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/watchDirAndCreateDir")
			})
		})
	}

	export async function watchDirAndDeleteDir() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", path => { assert.fail(path) })
			watcher.on("delete", path => { assert.fail(path) })
			watcher.on("createDir", path => {
				assert.strictEqual(path, resolvePath("foo"))
				fs.rmdirSync("foo")
			})
			watcher.on("deleteDir", path => {
				assert.strictEqual(path, resolvePath("foo"))
				watcher.close(resolve)
			})
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo")
			})
		})
	}

	export async function watchDirAndDeleteDirFast() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			watcher.on("createDir", path => { assert.fail(path) })
			watcher.on("deleteDir", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo")
				fs.rmdirSync("foo")
				watcher.close(resolve)
			})
		})
	}

	export async function watchFileAndChangeFile() {
		await new Promise(resolve => {
			let step = 0
			fs.mkdirSync("foo/")
			fs.writeFileSync("foo/watchFileAndChangeFile.txt", "O")
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10, compareModifyTime: false })
			watcher.on("create", path => { assert.fail(path) })
			watcher.on("change", (path: string) => {
				switch (step++) {
					case 0:
						assert.strictEqual(path, resolvePath("foo/watchFileAndChangeFile.txt"))
						assert.strictEqual(fs.readFileSync("foo/watchFileAndChangeFile.txt", "utf-8"), "A")
						fs.writeFileSync("foo/watchFileAndChangeFile.txt", "B")
						break
					case 1:
						assert.strictEqual(path, resolvePath("foo/watchFileAndChangeFile.txt"))
						assert.strictEqual(fs.readFileSync("foo/watchFileAndChangeFile.txt", "utf-8"), "B")
						watcher.close(resolve)
						break
				}
			})
			watcher.on("delete", path => { assert.fail(path) })
			watcher.add(resolvePath("foo/watchFileAndChangeFile.txt"), () => {
				fs.writeFileSync("foo/watchFileAndChangeFile.txt", "A")
			})
		})
	}

	export async function addTest() {
		await new Promise(resolve => {
			fs.mkdirSync("foo/")
			fs.mkdirSync("foo/sub1")
			const watcher = new fileSystemWatcher.FileSystemWatcher()
			watcher.add(resolvePath("foo"), error => {
				assert.ifError(error)
				assert.strictEqual(watcher.isWatching, true)
				assert.strictEqual(watcher.isWatchingPath(resolvePath("foo")), true)
				assert.strictEqual(watcher.isWatchingPath(resolvePath("foo/sub1")), true)
				assert.strictEqual(watcher.isWatchingPath(resolvePath("goo")), false)
				watcher.add(resolvePath("foo/sub1"), () => {
					watcher.add(rootDir, () => {
						watcher.close(() => {
							assert.strictEqual(watcher.isWatching, false)
							resolve()
						})
					})
				})
			})
		})
	}

	export async function removeTest() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher()
			watcher.add(rootDir, () => {
				assert.strictEqual(watcher.isWatching, true)
				watcher.remove(resolvePath("foo"), () => {
					watcher.remove(rootDir, () => {
						assert.strictEqual(watcher.isWatching, false)
						watcher.remove("404", () => {
							assert.strictEqual(watcher.isWatching, false)
							watcher.close(resolve)
						})
					})
				})
			})
		})
	}

	export async function ignoredTest() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10, persistent: false })
			watcher.ignored = () => true
			watcher.on("create", path => { assert.fail(path) })
			watcher.add(".", () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/你好.txt", "A")
				watcher.close(resolve)
			})
		})
	}

	export async function pauseTest() {
		await new Promise(async resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			let paused = true
			watcher.on("create", path => {
				assert.strictEqual(path, resolvePath("foo/created.txt"))
				assert.strictEqual(paused, false)
				watcher.close(resolve)
			})
			watcher.on("delete", path => { assert.fail(path) })
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/created.txt", "A")
			})
			watcher.pause()
			await new Promise(r => setTimeout(r, 60))
			watcher.pause()
			paused = false
			watcher.resume()
			watcher.resume()
			watcher.pause()
			watcher.resume()
		})
	}

	export async function readyTest() {
		await new Promise(async resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher({ delay: 10 })
			const paths: string[] = []
			watcher.on("create", path => {
				paths.push(path)
			})
			watcher.on("ready", () => {
				if (paths.length === 2) {
					paths.sort()
					assert.strictEqual(paths[0], resolvePath("foo/ready-1.txt"))
					assert.strictEqual(paths[1], resolvePath("foo/ready-2.txt"))
					watcher.close(resolve)
				}
			})
			watcher.add(rootDir, () => {
				fs.mkdirSync("foo/")
				fs.writeFileSync("foo/ready-1.txt", "A")
				fs.writeFileSync("foo/ready-2.txt", "A")
			})
		})
	}

	export async function watchErrorTest() {
		await new Promise(resolve => {
			const watcher = new fileSystemWatcher.FileSystemWatcher()
			watcher.add("404", (error) => {
				assert.ok(error)
				assert.strictEqual(watcher.isWatchingPath("404"), false)
				watcher.close()
				watcher.close(resolve)
			})
		})
	}

	export namespace recursiveTest {
		if (new fileSystemWatcher.FileSystemWatcher().watchOptions.recursive) {
			for (const key in fileSystemWatcherTest) {
				if ((key.startsWith("watch") || key.endsWith("Test")) && key !== "recursiveTest" && key !== "pollingTest") {
					recursiveTest[key] = async function () {
						const FileSystemWatcher = fileSystemWatcher.FileSystemWatcher
						// @ts-ignore
						fileSystemWatcher.FileSystemWatcher = class extends FileSystemWatcher {
							constructor(options: fileSystemWatcher.FileSystemWatcherOptions) {
								super(options)
								this.watchOptions.recursive = false
							}
						}
						try {
							return await fileSystemWatcherTest[key].call(this, arguments)
						} finally {
							// @ts-ignore
							fileSystemWatcher.FileSystemWatcher = FileSystemWatcher
						}
					}
				}
			}
		}

	}

	export namespace pollingTest {
		for (const key in fileSystemWatcherTest) {
			if (key === "watchDirAndDeleteFile") {
				pollingTest[key] = async function () {
					this.slow(600)
					const FileSystemWatcher = fileSystemWatcher.FileSystemWatcher
					// @ts-ignore
					fileSystemWatcher.FileSystemWatcher = class extends FileSystemWatcher {
						constructor(options: fileSystemWatcher.FileSystemWatcherOptions) {
							super({ ...options, usePolling: true, interval: 100 })
						}
					}
					try {
						return await fileSystemWatcherTest[key].call(this, arguments)
					} finally {
						// @ts-ignore
						fileSystemWatcher.FileSystemWatcher = FileSystemWatcher
					}
				}
			}
		}
	}

}