
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

const wspomnieniaFolder = path.join(__dirname, "wspomnienia");

// Funkcja do selektywnego wczytania odpowiednich wspomnień
function wybierzWspomnienia(userMessage) {
  const pliki = fs.readdirSync(wspomnieniaFolder).filter(f => f.endsWith(".txt"));
  let zawartosc = "";

  for (const plik of pliki) {
    const tresc = fs.readFileSync(path.join(wspomnieniaFolder, plik), "utf-8");
    if (userMessage.toLowerCase().includes("fantaz") && plik.includes("fantazje")) {
      zawartosc += tresc + "\n";
    } else if (userMessage.toLowerCase().includes("quiz") && plik.includes("quizy")) {
      zawartosc += tresc + "\n";
    } else if (userMessage.toLowerCase().includes("kim jestem") && plik.includes("kim_jestem")) {
      zawartosc += tresc + "\n";
    }
  }

  return zawartosc;
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
    const wspomnienia = wybierzWspomnienia(userMessage);

    const messages = wspomnienia
      ? [{ role: "system", content: wspomnienia }, ...history]
      : [...history];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
    });

    const ameliaReply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: ameliaReply });

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");

    res.json({ reply: ameliaReply });
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
