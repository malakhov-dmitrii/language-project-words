import axios from 'axios';

export const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

interface TranslateResponse {
  data: string;
}
export async function translate({ text, to, source }: { text: string; to: string; source?: string }) {
  const url = `https://deeplx-production-bf8b.up.railway.app/translate`;
  const response = await axios
    .post<TranslateResponse>(url, {
      target_lang: to,
      text,
      ...(source && { source_lang: source }),
    })
    .catch(e => {
      console.error(e);
      return null;
    });

  if (!response) return null;

  return response.data.data;
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
