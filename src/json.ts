import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs"
import { dirname } from "path"
import { stripBOM } from "./misc"

/**
 * 删除 JSON 字符串中的注释和末尾多余的逗号
 * @param value 要处理的字符串
 * @param aligned 如果为 `true` 则将注释替换为等长空格而非删除
 */
export function normalizeJSON(value: string, aligned = true) {
	return value.replace(/"(?:[^\\"\n\r]|\\.)*"|\/\/[^\n\r]*|\/\*.*?(?:\*\/|$)|#[^\n\r]*|,(?=\s*[\]\}])/sg, source => {
		if (source.charCodeAt(0) === 34 /*"*/) {
			return source
		}
		return aligned ? source.replace(/[^\n\r]/g, " ") : ""
	})
}

/**
 * 同步读取指定的 JSON 文件，忽略其中的注释和末尾多余的逗号
 * @param path 要读取的文件路径
 */
export function readJSON(path: string) {
	return JSON.parse(normalizeJSON(stripBOM(readFileSync(path, "utf-8")), false))
}

/**
 * 同步保存指定的 JSON 文件
 * @param path 要保存的文件路径
 * @param data 要保存的 JSON 数据
 */
export function writeJSON(path: string, data: any) {
	data = JSON.stringify(data)
	const tmp = path + ".swp~"
	try {
		writeFileSync(tmp, data)
	} catch (e) {
		if (e.code !== "ENOENT") {
			throw e
		}
		mkdirSync(dirname(tmp), { recursive: true })
		writeFileSync(tmp, data)
	}
	renameSync(tmp, path)
}