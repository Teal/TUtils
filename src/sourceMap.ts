/**
 * 表示一个源映射（Source Map）对象
 * @see https://sourcemaps.info/spec.html
 * @see https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k
 * @see http://www.alloyteam.com/2014/01/source-map-version-3-introduction/
 */
export interface SourceMapObject {
	/** 版本号 */
	version: number
	/** 生成文件的路径 */
	file?: string
	/** 所有源文件的根路径 */
	sourceRoot?: string
	/** 所有源文件的路径 */
	sources: string[]
	/** 所有源文件的内容 */
	sourcesContent?: string[]
	/** 所有符号名 */
	names?: string[]
	/** 所有映射点 */
	mappings: string
}

/** 表示一个索引映射（Index Map）对象 */
export interface IndexMapObject {
	/** 版本号 */
	version: number
	/** 生成文件的路径 */
	file?: string
	/** 所有映射段 */
	sections: ({
		/** 当前片段在生成文件内的偏移位置 */
		offset: {
			/** 当前位置的行号（从 0 开始）*/
			line: number
			/** 当前位置的列号（从 0 开始）*/
			column: number
		}
	} & ({
		/** 当前片段的源映射地址 */
		url: string
	} | {
		/** 当前片段的源映射数据 */
		map: SourceMapObject | IndexMapObject
	}))[]
}

/** 表示一个源映射（Source Map）生成器 */
export interface SourceMapGenerator {
	/** 生成并返回一个源映射对象 */
	toJSON(): SourceMapObject | IndexMapObject
	/** 生成并返回一个源映射字符串 */
	toString(): string
}

/** 表示一个源映射（Source Map）数据，可以是一个字符串、对象或生成器 */
export type SourceMapData = string | IndexMapObject | SourceMapObject | SourceMapGenerator

/**
 * 将指定的源映射（Source Map）数据转为字符串
 * @param sourceMapData 要转换的源映射数据
 */
export function toSourceMapString(sourceMapData: SourceMapData) {
	if (typeof sourceMapData === "string") {
		return sourceMapData
	}
	return JSON.stringify(sourceMapData)
}

/**
 * 将指定的源映射（Source Map）数据转为对象
 * @param sourceMapData 要转换的源映射数据
 */
export function toSourceMapObject(sourceMapData: SourceMapData) {
	if (typeof sourceMapData === "string") {
		// 为防止 XSS，源数据可能包含 )]}' 前缀
		// https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit
		sourceMapData = JSON.parse(sourceMapData.replace(/^\)]}'/, ""))
	} else if ((sourceMapData as SourceMapGenerator).toJSON) {
		sourceMapData = (sourceMapData as SourceMapGenerator).toJSON()
	}
	if ((sourceMapData as IndexMapObject).sections) {
		throw new TypeError("Indexed map is not supported")
	}
	if ((sourceMapData as SourceMapObject).version && (sourceMapData as SourceMapObject).version != 3) {
		throw new TypeError(`Source map v${(sourceMapData as SourceMapObject).version} is not supported`)
	}
	return sourceMapData as SourceMapObject
}

/**
 * 将指定的源映射（Source Map）数据转为构建器
 * @param sourceMapData 要转换的源映射数据
 */
export function toSourceMapBuilder(sourceMapData: SourceMapData | undefined) {
	if (sourceMapData instanceof SourceMapBuilder) {
		return sourceMapData
	}
	return new SourceMapBuilder(sourceMapData)
}

/** 表示一个源映射（Source Map）构建器，用于解析、读取、生成、合并源映射 */
export class SourceMapBuilder implements SourceMapGenerator {

	// #region 解析和格式化

	/** 获取当前源映射构建器支持的版本号 */
	get version() { return 3 }

	/** 获取或设置生成文件的路径 */
	file?: string

	/** 获取或设置所有源文件的根路径 */
	sourceRoot?: string

	/** 获取所有源文件的路径 */
	readonly sources: string[] = []

	/** 获取所有源文件的内容 */
	readonly sourcesContent: string[] = []

	/** 获取所有符号名 */
	readonly names: string[] = []

	/** 获取所有映射点 */
	readonly mappings: Mapping[][] = []

