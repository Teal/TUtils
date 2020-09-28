import { networkInterfaces } from "os"

/**
 * 获取本机的远程 IP
 * @param ipV6 如果为 `true` 则返回 IPv6 地址，如果为 `false` 则返回 IPv6 地址，默认优先返回 IPv4 地址
 */
export function remoteIP(ipV6?: boolean) {
	const ifaces = networkInterfaces()
	let ipV6Address: string | undefined
	for (const key in ifaces) {
		for (const iface of ifaces[key]) {
			if (iface.internal) {
				continue
			}
			if (iface.family !== "IPv4") {
				if (ipV6 === true) {
					return iface.address
				}
				if (ipV6 !== false) {
					ipV6Address ??= iface.address
				}
				continue
			}
			return iface.address
		}
	}
	return ipV6Address
}