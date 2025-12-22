import './polyfills'
import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import { ToastProvider } from './contexts/ToastContext'
import { generateOrganizationSchema, generateWebSiteSchema } from './lib/structuredData'
import ClientErrorBoundary from './components/clientErrorBoundary'

// Временно отключаем Google Fonts из-за проблем с VPN/прокси
// const inter = Inter({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-inter',
// })

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Генерируем Schema.org разметку для сайта
  const organizationSchema = generateOrganizationSchema()
  const webSiteSchema = generateWebSiteSchema()

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Schema.org JSON-LD разметка для всего сайта */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClientErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}
