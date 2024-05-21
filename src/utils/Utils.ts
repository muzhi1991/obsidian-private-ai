
import {
  MarkdownRenderer
} from 'obsidian';
import { plugin } from '../store'
import { get } from 'svelte/store'
import type MyPlugin from 'src/main';

export const fragWithHTML = (html: string) =>
  createFragment((frag) => (frag.createDiv().innerHTML = html));


export const renderMarkdown = (node: HTMLElement, content: string) => {
  console.debug("node",node,node.innerHTML)
  // node.addEventListener('DOMCharacterDataModified', function() {
  //   console.log('span text changed to: ' + node.innerHTML);
  // }); 
  function render(text:string) {
    const myPlugin: MyPlugin = get(plugin);
    node.innerHTML = "";
    MarkdownRenderer.render(myPlugin.app, text, node, "chat.md", myPlugin);
    let pElement = node.querySelector('p');
    if (pElement) {
      // pElement.style.padding = '1px';
      pElement.style.margin = '0em';
    }

  }
  render(content)
  // const codeElem = node.querySelector(".copy-code-button");
  // if (codeElem) {
  //   codeElem.className = "clickable-icon";
  //   icon(codeElem as HTMLElement, "copy");
  // }
  return {
    update: (newContent: string) => {
      console.log("use update",newContent,content)
      if (newContent!=content)
      content=newContent
        render(newContent)
    },
    // destroy: () => {}
  }
};



export const renderCommentTextMarkdown = (node: HTMLElement, comment: { text: string; }) => {
  let content=comment.text
  const myPlugin: MyPlugin = get(plugin);
  node.innerHTML = "";
  MarkdownRenderer.render(myPlugin.app, content, node, "chat.md", myPlugin);
  let pElement = node.querySelector('p');
  if (pElement) {
    // pElement.style.padding = '1px';
    pElement.style.margin = '0em';
  }

};

export function Object_assign(target: any, ...sources: Array<any>) {
  sources.forEach(source => {
    Object.keys(source).forEach(key => {
      const s_val = source[key]
      const t_val = target[key]
      target[key] = t_val && s_val && typeof t_val === 'object' && typeof s_val === 'object'
        ? Object_assign(t_val, s_val)
        : s_val
    })
  })
  return target
}

export function deepEqual(obj1: any, obj2: any, exclude: string[] = []): boolean {
  if (obj1 === obj2) {
    return true; // If both variables reference the same object
  }
  if (
    typeof obj1 !== 'object' || obj1 === null ||
    typeof obj2 !== 'object' || obj2 === null
  ) {
    return false; // If one of them is not an object or is null
  }
  const keys1 = Object.keys(obj1).filter(key => !exclude.includes(key));;
  const keys2 = Object.keys(obj2).filter(key => !exclude.includes(key));;

  if (keys1.length !== keys2.length) {
    return false; // If they don't have the same number of keys
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false; // If the key is only in `obj1` but not in `obj2`
    }

    // Recursively compare the value for each key
    if (!deepEqual(obj1[key], obj2[key],exclude)) {
      return false;
    }
  }

  return true;
}