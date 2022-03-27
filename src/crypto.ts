import { createHash, BinaryToTextEncoding } from "crypto"

/**
 * 计算指定数据的 MD5 值
 * @param data 要计算的字符串或二进制数据
 * @param encoding 要使用的编码，默认为 32 位小写十六进制字符串
 */
export function md5(data: string | Buffer, encoding: BinaryToTextEncoding = "hex") {
	const hash = createHash("md5")
	hash.update(data)
	return hash.digest(encoding)
}

/**
 * 计算指定数据的 SHA-1 值
 * @param data 要计算的字符串或二进制数据
 * @param encoding 要使用的编码，默认为 40 位小写十六进制字符串
 */
export function sha1(data: string | Buffer, encoding: BinaryToTextEncoding = "hex") {
	const hash = createHash("sha1")
	hash.update(data)
	return hash.digest(encoding)
}