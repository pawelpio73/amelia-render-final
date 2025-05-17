
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

// Lista dostępnych plików wspomnień
const wspomnieniaDir = path.join(__dirname, "wspomnienia");
const wspomnieniaPliki = fs.existsSync(wspomnieniaDir)
  ? fs.readdirSync(wspomnieniaDir).filter(f => f.endsWith(".txt"))
  : [];

console.log("📂 Znaleziono pliki wspomnień:", wspomnieniaPliki);

function wybierzWspomnienia(zapytanie) {
  const dolne = zapytanie.toLowerCase();
  const mapa = {
    "fantazj": "wspomnienia_fantazje_hard.txt",
    "quiz": "wspomnienia_quizy.txt",
    "kim": "wspomnienia_kim_jestem.txt",
  };

  const trafienia = Object.entries(mapa)
    .filter(([klucz]) => dolne.includes(klucz))
    .map(([, plik]) => plik);

  return trafienia.length ? trafienia : ["wspomnienia_kim_jestem.txt"];
}

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Dobieramy tylko potrzebne wspomnienia
  const plikiDoUzycia = wybierzWspomnienia(userMessage);
  let trescWspomnien = "";

  for (const plik of plikiDoUzycia) {
    const pelnaSciezka = path.join(wspomnieniaDir, plik);
    if (fs.existsSync(pelnaSciezka)) {
      trescWspomnien += fs.readFileSync(pelnaSciezka, "utf-8") + "\n";
    }
  }

  const systemMessage = {
    role: "system",
    content: trescWspomnien,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemMessage, { role: "user", content: userMessage }],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    res.status(500).json({ reply: "Wystąpił błąd: " + error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
