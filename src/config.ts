import i18next from "i18next";
import { createI18nStore } from "svelte-i18next";

// import resourcesToBackend from 'i18next-resources-to-backend';
// i18next
//     .use(resourcesToBackend((language: string, namespace: string) => import(`./locales/${language}/${namespace}.json`)))
//     //   .on('failedLoading', (lng, ns, msg) => console.error(msg))
//     .init({
//         lng: 'en',
//         interpolation: {
//             escapeValue: false, // not needed for svelte as it escapes by default
//         }
// })
import zh from "./locales/zh/translation.json"
import en from "./locales/en/translation.json"
import zh_TW from "./locales/zh-TW/translation.json"
import de from "./locales/de/translation.json"


i18next.init({
  fallbackLng: 'en',
  resources: {
    zh: {
      translation: zh
    },
    en: {
      translation: en
    },
    'zh-TW': {
      translation: zh_TW
    },
    de: {
      translation: de
    }
  },
  interpolation: {
    escapeValue: false, // not needed for svelte as it escapes by default
  }
});


export const i18n = createI18nStore(i18next);

import { ChatMode } from './setting';
import { get } from 'svelte/store';
import { writable } from "svelte/store";


export function getChatModeRecords() {
  const chatModeRecords: Record<ChatMode, string> = {
    "naive_chat": get(i18n).t("settings.mode.naive_chat"),
    "note_qa": get(i18n).t("settings.mode.note_qa"),
    "vault_qa": get(i18n).t("settings.mode.vault_qa"),
  };
  return chatModeRecords
}

export const DB_FILE_NAME = "/private_ai_db"

export default i18n;