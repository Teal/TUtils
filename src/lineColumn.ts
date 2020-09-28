/**
 * 计算指定索引对应的行列号
 * @param content 要计算的内容
 * @param index 要计算的索引（从 0 开始）
 */
export function indexToLineColumn(content: string, index: number) {
	if (index <= 0) {
		return { line: 0, column: index }
	}
	let line = 0
	let column = 0
	for (let i = 0; i < index; i++) {
		switch (content.charCodeAt(i)) {
			case 13 /*\r*/:
				if (content.charCodeAt(i + 1) === 10 /*\n*/) {
					i++
					if (index === i) {
						column++
						break
					}
				}
			// fall through
			case 10 /*\n*/:
				line++
				column = 0
				break
			default:
				column++
				break
		}
	}
	return { line, column } as LineColumn
}

/**
 * 计算指定行列号对应的索引（从 0 开始）
 * @param content 要计算的内容
 * @param location 要计算的行列号
 */
export function lineColumnToIndex(content: string, location: LineColumn) {
	if (location.line > 0) {
		let index = 0
		let line = 0
		outer: while (index < content.length) {
			switch (content.charCodeAt(index++)) {
				case 13 /*\r*/:
					if (content.charCodeAt(index) === 10 /*\n*/) {
						index++
					}
				// fall through
				case 10 /*\n*/:
					if (++line === location.line) {
						break outer
					}
					break
			}
		}
		return index + location.column
	}
	return location.column
}

/** 表示一个行列号 */
export interface LineColumn {
	/** 行号（从 0 开始）*/
	line: number
	/** 列号（从 0 开始）*/
	column: number
}

/** 表示每行第一个字符的映射表 */
export class LineMap extends Array<number> {

	/** 获取最后一个字符的索引 */
	readonly endIndex: number

	/** 获取或设置最后一次查询的索引 */
	lastIndex = 0

	/**
	 * 初始化新的映射表
	 * @param content 要计算的内容
	 */
	constructor(content: string) {
		super(1)
		this[0] = 0
		for (let i = 0; i < content.length; i++) {
			switch (content.charCodeAt(i)) {
				case 13 /*\r*/:
					if (content.charCodeAt(i + 1) === 10 /*\n*/) {
						i++
					}
				// fall through
				case 10 /*\n*/:
					this.push(i + 1)
					break
			}
		}
		this.endIndex = content.length
	}

	/**
	 * 计算指定索引对应的行列号
	 * @param index 要计算的索引（从 0 开始）
	 */
	indexToLineColumn(index: number) {
		if (index <= 0) {
			// 如果存在缓存，则重置缓存索引
			this.lastIndex = 0
			return { line: 0, column: index }
		}
		// 实际项目中，每次计算的位置都会比较靠近，所以每次都要记住本次搜索的位置，加速下次搜索
		let cacheIndex = this.lastIndex || 0
		while (cacheIndex < this.length - 1 && this[cacheIndex] <= index) {
			cacheIndex++
		}
		while (cacheIndex > 0 && this[cacheIndex] > index) {
			cacheIndex--
		}
		this.lastIndex = cacheIndex
		return { line: cacheIndex, column: index - this[cacheIndex] } as LineColumn
	}

	/**
	 * 计算指定行列号对应的索引（从 0 开始）
	 * @param location 要计算的行列号
	 */
	lineColumnToIndex(location: LineColumn) {
		if (location.line > 0) {
			if (location.line < this.length) {
				return this[location.line] + location.column
			}
			return this.endIndex + location.column
		}
		return location.column
	}

}

/**
 * 计算指定的行列号添加偏移后的行列号
 * @param location 要计算的行列号
 * @param line 要偏移的行数
 * @param column 要偏移的列数
 */
export function addLineColumn(location: LineColumn, line: number, column: number) {
	if (line) {
		return { line: location.line + line, column: column }
	}
	return { line: location.line, column: location.column + column }
}

/**
 * 比较确定两个行列号的顺序
 * @param x 要比较的第一个行列号
 * @param y 要比较的第二个行列号
 * @returns 如果两个行列号相同则返回 0，如果前者靠前，则返回负数，如果后者靠前，则返回正数
 */
export function compareLineColumn(x: LineColumn, y: LineColumn) {
	return (x.line - y.line) || (x.column - y.column)
}