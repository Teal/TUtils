import { SourceMapBuilder, SourceMapData, toSourceMapBuilder } from "./sourceMap"

/** 表示一个文本写入器 */
export class TextWriter {

	/** 获取或设置已写入的文本内容 */
	content = ""

	/** 获取已写入的文本内容 */
	toString() { return this.content }

	/** 获取或设置缩进字符 */
	indentChar = "\t"

	/** 获取或设置当前使用的缩进字符串 */
	indentString = ""

	/** 增加一个缩进 */
	indent() { this.indentString += this.indentChar }

	/** 减少一个缩进 */
	unindent() { this.indentString = this.indentString.substring(this.indentChar.length) }

	/**
	 * 在末尾写入一段文本
	 * @param content 要写入的内容
	 * @param startIndex 要写入的内容的开始索引（从 0 开始）
	 * @param endIndex 要写入的内容的结束索引（从 0 开始）（不含）
	 * @param sourcePath 内容的源文件路径或索引
	 * @param sourceLine 内容在源文件中的行号（从 0 开始）
	 * @param sourceColumn 内容在源文件中的列号（从 0 开始）
	 * @param name 内容对应的符号名称或索引
	 * @param sourceMap 如果指定了源文件的源映射，则复制所有映射点
	 */
	write(content: string, startIndex = 0, endIndex = content.length, sourcePath?: string | number, sourceLine?: number, sourceColumn?: number, name?: string | number, sourceMap?: SourceMapData) {
		let lastIndex = startIndex
		if (this.indentString) {
			const prevChar = this.content.charCodeAt(this.content.length - 1)
			let isLineStart = prevChar === 10 /*\n*/ || prevChar === 13 /*\r*/ || prevChar !== prevChar /*NaN*/
			for (; startIndex < endIndex; startIndex++) {
				const char = content.charCodeAt(startIndex)
				if (char === 10 /*\n*/) {
					isLineStart = true
				} else if (char === 13 /*\r*/) {
					if (content.charCodeAt(startIndex + 1) === 10 /*\n*/) {
						startIndex++
					}
					isLineStart = true
				} else if (isLineStart) {
					if (startIndex > lastIndex) {
						this.content += content.substring(lastIndex, startIndex)
						lastIndex = startIndex
					}
					this.content += this.indentString
					isLineStart = false
				}
			}
		}
		this.content += content.substring(lastIndex, endIndex)
	}

}

/** 表示一个支持源映射（Source Map）的文本写入器 */
export class SourceMapTextWriter extends TextWriter {

	/** 当前使用的源映射生成器 */
	readonly sourceMapBuilder = new SourceMapBuilder()

	/** 获取当前生成的源映射 */
	get sourceMap() { return this.sourceMapBuilder.toJSON() }

	/** 判断或设置是否只生成行映射信息 */
	noColumnMappings = false

	/** 获取当前写入的行号 */
	line = 0

	/** 获取当前写入的列号 */
	column = 0

