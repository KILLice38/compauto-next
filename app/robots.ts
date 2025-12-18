import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://comp-auto.ru'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/private/', '/test/', '/cgi-bin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
