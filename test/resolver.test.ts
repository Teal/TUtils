import * as assert from "assert"
import { resolve } from "path"
import * as resolver from "../src/resolver"
import { init, rootDir, simulateIOError, uninit } from "./helpers/fsHelper"

export namespace resolverTest {

	export async function afterEach() {
		await uninit()
	}

	export async function resolveTest() {
		await init({
			"dir": {
				"entry": "entry",
				"web_components": {
					"x": "x",
					"x.js": "x.js",
				},
				"xyz1": "xyz1",
				"xyz2": "xyz2",
				"xyz3": "xyz3",
				"package.json": JSON.stringify({
					browser: {
						"abc5": false,
						"abc6": "./xyz3",
					}
				}),
			},
			"web_components": {
				"y": "y",
				"module1": {
					"index.js": "index.js"
				},
				"module2": {
					"package.json": JSON.stringify({
						main: "./entry.js"
					}),
					"entry.js": "entry.js"
				}
			},
			"error": {
				"dir1": {
					"package.json": ""
				},
				"dir2": {
					"package.json": "null"
				},
				"dir3": {},
				"dir4": {
					"package.json": JSON.stringify({
						main: null
					})
				},
				"dir5": {
					"package.json": JSON.stringify({
						main: {}
					})
				},
				"dir6": {
					"package.json": JSON.stringify({
						main: ""
					})
				},
				"dir7": {
					"package.json": {}
				}
			}
		})
		const r = new resolver.Resolver({
			type: "browser",
			modules: ["web_components"],
			alias: {
				"abc1": "./xyz1",
				"abc2$": ["./xyz2"],
				"abc3*": "./xyz3",
				"abc4*": false,
			}
		})
		assert.strictEqual(await r.resolve("./entry", resolve("dir"), []), resolve("dir/entry"))
		assert.strictEqual(await r.resolve("x", resolve("dir"), []), resolve("dir/web_components/x"))
		assert.strictEqual(await r.resolve("y", resolve("dir"), []), resolve("web_components/y"))
		assert.strictEqual(await r.resolve("module1", resolve("dir"), []), resolve("web_components/module1/index.js"))
		assert.strictEqual(await r.resolve("module2", resolve("dir"), []), resolve("web_components/module2/entry.js"))

		assert.strictEqual(await r.resolve("abc1", resolve("dir"), []), resolve("dir/xyz1"))
		assert.strictEqual(await r.resolve("abc2", resolve("dir"), []), resolve("dir/xyz2"))
		assert.strictEqual(await r.resolve("abc3", resolve("dir"), []), resolve("dir/xyz3"))
		assert.strictEqual(await r.resolve("abc4", resolve("dir"), []), false)
		assert.strictEqual(await r.resolve("abc5", resolve("dir"), []), false)
		assert.strictEqual(await r.resolve("abc6", resolve("dir"), []), resolve("dir/xyz3"))
		assert.strictEqual(await r.resolve("abc6", resolve("dir"), []), resolve("dir/xyz3"))

		assert.strictEqual(await r.resolve("404", resolve("dir"), []), null)

		assert.strictEqual(await r.resolve("./dir1", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir2", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir3", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir3", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir4", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir5", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir6", resolve("error"), []), null)
		assert.strictEqual(await r.resolve("./dir7", resolve("error"), []), null)

		assert.strictEqual(await r.resolve("", resolve("web_components/module2"), []), null)
		assert.strictEqual(await r.resolve(".", resolve("web_components/module2"), []), resolve("web_components/module2/entry.js"))
		assert.strictEqual(await r.resolve(resolve("web_components/module2/entry.js"), resolve("web_components/module2"), []), resolve("web_components/module2/entry.js"))
	}

