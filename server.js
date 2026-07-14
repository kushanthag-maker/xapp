import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. News List Endpoint
app.get('/api/news', async (req, res) => {
    try {
        const url = 'https://sinhala.adaderana.lk/';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(data);
        const newsList = [];

        $('.news-story').each((index, element) => {
            const title = $(element).find('.story-text h2 a, .story-text a').first().text().trim();
            const rawLink = $(element).find('a').first().attr('href');
            const imgUrl = $(element).find('.story-image img, img').first().attr('src');
            const relativeTime = $(element).find('.story-text span, .time').text().trim();

            let fullLink = rawLink;
            if (rawLink && !rawLink.startsWith('http')) {
                fullLink = `https://sinhala.adaderana.lk/${rawLink.replace(/^\//, '')}`;
            }

            if (title && newsList.length < 15) {
                newsList.push({ title, time: relativeTime || 'Just Now', image: imgUrl || null, url: fullLink });
            }
        });

        res.json({ status: true, creator: 'Sandaru Udan', total_news: newsList.length, results: newsList });
    } catch (error) {
        res.status(500).json({ status: false, message: 'News fetch කිරීමට නොහැකි විය!', error: error.message });
    }
});


// 2. Fixed Full News Endpoint (Supports Sports & All Categories)
app.get('/api/news-detail', async (req, res) => {
    const newsUrl = req.query.url;

    if (!newsUrl) {
        return res.status(400).json({
            status: false,
            message: 'කරුණාකර News Link (URL) එකක් ඇතුලත් කරන්න! (?url=...)'
        });
    }

    try {
        const { data } = await axios.get(newsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(data);

        // Smart Title Finder: Specific class එක නැත්නම් පිටුවේ තියෙන ප්‍රධානම h1 එක ගන්නවා
        const title = $('.news-story h1, .story-text h1, .news-heading, h1').first().text().trim() || 'Title Not Found';
        
        // Smart Image Finder: News/Sports templates දෙකටම ගැලපෙන විදිහට main image එක සෙවීම
        let mainImage = $('.story-image img, .news-story img, article img, main img').first().attr('src') || null;
        if (mainImage && !mainImage.startsWith('http')) {
            mainImage = `https://sinhala.adaderana.lk/${mainImage.replace(/^\//, '')}`;
        }

        // Smart Time Finder
        const timeStamp = $('.news-story span, .story-text span, .time, .date').first().text().trim() || 'N/A';

        // Smart Content Extractor: පිටුවේ අනවශ්‍ය elements (Header/Footer/Scripts) අයින් කරලා clean text එක විතරක් ගැනීම
        let fullDescription = '';
        const contentBlock = $('.story-text, .news-story, .news-content, article, main').first();
        
        if (contentBlock.length > 0) {
            const clonedBlock = contentBlock.clone();
            
            // අනවශ්‍ය duplicate text සහ scripts ඉවත් කිරීම
            clonedBlock.find('h1, script, style, header, footer, nav, .social-share, .comments, iframe').remove();
            
            // Paragraphs (p tags) එකින් එක කියවා එකතු කරගැනීම
            clonedBlock.find('p').each((i, el) => {
                const txt = $(el).text().trim();
                if (txt.length > 0) {
                    fullDescription += txt + '\n\n';
                }
            });

            // කිසිම p tag එකක් නැත්නම් direct text එක fallback එකක් විදිහට ගැනීම
            if (!fullDescription.trim()) {
                fullDescription = clonedBlock.text().trim();
            }
        }

        res.json({
            status: true,
            creator: 'Sandaru Udan',
            data: {
                title,
                time: timeStamp,
                image: mainImage,
                full_news: fullDescription.replace(/\s+/g, ' ').trim(), // Clean string spacing
                source_url: newsUrl
            }
        });

    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'මෙම Link එකේ විස්තර ලබාගැනීමට නොහැකි විය.',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`News API එක port ${PORT} එකේ සාර්ථකව වැඩ!`);
});
