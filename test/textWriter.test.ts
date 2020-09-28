import * as assert from "assert"
import * as sourceMap from "../src/sourceMap"
import * as textWriter from "../src/textWriter"

export namespace textWriterTest {

	export function writeTest() {
		const writer = new textWriter.TextWriter()

		writer.write("A")
		assert.strictEqual(writer.toString(), "A")

		writer.write("_B_", 1, 2)
		assert.strictEqual(writer.toString(), "AB")

		writer.write("")
		assert.strictEqual(writer.toString(), "AB")
	}

	export function writeSourceMapTest() {
		const writer = new textWriter.SourceMapTextWriter()

		writer.write("A")
		assert.strictEqual(writer.toString(), "A")

		writer.write("_B_", 1, 2)
		assert.strictEqual(writer.toString(), "AB")

		writer.write("C", undefined, undefined, "goo.js", 0, 0)
		assert.strictEqual(writer.toString(), "ABC")

		writer.write("_D_", 1, 2, "hoo.js", 2, 0)
		assert.strictEqual(writer.toString(), "ABCD")

		writer.write("", 0, 0, "empty.js", 0, 0)
		assert.strictEqual(writer.toString(), "ABCD")

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true), null)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 1, true, true), null)

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 2, true, true)!.sourcePath, "goo.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 2, true, true)!.line, 0)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 2, true, true)!.column, 0)

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 3, true, true)!.sourcePath, "hoo.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 3, true, true)!.line, 2)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 3, true, true)!.column, 0)

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 4, true, true)!.sourcePath, "hoo.js")
	}

	export function indentTest() {
		const writer = new textWriter.TextWriter()
		writer.indent()
		writer.write("A")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA")

		writer.indent()
		writer.write("\nB")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA\n\tB")

		writer.indent()
		writer.write("\r\nR")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA\n\tB\r\n\tR")
	}

	export function indentSourceMapTest() {
		const writer = new textWriter.SourceMapTextWriter()
		writer.indent()
		writer.write("A")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA")

		writer.indent()
		writer.write("\nB")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA\n\tB")

		writer.indent()
		writer.write("\r\nR")
		writer.unindent()
		assert.strictEqual(writer.toString(), "\tA\n\tB\r\n\tR")
	}

	export function mergeSourceMapTest1() {
		const map = new sourceMap.SourceMapBuilder()
		map.file = "goo.js"
		map.addMapping(1, 1, "hoo.js", 100, 101, "B")
		map.addMapping(1, 2, "hoo2.js", 200, 201, "C")

		const writer = new textWriter.SourceMapTextWriter()
		writer.write("\r\nABC", undefined, undefined, "goo.js", 0, 0, undefined, map)
		assert.strictEqual(writer.toString(), "\r\nABC")

		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 0, true, true)!.sourcePath, undefined)

		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 1, true, true)!.sourcePath, "hoo.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 1, true, true)!.line, 100)
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 1, true, true)!.column, 101)
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 1, true, true)!.name, "B")

		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 2, true, true)!.sourcePath, "hoo2.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 2, true, true)!.line, 200)
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 2, true, true)!.column, 201)
		assert.strictEqual(writer.sourceMapBuilder.getSource(1, 2, true, true)!.name, "C")
	}

	export function mergeSourceMapTest2() {
		const map = new sourceMap.SourceMapBuilder()
		map.file = "goo.js"
		map.addMapping(0, 0, "hoo1.js", 11, 1, "A")
		map.addMapping(0, 1, "hoo2.js", 12, 2, "B")
		map.addMapping(0, 2, "hoo3.js", 13, 3, "C")
		map.addMapping(0, 3, "hoo4.js", 14, 4, "D")

		const writer = new textWriter.SourceMapTextWriter()
		writer.write("ABC", 1, undefined, "goo.js", 0, 1, undefined, map)
		assert.strictEqual(writer.toString(), "BC")

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.sourcePath, "hoo2.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.line, 12)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.column, 2)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.name, "B")

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 1, true, true)!.sourcePath, "hoo3.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 1, true, true)!.line, 13)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 1, true, true)!.column, 3)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 1, true, true)!.name, "C")

		writer.write("ABC", 1, undefined, "goo.js", 100, 0, undefined, map)
		assert.strictEqual(writer.toString(), "BCBC")
	}

	export function mergeSourceMapTest3() {
		const map = new sourceMap.SourceMapBuilder()
		map.file = "goo.js"
		map.addMapping(0, 0, "hoo1.js", 11, 1, "A")
		map.addMapping(0, 1, "hoo2.js", 12, 2, "B")
		map.addMapping(0, 2, "hoo3.js", 13, 3, "C")
		map.addMapping(1, 3, "hoo4.js", 14, 4, "D")

		const writer = new textWriter.SourceMapTextWriter()
		writer.write("AB\rC", 1, undefined, "goo.js", 0, 1, undefined, map)
		assert.strictEqual(writer.toString(), "B\rC")

		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.sourcePath, "hoo2.js")
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.line, 12)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.column, 2)
		assert.strictEqual(writer.sourceMapBuilder.getSource(0, 0, true, true)!.name, "B")

		assert.strictEqual(writer.sourceMap.version, 3)
	}

	export function mergeSourceMapTest4() {
		const source = [
			"*/ let variable = 1 + 2\n",
			"function fn() {\r",
			"\t// comment\r\n",
			"    return 2\r",
			"}/*\n"
		].join("")
		const map = new sourceMap.SourceMapBuilder()
		map.addMapping(0, 1)
		map.addMapping(0, 3, "source1", 100, 10)
		map.addMapping(0, 7, "source2", 200, 20, "variable")
		map.addMapping(0, 18, "source3", 300, 30)
		map.addMapping(1, 0, "source1", 400, 40)
		map.addMapping(1, 9, "source4", 500, 50, "fn")
		map.addMapping(2, 1)
		map.addMapping(3, 5, "source1", 200, 20)

		const writer1 = new textWriter.SourceMapTextWriter()
		writer1.write(source, 2, source.length - 2, undefined, 0, 2, undefined, map)
		assert.strictEqual(writer1.toString(), source.slice(2, -2))

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 0, true, true)!.sourcePath, undefined)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 0, true, true)!.line, undefined)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 0, true, true)!.column, undefined)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 0, true, true)!.name, undefined)

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 1, true, true)!.sourcePath, "source1")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 1, true, true)!.line, 100)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 1, true, true)!.column, 10)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 1, true, true)!.name, undefined)

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 2, true, true)!.sourcePath, "source1")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 2, true, true)!.line, 100)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 2, true, true)!.column, 11)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 2, true, true)!.name, undefined)

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 3, true, true)!.sourcePath, "source1")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 3, true, true)!.line, 100)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 3, true, true)!.column, 12)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 3, true, true)!.name, undefined)

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 4, true, true)!.sourcePath, "source1")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 4, true, true)!.line, 100)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 4, true, true)!.column, 13)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 4, true, true)!.name, undefined)

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 5, true, true)!.sourcePath, "source2")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 5, true, true)!.line, 200)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 5, true, true)!.column, 20)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 5, true, true)!.name, "variable")

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 6, true, true)!.sourcePath, "source2")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 6, true, true)!.line, 200)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 6, true, true)!.column, 21)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 6, true, true)!.name, "variable")

		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 7, true, true)!.sourcePath, "source2")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 7, true, true)!.line, 200)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 7, true, true)!.column, 22)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(0, 7, true, true)!.name, "variable")

		assert.strictEqual(writer1.sourceMapBuilder.getSource(1, 9, true, true)!.sourcePath, "source4")
		assert.strictEqual(writer1.sourceMapBuilder.getSource(1, 9, true, true)!.line, 500)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(1, 9, true, true)!.column, 50)
		assert.strictEqual(writer1.sourceMapBuilder.getSource(1, 9, true, true)!.name, "fn")

		assert.strictEqual(writer1.sourceMap.version, 3)

		const writer2 = new textWriter.SourceMapTextWriter()
		writer2.write(source, 6, source.length - 2, undefined, 0, 6, undefined, map)
		assert.strictEqual(writer2.toString(), source.slice(6, -2))
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 0, true, true)!.sourcePath, "source1")
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 0, true, true)!.line, 100)
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 0, true, true)!.column, 13)
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 0, true, true)!.name, undefined)

		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 1, true, true)!.sourcePath, "source2")
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 1, true, true)!.line, 200)
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 1, true, true)!.column, 20)
		assert.strictEqual(writer2.sourceMapBuilder.getSource(0, 1, true, true)!.name, "variable")

		const writer3 = new textWriter.SourceMapTextWriter()
		writer3.write(source, 17, source.length - 2, undefined, 0, 17, undefined, map)
		assert.strictEqual(writer3.toString(), source.slice(17, -2))
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 0, true, true)!.sourcePath, "source2")
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 0, true, true)!.line, 200)
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 0, true, true)!.column, 30)
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 0, true, true)!.name, "variable")

		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 1, true, true)!.sourcePath, "source3")
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 1, true, true)!.line, 300)
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 1, true, true)!.column, 30)
		assert.strictEqual(writer3.sourceMapBuilder.getSource(0, 1, true, true)!.name, undefined)
	}

	export function generateEmptySourceMapTest() {
		const lines = [
			` \taA0_$你好-,;()[]{}+\n`,
			"function fn() {\r",
			"\t// comment\r\n",
			"    return 2\r",
			"}/*\n"
		]
		const writer = new textWriter.SourceMapTextWriter()
		writer.write(lines.join(""), undefined, undefined, "source", 0, 0)
		assert.strictEqual(writer.toString(), lines.join(""))

		for (let i = 0; i < lines[0].length; i++) {
			assert.strictEqual(writer.sourceMapBuilder.getSource(0, i, true, true)!.sourcePath, "source")
			assert.strictEqual(writer.sourceMapBuilder.getSource(0, i, true, true)!.line, 0)
			assert.strictEqual(writer.sourceMapBuilder.getSource(0, i, true, true)!.column, i)
			assert.strictEqual(writer.sourceMapBuilder.getSource(0, i, true, true)!.name, undefined)
		}
	}

	export function noSourceMapTest() {
		const lines = [
			` \taA0_$你好-,;()[]{}+\n`,
			"function fn() {\r",
			"\t// comment\r\n",
			"    return 2\r",
			"}/*\n"
		]
		const writer1 = new textWriter.TextWriter()
		writer1.indent()
		writer1.write(lines.join(""))
		writer1.unindent()
		assert.strictEqual(writer1.toString(), lines.map(source => `\t${source}`).join(""))

		const writer2 = new textWriter.SourceMapTextWriter()
		writer2.indent()
		writer2.write(lines.join(""))
		writer2.unindent()
		assert.strictEqual(writer2.toString(), lines.map(source => `\t${source}`).join(""))
	}

	export function noColumnsTest() {
		const source = [
			` \taA0_$你好-,;()[]{}+\n`,
			"function fn() {\r",
			"\t// comment\r\n",
			"    return 2\r",
			"}/*\n"
		].join("")
		const writer1 = new textWriter.TextWriter()
		writer1.write(source)
		assert.strictEqual(writer1.toString(), source)

		const writer2 = new textWriter.SourceMapTextWriter()
		writer2.noColumnMappings = true
		writer2.write(source, undefined, undefined, writer2.sourceMapBuilder.addSource("source"), 0, 0, "foo")
		assert.strictEqual(writer2.toString(), source)
	}

}