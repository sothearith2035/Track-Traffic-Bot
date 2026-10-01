const { Bot } = require("node-telegram-bot-api");
const express = require("express");
const formData = require("express-form-data");
const axios = require("axios");
require("dotenv").config({ quiet: true });

const token = process.env.TELEGRAM_TOKEN;
const port = process.env.PORT || "3000";
const chatId = process.env.CHAT_ID;
const forwardUrl = process.env.FORWARD_URL;
if (!token || token === "YOUR BOT TOKEN") {
  throw new Error("Set TELEGRAM_TOKEN in .env before starting the bot.");
}
if (forwardUrl && !["http:", "https:"].includes(new URL(forwardUrl).protocol)) {
  throw new Error("FORWARD_URL must use HTTP or HTTPS.");
}

const bot = new Bot(token);
const app = express();
app.use(formData.parse({ autoClean: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express 5 requires a named wildcard; braces include the root path.
app.get("/{*path}", async (req, res) => {
  await sendFormToBot(req, req.query);
  res.status(200).send("GET request");
});
app.post("/{*path}", async (req, res) => {
  await sendFormToBot(req, req.body);
  res.status(200).send("POST request");
});
app.use((error, req, res, next) => {
  console.error("Request failed:", error.message);
  res.status(error.status >= 400 && error.status < 500 ? error.status : 502)
    .send("Request could not be processed");
});

bot.command("start", async (ctx) => {
  const chat = ctx.chat;
  let message = `My URL: ${process.env.BASE_URL || `http://localhost:${port}`}\n`;
  if (chat.type === "private") {
    message += `id: ${chat.id}\nfirst_name: ${chat.first_name}\nlast_name: ${chat.last_name}\nusername: ${chat.username}\ntype: ${chat.type}`;
  } else {
    message += `id: ${chat.id}\ntitle: ${chat.title}\ntype: ${chat.type}`;
  }
  await ctx.reply(message);
});

async function sendFormToBot(req, body) {
  if (!body || Object.keys(body).length === 0) return;
  if (!chatId) throw new Error("Set CHAT_ID in .env to receive request notifications.");
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  let message = `Send From: ${ip}\nMethod: ${req.method}`;
  for (const [key, value] of Object.entries(body)) {
    message += `\n${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`;
  }
  if (forwardUrl) {
    if (req.method === "POST") {
      await axios.post(forwardUrl, body, { timeout: 10000 });
    } else {
      await axios.get(forwardUrl, { params: body, timeout: 10000 });
    }
  }
  await bot.api.sendMessage({ chat_id: chatId, text: message });
}

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
  bot.startPolling(undefined, { timeout: 10 }).catch((error) => {
    console.error("Telegram polling failed:", error.message);
    server.close();
    process.exitCode = 1;
  });
}

module.exports = { app, bot };
