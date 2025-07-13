import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CorLab — лаборатория коррозии и антикоррозионных исследований',
  description:
    'CorLab — ведущая лаборатория по коррозиологическим исследованиям: стандартные испытания, экспертные заключения и комплексные turn‑key решения.',
  keywords: [
    'коррозия',
    'антикоррозионные решения',
    'испытания на коррозию',
    'экспертиза коррозии',
    'corrosionLab',
    'corlab',
  ],
  alternates: {
    canonical: 'https://corrosionlab.ru/',
  },
  openGraph: {
    title: 'CorLab — лаборатория коррозии',
    description: 'Стандартные испытания, экспертиза, проекты под ключ по антикоррозийной защите и анализу коррозии.',
    url: 'https://corrosionlab.ru/',
    siteName: 'CorLab',
    type: 'website',
    images: [
      {
        url: 'https://corrosionlab.ru/assets/images/seo/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Лаборатория Коррозионных Испытаний',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CorLab — лаборатория коррозии и антикоррозионных исследований',
    description: 'Стандартные испытания, экспертиза, проекты под ключ по антикоррозийной защите и анализу коррозии.',
    images: ['https://corrosionlab.ru/assets/images/seo/og.jpg'],
  },
  other: {
    'yandex-verification': '66aa387bdbb92425',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
