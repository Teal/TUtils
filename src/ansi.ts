import { encodeHTML } from "./html"

/**
 * 为字符串添加 ANSI 加粗控制字符
 * @param content 要处理的字符串
 */
export function bold(content: string) {
	return `\x1b[1m${content}\x1b[22m`
}

/**
 * 为字符串添加 ANSI 颜色控制字符
 * @param content 要处理的字符串
 * @param color 要添加的颜色
 */
export function color(content: string, color: ANSIColor) {
	return `\x1b[${color}m${content}\x1b[39m`
}

/**
 * 为字符串添加 ANSI 背景色控制字符
 * @param content 要处理的字符串
 * @param color 要添加的背景色
 */
export function backgroundColor(content: string, color: ANSIColor) {
	return `\x1b[${color + 10}m${content}\x1b[49m`
}

/**
 * 表示 ANSI 颜色代码
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */
export const enum ANSIColor {
	/** 黑色 */
	black = 30,
	/** 深红色 */
	red = 31,
	/** 绿色 */
	green = 32,
	/** 深黄色 */
	yellow = 33,
	/** 深蓝色 */
	blue = 34,
	/** 紫色 */
	magenta = 35,
	/** 蓝绿色 */
	cyan = 36,
	/** 浅灰色 */
	white = 37,

	/** 深灰色 */
	brightBlack = 90,
	/** 红色 */
	brightRed = 91,
	/** 青色 */
	brightGreen = 92,
	/** 黄色 */
	brightYellow = 93,
	/** 蓝色 */
	brightBlue = 94,
	/** 桃红色 */
	brightMagenta = 95,
	/** 浅蓝色 */
	brightCyan = 96,
	/** 白色 */
	brightWhite = 97
}

/**
 * 匹配 ANSI 控制字符的正则表达式
 * @description 除了 ANSI 标准（ECMA 48），此正则还匹配了 ANSI 扩展链接（可含中文）
 * @see https://github.com/nodejs/node/blob/master/lib/internal/readline.js
 * @see https://github.com/chalk/ansi-regex/blob/master/index.js
 */
const ansiCodeRegExp = /[\x1b\u009b](?:[[()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]|][^\u0007\x1b\u009b]*\u0007))/g

/**
 * 删除字符串中的所有 ANSI 控制字符
 * @param content 要处理的字符串
 */
export function removeANSICodes(content: string) {
	return content.replace(ansiCodeRegExp, "")
}

