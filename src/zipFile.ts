import { randomBytes } from "crypto"
import { readFileSync, statSync } from "fs"
import { resolve } from "path"
import { createDeflateRaw, createInflateRaw, deflateRawSync, inflateRawSync } from "zlib"
import { createDir, walk, writeFile } from "./fileSystemSync"
import { joinPath, relativePath, setExt } from "./path"

/**
 * 表示一个 Zip 文件，支持压缩和解压，不支持分卷
 * @see http://www.idea2ic.com/File_Formats/ZIP%20File%20Format%20Specification.pdf
 */
export class ZipFile {

	/** 所有 Zip 文件项 */
	readonly entries: ZipEntry[] = []

	/** 文件注释 */
	comment?: string

	/**
	 * 压缩当前文件
	 * @param password 使用的密码
	 */
	compress(password?: string | Buffer) {
		// 第一步：统计最终大小
		const entryDatas = new Array<{
			zip64: boolean
			versionMadeBy: number
			version: number
			flags: number
			compressionMethod: number
			lastModifiedTime: number
			crc: number
			compressedData: Buffer
			size: number
			fileName: Buffer
			extra?: Buffer
			comment?: Buffer
			diskNumberStart: number
			internalFileAttributes: number
			fileAttributes: number
			offset: number
		}>()
		let offset = 0
		let cenSize = 0
		for (let i = 0; i < this.entries.length; i++) {
			const entry = this.entries[i]
			const fileName = Buffer.from(entry.fileName ?? "")
			const compressedData = entry.compress(password)
			const comment = entry.comment ? Buffer.from(entry.comment as any, 0, 0xffff) : undefined
			const size = entry.orginalSize ?? (entry.data ? entry.data.length : 0)
			const zip64 = compressedData.length >= 0xffffffff || size >= 0xfffffff || offset >= 0xfffffffff
			const version = entry.version ?? (entry.compressionMethod === ZipCompressionMethod.stored ? 10 : 20)
			entryDatas.push({
				zip64,
				versionMadeBy: entry.versionMadeBy ?? (20 | (process.platform === "win32" ? 0x0a00 : 0x0300)),
				version: zip64 ? Math.max(version, 45) : version,
				flags: (entry.flags ?? 0) | ZipEntryFlags.utf8 | (password ? ZipEntryFlags.encrypted : 0),
				compressionMethod: entry.compressionMethod ?? ZipCompressionMethod.deflated,
				lastModifiedTime: entry.rawLastModifiedTime ?? dateToZipTime(new Date()),
				crc: entry.orginalCRC ?? (entry.data ? crc(entry.data) : 0),
				compressedData,
				size,
				fileName,
				extra: entry.extra,
				comment,
				diskNumberStart: entry.diskNumberStart ?? 0,
				internalFileAttributes: entry.internalFileAttributes ?? 0,
				fileAttributes: entry.fileAttributes ?? 0,
				offset
			})
			offset += 30 + fileName.length + (entry.extra ? entry.extra.length : 0) + compressedData.length
			cenSize += 46 + fileName.length + (entry.extra ? entry.extra.length : 0) + (comment ? comment.length : 0)
			if (zip64) {
				offset += 32
				cenSize += 32
			}
		}
		const cenOffset = offset
		const comment = this.comment ? Buffer.from(this.comment as any, 0, 0xffff) : undefined
		const zip64 = this.entries.length >= 0xffff || offset >= 0xffffffff
		// 第二步：写入文件区
		const buffer = Buffer.allocUnsafe(offset + cenSize + (zip64 ? 64 : 0) + 22 + (comment ? comment.length : 0))
		offset = 0
		for (const entry of entryDatas) {
			buffer.writeUInt32LE(0x04034b50 /* PK\003\004 */, offset)
			buffer.writeUInt16LE(entry.version, offset + 4)
			buffer.writeUInt16LE(entry.flags, offset + 6)
			buffer.writeUInt16LE(entry.compressionMethod, offset + 8)
			buffer.writeUInt32LE(entry.lastModifiedTime, offset + 10)
			buffer.writeUInt32LE(entry.crc, offset + 14)
			buffer.writeUInt32LE(Math.min(entry.compressedData.length, 0xffffffff), offset + 18)
			buffer.writeUInt32LE(Math.min(entry.size, 0xffffffff), offset + 22)
			buffer.writeUInt16LE(entry.fileName.length, offset + 26)
			buffer.writeUInt16LE((entry.zip64 ? 32 : 0) + (entry.extra ? entry.extra.length : 0), offset + 28)
			offset += 30
			entry.fileName.copy(buffer, offset)
			offset += entry.fileName.length
			if (entry.zip64) {
				buffer.writeUInt16LE(0x0001, offset)
				buffer.writeUInt16LE(28, offset + 2)
				buffer.writeBigUInt64LE(BigInt(entry.size), offset + 4)
				buffer.writeBigUInt64LE(BigInt(entry.compressedData.length), offset + 12)
				buffer.writeBigUInt64LE(BigInt(entry.offset), offset + 20)
				buffer.writeUInt32LE(entry.diskNumberStart, offset + 28)
				offset += 32
			}
			if (entry.extra) {
				entry.extra.copy(buffer, offset)
				offset += entry.extra.length
			}
			entry.compressedData.copy(buffer, offset)
			offset += entry.compressedData.length
		}
		// 第三步：写入目录区
		for (const entry of entryDatas) {
			buffer.writeUInt32LE(0x02014b50 /* PK\001\002 */, offset)
			buffer.writeUInt16LE(entry.versionMadeBy, offset + 4)
			buffer.writeUInt16LE(entry.version, offset + 6)
			buffer.writeUInt16LE(entry.flags, offset + 8)
			buffer.writeUInt16LE(entry.compressionMethod, offset + 10)
			buffer.writeUInt32LE(entry.lastModifiedTime, offset + 12)
			buffer.writeUInt32LE(entry.crc, offset + 16)
			buffer.writeUInt32LE(Math.min(entry.compressedData.length, 0xffffffff), offset + 20)
			buffer.writeUInt32LE(Math.min(entry.size, 0xffffffff), offset + 24)
			buffer.writeUInt16LE(entry.fileName.length, offset + 28)
			buffer.writeUInt16LE((entry.zip64 ? 32 : 0) + (entry.extra ? entry.extra.length : 0), offset + 30)
			buffer.writeUInt16LE(entry.comment ? entry.comment.length : 0, offset + 32)
			buffer.writeUInt16LE(Math.min(entry.diskNumberStart, 0xffff), offset + 34)
			buffer.writeUInt16LE(entry.internalFileAttributes, offset + 36)
			buffer.writeUInt32LE(entry.fileAttributes, offset + 38)
			buffer.writeUInt32LE(Math.min(entry.offset, 0xffffffff), offset + 42)
			offset += 46
			entry.fileName.copy(buffer, offset)
			offset += entry.fileName.length
			if (entry.zip64) {
				buffer.writeUInt16LE(0x0001, offset)
				buffer.writeUInt16LE(28, offset + 2)
				buffer.writeBigUInt64LE(BigInt(entry.size), offset + 4)
				buffer.writeBigUInt64LE(BigInt(entry.compressedData.length), offset + 12)
				buffer.writeBigUInt64LE(BigInt(entry.offset), offset + 20)
				buffer.writeUInt32LE(entry.diskNumberStart, offset + 28)
				offset += 32
			}
			if (entry.extra) {
				entry.extra.copy(buffer, offset)
				offset += entry.extra.length
			}
			if (entry.comment) {
				entry.comment.copy(buffer, offset)
				offset += entry.comment.length
			}
		}
		// 第四步：写入最终目录区
		if (zip64) {
			buffer.writeUInt32LE(0x06064b50, offset)
			buffer.writeBigInt64LE(BigInt(52), offset + 4)
			buffer.writeInt16LE(10, offset + 12)
			buffer.writeInt16LE(10, offset + 18)
			buffer.writeInt32LE(this.entries.length, offset + 20)
			buffer.writeInt32LE(this.entries.length, offset + 24)
			buffer.writeBigInt64LE(BigInt(cenSize), offset + 28)
			buffer.writeBigInt64LE(BigInt(cenOffset), offset + 36)
			buffer.writeUInt32LE(0x07064b50, offset + 44)
			buffer.writeInt32LE(this.entries.length, offset + 48)
			buffer.writeBigInt64LE(BigInt(offset), offset + 52)
			buffer.writeInt32LE(1, offset + 60)
			offset += 64
		}
		buffer.writeUInt32LE(0x06054b50, offset)
		buffer.writeUInt32LE(0, offset + 4)
		buffer.writeUInt16LE(this.entries.length, offset + 8)
		buffer.writeUInt16LE(this.entries.length, offset + 10)
		buffer.writeUInt32LE(cenSize, offset + 12)
		buffer.writeUInt32LE(cenOffset, offset + 16)
		buffer.writeUInt16LE(comment ? comment.length : 0, offset + 20)
		if (comment) {
			comment.copy(buffer, offset + 22)
		}
		return buffer
	}

