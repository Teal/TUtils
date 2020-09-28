import * as assert from "assert"
import * as sourceMap from "../src/sourceMap"

export namespace sourceMapTest {

	const map = {
		version: 3,
		file: "f",
		sourceRoot: "r",
		sources: ["s1", "s2"],
		sourcesContent: ["c1", "c2"],
		names: ["n1", "n2"],
		mappings: ";AAUoG,EAUoGA;;AAUoG,UCftJ,UDKkD,UCKkD,CDVpG;;;C,MCyL5I,6FDpGLC"
	}
	const resolvedMappings = [
		[],
		[
			{ generatedColumn: 0, sourceIndex: 0, sourceLine: 10, sourceColumn: 100 },
			{ generatedColumn: 2, sourceIndex: 0, sourceLine: 20, sourceColumn: 200, nameIndex: 0 }
		],
		[],
		[
			{ generatedColumn: 0, sourceIndex: 0, sourceLine: 30, sourceColumn: 300 },
			{ generatedColumn: 10, sourceIndex: 1, sourceLine: 15, sourceColumn: 150 },
			{ generatedColumn: 20, sourceIndex: 0, sourceLine: 20, sourceColumn: 200 },
			{ generatedColumn: 30, sourceIndex: 1, sourceLine: 25, sourceColumn: 250 },
			{ generatedColumn: 31, sourceIndex: 0, sourceLine: 15, sourceColumn: 150 }
		],
		[],
		[],
		[
			{ generatedColumn: 1 },
			{ generatedColumn: 7, sourceIndex: 1, sourceLine: 200, sourceColumn: 10 },
			{ generatedColumn: 100, sourceIndex: 0, sourceLine: 100, sourceColumn: 5, nameIndex: 1 }
		]
	]

	function clean(obj?: sourceMap.SourceLocation | sourceMap.SourceLocation[]) {
		if (Array.isArray(obj)) {
			obj.forEach(clean)
		} else if (obj) {
			delete obj.mapping
		}
		return obj
	}

