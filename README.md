# Track Traffic Bot

A **Node.js** application that receives HTTP requests and sends their data to a Telegram chat. Built with Express and the Telegram Bot API, with optional forwarding to another HTTP endpoint.

## Features

- Receive GET query parameters and POST data on any path.
- Parse JSON, URL-encoded forms, and multipart form fields.
- Send request method, reported IP address, and fields to Telegram.
- Optionally forward GET parameters or POST data to a configured URL.
- Use `/start` in Telegram to display the chat ID and application URL.

## Requirements

- Node.js **26.10.0**, the latest Current release checked on October 1, 2026. Node.js **24 LTS** is also supported; `package.json` requires Node.js 24 or newer.
- npm, included with Node.js.
- A Telegram bot token from [@BotFather](https://t.me/BotFather).

The project uses Express 5 and `node-telegram-bot-api` v2. `.nvmrc` selects Node.js 26.10.0 for compatible version managers.

To upgrade your local runtime, install Node.js from [nodejs.org](https://nodejs.org/en/download), or use an existing version manager. For nvm-windows:

```powershell
nvm install 26.10.0
nvm use 26.10.0
node --version
```

## Setup

1. Clone or download this repository, then open a terminal in its directory.
2. Install the locked dependencies:

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS or Linux, use `cp .env.example .env`.

4. Configure your bot token and destination chat ID:

   ```dotenv
   TELEGRAM_TOKEN="your-bot-token"
   CHAT_ID="your-chat-id"
   PORT=3000
   BASE_URL="http://localhost:3000"
   FORWARD_URL=""
   ```

5. Start the application:

   ```sh
   npm start
   ```

To find your chat ID, start with a valid token and send `/start` to your bot in Telegram. For a group, add the bot and send `/start@YourBotUsername` in that group. Copy the returned `id` into `CHAT_ID`, then restart. The bot must have permission to send messages in that chat.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `TELEGRAM_TOKEN` | Bot token; required to start | None |
| `CHAT_ID` | Destination chat ID; required to send request notifications | None |
| `PORT` | HTTP listening port | `3000` |
| `BASE_URL` | Application URL displayed by `/start` | `http://localhost:PORT` |
| `FORWARD_URL` | Optional HTTP/HTTPS endpoint receiving request data | Disabled |

Restart after changing configuration. Existing environment variables take precedence over `.env` values.

## Usage

Open this URL to send a GET notification:

```text
http://localhost:3000/visit?source=github&event=page_view
```

Send a JSON POST request from PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/events -ContentType application/json -Body '{"event":"signup","source":"github"}'
```

Successful requests return `GET request` or `POST request`. Requests without fields return successfully without sending a notification. Uploaded file contents are not forwarded or sent to Telegram.

When `FORWARD_URL` is set, GET fields become query parameters and POST fields become a JSON body. Forwarding finishes before the Telegram notification. A forwarding or Telegram failure returns HTTP 502; malformed request data returns a 4xx response. Delivery is not queued, and retries may duplicate forwarding if Telegram fails afterward. Telegram message size limits apply.

## Testing

```sh
npm test
```

Uses Node.js's built-in test runner. Covers root and nested routes, JSON and form bodies, forwarding, `/start`, and failure responses. Tests use local HTTP servers and mock Telegram delivery; no real token or external API calls are needed.

## Deployment and GitHub

Set the environment variables on your hosting platform, run `npm ci`, then `npm start`. The included `Procfile` supplies the start command for compatible hosts. Run one instance per bot token because Telegram updates use long polling. The app needs outbound access to Telegram and any forwarding endpoint.

Commit the source, README, `.env.example`, and `package-lock.json` to GitHub. `.gitignore` excludes `.env` and `node_modules`; keep real tokens out of commits.

This endpoint has no authentication or rate limiting. Restrict access before exposing it publicly. Request fields and IP information are sent to the configured Telegram chat and forwarding endpoint, so avoid sending secrets or sensitive data. The reported `X-Forwarded-For` value is unverified and must not be used for access control.

## License

[MIT](LICENSE).
