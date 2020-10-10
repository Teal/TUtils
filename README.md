# TUtils
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]

TUtils 提供了 200+ 个 Node.js 上常用的工具函数库，比如通配符、文件监听、网络库等。

只要你在开发 Node.js 上的应用，就很可能会用到 TUtils 提供的功能，包括且不限于服务端、命令行工具和 Electron 软件。

## 特性
1. 【强大】**30+** 个模块，顶 **140+** 个 NPM 依赖，每个模块可单独引用；
2. 【轻量】无外部依赖，所有源码含注释不超过 **400K**；
3. 【稳定】大量的单元测试(覆盖率 **90%+**)和生产实践，测试用例和社区同步；
4. 【性能】鉴于功能专一，几乎所有模块在性能上稳超 NPM 社区模块；
5. 【文档】完美全中文文档，VSCode/WebStorm/VS 等可智能提示。

## 为什么要重做轮子
1. **追求纯净**：不要为了一个简单功能，依赖几十个包；只支持 Node 最新稳定版(LTS)，无历史包袱；
2. **追求简洁**：一个需求对应一种最短实现，而不是提供各种用法让用户按习惯选择；
3. **追求性能**：每个模块只专注自身功能，不做多余的操作，减少硬盘读写和内存消耗；
4. **追求统一**：统一的命名和设计，可以做到举一反三，过目不忘，而不用每次都要翻文档；
5. **追求方便**：一次安装，即可直接使用所有功能；
6. 很多 NPM 包对中日韩文支持不好。

TUtils 总体上提供了“一站式”的使用方式，为你省去在 NPM 上查找、对比模块的烦恼。

## 安装
```bash
npm install tutils --save
```

> 注意：TUtils 基于 ES2018 编写，仅支持 Node v10.12 或更高版本。

一行代码引用所有模块：
```js
const tutils = require("tutils")
```

或者，单独引入任一模块：
```js
const fsSync = require("tutils/fileSystemSync")
const fs = require("tutils/fileSystem")
const mfs = require("tutils/memoryFileSystem")
const watcher = require("tutils/fileSystemWatcher")
const matcher = require("tutils/matcher")
const path = require("tutils/path")

const request = require("tutils/request")
const server = require("tutils/httpServer")
const ws = require("tutils/webSocket")
const net = require("tutils/net")
const url = require("tutils/url")

const ps = require("tutils/process")
const vm = require("tutils/vm")
const worker = require("tutils/workerPool")

const ansi = require("tutils/ansi")
const commandLine = require("tutils/commandLine")
const logger = require("tutils/logger")

const base64 = require("tutils/base64")
const crypto = require("tutils/crypto")
const html = require("tutils/html")
const js = require("tutils/js")
const json = require("tutils/json")
const css = require("tutils/css")

const lineColumn = require("tutils/lineColumn")
const sourceMap = require("tutils/sourceMap")
const textWriter = require("tutils/textWriter")
const textDocument = require("tutils/textDocument")

const asyncQueue = require("tutils/asyncQueue")
const deferred = require("tutils/deferred")
const eventEmitter = require("tutils/eventEmitter")

const require = require("tutils/require")
const resolver = require("tutils/resolver")
const tpl = require("tutils/tpl")
const misc = require("tutils/misc")
```

