import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import '../styles/globals.css';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const initLucide = () => {
      if (typeof window !== 'undefined' && window.lucide) {
        window.lucide.createIcons();
      }
    };
    
    initLucide();
    const timer = setTimeout(initLucide, 100);
    return () => clearTimeout(timer);
  }, [router.asPath]);

  return (
    <Layout>
      <Head>
        <title>Wallet Intel | Polymarket Dashboard</title>
      </Head>
      <Component {...pageProps} />
    </Layout>
  );
}
