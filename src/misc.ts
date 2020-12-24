
/**
 * 合并所有对象，如果两个对象包含同名的数组，则将这些数组合并为一个
 * @param target 要合并的目标对象
 * @param sources 要合并的源对象
 * @example merge({x: [0], y: 0}, {x: [1], y: 2}) // {x: [0, 1], y: 2}
 */
export function merge<T, S>(target: T, ...sources: S[]) {
	const cloned = new Map()
	for (const source of sources) {
		target = merge(target, source)
	}
	return target as T & S

	function merge(target: any, source: any) {
		if (source == undefined) {
			return target
		}
		if (typeof target === "object" && typeof source === "object") {
			if (Array.isArray(target) && Array.isArray(source)) {
				return [...target, ...source]
			}
			const exists = cloned.get(source)
			if (exists !== undefined) {
				return exists
			}
			const result: { [key: string]: any } = { ...target }
			cloned.set(source, result)
			for (const key in source) {
				result[key] = merge(result[key], source[key])
			}
			return result
		}
		return source
	}
}

/**
 * 删除字符串开头的 UTF-8 BOM 字符
 * @param content 要处理的字符串
 */
export function stripBOM(content: string) {
	if (content.charCodeAt(0) === 0xfeff) {
		content = content.substring(1)
	}
	return content
}

/**
 * 返回首字母大写的字符串
 * @param str 要处理的字符串
 */
