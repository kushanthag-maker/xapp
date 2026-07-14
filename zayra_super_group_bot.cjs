const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const path = require('path');

const TOKEN = '8887163955:AAHUQIhWzOblbMvsp8FE9pgNvDjvYGNxu-I';
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'group_data.json');
const ADMIN_PASSWORD = 'zayra2026'; // Change this password!

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== DATA ====================
let data = {
    rules: {},      // chatId: rulesText
    lang: {},       // chatId: 'en' | 'si'
    warns: {},      // "chatId_userId": count
    logs: []        // recent activity
};

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.log('Data file error, starting fresh');
        }
    }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

loadData();

// ==================== LOGGING ====================
function addLog(chatId, action, details = '') {
    const log = {
        time: new Date().toISOString(),
        chatId,
        action,
        details
    };
    data.logs.unshift(log);
    if (data.logs.length > 50) data.logs.pop();
    saveData();
}

// ==================== LANGUAGE ====================
const TEXTS = {
    en: {
        welcome: (name) => `🎉 Welcome ${name}!\n\nGlad to have you here! Please follow the rules 😊`,
        goodbye: (name) => `👋 Goodbye ${name}! We'll miss you. Come back soon! 😢`,
        help: `🤖 *Zayra Super Group Bot* (Node.js + Web Panel)

*Main Commands:*
/menu - Beautiful button menu
/rules - Show group rules
/setrules - (Admin) Set rules (reply to text)
/warn - (Admin) Warn user (reply)
/warns - Check user warns
/clearwarns - (Admin) Clear warns
/ban /kick /mute /unmute /unban - Admin tools
/stats - Group stats
/lang en or si - Change language

*Web Panel:* http://localhost:3000 (password: zayra2026)
*Warn System:* 3 warns = warning | 4th = Kick`,
        rules_default: `📜 Group Rules

1. Be respectful to everyone
2. No spam or flooding
3. No NSFW content
4. No hate speech
5. Follow admins instructions

Enjoy your stay! ❤️`,
        warn_final: (name) => `⚠️ ${name} - This is your *3rd warn*! Next violation = Kick!`,
        warn_kick: (name) => `🚫 ${name} has been *kicked* for reaching 4 violations.`,
        admin_only: '❌ Only admins can use this command.',
        reply_needed: '⚠️ Please reply to the user\'s message.'
    },
    si: {
        welcome: (name) => `🎉 සාදරයෙන් පිළිගනිමු ${name}!\n\nගෲප් එකට සාදරයෙන් පිළිගනිමු! 😊`,
        goodbye: (name) => `👋 ආයුබෝවන් ${name}! අපි ඔබව මග හැරෙමු. ඉක්බිති එන්න! 😢`,
        help: `🤖 *Zayra Super Group Bot* (Node.js + Web Panel)

*ප්‍රධාන කමාන්ඩ්:*
/menu - ලස්සන button මෙනුව
/rules - ගෲප් නීති
/setrules - (Admin) නීති සකසන්න
/warn - (Admin) Warn දෙන්න
/warns - Warn ගණන බලන්න
/clearwarns - (Admin) Warn reset කරන්න
/ban /kick /mute /unmute /unban - Admin tools
/stats - ගෲප් stats
/lang en or si - භාෂාව වෙනස් කරන්න

*Web Panel:* http://localhost:3000 (password: zayra2026)
*Warn System:* 3 warns = අවසාන අනතුරු ඇඟවීම | 4 වැනි = Kick`,
        rules_default: `📜 ගෲප් නීති

1. සැමට ගෞරව කරන්න
2. Spam නොකරන්න
3. NSFW අන්තර්ගතයන් නොදාන්න
4. වෛරී කථා නොකරන්න
5. Admin ලාගේ උපදෙස් අනුගමනය කරන්න

සතුටින් ඉන්න! ❤️`,
        warn_final: (name) => `⚠️ ${name} - මෙය ඔබගේ *3 වැනි warn* ය! ඊළඟ උල්ලංඝනය = Kick!`,
        warn_kick: (name) => `🚫 ${name} 4 වැනි උල්ලංඝනය හේතුවෙන් *kick* කරන ලදී.`,
        admin_only: '❌ මෙම කමාන්ඩ් එක Admin වලට පමණි.',
        reply_needed: '⚠️ User ගේ පණිවිඩයට reply කරන්න.'
    }
};