/**
 * 如果字符串超出最大宽度，则将中间部分替换为省略号
 * @param content 要处理的字符串（换行会被替换为空格）
 * @param ellipsis 内容超出最大宽度后使用的省略号
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 */
export function truncateString(content: string, ellipsis?: string, maxWidth = process.stdout.columns || Infinity) {
	// 减去省略号本身的宽度
	const ellipsisWidth = ellipsis === undefined ? 3 : getStringWidth(ellipsis)
	maxWidth -= ellipsisWidth
	// 每个字符最大宽 2，如果最大可能宽度未超过最大值，直接返回
	if (content.length * 2 < maxWidth) {
		return content
	}
	// 统计所有 ANSI 控制符的位置，用于检索
	// 数组的内容为 [开始位置1, 结束位置1, 开始位置2, ...]
	const ansiCodes: number[] = []
	content.replace(ansiCodeRegExp, (source: string, index: number) => {
		ansiCodes.push(index, index + source.length - 1)
		return ""
	})
	// 左右逐字排版，超出最大宽度后终止
	let left = 0
	let right = content.length - 1
	let controlLeft = 0
	let controlRight = ansiCodes.length - 1
	while (left < right) {
		// 排版左边一个字符
		while (controlLeft < ansiCodes.length && ansiCodes[controlLeft] === left) {
			left = ansiCodes[controlLeft + 1] + 1
			controlLeft += 2
		}
		const leftChar = content.charCodeAt(left)
		if (leftChar === 10 /*\n*/ || leftChar === 13 /*\r*/) {
			content = content.substring(0, left) + " " + content.substring(left + 1)
			maxWidth--
		} else {
			maxWidth -= getCharWidth(leftChar)
		}
		if (maxWidth <= 0) {
			break
		}
		left++
		// 排版右边一个字符
		while (controlRight >= 0 && ansiCodes[controlRight] === right) {
			right = ansiCodes[controlRight - 1] - 1
			controlRight -= 2
		}
		const rightChar = content.charCodeAt(right)
		if (rightChar === 10 /*\n*/ || rightChar === 13 /*\r*/) {
			content = content.substring(0, right) + " " + content.substring(right + 1)
			maxWidth--
		} else {
			maxWidth -= getCharWidth(rightChar)
		}
		if (maxWidth <= 0) {
			break
		}
		right--
	}
	// 如果已排版所有字符串说明不需要追加省略号
	// 如果被截断的字符刚好等于省略号的长度，则使用原字符
	if (left >= right || right - left < ellipsisWidth && getStringWidth(content.substring(left, right)) < ellipsisWidth && !/[\r\n]/.test(content.substring(left, right))) {
		return content
	}
	// 保留被截断的控制符
	let ansiString = ""
	for (; controlLeft < controlRight; controlLeft += 2) {
		ansiString += content.substring(ansiCodes[controlLeft], ansiCodes[controlLeft + 1] + 1)
	}
	// 截断并排版
	return `${content.substring(0, left)}${ansiString}${ellipsis === undefined ? "..." : ellipsis}${content.substring(right + 1)}`
}

/**
 * 如果字符串超出最大宽度，则在单词处换行
 * @param content 要处理的字符串
 * @param indent 新行的缩进空格数
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 * @returns 返回由每一行内容组成的数组
 */
export function wrapString(content: string, indent = 0, maxWidth = process.stdout.columns || Infinity) {
	const lines: string[] = []
	let left = 0
	let leftBound = 0
	let currentWidth = 0
	let insertIndent = false
	for (let i = 0; i < content.length;) {
		// 跳过 ANSI 控制字符
		const char = content.charCodeAt(i)
		if (char === 0x001b || char === 0x009b) {
			const match = new RegExp(`^${ansiCodeRegExp.source}`).exec(content.substring(i))
			if (match) {
				leftBound = i += match[0].length
				continue
			}
		}
		// 换行后重新计算宽度
		if (char === 10 /*\n*/ || char === 13 /*\r*/) {
			lines.push(content.substring(left, i))
			if (char === 13 /*\r*/ && content.charCodeAt(i + 1) === 10 /*\n*/) {
				i++
			}
			leftBound = left = ++i
			currentWidth = 0
			insertIndent = false
			continue
		}
		// 排版当前字符
		if ((currentWidth += getCharWidth(char)) < maxWidth) {
			i++
			continue
		}
		// 已超出最大宽度，在空格处折行
		let skipSpace = false
		if (i === leftBound) {
			// 当前字符是第一个字符，强制布局该字符
			i++
		} else {
			// 尽量在空格处折行，计算实际截断的位置
			const rightBound = i
			while (i > leftBound && content.charCodeAt(i) !== 32 /* */) {
				i--
			}
			// 找不到空格，强制拆分当前字符
			if (i === leftBound) {
				i = rightBound
			} else {
				skipSpace = true
			}
		}
		// 添加折行之前的内容
		lines.push(`${insertIndent ? " ".repeat(indent) : ""}${content.substring(left, i)}`)
		if (skipSpace) {
			i++
		}
		leftBound = left = i
		currentWidth = indent
		insertIndent = true
	}
	if (left < content.length) lines.push(`${insertIndent ? " ".repeat(indent) : ""}${content.substring(left, content.length)}`)
	return lines
}

