import telebot
import time
import json
import os
from telebot import types
from telebot.types import ChatPermissions

# ==================== CONFIG ====================
TOKEN = "8887163955:AAHUQIhWzOblbMvsp8FE9pgNvDjvYGNxu-I"
DATA_FILE = "group_data.json"

bot = telebot.TeleBot(TOKEN)

# In-memory data (loaded from file)
rules = {}
group_lang = {}
warns = {}

print("✅ Zayra Super Group Help Bot is loading...")

# ==================== DATA PERSISTENCE ====================
def load_data():
    global rules, group_lang, warns
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                rules = data.get('rules', {})
                group_lang = data.get('lang', {})
                warns = data.get('warns', {})
        except:
            rules, group_lang, warns = {}, {}, {}
    else:
        rules, group_lang, warns = {}, {}, {}

def save_data():
    data = {
        'rules': rules,
        'lang': group_lang,
        'warns': warns
    }
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

load_data()

# ==================== MULTI LANGUAGE (English + Sinhala) ====================
TEXTS = {
    'en': {
        'welcome': "🎉 Welcome {name}!\n\nGlad to have you here! Please follow the rules and enjoy 😊\nUse /help to see commands.",
        'goodbye': "👋 Goodbye {name}! We'll miss you. Come back soon! 😢",
        'help': "🤖 *Zayra Super Group Bot*\n\n*Commands:*\n/rules - Show group rules\n/setrules - (Admin) Set custom rules (reply to rules message)\n/warn - (Admin) Warn user (reply)\n/warns - Check warns of user\n/clearwarns - (Admin) Clear warns\n/mute, /unmute, /ban, /unban, /kick - Admin tools\n/menu - Nice menu with buttons\n/lang - Change bot language (en/si)\n/id or /info - Get user info\n/stats - Group member count\n\n*Warn System:* 3 warns = final warning | 4th violation = Kick",
        'rules_default': "📜 *Group Rules*\n\n1. Be respectful\n2. No spam\n3. No NSFW\n4. No hate speech\n5. Follow admins\n\nEnjoy your stay! ❤️",
        'setrules_success': "✅ Group rules saved successfully!",
        'setrules_reply': "⚠️ Reply to the message containing the new rules with /setrules",
        'admin_only': "❌ Only group admins can use this command.",
        'reply_needed': "⚠️ Please reply to the user's message.",
        'warn_1': "⚠️ {name} has been warned.\nTotal: {count}/4",
        'warn_3': "⚠️ {name} - This is your *3rd warn*! Next violation = Kick!",
        'warn_4_kick': "🚫 {name} has been *kicked* for reaching 4 violations.",
        'ban_success': "✅ User banned successfully.",
        'kick_success': "✅ User kicked successfully.",
        'mute_success': "✅ User muted. Use /unmute to allow speaking again.",
        'unmute_success': "✅ User unmuted.",
        'unban_success': "✅ User unbanned.",
        'lang_set_en': "✅ Language set to English for this group.",
        'lang_set_si': "✅ මෙම ගෲප් එක සඳහා භාෂාව සිංහලට සකසන ලදී.",
        'lang_current': "Current language: {lang}\nUse /lang en or /lang si to change.",
        'menu_title': "🤖 *Zayra Super Group Menu*",
    },
    'si': {
        'welcome': "🎉 සාදරයෙන් පිළිගනිමු {name}!\n\nගෲප් එකට සාදරයෙන් පිළිගනිමු! 😊\nකරුණාකර නීති අනුගමනය කර සතුටින් ඉන්න.\n/help භාවිතා කර කමාන්ඩ් බලන්න.",
        'goodbye': "👋 ආයුබෝවන් {name}! අපි ඔබව මග හැරෙමු. ඉක්බිති එන්න! 😢",
        'help': "🤖 *Zayra Super Group Bot*\n\n*කමාන්ඩ්:*\n/rules - ගෲප් නීති පෙන්වන්න\n/setrules - (Admin) අභිරුචි නීති සකසන්න (නීති පණිවිඩයට reply කරන්න)\n/warn - (Admin) Warn දෙන්න (reply)\n/warns - Warn ගණන බලන්න\n/clearwarns - (Admin) Warn reset කරන්න\n/mute /unmute /ban /unban /kick - Admin tools\n/menu - ලස්සන මෙනුව\n/lang - භාෂාව වෙනස් කරන්න (en/si)\n/id or /info - User info\n/stats - ගෲප් සාමාජික ගණන\n\n*Warn System:* 3 warns = අවසාන අනතුරු ඇඟවීම | 4 වැනි වතාව = Kick",
        'rules_default': "📜 *ගෲප් නීති*\n\n1. සැමට ගෞරව කරන්න\n2. Spam නොකරන්න\n3. NSFW අන්තර්ගතයන් නොදාන්න\n4. වෛරී කථා නොකරන්න\n5. Admin ලාගේ උපදෙස් අනුගමනය කරන්න\n\nසතුටින් ඉන්න! ❤️",
        'setrules_success': "✅ ගෲප් නීති සාර්ථකව සුරැකිණි!",
        'setrules_reply': "⚠️ නව නීති ඇති පණිවිඩයට reply කර /setrules කමාන්ඩ් එක භාවිතා කරන්න.",
        'admin_only': "❌ මෙම කමාන්ඩ් එක භාවිතා කළ හැක්කේ ගෲප් Admin වලට පමණි.",
        'reply_needed': "⚠️ කරුණාකර user ගේ පණිවිඩයට reply කරන්න.",
        'warn_1': "⚠️ {name} වෙත warn එකක් දෙන ලදී.\nමුළු warns: {count}/4",
        'warn_3': "⚠️ {name} - මෙය ඔබගේ *3 වැනි warn* ය! ඊළඟ උල්ලංඝනය = Kick!",
        'warn_4_kick': "🚫 {name} 4 වැනි උල්ලංඝනය හේතුවෙන් *kick* කරන ලදී.",
        'ban_success': "✅ User එක banned කරන ලදී.",
        'kick_success': "✅ User එක kicked කරන ලදී.",
        'mute_success': "✅ User එක mute කරන ලදී. /unmute භාවිතා කර නැවත කතා කිරීමට ඉඩ දෙන්න.",
        'unmute_success': "✅ User එක unmute කරන ලදී.",
        'unban_success': "✅ User එක unbanned කරන ලදී.",
        'lang_set_en': "✅ Language set to English for this group.",
        'lang_set_si': "✅ මෙම ගෲප් එක සඳහා භාෂාව සිංහලට සකසන ලදී.",
        'lang_current': "වත්මන් භාෂාව: {lang}\nවෙනස් කිරීමට /lang en හෝ /lang si භාවිතා කරන්න.",
        'menu_title': "🤖 *Zayra Super Group මෙනුව*",
    }
}

