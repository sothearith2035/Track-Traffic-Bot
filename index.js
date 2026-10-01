const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const formData = require("express-form-data");
const expressIp = require("express-ip");
const axios = require("axios");
require("dotenv").config();
const token = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const port = process.env.PORT || "3000";
const chatId = process.env.CHAT_ID;
const forwardURl = process.env.FORWARD_URL;
const options = {
  autoClean: true,
};
const bot = new TelegramBot(token, {
  polling: {
    autoStart: true,
    interval: 2000,
    params: {
      timeout: 10,
    },
  },
});

module.exports = (async function () {
  const app = express();
  app.use(formData.parse(options));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(expressIp().getIpInfoMiddleware);

  app.get("*", async (req, res) => {
    let body = req.query;
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    console.log("ip", ip);
    console.log("GET", body);
    await sendFormToBot(ip, body, "GET");
    return res.status(200).send("GET request");
  });

  // POST method route
  app.post("*", async (req, res) => {
    let body = req.body;
    var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
    console.log("ip", ip);
    console.log("POST", body);
    await sendFormToBot(ip, body, "POST");
    return res.status(200).send("POST request");
  });

  bot.onText(/\/start/, (msg) => {
    const { chat } = msg;
    const chatId = chat.id;
    let message = `My URL: ${process.env.BASE_URL}\n`;
    if (chat.type == "private") {
      message += `id: ${chat.id}\nfirst_name: ${chat.first_name}\nlast_name: ${chat.last_name}\nusername: ${chat.username}\ntype: ${chat.type}`;
    } else {
      message += `id: ${chat.id}\ntitle: ${chat.title}\ntype: ${chat.type}`;
    }
    bot.sendMessage(chatId, message);
  });
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
})();

function sendFormToBot(ip, body, type) {
  return new Promise(async (resolve, reject) => {
    if (body.length) {
      let message = `Send From: ${ip}`;
      message += `\nMethod: ${type} ${type == "POST" ? "🔴" : "🟢"} `;
      Object.entries(body).forEach(([key, value]) => {
        message += `\n${key}: ${value}`;
      });
      if (forwardURl) {
        try {
          if (type == "POST") {
            axios.post(forwardURl, body);
          } else {
            axios.get(forwardURl, body);
          }
        } catch (error) {
          console.log("error", error);
        }
      }
      try {
        await bot.sendMessage(chatId, message);
      } catch (error) {
        console.log("error", error);
      }
    }
    return resolve();
  });
}
// GET method route