	/**
	 * 初始化新的源映射构建器
	 * @param sourceMapData 要转换的源映射数据
	 */
	constructor(sourceMapData?: SourceMapData) {
		if (sourceMapData) {
			sourceMapData = toSourceMapObject(sourceMapData)
			this.file = sourceMapData.file
			this.sourceRoot = sourceMapData.sourceRoot
			if (sourceMapData.sources) {
				this.sources.push(...sourceMapData.sources)
			}
			if (sourceMapData.sourcesContent) {
				this.sourcesContent.push(...sourceMapData.sourcesContent)
			}
			if (sourceMapData.names) {
				this.names.push(...sourceMapData.names)
			}
			if (sourceMapData.mappings) {
				decodeMappings(sourceMapData.mappings, this.mappings)
			}
		}
	}

	toJSON() {
		const sourceMapObject = { version: this.version } as SourceMapObject
		if (this.file !== undefined) {
			sourceMapObject.file = this.file
		}
		if (this.sourceRoot !== undefined) {
			sourceMapObject.sourceRoot = this.sourceRoot
		}
		sourceMapObject.sources = this.sources
		sourceMapObject.mappings = encodeMappings(this.mappings)
		if (this.names.length) {
			sourceMapObject.names = this.names
		}
		if (this.sourcesContent.length) {
			sourceMapObject.sourcesContent = this.sourcesContent
		}
		return sourceMapObject
	}

	toString() { return JSON.stringify(this) }

	// #endregion

	// #region 读取

	/**
	 * 获取生成文件中指定位置的源信息，如果找不到映射点则返回空
	 * @param generatedLine 生成文件中的行号（从 0 开始）
	 * @param generatedColumn 生成文件中的列号（从 0 开始）
	 * @param adjustColumn 是否根据映射点和指定列计算偏移后的列号
	 * @param adjustLine 如果找不到匹配的映射点，是否往前搜索其它行的映射点并计算指定行的位置
	 */
	getSource(generatedLine: number, generatedColumn: number, adjustColumn = false, adjustLine = false) {
		const mappings = this.mappings[generatedLine]
		if (mappings) {
			for (let i = mappings.length; --i >= 0;) {
				const mapping = mappings[i]
				if (generatedColumn >= mapping.generatedColumn) {
					const result = { mapping } as SourceLocation
					if (mapping.sourceIndex !== undefined) {
						result.sourcePath = this.sources[mapping.sourceIndex]
						result.line = mapping.sourceLine!
						result.column = mapping.sourceColumn!
						if (adjustColumn) {
							result.column += generatedColumn - mapping.generatedColumn
						}
						if (mapping.nameIndex !== undefined) {
							result.name = this.names[mapping.nameIndex]
						}
					}
					return result
				}
			}
		}
		// 往前搜索其它行的映射点并计算当前行的位置
		if (adjustLine) {
			for (let i = generatedLine; --i >= 0;) {
				const mappings = this.mappings[i]
				if (mappings?.length) {
					const mapping = mappings[mappings.length - 1]
					const result = { mapping } as SourceLocation
					if (mapping.sourceIndex != undefined) {
						result.sourcePath = this.sources[mapping.sourceIndex]
						result.line = mapping.sourceLine! + generatedLine - i
						result.column = adjustColumn ? generatedColumn : 0
					}
					return result
				}
			}
		}
		return null
	}

	/**
	 * 获取源文件中指定位置生成后的所有位置
	 * @param sourcePath 要获取的源文件路径或索引
	 * @param sourceLine 源文件中的行号（从 0 开始）
	 * @param sourceColumn 源文件中的列号（从 0 开始），如果未提供则返回指定行所有列的生成信息
	 */
	getAllGenerated(sourcePath: string | number, sourceLine: number, sourceColumn?: number) {
		const result: GeneratedLocation[] = []
		const sourceIndex = typeof sourcePath === "number" ? sourcePath : this.sources.indexOf(sourcePath)
		if (sourceIndex >= 0) {
			let minColumnOffset = Infinity
			for (let i = 0; i < this.mappings.length; i++) {
				const mappings = this.mappings[i]
				for (const mapping of mappings) {
					if (mapping.sourceIndex === sourceIndex && mapping.sourceLine === sourceLine) {
						if (sourceColumn === undefined) {
							result.push({
								mapping,
								line: i,
								column: mapping.generatedColumn
							})
						} else {
							const columnOffset = sourceColumn - mapping.sourceColumn!
							if (columnOffset >= 0 && columnOffset <= minColumnOffset) {
								// 需要计算与指定列最近的映射点（可能有多个）
								// 当找到更近的映射点时，删除已添加的映射点
								if (columnOffset < minColumnOffset) {
									result.length = 0
								}
								result.push({
									mapping,
									line: i,
									column: mapping.generatedColumn
								})
								minColumnOffset = columnOffset
							}
						}
					}
				}
			}
		}
		return result
	}

