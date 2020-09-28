import { indexToLineColumn, LineMap } from "./lineColumn"
import { SourceMapBuilder, SourceMapData, toSourceMapBuilder } from "./sourceMap"
import { SourceMapTextWriter, TextWriter } from "./textWriter"

/** 表示一个文本文档，用于多次修改并生成新文本内容和源映射（Source Map）*/
export class TextDocument {

	/** 获取文档的原始内容 */
	readonly content: string

	/** 获取文档的原始路径 */
	readonly path?: string

	/** 获取文档的原始源映射 */
	readonly sourceMap?: SourceMapBuilder

	/**
	 * 初始化新的文档
	 * @param content 文档的原始内容
	 * @param path 文档的原始路径
	 * @param sourceMap 文档的原始源映射
	 */
	constructor(content: string, path?: string, sourceMap?: SourceMapData | null) {
		this.content = content
		this.path = path
		if (sourceMap) {
			this.sourceMap = toSourceMapBuilder(sourceMap)
		}
	}

	/** 获取所有替换记录 */
	readonly replacements: {
		/** 要替换的开始索引 */
		startIndex: number
		/** 要替换的结束索引（不含）*/
		endIndex: number
		/**
		 * 计算要替换的新内容，如果是函数，则替换的内容将在最后生成时计算
		 * @param args 生成时的附加参数
		 * @returns 返回替换后的内容
		 */
		content: string | { write: TextDocument["write"] } | ((...args: readonly any[]) => string | { write: TextDocument["write"] })
	}[] = []

	/**
	 * 替换文档中指定区间的内容
	 * @param startIndex 要替换的开始索引
	 * @param endIndex 要替换的结束索引（不含）
	 * @param content 要替换的新内容，如果是函数则为最后根据生成目标自动计算的内容
	 * @returns 返回替换记录
	 */
	replace(startIndex: number, endIndex: number, content: TextDocument["replacements"][0]["content"]) {
		const replacement = { startIndex, endIndex, content }
		let index = this.replacements.length
		for (; index > 0; index--) {
			if (startIndex >= this.replacements[index - 1].startIndex) {
				break
			}
		}
		if (index >= this.replacements.length) {
			this.replacements.push(replacement)
		} else {
			this.replacements.splice(index, 0, replacement)
		}
		return replacement
	}

	/**
	 * 在文档中指定位置插入内容
	 * @param index 要插入的索引
	 * @param content 要插入的内容，如果是函数则为最后根据生成目标自动计算的内容
	 * @returns 返回替换记录
	 */
	insert(index: number, content: TextDocument["replacements"][0]["content"]) {
		return this.replace(index, index, content)
	}

	/**
	 * 在文档末尾插入内容
	 * @param content 要插入的内容，如果是函数则为最后根据生成目标自动计算的内容
	 * @returns 返回替换记录
	 */
	append(content: TextDocument["replacements"][0]["content"]) {
		const replacement = { startIndex: this.content.length, endIndex: this.content.length, content }
		this.replacements.push(replacement)
		return replacement
	}

	/**
	 * 删除文档中指定区间的内容
	 * @param startIndex 要删除的开始索引
	 * @param endIndex 要删除的结束索引（不含）
	 * @returns 返回替换记录
	 */
	remove(startIndex: number, endIndex: number) {
		return this.replace(startIndex, endIndex, "")
	}

	/** 行号索引 */
	private _lineMap?: LineMap

	/**
	 * 将当前文档的内容写入到目标写入器
	 * @param writer 目标写入器
	 * @param args 传递给计算内容的函数参数
	 */
	write(writer: TextWriter, ...args: any[]) {
		const sourceMap = writer instanceof SourceMapTextWriter
		let lastIndex = 0
		for (const replacement of this.replacements) {
			// 写入上一次替换记录到这次更新记录中间的文本
			if (lastIndex < replacement.startIndex) {
				if (sourceMap) {
					const loc = (this._lineMap || (this._lineMap = new LineMap(this.content))).indexToLineColumn(lastIndex)
					writer.write(this.content, lastIndex, replacement.startIndex, this.path, loc.line, loc.column, undefined, this.sourceMap)
				} else {
					writer.write(this.content, lastIndex, replacement.startIndex)
				}
			}
			// 写入替换的文本
			const content = typeof replacement.content === "function" ? replacement.content(...args) : replacement.content
			if (typeof content === "string") {
				writer.write(content)
			} else {
				content.write(writer, ...args)
			}
			// 更新最后一次替换位置
			lastIndex = replacement.endIndex
		}
		// 写入最后一个替换记录之后的文本
		if (lastIndex < this.content.length) {
			if (sourceMap) {
				const loc = this._lineMap ? this._lineMap.indexToLineColumn(lastIndex) : indexToLineColumn(this.content, lastIndex)
				writer.write(this.content, lastIndex, this.content.length, this.path, loc.line, loc.column, undefined, this.sourceMap)
			} else {
				writer.write(this.content, lastIndex, this.content.length)
			}
		}
	}

	/**
	 * 生成最终文本内容和源映射
	 * @param args 传递给计算内容的函数参数
	 */
	generate(...args: any[]) {
		const writer = new SourceMapTextWriter()
		this.write(writer, ...args)
		return writer
	}

	/**
	 * 生成最终文本内容
	 * @param args 传递给计算内容的函数参数
	 */
	toString(...args: any[]) {
		const writer = new TextWriter()
		this.write(writer, ...args)
		return writer.toString()
	}

}

/**
 * 增删指定的内容并更新源映射（Source Map）
 * @param data 要更新的数据
 * @param data.content 要更新的内容
 * @param data.path 内容的源路径，用于生成新的源映射
 * @param data.sourceMapData 内容的源映射
 * @param index 增删的索引（从 0 开始）
 * @param deleteCount 要删除的数目
 * @param insert 要插入的字符串内容
 * @returns 返回替换后的数据
 */
export function splice(data: { content: string, path?: string, sourceMap?: SourceMapData | null }, index: number, deleteCount: number, insert: any) {
	insert = String(insert)
	if (deleteCount === 0 && insert.length === 0) {
		return data
	}
	const document = new TextDocument(data.content, data.path, data.sourceMap)
	document.replace(index, index + deleteCount, insert)
	return document.generate()
}

/**
 * 替换指定的内容并更新源映射（Source Map）
 * @param data 要更新的数据
 * @param data.content 要更新的内容
 * @param data.path 内容的源路径，用于生成新的源映射
 * @param data.sourceMapData 内容的源映射
 * @param search 要搜索的内容
 * @param replacement 要替换的内容
 * @returns 返回替换后的数据
 */
export function replace(data: { content: string, path?: string, sourceMap?: SourceMapData | null }, search: string | RegExp, replacement: any | ((source: string, ...args: any[]) => string)) {
	if (search instanceof RegExp) {
		const document = new TextDocument(data.content, data.path, data.sourceMap)
		data.content.replace(search, (...args: any[]) => {
			const source = args[0] as string
			const index = args[args.length - 2] as number
			document.replace(index, index + source.length, typeof replacement === "string" ? replacement.replace(/\$([&1-9])/g, (source2, groupIndex: string) => {
				const groupIndexNumber = +groupIndex || 0
				return groupIndexNumber < args.length - 2 ? args[groupIndexNumber] : source2
			}) : typeof replacement === "function" ? (replacement as Function)(...args) : String(replacement))
			return ""
		})
		return document.generate()
	}
	const index = data.content.indexOf(search)
	if (index < 0) {
		return data
	}
	return splice(data, index, search.length, replacement)
}