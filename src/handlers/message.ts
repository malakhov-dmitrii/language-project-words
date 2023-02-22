import { HandlerContext } from '@/handlers/handlers.types';
import { languages } from '@/lib/languages';
import { sendNewPhrase } from '@/lib/phrases';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/user';
import { entries } from 'lodash';
import { Context, NarrowedContext } from 'telegraf';
import { Message, Update } from 'telegraf/typings/core/types/typegram';

const messageHandler = async (ctx: NarrowedContext<Context<Update>, Update.MessageUpdate<Message>>) => {
  const user = await getUser(ctx);

  /**
   * This message should contain email address to connect to the account
   * If user is not found, create a new one
   */
  if (!user) {
    // @ts-expect-error this is a hack to get around the fact that Telegraf doesn't have a type for message.text
    await setupUser(ctx, ctx.message.text);
  } else if (user.state === 'change_native_language') {
    // @ts-expect-error this is a hack to get around the fact that Telegraf doesn't have a type for message.text
    const nativeLanguage = ctx.message.text;

    const lang = entries(languages).find(([code, name]) => name.toLowerCase() === nativeLanguage.toLowerCase());
    const langCode = lang?.[0];
    if (!langCode) {
      ctx.reply('Language not found, please try again');
      return;
    }

    await supabase.from('telegram_users').update({ native_language: lang[1], state: 'idle' }).eq('user_id', user.user_id);
    ctx.reply(`Native language changed to ${lang[1]}`);
  } else {
    sendNewPhrase(ctx);
  }
};

export default messageHandler;
