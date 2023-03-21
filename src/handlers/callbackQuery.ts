import { decode } from 'base64-arraybuffer';
import { languages } from '@/lib/languages';
import { getCompletion, openai } from '@/lib/openai';
import { sendNewPhrase } from '@/lib/phrases';
import { supabase } from '@/lib/supabase';
import { CtxUpdate, UserProfile } from '@/lib/types';
import { getUser } from '@/lib/user';
import { delay, detectLanguage, handleGetAudio, translate } from '@/lib/utils';
import axios from 'axios';
import { entries } from 'lodash';
import { Context, NarrowedContext } from 'telegraf';
import {
  CallbackQuery,
  Message,
  Update,
} from 'telegraf/typings/core/types/typegram';
import dayjs from 'dayjs';
import { replyOptions } from '@/lib/config';

const saveUserReaction = async (
  ctx: CtxUpdate,
  text: string,
  reply: string
) => {
  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  // const originalPhrase = text.split('The original phrase/word: ')[1];

  // ctx
  //   .editMessageReplyMarkup({ inline_keyboard: [] })
  //   .catch((e) => console.log(e.message));

  // const existingPhrase = await supabase
  //   .from('user_feed_queue') //
  //   .select()
  //   .eq('message_id', ctx.callbackQuery.message?.message_id)
  //   .single();

  // await supabase
  //   .from('user_feed_queue') //
  //   .upsert({
  //     id: existingPhrase.data?.id, //
  //     phrase: existingPhrase.data?.phrase ?? originalPhrase,
  //     user_id: user.user_id,
  //     reply: reply === 'next' ? 'like' : reply,
  //   }) //
  //   .eq('phrase', text);
};

const callbackQueryHandler = async (ctx: CtxUpdate) => {
  ctx
    .answerCbQuery('Cool, lets go with the next one!')
    .catch((e) => console.log(e.message));

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;
  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  if (reply === 'next') {
    // await saveUserReaction(ctx, text, reply);
    await sendNewPhrase(ctx);
    return;
  }

  if (reply === 'translation') {
    const user = await getUser(ctx);
    const langCode = getLangCodeFromFull(user);

    const translated = await translate({
      text,
      to: langCode ?? 'en',
    });

    if (!translated) {
      ctx.reply('Sorry, I could not translate this phrase');
      return;
    }
    const r = await ctx.reply(translated);
    await handleGetAudio(ctx, { text: r.text });
    return;
  }

  if (reply === 'change_native_language') await handleChangeLang(ctx, reply);
  if (reply === 'change_default_explanation_lang')
    handleUserSelectChangeExplanationsLang(ctx);

  if (reply === 'change_phrases_batch_size') handleUserSelectChangeBatch(ctx);
  if (reply.includes('explanation_lang:')) handleSaveExplanationsLang(ctx);
  if (reply.includes('phrases_batch_size:')) handleSaveBacth(ctx);

  // if (reply === 'new_context') await handleNewContext(ctx);
  if (reply === 'explanation') await handleGetExplanation(ctx);
};

export default callbackQueryHandler;

const handleGetExplanation = async (ctx: CtxUpdate) => {
  ctx.reply('Generating explanation...');
  const rec = await supabase
    .from('user_feed_queue')
    .select()
    .eq('message_id', ctx.callbackQuery.message?.message_id);
  const record = rec.data?.[0];
  if (rec.error) {
    console.log(rec.error);

    ctx.reply('Sorry, I could not generate an explanation');
    return;
  }

  const user = await getUser(ctx);
  const languageToExplain =
    user?.default_explanation_language === 'native'
      ? user.native_language
      : user?.default_explanation_language;

  const newPrompt = `Now I want you to explain each phrase in your own words. Please, write a short explanation, highlight the original phrase with <b>bold</b> tag. Use the ${languageToExplain} language for explanation.`;

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      {
        content: record?.prompt ?? '',
        role: 'user',
      },
      {
        content: record?.gpt_reply ?? '',
        role: 'assistant',
      },
      {
        content: newPrompt,
        role: 'user',
      },
    ],
  });

  const text = response.data.choices[0].message?.content;
  if (!text) {
    ctx.reply('Sorry, I could not generate an explanation');
    return;
  }

  const reply = await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Translate', callback_data: 'translation' }],
        [{ text: 'Next', callback_data: 'next' }],
      ],
    },
  });

  await handleGetAudio(ctx, { text: reply.text });
};

// const handleNewContext = async (ctx: CtxUpdate) => {
//   const user = await getUser(ctx);
//   if (!user) {
//     ctx.reply('Please, connect your account first');
//     return;
//   }

//   console.log(ctx.update.callback_query.message?.message_id);

//   const record = await supabase
//     .from('user_feed_queue')
//     .select()
//     .eq('message_id', ctx.update.callback_query.message?.message_id);

//   if (!record.data) {
//     ctx.reply('Sorry, I could not find this phrase');
//     return;
//   }

//   const phrasesIds = record.data.map((r) => r.id);
//   console.log({ phrasesIds });

//   sendNewPhrase(ctx, phrasesIds);
// };

const handleUserSelectChangeBatch = (ctx: Context) => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: 'Single',
          callback_data: 'phrases_batch_size:single',
        },
        {
          text: 'Multiple (2-3)',
          callback_data: 'phrases_batch_size:multiple',
        },
      ],
      [
        {
          text: 'Cancel',
          callback_data: 'phrases_batch_size:cancel',
        },
      ],
    ],
  });
};
const handleUserSelectChangeExplanationsLang = (ctx: Context) => {
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: 'Native',
          callback_data: 'explanation_lang:native',
        },
        {
          text: 'Original',
          callback_data: 'explanation_lang:original',
        },
      ],
      [
        {
          text: 'Cancel',
          callback_data: 'explanation_lang:cancel',
        },
      ],
    ],
  });
};

const handleSaveBacth = async (ctx: CtxUpdate) => {
  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;
  const value = reply.split(':')[1];
  if (value === 'cancel')
    ctx.editMessageReplyMarkup({
      inline_keyboard: [],
    });
  else {
    const user = await getUser(ctx);
    await supabase
      .from('telegram_users') //
      .update({ phrases_batch_size: value, state: 'idle' })
      .eq('user_id', user?.user_id);
    ctx.editMessageReplyMarkup({
      inline_keyboard: [],
    });

    ctx.reply('Done! 🎉');
  }
};

const handleSaveExplanationsLang = async (ctx: CtxUpdate) => {
  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;
  const value = reply.split(':')[1];
  if (value === 'cancel')
    ctx.editMessageReplyMarkup({
      inline_keyboard: [],
    });
  else {
    const user = await getUser(ctx);
    const res = await supabase
      .from('telegram_users') //
      .update({ default_explanation_language: value, state: 'idle' })
      .eq('user_id', user?.user_id);
    ctx.editMessageReplyMarkup({
      inline_keyboard: [],
    });

    console.log(res);

    ctx.reply('Done! 🎉');
  }
};

async function handleChangeLang(ctx: CtxUpdate, reply: string) {
  const user = await getUser(ctx);
  await supabase
    .from('telegram_users') //
    .update({ state: reply })
    .eq('user_id', user?.user_id);

  if (reply === 'change_default_explanation_lang') {
    ctx.reply(
      'Please enter the language you want to get explanations in. You can also set "original" or "native" value.'
    );
  } else ctx.reply('Please, send language or /cancel');
}

export function getLangCodeFromFull(user: UserProfile | null) {
  return entries(languages).find(
    ([code, name]) => name.toLowerCase() === user?.native_language.toLowerCase()
  )?.[0];
}
