<script lang="ts">
	import { fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import axios, { isCancel, AxiosError } from "axios";
	import { request, MarkdownView, Notice, setIcon } from "obsidian";
	import { plugin } from "../store";
	import { renderMarkdown } from "../utils/Utils";
	import { ChatChainSingleton, QAChatChainSingleton,VaultChainSingleton } from "../utils/Chains";
	import { scaleIn } from "../utils/Transition";
	import { v4 as uuidv4 } from "uuid";

	let div: HTMLDivElement;
	let modeSelector: HTMLSelectElement;
	let textArea: HTMLTextAreaElement;
	let sendButton: HTMLButtonElement;
	let autoscroll = false;

	import _ from "../config";
	import { getChatModeRecords } from "../config";

	type CommentType = {
		id: string;
		author: string;
		text: string;
		cnt: number;
	};
	// const comments= writable<CommentType[]>();
	// const coms: CommentType[]=[]
	// comments.set(coms)
	let comments: CommentType[] = [];

	import { beforeUpdate, afterUpdate, tick } from "svelte";
	import { ChatMode, EmbeddingServer, LLMServer } from "src/setting";

	// 	// request("https://www.baidu.com")
	// 	fetch("https://www.baidu.com", {
	// 		method: "POST", // *GET, POST, PUT, DELETE, etc.
	// 		mode: "no-cors",
	// 	})
	// 		.then((response) => {
	// 			//   // Load the HTML into cheerio
	// 			//   const xx = cheerio.load(response.data);
	// 			console.log(response);
	// 			console.log("complete");
	// 		})
	// 		.catch((e) => console.log("error", e.message, e.toString()));

	beforeUpdate(() => {
		// console.debug("beforeUpdate");
		if (div) {
			const scrollableDistance = div.scrollHeight - div.offsetHeight;
			// console.debug(div.scrollTop, scrollableDistance);
			autoscroll = div.scrollTop > scrollableDistance - 20;
		}
	});

	afterUpdate(() => {
		// console.debug("afterUpdate");
		if (autoscroll) {
			div.scrollTo(0, div.scrollHeight);
		}
		setIcon(sendButton, "send");
	});

	const pause = (ms: number | undefined) =>
		new Promise((fulfil) => setTimeout(fulfil, ms));

	function valid_config() {
		let settings = $plugin.settings;
		if (settings.llmServer == LLMServer.OpenAI) {
			if (!settings.openaiConfig.apiKey) {
				new Notice($_.t("settings.error.openai_api_key_empty"));
				return false;
			}
			if (!settings.openaiConfig.baseUrl) {
				new Notice($_.t("settings.error.openai_base_url_empty"));
				return false;
			}
			if (!settings.openaiConfig.model) {
				new Notice($_.t("settings.error.openai_model_empty"));
				return false;
			}
		}
		if (settings.llmServer == LLMServer.Ollama) {
			if (!settings.ollamaConfig.model) {
				new Notice($_.t("settings.error.ollama_model_empty"));
				return false;
			}

			if (!settings.ollamaConfig.baseUrl) {
				new Notice($_.t("settings.error.ollama_base_url_empty"));
				return false;
			}
		}

		if (settings.embeddingServer == EmbeddingServer.OpenAI) {
			if (!settings.openaiConfig.apiKey) {
				new Notice($_.t("settings.error.openai_api_key_empty"));
				return false;
			}

			if (!settings.openaiConfig.baseUrl) {
				new Notice($_.t("settings.error.openai_base_url_empty"));
				return false;
			}

			if (!settings.openaiConfig.embeddingModel) {
				new Notice($_.t("settings.error.openai_embedding_model_empty"));
				return false;
			}
		}
		if (settings.embeddingServer == EmbeddingServer.Ollama) {
			if (!settings.ollamaConfig.baseUrl) {
				new Notice($_.t("settings.error.ollama_base_url_empty"));
				return false;
			}
			if (!settings.ollamaConfig.embeddingModel) {
				new Notice($_.t("settings.error.ollama_embedding_model_empty"));
				return false;
			}
		}
		return true;
	}

	function error_message_handler(message: string) {
		if (
			message.includes("Failed to fetch") ||
			message.includes("Connection error")
		) {
			let url = "";
			if ($plugin.settings.llmServer == LLMServer.OpenAI)
				url = $plugin.settings.openaiConfig.baseUrl ?? "";
			if ($plugin.settings.llmServer == LLMServer.Ollama)
				url = $plugin.settings.ollamaConfig.baseUrl ?? "";
			new Notice(
				$_.t("settings.error.failed_to_fetch", {
					url: url,
				}),
			);
		} else if (message.includes("Incorrect API key")) {
			new Notice($_.t("settings.error.invalid_api_key"));
		} else if (message.includes("exceeded your current quota")) {
			new Notice($_.t("settings.error.insufficient_quota_error"));
		} else if (
			message.includes("does not exist or you do not have access") ||
			(message.includes("404") &&
				message.toLowerCase().includes("ollama"))
		) {
			function extractModelName(input: string): string | null {
				// 定义正则表达式来匹配 `model_name` 或 'model_name' 部分
				const regex = /model\s+[`'"]([^`'"]+)[`'"]/;
				const match = input.match(regex);

				if (match && match.length > 1) {
					return match[1]; // 返回捕获的组，即 model_name 部分
				}

				return null; // 如果没有匹配到，返回 null
			}
			let model = extractModelName(message);

			if (
				!model &&
				$plugin.settings.embeddingServer == EmbeddingServer.Ollama &&
				$plugin.settings.chatMode != ChatMode.NaiveChat
			)
				model = $plugin.settings.ollamaConfig.embeddingModel ?? "";
			new Notice(
				$_.t("settings.error.model_not_exists", {
					model: model,
				}),
			);
		} else {
			new Notice(
				$_.t("settings.error.request_common", {
					info: message,
				}),
			);
		}
	}

	async function process(value: string) {
		console.debug("key enter", value);
		const file = $plugin.app.workspace.getActiveFile();
		const comment: CommentType = {
			id: uuidv4(),
			author: "user",
			text: value,
			cnt: value.length,
		};

		comments = [...comments, comment];
		// comments.push(comment)
		// comments = comments
		let reply = {
			id: uuidv4(),
			author: "bot",
			text: "...",
			cnt: 0,
		};
		comments = [...comments, reply];
		// comments.push(reply)
		// comments = comments

		try {
			let chain;
			if ($plugin.settings.chatMode == ChatMode.NoteQa && file) {
				console.debug(file.path,file.name,file.basename,file.extension,)
				// chain = await VaultChainSingleton.getInstance(file.path);
				chain = await QAChatChainSingleton.getInstance(file);
			} else if($plugin.settings.chatMode==ChatMode.VaultQa){
				chain = await VaultChainSingleton.getInstance("all");
			} else {
				chain = ChatChainSingleton.getInstance();
				// console.log(chain.memory)
			}
			let stream = await chain.stream(
				{ input: comment.text },
				{ configurable: { sessionId: "foobarbaz" } },
			);

			for await (const chunk of stream) {
				console.debug(JSON.stringify(chunk, null, 2));
				console.debug("------");
				if (chunk) {
					// let c = comments.pop();
					let c = reply;
					// console.log("reply",c.text,comments[comments.length-1])
					if (c) {
						if (c.cnt == 0) {
							c.text = chunk;
							c.cnt = c.text.length;
						} else {
							c.text += chunk;
							c.cnt = c.text.length;
						}
						// comments = [...comments, c];
						comments = comments;
					}
				}
			}
			textArea.value = "";
		} catch (error) {
			console.error({ error });
			comments.pop(); // reply
			comments.pop(); // comment
			comments = comments;
			textArea.value = comment.text;
			if (error instanceof Error) error_message_handler(error.message);
		}
	}
	async function handleKeydown(event: KeyboardEvent) {
		const { key, shiftKey, metaKey } = event;
		if (key === "Enter" && (event.target as HTMLInputElement).value) {
			if (!(shiftKey || metaKey)) {
				event.preventDefault();
				textArea.disabled=true;
				setIcon(sendButton, "loader");
				sendButton.disabled = true;

				let value = `${textArea.value}`;
				textArea.value = "";
				let target = event.target as HTMLInputElement;
				target.value = "";
				
				if (!valid_config()) {
					return;
				}
				if (value.trim() !== "") {
					
					textArea.value = "";
					
					
					await process(value);
				}
				textArea.disabled = false
				textArea.focus()
				sendButton.disabled = false;
				setIcon(sendButton, "send");
			}
		}
	}

	async function handleModeChange(mode: any) {
		let selectedMode: ChatMode = modeSelector.value as ChatMode;
		$plugin.settings.chatMode = selectedMode;
		await $plugin.saveSettings();
		// plugin.set(this.plugin);
		// let chatModeRecords=$chatModeRecords;
		new Notice(
			`${$_.t("settings.mode.title")} : ${getChatModeRecords()[selectedMode]}`,
		);
		console.debug(`Selected mode: ${selectedMode}`);
	}
	async function handleClick() {
		if (!valid_config()) {
			return;
		}
		if (textArea.value.trim() !== "") {
			let value = textArea.value;
			textArea.value = "";
			await process(value);
		}
	}
	function resizeTextarea() {
		textArea.style.height = "";
		textArea.style.height = `${textArea.scrollHeight}px`;
	}

	plugin.subscribe((value) => {
		console.debug("setting change", value.settings);
	});
	function getInitWords() {
		return $_.t("chat_view.bot_welcome");
	}
	$:initWords = $_.t("chat_view.bot_welcome");
	let chatModeRecords = getChatModeRecords()
	$: if ($plugin) {
		chatModeRecords = getChatModeRecords()
	}
	
</script>

<div class="container">
	<!-- <div class="phone"> -->
	<div class="header">
		<h2 class="title">ChatBot</h2>

		<select
			class="mode"
			id="mode-select"
			bind:this={modeSelector}
			on:change={handleModeChange}
		>
			{#each Object.entries(chatModeRecords) as [k, v]}
				<option value={k} selected={k === $plugin.settings.chatMode}
					>{v}</option
				>
			{/each}
		</select>
	</div>
	<hr class="solid">

	<div class="chat" bind:this={div}>
		<article class="bot">
			<span use:renderMarkdown={initWords}></span>
		</article>
		<!-- <article class="bot">
			<span><div class="dot-flashing"></div></span>
		</article> -->

		{#each comments as comment}
			<article
				class={comment.author}
				in:scaleIn={{ delay: 0, duration: 300, easing: cubicOut }}
			>
				{#if comment.author == "bot" && comment.text == "..."}
					<span><div class="dot-flashing"></div></span>
				{:else}
					<span use:renderMarkdown={comment.text}></span>
				{/if}
			</article>
		{/each}
	</div>

	<div class="footer">
		<textarea
			bind:this={textArea}
			on:keydown={handleKeydown}
			placeholder={$_.t("chat_view.input_placeholder")}
			on:input={resizeTextarea}
		/>
		<button
			class="send-button"
			bind:this={sendButton}
			on:click={handleClick}
		>
		</button>
	</div>

	<!-- </div> -->
</div>

<style>
	/* .container {
		display: grid;
		 display: flex;
		flex-direction: column;
		place-items: center; 
		height: 100%;
	} */

	.phone {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}
	/* 
	header {
    background: red;
		display: flex;
		flex-direction: column;
		height: 10%;
		padding: 4em 0 0 0;
		box-sizing: border-box;
	} */

	/* .title {
		background: rgba(4, 0, 255, 0.063);
		flex: 0;
		font-size: 1.4em;
		text-align: left;
	} */

	
</style>
