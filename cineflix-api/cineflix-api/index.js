import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://cineflix-lk.vercel.app';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
    'Referer': 'https://cineflix-lk.vercel.app/'
};

// කුණු ලින්ක්ස් අයින් කරන්න
const JUNK_KEYWORDS = ['vercel.app', 'github', 'facebook', 'twitter', 'instagram', '.css', '.svg', 'schema.org'];

app.get('/', (req, res) => {
    res.json({ status: true, message: 'Cineflix-LK SPA Deep-Interceptor Engine is Live!', creator: 'Sandaru Udan' });
});

// ==========================================================
// 1. DYNAMIC SEARCH + DEEP JS BUNDLE INTERCEPTOR (ALL IN ONE)
// ==========================================================
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ status: false, message: 'සෙවිය යුතු නම ඇතුලත් කරන්න. (?q=...)' });

    try {
        // 1. ප්‍රධාන HTML එක ලෝඩ් කරගැනීම
        const { data: html } = await axios.get(BASE_URL, { headers: HEADERS });
        const $ = cheerio.load(html);
        
        const masterCatalog = [];
        const checkedScripts = new Set();

        // 2. HTML එක ඇතුලෙන් සහ පිටතින් ලින්ක් කර ඇති සේරම JS Script Bundles සොයාගැනීම
        const scriptUrls = [];
        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                const absSrc = src.startsWith('http') ? src : new URL(src, BASE_URL).href;
                if (!absSrc.includes('analytics') && !absSrc.includes('google')) {
                    scriptUrls.push(absSrc);
                }
            }
        });

        // 3. Inline Scripts වල තියෙන දත්ත මුලින්ම ස්කෑන් කිරීම
        $('script').each((i, el) => {
            const content = $(el).html();
            if (content) parseJsContent(content, masterCatalog);
        });

        // 4. External JS Bundles (Vite/Next Assets) එකින් එක ඩවුන්ලෝඩ් කරමින් ඇතුලාන්තය පීරීම
        for (const url of scriptUrls) {
            if (checkedScripts.has(url)) continue;
            checkedScripts.add(url);
            try {
                const { data: jsContent } = await axios.get(url, { headers: HEADERS, timeout: 4000 });
                if (jsContent) parseJsContent(jsContent, masterCatalog);
            } catch (e) {}
        }

        // 5. HTML Tags අස්සෙන් අහුවෙන සාමාන්‍ය දත්ත එකතු කිරීම (Fallback)
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const txt = $(el).text().trim() || $(el).find('img').attr('alt');
            if (href && (href.includes('/movie') || href.includes('/details') || href.includes('/watch'))) {
                const absUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
                if (txt && !masterCatalog.some(m => m.url === absUrl)) {
                    masterCatalog.push({ title: txt, url: absUrl, thumbnail: $(el).find('img').attr('src') || null });
                }
            }
        });

        // 6. පරිශීලකයා සෙවූ නමට (Query) අනුව In-Memory පෙරීම සිදු කිරීම
        const filteredResults = masterCatalog.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase()) || 
            (item.url && item.url.toLowerCase().includes(query.toLowerCase()))
        );

        // ඩූපිලිකේට් අයින් කිරීම
        const uniqueResults = [];
        const seenUrls = new Set();
        filteredResults.forEach(item => {
            if (!seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                uniqueResults.push(item);
            }
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            total_results: uniqueResults.length,
            results: uniqueResults
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'සෙවීම අසාර්ථක විය.', error: error.message });
    }
});

