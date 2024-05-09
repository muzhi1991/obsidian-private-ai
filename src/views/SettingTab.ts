import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { plugin } from "../store";
import { get } from 'svelte/store';
import MyPlugin from '../main';
import i18n from '../config';

export class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
					plugin.set(this.plugin); // 触发store同步
				}));

		new Setting(containerEl).setName(get(i18n).t("language.lang"))
			.setDesc(get(i18n).t("language.desc")).addDropdown(dropdown => {
				// fixme need to reboot to change 
				const records: Record<string, string> = {
					"default": get(i18n).t("settings.language.default"),
					"en": get(i18n).t("settings.language.en"),
					"zh": get(i18n).t("settings.language.zh"),

				};
				dropdown.addOptions(records)
				.setValue(this.plugin.settings.language in records?this.plugin.settings.language:"en").onChange(async value=>{
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
					plugin.set(this.plugin); 
					let lang=value
					if (lang=='default'){
						lang=window.localStorage.getItem("language") || 'en'
					}
					new Notice(`${get(i18n).language} => ${lang}`)
					if (get(i18n).language!=lang){
						get(i18n).changeLanguage(lang)
						this.display() // refresh setting tabs
					}
					

				})
				

			});
	}
}