function getLang(chatId) {
    return data.lang[chatId] || 'en';
}

function t(chatId, key, ...args) {
    const lang = getLang(chatId);
    const text = TEXTS[lang][key] || TEXTS.en[key];
    return typeof text === 'function' ? text(...args) : text;
}

// ==================== ADMIN CHECK ====================
async function isAdmin(chatId, userId) {
    try {
        const member = await bot.getChatMember(chatId, userId);
        return ['administrator', 'creator'].includes(member.status);
    } catch {
        return false;
    }
}

// ==================== TELEGRAM BOT HANDLERS ====================

// Welcome
bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;
    for (const member of msg.new_chat_members) {
        if (member.is_bot) continue;
        const name = member.username ? `@${member.username}` : member.first_name;
        await bot.sendMessage(chatId, t(chatId, 'welcome', name));
    }
});

// Goodbye
bot.on('left_chat_member', async (msg) => {
    const chatId = msg.chat.id;
    const member = msg.left_chat_member;
    const name = member.username ? `@${member.username}` : member.first_name;
    await bot.sendMessage(chatId, t(chatId, 'goodbye', name));
});

// /start /help
bot.onText(/\/(start|help)/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, t(chatId, 'help'), { parse_mode: 'Markdown' });
});

// /menu - Nice buttons
bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📜 Rules', callback_data: 'show_rules' },
                    { text: '⚠️ Warn System', callback_data: 'warn_info' }
                ],
                [
                    { text: '🆘 Help', callback_data: 'show_help' },
                    { text: '🌐 Language', callback_data: 'lang_menu' }
                ],
                [
                    { text: '📊 Stats', callback_data: 'show_stats' },
                    { text: '🔧 Web Panel', url: 'http://localhost:3000' }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, t(chatId, 'menu_title') || '🤖 *Zayra Super Menu*', { 
        parse_mode: 'Markdown', 
        ...opts 
    });
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'show_rules') {
        const rulesText = data.rules[chatId] || t(chatId, 'rules_default');
        await bot.sendMessage(chatId, `📜 *Group Rules*\n\n${rulesText}`, { parse_mode: 'Markdown' });
    } 
    else if (data === 'warn_info') {
        await bot.sendMessage(chatId, '⚠️ Warn System:\n• /warn (reply) = Give warn\n• 3 warns = Final warning\n• 4th = Auto Kick');
    } 
    else if (data === 'show_help') {
        await bot.sendMessage(chatId, t(chatId, 'help'), { parse_mode: 'Markdown' });
    } 
    else if (data === 'lang_menu') {
        await bot.sendMessage(chatId, `Current: ${getLang(chatId)}\nUse /lang en or /lang si`);
    } 
    else if (data === 'show_stats') {
        try {
            const count = await bot.getChatMemberCount(chatId);
            await bot.sendMessage(chatId, `👥 Total Members: ${count}`);
        } catch {
            await bot.sendMessage(chatId, 'Stats not available');
        }
    }

    await bot.answerCallbackQuery(query.id);
});

// /rules
bot.onText(/\/rules/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const rulesText = data.rules[chatId] || t(chatId, 'rules_default');
    await bot.sendMessage(msg.chat.id, `📜 *Group Rules*\n\n${rulesText}`, { parse_mode: 'Markdown' });
});

// /setrules (admin reply to message)
bot.onText(/\/setrules/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await isAdmin(chatId, msg.from.id))) {
        return bot.sendMessage(chatId, t(chatId, 'admin_only'));
    }
    if (msg.reply_to_message && msg.reply_to_message.text) {
        data.rules[chatId] = msg.reply_to_message.text;
        saveData();
        addLog(chatId, 'set_rules', 'Admin updated rules');
        await bot.sendMessage(chatId, '✅ Rules saved successfully!');
    } else {
        await bot.sendMessage(chatId, t(chatId, 'reply_needed') + '\nReply to the rules text with /setrules');
    }
});

