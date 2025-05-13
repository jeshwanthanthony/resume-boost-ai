require('dotenv').config();
const { OpenAI } = require('openai');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: 'uploads/' });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/analyze', upload.single('resume'), (req, res) => {
  const jobDesc = req.body.jobdesc;
  const resumeFilePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  const handleAnalysis = async (resumeText) => {
    const prompt = `Here is a resume:\n${resumeText}\n\nHere is a job description:\n${jobDesc}\n\nHow can this resume be improved to better match the job description? Give specific, actionable suggestions.`;

    try {
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const suggestions = chatResponse.choices[0].message.content;

      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Results - ResumeBoost AI</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      background-color: #0d0d0d;
      color: #f2f2f2;
      font-family: 'DM Sans', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .container {
      max-width: 800px;
      background-color: #000;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.06);
      border: 1px solid #333;
    }

    h2 {
      font-size: 24px;
      margin-bottom: 20px;
    }

    .section {
      margin-bottom: 30px;
    }

    .quote {
      font-style: italic;
      color: #aaa;
      padding: 10px;
      background-color: #1a1a1a;
      border-left: 4px solid #444;
      border-radius: 6px;
    }

    ul {
      padding-left: 20px;
    }

    li {
      margin-bottom: 15px;
      line-height: 1.6;
    }

    .button {
      display: inline-block;
      margin-top: 30px;
      padding: 12px 20px;
      background-color: #000;
      color: white;
      border: 1px solid #000000;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .button:hover {
      background-color: #1a1a1a;
      color: #25749c;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="section">
      <h2>You said:</h2>
      <div class="quote">${jobDesc.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="section">
      <h2>AI Suggestions:</h2>
      <ul>
        ${suggestions
          .split(/\n+/)
          .filter(p => p.trim().match(/^\d+\.|\•/))
          .slice(0, 5)
          .map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`)
          .join('')}
      </ul>
    </div>

    <a href="/" class="button">← Back</a>
  </div>
</body>
</html>
`);
    } catch (err) {
      console.error(err);
      res.status(500).send('OpenAI API error.');
    }
  };

  if (ext === '.pdf') {
    const pdfBuffer = fs.readFileSync(resumeFilePath);
    pdfParse(pdfBuffer)
      .then(data => handleAnalysis(data.text))
      .catch(err => {
        console.error(err);
        res.status(500).send('Error reading PDF file.');
      });
  } else {
    fs.readFile(resumeFilePath, 'utf8', (err, resumeText) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error reading resume file.');
      }
      handleAnalysis(resumeText);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});