#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Promote Script - Birthday Invitation
# ============================================
# Активирует релиз и запускает его в production
# Использование: ./bin/promote.sh [version]
# Пример: ./bin/promote.sh v1.0.0
# Если version не указан, использует последний собранный релиз
# ============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE="/var/www/birthday"
CURRENT_DIR="$BASE/current"

# Определение версии для промоции
if [ -n "${1:-}" ]; then
    VERSION="$1"
else
    if [ -f "$BASE/last_built" ]; then
        VERSION=$(cat "$BASE/last_built")
    else
        echo -e "${RED}Ошибка: Версия не указана и last_built не найден${NC}"
        echo -e "${YELLOW}Использование: $0 <version>${NC}"
        exit 1
    fi
fi

REL="$BASE/releases/$VERSION"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Активация релиза${NC}"
echo -e "${GREEN}Версия: $VERSION${NC}"
echo -e "${GREEN}========================================${NC}"

# Проверка существования релиза
if [ ! -d "$REL" ]; then
    echo -e "${RED}Ошибка: Релиз $VERSION не найден${NC}"
    echo -e "${YELLOW}Доступные релизы:${NC}"
    ls -1t "$BASE/releases" 2>/dev/null || echo "  Нет релизов"
    exit 1
fi

# Проверяем что релиз собран
if [ ! -d "$REL/frontend/dist" ] || [ ! -d "$REL/backend/dist" ]; then
    echo -e "${RED}Ошибка: Релиз $VERSION не собран!${NC}"
    echo -e "${YELLOW}Запустите сборку: ./bin/deploy.sh $VERSION${NC}"
    exit 1
fi

# Сохранение текущей версии для возможного отката
if [ -L "$CURRENT_DIR" ]; then
    PREVIOUS_VERSION=$(basename "$(readlink -f "$CURRENT_DIR")")
    echo -e "${YELLOW}Текущая версия: $PREVIOUS_VERSION${NC}"
fi

# Подтверждение
echo ""
echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Вы собираетесь обновить production!${NC}"
echo -e "${YELLOW}Релиз: $VERSION${NC}"
read -p "Продолжить? (yes/no): " -r
if [[ ! $REPLY == "yes" ]]; then
    echo -e "${RED}Промоция отменена${NC}"
    exit 1
fi
echo ""

# Создаём бэкап текущей версии
if [ -L "$CURRENT_DIR" ]; then
    echo -e "${YELLOW}[1/4] Создание бэкапа текущей версии...${NC}"
    OLD_CURRENT=$(readlink -f "$CURRENT_DIR")
    if [ -d "$OLD_CURRENT" ]; then
        BACKUP_DIR="$BASE/_current_backup_$(date +%s)"
        if cp -al "$OLD_CURRENT" "$BACKUP_DIR" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Бэкап создан: $BACKUP_DIR${NC}"
        else
            echo -e "${YELLOW}  ⚠ Не удалось создать бэкап (продолжаем)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}[1/4] Бэкап пропущен (нет текущей версии)${NC}"
fi

# Переключение симлинка
echo -e "${YELLOW}[2/4] Переключение на новую версию...${NC}"
# Удаляем current если это директория (не symlink)
if [ -d "$CURRENT_DIR" ] && [ ! -L "$CURRENT_DIR" ]; then
    echo -e "${BLUE}  Удаление директории current (не symlink)...${NC}"
    rm -rf "$CURRENT_DIR"
fi
# Создаем или обновляем symlink
ln -sfn "$REL" "$CURRENT_DIR"
echo -e "${GREEN}  ✓ Симлинк обновлен: current -> $VERSION${NC}"

# Перезапуск PM2 процессов
echo -e "${YELLOW}[3/4] Перезапуск PM2 процессов...${NC}"

# Backend
if pm2 describe birthday-backend >/dev/null 2>&1; then
    echo -e "${BLUE}  Перезапуск birthday-backend...${NC}"
    pm2 reload birthday-backend --update-env
else
    echo -e "${BLUE}  Запуск birthday-backend...${NC}"
    pm2 start "$BASE/ecosystem.config.cjs"
fi

# Сохраняем PM2 конфигурацию
pm2 save
echo -e "${GREEN}  ✓ PM2 процессы обновлены${NC}"

# Перезагрузка nginx
echo -e "${YELLOW}[4/4] Перезагрузка nginx...${NC}"
if sudo systemctl reload nginx 2>/dev/null; then
    echo -e "${GREEN}  ✓ Nginx перезагружен${NC}"
else
    echo -e "${YELLOW}  ⚠ Не удалось перезагрузить nginx${NC}"
    echo -e "${YELLOW}  Проверьте конфигурацию: sudo nginx -t${NC}"
fi

# Ждём пока приложение запустится
echo ""
echo -e "${BLUE}Ожидание запуска приложения (5 секунд)...${NC}"
sleep 5

# Проверяем что приложение запущено
if pm2 describe birthday-backend >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Приложение запущено успешно${NC}"
else
    echo -e "${RED}  ⚠️  ВНИМАНИЕ: Проблемы с запуском!${NC}"
    echo -e "${YELLOW}  Проверьте статус: pm2 status${NC}"
    echo -e "${YELLOW}  Проверьте логи: pm2 logs birthday-backend${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} ✅ Production обновлён на $VERSION${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Production endpoints:${NC}"
echo -e "  Frontend: ${YELLOW}https://priglasheniye-alfiya.ru${NC}"
echo -e "  Backend:  ${YELLOW}https://priglasheniye-alfiya.ru/api${NC}"
echo ""
echo -e "${BLUE}Проверка:${NC}"
pm2 list
echo ""
echo -e "${BLUE}Полезные команды:${NC}"
echo -e "  Логи:    ${YELLOW}pm2 logs birthday-backend${NC}"
echo -e "  Статус:  ${YELLOW}pm2 status${NC}"
if [ -n "${PREVIOUS_VERSION:-}" ]; then
    echo -e "  Откат:   ${YELLOW}./bin/promote.sh $PREVIOUS_VERSION${NC}"
fi
echo ""
echo -e "${BLUE}Информация о релизе:${NC}"
echo -e "  Версия: $VERSION"
echo -e "  Путь: $CURRENT_DIR"
if [ -f "$REL/.commit" ]; then
    echo -e "  Commit: $(cat $REL/.commit)"
fi
echo ""
echo -e "${BLUE}Для проверки работы:${NC}"
echo -e "  ${YELLOW}curl http://localhost:3000/api/health${NC}"
echo ""
