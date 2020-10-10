/**
 * 使用 Base64 编码指定的数据
 * @param data 要编码的字符串或二进制数据
 */
export function encodeBase64(data: string | Buffer) {
	return (Buffer.isBuffer(data) ? data : Buffer.from(data)).toString("base64")
}

/**
 * 解码指定的 Base64 字符串，如果解码失败则返回空字符串
 * @param value 要解码的 Base64 字符串
 */
export function decodeBase64(value: string) {
	return Buffer.from(value, "base64").toString()
}

/**
 * 编码指定数据的统一资源标识符（URI）
 * @param mimeType 数据的 MIME 类型
 * @param data 要编码的字符串或二进制数据
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 */
export function encodeDataURI(mimeType: string, data: string | Buffer) {
	if (typeof data === "string") {
		return `data:${mimeType},${encodeURIComponent(data)}`
	}
	return `data:${mimeType};base64,${encodeBase64(data)}`
}

/**
 * 解码指定的统一资源标识符（URI），如果解码失败则返回 `null`
 * @param value 要解码的统一资源标识符（URI）
 */
export function decodeDataURI(value: string) {
	const match = /^data:([^,]*),/.exec(value)
	if (!match) {
		return null
	}
	let mimeType = match[1]
	let data: string | Buffer = value.substring(match[0].length)
	if (mimeType.endsWith(";base64")) {
		mimeType = mimeType.slice(0, -7 /*";base64".length*/)
		data = Buffer.from(data, "base64")
	} else {
		try {
			data = decodeURIComponent(data)
		} catch { }
	}
	return { mimeType, data }
}