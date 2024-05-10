import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';

import { VIEW_TYPE_EXAMPLE, ExampleView } from './views/ExampleView'
import { VIEW_TYPE_CHAT, ChatView } from './views/ChatView'
import i18n  from './config';
import { get } from 'svelte/store';
// Remember to rename these classes and interfaces!

interface OpenAIConfig {
	base_url:string
	model:string
}

interface OllamaConfig {
	base_url:string
	model:string
}
interface MyPluginSettings {
	mySetting: string
	language:string
	llm_server:string
	openai_config:Partial<OpenAIConfig>
	ollama_config:Partial<OllamaConfig>
	test: string
}

const DEFAULT_SETTINGS: Partial<MyPluginSettings>  = {
	mySetting: 'default',
	language: 'default',
	llm_server: 'openai',
	openai_config: {
		base_url: "https://api.openai.com/v1",
	},
	ollama_config: {
		base_url:"http://localhost:11434"
	},

}


import { WorkspaceLeaf } from "obsidian";

import { plugin } from "./store";
import { SettingTab } from './views/SettingTab';



export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload() {
		plugin.set(this)
		await this.loadSettings();
		let lang= this.settings.language
		if (lang=='default'){
			lang=window.localStorage.getItem("language") || 'en'
		}
		get(i18n).changeLanguage(lang)
		new Notice(`load plugin: ${JSON.stringify(this.settings)}`)
		

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		);
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf)
		);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('activate custom view');
			this.activateView();
		});

		const chatIconEl = this.addRibbonIcon('bot',get(i18n).t('chat_view.icon_title') , (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('activate chat view');
			this.activateChatView();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');
		chatIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback(editor, view) {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			},

		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			console.log("not open")
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf != null){
			workspace.revealLeaf(leaf);
		}
			
	}

	async activateChatView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_CHAT, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf != null){
			workspace.revealLeaf(leaf);
		}
			
	}

}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
