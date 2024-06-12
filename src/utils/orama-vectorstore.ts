import log from 'loglevel';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { create, insertMultiple, removeMultiple, updateMultiple, search, count } from '@orama/orama';
import type { AnyOrama, Orama, Results, TypedDocument, WhereCondition } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence'
import { plugin } from "../store";
import { get } from 'svelte/store'
import { normalizePath } from 'obsidian'
import path from 'path-browserify'


const vectorStoreSchema = {
    id: 'string',
    source: 'string',
    order: 'number',
    header: 'string[]',
    content: 'string',
} as const;

type VectorDocument = TypedDocument<Orama<typeof vectorStoreSchema>>;

export interface VectorStoreBackup {
    indexName: string;
    vectorSize: number;
    docs: VectorDocument[];
}

export interface OramaVectorStoreArgs {
    similarityThreshold?: number;
}

export class OramaStore extends VectorStore {
    declare FilterType: Partial<WhereCondition<AnyOrama['schema']>>;
    //@ts-ignore
    private db: AnyOrama;
    private indexName: string | undefined;
    private vectorSize: number | undefined;
    private similarityThreshold: number;
    private storageWorker: any;

    _vectorstoreType(): string {
        return 'OramaStore';
    }

    constructor(
        public embeddings: Embeddings,
        args: OramaVectorStoreArgs = {}
    ) {
        super(embeddings, args);
        this.similarityThreshold = args.similarityThreshold ?? 0;
    }

    async create(indexName: string, vectorSize?: number) {
        this.vectorSize = vectorSize ?? (await this.embeddings.embedQuery('test')).length;
        this.indexName = indexName;
        if (await this.checkStorageExist()) {
            this.db = await this.restore()
        } else {
            log.trace('not find local vectorstore storage, create new');
            this.db = await create({
                schema: {
                    ...vectorStoreSchema,
                    embedding: `vector[${this.vectorSize}]`,
                } as const,
                id: indexName,
            });
        }
        //@ts-ignore
        // this.storageWorker=StorageWorker()
    }

    async checkStorageExist() {
        let pp = await this.getStoragePath()
        return await get(plugin).app.vault.adapter.exists(pp);
    }
    async getStoragePath() {
        let pluginDir = get(plugin).manifest.dir
        let pp = normalizePath(
            pluginDir +
            "/orama/" +
            this.indexName +
            ".bin",
        );
        if (!await get(plugin).app.vault.adapter.exists(pp)) {
            log.trace("file not exists, create dir first:", pp, path.dirname(pp))
            await get(plugin).app.vault.adapter.mkdir(path.dirname(pp))

        }
        return pp
    }
    async persist() {
        let bin: Buffer = await persist(this.db, 'binary') as Buffer
        let output = await this.getStoragePath()
        log.trace(`Persisting to local file;${output}, size:${bin.length}`)
        await get(plugin).app.vault.adapter.writeBinary(output, bin)
    }

    async restore() {
        log.trace('Restoring vectorstore from backup');
        let output = await this.getStoragePath()
        let binary = await get(plugin).app.vault.adapter.readBinary(output)
        const newInstance = await restore('binary', Buffer.from(binary))
        return newInstance
        // vectorStoreBackup is an object and not an array for some reason
        // const docs = Object.keys(vectorStoreBackup.docs).map((key:any) => vectorStoreBackup.docs[key]);
        // await this.create(vectorStoreBackup.indexName, vectorStoreBackup.vectorSize);
        // await insertMultiple(this.db, docs);
        // log.info('Restored vectorstore from backup');
        // log.debug(this.db.data.docs.docs);
    }

    async delete(filters: { ids: string[] }) {
        await removeMultiple(this.db, filters.ids);
    }

    async addVectors(vectors: number[][], documents: Document[]) {
        log.trace("addVectors", documents)
        const docs: VectorDocument[] = documents.map((document, index) => ({
            id: document.metadata.hash,
            source: document.metadata.source,
            content: document.pageContent,
            header: document.metadata.header,
            order: document.metadata.order,
            embedding: vectors[index],
        }));

        const ids = await insertMultiple(this.db, docs);
        return ids;
    }

