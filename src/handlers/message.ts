import { HandlerContext } from '@/handlers/handlers.types';
import { sendNewPhrase } from '@/lib/phrases';
import { getUser } from '@/lib/user';
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
  } else {
    sendNewPhrase(ctx);
  }
};

export default messageHandler;