// ==========================================================
// 2. UNIVERSAL DOWLOAD LINK & INFO HARVESTER
// ==========================================================
app.get('/api/download', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: false, message: 'URL එක ලබා දෙන්න. (?url=...)' });

    try {
        const { data: html } = await axios.get(targetUrl, { headers: HEADERS });
        const $ = cheerio.load(html);

        const title = $('h1, title').first().text().trim();
        let thumbnail = $('meta[property="og:image"]').attr('content') || null;

        const downloadLinks = [];
        const uniqueLinks = new Set();

        const addValidLink = (url, name) => {
            if (!url || typeof url !== 'string' || url.startsWith('#') || url.startsWith('javascript')) return;
            try {
                let absUrl = url.startsWith('http') || url.startsWith('//') ? url : new URL(url, targetUrl).href;
                if (absUrl.startsWith('//')) absUrl = 'https:' + absUrl;

                const isJunk = JUNK_KEYWORDS.some(k => absUrl.toLowerCase().includes(k));
                if (!isJunk && !uniqueLinks.has(absUrl)) {
                    uniqueLinks.add(absUrl);
                    
                    let cleanName = name ? name.replace(/\s+/g, ' ').trim() : '';
                    if (!cleanName || cleanName.length > 40) {
                        if (absUrl.includes('pixeldrain.com')) cleanName = 'Pixeldrain High-Speed';
                        else if (absUrl.includes('mega.nz')) cleanName = 'Mega.nz Cloud';
                        else if (absUrl.includes('drive.google')) cleanName = 'Google Drive';
                        else cleanName = `Download Link ${downloadLinks.length + 1}`;
                    }
                    downloadLinks.push({ name: cleanName, link: absUrl });
                }
            } catch (e) {}
        };

        // සයිට් එකේ මුළු HTML එක සහ Script කෑලි සේරම පීරීම
        $('*').each((i, el) => {
            const attrs = el.attribs;
            for (const k in attrs) {
                if (attrs[k] && (attrs[k].startsWith('http') || attrs[k].startsWith('/') || attrs[k].startsWith('//'))) {
                    addValidLink(attrs[k], $(el).text());
                }
            }
        });

        const rawContent = $.html();
        const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/gi;
        let match;
        while ((match = urlRegex.exec(rawContent)) !== null) {
            addValidLink(match[1].replace(/\\/g, ''), '');
        }

        // වටිනා ලින්ක්ස් උඩට ගැනීම
        downloadLinks.sort((a, b) => {
            const targets = ['pixeldrain', 'mega', 'drive'];
            return targets.some(t => b.link.toLowerCase().includes(t)) - targets.some(t => a.link.toLowerCase().includes(t));
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: { title, thumbnail, total_links: downloadLinks.length, links: downloadLinks }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'ලින්ක්ස් ලබාගැනීම අසාර්ථක විය.', error: error.message });
    }
});

// JavaScript String එකක් ඇතුලෙන් Movies දත්ත වෙන් කරගන්නා Helper Function එක
function parseJsContent(text, catalog) {
    // 1. JS Object රටා හඳුනාගැනීම (Title, Slug/URL, Image රටා)
    const movieBlockRegex = /\{(?:[^{}]*?)(?:title|name)\s*:\s*["'`]([^"'`]+)["'`](?:[^{}]*?)(?:slug|id|url)\s*:\s*["'`]([^"'`]+)["'`](?:[^{}]*?)\}/gi;
    let match;
    while ((match = movieBlockRegex.exec(text)) !== null) {
        const title = match[1];
        let slug = match[2];
        let movieUrl = slug.startsWith('http') ? slug : `${BASE_URL}/movie/${slug}`;
        
        if (title && slug && !movieUrl.includes('http://') && !movieUrl.includes('https://localhost')) {
            catalog.push({ title, url: movieUrl, thumbnail: null });
        }
    }

    // 2. Direct Cloud Links JS එක ඇතුලේ තිබුණොත් ඒවාත් කැටලොග් එකට ඇදීම
    const directUrlRegex = /(https?:\/\/pixeldrain\.com\/u\/[a-zA-Z0-9]+|https?:\/\/mega\.nz\/file\/[a-zA-Z0-9#-_]+)/gi;
    let urlMatch;
    while ((urlMatch = directUrlRegex.exec(text)) !== null) {
        catalog.push({
            title: `Cineflix Video Link (${catalog.length + 1})`,
            url: urlMatch[1],
            thumbnail: null
        });
    }
}

app.listen(PORT, () => {
    console.log(`\n🔥 CINEFLIX SPA INTERCEPTOR RUNNING LIVE! 🔥`);
    console.log(`URL: http://localhost:${PORT}/api/search?q=Ben%2010`);
    console.log(`===========================================\n`);
});
