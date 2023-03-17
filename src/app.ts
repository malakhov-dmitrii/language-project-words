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
import { sendNewPhrase } from '@/lib/phrases';

const bot = new Telegraf<Context>(process.env.TELEGRAM_BOT_TOKEN ?? '');

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
bot.command('new', (ctx) => sendNewPhrase(ctx));
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

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * TODO:
 *
 * I Finished when I wanted to send audio along with new phrase.
 *
 * 1. Take N phrases from DB with their highlighed context
 * 2. Send them to user
 * 3. Generate a voiceover message with the phrase
 * 4. Send it to user
 * 5. Wait for user's reaction
 * 6. If user reacted with "Generate new context" - take phrases, but ask ChatGPT to generate a new context in original language
 * 7. If user reacted with "Translate to native" - translate generated text to native language
 * 8. If user reacted with "Generate explanations" - take phrases and default explanation language
 * then ask ChatGPT to generate explanations in that language
 * 9. If user reacted with "Generate joke" - take phrases and ask ChatGPT to generate a joke
 *
 */
