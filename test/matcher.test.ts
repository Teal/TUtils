import * as assert from "assert"
import { resolve, sep } from "path"
import * as matcher from "../src/matcher"

export namespace matcherTest {

	export function matchTest() {
		assert.strictEqual(matcher.match("foo.js", "*.js"), true)

		assert.strictEqual(matcher.match("foo", "foo"), true)
		assert.strictEqual(matcher.match("myfoo", "foo"), false)
		assert.strictEqual(matcher.match("foo", "foo.js"), false)
		assert.strictEqual(matcher.match("foo/goo2", "foo/goo"), false)
		assert.strictEqual(matcher.match("foo.js", "foo.js"), true)
		assert.strictEqual(matcher.match("path/to/foo.js", "path/to/*.js"), true)
		assert.strictEqual(matcher.match("path/to/foo.css", "path/to/*.js"), false)
		assert.strictEqual(matcher.match("path/to.js", "path/to/*.js"), false)
		assert.strictEqual(matcher.match("path/to/foo/goo.js", "path/to/*.js"), false)
		assert.strictEqual(matcher.match("root/path/to/foo.js", "./root/path/to/*.js"), true)
		assert.strictEqual(matcher.match("root/path/toa/foo.js", "./root/path/to/*.js"), false)
		assert.strictEqual(matcher.match("foo.js", "./*.js"), true)
		assert.strictEqual(matcher.match("foo/goo.js", "./*.js"), false)
		assert.strictEqual(matcher.match("foo/goo/.js", "*.js"), false)
		assert.strictEqual(matcher.match("foo/goo/.js", "**/*.js"), false)
		assert.strictEqual(matcher.match("foo/goo/.js", "f**o/*.js"), false)
		assert.strictEqual(matcher.match(".js", "**/*.js"), false)
		assert.strictEqual(matcher.match(".js", "**.js"), false)
		assert.strictEqual(matcher.match(".js", "**/*.js"), false)
		assert.strictEqual(matcher.match("path/a", "path/?"), true)
		assert.strictEqual(matcher.match("path/ab", "path/?"), false)
		assert.strictEqual(matcher.match("path/a", "path/[ab]"), true)
		assert.strictEqual(matcher.match("path/b", "path/[ab]"), true)
		assert.strictEqual(matcher.match("path/ab", "path/[ab]"), false)
		assert.strictEqual(matcher.match("path/a", "path/[!ab]"), false)
		assert.strictEqual(matcher.match("path/b", "path/[!ab]"), false)
		assert.strictEqual(matcher.match("path/c", "path/[!ab]"), true)
		assert.strictEqual(matcher.match("path/", "path/*"), false)
		assert.strictEqual(matcher.match("path/foo", "path/*"), true)
		assert.strictEqual(matcher.match("path/foo", "path/foo*"), true)
		assert.strictEqual(matcher.match("path/abcd", "path/a*"), true)
		assert.strictEqual(matcher.match("path/foo/goo", "path/foo/"), true)
		assert.strictEqual(matcher.match("path/foo/goo", "path/*/"), true)
		assert.strictEqual(matcher.match("path/foo", "path/*/"), false)
		assert.strictEqual(matcher.match("path/foo", "path/*"), true)
		assert.strictEqual(matcher.match("path/foo/", "path/foo/"), true)
		assert.strictEqual(matcher.match("path/", "path/**/*"), false)
		assert.strictEqual(matcher.match("path/foo", "path/**/*"), true)
		assert.strictEqual(matcher.match("path/subdir/foo.js", "path/**/subdir/foo.*"), true)
		assert.strictEqual(matcher.match("path/foo/subdir/foo.js", "path/**/subdir/foo.*"), true)
		assert.strictEqual(matcher.match("path/foo/subdir/foo1.js", "path/**/subdir/foo.*"), false)
		assert.strictEqual(matcher.match("path/foo/subdir/foo", "path/**/subdir/foo.*"), false)
		assert.strictEqual(matcher.match("path/foo/foo2/subdir/foo.txt", "path/**/subdir/foo.*"), true)
		assert.strictEqual(matcher.match("path/foo/foo2/subdir/foo", "path/**/subdir/foo.*"), false)
		assert.strictEqual(matcher.match("path/foo/foo2/subdir/foo.txt", "./path/**/subdir/foo.*"), true)
		assert.strictEqual(matcher.match("path/foo/foo2/.subdir/foo.txt", ".*"), true)
		assert.strictEqual(matcher.match("../path/foo/foo2/subdir/foo.txt", "../path/**/subdir/foo.*"), true)

		assert.strictEqual(matcher.match("../path/foo/foo2/subdir/Foo.txt", ["../path/**/subdir/foo.*"], undefined, true), true)
		assert.strictEqual(matcher.match("../path/foo/foo2/subdir/Foo.txt", ["../path/**/subdir/foo.*", "!**/foo.txt"], undefined, false), false)
		assert.strictEqual(matcher.match("../path/foo/foo2/subdir/foo.txt", ["../path/**/subdir/foo.*", "!../**/foo.txt"]), false)
		assert.strictEqual(matcher.match("foo.js", p => true), true)
		assert.strictEqual(matcher.match("foo.js", ["!foo.js", p => true]), false)
		assert.strictEqual(matcher.match("foo.js", p => false), false)
		assert.strictEqual(matcher.match("foo.js", "./foo.js"), true)
		assert.strictEqual(matcher.match("foo.js", "./*.js"), true)
		assert.strictEqual(matcher.match("[.js", "[.js"), true)

		assert.strictEqual(matcher.match("foo.js", /foo\.js/), true)
		assert.strictEqual(matcher.match("goo.js", new matcher.Matcher(new matcher.Matcher(["!goo.js", /foo\.js/]))), false)
		assert.strictEqual(matcher.match("foo.js", new matcher.Matcher(new matcher.Matcher(["!goo.js", /foo\.js/]))), true)
		const mg = new matcher.Matcher(/foo\.js/)
		mg.exclude("goo.js")
		mg.exclude("goo.js")
		assert.strictEqual(matcher.match("goo.js", mg), false)
		assert.strictEqual(matcher.match("foo", new matcher.Matcher()), false)

		assert.strictEqual(matcher.match("foo", "./"), true)
		assert.strictEqual(matcher.match(resolve("foo"), "./", process.cwd()), true)
		if (sep === "\\") {
			assert.strictEqual(matcher.match("E:\\foo", "E:\\foo", process.cwd()), true)
			assert.strictEqual(matcher.match("E:\\foo\\goo.txt", "E:\\foo", process.cwd()), true)
			assert.strictEqual(matcher.match("E:\\foo\\goo.txt", "E:\\foo\\*", process.cwd()), true)
			assert.strictEqual(matcher.match("E:\\foo\\goo.txt", "E:\\*\\goo.txt", process.cwd()), true)

			assert.strictEqual(matcher.match("C:\\", "C:\\", process.cwd()), true)
			assert.strictEqual(matcher.match("C:\\", "../../", process.cwd()), false)
			assert.strictEqual(matcher.match("C:\\foo.txt", "../foo.txt", "C:"), false)
		} else {
			assert.strictEqual(matcher.match("/user/local", "/user/local", process.cwd()), true)
			assert.strictEqual(matcher.match("/user/local/file.txt", "/user/local", process.cwd()), true)
			assert.strictEqual(matcher.match("/user/local/file.txt", "/user/local/*", process.cwd()), true)
			assert.strictEqual(matcher.match("/foo.txt", "../foo.txt", "/"), false)
		}

		assert.strictEqual(matcher.match(resolve("bdir/x/x"), /^bdir\/x\/x$/, process.cwd()), true)
		assert.strictEqual(matcher.match(resolve("bdir/x/x"), "bdir/[x]/\\x", process.cwd()), true)
		assert.strictEqual(matcher.match(resolve("bdir/x/x"), path => path === resolve("bdir/x/x"), process.cwd()), true)

		const mf = new matcher.Matcher()
		mf.include((_, x, y) => x > y)
		assert.strictEqual(mf.test("", 1, 0), true)
		assert.strictEqual(mf.test("", 0, 1), false)

		assert.strictEqual(matcher.match("}", "}"), true)
		assert.strictEqual(matcher.match("{[x", "{[x"), true)
		assert.strictEqual(matcher.match("{x", "{[x]"), true)
		assert.strictEqual(matcher.match("{[x/y]", "{[x/y]"), true)
		assert.strictEqual(matcher.match("{[x\\", "{[x\\"), true)
		assert.strictEqual(matcher.match("{{", "{{"), true)
		assert.strictEqual(matcher.match("{xy", "{x{y,}"), true)
		assert.strictEqual(matcher.match("{x{,", "{x{,"), true)
	}

