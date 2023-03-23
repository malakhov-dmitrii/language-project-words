import { bot } from '@/app';
import { replyOptions } from '@/lib/config';
import { Database } from '@/lib/database.types';
import { prisma } from '@/lib/db';
import { languages } from '@/lib/languages';
import { getCompletion, openai } from '@/lib/openai';
import { adminAuthClient, supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/types';
import { getUser } from '@/lib/user';
import { handleGetAudio } from '@/lib/utils';
import { phrases } from '@prisma/client';
import { sortBy, uniq, uniqBy } from 'lodash';
import { Context, NarrowedContext } from 'telegraf';
import { Message, Update } from 'telegraf/typings/core/types/typegram';

export const getRecentPhrases = async (user: UserProfile) => {
  const authUser = await adminAuthClient.getUserById(user?.user_id);
  const amount = user.phrases_batch_size === 'single' ? 1 : 3;

  const groups = await prisma.user_group.findMany({
    where: { users: { email: authUser.data.user?.email } },
  });

  const phrases = await prisma.phrases.findMany({
    where: {
      userGroupId: { in: groups.map((group) => group.id) },
    },
    include: {
      user_group_video: {
        select: {
          nativeLangCode: true,
          targetLangCode: true,
        },
      },
    },
  });

  const passedPhrases = await supabase
    .from('user_feed_queue')
    .select('*') //
    .eq('user_id', authUser.data.user?.id);

  const phrasesStr = sortBy(phrases, (i) => i.createdAt)
    .reverse()
    .map((phrase) => ({
      ...phrase,
      text: phrase.highlighted?.replaceAll('\n', ' ').trim() ?? '',
    }))
    .filter((i) => !!i.text);

  const diff = uniq(phrasesStr).filter(
    (p) => !passedPhrases.data?.find((pp) => pp.phrase === p.text)
  );

  if (diff.length === 0) {
    return null;
  }

  /**
   * Sorts by language or video key to avoid sending phrases from different languages
   * Sort by createdAt and take the first N elements with the same language
   */
  const sortedDiff = sortBy(diff, (i) => i.createdAt).reverse();
  const sortedDiffByLang = sortBy(
    sortedDiff,
    (i) => i.user_group_video?.targetLangCode
  );

  // return N elements from the array
  return sortedDiffByLang.slice(0, amount);
};

export const replySendNewPhrase = async (
  ctx: NarrowedContext<Context<Update>, Update.MessageUpdate<Message>>,
  retryPhrasesIds?: number[]
) => {
  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  const placeholder = await ctx.reply('Getting a phrase...', {
    disable_notification: true,
  });

  const phrases = await getRecentPhrases(user);
  const phrasesCleared = phrasesPreprocess(phrases);

  if (!phrasesCleared?.length) {
    ctx.reply(
      "Looks like you've learned all the phrases. Please, come back later."
    );
    return;
  }

  const { replyText, targetLangCode, prompt } = await composeMessage(
    phrasesCleared
  );

  if (!replyText) {
    ctx.reply('Something went wrong. Please, try again later.');
    return;
  }

  const reply = await ctx.reply(replyText, {
    parse_mode: 'HTML',
    reply_markup: replyOptions.reply_markup,
  });

  const audioUrl = await handleGetAudio({
    text: reply.text,
    langCode: targetLangCode,
  });
  if (!audioUrl) {
    ctx.reply('Sorry, failed to get audio...');
    return;
  }
  ctx.replyWithVoice(audioUrl);

  await savePhrasesAsCompleted(phrasesCleared, user, reply, prompt);

  ctx.deleteMessage(placeholder.message_id);
};

export const pushSendNewPhrase = async (chatId: number) => {
  const userResponse = await supabase
    .from('telegram_users')
    .select('*')
    .eq('chat_id', chatId)
    .single();
  const user = userResponse.data;
  if (!user) return;

  const phrases = await getRecentPhrases(user);
  const phrasesCleared = phrasesPreprocess(phrases);

  const { replyText, targetLangCode, prompt } = await composeMessage(
    phrasesCleared
  );

  const reply = await bot.telegram.sendMessage(user.chat_id, replyText, {
    parse_mode: 'HTML',
    reply_markup: replyOptions.reply_markup,
  });

  const audioUrl = await handleGetAudio({
    text: reply.text,
    langCode: targetLangCode,
  });
  if (!audioUrl) return;

  bot.telegram.sendVoice(user.chat_id, audioUrl);
  await savePhrasesAsCompleted(phrasesCleared, user, reply, prompt);
};

async function savePhrasesAsCompleted(
  phrasesCleared: ReturnType<typeof phrasesPreprocess>,
  user: UserProfile,
  message: { message_id: number; text: string },
  prompt: string
) {
  for await (const phrase of phrasesCleared) {
    await supabase
      .from('user_feed_queue')
      .upsert({
        phrase: phrase.highlighted,
        phrase_original_id: phrase.id,
        user_id: user?.user_id!,
        message_id: message.message_id,
        prompt,
        gpt_reply: message.text,
      })
      .eq('phrase_original_id', phrase.id);
  }
}

async function composeMessage(
  phrasesCleared: ReturnType<typeof phrasesPreprocess>
) {
  const targetLangCode = phrasesCleared[0]
    .targetLangCode as keyof typeof languages;
  const language = languages[targetLangCode];

  const prompt = `I want to learn a couple of phrases in ${language} language. Here is the list of them: ${phrasesCleared
    .map((i, idx) => `${idx + 1}. ${i.highlighted}`)
    .join(
      '\n'
    )}. I want to learn them in new context. Here is the original context: ${phrasesCleared
    .map((i, idx) => `${idx + 1}. ${i.context}`)
    .join('\n')}.
      
Please, generate a new common context for that phrases and make them sound natural and easy to understand for beginners. Highlight original phrases using <b>bold</b> tag. Avoid providing a translation or direct explanation of the phrase. Use the same language as the original context.`;
  const text = await getCompletion(prompt);

  const replyText = `${text}
  
--- <b>Original phrases</b> ---
${phrasesCleared.map((i) => i.highlighted).join('\n')}

--- <b>Original context</b> ---
${phrasesCleared.map((i) => i.context).join('\n')}
  `;
  return { replyText, targetLangCode, prompt };
}

type Phrase = phrases & {
  text: string;
  user_group_video: {
    targetLangCode: string | null;
  } | null;
};

function phrasesPreprocess(phrases: Phrase[] | null) {
  return uniqBy(
    phrases
      ?.map((i) => {
        const res = {
          id: i.id,
          context: i.fullPhrase?.replaceAll('\n', ' ').trim() ?? '',
          highlighted: i.highlighted?.replaceAll('\n', ' ').trim() ?? '',
          targetLangCode: i.user_group_video?.targetLangCode,
        };
        return res;
      })
      .filter((i) => !!i.highlighted),
    (i) => i.highlighted.toLowerCase()
  );
}