	/**
	 * 遍历所有映射点并调用指定的函数
	 * @param callback 遍历的回调函数
	 * @param callback.generatedLine 生成文件的行号（从 0 开始）
	 * @param callback.generatedColumn 生成文件的列号（从 0 开始）
	 * @param callback.sourcePath 源文件的路径
	 * @param callback.sourceLine 源文件的行号（从 0 开始）
	 * @param callback.sourceColumn 源文件的列号（从 0 开始）
	 * @param callback.name 符号名
	 * @param callback.mapping 原始映射点
	 * @param callback.return 函数如果返回 `false` 则停止遍历
	 * @returns 如果回调函数返回 `false`，则返回 `false`，否则返回 `true`
	 */
	eachMapping(callback: (generatedLine: number, generatedColumn: number, sourcePath: string | undefined, sourceLine: number | undefined, sourceColumn: number | undefined, name: string | undefined, mapping: Mapping) => void | boolean) {
		for (let i = 0; i < this.mappings.length; i++) {
			const mappings = this.mappings[i]
			for (const mapping of mappings) {
				if (callback(i, mapping.generatedColumn, mapping.sourceIndex !== undefined ? this.sources[mapping.sourceIndex] : undefined, mapping.sourceLine, mapping.sourceColumn, mapping.nameIndex !== undefined ? this.names[mapping.nameIndex] : undefined, mapping) === false) {
					return false
				}
			}
		}
		return true
	}

	// #endregion

	// #region 生成

	/**
	 * 添加一个源文件
	 * @param sourcePath 要添加的源文件路径
	 * @returns 返回源文件的索引
	 */
	addSource(sourcePath: string) {
		let sourceIndex = this.sources.indexOf(sourcePath)
		if (sourceIndex < 0) {
			this.sources[sourceIndex = this.sources.length] = sourcePath
		}
		return sourceIndex
	}

	/**
	 * 获取指定源文件的内容，如果未找到源文件内容则返回 `undefined`
	 * @param sourcePath 要获取的源文件路径
	 */
	getSourceContent(sourcePath: string) {
		const sourceIndex = this.sources.indexOf(sourcePath)
		return sourceIndex < 0 ? undefined : this.sourcesContent[sourceIndex]
	}

	/**
	 * 设置指定源文件的内容
	 * @param sourcePath 要设置的源文件路径
	 * @param sourceContent 要设置的源文件内容
	 */
	setSourceContent(sourcePath: string, sourceContent: string) {
		this.sourcesContent[this.addSource(sourcePath)] = sourceContent
	}

	/**
	 * 添加一个符号名
	 * @param name 要添加的符号名
	 * @returns 返回符号名的索引
	 */
	addName(name: string) {
		let nameIndex = this.names.indexOf(name)
		if (nameIndex < 0) {
			this.names[nameIndex = this.names.length] = name
		}
		return nameIndex
	}

