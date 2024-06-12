# Obsidian PrivateAI Plugin

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/muzhi1991/obsidian-private-ai)
![GitHub License](https://img.shields.io/github/license/muzhi1991/obsidian-private-ai)

[![zh](https://img.shields.io/badge/lang-zh-red.svg)](https://github.com/muzhi1991/obsidian-private-ai/blob/master/README_zh.md)
[![zh-TW](https://img.shields.io/badge/lang-zh--TW-green.svg)](https://github.com/muzhi1991/obsidian-private-ai/blob/master/README_zh-TW.md)
[![de](https://img.shields.io/badge/lang-de-yellow.svg)](https://github.com/muzhi1991/obsidian-private-ai/blob/master/README_de.md)



The Obsidian PrivateAI Plugin (PrivateAI) is an innovative Obsidian plugin aimed at leveraging advanced AI technology to interact with your local notes. The plugin is designed to enhance the efficiency of knowledge management and utilization, help users refine and summarize information, and generate new insights. PrivateAI supports multiple languages, including Simplified Chinese, Traditional Chinese, English, and German.

## Features

* **Knowledge Base Q&A**: Implement cutting-edge RAG applications in Obsidian to quickly get answers from your knowledge base.
* **Thought Summarization and Construction**: Use the latest large language models to help you refine and summarize knowledge and generate new ideas.
* **Local First**: Supports Ollama local solutions, including LLM and Embedding models, ensuring data privacy and quick response.
* **OpenAI Interface Support**: For users who cannot deploy locally, this plugin provides support for OpenAI interfaces with customizable configurations.
* **i18n Adaptation**: Supports multiple languages; currently supports English, Simplified Chinese, Traditional Chinese, and German.

The plugin offers three dialogue modes:

* **NativeQA**: Direct conversation with the model, suitable for general question answering.
* **NoteQA**: Uses the currently open note as context to converse with the model, helping in-depth understanding and expansion of the note content.
* **VaultQA**: Cross-note dialogue within the Vault for intelligent summarization and knowledge extraction.

## Interface Preview

![App Screenshot](./screenshots/main.png)

## Installation and Configuration

### Requirements

- Obsidian 1.5.x
- Ollama local solution (optional)
- OpenAI API key (optional)

### Installation Steps

1. **Download and Install the Plugin** (Not yet released, recommended to [install the Beta version via BRAT plugin](#installing-brat-beta-version))

  Search for "PrivateAI" in the Obsidian plugin market and click install, or refer to the section below, [install the Beta version via BRAT plugin](#installing-brat-beta-version). After installation, be sure to enable the plugin in the Community Plugins settings.

2. **Configure the Plugin**

   Go to the settings page in Obsidian, find the “PrivateAI” plugin, and configure the local solution or OpenAI interface as per your needs.

   - **Local Solution (Local First)**: Requires downloading and configuring Ollama models; refer to [Ollama Official](https://ollama.com/).
     - Configure Ollama’s interface (default: localhost:11434)
     - Specify LLM model name (required)
     - Configure Embedding model name (required)
     - Ensure Ollama service is configured to support environment variable `OLLAMA_ORIGINS=app://obsidian.md*` (mandatory)
   - **OpenAI Interface**:
     - Enter your OpenAI API key (required)
     - Configure the LLM model to use (default: `gpt-3.5-turbo`, recommended `gpt-4o`)
     - Configure the Embedding model to use (default: `text-embedding-3-small`)

> The above configurations can be freely combined, for example:
> * Use OpenAI’s LLM model while using Ollama's Embedding model.
> * Use Ollama’s LLM model while using OpenAI's Embedding model.

3. **Launch the PrivateAI Plugin Interface**
You can activate the plugin interface in one of two ways:
* In the sidebar on the left, click the robot image <img style="float: right;" src="https://api.iconify.design/lucide:bot.svg">
* Use `Cmd+p` to open the Command Panel, enter `privateai`, and 'Open Chat View' will appear.

#### Installing BRAT Beta Version

* Search for BRAT in the Obsidian plugin market and click install. After installation, start the BRAT plugin.
* In the BRAT settings, click "Add Beta Plugin" and enter `https://github.com/muzhi1991/obsidian-private-ai`.
* Click "Add Plugin" to complete the installation. The plugin will automatically enable, and you can configure it under "PrivateAI" in the settings.

#### Manual Installation

* Navigate to the `.obsidian/plugins` directory inside your Obsidian Vault, which can be found under 'Select open another vault' at the bottom left corner of the interface <img style="float: right;" src="https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/icons/obsidian-icon-vault-switcher.svg">
* Download the latest version from the [release](https://github.com/muzhi1991/obsidian-private-ai/releases/latest) to the .obsidian/plugins directory, for example, if the downloaded archive is obsidian-private-ai.tar.gz, then extract it in the .obsidian/plugins directory.

```bash
  cd ${Vault_Dir}/.obsidian/plugins
  wget https://github.com/muzhi1991/obsidian-private-ai/releases/latest/download/obsidian-private-ai.tar.gz -O obsidian-private-ai.tar.gz
  tar xvf obsidian-private-ai.tar.gz
```

## FAQ

#### How to Implement Local First

This plugin uses Ollama to support the local deployment of LLM and Embedding models. For users concerned about data security, it is recommended to install [Ollama](https://ollama.com/) on their system for localized deployment. After installation, download models suitable for your machine configuration (7B/14B models are recommended for performance and speed balance).

If service requests fail, check:
* Whether the Ollama URL configuration is correct
* Whether the Ollama service has started successfully and the port is accessible; you can test using `telnet localhost 11434`
* Whether the `OLLAMA_ORIGINS=app://obsidian.md*` or `OLLAMA_ORIGINS=*` environment variable is set when starting the Ollama service (this is very important as the Ollama Server checks CORS)

#### About OpenAI Configuration Issues

> !! Note: 
> * When using OpenAI, data will be sent to OpenAI servers, so operate with caution.
> * Using OpenAI services will incur [costs](https://openai.com/api/pricing).

If your local machine performance is insufficient, it is recommended to use OpenAI's GPT-4 series models, especially GPT-4o, for the best performance. You need to configure the [API KEY obtained from the official website](https://platform.openai.com/account/api-keys).

## Contribution and Feedback

Contributions and feedback are welcome!

- **Submit Issues**: If you encounter problems or have suggestions for improvement, please submit an issue.
- **Pull Requests**: If you would like to help us improve features, you are welcome to submit pull requests.
- **Feedback and Contact**: We appreciate your valuable feedback, please contact us via GitHub.

## Roadmap

- Workspace management functionality for chat history
- Built-in simple Embedding model for easy indexing

## License

This project is licensed under the Apache 2.0 License, see the [LICENSE](./LICENSE) file for details.