	export async function caseSensitiveTest1() {
		await init({
			"dir": {
				"entry": "entry",
				"node_modules": {
					"x": "x",
					"x.js": "x.js",
					"y.JS": "y.JS",
				},
				"xyz1": "xyz1",
				"xyz2": "xyz2",
				"xyz3": "xyz3",
				"package.json": JSON.stringify({
					browser: {
						"abc5": false,
						"abc6": "./xyz3",
					}
				}),
			}
		})
		const r = new resolver.Resolver({
			enforceCaseSensitive: true
		})
		assert.strictEqual(await r.resolve("./entry", resolve("dir")), resolve("dir/entry"))
		assert.strictEqual(await r.resolve("./Entry", resolve("dir"), []), null)
		assert.strictEqual(await r.resolve("./dir/entry.JS", rootDir, []), null)
		assert.strictEqual(await r.resolve("./dir/Entry", rootDir, []), null)
		assert.strictEqual(await r.resolve("./Dir/entry", rootDir, []), null)
		assert.strictEqual(await r.resolve("./Dir/Entry", rootDir, []), null)
		assert.strictEqual(await r.resolve("y", rootDir, []), null)

		assert.strictEqual(await r.resolve("../dir/Entry", resolve("dir"), []), null)
		assert.strictEqual(await r.resolve("../Dir/entry", resolve("dir"), []), null)
		if (r.fs.isCaseInsensitive) {
			assert.strictEqual(await r.resolve("../dir/entry", resolve("Dir"), []), resolve("dir/entry"))
			assert.strictEqual(await r.resolve("./entry", resolve("Dir"), []), resolve("Dir/entry"))
		}

		const r2 = new resolver.Resolver({
			enforceCaseSensitive: true,
			extensions: [".JS"]
		})
		assert.strictEqual(await r2.resolve("x", resolve("Dir"), []), null)
		assert.strictEqual(await r2.resolve("./xyz1", resolve("Dir"), []), null)
		assert.strictEqual(await r2.resolve("./Xyz1", resolve("Dir"), []), null)
	}

	export async function caseSensitiveTest2() {
		await init({
			"dir": {
				"entry": "entry",
				"web_components": {
					"x": "x",
					"x.js": "x.js",
				},
				"xyz1": "xyz1",
				"xyz2": "xyz2",
				"xyz3": "xyz3",
				"package.json": JSON.stringify({
					browser: {
						"abc5": false,
						"abc6": "./xyz3",
					}
				}),
			}
		})
		const r = new resolver.Resolver({
			enforceCaseSensitive: false
		})
		assert.strictEqual(await r.resolve("./entry", resolve("dir")), resolve("dir/entry"))
		assert.strictEqual(await r.resolve("./Entry", resolve("dir"), []), r.fs.isCaseInsensitive ? resolve("dir/Entry") : null)
	}

	export async function relativeTest() {
		await init({
			"module-a": "module-a",
			"module-b.js": "module-b.js",
			"dir": {
				"module-c": "module-c"
			}
		})
		const r = new resolver.Resolver()
		assert.strictEqual(await r.resolve("./module-a", rootDir), resolve("module-a"))
		assert.strictEqual(await r.resolve("./module-a.js", rootDir), null)

		assert.strictEqual(await r.resolve("./module-b", rootDir, []), resolve("module-b.js"))
		assert.strictEqual(await r.resolve("./module-b.js", rootDir, []), resolve("module-b.js"))

		assert.strictEqual(await r.resolve("././module-b", rootDir, []), resolve("module-b.js"))
		assert.strictEqual(await r.resolve("././module-b.js", rootDir, []), resolve("module-b.js"))

		assert.strictEqual(await r.resolve("./dir/module-c", rootDir, []), resolve("dir/module-c"))
		assert.strictEqual(await r.resolve("./module-c", resolve("dir"), []), resolve("dir/module-c"))
		assert.strictEqual(await r.resolve("../dir/module-c", resolve("dir"), []), resolve("dir/module-c"))

		assert.strictEqual(await r.resolve("./module-a/error", rootDir, []), null)
	}

	export async function mainFileTest() {
		await init({
			"module-a": {
				"index.js": "index.js"
			},
			"module-b": {
				"index": "index"
			}
		})
		const r = new resolver.Resolver()
		assert.strictEqual(await r.resolve("./module-a", rootDir, []), resolve("module-a/index.js"))
		assert.strictEqual(await r.resolve("./module-b", rootDir, []), null)

		assert.strictEqual(await r.resolve(".", resolve("module-a"), []), resolve("module-a/index.js"))
		assert.strictEqual(await r.resolve("./", resolve("module-a"), []), resolve("module-a/index.js"))
	}

