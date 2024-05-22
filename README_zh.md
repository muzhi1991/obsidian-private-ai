# Obsidian PrivateAI Plugin

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/muzhi1991/obsidian-private-ai)
![GitHub License](https://img.shields.io/github/license/muzhi1991/obsidian-private-ai)

Obsidian PrivateAI Plugin (PrivateAI) 是一个创新的 Obsidian 插件，致力于通过先进的 AI 技术实现与本地笔记的互动。该插件旨在提升知识管理与利用效率，帮助用户提炼总结，并生成思维火花。PrivateAI 支持多种语言，包括简体中文、繁体中文、英语和德语，非常适合中文友好的 Obsidian 用户使用。

## 功能介绍

* **知识库问答**: 在 Obsidian 中实现前沿的 RAG 应用，快速从您的知识库中获取答案。
* **思维总结与构建**: 借助最新的大语言模型，帮您提炼与总结知识，生成新思维。
* **Local First**: 支持 Ollama 本地方案，包括 LLM 和 Embedding 模型，确保数据隐私与快速响应。
* **OpenAI 接口支持**: 对于无法本地部署的用户，本插件提供对 OpenAI 接口的支持，且支持自定义配置。
* **i18n 适配**: 支持多语言，目前支持英语、简体中文、繁体中文和德语。

本插件提供三种对话模式：

* **NativeQA**: 与模型直接对话，适用于一般性问题回答。
* **NoteQA**: 使用当前打开的笔记作为上下文与模型对话，帮助深入理解和拓展笔记内容。
* **VaultQA**: （即将推出）跨越 Vault 中所有笔记对话，进行智能总结和知识提取。

## 界面预览

![App Screenshot](./screenshots/main.png)

## 安装与配置

### 环境要求

- Obsidian
- Ollama 本地方案（可选）
- OpenAI API 密钥（可选）

### 安装步骤

1. **下载与安装插件**（尚未发布，需要按照下面的方式手动安装）

   在 Obsidian 插件市场中搜索 “PrivateAI” 并点击安装。或者克隆此仓库并将其内容复制到 Obsidian 插件目录。

2. **配置插件**

   在 Obsidian 中进入设置页面，找到 “PrivateAI” 插件，根据您的需求配置本地方案或 OpenAI 接口。

   - **本地方案 (Local First)**: 需要先下载并配置 Ollama 模型，参考 [Ollama 官方](https://ollama.com/)。
     - 配置 Ollama 的接口（默认: localhost:11434）
     - 指定 LLM 模型名称（必填）
     - 配置 Embedding 模型名称（必填）
     - 确保 Ollama 服务配置支持环境变量 `OLLAMA_ORIGINS=app://obsidian.md*`（必须）
   - **OpenAI 接口**:
     - 输入您的 OpenAI API 密钥（必填）
     - 配置使用的 LLM 模型（默认: `gpt-3.5-turbo`，推荐 `gpt-4o`）
     - 配置使用的 Embedding 模型（默认: `text-embedding-3-small`）

> 上述配置可自由组合，例如：
> * 使用 OpenAI 的 LLM 模型，同时使用 Ollama 的 Embedding 模型。
> * 使用 Ollama 的 LLM 模型，同时使用 OpenAI 的 Embedding 模型。

### 手动安装

* 进入您的 Obsidian Vault目录下的 `.obsidian/plugins` 目录，您的Vault目录请在『界面的左下角->打开其他仓库』里查看 <img style="float: right;" src="https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/icons/obsidian-icon-vault-switcher.svg">
* 克隆项目到 plugins 目录下

```bash
  cd ${Vault_Dir}/.obsidian/plugins
  git clone https://github.com/muzhi1991/obsidian-private-ai.git
```

## FAQ

#### 如何实现 Local First

此插件使用 Ollama 来支持 LLM 和 Embedding 模型的本地部署。对于重视数据安全的用户，建议在系统上安装 [Ollama](https://ollama.com/) 来实现本地化部署。安装完成后，请下载适配您的机器配置的模型（建议选择 7B/14B 模型以平衡性能和速度）。

如果服务请求失败，请检查：
* Ollama URL 配置是否正确
* Ollama 服务是否启动成功以及端口是否可访问，可以使用 `telnet localhost 11434` 测试
* 启动 Ollama 服务时是否设置环境变量 `OLLAMA_ORIGINS=app://obsidian.md*` 或 `OLLAMA_ORIGINS=*`（此配置非常重要，因为 Ollama Server 检测 CORS）

#### 关于 OpenAI 配置问题

> !! 注意:
> * 使用 OpenAI 时数据会发送到 OpenAI 服务器，请谨慎操作。
> * 使用 OpenAI 服务会产生 [费用](https://openai.com/api/pricing)。

如果您的本地机器性能不够，推荐使用 OpenAI 的 GPT-4 系列模型，特别是 GPT-4o，以获得最佳性能。您需要配置 [从官网获取的 API KEY](https://platform.openai.com/account/api-keys)。

## 贡献与反馈

欢迎对本项目贡献或提出意见！

- **提交 Issue**: 如果使用过程中遇到问题或有改进建议，请提交 Issue。
- **Pull Requests**: 如果您希望与我们一起完善功能，欢迎提交 Pull Requests。
- **反馈与联系**: 感谢您的宝贵反馈，请通过 GitHub 联系我们。

## Roadmap

- 增加知识库模型支持
- 支持向量数据库
- Chat 记录的 Workspace 管理功能
- 内置简易 Embedding 模型，方便直接索引

## License

本项目采用 Apache 2.0 许可证，详情请参阅 [LICENSE](./LICENSE) 文件。