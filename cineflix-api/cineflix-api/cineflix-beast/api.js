import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL = 'https://cineflix-lk.vercel.app';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
};

// 1. GET ALL MOVIES & SEARCH (DIRECT VIA API BACKEND)
app.get('/api/movies', async (req, res) => {
    try {
        const { q } = req.query;
        
        // සයිට් එක Next.js/Vercel base නිසා data fetch වෙන්නේ වෙනම endpoint එකකින් වෙන්න පුළුවන්.
        // අපි ප්‍රධාන ක්‍රම 2 කටම ට්‍රැක් කරමු.
        let targetUrl = `${BASE_URL}/api/movies`; // ක්‍රමය A
        
        if (q) {
            targetUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(q)}`; // ක්‍රමය B
        }

        console.log(`📡 Fetching direct JSON data from: ${targetUrl}`);
        
        // කෙලින්ම JSON data එක ගන්න උත්සාහ කිරීම
        const response = await axios.get(targetUrl, { headers: HEADERS, timeout: 5000 }).catch(() => null);
        
        if (response && response.data) {
            // සයිට් එකේ API එකෙන් කෙලින්ම array එකක් ආවොත්
            const rawData = response.data.data || response.data.results || response.data;
            if (Array.isArray(rawData)) {
                return res.json({
                    status: true,
                    results_count: rawData.length,
                    data: rawData
                });
            }
        }

        // Fallback: සයිට් එකේ server rendering route එකක් තිබේ නම් (e.g. Next.js data routes)
        const fallbackUrl = `${BASE_URL}/_next/data/latest/index.json`; 
        const fbResponse = await axios.get(fallbackUrl, { headers: HEADERS }).catch(() => null);
        
        if (fbResponse && fbResponse.data) {
            const nextData = fbResponse.data.pageProps?.movies || fbResponse.data.pageProps?.data || [];
            return res.json({
                status: true,
                results_count: nextData.length,
                data: nextData
            });
        }

        // කිසිවක්ම වැඩ නොකලොත් දැනට තියෙන structure එක placeholder එකක් ලෙස පෙන්වීම
        res.json({
            status: false,
            message: "Site uses secure client-side hydration. Direct HTML scraping failed.",
            suggestion: "Please check Network tab in browser to find the exact fetch URL."
        });

    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Cineflix JSON Hybrid API live on port ${PORT}`));
