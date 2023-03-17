import { Database } from '@/lib/database.types';
import { Context as TContext, NarrowedContext } from 'telegraf';
import { CallbackQuery, Update } from 'telegraf/typings/core/types/typegram';

export type UserProfile = Database['public']['Tables']['telegram_users']['Row'];

// Define your own context type
export interface Context extends TContext {
  user: UserProfile | null;
}

export type CtxUpdate = NarrowedContext<
  TContext<Update>,
  Update.CallbackQueryUpdate<CallbackQuery>
>;
