# Deployment Cheat Sheet - Compauto

Быстрая справка по основным операциям деплоя и troubleshooting.

## 🚀 Деплой

### Новый релиз
```bash
cd /var/www/compauto

# 1. Создать релиз из main ветки
./bin/deploy.sh v1.0.1

# 2. Задеплоить на production
./bin/promote.sh v1.0.1

# 3. Откат при проблемах
./bin/rollback.sh
```

### Staging деплой (тестирование)
```bash
# Деплой на killiskadev-test.ru:80
./bin/preview.sh v1.0.1

# Проверка
curl http://killiskadev-test.ru/health
```

## 🔍 Мониторинг

### PM2
```bash
# Список процессов
pm2 list

# Логи
pm2 logs compauto-production
pm2 logs compauto-production --lines 100
pm2 logs compauto-production --err

# Статус
pm2 describe compauto-production

# Перезапуск
pm2 restart compauto-production
pm2 reload compauto-production  # Graceful reload

# Остановка
pm2 stop compauto-production
pm2 delete compauto-production
```

### Nginx
```bash
# Проверка конфига
sudo nginx -t

# Просмотр полного конфига
sudo nginx -T

# Перезагрузка
sudo systemctl reload nginx
sudo systemctl restart nginx

# Статус
sudo systemctl status nginx

# Логи
sudo tail -f /var/log/nginx/compauto-ssl-access.log
sudo tail -f /var/log/nginx/compauto-ssl-error.log

# Последние 100 строк с ошибками
sudo tail -100 /var/log/nginx/compauto-ssl-error.log | grep error
```

### База данных
```bash
# Подключение
psql "postgresql://compauto_user:PASSWORD@localhost:5432/compauto?schema=app"

# Статус миграций
cd /var/www/compauto/current
pnpm dlx prisma migrate status

# Применить миграции
pnpm dlx prisma migrate deploy

# Prisma Studio (GUI)
pnpm dlx prisma studio
```

## 🔐 SSL & Certbot
```bash
# Список сертификатов
sudo certbot certificates

# Обновление сертификатов (тест)
sudo certbot renew --dry-run

# Обновление сертификатов (реально)
sudo certbot renew

# Проверка SSL
openssl s_client -connect 147.45.97.79:443 -servername komp-auto.ru

# Тест SSL через curl
curl -v https://komp-auto.ru/
```

## 🛡️ Firewall & Security

### UFW
```bash
# Статус
sudo ufw status verbose

# Разрешить/заблокировать IP
sudo ufw allow from YOUR_IP
sudo ufw deny from ATTACKER_IP

# Логи
sudo tail -f /var/log/ufw.log
```

### Fail2ban
```bash
# Статус всех jails
sudo fail2ban-client status

# Статус конкретного jail
sudo fail2ban-client status nginx-compauto

# Разбанить IP
sudo fail2ban-client set nginx-compauto unbanip 1.2.3.4

# Логи
sudo tail -f /var/log/fail2ban.log
```

## 🔧 Troubleshooting

### Сайт не открывается извне
```bash
# 1. Проверка что PM2 работает
pm2 list
curl http://localhost:3003/health

# 2. Проверка что nginx слушает на правильном IP
sudo nginx -T | grep "listen.*147.45.97.79"
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 3. Проверка DNS
dig komp-auto.ru +short
# Должно вернуть: 147.45.97.79

# 4. Проверка firewall
sudo ufw status
sudo iptables -L -n -v

# 5. Тест с сервера
curl -v http://147.45.97.79/health
curl -v -k https://147.45.97.79/
curl -v https://komp-auto.ru/
```

### PM2 приложение падает
```bash
# Логи ошибок
pm2 logs compauto-production --err --lines 50

# Проверка окружения
pm2 describe compauto-production | grep env

# Ручной запуск для отладки
cd /var/www/compauto/current
PORT=3003 node --env-file=.env node_modules/next/dist/bin/next start
```

### Ошибки базы данных
```bash
# Логи PostgreSQL
sudo tail -100 /var/log/postgresql/postgresql-*-main.log

# Проверка подключения
psql "postgresql://compauto_user:PASSWORD@localhost:5432/compauto?schema=app" -c "SELECT 1"

# Список таблиц в схеме app
psql "postgresql://compauto_user:PASSWORD@localhost:5432/compauto" -c "\dt app.*"

# Пересоздание миграций (УДАЛЯЕТ ВСЕ ДАННЫЕ!)
cd /var/www/compauto/current
pnpm dlx prisma migrate reset
```

