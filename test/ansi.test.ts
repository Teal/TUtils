import * as assert from "assert"
import * as ansi from "../src/ansi"
import { simulateNoneTTYStream } from "./helpers/consoleHelper"

export namespace ansiTest {

	export function boldTest() {
		assert.strictEqual(ansi.bold("bold"), "\u001b[1mbold\u001b[22m")

		assert.strictEqual(ansi.bold(""), "\u001b[1m\u001b[22m")
	}

	export function colorTest() {
		assert.strictEqual(ansi.color("red", ansi.ANSIColor.red), "\u001b[31mred\u001b[39m")

		assert.strictEqual(ansi.color("", ansi.ANSIColor.red), "\u001b[31m\u001b[39m")
	}

	export function backgroundColorTest() {
		assert.strictEqual(ansi.backgroundColor("red", ansi.ANSIColor.red), "\u001b[41mred\u001b[49m")

		assert.strictEqual(ansi.backgroundColor("", ansi.ANSIColor.red), "\u001b[41m\u001b[49m")
	}

	export function removeANSICodesTest() {
		assert.strictEqual(ansi.removeANSICodes("\u001b[31mred\u001b[39m"), "red")

		assert.strictEqual(ansi.removeANSICodes("text"), "text")
		assert.strictEqual(ansi.removeANSICodes("\u001b]2;example\u0007"), "")
		assert.strictEqual(ansi.removeANSICodes("\u001b]8;;https://github.com\u0007Click\u001b]8;;\u0007"), "Click")

		assert.strictEqual(ansi.removeANSICodes("\u001b]8;;https://中文\u0007Click\u001b]8;;\u0007"), "Click")
	}