	export namespace micromatchTest {

		export function dotglobTest() {
			// https://github.com/micromatch/micromatch/blob/master/test/fixtures/dotglob.txt
			assert.strictEqual(matcher.match("a/b/.x", "**/.x/**"), false)
			assert.strictEqual(matcher.match(".x", "**/.x/**"), false)
			assert.strictEqual(matcher.match(".x/", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/a", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/a/b", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/.x", "**/.x/**"), false)
			assert.strictEqual(matcher.match("a/.x", "**/.x/**"), false)

			assert.strictEqual(matcher.match("a/b/.x/c", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d/e", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/.x/b", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/.x/b/.x/c", "**/.x/**"), false)

			assert.strictEqual(matcher.match(".bashrc", "?bashrc"), false)

			assert.strictEqual(matcher.match(".bar.baz/", ".*.*"), true)
			assert.strictEqual(matcher.match(".bar.baz/", ".*.*/"), true)
			assert.strictEqual(matcher.match(".bar.baz", ".*.*"), true)
		}

		export function globTest() {
			// https://github.com/micromatch/micromatch/blob/master/test/fixtures/glob.txt
			assert.strictEqual(matcher.match("a/b/.x", "**/.x/**"), false)
			assert.strictEqual(matcher.match(".x", "**/.x/**"), false)
			assert.strictEqual(matcher.match(".x/", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/a", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/a/b", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/.x", "**/.x/**"), false)
			assert.strictEqual(matcher.match("a/.x", "**/.x/**"), false)

			assert.strictEqual(matcher.match("a/b/.x/c", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d/e", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/.x/b", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/.x/b/.x/c", "**/.x/**"), false)

			assert.strictEqual(matcher.match("a/c/b", "a/*/b"), true)
			assert.strictEqual(matcher.match("a/.d/b", "a/*/b"), false)
			assert.strictEqual(matcher.match("a/./b", "a/*/b"), false)
			assert.strictEqual(matcher.match("a/../b", "a/*/b"), false)

			assert.strictEqual(matcher.match("ab", "ab**"), true)
			assert.strictEqual(matcher.match("abcdef", "ab**"), true)
			assert.strictEqual(matcher.match("abef", "ab**"), true)
			assert.strictEqual(matcher.match("abcfef", "ab**"), true)

			assert.strictEqual(matcher.match("ab", "ab***ef"), false)
			assert.strictEqual(matcher.match("abcdef", "ab***ef"), true)
			assert.strictEqual(matcher.match("abef", "ab***ef"), true)
			assert.strictEqual(matcher.match("abcfef", "ab***ef"), true)

			assert.strictEqual(matcher.match(".bashrc", "?bashrc"), false)

			assert.strictEqual(matcher.match("abbc", "ab?bc"), false)
			assert.strictEqual(matcher.match("abc", "ab?bc"), false)

			assert.strictEqual(matcher.match("a.a", "[a-d]*.[a-b]"), true)
			assert.strictEqual(matcher.match("a.b", "[a-d]*.[a-b]"), true)
			assert.strictEqual(matcher.match("c.a", "[a-d]*.[a-b]"), true)
			assert.strictEqual(matcher.match("a.a.a", "[a-d]*.[a-b]"), true)
			assert.strictEqual(matcher.match("a.a.a", "[a-d]*.[a-b]*.[a-b]"), true)

			assert.strictEqual(matcher.match("a.a", "*.[a-b]"), true)
			assert.strictEqual(matcher.match("a.b", "*.[a-b]"), true)
			assert.strictEqual(matcher.match("a.a.a", "*.[a-b]"), true)
			assert.strictEqual(matcher.match("c.a", "*.[a-b]"), true)
			assert.strictEqual(matcher.match("d.a.d", "*.[a-b]"), false)
			assert.strictEqual(matcher.match("a.bb", "*.[a-b]"), false)
			assert.strictEqual(matcher.match("a.ccc", "*.[a-b]"), false)
			assert.strictEqual(matcher.match("c.ccc", "*.[a-b]"), false)

			assert.strictEqual(matcher.match("a.a", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("a.b", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("a.a.a", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("c.a", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("d.a.d", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("d.a.d", "*.[a-b]*.[a-b]*"), false)
			assert.strictEqual(matcher.match("d.a.d", "*.[a-d]*.[a-d]*"), true)
			assert.strictEqual(matcher.match("a.bb", "*.[a-b]*"), true)
			assert.strictEqual(matcher.match("a.ccc", "*.[a-b]*"), false)
			assert.strictEqual(matcher.match("c.ccc", "*.[a-b]*"), false)

			assert.strictEqual(matcher.match("a.a", "*[a-b].[a-b]*"), true)
			assert.strictEqual(matcher.match("a.b", "*[a-b].[a-b]*"), true)
			assert.strictEqual(matcher.match("a.a.a", "*[a-b].[a-b]*"), true)
			assert.strictEqual(matcher.match("c.a", "*[a-b].[a-b]*"), false)
			assert.strictEqual(matcher.match("d.a.d", "*[a-b].[a-b]*"), false)
			assert.strictEqual(matcher.match("a.bb", "*[a-b].[a-b]*"), true)
			assert.strictEqual(matcher.match("a.ccc", "*[a-b].[a-b]*"), false)
			assert.strictEqual(matcher.match("c.ccc", "*[a-b].[a-b]*"), false)

			assert.strictEqual(matcher.match("abd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("abe", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bb", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bcd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("ca", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("cb", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("dd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("de", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bdir/", "[a-y]*[!c]"), true)

			assert.strictEqual(matcher.match("abd", "**/*"), true)
		}

		export function globstarTest() {
			// https://github.com/micromatch/micromatch/blob/master/test/fixtures/globstar.txt
			assert.strictEqual(matcher.match("a.js", "**/*.js"), true)
			assert.strictEqual(matcher.match("a/a.js", "**/*.js"), true)
			assert.strictEqual(matcher.match("a/a/b.js", "**/*.js"), true)

			assert.strictEqual(matcher.match("a/b/z.js", "a/b/**/*.js"), true)
			assert.strictEqual(matcher.match("a/b/c/z.js", "a/b/**/*.js"), true)

			assert.strictEqual(matcher.match("foo.md", "**/*.md"), true)
			assert.strictEqual(matcher.match("foo/bar.md", "**/*.md"), true)

			assert.strictEqual(matcher.match("foo/bar", "foo/**/bar"), true)
			assert.strictEqual(matcher.match("foo/bar", "foo/**bar"), true)

			assert.strictEqual(matcher.match("ab/a/d", "**/*"), true)
			assert.strictEqual(matcher.match("ab/b", "**/*"), true)
			assert.strictEqual(matcher.match("a/b/c/d/a.js", "**/*"), true)
			assert.strictEqual(matcher.match("a/b/c.js", "**/*"), true)
			assert.strictEqual(matcher.match("a/b/c.txt", "**/*"), true)
			assert.strictEqual(matcher.match("a/b/.js/c.txt", "**/*"), false)
			assert.strictEqual(matcher.match("a.js", "**/*"), true)
			assert.strictEqual(matcher.match("za.js", "**/*"), true)
			assert.strictEqual(matcher.match("ab", "**/*"), true)
			assert.strictEqual(matcher.match("a.b", "**/*"), true)

			assert.strictEqual(matcher.match("foo", "foo/**"), false)
			assert.strictEqual(matcher.match("foo", "foo/**/"), false)
			assert.strictEqual(matcher.match("foo/", "foo/**"), true)
			assert.strictEqual(matcher.match("foo/", "foo/**/"), true)
			assert.strictEqual(matcher.match("foo/bar", "foo/**/"), true)
			assert.strictEqual(matcher.match("foo/bar/baz/qux", "foo/**/"), true)
			assert.strictEqual(matcher.match("foo/bar/baz/qux/", "foo/**/"), true)
		}

		export function negationTest() {
			// https://github.com/micromatch/micromatch/blob/master/test/fixtures/negation
			assert.strictEqual(matcher.match("a/b.js", "!**/*.md"), false)
			assert.strictEqual(matcher.match("a.js", "!**/*.md"), false)
			assert.strictEqual(matcher.match("a/b.md", "!**/*.md"), false)
			assert.strictEqual(matcher.match("a.md", "!**/*.md"), false)

			assert.strictEqual(matcher.match("a/b.js", "!*.md"), false)
			assert.strictEqual(matcher.match("a.js", "!*.md"), false)
			assert.strictEqual(matcher.match("a/b.md", "!*.md"), false)
			assert.strictEqual(matcher.match("a.md", "!*.md"), false)

			assert.strictEqual(matcher.match("a.js", "!**/*.md"), false)
			assert.strictEqual(matcher.match("b.md", "!**/*.md"), false)
			assert.strictEqual(matcher.match("c.txt", "!**/*.md"), false)
		}

		export function patternsTest() {
			// https://github.com/micromatch/micromatch/blob/master/test/fixtures/patterns.js
			assert.strictEqual(matcher.match("abc", "a*****?c"), true)
			assert.strictEqual(matcher.match("abc", "?*****??"), true)
			assert.strictEqual(matcher.match("[z-a]", "[z-a]"), true)
			assert.strictEqual(matcher.match("[a-z]", "[a-z]"), false)
			assert.strictEqual(matcher.match("b", "[a-z]"), true)
			assert.strictEqual(matcher.match("\u0100", "[a-\u0100]"), true)
			assert.strictEqual(matcher.match("abc", "a?c"), true)
			assert.strictEqual(matcher.match("a[", "a\\["), true)
			assert.strictEqual(matcher.match("a", "a*"), true)
			assert.strictEqual(matcher.match("abc", "a*"), true)
			assert.strictEqual(matcher.match("abd", "a*"), true)
			assert.strictEqual(matcher.match("abe", "a*"), true)
			assert.strictEqual(matcher.match("X*", "X*"), true)

			assert.strictEqual(matcher.match("\*", "\*"), true)
			assert.strictEqual(matcher.match("\**", "\**"), true)
			assert.strictEqual(matcher.match("\*\*", "\*\*"), true)
			assert.strictEqual(matcher.match("bdir/", "b*/"), true)
			assert.strictEqual(matcher.match("c", "c*"), true)
			assert.strictEqual(matcher.match("ca", "c*"), true)
			assert.strictEqual(matcher.match("cb", "c*"), true)
			assert.strictEqual(matcher.match("a", "**"), true)
			assert.strictEqual(matcher.match("b", "**"), true)
			assert.strictEqual(matcher.match("c", "**"), true)
			assert.strictEqual(matcher.match("d", "**"), true)
			assert.strictEqual(matcher.match("abc", "**"), true)
			assert.strictEqual(matcher.match("abd", "**"), true)
			assert.strictEqual(matcher.match("abe", "**"), true)
			assert.strictEqual(matcher.match("bb", "**"), true)
			assert.strictEqual(matcher.match("bcd", "**"), true)
			assert.strictEqual(matcher.match("ca", "**"), true)
			assert.strictEqual(matcher.match("cb", "**"), true)
			assert.strictEqual(matcher.match("dd", "**"), true)
			assert.strictEqual(matcher.match("de", "**"), true)
			assert.strictEqual(matcher.match("bdir/", "**"), true)
			assert.strictEqual(matcher.match("bdir/cfile", "**"), true)

			assert.strictEqual(matcher.match("abc", "[a-c]b*"), true)
			assert.strictEqual(matcher.match("abd", "[a-c]b*"), true)
			assert.strictEqual(matcher.match("abe", "[a-c]b*"), true)
			assert.strictEqual(matcher.match("bb", "[a-c]b*"), true)
			assert.strictEqual(matcher.match("cb", "[a-c]b*"), true)
			assert.strictEqual(matcher.match("abd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("abd", "[a-y]*[!d]"), false)
			assert.strictEqual(matcher.match("abe", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bb", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bcd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("bdir/", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("ca", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("cb", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("dd", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("de", "[a-y]*[!c]"), true)
			assert.strictEqual(matcher.match("abd", "a*[!c]"), true)
			assert.strictEqual(matcher.match("abe", "a*[!c]"), true)

			assert.strictEqual(matcher.match("a-b", "a[X-]b"), true)
			assert.strictEqual(matcher.match("aXb", "a[X-]b"), true)

			assert.strictEqual(matcher.match("d", "[!a-c]*"), true)
			assert.strictEqual(matcher.match("dd", "[!a-c]*"), true)
			assert.strictEqual(matcher.match("de", "[!a-c]*"), true)

			assert.strictEqual(matcher.match("a*b/ooo", "a\*b/*"), true)
			assert.strictEqual(matcher.match("a*b/ooo", "a\*?/*"), true)

			assert.strictEqual(matcher.match("echo !7", "*\!*"), true)
			assert.strictEqual(matcher.match("r.*", "*.\*"), true)
			assert.strictEqual(matcher.match("abc", "a[b]c"), true)
			assert.strictEqual(matcher.match("abc", "a[\\b]c"), true)
			assert.strictEqual(matcher.match("abc", "a?c"), true)

			assert.strictEqual(matcher.match("", ""), true)

			assert.strictEqual(matcher.match("man/man1/bash.1", "*/man*/bash.*"), true)
			assert.strictEqual(matcher.match("man/man1/bash.1", "man/man1/bash.1"), true)
			assert.strictEqual(matcher.match("abc", "a***c"), true)
			assert.strictEqual(matcher.match("abc", "a*****?c"), true)
			assert.strictEqual(matcher.match("abc", "?*****??"), true)
			assert.strictEqual(matcher.match("abc", "*****??"), true)
			assert.strictEqual(matcher.match("abc", "?*****?c"), true)
			assert.strictEqual(matcher.match("abc", "?***?****c"), true)
			assert.strictEqual(matcher.match("abc", "?***?****?"), true)
			assert.strictEqual(matcher.match("abc", "?***?****"), true)
			assert.strictEqual(matcher.match("abc", "*******c"), true)
			assert.strictEqual(matcher.match("abc", "*******?"), true)
			assert.strictEqual(matcher.match("abcdecdhjk", "a*cd**?**??k"), true)
			assert.strictEqual(matcher.match("abcdecdhjk", "a**?**cd**?**??k"), true)

			assert.strictEqual(matcher.match("abcdecdhjk", "a**?**cd**?**??k***"), true)
			assert.strictEqual(matcher.match("abcdecdhjk", "a**?**cd**?**??***k"), true)
			assert.strictEqual(matcher.match("abcdecdhjk", "a**?**cd**?**??***k**"), true)
			assert.strictEqual(matcher.match("abcdecdhjk", "a****c**?**??*****"), true)
			assert.strictEqual(matcher.match("-", "[-abc]"), true)
			assert.strictEqual(matcher.match("-", "[abc-]"), true)
			assert.strictEqual(matcher.match("[", "[[]"), true)
			assert.strictEqual(matcher.match("[", "["), true)
			assert.strictEqual(matcher.match("[abc", "[*"), true)

			assert.strictEqual(matcher.match("]", "[]]"), true)
			assert.strictEqual(matcher.match("]", "[]-]"), true)
			assert.strictEqual(matcher.match("p", "[a-z]"), true)

			assert.strictEqual(matcher.match("xYz", "XYZ", undefined, true), true)
			assert.strictEqual(matcher.match("ABC", "ab*", undefined, true), true)
			assert.strictEqual(matcher.match("ABC", "[ia]?[ck]", undefined, true), true)
			assert.strictEqual(matcher.match("IjK", "[ia]?[ck]", undefined, true), true)

			assert.strictEqual(matcher.match("a/b", "**"), true)

			assert.strictEqual(matcher.match("a/c/b", "a/*/b"), true)
			assert.strictEqual(matcher.match("a/.d/b", "a/*/b"), false)
			assert.strictEqual(matcher.match("a/./b", "a/.*/b"), true)
			assert.strictEqual(matcher.match("a/../b", "a/.*/b"), true)
			assert.strictEqual(matcher.match("a/.d/b", "a/.*/b"), true)
			assert.strictEqual(matcher.match("a/b", "**"), true)
			assert.strictEqual(matcher.match("a/.d", "**"), false)
			assert.strictEqual(matcher.match(".a/.d", "**"), false)

			assert.strictEqual(matcher.match("[!ab", "[!a*"), true)
			assert.strictEqual(matcher.match("[#ab", "[#a*"), true)
			assert.strictEqual(matcher.match("acb/", "a?b/**"), true)
			assert.strictEqual(matcher.match("#a", "#*"), true)
			assert.strictEqual(matcher.match("#b", "#*"), true)

			assert.strictEqual(matcher.match("\!a", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("d", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("e", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("!ab", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("!abc", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("!ab", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("!abc", ["*", "!a*"]), true)
			assert.strictEqual(matcher.match("a!b", ["*", "!!a*"]), true)
			assert.strictEqual(matcher.match("a!b", ["*", "!\\!a*"]), true)
			assert.strictEqual(matcher.match("d", ["*", "!\\!a*"]), true)
			assert.strictEqual(matcher.match("e", ["*", "!\\!a*"]), true)

			assert.strictEqual(matcher.match(".x", "**/.x"), true)
			assert.strictEqual(matcher.match(".x/a", "**/.x/**"), true)
			assert.strictEqual(matcher.match(".x/a/b", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/.x/b", "**/.x/**"), true)

			assert.strictEqual(matcher.match("a/b/.x/", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d", "**/.x/**"), true)
			assert.strictEqual(matcher.match("a/b/.x/c/d/e", "**/.x/**"), true)

			assert.strictEqual(matcher.match("a.js", "./**.js"), true)
			assert.strictEqual(matcher.match("a/b.js", "./**.js"), true)
			assert.strictEqual(matcher.match("a/b/c.js", "./**.js"), true)
			assert.strictEqual(matcher.match("a/b/.js", "./**.js"), false)
			assert.strictEqual(matcher.match("a/.b/c.js", "./**.js"), false)
			assert.strictEqual(matcher.match(".a/b/c.js", "./**.js"), false)

			assert.strictEqual(matcher.match("a.js", "*"), true)

			assert.strictEqual(matcher.match("a.js", "*.{js,jsx}"), true)
			assert.strictEqual(matcher.match("a.jsx", "*.{js,jsx}"), true)
			assert.strictEqual(matcher.match("a.ts", "*.{js,jsx}"), false)
			assert.strictEqual(matcher.match("a.ts", "*.{js,jsx"), false)
			assert.strictEqual(matcher.match("a.ts", "[!a].ts"), false)
			assert.strictEqual(matcher.match("x.ts", "[!a].ts"), true)
			assert.strictEqual(matcher.match("a.ts", "[a!].ts"), true)
			assert.strictEqual(matcher.match("x.ts", "[a!].ts"), false)
			assert.strictEqual(matcher.match("].ts", "[]].ts"), true)
			assert.strictEqual(matcher.match("[.ts", "[.ts"), true)
			assert.strictEqual(matcher.match("a.,ts", "a.,ts"), true)
			assert.strictEqual(matcher.match("x\\", "[x\\"), false)
			assert.strictEqual(matcher.match(resolve("foo"), resolve("foo"), process.cwd()), true)
			assert.strictEqual(matcher.match(resolve("[]"), resolve("[]"), process.cwd()), true)
			assert.strictEqual(matcher.match("xa.js", "x\\a.js"), true)
			assert.strictEqual(matcher.match("p[x].js", "p\\[x].js"), true)
			assert.strictEqual(matcher.match("bdir/x/x", "bdir/[x]/\\x"), true)
		}

	}

	export function matchDirTest() {
		assert.strictEqual(matcher.match("x/", "*"), true)
		assert.strictEqual(matcher.match("/x/", "*"), true)
		assert.strictEqual(matcher.match("x/", "x"), true)
		assert.strictEqual(matcher.match("/x", "/*"), true)
		assert.strictEqual(matcher.match("/", "/*"), false)

		assert.strictEqual(matcher.match("/", "/**"), true)
	}

	export function baseTest() {
		assert.strictEqual(new matcher.Matcher("path/to/*.js").base, "path/to")

		assert.strictEqual(new matcher.Matcher().base, null)
		assert.strictEqual(new matcher.Matcher("foo").base, "")
		assert.strictEqual(new matcher.Matcher("root/path/to/*.js").base, "root/path/to")
		assert.strictEqual(new matcher.Matcher("/foo/*.js").base, "/foo")
		assert.strictEqual(new matcher.Matcher("*.js").base, "")
		assert.strictEqual(new matcher.Matcher("**/*.js").base, "")
		assert.strictEqual(new matcher.Matcher("path/?").base, "path")
		assert.strictEqual(new matcher.Matcher("path/foo[ab]").base, "path")
		assert.strictEqual(new matcher.Matcher("path/*").base, "path")
		assert.strictEqual(new matcher.Matcher("path/foo*").base, "path")
		assert.strictEqual(new matcher.Matcher("path/**/*").base, "path")
		assert.strictEqual(new matcher.Matcher("path/**/subdir/foo.*").base, "path")
		assert.strictEqual(new matcher.Matcher("foo/").base, "foo")
		assert.strictEqual(new matcher.Matcher(["foo/goo", "foo/foo"]).base, "foo")
		assert.strictEqual(new matcher.Matcher(["foo/**/*.js", "foo/**/*.css"]).base, "foo")
		assert.strictEqual(new matcher.Matcher(/foo/).base, "")
		assert.strictEqual(new matcher.Matcher(["foo/", "!foo/"]).base, "foo")
		assert.strictEqual(new matcher.Matcher("./").base, "")
		assert.strictEqual(new matcher.Matcher(".").base, "")
		assert.strictEqual(new matcher.Matcher("").base, "")
		assert.strictEqual(new matcher.Matcher("fo\\o/").base, "foo")

		assert.strictEqual(new matcher.Matcher(["../foo/**/*.js", "foo/**/*.css"], resolve("root")).base, resolve("."))
		assert.strictEqual(new matcher.Matcher(["../foo/**/*.js", /foo/], resolve("root")).base, resolve("."))
		assert.strictEqual(new matcher.Matcher(["fo\\o", () => true], "src").base, "src")
		assert.strictEqual(new matcher.Matcher([1 as any], "src").base, null)
		assert.strictEqual(new matcher.Matcher("foo/", resolve("src")).base, resolve("src/foo"))
		assert.strictEqual(new matcher.Matcher("/foo/", resolve("src")).base, "/foo")
		assert.strictEqual(new matcher.Matcher(resolve("foo") + sep, resolve("src")).base, resolve("foo"))

		assert.strictEqual(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher("fo\\o/")))).base, "foo")
		assert.strictEqual(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher(() => false)))).base, "")
		assert.strictEqual(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher(new matcher.Matcher([() => false, () => false, () => false])))).base, "")

		if (sep === "\\") {
			assert.strictEqual(new matcher.Matcher("C:\\", process.cwd()).base, "C:")
			assert.strictEqual(new matcher.Matcher(["C:\\", "D:\\"], process.cwd()).base, null)
		}
	}

	export function getBasesTest() {
		assert.deepStrictEqual(new matcher.Matcher(["foo/", "goo/"]).getBases(), ["foo", "goo"])

		assert.deepStrictEqual(new matcher.Matcher().getBases(), [])
		assert.deepStrictEqual(new matcher.Matcher("foo/").getBases(), ["foo"])
		assert.deepStrictEqual(new matcher.Matcher(["foo/", "foo/goo"]).getBases(), ["foo"])
		assert.deepStrictEqual(new matcher.Matcher(["foo/goo/hoo", "foo/goo/"]).getBases(), ["foo/goo"])
		assert.deepStrictEqual(new matcher.Matcher(["foo/goo/hoo", "foo/goo"]).getBases(), ["foo"])
		assert.deepStrictEqual(new matcher.Matcher(["foo/goo/hoo", /foo/]).getBases(), [""])

		assert.deepStrictEqual(new matcher.Matcher(["../foo/goo", "../foo/"], process.cwd()).getBases(), [resolve("../foo")])
		assert.deepStrictEqual(new matcher.Matcher(["foo/goo/hoo", "../"], process.cwd()).getBases(), [resolve("..")])
		assert.deepStrictEqual(new matcher.Matcher(["../foo/goo/hoo", "../"], process.cwd()).getBases(), [resolve("..")])
	}

	export function baseOfTest() {
		assert.strictEqual(new matcher.Matcher("foo/").baseOf("foo/goo.js"), "foo")

		assert.strictEqual(new matcher.Matcher(["foo/", "goo/"]).baseOf("foo/goo.js"), "foo")
		assert.strictEqual(new matcher.Matcher(["foo/", "foo/goo"]).baseOf("foo/goo.js"), "foo")
		assert.strictEqual(new matcher.Matcher(["foo/goo/hoo", "foo/goo/"]).baseOf("foo/goo/hoo.js"), "foo/goo")
		assert.strictEqual(new matcher.Matcher(["foo/goo/hoo", "foo/goo"]).baseOf("foo/goo/hoo.js"), "foo/goo")
	}

	export function relativeTest() {
		assert.strictEqual(new matcher.Matcher("src").relative("src/x.js"), "src/x.js")

		assert.strictEqual(new matcher.Matcher("src/pages/").relative("src/pages/x.js"), "x.js")
		assert.strictEqual(new matcher.Matcher("src/pages").relative("src/pages/x.js"), "pages/x.js")
		assert.strictEqual(new matcher.Matcher(["src/pages/", "src"]).relative("src/pages/x.js"), "x.js")
		assert.strictEqual(new matcher.Matcher(["src/pages", "src"]).relative("src/pages/x.js"), "pages/x.js")
		assert.strictEqual(new matcher.Matcher(["src", "src/pages/"]).relative("src/pages/x.js"), "x.js")
		assert.strictEqual(new matcher.Matcher(["src", "src/pages/"]).relative("src/x.js"), "src/x.js")
		assert.strictEqual(new matcher.Matcher(["src", "src/pages"]).relative("src/pages/x.js"), "pages/x.js")
		assert.strictEqual(new matcher.Matcher(["src/", "src/pages/"]).relative("src/x.js"), "x.js")
		assert.strictEqual(new matcher.Matcher(["src/pages/", "src/"]).relative("src/x.js"), "x.js")
		assert.strictEqual(new matcher.Matcher(["src/pages/", "src/"]).relative("src"), "")

		assert.strictEqual(new matcher.Matcher(["src/s*.js"]).relative("src/s1.js"), "s1.js")
	}

	export function isGlobTest() {
		assert.strictEqual(matcher.isGlob("x.js"), false)
		assert.strictEqual(matcher.isGlob("*.js"), true)

		assert.strictEqual(matcher.isGlob("?.js"), true)
		assert.strictEqual(matcher.isGlob("[x].js"), true)
		assert.strictEqual(matcher.isGlob("[].js"), false)
		assert.strictEqual(matcher.isGlob("{x}.js"), true)
		assert.strictEqual(matcher.isGlob("{x.js"), false)
		assert.strictEqual(matcher.isGlob("x}.js"), false)
		assert.strictEqual(matcher.isGlob("!x.js"), true)
		assert.strictEqual(matcher.isGlob("xx!.js"), false)
		assert.strictEqual(matcher.isGlob("\\x.js"), true)
	}

}