/**
 * 格式化一个列表，将列表每项按水平方向平铺，超出最大宽度后换行，并保证每项的首字符对齐
 * @param items 要格式化的所有列表项（不支持换行）
 * @param space 列表中每项间隔的空格数
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 * @example formatList(["a", "ab"]))
 */
export function formatList(items: readonly string[], space = 2, maxWidth = process.stdout.columns || Infinity) {
	if (!items.length) {
		return ""
	}
	const itemWidth = items.reduce((prev, next) => Math.max(prev, getStringWidth(next)), 0) + space
	const maxCount = Math.ceil(maxWidth / itemWidth) || 1
	let result = items[0]
	for (let i = 1; i < items.length; i++) {
		result += i % maxCount === 0 ? "\n" : " ".repeat(itemWidth - getStringWidth(items[i - 1]))
		result += items[i]
	}
	return result
}

/**
 * 格式化一个树，在每个节点前插入层次关系标记
 * @param items 要格式化的所有节点项
 * @param items[].indent 缩进数
 * @param items[].icon 在层次关系标记前插入的图标或文案（不支持换行）
 * @param items[].label 节点文案
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 * @example formatTree([{indent: 0, label: "x"}, {indent: 1, label: "x1"}])
 */
export function formatTree(items: readonly { indent: number, icon?: string, label: string }[], maxWidth = process.stdout.columns || Infinity) {
	let result = ""
	const lasts: number[] = []
	for (let i = 0; i < items.length; i++) {
		if (i > 0) result += "\n"
		const item = items[i]
		const indent = item.indent
		if (indent > lasts.length) {
			// 进入新层级，计算当前层级最后一个索引
			let maxLine = i
			for (let j = i + 1; j < items.length; j++) {
				const indent2 = items[j].indent
				if (indent2 < indent) {
					break
				}
				if (indent2 === indent) {
					maxLine = j
				}
			}
			lasts.push(maxLine)
		} else if (indent < lasts.length) {
			lasts.length = indent
		}
		const lastsEnd = indent - 1
		let prefix = item.icon || ""
		for (let j = 0; j < lastsEnd; j++) {
			prefix += i < lasts[j] ? "│  " : "   "
		}
		if (lastsEnd >= 0) {
			prefix += i < lasts[lastsEnd] ? "├─ " : "└─ "
		}
		const rows = wrapString(item.label, lastsEnd >= 0 ? 0 : 2, maxWidth - getStringWidth(prefix))
		for (let j = 0; j < rows.length; j++) {
			if (lastsEnd >= 0) {
				if (j === 0) {
					result += prefix
				} else {
					result += "\n" + prefix.slice(0, -3) + (i < lasts[lastsEnd] ? "│  " : "   ")
				}
			} else {
				result += prefix
			}
			result += rows[j]
		}
	}
	return result
}

/**
 * 格式化一个表格
 * @param rows 所有行组成的数组，数组的每一项是当前行所有列组成的数组
 * @param columnsAlign 每列的对齐方式
 * @param columnSeparator 列之间的分隔符
 * @param headerSeparator 首行和表格主体的分隔字符，如果为空则不显示分隔条
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 * @example formatTable([["a", "ab"], ["a2", "ab2"]])
 */
