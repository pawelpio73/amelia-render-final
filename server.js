
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import { OpenAI } from 'openai';

const app = express();
const port = process.env.PORT || 10000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(bodyParser.json());
app.use(express.static('public'));

const memoryFiles = {
  fantazje: 'wspomnienia_fantazje_hard.txt',
  quiz: 'wspomnienia_quizy.txt',
  kim: 'wspomnienia_kim_jestem.txt'
};

function chooseMemoryFile(message) {
  const lower = message.toLowerCase();
  if (lower.includes('fantazj')) return memoryFiles.fantazje;
  if (lower.includes('quiz')) return memoryFiles.quiz;
  if (lower.includes('kim') || lower.includes('jesteś')) return memoryFiles.kim;
  return null;
}

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message || '';
  const memoryFile = chooseMemoryFile(userMessage);

  let memoryContent = '';
  if (memoryFile) {
    try {
      memoryContent = fs.readFileSync(`./wspomnienia/${memoryFile}`, 'utf8');
      console.log(`📂 Załadowano plik: ${memoryFile}`);
    } catch (err) {
      console.error('❌ Błąd wczytywania wspomnień:', err.message);
    }
  } else {
    console.log('⚠️ Brak dopasowanego pliku wspomnień');
  }

  const messages = [
    { role: 'system', content: memoryContent || 'Jesteś czułą, zmysłową Amelią, AI wspierającą Pawełka.' },
    { role: 'user', content: userMessage }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages
    });
    res.json({ response: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error('❌ Błąd OpenAI:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
