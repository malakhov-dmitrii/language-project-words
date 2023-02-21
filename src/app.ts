import { adminAuthClient, supabase } from './lib/supabase';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { getUser, getRecentPhrase, setupUser } from '@/lib/user';
import { delay, translate } from '@/lib/utils';
import { openai } from '@/lib/openai';
// import { ChatGPTClient } from '@waylaidwanderer/chatgpt-api';
// const cacheOptions = {};

// const chatGptClient = new ChatGPTClient(
//   process.env.OPENAI_KEY,
//   {
//     modelOptions: {
//       model: 'text-davinci-003',
//     },
//     debug: false,
//   },
//   cacheOptions
// );

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
  await adminAuthClient.deleteUser(user?.user_id!);
  ctx.reply('Your account has been deleted. You can start over by sending /start');
});

const sendNewPhrase = async (ctx: Context) => {
  const placeholder = await ctx.reply('Generating a new phrase...', { disable_notification: true });
  const phrase = await getRecentPhrase(ctx);

  if (!phrase) {
    ctx.reply("Looks like you've learned all the phrases. Please, come back later.");
    return;
  }

  const generated = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `I want you to act as a language tutor. I will provide you a word or a phrase, and you will generate a small paragraph using this word or phrase so it should be easy to understand the meaning of the word or phrase without translation. Here is my input: "${phrase}"\n\nYour response:`,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const text = generated.data.choices[0].text;

  const user = await getUser(ctx);

  console.log('generated text', text);

  const reply = await ctx.reply(
    `${text}
  
The original phrase/word: <b>${phrase}</b>`,
    {
      parse_mode: 'HTML',
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
    }
  );

  ctx.deleteMessage(placeholder.message_id);

  await supabase.from('user_feed_queue').insert({ phrase, user_id: user?.user_id!, generated_text: text, message_id: reply.message_id });
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
  ctx.answerCbQuery('Cool, lets go with the next one!');

  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;

  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  // console.log(ctx.callbackQuery.message?.message_id);

  if (reply !== 'translation') {
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const existingPhrase = await supabase
      .from('user_feed_queue') //
      .select()
      .eq('message_id', ctx.callbackQuery.message?.message_id)
      // .eq('user_id', user.user_id)
      .single();

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