def get_lang(chat_id):
    return group_lang.get(str(chat_id), 'en')

def get_text(chat_id, key, **kwargs):
    lang = get_lang(chat_id)
    text = TEXTS.get(lang, TEXTS['en']).get(key, TEXTS['en'].get(key, ''))
    if kwargs:
        return text.format(**kwargs)
    return text

# ==================== ADMIN CHECK ====================
def is_admin_or_creator(chat_id, user_id):
    try:
        member = bot.get_chat_member(chat_id, user_id)
        return member.status in ['administrator', 'creator']
    except:
        return False

# ==================== WELCOME ====================
@bot.message_handler(content_types=['new_chat_members'])
def welcome_new_members(message):
    chat_id = message.chat.id
    for new_member in message.new_chat_members:
        if new_member.is_bot:
            continue
        name = f"@{new_member.username}" if new_member.username else new_member.first_name
        welcome_text = get_text(chat_id, 'welcome', name=name)
        try:
            bot.send_message(chat_id, welcome_text)
        except:
            pass

# ==================== GOODBYE ====================
@bot.message_handler(content_types=['left_chat_member'])
def goodbye_left_member(message):
    chat_id = message.chat.id
    left_member = message.left_chat_member
    name = f"@{left_member.username}" if left_member.username else left_member.first_name
    goodbye_text = get_text(chat_id, 'goodbye', name=name)
    try:
        bot.send_message(chat_id, goodbye_text)
    except:
        pass

# ==================== /help & /start ====================
@bot.message_handler(commands=['start', 'help'])
def send_help(message):
    chat_id = message.chat.id
    help_text = get_text(chat_id, 'help')
    bot.reply_to(message, help_text, parse_mode='Markdown')