    async addDocuments(documents: Document[], options: Record<string, any>) {
        log.trace("addDocuments", documents, options)
        let ids: string[] = options['ids']
        if (ids.length != documents.length) {
            log.error("ids.len not equal doc.len,this should not happened")
            return
        }

        for (let i = 0; i < documents.length; i++) {
            documents[i].metadata.hash = ids[i]
        }
        log.trace("addDocuments", documents)
        const results: Results<VectorDocument> = await search(this.db, {
            where: {
                'id': ids,
            },
            limit: ids.length,
        })
        log.trace("addDocuments find Documents in Store:", results)
        // todo:  filter exists doc id first
        const docsFiltered = documents.filter(doc => !results.hits.some(result => result.document.id === doc.metadata.hash))
        log.debug("addDocuments docsFiltered:", docsFiltered)
        await this.addVectors(await this.embeddings.embedDocuments(docsFiltered.map((document) => document.pageContent)), docsFiltered);
    }

    async similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]> {
        log.trace("similaritySearchVectorWithScore", query, k, filter)
        let mode: string = 'vector'
        if (filter)
            mode = 'hybird'

        const results: Results<VectorDocument> = await search(this.db, {
            mode: 'vector',
            vector: { value: query, property: 'embedding' },
            where: filter,
            limit: k,
            similarity: this.similarityThreshold,
        });
        log.debug("similaritySearchVectorWithScore result", results)
        return results.hits.map((result) => {
            return [
                new Document({
                    metadata: { source: result.document.source, order: result.document.order, header: result.document.header },
                    pageContent: result.document.content,
                }),
                result.score,
            ];
        });
    }

    async getDataCount() {
        return await count(this.db)
    }

    async getData(): Promise<VectorStoreBackup> {
        return { indexName: this.indexName!, vectorSize: this.vectorSize!, docs: this.db.data.docs.docs as VectorDocument[] };
    }

    async getDataByIds(ids: string[]) {
        const results: Results<VectorDocument> = await search(this.db, {
            where: {
                'id': ids,
            },
            limit: ids.length,
            includeVectors: true,
        })

        const embeddings = results.hits.map((result) => result.document.embedding)
        const docs = results.hits.map((result) => {
            return new Document({
                metadata: { hash: result.document.id, source: result.document.source, order: result.document.order, header: result.document.header },
                pageContent: result.document.content,
            });
        });

        return { embeddings, docs }

    }

    async renameSource(ids: string[], target: string) {
        // const results: Results<VectorDocument> = await search(this.db, {
        //     term: source,
        //     properties: ['source'],
        //     exact: true,
        //     limit: 1000,
        //     includeVectors:true,
        // })
        let { embeddings, docs } = await this.getDataByIds(ids)
        let newDocs = docs.map((doc) => new Document({
            metadata: { hash: doc.metadata.hash, source: target, order: doc.metadata.order, header: doc.metadata.header },
            pageContent: doc.pageContent,
        }))
        // const results: Results<VectorDocument> = await search(this.db, {
        //     where: {
        //         'id': ids,
        //     },
        //     limit: ids.length,
        //     includeVectors:true,
        // })
        // const ids=results.hits.map((result) => result.document.id)
        // const embeddings = results.hits.map((result) => result.document.embedding)
        // const docs = results.hits.map((result) => {
        //     return new Document({
        //         metadata: { hash: result.document.id, source: target, order: result.document.order, header: result.document.header },
        //         pageContent: result.document.content,
        //     });
        // });
        log.trace("rename:", ids, docs, embeddings)
        if (ids && embeddings && newDocs && newDocs.length > 0) {
            await this.delete({ ids: ids })
            await this.addVectors(embeddings, newDocs)
        }
    }

    setSimilarityThreshold(similarityThreshold: number) {
        this.similarityThreshold = similarityThreshold;
    }
}
