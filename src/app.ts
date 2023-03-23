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
import { capitalize } from 'lodash';
import { pushSendNewPhrase, replySendNewPhrase } from '@/lib/phrases';
import cron from 'node-cron';
import dayjs from 'dayjs';

export const bot = new Telegraf<Context>(process.env.TELEGRAM_BOT_TOKEN ?? '');

bot.use(async (ctx, next) => {
  const user = await getUser(ctx);
  ctx.user = user;

  return next();
});

bot.start(startHandler);

bot.command('help', async (ctx) => {
  ctx.reply(`This bot will send your recent catches from Language Project app

It will take your 💾 saved phrases and try to give you a text, where the meaning of the phrase is clear.

You got the meaning? Press 👍
You didn’t? Press ❌

Want to try again with new text? - 🔁

Also:
Translate the phrase to your native language 🌐
Get a joke with the phrase 🤡`);
});
bot.command('new', (ctx) => replySendNewPhrase(ctx));
bot.command('clear', clearHandler);
bot.command('cancel', async (ctx) => {
  const user = await getUser(ctx);
  await supabase
    .from('telegram_users')
    .update({ state: 'idle' })
    .eq('user_id', user?.user_id);
  ctx.reply('Ok, canceled');
});
bot.command('reset', async (ctx) => {
  const user = await getUser(ctx);
  await supabase.from('user_feed_queue').delete().eq('user_id', user?.user_id);

  ctx.reply('Ok, reset');
});
bot.command('info', async (ctx) => {
  if (!ctx.user) {
    ctx.reply('You are not logged in');
    return;
  }
  const user = await adminAuthClient.getUserById(ctx.user.user_id);

  ctx.reply(
    `Email: <b>${user.data.user?.email}</b>
  
Native language: <b>${ctx.user.native_language}</b>
Explanations language: <b>${capitalize(
      ctx.user.default_explanation_language ?? ''
    )}</b>
Phrases per message: <b>${capitalize(ctx.user.phrases_batch_size ?? '')}</b>

----

⚠️ Explanations language is the language which will be used when you generate new context or explanation for the phrase.
`,
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
          [
            {
              text: 'Change lang for explanations',
              callback_data: 'change_default_explanation_lang',
            },
          ],
          [
            {
              text: 'Change phrases per message',
              callback_data: 'change_phrases_batch_size',
            },
          ],
        ],
      },
    }
  );
});

bot.on('message', async (ctx) => messageHandler(ctx));

bot.on('callback_query', async (ctx) => callbackQueryHandler(ctx));

console.log('Starting bot...');
bot.launch();

const sendOnSchedule = async () => {
  const users = await supabase.from('telegram_users').select('*');

  for await (const user of users.data ?? []) {
    const latestMessage = await supabase
      .from('user_feed_queue')
      .select('*')
      .eq('user_id', user.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const createdAt = dayjs(latestMessage.data?.created_at);

    if (createdAt.isBefore(dayjs(), 'day')) {
      // console.log('Send new', latestMessage.data);
      pushSendNewPhrase(user.chat_id);
    }
  }
};

cron.schedule('*/10 * * * *', async () => {
  // console.log('Cron job started');
  sendOnSchedule();
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
