/**
 * 编码 HTML 中的特殊字符
 * @param value 要编码的字符串
 * @desc > [i] 此函数仅编码 `<`、`>` 和 `&`
 */
export function encodeHTML(value: string) {
	return value.replace(/[<>&]/g, toHTMLEntity)
}

/**
 * 获取指定字符对应的 HTML 转义字符
 * @param char 要处理的字符
 */
function toHTMLEntity(char: string) {
	switch (char.charCodeAt(0)) {
		case 60 /*<*/: return "&lt;"
		case 62 /*>*/: return "&gt;"
		case 38 /*&*/: return "&amp;"
		case 34 /*"*/: return "&quot;"
		case 39 /*'*/: return "&apos;"
		default: return `&#x${char.codePointAt(0)!.toString(16)};`
	}
}

/**
 * 解码 HTML 转义字符
 * @param value 要解码的字符串
 */
export function decodeHTML(value: string) {
	// 在 HTML 4.1 规范中，实体符号的 `;` 是可选的
	// 但在 HTML5 规范中，实体符号区分大小写，且 `;` 是必须的
	// 为降低复杂度、提升性能，不考虑兼容历史代码
	return value.replace(/&(#(\d+)|#x([\da-f]+)|\w+);/ig, (source, entity?: string, unicode?: string, hex?: string) => {
		if (unicode) {
			return String.fromCodePoint(parseInt(unicode))
		}
		if (hex) {
			return String.fromCodePoint(parseInt(hex, 16))
		}
		// https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references
		switch (entity) {
			case "amp": return "&"
			case "lt": return "<"
			case "gt": return ">"
			case "quot": return "\""
			case "apos": return "'"
			case "nbsp": return "\u00A0"
			default: return require("./data/htmlEntities.json")[entity!] || source
		}
	})
}

/**
 * 编码 HTML 属性值并添加引号
 * @param value 要编码的字符串
 * @param quote 要添加的引号，默认根据字符串自动推导
 */
export function quoteHTMLAttribute(value: string, quote = value.includes('"') && !value.includes("'") ? "'" : '"') {
	return `${quote}${value.replace(quote.charCodeAt(0) === 34 /*"*/ ? /["&]/g : quote.charCodeAt(0) === 39 /*'*/ ? /['&]/g : /["'&<>=\s]/g, toHTMLEntity)}${quote}`
}

/**
 * 删除 HTML 属性值的引号并解码
 * @param value 要解码的字符串
 */
export function unquoteHTMLAttribute(value: string) {
	return decodeHTML(value.replace(/^(['"])(.*)\1$/s, "$2"))
}