	/**
	 * 解析 Zip 二进制数据
	 * @param buffer 要读取的缓存
	 */
	static fromBuffer(buffer: Buffer) {
		// 第一步：查找最后一个目录区
		let index = buffer.length - 22
		let max = Math.max(0, index - 0xffff)
		let bound = max
		let endOfCentralDirectoryEnd = buffer.length
		let endOfCentralDirectoryStart = endOfCentralDirectoryEnd
		let commentEnd = 0
		for (; index >= bound; index--) {
			if (buffer[index] !== 0x50 /* P */) continue
			const value = buffer.readUInt32LE(index)
			if (value === 0x06054b50 /* PK\x05\x06 */) {
				endOfCentralDirectoryStart = index
				commentEnd = index
				endOfCentralDirectoryEnd = index + 22
				bound = index - 20
				continue
			}
			if (value === 0x07064b50) {
				bound = max
				continue
			}
			if (value === 0x06064b50) {
				endOfCentralDirectoryStart = index
				endOfCentralDirectoryEnd = index + Number(buffer.readBigUInt64LE(index + 4)) + 12
				break
			}
		}
		// 第二步：解析最后一个目录区
		console.assert(endOfCentralDirectoryEnd - endOfCentralDirectoryStart === 22 && buffer.readUInt32LE(endOfCentralDirectoryStart) === 0x06054b50 ||
			endOfCentralDirectoryEnd - endOfCentralDirectoryStart >= 56 && buffer.readUInt32LE(endOfCentralDirectoryStart) === 0x06064b50, "Invalid END header (bad signature)")
		let volumeEntries: number
		let centralFileHeaderOffset: number
		let commentLength: number
		if (buffer.readUInt32LE(endOfCentralDirectoryStart) === 0x06054b50) {
			volumeEntries = buffer.readUInt16LE(endOfCentralDirectoryStart + 8)
			centralFileHeaderOffset = buffer.readUInt32LE(endOfCentralDirectoryStart + 16)
			commentLength = buffer.readUInt16LE(endOfCentralDirectoryStart + 20)
		} else {
			volumeEntries = Number(buffer.readBigUInt64LE(endOfCentralDirectoryStart + 24))
			centralFileHeaderOffset = Number(buffer.readBigUInt64LE(endOfCentralDirectoryStart + 48))
			commentLength = 0
		}
		const zip = new ZipFile()
		if (commentLength) {
			zip.comment = buffer.toString("utf-8", commentEnd + 22)
		}
		// 第三步：扫描目录区
		zip.entries.length = volumeEntries
		for (let i = 0; i < volumeEntries; i++) {
			const entry = zip.entries[i] = new ZipEntry()
			console.assert(buffer.readUInt32LE(centralFileHeaderOffset) === 0x02014b50 /* PK 01 02 */)
			entry.versionMadeBy = buffer.readUInt16LE(centralFileHeaderOffset + 4)
			entry.version = buffer.readUInt16LE(centralFileHeaderOffset + 6)
			entry.flags = buffer.readUInt16LE(centralFileHeaderOffset + 8)
			entry.compressionMethod = buffer.readUInt16LE(centralFileHeaderOffset + 10)
			entry.rawLastModifiedTime = buffer.readUInt32LE(centralFileHeaderOffset + 12)
			entry.orginalCRC = buffer.readUInt32LE(centralFileHeaderOffset + 16)
			let compressedSize = buffer.readUInt32LE(centralFileHeaderOffset + 20)
			entry.orginalSize = buffer.readUInt32LE(centralFileHeaderOffset + 24)
			const fileNameLength = buffer.readUInt16LE(centralFileHeaderOffset + 28)
			const extraLength = buffer.readUInt16LE(centralFileHeaderOffset + 30)
			const commentLength = buffer.readUInt16LE(centralFileHeaderOffset + 32)
			entry.diskNumberStart = buffer.readUInt16LE(centralFileHeaderOffset + 34)
			entry.internalFileAttributes = buffer.readUInt16LE(centralFileHeaderOffset + 36)
			entry.fileAttributes = buffer.readUInt32LE(centralFileHeaderOffset + 38)
			let localHeaderOffset = buffer.readUInt32LE(centralFileHeaderOffset + 42)
			let offset = centralFileHeaderOffset + 46
			entry.fileName = buffer.toString("utf-8", offset, offset += fileNameLength)
			if (extraLength) {
				const extra = entry.extra = buffer.subarray(offset, offset += extraLength)
				// 读取 Zip64 扩展信息
				for (let i = 0; i < extraLength;) {
					const signature = extra.readUInt16LE(i)
					const extraSize = extra.readUInt16LE(i + 2)
					if (signature === 0x0001) {
						entry.orginalSize = Number(extra.readBigUInt64LE(i + 4))
						compressedSize = Number(extra.readBigUInt64LE(i + 12))
						localHeaderOffset = Number(extra.readBigUInt64LE(i + 20))
						entry.diskNumberStart = extra.readUInt32LE(i + 28)
					}
					i += 4 + extraSize
				}
			}
			if (commentLength) {
				entry.comment = buffer.toString("utf-8", offset, offset += commentLength)
			}
			const localCompressedSize = buffer.readUInt32LE(localHeaderOffset + 18)
			const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
			const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
			const localDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength
			console.assert(localCompressedSize === 0 || localCompressedSize === compressedSize, `Central and local directory mismatch for file '${entry.fileName}'`)
			entry.compressedData = buffer.subarray(localDataOffset, localDataOffset + compressedSize)
			centralFileHeaderOffset += 46 + fileNameLength + extraLength + commentLength
		}
		return zip
	}

