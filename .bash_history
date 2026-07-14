            }
        });
        res.json({ status: true, creator: 'Sandaru Udan', total_results: results.length, results });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error', error: error.message });
    }
});

// 2. Deep Harvester Download Endpoint
app.get('/api/cartoons/download', async (req, res) => {
    const postUrl = req.query.url;
    if (!postUrl) {
        return res.status(400).json({ status: false, message: 'කරුණාකර URL එකක් ලබා දෙන්න. (?url=...)' });
    }

    try {
        const { data } = await axios.get(postUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const title = $('h1.entry-title, h1, title').first().text().replace(' - Cartoons.lk', '').trim();
        
        // Thumbnail එක නිවැරදිව ලබාගැනීම
        let mainThumb = $('.post-thumbnail img, .entry-content img, .wp-post-image').first().attr('src') || 
                        $('.entry-content img').first().attr('data-src');
        if (!mainThumb || mainThumb.startsWith('data:image')) {
            mainThumb = $('meta[property="og:image"]').attr('content') || null;
        }

        const downloadLinks = [];
        const rawHtml = $.html();

        // ක්‍රමය 1: ප්‍රධාන Content Area එකේ තියෙන සියලුම සැබෑ ලින්ක්ස් එකතු කිරීම
        $('#content, #main, main, article, .entry-content, .post-content, .inside-article').find('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href && href.length > 1 && !href.startsWith('#') && !href.startsWith('javascript')) {
                try {
                    const absoluteUrl = new URL(href, postUrl).href;

                    // අනවශ්‍ය සමාජ මාධ්‍ය සහ Junk ලින්ක්ස් ෆිල්ටර් කර හැරීම
                    const isJunk = absoluteUrl.includes('facebook.com') || 
                                   absoluteUrl.includes('t.me') || 
                                   absoluteUrl.includes('telegram') ||
                                   absoluteUrl.includes('whatsapp.com') || 
                                   absoluteUrl.includes('twitter.com') ||
                                   absoluteUrl.includes('/category/') || 
                                   absoluteUrl.includes('/tag/') ||
                                   absoluteUrl.includes('#respond') ||
                                   absoluteUrl === postUrl;

                    if (!isJunk && !downloadLinks.some(item => item.link === absoluteUrl)) {
                        downloadLinks.push({
                            name: text || $(el).attr('title') || `Episode Link ${downloadLinks.length + 1}`,
                            link: absoluteUrl
                        });
                    }
                } catch (e) {}
            }
        });

        // ක්‍රමය 2: Inline JavaScript ටැග්ස් අස්සේ හංගලා තියෙන සැබෑ Cloud/Media ලින්ක්ස් ඇදලා ගැනීම
        $('script').each((i, el) => {
            const scriptContent = $(el).html();
            if (scriptContent) {
                const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/g;
                let match;
                while ((match = urlRegex.exec(scriptContent)) !== null) {
                    const foundUrl = match[1].replace(/\\/g, ''); // Clean escaped slashes
                    
                    const isTargetCloud = foundUrl.includes('pixeldrain.com') || 
                                          foundUrl.includes('mega.nz') || 
                                          foundUrl.includes('drive.google.com') || 
                                          foundUrl.includes('mediafire.com') ||
                                          foundUrl.includes('/download/');

                    if (isTargetCloud && !downloadLinks.some(item => item.link === foundUrl)) {
                        downloadLinks.push({
                            name: `Dynamic Episode Link ${downloadLinks.length + 1}`,
                            link: foundUrl
                        });
                    }
                }
            }
        });

        // ක්‍රමය 3: සයිට් එකේ Form Actions (ඩවුන්ලෝඩ් ගේට්වේස්) තිබුණොත් ඒවා ගැනීම
        $('form').each((i, el) => {
            const action = $(el).attr('action');
            if (action && action.length > 5) {
                try {
                    const absAction = new URL(action, postUrl).href;
                    if (!downloadLinks.some(item => item.link === absAction)) {
                        downloadLinks.push({
                            name: `Download Portal Redirect (${i + 1})`,
                            link: absAction
                        });
                    }
                } catch (e) {}
            }
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
        res.status(500).json({ status: false, message: 'තොරතුරු ලබාගැනීම අසාර්ථක විය!', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Cartoons.lk Deep Harvester running on port ${PORT}`);
});

export default app;
EOF

node index.js
cat << 'EOF' > index.js
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

// Base64 ලින්ක්ස් අඳුනාගෙන Decode කරන හෙල්පර් ෆන්ක්ෂන් එක
function decodeBase64Urls(text) {
    const urls = [];
    if (!text || typeof text !== 'string') return urls;
    
    // Base64 රටා හඳුනාගැනීමේ Regex එකක්
    const base64Regex = /([a-zA-Z0-9+/]{20,}={0,2})/g;
    let match;
    while ((match = base64Regex.exec(text)) !== null) {
        try {
            const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
            // Decode වුණු ටෙක්ස්ට් එකේ ලින්ක් එකක් තියෙදැයි බැලීම
            const urlMatch = decoded.match(/(https?:\/\/[^\s"'`<>\\#]+)/i);
            if (urlMatch) {
                urls.push(urlMatch[1]);
            }
        } catch (e) {}
    }
    return urls;
}

app.get('/', (req, res) => {
    res.json({ status: true, message: 'Ultimate Universal Scraper Engine is Active!' });
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

        $('article, .post, .blog-post, .post-item, .result-item').each((index, element) => {
            const titleEl = $(element).find('h2 a, h1 a, .entry-title a, .post-title a, a').first();
            const title = titleEl.text().trim();
            let link = titleEl.attr('href');
            let thumb = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || $(element).find('img').attr('data-lazy-src');

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

// 2. The Ultimate Dynamic & Obfuscated Link Harvester
app.get('/api/cartoons/download', async (req, res) => {
    const postUrl = req.query.url;
    if (!postUrl) return res.status(400).json({ status: false, message: 'కරුණාකර URL එකක් ලබා දෙන්න. (?url=...)' });

    try {
        const { data } = await axios.get(postUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const title = $('h1.entry-title, h1, title').first().text().replace(' - Cartoons.lk', '').trim();
        let mainThumb = $('meta[property="og:image"]').attr('content') || $('.post-thumbnail img').first().attr('src') || null;

        const foundLinks = new Set();
        const downloadLinks = [];

        // ලින්ක් එකක් වලංගු එකක්ද සහ Junk ද කියලා ෆිල්ටර් කරන ශ්‍රිතය
        const addValidLink = (url, contextName) => {
            if (!url || typeof url !== 'string' || url.startsWith('#') || url.startsWith('javascript')) return;
            
            try {
                // සයිට් එකේ සාපේක්ෂ ලින්ක්ස් (Relative) තියෙනවා නම් ඒවා Absolute කිරීම
                const absoluteUrl = url.startsWith('http') ? url : new URL(url, postUrl).href;
                
                // අනවශ්‍ය Junk ලින්ක්ස් සම්පූර්ණයෙන්ම බ්ලොක් කිරීම
                const isJunk = absoluteUrl.includes('facebook.com') || 
                               absoluteUrl.includes('twitter.com') || 
                               absoluteUrl.includes('instagram.com') ||
                               absoluteUrl.includes('whatsapp.com') ||
                               absoluteUrl.includes('tg://') ||
                               absoluteUrl.includes('t.me/cartooonslk') ||
                               absoluteUrl.includes('#respond') ||
                               absoluteUrl.includes('wp-comments-post.php') ||
                               absoluteUrl === postUrl + '/' || 
                               absoluteUrl === postUrl;

                if (!isJunk && !foundLinks.has(absoluteUrl)) {
                    foundLinks.add(absoluteUrl);
                    
                    // ලින්ක් එකේ නම පිරිසිදු කිරීම
                    let cleanName = contextName ? contextName.replace(/\s+/g, ' ').trim() : '';
                    if (!cleanName || cleanName.length > 50 || cleanName.toLowerCase().includes('download')) {
                        // ලින්ක් ඩොමේන් එක අනුව ස්වයංක්‍රීයව නමක් දීම
                        if (absoluteUrl.includes('pixeldrain.com')) cleanName = `Pixeldrain Link ${downloadLinks.length + 1}`;
                        else if (absoluteUrl.includes('mega.nz')) cleanName = `Mega Link ${downloadLinks.length + 1}`;
                        else if (absoluteUrl.includes('drive.google.com')) cleanName = `Google Drive Link ${downloadLinks.length + 1}`;
                        else if (absoluteUrl.includes('mediafire.com')) cleanName = `Mediafire Link ${downloadLinks.length + 1}`;
                        else cleanName = `Direct Link ${downloadLinks.length + 1}`;
                    }

                    downloadLinks.push({ name: cleanName, link: absoluteUrl });
                }
            } catch (e) {}
        };

        // STAGE 1: HTML එකේ තියෙන සේරම Elements වල හැම Attribute එකක්ම පරික්ෂා කිරීම (Monster Scan)
        $('*').each((index, element) => {
            const attribs = element.attribs;
            const elementText = $(element).text().trim();
            
            for (const key in attribs) {
                const value = attribs[key];
                if (!value) continue;

                // ක්‍රමය A: Attribute එක කෙලින්ම URL එකක් නම්
                if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
                    addValidLink(value, elementText || value);
                }

                // ක්‍රමය B: Attribute එක අස්සේ Base64 වලින් ලින්ක් එක හංගලා තිබුණොත්
                const decodedUrls = decodeBase64Urls(value);
                decodedUrls.forEach(u => addValidLink(u, elementText || 'Decoded Hidden Link'));
            }
        });

        // STAGE 2: මුළු HTML කෝඩ් එක පුරාම තියෙන JavaScript කෝඩ් කෑලි සහ Text Scan කිරීම (Deep Regex)
        const rawHtml = $.html();
        
        // Plain URL Regex
        const urlRegex = /(https?:\/\/[^\s"'`<>\\#]+)/gi;
        let match;
        while ((match = urlRegex.exec(rawHtml)) !== null) {
            let cleanUrl = match[1].replace(/\\/g, ''); // Escape සලකුණු අයින් කිරීම
            addValidLink(cleanUrl, '');
        }

        // HTML එක පුරාම විසිරිලා තියෙන ඕනෑම Base64 encrypted ලින්ක් එකක් ඇදලා ගැනීම
        const globalDecodedUrls = decodeBase64Urls(rawHtml);
        globalDecodedUrls.forEach(u => addValidLink(u, 'Decoded Global Link'));

        // STAGE 3: WordPress Video Themes වල එන Iframes සහ Embed Players ඇදලා ගැනීම
        $('iframe, embed, source').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) addValidLink(src, `Streaming Player ${i + 1}`);
        });

        // අවසාන වශයෙන් වටිනා වලාකුළු (Cloud) ලින්ක්ස් තියෙන ඒවා උඩටම සෝට් කිරීම (Prioritize High Value Links)
        downloadLinks.sort((a, b) => {
            const targets = ['pixeldrain', 'mega', 'drive', 'mediafire', 'gofile'];
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
        res.status(500).json({ status: false, message: 'තොරතුරු ලබාගැනීම අසාර්ථක විය!', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Ultimate Scraper Engine running on port ${PORT}`);
});

export default app;
EOF

node index.js
cat << 'EOF' > index.js
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
EOF

node index.js
pkg update && pkg upgrade
pkg install nodejs git
mkdir tv-web
cd tv-web
npm init -y
npm install express
nano server.js
rm server.js
nano server.js
rm server.js
nano server.js
nano public/index.html
