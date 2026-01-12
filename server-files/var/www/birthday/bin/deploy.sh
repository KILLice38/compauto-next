#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Deploy Script - Birthday Invitation
# ============================================
# Создает новый релиз из Git репозитория
# Использование: ./bin/deploy.sh [version]
# Пример: ./bin/deploy.sh v1.0.0
# Если version не указан, используется timestamp
# ============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
BASE="/var/www/birthday"
RELEASES="$BASE/releases"
REPO="${REPO:-git@github.com:KILLice38/birthday.git}"
BRANCH="${BRANCH:-main}"

# Определение версии релиза
if [ -n "${1:-}" ]; then
    VERSION="$1"
    TS="$VERSION"
else
    TS=$(date +%Y%m%d-%H%M%S)
    VERSION="$TS"
fi

REL="$RELEASES/$VERSION"

# SSH ключ для Git
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo ~$REAL_USER)
SSH_KEY="${SSH_KEY:-$REAL_HOME/.ssh/id_rsa}"

# Альтернативные пути для SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    if [ -f "$REAL_HOME/.ssh/github" ]; then
        SSH_KEY="$REAL_HOME/.ssh/github"
    elif [ -f "$REAL_HOME/.ssh/id_ed25519" ]; then
        SSH_KEY="$REAL_HOME/.ssh/id_ed25519"
    fi
fi

export GIT_SSH_COMMAND="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Разворачивание Birthday - $VERSION${NC}"
echo -e "${GREEN}========================================${NC}"

# Проверяем что релиз не существует
if [ -d "$REL" ]; then
    echo -e "${RED}Ошибка: Релиз $VERSION уже существует${NC}"
    echo -e "${YELLOW}Используйте другую версию или удалите существующий релиз${NC}"
    exit 1
fi

# Проверка SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден${NC}"
    echo -e "${YELLOW}Проверенные пути:${NC}"
    echo -e "  - $REAL_HOME/.ssh/id_rsa"
    echo -e "  - $REAL_HOME/.ssh/github"
    echo -e "  - $REAL_HOME/.ssh/id_ed25519"
    echo -e "${YELLOW}Текущая конфигурация:${NC}"
    echo -e "  REAL_USER=$REAL_USER"
    echo -e "  REAL_HOME=$REAL_HOME"
    exit 1
fi

# Проверяем доступ к репозиторию
echo -e "${YELLOW}[1/9] Проверка доступа к $REPO ($BRANCH)...${NC}"
if ! git ls-remote --heads "$REPO" "$BRANCH" >/dev/null 2>&1; then
    echo -e "${RED}Ошибка: Не удалось получить доступ к репозиторию${NC}"
    echo -e "${YELLOW}Проверьте SSH ключ и права доступа к репозиторию${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Доступ к репозиторию подтвержден${NC}"

# Проверка наличия pnpm
echo -e "${YELLOW}[2/9] Проверка наличия pnpm...${NC}"
if ! command -v pnpm >/dev/null 2>&1; then
    echo -e "${RED}Ошибка: pnpm не найден${NC}"
    echo -e "${YELLOW}Установите pnpm: npm install -g pnpm${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ pnpm готов к работе${NC}"

# Проверка версии Node.js
echo -e "${YELLOW}[3/9] Проверка версии Node.js...${NC}"
if command -v node >/dev/null 2>&1; then
    MAJOR=$(node -v | sed 's/v\([0-9]\+\).*/\1/')
    if [ "$MAJOR" -lt 18 ]; then
        echo -e "${RED}ERROR: Node.js должен быть >= 18, текущая: $(node -v)${NC}"
        exit 1
    fi
    echo -e "${GREEN}  ✓ Node.js version: $(node -v)${NC}"
else
    echo -e "${RED}ERROR: Node.js не установлен${NC}"
    exit 1
fi

# Клонирование репозитория
echo -e "${YELLOW}[4/9] Клонирование кода из Git...${NC}"
mkdir -p "$RELEASES"
if ! git clone --depth=1 --branch "$BRANCH" "$REPO" "$REL"; then
    echo -e "${RED}Ошибка при клонировании репозитория${NC}"
    rm -rf "$REL"
    exit 1
fi
echo -e "${GREEN}  ✓ Код успешно склонирован${NC}"

cd "$REL"