# ==================== NICE UI - /menu with buttons ====================
@bot.message_handler(commands=['menu'])
def show_menu(message):
    chat_id = message.chat.id
    markup = types.InlineKeyboardMarkup(row_width=2)
    
    btn_rules = types.InlineKeyboardButton("📜 Rules", callback_data="cmd_rules")
    btn_help = types.InlineKeyboardButton("🆘 Help", callback_data="cmd_help")
    btn_warn = types.InlineKeyboardButton("⚠️ Warn System", callback_data="cmd_warninfo")
    btn_lang = types.InlineKeyboardButton("🌐 Language", callback_data="cmd_lang")
    
    markup.add(btn_rules, btn_help)
    markup.add(btn_warn, btn_lang)
    
    title = get_text(chat_id, 'menu_title')
    bot.send_message(chat_id, title, reply_markup=markup, parse_mode='Markdown')

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    chat_id = call.message.chat.id
    user_id = call.from_user.id
    
    if call.data == "cmd_rules":
        show_rules_inline(call)
    elif call.data == "cmd_help":
        bot.answer_callback_query(call.id)
        bot.send_message(chat_id, get_text(chat_id, 'help'), parse_mode='Markdown')
    elif call.data == "cmd_warninfo":
        bot.answer_callback_query(call.id)
        info = "⚠️ Warn System:\n• /warn (reply) → Give warn\n• 3 warns = Final warning\n• 4th violation = Kick from group"
        bot.send_message(chat_id, info)
    elif call.data == "cmd_lang":
        bot.answer_callback_query(call.id)
        current = get_lang(chat_id)
        bot.send_message(chat_id, get_text(chat_id, 'lang_current', lang=current))

def show_rules_inline(call):
    chat_id = str(call.message.chat.id)
    bot.answer_callback_query(call.id)
    
    if chat_id in rules and rules[chat_id]:
        rule_text = rules[chat_id]
    else:
        rule_text = get_text(int(chat_id), 'rules_default')
    
    bot.send_message(call.message.chat.id, f"📜 *Group Rules*\n\n{rule_text}", parse_mode='Markdown')

# ==================== /rules ====================
@bot.message_handler(commands=['rules'])
def show_rules(message):
    chat_id = str(message.chat.id)
    
    if chat_id in rules and rules[chat_id]:
        rule_text = rules[chat_id]
    else:
        rule_text = get_text(message.chat.id, 'rules_default')
    
    bot.reply_to(message, f"📜 *Group Rules*\n\n{rule_text}", parse_mode='Markdown')

# ==================== /setrules (Admin sets custom rules by replying) ====================
@bot.message_handler(commands=['setrules'])
def set_rules(message):
    chat_id = str(message.chat.id)
    
    if not is_admin_or_creator(message.chat.id, message.from_user.id):
        bot.reply_to(message, get_text(message.chat.id, 'admin_only'))
        return
    
    if message.reply_to_message and message.reply_to_message.text:
        rules[chat_id] = message.reply_to_message.text
        save_data()
        bot.reply_to(message, get_text(message.chat.id, 'setrules_success'))
    else:
        bot.reply_to(message, get_text(message.chat.id, 'setrules_reply'))

# ==================== /lang (Change language en/si) ====================
@bot.message_handler(commands=['lang', 'language'])
def change_lang(message):
    chat_id = str(message.chat.id)
    
    if not is_admin_or_creator(message.chat.id, message.from_user.id):
        bot.reply_to(message, get_text(message.chat.id, 'admin_only'))
        return
    
    args = message.text.split()
    if len(args) < 2:
        current = get_lang(message.chat.id)
        bot.reply_to(message, get_text(message.chat.id, 'lang_current', lang=current))
        return
    
    new_lang = args[1].lower()
    if new_lang in ['en', 'si']:
        group_lang[chat_id] = new_lang
        save_data()
        if new_lang == 'en':
            bot.reply_to(message, get_text(message.chat.id, 'lang_set_en'))
        else:
            bot.reply_to(message, get_text(message.chat.id, 'lang_set_si'))
    else:
        bot.reply_to(message, "❌ Use /lang en or /lang si")

# ==================== WARN SYSTEM (3 warns = warning, 4th = kick) ====================
@bot.message_handler(commands=['warn'])
def warn_user(message):
    chat_id = message.chat.id
    str_chat = str(chat_id)
    
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_id = message.reply_to_message.from_user.id
    user_name = message.reply_to_message.from_user.first_name or "User"
    key = f"{str_chat}_{user_id}"
    
    current = warns.get(key, 0) + 1
    warns[key] = current
    save_data()
    
    if current == 3:
        bot.reply_to(message, get_text(chat_id, 'warn_3', name=user_name))
    elif current >= 4:
        try:
            bot.ban_chat_member(chat_id, user_id)
            time.sleep(1)
            bot.unban_chat_member(chat_id, user_id)
            bot.reply_to(message, get_text(chat_id, 'warn_4_kick', name=user_name))
            warns[key] = 0
            save_data()
        except Exception as e:
            bot.reply_to(message, f"Error: {str(e)}")
    else:
        bot.reply_to(message, get_text(chat_id, 'warn_1', name=user_name, count=current))

@bot.message_handler(commands=['warns'])
def show_user_warns(message):
    if not message.reply_to_message:
        bot.reply_to(message, "Reply to a user to check their warns.")
        return
    
    chat_id = str(message.chat.id)
    user_id = message.reply_to_message.from_user.id
    user_name = message.reply_to_message.from_user.first_name or "User"
    key = f"{chat_id}_{user_id}"
    count = warns.get(key, 0)
    
    bot.reply_to(message, f"⚠️ {user_name} has *{count}* warns (out of 4).")

