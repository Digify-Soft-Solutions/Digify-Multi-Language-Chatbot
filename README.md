# 🤖 Digify Soft Solutions — Multilingual WhatsApp Bot

Official Multilingual Customer Support WhatsApp Bot for **Digify Soft Solutions** (`+91 80059 34184`), powered by **Groq API** (`llama-3.3-70b-versatile`) and **WACloud Webhooks** (`wacloud.innuvissolutions.com`).

---

## 🌟 Key Features

1. **Native Multilingual Processing**:
   - Automatically detects the customer's language.
   - Replies in the **exact same language** (Hindi, Gujarati, Marathi, Telugu, Tamil, Kannada, English, Hinglish).
2. **Private 1-on-1 Customer Sessions**:
   - Every customer chats individually with the Digify WhatsApp number.
   - No group confusion — conversations are completely isolated.
3. **Conversational Memory**:
   - Retains context across multi-turn messages for each customer phone number.
4. **WhatsApp Markdown Formatting**:
   - Generates bold highlights, clean lists, and polite responses.
5. **Human Agent Escalation**:
   - Automatically flags queries when a customer requests to speak with a human support agent.
6. **Built-in Live Test Simulator**:
   - Includes a WhatsApp Web preview interface at `http://localhost:5000` to test prompts before going live.

---

## 🚀 Quick Setup Guide

### 1. Configure Environment Variables
Open `.env` and paste your Groq API key:
```env
PORT=5000
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

WACLOUD_BUSINESS_NUMBER=+918005934184
WACLOUD_VERIFY_TOKEN=digify_webhook_token_2026
```
> *(Get your free Groq API key in 10 seconds from [console.groq.com/keys](https://console.groq.com/keys))*

### 2. Start the Server
```bash
npm run dev
```

### 3. Test in Browser
Open:
```
http://localhost:5000
```
Try sending messages in Hindi, Gujarati, Hinglish, or English. Watch the bot respond instantly!

---

## 🔗 Connecting to WACloud Dashboard (`wacloud.innuvissolutions.com`)

1. **Expose your local server to the Internet using ngrok**:
   ```bash
   npx ngrok http 5000
   ```
   You will get a public HTTPS URL like:
   `https://abc-123.ngrok-free.app`

2. **Add Webhook in WACloud**:
   - Go to your WACloud dashboard: `https://wacloud.innuvissolutions.com/dashboard/whatsapp/webhooks`
   - Click the blue **"+ Add Webhook"** button.
   - Set **Webhook URL** to:
     ```
     https://abc-123.ngrok-free.app/api/webhook/whatsapp
     ```
   - Check the event: `messages` (or `incoming messages`).
   - Save the webhook.

3. **Send a WhatsApp Message**:
   - Open WhatsApp on your phone.
   - Send any message (e.g., *"नमस्ते, मुझे सॉफ्टवेयर बनवाना है"*) to `+91 80059 34184`.
   - Your bot will process it with Groq and reply in the same language!
