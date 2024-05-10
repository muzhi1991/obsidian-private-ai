<script>
	console.log("start");
	import _ from "../config.ts";
	import Eliza from "elizabot";

	import { beforeUpdate, afterUpdate } from "svelte";

	let div;
	let autoscroll = false;

	beforeUpdate(() => {
		console.log("beforeUpdate");
		if (div) {
			const scrollableDistance = div.scrollHeight - div.offsetHeight;
			console.log(div.scrollTop, scrollableDistance);
			autoscroll = div.scrollTop > scrollableDistance - 20;
		}
	});

	afterUpdate(() => {
		console.log("afterUpdate");
		if (autoscroll) {
			div.scrollTo(0, div.scrollHeight);
		}
	});

	const eliza = new Eliza();
	const pause = (ms) => new Promise((fulfil) => setTimeout(fulfil, ms));

	const typing = { author: "eliza", text: "..." };

	let comments = [];

	async function handleKeydown(event) {
		console.log(event.constructor.name);
		if (event.key === "Enter" && event.target.value) {
			console.log("key enter", event.target.value);
			const comment = {
				author: "user",
				text: event.target.value,
			};

			const reply = {
				author: "eliza",
				text: eliza.transform(comment.text),
			};

			event.target.value = "";
			comments = [...comments, comment];

			await pause(200 * (1 + Math.random()));
			comments = [...comments, typing];

			await pause(500 * (1 + Math.random()));
			comments = [...comments, reply].filter(
				(comment) => comment !== typing,
			);
		}
	}

	function auto_grow(element) {
		console.log(element.constructor.name);
		// element.style.height = "5px";
		// element.style.height = (element.scrollHeight) + "px";
	}
</script>

<div class="container">
	<div class="phone">
		<h1>Eliza</h1>
		<div class="chat" bind:this={div}>
			<article class="eliza">
				<span>{eliza.getInitial()}</span>
			</article>
			<article class="eliza">
				<span>hello</span>
			</article>
			{#each comments as comment}
				<article class={comment.author}>
					<span>{comment.text}</span>
				</article>
			{/each}
		</div>

		<textarea
			on:keydown={handleKeydown}
			placeholder={$_.t("chat_view.input_placeholder")}
			oninput="this.style.height = ''; this.style.height = this.scrollHeight +'px'"
		/>
	</div>
</div>

<style>
	.container {
		display: grid;
		place-items: center;
		height: 100%;
	}

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

	h1 {
		background: rgba(4, 0, 255, 0.063);
		flex: 0;
		font-size: 1.4em;
		text-align: center;
	}

	.chat {
		height: 0;
		flex: 1 1 auto;
		padding: 0 1em;
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	article {
		margin: 0 0 0.5em 0;
		user-select: text;
		-webkit-user-select: text;
		-moz-user-select: text;
		-ms-user-select: text;
	}

	.user {
		text-align: right;
	}

	span {
		padding: 0.5em 1em;
		display: inline-block;
	}

	.eliza span {
		background-color: var(--bg-1, #ffffff);
		border-radius: 1em 1em 1em 0;
		color: var(--fg-1);
	}

	.user span {
		background-color: #0074d9;
		color: white;
		border-radius: 1em 1em 0 1em;
		word-break: break-all;
	}

	textarea {
		margin: 0.5em 1em 1em 1em;
		resize: none;
		/* overflow: hidden; */
		height: 0;
		min-height: 2em;
		max-height: 4em;
		font-size: min(2.5vh, 1rem);
	}

	.phone {
		background: var(--bg-2, #f6f6f6);
		position: relative;
		font-size: min(2.5vh, 1rem);

		width: calc(
			100vh * 9 / 16
		); /* 使用视口高度来计算宽度，维持9:16的比例 */
		height: 85vh; /* 直接使用视口高度 */
		/* height: 100%;
      width: calc(9 / 16 * 100%); */
		/* aspect-ratio: 9 / 16; */
		/* padding-bottom: calc(9 / 16 * 100%); */
		border: 0.2em solid #222;
		border-radius: 1em;
		box-sizing: border-box;
	}
</style>
