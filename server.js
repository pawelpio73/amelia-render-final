const express = require("express");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 10000;

app.use(express.static("public"));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const wspomnieniaFolder = path.join(__dirname, "wspomnienia");

// Funkcja ładuje zawartość plików wspomnień
function zaladujWspomnienia() {
  const messages = [];

  if (fs.existsSync(wspomnieniaFolder)) {
    const pliki = fs.readdirSync(wspomnieniaFolder);
    console.log(`📂 Znaleziono ${pliki.length} plików wspomnień:`, pliki);

    for (const plik of pliki) {
      const pelnaSciezka = path.join(wspomnieniaFolder, plik);
      const tresc = fs.readFileSync(pelnaSciezka, "utf-8");
      messages.push({
        role: "system",
        content: `Z pliku ${plik}:\n` + tresc,
      });
    }
  } else {
    console.warn("⚠️ Folder wspomnienia/ nie istnieje.");
  }

  return messages;
}

const historyFile = path.join(__dirname, "memory.json");

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
  }

  history.push({ role: "user", content: userMessage });

  try {
    const systemMessages = zaladujWspomnienia();

    const response = await openai.chat.completions.create({
      model: "gpt-4", // lub "gpt-4o"
      messages: [...systemMessages, ...history],
    });

    const ameliaReply = response.choices[0].message.content;
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
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
