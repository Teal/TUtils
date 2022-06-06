import { isAbsolute, sep } from "path"
import { commonDir, containsPath, getDir, isCaseInsensitive, relativePath } from "./path"

/**
 * 表示一个路径匹配器
 * @example
 * const matcher = new Matcher()
 * matcher.include("*.js")
 * matcher.include("*.jsx")
 * matcher.exclude("y.js")
 * matcher.test("x.js") // true
 * matcher.test("x.jsx") // true
 * matcher.test("y.js") // false
 */
export class Matcher {

	/** 获取通配符的根文件夹路径 */
	readonly baseDir: string

	/** 判断是否忽略路径的大小写 */
	readonly ignoreCase: boolean

	/**
	 * 初始化新的匹配器
	 * @param pattern 要添加的匹配模式
	 * @param baseDir 如果需要匹配绝对路径，则设置匹配的根绝对路径
	 * @param ignoreCase 是否忽略路径的大小写
	 */
	constructor(pattern?: Pattern, baseDir = "", ignoreCase = isCaseInsensitive) {
		this.baseDir = baseDir
		this.ignoreCase = ignoreCase
		this.include(pattern)
	}

	/** 所有已解析的模式 */
	private patterns?: ResolvedPattern

	/** 获取排除匹配器 */
	excludeMatcher?: Matcher

	/**
	 * 添加一个匹配模式
	 * @param pattern 要添加的匹配模式
	 */
	include(pattern: Pattern | undefined) {
		if (typeof pattern === "string") {
			if (pattern.charCodeAt(0) === 33 /*!*/) {
				this.exclude(pattern.substring(1))
			} else {
				const regexp = globToRegExp(pattern, this)
				this._addPattern(regexp)
				if (regexp.rest) {
					this.include(regexp.rest)
					delete regexp.rest
				}
			}
		} else if (Array.isArray(pattern)) {
			for (const item of pattern) {
				this.include(item)
			}
		} else if (pattern instanceof RegExp) {
			this._addPattern({
				test: this.baseDir ? path => pattern.test(relativePath(this.baseDir, path)) : path => pattern.test(path),
				base: this.baseDir
			})
		} else if (typeof pattern === "function") {
			this._addPattern({
				test: pattern,
				base: this.baseDir
			})
		} else if (pattern instanceof Matcher) {
			for (let item = pattern.patterns; item; item = item.next) {
				this._addPattern({
					test: item instanceof RegExp ? path => item!.test(path) : item.test,
					base: item.base || pattern.baseDir
				})
			}
			if (pattern.excludeMatcher) {
				this.exclude(pattern.excludeMatcher)
			}
		}
	}

	/** 底层添加一个模式 */
	private _addPattern(pattern: ResolvedPattern) {
		let prev = this.patterns
		if (prev) {
			while (prev.next) {
				prev = prev.next
			}
			prev.next = pattern
		} else {
			this.patterns = pattern
		}
	}

	/**
	 * 添加一个排除模式
	 * @param pattern 要排除的模式
	 */
	exclude(pattern: Pattern | undefined) {
		if (this.excludeMatcher) {
			this.excludeMatcher.include(pattern)
		} else {
			this.excludeMatcher = new Matcher(pattern, this.baseDir, this.ignoreCase)
		}
	}

	/**
	 * 判断当前匹配器是否可以匹配指定的路径
	 * @param path 要判断的路径
	 * @param args 传递给自定义函数的参数
	 */
	test(path: string, ...args: readonly any[]) {
		for (let pattern = this.patterns; pattern; pattern = pattern.next) {
			if (pattern.test(path, ...args)) {
				if (this.excludeMatcher?.test(path, ...args)) {
					return false
				}
				return true
			}
		}
		return false
	}

	/** 获取所有模式的公共基路径 */
	get base() {
		let pattern = this.patterns
		if (!pattern) {
			return null
		}
		let result: string | null = pattern.base
		while (pattern = pattern.next) {
			result = commonDir(result, pattern.base, this.ignoreCase)
			if (result === null) {
				break
			}
		}
		return result
	}

	/** 获取所有模式的所有公共基路径 */
	getBases() {
		const result: string[] = []
		outer: for (let pattern = this.patterns; pattern; pattern = pattern.next) {
			const base = pattern.base
			for (let i = 0; i < result.length; i++) {
				if (containsPath(result[i], base, this.ignoreCase)) {
					continue outer
				}
				if (containsPath(base, result[i], this.ignoreCase)) {
					result[i] = base
					continue outer
				}
			}
			result.push(base)
		}
		return result
	}

