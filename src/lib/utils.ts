import * as googleTTS from 'google-tts-api';
import axios from 'axios';
import dayjs from 'dayjs';
import { getUser } from '@/lib/user';
import { Context, CtxUpdate } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import { Context as TContext, NarrowedContext } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';

export const pickRandom = (arr: any[]) =>
  arr[Math.floor(Math.random() * arr.length)];

interface TranslateResponse {
  data: string;
}
export async function translate({
  text,
  to,
  source,
}: {
  text: string;
  to: string;
  source?: string;
}) {
  const url = `https://deeplx-production-bf8b.up.railway.app/translate`;
  const response = await axios
    .post<TranslateResponse>(url, {
      target_lang: to,
      text,
      ...(source && { source_lang: source }),
    })
    .catch((e) => {
      console.error(e);
      return null;
    });

  if (!response) return null;

  return response.data.data;
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ce53fef5544a77486c36e8000abd1d7f
export const detectLanguage = async (text: string) => {
  const response = await axios.post(
    'https://ws.detectlanguage.com/0.2/detect',
    {
      q: text,
    },
    {
      headers: {
        Authorization: 'Bearer ce53fef5544a77486c36e8000abd1d7f',
      },
    }
  );

  return response.data.data.detections[0].language;
};

export async function handleGetAudio(
  ctx: NarrowedContext<TContext<Update>, Update.MessageUpdate<any>>,
  {
    text,
    langCode,
  }: {
    langCode?: string;
    text: string;
  }
) {
  const user = await getUser(ctx);

  const detectedLang = await detectLanguage(text);
  const lang = langCode || detectedLang;

  console.log('detectedLang', detectedLang);

  if (!lang) {
    ctx.reply('We could not find your language code');
    return;
  }

  const path = `${dayjs().format('HH:mm:ss DD MMM YYYY')}.mp3`;
  const vo = await getVoiceOver(text, lang);

  const upload = await supabase.storage
    .from('audio')
    .upload(path, decode(vo), { contentType: 'audio/mp3' });
  const r = await supabase.storage.from('audio').getPublicUrl(path);

  if (upload.data) {
    ctx.replyWithVoice(r.data.publicUrl);
  } else {
    console.log(upload.error);
    ctx.reply('Sorry, something went wrong');
  }
}

export const getVoiceOver = async (text: string, lang: string) => {
  const res = await googleTTS.getAllAudioBase64(text, {
    lang: lang ?? 'en',
  });

  return res.map((r) => r.base64).join('');
};
