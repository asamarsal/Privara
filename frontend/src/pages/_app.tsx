import type { AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

const AppWrapper = dynamic(() => import('../components/AppWrapper'), {
  ssr: false,
});

export default function App(props: AppProps) {
  return (
    <>
      <Head>
        <title>Privara</title>
        <link rel="icon" href="/icon/Privara.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>
      <AppWrapper {...props} />
    </>
  );
}
