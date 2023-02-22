import { replyOptions } from '@/lib/config';
import { prisma } from '@/lib/db';
import { openai } from '@/lib/openai';
import { adminAuthClient, supabase } from '@/lib/supabase';
import { getUser } from '@/lib/user';
import { sortBy, uniq } from 'lodash';
import { Context } from 'telegraf';

export const getRecentPhrase = async (ctx: Context) => {
  const _user = await getUser(ctx);

  if (_user) {
    const authUser = await adminAuthClient.getUserById(_user?.user_id);

    const groups = await prisma.user_group.findMany({
      where: { users: { email: authUser.data.user?.email } },
    });

    const phrases = await prisma.phrases.findMany({
      where: {
        userGroupId: { in: groups.map(group => group.id) },
      },
    });

    const passedPhrases = await supabase
      .from('user_feed_queue')
      .select('*') //
      .eq('user_id', authUser.data.user?.id);

    const phrasesStr = sortBy(phrases, i => i.createdAt)
      .reverse()
      .map(phrase => phrase.highlighted?.replaceAll('\n', ' ').trim() ?? '')
      .filter(Boolean);
    const diff = uniq(phrasesStr).filter(p => !passedPhrases.data?.find(pp => pp.phrase === p));

    if (diff.length === 0) {
      return null;
    }

    return diff[0];
  }
};

export const sendNewPhrase = async (ctx: Context, retryPhrase?: string) => {
  const placeholder = await ctx.reply('Getting a phrase...', { disable_notification: true });
  const phrase = retryPhrase ?? (await getRecentPhrase(ctx));

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

  const reply = await ctx.reply(
    `${text}
  
The original phrase/word: <b>${phrase}</b>`,
    replyOptions
  );

  ctx.deleteMessage(placeholder.message_id);

  await supabase.from('user_feed_queue').insert({ phrase, user_id: user?.user_id!, generated_text: text, message_id: reply.message_id });
};
