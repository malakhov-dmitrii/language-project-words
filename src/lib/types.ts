import { Database } from '@/lib/database.types';
import { Context as TContext } from 'telegraf';

export type UserProfile = Database['public']['Tables']['telegram_users']['Row'];

// Define your own context type
export interface Context extends TContext {
  user: UserProfile | null;
}
