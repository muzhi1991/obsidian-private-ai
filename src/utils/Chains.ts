
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
import { OpenAIEmbeddings } from "@langchain/openai";

import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";


import { ConversationChain, LLMChain, BaseChain } from "langchain/chains";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { type Runnable, RunnableMap, RunnableLambda, RunnablePick } from "@langchain/core/runnables";

import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { deepEqual } from "../utils/Utils"

console.debug("LANGCHAIN_VERBOSE:", process.env.LANGCHAIN_VERBOSE)
const ZH_DEFAULT_TEMPLATE = `下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。
  
  当前对话：
  {history}
  Human: {input}
  AI:`;

class ChatChainSingleton {
  private static instance: Runnable;
  private static llmServer: string | null = null;
  private static serverConfig: Partial<OpenAIConfig> | Partial<OllamaConfig> | null = null;
  private static prompt = ChatPromptTemplate.fromMessages([
    ["system", "下面是人类与AI之间的友好对话。AI很健谈并提供大量具体细节。如果AI不知道问题的答案，它会如实说不知道。"],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  private constructor() { }

  public static getInstance() {
    let setttings = get(plugin).settings

    let latestConfig;
    if (setttings.llmServer == LLMServer.OpenAI) {
      const currentApiKey = setttings.openaiConfig.apiKey ?? null;
      if (!currentApiKey) {
        throw new Error("api key not set");
      }
      latestConfig = setttings.openaiConfig
    } else if (setttings.llmServer == LLMServer.Ollama) {
      latestConfig = setttings.ollamaConfig
    }
    let chatStreamModel;
    console.debug(this.serverConfig,latestConfig)
    if (!this.instance || setttings.llmServer !== this.llmServer || !deepEqual(this.serverConfig, latestConfig, ['embedding_model'])) {
      this.llmServer = setttings.llmServer;
      this.serverConfig = structuredClone(latestConfig!);

      if (setttings.llmServer == LLMServer.OpenAI) {
        chatStreamModel = new ChatOpenAI({
          apiKey: setttings.openaiConfig.apiKey,
          model:setttings.openaiConfig.model,
          streaming: true,
          configuration: {
            baseURL: setttings.openaiConfig.baseUrl,
          },
          maxRetries:3,
          verbose: true
        });
      } else if (setttings.llmServer == LLMServer.Ollama) {
        chatStreamModel = new ChatOllama({
          baseUrl: setttings.ollamaConfig.baseUrl, // Default value
          model: setttings.ollamaConfig.model, // Default value
          maxRetries:3,
          verbose: true
        });
      }
      console.debug("new instance")

      let chain = this.prompt.pipe(chatStreamModel!)
      let messageHistory = new ChatMessageHistory();
      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId: string) => messageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        outputMessagesKey: "content",
      });
      const outputParser = new StringOutputParser();
      this.instance = chainWithHistory.pipe(outputParser)
    }
    console.debug("get instance")
    return this.instance!;
  }
}

import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import type { LLM } from "@langchain/core/language_models/llms";
import type { Embeddings, EmbeddingsInterface } from "@langchain/core/embeddings";
import type { LanguageModelLike } from "@langchain/core/language_models/base";
import { EmbeddingServer, LLMServer, type MyPluginSettings, type OllamaConfig, type OpenAIConfig } from "src/main";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

