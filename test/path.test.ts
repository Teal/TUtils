import * as assert from "assert"
import { resolve, sep } from "path"
import * as path from "../src/path"

export namespace pathTest {

	export function resolvePathTest() {
		assert.strictEqual(path.resolvePath("xyz"), process.cwd() + sep + "xyz")

		assert.strictEqual(path.resolvePath(""), process.cwd())
		assert.strictEqual(path.resolvePath("."), process.cwd())
		assert.strictEqual(path.resolvePath("goo/.."), process.cwd())
		assert.strictEqual(path.resolvePath(".foo"), process.cwd() + sep + ".foo")
		assert.strictEqual(path.resolvePath("foo"), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("goo/../foo/goo.txt"), process.cwd() + sep + "foo" + sep + "goo.txt")

		assert.strictEqual(path.resolvePath("./"), process.cwd())
		assert.strictEqual(path.resolvePath("goo/../"), process.cwd())
		assert.strictEqual(path.resolvePath(".foo/"), process.cwd() + sep + ".foo")
		assert.strictEqual(path.resolvePath("foo/"), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("goo/../foo/goo.txt/"), process.cwd() + sep + "foo" + sep + "goo.txt")

		assert.strictEqual(path.resolvePath("", ""), process.cwd())
		assert.strictEqual(path.resolvePath("", "."), process.cwd())
		assert.strictEqual(path.resolvePath("", "goo/.."), process.cwd())
		assert.strictEqual(path.resolvePath("", ".foo"), process.cwd() + sep + ".foo")
		assert.strictEqual(path.resolvePath("", "foo"), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("", "goo/../foo/goo.txt"), process.cwd() + sep + "foo" + sep + "goo.txt")

		assert.strictEqual(path.resolvePath(".", ""), process.cwd())
		assert.strictEqual(path.resolvePath(".", "."), process.cwd())
		assert.strictEqual(path.resolvePath(".", "goo/.."), process.cwd())
		assert.strictEqual(path.resolvePath(".", ".foo"), process.cwd() + sep + ".foo")
		assert.strictEqual(path.resolvePath(".", "foo"), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath(".", "goo/../foo/goo.txt"), process.cwd() + sep + "foo" + sep + "goo.txt")

		assert.strictEqual(path.resolvePath("./", ""), process.cwd())
		assert.strictEqual(path.resolvePath("./", "."), process.cwd())
		assert.strictEqual(path.resolvePath("./", "goo/.."), process.cwd())
		assert.strictEqual(path.resolvePath("./", ".foo"), process.cwd() + sep + ".foo")
		assert.strictEqual(path.resolvePath("./", "foo"), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("./", "goo/../foo/goo.txt"), process.cwd() + sep + "foo" + sep + "goo.txt")

		assert.strictEqual(path.resolvePath("foo", ""), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("foo", "."), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("foo", ".."), process.cwd())
		assert.strictEqual(path.resolvePath("foo", ".goo"), process.cwd() + sep + "foo" + sep + ".goo")
		assert.strictEqual(path.resolvePath("foo", "goo"), process.cwd() + sep + "foo" + sep + "goo")
		assert.strictEqual(path.resolvePath("foo", "../goo/hoo.txt"), process.cwd() + sep + "goo" + sep + "hoo.txt")

		assert.strictEqual(path.resolvePath("foo/", ""), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("foo/", "."), process.cwd() + sep + "foo")
		assert.strictEqual(path.resolvePath("foo/", ".."), process.cwd())
		assert.strictEqual(path.resolvePath("foo/", ".goo"), process.cwd() + sep + "foo" + sep + ".goo")
		assert.strictEqual(path.resolvePath("foo/", "goo"), process.cwd() + sep + "foo" + sep + "goo")
		assert.strictEqual(path.resolvePath("foo/", "../goo/hoo.txt"), process.cwd() + sep + "goo" + sep + "hoo.txt")

		assert.strictEqual(path.resolvePath("goo/../foo/goo", "../hoo/koo"), process.cwd() + sep + "foo" + sep + "hoo" + sep + "koo")
		assert.strictEqual(path.resolvePath("goo/../foo/goo/", "../hoo/koo/"), process.cwd() + sep + "foo" + sep + "hoo" + sep + "koo")
		assert.strictEqual(path.resolvePath("goo/../foo/goo.txt", "../hoo/koo.txt"), process.cwd() + sep + "foo" + sep + "hoo" + sep + "koo.txt")

		if (sep === "\\") {
			assert.strictEqual(path.resolvePath("C:\\Windows\\System32", "b"), "C:\\Windows\\System32\\b")
			assert.strictEqual(path.resolvePath("C:\\Windows\\System32\\", "b"), "C:\\Windows\\System32\\b")
			assert.strictEqual(path.resolvePath("C:\\Windows/System32", "b\\d"), "C:\\Windows\\System32\\b\\d")
			assert.strictEqual(path.resolvePath("C:\\Windows/System32", "../abc/d"), "C:\\Windows\\abc\\d")
			assert.strictEqual(path.resolvePath("d:/root/", "c:/../a"), "c:\\a")
			assert.strictEqual(path.resolvePath("d:\\a/b\\c/d", ""), "d:\\a\\b\\c\\d")
			assert.strictEqual(path.resolvePath("c:/ignore", "c:/some/file"), "c:\\some\\file")
			assert.strictEqual(path.resolvePath("\\\\server\\root", "relative\\"), "\\\\server\\root\\relative")
		}
	}