### SSL не работает
```bash
# Проверка сертификатов
sudo certbot certificates
sudo ls -la /etc/letsencrypt/live/komp-auto.ru/

# Проверка nginx SSL конфига
sudo nginx -T | grep -A 20 "server_name komp-auto.ru"

# Перевыпуск сертификата
sudo certbot --nginx -d komp-auto.ru -d www.komp-auto.ru --force-renewal
```

### Загрузка файлов не работает
```bash
# Проверка прав
ls -la /var/www/compauto/shared/uploads/
ls -la /var/www/compauto/current/public/

# Исправление прав
sudo chown -R $USER:$USER /var/www/compauto/shared/

# Проверка размера в nginx
sudo nginx -T | grep client_max_body_size

# Проверка свободного места
df -h /var/www/
```

## 📊 Полезные команды

### Проверка ресурсов
```bash
# CPU и память
htop
pm2 monit

# Диск
df -h
du -sh /var/www/compauto/*

# Сеть
sudo netstat -tlnp
sudo ss -tlnp
```

### Очистка
```bash
# Старые релизы (оставить последние 5)
cd /var/www/compauto/releases
ls -t | tail -n +6 | xargs rm -rf

# PM2 логи
pm2 flush

# Nginx логи (архивирование)
sudo logrotate -f /etc/logrotate.d/nginx

# Временные файлы uploads
cd /var/www/compauto/shared/uploads/tmp
find . -type d -mtime +1 -exec rm -rf {} +
```

### Бэкапы
```bash
# База данных
pg_dump "postgresql://compauto_user:PASSWORD@localhost:5432/compauto" > backup_$(date +%Y%m%d).sql

# Uploads
tar -czf uploads_$(date +%Y%m%d).tar.gz /var/www/compauto/shared/uploads/

# Конфиги
sudo tar -czf configs_$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/ /etc/compauto/
```

## 🎯 Важные пути

```
Конфиги:
/etc/nginx/sites-available/compauto     - Nginx конфиг
/etc/compauto/.env                       - Environment переменные
/var/www/compauto/ecosystem.config.cjs   - PM2 конфиг

Приложение:
/var/www/compauto/current/               - Текущий production релиз
/var/www/compauto/staging/               - Staging релиз
/var/www/compauto/releases/              - Все релизы

Данные:
/var/www/compauto/shared/uploads/        - Загруженные файлы
/var/www/compauto/shared/logs/           - PM2 логи

Логи системы:
/var/log/nginx/compauto-*.log            - Nginx логи
/var/log/postgresql/postgresql-*-main.log - PostgreSQL логи
/var/log/fail2ban.log                    - Fail2ban логи
```

## 🚨 Emergency

### Сайт лежит, нужно быстро откатить
```bash
cd /var/www/compauto
./bin/rollback.sh
pm2 logs compauto-production
```

### Атака DDoS / много 403-404
```bash
# Смотрим IP атакующих
sudo tail -1000 /var/log/nginx/compauto-ssl-access.log | grep " 404 \| 403 " | awk '{print $1}' | sort | uniq -c | sort -nr | head -20

# Блокируем вручную
sudo ufw deny from ATTACKER_IP

# Проверяем fail2ban
sudo fail2ban-client status nginx-compauto
```

### PostgreSQL не отвечает
```bash
# Статус
sudo systemctl status postgresql

# Перезапуск
sudo systemctl restart postgresql

# Логи
sudo tail -100 /var/log/postgresql/postgresql-*-main.log
```

### Закончилось место на диске
```bash
# Проверка
df -h

# Найти большие файлы
sudo du -h /var/www/compauto | sort -rh | head -20
sudo du -h /var/log | sort -rh | head -20

# Очистка логов
sudo truncate -s 0 /var/log/nginx/*.log
pm2 flush
```

## 📞 Контакты

**При серьезных проблемах:**
1. Проверьте логи (PM2, nginx, PostgreSQL)
2. Попробуйте откат: `./bin/rollback.sh`
3. Перезапустите сервисы: nginx, pm2, postgresql
4. Обратитесь в Timeweb Cloud поддержку (проблемы с IP/сетью)
