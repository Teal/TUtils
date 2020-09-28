import * as assert from "assert"
import * as tpl from "../src/tpl"

export namespace tplTest {

	export async function compileTPLTest() {
		assert.strictEqual(tpl.compileTPL(`plain`)(), `plain`)
		assert.strictEqual(tpl.compileTPL(`<div></div>`)(), `<div></div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{$}</div>`)(1), `<div>1</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{$.x}</div>`)({ x: 1 }), `<div>1</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{$.y}</div>`)({}), `<div></div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{if($)}1{/if}</div>`)(true), `<div>1</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{if($)}1{/if}</div>`)(false), `<div></div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{if($)}1{else}2{/if}</div>`)(true), `<div>1</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{if($)}1{else}2{/if}</div>`)(false), `<div>2</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{for(const p of $)}{p}{/if}</div>`)([1, 2, 3]), `<div>123</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{var i = 1}{while (i <= $)}{i++}{/while}</div>`)(3), `<div>123</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{const x = 1}{switch (x)}{case 1}1{break}{/switch}</div>`)(3), `<div>1</div>`)
		assert.strictEqual(tpl.compileTPL(`<div>{let x = 1}{try}1{catch}2{finally}3{/try}</div>`)(3), `<div>13</div>`)
		assert.strictEqual(tpl.compileTPL(`{function fn(x)}{x}{/function}{fn(1)}`)(3), `1`)
		assert.strictEqual(tpl.compileTPL(`1{}3`)(), `13`)
		assert.strictEqual(tpl.compileTPL(`{void 1}`)(), ``)
		assert.strictEqual(tpl.compileTPL(`{"<"}`)(), `&lt;`)
		assert.strictEqual(tpl.compileTPL(`@{"<"}`)(), `<`)
		assert.strictEqual(tpl.compileTPL(`{'}'}`)(), `}`)
		assert.strictEqual(tpl.compileTPL(`{/}/}`)(), `/}/`)
		assert.strictEqual(tpl.compileTPL(`{\`\${/}/ /*}*/}$\\}\`}`)(), `/}/$}`)
		assert.strictEqual(tpl.compileTPL(`{{x: 2}["x"]`)(), `2`)
		assert.strictEqual(tpl.compileTPL(`div{1//}\n}2`)(), `div12`)
		assert.strictEqual(tpl.compileTPL(`{"\\\"}"}`)(), `\"}`)
		assert.strictEqual(tpl.compileTPL(`{1 / 2}`)(), `0.5`)
		assert.strictEqual(tpl.compileTPL(`{1 / 2 / 2}`)(), `0.25`)
		assert.strictEqual(tpl.compileTPL(`{import * as path from "path"}{path.normalize("")}`)(), `.`)
		assert.strictEqual(tpl.compileTPL(`1 {if (1)} 2 {/if} 3`)(), `1  2  3`)
		assert.strictEqual(tpl.compileTPL(`1\r\n {if (1)} 2 {/if}\r\n 3`)(), `1 2 \r\n 3`)
		assert.strictEqual(tpl.compileTPL(`1\n {if (1)}\n {2} {2}\n {/if}\n 3`)(), `1\n 2 2\n 3`)
		assert.strictEqual(tpl.compileTPL(` {switch (1)}\n {case 1} 1 {/if} `)(), ` 1 `)
		assert.strictEqual(await tpl.compileTPL(`{await 3}`, true)(), `3`)
	}

}