	/**
	 * 获取匹配结果的基路径
	 * @param path 要获取的路径
	 * @returns 如果没有匹配的基路径则返回 `null`
	 */
	baseOf(path: string) {
		let result: string | null = null
		for (let pattern = this.patterns; pattern; pattern = pattern.next) {
			const base = pattern.base
			if ((result === null || base.length > result.length) && containsPath(base, path)) {
				result = base
			}
		}
		return result
	}

	/**
	 * 获取匹配结果对应的相对路径
	 * @param path 要获取的路径
	 * @returns 如果没有匹配的基路径则返回原路径
	 */
	relative(path: string) {
		const base = this.baseOf(path)
		return base ? relativePath(base, path) : path
	}

}

/**
 * 表示一个匹配模式，可以是通配符、正则表达式、自定义函数、匹配器或以上模式组成的数组
 * @description
 * ##### 通配符
 * 在通配符中可以使用以下特殊字符：
 * - `?`: 匹配固定一个字符，但 `/` 和文件名开头的 `.` 除外
 * - `*`: 匹配任意个字符，但 `/` 和文件名开头的 `.` 除外
 * - `**`: 匹配任意个字符，但文件名开头的 `.` 除外
 * - `[abc]`: 匹配方括号中的任一个字符
 * - `[a-z]`: 匹配 a 到 z 的任一个字符
 * - `[!abc]`: 匹配方括号中的任一个字符以外的字符
 * - `{abc,xyz}`: 匹配大括号中的任一种模式
 * - `\`: 表示转义字符，如 `\[` 表示 `[` 按普通字符处理
 * - `!xyz`：如果通配符以 `!` 开头，表示排除匹配的项，注意如果排除了父文件夹，出于性能考虑，无法重新包含其中的子文件
 * - `;`: 分割多个通配符
 *
 * `*` 和 `**` 的区别在于 `**` 可以匹配任意级文件夹，而 `*` 只能匹配一级，
 * 但如果通配符中没有 `/`（末尾的除外），则通配符只需匹配文件名部分
 *
 * 通配符\路径        | `foo.js`         | `dir/foo.js`     | `dir/sub/foo.js`
 * ------------------|------------------|------------------|------------------
 * *.js              | 匹配             | 匹配              | 匹配
 * ./*.js            | 匹配             | 不匹配            | 不匹配
 * dir/*.js          | 不匹配           | 匹配              | 不匹配
 * dir/**.js         | 不匹配           | 匹配              | 匹配
 * dir/*‌/foo.js      | 不匹配           | 不匹配            | 匹配
 * dir/**‌/foo.js     | 不匹配           | 匹配              | 匹配
 *
 * `*`、`**` 和 `?` 不匹配以 `.` 开头的文件名，要允许匹配，应写成 `{.,}*`
 *
 * 通配符             | 路径               | 结果
 * -------------------|--------------------|--------------
 * *                  | .js                | 不匹配
 * .*                 | .js                | 匹配
 * x*y                | x.y                | 匹配
 * *                  | .git/config        | 匹配
 * **‌‌/*               | .git/config        | 不匹配
 *
 * 如果通配符以 `/` 结尾，表示匹配文件夹；如果匹配了文件夹，等价于匹配内部的所有子文件
 *
 * 默认地，通配符只负责逐字匹配，所以 `./`、`../` 等符号不会被特殊处理（除了开头的 `./`）
 *
 * 如果设置了 `baseDir`，则通配符只匹配绝对路径：
 * 1. 支持前缀 `../`
 * 2. Windows 下改用 `\` 作为分隔符
 * 3. 如果通配符也是绝对路径，则 `[]`、`{}`、`\`（仅 Windows）作普通字符匹配
 *
 * ##### 正则表达式
 * 正则表达式的源是一个固定以 `/` 为分隔符的相对路径
 *
 * ##### 自定义函数
 * 函数接收原始路径为参数，如果函数返回 `true` 表示匹配该路径，如：
 * ```js
 * function match(path) {
 *     return path.endsWith(".js")
 * }
 * ```
 *
 * ##### 匹配器
 * 可以从现成匹配器复制新的匹配器
 *
 * ##### 数组
 * 可以将以上模式自由组合成数组，只要匹配数组中任一个模式，就认定匹配当前模式
 */
export type Pattern = string | RegExp | ResolvedPattern["test"] | Matcher | Pattern[]

/** 表示一个已解析的模式 */
interface ResolvedPattern {
	/**
	 * 测试当前模式是否匹配指定的路径
	 * @param path 要测试的路径
	 * @param args 传递给自定义函数的参数
	 */
	test(path: string, ...args: any[]): boolean
	/** 当前模式的基路径 */
	base: string
	/** 下一个解析模式 */
	next?: ResolvedPattern
}

/**
 * 将指定的通配符转为等价的正则表达式
 * @param glob 要转换的通配符模式
 * @param options 附加选项
 */
