import log from 'loglevel';

import type { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

import { EmbeddingServer, type OllamaConfig, type OpenAIConfig } from '../setting';
import { deepEqual } from "../utils/string-utils"
import { plugin } from "../store";
import { get } from 'svelte/store'

const VERBOSE = process.env.LANGCHAIN_VERBOSE == 'true'

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
            log.debug("new embedding instance")
            this.instance = embeddings!;
        }
        log.debug("get embedding instance")
        return this.instance!;
    }
}

export default EmbeddingSingleton