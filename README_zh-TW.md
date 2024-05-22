# Obsidian PrivateAI 插件

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/muzhi1991/obsidian-private-ai)
![GitHub License](https://img.shields.io/github/license/muzhi1991/obsidian-private-ai)

Obsidian PrivateAI 插件 (PrivateAI) 是一個創新的 Obsidian 插件，致力於通過先進的 AI 技術實現與本地筆記的互動。該插件旨在提升知識管理與利用效率，幫助用戶提煉總結，並生成思維火花。PrivateAI 支持多種語言，包括簡體中文、繁體中文、英語和德語，非常適合中文友好的 Obsidian 用戶使用。

## 功能介紹

* **知識庫問答**: 在 Obsidian 中實現前沿的 RAG 應用，快速從您的知識庫中獲取答案。
* **思維總結與構建**: 借助最新的大語言模型，幫您提煉與總結知識，生成新思維。
* **Local First**: 支持 Ollama 本地方案，包括 LLM 和 Embedding 模型，確保數據隱私與快速響應。
* **OpenAI 接口支持**: 對於無法本地部署的用戶，本插件提供對 OpenAI 接口的支持，且支持自定義配置。
* **i18n 適配**: 支持多語言，目前支持英語、簡體中文、繁體中文和德語。

本插件提供三種對話模式：

* **NativeQA**: 與模型直接對話，適用於一般性問題回答。
* **NoteQA**: 使用當前打開的筆記作為上下文與模型對話，幫助深入理解和拓展筆記內容。
* **VaultQA**: （即將推出）跨越 Vault 中所有筆記對話，進行智能總結和知識提取。

## 界面預覽

![App Screenshot](./screenshots/main.png)

## 安裝與配置

### 環境要求

- Obsidian 1.5.x
- Ollama 本地方案（可選）
- OpenAI API 密鑰（可選）

### 安裝步驟

1. **下載與安裝插件**（尚未發布，需要按照下面的方式手動安裝）

   在 Obsidian 插件市場中搜索 “PrivateAI” 並點擊安裝。或者克隆此倉庫並將其內容複製到 Obsidian 插件目錄。

2. **配置插件**

   在 Obsidian 中進入設置頁面，找到 “PrivateAI” 插件，根據您的需求配置本地方案或 OpenAI 接口。

   - **本地方案 (Local First)**: 需要先下載並配置 Ollama 模型，參考 [Ollama 官方](https://ollama.com/)。
     - 配置 Ollama 的接口（默認: localhost:11434）
     - 指定 LLM 模型名稱（必填）
     - 配置 Embedding 模型名稱（必填）
     - 確保 Ollama 服務配置支持環境變量 `OLLAMA_ORIGINS=app://obsidian.md*`（必須）
   - **OpenAI 接口**:
     - 輸入您的 OpenAI API 密鑰（必填）
     - 配置使用的 LLM 模型（默認: `gpt-3.5-turbo`，推薦 `gpt-4o`）
     - 配置使用的 Embedding 模型（默認: `text-embedding-3-small`）

> 上述配置可自由組合，例如：
> * 使用 OpenAI 的 LLM 模型，同時使用 Ollama 的 Embedding 模型。
> * 使用 Ollama 的 LLM 模型，同時使用 OpenAI 的 Embedding 模型。

### 手動安裝

* 進入您的 Obsidian Vault目錄下的 `.obsidian/plugins` 目錄，您的Vault目錄請在『界面的左下角->打開其他倉庫』裡查看 <img style="float: right;" src="https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/icons/obsidian-icon-vault-switcher.svg">
* 克隆項目到 plugins 目錄下

```bash
  cd ${Vault_Dir}/.obsidian/plugins
  git clone https://github.com/muzhi1991/obsidian-private-ai.git
```

## FAQ

#### 如何實現 Local First

此插件使用 Ollama 來支持 LLM 和 Embedding 模型的本地部署。對於重視數據安全的用戶，建議在系統上安裝 [Ollama](https://ollama.com/) 來實現本地化部署。安裝完成後，請下載適配您的機器配置的模型（建議選擇 7B/14B 模型以平衡性能和速度）。

如果服務請求失敗，請檢查：
* Ollama URL 配置是否正確
* Ollama 服務是否啟動成功以及端口是否可訪問，可以使用 `telnet localhost 11434` 測試
* 啟動 Ollama 服務時是否設置環境變量 `OLLAMA_ORIGINS=app://obsidian.md*` 或 `OLLAMA_ORIGINS=*`（此配置非常重要，因為 Ollama Server 檢測 CORS）

#### 關於 OpenAI 配置問題

> !! 注意:
> * 使用 OpenAI 時數據會發送到 OpenAI 服務器，請謹慎操作。
> * 使用 OpenAI 服務會產生 [費用](https://openai.com/api/pricing)。

如果您的本地機器性能不夠，推薦使用 OpenAI 的 GPT-4 系列模型，特別是 GPT-4o，以獲得最佳性能。您需要配置 [從官網獲取的 API KEY](https://platform.openai.com/account/api-keys)。

## 貢獻與反饋

歡迎對本項目貢獻或提出意見！

- **提交 Issue**: 如果使用過程中遇到問題或有改進建議，請提交 Issue。
- **Pull Requests**: 如果您希望與我們一起完善功能，歡迎提交 Pull Requests。
- **反饋與聯繫**: 感謝您的寶貴反饋，請通過 GitHub 聯繫我們。

## Roadmap

- 增加知識庫模型支持
- 支持向量數據庫
- Chat 記錄的 Workspace 管理功能
- 內置簡易 Embedding 模型，方便直接索引

## License

本項目採用 Apache 2.0 許可證，詳情請參閱 [LICENSE](./LICENSE) 文件。