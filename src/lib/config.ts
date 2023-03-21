import { ParseMode } from 'telegraf/typings/core/types/typegram';

export const replyOptions = {
  parse_mode: 'HTML' as ParseMode,
  reply_markup: {
    inline_keyboard: [
      [
        // {
        //   text: 'Try new context',
        //   callback_data: 'new_context',
        // },
        {
          text: 'Generate explanation',
          callback_data: 'explanation',
        },
        {
          text: 'Translate to native language',
          callback_data: 'translation',
        },
      ],
      // [
      //   {
      //     text: 'Find a joke',
      //     callback_data: 'joke',
      //   },
      // ],
      [
        {
          text: 'Next',
          callback_data: 'next',
        },
      ],
    ],
  },
};
