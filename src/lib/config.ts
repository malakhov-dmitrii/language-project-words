import { ParseMode } from 'telegraf/typings/core/types/typegram';

export const replyOptions = {
  parse_mode: 'HTML' as ParseMode,
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: 'Generate new context',
          callback_data: 'new_context',
        },
        {
          text: 'Generate explanation',
          callback_data: 'explanation',
        },
      ],
      [
        {
          text: 'Translate to native language',
          callback_data: 'translation',
        },
        {
          text: 'Find a joke',
          callback_data: 'joke',
        },
      ],
      [
        {
          text: 'Next',
          callback_data: 'next',
        },
      ],
      // [
      //   {
      //     text: '👍',
      //     callback_data: 'like',
      //   },
      //   {
      //     text: '❌',
      //     callback_data: 'dislike',
      //   },
      //   {
      //     text: '🔁',
      //     callback_data: 'retry',
      //   },
      // ],
      // [
      //   {
      //     text: 'Need translation 🌐',
      //     callback_data: 'translation',
      //   },
      //   {
      //     text: 'Get a joke 🤡',
      //     callback_data: 'joke',
      //   },
      //   {
      //     text: 'Get an audio 🎧',
      //     callback_data: 'audio',
      //   },
      // ],
      // [
      // ]
    ],
  },
};