	export function toSourceMapStringTest() {
		assert.deepStrictEqual(JSON.parse(sourceMap.toSourceMapString(map)), map)
		assert.deepStrictEqual(JSON.parse(sourceMap.toSourceMapString(JSON.stringify(map))), map)
		assert.deepStrictEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapObject(map))), map)
		assert.deepStrictEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapBuilder(map))), map)
	}

	export function toSourceMapObjectTest() {
		assert.deepStrictEqual(sourceMap.toSourceMapObject(map), map)
		assert.deepStrictEqual(sourceMap.toSourceMapObject(JSON.stringify(map)), map)
		assert.deepStrictEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapObject(map)), map)
		assert.deepStrictEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapBuilder(map)), map)
		assert.throws(() => sourceMap.toSourceMapObject({ version: 3, sections: [] }))
		assert.throws(() => sourceMap.toSourceMapObject({ version: 2, sources: [], mappings: "" }))
	}

	export function toSourceMapBuilderTest() {
		assert.deepStrictEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map)
		assert.deepStrictEqual(sourceMap.toSourceMapBuilder(JSON.stringify(map)).toJSON(), map)
		assert.deepStrictEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapObject(map)).toJSON(), map)
		assert.deepStrictEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapBuilder(map)).toJSON(), map)

		assert.strictEqual(sourceMap.toSourceMapBuilder({ file: "file" } as any).file, "file")
	}

	export function parseTest() {
		const builder = new sourceMap.SourceMapBuilder(map)
		assert.strictEqual(builder.version, map.version)
		assert.strictEqual(builder.file, map.file)
		assert.strictEqual(builder.sourceRoot, map.sourceRoot)
		assert.deepStrictEqual(builder.sources, map.sources)
		assert.deepStrictEqual(builder.names, map.names)
		assert.deepStrictEqual(builder.mappings, resolvedMappings)

		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "A"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AA"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AAA"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AAAA"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AAAAA"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AAAAAAAAA"
		})
		new sourceMap.SourceMapBuilder({
			version: 3,
			sources: ["foo.js"],
			mappings: "AAAA,AAAAA,AAAAAA,AAAAAAAAA,AAAAAAAA,,;;a,9,+,/,g,h"
		})
	}

	export function formatTest() {
		assert.deepStrictEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map)
		assert.deepStrictEqual(JSON.parse(sourceMap.toSourceMapBuilder(map).toString()), map)
		assert.deepStrictEqual(JSON.parse(JSON.stringify(sourceMap.toSourceMapBuilder(map))), map)

		const s1 = new sourceMap.SourceMapBuilder()
		s1.addMapping(10002, 1043433)
		const s2 = new sourceMap.SourceMapBuilder(s1.toString())
		assert.strictEqual(s2.mappings[10002][0].generatedColumn, 1043433)

		new sourceMap.SourceMapBuilder().toJSON()
	}

	export function getSourceTest() {
		const builder = sourceMap.toSourceMapBuilder(map)
		assert.deepStrictEqual(clean(builder.getSource(1, 0)), { sourcePath: "s1", line: 10, column: 100 })

		assert.deepStrictEqual(clean(builder.getSource(0, 0, true, true)), null)
		assert.deepStrictEqual(clean(builder.getSource(0, 1, true, true)), null)
		assert.deepStrictEqual(clean(builder.getSource(0, 2, true, true)), null)
		assert.deepStrictEqual(clean(builder.getSource(1, 0, true, true)), { sourcePath: "s1", line: 10, column: 100 })
		assert.deepStrictEqual(clean(builder.getSource(1, 1, true, true)), { sourcePath: "s1", line: 10, column: 101 })
		assert.deepStrictEqual(clean(builder.getSource(1, 2, true, true)), { sourcePath: "s1", line: 20, column: 200, name: "n1" })
		assert.deepStrictEqual(clean(builder.getSource(1, 3, true, true)), { sourcePath: "s1", line: 20, column: 201, name: "n1" })
		assert.deepStrictEqual(clean(builder.getSource(1, 4, true, true)), { sourcePath: "s1", line: 20, column: 202, name: "n1" })
		assert.deepStrictEqual(clean(builder.getSource(2, 0, true, true)), { sourcePath: "s1", line: 21, column: 0 })
		assert.deepStrictEqual(clean(builder.getSource(2, 1, true, true)), { sourcePath: "s1", line: 21, column: 1 })
		assert.deepStrictEqual(clean(builder.getSource(3, 0, true, true)), { sourcePath: "s1", line: 30, column: 300 })
		assert.deepStrictEqual(clean(builder.getSource(3, 1, true, true)), { sourcePath: "s1", line: 30, column: 301 })
		assert.deepStrictEqual(clean(builder.getSource(3, 5, true, true)), { sourcePath: "s1", line: 30, column: 305 })
		assert.deepStrictEqual(clean(builder.getSource(3, 6, true, true)), { sourcePath: "s1", line: 30, column: 306 })
		assert.deepStrictEqual(clean(builder.getSource(3, 7, true, true)), { sourcePath: "s1", line: 30, column: 307 })
		assert.deepStrictEqual(clean(builder.getSource(3, 8, true, true)), { sourcePath: "s1", line: 30, column: 308 })
		assert.deepStrictEqual(clean(builder.getSource(3, 9, true, true)), { sourcePath: "s1", line: 30, column: 309 })
		assert.deepStrictEqual(clean(builder.getSource(3, 10, true, true)), { sourcePath: "s2", line: 15, column: 150 })
		assert.deepStrictEqual(clean(builder.getSource(3, 17, true, true)), { sourcePath: "s2", line: 15, column: 157 })
		assert.deepStrictEqual(clean(builder.getSource(3, 18, true, true)), { sourcePath: "s2", line: 15, column: 158 })
		assert.deepStrictEqual(clean(builder.getSource(3, 19, true, true)), { sourcePath: "s2", line: 15, column: 159 })
		assert.deepStrictEqual(clean(builder.getSource(3, 20, true, true)), { sourcePath: "s1", line: 20, column: 200 })
		assert.deepStrictEqual(clean(builder.getSource(3, 21, true, true)), { sourcePath: "s1", line: 20, column: 201 })
		assert.deepStrictEqual(clean(builder.getSource(4, 0, true, true)), { sourcePath: "s1", line: 16, column: 0 })
		assert.deepStrictEqual(clean(builder.getSource(4, 1, true, true)), { sourcePath: "s1", line: 16, column: 1 })
		assert.deepStrictEqual(clean(builder.getSource(5, 0, true, true)), { sourcePath: "s1", line: 17, column: 0 })
		assert.deepStrictEqual(clean(builder.getSource(5, 1, true, true)), { sourcePath: "s1", line: 17, column: 1 })
		assert.deepStrictEqual(clean(builder.getSource(6, 1, true, true)), {})
		assert.deepStrictEqual(clean(builder.getSource(6, 2, true, true)), {})
		assert.deepStrictEqual(clean(builder.getSource(6, 3, true, true)), {})
		assert.deepStrictEqual(clean(builder.getSource(6, 7, true, true)), { sourcePath: "s2", line: 200, column: 10 })
		assert.deepStrictEqual(clean(builder.getSource(6, 8, true, true)), { sourcePath: "s2", line: 200, column: 11 })
		assert.deepStrictEqual(clean(builder.getSource(6, 9, true, true)), { sourcePath: "s2", line: 200, column: 12 })
		assert.deepStrictEqual(clean(builder.getSource(6, 100, true, true)), { sourcePath: "s1", line: 100, column: 5, name: "n2" })
		assert.deepStrictEqual(clean(builder.getSource(7, 0, true, true)), { sourcePath: "s1", line: 101, column: 0 })
		assert.deepStrictEqual(clean(builder.getSource(7, 1, true, true)), { sourcePath: "s1", line: 101, column: 1 })

		assert.deepStrictEqual(clean(builder.getSource(1, 3, false, true)), { sourcePath: "s1", line: 20, column: 200, name: "n1" })
		assert.deepStrictEqual(clean(builder.getSource(1, 3, false, false)), { sourcePath: "s1", line: 20, column: 200, name: "n1" })
		assert.deepStrictEqual(clean(builder.getSource(2, 0, false, false)), null)
		assert.deepStrictEqual(clean(builder.getSource(2, 0)), null)
		assert.deepStrictEqual(clean(builder.getSource(2, 1, false, true)), { sourcePath: "s1", line: 21, column: 0 })

		const builder2 = new sourceMap.SourceMapBuilder()
		builder2.addMapping(1, 1)
		assert.deepStrictEqual(clean(builder2.getSource(1, 1, true, true)), {})
		assert.deepStrictEqual(clean(builder2.getSource(2, 2, true, true)), {})
	}

	export function getAllGeneratedTest() {
		const builder = sourceMap.toSourceMapBuilder(map)
		assert.deepStrictEqual(clean(builder.getAllGenerated("s1", 20, 200)), [
			{ line: 1, column: 2 },
			{ line: 3, column: 20 }
		])

		assert.deepStrictEqual(clean(builder.getAllGenerated("s1", 20, 201)), [
			{ line: 1, column: 2 },
			{ line: 3, column: 20 }
		])
		assert.deepStrictEqual(clean(builder.getAllGenerated("s1", 20)), [
			{ line: 1, column: 2 },
			{ line: 3, column: 20 }
		])
		assert.deepStrictEqual(clean(builder.getAllGenerated("s2", 15, 150)), [
			{ line: 3, column: 10 }
		])

		assert.deepStrictEqual(clean(builder.getAllGenerated("other", 0)), [])

		assert.deepStrictEqual(clean(builder.getAllGenerated(1, 15, 150)), [
			{ line: 3, column: 10 }
		])

		const builder2 = new sourceMap.SourceMapBuilder()
		builder2.addMapping(1, 1, "x", 100, 100)
		assert.deepStrictEqual(clean(builder2.getAllGenerated("x", 100, 99)), [])
	}

	export function eachMappingTest() {
		const builder = new sourceMap.SourceMapBuilder()
		const added = builder.addMapping(0, 10, "s", 1, 2, "n")
		assert.deepStrictEqual(builder.eachMapping((generatedLine, generatedColumn, sourcePath, sourceLine, sourceColumn, name, mapping) => {
			assert.deepStrictEqual(generatedLine, 0)
			assert.deepStrictEqual(generatedColumn, 10)
			assert.deepStrictEqual(sourcePath, "s")
			assert.deepStrictEqual(sourceLine, 1)
			assert.deepStrictEqual(sourceColumn, 2)
			assert.deepStrictEqual(name, "n")
			assert.deepStrictEqual(mapping, added)
			return false
		}), false)

		const src = new sourceMap.SourceMapBuilder(map)
		const dest = new sourceMap.SourceMapBuilder()
		src.eachMapping((generatedLine, generatedColumn, sourcePath, sourceLine, sourceColumn, name) => {
			dest.addMapping(generatedLine, generatedColumn, sourcePath, sourceLine, sourceColumn, name)
		})
		assert.deepStrictEqual(src.toJSON().mappings, dest.toJSON().mappings)
	}

	export function addSourceTest() {
		const builder = new sourceMap.SourceMapBuilder()
		assert.strictEqual(builder.addSource("foo"), 0)
		assert.deepStrictEqual(builder.sources, ["foo"])
		assert.strictEqual(builder.addSource("foo"), 0)
		assert.strictEqual(builder.addSource("goo"), 1)
		assert.deepStrictEqual(builder.sources, ["foo", "goo"])
		assert.strictEqual(builder.addSource("goo"), 1)
	}

	export function addNameTest() {
		const builder = new sourceMap.SourceMapBuilder()
		assert.strictEqual(builder.addName("foo"), 0)
		assert.deepStrictEqual(builder.names, ["foo"])
		assert.strictEqual(builder.addName("foo"), 0)
		assert.strictEqual(builder.addName("goo"), 1)
		assert.deepStrictEqual(builder.names, ["foo", "goo"])
		assert.strictEqual(builder.addName("goo"), 1)
	}

	export function getSourceContentTest() {
		const builder = new sourceMap.SourceMapBuilder()
		assert.strictEqual(builder.getSourceContent("foo"), undefined)
		builder.addSource("foo")
		builder.setSourceContent("foo", "FOO")
		assert.strictEqual(builder.getSourceContent("foo"), "FOO")

		builder.setSourceContent("goo", "GOO")
		assert.strictEqual(builder.getSourceContent("goo"), "GOO")
	}

	export function setSourceContentTest() {
		const builder = new sourceMap.SourceMapBuilder()
		builder.addSource("foo")
		builder.setSourceContent("foo", "Foo")
		assert.deepStrictEqual(builder.sourcesContent, ["Foo"])

		builder.setSourceContent("goo", "GOO")
		assert.deepStrictEqual(builder.sourcesContent, ["Foo", "GOO"])
	}

	export function addMappingTest() {
		const builder = new sourceMap.SourceMapBuilder()
		builder.addMapping(0, 10, "foo.js", 1, 2)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 }
			]
		])
		builder.addMapping(0, 10, "foo.js", 1, 3)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			]
		])
		builder.addMapping(0, 9, "foo.js", 1, 3)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			]
		])
		builder.addMapping(1, 9, "foo.js", 1, 3, "name")
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			],
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
			]
		])
		builder.addMapping(1, 5, "foo.js", 1, 3, 0)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			],
			[
				{ generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
			]
		])
		builder.addMapping(1, 8, 0, 2, 7)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			],
			[
				{ generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
				{ generatedColumn: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
			]
		])
		builder.addMapping(1, 6)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			],
			[
				{ generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
				{ generatedColumn: 6 },
				{ generatedColumn: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
			]
		])
		builder.addMapping(1, 8)
		assert.deepStrictEqual(builder.mappings, [
			[
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
				{ generatedColumn: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
			],
			[
				{ generatedColumn: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
				{ generatedColumn: 6 },
				{ generatedColumn: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
				{ generatedColumn: 8 },
				{ generatedColumn: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
			]
		])
	}

	export function applySourceMapTest() {
		const s1 = new sourceMap.SourceMapBuilder()
		s1.addMapping(1, 1, "foo.js", 101, 99, "name1")
		s1.addMapping(1, 6, "foo.js", 101, 103)
		s1.addMapping(2, 0, "foo.js", 102, 9, "name1")
		s1.addMapping(10, 0, "foo.js", 200, 0)
		s1.addMapping(200, 200, "other", 401, 402, "name3")
		s1.addMapping(0, 100)

		const s2 = new sourceMap.SourceMapBuilder()
		s2.file = "foo.js"
		s2.addMapping(101, 101, "goo.js", 201, 202, "name4")
		s2.addMapping(101, 109, "goo.js", 201, 202)
		s2.addMapping(102, 0, "goo.js", 301, 302, "name2")
		s2.addMapping(200, 0, "content", 300, 300)
		s2.setSourceContent("content", "C")
		s1.applySourceMap(s2)

		const s3 = new sourceMap.SourceMapBuilder()
		s3.file = "path"
		s1.applySourceMap(s3)

		assert.deepStrictEqual(clean(s1.getSource(0, 0, true, true)), null)
		assert.deepStrictEqual(clean(s1.getSource(1, 1, true, true)), {})
		assert.deepStrictEqual(clean(s1.getSource(1, 2, true, true)), {})
		assert.deepStrictEqual(clean(s1.getSource(1, 3, true, true)), {})
		assert.deepStrictEqual(clean(s1.getSource(1, 4, true, true)), {})
		assert.deepStrictEqual(clean(s1.getSource(1, 5, true, true)), {})
		assert.deepStrictEqual(clean(s1.getSource(1, 6, true, true)), { sourcePath: "goo.js", line: 201, column: 204, name: "name4" })
		assert.deepStrictEqual(clean(s1.getSource(1, 7, true, true)), { sourcePath: "goo.js", line: 201, column: 205, name: "name4" })
		assert.deepStrictEqual(clean(s1.getSource(2, 0, true, true)), { sourcePath: "goo.js", line: 301, column: 311, name: "name2" })
		assert.deepStrictEqual(clean(s1.getSource(3, 0, true, true)), { sourcePath: "goo.js", line: 302, column: 0 })
		assert.deepStrictEqual(clean(s1.getSource(200, 200, true, true)), { sourcePath: "other", line: 401, column: 402, name: "name3" })
		assert.deepStrictEqual(clean(s1.getSource(10, 0, true, true)), { sourcePath: "content", line: 300, column: 300 })
		assert.deepStrictEqual(s1.getSourceContent("content"), "C")
		assert.deepStrictEqual(clean(s1.getSource(0, 100, true, true)), {})
	}

	export function getSourceMappingURLTest() {
		assert.strictEqual(sourceMap.getSourceMappingURL("\n/*# sourceMappingURL=a.js */"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("a\n/*# sourceMappingURL=a.js */"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("a\n//# sourceMappingURL=a.js"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("/*# sourceMappingURL=a.js */"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("//# sourceMappingURL=a.js"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("//# sourceMappingURL=a.js"), "a.js")
		assert.strictEqual(sourceMap.getSourceMappingURL("//@ sourceMappingURL="), "")
		assert.strictEqual(sourceMap.getSourceMappingURL("//@ sourceMap"), null)
	}

	export function setSourceMappingURLTest() {
		assert.strictEqual(sourceMap.setSourceMappingURL("", "a.js"), "\n/*# sourceMappingURL=a.js */")
		assert.strictEqual(sourceMap.setSourceMappingURL("a", "a.js"), "a\n/*# sourceMappingURL=a.js */")
		assert.strictEqual(sourceMap.setSourceMappingURL("a", "a.js", true), "a\n//# sourceMappingURL=a.js")
		assert.strictEqual(sourceMap.setSourceMappingURL("/*# sourceMappingURL=b.js */", "a.js"), "/*# sourceMappingURL=a.js */")
		assert.strictEqual(sourceMap.setSourceMappingURL("//# sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js")
		assert.strictEqual(sourceMap.setSourceMappingURL("//@ sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js")
		assert.strictEqual(sourceMap.setSourceMappingURL("foo//@ sourceMappingURL=b.js", null), "foo")
	}

	export function createSourceMappingURLCommentTest() {
		assert.strictEqual(sourceMap.createSourceMappingURLComment("a.js"), "/*# sourceMappingURL=a.js */")
		assert.strictEqual(sourceMap.createSourceMappingURLComment("a.js", true), "//# sourceMappingURL=a.js")
	}

	export function createSourceURLCommentTest() {
		assert.strictEqual(sourceMap.createSourceURLComment("a.js"), "//# sourceURL=a.js")
	}

}