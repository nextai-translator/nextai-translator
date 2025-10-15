import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import '@/styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default appWithTranslation(App);
