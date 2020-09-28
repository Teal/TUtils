/**
 * 编码 JavaScript 中的特殊字符
 * @param value 要编码的字符串
 */
export function encodeJS(value: string) {
	return quoteJSString(value, "")
}

/**
 * 解码 JavaScript 转义字符
 * @param value 要解码的字符串
 */
export function decodeJS(value: string) {
	return value.replace(/\\(?:x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{([\da-fA-F]+)\}|.)/sg, (source, hex?: string, unicode?: string, unicodeCodePoint?: string) => {
		if (source.length > 2) {
			return String.fromCodePoint(parseInt(hex || unicode || unicodeCodePoint!, 16))
		}
		switch (source.charCodeAt(1)) {
			case 34 /*"*/:
				return '\"'
			case 39 /*'*/:
				return "'"
			case 92 /*\*/:
				return "\\"
			case 10 /*\n*/:
			case 13 /*\r*/:
				return ""
			case 110 /*n*/:
				return "\n"
			case 114 /*r*/:
				return "\r"
			case 118 /*v*/:
				return "\v"
			case 116 /*t*/:
				return "\t"
			case 98 /*b*/:
				return "\b"
			case 102 /*f*/:
				return "\f"
			case 48 /*0*/:
				return "\0"
			default:
				return source.charAt(1)
		}
	})
}

/**
 * 编码 JavaScript 字符串并添加引号
 * @param value 要编码的字符串
 * @param quote 要添加的引号，默认根据字符串自动推导
 */
export function quoteJSString(value: string, quote = value.includes('"') && !value.includes("'") ? "'" : '"') {
	return `${quote}${value.replace(/["'`\\\n\r\t\0\v\b\f\u2028\u2029]/g, char => {
		switch (char.charCodeAt(0)) {
			case 34 /*"*/:
			case 39 /*'*/:
			case 96 /*`*/:
				return quote && char.charCodeAt(0) !== quote.charCodeAt(0) ? char : `\\${char}`
			case 10 /*\n*/:
				return "\\n"
			case 13 /*\r*/:
				return "\\r"
			case 9/*\t*/:
				return "\\t"
			case 0/*\0*/:
				return "\\0"
			case 11 /*\v*/:
				return "\\v"
			case 8 /*\b*/:
				return "\\b"
			case 12 /*\f*/:
				return "\\f"
			case 0x2028:
				return "\\u2028"
			case 0x2029:
				return "\\u2029"
			default:
				return `\\${char}`
		}
	})}${quote}`
}

/**
 * 删除 JavaScript 字符串的引号并解码
 * @param value 要解码的字符串
 */
export function unquoteJSString(value: string) {
	return decodeJS(value.replace(/^(['"`])(.*)\1$/s, "$2"))
}