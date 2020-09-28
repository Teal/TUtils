import * as assert from "assert"
import * as textDocument from "../src/textDocument"

export namespace textDocumentTest {

	export function appendTest() {
		const writer = new textDocument.TextDocument("0123456789")
		writer.replace(1, 4, "BCD")
		assert.strictEqual(writer.toString(), "0BCD456789")

		writer.insert(5, "X")
		assert.strictEqual(writer.toString(), "0BCD4X56789")

		writer.remove(7, 8)
		assert.strictEqual(writer.toString(), "0BCD4X5689")

		writer.append("Y")
		assert.strictEqual(writer.toString(), "0BCD4X5689Y")

		writer.remove(0, 0)
		assert.strictEqual(writer.toString(), "0BCD4X5689Y")
	}

	export function appendFunctionTest() {
		const writer = new textDocument.TextDocument("0123456789")
		writer.replace(1, 4, (...args: any[]) => args.join(""))
		assert.strictEqual(writer.toString("B", "C", "D"), "0BCD456789")
		assert.strictEqual(writer.toString(), "0456789")

		writer.insert(5, new textDocument.TextDocument("X"))
		assert.strictEqual(writer.toString("B", "C", "D"), "0BCD4X56789")

		writer.remove(7, 8)
		assert.strictEqual(writer.toString("B", "C", "D"), "0BCD4X5689")

		writer.append((...args: any[]) => new textDocument.TextDocument(args.join("")))
		assert.strictEqual(writer.toString("Y"), "0Y4X5689Y")
	}

	export function sourceMapTest() {
		const writer = new textDocument.TextDocument("0123456789", "sourcePath")
		writer.replace(1, 4, "X")
		assert.strictEqual(writer.generate().content, "0X456789")
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 0).sourcePath, "sourcePath")
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 0).line, 0)
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 0).column, 0)
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 0).sourcePath, "sourcePath")
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 5).sourcePath, "sourcePath")
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 5).line, 0)
		assert.strictEqual(writer.generate().sourceMapBuilder.getSource(0, 5).column, 4)
		assert.strictEqual(writer.generate().sourceMap.sources[0], "sourcePath")

		const writer2 = new textDocument.TextDocument("0123456789", "sourcePath")
		assert.strictEqual(writer2.generate().content, "0123456789")
	}

	export function spliceTest() {
		assert.strictEqual(textDocument.splice({ content: "ABC", path: "source" }, 2, 0, "").content, "ABC")
		assert.strictEqual(textDocument.splice({ content: "ABC", path: "source" }, 1, 1, "D").content, "ADC")

		assert.strictEqual(textDocument.splice({ content: "ABC", path: "source", sourceMap: textDocument.splice({ content: "ABC", path: "source" }, 2, 0, "").sourceMap }, 1, 1, "D").content, "ADC")
	}

	export function replaceTest() {
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, "C", "D").content, "ABCDEFGHABCDEFG".replace("C", "D"))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /[B]/, "*$&*").content, "ABCDEFGHABCDEFG".replace(/[B]/, "*$&*"))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /([B])/, "-$1-$2-").content, "ABCDEFGHABCDEFG".replace(/([B])/, "-$1-$2-"))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /([B])/g, "-$1-$2-").content, "ABCDEFGHABCDEFG".replace(/([B])/g, "-$1-$2-"))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /([B])/g, (all, source, index) => all + index + source).content, "ABCDEFGHABCDEFG".replace(/([B])/g, (all, source, index) => all + index + source))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /([B])/g, null).content, "ABCDEFGHABCDEFG".replace(/([B])/g, null))

		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source", sourceMap: textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, "C", "D").sourceMap }, "C", "D").content, "ABCDEFGHABCDEFG".replace("C", "D"))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source", sourceMap: textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, /([B])/g, null).sourceMap }, /([B])/g, null).content, "ABCDEFGHABCDEFG".replace(/([B])/g, null))
		assert.strictEqual(textDocument.replace({ content: "ABCDEFGHABCDEFG", path: "source" }, "404", null).content, "ABCDEFGHABCDEFG".replace("404", null))
	}

}