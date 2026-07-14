import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://sinhalasub.lk';

app.use(express.json());

// 1. Search Endpoint
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ success: false, error: 'සෙවිය යුතු ෆිල්ම් එකේ නම (?q=) ඇතුලත් කරන්න.' });
    }

    try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' 
            }
        });
        
        const $ = cheerio.load(data);
        const results = [];

        // Sinhalasub සර්ච් රිසල්ට්ස් වල තියෙන නිවැරදි elements
        $('.result-item article, .movies-list .item, article').each((index, element) => {
            // Title සහ Link එක ගන්නා ආකාරය
            const titleElement = $(element).find('.details .title a, h3 a, h2 a, a').first();
            const title = titleElement.text().trim();
            const link = titleElement.attr('href');
            
            // Image එක (සමහර වෙලාවට lazy load නිසා data-src එකේ තියෙන්න පුළුවන්)
            const img = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

            if (title && link && link.includes('/movies/')) {
                // ඩුප්ලිකේට් ලින්ක්ස් අයින් කිරීමට
                if (!results.some(r => r.movie_url === link)) {
                    results.push({
                        title: title,
                        movie_url: link,
                        thumbnail: img || 'No image'
                    });
                }
            }
        });

        res.json({ success: true, total_results: results.length, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Info & Download Links Endpoint
app.get('/api/info', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) {
        return res.status(400).json({ success: false, error: 'Movie URL (?url=) එකක් අනිවාර්යයි.' });
    }

    try {
        const { data } = await axios.get(movieUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' 
            }
        });
        
        const $ = cheerio.load(data);
        
        // ෆිල්ම් එකේ Title සහ විස්තරය (Plot) නිවැරදිව ලබා ගැනීම
        const title = $('.data h1').text().trim() || $('h1.entry-title').text().trim() || $('h1').first().text().trim();
        const plot = $('#info .wp-content p, .entry-content p, #sinopsis p').first().text().trim();
        
        const downloadLinks = [];

        // සයිට් එකේ තියෙන සේරම Download Table/Buttons ලින්ක්ස් පෙරීම
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();

            if (href) {
                const hrefLower = href.toLowerCase();
                const textLower = text.toLowerCase();

                // Download ලින්ක් එකක්ද කියා හඳුනාගන්නා සලකුණු (Pixeldrain, Mega, Quality tags)
                const isDownload = hrefLower.includes('pixeldrain') || 
                                   hrefLower.includes('mega.nz') || 
                                   hrefLower.includes('drive.google') || 
                                   hrefLower.includes('/links/') ||
                                   hrefLower.includes('/download/') ||
                                   textLower.includes('download') || 
                                   textLower.includes('බාගත') ||
                                   /\b(480p|720p|1080p|2160p|4k|mp4|mkv)\b/.test(textLower);

                if (isDownload && (href.startsWith('http') || href.startsWith('/'))) {
                    // සාපේක්ෂ ලින්ක්ස් (Relative links) සම්පූර්ණ ලින්ක්ස් බවට පත් කිරීම
                    const fullHref = href.startsWith('/') ? `${BASE_URL}${href}` : href;

                    if (!downloadLinks.some(l => l.url === fullHref)) {
                        downloadLinks.push({
                            label: text.replace(/\s+/g, ' ') || 'Download Link',
                            url: fullHref
                        });
                    }
                }
            }
        });

        res.json({
            success: true,
            data: {
                title: title || 'Title Not Found',
                plot: plot || 'No description available',
                download_links: downloadLinks
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Sinhalasub API v2 Running Successfully!`);
    console.log(`🔊 Endpoint: http://localhost:${PORT}`);
    console.log(`=========================================`);
});
