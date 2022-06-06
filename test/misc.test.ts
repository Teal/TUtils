import * as assert from "assert"
import * as misc from "../src/misc"

export namespace miscTest {

	export function mergeTest() {
		assert.strictEqual(misc.merge(1, 2), 2)
		assert.deepStrictEqual(misc.merge({ a: 1 }, { b: 2 }), { a: 1, b: 2 })
		assert.deepStrictEqual(misc.merge({ a: [1] }, { a: [2] }), { a: [1, 2] })

		const obj = { a: null, b: 1 }
		obj.a = obj
		assert.strictEqual(misc.merge({ a: {} }, obj).b, 1)
	}

	export function stripBOMTest() {
		assert.deepStrictEqual(misc.stripBOM("\ufeffg"), "g")

		assert.deepStrictEqual(misc.stripBOM(""), "")
		assert.deepStrictEqual(misc.stripBOM("\ufeff"), "")
	}

	export function capitalizeTest() {
		assert.strictEqual(misc.capitalize("qwert"), "Qwert")
	}

	export function replaceStringTest() {
		assert.strictEqual(misc.replaceString("abc", /a/g, "$&"), "abc")
		assert.strictEqual(misc.replaceString("abc", /a/g, "$1"), "$1bc")
		assert.strictEqual(misc.replaceString("abc", /(a)/g, "$1"), "abc")
		assert.strictEqual(misc.replaceString("abc", /(a)/g, () => "$1"), "$1bc")
	}

	export function randomStringTest() {
		assert.deepStrictEqual(misc.randomString(8).length, 8)

		assert.deepStrictEqual(misc.randomString(100).length, 100)
		assert.deepStrictEqual(misc.randomString(0), "")
	}

	export function concatTest() {
		assert.deepStrictEqual(misc.concat([1, 2, 3, 4], [5]), [1, 2, 3, 4, 5])
		assert.deepStrictEqual(misc.concat(null, null), null)
		assert.deepStrictEqual(misc.concat([1], null), [1])
		assert.deepStrictEqual(misc.concat(null, [1]), [1])
	}

	export function pushIfNotExistsTest() {
		const foo = [1, 9, 0]
		misc.pushIfNotExists(foo, 1)
		assert.deepStrictEqual(foo, [1, 9, 0])
		misc.pushIfNotExists(foo, 2)
		assert.deepStrictEqual(foo, [1, 9, 0, 2])
	}

	export function binarySearchTest() {
		assert.deepStrictEqual(misc.binarySearch([1, 2, 3, 4, 5], 3), 2)
		assert.deepStrictEqual(misc.binarySearch([1, 2, 3, 4, 5], 4), 3)
		assert.deepStrictEqual(misc.binarySearch([1, 2, 3, 4, 5], 2), 1)
		assert.deepStrictEqual(misc.binarySearch([1, 2, 3, 4, 5], 3.5), ~3)
	}

	export function insertSortedTest() {
		assert.deepStrictEqual(test([1, 3, 5], 2), [1, 2, 3, 5])

		assert.deepStrictEqual(test([], 1), [1])
		assert.deepStrictEqual(test([0], 1), [0, 1])
		assert.deepStrictEqual(test([2], 1), [1, 2])
		assert.deepStrictEqual(test([1, 3], 2), [1, 2, 3])
		assert.deepStrictEqual(test([1, 3, 5], 3), [1, 3, 3, 5])
		assert.deepStrictEqual(test([1, 3, 5], 5), [1, 3, 5, 5])
		assert.deepStrictEqual(test([{ value: 1 }, { value: 3 }], { value: 1, foo: 1 }, (x, y) => x.value <= y.value), [{ value: 1 }, { value: 1, foo: 1 }, { value: 3 }])

		function test(array: any[], value: any, comparer = (x: any, y: any) => x <= y) {
			misc.insertSorted(array, value, comparer)
			return array
		}
	}

	export function removeTest() {
		const foo = [1, 9, 9, 0]
		assert.strictEqual(misc.remove(foo, 9), 1)
		assert.deepStrictEqual(foo, [1, 9, 0])
		assert.strictEqual(misc.remove(foo, 9), 1)
		assert.deepStrictEqual(foo, [1, 0])
		assert.strictEqual(misc.remove(foo, 9), -1)
		assert.deepStrictEqual(foo, [1, 0])
	}

	export function escapeRegExpTest() {
		assert.strictEqual(new RegExp(misc.escapeRegExp("\\s")).source, /\\s/.source)
	}

