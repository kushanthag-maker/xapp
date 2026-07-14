import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://cineflix-lk.vercel.app';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
    'Referer': 'https://cineflix-lk.vercel.app/'
};

// කුණු ලින්ක්ස් සහ ඇසෙට්ස් ඉවත් කිරීමට භාවිත කරන කීවර්ඩ්ස්
const IGNORE_KEYWORDS = [
    'vercel.app', 'github.com', 'facebook.com', 'twitter.com', 'instagram.com',
    '.css', '.js', '.svg', '.png', '.jpg', 'fonts.googleapis', 'schema.org'
];

app.get('/', (req, res) => {
    res.json({ 
        status: true, 
        message: 'Cineflix-LK Advanced Hybrid API Engine is Running Live!',
        creator: 'Sandaru Udan'
    });
});

// ==========================================
// 1. SMART MOVIE SEARCH ENDPOINT
// ==========================================
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ status: false, message: 'සෙවිය යුතු චිත්‍රපටයේ නම ලබා දෙන්න. (?q=...)' });
    }

    try {
        // සෙවීම් සිදු කරන පොදු ක්‍රම 2ක්ම එකවර ටෙස්ට් කිරීම
        const searchUrls = [
            `${BASE_URL}/search?q=${encodeURIComponent(query)}`,
            `${BASE_URL}/?s=${encodeURIComponent(query)}`
        ];
        
        let htmlData = '';
        for (const url of searchUrls) {
            try {
                const response = await axios.get(url, { headers: HEADERS, timeout: 5000 });
                if (response.data) {
                    htmlData = response.data;
                    break;
                }
            } catch (e) {}
        }

        if (!htmlData) {
            return res.status(404).json({ status: false, message: 'සෙවුම් ප්‍රතිඵල කිසිවක් හමු නොවීය.' });
        }

        const $ = cheerio.load(htmlData);
        const results = [];

        // ක්‍රමය A: Next.js JSON Data State එකක් තිබේ නම් එයින් සෘජුවම දත්ත ගැනීම
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            try {
                const parsed = JSON.parse(nextData);
                const items = parsed.props?.pageProps?.movies || parsed.props?.pageProps?.results || [];
                items.forEach(item => {
                    if (item.title || item.name) {
                        results.push({
                            title: item.title || item.name,
                            url: item.slug ? `${BASE_URL}/movie/${item.slug}` : `${BASE_URL}/details/${item.id}`,
                            thumbnail: item.poster || item.thumbnail || item.image || null
                        });
                    }
                });
            } catch (e) {}
        }

        // ක්‍රමය B: Cheerio Card Elements පිරික්සීම (Fallback HTML Crawler)
        if (results.length === 0) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const titleText = $(el).text().trim() || $(el).find('h2, h3, p, .title').text().trim();
                let img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

                if (href && (href.includes('/movie/') || href.includes('/details/') || href.includes('/watch/'))) {
                    const absUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
                    if (titleText && !results.some(r => r.url === absUrl)) {
                        results.push({
                            title: titleText.replace(/\n/g, ' ').replace(/\s+/g, ' '),
                            url: absUrl,
                            thumbnail: img || null
                        });
                    }
                }
            });
        }

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            total_results: results.length,
            results
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'සෙවීම අසාර්ථක විය.', error: error.message });
    }
});

// ==========================================
// 2. MOVIE INFO & DIRECT DOWNLOAD HARVESTER
// ==========================================
app.get('/api/download', async (req, res) => {
    const movieUrl = req.query.url;
    if (!movieUrl) {
        return res.status(400).json({ status: false, message: 'කරුණාකර චිත්‍රපටයේ URL එකක් ලබා දෙන්න. (?url=...)' });
    }

    try {
        const { data } = await axios.get(movieUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        // චිත්‍රපටයේ මූලික විස්තර (Info) ලබා ගැනීම
        const title = $('h1, .movie-title, title').first().text().trim();
        let thumbnail = $('meta[property="og:image"]').attr('content') || $('.poster img, .movie-cover img').first().attr('src') || null;
        if (thumbnail && !thumbnail.startsWith('http')) thumbnail = new URL(thumbnail, BASE_URL).href;

        const description = $('meta[name="description"]').attr('content') || $('.description, .plot, .entry-content p').first().text().trim() || '';

        const downloadLinks = [];
        const uniqueLinks = new Set();

        const addLink = (url, name) => {
            if (!url || typeof url !== 'string' || url.startsWith('#') || url.startsWith('javascript')) return;
            try {
                let absUrl = url.startsWith('http') || url.startsWith('//') ? url : new URL(url, movieUrl).href;
                if (absUrl.startsWith('//')) absUrl = 'https:' + absUrl;

                const isJunk = IGNORE_KEYWORDS.some(k => absUrl.toLowerCase().includes(k)) || absUrl === movieUrl;

                if (!isJunk && !uniqueLinks.has(absUrl)) {
                    uniqueLinks.add(absUrl);
                    
                    let cleanName = name ? name.replace(/\s+/g, ' ').trim() : '';
                    if (!cleanName || cleanName.length > 50) {
                        if (absUrl.includes('pixeldrain.com')) cleanName = 'Pixeldrain Link (HD)';
                        else if (absUrl.includes('mega.nz')) cleanName = 'Mega.nz Link';
                        else if (absUrl.includes('drive.google.com')) cleanName = 'Google Drive';
                        else if (absUrl.includes('mediafire.com')) cleanName = 'Mediafire';
                        else cleanName = `Download/Stream Link ${downloadLinks.length + 1}`;
                    }

                    downloadLinks.push({ name: cleanName, link: absUrl });
                }
            } catch (e) {}
        };

        // STAGE 1: HTML Element Attributes ස්කෑන් කිරීම
        $('*').each((i, el) => {
            const attrs = el.attribs;
            const txt = $(el).text().trim();
            for (const key in attrs) {
                const val = attrs[key];
                if (val && (val.startsWith('http') || val.startsWith('/') || val.startsWith('//'))) {
                    if (key === 'href' || key === 'src' || key === 'data-url' || key === 'data-link') {
                        addLink(val, txt);
                    }
                }
            }
        });

        // STAGE 2: Core Deep Content Regex Parser (Scripts & Objects අස්සේ ඇති ලින්ක්ස්)
        const rawHtml = $.html();
        const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/gi;
        let match;
        while ((match = urlRegex.exec(rawHtml)) !== null) {
            addLink(match[1].replace(/\\/g, ''), '');
        }

        // STAGE 3: Cloud / Streaming Source Sorting (වටිනා ලින්ක්ස් උඩට ගැනීම)
        downloadLinks.sort((a, b) => {
            const targets = ['pixeldrain', 'mega', 'drive', 'mediafire', 'embed', 'player'];
            const aTarget = targets.some(t => a.link.toLowerCase().includes(t));
            const bTarget = targets.some(t => b.link.toLowerCase().includes(t));
            return bTarget - aTarget;
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: {
                title,
                thumbnail,
                description,
                total_links: downloadLinks.length,
                links: downloadLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'තොරතුරු ලබාගැනීම අසාර්ථක විය.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n==== CINEFLIX-LK HYBRID ENGINE RUNNING ====`);
    console.log(`Local Server: http://localhost:${PORT}`);
    console.log(`Search Test : http://localhost:${PORT}/api/search?q=Batman`);
    console.log(`===========================================\n`);
});