async function load_file(file: TFile) {
  let documents: Document[] = await get(plugin).app.vault.cachedRead(file)
    .then((text: string) => {
      console.debug(text);
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
  private static LLMInstance: BaseChatModel | null = null;
  private static EmbeddingInstance: Embeddings | null = null;

  // private static previousApiKey: string | null = null;
  private static settings: MyPluginSettings | null = null;
  private static llmServer: string | null = null;
  private static embeddingServer: string | null = null;
  private static serverConfig: Partial<OpenAIConfig> | Partial<OllamaConfig> | null = null;
  private static embeddingServerConfig: Partial<OpenAIConfig> | Partial<OllamaConfig> | null = null;
  // private static previousEmbeddingApiKey: string | null = null;

  private constructor() { }

  public static getEmbeddingInstance() {
    let setttings = get(plugin).settings
    let latestConfig;
    if (setttings.embeddingServer == EmbeddingServer.OpenAI) {
      const currentApiKey = setttings.openaiConfig.apiKey ?? null;
      if (!currentApiKey) {
        throw new Error("api key not set");
      }
      latestConfig = setttings.openaiConfig;
    } else if (setttings.embeddingServer == EmbeddingServer.Ollama) {
      latestConfig = setttings.ollamaConfig;
    }

    let embeddings;
    if (!this.EmbeddingInstance || setttings.embeddingServer !== this.embeddingServer || !deepEqual(this.embeddingServerConfig, latestConfig, ['model'])) {
      this.embeddingServer = setttings.embeddingServer;
      this.embeddingServerConfig = structuredClone(latestConfig!);

      if (setttings.embeddingServer == EmbeddingServer.OpenAI) {
        embeddings = new OpenAIEmbeddings({
          apiKey: setttings.openaiConfig.apiKey,
          model: setttings.openaiConfig.embedding_model,
          configuration: {
            baseURL: setttings.openaiConfig.baseUrl,
          },
          maxRetries:3,
          verbose: true
        });
      } else if (setttings.embeddingServer == EmbeddingServer.Ollama) {
        embeddings = new OllamaEmbeddings({
          baseUrl: setttings.ollamaConfig.baseUrl,
          model: setttings.ollamaConfig.embedding_model,
          maxRetries:3,
        });
      }
      console.debug("new embedding instance")
      this.EmbeddingInstance = embeddings!;
    }
    return this.EmbeddingInstance!;

    // const currentApiKey = get(plugin).settings.openaiConfig.apiKey ?? null;
    // if (!currentApiKey) {
    //   throw new Error("api key not set");
    // }

    // if (!QAChatChainSingleton.EmbeddingInstance || currentApiKey !== QAChatChainSingleton.previousEmbeddingApiKey) {
    //   QAChatChainSingleton.previousEmbeddingApiKey = currentApiKey;

    //   const embeddings = new OpenAIEmbeddings({
    //     apiKey: currentApiKey,
    //   });
    //   QAChatChainSingleton.EmbeddingInstance = embeddings;
    // }
    // return QAChatChainSingleton.EmbeddingInstance!;
  }


  public static getLLMInstance() {
    let setttings = get(plugin).settings

    let latestConfig;
    if (setttings.llmServer == LLMServer.OpenAI) {
      const currentApiKey = setttings.openaiConfig.apiKey ?? null;
      if (!currentApiKey) {
        throw new Error("api key not set");
      }
      latestConfig = setttings.openaiConfig
    } else if (setttings.llmServer == LLMServer.Ollama) {
      latestConfig = setttings.ollamaConfig
    }

    let chatStreamModel;
    if (!this.LLMInstance || setttings.llmServer !== this.llmServer || !deepEqual(this.serverConfig, latestConfig, ['embedding_model'])) {
      this.llmServer = setttings.llmServer;
      this.serverConfig = structuredClone(latestConfig!);

      if (setttings.llmServer == LLMServer.OpenAI) {
        chatStreamModel = new ChatOpenAI({
          apiKey: setttings.openaiConfig.apiKey,
          model:setttings.openaiConfig.model,
          streaming: true,
          configuration: {
            baseURL: setttings.openaiConfig.baseUrl,
          },
          maxRetries:3,
          verbose: true
        });
      } else if (setttings.llmServer == LLMServer.Ollama) {
        chatStreamModel = new ChatOllama({
          baseUrl: setttings.ollamaConfig.baseUrl, // Default value
          model: setttings.ollamaConfig.model, // Default value
          maxRetries:3,
          verbose: true
        });
      }
      console.debug("new instance")
      this.LLMInstance = chatStreamModel!;
    }
    return this.LLMInstance!;

  }

  public static async getInstance(file: TFile) {
    if (!file)
      throw new Error("file is empty")


    let setttings = get(plugin).settings

    if (!QAChatChainSingleton.instances.has(file.path) || !deepEqual(setttings, this.settings)) {
      this.settings = structuredClone(setttings)
      let chatStreamModel = QAChatChainSingleton.getLLMInstance()
      let chain = await file_retrieve_history_chain(file, chatStreamModel, this.getEmbeddingInstance());
      const outputParser = new StringOutputParser();
      // const runnablePicker=new RunnablePick('answer')
      // QAChatChainSingleton.instances.set(file.path,  chain.pipe(runnablePicker).pipe(outputParser));
      QAChatChainSingleton.instances.set(file.path, chain.pick("answer").pipe(outputParser));
    }

    return QAChatChainSingleton.instances.get(file.path)!;
  }
}

export { ChatChainSingleton, QAChatChainSingleton }