	export function relativePathTest() {
		assert.strictEqual(path.relativePath("foo/x", "foo/y"), "../y")

		assert.strictEqual(path.relativePath("", ""), "")
		assert.strictEqual(path.relativePath("", "."), "")
		assert.strictEqual(path.relativePath("", ".."), "..")
		assert.strictEqual(path.relativePath("", ".foo"), ".foo")
		assert.strictEqual(path.relativePath("", "foo"), "foo")
		assert.strictEqual(path.relativePath("", "../foo/goo.txt"), "../foo/goo.txt")

		assert.strictEqual(path.relativePath(".", ""), "")
		assert.strictEqual(path.relativePath(".", "."), "")
		assert.strictEqual(path.relativePath(".", ".."), "..")
		assert.strictEqual(path.relativePath(".", ".foo"), ".foo")
		assert.strictEqual(path.relativePath(".", "foo"), "foo")
		assert.strictEqual(path.relativePath(".", "../foo/goo.txt"), "../foo/goo.txt")

		assert.strictEqual(path.relativePath(".", ""), "")
		assert.strictEqual(path.relativePath(".", "./"), "")
		assert.strictEqual(path.relativePath(".", "../"), "..")
		assert.strictEqual(path.relativePath(".", ".foo/"), ".foo")
		assert.strictEqual(path.relativePath(".", "foo/"), "foo")
		assert.strictEqual(path.relativePath(".", "../foo/goo.txt/"), "../foo/goo.txt")

		assert.strictEqual(path.relativePath("./", ""), "")
		assert.strictEqual(path.relativePath("./", "./"), "")
		assert.strictEqual(path.relativePath("./", "../"), "..")
		assert.strictEqual(path.relativePath("./", ".foo/"), ".foo")
		assert.strictEqual(path.relativePath("./", "foo/"), "foo")
		assert.strictEqual(path.relativePath("./", "../foo/goo.txt/"), "../foo/goo.txt")

		assert.strictEqual(path.relativePath("foo", "foo"), "")
		assert.strictEqual(path.relativePath("foo", "foo2"), "../foo2")
		assert.strictEqual(path.relativePath("foo", "../foo/goo"), "../../foo/goo")
		assert.strictEqual(path.relativePath("foo/goo", "foo/goo"), "")
		assert.strictEqual(path.relativePath("foo/goo", "foo/goo/hoo/koo.txt"), "hoo/koo.txt")

		assert.strictEqual(path.relativePath("foo/", "foo"), "")
		assert.strictEqual(path.relativePath("foo/", "foo2"), "../foo2")
		assert.strictEqual(path.relativePath("foo/", "../foo/goo"), "../../foo/goo")
		assert.strictEqual(path.relativePath("foo/goo/", "foo/goo"), "")
		assert.strictEqual(path.relativePath("foo/goo/", "foo/goo/hoo/koo.txt"), "hoo/koo.txt")

		assert.strictEqual(path.relativePath("foo/", "foo/"), "")
		assert.strictEqual(path.relativePath("foo/", "foo2/"), "../foo2")
		assert.strictEqual(path.relativePath("foo/", "../foo/goo/"), "../../foo/goo")
		assert.strictEqual(path.relativePath("foo/goo/", "foo/goo/"), "")
		assert.strictEqual(path.relativePath("foo/goo/", "foo/goo/hoo/koo.txt/"), "hoo/koo.txt")

		assert.strictEqual(path.relativePath(process.cwd(), resolve("foo/goo.txt")), "foo/goo.txt")
	}