	export async function mainFileFieldTest() {
		await init({
			"common": {
				"package.json": JSON.stringify({
					module: "./module.js"
				}),
				"index.js": "index.js",
				"module.js": "module.js"
			},
			"no-module": {
				"package.json": JSON.stringify({}),
				"index.js": "index.js",
				"module.js": "module.js"
			},
			"empty-package-json": {
				"package.json": "",
				"index.js": "index.js",
				"module.js": "module.js"
			},
			"invalid-package-json": {
				"package.json": "E",
				"index.js": "index.js",
				"module.js": "module.js"
			},
			"main-dir": {
				"package.json": JSON.stringify({
					module: "./dir"
				}),
				"dir": {
					"package.json": JSON.stringify({
						module: "./module.js"
					}),
					"index.js": "index.js",
					"module.js": "module.js"
				}
			},
			"cwd": {
				"package.json": JSON.stringify({
					module: "../common/index.js"
				})
			},
			"self": {
				"package.json": JSON.stringify({
					module: "."
				}),
				"index.js": "index.js"
			},
			"self-error": {
				"package.json": JSON.stringify({
					module: "."
				})
			},
		})
		const r = new resolver.Resolver({
			mainFields: ["module", "main"]
		})
		assert.strictEqual(await r.resolve("./common", rootDir, []), resolve("common/module.js"))
		assert.strictEqual(await r.resolve("./no-module", rootDir, []), resolve("no-module/index.js"))
		assert.strictEqual(await r.resolve("./empty-package-json", rootDir, []), resolve("empty-package-json/index.js"))
		assert.strictEqual(await r.resolve("./invalid-package-json", rootDir, []), resolve("invalid-package-json/index.js"))

		assert.strictEqual(await r.resolve("./main-dir", rootDir, []), resolve("main-dir/dir/index.js"))
		assert.strictEqual(await r.resolve("./cwd", rootDir, []), resolve("common/index.js"))
		assert.strictEqual(await r.resolve("./self", rootDir, []), resolve("self/index.js"))
		assert.strictEqual(await r.resolve("./self-error", rootDir, []), null)

		assert.strictEqual(await r.resolve("./main-dir", rootDir), resolve("main-dir/dir/index.js"))
		assert.strictEqual(await r.resolve("./cwd", rootDir), resolve("common/index.js"))
		assert.strictEqual(await r.resolve("./self", rootDir), resolve("self/index.js"))
		assert.strictEqual(await r.resolve("./self-error", rootDir), null)
	}

	export async function cacheTest() {
		await init({
			"dir": {
				"entry": "entry",
				"web_components": {
					"x": "x",
					"x.js": "x.js",
				},
				"xyz1": "xyz1",
				"xyz2": "xyz2",
				"xyz3": "xyz3",
				"package.json": JSON.stringify({
					browser: {
						"abc5": false,
						"abc6": "./xyz3",
					}
				}),
			},
			"web_components": {
				"y": "y",
				"module1": {
					"index.js": "index.js"
				},
				"module2": {
					"package.json": JSON.stringify({
						main: "./entry.js"
					}),
					"entry.js": "entry.js"
				}
			}
		})
		const r1 = new resolver.Resolver({
			cache: "name"
		})
		assert.strictEqual(await r1.resolve("./entry", resolve("dir")), resolve("dir/entry"))
		assert.strictEqual(await r1.resolve("./entry", resolve("dir")), resolve("dir/entry"))
		r1.clearCache()

		const r2 = new resolver.Resolver({
			cache: false
		})
		assert.strictEqual(await r2.resolve("./entry", resolve("dir")), resolve("dir/entry"))
		r2.clearCache()

		assert.deepStrictEqual(await Promise.all([r1.resolve("./xyz1", resolve("dir")), r1.resolve("./xyz1", resolve("dir")), r1.resolve("./xyz2", resolve("dir"))]), [resolve("dir/xyz1"), resolve("dir/xyz1"), resolve("dir/xyz2")])
		assert.strictEqual(await r1.resolve("./xyz1", resolve("dir")), resolve("dir/xyz1"))
	}

