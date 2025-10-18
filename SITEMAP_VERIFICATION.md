# Проверка динамического Sitemap

## Быстрая проверка

### 1. Локально (development)
```bash
# Запустить dev сервер
pnpm dev

# В другом терминале проверить sitemap
curl http://localhost:3000/sitemap.xml

# Проверить robots.txt
curl http://localhost:3000/robots.txt
```

### 2. Production build
```bash
# Собрать проект
pnpm build

# Запустить production сервер
pnpm start

# Проверить
curl http://localhost:3000/sitemap.xml
```

## Что должен содержать sitemap.xml

Sitemap автоматически включает:

1. **Статические страницы**:
   - `https://comp-auto.ru/` (priority: 1.0, changeFrequency: daily)
   - `https://comp-auto.ru/catalog` (priority: 0.8, changeFrequency: daily)

2. **Динамические страницы продуктов**:
   - `https://comp-auto.ru/catalog/{slug}` для каждого продукта из БД
   - priority: 0.7
   - changeFrequency: weekly
   - lastModified: берется из `Product.updatedAt`

## Пример правильного вывода

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://comp-auto.ru/</loc>
    <lastmod>2025-10-18T...</lastmod>
    <changefreq>daily</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>https://comp-auto.ru/catalog</loc>
    <lastmod>2025-10-18T...</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://comp-auto.ru/catalog/gt1749v-volkswagen-tdi-19-a7x9k</loc>
    <lastmod>2025-10-18T...</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <!-- ... остальные продукты -->
</urlset>
```

## Проверка в Google Search Console

После деплоя в production:

1. Перейти в [Google Search Console](https://search.google.com/search-console)
2. Добавить свойство `comp-auto.ru` (если еще не добавлено)
3. Перейти в раздел "Sitemap"
4. Добавить sitemap: `https://comp-auto.ru/sitemap.xml`
5. Google начнет индексировать все страницы

## Troubleshooting

### Sitemap пустой или содержит только статические страницы

**Причина**: Ошибка подключения к БД или отсутствие продуктов

**Решение**:
```bash
# Проверить подключение к БД
pnpm prisma studio

# Если БД пуста, заполнить тестовыми данными
pnpm db:seed
```

### Sitemap не обновляется

**Причина**: Кеширование в Next.js

**Решение**:
```bash
# Очистить .next кеш
rm -rf .next
pnpm build
```

### 404 на /sitemap.xml в production

**Причина**: Файл не был сгенерирован при билде

**Решение**:
- Убедитесь, что `app/sitemap.ts` находится в корне `app/`
- Пересоберите проект: `pnpm build`
- Проверьте логи билда на наличие ошибок

## Оптимизация для больших каталогов

Если продуктов больше 50,000, рекомендуется использовать Sitemap Index:

```typescript
// app/sitemap.ts (для больших каталогов)
export default async function sitemap() {
  // Разбить на несколько sitemap файлов
  // sitemap-0.xml, sitemap-1.xml, etc.
}
```

См. [Next.js Sitemap Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) для деталей.
