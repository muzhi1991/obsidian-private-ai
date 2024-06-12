import { ItemView, WorkspaceLeaf, addIcon, setIcon } from "obsidian";
import Component from "../components/chat.svelte";

export const VIEW_TYPE_CHAT = "ai-chat-view";
export class ChatView extends ItemView {
	component!: Component;


	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText() {
		return "Chat View";
	}

	async onOpen() {
		// store.plugin.set(this.plugin);
		this.component = new Component({
			target: this.contentEl,
			props: {
				// variable: 1
			}
		});
		this.icon = "messages-square"
	}
}