	/**
	 * 查找指定名称的项，如果找不到则返回 `undefined`
	 * @param fileName 文件名
	 */
	getEntry(fileName: string) {
		return this.entries.find(entry => entry.fileName === fileName)
	}

	/**
	 * 添加或覆盖项
	 * @param entry 项
	 */
	addEntry(entry: ZipEntry) {
		const index = this.entries.findIndex(other => other.fileName === entry.fileName)
		if (index >= 0) {
			this.entries[index] = entry
		} else {
			this.entries.push(entry)
		}
	}

	/**
	 * 删除指定的项，如果该项是文件夹则删除所有内部项
	 * @param fileName 项名
	 * @returns 如果已删除项则返回 `true`，如果项不存在返回 `false`
	 */
	deleteEntry(fileName: string) {
		const index = this.entries.findIndex(other => other.fileName === fileName)
		if (index < 0) {
			return false
		}
		const entry = this.entries[index]
		if (entry.isDirectory) {
			for (let i = this.entries.length - 1; i >= 0; i--) {
				if (this.entries[i].fileName.startsWith(entry.fileName)) {
					this.entries.splice(i, 1)
				}
			}
		} else {
			this.entries.splice(index, 1)
		}
	}

	/**
	 * 添加一个本地文件
	 * @param path 文件路径
	 * @param zipName Zip 内相对路径
	 * @param data 文件内容，如果为空则从硬盘读取
	 * @param stats 文件属性对象，如果为空则从硬盘读取
	 */
	addFile(path: string, zipName = path, data = readFileSync(path), stats = statSync(path)) {
		const entry = new ZipEntry()
		entry.fileName = zipName
		entry.data = data
		entry.lastModifiedTime = stats.mtime
		entry.fileAttributes = process.platform === "win32" ? 0 : (((entry.isDirectory ? 0x4000 : 0x8000) | stats.mode & 0xfff) << 16) >>> 0
		this.addEntry(entry)
		return entry
	}

