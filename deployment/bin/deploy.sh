#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Deploy Script - Compauto Next
# ============================================
# Создает новый релиз из Git репозитория
# Использование: ./bin/deploy.sh <version>
# Пример: ./bin/deploy.sh v1.0.0
# ============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
BASE="/var/www/compauto"
RELEASES="$BASE/releases"
REPO="git@github.com:KILLice38/compauto-next.git"
BRANCH="${BRANCH:-main}"  # Можно переопределить: BRANCH=dev ./bin/deploy.sh v1.0.0

# Проверка аргумента версии
if [ -z "${1:-}" ]; then
    echo -e "${RED}Ошибка: Не указана версия релиза${NC}"
    echo -e "${YELLOW}Использование: $0 <version>${NC}"
    echo -e "${YELLOW}Пример: $0 v1.0.0${NC}"
    exit 1
fi

VERSION="$1"
REL="$RELEASES/$VERSION"

# SSH ключ для Git
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo ~$REAL_USER)
SSH_KEY="${SSH_KEY:-$REAL_HOME/.ssh/github}"

# Альтернативные пути для SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    if [ -f "$REAL_HOME/.ssh/id_rsa" ]; then
        SSH_KEY="$REAL_HOME/.ssh/id_rsa"
    elif [ -f "$REAL_HOME/.ssh/id_ed25519" ]; then
        SSH_KEY="$REAL_HOME/.ssh/id_ed25519"
    fi
fi

export GIT_SSH_COMMAND="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Разворачивание Compauto - $VERSION${NC}"
echo -e "${GREEN}========================================${NC}"

# Проверяем что релиз не существует
if [ -d "$REL" ]; then
    echo -e "${RED}Ошибка: Релиз $VERSION уже существует${NC}"
    echo -e "${YELLOW}Используйте другую версию или удалите существующий релиз:${NC}"
    echo -e "  sudo rm -rf $REL"
    exit 1
fi

# Проверка SSH ключа
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден${NC}"
    echo -e "${YELLOW}Проверенные пути:${NC}"
    echo -e "  - $REAL_HOME/.ssh/github"
    echo -e "  - $REAL_HOME/.ssh/id_rsa"
    echo -e "  - $REAL_HOME/.ssh/id_ed25519"
    echo -e "${YELLOW}Текущая конфигурация:${NC}"
    echo -e "  REAL_USER=$REAL_USER"
    echo -e "  REAL_HOME=$REAL_HOME"
    exit 1
fi

echo -e "${YELLOW}Используется SSH ключ: $SSH_KEY${NC}"

# Проверяем доступ к репозиторию
echo -e "${YELLOW}[1/3] Проверка доступа к репозиторию (ветка: $BRANCH)...${NC}"
if ! git ls-remote --heads "$REPO" "$BRANCH" >/dev/null 2>&1; then
    echo -e "${RED}Ошибка: Не удалось получить доступ к ветке $BRANCH в репозитории${NC}"
    echo -e "${YELLOW}Проверьте SSH ключ и права доступа к репозиторию${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Доступ к ветке $BRANCH подтвержден${NC}"

# Клонирование репозитория
echo -e "${YELLOW}[2/3] Клонирование кода из Git (ветка: $BRANCH)...${NC}"
mkdir -p "$RELEASES"
if ! git clone --depth=1 --branch "$BRANCH" "$REPO" "$REL"; then
    echo -e "${RED}Ошибка при клонировании репозитория${NC}"
    rm -rf "$REL"
    exit 1
fi
echo -e "${GREEN}  ✓ Код успешно склонирован из ветки $BRANCH${NC}"

# Удаление .git для экономии места
echo -e "${YELLOW}[3/3] Очистка .git директории...${NC}"
rm -rf "$REL/.git"
echo -e "${GREEN}  ✓ .git директория удалена${NC}"

# Сохраняем информацию о релизе
cd "$REL"
echo "$VERSION" > "$BASE/.last_deployed"
echo "$BRANCH" > "$REL/.branch"
date '+%Y-%m-%d %H:%M:%S' > "$REL/.deployed_at"
git rev-parse HEAD > "$REL/.commit" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} ✓ Релиз $VERSION готов${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Версия: $VERSION${NC}"
echo -e "${GREEN}Ветка:  $BRANCH${NC}"
echo -e "${GREEN}Путь:   $REL${NC}"
if [ -f "$REL/.commit" ]; then
    echo -e "${GREEN}Commit: $(cat $REL/.commit)${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Следующие шаги:${NC}"
echo -e "  1. Тестирование на staging:"
echo -e "     ${YELLOW}./bin/preview.sh $VERSION${NC}"
echo -e "  2. Деплой в production:"
echo -e "     ${YELLOW}./bin/promote.sh $VERSION${NC}"
echo ""
