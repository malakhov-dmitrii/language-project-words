import { decode } from 'base64-arraybuffer';
import { languages } from '@/lib/languages';
import { getCompletion } from '@/lib/openai';
import { sendNewPhrase } from '@/lib/phrases';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';
import { getUser } from '@/lib/user';
import { delay, translate } from '@/lib/utils';
import axios from 'axios';
import { entries } from 'lodash';
import { Context, NarrowedContext } from 'telegraf';
import { CallbackQuery, Message, Update } from 'telegraf/typings/core/types/typegram';
import * as googleTTS from 'google-tts-api';
import { write, writeFileSync } from 'fs';
import { writeAsync } from 'fs-jetpack';
import dayjs from 'dayjs';

const getVoiceOver = async (text: string, lang: string) => {
  const res = await googleTTS.getAllAudioBase64(text, {
    lang: lang ?? 'en',
  });

  return res.map(r => r.base64).join('');
};

type Ctx = NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery>>;

const saveUserReaction = async (ctx: Ctx, text: string, reply: string) => {
  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  const originalPhrase = text.split('The original phrase/word: ')[1];

  ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(e => console.log(e.message));

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
      reply,
    }) //
    .eq('phrase', text);
};

// const getDadJoke = async () => {
//   const dadJoke = await axios
//     .get('https://dad-jokes.p.rapidapi.com/random/joke', {
//       headers: {
//         Accept: 'application/json',
//         'X-RapidAPI-Key': 'd2c263ecf4msh84b19013afcdf16p1ffebcjsn03de177baf11',
//         'X-RapidAPI-Host': 'dad-jokes.p.rapidapi.com',
//       },
//     })
//     .catch(e => {
//       console.log(e.message);

//       return { data: '' };
//     });

//   const body = dadJoke.data?.body?.[0];
//   const res = body?.setup + '\n' + body?.punchline;

//   return body ? res : '';
// };

const callbackQueryHandler = async (ctx: Ctx) => {
  ctx.answerCbQuery('Cool, lets go with the next one!').catch(e => console.log(e.message));

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;
  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  if (reply === 'like' || reply === 'dislike') {
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

  if (reply === 'retry') {
    ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(e => console.log(e.message));
    // @ts-expect-error message.text is not defined in the type
    await sendNewPhrase(ctx, ctx.callbackQuery.message?.text.split('The original phrase/word: ')[1]);
    return;
  }

  if (reply === 'joke') {
    const placeholder = await ctx.reply(`Thinking...`);

    const message_id = ctx.callbackQuery.message?.message_id;
    const phrase = await supabase
      .from('user_feed_queue') //
      .select()
      .eq('message_id', message_id)
      .single();

    if ((phrase.data?.jokes?.length ?? 0) > 2) {
      ctx.reply("Hey, I've already told you 3 jokes about this phrase 🤡");
    }

    const prompt = `Tell me a good joke which uses phrase "${phrase.data?.phrase}", or about it.`;
    const joke = await getCompletion(prompt);

    ctx.deleteMessage(placeholder.message_id);

    if (!joke) {
      ctx.reply('Sorry, I could not come up with a joke for this phrase');
      return;
    }

    await supabase
      .from('user_feed_queue')
      .update({ jokes: [...(phrase.data?.jokes ?? []), joke] })
      .eq('message_id', message_id);
    ctx.reply(joke);
  }

  if (reply === 'audio') {
    const user = await getUser(ctx);
    const langCode = getLangCodeFromFull(user);
    const vo = await getVoiceOver(text, langCode);
    const path = `${dayjs().format('HH:mm:ss DD MMM YYYY')}.mp3`;

    const upload = await supabase.storage.from('audio').upload(path, decode(vo), { contentType: 'audio/mp3' });
    const r = await supabase.storage.from('audio').getPublicUrl(path);

    if (upload.data) {
      ctx.replyWithVoice(r.data.publicUrl, { reply_to_message_id: ctx.callbackQuery.message?.message_id });
    } else {
      console.log(upload.error);

      ctx.reply('Sorry, something went wrong');
    }
  }

  if (reply === 'change_native_language') {
    const user = await getUser(ctx);
    await supabase
      .from('telegram_users') //
      .update({ state: 'change_native_language' })
      .eq('user_id', user?.user_id);

    ctx.reply('Please, send me your native language or /cancel');
  }
};

export default callbackQueryHandler;
export function getLangCodeFromFull(user: UserProfile | null) {
  return entries(languages).find(([code, name]) => name.toLowerCase() === user?.native_language.toLowerCase())?.[0];
}