	/**
	 * 在 Zip 内部创建文件夹
	 * @param zipName Zip 内相对路径
	 */
	createDir(zipName: string) {
		const entry = new ZipEntry()
		entry.fileName = zipName + "/"
		this.addEntry(entry)
		return entry
	}

	/**
	 * 添加一个本地文件夹
	 * @param path 文件路径
	 * @param zipName Zip 内相对路径
	 */
	addDir(path: string, zipName = "") {
		walk(path, {
			dir: (name) => {
				if (name === path) {
					return
				}
				this.createDir(joinPath(zipName, relativePath(path, name)))
			},
			file: (name) => {
				this.addFile(name, joinPath(zipName, relativePath(path, name)))
			}
		})
	}

	/**
	 * 解压所有文件到文件夹
	 * @param directory 目标文件夹
	 * @param override 是否覆盖已有的文件
	 * @param password 解压的密码
	 */
	extractAll(directory: string, override: boolean, password?: string) {
		let count = 0
		for (const entry of this.entries) {
			if (entry.extractTo(directory, undefined, override, password)) {
				count++
			}
		}
		return count
	}

	/**
	 * 异步压缩当前文件
	 * @param callback 压缩完成的回调函数
	 * @param onEntryStart 开始压缩项的回调函数
	 * @param onEntryEnd 结束压缩项的回调函数
	 * @param password 使用的密码
	 */
	compressAsync(callback: (buffer: Buffer) => void, onEntryStart?: (entry: ZipEntry, index: number) => void, onEntryEnd?: (entry: ZipEntry, index: number) => void, password?: string | Buffer) {
		let index = 0
		const next = () => {
			if (index === this.entries.length) {
				callback(this.compress(password))
				return
			}
			const entry = this.entries[index]
			onEntryStart?.(entry, index)
			entry.compressAsync(undefined, () => {
				onEntryEnd?.(entry, index)
				next()
			})
		}
		next()
	}

