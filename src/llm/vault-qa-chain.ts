import log from 'loglevel';
import { VectorStore } from '@langchain/core/vectorstores';
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type {
  Embeddings,
  EmbeddingsInterface
} from "@langchain/core/embeddings";
import type { LanguageModelLike } from "@langchain/core/language_models/base";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  Runnable,
  RunnableWithMessageHistory
} from "@langchain/core/runnables";

import { i18n } from "../config";
import { plugin } from "../store";
import { get } from 'svelte/store'


import LLMSingleton from './llm-chain'
import ChatHistoryManager from "./chat-history"
import EmbeddingSingleton from './embedding-chain'
import VectoreStoreSingleton from './vectorstore-manager'

const VERBOSE = process.env.LANGCHAIN_VERBOSE == 'true'

async function vectorStoreRetriever(vectorStore: VectorStore, filter: any = undefined) {
  const retriever = vectorStore.asRetriever({ k: 3, filter: filter, verbose: VERBOSE });
  return retriever;
}

async function vaultRetrieveHistoryChain(tag: string, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface, filter: any = undefined) {

  let vectorStore = await VectoreStoreSingleton.getVectorStoreInstance(tag);
  let retriever = await vectorStoreRetriever(vectorStore, filter);
  // 根据历史生成检索的query
  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    [
      "human",
      get(i18n).t("prompt.history_aware_gen_query"),
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
      get(i18n).t("prompt.context_qa"),
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
  // let messageHistory = new ChatMessageHistory();
  let messageHistory = ChatHistoryManager.getInstance("default")
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    outputMessagesKey: "answer",
  });

  return chainWithHistory
}


class VaultChainSingleton {
  // private static instance: ConversationChain | null = null;
  private static instances: Map<string, Runnable> = new Map();
  private static chatModel: BaseChatModel | null = null;
  private static embeddingModel: Embeddings | null = null;
  private static lang: string | null = null

  private constructor() { }


  public static async getInstance(tag: string) {
    if (!tag)
      tag = "all"
    let lang = get(plugin).settings.language
    let chatStreamModel = LLMSingleton.getInstance()
    let embeddingModel = EmbeddingSingleton.getInstance()

    if (!this.instances.has(tag) || this.chatModel != chatStreamModel || this.embeddingModel != embeddingModel || this.lang != lang) {
      this.chatModel = chatStreamModel
      this.embeddingModel = embeddingModel
      this.lang = lang
      let chain = await vaultRetrieveHistoryChain(tag, chatStreamModel, embeddingModel);
      const outputParser = new StringOutputParser();
      // const runnablePicker=new RunnablePick('answer')
      // QAChatChainSingleton.instances.set(file.path,  chain.pipe(runnablePicker).pipe(outputParser));
      this.instances.set(tag, chain.pick("answer").pipe(outputParser));
    }

    return this.instances.get(tag)!;
  }
}

export default VaultChainSingleton