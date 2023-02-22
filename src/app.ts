import * as dotenv from 'dotenv';
dotenv.config();

import { Telegraf } from 'telegraf';
import clearHandler from '@/handlers/clear';
import startHandler from '@/handlers/start';
import messageHandler from '@/handlers/message';
import callbackQueryHandler from '@/handlers/callbackQuery';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN ?? '');

bot.start(startHandler);

bot.command('clear', clearHandler);

bot.on('message', async ctx => messageHandler(ctx));

bot.on('callback_query', ctx => callbackQueryHandler(ctx));

console.log('Starting bot...');
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