export function formatTable(rows: readonly string[][], columnsAlign?: ("left" | "center" | "right")[], columnSeparator = "  ", headerSeparator = "", maxWidth = process.stdout.columns || Infinity) {
	// 计算列宽
	const columnsWidth: number[] = []
	for (const row of rows) {
		for (let i = 0; i < row.length; i++) {
			columnsWidth[i] = Math.max(columnsWidth[i] || 0, getStringWidth(row[i]))
		}
	}
	if (!columnsWidth.length) {
		return ""
	}
	// 如果表格总体宽度超出则重新分配
	if (Number.isFinite(maxWidth)) {
		const separatorWidth = getStringWidth(columnSeparator)
		let exceedWidth = (columnsWidth.length === 1 ? columnsWidth[0] : columnsWidth.reduce((x, y) => x + separatorWidth + y)) - maxWidth + 1
		if (exceedWidth > 0) {
			const availableWidth = columnsWidth.reduce((x, y) => x + (y > 2 ? y - 2 : 0), 0)
			for (let i = columnsWidth.length - 1; i >= 0 && exceedWidth > 0; i--) {
				// 只有列宽超过 2 时才能压缩
				if (columnsWidth[i] > 2) {
					const delta = Math.ceil((columnsWidth[i] - 2) * exceedWidth / availableWidth)
					exceedWidth -= delta
					columnsWidth[i] -= delta
				}
			}
		}
	}
	let result = ""
	for (let i = 0; i < rows.length; i++) {
		if (i > 0) result += "\n"
		const row = rows[i]
		// 计算在每列显示的所有行数据
		const cells: string[][] = []
		let height = 1
		for (let j = 0; j < row.length; j++) {
			const cellRows = wrapString(row[j], 0, columnsWidth[j] + 1)
			cells[j] = cellRows
			height = Math.max(height, cellRows.length)
		}
		for (let k = 0; k < height; k++) {
			if (k > 0) result += "\n"
			for (let j = 0; j < cells.length; j++) {
				if (j > 0) result += columnSeparator
				const cell = cells[j][k] || ""
				const columnWidth = columnsWidth[j]
				const actualWidth = getStringWidth(cell)
				// 插入空格使列对齐
				switch (columnsAlign?.[j]) {
					case "right":
						if (columnWidth > actualWidth) {
							result += " ".repeat(columnWidth - actualWidth)
						}
						result += cell
						break
					case "center":
						if (columnWidth > actualWidth) {
							result += " ".repeat(Math.floor((columnWidth - actualWidth) / 2))
						}
						result += cell
						if (columnWidth > actualWidth) {
							result += " ".repeat(Math.ceil((columnWidth - actualWidth) / 2))
						}
						break
					default:
						result += cell
						if (columnWidth > actualWidth) {
							result += " ".repeat(columnWidth - actualWidth)
						}
						break
				}
			}
		}
		// 首行分隔符
		if (headerSeparator && i === 0) {
			result += "\n"
			for (let j = 0; j < columnsWidth.length; j++) {
				if (j > 0) result += columnSeparator
				result += headerSeparator.repeat(columnsWidth[j])
			}
		}
	}
	return result
}

/**
 * 格式化一个代码片段
 * @param content 要格式化的代码（不支持 ANSI 控制字符）
 * @param line 突出显示的开始行号（从 0 开始），如果内容超出最大高度，则只显示该行及其相邻行
 * @param column 突出显示的开始列号（从 0 开始），如果内容超出最大宽度，则只显示该列及其相邻列
 * @param endLine 突出显示的结束行号（从 0 开始），如果未提供则只突出显示开始行列号所在的位置
 * @param endColumn 突出显示的结束列号（从 0 开始），如果未提供则只突出显示开始行列号所在的位置
 * @param lineNumbers 是否显示行号
 * @param columnNumbers 是否显示列指示器
 * @param tab 用于代替制表符的字符串
 * @param maxHeight 允许显示的最大高度（即行数）
 * @param maxWidth 允许显示的最大宽度（一般地，西文字母宽度为 1，中文文字宽度为 2）
 */
