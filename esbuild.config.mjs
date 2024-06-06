import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import esbuildSvelte from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import { wasmLoader } from 'esbuild-plugin-wasm'
// import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import inlineWorkerPlugin from './esbuild.worker.plugin.mjs';
import * as fs from 'fs';

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === "production");
const workerPlugin=inlineWorkerPlugin(/sqlite3-opfs-async-proxy.worker.js$/,{
	format: "cjs",
	target: "es2022",
	minify: false,
})
workerPlugin.name="workerPlugin2"

const context = await esbuild.context({
	plugins: [
		esbuildSvelte({
			compilerOptions: { css: "injected" },
			preprocess: sveltePreprocess(),
		}),
		{
			name: 'sub-worker-filter',
		
			setup(build) {

			}
		},
		{
			name: 'sqlite-opfs-worker-1',
			setup(build) {
				build.onResolve({ filter: /sqlite3-opfs-async-proxy.js$/ }, async (args) => {
					console.log('onResolve',args)
				
				})
				build.onLoad({ filter: /sqlite3-opfs-async-proxy.js$/ }, async (args) => {
					// build.onLoad({ filter: /test.mjs$/ }, async (args) => {
					console.log("here opfs-worker here1", args)
					const filePath = args.path;
					if (args.path.endsWith("wasm")) {
						const fileBuffer = await fs.promises.readFile(filePath);
						return { contents: fileBuffer, loader: 'binary' };
					} else {
						const fileText = await fs.promises.readFile(filePath, 'utf8');
						return { contents: fileText, loader: 'text' };
					}

				});

			
			}
		},
		// {
		// 	name: 'sqlite-wasm-binary-loader',
		// 	setup(build) {
		// 		// build.onLoad({ filter: /assets\/sqlite3.(wasm|js)$/ }, async (args) => {
		// 		build.onLoad({ filter: /sqlite3.wasm$/ }, async (args) => {
		// 			console.log("here sqlite-wasm-binary-loader",args)
		// 			const filePath = args.path;
		// 			if(args.path.endsWith("wasm")){
		// 				const fileBuffer = await fs.promises.readFile(filePath);
		// 				return { contents: fileBuffer, loader: 'binary' };
		// 			}else{
		// 				const fileText = await fs.promises.readFile(filePath, 'utf8');
		// 				return { contents:fileText, loader: 'text' };
		// 			}
					
		// 		});
		// 	},
		// },
		// {
		// 	name: 'sqlite-mjs',
		// 	setup(build) {
		// 		build.onLoad({ filter: /sqlite3-worker1-bundler-friendly.mjs$/ }, async (args) => {
		// 		// build.onLoad({ filter: /test.mjs$/ }, async (args) => {
		// 			console.log("here sqlite-mjs",args)
		// 			const filePath = args.path;
		// 			if(args.path.endsWith("wasm")){
		// 				const fileBuffer = await fs.promises.readFile(filePath);
		// 				return { contents: fileBuffer, loader: 'binary' };
		// 			}else{
		// 				const fileText = await fs.promises.readFile(filePath, 'utf8');
		// 				return { contents:fileText, loader: 'text' };
		// 			}
					
		// 		});
		// 	},
		// },
		inlineWorkerPlugin(/\.worker.(js|jsx|ts|tsx)$/,{
			format: "cjs",
      		target: "es2022",
			minify: false,
			plugins:[
			
				{
					name: 'sqlite-wasm-binary-loader',
					setup(build) {
						build.onLoad({ filter: /sqlite3.wasm$/ }, async (args) => {
							console.log("here sqlite-wasm-binary-loader",args)
							const filePath = args.path;
							const fileBuffer = await fs.promises.readFile(filePath);
							return { contents: fileBuffer, loader: 'binary' };
						});
					},
				},
				{
					name: 'sqlite-opfs-worker',
					setup(build) {
					
						build.onLoad({ filter: /sqlite3-opfs-async-proxy.js$/ }, async (args) => {
							// build.onLoad({ filter: /test.mjs$/ }, async (args) => {
							console.log("here opfs-worker", args)
							const filePath = args.path;
							if (args.path.endsWith("wasm")) {
								const fileBuffer = await fs.promises.readFile(filePath);
								return { contents: fileBuffer, loader: 'binary' };
							} else {
								const fileText = await fs.promises.readFile(filePath, 'utf8');
								return { contents: fileText, loader: 'text' };
							}

						});
					}
				},
				
				workerPlugin,
			]
		})
		// wasmLoader({mode:'embedded'})
	],
	banner: {
		js: banner,
	},
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	// loader:{
	// 	".wasm":"binary"
	// },
	define:{
		'process.env.LANGCHAIN_VERBOSE': '"true"',
	},
});


if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}