	/**
	 * 读取本地 Zip 文件
	 * @param path Zip 文件路径
	 */
	static fromFile(path: string) {
		return ZipFile.fromBuffer(readFileSync(path))
	}

}

/** 表示一个 Zip 文件内的一个文件或文件夹   */
export class ZipEntry {

	/** 压缩工具版本 */
	versionMadeBy: number

	/** 解压所需版本 */
	version: number

	/** 标记位 */
	flags: ZipEntryFlags

	/** 压缩方式 */
	compressionMethod: ZipCompressionMethod

	/** 最后修改时间（原始格式） */
	rawLastModifiedTime: number

	/** 最后修改时间 */
	get lastModifiedTime() { return zipTimeToDate(this.rawLastModifiedTime) }
	set lastModifiedTime(value) { this.rawLastModifiedTime = dateToZipTime(value) }

	/** 从压缩文件读取的 32 位数据校验码 */
	orginalCRC?: number

	/** 从压缩文件读取的原始文件大小 */
	orginalSize?: number

	/** 文件名 */
	fileName: string

	/** 扩展区数据 */
	extra?: Buffer

	/** 文件注释 */
	comment?: string

	/** 分块索引 */
	diskNumberStart: number

	/** 内部文件属性 */
	internalFileAttributes: number

	/** 外部文件属性 */
	fileAttributes: number

	/** 判断当前项是否是文件夹 */
	get isDirectory() {
		const lastChar = this.fileName.charCodeAt(this.fileName.length - 1)
		return lastChar === 47 /* / */ || lastChar === 92 /* \ */
	}

