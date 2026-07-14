from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

# ඔබේ තොරතුරු මෙතැනට දමන්න
TOKEN = '8531746057:AAGZSIS7wd6Qmb9PaMwJ9rjLfjVeoJU4Zww'
MY_ID = '7625328639'

async def forward_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # පණිවිඩය ලැබුණු group එකේ නම සහ පණිවිඩය ලබා ගැනීම
    chat_title = update.effective_chat.title
    user_name = update.effective_user.full_name
    message_text = update.effective_message.text

    # ඔබට පණිවිඩය යැවීම
    forward_text = f"New message in: {chat_title}\nFrom: {user_name}\n\nMessage: {message_text}"
    
    await context.bot.send_message(chat_id=MY_ID, text=forward_text)

if __name__ == '__main__':
    application = ApplicationBuilder().token(TOKEN).build()
    
    # සියලුම text පණිවිඩ අල්ලගන්නා handler එක
    msg_handler = MessageHandler(filters.TEXT & (~filters.COMMAND), forward_messages)
    application.add_handler(msg_handler)
    
    print("Bot is running...")
    application.run_polling()