	export function joinPathTest() {
		assert.strictEqual(path.joinPath("foo/..", "goo.js"), "goo.js")

		assert.strictEqual(path.joinPath(""), "")
		assert.strictEqual(path.joinPath("."), "")
		assert.strictEqual(path.joinPath("./"), "./")
		assert.strictEqual(path.joinPath(".foo"), ".foo")
		assert.strictEqual(path.joinPath(".."), "..")
		assert.strictEqual(path.joinPath("../"), "../")
		assert.strictEqual(path.joinPath("foo.js"), "foo.js")
		assert.strictEqual(path.joinPath("./foo.js"), "foo.js")
		assert.strictEqual(path.joinPath("foo/../goo.js"), "goo.js")
		assert.strictEqual(path.joinPath("**/*.js"), "**/*.js")
		assert.strictEqual(path.joinPath("./**/*.js"), "**/*.js")
		assert.strictEqual(path.joinPath("./fixtures///d/../b/c.js"), "fixtures/b/c.js")
		assert.strictEqual(path.joinPath("foo//goo//../koo"), "foo/koo")
		assert.strictEqual(path.joinPath("foo//goo//./koo"), "foo/goo/koo")
		assert.strictEqual(path.joinPath("foo//goo//."), "foo/goo")
		assert.strictEqual(path.joinPath("foo//goo//.//"), "foo/goo/")
		assert.strictEqual(path.joinPath("p/a/b/c/../../../x/y/z"), "p/x/y/z")
		assert.strictEqual(path.joinPath("a/b/c/../../../x/y/z"), "x/y/z")

		if (sep === "\\") {
			assert.strictEqual(path.joinPath("c:/../a/b/c"), "c:\\a\\b\\c")
			assert.strictEqual(path.joinPath("C:\\Windows\\System32"), "C:\\Windows\\System32")
		}
	}

	export function normalizePathTest() {
		assert.strictEqual(path.normalizePath("foo/../goo.js"), "goo.js")

		assert.strictEqual(path.normalizePath(""), "")
		assert.strictEqual(path.normalizePath("."), "")
		assert.strictEqual(path.normalizePath("./"), "./")
		assert.strictEqual(path.normalizePath(".foo"), ".foo")
		assert.strictEqual(path.normalizePath(".."), "..")
		assert.strictEqual(path.normalizePath("../"), "../")
		assert.strictEqual(path.normalizePath("foo.js"), "foo.js")
		assert.strictEqual(path.normalizePath("./foo.js"), "foo.js")
		assert.strictEqual(path.normalizePath("foo/../goo.js"), "goo.js")
		assert.strictEqual(path.normalizePath("**/*.js"), "**/*.js")
		assert.strictEqual(path.normalizePath("./**/*.js"), "**/*.js")
		assert.strictEqual(path.normalizePath("./fixtures///d/../b/c.js"), "fixtures/b/c.js")
		assert.strictEqual(path.normalizePath("foo//goo//../koo"), "foo/koo")
		assert.strictEqual(path.normalizePath("foo//goo//./koo"), "foo/goo/koo")
		assert.strictEqual(path.normalizePath("foo//goo//."), "foo/goo")
		assert.strictEqual(path.normalizePath("foo//goo//.//"), "foo/goo/")
		assert.strictEqual(path.normalizePath("p/a/b/c/../../../x/y/z"), "p/x/y/z")
		assert.strictEqual(path.normalizePath("a/b/c/../../../x/y/z"), "x/y/z")

		if (sep === "\\") {
			assert.strictEqual(path.normalizePath("c:/../a/b/c"), "c:\\a\\b\\c")
			assert.strictEqual(path.normalizePath("C:\\Windows\\System32"), "C:\\Windows\\System32")
		}
	}