	/** 压缩后的数据 */
	private _compressedData?: Buffer

	/** 压缩前的数据 */
	private _data?: Buffer | null

	/** 压缩后的数据 */
	get compressedData() {
		return this.compress()
	}
	set compressedData(value) {
		this._compressedData = value
		this._data = undefined
	}

	/** 压缩前的数据 */
	get data() {
		return this.decompress()
	}
	set data(value) {
		this._data = value
		this._compressedData = undefined
	}

	/**
	 * 压缩当前文件
	 * @param password 密码 
	 */
	compress(password?: string | Buffer): Buffer {
		if (password) {
			const data = this.compress()
			if (!data.length) {
				return data
			}
			return encrypt(data, password)
		}
		if (this._compressedData !== undefined) {
			return this._compressedData
		}
		let data = this._data
		if (this.isDirectory || !data) {
			return this._compressedData = Buffer.allocUnsafe(0)
		}
		switch (this.compressionMethod) {
			case ZipCompressionMethod.stored:
				return this._compressedData = data
			case undefined:
			case ZipCompressionMethod.deflated:
				return this._compressedData = deflateRawSync(data)
			default:
				throw new Error(`Unsupported compression method: ${this.compressionMethod}`)
		}
	}

	/**
	 * 异步压缩当前文件
	 * @param password 密码
	 * @param callback 解压完成后的回调
	 */
	compressAsync(password?: string | Buffer, callback?: (data: Buffer) => void) {
		if (password) {
			return this.compressAsync(undefined, data => {
				if (!data.length) {
					return callback(data)
				}
				return callback(encrypt(data, password))
			})
		}
		if (this._compressedData !== undefined) {
			return callback(this._compressedData)
		}
		let data = this._data
		if (this.isDirectory || !data) {
			return callback(this._compressedData = Buffer.allocUnsafe(0))
		}
		switch (this.compressionMethod) {
			case ZipCompressionMethod.stored:
				return callback(this._compressedData = data)
			case undefined:
			case ZipCompressionMethod.deflated:
				return deflateRawAsync(data, data => {
					callback(this._compressedData = data)
				})
			default:
				throw new Error(`Unsupported compression method: ${this.compressionMethod}`)
		}
	}

	/**
	 * 解压当前文件
	 * @param password 密码 
	 */
	decompress(password?: string | Buffer) {
		if (this._data !== undefined) {
			return this._data
		}
		let compressedData = this._compressedData
		if (this.isDirectory || !compressedData) {
			return this._data = Buffer.allocUnsafe(0)
		}
		if (this.flags & ZipEntryFlags.encrypted) {
			compressedData = decrypt(compressedData, password ?? "")
		}
		switch (this.compressionMethod) {
			case ZipCompressionMethod.stored:
				return this._data = compressedData
			case ZipCompressionMethod.deflated:
			case undefined:
				return this._data = inflateRawSync(compressedData)
			default:
				throw new Error(`Unsupported compression method: ${this.compressionMethod}`)
		}
	}

	/**
	 * 异步解压当前文件
	 * @param password 密码 
	 * @param callback 解压完成后的回调
	 */
	decompressAsync(password?: string | Buffer, callback?: (data: Buffer) => void) {
		if (this._data !== undefined) {
			return callback(this._data)
		}
		let compressedData = this._compressedData
		if (this.isDirectory || !compressedData) {
			return callback(this._data = Buffer.allocUnsafe(0))
		}
		if (this.flags & ZipEntryFlags.encrypted) {
			compressedData = decrypt(compressedData, password ?? "")
		}
		switch (this.compressionMethod) {
			case ZipCompressionMethod.stored:
				return callback(this._data = compressedData)
			case ZipCompressionMethod.deflated:
			case undefined:
				return inflateRawAsync(compressedData, data => {
					callback(this._data = data)
				})
			default:
				throw new Error(`Unsupported compression method: ${this.compressionMethod}`)
		}
	}

