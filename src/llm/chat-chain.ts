import log from 'loglevel';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { type Runnable, RunnableWithMessageHistory } from "@langchain/core/runnables";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { i18n } from "../config";
import { plugin } from "../store";
import { get } from 'svelte/store'
import LLMSingleton from './llm-chain'
import ChatHistoryManager from "./chat-history"


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
      let messageHistory = ChatHistoryManager.getInstance("default")
      const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId: string) => messageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
        outputMessagesKey: "content",
      });
      const outputParser = new StringOutputParser();
      this.instance = chainWithHistory.pipe(outputParser)
      log.debug("new ChatChain")
    }
    log.debug("get ChatChain")
    return this.instance!;
  }
}
export default ChatChainSingleton