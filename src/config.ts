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


i18next.init({
fallbackLng: 'en',
resources: {
        zh: {
            translation: zh
        },
        en: {
            translation: en
        }
    },
  interpolation: {
    escapeValue: false, // not needed for svelte as it escapes by default
  }
});

// i18next.addResourceBundle('en', 'namespace1', {
//     key: 'hello from namespace 1'
//   });

const i18n = createI18nStore(i18next);

export default i18n;