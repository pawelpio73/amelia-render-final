const express = require("express");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

// 1. Załaduj osobowość Amelii
const persona = JSON.parse(fs.readFileSync("persona_amelia.json", "utf-8"));

// 2. Załaduj wszystkie wspomnienia z katalogu
const wspomnieniaDir = path.join(__dirname, "wspomnienia");
let wspomnienia = "";
if (fs.existsSync(wspomnieniaDir)) {
  const files = fs.readdirSync(wspomnieniaDir).filter(f => f.endsWith(".txt"));
  wspomnienia = files.map(f => fs.readFileSync(path.join(wspomnieniaDir, f), "utf-8")).join("\n\n");
}

// 3. Wczytaj historię rozmowy
const historyFile = path.join(__dirname, "memory.json");
let history = [];
if (fs.existsSync(historyFile)) {
  history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
}

// 4. Inicjalizuj OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 5. Punkt startowy – wiadomość systemowa
const systemMessage = {
  role: "system",
  content: `${persona.description}\n\n${wspomnienia}`
};

// 6. Obsługa zapytań użytkownika
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  history.push({ role: "user", content: userMessage });

  try {
   const completion = await openai.chat.completions.create({
  model: "gpt-4-1106-preview",
  messages: [systemMessage, ...history],
});


    const ameliaReply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: ameliaReply });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");

    res.json({ reply: ameliaReply });
  } catch (error) {
    console.error("Błąd:", error);
    res.status(500).json({ reply: "Wystąpił błąd podczas generowania odpowiedzi." });
  }
});

// 7. Główna strona
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
  console.log(`📂 Załadowano ${wspomnienia.split("\n").length} linii wspomnień`);
});