function globToRegExp(glob: string, options: Pick<Matcher, "baseDir" | "ignoreCase">) {
	let base = options.baseDir
	let isAbsoluteGlob: boolean
	let slash: string
	if (base && isAbsolute(base)) {
		isAbsoluteGlob = isAbsolute(glob)
		slash = `\\${sep}`
	} else {
		isAbsoluteGlob = false
		slash = "/"
	}
	let regexp = ""
	let hasSlash = false
	let endsWithSlash = false
	let hasGlob = false
	let braceCount = 0
	// glob 中包含基路径的部分
	let baseStart = 0
	let baseEnd = 0
	let hasEscape = false
	const end = glob.length - 1
	let index = 0
	outer: for (; index <= end; index++) {
		const char = glob.charCodeAt(index)
		switch (char) {
			case 46 /*.*/:
				// 仅处理开头的 ./ 和 ../
				if (!regexp) {
					// 跳过开头的 ./
					if (glob.charCodeAt(index + 1) === 47 /*/*/) {
						baseStart = index + 2
						index++
						if (index < end) {
							hasSlash = true
						} else {
							endsWithSlash = true
						}
						break
					}
					// 绝对路径模式：处理开头的 ../
					if (base && glob.charCodeAt(index + 1) === 46 /*.*/ && glob.charCodeAt(index + 2) === 47 /*/*/) {
						baseStart = index + 3
						const newBase = getDir(base)
						if (newBase.length !== base.length) {
							base = newBase
							index += 2
							if (index < end) {
								hasSlash = true
							} else {
								endsWithSlash = true
							}
							break
						}
					}
				}
				regexp += "\\."
				break
			case 47 /*/*/:
				if (!hasGlob) {
					baseEnd = index
				}
				if (index < end) {
					hasSlash = true
				} else {
					endsWithSlash = true
				}
				regexp += slash
				break
			case 42 /***/:
				hasGlob = true
				const isStart = index === 0 || glob.charCodeAt(index - 1) === 47 /*/*/
				// **
				if (glob.charCodeAt(index + 1) === 42 /***/) {
					index++
					// 将 p** 翻译为 p* 或 p*/**
					if (!isStart) regexp += `[^${slash}]*${slash}?`
					regexp += `(?:(?!\\.)[^${slash}]*${slash})*`
					if (glob.charCodeAt(index + 1) === 47 /*/*/) {
						index++
						if (index < end) {
							hasSlash = true
						} else {
							endsWithSlash = true
						}
					} else if (index < end) {
						// 将 **p 翻译为 **/*p
						regexp += `(?!\\.)[^${slash}]*`
					} else {
						endsWithSlash = true
					}
				} else {
					// 如果是 /*/ 则 * 至少需匹配一个字符
					const isEnd = index === end || glob.charCodeAt(index + 1) === 47 /*/*/
					regexp += `${isStart ? "(?!\\.)" : ""}[^${slash}]${isStart && isEnd ? "+" : "*"}`
				}
				break
			case 63 /*?*/:
				hasGlob = true
				regexp += `[^${slash}${index === 0 || glob.charCodeAt(index - 1) === 47 /*/*/ ? "\\." : ""}]`
				break
			case 92 /*\*/:
				// Windows: 如果通配符是绝对路径，则 \ 作路径分隔符处理
				if (isAbsoluteGlob && sep === "\\") {
					if (!hasGlob) {
						baseEnd = index
					}
					if (index < end) {
						hasSlash = true
					} else {
						endsWithSlash = true
					}
					regexp += slash
					break
				}
				hasEscape = true
				regexp += escapeRegExp(glob.charCodeAt(++index))
				break
			case 91 /*[*/:
				if (!isAbsoluteGlob) {
					const classes = tryParseClasses(glob, index)
					if (classes) {
						hasGlob = true
						regexp += classes[0]
						index = classes[1]
						break
					}
				}
				regexp += "\\["
				break
			case 123 /*{*/:
				if (!isAbsoluteGlob && findCloseBrace(glob, index) >= 0) {
					hasGlob = true
					braceCount++
					regexp += "(?:"
					break
				}
				regexp += "\\{"
				break
			case 44 /*,*/:
				if (braceCount) {
					regexp += "|"
					break
				}
				regexp += ","
				break
			case 125 /*}*/:
				if (braceCount) {
					braceCount--
					regexp += ")"
					break
				}
				regexp += "\\}"
				break
			case 59 /*;*/:
				break outer
			default:
				regexp += escapeRegExp(char)
				break
		}
	}
	// 追加后缀
	if (endsWithSlash) {
		regexp += `(?:(?!\\.)[^${slash}]*(?:${slash}|$))*$`
	} else {
		regexp += `(?:${slash}(?!\\.)[^${slash}]*)*$`
	}
	// 追加前缀
	if (isAbsoluteGlob) {
		base = ""
		regexp = "^" + regexp
	} else if (!hasSlash) {
		regexp = `(?:^|${slash})` + regexp
	} else {
		let prepend = "^"
		if (base) {
			for (let i = 0; i < base.length; i++) {
				prepend += escapeRegExp(base.charCodeAt(i))
			}
			if (!base.endsWith(sep)) prepend += slash
		}
		regexp = prepend + regexp
	}
	// 计算基路径
	if (baseEnd > baseStart) {
		let appendBase = glob.substring(baseStart, baseEnd)
		if (hasEscape) {
			appendBase = appendBase.replace(/\\(.)/g, "$1")
		}
		if (base && !base.endsWith(sep)) {
			base += sep
		}
		base += appendBase
	}
	// 编译正则实例
	const result = new RegExp(regexp, options.ignoreCase ? "i" : "") as Partial<ResolvedPattern> as ResolvedPattern & { rest?: string }
	result.base = base
	if (index !== end) {
		// 跳过紧跟的空格
		while (glob.charCodeAt(++index) === 32 /* */) { }
		result.rest = glob.substring(index)
	}
	return result
}

