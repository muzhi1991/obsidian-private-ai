import log from 'loglevel';
import {
    MarkdownRenderer, TFolder, TFile, Plugin
} from 'obsidian';
import { plugin } from '../store'
import { get } from 'svelte/store'

export const fragWithHTML = (html: string) =>
    createFragment((frag) => (frag.createDiv().innerHTML = html));


export const renderMarkdown = (node: HTMLElement, content: string) => {
    log.debug("node", node, node.innerHTML)
    function render(text: string) {
        const myPlugin: Plugin = get(plugin);
        node.innerHTML = "";
        MarkdownRenderer.render(myPlugin.app, text, node, "chat.md", myPlugin);
        let pElement = node.querySelector('p');
        if (pElement) {
            // pElement.style.padding = '1px';
            pElement.style.margin = '0em';
            // pElement.style.verticalAlign = 'middle';
            // pElement.style.lineHeight = '1.75em';
            pElement.addClass('text-base')
        }

    }
    render(content)
    return {
        update: (newContent: string) => {
            if (newContent != content) {
                content = newContent
                render(newContent)
            }
        },
        // destroy: () => {}
    }
};
