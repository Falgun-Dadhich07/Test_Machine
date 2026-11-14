import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>ShARE: Student Chapter</title>
        <meta name="description" content="ShARE: Student Chapter — Winter Project Selection Test" />
        <link rel="icon" href="/share-logo.jpg" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}


