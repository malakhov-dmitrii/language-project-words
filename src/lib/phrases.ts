import { replyOptions } from '@/lib/config';
import { prisma } from '@/lib/db';
import { languages } from '@/lib/languages';
import { getCompletion, openai } from '@/lib/openai';
import { adminAuthClient, supabase } from '@/lib/supabase';
import { getUser } from '@/lib/user';
import { handleGetAudio } from '@/lib/utils';
import { sortBy, uniq, uniqBy } from 'lodash';
import { Context, NarrowedContext } from 'telegraf';
import { Message, Update } from 'telegraf/typings/core/types/typegram';

export const getRecentPhrases = async (ctx: Context) => {
  const _user = await getUser(ctx);

  if (_user) {
    const authUser = await adminAuthClient.getUserById(_user?.user_id);
    const amount = _user.phrases_batch_size === 'single' ? 1 : 3;

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
  }
};

export const sendNewPhrase = async (
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

  const phrases = await getRecentPhrases(ctx);

  const phrasesCleared = uniqBy(
    phrases
      ?.map((i) => {
        const res = {
          id: i.id,
          context: i.fullPhrase?.replaceAll('\n', ' ').trim() ?? '',
          highlighted: i.highlighted?.replaceAll('\n', ' ').trim() ?? '',
        };
        return res;
      })
      .filter((i) => !!i.highlighted),
    (i) => i.highlighted.toLowerCase()
  );

  if (!phrasesCleared?.length) {
    ctx.reply(
      "Looks like you've learned all the phrases. Please, come back later."
    );
    return;
  }

  const targetLangCode = phrases?.[0]?.user_group_video
    ?.targetLangCode as keyof typeof languages;
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

  if (!text) {
    ctx.reply('Something went wrong. Please, try again later.');
    return;
  }

  const replyText = `${text}
  
--- <b>Original phrases</b> ---
${phrasesCleared.map((i) => i.highlighted).join('\n')}

--- <b>Original context</b> ---
${phrasesCleared.map((i) => i.context).join('\n')}
  `;

  const reply = await ctx.reply(replyText, {
    parse_mode: 'HTML',
    reply_markup: replyOptions.reply_markup,
  });

  await handleGetAudio(ctx, { text: reply.text, langCode: targetLangCode });

  /**
   * Save phrases as completed
   */
  for await (const phrase of phrasesCleared) {
    await supabase
      .from('user_feed_queue')
      .upsert({
        phrase: phrase.highlighted,
        phrase_original_id: phrase.id,
        user_id: user?.user_id!,
        message_id: reply.message_id,
        prompt,
        gpt_reply: reply.text,
      })
      .eq('phrase_original_id', phrase.id);
  }

  ctx.deleteMessage(placeholder.message_id);
};
