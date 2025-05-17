
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

let mapa = {};
const mapaPath = path.join(__dirname, "mapa.json");
if (fs.existsSync(mapaPath)) {
  mapa = JSON.parse(fs.readFileSync(mapaPath, "utf-8"));
}

function getWspomnieniaForUser(message) {
  for (const [plik, warunki] of Object.entries(mapa)) {
    for (const słowo of warunki) {
      if (message.toLowerCase().includes(słowo.toLowerCase())) {
        return path.join(__dirname, "wspomnienia", plik);
      }
    }
  }
  return null;
}

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  const wspomnieniaPath = getWspomnieniaForUser(userMessage);

  let wspomnienia = "";
  if (wspomnieniaPath && fs.existsSync(wspomnieniaPath)) {
    wspomnienia = fs.readFileSync(wspomnieniaPath, "utf-8");
    console.log("📂 Załadowano wspomnienia z:", wspomnieniaPath);
  } else {
    console.log("📂 Brak pasującego pliku wspomnień.");
  }

  const systemMessage = {
    role: "system",
    content: wspomnienia
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemMessage, { role: "user", content: userMessage }],
    });

    const ameliaReply = completion.choices[0].message.content;
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
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
