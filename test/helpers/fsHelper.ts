import * as assert from "assert"
import { join, resolve } from "path"
import fs = require("fs")

/** 更改前的工作文件夹路径 */
var originalWorkingDir: string | undefined

/** 用于存放测试文件的文件夹路径 */
export const rootDir = resolve("node_modules/__test__")

/**
 * 初始化用于测试的文件
 * @param entries 要创建的文件或文件夹项
 */
export async function init(entries: FileEntries) {
	if (originalWorkingDir) await uninit()
	await retryIfError(() => { deleteEntry(rootDir) })
	await retryIfError(() => { createEntries(entries, rootDir) })
	await retryIfError(() => { originalWorkingDir = changeWorkingDir(rootDir) })
}

/**
 * 表示一个文件或文件夹项，键为文件或文件夹名，值可能有三个类型：
 * - 字符串：表示文本文件的内容
 * - 缓存对象：表示二进制文件数据
 * - 文件或文件夹项：表示一个子文件夹
 */
export interface FileEntries {
	[name: string]: string | Buffer | FileEntries
}

/**
 * 创建指定的文件或文件夹项
 * @param entries 要创建的文件或文件夹项
 * @param dir 根文件夹路径
 */
function createEntries(entries: FileEntries, dir: string) {
	fs.mkdirSync(dir, { recursive: true })
	for (const key in entries) {
		const entry = entries[key]
		const child = resolve(dir, key)
		if (typeof entry === "string" || Buffer.isBuffer(entry)) {
			fs.writeFileSync(child, entry)
		} else {
			createEntries(entry, child)
		}
	}
}

/**
 * 删除指定的文件或文件夹
 * @param path 要删除的文件或文件夹路径
 */
function deleteEntry(path: string) {
	try {
		if (fs.lstatSync(path).isDirectory()) {
			for (const entry of fs.readdirSync(path)) {
				deleteEntry(join(path, entry))
			}
			fs.rmdirSync(path)
		} else {
			fs.unlinkSync(path)
		}
	} catch (e) {
		if (e.code === "ENOENT") {
			return
		}
		throw e
	}
}

/**
 * 更改当前的工作文件夹
 * @param dir 新文件夹路径，如果文件夹不存在会被自动创建
 * @returns 返回更改前的工作文件夹路径
 */
function changeWorkingDir(dir: string) {
	const originalWorkingDir = process.cwd()
	fs.mkdirSync(dir, { recursive: true })
	process.chdir(dir)
	return originalWorkingDir
}

/**
 * 执行指定的函数，如果出错则自动重试
 * @param callback 要执行的函数
 * @param times 允许自动重试的次数，超过次数限制后将抛出错误
 */
function retryIfError<T>(callback: () => T, times = 3) {
	return new Promise<T>((resolve, reject) => {
		try {
			resolve(callback())
		} catch (e) {
			if (times > 0) {
				setTimeout(() => {
					retryIfError(callback, times - 1).then(resolve, reject)
				}, times > 2 ? 50 : 9)
				return
			}
			reject(e)
		}
	})
}

/** 删除用于测试的文件 */
export async function uninit() {
	if (originalWorkingDir) {
		await retryIfError(() => { changeWorkingDir(originalWorkingDir) })
		await retryIfError(() => { deleteEntry(rootDir) })
		originalWorkingDir = undefined
	}
}

/**
 * 校验指定的文件项
 * @param entries 要校验的文件项
 * @param dir 根文件夹路径
 */
export function check(entries: FileEntries, dir = rootDir) {
	for (const key in entries) {
		const entry = entries[key]
		const child = join(dir, key)
		if (typeof entry === "string") {
			assert.strictEqual(fs.readFileSync(child, "utf-8"), entry)
		} else if (Buffer.isBuffer(entry)) {
			assert.deepStrictEqual(fs.readFileSync(child), entry)
		} else {
			assert.strictEqual(fs.statSync(child).isDirectory(), true)
			check(entry, child)
		}
	}
}

/**
 * 执行指定的函数，并在执行期间模拟 IO 错误
 * @param callback 要执行的函数
 * @param errorCodes 模拟的错误代码，每次调用 IO 函数将返回对应的错误代码，调用次数超出数组长度后恢复正常调用
 * @param syscalls 要模拟错误的系统 IO 调用
 */
export async function simulateIOError<T>(callback: () => T | Promise<T>, errorCodes = ["UNKNOWN"], syscalls = ["access", "accessSync", "readFile", "readFileSync", "rename", "renameSync", "truncate", "truncateSync", "ftruncate", "ftruncateSync", "rmdir", "rmdirSync", "fdatasync", "fdatasyncSync", "fsync", "fsyncSync", "mkdir", "mkdirSync", "readdir", "readdirSync", "fstat", "lstat", "stat", "fstatSync", "lstatSync", "statSync", "readlink", "readlinkSync", "writeFile", "writeFileSync", "symlink", "symlinkSync", "link", "linkSync", "unlink", "unlinkSync", "fchmod", "fchmodSync", "chmod", "chmodSync", "fchown", "fchownSync", "chown", "chownSync", "utimes", "utimesSync", "futimes", "futimesSync", "realpathSync", "realpath", "mkdtemp", "mkdtempSync"]) {
	const originalFS = {}
	for (const syscall of syscalls) {
		const originalSyscall = originalFS[syscall] = fs[syscall]
		let index = 0
		fs[syscall] = (...args: any[]) => {
			if (index < errorCodes.length) {
				const error = new Error(`Simulated IO Error: ${errorCodes[index]}, ${syscall} '${args[0]}'`) as NodeJS.ErrnoException
				error.code = errorCodes[index++]
				error.syscall = syscall
				error.path = args[0]
				if (args.length && typeof args[args.length - 1] === "function") {
					return args[args.length - 1](error, null)
				} else {
					throw error
				}
			}
			fs[syscall] = originalSyscall
			delete originalFS[syscall]
			return originalSyscall(...args)
		}
		if (syscall === "realpath" || syscall === "realpathSync") {
			fs[syscall].native = fs[syscall]
		}
	}
	try {
		return await callback()
	} finally {
		for (const key in originalFS) {
			fs[key] = originalFS[key]
		}
	}
}