	/**
	 * 添加一个映射点
	 * @param generatedLine 生成的行号（从 0 开始）
	 * @param generatedColumn 生成的列号（从 0 开始）
	 * @param sourcePath 映射的源文件路径或索引
	 * @param sourceLine 映射的源文件行号（从 0 开始），如果 `sourcePath` 不为 `undefined`，则 `sourceLine` 不为 `undefined`
	 * @param sourceColumn 映射的源文件列号（从 0 开始），如果 `sourcePath` 不为 `undefined`，则 `sourceColumn` 不为 `undefined`
	 * @param name 符号名或索引
	 * @returns 返回添加的映射点
	 */
	addMapping(generatedLine: number, generatedColumn: number, sourcePath?: string | number, sourceLine?: number, sourceColumn?: number, name?: string | number) {
		const mapping: Mapping = { generatedColumn: generatedColumn }
		if (sourcePath !== undefined) {
			mapping.sourceIndex = typeof sourcePath === "number" ? sourcePath : this.addSource(sourcePath)
			mapping.sourceLine = sourceLine!
			mapping.sourceColumn = sourceColumn!
			if (name !== undefined) {
				mapping.nameIndex = typeof name === "number" ? name : this.addName(name)
			}
		}
		const mappings = this.mappings[generatedLine]
		if (!mappings) {
			// 第一个映射点
			this.mappings[generatedLine] = [mapping]
			while (--generatedLine >= 0 && this.mappings[generatedLine] === undefined) {
				this.mappings[generatedLine] = []
			}
		} else if (!mappings.length || generatedColumn >= mappings[mappings.length - 1].generatedColumn) {
			// 实际项目中，一般都是按顺序添加映射点，所以优先判断是否直接插入到末尾
			mappings.push(mapping)
		} else {
			// 插入排序：确保同一行内的所有映射点按生成列的顺序存储
			for (let i = mappings.length; --i >= 0;) {
				if (generatedColumn >= mappings[i].generatedColumn) {
					mappings.splice(i + 1, 0, mapping)
					return mapping
				}
			}
			mappings.unshift(mapping)
		}
		return mapping
	}

	/**
	 * 合并新的源映射
	 * @param sourceMap 要合并的源映射构建器
	 * @description
	 * 假如有源文件 A，通过一次生成得到 B，其源映射记作 S1；
	 * 然后 B 通过再次生成得到 C，其源映射记作 S2；
	 * 此时需要调用 `S2.applySourceMap(S1)`，将 S2 更新为 A 到 C 的源映射
	 *
	 * > ##### 注意
	 * > 1. 函数仅返回合并的源映射和当前源映射的最小交集
	 * > 2. 所有路径都应该是绝对路径，且区分大小写
	 * > 3. `sourceRoot` 会被忽略
	 */
	applySourceMap(sourceMap: SourceMapBuilder) {
		const sourceIndex = this.sources.indexOf(sourceMap.file!)
		if (sourceIndex < 0) {
			return
		}
		// 删除指定源文件的所有信息
		this.sources.splice(sourceIndex, 1)
		this.sourcesContent.splice(sourceIndex, 1)
		// 存储新源映射中所有源路径和符号名更新后的新索引
		const sourceIndexMapping: number[] = []
		for (let i = 0; i < sourceMap.sources.length; i++) {
			const newIndex = sourceIndexMapping[i] = this.addSource(sourceMap.sources[i])
			if (sourceMap.sourcesContent[i] !== undefined) {
				this.sourcesContent[newIndex] = sourceMap.sourcesContent[i]
			}
		}
		const nameIndexMapping: number[] = []
		for (let i = 0; i < sourceMap.names.length; i++) {
			nameIndexMapping[i] = this.addName(sourceMap.names[i])
		}
		for (const mappings of this.mappings) {
			for (const mapping of mappings) {
				if (mapping.sourceIndex === sourceIndex) {
					const source = sourceMap.getSource(mapping.sourceLine!, mapping.sourceColumn!, true, true)
					if (source?.sourcePath !== undefined) {
						mapping.sourceIndex = sourceIndexMapping[source.mapping.sourceIndex!]
						mapping.sourceLine = source.line!
						mapping.sourceColumn = source.column!
						if (source.name !== undefined) {
							mapping.nameIndex = nameIndexMapping[source.mapping.nameIndex!]
						} else {
							delete mapping.nameIndex
						}
					} else {
						// 当前映射点无可用的新映射信息，为避免影响后续映射点计算逻辑，仅清空映射点但不删除
						delete mapping.sourceIndex
						delete mapping.sourceLine
						delete mapping.sourceColumn
						delete mapping.nameIndex
					}
				} else if (mapping.sourceIndex! > sourceIndex) {
					// 由于原 sourceIndex 已删除，后续的 sourceIndex 需前移一位
					mapping.sourceIndex!--
				}
			}
		}
	}

