
/****************langchain********************/
import { plugin } from "../store";
import { get } from 'svelte/store'
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { TFile } from 'obsidian'


import {
  ChatPromptTemplate,
  PromptTemplate,
} from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";



import { ConversationChain, LLMChain, BaseChain } from "langchain/chains";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { type Runnable } from "@langchain/core/runnables";

import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

console.log("LANGCHAIN_VERBOSE:",process.env.LANGCHAIN_VERBOSE)
const ZH_DEFAULT_TEMPLATE = `下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。
  
  当前对话：
  {history}
  Human: {input}
  AI:`;

// import type internal from "stream";
// const openai_api_key = get(plugin).settings.openaiConfig.apiKey;
// const chatStreamModel = new ChatOpenAI({
//     apiKey: openai_api_key,
//     streaming: true,
// });
// const ZH_DEFAULT_TEMPLATE = `下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。

// 当前对话：
// {history}
// Human: {input}
// AI:`;
// const chatChain = new ConversationChain({
//     llm: chatStreamModel,
//     prompt: new PromptTemplate({
//         template: ZH_DEFAULT_TEMPLATE,
//         inputVariables: ["history", "input"],
//     }),
// });


// class ChatChainSingleton {
//   private static instance: ConversationChain | null = null;

//   private constructor() {}

//   public static getInstance(): ConversationChain {
//     if (!ChatChainSingleton.instance) {
//       const openai_api_key = get(plugin).settings.openaiConfig.apiKey;
//       const chatStreamModel = new ChatOpenAI({
//         apiKey: openai_api_key,
//         streaming: true,
//       });
//       const ZH_DEFAULT_TEMPLATE = `下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。

// 当前对话：
// {history}
// Human: {input}
// AI:`;
//       ChatChainSingleton.instance = new ConversationChain({
//         llm: chatStreamModel,
//         prompt: new PromptTemplate({
//           template: ZH_DEFAULT_TEMPLATE,
//           inputVariables: ["history", "input"],
//         }),
//       });
//     }
//     return ChatChainSingleton.instance;
//   }
// }

// // To get the chatChain instance:
// const chatChain = ChatChainSingleton.getInstance();

// chat("你好啊")

class ChatChainSingleton {
  private static instance: ConversationChain | null = null;
  private static previousApiKey: string | null = null;

  private constructor() { }

  public static getInstance(): ConversationChain {
    const currentApiKey = get(plugin).settings.openaiConfig.apiKey ?? null;
    if (!currentApiKey) {
      throw new Error("api key not set");
    }
    if (!ChatChainSingleton.instance || currentApiKey !== ChatChainSingleton.previousApiKey) {
      ChatChainSingleton.previousApiKey = currentApiKey;
      const chatStreamModel = new ChatOpenAI({
        apiKey: currentApiKey,
        streaming: true,
      });
      console.log("new instance")

      ChatChainSingleton.instance = new ConversationChain({
        llm: chatStreamModel,
        prompt: new PromptTemplate({
          template: ZH_DEFAULT_TEMPLATE,
          inputVariables: ["history", "input"],
        }),
        verbose: true
      });
    }
    console.log("get instance")
    return ChatChainSingleton.instance;
  }
}


class ChatHistoryChainSingleton {
  private static instance: Runnable | null = null;
  private static previousApiKey: string | null = null;
  private static prompt= ChatPromptTemplate.fromMessages([
    ["system", "下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。"],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  private constructor() { }

  public static getInstance() {
    const currentApiKey = get(plugin).settings.openaiConfig.apiKey ?? null;
    if (!currentApiKey) {
      throw new Error("api key not set");
    }

    interface ResponseWithCall {
      call: (values: Record<string, any>) => Promise<string>;
    }


    if (!ChatHistoryChainSingleton.instance || currentApiKey !== ChatHistoryChainSingleton.previousApiKey) {
      ChatHistoryChainSingleton.previousApiKey = currentApiKey;
      const chatStreamModel = new ChatOpenAI({
        apiKey: currentApiKey,
        streaming: true,
      });
      console.log("new instance")

      let chain = this.prompt.pipe(chatStreamModel)
      let messageHistory = new ChatMessageHistory();
      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId: string) => messageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        outputMessagesKey: "content",
      });


      
      let newchain = chainWithHistory as unknown as ResponseWithCall
      newchain.call = async (values: Record<string, any>) => {
        // implement the call function logic here
        // for example:
        const callback = values.callbacks[0]['handleLLMNewToken'];
        // console.log(values.callbacks, "!!", callback)
        delete values.callbacks;
        let stream = await ChatHistoryChainSingleton.instance?.stream(values, { configurable: { sessionId: "foobarbaz" } })
        if (stream) {
          for await (const chunk of stream) {
            console.log(JSON.stringify(chunk, null, 2));
            console.log("------", chunk.constructor.name);
            if (chunk.content) {
              callback(chunk.content)
            }
          }
        }
        return 'end';
      };
      ChatHistoryChainSingleton.instance = chainWithHistory

    }
    console.log("get instance")
    return ChatHistoryChainSingleton.instance as unknown as ResponseWithCall;;
  }
}

