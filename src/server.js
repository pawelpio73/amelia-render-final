import express from 'express';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import bodyParser from 'body-parser';
import cors from 'cors';
import readline from 'readline';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const wspomnieniaFolder = path.join(__dirname, '../wspomnienia');
const personaPath = path.join(__dirname, '../persona_amelia.json');

async function wczytajWspomnienia(folderPath) {
  const pliki = await fs.promises.readdir(folderPath);
  const wspomnienia = [];

  for (const plik of pliki) {
    const pelnaSciezka = path.join(folderPath, plik);
    const zawartosc = await fs.promises.readFile(pelnaSciezka, 'utf-8');

    const tokeny = zawartosc.split(/\s+/).length;
    if (tokeny <= 9500) {
      wspomnienia.push({ nazwa: plik, tresc: zawartosc });
    }
  }

  return wspomnienia;
}

app.post('/api/chat', async (req, res) => {
  try {
    const wiadomoscUzytkownika = req.body.message;
    const persona = JSON.parse(await fs.promises.readFile(personaPath, 'utf-8'));
    const wspomnienia = await wczytajWspomnienia(wspomnieniaFolder);

    const zawartoscWspomnien = wspomnienia.map(w => `### ${w.nazwa}\n${w.tresc}`).join('\n\n');

    const odpowiedz = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `${persona.prompt}\n\n${zawartoscWspomnien}` },
        { role: 'user', content: wiadomoscUzytkownika }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    res.json({ response: odpowiedz.choices[0].message.content });
  } catch (err) {
    console.error('❌ Błąd:', err);
    res.status(500).send('Wystąpił błąd serwera.');
  }
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
