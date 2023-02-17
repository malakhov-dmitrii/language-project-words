import axios from 'axios';

export const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

interface TranslateResponse {
  data: {
    translations: {
      translatedText: string;
      detectedSourceLanguage: string;
    }[];
  };
}
export async function translate({ text, to, source }: { text: string; to: string; source?: string }) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
  const response = await axios
    .post<TranslateResponse>(url, {
      target: to,
      format: 'text',
      q: text,
      ...(source && { source }),
    })
    .catch(e => {
      console.error(e);
      return null;
    });

  if (!response) throw new Error('Could not translate the word');

  const data = response.data?.data?.translations[0];

  return data?.translatedText;
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