	export function isAbsolutePathTest() {
		assert.strictEqual(path.isAbsolutePath("/"), true)

		assert.strictEqual(path.isAbsolutePath("directory/directory"), false)
		assert.strictEqual(path.isAbsolutePath("directory\\directory"), false)
		assert.strictEqual(path.isAbsolutePath("/home/foo"), true)
		assert.strictEqual(path.isAbsolutePath("/home/foo/.."), true)
		assert.strictEqual(path.isAbsolutePath("bar/"), false)
		assert.strictEqual(path.isAbsolutePath("./baz"), false)

		if (sep === "\\") {
			assert.strictEqual(path.isAbsolutePath("\\\\server\\file"), true)
			assert.strictEqual(path.isAbsolutePath("\\\\server"), true)
			assert.strictEqual(path.isAbsolutePath("\\\\"), true)
			assert.strictEqual(path.isAbsolutePath("c"), false)
			assert.strictEqual(path.isAbsolutePath("c:"), false)
			assert.strictEqual(path.isAbsolutePath("c:\\"), true)
			assert.strictEqual(path.isAbsolutePath("c:/"), true)
			assert.strictEqual(path.isAbsolutePath("c://"), true)
			assert.strictEqual(path.isAbsolutePath("C:/Users/"), true)
			assert.strictEqual(path.isAbsolutePath("C:\\Users\\"), true)
		}
	}

	export function getDirTest() {
		assert.strictEqual(path.getDir("foo/goo.txt"), "foo")

		assert.strictEqual(path.getDir("."), "")
		assert.strictEqual(path.getDir("foo.txt"), "")
		assert.strictEqual(path.getDir(".foo"), "")
		assert.strictEqual(path.getDir(".foo/"), "")
		assert.strictEqual(path.getDir("../goo.txt"), "..")
		assert.strictEqual(path.getDir("/user/root/foo.txt"), "/user/root")
		assert.strictEqual(path.getDir("/user/root/foo"), "/user/root")
		assert.strictEqual(path.getDir("/user/root/foo/"), "/user/root")
	}

