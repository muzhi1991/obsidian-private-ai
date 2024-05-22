# Obsidian PrivateAI Plugin

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/muzhi1991/obsidian-private-ai)
![GitHub License](https://img.shields.io/github/license/muzhi1991/obsidian-private-ai)

Das Obsidian PrivateAI Plugin (PrivateAI) ist ein innovatives Plugin für Obsidian, das darauf abzielt, fortschrittliche KI-Technologie zur Interaktion mit Ihren lokalen Notizen zu nutzen. Das Plugin wurde entwickelt, um die Effizienz des Wissensmanagements und der Wissensnutzung zu verbessern, Benutzern zu helfen, Informationen zu verfeinern und zusammenzufassen, und neue Erkenntnisse zu generieren. PrivateAI unterstützt mehrere Sprachen, einschließlich vereinfachtem Chinesisch, traditionellem Chinesisch, Englisch und Deutsch.

## Funktionen

* **Wissensdatenbank Q&A**: Implementieren Sie modernste RAG-Anwendungen in Obsidian, um schnell Antworten aus Ihrer Wissensdatenbank zu erhalten.
* **Gedankenzusammenfassung und -konstruktion**: Nutzen Sie die neuesten großen Sprachmodelle, um Wissen zu verfeinern und zusammenzufassen und neue Ideen zu generieren.
* **Local First**: Unterstützt Ollama-Lösungen vor Ort, einschließlich LLM- und Embedding-Modelle, um Datenprivatsphäre und schnelle Reaktionen zu gewährleisten.
* **OpenAI-Schnittstellenunterstützung**: Für Benutzer, die keine lokale Bereitstellung durchführen können, bietet dieses Plugin Unterstützung für OpenAI-Schnittstellen mit anpassbaren Konfigurationen.
* **i18n-Anpassung**: Unterstützt mehrere Sprachen; derzeit werden Englisch, vereinfachtes Chinesisch, traditionelles Chinesisch und Deutsch unterstützt.

Das Plugin bietet drei Dialogmodi:

* **NativeQA**: Direktes Gespräch mit dem Modell, geeignet für allgemeine Fragestellungen.
* **NoteQA**: Nutzt die aktuell geöffnete Notiz als Kontext, um mit dem Modell zu kommunizieren, was ein tiefes Verständnis und eine Erweiterung des Notizinhalts ermöglicht.
* **VaultQA**: (Demnächst) Cross-Note-Dialog innerhalb des Vaults zur intelligenten Zusammenfassung und Wissensextraktion.

## Schnittstellen-Vorschau

![App Screenshot](./screenshots/main.png)

## Installation und Konfiguration

### Anforderungen

- Obsidian 1.5.x
- Ollama-Lösung vor Ort (optional)
- OpenAI-API-Schlüssel (optional)

### Installationsschritte

1. **Plugin herunterladen und installieren** (Noch nicht veröffentlicht, manuelle Installation wie folgt erforderlich)

   Suchen Sie im Obsidian-Plugin-Markt nach „PrivateAI“ und klicken Sie auf Installieren. Alternativ können Sie dieses Repository klonen und dessen Inhalt in das Obsidian-Plugin-Verzeichnis kopieren.

2. **Plugin konfigurieren**

   Gehen Sie zur Einstellungsseite in Obsidian, finden Sie das „PrivateAI“-Plugin und konfigurieren Sie die lokale Lösung oder die OpenAI-Schnittstelle gemäß Ihren Anforderungen.

   - **Lokale Lösung (Local First)**: Erfordert das Herunterladen und Konfigurieren von Ollama-Modellen; siehe [Ollama Offiziell](https://ollama.com/).
     - Konfigurieren Sie die Ollama-Schnittstelle (Standard: localhost:11434)
     - Geben Sie den LLM-Modellnamen an (erforderlich)
     - Konfigurieren Sie den Embedding-Modellnamen (erforderlich)
     - Stellen Sie sicher, dass der Ollama-Dienst so konfiguriert ist, dass er die Umgebungsvariable `OLLAMA_ORIGINS=app://obsidian.md*` unterstützt (Erforderlich)
   - **OpenAI-Schnittstelle**:
     - Geben Sie Ihren OpenAI-API-Schlüssel ein (erforderlich)
     - Konfigurieren Sie das zu verwendende LLM-Modell (Standard: `gpt-3.5-turbo`, empfohlen `gpt-4o`)
     - Konfigurieren Sie das zu verwendende Embedding-Modell (Standard: `text-embedding-3-small`)

> Die obigen Konfigurationen können beliebig kombiniert werden, zum Beispiel:
> * Verwenden des LLM-Modells von OpenAI, während das Embedding-Modell von Ollama verwendet wird.
> * Verwenden des LLM-Modells von Ollama, während das Embedding-Modell von OpenAI verwendet wird.

### Manuelle Installation

* Navigieren Sie zum Verzeichnis `.obsidian/plugins` innerhalb Ihres Obsidian Vault, welches Sie unter 'Select open another Vault' in der unteren linken Ecke der Schnittstelle finden <img style="float: right;" src="https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/icons/obsidian-icon-vault-switcher.svg">
* Klonen Sie das Projekt in das Plugins-Verzeichnis

```bash
  cd ${Vault_Dir}/.obsidian/plugins
  git clone https://github.com/muzhi1991/obsidian-private-ai.git
```

## FAQ

#### Wie man Local First implementiert

Dieses Plugin verwendet Ollama zur Unterstützung der lokalen Bereitstellung von LLM- und Embedding-Modellen. Für Benutzer, die sich um die Datensicherheit sorgen, wird empfohlen, [Ollama](https://ollama.com/) auf ihrem System für die lokalisierten Bereitstellung zu installieren. Nach der Installation laden Sie Modelle herunter, die für Ihre Maschinenkonfiguration geeignet sind (7B/14B-Modelle werden für eine ausgewogene Leistung und Geschwindigkeit empfohlen).

Wenn Serviceanforderungen fehlschlagen, überprüfen Sie:
* Ob die Ollama-URL-Konfiguration korrekt ist
* Ob der Ollama-Dienst erfolgreich gestartet wurde und der Port zugänglich ist; Sie können dies mit `telnet localhost 11434` testen
* Ob die Umgebungsvariable `OLLAMA_ORIGINS=app://obsidian.md*` oder `OLLAMA_ORIGINS=*` beim Starten des Ollama-Dienstes gesetzt ist (dies ist sehr wichtig, da der Ollama-Server CORS überprüft)

#### Über OpenAI-Konfigurationsprobleme

> !! Hinweis: 
> * Beim Verwenden von OpenAI werden Daten an OpenAI-Server gesendet, daher vorsichtig vorgehen.
> * Die Nutzung der OpenAI-Dienste verursacht [Kosten](https://openai.com/api/pricing).

Wenn die Leistung Ihres lokalen Rechners nicht ausreicht, wird empfohlen, die GPT-4-Serienmodelle von OpenAI zu verwenden, insbesondere GPT-4o, um die beste Leistung zu erzielen. Sie müssen den [API-Schlüssel von der offiziellen Website](https://platform.openai.com/account/api-keys) konfigurieren.

## Beitrag und Feedback

Beiträge und Feedback sind willkommen!

- **Probleme melden**: Wenn Sie Probleme haben oder Verbesserungsvorschläge haben, melden Sie bitte ein Problem.
- **Pull Requests**: Wenn Sie uns helfen möchten, Funktionen zu verbessern, sind Sie willkommen, Pull Requests einzureichen.
- **Feedback und Kontakt**: Wir schätzen Ihr wertvolles Feedback, bitte kontaktieren Sie uns über GitHub.

## Fahrplan

- Unterstützung für Vault-Modus hinzufügen
- Unterstützung für Vectorstore
- Workspace-Management-Funktionalität für Chat-Verlauf
- Eingebautes einfaches Embedding-Modell für einfache Indexierung

## Lizenz

Dieses Projekt ist unter der Apache 2.0-Lizenz lizenziert, siehe die [LIZENZ](./LICENSE)-Datei für Details.