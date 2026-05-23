const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your frontend (update this once deployed)
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check — visit /health to confirm server is running
app.get("/health", (req, res) => {
  res.json({ status: "ExamEdge AI backend is running ✅" });
});

// Main analysis endpoint — frontend calls this with PDF text
app.post("/analyze", async (req, res) => {
  const { subject, university, year, papersText } = req.body;

  if (!papersText || !subject) {
    return res.status(400).json({ error: "Missing required fields: subject, papersText" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  try {
    const prompt = `You are an expert exam analyst for Indian BTech universities.

Analyze these previous year question papers for ${subject} (${university}, preparing for ${year} exam):

${papersText}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "topics": [
    { "name": "Topic Name", "count": 8, "trend": "increasing" },
    { "name": "Another Topic", "count": 5, "trend": "stable" }
  ],
  "predictions": [
    {
      "topic": "Topic Name",
      "likelihood": "High",
      "reason": "Appeared in 4 out of 5 years with increasing frequency",
      "sampleQuestion": "Explain the working principle of..."
    }
  ],
  "studyPlan": [
    { "week": 1, "focus": "High Priority Topics", "topics": ["Topic A", "Topic B"], "hours": 20 },
    { "week": 2, "focus": "Medium Priority Topics", "topics": ["Topic C", "Topic D"], "hours": 15 },
    { "week": 3, "focus": "Formula Revision + Past Questions", "topics": ["Topic A", "Topic C"], "hours": 12 },
    { "week": 4, "focus": "Mock Tests + Weak Areas", "topics": ["All topics"], "hours": 10 }
  ],
  "stats": {
    "totalQuestions": 45,
    "uniqueTopics": 12,
    "highConfidencePredictions": 4
  }
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return res.status(500).json({ error: "AI analysis failed. Please try again." });
    }

    const data = await response.json();
    const rawText = data.content[0]?.text || "";

    // Clean up in case model wraps in ```json
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json({ success: true, result: parsed });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Something went wrong: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ExamEdge AI backend running on port ${PORT}`);
});
