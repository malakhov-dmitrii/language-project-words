import { adminAuthClient, supabase } from './supabase';
import { Context } from 'telegraf';
import { prisma } from '@/lib/db';
import { UserProfile } from '@/lib/types';

export const setupUser = async (ctx: Context, email: string) => {
  if (!ctx.from || !email) {
    return;
  }

  const platformUser = await prisma.users.findUnique({
    where: { email },
    include: {
      user_languages: {
        include: { languages: true },
      },
    },
  });

  if (!platformUser) {
    ctx.reply(
      "We couldn't find your account on the platform. Please, make sure you use the same email address you used to sign up on the platform."
    );
    return;
  }

  const user = await adminAuthClient.createUser({
    email,
  });

  if (user.error?.message) {
    ctx.reply(`${user.error.message}`);
    return;
  }

  if (user.data.user?.id) {
    // ctx.chat?.id
    const record = await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: ctx.from.id,
        user_id: user.data.user.id,
        native_language:
          platformUser?.user_languages.find((l) => l.status === 'One')
            ?.languages?.name ?? 'English',
        learning_language:
          platformUser?.user_languages.find((l) => l.status === 'Two')
            ?.languages?.name ?? 'English',
        email,
        chat_id: ctx.chat?.id,
      })
      .select('*')
      .single();

    ctx.reply(
      `We set your native language to ${record.data?.native_language} and learning language to ${record.data?.learning_language}. You can change it by typing /info`
    );

    if (!record.error) {
      const res = await adminAuthClient.inviteUserByEmail(email, {
        redirectTo: 'https://t.me/language_project_feed_bot?start=confirmed',
      });
      if (!res.error) {
        ctx.reply(
          'Confirmation email has been sent to your email address. Please, confirm your email address to complete the setup.'
        );
      }
    }
  }
};

export const getUser = async (ctx: Context): Promise<UserProfile | null> => {
  let { data, error } = await supabase
    .from('telegram_users')
    .select('*')
    .eq('telegram_id', ctx.from?.id)
    .single();

  if (!data?.chat_id) {
    const r = await supabase
      .from('telegram_users')
      .update({ chat_id: ctx.chat?.id })
      .eq('telegram_id', ctx.from?.id)
      .select('*')
      .single();
    data = r.data;
  }

  return data;
};
