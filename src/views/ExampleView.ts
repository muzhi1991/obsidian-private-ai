import { ItemView, WorkspaceLeaf } from "obsidian";
import Component from "../components/Component.svelte";

export const VIEW_TYPE_EXAMPLE = "example-view";
export class ExampleView extends ItemView {
	component!: Component;


	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		// store.plugin.set(this.plugin);
		this.component = new Component({
			target: this.contentEl,
			props: {
				variable: 1
			}
		});
	}
}
