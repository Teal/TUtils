import * as assert from "assert"
import * as req from "../src/require"

export namespace requireTest {

	export function transformESModuleToCommonJSTest() {
		assert.strictEqual(req.transformESModuleToCommonJS(`export var a = 1`), `var a = 1\nmodule.exports.a = a;`)

		assert.strictEqual(req.transformESModuleToCommonJS(`var a = 1`), `var a = 1`)
		assert.strictEqual(req.transformESModuleToCommonJS(`var a = "export var x"`), `var a = "export var x"`)

		assert.strictEqual(req.transformESModuleToCommonJS(`export let a = 1`), `let a = 1\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export const a = 1`), `const a = 1\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export function a() {}`), `function a() {}\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export async function a() {}`), `async function a() {}\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export function * a() {}`), `function * a() {}\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export function * a() {}`), `function * a() {}\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export function *a() {}`), `function *a() {}\nmodule.exports.a = a;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export async function *a() {}`), `async function *a() {}\nmodule.exports.a = a;`)

		assert.strictEqual(req.transformESModuleToCommonJS(`export default 1`), `module.exports.default = 1\nObject.defineProperty(module.exports, "__esModule", { value: true });`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export default var a`), `var a\nObject.defineProperty(module.exports, "__esModule", { value: true });\nmodule.exports.default = a;`)

		assert.strictEqual(req.transformESModuleToCommonJS(`export * from "fs"`), `Object.assign(module.exports, require("fs"));`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export {x} from "fs"`), `const {x} = require("fs"); Object.assign(module.exports, {x});`)
		assert.strictEqual(req.transformESModuleToCommonJS(`export {x as y} from "fs"`), `const {x : y} = require("fs"); Object.assign(module.exports, {x : y});`)

		assert.strictEqual(req.transformESModuleToCommonJS(`import "fs"`), `require("fs");`)
		assert.strictEqual(req.transformESModuleToCommonJS(`import * as fs from "fs"`), `const fs = require("fs");`)
		assert.strictEqual(req.transformESModuleToCommonJS(`import {readFile} from "fs"`), `const {readFile} = require("fs");`)
		assert.strictEqual(req.transformESModuleToCommonJS(`import {readFile as read} from "fs"`), `const {readFile : read} = require("fs");`)
		assert.strictEqual(req.transformESModuleToCommonJS(`import {readFile as read, writeFile} from "fs"`), `const {readFile : read, writeFile} = require("fs");`)

		assert.strictEqual(req.transformESModuleToCommonJS(`import fs from "fs"`), `const __fs = require("fs"), fs = __fs.__esModule ? __fs.default : __fs;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`import fs, {readFile} from "fs"`), `const __fs = require("fs"), fs = __fs.__esModule ? __fs.default : __fs, {readFile} = __fs;`)
		assert.strictEqual(req.transformESModuleToCommonJS(`importfs from "fs"`), `importfs from "fs"`)
	}

}