/** 尝试从通配符指定位置解析符号组 */
function tryParseClasses(glob: string, startIndex: number): [string, number] | null {
	let classes = ""
	let hasRange = false
	while (++startIndex < glob.length) {
		const char = glob.charCodeAt(startIndex)
		switch (char) {
			case 93 /*]*/:
				// []] 的第一个 ] 按普通字符处理
				if (classes) {
					classes = `[${classes}]`
					// [z-a] 是错误的正则，为了确保生成的正则没有语法错误，先测试一次
					if (hasRange) {
						try {
							new RegExp(classes)
						} catch {
							return null
						}
					}
					return [classes, startIndex]
				}
				classes += "\\]"
				break
			case 47 /*/*/:
				return null
			case 45 /*-*/:
				hasRange = true
				classes += "-"
				break
			case 33 /*!*/:
				// [x!] 的 ! 按普通字符处理
				if (classes) {
					classes += "!"
				} else {
					classes += "^"
				}
				break
			case 92 /*\*/:
				classes += escapeRegExp(glob.charCodeAt(++startIndex))
				break
			default:
				classes += escapeRegExp(char)
				break
		}
	}
	return null
}

/** 搜索对应的关闭大括号 */
function findCloseBrace(glob: string, startIndex: number): number {
	while (++startIndex < glob.length) {
		const char = glob.charCodeAt(startIndex)
		switch (char) {
			case 125 /*}*/:
				return startIndex
			case 92 /*\*/:
				startIndex++
				break
			case 91 /*[*/:
				const next = tryParseClasses(glob, startIndex)
				if (next) {
					startIndex = next[1]
				}
				break
			case 123 /*{*/:
				const right = findCloseBrace(glob, startIndex)
				if (right < 0) {
					return right
				}
				startIndex = right
				break
		}
	}
	return -1
}

/** 编码正则表达式中的特殊字符 */
function escapeRegExp(char: number) {
	return char === 46 /*.*/ || char === 92 /*\*/ || char === 40 /*(*/ || char === 41 /*)*/ || char === 123 /*{*/ || char === 125 /*}*/ || char === 91 /*[*/ || char === 93 /*]*/ || char === 45 /*-*/ || char === 43 /*+*/ || char === 42 /***/ || char === 63 /*?*/ || char === 94 /*^*/ || char === 36 /*$*/ || char === 124 /*|*/ ? `\\${String.fromCharCode(char)}` : char !== char /*NaN*/ ? "\\\\" : String.fromCharCode(char)
}

/**
 * 测试指定的路径是否匹配指定的模式
 * @param path 要测试的路径
 * @param pattern 要测试的匹配模式
 * @param baseDir 如果需要匹配绝对路径，则设置匹配的根绝对路径
 * @param ignoreCase 是否忽略路径的大小写
 */
export function match(path: string, pattern: Pattern, baseDir?: string, ignoreCase?: boolean) {
	return new Matcher(pattern, baseDir, ignoreCase).test(path)
}

/**
 * 判断指定的模式是否是通配符
 * @param pattern 要判断的模式
 */
export function isGlob(pattern: string) {
	for (let i = 0; i < pattern.length; i++) {
		switch (pattern.charCodeAt(i)) {
			case 42 /***/:
			case 63 /*?*/:
			case 92 /*\*/:
				return true
			case 91 /*[*/:
				if (tryParseClasses(pattern, i)) {
					return true
				}
				break
			case 123 /*{*/:
				if (findCloseBrace(pattern, i) >= 0) {
					return true
				}
				break
			case 33 /*!*/:
				if (i === 0) {
					return true
				}
				break
		}
	}
	return false
}