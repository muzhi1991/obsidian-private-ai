import log from 'loglevel';
import { Document } from "langchain/document";
import { index, type CleanupMode } from "langchain/indexes";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import type { Embeddings } from "@langchain/core/embeddings";
import { VectorStore } from '@langchain/core/vectorstores';
import type { RecordManagerInterface } from "@langchain/community/indexes/base";



import {
  GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM,
  GLOBAL_DEFAULT_SPLITER,
  getEmbeddingModelFromSettings,
  getEmbeddingModelParamFromSettings
} from '../setting';

import { plugin, needUpdateDB } from "../store";
import { get } from 'svelte/store'
import {
  loadDocumentsFromPath,
  loadAllDocumentsFromVault,
  loadLatestTimeFromVault
} from '../utils/obsidian-loader-utils'
import { SqlitWorker2RecordManager } from "../utils/sqlite-worker2-recordmanager"
import { OramaStore } from "../utils/orama-vectorstore";
import { unindex, renameIndex } from './index-patch'
import EmbeddingSingleton from './embedding-chain'

interface VectorStoreData {
  mtime: number
  vectorStore: VectorStore,
  recordManager: RecordManagerInterface
}

export class VectoreStoreSingleton {
  // private static instance: ConversationChain | null = null;
  private static instances: Map<string, VectorStoreData> = new Map();
  private static embeddingModel: Embeddings | null = null;

  private constructor() { }

  private static getSplitter() {
    let embeddingModelMaxLen = getEmbeddingModelParamFromSettings(get(plugin).settings)?.maxLen ?? GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM.maxLen
    let splitter = new RecursiveCharacterTextSplitter({
      chunkSize: Math.min(GLOBAL_DEFAULT_SPLITER['chunkSize'], embeddingModelMaxLen),
      chunkOverlap: Math.min(GLOBAL_DEFAULT_SPLITER['chunkOverlap'], Math.floor(embeddingModelMaxLen * 0.5)),
    });
    return splitter
  }

  private static async createRecordManager(collection_name: string) {
    let recordManager = new SqlitWorker2RecordManager(`${collection_name}`, "record_manager_cache")
    await recordManager.createSchema()
    return recordManager
  }

  private static async createVectorStore(collection_name: string, embeddings: Embeddings) {
    let vectorStore = new OramaStore(embeddings)
    await vectorStore.create(collection_name)
    return vectorStore
  }

  private static async validIndexConsistent(recordManager: SqlitWorker2RecordManager, vectorStore: OramaStore) {
    let recordCount = await recordManager.getCount()
    let embedCount = await vectorStore.getDataCount()
    log.log(`check persist count recordCount:${recordCount} VS embedCount:${embedCount}`)
    if (recordCount != embedCount) {
      log.warn("index not consistency!!!")
      return false;
    }
    return true;
  }

  private static async addDocsAndIndex(recordManager: SqlitWorker2RecordManager, vectorStore: OramaStore, documents: Document[], cleanupMode: CleanupMode = 'incremental') {

    let splitDocs = await this.getSplitter().splitDocuments(documents);

    let res = await index({
      docsSource: splitDocs,
      recordManager,
      vectorStore,
      options: {
        cleanup: cleanupMode,
        sourceIdKey: "source",
      },
    });
    log.debug(res)
    log.debug(`double check persist count recordCount:${await recordManager.getCount()} VS embedCount:${await vectorStore.getDataCount()}`)
    // let vectorstore = await MemoryVectorStore.fromDocuments(
    //   splitDocs,
    //   embeddings,
    // );
    return { vectorStore, recordManager }
  }
  public static async addDocs(tag: string, path: string) {
    let docs = await loadDocumentsFromPath(path)
    let instance = await this.getInstance(tag)!
    this.addDocsAndIndex(instance?.recordManager as SqlitWorker2RecordManager, instance?.vectorStore as OramaStore, docs)
  }

  public static async delDocs(tag: string, path: string) {
    let instance = await this.getInstance(tag)!
    await unindex(instance?.recordManager!, instance?.vectorStore!, { source: path })
  }

  public static async renameDocs(tag: string, src: string, target: string) {
    let instance = await this.getInstance(tag)!
    await renameIndex(instance?.recordManager!, instance?.vectorStore!, { source: src, target: target })
  }

  public static async getInstance(tag: string) {
    if (!tag)
      throw new Error("tag is empty")

    let setttings = get(plugin).settings
    // Embbeding模型和tag任何一个不一样都需要重构vectorstore
    let storeKey = tag + "_" + getEmbeddingModelFromSettings(setttings)

    let embeddingModel = EmbeddingSingleton.getInstance()

    if (!this.instances.has(storeKey) || this.embeddingModel != embeddingModel) {
      this.embeddingModel = embeddingModel
      let recordManager = await this.createRecordManager(tag)
      let vectorStore = await this.createVectorStore(tag, embeddingModel)
      //todo: persist recordmanager && vectorstore && mtime 
      // init file load
      let consistent = await this.validIndexConsistent(recordManager, vectorStore)
      let indexTime = await recordManager.getLatestUpdateSecondTime() * 1000
      let latestFileTime = await loadLatestTimeFromVault()
      log.debug(`compare Modified Time: ${indexTime} vs ${latestFileTime}`)
      if (!consistent || !indexTime || !latestFileTime || indexTime < latestFileTime) {
        log.debug(`reload all files an build vecstore store`)
        let documents: Document[] = []
        if (tag == 'all') {
          documents = await loadAllDocumentsFromVault()
        }
        else {
          documents = await loadDocumentsFromPath(tag)
        }
        log.debug("load file total cnt:", documents.length)
        let cleanupMode: CleanupMode = 'incremental'
        if (!consistent) {
          log.warn("rebuild data storage!!!")
          await recordManager.clear()
          cleanupMode = 'full'
        }
        await this.addDocsAndIndex(recordManager, vectorStore, documents, cleanupMode)
        needUpdateDB.set(true)
      }
      log.debug("new vectorstore:", storeKey)
      this.instances.set(storeKey, { mtime: latestFileTime, vectorStore: vectorStore, recordManager: recordManager });
    }
    log.debug("get vectorstore:", storeKey)
    return this.instances.get(storeKey)
  }

  public static async getVectorStoreInstance(tag: string) {
    return (await this.getInstance(tag))?.vectorStore!;
  }
}

export default VectoreStoreSingleton