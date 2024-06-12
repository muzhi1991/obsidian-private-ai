
import log from 'loglevel';
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
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
  RunnableMap,
  RunnablePick,
  RunnableWithMessageHistory
} from "@langchain/core/runnables";





import {
  GLOBAL_DEFAULT_MODEL_PARAM,
  GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM,
  GLOBAL_DEFAULT_SPLITER,
  getLLMModelParamFromSettings,
  getEmbeddingModelParamFromSettings
} from '../setting';

import { i18n } from "../config";
import { plugin } from "../store";
import { get } from 'svelte/store'
import {
  loadDocumentsFromPath,
  loadFileStatFromPath
} from '../utils/obsidian-loader-utils'

import LLMSingleton from './llm-chain'
import ChatHistoryManager from "./chat-history"
import { getDocsEmbeddingFromIndex } from './index-patch'
import EmbeddingSingleton from './embedding-chain'
import VectoreStoreSingleton from './vectorstore-manager'




async function vectorstoreRetriever(documents: Document[], embeddings: EmbeddingsInterface) {
  let embeddingModelMaxLen = getEmbeddingModelParamFromSettings(get(plugin).settings)?.maxLen ?? GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM.maxLen
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: Math.min(GLOBAL_DEFAULT_SPLITER['chunkSize'], embeddingModelMaxLen),
    chunkOverlap: Math.min(GLOBAL_DEFAULT_SPLITER['chunkOverlap'], Math.floor(embeddingModelMaxLen * 0.5)),
  });
  let splitDocs = await splitter.splitDocuments(documents);
  let vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings,
  );
  const retriever = vectorstore.asRetriever({ k: 3 });
  return retriever;
}

async function fileRetrieveHistoryChain(filePath: string, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  let documents = await loadDocumentsFromPath(filePath);
  let retriever = await vectorstoreRetriever(documents, embeddings);
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


async function fileRetrieveHistoryChainV2(filePath: string, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  let instance = await VectoreStoreSingleton.getInstance("all");
  let { embeddings: vectors, docs: documents } = await getDocsEmbeddingFromIndex(instance?.recordManager!, instance?.vectorStore!, filePath)
  let vectorstore = new MemoryVectorStore(embeddings)
  vectorstore.addVectors(vectors, documents)
  const retriever = vectorstore.asRetriever({ k: 3 });
  // let documents = await loadDocumentsFromPath(filePath);
  // let retriever = await vectorstoreRetriever(documents, embeddings);
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

async function fileContextHistoryChain(documents: Document[], chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  // let documents = await loadFile(file);

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
  const inputMap = RunnableMap.from({
    'context': async () => documents,
    input: new RunnablePick("input"),
    chat_history: new RunnablePick("chat_history")
  })
  const chain = inputMap.pipe(historyAwareCombineDocsChain)
  // another method
  // const chain=RunnableSequence.from([
  //   {context:async () => noteContent,input:new RunnablePick("input"),chat_history:new RunnablePick("chat_history")},
  //   historyAwareCombineDocsChain
  // ])

  // let messageHistory = new ChatMessageHistory();
  let messageHistory = ChatHistoryManager.getInstance("default")
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    // outputMessagesKey: "answer",
  });

  return chainWithHistory
}

interface NoteData {
  mtime: number
  chain: Runnable,
}
class QAChatChainSingleton {
  // private static instance: ConversationChain | null = null;

  private static instances: Map<string, NoteData> = new Map();
  private static chatModel: BaseChatModel | null = null;
  private static embeddingModel: Embeddings | null = null;
  private static lang: string | null = null

  private constructor() { }

  public static async getInstance(filePath: string) {
    let docs = await loadDocumentsFromPath(filePath)
    if (!docs)
      throw new Error("file is empty")
    let fileStat = (await loadFileStatFromPath(filePath))!

    let chatStreamModel = LLMSingleton.getInstance()
    let embeddingModel = EmbeddingSingleton.getInstance()
    let lang = get(plugin).settings.language

   
    let max_len = getLLMModelParamFromSettings(get(plugin).settings)?.maxLen ?? GLOBAL_DEFAULT_MODEL_PARAM['maxLen']

    // 没有文件，或者文件已经修改
    if (!this.instances.has(filePath) || this.instances.get(filePath)?.mtime != fileStat.mtime || this.chatModel != chatStreamModel || this.embeddingModel != embeddingModel || this.lang != lang) {
      log.debug("QAChatChainSingleton time", this.instances.get(filePath)?.mtime, fileStat.mtime)
      this.chatModel = chatStreamModel
      this.embeddingModel = embeddingModel
      this.lang = lang
      let chain
      let noteLen =docs.reduce((acc, doc) => acc + (doc.pageContent ? doc.pageContent.length : 0), 0)
      if (noteLen < (max_len * 0.8)) {
        log.debug("create ContextHistoryChain")
        chain = await fileContextHistoryChain(docs, chatStreamModel, embeddingModel);
      } else {
        log.debug("create RetrieveHistoryChain")
        // version1: from vault memory
        // chain = (await vaultRetrieveHistoryChain("all", chatStreamModel, embeddingModel, (doc: Document) => {
        //   log.debug(doc.metadata.source, filePath)
        //   return doc.metadata.source == filePath
        // })).pick("answer");
        // version2: from valult orama, filter not work
        // chain = (await vaultRetrieveHistoryChain("all", chatStreamModel, embeddingModel,{'source': filePath})).pick("answer");
        // version3: read from orama, rebuild docs&&embeding in memory

        chain = (await fileRetrieveHistoryChainV2(filePath, chatStreamModel, embeddingModel)).pick("answer");
      }
      // 
      const outputParser = new StringOutputParser();
      // const runnablePicker=new RunnablePick('answer')
      // QAChatChainSingleton.instances.set(file.path,  chain.pipe(runnablePicker).pipe(outputParser));
      this.instances.set(filePath, { chain: chain.pipe(outputParser), mtime: fileStat.mtime });
    }

    return this.instances.get(filePath)?.chain!;
  }
}
export default QAChatChainSingleton