	/**
	 * 在末尾写入一段文本
	 * @param content 要写入的内容
	 * @param startIndex 要写入的内容的开始索引（从 0 开始）
	 * @param endIndex 要写入的内容的结束索引（从 0 开始）（不含）
	 * @param sourcePath 内容的源文件路径或索引
	 * @param sourceLine 内容在源文件中的行号（从 0 开始）
	 * @param sourceColumn 内容在源文件中的列号（从 0 开始）
	 * @param name 内容对应的符号名称或索引
	 * @param sourceMap 如果指定了源文件的源映射，则复制所有映射点
	 */
	write(content: string, startIndex = 0, endIndex = content.length, sourcePath?: string | number, sourceLine?: number, sourceColumn?: number, name?: string | number, sourceMap?: SourceMapData) {
		let line = this.line
		let column = this.column
		let lastIndex = startIndex
		const sourceMapBuilder = this.sourceMapBuilder

		const prevChar = this.content.charCodeAt(this.content.length - 1)
		let isLineStart = prevChar === 10 /*\n*/ || prevChar === 13 /*\r*/ || prevChar !== prevChar /*NaN*/

		if (sourceColumn === undefined) {
			// 如果没有提供源位置，无法生成源映射，直接写入文本
			for (; startIndex < endIndex; startIndex++) {
				switch (content.charCodeAt(startIndex)) {
					case 13 /*\r*/:
						if (content.charCodeAt(startIndex + 1) === 10 /*\n*/) {
							startIndex++
						}
					// fall through
					case 10  /*\n*/:
						isLineStart = true
						line++
						break
					default:
						if (isLineStart) {
							if (startIndex > lastIndex) {
								this.content += content.substring(lastIndex, startIndex)
								lastIndex = startIndex
							}
							this.content += this.indentString
							isLineStart = false
						}
						column++
						break
				}
			}
		} else if (sourceMap === undefined) {
			// 如果没有提供源映射，生成新源映射
			if (typeof sourcePath === "string") {
				sourcePath = sourceMapBuilder.addSource(sourcePath)
			}
			for (let prevCharType: number | undefined; startIndex < endIndex; startIndex++) {
				const char = content.charCodeAt(startIndex)
				switch (char) {
					case 13 /*\r*/:
						if (content.charCodeAt(startIndex + 1) === 10 /*\n*/) {
							startIndex++
						}
					// fall through
					case 10  /*\n*/:
						isLineStart = true
						line++
						sourceLine!++
						sourceColumn = column = 0
						prevCharType = undefined
						break
					default:
						if (isLineStart) {
							if (startIndex > lastIndex) {
								this.content += content.substring(lastIndex, startIndex)
								lastIndex = startIndex
							}
							this.content += this.indentString
							isLineStart = false
						}
						const charType = this.noColumnMappings ? 0 :
							char === 32 /* */ || char === 9 /*\t*/ ? 32 :
								char >= 97 /*a*/ && char <= 122 /*z*/ || char >= 65 /*A*/ && char <= 90 /*Z*/ || char >= 48 /*0*/ && char <= 57 /*9*/ || char >= 0xAA && char <= 0xDDEF || char === 95 /*_*/ || char === 36 /*$*/ ? 65 :
									char === 44 /*,*/ || char === 59 /*;*/ || char === 40 /*(*/ || char === 41 /*)*/ || char === 123 /*{*/ || char === 125 /*}*/ || char === 91 /*[*/ || char === 93 /*]*/ ? char : 1
						if (charType !== prevCharType) {
							this.sourceMapBuilder.addMapping(line, column, sourcePath, sourceLine, sourceColumn, name)
							prevCharType = charType
						}
						column++
						sourceColumn!++
						break
				}
			}
		} else {
			const originalSourceMap = toSourceMapBuilder(sourceMap)
			// 如果提供了源映射，直接拷贝所有映射点
			const sourceMappings: number[] = []
			let mappings = originalSourceMap.mappings[sourceLine!] || []
			let mappingIndex = 0
			let foundStartMapping = false
			for (; mappingIndex < mappings.length; mappingIndex++) {
				const lastMapping = mappings[mappingIndex]
				if (lastMapping.generatedColumn >= sourceColumn!) {
					foundStartMapping = lastMapping.generatedColumn === sourceColumn
					break
				}
			}
			// 如果插入的开始位置没有匹配的映射点，则补插一个
			if (!foundStartMapping && startIndex < endIndex) {
				if (mappingIndex > 0) {
					const prevMapping = mappings[mappingIndex - 1]
					if (prevMapping.sourceIndex === undefined) {
						sourceMapBuilder.addMapping(line, column)
					} else {
						sourceMapBuilder.addMapping(line, column, sourceMappings[prevMapping.sourceIndex] = sourceMapBuilder.addSource(originalSourceMap.sources[prevMapping.sourceIndex]), prevMapping.sourceLine!, prevMapping.sourceColumn! + (sourceColumn! - prevMapping.generatedColumn), prevMapping.nameIndex === undefined ? undefined : originalSourceMap.names[prevMapping.nameIndex])
					}
				} else {
					sourceMapBuilder.addMapping(line, column)
				}
			}
			// 复制映射点
			for (; startIndex < endIndex; startIndex++) {
				switch (content.charCodeAt(startIndex)) {
					case 13 /*\r*/:
						if (content.charCodeAt(startIndex + 1) === 10 /*\n*/) {
							startIndex++
						}
					// fall through
					case 10  /*\n*/:
						isLineStart = true
						line++
						mappingIndex = sourceColumn = column = 0
						mappings = originalSourceMap.mappings[++sourceLine!] || []
						break
					default:
						if (isLineStart) {
							if (startIndex > lastIndex) {
								this.content += content.substring(lastIndex, startIndex)
								lastIndex = startIndex
							}
							this.content += this.indentString
							isLineStart = false
						}
						if (mappingIndex < mappings.length) {
							const mapping = mappings[mappingIndex]
							if (mapping.generatedColumn === sourceColumn) {
								mappingIndex++
								if (mapping.sourceIndex === undefined) {
									sourceMapBuilder.addMapping(line, column)
								} else {
									let newSourceIndex = sourceMappings[mapping.sourceIndex]
									if (newSourceIndex === undefined) {
										sourceMappings[mapping.sourceIndex] = newSourceIndex = sourceMapBuilder.addSource(originalSourceMap.sources[mapping.sourceIndex])
									}
									sourceMapBuilder.addMapping(line, column, newSourceIndex, mapping.sourceLine!, mapping.sourceColumn!, mapping.nameIndex === undefined ? undefined : originalSourceMap.names[mapping.nameIndex])
								}
							}
						}
						column++
						sourceColumn!++
						break
				}
			}
		}
		this.content += content.substring(lastIndex, endIndex)
		this.line = line
		this.column = column
	}

}