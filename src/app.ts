import { adminAuthClient, supabase } from './lib/supabase';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { getUser, getRandomPhrase, setupUser } from '@/lib/user';
import { delay, translate } from '@/lib/utils';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN ?? '');

bot.start(async ctx => {
  const user = await getUser(ctx);
  if (user) {
    ctx.reply('Your account connected, lets get started.');
    sendNewPhrase(ctx);

    /**
     * TODO: We can add selection of native language and language to learn
     * to show only phrases from the selected language
     * and translate them to the native language properly
     */
    //   await supabase.from('telegram_users').update({state:""})
  } else {
    ctx.reply(`Welcome! To get started, lets connect your account.
      
Please, send me your email address which you used to register on the website.`);
  }
});

bot.command('clear', async ctx => {
  console.log('clear');

  const user = await getUser(ctx);

  await supabase.from('telegram_users').delete().eq('telegram_id', ctx.from?.id);
  await adminAuthClient.deleteUser(user?.user_id);
  ctx.reply('Your account has been deleted. You can start over by sending /start');
});

const sendNewPhrase = async (ctx: Context) => {
  const phrase = await getRandomPhrase(ctx);

  if (!phrase) {
    ctx.reply("Looks like you've learned all the phrases. Please, come back later.");
    return;
  }

  ctx.reply(phrase, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '👍',
            callback_data: 'like',
          },
          {
            text: '❌',
            callback_data: 'dislike',
          },
          {
            text: 'Skip',
            callback_data: 'dislike',
          },
        ],
        [
          {
            text: 'Need translation 🇬🇧',
            callback_data: 'translation',
          },
        ],
      ],
    },
  });
};

bot.on('message', async (ctx, next) => {
  const user = await getUser(ctx);

  /**
   * This message should contain email address to connect to the account
   * If user is not found, create a new one
   */
  if (!user) {
    // @ts-expect-error this is a hack to get around the fact that Telegraf doesn't have a type for message.text
    await setupUser(ctx, ctx.message.text);
  } else {
    /**
     * Now we know user email, so we can read the data from the database using prisma
     * we can get user phrases, and form the queue of phrases to send to the user
     *
     * As soon as email is confirmed, we can run a function that takes all the phrases
     * and sends the first one to the user
     *
     * Later we will generate a text with set of N phrases and send it to the user
     *
     * Then we can take batch of phrases and save them to the database
     *
     * We need to add buttons to the message to allow user to mark phrases as learned
     * thumbs up, thumbs down, and maybe a button to report a phrase
     *
     * We can also add a button to show the translation of the phrase
     * We can also add a button to show the phrase in the context
     *
     * Once user clicks on the button, we can get item from the database, generate text and send the next phrase with buttons
     *
     * So this way we'll create infinite feed of phrases
     *
     * NOTE: we need to ask user to send us the language they want to learn
     * NOTE: we need to ask how often user wants us to send them phrases (after a day, after a week, after a month of inactivity)
     *
     */

    sendNewPhrase(ctx);
  }
});

bot.on('callback_query', async ctx => {
  ctx.answerCbQuery('Thanks for your feedback!');

  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;

  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  if (reply !== 'translation') {
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const existingPhrase = await supabase.from('user_feed_queue').select().eq('phrase', text).eq('user_id', user.user_id).single();

    await supabase
      .from('user_feed_queue') //
      .upsert({ id: existingPhrase.data?.id, phrase: text, user_id: user.user_id, reply }) //
      .eq('phrase', text);
  } else {
    const translated = await translate({
      text,
      to: 'en',
    });
    ctx.reply(translated);
    await delay(5000);
  }

  sendNewPhrase(ctx);
});

console.log('Starting bot...');
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
