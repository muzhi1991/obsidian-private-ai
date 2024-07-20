<script lang="ts">
	import log from "loglevel";
	import _ from "../config";
	import { fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import axios, { isCancel, AxiosError } from "axios";
	import { request, MarkdownView, Notice, setIcon,setTooltip} from "obsidian";
	import { plugin } from "../store";
	import { renderMarkdown } from "../utils/obsidian-ui-utils";
	import {
		ChatChainSingleton,
		QAChatChainSingleton,
		VaultChainSingleton,
	} from "../llm/chains";
	import { scaleIn } from "../utils/transition";
	import { v4 as uuidv4 } from "uuid";

	let div: HTMLDivElement;
	let modeDetail: HTMLDetailsElement;
	let modeSelector: HTMLSelectElement;
	let textArea: HTMLTextAreaElement;
	let sendButton: HTMLButtonElement;
	let clearButton: HTMLButtonElement;
	let autoscroll = false;

	import { getChatModeRecords } from "../config";

	type CommentType = {
		id: string;
		author: string;
		text: string;
		cnt: number;
	};
	let comments: CommentType[] = [];

	import { beforeUpdate, afterUpdate, tick } from "svelte";
	import { ChatMode, EmbeddingServer, LLMServer } from "src/setting";
	import ChatHistoryManager from "../llm/chat-history";

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
		if (div) {
			const scrollableDistance = div.scrollHeight - div.offsetHeight;
			autoscroll = div.scrollTop > scrollableDistance - 20;
		}
		if(clearButton){
			setTooltip(clearButton,$_.t("chat_view.clear_icon_tip"),{placement:'top'})
		}
	});

	afterUpdate(() => {
		if (autoscroll) {
			div.scrollTo(0, div.scrollHeight);
		}
		// setIcon(sendButton, "send");
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
		log.debug("user input:", value);
		const file = $plugin.app.workspace.getActiveFile();
		const comment: CommentType = {
			id: uuidv4(),
			author: "human",
			text: value,
			cnt: value.length,
		};

		comments = [...comments, comment];
		// comments.push(comment)
		// comments = comments
		let reply = {
			id: uuidv4(),
			author: "assistant",
			text: "...",
			cnt: 0,
		};
		comments = [...comments, reply];
		// comments.push(reply)
		// comments = comments

		try {
			let chain;
			if ($plugin.settings.chatMode == ChatMode.NoteQa && file) {
				log.debug(file.path, file.name, file.basename, file.extension);
				chain = await QAChatChainSingleton.getInstance(file.path);
			} else if ($plugin.settings.chatMode == ChatMode.VaultQa) {
				chain = await VaultChainSingleton.getInstance("all");
			} else {
				chain = ChatChainSingleton.getInstance();
			}
			let stream = await chain.stream(
				{ input: comment.text },
				{ configurable: { sessionId: "foobarbaz" } },
			);

			for await (const chunk of stream) {
				// log.debug(JSON.stringify(chunk, null, 2));
				// log.debug("------");
				if (chunk) {
					// let c = comments.pop();
					let c = reply;
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
			log.error({ error });
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
				textArea.disabled = true;
				// setIcon(sendButton, "loader");
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
				textArea.disabled = false;
				textArea.focus();
				sendButton.disabled = false;
				// setIcon(sendButton, "send");
			}
		}
	}

	async function handleModeChange(mode: any) {
		log.info(mode.target);

		if (mode.target && mode.target.getAttribute("id")) {
			let selectedMode: ChatMode = mode.target.getAttribute(
				"id",
			) as ChatMode;
			log.info(selectedMode);
			// let selectedMode: ChatMode = modeSelector.value as ChatMode;
			$plugin.settings.chatMode = selectedMode;
			await $plugin.saveSettings();
			// plugin.set(this.plugin);
			// let chatModeRecords=$chatModeRecords;
			modeDetail.removeAttribute("open");
			new Notice(
				`${$_.t("settings.mode.title")} : ${getChatModeRecords()[selectedMode]}`,
			);
		}
	}
	async function handleSendClick() {
		if (!valid_config()) {
			return;
		}
		if (textArea.value.trim() !== "") {
			let value = textArea.value;
			textArea.value = "";
			await process(value);
		}
	}

	async function handleClearClick() {
		if (!valid_config()) {
			return;
		}
		if (textArea.value.trim() !== "") {
			let value = textArea.value;
			textArea.value = "";
		}
		let messageHistory = ChatHistoryManager.getInstance("default");
		await messageHistory.clear();
		comments = [];
	}
	function resizeTextarea() {
		textArea.style.height = "";
		textArea.style.height = `${textArea.scrollHeight}px`;
	}

	function getInitWords() {
		return $_.t("chat_view.bot_welcome");
	}
	$: initWords = $_.t("chat_view.bot_welcome");
	let chatModeRecords = getChatModeRecords();
	$: if ($plugin) {
		chatModeRecords = getChatModeRecords();
	}
</script>

<div class="container mx-auto flex flex-col h-full">
	<!-- <div class="phone"> -->
	<div class="header flex flex-0 px-1 justify-between items-center">
		<div class="title text-2xl text-left font-medium">PrivateAI</div>

		<!-- <select
			class="mode rounded-md border-0 py-1 px-4 ring-1 ring-inset ring-[--interactive-normal] focus:ring-2 focus:ring-[--interactive-accent-hover]"
			id="mode-select"
			bind:this={modeSelector}
			on:change={handleModeChange}
		>
			{#each Object.entries(chatModeRecords) as [k, v]}
				<option class='text-center' value={k} selected={k === $plugin.settings.chatMode}
					>{v}</option
				>
			{/each}
		</select> -->
		<ul class="daisy-menu daisy-menu-horizontal p-0 m-0">
			<li>
				<details class="mode-menu-details" bind:this={modeDetail}>
					<summary
						class="mode-menu-summary bg-secondary-alt rounded-md min-w-32 text-justify text-text-normal border-0 py-1 px-4 ring-1 ring-inset ring-[--interactive-normal] focus:ring-2"
						>{chatModeRecords[$plugin.settings.chatMode]}</summary
					>

					<ul class="bg-secondary-alt rounded-t-none py-2 z-10">
						{#each Object.entries(chatModeRecords) as [k, v]}
							<li
								class="text-center hover:bg-secondary-hover"
								on:click={handleModeChange}
							>
								<a
									id={k}
									class="text-text-normal no-underline hover:no-underline"
									class:daisy-active={k ===
										$plugin.settings.chatMode}>{v}</a
								>
							</li>
						{/each}
					</ul>
				</details>
			</li>
		</ul>
	</div>
	<!-- <hr class="solid" /> -->
	<div class="daisy-divider before:bg-border after:bg-border my-1"></div>

	<div
		class="chat flex flex-col flex-auto overflow-y-auto scroll-smooth rounded px-1"
		bind:this={div}
	>
		<div class="assistant select-text daisy-chat daisy-chat-start">
			<div
				class="bg-secondary-alt text-text-normal daisy-chat-bubble place-items-center py-2.5 min-h-fit"
				use:renderMarkdown={initWords}
			></div>
		</div>
		<!-- <article class="assistant">
			<span><div class="dot-flashing"></div></span>
		</article> -->

		{#each comments as comment}
			<div
				class="{comment.author} select-text daisy-chat mt-2.5"
				class:daisy-chat-end={comment.author == "human"}
				class:daisy-chat-start={comment.author == "assistant"}
				class:text-left={comment.author === "assistant"}
				class:origin-bottom-left={comment.author === "assistant"}
				class:text-right={comment.author === "human"}
				class:origin-bottom-right={comment.author === "human"}
				in:scaleIn={{ delay: 0, duration: 300, easing: cubicOut }}
			>
				{#if comment.author == "assistant"}
					{#if comment.text == "..."}
						<!-- <div class="daisy-chat-bubble py-2.5 min-h-fit "><div class="dot-flashing"></div></div> -->
						<div
							class="daisy-chat-bubble bg-secondary-alt py-2.5 min-h-fit"
						>
							<span
								class="daisy-loading daisy-loading-dots daisy-loading-xs text-text-accent"
							></span>
						</div>
					{:else}
						<div
							class="daisy-chat-bubble bg-secondary-alt text-text-normal py-2.5 min-h-fit"
							use:renderMarkdown={comment.text}
						></div>
					{/if}
				{:else}
					<div
						class="daisy-chat-bubble bg-secondary-accent text-text-on-secondary-accent py-2.5 min-h-fit"
						use:renderMarkdown={comment.text}
					></div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="chatfooter flex py-1 items-center relative">
		<textarea
			class="p-4 pb-12 block w-full resize-none border-[--background-modifier-border] rounded-lg text-sm max-h-60 focus:ring-1 focus:ring-[--background-modifier-box-shadow]"
			bind:this={textArea}
			on:keydown={handleKeydown}
			placeholder={$_.t("chat_view.input_placeholder")}
			on:input={resizeTextarea}
		/>

		<!-- Toolbar -->
		<div
			class="absolute bottom-px inset-x-px p-2 rounded-b-md "
		>
			<div class="flex justify-between items-center">
				<!-- Button Group -->
				<div class="flex items-center">
					<!-- Clear Button -->
					
						<button
							on:click={handleClearClick}
							bind:this={clearButton}
							class="clickable-icon inline-flex flex-shrink-0 justify-center items-center size-8 rounded-lg text-text-normal hover:text-[--text-error] focus:z-10 focus:outline-none focus:ring-2 focus:text-text-accent"
						>
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
							<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
						</svg>
							<!-- <svg
								class="flex-shrink-0 size-4"
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect width="18" height="18" x="3" y="3" rx="2"
								></rect>
								<line x1="9" x2="15" y1="15" y2="9"></line>
							</svg> -->
						</button>
					<!-- End Clear Button -->

					<!-- Attach Button -->
					<button
						type="button"
						class="invisible clickable-icon inline-flex flex-shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:text-blue-600 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-500 dark:hover:text-blue-500"
					>
						<svg
							class="flex-shrink-0 size-4"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
							></path>
						</svg>
					</button>
					<!-- End Attach Button -->
				</div>
				<!-- End Button Group -->

				<!-- Button Group -->
				<div class="flex items-center gap-x-1">
					<!-- Mic Button -->
					<button
						type="button"
						class="invisible clickable-icon inline-flex flex-shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:text-blue-600 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-500 dark:hover:text-blue-500"
					>
						<svg
							class="flex-shrink-0 size-4"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path
								d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
							></path>
							<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
							<line x1="12" x2="12" y1="19" y2="22"></line>
						</svg>
					</button>
					<!-- End Mic Button -->

					<!-- Send Button -->
					<button
						bind:this={sendButton}
						on:click={handleSendClick}
						class="clickable-icon inline-flex flex-shrink-0 justify-center items-center size-8 rounded-lg text-[--interactive-accent] hover:text-[--interactive-accent-hover] focus:z-10 focus:outline-none focus:ring-2"
					>
						<svg
							class="flex-shrink-0 size-3.5"
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							fill="currentColor"
							viewBox="0 0 16 16"
						>
							<path
								d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"
							></path>
						</svg>
					</button>
					<!-- End Send Button -->
				</div>
				<!-- End Button Group -->
			</div>

			<!-- End Toolbar -->
		</div>

		<!-- <button
				class="clear-button daisy-btn-sm absolute bottom-3 left-2 hover:text-text-accent"
				on:click={handleClearClick}>Clear</button>
		<button
			class="send-button daisy-btn-sm daisy-btn-square text-[--interactive-accent] hover:text-[--interactive-accent-hover] ml-2"
			bind:this={sendButton}
			on:click={handleSendClick}
		>
		</button> -->
	</div>

	<!-- </div> -->
</div>

<style>
</style>
