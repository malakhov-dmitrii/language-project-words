import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

export const openai = new OpenAIApi(configuration);

export const getCompletion = async (prompt: string) => {
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      {
        content: prompt,
        role: 'user',
      },
    ],
  });

  const text = response.data.choices[0].message?.content;
  return text;
};
