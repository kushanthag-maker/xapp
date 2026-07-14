import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = 'https://cartoons.lk';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
    'Referer': 'https://cartoons.lk/',
    'Connection': 'keep-alive'
};

// Junk Assets (කුණු ලින්ක්ස්) සෙවීම සහ ඉවත් කිරීමේ ලැයිස්තුව
const JUNK_KEYWORDS = [
    'xmlrpc', 'wp-json', 'wp-content/uploads', 'googletagmanager', 'googleapis', 
    'fonts.gstatic', 'wp-includes', 'theme', 'plugins', '.css', '.js', '.png', 
    '.jpg', '.webp', '.svg', 'feed', 'schema.org', 'ogp.me', 'facebook.com', 
    'twitter.com', 'instagram.com', 'whatsapp.com', 't.me/cartooonslk', '#respond', 
    'about-us', 'contact-us', 'privacy-policy', 'terms-and-conditions', 'invoke.js',
    'cybersofty.com', 'madeupvigourpoll.com', 'troopinvariably.com'
];

app.get('/', (req, res) => {
    res.json({ status: true, message: 'Beast Mode Universal Scraper Engine Active!' });
});

// 1. Search Endpoint
app.get('/api/cartoons/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ status: false, message: 'සෙවිය යුතු නම ඇතුලත් කරන්න. (?q=...)' });
    
    try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS });
        const $ = cheerio.load(data);
        const results = [];

        $('article, .post, .blog-post, .post-item').each((index, element) => {
            const titleEl = $(element).find('h2 a, h1 a, .entry-title a, .post-title a, a').first();
            const title = titleEl.text().trim();
            let link = titleEl.attr('href');
            let thumb = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');

            if (link && !link.startsWith('http')) link = new URL(link, BASE_URL).href;
            if (title && link && !results.some(item => item.url === link)) {
                results.push({ title, url: link, thumbnail: thumb || null });
            }
        });
        res.json({ status: true, creator: 'Sandaru Udan', total_results: results.length, results });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error', error: error.message });
    }
});

// 2. The Heavy-Filter Ultimate Download Link Harvester
app.get('/api/cartoons/download', async (req, res) => {
    const postUrl = req.query.url;
    if (!postUrl) return res.status(400).json({ status: false, message: 'කරුණාකර URL එකක් ලබා දෙන්න. (?url=...)' });

    try {
        const { data } = await axios.get(postUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const title = $('h1.entry-title, h1, title').first().text().replace(' - Cartoons.lk', '').trim();
        let mainThumb = $('meta[property="og:image"]').attr('content') || $('.post-thumbnail img').first().attr('src') || null;

        const foundLinks = new Set();
        const downloadLinks = [];

        // Validation සහ Smart Filtering Function එක
        const processAndAddLink = (url, fallbackName) => {
            if (!url || typeof url !== 'string' || url.startsWith('#') || url.startsWith('javascript')) return;
            
            try {
                let absoluteUrl = url.startsWith('http') || url.startsWith('//') ? url : new URL(url, postUrl).href;
                if (absoluteUrl.startsWith('//')) absoluteUrl = 'https:' + absoluteUrl;

                // කුණු ලින්ක් එකක්ද කියා පරීක්ෂා කිරීම
                const isJunk = JUNK_KEYWORDS.some(keyword => absoluteUrl.toLowerCase().includes(keyword)) || 
                               absoluteUrl === postUrl || absoluteUrl === postUrl + '/';

                if (!isJunk && !foundLinks.has(absoluteUrl)) {
                    foundLinks.add(absoluteUrl);
                    
                    let finalName = fallbackName ? fallbackName.replace(/\s+/g, ' ').trim() : '';
                    
                    // ඩොමේන් එක අනුව ලස්සනට නම සකස් කිරීම
                    if (absoluteUrl.includes('pixeldrain.com')) finalName = `Pixeldrain (HD Quality)`;
                    else if (absoluteUrl.includes('mega.nz')) finalName = `Mega.nz (Fast Download)`;
                    else if (absoluteUrl.includes('drive.google.com')) finalName = `Google Drive (Direct)`;
                    else if (absoluteUrl.includes('mediafire.com')) finalName = `Mediafire (Direct)`;
                    else if (absoluteUrl.includes('gofile.io')) finalName = `Gofile Premium`;
                    else if (!finalName || finalName.length > 40) finalName = `Download Link ${downloadLinks.length + 1}`;

                    downloadLinks.push({ name: finalName, link: absoluteUrl });
                }
            } catch (e) {}
        };

        // STAGE 1: මුළු HTML එකේම ඇති Attributes පීරීම
        $('*').each((index, element) => {
            const attribs = element.attribs;
            const text = $(element).text().trim();
            for (const key in attribs) {
                if (attribs[key] && (attribs[key].startsWith('http') || attribs[key].startsWith('/') || attribs[key].startsWith('//'))) {
                    processAndAddLink(attribs[key], text);
                }
            }
        });

        // STAGE 2: Core Text Regex Scan (Plain / Script Text)
        const rawHtml = $.html();
        const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/gi;
        let match;
        while ((match = urlRegex.exec(rawHtml)) !== null) {
            processAndAddLink(match[1].replace(/\\/g, ''), '');
        }

        // STAGE 3: WordPress Ajax & Shortcode Form Interceptor 
        // (සයිට් එකේ hidden buttons/forms තිබේ නම් ඒවායේ values ඇද ගැනීම)
        $('form, div[class*="download"], a[class*="download"]').each((i, el) => {
            const dataId = $(el).attr('data-id') || $(el).attr('data-pid') || $(el).attr('value');
            if (dataId && !isNaN(dataId)) {
                // සයිට් එකේ bypass endpoint එකක් ඩයිනමික්ව නිර්මාණය කිරීම
                processAndAddLink(`${BASE_URL}/?wpdmdl=${dataId}`, `WPDM Package ID: ${dataId}`);
            }
        });

        // Cloud Links උඩටම සෝට් කිරීම
        downloadLinks.sort((a, b) => {
            const targets = ['pixeldrain', 'mega', 'drive', 'mediafire', 'wpdmdl'];
            const aTarget = targets.some(t => a.link.toLowerCase().includes(t));
            const bTarget = targets.some(t => b.link.toLowerCase().includes(t));
            return bTarget - aTarget;
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: {
                title,
                thumbnail: mainThumb,
                total_links: downloadLinks.length,
                links: downloadLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'Error', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Beast Engine running on port ${PORT}`);
});

export default app;