	/**
	 * 解压当前文件到指定文件夹
	 * @param directory 文件夹
	 * @param name 文件名
	   * @param overwrite 是否允许覆盖现有的目标
	 * @param password 密码
	 */
	extractTo(directory: string, name = this.fileName, overwrite = true, password?: string | Buffer) {
		const fullPath = resolve(directory, name)
		if (this.isDirectory) {
			createDir(fullPath)
		} else {
			if (!writeFile(fullPath, this.decompress(password), overwrite)) {
				return false
			}
		}
		return true
	}

}

/** 表示 Zip 文件项标记位 */
export const enum ZipEntryFlags {
	/** 文件已加密 */
	encrypted = 0b1,
	/**
	 * 压缩附加选项1
	 * - 当压缩方法为 imploded，设置此标记位表示使用 8k 码表；否则表示使用 4k 码表
	 * - 当压缩方法为 deflated 或 enhancedDeflated，设置此标记位表示最快或最小，否则表示普通
	 */
	compressionOption1 = 0b10,
	/**
	 * 压缩附加选项2
	 * - 当压缩方法为 imploded，设置此标记位表示使用 3 个香农-范诺编码树；否则表示使用 2 个
	 * - 当压缩方法为 deflated 或 enhancedDeflated，设置此标记位表示更快压缩，否则表示更小压缩
	 */
	compressionOption2 = 0b100,
	/** CRC32 数据紧跟在压缩数据后，文件头对应位置为 0 */
	immediateCRC = 0b1000,
	/** 使用增强压缩，仅当压缩方法为 deflated 时有效 */
	enhancedDeflating = 0b10000,
	/** 已压缩的补丁数据 */
	patched = 0b100000,
	/** 安全密钥加密，必须先设置 {@link ZipEntryFlags.encripted}，当设置后解压所需版本至少为 50；如果使用 ASE 算法，则版本至少 51 */
	strongEncryption = 0b1000000,
	/** 文件名为 UTF8 编码 */
	utf8 = 0b100000000000,
	/** 使用增强加密压缩 */
	enhancedCompression = 0b1000000000000,
	/** 加密目录信息 */
	encryptedCentralDirectory = 0b10000000000000,
}

/** 表示 Zip 文件压缩方式 */
export const enum ZipCompressionMethod {
	/** 仅存储不压缩 */
	stored = 0,
	/** 压缩 */
	shrunk = 1,
	/** 一倍压缩 */
	reduced1 = 2,
	/** 二倍压缩 */
	reduced2 = 3,
	/** 三倍压缩 */
	reduced3 = 4,
	/** 四倍压缩 */
	reduced4 = 5,
	/** 极限压缩 */
	imploded = 6,
	/** 使用 GZip 算法 */
	deflated = 8,
	/** 使用增强 GZip 算法 */
	enhancedDeflated = 9,
	/** 使用 Pkware 算法 */
	pkware = 10,
	/** 使用 Bzip2 算法 */
	bzip2 = 12,
	/** 使用 Lzma 算法 */
	lzma = 14,
	/** 使用 IBM Terse 算法 */
	ibmTerse = 18,
	/** 使用 IBM Lz77 算法 */
	ibmLz77 = 19,
	/** 使用 WinZIP AES 算法 */
	aesEncrypt = 99,
}

/** 转换 Zip 时间为日期对象 */
function zipTimeToDate(time: number) {
	return new Date(((time >> 25) & 0x7f) + 1980, ((time >> 21) & 0x0f) - 1, (time >> 16) & 0x1f, (time >> 11) & 0x1f, (time >> 5) & 0x3f, (time & 0x1f) << 1)
}

