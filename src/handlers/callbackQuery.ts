import { sendNewPhrase } from '@/lib/phrases';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/user';
import { delay, translate } from '@/lib/utils';
import { Context, NarrowedContext } from 'telegraf';
import { CallbackQuery, Message, Update } from 'telegraf/typings/core/types/typegram';

const callbackQueryHandler = async (ctx: NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery>>) => {
  ctx.answerCbQuery('Cool, lets go with the next one!');

  const user = await getUser(ctx);
  if (!user) {
    ctx.reply('Please, connect your account first');
    return;
  }

  // @ts-expect-error message.text is not defined in the type
  const text = ctx.callbackQuery.message?.text;

  // @ts-expect-error data is not defined in the type
  const reply = ctx.callbackQuery.data;

  // console.log(ctx.callbackQuery.message?.message_id);

  if (reply !== 'translation') {
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    const existingPhrase = await supabase
      .from('user_feed_queue') //
      .select()
      .eq('message_id', ctx.callbackQuery.message?.message_id)
      // .eq('user_id', user.user_id)
      .single();

    await supabase
      .from('user_feed_queue') //
      .upsert({ id: existingPhrase.data?.id, phrase: text, user_id: user.user_id, reply }) //
      .eq('phrase', text);
  } else {
    const translated = await translate({
      text,
      to: 'en',
    });
    ctx.reply(translated);
    await delay(5000);
  }

  sendNewPhrase(ctx);
};

export default callbackQueryHandler;
