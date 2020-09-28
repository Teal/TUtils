/**
 * 编码 CSS 中的特殊字符
 * @param value 要编码的字符串
 */
export function encodeCSS(value: string) {
	if (value === "-") {
		return "\\-"
	}
	let result = ""
	for (let i = 0; i < value.length; i++) {
		const char = value.charCodeAt(i)
		// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
		if (char <= 0x001F || char === 0x007F || (i <= 1 && char >= 0x0030 /*0*/ && char <= 0x0039 /*9*/ && (i === 0 || value.charCodeAt(0) === 0x002D /*-*/))) {
			result += `\\${char.toString(16)} `
			continue
		}
		if (char >= 0x0080 || char == 0x002D /*-*/ || char == 0x005F /*_*/ || char >= 0x0030 /*0*/ && char <= 0x0039 /*9*/ || char >= 0x0041 /*A*/ && char <= 0x005A /*Z*/ || char >= 0x0061 /*a*/ && char <= 0x007A /*z*/) {
			result += value.charAt(i)
			continue
		}
		// https://drafts.csswg.org/cssom/#escape-a-character
		result += `\\${value.charAt(i)}`
	}
	return result
}

/**
 * 解码 CSS 转义字符
 * @param value 要解码的字符串
 * @see http://dev.w3.org/csswg/css-syntax/#ident-token-diagram
 */
export function decodeCSS(value: string) {
	return value.replace(/\\(?:([\da-fA-F]{1,6})\s?|.)/sg, (source, unicode: string) => {
		if (unicode) {
			return String.fromCodePoint(parseInt(unicode, 16) || 0xFFFD)
		}
		return source.charAt(1)
	})
}

/**
 * 编码 CSS 字符串并添加引号
 * @param value 要编码的字符串
 * @param quote 要添加的引号，默认根据字符串自动推导
 */
export function quoteCSSString(value: string, quote = /[)'"]/.test(value) ? '"' : "") {
	let result = quote
	for (let i = 0; i < value.length; i++) {
		const char = value.charCodeAt(i)
		if (char <= 0x001F || char === 0x007F) {
			result += `\\${char.toString(16)} `
			continue
		}
		switch (char) {
			case 41 /*)*/:
			case 34 /*"*/:
			case 39 /*'*/:
				result += quote && char !== quote.charCodeAt(0) ? value.charAt(i) : `\\${value.charAt(i)}`
				continue
			case 92 /*\*/:
				result += `\\${value.charAt(i)}`
				continue
		}
		result += value.charAt(i)
	}
	result += quote
	return result
}

/**
 * 删除 CSS 字符串的引号并解码
 * @param value 要解码的字符串
 */
export function unquoteCSSString(value: string) {
	return decodeCSS(value.replace(/^(['"])(.*)\1$/s, "$2"))
}