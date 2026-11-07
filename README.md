# ▶️ YouTube Bookmarker

**A Chrome extension to bookmark, summarize, and interact with YouTube videos using AI.**

YouTube Bookmarker helps you save important moments in YouTube videos, generate AI-powered summaries, and ask questions about video content — without leaving the YouTube interface.

Instead of manually searching through long videos, you can bookmark specific moments, revisit them instantly, and use AI to extract useful information from video transcripts.

## Features

### Smart Bookmarks
- Save the current video timestamp with a single keyboard shortcut.
- Use **`Alt + S`** to quickly create a bookmark.
- Automatically associate bookmarks with the current YouTube video.
- Rename bookmarks to give them meaningful titles.
- Jump directly to a saved moment.
- Delete bookmarks you no longer need.

### AI Assistant

**Video Summary**
- Generate concise summaries of YouTube videos.
- Extract key ideas and important information.
- Identify chapters and relevant timestamps.

**Ask AI**
- Ask questions about the current video's content.
- Get contextual answers based on the video transcript.
- Retrieve relevant timestamps to locate specific information.

## Tech Stack

| Component | Technology |
|---|---|
| Browser Extension | JavaScript, Chrome Extensions API |
| Backend | Cloudflare Workers |
| AI Integration | Groq API |
| AI Model | OpenAI GPT-OSS 20B |
| Communication | REST API, JSON |
| Content Processing | YouTube transcripts and timestamps |



## 🚀 Getting Started

You can run the extension locally by cloning the repository and loading it into Chrome in Developer Mode.

### 1. Fork or Clone the Repository

You can either fork this repository to your own GitHub account or clone it directly.

```bash
git clone https://github.com/khadija11-was/chrome-extension.git
```

Navigate to the project directory:

```bash
cd YOUR_REPOSITORY
```

### 2. Set Up the Backend

The AI features require the Cloudflare Worker backend.

Navigate to the backend directory:

```bash
cd yt-bookmarker-api
```

Install dependencies:

```bash
npm install
```

Create a `.dev.vars` file in the backend root directory, alongside `wrangler.jsonc`.

Add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key
```

You can obtain an API key from [Groq Console](https://console.groq.com/keys).

**Important:** Never commit `.dev.vars` or expose your API key in the extension source code.

Start the local Cloudflare Worker:

```bash
npm run dev
```

By default, Wrangler makes the local Worker available at:

```text
http://127.0.0.1:8787
```

Keep this terminal running while using the extension.

### 3. Configure the Extension

Make sure the extension's API client points to your local Worker endpoint:

```text
http://127.0.0.1:8787
```

Check the API configuration in the extension source code (for example, `api-client.js`) and update the endpoint if necessary.

If you use a deployed Cloudflare Worker instead, configure the extension to use your deployed Worker URL.

### 4. Load the Extension into Chrome

1. Open Google Chrome.
2. Navigate to:

   ```text
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the `extension` directory from the cloned repository.
6. The YouTube Bookmarker extension should now appear in your Chrome extensions list.

If Chrome displays an error, check that you selected the directory containing the extension's `manifest.json` file.

### 5. Start Using It

Open any supported YouTube video and launch the extension from the Chrome toolbar.

The extension is now ready to use.

## 📖 How to Use

### Create a Bookmark

1. Open a YouTube video.
2. Navigate to the moment you want to save.
3. Press **`Alt + S`**.
4. Your current timestamp is saved as a bookmark.

### Rename a Bookmark

Edit the bookmark title to describe the moment you want to remember.

For example:

- `01:15 — Important explanation`
- `03:42 — Architecture overview`
- `07:20 — Useful example`

### Navigate to a Bookmark

Click the play/navigation button next to a saved bookmark to return directly to that moment in the video.

### Generate a Video Summary

1. Open the extension.
2. Click **Summarize Video**.
3. Wait for the AI assistant to process the transcript.
4. Read the generated summary and explore the key moments.

### Ask Questions About a Video

1. Open the AI Assistant section.
2. Enter a question about the current video.
3. Click **Ask**.
4. Explore the generated answer and its relevant timestamps.

## ⌨️ Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Alt + S` | Create a bookmark at the current video timestamp |

If the shortcut conflicts with another Chrome shortcut, visit:

```text
chrome://extensions/shortcuts
```

You can review and customize extension shortcuts there.

## 🔮 Future Improvements

Potential directions for extending the project:

- Support videos without available captions through an audio transcription pipeline.
- Improve transcript processing for long videos.
- Add persistent bookmark synchronization.
- Build a personal library of saved videos and AI-generated insights.
- Improve AI answer accuracy and timestamp relevance.
- Add more AI providers for flexibility and resilience.

**Built to make YouTube content easier to explore, navigate, and understand.**