export function formatCodeFrame(content: string, line?: number, column?: number, endLine?: number, endColumn?: number, lineNumbers = true, columnNumbers = true, tab = "    ", maxHeight = 5, maxWidth = process.stdout.columns || Infinity) {
	// 计算要显示的开始行号
	maxHeight -= columnNumbers ? 2 : 1
	const firstLine = Math.max(0, (line || 0) - Math.floor((maxHeight - 1) / 2))
	// 存储所有行的数据
	const lines: string[] = []
	// 提取要显示的行的数据
	let lineNumber = 0
	for (let lastIndex = 0, i = 0; i <= content.length; i++) {
		const char = content.charCodeAt(i)
		if (char === 13 /*\r*/ || char === 10 /*\n*/ || char !== char /*NaN*/) {
			// 只处理 firstLine 之后的行
			if (lineNumber >= firstLine) {
				// 保存当前行的数据
				lines.push(content.substring(lastIndex, i))
				if (lines.length >= maxHeight) {
					break
				}
			}
			// 处理换行
			if (char === 13 /*\r*/ && content.charCodeAt(i + 1) === 10 /*\n*/) {
				i++
			}
			lastIndex = i + 1
			lineNumber++
		}
	}
	// 用于显示行号的宽度
	const lineNumberWidth = lineNumbers ? (lineNumber + 1).toString().length : 0
	maxWidth -= lineNumberWidth + " >  | ".length + 1
	// 计算要显示的开始列号
	let firstColumn = 0
	const selectedLine = lines[line! - firstLine]
	if (selectedLine != undefined && column != undefined) {
		// 确保 firstColumn 和 startColumn 之间的距离 < columns / 2
		let leftWidth = Math.floor(maxWidth / 2)
		for (firstColumn = Math.min(column, selectedLine.length - 1); firstColumn > 0 && leftWidth > 0; firstColumn--) {
			leftWidth -= getCharWidth(selectedLine.charCodeAt(firstColumn))
		}
	}
	// 存储最终结果
	let result = ""
	// 生成每一行的数据
	for (let i = 0; i < lines.length; i++) {
		if (i > 0) result += "\n"
		const currentLine = lines[i]
		lineNumber = firstLine + i
		// 生成行号
		if (lineNumbers) {
			result += `${lineNumber === line ? " > " : "   "}${" ".repeat(lineNumberWidth - (lineNumber + 1).toString().length)}${lineNumber + 1} | `
		}
		// 生成数据
		let columnMarkerStart: number | undefined
		let columnMarkerEnd: number | undefined
		let currentWidth = 0
		for (let j = firstColumn; j <= currentLine.length; j++) {
			// 存储占位符的位置
			if (lineNumber === line) {
				if (j === column) {
					columnMarkerStart = currentWidth
				}
				if (line === endLine && j >= column! && j <= endColumn!) {
					columnMarkerEnd = currentWidth
				}
			}
			// 超出宽度后停止
			const char = currentLine.charCodeAt(j)
			if (char !== char /*NaN*/ || (currentWidth += getCharWidth(char)) > maxWidth) {
				break
			}
			// 将 TAB 转为空格
			if (char === 9 /*\t*/) {
				result += tab
				continue
			}
			// 转换控制字符
			if (char === 0x1b || char === 0x9b) {
				result += "␛"
				continue
			}
			result += currentLine.charAt(j)
		}
		// 生成行指示器
		if (columnNumbers && lineNumber === line && columnMarkerStart != undefined) {
			result += "\n"
			if (lineNumbers) {
				result += `   ${" ".repeat(lineNumberWidth)} | `
			}
			result += `${" ".repeat(columnMarkerStart)}${columnMarkerEnd! > columnMarkerStart ? "~".repeat(columnMarkerEnd! - columnMarkerStart) : "^"}`
		}
	}
	return result
}

/**
 * 将 ANSI 控制字符转为等效的 HTML 代码
 * @param content 要转换的字符串
 * @param colors 自定义生成的颜色，键为原始 HTML 颜色代码，值为替代色，用于内置颜色代码如下：
 *
 * ANSI 颜色代码 | HTML 颜色代码
 * -------------|-----------------------
 * 30           | `black`
 * 31           | `darkred`
 * 32           | `darkgreen`
 * 33           | `olive`
 * 34           | `navy`
 * 35           | `darkmagenta`
 * 36           | `darkcyan`
 * 37           | `sliver`
 * 90           | `gray`
 * 91           | `red`
 * 92           | `green`
 * 93           | `yellow`
 * 94           | `blue`
 * 95           | `magenta`
 * 96           | `cyan`
 * 97           | `white`
 *
 * @param style 设置初始的 CSS 样式，键为 CSS 属性名，值为 CSS 属性值，转换结束后对象会被更新为最新的样式
 */
