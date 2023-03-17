import { decode } from 'base64-arraybuffer';
import { languages } from '@/lib/languages';
import { getCompletion } from '@/lib/openai';
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

  const originalPhrase = text.split('The original phrase/word: ')[1];

  ctx
    .editMessageReplyMarkup({ inline_keyboard: [] })
    .catch((e) => console.log(e.message));

  const existingPhrase = await supabase
    .from('user_feed_queue') //
    .select()
    .eq('message_id', ctx.callbackQuery.message?.message_id)
    .single();

  await supabase
    .from('user_feed_queue') //
    .upsert({
      id: existingPhrase.data?.id, //
      phrase: existingPhrase.data?.phrase ?? originalPhrase,
      user_id: user.user_id,
      reply: reply === 'next' ? 'like' : reply,
    }) //
    .eq('phrase', text);
};

const callbackQueryHandler = async (ctx: CtxUpdate) => {
  ctx
    .answerCbQuery('Cool, lets go with the next one!')
    .catch((e) => console.log(e.message));

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;
  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  if (reply === 'next' || reply === 'dislike') {
    await saveUserReaction(ctx, text, reply);
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
    ctx.reply(translated);
    return;
  }

  if (reply === 'change_native_language') await handleChangeLang(ctx, reply);
  if (reply === 'change_default_explanation_lang')
    handleUserSelectChangeExplanationsLang(ctx);

  if (reply === 'change_phrases_batch_size') handleUserSelectChangeBatch(ctx);
  if (reply.includes('explanation_lang:')) handleSaveExplanationsLang(ctx);
  if (reply.includes('phrases_batch_size:')) handleSaveBacth(ctx);

  if (reply === 'new_context') await handleNewContext(ctx);
};

export default callbackQueryHandler;

const handleNewContext = async (ctx: CtxUpdate) => {
  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  if (user.default_explanation_language === 'original') {
    ctx.reply('Generating new context in orginal language...');
    return;
  }

  if (user.default_explanation_language === 'native') {
    ctx.reply(`Generating new context in ${user.native_language} language...`);
    return;
  } else {
    ctx.reply(
      `Generating new context in ${user.default_explanation_language} language...`
    );
    return;
  }
};

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
          text: 'Orginal',
          callback_data: 'explanation_lang:orginal',
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
      'Please enter the language you want to get explanations in. You can also set "orginal" or "native" value.'
    );
  } else ctx.reply('Please, send language or /cancel');
}

export function getLangCodeFromFull(user: UserProfile | null) {
  return entries(languages).find(
    ([code, name]) => name.toLowerCase() === user?.native_language.toLowerCase()
  )?.[0];
}
