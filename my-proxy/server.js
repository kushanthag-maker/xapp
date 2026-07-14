const ProxyChain = require('proxy-chain');

// 1. මේක තමයි ඔයාගේ database එක (මේක ලේසියෙන් MongoDB වලට මාරු කරන්න පුළුවන්)
const users = {
    'sandaru_key_001': { name: 'Client A', requests: 0 },
    'lucifer_admin_key': { name: 'Admin', requests: 0 }
};

// 2. ඔයා ගාව තියෙන Proxy List එක (මෙතනට ඕන තරම් proxies දාන්න පුළුවන්)
const upstreamProxies = [
    'http://user:pass@proxy1.com:8080',
    'http://user:pass@proxy2.com:8080',
    'http://user:pass@proxy3.com:8080'
];

const server = new ProxyChain.Server({
    port: 8080,
    verbose: false, // Logging ඕනේ නම් true කරන්න
    prepareRequestFunction: ({ request }) => {
        // 3. API Key එක Check කිරීම
        const auth = request.headers['proxy-authorization'];
        if (!auth || !auth.startsWith('Basic ')) {
            throw new Error('407 Proxy Authentication Required: API Key Missing');
        }

        // Basic Auth එක decode කරලා API key එක ගන්න (User:Password ආකෘතියෙන්)
        const base64 = auth.split(' ')[1];
        const decoded = Buffer.from(base64, 'base64').toString('ascii');
        const [apiKey] = decoded.split(':');

        if (!users[apiKey]) {
            throw new Error('403 Forbidden: Invalid API Key');
        }

        // 4. Usage Tracking (එක request එකකට එකක් වැඩි වෙනවා)
        users[apiKey].requests++;
        console.log(`User ${users[apiKey].name} used proxy. Total requests: ${users[apiKey].requests}`);

        // 5. Random Proxy Rotation
        const randomProxy = upstreamProxies[Math.floor(Math.random() * upstreamProxies.length)];

        return {
            upstreamProxyUrl: randomProxy,
            // අමතර ආරක්ෂාවට headers වෙනස් කරන්න පුළුවන්
            requestHeadObjects: {
                'X-Forwarded-For': 'hidden',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
            }
        };
    },
});

server.listen(() => {
    console.log(`Proxy Management System is running on port 8080`);
});

