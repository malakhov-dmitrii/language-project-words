import { HandlerContext } from '@/handlers/handlers.types';
import { adminAuthClient, supabase } from '@/lib/supabase';
import { getUser } from '@/lib/user';

const clearHandler = async (ctx: HandlerContext) => {
  console.log('clear');

  const user = await getUser(ctx);

  await supabase.from('telegram_users').delete().eq('telegram_id', ctx.from?.id);
  await adminAuthClient.deleteUser(user?.user_id!);
  ctx.reply('Your account has been deleted. You can start over by sending /start');
};

export default clearHandler;