@bot.message_handler(commands=['clearwarns'])
def clear_warns(message):
    chat_id = message.chat.id
    str_chat = str(chat_id)
    
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_id = message.reply_to_message.from_user.id
    key = f"{str_chat}_{user_id}"
    if key in warns:
        warns[key] = 0
        save_data()
    bot.reply_to(message, "✅ Warns cleared for this user.")

# ==================== BAN / UNBAN / KICK / MUTE / UNMUTE ====================
@bot.message_handler(commands=['ban'])
def ban_user(message):
    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_to_ban = message.reply_to_message.from_user.id
    try:
        bot.ban_chat_member(chat_id, user_to_ban)
        bot.reply_to(message, get_text(chat_id, 'ban_success'))
    except Exception as e:
        bot.reply_to(message, f"❌ Error: {str(e)}")

@bot.message_handler(commands=['unban'])
def unban_user(message):
    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    try:
        parts = message.text.split()
        if len(parts) < 2:
            bot.reply_to(message, "Usage: /unban <user_id>")
            return
        user_id = int(parts[1])
        bot.unban_chat_member(chat_id, user_id)
        bot.reply_to(message, get_text(chat_id, 'unban_success'))
    except Exception as e:
        bot.reply_to(message, f"❌ Error: {str(e)}")

@bot.message_handler(commands=['kick'])
def kick_user(message):
    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_to_kick = message.reply_to_message.from_user.id
    try:
        bot.ban_chat_member(chat_id, user_to_kick)
        time.sleep(1)
        bot.unban_chat_member(chat_id, user_to_kick)
        bot.reply_to(message, get_text(chat_id, 'kick_success'))
    except Exception as e:
        bot.reply_to(message, f"❌ Error: {str(e)}")

@bot.message_handler(commands=['mute'])
def mute_user(message):
    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_to_mute = message.reply_to_message.from_user.id
    try:
        permissions = ChatPermissions(can_send_messages=False)
        bot.restrict_chat_member(chat_id, user_to_mute, permissions=permissions)
        bot.reply_to(message, get_text(chat_id, 'mute_success'))
    except Exception as e:
        bot.reply_to(message, f"❌ Error: {str(e)}")

@bot.message_handler(commands=['unmute'])
def unmute_user(message):
    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        return
    if not is_admin_or_creator(chat_id, message.from_user.id):
        bot.reply_to(message, get_text(chat_id, 'admin_only'))
        return
    if not message.reply_to_message:
        bot.reply_to(message, get_text(chat_id, 'reply_needed'))
        return
    
    user_to_unmute = message.reply_to_message.from_user.id
    try:
        permissions = ChatPermissions(can_send_messages=True, can_send_media_messages=True, can_send_other_messages=True, can_add_web_page_previews=True)
        bot.restrict_chat_member(chat_id, user_to_unmute, permissions=permissions)
        bot.reply_to(message, get_text(chat_id, 'unmute_success'))
    except Exception as e:
        bot.reply_to(message, f"❌ Error: {str(e)}")

# ==================== /id & /info ====================
@bot.message_handler(commands=['id', 'info'])
def get_user_info(message):
    chat_id = message.chat.id
    if message.reply_to_message:
        user = message.reply_to_message.from_user
        text = f"👤 *User Info*\nName: {user.first_name}\nID: `{user.id}`\nUsername: @{user.username or 'None'}\n\nChat ID: `{chat_id}`"
    else:
        user = message.from_user
        text = f"👤 *Your Info*\nName: {user.first_name}\nID: `{user.id}`\nUsername: @{user.username or 'None'}\n\nChat ID: `{chat_id}`"
    bot.reply_to(message, text, parse_mode='Markdown')

# ==================== EXTRA: /stats ====================
@bot.message_handler(commands=['stats'])
def group_stats(message):
    chat_id = message.chat.id
    try:
        count = bot.get_chat_member_count(chat_id)
        bot.reply_to(message, f"👥 *Group Stats*\nTotal Members: `{count}`")
    except:
        bot.reply_to(message, "❌ Could not get stats.")

# ==================== RUN BOT ====================
if __name__ == "__main__":
    print("🚀 Zayra Super Group Help Bot is now running!")
    print("Features: Welcome/Goodbye | Custom Rules (/setrules) | Nice UI (/menu) | Bilingual (EN/SI) | Advanced Warn (4th = Kick) + many more")
    bot.polling(none_stop=True, interval=0, timeout=20)