# Копируем переменные окружения в релиз
echo -e "${YELLOW}[5/9] Настройка переменных окружения...${NC}"

# Определяем путь к env файлам (приоритет /etc/birthday)
if [ -f "/etc/birthday/.env" ]; then
    ENV_PATH="/etc/birthday/.env"
    echo -e "${GREEN}  ✓ Используется /etc/birthday/.env${NC}"
elif [ -f "$BASE/shared/.env" ]; then
    ENV_PATH="$BASE/shared/.env"
    echo -e "${GREEN}  ✓ Используется $BASE/shared/.env${NC}"
else
    echo -e "${RED}  ✗ ERROR: Не найден .env файл!${NC}"
    echo -e "${YELLOW}  Создайте .env в /etc/birthday/ или $BASE/shared/${NC}"
    exit 1
fi

# Копируем .env в корень релиза (для dotenv.config())
cp "$ENV_PATH" "$REL/.env"
echo -e "${GREEN}  ✓ .env скопирован в корень релиза${NC}"

# Копируем .env для backend (для совместимости)
cp "$ENV_PATH" "$REL/backend/.env"
echo -e "${GREEN}  ✓ Backend .env подключен${NC}"

# Установка зависимостей
echo -e "${YELLOW}[6/9] Установка зависимостей (pnpm install --frozen-lockfile)...${NC}"
if ! pnpm install --frozen-lockfile; then
    echo -e "${RED}Ошибка при установке зависимостей${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Зависимости установлены${NC}"

# Проверка типов TypeScript
echo -e "${YELLOW}[7/9] Проверка типов TypeScript...${NC}"
if ! pnpm run type-check; then
    echo -e "${RED}Ошибка: проблемы с типами TypeScript${NC}"
    echo -e "${YELLOW}Исправьте ошибки типов и повторите деплой${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Типы проверены успешно${NC}"

# Сборка проекта
echo -e "${YELLOW}[8/9] Сборка проекта...${NC}"
if ! pnpm run build; then
    echo -e "${RED}Ошибка при сборке проекта${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Проект успешно собран${NC}"

# Настройка shared директорий
echo -e "${YELLOW}[9/9] Настройка shared директорий...${NC}"

# Определяем путь к shared данным (приоритет /etc/birthday)
if [ -d "/etc/birthday/data" ]; then
    DATA_PATH="/etc/birthday/data"
elif [ -d "$BASE/shared/data" ]; then
    DATA_PATH="$BASE/shared/data"
else
    # Создаем в /etc/birthday если не существует
    mkdir -p "/etc/birthday/data"
    DATA_PATH="/etc/birthday/data"
    echo -e "${YELLOW}  ⚠ Создана директория /etc/birthday/data${NC}"
fi

# Создаем симлинк на данные
rm -rf "$REL/backend/data"
ln -sfn "$DATA_PATH" "$REL/backend/data"
echo -e "${GREEN}  ✓ Data директория подключена: $DATA_PATH${NC}"

# Копируем guests.json если его нет в shared data
if [ ! -f "$DATA_PATH/guests.json" ]; then
    echo -e "${YELLOW}  ⚠ Копирую guests.json в $DATA_PATH${NC}"
    # Ищем guests.json в исходниках
    if [ -f "$REL/backend/src/data/guests.json" ]; then
        cp "$REL/backend/src/data/guests.json" "$DATA_PATH/guests.json"
    fi
fi

# Создаем директорию для логов
mkdir -p "$BASE/shared/logs"
ln -sfn "$BASE/shared/logs" "$REL/logs"
echo -e "${GREEN}  ✓ Shared директории настроены${NC}"

# Сохраняем информацию о релизе
echo "$VERSION" > "$BASE/last_built"
echo "$BRANCH" > "$REL/.branch"
git rev-parse HEAD > "$REL/.commit" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} ✓ Релиз $VERSION готов${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Следующие шаги:${NC}"
echo -e "  1. Активируйте релиз:"
echo -e "     ${YELLOW}./bin/promote.sh $VERSION${NC}"
echo ""
echo -e "${BLUE}Информация о релизе:${NC}"
echo -e "  Версия: $VERSION"
echo -e "  Ветка: $BRANCH"
echo -e "  Путь: $REL"
if [ -f "$REL/.commit" ]; then
    echo -e "  Commit: $(cat $REL/.commit)"
fi
echo ""
