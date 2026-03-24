# CoverCraft AI Cover Letters for Seek, Indeed, Linkedin, Greenhouse

A Chrome/Edge browser extension that reads any seek, indeed, linkedin, greenhouse job listing and generates a AI cover letter using your resume.

---

## Setup

1. Click the CoverCraft extension icon
2. Go to the **Settings** tab (⚙ icon)
3. Paste your **Anthropic API key** (get one at [console.anthropic.com](https://console.anthropic.com))
4. Optionally add your name and email
5. Click **Save Settings**

---

## How to Use

1. Go to **any job listing on seek.com.au indeed.com linkedin.com greenhouse.com**
2. Click the CoverCraft extension icon
3. The job details will be **auto-detected** from the page
4. Upload your **resume** (PDF, TXT, DOC stored locally, never sent anywhere except Anthropic)
5. Choose a **tone** (Professional, Enthusiastic, Concise, Storytelling)
6. Click **Generate Cover Letter**
7. **Copy** the result and paste it into Seek's application form!

---

## Features

- 🔍 **Auto-detects** job title, company, and full job description from Seek
- 📄 **Resume parsing** upload once, reuse across all applications
- 🎨 **4 writing tones** to match the vibe of each role
- ♻️ **Regenerate** for a fresh take anytime
- 🔒 **Privacy first** your resume and API key are stored locally on your device

---

## Privacy & Security

- Your resume text is stored in Chrome's local storage (on your device only)
- Your API key is stored locally and sent only to Anthropic's API
- No data is sent to any third-party servers
- The extension only activates on seek.com.au pages

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "No job detected" | Make sure you're on a specific job listing page (not search results) |
| API error 401 | Check your API key is correct in Settings |
| Resume not reading | Try a plain .txt version of your resume if PDF parsing fails |
| Extension not loading | Try refreshing the Seek tab after installing |

---

## File Structure

```
seek-coverletter-extension/
├── manifest.json      # Extension config
├── popup.html         # Extension UI
├── popup.js           # UI logic + API calls
├── content.js         # Scrapes job details from Seek pages
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