	// #endregion

}

/** 表示源映射中的一个映射点 */
export interface Mapping {
	/** 生成文件中的列号（从 0 开始）*/
	generatedColumn: number
	/** 源文件的索引（从 0 开始）*/
	sourceIndex?: number
	/**
	 * 源文件中的行号（从 0 开始）
	 * @description 如果 `sourceIndex` 不为 `undefined`，则 `sourceLine` 不为 `undefined`
	 */
	sourceLine?: number
	/**
	 * 源文件中的列号（从 0 开始）
	 * @description 如果 `sourceIndex` 不为 `undefined`，则 `sourceLine` 不为 `undefined`
	 */
	sourceColumn?: number
	/** 符号名的索引（从 0 开始）*/
	nameIndex?: number
}

/** 表示一个源位置 */
export interface SourceLocation {
	/** 映射点 */
	mapping: Mapping
	/** 源文件的路径 */
	sourcePath?: string
	/** 源文件中的行号（从 0 开始）*/
	line?: number
	/** 源文件中的列号（从 0 开始）*/
	column?: number
	/** 符号名 */
	name?: string
}

/** 表示一个生成的位置 */
export interface GeneratedLocation {
	/** 获取映射点 */
	mapping: Mapping
	/** 生成文件中的行号（从 0 开始）*/
	line: number
	/** 生成文件中的列号（从 0 开始）*/
	column: number
}

/** 编码一个映射字符串 */
function encodeMappings(allMappings: readonly Mapping[][]) {
	let mappingString = ""
	let prevSourceIndex = 0
	let prevSourceLine = 0
	let prevSourceColumn = 0
	let prevNameIndex = 0
	for (let i = 0; i < allMappings.length; i++) {
		if (i > 0) mappingString += ";"
		const mappings = allMappings[i]
		let prevColumn = 0
		for (let j = 0; j < mappings.length; j++) {
			if (j > 0) mappingString += ","
			const mapping = mappings[j]
			mappingString = encodeBase64VLQ(mapping.generatedColumn - prevColumn, mappingString)
			prevColumn = mapping.generatedColumn
			if (mapping.sourceIndex != undefined && mapping.sourceLine != undefined && mapping.sourceColumn != undefined) {
				mappingString = encodeBase64VLQ(mapping.sourceIndex - prevSourceIndex, mappingString)
				prevSourceIndex = mapping.sourceIndex
				mappingString = encodeBase64VLQ(mapping.sourceLine - prevSourceLine, mappingString)
				prevSourceLine = mapping.sourceLine
				mappingString = encodeBase64VLQ(mapping.sourceColumn - prevSourceColumn, mappingString)
				prevSourceColumn = mapping.sourceColumn
				if (mapping.nameIndex != undefined) {
					mappingString = encodeBase64VLQ(mapping.nameIndex - prevNameIndex, mappingString)
					prevNameIndex = mapping.nameIndex
				}
			}
		}
	}
	return mappingString
}

/** 解码一个映射字符串 */
function decodeMappings(mappingString: string, allMappings: Mapping[][]) {
	const context = { index: 0 }
	let line = 0
	let mappings: Mapping[] = allMappings[0] = []
	let prevColumn = 0
	let prevSourceIndex = 0
	let prevSourceLine = 0
	let prevSourceColumn = 0
	let prevNameIndex = 0
	while (context.index < mappingString.length) {
		let char = mappingString.charCodeAt(context.index)
		if (char !== 59 /*;*/ && char !== 44 /*,*/) {
			const mapping: Mapping = {
				generatedColumn: prevColumn += decodeBase64VLQ(mappingString, context)
			}
			mappings.push(mapping)
			if (context.index === mappingString.length) {
				break
			}
			char = mappingString.charCodeAt(context.index)
			if (char !== 59 /*;*/ && char !== 44 /*,*/) {
				mapping.sourceIndex = prevSourceIndex += decodeBase64VLQ(mappingString, context)
				mapping.sourceLine = prevSourceLine += decodeBase64VLQ(mappingString, context)
				mapping.sourceColumn = prevSourceColumn += decodeBase64VLQ(mappingString, context)
				if (context.index === mappingString.length) {
					break
				}
				char = mappingString.charCodeAt(context.index)
				if (char !== 59 /*;*/ && char !== 44 /*,*/) {
					mapping.nameIndex = prevNameIndex += decodeBase64VLQ(mappingString, context)
					if (context.index === mappingString.length) {
						break
					}
					char = mappingString.charCodeAt(context.index)
				}
			}
		}
		context.index++
		if (char === 59 /*;*/) {
			allMappings[++line] = mappings = []
			prevColumn = 0
		}
	}
}

