const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('⚡ CYBER-BOT SYSTEM ONLINE ⚡');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // .check [number] විධානය
        if (body.startsWith('.check ')) {
            const num = body.split(' ')[1];
            const jid = `${num}@s.whatsapp.net`;
            
            const [result] = await sock.onWhatsApp(num);
            if (result?.exists) {
                await sock.sendMessage(remoteJid, { 
                    text: `✅ අංකය සොයාගන්නා ලදී: +${num}\n\nතොරතුරු බැලීමට: .status ${num}` 
                });
            } else {
                await sock.sendMessage(remoteJid, { text: '❌ මෙම අංකය WhatsApp නොමැත.' });
            }
        }

        // .status [number] විධානය
        if (body.startsWith('.status ')) {
            const num = body.split(' ')[1];
            const jid = `${num}@s.whatsapp.net`;

            try {
                const status = await sock.fetchStatus(jid);
                const pp = await sock.profilePictureUrl(jid, 'image').catch(() => null);
                
                let response = `⚡ CYBER INTEL ⚡\n\n👤 අංකය: +${num}\n💬 Bio: ${status.status || 'N/A'}\n🕒 Bio යාවත්කාලීන කළ දිනය: ${new Date(status.setAt).toLocaleString()}`;
                
                await sock.sendMessage(remoteJid, { text: response });
            } catch (e) {
                await sock.sendMessage(remoteJid, { text: '⚠️ මෙම තොරතුරු ලබා ගැනීමට නොහැක (Privacy Settings).' });
            }
        }
    });
}

startBot();
