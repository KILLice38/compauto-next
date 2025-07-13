import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Комплектующие для автомобилей | Komp-Auto',
  description:
    'Качественные комплектующие для всех типов автомобилей. Широкий ассортимент, быстрая доставка и поддержка.',
  keywords: [
    'комплектующие для автомобилей',
    'автозапчасти',
    'купить запчасти',
    'комплектующие Komp-Auto',
    'запчасти для авто',
    'автокомпрессоры',
    'аксессуары для автомобилей',
  ],
  openGraph: {
    title: 'Комплектующие для автомобилей | Komp-Auto',
    description: 'Надежные автозапчасти для любых марок и моделей. Выберите лучшее на сайте Comp-Auto.',
    url: 'https://Komp-auto.ru',
    siteName: 'Komp-Auto',
    images: [
      {
        url: 'https://Komp-auto.ru/assets/images/seo/og.jpg', // замените на актуальное
        width: 1200,
        height: 630,
        alt: 'Komp-Auto - комплектующие для автомобилей',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Komp-Auto - Автокомплектующие',
    description: 'Качественные запчасти и аксессуары для авто.',
    images: ['https://Komp-auto.ru/assets/images/seo/og.jpg'],
  },
  alternates: {
    canonical: 'https://Komp-auto.ru',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