export function capitalize(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 生成指定长度的随机字符串
 * @param length 要生成的字符串长度
 */
export function randomString(length: number) {
	let result = ""
	while (result.length < length) {
		result += Math.random().toString(36).substring(2)
	}
	return result.substring(0, length)
}

/**
 * 拼接两个数组
 * @param arrays 要串联的数组
 */
export function concat<T>(x: T[] | null | undefined, y: T[] | null | undefined) {
	if (!x) {
		return y
	}
	if (!y) {
		return x
	}
	return [...x, ...y]
}

/**
 * 如果数组中不存在指定的项则添加到数组末尾
 * @param arr 要处理的数组
 * @param item 要添加的项
 * @return 如果已添加到数组则返回 `true`，否则说明该项已存在，返回 `false`
 * @example pushIfNotExists(1, 9, 0], 1) // 数组变成 [1, 9, 0]
 * @example pushIfNotExists([1, 9, 0], 2) // 数组变成 [1, 9, 0, 2]
 */
export function pushIfNotExists<T>(arr: T[], item: T) {
	return arr.indexOf(item) < 0 && arr.push(item) > 0
}

/**
 * 在已排序的数组中二分查找指定的项，如果找到则返回该值的位置，否则返回离该值最近的位置的位反值（总是小于 0）
 * @param arr 要遍历的数组
 * @param item 要查找的项
 * @param keySelector 用于获取每项元素待比较的键的回调函数
 * @param keyComparer 用于确定两个键排序顺序的回调函数
 * @param keyComparer.left 要比较的左值
 * @param keyComparer.right 要比较的右值
 * @param keyComparer.return 如果左值应排在右值前面，应返回负数，如果右值应排在右值后面，应返回正数，如果两者相同则返回零
 * @param start 开始查找的索引（从 0 开始）
 * @param end 结束查找的索引（从 0 开始，不含）
 */
export function binarySearch<T, V, K>(arr: readonly T[], item: V, keySelector = (item: T | V) => item as unknown as K, keyComparer = (left: K, right: K) => left < right ? -1 : left > right ? 1 : 0 as number, start = 0, end = arr.length) {
	end--
	const key = keySelector(item)
	while (start <= end) {
		const middle = start + ((end - start) >> 1)
		const midKey = keySelector(arr[middle])
		const result = keyComparer(midKey, key)
		if (result < 0) {
			start = middle + 1
		} else if (result > 0) {
			end = middle - 1
		} else {
			return middle
		}
	}
	return ~start
}

/**
 * 按顺序插入元素到已排序的数组中，如果值已存在则插入到存在的值之后
 * @param sortedArray 已排序的数组
 * @param item 要插入的值
 * @param comparer 确定元素顺序的回调函数，如果函数返回 `true`，则将 `x` 排在 `y` 的前面，否则相反
 * @param comparer.x 要比较的第一个元素
 * @param comparer.y 要比较的第二个元素
 */
export function insertSorted<T>(sortedArray: T[], item: T, comparer: (x: T, y: T) => boolean) {
	let start = 0
	let end = sortedArray.length - 1
	while (start <= end) {
		const middle = start + ((end - start) >> 1)
		if (comparer(sortedArray[middle], item)) {
			start = middle + 1
		} else {
			end = middle - 1
		}
	}
	sortedArray.splice(start, 0, item)
}

/**
 * 删除数组中指定的项，如果有多个匹配项则只删除第一项
 * @param arr 要处理的数组
 * @param item 要删除的项
 * @param startIndex 开始搜索的索引（从 0 开始）
 * @return 返回被删除的项在原数组中的索引，如果数组中找不到指定的项则返回 `-1`
 * @example remove([1, 9, 9, 0], 9) // 1, 数组变成 [1, 9, 0]
 * @example while(remove(arr, "wow") >= 0) {} // 删除所有 "wow"
 */
export function remove<T>(arr: T[], item: T, startIndex?: number) {
	startIndex = arr.indexOf(item, startIndex)
	startIndex >= 0 && arr.splice(startIndex, 1)
	return startIndex
}

/**
 * 编码正则表达式中的特殊字符
 * @param pattern 要编码的正则表达式模式
 */
export function escapeRegExp(pattern: string) {
	return pattern.replace(/[.\\(){}[\]\-+*?^$|]/g, "\\$&")
}

/** 所有日期格式化器 */
const dateFormatters = {
	y: (date: Date, format: string) => {
		const year = date.getFullYear()
		return format.length < 3 ? year % 100 : year
	},
	M: (date: Date) => date.getMonth() + 1,
	d: (date: Date) => date.getDate(),
	H: (date: Date) => date.getHours(),
	m: (date: Date) => date.getMinutes(),
	s: (date: Date) => date.getSeconds()
}

/**
 * 格式化指定的日期对象
 * @param date 要处理的日期对象
 * @param format 格式字符串，其中以下字符（区分大小写）会被替换：
 *
 * 字符| 意义           | 示例
 * ----|---------------|--------------------
 * y   | 年            | yyyy: 1999, yy: 99
 * M   | 月（从 1 开始）| MM: 09, M: 9
 * d   | 日（从 1 开始）| dd: 09, d: 9
 * H   | 时（24 小时制）| HH: 13, H: 13
 * m   | 分            | mm: 06, m: 6
 * s   | 秒            | ss: 06, s: 6
 *
 * @example formatDate(new Date("2016/01/01 00:00:00"), "yyyyMMdd") // "20160101"
 * @see https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
 */
export function formatDate(date: Date, format: string) {
	return format.replace(/([yMdHms])\1*/g, (all, key: keyof typeof dateFormatters) => dateFormatters[key](date, all).toString().padStart(all.length, "0"))
}

/**
 * 格式化时间为类似“几分钟前”的格式
 * @param date 要格式化的时间
 * @param now 当前时间
 */
export function formatRelativeDate(date: Date, now = new Date()) {
	const offset = now.getTime() - date.getTime()
	if (offset < 0) {
		return date.toLocaleString()
	}
	if (offset < 1000) {
		return "just now"
	}
	if (offset < 60000) {
		return `${Math.floor(offset / 1000)} seconds ago`
	}
	if (offset < 60000 * 60) {
		return `${Math.floor(offset / 60000)} minutes ago`
	}
	if (now.getFullYear() !== date.getFullYear()) {
		return date.toLocaleDateString()
	}
	if (date.getMonth() !== now.getMonth()) {
		return date.toLocaleDateString()
	}
	switch (now.getDate() - date.getDate()) {
		case 0:
			return `${Math.floor(offset / (60000 * 60))} hours ago`
		case 1:
			return `yesterday`
		case 2:
			return `2 days ago`
		default:
			return date.toLocaleDateString()
	}
}

/**
 * 格式化指定的高精度时间段
 * @param hrTime 由秒和纳秒部分组成的数组
 * @example formatHRTime([1, 20000000]) // "1.02s"
 */
export function formatHRTime(hrTime: readonly [number, number]) {
	const second = hrTime[0]
	if (second < 1) {
		const ms = hrTime[1]
		if (!ms) {
			return "0ms"
		}
		if (ms < 1e4) {
			return "<0.01ms"
		}
		if (ms < 1e6) {
			return `${(ms / 1e6).toFixed(2).replace(/\.00$|0$/, "")}ms`
		}
		return `${(ms / 1e6).toFixed(0)}ms`
	}
	if (second < 60) {
		return `${(second + hrTime[1] / 1e9).toFixed(2).replace(/\.00$|0$/, "")}s`
	}
	const s = second % 60
	return `${Math.floor(second / 60)}min${s ? s + "s" : ""}`
}

/**
 * 格式化指定的字节大小
 * @param byteSize 要格式化的字节大小
 * @example formatSize(1024) // "1KB"
 */
export function formatSize(byteSize: number) {
	let unit: string
	if (byteSize < 1000) {
		unit = "B"
	} else if (byteSize < 1024 * 1000) {
		byteSize /= 1024
		unit = "KB"
	} else if (byteSize < 1024 * 1024 * 1000) {
		byteSize /= 1024 * 1024
		unit = "MB"
	} else if (byteSize < 1024 * 1024 * 1024 * 1000) {
		byteSize /= 1024 * 1024 * 1024
		unit = "GB"
	} else {
		byteSize /= 1024 * 1024 * 1024 * 1024
		unit = "TB"
	}
	return byteSize.toFixed(2).replace(/\.00$|0$/, "") + unit
}