import { Roboto } from 'next/font/google';
import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: 'Intranet — Ministère des Finances du Niger',
  description: "Espace intranet du Ministère de l'Économie et des Finances de la République du Niger.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={roboto.variable}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
