import log from 'loglevel';
import type { RecordManagerInterface } from "@langchain/community/indexes/base";
import { VectorStore } from '@langchain/core/vectorstores';
import type { OramaStore } from "src/utils/orama-vectorstore";
interface UnindexArguments {
    source?: string
    sources?: string[]
}
export async function unindex(recordManager: RecordManagerInterface, vectorStore: VectorStore, options: UnindexArguments) {
    let { source, sources } = options
    let ids: string[] = []
    if (source) {
        ids = await recordManager.listKeys({ groupIds: [source] })
    }
    if (sources) {
        ids = await recordManager.listKeys({ groupIds: sources })
    }
    if (ids.length > 0) {
        log.debug("delete ids from recordmanager and vectore", ids)
        await recordManager.deleteKeys(ids)
        await vectorStore.delete({ ids: ids })
    }
}


interface ReindexArguments {
    source: string
    target: string
}
export async function renameIndex(recordManager: RecordManagerInterface, vectorStore: VectorStore, options: ReindexArguments) {
    let { source, target } = options
    let ids: string[] = []
    if (source) {
        ids = await recordManager.listKeys({ groupIds: [source] })
    }

    if (ids.length > 0) {
        log.debug("delete ids from recordmanager and vectore: ", ids,"source:",source,"target:",ids.map(() => target))
        await recordManager.deleteKeys(ids)
        await recordManager.update(ids,{groupIds: ids.map(() => target)})
        await (vectorStore as OramaStore).renameSource(ids, target)
    }
}


export async function getDocsEmbeddingFromIndex(recordManager: RecordManagerInterface, vectorStore: VectorStore,source:string){
    let ids: string[] = []
    ids = await recordManager.listKeys({ groupIds: [source] })
    let {embeddings,docs}=await (vectorStore as OramaStore).getDataByIds(ids)
    return  {embeddings,docs}

}