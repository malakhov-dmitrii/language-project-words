import { adminAuthClient, supabase } from './supabase';
import { Context } from 'telegraf';
import { prisma } from '@/lib/db';
import { UserProfile } from '@/lib/types';

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

export const getUser = async (ctx: Context): Promise<UserProfile | null> => {
  const { data, error } = await supabase.from('telegram_users').select('*').eq('telegram_id', ctx.from?.id).single();
  return data;
};
