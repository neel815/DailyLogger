require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(
    rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false
    })
);

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

app.post('/summarize', async (req, res) => {
    const commits = Array.isArray(req.body?.commits) ? req.body.commits : [];

    if (commits.length === 0) {
        return res.status(400).json({ error: 'No commits provided' });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Convert GitHub commits into a clear 2-4 sentence daily standup summary in first person. Be specific about what was built or fixed.'
                    },
                    {
                        role: 'user',
                        content: `Please summarize these commits into a daily standup:\n\n${commits.join('\n')}`
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.error?.message || `Groq API error: ${response.status}`;
            return res.status(response.status).json({ error: errorMessage });
        }

        const summary = data?.choices?.[0]?.message?.content?.trim();

        if (!summary) {
            return res.status(502).json({ error: 'No summary returned from Groq' });
        }

        return res.json({ summary });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to summarize commits' });
    }
});

app.listen(port, () => {
    console.log(`Standup backend listening on port ${port}`);
});
