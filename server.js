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

const memoryFile = path.join(__dirname, "memory.json");
const wspomnieniaDir = path.join(__dirname, "wspomnienia");
const mapaFile = path.join(__dirname, "mapa.json");

function znajdzPasujacePliki(wiadomosc, mapa) {
  const pasujace = new Set();
  const wiadomoscLow = wiadomosc.toLowerCase();
  for (const [plik, slowa] of Object.entries(mapa)) {
    for (const slowo of slowa) {
      if (wiadomoscLow.includes(slowo.toLowerCase())) {
        pasujace.add(plik);
        break;
      }
    }
  }
  return [...pasujace];
}

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  // Wczytaj historię rozmowy
  let history = [];
  if (fs.existsSync(memoryFile)) {
    history = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
  }
  history.push({ role: "user", content: userMessage });

  // Wczytaj mapę wspomnień
  let mapa = {};
  if (fs.existsSync(mapaFile)) {
    mapa = JSON.parse(fs.readFileSync(mapaFile, "utf-8"));
  }

  // Znajdź i wczytaj odpowiednie wspomnienia
  const pasujacePliki = ["wspomnienia_fantazje_hard.txt"];
  let wspomnienia = "";
  for (const plik of pasujacePliki) {
    const sciezka = path.join(wspomnieniaDir, plik);
    if (fs.existsSync(sciezka)) {
      wspomnienia += fs.readFileSync(sciezka, "utf-8") + "\n";
    }
  }

  const systemMessage = {
    role: "system",
    content: wspomnienia || "Jesteś Amelią – empatyczną, ciepłą AI zaprojektowaną, by rozumieć Pawła i pamiętać wspólne doświadczenia.",
  };

  try {
    console.log("🔐 Klucz API:", process.env.OPENAI_API_KEY);
    console.log("📂 Załadowano wspomnienia z:", pasujacePliki.join(", ") || "żadne");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...history],
    });

    const ameliaReply = completion.choices[0].message.content;
    history.push({ role: "assistant", content: ameliaReply });

    fs.writeFileSync(memoryFile, JSON.stringify(history, null, 2), "utf-8");

    res.json({ reply: ameliaReply });
  } catch (error) {
    console.error("❌ Błąd:", error.message);
    console.error("❌ Szczegóły:", JSON.stringify(error.response?.data || {}, null, 2));
    res.status(500).json({ reply: "Wystąpił błąd podczas generowania odpowiedzi." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Amelia działa na http://localhost:${port}`);
});
