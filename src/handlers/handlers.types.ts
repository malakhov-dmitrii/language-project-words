import { Context, NarrowedContext } from 'telegraf';
import { Message, Update } from 'telegraf/typings/core/types/typegram';

export type HandlerContext = NarrowedContext<
  Context<Update>,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
>;
