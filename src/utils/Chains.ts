
/****************langchain********************/
import { plugin } from "../store";
import { get } from 'svelte/store'
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "langchain/document";
import { TFile, normalizePath } from 'obsidian'

import {
  ChatPromptTemplate,
  PromptTemplate,
} from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { InMemoryRecordManager } from "@langchain/community/indexes/memory"
import { SqlitWorker2RecordManager } from "./SqliteWorker2RecordManager"
import { index } from "langchain/indexes";
import { VectorStore } from '@langchain/core/vectorstores';
import { OpenAIEmbeddings } from "@langchain/openai";

import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";


import { ConversationChain, LLMChain, BaseChain } from "langchain/chains";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { type Runnable, RunnableMap, RunnableLambda, RunnablePick, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { deepEqual, iterAllMdFiles } from "../utils/Utils"
import { i18n } from "../config";
import { GLOBAL_DEFAULT_MODEL_PARAM, GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM, GLOBAL_DEFAULT_SPLITER, LLMServer, EmbeddingServer, type OllamaConfig, type OpenAIConfig, getEmbeddingModelFromSettings, getLLMModelParamFromSettings, getEmbeddingModelParamFromSettings } from '../setting';
import ChatHistoryManager from  "../utils/ChatHistory"

console.debug("LANGCHAIN_VERBOSE:", process.env.LANGCHAIN_VERBOSE)
const VERBOSE= process.env.LANGCHAIN_VERBOSE=='true'


class LLMSingleton {
  private static instance: BaseChatModel | null = null;
  private static llmServer: string | null = null;
  private static serverConfig: Partial<OpenAIConfig> | Partial<OllamaConfig> | null = null;

  public static getInstance() {
    let settings = get(plugin).settings

    let latestConfig;
    if (settings.llmServer == LLMServer.OpenAI) {
      const currentApiKey = settings.openaiConfig.apiKey ?? null;
      if (!currentApiKey) {
        throw new Error("api key not set");
      }
      latestConfig = settings.openaiConfig
    } else if (settings.llmServer == LLMServer.Ollama) {
      latestConfig = settings.ollamaConfig
    }
    let chatStreamModel;
    if (!this.instance || settings.llmServer !== this.llmServer || !deepEqual(this.serverConfig, latestConfig, ['embedding_model'])) {
      this.llmServer = settings.llmServer;
      this.serverConfig = structuredClone(latestConfig!);

      if (settings.llmServer == LLMServer.OpenAI) {
        chatStreamModel = new ChatOpenAI({
          apiKey: settings.openaiConfig.apiKey,
          model: settings.openaiConfig.model,
          streaming: true,
          configuration: {
            baseURL: settings.openaiConfig.baseUrl,
          },
          maxRetries: 3,
          verbose: VERBOSE
        });
      } else if (settings.llmServer == LLMServer.Ollama) {
        chatStreamModel = new ChatOllama({
          baseUrl: settings.ollamaConfig.baseUrl, // Default value
          model: settings.ollamaConfig.model, // Default value
          maxRetries: 3,
          verbose: VERBOSE
        });
      }
      console.debug("new llm instance")
      this.instance = chatStreamModel!;
    }
    console.debug("get llm instance")
    return this.instance!;

  }
}

class EmbeddingSingleton {
  private static instance: Embeddings | null = null;
  private static embeddingServer: string | null = null;
  private static embeddingServerConfig: Partial<OpenAIConfig> | Partial<OllamaConfig> | null = null;

  public static getInstance() {

    let settings = get(plugin).settings
    let latestConfig;
    if (settings.embeddingServer == EmbeddingServer.OpenAI) {
      const currentApiKey = settings.openaiConfig.apiKey ?? null;
      if (!currentApiKey) {
        throw new Error("api key not set");
      }
      latestConfig = settings.openaiConfig;
    } else if (settings.embeddingServer == EmbeddingServer.Ollama) {
      latestConfig = settings.ollamaConfig;
    }

    let embeddings;
    if (!this.instance || settings.embeddingServer !== this.embeddingServer || !deepEqual(this.embeddingServerConfig, latestConfig, ['model'])) {
      this.embeddingServer = settings.embeddingServer;
      this.embeddingServerConfig = structuredClone(latestConfig!);

      if (settings.embeddingServer == EmbeddingServer.OpenAI) {
        embeddings = new OpenAIEmbeddings({
          apiKey: settings.openaiConfig.apiKey,
          model: settings.openaiConfig.embeddingModel,
          configuration: {
            baseURL: settings.openaiConfig.baseUrl,
          },
          maxRetries: 3,
          verbose: VERBOSE
        });
      } else if (settings.embeddingServer == EmbeddingServer.Ollama) {
        embeddings = new OllamaEmbeddings({
          baseUrl: settings.ollamaConfig.baseUrl,
          model: settings.ollamaConfig.embeddingModel,
          maxRetries: 3,
        });
      }
      console.debug("new embedding instance")
      this.instance = embeddings!;
    }
    console.debug("get embedding instance")
    return this.instance!;

  }

}

class ChatChainSingleton {
  private static instance: Runnable;
  private static chatModel: BaseChatModel;
  private static lang: string | null = null

  private constructor() { }

  public static getInstance() {
    let chatStreamModel = LLMSingleton.getInstance()
    let lang = get(plugin).settings.language
    if (!this.instance || !this.chatModel || this.chatModel != chatStreamModel || this.lang != lang) {
      this.chatModel = chatStreamModel
      this.lang = lang
      let prompt = ChatPromptTemplate.fromMessages([
        ["system", get(i18n).t("prompt.qa")],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
      ]);
      let chain = prompt.pipe(chatStreamModel)
      // let messageHistory = new ChatMessageHistory();
      let messageHistory=ChatHistoryManager.getInstance("default")
      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId: string) => messageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        outputMessagesKey: "content",
      });
      const outputParser = new StringOutputParser();
      this.instance = chainWithHistory.pipe(outputParser)
      console.debug("new ChatChain")
    }
    console.debug("get ChatChain")
    return this.instance!;
  }
}

