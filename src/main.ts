import log from 'loglevel';
log.setLevel('TRACE')
import { App, Editor, MarkdownView, Modal, Notice, Plugin, addIcon, normalizePath } from 'obsidian';

import { VIEW_TYPE_CHAT, ChatView } from './views/chat-view'
import { i18n, DB_FILE_NAME } from './config';
import { get } from 'svelte/store'
import { ObjectAssign } from './utils/string-utils';
import { initSQLite3, createDB, closeDB, testDB } from './utils/sqlite-db'
import VectoreStoreSingleton from './llm/vectorstore-manager'

// Remember to rename these classes and interfaces!

// addIcon("my-bot",`<svg t="1716046019105" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8427" width="100" height="100"><path d="M303 324.9c42.4 0 76.4-33.9 76.4-76.4 0-42.4-33.9-76.4-76.4-76.4-42.4 0-76.4 33.9-76.4 76.4 0 42.5 34 76.4 76.4 76.4z m55.2-76.4c0 29.7-25.5 55.2-55.2 55.2-29.7 0-55.2-25.5-55.2-55.2 0-29.7 25.5-55.2 55.2-55.2 29.7 0.1 55.2 23.4 55.2 55.2z m364.9 76.4c42.4 0 76.4-33.9 76.4-76.4 0-42.4-33.9-76.4-76.4-76.4-42.4 0-76.4 33.9-76.4 76.4 0 42.5 34 76.4 76.4 76.4z m0-133.6c29.7 0 55.2 25.5 55.2 55.2 0 29.7-25.5 55.2-55.2 55.2-29.7 0-55.2-25.5-55.2-55.2 0-29.8 25.5-55.2 55.2-55.2z m0 0" fill="#2c2c2c" p-id="8428"></path><path d="M129 959.6h146.4c27.6 0 50.9-17 59.4-42.4h356.5c8.5 25.5 31.8 42.4 59.4 42.4h146.4c33.9 0 63.6-27.6 63.6-63.7V571.3c0-33.9-27.6-63.7-63.6-63.7H750.7c-27.6 0-50.9 17-59.4 42.4H530.6V428.9H721c99.7 0 182.5-82.8 182.5-182.5S820.7 63.9 721 63.9H305.1c-99.7 0-182.5 82.8-182.5 182.5s82.7 182.5 182.5 182.5h189.3v121.2H334.8c-8.5-25.5-31.8-42.4-59.4-42.4H129c-33.9 0-63.6 27.6-63.6 63.7V896c2.1 36 29.7 63.6 63.6 63.6z m210.1-386.2h350.1V898H339.1V573.4z m577.1 178.2v95.5H729.5v-95.5h186.7z m0-21.2H729.5V622.2h186.7v108.2z m-806.3 21.2h186.7v95.5H109.9v-95.5z m186.7-21.2H109.9V622.2h186.7v108.2z m-21.2 186.7H129c-10.6 0-21.2-8.5-21.2-21.2v-29.7h186.7v29.7c2.1 12.7-8.5 21.2-19.1 21.2z m621.7 0H750.7c-10.6 0-21.2-8.5-21.2-21.2v-29.7h186.7v29.7c0 12.7-8.5 21.2-19.1 21.2zM750.7 552.2h146.4c10.6 0 21.2 8.5 21.2 21.2V601H731.6v-27.6c-2.1-12.7 8.5-21.2 19.1-21.2zM305.1 108.5H721c76.4 0 140 63.7 140 140 0 76.4-63.6 140-140 140H305.1c-76.4 0-140-63.6-140-140 0-78.5 63.6-140 140-140zM129 552.2h146.4c10.6 0 21.2 8.5 21.2 21.2V601H109.9v-27.6c0-12.7 8.5-21.2 19.1-21.2z m0 0" fill="#2c2c2c" p-id="8429"></path></svg>`)

import { WorkspaceLeaf, TFile, TAbstractFile } from "obsidian";
import { plugin, needUpdateDB,storageConfig,type StorageConfig } from "./store";
import { SettingTab } from './views/setting-tab';
import { type PrivateAIPluginSettings, DEFAULT_SETTINGS } from './setting'
import { OramaStore } from './utils/orama-vectorstore';

export default class PrivateAIPlugin extends Plugin {
	settings!: PrivateAIPluginSettings;
	sqlite3: any

	async onload() {
		plugin.set(this)
		await this.loadSettings();
		await this.setupDB()
		this.setupLang();

		// ui setup
		this.setupUI();

		await this.registerCustomEvent()
	}



	private setupUI() {
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => new ChatView(leaf)
		);

