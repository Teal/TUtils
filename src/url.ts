import { posix } from "path"
import { format, parse, resolve } from "url"

/**
 * 获取指定地址对应的绝对地址
 * @param base 要使用的基地址
 * @param url 要处理的地址
 * @example resolveURL("http://example.com", "foo") // "http://example.com/foo"
 */
export function resolveURL(base: string, url: string) {
	return resolve(base, url)
}

/**
 * 获取指定地址对应的相对地址
 * @param base 要使用的基地址
 * @param url 要处理的地址
 * @example relativeURL("http://example.com", "http://example.com/foo") // "foo"
 */
export function relativeURL(base: string, url: string) {
	// 忽略 data:... 等 URI
	if (/^[\w+\-\.\+]+:(?!\/)/.test(url)) {
		return url
	}
	const baseObject = parse(base, false, true)
	const urlObject = parse(url, false, true)
	// 协议不同，只能使用绝对路径
	if (baseObject.protocol !== urlObject.protocol) {
		return format(urlObject)
	}
	// 协议相同但主机（含端口）或用户名（含密码）不同，使用省略协议的绝对路径
	if (baseObject.host !== urlObject.host || baseObject.auth !== urlObject.auth) {
		if (urlObject.slashes) {
			delete urlObject.protocol
		}
		return format(urlObject)
	}
	// 两个地址必须都是相对路径或都是绝对路径，否则只能使用绝对路径
	if (baseObject.pathname && urlObject.pathname && (baseObject.pathname.charCodeAt(0) === 47 /*/*/) !== (urlObject.pathname.charCodeAt(0) === 47 /*/*/)) {
		return format(urlObject)
	}
	// 计算地址开头的相同部分，以 `/` 为界
	base = baseObject.pathname ? posix.normalize(baseObject.pathname) : ""
	url = urlObject.pathname ? posix.normalize(urlObject.pathname) : ""
	let index = -1
	let i = 0
	for (; i < base.length && i < url.length; i++) {
		const ch1 = base.charCodeAt(i)
		const ch2 = url.charCodeAt(i)
		if (ch1 !== ch2) {
			break
		}
		if (ch1 === 47 /*/*/) {
			index = i
		}
	}
	// 重新追加不同的路径部分
	let pathname = url.substring(index + 1) || (i === base.length ? "" : ".")
	for (let i = index + 1; i < base.length; i++) {
		if (base.charCodeAt(i) === 47 /*/*/) {
			pathname = pathname === "." ? "../" : `../${pathname}`
		}
	}
	return `${pathname}${urlObject.search || ""}${urlObject.hash || ""}`
}

/**
 * 规范化指定的地址
 * @param url 要处理的地址
 * @example normalizeURL("http://example.com/foo/../relative") // "http://example.com/relative"
 */
export function normalizeURL(url: string) {
	if (!url || /^[\w+\-\.\+]+:(?!\/)/.test(url)) {
		return url
	}
	const urlObject = parse(url, false, true)
	if (urlObject.pathname) {
		urlObject.pathname = posix.normalize(urlObject.pathname)
	}
	return format(urlObject)
}

/**
 * 判断指定的地址是否是绝对地址
 * @param url 要判断的地址
 * @example isAbsoluteURL("http://example.com/foo") // true
 */
export function isAbsoluteURL(url: string) {
	return /^(?:\/|[\w+\-\.\+]+:)/.test(url)
}

/**
 * 判断指定的地址是否是外部地址
 * @param url 要判断的地址
 * @example isExternalURL("http://example.com/foo") // true
 */
export function isExternalURL(url: string) {
	return /^([\w\-]*:)?\/\//.test(url)
}

/**
 * 如果地址是相对地址则更新基地址，否则返回原地址
 * @param base 要使用的基地址
 * @param url 要处理的地址
 * @example setBaseURL("foo", "base") // "base/foo"
 */
export function setBaseURL(url: string, base: string) {
	if (isAbsoluteURL(url)) {
		return url
	}
	return resolveURL(base + "/", url)
}

/**
 * 替换字符串中的地址
 * @param content 要处理的内容
 * @param replacement 要替换的内容，如果是字符串，则其中的 `$&` 代表匹配的地址
 * @param replacement.url 匹配的地址
 * @param replacement.index 本次匹配的地址在原内容的索引
 * @param replacement.return 返回替换的内容
 * @example replaceURL("请点击 http://example.com 继续", url => `<a href="${url}">${url}</a>`) // "请点击 <a href="http://example.com">http://example.com</a> 继续"
 */
export function replaceURL(content: string, replacement: string | ((url: string, index: number) => string)) {
	return content.replace(/\b((?:[a-z][\w\-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\((?:[^\s()<>]|(?:\([^\s()<>]+\)))*\))+(?:\((?:[^\s()<>]|(?:\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig, replacement as any)
}