	export function formatDateTest() {
		assert.strictEqual(misc.formatDate(new Date("2014/01/01 03:05:07"), "yyMdHms"), "1411357")

		assert.strictEqual(misc.formatDate(new Date("2014/01/01 03:05:07"), "yyyy-MM-dd HH:mm:ss"), "2014-01-01 03:05:07")
		assert.strictEqual(misc.formatDate(new Date("2014/01/01 03:05:07"), "yyMMddHHmmss"), "140101030507")
		assert.strictEqual(misc.formatDate(new Date("2014/01/01 03:05:07"), "你好"), "你好")
		assert.strictEqual(misc.formatDate(new Date("2014/01/01 03:05:07"), "abc"), "abc")
	}

	export function formatRelativeDateTest() {
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:05:07")), "just now")

		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:05:00")), new Date("2014/01/01 03:05:07").toLocaleString())
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:05:08")), "1 seconds ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:05:57")), "50 seconds ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:06:06")), "59 seconds ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:06:07")), "1 minutes ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 03:06:19")), "1 minutes ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/01 04:06:19")), "1 hours ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/02 04:06:19")), "yesterday")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/03 04:06:19")), "2 days ago")
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/01/04 04:06:19")), new Date("2014/01/01 03:05:07").toLocaleDateString())
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2014/02/03 04:06:19")), new Date("2014/01/01 03:05:07").toLocaleDateString())
		assert.strictEqual(misc.formatRelativeDate(new Date("2014/01/01 03:05:07"), new Date("2015/02/03 04:06:19")), new Date("2014/01/01 03:05:07").toLocaleDateString())
	}

	export function formatHRTimeTest() {
		assert.strictEqual(misc.formatHRTime([1, 120000000]), "1.12s")

		assert.strictEqual(misc.formatHRTime([0, 0]), "0ms")
		assert.strictEqual(misc.formatHRTime([0, 1000]), "<0.01ms")
		assert.strictEqual(misc.formatHRTime([0, 9999]), "<0.01ms")
		assert.strictEqual(misc.formatHRTime([0, 10000]), "0.01ms")
		assert.strictEqual(misc.formatHRTime([0, 20000]), "0.02ms")
		assert.strictEqual(misc.formatHRTime([0, 100000]), "0.1ms")
		assert.strictEqual(misc.formatHRTime([0, 1000000]), "1ms")
		assert.strictEqual(misc.formatHRTime([0, 10000000]), "10ms")
		assert.strictEqual(misc.formatHRTime([0, 100000000]), "100ms")
		assert.strictEqual(misc.formatHRTime([0, 999999999]), "1000ms")
		assert.strictEqual(misc.formatHRTime([1, 0]), "1s")
		assert.strictEqual(misc.formatHRTime([1, 100000000]), "1.1s")
		assert.strictEqual(misc.formatHRTime([1, 110000000]), "1.11s")
		assert.strictEqual(misc.formatHRTime([1, 119000000]), "1.12s")
		assert.strictEqual(misc.formatHRTime([1, 306083663]), "1.31s")
		assert.strictEqual(misc.formatHRTime([1, 999999999]), "2s")
		assert.strictEqual(misc.formatHRTime([10, 0]), "10s")
		assert.strictEqual(misc.formatHRTime([60, 100000000]), "1min")
		assert.strictEqual(misc.formatHRTime([60, 999999999]), "1min")
		assert.strictEqual(misc.formatHRTime([120, 100000000]), "2min")
		assert.strictEqual(misc.formatHRTime([150, 100000000]), "2min30s")
		assert.strictEqual(misc.formatHRTime([200, 100000000]), "3min20s")
		assert.strictEqual(misc.formatHRTime([1500, 100000000]), "25min")
		assert.strictEqual(misc.formatHRTime([15000, 100000000]), "250min")
	}

	export function formatSizeTest() {
		assert.strictEqual(misc.formatSize(1000), "0.98KB")

		assert.strictEqual(misc.formatSize(0), "0B")
		assert.strictEqual(misc.formatSize(1), "1B")
		assert.strictEqual(misc.formatSize(1024), "1KB")
		assert.strictEqual(misc.formatSize(1024 * 1024), "1MB")
		assert.strictEqual(misc.formatSize(1024 * 1024 * 1024), "1GB")
		assert.strictEqual(misc.formatSize(1024 * 1024 * 1024 * 1024), "1TB")
	}

}