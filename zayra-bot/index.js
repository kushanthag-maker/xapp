const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '8849463400:AAEyA9y5IHmDWhHkJFcoXBuQel17K_dmn-g';
const bot = new (TelegramBot.default || TelegramBot)(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "💠 *ZAYRA FAKE NUMBERS*\n\nPress button to load:", {
        reply_markup: {
            keyboard: [['Get Number']],
            resize_keyboard: true
        }
    });
});

bot.on('message', async (msg) => {
    if (msg.text === 'Get Number') {
        try {
            // API call eka
            const res = await axios.get('https://apis.davidcyriltech.my.id/tempnumber/receive-sms-online/numbers');
            
            // API data tika hariyata check karanna
            if (res.data && res.data.result && res.data.result.numbers) {
                const numbers = res.data.result.numbers.slice(0, 5);
                let text = "📞 *Available Numbers:*\n\n";
                numbers.forEach(n => {
                    text += `✅ \`${n.number}\` (${n.country})\n`;
                });
                bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(msg.chat.id, "⚠️ API eken numbers awa na. API eka down wenna puluwan.");
            }
        } catch (error) {
            bot.sendMessage(msg.chat.id, "❌ Error: " + error.message);
        }
    }
});

console.log("Bot is running. Press 'Get Number' in Telegram.");
