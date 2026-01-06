#!/bin/bash
#
# preview.sh - Deploy release to staging environment
# Usage: ./bin/preview.sh <version>
# Example: ./bin/preview.sh v1.0.0
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/compauto"
RELEASES_DIR="$APP_DIR/releases"
STAGING_DIR="$APP_DIR/staging"
SHARED_STAGING_DIR="$APP_DIR/shared-staging"
ENV_FILE="/etc/compauto-staging/.env"

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version argument is required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

VERSION="$1"
RELEASE_DIR="$RELEASES_DIR/$VERSION"

echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}Preview deployment: $VERSION${NC}"
echo -e "${YELLOW}====================================${NC}"

# Check if release exists
if [ ! -d "$RELEASE_DIR" ]; then
    echo -e "${RED}Error: Release $VERSION not found at $RELEASE_DIR${NC}"
    echo "Please deploy the release first:"
    echo "  ./bin/deploy.sh $VERSION"
    exit 1
fi

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found at $ENV_FILE${NC}"
    echo "Please create the environment file first."
    exit 1
fi

# Create shared directories if they don't exist
echo -e "${YELLOW}Setting up shared directories...${NC}"
mkdir -p "$SHARED_STAGING_DIR/uploads/products"
mkdir -p "$SHARED_STAGING_DIR/uploads/tmp"
mkdir -p "$SHARED_STAGING_DIR/logs"
mkdir -p "$SHARED_STAGING_DIR/.next/cache"

# Remove old staging symlink if exists
if [ -L "$STAGING_DIR" ]; then
    echo -e "${YELLOW}Removing old staging symlink...${NC}"
    rm "$STAGING_DIR"
elif [ -d "$STAGING_DIR" ]; then
    echo -e "${RED}Error: $STAGING_DIR exists and is not a symlink${NC}"
    echo "Please remove it manually first."
    exit 1
fi

# Create symlink to new release
echo -e "${YELLOW}Creating symlink to $VERSION...${NC}"
ln -s "$RELEASE_DIR" "$STAGING_DIR"

# Link .env file
echo -e "${YELLOW}Linking environment file...${NC}"
ln -sf "$ENV_FILE" "$STAGING_DIR/.env"

# Link shared directories
echo -e "${YELLOW}Linking shared directories...${NC}"
rm -rf "$STAGING_DIR/public/uploads"
ln -s "$SHARED_STAGING_DIR/uploads" "$STAGING_DIR/public/uploads"

# Link .next cache
if [ -d "$STAGING_DIR/.next/cache" ]; then
    rm -rf "$STAGING_DIR/.next/cache"
    ln -s "$SHARED_STAGING_DIR/.next/cache" "$STAGING_DIR/.next/cache"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies with pnpm...${NC}"
cd "$STAGING_DIR"
HUSKY=0 pnpm install --prod --frozen-lockfile

# Generate Prisma Client
echo -e "${YELLOW}Generating Prisma Client...${NC}"
pnpm prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
pnpm prisma migrate deploy

# Build Next.js application
echo -e "${YELLOW}Building Next.js application...${NC}"
pnpm build

# Restart PM2 application
echo -e "${YELLOW}Restarting staging application...${NC}"
if pm2 describe compauto-staging > /dev/null 2>&1; then
    pm2 reload compauto-staging --update-env
else
    pm2 start /var/www/compauto/deployment/ecosystem.config.cjs --only compauto-staging
fi

# Wait for application to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

# Check if application is running
if pm2 describe compauto-staging | grep -q "online"; then
    echo -e "${GREEN}====================================${NC}"
    echo -e "${GREEN}✓ Staging deployment successful${NC}"
    echo -e "${GREEN}Version: $VERSION${NC}"
    echo -e "${GREEN}====================================${NC}"
    echo ""
    echo -e "${YELLOW}Check status:${NC} ./bin/status.sh"
    echo -e "${YELLOW}View logs:${NC} pm2 logs compauto-staging"
    echo -e "${YELLOW}Promote to production:${NC} ./bin/promote.sh $VERSION"
else
    echo -e "${RED}====================================${NC}"
    echo -e "${RED}✗ Application failed to start${NC}"
    echo -e "${RED}====================================${NC}"
    echo "Check logs: pm2 logs compauto-staging"
    exit 1
fi
