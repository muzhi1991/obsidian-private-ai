import log from 'loglevel';
import { App, Notice, PluginSettingTab, Setting, ToggleComponent, Modal } from 'obsidian';
import { plugin } from "../store";
import { get } from 'svelte/store';
import PrivateAIPlugin from '../main';
import { ChatMode, LLMServer, EmbeddingServer, SUPPORT_MODELS, EMBEDDING_SUPPORT_MODELS } from '../setting';
import { i18n, getChatModeRecords } from '../config';
import { fragWithHTML } from '../utils/obsidian-ui-utils'

// 	animation: shake .1s linear;
// animation-iteration-count: 3;
// border:  1px solid red;/position: relative;outline: none;
var styles = `
.errorinput {
	

	
	border-color: red;
	
  }
  
@keyframes shake {
	0% {
	  left: -5px;
	}
	100% {
	  right: -5px;
	}
  }
`

export class SettingTab extends PluginSettingTab {
	plugin: PrivateAIPlugin;

	constructor(app: App, plugin: PrivateAIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	addCommonOpenAISetting(containerEl: HTMLElement) {
		log.debug("add common open ai setting")
		let s1 = new Setting(containerEl)
			.setName(fragWithHTML(get(i18n).t("settings.openai.api_key")))
			.setDesc(fragWithHTML(get(i18n).t("settings.openai.api_key_desc")))
			.addText(text => text
				.setPlaceholder('OPENAI_API_KEY')
				.setValue(this.plugin.settings.openaiConfig.apiKey || '')
				.onChange(async (value) => {
					this.plugin.settings.openaiConfig.apiKey = value;
					await this.plugin.saveSettings();
					plugin.set(this.plugin); // 触发store同步
					this.showEmptyInputError(text.inputEl)
				}));
		let apiKey = this.plugin.settings.openaiConfig.apiKey
		if (!apiKey) {
			// containerEl.inputEl.addClass('error');
			let inputEl = s1.controlEl.getElementsByTagName("input")[0]
			this.showEmptyInputError(inputEl)
		}


		let s2 = new Setting(containerEl)
			.setName(fragWithHTML(get(i18n).t("settings.openai.base_url")))
			.setDesc(fragWithHTML(get(i18n).t("settings.openai.base_url_desc")))
			.addText(text => text
				.setPlaceholder('API BASE URL')
				.setValue(this.plugin.settings.openaiConfig.baseUrl || 'https://api.openai.com/v1')
				.onChange(async (value) => {
					this.plugin.settings.openaiConfig.baseUrl = value;
					await this.plugin.saveSettings();
					plugin.set(this.plugin); // 触发store同步
					this.showEmptyInputError(text.inputEl)
				}));
		let baseUrl = this.plugin.settings.openaiConfig.baseUrl
		if (!baseUrl) {
			// containerEl.inputEl.addClass('error');
			let inputEl = s2.controlEl.getElementsByTagName("input")[0]
			this.showEmptyInputError(inputEl)
		}
	}

	addCommonOllamaSetting(containerEl: HTMLElement) {
		let s1 = new Setting(containerEl)
			.setName(fragWithHTML(get(i18n).t("settings.ollama.base_url")))
			.setDesc(fragWithHTML(get(i18n).t("settings.ollama.base_url_desc")))
			.addText(text => text
				.setPlaceholder('API BASE URL')
				.setValue(this.plugin.settings.ollamaConfig.baseUrl || 'http://localhost:11434')
				.onChange(async (value) => {
					this.plugin.settings.ollamaConfig.baseUrl = value;
					await this.plugin.saveSettings();
					plugin.set(this.plugin); // 触发store同步
					this.showEmptyInputError(text.inputEl)
				}));
		let baseUrl = this.plugin.settings.ollamaConfig.baseUrl
		if (!baseUrl) {
			// containerEl.inputEl.addClass('error');
			let inputEl = s1.controlEl.getElementsByTagName("input")[0]
			this.showEmptyInputError(inputEl)
		}
	}

	addStyle(containerEl: HTMLElement) {
		var styleSheet = document.createElement("style")
		styleSheet.innerText = styles
		containerEl.appendChild(styleSheet)

	}

	showEmptyInputError(inputEl: HTMLInputElement) {
		if (!inputEl.value) {
			// text.inputEl.addClass('error');
			inputEl.style.border = '2px solid';
			inputEl.style.borderColor = 'red';
		} else {
			inputEl.style.border = ''
			inputEl.style.borderColor = ''
		}

	}

	display(): void {
		const { containerEl } = this;


		containerEl.empty();
		// this.addStyle(containerEl);

		new Setting(containerEl).setName(get(i18n).t("settings.basic.head")).setHeading();
		new Setting(containerEl).setName(get(i18n).t("settings.language.lang"))
			.setDesc(get(i18n).t("settings.language.desc")).addDropdown(dropdown => {
				// fixme need to reboot to change 
				const records: Record<string, string> = {
					"default": get(i18n).t("settings.language.default"),
					"en": get(i18n).t("settings.language.en"),
					"zh": get(i18n).t("settings.language.zh"),
					"zh-TW": get(i18n).t("settings.language.zh-TW"),
					"de": get(i18n).t("settings.language.de"),

				};
				dropdown.addOptions(records)
					.setValue(this.plugin.settings.language in records ? this.plugin.settings.language : "en").onChange(async value => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						plugin.set(this.plugin);
						let lang = value
						if (lang == 'default') {
							lang = window.localStorage.getItem("language") || 'en'
						}
						new Notice(`${get(i18n).language} => ${lang}`)
						if (get(i18n).language != lang) {
							get(i18n).changeLanguage(lang)
							this.display() // refresh setting tabs
						}
					})
			});

		new Setting(containerEl).setName(get(i18n).t("settings.mode.title"))
			.setDesc(get(i18n).t("settings.mode.desc")).addDropdown(dropdown => {
				// fixme need to reboot to change 
				dropdown.addOptions(getChatModeRecords())
					.setValue(this.plugin.settings.chatMode in getChatModeRecords() ? this.plugin.settings.chatMode : "naive_chat").onChange(async value => {
						this.plugin.settings.chatMode = value as ChatMode;
						await this.plugin.saveSettings();
						plugin.set(this.plugin);
						new Notice(`${get(i18n).t("settings.mode.title")} : ${getChatModeRecords()[value as ChatMode]}`)
					})
			});

		new Setting(containerEl).setName(get(i18n).t("settings.llm_server.head")).setHeading();

		new Setting(containerEl).setName(get(i18n).t("settings.llm_server.title"))
			.setDesc(get(i18n).t("settings.llm_server.desc")).addDropdown(dropdown => {
				// fixme need to reboot to change 
				const records: Record<LLMServer, string> = {
					"openai": get(i18n).t("settings.llm_server.openai"),
					"ollama": get(i18n).t("settings.llm_server.ollama"),
				};
				dropdown.addOptions(records)
					.setValue(this.plugin.settings.llmServer in records ? this.plugin.settings.llmServer : "openai").onChange(async value => {
						if (this.plugin.settings.llmServer != value) {
							this.plugin.settings.llmServer = value as LLMServer;
							await this.plugin.saveSettings();
							plugin.set(this.plugin);
							new Notice(`${get(i18n).t("settings.llm_server.title")} : ${records[value as LLMServer]}`)
							this.display();
						}
					})
			});

		let llmServer = this.plugin.settings.llmServer;
		if (llmServer == LLMServer.OpenAI) {
			this.addCommonOpenAISetting(containerEl)

			let s = new Setting(containerEl)
				.setName(fragWithHTML(get(i18n).t("settings.openai.model")))
				.setDesc(fragWithHTML(get(i18n).t("settings.openai.model_desc")))
				.addText(text => {
					text
						.setPlaceholder('MODEL NAME')
						.setValue(this.plugin.settings.openaiConfig.model ?? '')
						.onChange(async (value) => {
							this.plugin.settings.openaiConfig.model = value;
							if (value in SUPPORT_MODELS) {
								this.plugin.settings.openaiConfig.modelParam = SUPPORT_MODELS[value]
							}
							await this.plugin.saveSettings();
							this.showEmptyInputError(text.inputEl)

						})
					// 失去焦点，检测值的正确性
					text.inputEl.onblur = () => {
						let model = this.plugin.settings.openaiConfig.model ?? ""
						if (!(model in SUPPORT_MODELS)) {
							new ModelCheckModal(this.app, Object.keys(SUPPORT_MODELS)).open();
						}
					}
				});
			log.debug("model:", this.plugin.settings.openaiConfig.model)

			let model = this.plugin.settings.openaiConfig.model
			if (!model) {
				// containerEl.inputEl.addClass('error');
				let inputEl = s.controlEl.getElementsByTagName("input")[0]
				this.showEmptyInputError(inputEl)
			}
		}

		if (llmServer == LLMServer.Ollama) {

			this.addCommonOllamaSetting(containerEl)

			let s = new Setting(containerEl)
				.setName(fragWithHTML(get(i18n).t("settings.ollama.model")))
				.setDesc(fragWithHTML(get(i18n).t("settings.ollama.model_desc")))
				.addText(text => {
					text
						.setPlaceholder('MODEL NAME')
						.setValue(this.plugin.settings.ollamaConfig.model ?? '')
						.onChange(async (value) => {
							this.plugin.settings.ollamaConfig.model = value;
							await this.plugin.saveSettings();
							this.showEmptyInputError(text.inputEl)
						})
					// 失去焦点，检测值的正确性
					// text.inputEl.onblur = () => {
					// 	let model = this.plugin.settings.ollamaConfig.model ?? ""
					// 	if (!SUPPORT_MODELS.includes(model)) {
					// 		new ExampleModal(this.app).open();
					// 	}
					// }
				});
			log.debug("model:", this.plugin.settings.ollamaConfig.model)
			let model = this.plugin.settings.ollamaConfig.model
			if (!model) {
				// containerEl.inputEl.addClass('error');
				let inputEl = s.controlEl.getElementsByTagName("input")[0]
				this.showEmptyInputError(inputEl)
			}
		}

		new Setting(containerEl).setName(get(i18n).t("settings.embedding_server.head")).setHeading();
		new Setting(containerEl).setName(get(i18n).t("settings.embedding_server.title"))
			.setDesc(get(i18n).t("settings.embedding_server.desc")).addDropdown(dropdown => {
				// fixme need to reboot to change 
				const records: Record<EmbeddingServer, string> = {
					"openai": get(i18n).t("settings.embedding_server.openai"),
					"ollama": get(i18n).t("settings.embedding_server.ollama"),
				};
				dropdown.addOptions(records)
					.setValue(this.plugin.settings.embeddingServer in records ? this.plugin.settings.embeddingServer : "openai").onChange(async value => {
						if (this.plugin.settings.embeddingServer != value) {
							this.plugin.settings.embeddingServer = value as EmbeddingServer;
							await this.plugin.saveSettings();
							plugin.set(this.plugin);
							new Notice(`${get(i18n).t("settings.embedding_server.title")} : ${records[value as EmbeddingServer]}`)
							this.display();
						}
					})
			});

		let embeddingServer = this.plugin.settings.embeddingServer;
		if (embeddingServer == EmbeddingServer.OpenAI) {
			if (llmServer != LLMServer.OpenAI) {
				this.addCommonOpenAISetting(containerEl)
			}

			let s = new Setting(containerEl)
				.setName(fragWithHTML(get(i18n).t("settings.openai.embedding_model")))
				.setDesc(fragWithHTML(get(i18n).t("settings.openai.embedding_model_desc")))
				.addText(text => {
					text
						.setPlaceholder('MODEL NAME')
						.setValue(this.plugin.settings.openaiConfig.embeddingModel ?? '')
						.onChange(async (value) => {
							this.plugin.settings.openaiConfig.embeddingModel = value;
							if (value in EMBEDDING_SUPPORT_MODELS) {
								this.plugin.settings.openaiConfig.embeddingModelParam = EMBEDDING_SUPPORT_MODELS[value]
							}
							await this.plugin.saveSettings();
							this.showEmptyInputError(text.inputEl)

						})
					// 失去焦点，检测值的正确性
					text.inputEl.onblur = () => {
						let model = this.plugin.settings.openaiConfig.embeddingModel ?? ""
						if (!(model in EMBEDDING_SUPPORT_MODELS)) {
							new ModelCheckModal(this.app, Object.keys(EMBEDDING_SUPPORT_MODELS)).open();
						}
					}
				});

			let embedding_model = this.plugin.settings.openaiConfig.embeddingModel
			if (!embedding_model) {
				// containerEl.inputEl.addClass('error');
				let inputEl = s.controlEl.getElementsByTagName("input")[0]
				this.showEmptyInputError(inputEl)
			}

		}

		if (embeddingServer == EmbeddingServer.Ollama) {
			if (llmServer != LLMServer.Ollama) {
				this.addCommonOllamaSetting(containerEl)
			}
			let s = new Setting(containerEl)
				.setName(fragWithHTML(get(i18n).t("settings.ollama.embedding_model")))
				.setDesc(fragWithHTML(get(i18n).t("settings.ollama.embedding_model_desc")))
				.addText(text => {
					text
						.setPlaceholder('MODEL NAME')
						.setValue(this.plugin.settings.ollamaConfig.embeddingModel ?? '')
						.onChange(async (value) => {
							this.plugin.settings.ollamaConfig.embeddingModel = value;
							await this.plugin.saveSettings();
							log.debug("onChange", text.inputEl.value)
							this.showEmptyInputError(text.inputEl)
						})
					// 失去焦点，检测值的正确性
					// text.inputEl.onblur = () => {
					// 	let embedding_model = this.plugin.settings.ollamaConfig.embedding_model
					// }
				});
			log.debug(s.controlEl.getElementsByTagName("input"), s.controlEl.childNodes)
			let embedding_model = this.plugin.settings.ollamaConfig.embeddingModel
			if (!embedding_model) {
				// containerEl.inputEl.addClass('error');
				let inputEl = s.controlEl.getElementsByTagName("input")[0]
				this.showEmptyInputError(inputEl)
			}
		}

	}

}


export class ModelCheckModal extends Modal {
	supported_models: Array<string>;
	constructor(app: App, supported_models: Array<string>) {
		super(app);
		this.supported_models = supported_models
	}

	onOpen() {
		let { contentEl } = this;

		contentEl.setText(fragWithHTML(get(i18n).t("settings.openai.model_tip", { models: this.supported_models.join() })));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(get(i18n).t("settings.openai.model_tip_ok"))
					.setCta()
					.onClick(() => {
						this.close();
					}));
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}