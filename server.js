const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50mb' }));
app.get('/health', (req, res) => {
  res.json({ status: 'ExamEdge AI backend is running ✅' });
});
app.post('/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'No prompt provided' });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Groq API error' });
    }
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ ExamEdge AI backend running on port ${PORT}`));
