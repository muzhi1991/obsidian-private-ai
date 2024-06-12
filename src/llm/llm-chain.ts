import log from 'loglevel';
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { LLMServer, type OllamaConfig, type OpenAIConfig } from '../setting';
import { deepEqual } from "../utils/string-utils"
import { plugin } from "../store";
import { get } from 'svelte/store'

log.debug("LANGCHAIN_VERBOSE:", process.env.LANGCHAIN_VERBOSE)
const VERBOSE = process.env.LANGCHAIN_VERBOSE == 'true'

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
      log.debug("new llm instance")
      this.instance = chatStreamModel!;
    }
    log.debug("get llm instance")
    return this.instance!;

  }
}
export default LLMSingleton