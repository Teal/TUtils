import * as assert from "assert"
import * as lineColumn from "../src/lineColumn"

export namespace lineColumnTest {

	export function indexToLineColumnTest() {
		assert.deepStrictEqual(lineColumn.indexToLineColumn("012\n456", 4), { line: 1, column: 0 })

		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", -1), { line: 0, column: -1 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 0), { line: 0, column: 0 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 1), { line: 0, column: 1 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 2), { line: 1, column: 0 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 3), { line: 1, column: 1 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 4), { line: 2, column: 0 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 5), { line: 2, column: 1 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 6), { line: 2, column: 2 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 7), { line: 3, column: 0 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 8), { line: 3, column: 1 })
		assert.deepStrictEqual(lineColumn.indexToLineColumn("0\r2\n4\r\n7", 9), { line: 3, column: 2 })
	}

	export function lineColumnToIndexTest() {
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("012\n456", { line: 1, column: 0 }), 4)

		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 0, column: -1 }), -1)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 0, column: 0 }), 0)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 0, column: 1 }), 1)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 1, column: 0 }), 2)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 1, column: 1 }), 3)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 2, column: 0 }), 4)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 2, column: 1 }), 5)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 2, column: 2 }), 6)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 3, column: 0 }), 7)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 3, column: 1 }), 8)
		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 3, column: 2 }), 9)

		assert.deepStrictEqual(lineColumn.lineColumnToIndex("0\r2\n4\r\n7", { line: 4, column: 0 }), 8)
	}

	export namespace lineMapTest {

		export function indexToLineColumnTest() {
			const lineMap = new lineColumn.LineMap("0\r2\n4\r\n7")
			assert.deepStrictEqual(lineMap.indexToLineColumn(-1), { line: 0, column: -1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(0), { line: 0, column: 0 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(1), { line: 0, column: 1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(2), { line: 1, column: 0 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(3), { line: 1, column: 1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(4), { line: 2, column: 0 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(5), { line: 2, column: 1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(6), { line: 2, column: 2 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(7), { line: 3, column: 0 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(8), { line: 3, column: 1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(9), { line: 3, column: 2 })

			assert.deepStrictEqual(lineMap.indexToLineColumn(9), { line: 3, column: 2 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(3), { line: 1, column: 1 })
			assert.deepStrictEqual(lineMap.indexToLineColumn(7), { line: 3, column: 0 })
		}

		export function lineColumnToIndexTest() {
			const lineMap = new lineColumn.LineMap("0\r2\n4\r\n7")
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 0, column: -1 }), -1)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 0, column: 0 }), 0)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 0, column: 1 }), 1)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 1, column: 0 }), 2)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 1, column: 1 }), 3)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 2, column: 0 }), 4)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 2, column: 1 }), 5)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 2, column: 2 }), 6)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 3, column: 0 }), 7)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 3, column: 1 }), 8)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 3, column: 2 }), 9)

			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 3, column: 2 }), 9)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 1, column: 1 }), 3)
			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 3, column: 0 }), 7)

			assert.deepStrictEqual(lineMap.lineColumnToIndex({ line: 4, column: 0 }), 8)
		}

	}

	export function addLineColumnTest() {
		assert.deepStrictEqual(lineColumn.addLineColumn({ line: 1, column: 2 }, 10, 4), { line: 11, column: 4 })

		assert.deepStrictEqual(lineColumn.addLineColumn({ line: 1, column: 2 }, 0, 4), { line: 1, column: 6 })
		assert.deepStrictEqual(lineColumn.addLineColumn({ line: 1, column: 2 }, -1, 4), { line: 0, column: 4 })
	}

	export function compareLineColumnTest() {
		assert.ok(lineColumn.compareLineColumn({ line: 1, column: 2 }, { line: 11, column: 4 }) < 0)

		assert.ok(lineColumn.compareLineColumn({ line: 11, column: 4 }, { line: 1, column: 2 }) > 0)
		assert.ok(lineColumn.compareLineColumn({ line: 11, column: 4 }, { line: 11, column: 2 }) > 0)
		assert.ok(lineColumn.compareLineColumn({ line: 11, column: 2 }, { line: 11, column: 4 }) < 0)
		assert.ok(lineColumn.compareLineColumn({ line: 1, column: 100 }, { line: 2, column: 0 }) < 0)
		assert.ok(lineColumn.compareLineColumn({ line: 1, column: 2 }, { line: 1, column: 2 }) === 0)
	}


}