/*********************NoteQA Chain************************/
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import type { LLM } from "@langchain/core/language_models/llms";
import type { Embeddings, EmbeddingsInterface } from "@langchain/core/embeddings";
import type { LanguageModelLike } from "@langchain/core/language_models/base";

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { RecordManagerInterface } from "@langchain/community/indexes/base";

async function loadFile(file: TFile) {
  console.debug("load file:", file.name)
  let documents: Document[] = await get(plugin).app.vault.cachedRead(file)
    .then((text: string) => {
      // console.debug(text);
      const metadata = { source: file.path };
      return [new Document({ pageContent: text, metadata })];
    });
  return documents;
}

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

async function fileRetrieveHistoryChain(file: TFile, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  let documents = await loadFile(file);
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
  let messageHistory=ChatHistoryManager.getInstance("default")
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    outputMessagesKey: "answer",
  });

  return chainWithHistory
}

async function fileContextHistoryChain(file: TFile, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface) {
  let documents = await loadFile(file);

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
  let messageHistory=ChatHistoryManager.getInstance("default")
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    // outputMessagesKey: "answer",
  });

  return chainWithHistory
}

interface NoteData{
    mtime:number
    chain:Runnable,
}
class QAChatChainSingleton {
  // private static instance: ConversationChain | null = null;
  
  private static instances: Map<string,NoteData > = new Map();
  private static chatModel: BaseChatModel | null = null;
  private static embeddingModel: Embeddings | null = null;
  private static lang: string | null = null

  private constructor() { }

  public static async getInstance(file: TFile) {
    if (!file)
      throw new Error("file is empty")

    let chatStreamModel = LLMSingleton.getInstance()
    let embeddingModel = EmbeddingSingleton.getInstance()
    let lang = get(plugin).settings.language

    let noteContent = await get(plugin).app.vault.cachedRead(file)
    let max_len = getLLMModelParamFromSettings(get(plugin).settings)?.maxLen ?? GLOBAL_DEFAULT_MODEL_PARAM['maxLen']

    // 没有文件，或者文件已经修改
    if (!this.instances.has(file.path)|| this.instances.get(file.path)?.mtime!=file.stat.mtime || this.chatModel != chatStreamModel || this.embeddingModel != embeddingModel || this.lang != lang) {
      console.debug("QAChatChainSingleton time",this.instances.get(file.path)?.mtime,file.stat.mtime )
      this.chatModel = chatStreamModel
      this.embeddingModel = embeddingModel
      this.lang = lang
      let chain
      if (false) { //noteContent.length < (max_len * 0.8)
        console.debug("create ContextHistoryChain")
        chain = await fileContextHistoryChain(file, chatStreamModel, embeddingModel);
      } else {
        console.debug("create RetrieveHistoryChain")
        chain = (await vaultRetrieveHistoryChain("all", chatStreamModel, embeddingModel,(doc:Document)=>{
          console.debug(doc.metadata.source,file.path)
          return doc.metadata.source==file.path
        })).pick("answer");
        // chain = (await fileRetrieveHistoryChain(file, chatStreamModel, embeddingModel)).pick("answer");
      }
      // 
      const outputParser = new StringOutputParser();
      // const runnablePicker=new RunnablePick('answer')
      // QAChatChainSingleton.instances.set(file.path,  chain.pipe(runnablePicker).pipe(outputParser));
      this.instances.set(file.path,{chain:chain.pipe(outputParser),mtime:file.stat.mtime} );
    }

    return this.instances.get(file.path)?.chain!;
  }
}