// /lang
bot.onText(/\/lang (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!(await isAdmin(chatId, msg.from.id))) return;
    const newLang = match[1].toLowerCase();
    if (['en', 'si'].includes(newLang)) {
        data.lang[chatId] = newLang;
        saveData();
        await bot.sendMessage(chatId, newLang === 'en' ? '✅ Language set to English' : '✅ භාෂාව සිංහලට සකසන ලදී');
    }
});

// Warn system (4th = kick)
bot.onText(/\/warn/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await isAdmin(chatId, msg.from.id))) return bot.sendMessage(chatId, t(chatId, 'admin_only'));
    if (!msg.reply_to_message) return bot.sendMessage(chatId, t(chatId, 'reply_needed'));

    const userId = msg.reply_to_message.from.id;
    const userName = msg.reply_to_message.from.first_name || 'User';
    const key = `${chatId}_${userId}`;

    data.warns[key] = (data.warns[key] || 0) + 1;
    const count = data.warns[key];
    saveData();
    addLog(chatId, 'warn', `${userName} (${count})`);

    if (count === 3) {
        await bot.sendMessage(chatId, t(chatId, 'warn_final', userName), { parse_mode: 'Markdown' });
    } else if (count >= 4) {
        try {
            await bot.banChatMember(chatId, userId);
            await new Promise(r => setTimeout(r, 800));
            await bot.unbanChatMember(chatId, userId);
            await bot.sendMessage(chatId, t(chatId, 'warn_kick', userName), { parse_mode: 'Markdown' });
            data.warns[key] = 0;
            saveData();
            addLog(chatId, 'auto_kick', userName);
        } catch (e) {
            await bot.sendMessage(chatId, 'Kick failed. Check bot permissions.');
        }
    } else {
        await bot.sendMessage(chatId, `⚠️ ${userName} warned. Total: ${count}/4`);
    }
});

// /warns
bot.onText(/\/warns/, async (msg) => {
    if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, 'Reply to user');
    const key = `${msg.chat.id}_${msg.reply_to_message.from.id}`;
    const count = data.warns[key] || 0;
    await bot.sendMessage(msg.chat.id, `⚠️ ${msg.reply_to_message.from.first_name} has ${count} warns.`);
});

// /clearwarns
bot.onText(/\/clearwarns/, async (msg) => {
    const chatId = msg.chat.id;
    if (!(await isAdmin(chatId, msg.from.id))) return;
    if (!msg.reply_to_message) return;
    const key = `${chatId}_${msg.reply_to_message.from.id}`;
    data.warns[key] = 0;
    saveData();
    await bot.sendMessage(chatId, '✅ Warns cleared.');
});

// Other admin commands (ban, kick, mute, unmute, unban, stats)
bot.onText(/\/(ban|kick|mute|unmute|unban|stats)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const cmd = match[1];
    if (!(await isAdmin(chatId, msg.from.id))) return bot.sendMessage(chatId, t(chatId, 'admin_only'));

    if (cmd === 'stats') {
        try {
            const count = await bot.getChatMemberCount(chatId);
            return bot.sendMessage(chatId, `👥 Members: ${count}`);
        } catch { return bot.sendMessage(chatId, 'Stats unavailable'); }
    }

    if (!msg.reply_to_message) return bot.sendMessage(chatId, t(chatId, 'reply_needed'));
    const userId = msg.reply_to_message.from.id;

    try {
        if (cmd === 'ban') await bot.banChatMember(chatId, userId);
        if (cmd === 'kick') {
            await bot.banChatMember(chatId, userId);
            await new Promise(r => setTimeout(r, 700));
            await bot.unbanChatMember(chatId, userId);
        }
        if (cmd === 'mute') await bot.restrictChatMember(chatId, userId, { can_send_messages: false });
        if (cmd === 'unmute') await bot.restrictChatMember(chatId, userId, { can_send_messages: true });
        if (cmd === 'unban') await bot.unbanChatMember(chatId, userId);

        await bot.sendMessage(chatId, `✅ ${cmd.toUpperCase()} successful.`);
        addLog(chatId, cmd, msg.reply_to_message.from.first_name);
    } catch (e) {
        await bot.sendMessage(chatId, `❌ ${cmd} failed. Make sure bot is admin with rights.`);
    }
});

