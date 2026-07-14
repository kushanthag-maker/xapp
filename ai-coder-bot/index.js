const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

const token = '8841762770:AAFUs2ssLOm5AbhP2qo2iIwRxLY_siOIS0E';
const BotConstructor = TelegramBot.default || TelegramBot;
const bot = new BotConstructor(token, { polling: true });

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

const STATS_FILE = './stats.json';
let userStats = fs.existsSync(STATS_FILE) ? JSON.parse(fs.readFileSync(STATS_FILE)) : {};
function saveStats() { fs.writeFileSync(STATS_FILE, JSON.stringify(userStats)); }

const userState = {};

// UI Buttons - නම් වෙනස් කරලා පිරිසිදු කළා
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['💠 ZAYRA v1', '🤖 ZAYRA v2'],
            ['📊 Check Stats', '⚙️ Help']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "💠 *Welcome to ZAYRA AI*\n\nI am your ultimate assistant. Select an engine from below:", {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

bot.on('message', async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text;

    // Button Handling
    if (text === '💠 ZAYRA v1') {
        userState[chatId] = 'gemini';
        return bot.sendMessage(chatId, "✅ *System set to ZAYRA v1 mode.*");
    }
    if (text === '🤖 ZAYRA v2') {
        userState[chatId] = 'chatgpt';
        return bot.sendMessage(chatId, "✅ *System set to ZAYRA v2 mode.*");
    }
    if (text === '📊 Check Stats') {
        const stats = userStats[chatId] || { requests: 0 };
        return bot.sendMessage(chatId, `📊 *ZAYRA AI Usage*\n\nTotal requests: *${stats.requests}*`, { parse_mode: 'Markdown' });
    }
    if (text === '⚙️ Help') {
        return bot.sendMessage(chatId, "📌 *ZAYRA AI Info*\n\nSelect a version to start processing. Ask anything freely.", { parse_mode: 'Markdown' });
    }

    if (text.startsWith('/')) return;

    // AI Processing
    if (!userStats[chatId]) userStats[chatId] = { requests: 0 };
    userStats[chatId].requests++;
    saveStats();

    const mode = userState[chatId] || 'gemini';
    const prompt = encodeURIComponent(text);
    const apiUrl = mode === 'gemini' 
        ? `https://nethum.vercel.app/api/gemini?apikey=c476a59f0e8638d27370b95543e1dfd3&prompt=${prompt}`
        : `https://nethum.vercel.app/api/chatgpt?apikey=c476a59f0e8638d27370b95543e1dfd3&prompt=${prompt}`;

    log(`Request via ${mode} from ${msg.from.first_name}`);

    try {
        await bot.sendChatAction(chatId, 'typing');
        const res = await axios.get(apiUrl);
        bot.sendMessage(chatId, `💠 *ZAYRA AI:*\n\n${res.data.response}`, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(chatId, "⚠️ *ZAYRA AI* is currently busy. Try again.");
    }
});

log("ZAYRA AI UI Mode (Clean) is running...");
