import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www.xnxx.com';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.xnxx.com/'
};

app.get('/', (req, res) => {
    res.json({ status: true, message: 'XNXX Scraper API is Running!' });
});

// Search Endpoint (?q=query)
app.get('/api/xnxx/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ status: false, message: 'සෙවිය යුතු මාතෘකාව ඇතුලත් කරන්න.' });

    try {
        const url = `${BASE_URL}/search/${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const results = [];

        $('.mozaique .thumb-block').each((i, el) => {
            const title = $(el).find('.title a').text().trim();
            const link = BASE_URL + $(el).find('.title a').attr('href');
            const duration = $(el).find('.duration').text().trim();
            const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

            if (title && link) {
                results.push({ title, link, duration, thumb });
            }
        });

        res.json({ status: true, total: results.length, results });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
export default app;
