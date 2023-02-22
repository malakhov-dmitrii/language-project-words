import { HandlerContext } from '@/handlers/handlers.types';
import { sendNewPhrase } from '@/lib/phrases';
import { getUser } from '@/lib/user';

const startHandler = async (ctx: HandlerContext) => {
  const user = await getUser(ctx);
  if (user) {
    ctx.reply('Your account connected, lets get started.');
    sendNewPhrase(ctx);

    /**
     * TODO: We can add selection of native language and language to learn
     * to show only phrases from the selected language
     * and translate them to the native language properly
     */
    //   await supabase.from('telegram_users').update({state:""})
  } else {
    ctx.reply(`Welcome! To get started, lets connect your account.
      
Please, send me your email address which you used to register on the website.`);
  }
};

export default startHandler;
