import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://cineflix-lk.vercel.app';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`
};

app.get('/', (req, res) => {
    res.json({ status: true, message: 'Cineflix Ultra-API Network Interceptor Engine is Active!', creator: 'Sandaru Udan' });
});

// ==========================================================
// 1. ADVANCED BACKEND API PROBER & MOVIE SEARCH
// ==========================================================
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ status: false, message: 'සෙවිය යුතු නම ඇතුලත් කරන්න. (?q=...)' });

    // සයිට් එකේ තිබිය හැකි විය හැකි රහස් backend API endpoints ලැයිස්තුව
    const targetEndpoints = [
        `${BASE_URL}/api/movies`,
        `${BASE_URL}/api/search?q=${encodeURIComponent(query)}`,
        `${BASE_URL}/api/search?query=${encodeURIComponent(query)}`,
        `${BASE_URL}/api/all`,
        `${BASE_URL}/api/posts`
    ];

    let rawJsonData = null;

    // හැම endpoint එකකටම රහසිගතව request යවා ඩේටා ඇද ගැනීමට උත්සාහ කිරීම
    for (const url of targetEndpoints) {
        try {
            const response = await axios.get(url, { headers: HEADERS, timeout: 4000 });
            if (response.data && (Array.isArray(response.data) || typeof response.data === 'object')) {
                rawJsonData = response.data;
                break; // ඩේටා හමු වූ සැනින් ලූප් එක නතර කරයි
            }
        } catch (e) {}
    }

    const results = [];

    // ක්‍රමය A: සර්වර් එකෙන් කෙලින්ම JSON ඩේටා බ්ලොක් එකක් අහුවුනොත් ( foolproof recursive extractor )
    if (rawJsonData) {
        const parseDeepJSON = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
                obj.forEach(item => parseDeepJSON(item));
            } else if (typeof obj === 'object') {
                const title = obj.title || obj.name || obj.movieName;
                const id = obj.id || obj.slug || obj._id;
                
                if (title && id) {
                    const matched = title.toLowerCase().includes(query.toLowerCase());
                    if (matched) {
                        results.push({
                            title: title,
                            url: id.startsWith('http') ? id : `${BASE_URL}/movie/${id}`,
                            thumbnail: obj.poster || obj.thumbnail || obj.image || obj.img || null
                        });
                    }
                }
                for (const key in obj) {
                    if (typeof obj[key] === 'object') parseDeepJSON(obj[key]);
                }
            }
        };
        parseDeepJSON(rawJsonData);
    }

    // ක්‍රමය B: Fallback HTML Scraping (HTML එක ඇතුලෙම Next.js data state එකක් තිබුනොත්)
    if (results.length === 0) {
        try {
            const { data: html } = await axios.get(`${BASE_URL}/search?q=${encodeURIComponent(query)}`, { headers: HEADERS });
            const $ = cheerio.load(html);
            
            // Next.js Hydration Data check
            const nextData = $('#__NEXT_DATA__').html();
            if (nextData) {
                const parsed = JSON.parse(nextData);
                const items = parsed.props?.pageProps?.movies || parsed.props?.pageProps?.initialState?.movies || [];
                items.forEach(m => {
                    if ((m.title || m.name) && (m.title || m.name).toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                            title: m.title || m.name,
                            url: `${BASE_URL}/movie/${m.slug || m.id}`,
                            thumbnail: m.poster || m.image || null
                        });
                    }
                });
            }

            // සාමාන්‍ය HTML anchor tags scan කිරීම
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && (href.includes('/movie') || href.includes('/watch') || href.includes('/details'))) {
                    if (text.toLowerCase().includes(query.toLowerCase())) {
                        const absUrl = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
                        results.push({ title: text, url: absUrl, thumbnail: $(el).find('img').attr('src') || null });
                    }
                }
            });
        } catch (e) {}
    }

    // ඩූපිලිකේට් Urls ඉවත් කිරීම
    const uniqueResults = [];
    const seenUrls = new Set();
    results.forEach(item => {
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
});