/***********************VaultQA Chain***************************/

async function vectorStoreRetriever(vectorStore: VectorStore,filter:any=undefined) {
  const retriever = vectorStore.asRetriever({ k: 3,filter:filter,verbose:VERBOSE});
  return retriever;
}

async function vaultRetrieveHistoryChain(tag: string, chatModel: LanguageModelLike, embeddings: EmbeddingsInterface, filter: any = undefined) {

  let vectorStore = await VectoreStoreSingleton.getInstance(tag);
  let retriever = await vectorStoreRetriever(vectorStore,filter);
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
  let messageHistory=ChatHistoryManager.getInstance("default")
  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: conversationalRetrievalChain,
    getMessageHistory: (sessionId: string) => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
    outputMessagesKey: "answer",
  });

  return chainWithHistory
}
interface VectorStoreData{
  mtime:number
  vectorStore:VectorStore,
  recordManager:RecordManagerInterface
}
class VectoreStoreSingleton {
  // private static instance: ConversationChain | null = null;
  private static instances: Map<string, VectorStoreData> = new Map();
  private static embeddingModel: Embeddings | null = null;

  private constructor() { }

  public static getVectorStore() {
    let pluginDir = get(plugin).manifest.dir
    console.log(get(plugin).manifest.dir)
    let pp = normalizePath(
      pluginDir +
      "/vectorstores/" +
      ("test") +
      ".bin",
    );
    console.log(pp)
  }

  private static async createMemoryVectorStoreWithRecordManagerByDocs(embeddings: Embeddings, documents: Document[],collection_name:string) {

    let recordManager=new SqlitWorker2RecordManager(`${collection_name}`,"record_manager_cache")
    await recordManager.createSchema()

    const splitter = new RecursiveCharacterTextSplitter({
      // chunkSize: 10,
      // chunkOverlap: 1,
    });
    let splitDocs = await splitter.splitDocuments(documents);
    let vectorStore = new MemoryVectorStore(embeddings)

    let res=await index({
      docsSource: splitDocs,
      recordManager,
      vectorStore,
      options: {
        cleanup: "full",
        sourceIdKey: "source",
      },
    });
    console.log(res)
    // let vectorstore = await MemoryVectorStore.fromDocuments(
    //   splitDocs,
    //   embeddings,
    // );
    return {vectorStore,recordManager}
  }

  public static async getInstance(tag: string) {
    if (!tag)
      throw new Error("tag is empty")

    let setttings = get(plugin).settings
    // Embbeding模型和tag任何一个不一样都需要重构vectorstore
    let storeKey = tag + "_" + getEmbeddingModelFromSettings(setttings)

    let embeddingModel = EmbeddingSingleton.getInstance()

    let vectorStore;
    if (!this.instances.has(storeKey) || this.embeddingModel != embeddingModel) {
      this.embeddingModel = embeddingModel
      //todo: persist recordmanager && vectorstore && mtime 
      // init file load
      let app = get(plugin).app
      let mdFiles: TFile[] = [];
      let path = normalizePath(tag)
      if (tag == 'all') {
        let files = await app.vault.getMarkdownFiles();
        if (files)
          mdFiles.push(...files)
      } else if (await app.vault.adapter.exists(path)) {
        let file = await app.vault.getFileByPath(path)
        if (file && file.extension == 'md') {
          mdFiles.push(file)
        } else {
          let dir = await app.vault.getFolderByPath(path)
          if (dir) {
            //todo: need test
            let files = iterAllMdFiles(dir)
            if (files)
              mdFiles.push(...files)
          }
        }
      }
      console.debug("find file total cnt:", mdFiles.length)

      let documents: Document[] = [];
      //fixme: here need manager
      let mtime=0
      for (const file of mdFiles) {
        let docs = await loadFile(file);
        documents.push(...docs);
        if(file.stat.mtime>mtime)
          mtime=file.stat.mtime
      }
      console.debug("load file total cnt:", documents.length)
      let {vectorStore, recordManager} = await this.createMemoryVectorStoreWithRecordManagerByDocs(embeddingModel, documents,tag)
      if (vectorStore) {
        console.debug("new vectorstore:", storeKey)
        this.instances.set(storeKey, {mtime:mtime, vectorStore:vectorStore,recordManager: recordManager});
      }

    }
    console.debug("get vectorstore:", storeKey)
    return this.instances.get(storeKey)?.vectorStore!;
  }
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

export { ChatChainSingleton, QAChatChainSingleton, VaultChainSingleton }