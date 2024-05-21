<script lang="ts">
	import _ from "../config";
	// import { plugin } from "../store.ts";

	// import { ChatOpenAI } from "@langchain/openai";

	import { ChatOpenAI } from "https://esm.sh/@langchain/openai";
	import {
		ChatPromptTemplate,
		PromptTemplate,
	} from "https://esm.sh/@langchain/core/prompts";
	import { StringOutputParser } from "https://esm.sh/@langchain/core/output_parsers";
	import { OPENAI_API_KEY } from "/Users/muzhi1991/project/env.js";

	// import { ChatOpenAI } from "npm:@langchain/openai";

	const chatModel = new ChatOpenAI({
		apiKey: OPENAI_API_KEY,
	});
	console.log("here");
	// let promise=chatModel.invoke("what is LangSmith?");

	const prompt = ChatPromptTemplate.fromMessages([
		["system", "You are a world class technical documentation writer."],
		["human", "{input}"],
	]);
	const outputParser = new StringOutputParser();
	const chain = prompt.pipe(chatModel).pipe(outputParser);

	// let promise=chain.invoke({input: "what is LangSmith?",});

	import { RecursiveCharacterTextSplitter } from "https://esm.sh/langchain/text_splitter";
	import { Document } from "https://esm.sh/langchain/document";
	import { MemoryVectorStore } from "https://esm.sh/langchain/vectorstores/memory";
	const text = `Hi.\n\nI'm Harrison.\n\nHow? Are? You?\nOkay then f f f f.
This is a weird text to write, but gotta test the splittingggg some how.\n\n
Bye!\n\n-H.`;
	const splitter = new RecursiveCharacterTextSplitter({
		// chunkSize: 10,
		// chunkOverlap: 1,
	});

	// let promise= splitter.createDocuments([text]);
	// let promise = splitter.splitDocuments([
	// 	new Document({ pageContent: text }),
	// ]);

	// promise.then((r) => console.log(r));
	import { OllamaEmbeddings } from "https://esm.sh/@langchain/community/embeddings/ollama";
	import { OpenAIEmbeddings } from "https://esm.sh/@langchain/openai";
	const embeddings = new OpenAIEmbeddings({
		apiKey: OPENAI_API_KEY,
	});
	// promise.then(splitDocs=>{
	//     return MemoryVectorStore.fromDocuments(
	//     splitDocs,
	//     embeddings
	//     );
	// }).then(r=>console.log(r.constructor.name))

	const qaPrompt =
		ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}`);
	import { createStuffDocumentsChain } from "https://esm.sh/langchain/chains/combine_documents";
	console.log("do");
	// const promise = createStuffDocumentsChain({
	// 	llm: chatModel,
	// 	prompt:qaPrompt,
	// }).then((docChain) => {
	//     console.log("do1")
	// 	return docChain.invoke({
	// 		input: "what is LangSmith?",
	// 		context: [
	// 			new Document({
	// 				pageContent:
	// 					"LangSmith is a platform for building production-grade LLM applications.",
	// 			}),
	// 		],
	// 	});
	// }).then(res=>console.log(res))
	import axios, { isCancel, AxiosError } from "axios";

	import { createRetrievalChain } from "https://esm.sh/langchain/chains/retrieval";
	import { CheerioWebBaseLoader } from "https://esm.sh/langchain/document_loaders/web/cheerio";
	import * as cheerio from "https://esm.sh/cheerio";
	// import axios from "https://esm.sh/axios"
	// const xx = cheerio.fromURL("https://www.baidu.com");
	// axios.get("https://docs.smith.langchain.com/user_guide")
	// const url = "https://docs.smith.langchain.com/user_guide";
	const url = "https://docs.smith.langchain.com/user_guide";
	// let promise = fetch(
	// 	`https://cloudflare-cors-anywhere.muzhi1991.workers.dev/?${url}`,
	// 	{
	// 		method: "GET", // *GET, POST, PUT, DELETE, etc.
	// 	},
	// )
	// 	// axios({method:'get',url:url,mode: "no-cors",withCredentials: false})
	// 	.then((response) => {
	// 		console.log(response.status);
	// 		return response.text();
	// 	})
	// 	.then((text) => {
	// 		// console.log("response",text);
	// 		const xx = cheerio.load(text);
	// 		// console.log("complete", xx("body").toString());
	// 		const t = xx("body").text();
	// 		const metadata = { source: url };
	// 		// console.log("complete", t);
	// 		return [new Document({ pageContent: text, metadata })];
	// 	})
	// 	.then((docs) => {
	// 		console.log("here docs");
	// 		return splitter.splitDocuments(docs);
	// 	})
	// 	.then((splitDocs) => {
	// 		return MemoryVectorStore.fromDocuments(splitDocs, embeddings);
	// 	})
	// 	.then((vectorstore) => {
	// 		console.log(vectorstore.constructor.name);
	// 		const retriever = vectorstore.asRetriever();
	// 		return createStuffDocumentsChain({
	// 			llm: chatModel,
	// 			prompt: qaPrompt,
	// 		}).then((documentChain: any) => {
	// 			return createRetrievalChain({
	// 				combineDocsChain: documentChain,
	// 				retriever,
	// 			});
	// 		});
	// 	})
	// 	.then((retrievalChain) => {
	// 		console.log(retrievalChain.constructor.name);
	// 		return retrievalChain.invoke({
	// 			input: "what is LangSmith?",
	// 		});
	// 	})
	// 	.then((res) => {
	// 		console.log(res);
	// 		return res.answer;
	// 	});
	// .catch((e) => console.log("error", e.message, e.toString()));

	// const loader = new CheerioWebBaseLoader(
	// 	"https://docs.smith.langchain.com/user_guide",
	// );

	async function load_web(url: string) {
		let documents: Document[] = await fetch(
			`https://cloudflare-cors-anywhere.muzhi1991.workers.dev/?${url}`,
			{
				method: "GET", // *GET, POST, PUT, DELETE, etc.
			},
		)
			.then((response) => {
				console.log(response.status);
				return response.text();
			})
			.then((text) => {
				const xx = cheerio.load(text);
				const t = xx("body").text();
				const metadata = { source: url };
				return [new Document({ pageContent: text, metadata })];
			});
		return documents;
	}

	async function vectorstore_retriever(documents: Document[]) {
		let splitDocs = await splitter.splitDocuments(documents);
		let vectorstore = await MemoryVectorStore.fromDocuments(
			splitDocs,
			embeddings,
		);
		const retriever = vectorstore.asRetriever({ k: 1 });
		return retriever;
	}
	async function retrieve_chain(url: string) {
		let documents = await load_web(url);
		let retriever = await vectorstore_retriever(documents);

		let documentChain = await createStuffDocumentsChain({
			llm: chatModel,
			prompt: qaPrompt,
		});

		let retrievalChain = await createRetrievalChain({
			combineDocsChain: documentChain,
			retriever,
		});
		return retrievalChain;
	}

	// const user_input = "what is LangSmith?";
	// let promise = retrieve_chain(url).then((chain) => {
	// 	return chain.invoke({
	// 		input: user_input,
	// 	}).then((res: { answer: any; })=>res.answer);
	// });

	import { createHistoryAwareRetriever } from "https://esm.sh/langchain/chains/history_aware_retriever";
	import { MessagesPlaceholder } from "https://esm.sh/@langchain/core/prompts";
	import { BufferMemory } from "https://esm.sh/langchain/memory";
	import { ChatMessageHistory } from "https://esm.sh/langchain/stores/message/in_memory";
	import { RunnableWithMessageHistory } from "https://esm.sh/@langchain/core/runnables";

	async function retrieve_history_chain(url: string) {
		let documents = await load_web(url);
		let retriever = await vectorstore_retriever(documents);

		// const memory = new BufferMemory({
		// 	returnMessages: true,
		// 	inputKey: "input",
		// 	outputKey: "output",
		// 	memoryKey: "chat_history",
		// });
		// console.log(
		// 	"memory:",
		// 	JSON.stringify(await memory.loadMemoryVariables({}), null, 2),
		// );
		// 根据历史生成检索的query
		const historyAwarePrompt = ChatPromptTemplate.fromMessages([
			new MessagesPlaceholder("chat_history"),
			["human", "{input}"],
			[
				"human",
				"Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
			],
		]);
		// 使用检索的query，查询并返回retriever中的相关的文档
		const historyAwareRetrieverChain = await createHistoryAwareRetriever({
			llm: chatModel,
			retriever,
			rephrasePrompt: historyAwarePrompt,
		});
		// 包含history和context的prompt
		const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
			[
				"system",
				"Answer the user's questions based on the below context:\n\n{context}",
			],
			new MessagesPlaceholder("chat_history"),
			["human", "{input}"],
		]);
		// 问答链，同上面的case
		const historyAwareCombineDocsChain = await createStuffDocumentsChain({
			llm: chatModel,
			prompt: historyAwareRetrievalPrompt,
		});
		const conversationalRetrievalChain = await createRetrievalChain({
			retriever: historyAwareRetrieverChain,
			combineDocsChain: historyAwareCombineDocsChain,
		});
		let messageHistory=new ChatMessageHistory()
		console.log("messageHistory:",JSON.stringify(await messageHistory.getMessages(), null, 2))
		const chainWithHistory = new RunnableWithMessageHistory({
			runnable: conversationalRetrievalChain,
			getMessageHistory: (sessionID: string)=> messageHistory,
			inputMessagesKey: "input",
			historyMessagesKey: "chat_history",
			outputMessagesKey: "answer",
		});
		return chainWithHistory;
	}

	import {
		HumanMessage,
		AIMessage,
		AIMessageChunk,
	} from "https://esm.sh/@langchain/core/messages";

	// const chatHistory = [
	// 	new HumanMessage("Can LangSmith help test my LLM applications?"),
	// 	new AIMessage("Yes!"),
	// ];
	// let his_chain= retrieve_history_chain(url)
	// let promise = his_chain.then((chain) => {
	// 	chain
	// 		.invoke({
	// 			// chat_history: chatHistory,
	// 			input: "Who are you?",
	// 		})
	// 		.then((res: any) => {
	// 			console.log("reu", JSON.stringify(res, null, 2));
	// 			return res.answer;
	// 		});
	// 	return chain
	// }).then(chain=>{
	// 	return chain
	// 		.invoke({
	// 			// chat_history: chatHistory,
	// 			input: "Can LangSmith help test my LLM applications?",
	// 		})
	// 		.then((res: any) => {
	// 			console.log("reu22", JSON.stringify(res, null, 2));
	// 			return res.answer;
	// 		});

	// })
	type AIMessageChunk = typeof AIMessageChunk;
	let chunks: AIMessageChunk[] = [];
	// 	async function stream_out(url:string) {
	// 		let chain=await retrieve_history_chain(url)
	// 		const stream=await chain.stream({
	// 				chat_history: chatHistory,
	// 				input: "Tell me how!",
	// 			});
	// 		for await (const chunk of stream){
	// 			console.log(JSON.stringify(chunk, null, 2));
	// 			console.log("------",chunk.constructor.name);
	// 			if(chunk.answer){
	// 				console.log("answer",chunk.answer)
	// 				chunks=[...chunks,chunk]
	// 			}

	// 		}
	// 		return 'done'

	// 	}
	// 	// stream_out(url)

	// 	import { ConversationChain } from "https://esm.sh/langchain/chains";
	// 	const ZH_DEFAULT_TEMPLATE = `下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。

	// 当前对话：
	// {history}
	// Human: {input}
	// AI:`;
	// 	const chatStreamModel = new ChatOpenAI({
	// 		apiKey: OPENAI_API_KEY,
	// 		streaming: true,
	// 	});
	// 	const chatChain = new ConversationChain({ llm: chatStreamModel ,prompt:new PromptTemplate({
	//           template: ZH_DEFAULT_TEMPLATE,
	//           inputVariables: ["history", "input"],
	//         })});
	// 	async function chat(text:string) {
	// 		console.log("start")
	// 		return await chatChain.call({
	// 				input: text,
	// 				callbacks: [
	// 					{
	// 						handleLLMNewToken(token: string) {
	// 							if (token) {
	// 								console.log("answer",token)
	// 								chunks=[...chunks,token]
	// 							}
	// 						},
	// 					},
	// 				],
	// 			});
	// 		// let stream=await chatChain.stream({ input: text })
	// 		// for await (const chunk of stream){
	// 		// 	console.log(JSON.stringify(chunk, null, 2));
	// 		// 	console.log("------",chunk.constructor.name);
	// 		// 	if(chunk.response){
	// 		// 		console.log("answer",chunk.response)
	// 		// 		chunks=[...chunks,chunk]
	// 		// 	}
	// 		// }
	// 	}
	async function test() {
		// console.log(await chat("你好啊"))
		// console.log(await chat("重复我上一句话"))
		let his_chain = await retrieve_history_chain(url);
		let res1 = await his_chain.invoke({
			// chat_history: chatHistory,
			input: "Who are you?",
		},{configurable:{sessionId: "foobarbaz"}});
		console.log(JSON.stringify(res1, null, 2));

		let res2 = await his_chain.invoke({
			// chat_history: chatHistory,
			input: "repeat my previous word",
		},{configurable:{sessionId: "foobarbaz"}});
		console.log(JSON.stringify(res2, null, 2));
	}
	// test();
	// 	let promise =chat("你好啊")
</script>

<h1>hello {$_.t("settings.language.lang")}</h1>
<!-- <h1>world {$plugin.settings.openaiConfig.apiKey}</h1> -->
<!-- {#each chunks as chunk }
{chunk}
{/each} -->
<!-- {#await promise}
	<p>...waiting</p>
{:then result}
	<p>The number is {JSON.stringify(result, null, 2)}</p>
{:catch error}
	<p style="color: red">{error.message}</p>
{/await} -->
