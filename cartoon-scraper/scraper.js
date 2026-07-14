const axios = require('axios');
const cheerio = require('cheerio');

async function getCartoons(query) {
    const url = `https://cartoons.lk/?s=${encodeURIComponent(query)}`;
    
    try {
        // User-Agent එකක් එකතු කිරීමෙන් වෙබ් අඩවියට අපව බ්‍රව්සරයක් ලෙස පෙනේ
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(data);
        const results = [];

        // cartoons.lk හි ලිපි පෙන්වන ප්‍රධාන class එක 'article' වේ.
        // අපි ඒ හරහා search කරමු.
        $('article').each((i, el) => {
            const title = $(el).find('h2 a').text().trim();
            const link = $(el).find('h2 a').attr('href');
            
            if (title && link) {
                results.push({ title, link });
            }
        });

        if (results.length === 0) {
            console.log("ප්‍රතිඵල හමු නොවීය. selector පරීක්ෂා කරන්න.");
        } else {
            console.log(JSON.stringify(results, null, 2));
        }
    } catch (error) {
        console.error("Error fetching data:", error.message);
    }
}

const movieName = process.argv[2] || "Ben 10";
getCartoons(movieName);