	export async function errorTest() {
		await init({
			"dir": {
				"entry": "entry",
				"web_components": {
					"x": "x",
					"x.js": "x.js",
				},
				"xyz1": "xyz1",
				"xyz2": "xyz2",
				"xyz3": "xyz3",
				"package.json": JSON.stringify({
					browser: {
						"abc5": false,
						"abc6": "./xyz3",
					}
				}),
			},
			"web_components": {
				"y": "y",
				"module1": {
					"index.js": "index.js"
				},
				"module2": {
					"package.json": JSON.stringify({
						main: "./entry.js"
					}),
					"entry.js": "entry.js"
				}
			}
		})
		await simulateIOError(async () => {
			const r = new resolver.Resolver({
				cache: false
			})
			assert.strictEqual(await r.resolve("./entry", resolve("dir"), []), null)
			assert.strictEqual(await r.resolve("./entry", resolve("dir")), null)
		})
		await simulateIOError(async () => {
			const r = new resolver.Resolver({
				cache: false
			})
			assert.strictEqual(await r.resolve("module2", resolve("dir"), []), null)
			assert.strictEqual(await r.resolve("module2", resolve("dir")), null)
		})
	}

	export async function aliasFieldTest() {
		await init({
			"browser": {
				"module-a.js": "module-a.js"
			},
			"lib": {
				"browser.js": "browser.js",
				"ignore.js": "ignore.js",
				"replaced.js": "replaced.js"
			},
			"node_modules": {
				"module-a.js": "module-a.js",
				"module-b.js": "module-b.js",
				"module-c.js": "module-c.js",
				"invalid-module-1": {
					"package.json": JSON.stringify({
						"browser": ""
					}),
					"index.js": ""
				},
				"invalid-module-2": {
					"package.json": JSON.stringify({
						"browser": null
					}),
					"index.js": ""
				}
			},
			"package.json": JSON.stringify({
				"browser": {
					"./lib/ignore.js": false,
					"./lib/replaced.js": "./lib/browser",
					"module-a": "./browser/module-a.js",
					"module-b": "module-c"
				}
			}),
			"invalid-module-1": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": ""
				})
			},
			"invalid-module-2": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": null
				})
			},
			"invalid-module-3": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"index": ""
					}
				})
			},
			"invalid-module-4": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"index": null
					}
				})
			},
			"invalid-module-5": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"./node_modules/index.js": ""
					}
				})
			},
			"invalid-module-6": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"./node_modules/index.js": null
					}
				})
			},
			"invalid-module-7": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"./node_modules/index.js": "./node_modules/index.js"
					}
				})
			},
			"invalid-module-8": {
				"node_modules": {
					"index.js": "index.js"
				},
				"package.json": JSON.stringify({
					"browser": {
						"index": "./node_modules/index.js"
					}
				})
			}
		})
		const r = new resolver.Resolver({
			aliasFields: ["browser"]
		})
		assert.strictEqual(await r.resolve("./lib/ignore", rootDir, []), false)
		assert.strictEqual(await r.resolve("./lib/ignore.js", rootDir, []), false)
		assert.strictEqual(await r.resolve("./ignore", resolve("lib"), []), false)
		assert.strictEqual(await r.resolve("./ignore.js", resolve("lib"), []), false)

		assert.strictEqual(await r.resolve("./lib/replaced", rootDir, []), resolve("lib/browser.js"))
		assert.strictEqual(await r.resolve("./lib/replaced.js", rootDir, []), resolve("lib/browser.js"))
		assert.strictEqual(await r.resolve("./replaced", resolve("lib"), []), resolve("lib/browser.js"))
		assert.strictEqual(await r.resolve("./replaced.js", resolve("lib"), []), resolve("lib/browser.js"))

		assert.strictEqual(await r.resolve("module-a", rootDir, []), resolve("browser/module-a.js"))
		assert.strictEqual(await r.resolve("module-a", resolve("lib"), []), resolve("browser/module-a.js"))

		assert.strictEqual(await r.resolve("module-b", rootDir, []), resolve("node_modules/module-c.js"))
		assert.strictEqual(await r.resolve("module-b", resolve("lib"), []), resolve("node_modules/module-c.js"))

		assert.strictEqual(await r.resolve("./invalid-module-1", rootDir, []), null)
		assert.strictEqual(await r.resolve("./invalid-module-2", rootDir, []), null)

		assert.strictEqual(await r.resolve("invalid-module-1", rootDir, []), resolve("node_modules/invalid-module-1/index.js"))
		assert.strictEqual(await r.resolve("invalid-module-2", rootDir, []), resolve("node_modules/invalid-module-2/index.js"))

		assert.strictEqual(await r.resolve("index", resolve("invalid-module-1"), []), resolve("invalid-module-1/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-2"), []), resolve("invalid-module-2/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-3"), []), resolve("invalid-module-3/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-4"), []), resolve("invalid-module-4/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-5"), []), resolve("invalid-module-5/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-6"), []), resolve("invalid-module-6/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-7"), []), resolve("invalid-module-7/node_modules/index.js"))
		assert.strictEqual(await r.resolve("index", resolve("invalid-module-8"), []), resolve("invalid-module-8/node_modules/index.js"))
	}

	export async function aliasTest() {
		await init({
			"a": {
				"index.js": "a",
				"dir": {
					"index.js": "a"
				}
			},
			"b": {
				"index.js": "b",
				"dir": {
					"index.js": "b"
				}
			},
			"c": {
				"index.js": "c",
				"dir": {
					"index.js": "c"
				}
			},
			"d": {
				"index.js": "d",
				"dir": {
					"index.js": "d"
				}
			},
			"recursive": {
				"index.js": "b",
				"dir": {
					"index.js": "a"
				}
			},
			"recursive2": {
				"index.js": "b",
				"dir": {
					"index.js": "a"
				}
			},
		})
		const r = new resolver.Resolver({
			alias: {
				aliasA: "./a",
				b$: "./a/index",
				c$: resolve("a/index"),
				recursive: "./recursive/dir",
				recursive2: "./recursive2",
				"/d/dir": "./c/dir",
				"/d/index.js": "./c/index"
			},
			modules: [rootDir]
		})
		assert.strictEqual(await r.resolve("aliasA", rootDir), resolve("a/index.js"))
		assert.strictEqual(await r.resolve("aliasA/index", rootDir), resolve("a/index.js"))
		assert.strictEqual(await r.resolve("aliasA/dir", rootDir), resolve("a/dir/index.js"))
		assert.strictEqual(await r.resolve("aliasA/dir/index", rootDir), resolve("a/dir/index.js"))

		assert.strictEqual(await r.resolve("b", rootDir), resolve("a/index.js"))
		assert.strictEqual(await r.resolve("c", rootDir), resolve("a/index.js"))
		assert.strictEqual(await r.resolve("b/dir", rootDir), resolve("b/dir/index.js"))

		assert.strictEqual(await r.resolve("recursive", rootDir), resolve("recursive/dir/index.js"))
		assert.strictEqual(await r.resolve("recursive/index", rootDir), resolve("recursive/dir/index.js"))
		assert.strictEqual(await r.resolve("recursive/dir", rootDir), resolve("recursive/dir/index.js"))
		assert.strictEqual(await r.resolve("recursive/dir/index", rootDir), resolve("recursive/dir/index.js"))

		assert.strictEqual(await r.resolve("recursive2", rootDir), resolve("recursive2/index.js"))
	}

	export async function extensionTest() {
		await init({
			"dir": {
				"index.js": "index.js",
				"index.ts": "index.ts",
			},
			"foo.js": "foo.js",
			"foo.ts": "foo.ts",
			"index.js": "index.js",
			"index.ts": "index.ts",
			"package.json": JSON.stringify({
				"main": "./index.js"
			})
		})
		const r = new resolver.Resolver({
			extensions: [".ts", ".js"]
		})
		assert.strictEqual(await r.resolve("./foo", rootDir), resolve("foo.ts"))
		assert.strictEqual(await r.resolve("./dir", rootDir), resolve("dir/index.ts"))
		assert.strictEqual(await r.resolve(".", rootDir), resolve("index.js"))
	}

}