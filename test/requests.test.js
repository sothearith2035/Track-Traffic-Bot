const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");

test("request tracking, forwarding, and Telegram commands", async (t) => {
  process.env.TELEGRAM_TOKEN = "123456:test-token";
  process.env.CHAT_ID = "123456";
  process.env.BASE_URL = "http://localhost:3000";
  const forwarded = [];
  const destination = express();
  destination.use(express.json());
  destination.all("/", (req, res) => {
    forwarded.push(req.method === "GET" ? { ...req.query } : req.body);
    res.sendStatus(200);
  });
  const receiver = destination.listen(0, "127.0.0.1");
  await new Promise((resolve) => receiver.once("listening", resolve));
  t.after(() => new Promise((resolve) => receiver.close(resolve)));
  process.env.FORWARD_URL = `http://127.0.0.1:${receiver.address().port}`;

  const { app, bot } = require("../index");
  const messages = [];
  t.mock.method(bot.api, "sendMessage", async (message) => {
    messages.push(message);
    return {};
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  assert.equal((await fetch(base)).status, 200);
  assert.equal(messages.length, 0);
  assert.equal((await fetch(`${base}/?source=github`)).status, 200);
  assert.match(messages.at(-1).text, /source: github/);
  assert.deepEqual(forwarded.at(-1), { source: "github" });
  assert.equal((await fetch(`${base}/nested/path?source=docs`)).status, 200);
  assert.match(messages.at(-1).text, /source: docs/);

  for (const body of [JSON.stringify({ event: "signup" }), new URLSearchParams({ event: "signup" }), new FormData()]) {
    if (body instanceof FormData) body.set("event", "signup");
    const response = await fetch(`${base}/events`, {
      method: "POST",
      headers: typeof body === "string" ? { "content-type": "application/json" } : {},
      body,
    });
    assert.equal(response.status, 200);
    assert.match(messages.at(-1).text, /event: signup/);
    assert.deepEqual(forwarded.at(-1), { event: "signup" });
  }

  await bot.handleUpdate({ update_id: 1, message: {
    message_id: 1, date: 0, text: "/start",
    entities: [{ type: "bot_command", offset: 0, length: 6 }],
    chat: { id: 123456, type: "private", first_name: "Test" },
  } });
  assert.match(messages.at(-1).text, /id: 123456/);
  assert.match(messages.at(-1).text, /My URL: http:\/\/localhost:3000/);

  t.mock.method(bot.api, "sendMessage", async () => { throw new Error("Telegram unavailable"); });
  assert.equal((await fetch(`${base}/?event=failure`)).status, 502);
  assert.equal((await fetch(base, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{",
  })).status, 400);
});