export function ansiToHTML(content: string, colors?: { [key: string]: string }, style: { [key: string]: string } = {}) {
	let currentCSSText = ""
	content = encodeHTML(content).replace(ansiCodeRegExp, source => {
		if (/^(?:\x1b\[|\u009b).*m/s.test(source)) {
			source.replace(/([34])8;(?:5;(\d+)|2;(\d+);(\d+);(\d+))|(\d+)/g, (_, extendedColor, colorCode, r, g, b, ansiCode) => {
				if (extendedColor) {
					// 匹配扩展颜色指令：`<ESC>[38`, `<ESC>[48`
					const color = colorCode ? codeToRGB(+colorCode) : `#${(r << 16 | +g << 8 | +b).toString(16).padStart(6, "0")}`
					style[extendedColor === "4" ? "background-color" : "color"] = colors?.[color] ?? color
				} else {
					// 内置颜色指令
					const code = parseInt(ansiCode)
					if (code >= 30 && code <= 37) {
						const color = codeToRGB(code - 30)
						style["color"] = colors?.[color] ?? color
					} else if (code >= 40 && code <= 47) {
						const color = codeToRGB(code - 40)
						style["background-color"] = colors?.[color] ?? color
					} else if (code >= 90 && code <= 97) {
						const color = codeToRGB(code - 90 + 8)
						style["color"] = colors?.[color] ?? color
					} else if (code >= 100 && code <= 107) {
						const color = codeToRGB(code - 100 + 8)
						style["background-color"] = colors?.[color] ?? color
					} else {
						switch (code) {
							case 0:
								for (const key in style) {
									delete style[key]
								}
								break
							case 1:
								style["font-weight"] = "bold"
								break
							case 2:
								style["font-weight"] = "100"
								break
							case 3:
								style["font-style"] = "italic"
								break
							case 4:
								style["text-decoration"] = "underline"
								break
							case 7:
								[style["background-color"], style["color"]] = [style["color"], style["background-color"]]
								if (style["color"] === undefined) delete style["color"]
								if (style["background-color"] === undefined) delete style["background-color"]
								break
							case 8:
								style["display"] = "none"
								break
							case 9:
								style["text-decoration"] = "line-through"
								break
							case 21:
							case 22:
								delete style["font-weight"]
								break
							case 23:
								delete style["font-style"]
								break
							case 24:
							case 29:
							case 55:
								delete style["text-decoration"]
								break
							case 28:
								delete style["display"]
								break
							case 39:
								delete style["color"]
								break
							case 49:
								delete style["background-color"]
								break
							case 53:
								style["text-decoration"] = "overline"
								break
						}
					}
				}
				return ""
			})
			// 应用新样式
			const oldCSSText = currentCSSText
			currentCSSText = ""
			for (const key in style) {
				if (currentCSSText) currentCSSText += `; `
				currentCSSText += `${key}: ${style[key]}`
			}
			if (oldCSSText === currentCSSText) {
				return ""
			}
			return `${oldCSSText ? `</span>` : ""}${currentCSSText ? `<span style="${currentCSSText}">` : ""}`

			/**
			 * 计算一个颜色简码对应的实际颜色
			 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
			 */
			function codeToRGB(code: number) {
				switch (code) {
					case 0: return "black"
					case 1: return "darkred"
					case 2: return "darkgreen"
					case 3: return "olive"
					case 4: return "navy"
					case 5: return "darkmagenta"
					case 6: return "darkcyan"
					case 7: return "sliver"

					case 8: return "gray"
					case 9: return "red"
					case 10: return "green"
					case 11: return "yellow"
					case 12: return "blue"
					case 13: return "magenta"
					case 14: return "cyan"
					case 15: return "white"
				}
				if (code >= 232) {
					return `#${((code - 232) * 10 + 8).toString(16).padStart(2, "0").repeat(3)}`
				}
				code -= 16
				const b = code % 6
				code = (code - b) / 6
				const g = code % 6
				code = (code - g) / 6
				const r = code % 6
				return `#${((r > 0 ? r * 40 + 55 : 0) << 16 | (g > 0 ? g * 40 + 55 : 0) << 8 | (b > 0 ? b * 40 + 55 : 0)).toString(16).padStart(6, "0")}`
			}
		}
		return ""
	})
	if (currentCSSText) {
		content += "</span>"
	}
	return content
}

/**
 * 获取字符串的显示宽度，如果字符串中有换行，则获取最宽的行的宽度
 * @param content 要计算的字符串
 * @returns 返回宽度，一般地，西文字母返回 1，中文文字返回 2
 */
export function getStringWidth(content: string): number {
	content = removeANSICodes(content).replace(/\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu, "  ")
	let width = 0
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i)
		if (char === 10 /*\n*/ || char === 13 /*\r*/) {
			return Math.max(width, getStringWidth(content.substring(i + 1)))
		}
		width += getCharWidth(char)
	}
	return width
}

