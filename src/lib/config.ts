import { ParseMode } from 'telegraf/typings/core/types/typegram';

export const replyOptions = {
  parse_mode: 'HTML' as ParseMode,
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '👍',
          callback_data: 'like',
        },
        {
          text: '❌',
          callback_data: 'dislike',
        },
        {
          text: '🔁',
          callback_data: 'retry',
        },
      ],
      [
        {
          text: 'Need translation 🌐',
          callback_data: 'translation',
        },
        {
          text: 'Get a joke 🤡',
          callback_data: 'joke',
        },
      ],
    ],
  },
};