		const chatIconEl = this.addRibbonIcon('bot', get(i18n).t('chat_view.icon_title'), async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice(get(i18n).t('chat_view.notice_activate_view'));
			this.activateChatView();
		});

		// Perform additional things with the ribbon
		chatIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-private-ai-chat-view',
			name: get(i18n).t('chat_view.command_activate_view'),
			callback: () => {
				new Notice(get(i18n).t('chat_view.notice_activate_view'));
				this.activateChatView();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback(editor, view) {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	},
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}
		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	private setupLang() {
		let lang = this.settings.language;
		if (lang == 'default') {
			lang = window.localStorage.getItem("language") || 'en';
		}
		get(i18n).changeLanguage(lang);
	}

	async onunload() {
		// let v=await VectoreStoreSingleton.getInstance("all")
		// await (v as OramaStore).persist()
		await closeDB()
		log.debug("unload")

	}

	async setupDB() {
		log.debug("init SQLite3")
		await this.storageCheck()
		
		await this.createStorageConfig()
		await initSQLite3()
		await createDB(DB_FILE_NAME)

	}

	async createStorageConfig(){
		let pluginDir = this.manifest.dir
        let pp = normalizePath(
            pluginDir +
            "/storage-config.json" 
        );
		if(!await this.app.vault.adapter.exists(pp)){
			log.info("create Storage Config")
			const date=Date.now()
			const config:StorageConfig = {createTime: date,sqliteDBName:this.app.vault.getName()+"-"+date};
			const output = JSON.stringify(config);
			await this.app.vault.adapter.write(pp, output)
		}else{
			log.info("get Storage Config")
			const content=await this.app.vault.adapter.read(pp)
			// if( !content || content.trim().length === 0){
			// }
			const result:StorageConfig = JSON.parse(content)
			log.info("get Storage Config",result)
			storageConfig.set(result)
		}
	}
	async storageCheck() {
		const opfsRoot = await navigator.storage.getDirectory();
		const file = await opfsRoot.getFileHandle('image.psd', { create: true });
		if (navigator.storage && navigator.storage.persist) {
			navigator.storage.persist().then((persistent) => {
				if (persistent) {
					log.debug("Storage will not be cleared except by explicit user action");
				} else {
					log.debug("Storage may be cleared by the UA under storage pressure.");
				}
			});
		}
		let availableSpace = 0
		if (navigator.storage && navigator.storage.estimate) {
			const storageEstimate = await navigator.storage.estimate();
			if (storageEstimate && storageEstimate.quota && storageEstimate.usage) {
				availableSpace = storageEstimate.quota > storageEstimate.usage ? storageEstimate.quota - storageEstimate.usage : 0;
			}
		}
		log.debug(opfsRoot, `available storage space:${(availableSpace/1024/1024/1024).toFixed(2)} GB`, file)
	}

	async registerCustomEvent() {
		this.registerEvent(
			this.app.metadataCache.on("changed", async (file: TFile) => {
				log.debug("Event: changed")
				await VectoreStoreSingleton.addDocs("all", file.path)
				needUpdateDB.set(true)
			}
			),
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file: TAbstractFile) => {
				log.debug("Event: delete")

				await VectoreStoreSingleton.delDocs("all", file.path)
				needUpdateDB.set(true)
			}


			),
		);
		this.registerEvent(
			this.app.vault.on("rename", async (file: TAbstractFile, oldPath: string) => {
				log.debug("Event: rename")
				await VectoreStoreSingleton.renameDocs("all", oldPath, file.path)
				needUpdateDB.set(true)
			}
			),
		);

		this.registerInterval(window.setInterval(async () => {
			log.debug("Event: Interval", get(needUpdateDB))
			if (get(needUpdateDB) == true) {
				needUpdateDB.set(false)
				log.debug('ready to save db')
				let v = await VectoreStoreSingleton.getVectorStoreInstance("all")
				await (v as OramaStore).persist()
			}
		}, 30 * 1000));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			log.debug('click', evt,evt.target);
			// close mode select menu when click anywhere, excpet mode select button
			if (evt.target && (evt.target as HTMLElement).className.contains('mode-menu-summary')){
				log.debug((evt.target as HTMLElement).className);
				return
			}
			let elements=document.getElementsByClassName("mode-menu-details");
			for (let i = 0; i < elements.length; i++) {
				const modeMenu = elements[i] as HTMLElement;
				modeMenu.removeAttribute("open")
				// log.debug("removeAttribute",modeMenu)
			} 
			// modeMenu.removeAttribute("open")
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	async loadSettings() {
		let data = await this.loadData()
		// this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		this.settings = ObjectAssign({}, DEFAULT_SETTINGS, data)
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
		if (leaf != null) {
			workspace.revealLeaf(leaf);
		}

	}

}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }
