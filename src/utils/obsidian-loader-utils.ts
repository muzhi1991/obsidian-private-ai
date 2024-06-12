import log from 'loglevel';
import { TFile, TFolder, TAbstractFile, normalizePath } from "obsidian";
import { plugin } from "../store";
import { get } from 'svelte/store'
import { Document } from "langchain/document";

interface ObsidianFileStat {

}

async function loadFile(file: TFile) {
  log.debug("load file:", file.name)
  let documents: Document[] = await get(plugin).app.vault.cachedRead(file)
    .then((text: string) => {
      // log.debug(text);
      const metadata = { source: file.path };
      return [new Document({ pageContent: text, metadata })];
    });
  return documents;
}

async function loadFiles(files: TFile[]) {
  let documents: Document[] = [];
  let mtime = 0
  for (const file of files) {
    let docs = await loadFile(file);
    documents.push(...docs);
    if (file.stat.mtime > mtime)
      mtime = file.stat.mtime
  }
  return documents;
}

function iterAllMdFiles(folder: TFolder) {
  let mdFiles: TFile[] = []
  for (const f of folder.children) {
    if (f instanceof TFolder) {
      let files = iterAllMdFiles(f);
      mdFiles.push(...files)
    } else if (f instanceof TFile) {
      if (f.extension == 'md') {
        mdFiles.push(f)
      }
    }
  }
  return mdFiles
}


export async function loadDocumentsFromPath(path: string) {
  path = normalizePath(path)
  let mdFiles: TFile[] = [];

  let file = await get(plugin).app.vault.getFileByPath(path)
  if (file && file.extension == 'md') {
    log.debug("load file:", file.name)
    mdFiles.push(file)
  }
  let folder = await get(plugin).app.vault.getFolderByPath(path)
  if (folder) {
    let files = iterAllMdFiles(folder)
    if (files) {
      mdFiles.push(...files)
    }
  }
  return await loadFiles(mdFiles)
}

export async function loadFileStatFromPath(path: string) {
  let file = await get(plugin).app.vault.getFileByPath(path)
  if (file) {
    return file.stat
  }
  return null
}


export async function loadAllDocumentsFromVault() {
  let app = get(plugin).app
  let files = await app.vault.getMarkdownFiles();
  return await loadFiles(files)
}


export async function loadLatestTimeFromVault() {
  let app = get(plugin).app
  let files = await app.vault.getMarkdownFiles();
  let mtime = 0
  for (const file of files) {
    if (file.stat.mtime > mtime)
      mtime = file.stat.mtime
  }
  return mtime
}