// ==================== BEAUTIFUL WEB PANEL (Bootstrap 5) ====================
function getPanelHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zayra Super Group Bot • Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; }
        .card { background: #0f0f23; border: 1px solid #00d4ff; }
        .navbar { background: #0f0f23; }
        .btn-custom { background: #00d4ff; color: #000; font-weight: bold; }
        .table { color: #fff; }
        .log-item { font-size: 0.85rem; border-left: 3px solid #00d4ff; padding-left: 10px; }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark px-4">
        <div class="container-fluid">
            <span class="navbar-brand fw-bold"><i class="bi bi-robot"></i> Zayra Super Group Bot</span>
            <span class="text-success">Node.js + Web Panel v2.0</span>
        </div>
    </nav>

    <div class="container py-4">
        <div class="row g-4">
            <!-- Dashboard -->
            <div class="col-md-4">
                <div class="card p-4 h-100">
                    <h4 class="mb-3"><i class="bi bi-speedometer2"></i> Dashboard</h4>
                    <div class="mb-3">
                        <div class="d-flex justify-content-between">
                            <span>Total Warns</span>
                            <span class="badge bg-warning text-dark fs-6" id="totalWarns">0</span>
                        </div>
                    </div>
                    <div class="mb-3">
                        <div class="d-flex justify-content-between">
                            <span>Groups Managed</span>
                            <span class="badge bg-info fs-6" id="groupCount">1</span>
                        </div>
                    </div>
                    <a href="#warns" class="btn btn-custom w-100 mb-2">Manage Warns</a>
                    <a href="#rules" class="btn btn-outline-light w-100">Edit Rules</a>
                </div>
            </div>

            <!-- Rules Editor -->
            <div class="col-md-8" id="rules">
                <div class="card p-4">
                    <h4><i class="bi bi-journal-text"></i> Group Rules Editor</h4>
                    <textarea id="rulesText" class="form-control bg-dark text-white mb-3" rows="6" placeholder="Enter group rules here..."></textarea>
                    <button onclick="saveRules()" class="btn btn-custom">Save Rules</button>
                    <small class="text-muted">Changes will be live in Telegram instantly.</small>
                </div>
            </div>

            <!-- Warn Management -->
            <div class="col-12" id="warns">
                <div class="card p-4">
                    <h4><i class="bi bi-exclamation-triangle"></i> Warn Management</h4>
                    <div class="table-responsive">
                        <table class="table table-dark table-hover">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Warns</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="warnsTable">
                                <!-- JS populated -->
                            </tbody>
                        </table>
                    </div>
                    <button onclick="refreshWarns()" class="btn btn-outline-light mt-2">Refresh</button>
                </div>
            </div>

            <!-- Activity Log -->
            <div class="col-12">
                <div class="card p-4">
                    <h4><i class="bi bi-clock-history"></i> Recent Activity</h4>
                    <div id="logList" class="small" style="max-height: 220px; overflow-y: auto;"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function loadDashboard() {
            const res = await fetch('/api/stats');
            const stats = await res.json();
            document.getElementById('totalWarns').innerText = stats.totalWarns;
            document.getElementById('groupCount').innerText = stats.groups;
        }

        async function loadRules() {
            const res = await fetch('/api/rules');
            const rules = await res.json();
            document.getElementById('rulesText').value = rules.text || '';
        }

        async function saveRules() {
            const text = document.getElementById('rulesText').value;
            await fetch('/api/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            alert('✅ Rules saved! Live in Telegram.');
        }

        async function refreshWarns() {
            const res = await fetch('/api/warns');
            const warns = await res.json();
            const tbody = document.getElementById('warnsTable');
            tbody.innerHTML = '';
            
            if (Object.keys(warns).length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No warns yet</td></tr>';
                return;
            }

            for (const [key, count] of Object.entries(warns)) {
                const [chatId, userId] = key.split('_');
                const row = document.createElement('tr');
                row.innerHTML = \`
                    <td>\${userId}</td>
                    <td><span class="badge bg-warning text-dark">\${count}/4</span></td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="clearWarn('\${key}')">Clear</button>
                        <button class="btn btn-sm btn-danger" onclick="kickUser('\${chatId}', '\${userId}')">Kick</button>
                    </td>
                \`;
                tbody.appendChild(row);
            }
        }

        async function clearWarn(key) {
            await fetch('/api/clearwarn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            refreshWarns();
        }

        async function kickUser(chatId, userId) {
            if (!confirm('Kick this user from group?')) return;
            await fetch('/api/kick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, userId })
            });
            alert('Kick request sent to bot.');
            refreshWarns();
        }

        async function loadLogs() {
            const res = await fetch('/api/logs');
            const logs = await res.json();
            const container = document.getElementById('logList');
            container.innerHTML = logs.map(log => 
                \`<div class="log-item mb-2">
                    <strong>\${new Date(log.time).toLocaleTimeString()}</strong> 
                    [\${log.action}] \${log.details || ''}
                </div>\`
            ).join('');
        }

        // Auto refresh
        setInterval(() => {
            loadDashboard();
            refreshWarns();
            loadLogs();
        }, 8000);

        // Initial load
        window.onload = () => {
            loadDashboard();
            loadRules();
            refreshWarns();
            loadLogs();
        }
    </script>
</body>
</html>`;
}

// ==================== WEB API ROUTES ====================
app.get('/', (req, res) => {
    res.send(getPanelHTML());
});

// Simple password protection for sensitive routes (basic)
function checkAuth(req, res, next) {
    const pass = req.query.pass || req.body.pass;
    if (pass === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).send('Unauthorized. Use ?pass=zayra2026');
    }
}

app.get('/api/stats', (req, res) => {
    const totalWarns = Object.values(data.warns).reduce((a, b) => a + b, 0);
    const groups = Object.keys(data.rules).length || 1;
    res.json({ totalWarns, groups });
});

app.get('/api/rules', (req, res) => {
    // For demo, show first group's rules or empty
    const firstChat = Object.keys(data.rules)[0] || 'default';
    res.json({ text: data.rules[firstChat] || '' });
});

app.post('/api/rules', checkAuth, (req, res) => {
    const { text } = req.body;
    // Save to first group or a default
    const chatId = Object.keys(data.rules)[0] || 'default_group';
    data.rules[chatId] = text;
    saveData();
    addLog(chatId, 'panel_set_rules');
    res.json({ success: true });
});

app.get('/api/warns', (req, res) => {
    res.json(data.warns);
});

app.post('/api/clearwarn', checkAuth, (req, res) => {
    const { key } = req.body;
    if (data.warns[key]) {
        data.warns[key] = 0;
        saveData();
        addLog('panel', 'clear_warn', key);
    }
    res.json({ success: true });
});

app.post('/api/kick', checkAuth, async (req, res) => {
    const { chatId, userId } = req.body;
    try {
        await bot.banChatMember(chatId, parseInt(userId));
        await new Promise(r => setTimeout(r, 600));
        await bot.unbanChatMember(chatId, parseInt(userId));
        addLog(chatId, 'panel_kick', userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/logs', (req, res) => {
    res.json(data.logs);
});

// ==================== START EVERYTHING ====================
app.listen(PORT, () => {
    console.log(`🌐 Web Panel running at: http://localhost:${PORT}`);
    console.log(`   Password for sensitive actions: ${ADMIN_PASSWORD}`);
});

console.log('🚀 Zayra Super Group Bot (Node.js) starting...');
console.log('   Telegram bot + Beautiful Web Panel ready!');