// ==========================================================
// 2. BACKEND DEEP LINK & EMBED EXTRACTOR
// ==========================================================
app.get('/api/download', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ status: false, message: 'URL එක ලබා දෙන්න. (?url=...)' });

    try {
        // මූවී එකේ slug/id එක වෙන් කරගැනීම
        const slug = targetUrl.split('/').pop();
        
        // මූවී එකේ විස්තර සහ ලින්ක්ස් තියෙන්න පුළුවන් backend endpoints
        const detailEndpoints = [
            `${BASE_URL}/api/movie/${slug}`,
            `${BASE_URL}/api/movie?id=${slug}`,
            targetUrl
        ];

        let movieDetails = null;
        let htmlContent = '';

        for (const url of detailEndpoints) {
            try {
                const res = await axios.get(url, { headers: HEADERS, timeout: 3000 });
                if (typeof res.data === 'object') {
                    movieDetails = res.data;
                    break;
                } else if (typeof res.data === 'string') {
                    htmlContent = res.data;
                }
            } catch (e) {}
        }

        const downloadLinks = [];
        const uniqueLinks = new Set();

        const addValidLink = (url, name) => {
            if (!url || typeof url !== 'string' || url.startsWith('#') || url.startsWith('javascript')) return;
            if (!url.startsWith('http') && !url.startsWith('//') && !url.startsWith('/')) return;
            
            try {
                let absUrl = url.startsWith('http') || url.startsWith('//') ? url : new URL(url, BASE_URL).href;
                if (absUrl.startsWith('//')) absUrl = 'https:' + absUrl;

                const isJunk = ['vercel.app', 'github', 'facebook', 'instagram', 'twitter', '.css', '.svg'].some(k => absUrl.toLowerCase().includes(k));
                
                if (!isJunk && !uniqueLinks.has(absUrl)) {
                    uniqueLinks.add(absUrl);
                    let cleanName = name ? name.replace(/\s+/g, ' ').trim() : '';
                    if (!cleanName || cleanName.length > 40) {
                        if (absUrl.includes('pixeldrain.com')) cleanName = 'Pixeldrain Direct';
                        else if (absUrl.includes('mega.nz')) cleanName = 'Mega.nz Cloud';
                        else if (absUrl.includes('drive.google')) cleanName = 'Google Drive';
                        else cleanName = `Download Link ${downloadLinks.length + 1}`;
                    }
                    downloadLinks.push({ name: cleanName, link: absUrl });
                }
            } catch (e) {}
        };

        // ක්‍රමය A: Backend JSON එකක් ලැබුනේ නම් එයින් ලින්ක්ස් ඇදීම
        if (movieDetails) {
            const scanForUrls = (obj) => {
                if (!obj) return;
                if (typeof obj === 'string') {
                    if (obj.includes('http') || obj.includes('pixeldrain') || obj.includes('mega')) {
                        const urlMatch = obj.match(/(https?:\/\/[^\s"'`<>\\#]+)/i);
                        if (urlMatch) addValidLink(urlMatch[1], '');
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach(i => scanForUrls(i));
                } else if (typeof obj === 'object') {
                    // direct properties check
                    if (obj.link || obj.url || obj.downloadLink || obj.embed) {
                        addValidLink(obj.link || obj.url || obj.downloadLink || obj.embed, obj.quality || obj.name || '');
                    }
                    for (const k in obj) scanForUrls(obj[k]);
                }
            };
            scanForUrls(movieDetails);
        }

        // ක්‍රමය B: HTML එක පීරීම (If JSON probe fails)
        if (htmlContent || !movieDetails) {
            const $ = cheerio.load(htmlContent || htmlContent);
            $('*').each((i, el) => {
                const attrs = el.attribs;
                for (const k in attrs) {
                    if (attrs[k] && (attrs[k].startsWith('http') || attrs[k].startsWith('/') || attrs[k].startsWith('//'))) {
                        addValidLink(attrs[k], $(el).text());
                    }
                }
            });

            const rawText = htmlContent;
            const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/gi;
            let match;
            while ((match = urlRegex.exec(rawText)) !== null) {
                addValidLink(match[1].replace(/\\/g, ''), '');
            }
        }

        // Cloud Links උඩටම සෝට් කිරීම
        downloadLinks.sort((a, b) => {
            const targets = ['pixeldrain', 'mega', 'drive'];
            return targets.some(t => b.link.toLowerCase().includes(t)) - targets.some(t => a.link.toLowerCase().includes(t));
        });

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: {
                title: movieDetails?.title || movieDetails?.name || 'Cineflix Movie',
                thumbnail: movieDetails?.poster || movieDetails?.image || null,
                total_links: downloadLinks.length,
                links: downloadLinks
            }
        });

    } catch (error) {
        res.status(500).json({ status: false, message: 'ලින්ක්ස් ලබාගැනීම අසාර්ථක විය.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n⚡ CINEFLIX BEAST INTERCEPTOR ENGINE IS LIVE ⚡`);
    console.log(`Test URL: http://localhost:${PORT}/api/search?q=Ben%2010`);
    console.log(`================================================\n`);
});
