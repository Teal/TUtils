import { encodeHTML, quoteHTMLAttribute } from "./html"

/**
 * 创建一段 HTML
 * @param type 标签名
 * @param props 所有属性列表
 * @param children 子节点
 */
export function jsx(type: string, props: { [key: string]: any } | null, ...children: any[]) {
	let html = ""
	if (type) {
		html += `<${type}`
		for (const key in props!) {
			const prop = props[key]
			if (prop != undefined) {
				if (typeof prop === "boolean") {
					if (prop) {
						html += ` ${key}`
					}
				} else {
					html += ` ${key}=${quoteHTMLAttribute(String(prop))}`
				}
			}
		}
		html += `>`
	}
	for (const child of children) {
		if (child != undefined) {
			if (typeof child === "string") {
				html += encodeHTML(child)
			} else if (Array.isArray(child)) {
				for (const child2 of child) {
					if (child2 != undefined) {
						html += typeof child2 === "string" ? encodeHTML(child2) : child2
					}
				}
			} else {
				html += child
			}
		}
	}
	if (type && !(type in noCloseTags)) {
		html += `</${type}>`
	}
	return new HTML(html)
}

/** 表示一段 HTML */
export class HTML extends String { }

/** 表示节点片段 */
export const Fragment = ""

/** 无需关闭的标签列表 */
export const noCloseTags = {
	meta: true,
	link: true,
	img: true,
	input: true,
	br: true,
	hr: true,
	area: true,
	col: true,
	command: true,
	embed: true,
	param: true,
	source: true,
	track: true,
	wbr: true,
	base: true,
	keygen: true,
}