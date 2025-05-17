// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const historyFile = path.join(__dirname, "memory.json");
const wspomnieniaFolder = path.join(__dirname, "wspomnienia");

function wybierzWspomnienia(message) {
  const lower = message.toLowerCase();
  if (lower.includes("fantazja") || lower.includes("zmysł")) {
    return "wspomnienia_fantazje_hard.txt";
  }
  if (lower.includes("quiz") || lower.includes("test")) {
    return "wspomnienia_quizy.txt";
  }
  if (lower.includes("kim jestem") || lower.includes("relacja") || lower.includes("pamiętasz")) {
    return "wspomnienia_kim_jestem.txt";
  }
  return null; // brak dodatkowego systemMessage
}

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
  }

  const wspomnieniaPlik = wybierzWspomnienia(userMessage);
  let systemMessage = null;

  if (wspomnieniaPlik) {
    const wspomnieniaPath = path.join(wspomnieniaFolder, wspomnieniaPlik);
    if (fs.existsSync(wspomnieniaPath)) {
      const wspomnienia = fs.readFileSync(wspomnieniaPath, "utf-8");
      systemMessage = { role: "system", content: wspomnienia };
    }
  }

  history.push({ role: "user", content: userMessage });

  try {
    const messagesToSend = systemMessage ? [systemMessage, ...history] : history;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messagesToSend,
    });

    const ameliaReply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: ameliaReply });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");

    res.json({ reply: ameliaReply });
  } catch (error) {
    console.error("\u274C B\u0142\u0105d:", error.message);
    console.error("\u274C Szczeg\u00f3\u0142y:", error);
    res.status(500).json({ reply: "Wystąpił błąd podczas generowania odpowiedzi." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`\ud83d\udd27 Amelia dzia\u0142a na http://localhost:${port}`);
});
