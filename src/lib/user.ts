import { adminAuthClient, supabase } from './supabase';
import { Context } from 'telegraf';
import { prisma } from '@/lib/db';
import { sortBy, uniq } from 'lodash';
import { pickRandom } from '@/lib/utils';

export const setupUser = async (ctx: Context, email: string) => {
  if (!ctx.from || !email) {
    return;
  }

  const user = await adminAuthClient.createUser({
    email,
  });

  if (user.error?.message) {
    ctx.reply(`${user.error.message}`);
  }

  if (user.data.user?.id) {
    const platformUser = await prisma.users.findUnique({
      where: { email },
      include: {
        user_languages: {
          include: { languages: true },
        },
      },
    });

    const record = await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: ctx.from.id,
        user_id: user.data.user.id,
        native_language: platformUser?.user_languages.find(l => l.status === 'One')?.languages?.name ?? 'English',
        learning_language: platformUser?.user_languages.find(l => l.status === 'Two')?.languages?.name ?? 'English',
      })
      .select('*')
      .single();

    ctx.reply(`We set your native language to ${record.data?.native_language} and learning language to ${record.data?.learning_language}`);

    if (!record.error) {
      const res = await adminAuthClient.inviteUserByEmail(email, { redirectTo: 'https://t.me/language_project_feed_bot?start=confirmed' });
      if (!res.error) {
        ctx.reply('Confirmation email has been sent to your email address. Please, confirm your email address to complete the setup.');
      }
    }
  }
};

export const getUser = async (ctx: Context) => {
  const { data, error } = await supabase.from('telegram_users').select('*').eq('telegram_id', ctx.from?.id).single();
  return data;
};

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
