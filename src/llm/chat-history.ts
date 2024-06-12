
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

interface ChatData {
    mtime: number
    chatHistory: ChatMessageHistory,
}
class ChatHistoryManager {
    private static instance: Map<string, ChatData> = new Map();

    private constructor() { }

    public static getInstance(tag: string) {
        if(!this.instance.has(tag)){
            let messageHistory = new ChatMessageHistory();
            const timestamp = Date.now();
            this.instance.set(tag,{mtime: timestamp,chatHistory:messageHistory})
        }
        return this.instance.get(tag)?.chatHistory!
    }

}
export default ChatHistoryManager