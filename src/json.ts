/**
 * 解析 JSON 数据，支持非常规的 JSON 格式及注释
 * @param value 要解析的字符串
 */
export function parseJSON<T>(value: string) {
	try {
		return new Function(`return ${value}`)() as T
	} catch {
		return null
	}
}

/**
 * 格式化 JSON 数据为字符串
 * @param value 要格式化的对象
 */
export function formatJSON(value: any) {
	return JSON.stringify(value, undefined, 2)
}

/**
 * 删除 JSON 字符串中的注释和末尾多余的逗号
 * @param value 要处理的字符串
 * @param aligned 如果为 `true` 则将注释替换为等长空格而非删除
 */
export function normalizeJSON(value: string, aligned = true) {
	return value.replace(/"(?:[^\\"\n\r]|\\.)*"|\/\/[^\n\r]*|\/\*.*?(?:\*\/|$)|#[^\n\r]*|,(?=\s*[\]\}])/sg, source => {
		if (source.charCodeAt(0) === 34 /* " */) {
			return source
		}
		return aligned ? source.replace(/[^\n\r]/g, " ") : ""
	})
}

/**
 * 读取一个 JSON 数据
 * @param value JSON 数据
 * @param key 键值，多级字段用 `/` 分割
 */
export function readJSONByPath(value: any, key: string) {
	const info = lookupKey(value, key)
	if (info) {
		return info.json[info.key]
	}
}

/**
 * 写入一个 JSON 数据
 * @param value JSON 数据
 * @param key 键值，多级字段用 `/` 分割
 * @param data 要写入的数据
 */
export function writeJSONByPath(value: any, key: string, data: any) {
	const info = lookupKey(value, key, true)!
	info.json[info.key] = data
}

/**
 * 移动一个 JSON 数据
 * @param value JSON 数据
 * @param keys 移动的键值，多级字段用 `/` 分割
 * @param before 插入的位置
 */
export function moveJSONByPath(value: any, keys: string[], before: string | null) {
	const beforeInfo = before != null ? lookupKey(value, before, true)! : { json: value, key: before }
	const current = {}
	for (const key of keys) {
		const info = lookupKey(value, key, false)
		if (info && info.key in info.json) {
			current[info.key] = info.json[info.key]
			delete info.json[info.key]
		}
	}
	let foundBefore = false
	const next = {}
	for (const key in beforeInfo.json) {
		if (key === beforeInfo.key) {
			foundBefore = true
		}
		if (foundBefore) {
			next[key] = beforeInfo.json[key]
			delete beforeInfo.json[key]
		}
	}
	Object.assign(beforeInfo.json, current, next)
}

/**
 * 删除一个 JSON 数据
 * @param value JSON 数据
 * @param key 键值，多级字段用 `/` 分割
 * @returns 返回是否删除成功
 */
export function deleteJSONByPath(value: any, key: string) {
	const info = lookupKey(value, key)
	if (info) {
		return delete info.json[info.key]
	}
	return false
}

function lookupKey(json: any, key: string, create?: boolean) {
	const keys = key.split("/")
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i]
		if (json[key] == undefined || typeof json[key] !== "object") {
			if (!create) {
				return null
			}
			json = json[key] = {}
		} else {
			json = json[key]
		}
	}
	return {
		json,
		key: keys[keys.length - 1]
	}
}