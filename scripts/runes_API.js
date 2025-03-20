// Simple Express server on your ord Pi
const express = require('express');
const { execSync } = require('child_process');
const app = express();
app.use(express.json());

app.post('/etch-rune', (req, res) => {
  const { symbol, supply, decimals } = req.body;
  try {
    // Execute the ord command
    const result = execSync(`ord --signet wallet etch rune ${symbol} ${supply} --decimals ${decimals}`);
    res.json({ success: true, result: result.toString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

app.post('/mint-rune', (req, res) => {
  const { id, amount } = req.body;
  try {
    const result = execSync(`ord --signet wallet mint rune ${id} ${amount}`);
    res.json({ success: true, result: result.toString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

app.listen(3030, () => console.log('Rune API server running on port 3030'));