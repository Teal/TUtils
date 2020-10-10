import * as assert from "assert"
import * as jsx from "../src/jsx"

export namespace jsxTest {

	export function jsxTest() {
		assert.strictEqual(jsx.jsx("button", {
			id: "my",
			title: undefined,
			disabled: true,
			readOnly: false
		}, "Hello", " World").toString(), `<button id="my" disabled>Hello World</button>`)

		assert.strictEqual(jsx.jsx("br", null).toString(), `<br>`)
		assert.strictEqual(jsx.jsx("div", null, ["1", jsx.jsx("span", null), "2", null, undefined], null).toString(), `<div>1<span></span>2</div>`)
		assert.strictEqual(jsx.jsx(jsx.Fragment, null, null, undefined, jsx.jsx("img", null)).toString(), `<img>`)
	}

}