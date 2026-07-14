import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Base Route
app.get('/', (req, res) => {
    res.json({ status: true, message: 'Zoom.lk Scraper API is Running!' });
});

// 1. Search Endpoint (?q=movie_name)
app.get('/api/zoom/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ status: false, message: 'සෙවිය යුතු නම ඇතුලත් කරන්න. (?q=...)' });
    }

    try {
        // Zoom.lk WordPress Search URL
        const searchUrl = `https://zoom.lk/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS });
        const $ = cheerio.load(data);
        const results = [];

        // සයිට් එකේ Search Results Cards/Articles loop කිරීම
        $('article, .post-item, .grid-item').each((index, element) => {
            const title = $(element).find('.entry-title a, .post-title a, h2 a').first().text().trim();
            const link = $(element).find('.entry-title a, .post-title a, h2 a').first().attr('href');
            const img = $(element).find('img').first().attr('src');
            const desc = $(element).find('.entry-summary, .post-excerpt, p').first().text().trim();

            if (title && link) {
                results.push({
                    title,
                    desc: desc.substring(0, 120) + '...', // ලොකු විස්තර කෙටි කිරීම
                    image: img || null,
                    url: link
                });
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

// 2. Info + Direct Download Link Endpoint (?url=post_url)
app.get('/api/zoom/download', async (req, res) => {
    const postUrl = req.query.url;
    if (!postUrl) {
        return res.status(400).json({ status: false, message: 'කරුණාකර Zoom.lk Post URL එකක් ලබා දෙන්න. (?url=...)' });
    }

    try {
        const { data } = await axios.get(postUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const title = $('.entry-title, .post-title, h1').first().text().trim();
        const mainImage = $('.entry-content img, .post-content img').first().attr('src');
        
        // සම්පූර්ණ විස්තරය එකතු කරගැනීම
        let description = '';
        $('.entry-content p, .post-content p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 0 && !text.includes('Download') && !text.includes('බාගත')) {
                description += text + '\n';
            }
        });

        // Smart Download Link Finder
        // Zoom.lk වල සාමාන්‍යයෙන් Subtitle file එක zip එකක් විදිහට direct attachment එකක් හෝ Button එකක් ලෙස තියෙන්නේ.
        const downloadLinks = [];
        
        $('.entry-content a, .post-content a').each((i, el) => {
            const href = $(el).attr('href');
            const linkText = $(el).text().trim();

            if (href) {
                // Zip, Rar ෆයිල් හෝ attachment බටන් ටාගට් කිරීම
                const isZip = href.endsWith('.zip') || href.endsWith('.rar');
                const isDownloadBtn = href.includes('download') || href.includes('wp-content/uploads') || linkText.includes('Download') || linkText.includes('බාගත');

                if (isZip || isDownloadBtn) {
                    // ඩප්ලිකේට් ලින්ක් අයින් කිරීමට
                    if (!downloadLinks.some(item => item.link === href)) {
                        downloadLinks.push({
                            name: linkText || `Download Subtitle Link ${i + 1}`,
                            link: href
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
                image: mainImage || null,
                info: description.trim(),
                download_links: downloadLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'තොරතුරු ලබාගැනීම අසාර්ථක විය!', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Zoom.lk API එක port ${PORT} එකේ වැඩ කරන් යනවා...`);
});