	export async function truncateStringTest() {
		assert.strictEqual(ansi.truncateString("I'm a long long long text", undefined, 10), "I'm...ext")
		assert.strictEqual(ansi.truncateString("I'm a long long long text", "…", 10), "I'm …text")

		assert.strictEqual(ansi.truncateString("ABCDEFG"), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 4), "...")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 5), "A...")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 6), "A...G")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 7), "AB...G")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 8), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 9), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 10), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 11), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 12), "ABCDEFG")
		assert.strictEqual(ansi.truncateString("ABCDEFG", undefined, 13), "ABCDEFG")

		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 4), "...")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 5), "...")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 6), "你...")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 7), "你...D")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 8), "你A...D")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 9), "你A...D")
		assert.strictEqual(ansi.truncateString("你A好B世C界D", undefined, 10), "你A...界D")
		assert.strictEqual(ansi.truncateString("ABCDEFG好", undefined, 8), "AB...好")

		assert.strictEqual(ansi.truncateString("\u001b[37mABCDEFG\u001b[39m", undefined, 6), "\u001b[37mA...G\u001b[39m")
		assert.strictEqual(ansi.truncateString("\u001b[37mABCDEFG好\u001b[39m", undefined, 8), "\u001b[37mAB...好\u001b[39m")
		assert.strictEqual(ansi.truncateString("\u001b[37mABCDEFG\u001b[39m", undefined, 13), "\u001b[37mABCDEFG\u001b[39m")
		assert.strictEqual(ansi.truncateString("\u001b[37m你A好B世C界D", undefined, 4), "\u001b[37m...")
		assert.strictEqual(ansi.truncateString("你\u001b[37mA好B世C界D", undefined, 5), "\u001b[37m...")
		assert.strictEqual(ansi.truncateString("你\u001b[37mA好\u001b[39mB世C界D", undefined, 5), "\u001b[37m\u001b[39m...")

		assert.strictEqual(ansi.truncateString("ABCDEFG好", "|", 8), "ABC|G好")
		assert.strictEqual(ansi.truncateString("ABCDEFG好", "", 8), "ABCFG好")

		assert.strictEqual(ansi.truncateString("A\r\nB\r\n", "|", 10), "A  B  ")

		await simulateNoneTTYStream(() => {
			assert.strictEqual(ansi.truncateString("\u001b[37mABCDEFG\u001b[39m"), "\u001b[37mABCDEFG\u001b[39m")
		})
	}

	export async function wrapStringTest() {
		assert.deepStrictEqual(ansi.wrapString("I love you", undefined, 10), ["I love", "you"])
		assert.deepStrictEqual(ansi.wrapString("I love you", 2, 10), ["I love", "  you"])

		assert.deepStrictEqual(ansi.wrapString("A"), ["A"])
		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 0, 0), ["A", "B", "C", "D", "E", "F", "G"])
		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 0, 1), ["A", "B", "C", "D", "E", "F", "G"])
		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 0, 2), ["A", "B", "C", "D", "E", "F", "G"])
		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 2, 2), ["A", "  B", "  C", "  D", "  E", "  F", "  G"])

		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 0, 5), ["ABCD", "EFG"])
		assert.deepStrictEqual(ansi.wrapString("ABCDEFG", 2, 5), ["ABCD", "  EF", "  G"])

		assert.deepStrictEqual(ansi.wrapString("ABC DEFG", 0, 5), ["ABC", "DEFG"])
		assert.deepStrictEqual(ansi.wrapString("ABC DEFG", 2, 5), ["ABC", "  DE", "  FG"])

		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 1), ["你", "好", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 2), ["你", "好", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 3), ["你", "好", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 4), ["你", "好", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 5), ["你好", "世界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 2, 5), ["你好", "  世", "  界"])

		assert.deepStrictEqual(ansi.wrapString("你好A世界", 0, 1), ["你", "好", "A", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好A世界", 0, 2), ["你", "好", "A", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好A世界", 0, 3), ["你", "好", "A", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好A世界", 0, 4), ["你", "好A", "世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好A世界", 0, 5), ["你好", "A世", "界"])
		assert.deepStrictEqual(ansi.wrapString("你好A世界", 2, 5), ["你好", "  A", "  世", "  界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界", 0, 12), ["你好世界"])
		assert.deepStrictEqual(ansi.wrapString("你好世界A", 0, 12), ["你好世界A"])

		assert.deepStrictEqual(ansi.wrapString("hello world", 0, 5), ["hell", "o", "worl", "d"])
		assert.deepStrictEqual(ansi.wrapString("hello world", 0, 6), ["hello", "world"])
		assert.deepStrictEqual(ansi.wrapString("hello world", 0, 7), ["hello", "world"])
		assert.deepStrictEqual(ansi.wrapString("hello world", 0, 8), ["hello", "world"])
		assert.deepStrictEqual(ansi.wrapString("hello world", 0, Infinity), ["hello world"])

		assert.deepStrictEqual(ansi.wrapString("hello    world", 2, 6), ["hello", "    ", "  wor", "  ld"])
		assert.deepStrictEqual(ansi.wrapString("hello    world", 0, 5), ["hell", "o   ", "worl", "d"])

		assert.deepStrictEqual(ansi.wrapString("\u001b[37mABCDEFG\u001b[39m", 0, 5), ["\u001b[37mABCD", "EFG\u001b[39m"])
		assert.deepStrictEqual(ansi.wrapString("\u001b\u009b", 0, 300), ["\u001b\u009b"])

		assert.deepStrictEqual(ansi.wrapString("hello\r\nworld", 2, 6), ["hello", "world"])
		assert.deepStrictEqual(ansi.wrapString("hello\rworld", 2, 6), ["hello", "world"])
		assert.deepStrictEqual(ansi.wrapString("hello\nworld", 2, 6), ["hello", "world"])

		await simulateNoneTTYStream(() => {
			assert.deepStrictEqual(ansi.wrapString("hello world"), ["hello world"])
		})
	}

	export async function formatListTest() {
		assert.strictEqual(ansi.formatList(["item1", "item2", "item3"], undefined, 12), "item1  item2\nitem3")

		assert.strictEqual(ansi.formatList([]), "")
		assert.strictEqual(ansi.formatList([], 2, 20), "")
		assert.strictEqual(ansi.formatList(["xx", "yy"], 2, 20), "xx  yy")
		assert.strictEqual(ansi.formatList(["xx", "yy"], 2, 0), "xx\nyy")
		assert.strictEqual(ansi.formatList(["xx", "yy", "zz", "ff"], 2, 7), "xx  yy\nzz  ff")
		assert.strictEqual(ansi.formatList(["xxx", "yy", "zz", "ff"], 2, 8), "xxx  yy\nzz   ff")

		await simulateNoneTTYStream(() => {
			assert.strictEqual(ansi.formatList(["xxx", "yy", "zz", "ff"]), "xxx  yy   zz   ff")
		})
	}

	export async function formatTreeTest() {
		assert.strictEqual(ansi.formatTree([
			{ indent: 0, label: "1" },
			{ indent: 1, label: "1-1" },
			{ indent: 1, label: "1-2" },
			{ indent: 1, label: "1-3" },
			{ indent: 0, label: "2" }
		], 12), [
			"1",
			"├─ 1-1",
			"├─ 1-2",
			"└─ 1-3",
			"2"
		].join("\n"))

		assert.strictEqual(ansi.formatTree([
			{ indent: 0, label: "1" },
			{ indent: 1, label: "1-1" },
			{ indent: 1, label: "1-2" },
			{ indent: 1, label: "1-3" },
			{ indent: 2, label: "1-3-1" },
			{ indent: 2, label: "1-3-2" },
			{ indent: 0, label: "2" }
		], 12), [
			"1",
			"├─ 1-1",
			"├─ 1-2",
			"└─ 1-3",
			"   ├─ 1-3-1",
			"   └─ 1-3-2",
			"2"
		].join("\n"))
		assert.strictEqual(ansi.formatTree([
			{ indent: 0, label: "1" },
			{ indent: 1, label: "1-1" },
			{ indent: 1, label: "1-2" },
			{ indent: 2, label: "1-2-1" },
			{ indent: 2, label: "1-2-2" },
			{ indent: 1, label: "1-3" },
			{ indent: 2, label: "1-3-1" },
			{ indent: 2, label: "1-3-2" },
			{ indent: 0, label: "2" }
		], 12), [
			"1",
			"├─ 1-1",
			"├─ 1-2",
			"│  ├─ 1-2-1",
			"│  └─ 1-2-2",
			"└─ 1-3",
			"   ├─ 1-3-1",
			"   └─ 1-3-2",
			"2"
		].join("\n"))
		assert.strictEqual(ansi.formatTree([
			{ indent: 1, label: "1-1" },
			{ indent: 1, label: "1-2" },
			{ indent: 2, label: "1-2-1" },
			{ indent: 2, label: "1-2-2" },
			{ indent: 3, label: "1-2-2-1" },
			{ indent: 1, label: "1-3" },
			{ indent: 2, label: "1-3-1" },
			{ indent: 2, label: "1-3-2" }
		], Infinity), [
			"├─ 1-1",
			"├─ 1-2",
			"│  ├─ 1-2-1",
			"│  └─ 1-2-2",
			"│     └─ 1-2-2-1",
			"└─ 1-3",
			"   ├─ 1-3-1",
			"   └─ 1-3-2"
		].join("\n"))
		assert.strictEqual(ansi.formatTree([
			{ icon: "+ ", indent: 0, label: "1" },
			{ icon: "+ ", indent: 1, label: "1-1" },
			{ icon: "+ ", indent: 1, label: "1-2" },
			{ icon: "+ ", indent: 2, label: "1-2-1" },
			{ icon: "+ ", indent: 2, label: "1-2-2" },
			{ icon: "+ ", indent: 1, label: "1-3" },
			{ icon: "+ ", indent: 2, label: "1-3-1" },
			{ icon: "+ ", indent: 2, label: "1-3-2" },
			{ icon: "+ ", indent: 0, label: "2" }
		], Infinity), [
			"+ 1",
			"+ ├─ 1-1",
			"+ ├─ 1-2",
			"+ │  ├─ 1-2-1",
			"+ │  └─ 1-2-2",
			"+ └─ 1-3",
			"+    ├─ 1-3-1",
			"+    └─ 1-3-2",
			"+ 2"
		].join("\n"))

		assert.strictEqual(ansi.formatTree([]), "")

		assert.strictEqual(ansi.formatTree([
			{ indent: 1, label: "1-1" },
			{ indent: 1, label: "1-2" },
			{ indent: 2, label: "1-2\n-1" },
			{ indent: 2, label: "1-2-2" },
			{ indent: 3, label: "1-2-2\n-1" },
			{ indent: 1, label: "1-3" },
			{ indent: 2, label: "1-3-1" },
			{ indent: 2, label: "1-3-2" }
		], Infinity), [
			"├─ 1-1",
			"├─ 1-2",
			"│  ├─ 1-2",
			"│  │  -1",
			"│  └─ 1-2-2",
			"│     └─ 1-2-2",
			"│        -1",
			"└─ 1-3",
			"   ├─ 1-3-1",
			"   └─ 1-3-2"
		].join("\n"))

		await simulateNoneTTYStream(() => {
			assert.strictEqual(ansi.formatTree([
				{ icon: "+ ", indent: 0, label: "1" },
				{ icon: "+ ", indent: 1, label: "1-1" },
				{ icon: "+ ", indent: 1, label: "1-2" },
				{ icon: "+ ", indent: 2, label: "1-2-1" },
				{ icon: "+ ", indent: 2, label: "1-2-2" },
				{ icon: "+ ", indent: 1, label: "1-3" },
				{ icon: "+ ", indent: 2, label: "1-3-1" },
				{ icon: "+ ", indent: 2, label: "1-3-2" },
				{ icon: "+ ", indent: 0, label: "2" }
			], Infinity), [
				"+ 1",
				"+ ├─ 1-1",
				"+ ├─ 1-2",
				"+ │  ├─ 1-2-1",
				"+ │  └─ 1-2-2",
				"+ └─ 1-3",
				"+    ├─ 1-3-1",
				"+    └─ 1-3-2",
				"+ 2"
			].join("\n"))
		})
	}

	export async function formatTableTest() {
		assert.strictEqual(ansi.formatTable([["A", "B", "C"], ["ABC", "BBC", "CBC"]], ["left", "center", "right"], " | ", "-", Infinity), [
			"A   |  B  |   C",
			"--- | --- | ---",
			"ABC | BBC | CBC"
		].join("\n"))

		assert.strictEqual(ansi.formatTable([], undefined, undefined, undefined, 80), "")
		assert.strictEqual(ansi.formatTable([["1"]], undefined, undefined, undefined, 80), [
			"1"
		].join("\n"))
		assert.strictEqual(ansi.formatTable([["1"], ["2"]], undefined, undefined, undefined, 80), [
			"1",
			"2"
		].join("\n"))

		assert.strictEqual(ansi.formatTable([["A", "B", "C"], ["AB", "BB", "CB"]], undefined, undefined, undefined, 80), [
			"A   B   C ",
			"AB  BB  CB"
		].join("\n"))
		assert.strictEqual(ansi.formatTable([["A", "B", "C"], ["ABC", "BBC", "CBC"]], ["left", "center", "right"], undefined, undefined, 80), [
			"A     B     C",
			"ABC  BBC  CBC"
		].join("\n"))
		assert.strictEqual(ansi.formatTable([["A", "B", "C"], ["ABC", "BBCD", "CBC"]], ["left", "center", "right"], undefined, undefined, 80), [
			"A     B      C",
			"ABC  BBCD  CBC"
		].join("\n"))

		assert.strictEqual(ansi.formatTable([["123456", "123456", "123456"], ["123456", "123456", "123456"]], undefined, undefined, undefined, 22), [
			"123456  123456  12345",
			"                6    ",
			"123456  123456  12345",
			"                6    ",
		].join("\n"))
		assert.strictEqual(ansi.formatTable([["123456", "123456", "123456"], ["123456", "123456", "123456"]], undefined, undefined, undefined, 20), [
			"12345  12345  12345",
			"6      6      6    ",
			"12345  12345  12345",
			"6      6      6    ",
		].join("\n"))

		assert.strictEqual(ansi.formatTable([["1234", "1234"]], undefined, undefined, undefined, 1), [
			"1  1",
			"2  2",
			"3  3",
			"4  4",
		].join("\n"))
		assert.strictEqual(ansi.formatTable([["1", "1", "1", "1", "1", "1", "1"]], undefined, undefined, undefined, 3), [
			"1  1  1  1  1  1  1"
		].join("\n"))

		assert.strictEqual(ansi.formatTable([["名字", "我是描述\n换行"], ["名字", "我是描述\n换行"]], undefined, undefined, undefined, 13), [
			"名字  我是描",
			"      述    ",
			"      换行  ",
			"名字  我是描",
			"      述    ",
			"      换行  "
		].join("\n"))

		await simulateNoneTTYStream(() => {
			assert.strictEqual(ansi.formatTable([["A", "B", "C"], ["ABC", "BBC", "CBC"]], ["left", "center", "right"], " | ", "-"), [
				"A   |  B  |   C",
				"--- | --- | ---",
				"ABC | BBC | CBC"
			].join("\n"))
		})
	}

	export async function formatCodeFrameTest() {
		assert.strictEqual(ansi.formatCodeFrame("A\r\nB\nC", 1, 0, undefined, undefined, true, true, undefined, Infinity, 15), [
			"   1 | A",
			" > 2 | B",
			"     | ^",
			"   3 | C"
		].join("\n"))

		assert.strictEqual(ansi.formatCodeFrame("A", 0, undefined, undefined, undefined, false, false, undefined, undefined, undefined), "A")
		assert.strictEqual(ansi.formatCodeFrame("\u001b\u009b", 0, undefined, undefined, undefined, false, false, undefined, Infinity, Infinity), "␛␛")
		assert.strictEqual(ansi.formatCodeFrame("A", 0, 0, undefined, undefined, undefined, undefined, undefined, Infinity, 15), [
			" > 1 | A",
			"     | ^"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("\0\tA\r\n\tB\n\tC", 1, 1, undefined, undefined, true, true, undefined, Infinity, 15), [
			"   1 | \0    A",
			" > 2 |     B",
			"     |     ^",
			"   3 |     C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\rBCDEF\nC", 1, 2, undefined, undefined, true, true, undefined, Infinity, 15), [
			"   1 | A",
			" > 2 | BCDEF",
			"     |   ^",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEF\nC", 1, 2, 1, 3, true, true, undefined, Infinity, 15), [
			"   1 | A",
			" > 2 | BCDEF",
			"     |   ~",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBC你EF\nC", 1, 2, 1, 3, true, true, undefined, Infinity, 15), [
			"   1 | A",
			" > 2 | BC你EF",
			"     |   ~~",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, true, true, undefined, Infinity, 12), [
			"   1 | A",
			" > 2 | BCDE",
			"     |   ~~",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 6, 1, 6, true, true, undefined, Infinity, 12), [
			"   1 | ",
			" > 2 | FGH",
			"     |   ^",
			"   3 | "
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 5, 1, 6, true, true, undefined, Infinity, 12), [
			"   1 | ",
			" > 2 | EFGH",
			"     |   ~",
			"   3 | "].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 4, 1, 6, true, true, undefined, Infinity, 12), [
			"   1 | ",
			" > 2 | DEFG",
			"     |   ~~",
			"   3 | "
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 3, 1, 6, true, true, undefined, Infinity, 12), [
			"   1 | ",
			" > 2 | CDEF",
			"     |   ~~",
			"   3 | "
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCD你GH\nC", 1, 3, 1, 6, true, true, undefined, Infinity, 12), [
			"   1 | ",
			" > 2 | D你G",
			"     |  ~~~",
			"   3 | "
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, true, false, undefined, Infinity, 12), [
			"   1 | A",
			" > 2 | BCDE",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, true, false, undefined, 3, 12), [
			" > 2 | BCDE",
			"   3 | C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, true, false, undefined, 2, 12), [
			" > 2 | BCDE"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, false, true, undefined, Infinity, 12), [
			"A",
			"BCDEF",
			"  ~~~",
			"C"
		].join("\n"))
		assert.strictEqual(ansi.formatCodeFrame("A\nBCDEFGH\nC", 1, 2, 1, 9, false, true, undefined, 3, 12), [
			"BCDEF",
			"  ~~~"
		].join("\n"))

		await simulateNoneTTYStream(() => {
			assert.strictEqual(ansi.formatCodeFrame("A\r\nB\nC", 1, 0, undefined, undefined, true, true), [
				"   1 | A",
				" > 2 | B",
				"     | ^",
				"   3 | C"
			].join("\n"))
		})
	}

	export function ansiToHTMLTest() {
		assert.strictEqual(ansi.ansiToHTML("\u001b[90mxy\u001b[39mc", {}), `<span style="color: gray">xy</span>c`)

		assert.strictEqual(ansi.ansiToHTML("xy"), "xy")
		assert.strictEqual(ansi.ansiToHTML("\u001b[1mxy\u001b[21mc"), `<span style="font-weight: bold">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[1mxy\u001b[22mc"), `<span style="font-weight: bold">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[2mxy\u001b[21mc"), `<span style="font-weight: 100">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[3mxy\u001b[23mc"), `<span style="font-style: italic">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[4mxy\u001b[24mc"), `<span style="text-decoration: underline">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[30mxy\u001b[7mc"), `<span style="color: black">xy</span><span style="background-color: black">c</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[30mxy\u001b[7mc", { "black": "#000" }), `<span style="color: #000">xy</span><span style="background-color: #000">c</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[40mxy\u001b[7mc"), `<span style="background-color: black">xy</span><span style="color: black">c</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[40mxy\u001b[7mc", { "black": "#000" }), `<span style="background-color: #000">xy</span><span style="color: #000">c</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[30m\u001b[107mx\u001b[7mc"), `<span style="color: black"></span><span style="color: black; background-color: white">x</span><span style="color: white; background-color: black">c</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[40mxy\u001b[49mc"), `<span style="background-color: black">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[40mxy\u001b[49mc", {}), `<span style="background-color: black">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[100mxy\u001b[49mc", {}), `<span style="background-color: gray">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[0mxy\u001b[7mc"), `xyc`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[8mxy\u001b[28mc"), `<span style="display: none">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[9mxy\u001b[29mc"), `<span style="text-decoration: line-through">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[53mxy\u001b[55mc"), `<span style="text-decoration: overline">xy</span>c`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[0mx"), `x`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[30mC\u001b[0m\u001b[40mB"), `<span style="color: black">C</span><span style="background-color: black">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[31mC\u001b[0m\u001b[41mB"), `<span style="color: darkred">C</span><span style="background-color: darkred">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[32mC\u001b[0m\u001b[42mB"), `<span style="color: darkgreen">C</span><span style="background-color: darkgreen">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[33mC\u001b[0m\u001b[43mB"), `<span style="color: olive">C</span><span style="background-color: olive">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[34mC\u001b[0m\u001b[44mB"), `<span style="color: navy">C</span><span style="background-color: navy">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[35mC\u001b[0m\u001b[45mB"), `<span style="color: darkmagenta">C</span><span style="background-color: darkmagenta">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[36mC\u001b[0m\u001b[46mB"), `<span style="color: darkcyan">C</span><span style="background-color: darkcyan">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[37mC\u001b[0m\u001b[47mB"), `<span style="color: sliver">C</span><span style="background-color: sliver">B</span>`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[90mC\u001b[0m\u001b[100mB"), `<span style="color: gray">C</span><span style="background-color: gray">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[91mC\u001b[0m\u001b[101mB"), `<span style="color: red">C</span><span style="background-color: red">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[92mC\u001b[0m\u001b[102mB"), `<span style="color: green">C</span><span style="background-color: green">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[93mC\u001b[0m\u001b[103mB"), `<span style="color: yellow">C</span><span style="background-color: yellow">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[94mC\u001b[0m\u001b[104mB"), `<span style="color: blue">C</span><span style="background-color: blue">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[95mC\u001b[0m\u001b[105mB"), `<span style="color: magenta">C</span><span style="background-color: magenta">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[96mC\u001b[0m\u001b[106mB"), `<span style="color: cyan">C</span><span style="background-color: cyan">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[97mC\u001b[0m\u001b[107mB"), `<span style="color: white">C</span><span style="background-color: white">B</span>`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[107mC\u001b[97mB"), `<span style="background-color: white">C</span><span style="background-color: white; color: white">B</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[107mC\u001b[107mB"), `<span style="background-color: white">CB</span>`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;196mhello"), `<span style="color: #ff0000">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;234mhello"), `<span style="color: #1c1c1c">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;250mhello"), `<span style="color: #bcbcbc">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;250;48;5;250mhello"), `<span style="color: #bcbcbc; background-color: #bcbcbc">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;171;1mfoo"), `<span style="color: #d75fff; font-weight: bold">foo</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[38;5;16;1mfoo"), `<span style="color: #000000; font-weight: bold">foo</span>`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[48;2;210;60;114mhello"), `<span style="background-color: #d23c72">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[48;2;155;42;45mhello", {}), `<span style="background-color: #9b2a2d">hello</span>`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[48;2;155;42;45mhello"), `<span style="background-color: #9b2a2d">hello</span>`)

		assert.strictEqual(ansi.ansiToHTML("\u001b[30mblack\u001b[39mdefault"), `<span style="color: black">black</span>default`)
		assert.strictEqual(ansi.ansiToHTML("\u001b[25oops forgot the 'm'"), `oops forgot the 'm'`)
	}

	export function getStringWidthTest() {
		assert.strictEqual(ansi.getStringWidth("xy"), 2)

		assert.strictEqual(ansi.getStringWidth(""), 0)
		assert.strictEqual(ansi.getStringWidth("中文"), 4)
		assert.strictEqual(ansi.getStringWidth("中y"), 3)

		assert.strictEqual(ansi.getStringWidth("abcde"), 5)
		assert.strictEqual(ansi.getStringWidth("古池や"), 6)
		assert.strictEqual(ansi.getStringWidth("あいうabc"), 9)
		assert.strictEqual(ansi.getStringWidth("ノード.js"), 9)
		assert.strictEqual(ansi.getStringWidth("你好"), 4)
		assert.strictEqual(ansi.getStringWidth("안녕하세요"), 10)
		assert.strictEqual(ansi.getStringWidth("A\uD83C\uDE00BC"), 5, "surrogate")
		assert.strictEqual(ansi.getStringWidth("\u001B[31m\u001B[39m"), 0)
		assert.strictEqual(ansi.getStringWidth("\u001B]8https://github.com\u0007Click\u001B]8\u0007"), 5)
		assert.strictEqual(ansi.getStringWidth("\u{231A}"), 2, "⌚ default emoji presentation character (Emoji_Presentation)")
		assert.strictEqual(ansi.getStringWidth("\u{2194}\u{FE0F}"), 2, "↔️ default text presentation character rendered as emoji")
		assert.strictEqual(ansi.getStringWidth("\u{1F469}"), 2, "👩 emoji modifier base (Emoji_Modifier_Base)")
		assert.strictEqual(ansi.getStringWidth("\u{1F469}\u{1F3FF}"), 2, "👩🏿 emoji modifier base followed by a modifier")
		assert.strictEqual(ansi.getStringWidth("\u{231A}\u{231A}"), 4, "⌚ default emoji presentation character (Emoji_Presentation)")

		assert.strictEqual(ansi.getStringWidth("\0"), 1)
		assert.strictEqual(ansi.getStringWidth("x\u0300"), 2)

		assert.strictEqual(ansi.getStringWidth("\ufaff"), 2)
		assert.strictEqual(ansi.getStringWidth("\ufe19"), 2)
		assert.strictEqual(ansi.getStringWidth("\ufe6b"), 2)
		assert.strictEqual(ansi.getStringWidth("\uff60"), 2)
		assert.strictEqual(ansi.getStringWidth("\uffe6"), 2)

		assert.strictEqual(ansi.getStringWidth("12\n4"), 2)
		assert.strictEqual(ansi.getStringWidth("1\n24"), 2)
		assert.strictEqual(ansi.getStringWidth("1\r2222"), 4)
	}

	export function getCharWidthTest() {
		assert.strictEqual(ansi.getCharWidth("x".charCodeAt(0)), 1)
		assert.strictEqual(ansi.getCharWidth("中".charCodeAt(0)), 2)
		assert.strictEqual(ansi.getCharWidth("中".charCodeAt(0)), 2)

		assert.strictEqual(ansi.getCharWidth(0x1b001), 2)
		assert.strictEqual(ansi.getCharWidth(0x1f251), 2)
		assert.strictEqual(ansi.getCharWidth(0x3fffd), 2)
	}

}