import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import type { LLM } from "@langchain/core/language_models/llms";
import type { Embeddings, EmbeddingsInterface } from "@langchain/core/embeddings";
import type { LanguageModelLike } from "@langchain/core/language_models/base";

async function load_file(file: TFile) {
  let documents: Document[] = await get(plugin).app.vault.cachedRead(file)
    .then((text: string) => {
      console.log(text);
      const metadata = { source: file.path };
      return [new Document({ pageContent: text, metadata })];
    });
  return documents;
}

async function vectorstore_retriever(documents: Document[], embeddings: EmbeddingsInterface) {
  const splitter = new RecursiveCharacterTextSplitter({
    // chunkSize: 10,
    // chunkOverlap: 1,
  });
  let splitDocs = await splitter.splitDocuments(documents);
  let vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings,
  );
  const retriever = vectorstore.asRetriever({ k: 3 });
  return retriever;
}
async function file_retrieve_history_chain(file: TFile, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  let documents = await load_file(file);
  let retriever = await vectorstore_retriever(documents, embeddings);
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
  let messageHistory = new ChatMessageHistory();
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    outputMessagesKey: "answer",
  });
  return chainWithHistory
}


class QAChatChainSingleton {
  // private static instance: ConversationChain | null = null;
  private static instances: Map<string, Runnable> = new Map();
  private static LLMInstance: ChatOpenAI | null = null;
  private static EmbeddingInstance: OpenAIEmbeddings | null = null;

  private static previousApiKey: string | null = null;
  private static previousEmbeddingApiKey: string | null = null;

  private constructor() { }

  public static getEmbeddingInstance() {
    const currentApiKey = get(plugin).settings.openaiConfig.apiKey ?? null;
    if (!currentApiKey) {
      throw new Error("api key not set");
    }

    if (!QAChatChainSingleton.EmbeddingInstance || currentApiKey !== QAChatChainSingleton.previousEmbeddingApiKey) {
      QAChatChainSingleton.previousEmbeddingApiKey = currentApiKey;

      const embeddings = new OpenAIEmbeddings({
        apiKey: currentApiKey,
      });
      QAChatChainSingleton.EmbeddingInstance = embeddings;
    }
    return QAChatChainSingleton.EmbeddingInstance;
  }


  public static getLLMInstance() {
    const currentApiKey = get(plugin).settings.openaiConfig.apiKey ?? null;
    if (!currentApiKey) {
      throw new Error("api key not set");
    }
    if (!QAChatChainSingleton.LLMInstance || currentApiKey !== QAChatChainSingleton.previousApiKey) {
      QAChatChainSingleton.previousApiKey = currentApiKey;
      const chatStreamModel = new ChatOpenAI({
        apiKey: currentApiKey,
        streaming: true,
        verbose:true
      });
      QAChatChainSingleton.LLMInstance = chatStreamModel;
    }
    return QAChatChainSingleton.LLMInstance;

  }

  public static async getInstance(file: TFile) {
    if (!file)
      throw new Error("file is empty")

    interface ResponseWithCall {
      call: (values: Record<string, any>) => Promise<string>;
    }
    let chatStreamModel = QAChatChainSingleton.getLLMInstance()
    if (!QAChatChainSingleton.instances.has(file.path)) {
      let chain = await file_retrieve_history_chain(file, chatStreamModel, this.getEmbeddingInstance());
      let newchain = chain as unknown as ResponseWithCall
      newchain.call = async (values: Record<string, any>) => {
        // implement the call function logic here
        // for example:
        const callback = values.callbacks[0]['handleLLMNewToken'];
        // console.log(values.callbacks, "!!", callback)
        delete values.callbacks;
        let stream = await QAChatChainSingleton.instances.get(file.path)?.stream(values, { configurable: { sessionId: "foobarbaz" } })
        if (stream) {
          for await (const chunk of stream) {
            // console.log(JSON.stringify(chunk, null, 2));
            // console.log("------", chunk.constructor.name);
            if (chunk.answer) {
              callback(chunk.answer)
            }
          }
        }
        return 'end';
      };
      QAChatChainSingleton.instances.set(file.path, chain);
    }

    return QAChatChainSingleton.instances.get(file.path) as unknown as ResponseWithCall;
  }
}

export { ChatChainSingleton,ChatHistoryChainSingleton, QAChatChainSingleton }