/** 转换日期对象为 Zip 时间 */
function dateToZipTime(date: Date) {
	return (((date.getFullYear() - 1980) & 0x7f) << 25) | ((date.getMonth() + 1) << 21) | (date.getDate() << 16) | (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
}

/** 实现异步压缩算法 */
function deflateRawAsync(buffer: Buffer, callback: (buffer: Buffer) => void) {
	const df = createDeflateRaw()
	const buffers: Buffer[] = []
	let total = 0
	df.on("data", (data: Buffer) => {
		buffers.push(data)
		total += data.length
	})
	df.on("end", () => {
		callback(Buffer.concat(buffers, total))
	})
	df.end(buffer)
}

/** 实现异步解压算法 */
function inflateRawAsync(buffer: Buffer, callback: (buffer: Buffer) => void) {
	const inflater = createInflateRaw()
	const buffers: Buffer[] = []
	let total = 0
	inflater.on("data", data => {
		buffers.push(data)
		total += data.length
	})
	inflater.on("end", () => {
		callback(Buffer.concat(buffers, total))
	})
	inflater.end(buffer)
}

const crcTable = new Uint32Array(256).map((t, c) => {
	for (let i = 0; i < 8; i++) {
		if ((c & 1) !== 0) {
			c = 0xedb88320 ^ (c >>> 1)
		} else {
			c >>>= 1
		}
	}
	return c >>> 0
})

/**
 * 计算数据的 32 位校验码
 * @param buffer 要计算的缓存
 */
export function crc(buffer: Buffer) {
	let crc = ~0
	for (let i = 0; i < buffer.length;) {
		crc = crcTable[(crc ^ buffer[i++]) & 0xff] ^ (crc >>> 8)
	}
	return ~crc >>> 0
}

class ZipCryptor {
	readonly keys: Uint32Array
	constructor(password: string | Buffer) {
		const pass = Buffer.from(password)
		this.keys = new Uint32Array([0x12345678, 0x23456789, 0x34567890])
		for (let i = 0; i < pass.length; i++) {
			this.update(pass[i])
		}
	}
	update(byteValue: number) {
		const keys = this.keys
		keys[0] = crcTable[(keys[0] ^ byteValue) & 0xff] ^ (keys[0] >>> 8)
		keys[1] += keys[0] & 0xff
		keys[1] = (Math.imul(keys[1], 134775813) >>> 0) + 1
		keys[2] = crcTable[(keys[2] ^ (keys[1] >>> 24)) & 0xff] ^ (keys[2] >>> 8)
		return byteValue
	}
	next() {
		const k = (this.keys[2] | 2) >>> 0
		return (Math.imul(k, k ^ 1) >> 8) & 0xff
	}
	decrypt(data: Buffer) {
		const result = Buffer.alloc(data.length)
		let pos = 0
		for (const c of data) {
			result[pos++] = this.update(c ^ this.next())
		}
		return result
	}
	encrypt(data: Buffer, result = Buffer.alloc(data.length), pos = 0) {
		for (const c of data) {
			const k = this.next()
			result[pos++] = c ^ k
			this.update(c)
		}
		return result
	}
}

function decrypt(data: Buffer, password: string | Buffer) {
	const decrypter = new ZipCryptor(password)
	decrypter.decrypt(data.subarray(0, 12))
	return decrypter.decrypt(data.subarray(12))
}

function encrypt(data: Buffer, password: string | Buffer) {
	const result = Buffer.allocUnsafe(data.length + 12)
	const encrypter = new ZipCryptor(password)
	const salt = randomBytes(12)
	encrypter.encrypt(salt, result)
	return encrypter.encrypt(data, result, 12)
}

/**
 * 解压指定的 Zip 文件到文件夹
 * @param path Zip 文件路径
 * @param directory 目标文件夹，默认和文件同名
 * @param override 是否覆盖已有的文件
 * @param password 解压的密码
 */
export function extractZip(path: string, directory = setExt(path, ""), override?: boolean, password?: string) {
	return ZipFile.fromFile(path).extractAll(directory ?? setExt(path, ""), override, password)
}

/**
 * 压缩指定的文件夹为 Zip 文件
 * @param directory 目标文件夹
 * @param path Zip 文件路径，默认和文件同名
 * @param comment 文件注释
 * @param password 压缩的密码
 */
export function compressFolder(directory: string, path = directory + ".zip", comment?: string, password?: string) {
	const zipFile = new ZipFile()
	zipFile.addDir(directory)
	zipFile.comment = comment
	writeFile(path, zipFile.compress(password))
	return zipFile
}