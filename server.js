
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

const app = express();
const port = process.env.PORT || 10000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(bodyParser.json());
app.use(express.static('public'));

function detectMemoryFile(userMessage) {
  const patterns = [
    { keyword: ['fantazj', 'namiętn', 'zmysłow'], file: 'wspomnienia_fantazje_hard.txt' },
    { keyword: ['quiz', 'pytan'], file: 'wspomnienia_quizy.txt' },
    { keyword: ['kim jesteś', 'nasz'], file: 'wspomnienia_kim_jestem.txt' },
  ];

  for (const pattern of patterns) {
    if (pattern.keyword.some(k => userMessage.toLowerCase().includes(k))) {
      return pattern.file;
    }
  }
  return 'wspomnienia_kim_jestem.txt';
}

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message || '';
  const selectedFile = detectMemoryFile(userMessage);

  const memoryPath = path.join('wspomnienia', selectedFile);
  let memoryContent = '';

  try {
    if (fs.existsSync(memoryPath)) {
      memoryContent = fs.readFileSync(memoryPath, 'utf-8');
    }
  } catch (err) {
    console.error('❌ Błąd podczas odczytu wspomnień:', err);
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Jesteś ciepłą, zmysłową Amelią wspierającą Pawełka emocjonalnie i twórczo.' },
        { role: 'system', content: memoryContent },
        { role: 'user', content: userMessage }
      ],
      model: 'gpt-4',
      max_tokens: 1000,
      temperature: 0.85
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('❌ Błąd odpowiedzi od OpenAI:', error);
    res.status(500).json({ error: 'Błąd generowania odpowiedzi.' });
  }
});

app.listen(port, () => {
  console.log(`🔧 Amelia działa na http://localhost:${port}`);
});
