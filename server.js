
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

const wspomnieniaFiles = [
  "wspomnienia_kim_jestem.txt",
  "wspomnienia_fantazje_hard.txt",
  "wspomnienia_quizy.txt"
];

let wspomnienia = "";

for (const file of wspomnieniaFiles) {
  if (fs.existsSync(file)) {
    wspomnienia += fs.readFileSync(file, "utf-8") + "\n";
    console.log("📂 Załadowano:", file);
  }
}

const systemMessage = {
  role: "system",
  content: wspomnienia
};

const historyFile = path.join(__dirname, "memory.json");

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
  }

  history.push({ role: "user", content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...history],
    });

    const ameliaReply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: ameliaReply });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");

    res.json({ reply: ameliaReply });
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error("❌ Szczegóły:", error.response?.data || error);
    res.status(500).json({ reply: "Wystąpił błąd podczas generowania odpowiedzi." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Amelia działa na http://localhost:${port}`);
});