const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("")

/** 编码一个 Base64-VLQ 值 */
function encodeBase64VLQ(value: number, result: string) {
	let vlq = value < 0 ? ((-value) << 1) + 1 : (value << 1)
	do {
		const digit = vlq & 31 /*(1<<5)-1*/
		vlq >>>= 5
		result += base64Chars[vlq > 0 ? digit | 32 /*1<<5*/ : digit]
	} while (vlq > 0)
	return result
}

/** 解码一个 Base64-VLQ 值 */
function decodeBase64VLQ(value: string, context: { index: number }) {
	let vlq = 0
	let shift = 0
	let digit: number
	do {
		const char = value.charCodeAt(context.index++)
		digit = 65 /*A*/ <= char && char <= 90 /*Z*/ ? char - 65 /*A*/ : // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
			97 /*a*/ <= char && char <= 122 /*z*/ ? char - 71 /*'a' - 26*/ : // 26 - 51: abcdefghijklmnopqrstuvwxyz
				48 /*0*/ <= char && char <= 57 /*9*/ ? char + 4 /*'0' - 26*/ : // 52 - 61: 0123456789
					char === 43 /*+*/ ? 62 : // 62: +
						char === 47 /*/*/ ? 63 : // 63: /
							NaN
		vlq += ((digit & 31/*(1<<5)-1*/) << shift)
		shift += 5
	} while (digit & 32/*1<<5*/)
	return vlq & 1 ? -(vlq >> 1) : vlq >> 1
}

/** 匹配 `#sourceMappingURL` 注释的正则表达式 */
const sourceMappingURL = /(?:\/\/(?:[#@]\ssourceMappingURL=([^\s'"]*))\s*$|\/\*(?:\s*\r?\n(?:\/\/)?)?(?:[#@]\ssourceMappingURL=([^\s'"]*))\s*\*\/)\s*$/

/**
 * 读取指定内容的 `#sourceMappingURL` 注释，如果不存在则返回空
 * @param content 要读取的内容
 */
export function getSourceMappingURL(content: string) {
	const match = sourceMappingURL.exec(content)
	if (match) {
		return match[1] || match[2] || ""
	}
	return null
}

/**
 * 在指定内容插入一个 `#sourceMappingURL` 注释，如果注释已存在则更新
 * @param content 要插入或更新的内容
 * @param sourceMapURL 要插入或更新的源映射地址，如果地址为空则删除已存在的注释
 * @param singleLineComment 如果为 `true` 则插入单行注释，否则插入多行注释，如果已经存在注释，则保留现有注释风格
 */
export function setSourceMappingURL(content: string, sourceMapURL: string | null, singleLineComment?: boolean) {
	let append = sourceMapURL != null
	content = content.replace(sourceMappingURL, (_, singleLineComment: any) => {
		if (append) {
			append = false
			return createSourceMappingURLComment(sourceMapURL!, singleLineComment)
		}
		return ""
	})
	if (append) {
		content += `\n${createSourceMappingURLComment(sourceMapURL!, singleLineComment)}`
	}
	return content
}

/**
 * 生成一个 `#sourceMappingURL` 注释
 * @param sourceMapURL 源映射地址
 * @param singleLineComment 如果为 `true` 则返回单行注释，否则返回多行注释
 */
export function createSourceMappingURLComment(sourceMapURL: string, singleLineComment?: boolean) {
	return singleLineComment ? `//\# sourceMappingURL=${sourceMapURL}` : `/*\# sourceMappingURL=${sourceMapURL} */`
}

/**
 * 生成一个 `#sourceURL` 注释
 * @param sourceURL 源地址
 */
export function createSourceURLComment(sourceMapURL: string) {
	return `//\# sourceURL=${sourceMapURL}`
}