## API 文档
[点击查看生成的 API 文档](https://tpack.github.io/tutils/globals.html)

## 模块列表

### 目录
- 文件操作
	- [fileSystemSync](#filesystemsync)：文件操作（同步）
	- [fileSystem](#filesystem)：文件操作（异步）
	- [memoryFileSystem](#memoryfilesystem)：文件操作（内存模拟）
	- [fileSystemWatcher](#filesystemwatcher)：监听
	- [matcher](#matcher)：通配符
	- [path](#path)：路径计算
- 网络
	- [request](#request)：发送 HTTP/HTTPS 请求
	- [httpServer](#httpserver)：HTTP 服务器封装
	- [webSocket](#websocket)：WebSocket 服务端和客户端
	- [net](#net)：底层网络相关的工具函数
	- [url](#url)：地址计算
- 进程
	- [process](#process)：进程操作
	- [vm](#vm)：JS 沙盒
	- [workerPool](#workerpool)：线程池
- 命令行
	- [ansi](#ansi)：命令行颜色、格式
	- [commandLine](#commandline)：命令行操作
	- [logger](#logger)：日志记录器
- 编码、解析
	- [base64](#base64)：Base64 和 DataURI 编码
	- [crypto](#crypto)：MD5 和 SHA-1 加密
	- [html](#html)：HTML 编码和解码
	- [js](#js)：JS 编码和解码
	- [json](#json)：JSON 编码和解码
	- [css](#css)：CSS 编码和解码
- 生成代码
	- [lineColumn](#linecolumn)：行列号和索引换算
	- [sourceMap](#sourcemap)：读写源映射（Source Map）
	- [textWriter](#textwriter)：字符串拼接和生成源映射（Source Map）
	- [textDocument](#textdocument)：字符串编辑和生成源映射（Source Map）
- 异步
	- [asyncQueue](#asyncqueue)：串行执行多个异步任务
	- [deferred](#deferred)：同时等待多个异步任务
	- [eventEmitter](#eventemitter)：支持异步的事件触发器
- 其它
	- [require](#require)：Node require 定制
	- [resolver](#resolver)：模块解析器
	- [jsx](#jsx)：服务端 JSX 渲染
	- [tpl](#tpl)：模板引擎
	- [misc](#misc)：其它语言级别的工具函数，比如格式化日期

### 文件操作

#### fileSystemSync
提供创建、移动、复制、搜索文件和文件夹相关的工具函数，所有函数均可放心地直接调用。

```js
const fs = require("tutils/fileSystemSync")

// 判断存在
fs.existsFile("dir/foo.txt") // 判断文件是否存在
fs.existsDir("dir") // 判断文件夹是否存在
fs.getStat("dir/foo") // 读取路径信息，比如是否是文件夹，大小、最后修改时间

// 读取文件
fs.readFile("dir/foo.jpg") // 读取二进制文件，返回 Buffer
fs.readText("dir/foo.txt") // 读取文本文件，返回字符串
fs.readText("dir/foo.txt", false) // 读取文本文件，如果文件不存在返回 null，而不是报错

// 写入文件
fs.writeFile("dir/foo.txt", "Hello world") // 覆盖已有文件，如果文件不存在则自动创建
fs.writeFile("dir/foo.txt", "Hello world", false) // 不覆盖已有文件
fs.appendFile("dir/foo.txt", "Hello world") // 追加到文件末尾

// 复制和移动文件
fs.copyFile("dir/foo.txt", "dir/copied.txt") // 比先读取再写入快
fs.moveFile("dir/foo.txt", "dir/moved.txt") // 比先复制再删除快

// 删除文件
fs.deleteFile("dir/foo.txt") // 如果文件不存在则忽略

// 遍历文件夹
fs.glob("*.txt") // 搜索当前文件夹下所有 .txt 文件
fs.glob(["*.{js,jsx}", "!node_modules"], "dir") // 搜索 dir 文件夹下所有 .js/.jsx 文件，并忽略 node_modules
fs.readDir("dir") // 读取文件夹下的文件列表（仅一级）
fs.walk("dir", { // 更底层地遍历
	file(path) {
		console.log("发现文件：", path)
	},
	dir(path) {
		console.log("发现文件夹：", path)
	}
})

// 创建文件夹
fs.createDir("dir") // 文件夹已存在则忽略
fs.createTempDir() // 在系统临时目录创建空文件夹
fs.ensureDirExists("dir/foo.txt") // 确保所在文件夹存在

// 复制和移动文件夹
fs.copyDir("dir", "copied") // 比先读取再写入快
fs.moveDir("dir", "moved") // 比先复制再删除快

// 删除文件夹
fs.deleteDir("dir") // 自动删除内部所有子文件和文件夹
fs.cleanDir("dir") // 清空文件夹，比先删除再创建快
fs.deleteParentDirIfEmpty("dir/foo.txt") // 删除空文件夹
```

> ##### 为什么不使用 Node.js 自带的 `fs` 模块？
> 自带的 `fs` 模块更接近操作系统底层，在有些细节上并不合需求，比如创建文件时，无法自动创建所在文件夹；读取文本文件时不跳过 BOM 字符；遍历、复制文件夹时不支持递归；如果你对操作系统不熟，很可能踩坑。

#### fileSystem
类似 `fileSystemSync`，提供创建、移动、复制、搜索文件和文件夹相关的工具函数，但是异步的（更快），所有函数均需要使用 `await` 语法等待结果。

```js
const { FileSystem } = require("tutils/fileSystem")
const fs = new FileSystem()

// 之后用法同 fileSystemSync，唯一区别是需要加 await
await fs.writeFile("foo.txt", "Hello world")
```

| npm 包名            | TUtils 对应的函数/类                            |
| ------------------- | ----------------------------------------------- |
| `graceful-fs`       | `FileSystem`                                    |
| `fs-extra`          | `FileSystem`                                    |
| `graceful-fs-extra` | `FileSystem`                                    |
| `mkdirp`            | `FileSystem.createDir`                          |
| `make-dir`          | `FileSystem.createDir`                          |
| `cp-file`           | `FileSystem.copFile`                            |
| `cpy`               | `FileSystem.copFile`                            |
| `ncp`               | `FileSystem.copyDir`                            |
| `copy-files-tree`   | `FileSystem.copyDir`                            |
| `clean-dir`         | `FileSystem.cleanDir`                           |
| `delete`            | `FileSystem.deleteDir`                          |
| `del`               | `FileSystem.deleteDir`                          |
| `rimraf`            | `FileSystem.deleteDir`, `FileSystem.deleteFile` |
| `node-glob`         | `FileSystem.glob`                               |
| `fast-glob`         | `FileSystem.glob`                               |
| `globby`            | `FileSystem.glob`                               |
| `glob-all`          | `FileSystem.glob`                               |
| `walker`            | `FileSystem.walk`                               |
| `walkdir`           | `FileSystem.walk`                               |
| `move-file`         | `FileSystem.moveFile`                           |
| `path-exists`       | `FileSystem.existsFile`, `FileSystem.existsDir` |

#### memoryFileSystem
内存文件系统提供了和 `FileSystem` 完全相同的接口，但它会将数据保存到内存，避免多次硬盘读写。

使用 `MemoryFileSystem` 可以在不改变程序逻辑的情况下，实现类似 `git --dry-run` 或 `npm publish --dry-run` 的功能。

```js
const { MemoryFileSystem } = require("tutils/memoryFileSystem")
const fs = new MemoryFileSystem()

// 之后用法同 fileSystem
await fs.writeFile("foo.txt", "Hello world")
```

| npm 包名    | TUtils 对应的函数/类 |
| ----------- | -------------------- |
| `memory-fs` | `MemoryFileSystem`   |
| `mem-fs`    | `MemoryFileSystem`   |
| `memfs`     | `MemoryFileSystem`   |

#### fileSystemWatcher
监听文件的新增、修改和删除。

- 支持 Windows/OSX/Linux
- 可同时监听多个目标，且监听列表可动态增删
- 支持非轮询的监听方式（性能高、占用内存小）
- 支持忽略特定路径（以提高性能）
- 支持暂停和恢复
- 纯 JS 实现，不会安装失败

```js
const { FileSystemWatcher } = require("tutils/fileSystemWatcher")

const watcher = new FileSystemWatcher({
	ignore: [".DS_Store", "Desktop.ini", "Thumbs.db", "ehthumbs.db", "*~", "*.tmp", ".git", ".vs", "node_modules"]
})
watcher.on("change", path => { console.log("修改：", path) })
watcher.on("delete", path => { console.log("删除：", path) })
watcher.on("create", path => { console.log("创建：", path) })
watcher.on("createDir", path => { console.log("创建文件夹：", path) })
watcher.on("deleteDir", path => { console.log("删除文件夹：", path) })
watcher.add(process.cwd(), () => { console.log("开始监听...") })

// 可以继续监听第二个文件夹，根文件夹必须已存在
watcher.add("dir", () => { console.log("添加监听...") })
```

> ##### 为什么不使用 Node.js 自带的 `fs.watch`？
> 自带的 `fs` 拥有诸多限制，比如可能误报、不稳定。
> `FileSystemWatcher` 内部依然使用了自带的 `fs.watch`，但做了很多判断使得结果更符合作者预期。

| npm 包名    | TUtils 对应的函数/类 |
| ----------- | -------------------- |
| `chokidar`  | `FileSystemWatcher`  |
| `gaze`      | `FileSystemWatcher`  |
| `sane`      | `FileSystemWatcher`  |
| `watchpack` | `FileSystemWatcher`  |

#### matcher
判断路径是否符合规则，支持通配符、正则和自定义函数。

通配符语法同 `.gitignore` 文件，支持以下功能：
- `?`: 匹配固定一个字符，但 `/` 和文件名开头的 `.` 除外
- `*`: 匹配任意个字符，但 `/` 和文件名开头的 `.` 除外
- `**`: 匹配任意个字符，但文件名开头的 `.` 除外
- `[abc]`: 匹配方括号中的任一个字符
- `[a-z]`: 匹配 a 到 z 的任一个字符
- `[!abc]`: 匹配方括号中的任一个字符以外的字符
- `{abc,xyz}`: 匹配大括号中的任一种模式
- `\`: 表示转义字符，如 `\[` 表示 `[` 按普通字符处理
- `!xyz`：如果通配符以 `!` 开头，表示排除匹配的项，注意如果排除了父文件夹，出于性能考虑，无法重新包含其中的子文件

```js
const matcher = require("tutils/matcher")

// 判断是否匹配
matcher.match("/path.js", "/*.js") // true
matcher.match("/path.js", [/\.js/, "!node_modules"]) // true
```

| npm 包名      | TUtils 对应的函数/类 |
| ------------- | -------------------- |
| `glob`        | `Matcher`            |
| `node-glob`   | `Matcher`            |
| `matcher `    | `Matcher`, `match`   |
| `minimatch`   | `match`              |
| `micromatch`  | `match`              |
| `anymatch`    | `match`              |
| `glob-base`   | `Matcher.base`       |
| `glob-parent` | `Matcher.base`       |
| `is-glob`     | `isGlob`             |

#### path
对文件路径的操作，扩充 Node.js 自带 `path` 模块的功能。

> 注意本模块只处理路径字符串，并不会真的访问硬盘。

```js
const path = require("tutils/path")

// 路径格式化
path.resolvePath("foo/goo/hoo", "../relative") // 转绝对路径
path.relativePath("foo/goo/hoo", "../relative") // 转相对路径
path.joinPath("foo/goo/hoo", "../relative") // 合并路径
path.normalizePath("foo/goo/hoo/../relative") // 规范化路径
path.isAbsolutePath("foo/goo/hoo") // 是否是绝对路径

// 读写文件夹
path.getDir("/root/foo.txt") // "/root"
path.setDir("/root/foo.txt", "goo") // "goo/foo.txt"
path.getRoot("/root/goo/foo.txt") // "/root"
path.setRoot("/root/goo/foo.txt", "/user") // "/user/goo/foo.txt"

// 读写文件名
path.getName("/root/foo.txt") // "foo.txt"
path.setName("/root/foo.txt", "goo.jpg") // "/root/goo.jpg"
path.prependName("foo/goo.txt", "fix_") // "foo/fix_goo.txt"
path.appendName("foo/goo.src.txt", "_fix") // "foo/goo_fix.src.txt"
path.appendIndex("foo/goo.src.txt") // "foo/goo_2.src.txt"

// 读写扩展名
path.getExt("/root/foo.txt")
path.setExt("/root/foo.txt", ".jpg") // "/root/foo.jpg"

// 路径判断
path.pathEquals("/root", "/root") // 判断路径是否相同，在 Windows 忽略大小写
path.containsPath("/root", "/root/foo") // 判断路径父子包含关系
path.deepestPath("/root", "/root/foo") // 获取最深路径
path.commonDir("/root/foo", "/root/foo/goo") // 获取公共文件夹
```

| npm 包名           | TUtils 对应的函数/类 |
| ------------------ | -------------------- |
| `rename-extension` | `setExt`             |
| `changefilesname`  | `setName`            |
| `is-relative`      | `isAbsolutePath`     |
| `is-absolute`      | `isAbsolutePath`     |
| `normalize-path`   | `normalizePath`      |
| `path-is-inside`   | `containsPath`       |
| `contains-path`    | `containsPath`       |

### 网络

#### request
在 Node.js 提供类似发送 Ajax 请求的功能。
```js
const request = require("tutils/request")

// 最简单的请求
console.log((await request.request("https://www.baidu.com")).text)

// POST 一个 json 接口，并保存 Cookie
const cookieJar = new request.CookieJar()
const response = await request.request("/api/post", {
	method: "POST",
	dataType: "json",
	data: {
		foo: 1
	},
	headers: {
		"X-Request-With": "XMLHTTPRequest"
	},
	cookieJar: cookieJar
})
console.log(response.json)
```

| npm 包名          | TUtils 对应的函数/类 |
| ----------------- | -------------------- |
| `request`         | `request`            |
| `got`             | `request`            |
| `axios`           | `request`            |
| `wreck`           | `request`            |
| `cookiejar`       | `CookieJar`          |
| `touch-cookiejar` | `CookieJar`          |

#### httpServer
创建一个 HTTP 服务器，提供 Cookie、文件上传、Session 会话等扩展功能。

```js
const httpServer = require("tutils/httpServer")

const server = new httpServer.HTTPServer({}, (req, res) => {
	res.end(req.href)
})
server.listen(8080)
```

| npm 包名          | TUtils 对应的函数/类  |
| ----------------- | --------------------- |
| `express`         | `HTTPServer`          |
| `koa`             | `HTTPServer`          |
| `http-server`     | `HTTPServer`          |
| `body-parser`     | `HTTPRequest.body`    |
| `cookie-parser`   | `HTTPRequest.cookies` |
| `cookie-sessions` | `HTTPServer.sessions` |
| `multipart`       | `HTTPRequest.files`   |

#### webSocket
创建一个 WebSocket 服务器，同浏览器端原生 WebSocket 通信。

```js
const webSocket = require("tutils/webSocket")

const server = new webSocket.WebSocketServer("ws://localhost:8080")
server.start()
server.on("connection", ws => {
	ws.send("hello")
})

const client = new webSocket.WebSocket("ws://localhost:8080")
client.on("message", data => {
	console.log(data)
	client.send("hello")
})
```

| npm 包名           | TUtils 对应的函数/类 |
| ------------------ | -------------------- |
| `ws`               | `WebSocket`          |
| `websocket-driver` | `WebSocket`          |

#### net
提供网络相关的工具函数。

```js
const net = require("tutils/net")

console.log(net.remoteIP()) // 打印本机 IP
```

| npm 包名    | TUtils 对应的函数/类 |
| ----------- | -------------------- |
| `public-ip` | `remoteIP`           |

#### url
对网络地址的操作，扩充 Node.js 自带 `url` 模块的功能。

```js
const url = require("tutils/url")

// 地址格式化
url.resolveURL("http://example.com", "foo") // 转绝对地址
url.relativeURL("http://example.com", "http://example.com/foo") // 转相对地址
path.normalizeURL("http://example.com/foo/../relative") // 规范化地址
path.isAbsoluteURL("http://example.com/foo") // 是否是绝对地址

// 查找并替换地址
url.replaceURL("请点击 http://example.com 继续", url => `<a href="${url}">${url}</a>`) // "请点击 <a href="http://example.com">http://example.com</a> 继续"
```

| npm 包名           | TUtils 对应的函数/类 |
| ------------------ | -------------------- |
| `resolve-pathname` | `resolveURL`         |
| `relative-url`     | `relativeURL`        |
| `normalize-url`    | `normalizeURL`       |
| `is-relative-url`  | `isAbsoluteURL`      |
| `get-urls`         | `replaceURL`         |
| `linkify-it`       | `replaceURL`         |

### 进程

#### process
启动子进程、设置当前进程退出回调。

```js
const process = require("tutils/process")

// 执行命令
process.exec("echo hi")

// 打开浏览器
process.open("http://tealui.com")

// 设置进程退出后的回调，可通过 process.offExit 解绑
process.onExit(() => {
	console.log("退出了")
})
```

| npm 包名      | TUtils 对应的函数/类 |
| ------------- | -------------------- |
| `cross-spawn` | `exec`               |
| `execa`       | `exec`               |
| `open`        | `open`               |
| `signal-exit` | `onExit`, `offExit`  |

#### vm
在沙盒中执行指定的 JavaScript 代码。类似 `eval`，但不能访问当前范围的变量。

> 注意本函数不提供安全隔离，不能用于执行不信任的代码

```js
const vm = require("tutils/vm")
vm.runInVM(`var x = 1`)
```

#### workerPool
线程池，可以利用多核 CPU 同时执行多个复杂计算。

```js
const { WorkerPool } = require("tutils/workerPool")

const pool = new WorkerPool(data => data[0] + data[1]) // 这个函数将在子线程执行，函数无法使用闭包
await pool.exec([1, 2]) // 3
```

| npm 包名              | TUtils 对应的函数/类 |
| --------------------- | -------------------- |
| `worker-threads-pool` | `WorkerPool`         |

### 命令行

#### ansi
提供命令行输出内容的格式化功能。

```js
const ansi = require("tutils/ansi")

// 颜色
console.log(ansi.color("红色", ansi.ANSIColor.red))
console.log(ansi.backgroundColor("红色", ansi.ANSIColor.red))
console.log(ansi.removeANSICodes("...")) // 删除颜色

// 格式化（支持中文）
console.log(ansi.truncateString("很长的内容", "...")) // 超出命令行宽度则截断
console.log(ansi.wrapString("很长的内容")) // 超出命令行宽度则换行
console.log(ansi.formatList(["a", "ab"])) // 显示一个列表
console.log(ansi.formatTree([{indent: 0, label: "x"}, {indent: 1, label: "x1"}])) // 显示一个树
console.log(ansi.formatTable([["a", "ab"], ["a2", "ab2"]])) // 显示一个表格
console.log(ansi.formatCodeFrame("var a = 1\nvar b = 2", 1, 8) // 显示一段代码，带行号
console.log(ansi.ansiToHTML("")) // 转 HTML，保留颜色和其它格式
```

| npm 包名               | TUtils 对应的函数/类               |
| ---------------------- | ---------------------------------- |
| `ansi-color`           | `color`                            |
| `ansi-colors`          | `color`                            |
| `chalk`                | `bold`, `color`, `backgroundColor` |
| `kleur`                | `bold`, `color`, `backgroundColor` |
| `ansi-style-codes`     | `ANSIColor`                        |
| `ansi-regex`           | `ansiCodeRegExp`                   |
| `strip-ansi`           | `removeANSICodes`                  |
| `strip-color`          | `removeANSICodes`                  |
| `ansi-stripper`        | `removeANSICodes`                  |
| `cli-truncate`         | `truncateString`                   |
| `ansi-color-table`     | `formatTable`                      |
| `chunk-text`           | `wrapString`                       |
| `wrap-ansi`            | `wrapString`                       |
| `cli-columns`          | `formatList`                       |
| `console-log-tree`     | `formatTree`                       |
| `ansi-color-table`     | `formatTable`                      |
| `columnify`            | `formatTable`                      |
| `formatter-codeframe`  | `formatCodeFrame`                  |
| `ansicolor`            | `ansiToHTML`                       |
| `ansi-to-html`         | `ansiToHTML`                       |
| `ansi-html`            | `ansiToHTML`                       |
| `stream-ansi2html`     | `ansiToHTML`                       |
| `string-width`         | `getStringWidth`                   |
| `monospace-char-width` | `getCharWidth`                     |

#### commandLine
提供命令行操作。

```js
const commandLine = require("tutils/commandLine")

// 光标
commandLine.hideCursor() // 隐藏光标，使用 commandLine.showCursor() 还原

// 清空命令行
commandLine.clear()

// 解析命令行参数
commandLine.parseCommandLineArguments()

// 格式化帮助命令
commandLine.formatCommandLineOptions({
	"--x": {
		"alias": "-x",
		"description": "说明"
	}
})

// 读取命令行输入
const name = await commandLine.input("请输入名字：")
console.log(name)

const choice = await commandLine.select(["打开", "关闭"], "请选择一个：")
console.log(choice)
```

| npm 包名               | TUtils 对应的函数/类                                    |
| ---------------------- | ------------------------------------------------------- |
| `show-terminal-cursor` | `showCursor`                                            |
| `hide-terminal-cursor` | `hideCursor`                                            |
| `cli-cursor`           | `showCursor`, `hideCursor`                              |
| `restore-cursor`       | `showCursor`                                            |
| `meow`                 | `parseCommandLineArguments`, `formatCommandLineOptions` |
| `yargs`                | `parseCommandLineArguments`, `formatCommandLineOptions` |
| `clear-cli`            | `clear`                                                 |
| `node-console-input`   | `input`                                                 |

### `logger`
```js
const { Logger } = require("tutils/logger")
const logger = new Logger()

// 打印
logger.fatal("Hello world")
logger.error("Hello world")
logger.warning("Hello world")
logger.info("Hello world")
logger.success("Hello world")
logger.log("Hello world")
logger.debug("Hello world")
logger.trace("Hello world")

// 进度条
logger.showProgress("载入中") // 使用 logger.hideProgress() 隐藏

const taskId = loggger.begin("读取文件")
// ...执行读取文件操作...
logger.end(taskId)
```

| npm 包名    | TUtils 对应的函数/类 |
| ----------- | -------------------- |
| `logger`    | `Logger`             |
| `fancy-log` | `Logger`             |

### 编码、解析

#### base64
快速实现 Base64 编码，中文会先编码。

```js
const base64 = require("tutils/base64")

base64.encodeBase64("")
base64.decodeBase64("")

base64.encodeDataURI("") // 生成 base64 的 data: 地址
base64.decodeDataURI("data: image/png;base64, ...") // 读取 base64 的 data: 地址
```

| npm 包名     | TUtils 对应的函数/类             |
| ------------ | -------------------------------- |
| `js-base64`  | `encodeBase64`, `decodeBase64`   |
| `data-urlse` | `encodeDataURI`, `decodeDataURI` |

#### crypto
快速实现加密算法。

```js
const crypto = require("tutils/crypto")

crypto.md5("x") // 计算 MD5 值
crypto.sha1("x") // 计算 SHA-1 值
```

| npm 包名 | TUtils 对应的函数/类 |
| -------- | -------------------- |
| `md5`    | `md5`                |
| `sha1`   | `sha1`               |

#### html
```js
const html = require("tutils/html")
```

| npm 包名               | TUtils 对应的函数/类       |
| ---------------------- | -------------------------- |
| `ent`                  | `encodeHTML`, `decodeHTML` |
| `entities`             | `encodeHTML`, `decodeHTML` |
| `he`                   | `encodeHTML`, `decodeHTML` |
| `html-entities`        | `encodeHTML`               |
| `decode-html`          | `decodeHTML`               |
| `html-decoder`         | `decodeHTML`               |
| `html-entity-decoder`  | `decodeHTML`               |
| `html-encoder-decoder` | `encodeHTML`, `decodeHTML` |
| `html-parser`          | `parseHTML`                |

#### js
```js
const js = require("tutils/js")
```

| npm 包名           | TUtils 对应的函数/类 |
| ------------------ | -------------------- |
| `js-string-escape` | `encodeJS`           |

#### json
```js
const json = require("tutils/json")

// 读取 JSON
json.readJSON("path.json") // 支持注释和末尾多余的逗号
json.normalizeJSON("path.json") // 删除 JSON 字符串中的注释和末尾多余的逗号

// 写入 JSON
json.writeJSON("path.json", {}) // 安全写入 JSON 数据
```

| npm 包名              | TUtils 对应的函数/类 |
| --------------------- | -------------------- |
| `strip-json-comments` | `normalizeJSON`      |
| `load-json-file`      | `readJSON`           |
| `write-json-file`     | `writeJSON`          |

#### css
```js
const css = require("tutils/css")
```

| npm 包名 | TUtils 对应的函数/类 |
| -------- | -------------------- |
| `cssesc` | `encodeCSS`          |

### 生成代码

#### lineColumn
计算行列号

```js
const lineColumn = require("tutils/lineColumn")

lineColumn.indexToLineColumn("", 0)
```

| npm 包名            | TUtils 对应的函数/类                     |
| ------------------- | ---------------------------------------- |
| `find-line-column`  | `indexToLineColumn`, `lineColumnToIndex` |
| `lines-and-columns` | `LineMap`                                |

#### sourceMap
读写 Source Map。

```js
const sourceMap = require("tutils/sourceMap")

// 修改源映射
const map = new sourceMap.SourceMapBuilder({ /* 已存在的 map*/ })
map.addMapping(1, 2)
const output = map.toJSON() // 生成的新 map
```

| npm 包名             | TUtils 对应的函数/类              |
| -------------------- | --------------------------------- |
| `source-map`         | `SourceMapBuilder`                |
| `convert-source-map` | `SourceMapBuilder`                |
| `merge-source-map`   | `SourceMapBuilder.applySourceMap` |

#### textWriter
同时生成代码及 Source Map。

```js
const { TextWriter, SourceMapTextWriter } = require("tutils/textWriter")

const writer = new SourceMapTextWriter()
writer.write("hello")

console.log(writer.toString())
console.log(writer.sourceMap)
```

| npm 包名                | TUtils 对应的函数/类  |
| ----------------------- | --------------------- |
| `string-builder`        | `TextWriter`          |
| `source-list-map`       | `SourceMapTextWriter` |
| `fast-sourcemap-concat` | `SourceMapTextWriter` |

#### textDocument
动态修改、拼接字符串并生成 Source Map。

```js
const { TextDocument, replace, insert } = require("tutils/textDocument")

const data = replace({
	content: "var a = 1",
	path: "source.js"
}, /\bvar\b/g, "let")
console.log(data.content)
console.log(data.sourceMap)
```

| npm 包名       | TUtils 对应的函数/类 |
| -------------- | -------------------- |
| `magic-string` | `TextDocument`       |

### 异步

#### asyncQueue
串联执行异步任务。

```js
const { AsyncQueue } = require("tutils/asyncQueue")

const asyncQueue = new AsyncQueue()
await asyncQueue.then(async () => { /* 异步操作 1 */ })
await asyncQueue.then(async () => { /* 异步操作 2 */ })
await asyncQueue.then(async () => { /* 异步操作 3 */ })
```

| npm 包名          | TUtils 对应的函数/类 |
| ----------------- | -------------------- |
| `asyncqueue`      | `AsyncQueue`         |
| `node-asyncqueue` | `AsyncQueue`         |

#### deferred
类似 `Promise`，但可以更灵活地阻塞和回复。

```js
const { Deferred } = require("tutils/deferred")

const deferred = new Deferred()
deferred.reject() // 开始执行异步操作
setTimeout(() => {
	deferred.resolve() // 异步操作结束
}, 2000)

await deferred
```

| npm 包名   | TUtils 对应的函数/类 |
| ---------- | -------------------- |
| `deferred` | `Deferred`           |

#### eventEmitter
同原生的 `events` 模块，但支持异步事件。
```js
const { EventEmitter } = require("tutils/eventEmitter")

const events = new EventEmitter()
events.on("error", data => console.log(data))  // 绑定 error 事件
await events.emit("error", "hello")            // 触发 error 事件，输出 hello
```

| npm 包名   | TUtils 对应的函数/类 |
| ---------- | -------------------- |
| `events`   | `EventEmitter`       |
| `tappable` | `EventEmitter`       |

### 其它

#### require
允许直接载入 ES 模块代码；允许载入全局安装的模块。

```js
const { registerESMLoader, addGlobalPath } = require("tutils/require")

registerESMLoader()
require("./esm.js")

addGlobalPath("dir") // require 时会从 dir 搜索模块
```

| npm 包名         | TUtils 对应的函数/类 |
| ---------------- | -------------------- |
| `esm`            | `registerESMLoader`  |
| `require-global` | `addGlobalPath`      |

#### `resolver` 模块
类似 `require.resolve`，但可提供更多的配置选择。

```js
const { Resolver } = require("tutils/resolver")

const resolver = new Resolver()
const result = await resolver.resolve("tutils", process.cwd())
```

| npm 包名           | TPack-Utils 对应的函数/类 |
| ------------------ | ------------------------- |
| `enhanced-resolve` | `Resolver`                |

#### jsx
```jsx
const {jsx, Fragment} = require("tutils/jsx")

/** @jsx jsx */
/** @jsxFrag Fragment */
var div = <button id="my" disabled>Hello World</button>
console.log(div)
```

#### tpl
```js
const tpl = require("tutils/tpl")

tpl.compileTPL(`{$.data + 2}`)({data: 1}) // "3"
```

| npm 包名 | TUtils 对应的函数/类 |
| -------- | -------------------- |
| `ejs`    | `compileTPL`         |

#### misc
```js
const misc = require("tutils/misc")

misc.stripBOM("...") // 删除字符串开头的 UTF-8 BOM 字符
misc.randomString() // 生成指定长度的随机字符串
misc.insertSorted() // 插入排序
misc.formatDate(new Date("2016/01/01 00:00:00")) // 格式化指定的日期对象
misc.formatRelativeDate(new Date("2016/01/01 00:00:00")) // 格式化时间为类似“几分钟前”的格式
misc.formatHRTime(process.hrtime()) // 格式化时间间隔
misc.formatSize(1024) // 格式化字节大小，1KB
```

| npm 包名               | TUtils 对应的函数/类 |
| ---------------------- | -------------------- |
| `strip-bom`            | `stripBOM`           |
| `sorted-array-type`    | `insertSorted`       |
| `escape-string-regexp` | `escapeRegExp`       |
| `format-date`          | `formatDate`         |
| `dateformat`           | `formatDate`         |
| `Moment.js`            | `formatDate`         |
| `node-dateformate`     | `formatDate`         |
| `pretty-hrtime`        | `formatHRTime`       |
| `pretty-time`          | `formatHRTime`       |
| `pretty-bytes`         | `formatSize`         |
| `pretty-size`          | `formatSize`         |

[npm-url]: https://www.npmjs.com/package/tutils
[npm-image]: https://img.shields.io/npm/v/tutils.svg
[downloads-image]: https://img.shields.io/npm/dm/tutils.svg
[downloads-url]: http://badge.fury.io/js/tutils
[travis-url]: https://travis-ci.org/Teal/TUtils
[travis-image]: https://img.shields.io/travis/Teal/TUtils.svg
[coveralls-url]: https://coveralls.io/github/Teal/TUtils
[coveralls-image]: https://img.shields.io/coveralls/Teal/TUtils/master.svg