	export function setDirTest() {
		assert.strictEqual(path.setDir("/user/root/foo.txt", "goo"), "goo/foo.txt")
		assert.strictEqual(path.setDir("/user/root/foo", "goo", "/user/root"), "goo/foo")

		assert.strictEqual(path.setDir("/user/root/foo", ""), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "."), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "./"), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "/"), sep + "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "goo"), "goo/foo")
		assert.strictEqual(path.setDir("/user/root/foo", "goo/"), "goo/foo")

		assert.strictEqual(path.setDir("/user/root/foo", "other", "/user"), "other/root/foo")
		assert.strictEqual(path.setDir("/user/root/foo", "", "/user/root"), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", ".", "/user/root"), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "./", "/user/root"), "foo")
		assert.strictEqual(path.setDir("/user/root/foo", "/", "/user/root"), sep + "foo")
		assert.strictEqual(path.setDir("/user/root/foo.txt", "goo", "/user/root"), "goo/foo.txt")
		assert.strictEqual(path.setDir("/user/root/foo", "goo", "/user/root"), "goo/foo")
		assert.strictEqual(path.setDir("/user/root/foo", "goo/", "/user/root"), "goo/foo")

		assert.strictEqual(path.setDir("/user/root/foo", "goo/", "/error"), "/user/root/foo")
	}

	export function getRootTest() {
		assert.strictEqual(path.getRoot("foo/goo.txt"), "foo")

		assert.strictEqual(path.getRoot("."), ".")
		assert.strictEqual(path.getRoot("foo.txt"), "foo.txt")
		assert.strictEqual(path.getRoot(".foo"), ".foo")
		assert.strictEqual(path.getRoot(".foo/"), ".foo")
		assert.strictEqual(path.getRoot("../goo.txt"), "..")
		assert.strictEqual(path.getRoot("user/root/foo.txt"), "user")
		assert.strictEqual(path.getRoot("user/"), "user")
		assert.strictEqual(path.getRoot("/user/root/foo.txt"), "/user")
		assert.strictEqual(path.getRoot("/user/root/foo"), "/user")
		assert.strictEqual(path.getRoot("/user/root/foo/"), "/user")
		assert.strictEqual(path.getRoot("D:\\foo"), "D:")
	}

	export function setRootTest() {
		assert.strictEqual(path.setRoot("/user/root/foo.txt", "goo"), "goo/root/foo.txt")
		assert.strictEqual(path.setRoot("/user/root/foo", "goo"), "goo/root/foo")

		assert.strictEqual(path.setRoot("/user/root/foo", ""), "root/foo")
		assert.strictEqual(path.setRoot("/user/root/foo", "."), "root/foo")
		assert.strictEqual(path.setRoot("/user/root/foo", "./"), "root/foo")
		assert.strictEqual(path.setRoot("/user/root/foo", "/"), sep + "root" + sep + "foo")
		assert.strictEqual(path.setRoot("/user/root/foo", "goo"), "goo/root/foo")
		assert.strictEqual(path.setRoot("/user/root/foo", "goo/"), "goo/root/foo")
	}

	export function getNameTest() {
		assert.strictEqual(path.getName("/user/root/foo.txt"), "foo.txt")
		assert.strictEqual(path.getName("/user/root/foo.txt", false), "foo")

		assert.strictEqual(path.getName("/user/root/foo.txt", true), "foo.txt")
		assert.strictEqual(path.getName("/user/root/foo.min.js"), "foo.min.js")
		assert.strictEqual(path.getName("/user/root/foo"), "foo")
		assert.strictEqual(path.getName("/user/root/foo/"), "foo")
		assert.strictEqual(path.getName(""), "")
		assert.strictEqual(path.getName("."), ".")
		assert.strictEqual(path.getName(".."), "..")
		assert.strictEqual(path.getName(".foo"), ".foo")
		assert.strictEqual(path.getName("foo/.goo", false), ".goo")

		assert.strictEqual(path.getName("/user/root/foo.txt", false), "foo")
		assert.strictEqual(path.getName("/user/root/foo.min.js", false), "foo.min")
		assert.strictEqual(path.getName("/user/root/foo", false), "foo")
		assert.strictEqual(path.getName("/user/root/foo/", false), "foo")
		assert.strictEqual(path.getName("", false), "")
		assert.strictEqual(path.getName(".", false), ".")
		assert.strictEqual(path.getName("..", false), "..")
		assert.strictEqual(path.getName(".foo", false), ".foo")
		assert.strictEqual(path.getName("foo/.goo", false), ".goo")
	}

	export function setNameTest() {
		assert.strictEqual(path.setName("/user/root/foo.txt", "goo"), "/user/root/goo")
		assert.strictEqual(path.setName("/user/root/foo.txt", "goo", false), "/user/root/goo.txt")

		assert.strictEqual(path.setName("/user/root/foo.txt", "goo", true), "/user/root/goo")
		assert.strictEqual(path.setName("/user/root/foo.min.js", "goo"), "/user/root/goo")
		assert.strictEqual(path.setName("/user/root/foo", "goo"), "/user/root/goo")
		assert.strictEqual(path.setName("/user/root/", "goo"), "/user/goo/")
		assert.strictEqual(path.setName("", "goo"), "goo")
		assert.strictEqual(path.setName(".", "goo"), "goo")
		assert.strictEqual(path.setName("..", "goo"), "goo")
		assert.strictEqual(path.setName(".foo", "goo"), "goo")
		assert.strictEqual(path.setName("foo/.foo", "goo"), "foo/goo")

		assert.strictEqual(path.setName("/user/root/foo.txt", "goo", false), "/user/root/goo.txt")
		assert.strictEqual(path.setName("/user/root/foo.min.js", "goo", false), "/user/root/goo.js")
		assert.strictEqual(path.setName("/user/root/foo", "goo", false), "/user/root/goo")
		assert.strictEqual(path.setName("/user/root/", "goo", false), "/user/goo/")
		assert.strictEqual(path.setName("", "goo", false), "goo")
		assert.strictEqual(path.setName(".", "goo", false), "goo")
		assert.strictEqual(path.setName("..", "goo", false), "goo")
		assert.strictEqual(path.setName(".foo", "goo", false), "goo")
		assert.strictEqual(path.setName("foo/.foo", "goo", false), "foo/goo")
	}

	export function prependNameTest() {
		assert.strictEqual(path.prependName("/user/root/foo.txt", "prepend"), "/user/root/prependfoo.txt")

		assert.strictEqual(path.prependName("/user/root/foo.min.js", "prepend"), "/user/root/prependfoo.min.js")
		assert.strictEqual(path.prependName("/user/root/foo", "prepend"), "/user/root/prependfoo")
		assert.strictEqual(path.prependName("/user/root/foo/", "prepend"), "/user/root/prependfoo/")
		assert.strictEqual(path.prependName(".goo", "prepend"), "prepend.goo")
		assert.strictEqual(path.prependName("foo/.goo", "prepend"), "foo/prepend.goo")
	}

	export function appendNameTest() {
		assert.strictEqual(path.appendName("/user/root/foo.txt", "append"), "/user/root/fooappend.txt")

		assert.strictEqual(path.appendName("/user/root/foo.min.js", "append"), "/user/root/fooappend.min.js")
		assert.strictEqual(path.appendName("/user/root/foo", "append"), "/user/root/fooappend")
		assert.strictEqual(path.appendName("/user/root/foo/", "append"), "/user/root/fooappend/")
		assert.strictEqual(path.appendName(".goo", "append"), "append.goo")
		assert.strictEqual(path.appendName("foo/.goo", "append"), "foo/append.goo")
	}

	export function appendIndexTest() {
		assert.strictEqual(path.appendIndex("/user/root/foo.txt"), "/user/root/foo_2.txt")

		assert.strictEqual(path.appendIndex("/user/root/foo.txt", "(2)"), "/user/root/foo(2).txt")
		assert.strictEqual(path.appendIndex("/user/root/foo(2).txt", "(2)"), "/user/root/foo(3).txt")
		assert.strictEqual(path.appendIndex("/user/root/foo(99).txt", "(2)"), "/user/root/foo(100).txt")
		assert.strictEqual(path.appendIndex("/user/root/foo.txt", "(3)"), "/user/root/foo(3).txt")
		assert.strictEqual(path.appendIndex("/user/root/foo.99.src.txt", ".3"), "/user/root/foo.100.src.txt")
	}

	export function getExtTest() {
		assert.strictEqual(path.getExt("/user/root/foo.txt"), ".txt")
		assert.strictEqual(path.getExt("/user/root/foo"), "")

		assert.strictEqual(path.getExt("/user/root/foo.min.js"), ".js")
		assert.strictEqual(path.getExt("/user/root/.foo"), "")
		assert.strictEqual(path.getExt("/user/root/.foo/"), "")
	}

	export function setExtTest() {
		assert.strictEqual(path.setExt("/user/root/foo.txt", ".jpg"), "/user/root/foo.jpg")
		assert.strictEqual(path.setExt("/user/root/foo.txt", ""), "/user/root/foo")

		assert.strictEqual(path.setExt("/user/root/foo", ".jpg"), "/user/root/foo.jpg")
		assert.strictEqual(path.setExt("/user/root/foo", ""), "/user/root/foo")
		assert.strictEqual(path.setExt("/user/root/.foo", ".txt"), "/user/root/.foo.txt")
		assert.strictEqual(path.setExt("/user/root/.foo/", ".txt"), "/user/root/.foo/.txt")
	}

	export function pathEqualsTest() {
		assert.strictEqual(path.pathEquals("foo/goo/hoo", "foo/goo/hoo"), true)
		assert.strictEqual(path.pathEquals("foo/goo/hoo", "foo/goo/hoo2"), false)

		assert.strictEqual(path.pathEquals("foo/goo/hoo", "foo/goo/Hoo", false), false)
		assert.strictEqual(path.pathEquals("foo/goo/hoo", "foo/goo/Hoo", true), true)

		if (sep === "\\") {
			assert.strictEqual(path.pathEquals("C:/foo/goo/hoo", "c:/foo/goo/hoo", false), true)
			assert.strictEqual(path.pathEquals("C:/foo/goo/hoo", "c:/foo/goo/Hoo", false), false)
		}
	}

	export function containsPathTest() {
		assert.strictEqual(path.containsPath("user/root/foo", "user/root/foo"), true)
		assert.strictEqual(path.containsPath("user/root/foo", "user/root/foo2"), false)
		assert.strictEqual(path.containsPath("user/root/foo", "user/root/foo/goo"), true)

		assert.strictEqual(path.containsPath("/", "/"), true)
		assert.strictEqual(path.containsPath("/", "/foo"), true)
		assert.strictEqual(path.containsPath("/", "/foo/goo"), true)

		assert.strictEqual(path.containsPath("/user/root", "/user/root"), true)
		assert.strictEqual(path.containsPath("/user/root", "/user/root/foo"), true)
		assert.strictEqual(path.containsPath("/user/root/foo.txt", "foo.txt"), false)
		assert.strictEqual(path.containsPath("/user/root/foo", "/user/root/foo2"), false)

		assert.strictEqual(path.containsPath("/user/root", "/user/Root/foo", false), false)

		assert.strictEqual(path.containsPath("", "a"), true)
		assert.strictEqual(path.containsPath("a", ""), false)
		assert.strictEqual(path.containsPath("", ""), true)
	}

	export function deepestPathTest() {
		assert.strictEqual(path.deepestPath("a", "b"), null)
		assert.strictEqual(path.deepestPath("a", "a/b"), "a/b")
		assert.strictEqual(path.deepestPath("a/b", "a"), "a/b")
		assert.strictEqual(path.deepestPath("a/b/c", "a/b/d"), null)

		assert.strictEqual(path.deepestPath(null, "b"), null)
		assert.strictEqual(path.deepestPath("b", null), null)
		assert.strictEqual(path.deepestPath(null, null), null)

		assert.strictEqual(path.deepestPath("", "a"), "a")
		assert.strictEqual(path.deepestPath("a", ""), "a")
		assert.strictEqual(path.deepestPath("", ""), "")
	}

	export function commonDirTest() {
		assert.strictEqual(path.commonDir("foo/goo", "foo/goo2"), "foo")
		assert.strictEqual(path.commonDir("foo/goo", "foo/goo/hoo"), "foo/goo")
		assert.strictEqual(path.commonDir("foo/goo/hoo", "foo/goo/hoo2"), "foo/goo")

		assert.strictEqual(path.commonDir("foo/goo/hoo", "foo/goo"), "foo/goo")
		assert.strictEqual(path.commonDir("foo/goo/hoo", "foo2/goo/hoo"), null)
		assert.strictEqual(path.commonDir("foo/goo/hoo", "foo/goo/hoo"), "foo/goo/hoo")

		assert.strictEqual(path.commonDir("foo/goo/hoo", "foo/goo/Hoo", false), "foo/goo")

		assert.strictEqual(path.commonDir("/", "/"), "/")
		assert.strictEqual(path.commonDir("/foo/goo", "/foo/goo2"), "/foo")

		assert.strictEqual(path.commonDir("", "a"), "")
		assert.strictEqual(path.commonDir("a", ""), "")
		assert.strictEqual(path.commonDir("", ""), "")

		assert.strictEqual(path.commonDir(null, "a"), null)
		assert.strictEqual(path.commonDir("a", null), null)
		assert.strictEqual(path.commonDir(null, null), null)

		if (sep === "\\") {
			assert.strictEqual(path.commonDir("R:\\foo\\x", "R:\\foo\\y"), "R:\\foo")
			assert.strictEqual(path.commonDir("R:/foo", "H:/foo"), null)
			assert.strictEqual(path.commonDir("R:", "H:"), null)
		}
	}

}