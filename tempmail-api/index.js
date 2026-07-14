import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://www.subtitlecat.com';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.subtitlecat.com/'
};

app.get('/', (req, res) => {
    res.json({ status: true, message: 'SubtitleCat Smart Scraper API is Running Live!' });
});

// 1. Search Endpoint (Flawless URL Resolver)
app.get('/api/subtitlecat/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ status: false, message: 'සෙවිය යුතු චිත්‍රපටයේ හෝ සීරිස් එකේ නම ඇතුලත් කරන්න. (?q=...)' });
    }

    try {
        const searchUrl = `${BASE_URL}/index.html?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS });
        const $ = cheerio.load(data);
        const results = [];

        $('header, footer, nav, .menu, .sidebar, #header, #footer, script, style').remove();

        $('a').each((index, element) => {
            const title = $(element).text().trim();
            const href = $(element).attr('href');

            if (href && href.length > 1 && !href.startsWith('javascript') && !href.startsWith('#')) {
                // සැබෑ සම්පූර්ණ URL එක නිවැරදිව ගොඩනැගීම (Fixes relative path breaking)
                const absoluteUrl = new URL(href, searchUrl).href;

                const isJunk = absoluteUrl.includes('privacy.html') || 
                               absoluteUrl.includes('disclaimer.html') || 
                               absoluteUrl.includes('contact.html') || 
                               absoluteUrl.includes('dmca.html') || 
                               absoluteUrl.includes('index.html') ||
                               title.length < 2;

                if (!isJunk && !results.some(item => item.url === absoluteUrl)) {
                    results.push({
                        title: title,
                        url: absoluteUrl
                    });
                }
            }
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            total_results: results.length,
            results
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'සෙවීම අසාර්ථක විය!', error: error.message });
    }
});

// 2. Download Endpoint (Fixed 404 Error)
app.get('/api/subtitlecat/download', async (req, res) => {
    const postUrl = req.query.url;
    if (!postUrl) {
        return res.status(400).json({ status: false, message: 'කරුණාකර SubtitleCat URL එකක් ලබා දෙන්න. (?url=...)' });
    }

    try {
        const { data } = await axios.get(postUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const title = $('h1').first().text().trim() || $('title').text().trim() || 'Title Not Found';
        const downloadLinks = [];

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            let langText = $(el).text().trim();

            if (href && href.length > 1 && !href.startsWith('javascript') && !href.startsWith('#')) {
                // මෙතනදී තමයි '../download/xyz.srt' වගේ ඒව පිරිසිදු direct links බවට පත් කරන්නේ
                const absoluteUrl = new URL(href, postUrl).href;

                // SubtitleCat එකේ භාෂා පිටු හෝ direct download ලින්ක්ස් අහුලා ගැනීම
                const isDownloadOrLangPage = absoluteUrl.includes('/download/') || 
                                             absoluteUrl.endsWith('.srt') || 
                                             absoluteUrl.endsWith('.vtt') ||
                                             absoluteUrl.includes('/subs/') ||
                                             langText.toLowerCase().includes('download') ||
                                             $(el).attr('id') === 'download';

                const isJunk = absoluteUrl.includes('privacy.html') || 
                               absoluteUrl.includes('disclaimer.html') || 
                               absoluteUrl.includes('contact.html') || 
                               absoluteUrl.includes('dmca.html') || 
                               absoluteUrl.includes('index.html');

                if (isDownloadOrLangPage && !isJunk) {
                    if (!langText) langText = `Link ${downloadLinks.length + 1}`;
                    
                    if (!downloadLinks.some(item => item.link === absoluteUrl)) {
                        downloadLinks.push({
                            language: langText,
                            link: absoluteUrl
                        });
                    }
                }
            }
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: {
                title,
                total_links: downloadLinks.length,
                links: downloadLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'තොරතුරු ලබාගැනීම අසාර්ථක විය!', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`SubtitleCat API running on port ${PORT}`);
});

export default app;
