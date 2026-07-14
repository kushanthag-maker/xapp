const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// කාටූන් ලැයිස්තුව ලබා ගන්නා API එක
app.get('/api/cartoons', async (req, res) => {
    try {
        const { data } = await axios.get('https://cartoons.lk/', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
            }
        });
        const $ = cheerio.load(data);
        const cartoons = [];

        // වෙබ් අඩවියේ පෝස්ට් අයිතම හඳුනා ගැනීම
        $('.post-item').each((i, el) => {
            const title = $(el).find('h2').text().trim();
            const link = $(el).find('a').attr('href');
            
            if (title && link) {
                cartoons.push({ title, link });
            }
        });

        res.json({
            success: true,
            total: cartoons.length,
            data: cartoons
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/api/cartoons`));
