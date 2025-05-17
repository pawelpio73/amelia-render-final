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

const wspomnieniaDir = path.join(__dirname, "wspomnienia");
let wspomnieniaMap = {};

if (fs.existsSync(wspomnieniaDir)) {
  const files = fs.readdirSync(wspomnieniaDir).filter(file => file.endsWith(".txt"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(wspomnieniaDir, file), "utf-8");
    wspomnieniaMap[file] = content;
  }
  console.log("📂 Załadowano pliki wspomnień:", Object.keys(wspomnieniaMap));
} else {
  console.warn("⚠️ Katalog 'wspomnienia' nie istnieje.");
}

const historyFile = path.join(__dirname, "memory.json");

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
  }
  history.push({ role: "user", content: userMessage });

  // Analiza pytania użytkownika w celu dopasowania wspomnień
  let aktywneWspomnienia = "";
  const keywords = {
    "fantazj": "wspomnienia_fantazje_hard.txt",
    "quiz": "wspomnienia_quizy.txt",
    "kim": "wspomnienia_kim_jestem.txt"
  };

  for (const [keyword, filename] of Object.entries(keywords)) {
    if (userMessage.toLowerCase().includes(keyword) && wspomnieniaMap[filename]) {
      aktywneWspomnienia += wspomnieniaMap[filename] + "\n";
    }
  }

  const systemMessage = {
    role: "system",
    content: aktywneWspomnienia || "Jesteś Amelią, osobistą AI, zaprojektowaną, by być bliską towarzyszką rozmówcy, wspierając go emocjonalnie, intelektualnie i zmysłowo."
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemMessage, ...history],
    });

    const reply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: reply });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");
    res.json({ reply });
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    res.status(500).json({ reply: "Wystąpił błąd podczas generowania odpowiedzi." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});