/**
 * 获取字符的显示宽度
 * @param char 要计算的 Unicode 字符编码
 * @returns 返回宽度，一般地，西文字母返回 1，中文文字返回 2
 */
export function getCharWidth(char: number) {
	// ASCII 字符宽度为 1
	if (char <= 0x1f || (char >= 0x7f && char <= 0x9f)) {
		// 制表符按宽度 4 计算
		if (char === 9 /*\t*/) {
			return 4
		}
		return 1
	}
	// 对于 Unicode 代理区（Surrogate）字符（如 Emoji），计算的逻辑比较复杂
	// 考虑此函数主要用于确保在显示时不换行，因此代理区字符统按宽度 2 处理
	return isFullWidthCodePoint(char) ? 2 : 1
}

/**
 * 判断指定的字符是否是宽字符
 * @param char 要判断的字符编码
 * @see https://github.com/nodejs/node/blob/master/lib/internal/readline.js
 * @see http://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
 */
function isFullWidthCodePoint(char: number) {
	return char >= 0x1100 && (
		// CJK Unified Ideographs .. Yi Radicals
		0x4e00 <= char && char <= 0xa4c6 ||
		// Hangul Jamo
		char <= 0x115f ||
		// LEFT-POINTING ANGLE BRACKET
		char === 0x2329 ||
		// RIGHT-POINTING ANGLE BRACKET
		char === 0x232a ||
		// CJK Radicals Supplement .. Enclosed CJK Letters and Months
		(0x2e80 <= char && char <= 0x3247 && char !== 0x303f) ||
		// Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
		0x3250 <= char && char <= 0x4dbf ||
		// Hangul Jamo Extended-A
		0xa960 <= char && char <= 0xa97c ||
		// Hangul Syllables
		0xac00 <= char && char <= 0xd7a3 ||
		// CJK Compatibility Ideographs
		0xf900 <= char && char <= 0xfaff ||
		// Vertical Forms
		0xfe10 <= char && char <= 0xfe19 ||
		// CJK Compatibility Forms .. Small Form Variants
		0xfe30 <= char && char <= 0xfe6b ||
		// Halfwidth and Fullwidth Forms
		0xff01 <= char && char <= 0xff60 || 0xffe0 <= char && char <= 0xffe6 ||
		// Kana Supplement
		0x1b000 <= char && char <= 0x1b001 ||
		// Enclosed Ideographic Supplement
		0x1f200 <= char && char <= 0x1f251 ||
		// CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
		0x20000 <= char && char <= 0x3fffd)
}