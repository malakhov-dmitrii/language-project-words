import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import { Telegraf } from 'telegraf';
import clearHandler from '@/handlers/clear';
import startHandler from '@/handlers/start';
import messageHandler from '@/handlers/message';
import callbackQueryHandler from '@/handlers/callbackQuery';
import { getUser } from '@/lib/user';
import { Context } from '@/lib/types';
import { adminAuthClient, supabase } from '@/lib/supabase';

const bot = new Telegraf<Context>(process.env.TELEGRAM_BOT_TOKEN ?? '');

bot.use(async (ctx, next) => {
  const user = await getUser(ctx);
  ctx.user = user;

  return next();
});

bot.start(startHandler);

bot.command('clear', clearHandler);
bot.command('cancel', async ctx => {
  const user = await getUser(ctx);
  await supabase.from('telegram_users').update({ state: 'idle' }).eq('user_id', user?.user_id);
  ctx.reply('Ok, canceled');
});
bot.command('info', async ctx => {
  if (!ctx.user) {
    ctx.reply('You are not logged in');
    return;
  }
  const user = await adminAuthClient.getUserById(ctx.user.user_id);

  ctx.reply(
    `Email: <b>${user.data.user?.email}</b>
  
Native language: <b>${ctx.user.native_language}</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Change native language',
              callback_data: 'change_native_language',
            },
          ],
        ],
      },
    }
  );
});

bot.on('message', async ctx => messageHandler(ctx));

bot.on('callback_query', async ctx => callbackQueryHandler(ctx));

console.log('Starting bot...');
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
