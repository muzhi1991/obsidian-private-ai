
// export const SUPPORT_MODELS = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]
export const SUPPORT_MODELS:{ [key: string]: ModelParam } ={
	"gpt-3.5-turbo":{
		maxLen: 16385
	},
	"gpt-4":{
		maxLen: 8192
	},
	"gpt-4-turbo":{
		maxLen:128000
	},
	"gpt-4o":{
		maxLen:128000
	},
}
export const EMBEDDING_SUPPORT_MODELS:{ [key: string]: ModelParam }  = {
	"text-embedding-3-small":{
		maxLen:8191
	},
	"text-embedding-3-large":{
		maxLen:8191
	},
	"text-embedding-ada-002":{
		maxLen:8191
	},
}
export const GLOBAL_DEFAULT_MODEL_PARAM = {
	"maxLen": 4096
}

export const GLOBAL_DEFAULT_EMBEDDING_MODEL_PARAM = {
	"maxLen": 512
}

export const GLOBAL_DEFAULT_SPLITER={
	'chunkSize':1000,
	'chunkOverlap':200
}

export interface ModelParam {
	maxLen: number
}

export interface OpenAIConfig {
	baseUrl: string
	apiKey: string
	model: string | undefined
	modelParam: ModelParam | undefined
	embeddingModel: string | undefined
	embeddingModelParam: ModelParam | undefined
}
export interface OllamaConfig {
	baseUrl: string
	apiKey: string
	model: string | undefined
	modelParam: ModelParam | undefined
	embeddingModel: string | undefined
	embeddingModelParam: ModelParam | undefined
}


export enum ChatMode {
	NaiveChat = 'naive_chat',
	NoteQa = 'note_qa',
	VaultQa = 'vault_qa'
}
export enum LLMServer {
	OpenAI = 'openai',
	Ollama = 'ollama',
}
export enum EmbeddingServer {
	OpenAI = 'openai',
	Ollama = 'ollama',
}




export interface PrivateAIPluginSettings {
	mySetting: string
	language: string
	chatMode: ChatMode
	llmServer: LLMServer
	embeddingServer: EmbeddingServer
	openaiConfig: Partial<OpenAIConfig>
	ollamaConfig: Partial<OllamaConfig>
	test: string

}

export const DEFAULT_SETTINGS: Partial<PrivateAIPluginSettings> = {
	mySetting: 'default',
	language: 'default',
	chatMode: 'naive_chat' as ChatMode,
	llmServer: 'openai' as LLMServer,
	embeddingServer: 'openai' as EmbeddingServer,
	openaiConfig: {
		baseUrl: "https://api.openai.com/v1",
		model: 'gpt-3.5-turbo',
		modelParam: {
			maxLen: SUPPORT_MODELS['gpt-3.5-turbo'].maxLen
		},
		embeddingModel: 'text-embedding-3-small',
		embeddingModelParam:{
			maxLen: EMBEDDING_SUPPORT_MODELS['text-embedding-3-small'].maxLen
		}
	},
	ollamaConfig: {
		baseUrl: "http://localhost:11434",
		modelParam: {
			maxLen: GLOBAL_DEFAULT_MODEL_PARAM['maxLen']
		}
	},

}

export function getLLMModelFromSettings(settings: PrivateAIPluginSettings) {
	if (settings.llmServer == LLMServer.OpenAI) {
		return settings.openaiConfig.model
	} else if (settings.llmServer == LLMServer.Ollama) {
		return settings.ollamaConfig.model;
	}

}

export function getEmbeddingModelFromSettings(settings: PrivateAIPluginSettings) {
	if (settings.embeddingServer == EmbeddingServer.OpenAI) {
		return settings.openaiConfig.embeddingModel
	} else if (settings.embeddingServer == EmbeddingServer.Ollama) {
		return settings.ollamaConfig.embeddingModel
	}
}

export function getLLMModelParamFromSettings(settings: PrivateAIPluginSettings) {
	if (settings.llmServer == LLMServer.OpenAI) {
		return settings.openaiConfig.modelParam
	} else if (settings.llmServer == LLMServer.Ollama) {
		return settings.ollamaConfig.modelParam
	}
}

export function getEmbeddingModelParamFromSettings(settings: PrivateAIPluginSettings) {
	if (settings.embeddingServer == EmbeddingServer.OpenAI) {
		return settings.openaiConfig.embeddingModelParam
	} else if (settings.embeddingServer == EmbeddingServer.Ollama) {
		return settings.ollamaConfig.embeddingModelParam
	}
}