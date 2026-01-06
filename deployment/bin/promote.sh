#!/bin/bash
#
# promote.sh - Promote release to production
# Usage: ./bin/promote.sh <version>
# Example: ./bin/promote.sh v1.0.0
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/compauto"
RELEASES_DIR="$APP_DIR/releases"
CURRENT_DIR="$APP_DIR/current"
SHARED_DIR="$APP_DIR/shared"
ENV_FILE="/etc/compauto/.env"
PREVIOUS_FILE="$APP_DIR/.previous_release"

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
echo -e "${YELLOW}Production deployment: $VERSION${NC}"
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

# Save current release for rollback
if [ -L "$CURRENT_DIR" ]; then
    PREVIOUS_RELEASE=$(basename "$(readlink "$CURRENT_DIR")")
    echo "$PREVIOUS_RELEASE" > "$PREVIOUS_FILE"
    echo -e "${BLUE}Previous release: $PREVIOUS_RELEASE${NC}"
fi

# Confirmation prompt
echo -e "${YELLOW}Are you sure you want to promote $VERSION to production? (yes/no)${NC}"
read -r confirmation
if [ "$confirmation" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Create shared directories if they don't exist
echo -e "${YELLOW}Setting up shared directories...${NC}"
mkdir -p "$SHARED_DIR/uploads/products"
mkdir -p "$SHARED_DIR/uploads/tmp"
mkdir -p "$SHARED_DIR/logs"
mkdir -p "$SHARED_DIR/.next/cache"

# Remove old current symlink if exists
if [ -L "$CURRENT_DIR" ]; then
    echo -e "${YELLOW}Removing old production symlink...${NC}"
    rm "$CURRENT_DIR"
elif [ -d "$CURRENT_DIR" ]; then
    echo -e "${RED}Error: $CURRENT_DIR exists and is not a symlink${NC}"
    echo "Please remove it manually first."
    exit 1
fi

# Create symlink to new release
echo -e "${YELLOW}Creating symlink to $VERSION...${NC}"
ln -s "$RELEASE_DIR" "$CURRENT_DIR"

# Link .env file
echo -e "${YELLOW}Linking environment file...${NC}"
ln -sf "$ENV_FILE" "$CURRENT_DIR/.env"

# Link shared directories
echo -e "${YELLOW}Linking shared directories...${NC}"
rm -rf "$CURRENT_DIR/public/uploads"
ln -s "$SHARED_DIR/uploads" "$CURRENT_DIR/public/uploads"

# Link .next cache
if [ -d "$CURRENT_DIR/.next/cache" ]; then
    rm -rf "$CURRENT_DIR/.next/cache"
    ln -s "$SHARED_DIR/.next/cache" "$CURRENT_DIR/.next/cache"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies with pnpm...${NC}"
cd "$CURRENT_DIR"
pnpm install --prod --frozen-lockfile --ignore-scripts

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
echo -e "${YELLOW}Restarting production application...${NC}"
if pm2 describe compauto-production > /dev/null 2>&1; then
    pm2 reload compauto-production --update-env
else
    pm2 start /var/www/compauto/deployment/ecosystem.config.cjs --only compauto-production
fi

# Save PM2 configuration
pm2 save

# Wait for application to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

# Check if application is running
if pm2 describe compauto-production | grep -q "online"; then
    echo -e "${GREEN}====================================${NC}"
    echo -e "${GREEN}✓ Production deployment successful${NC}"
    echo -e "${GREEN}Version: $VERSION${NC}"
    if [ -f "$PREVIOUS_FILE" ]; then
        echo -e "${GREEN}Previous: $(cat $PREVIOUS_FILE)${NC}"
    fi
    echo -e "${GREEN}====================================${NC}"
    echo ""
    echo -e "${YELLOW}Check status:${NC} ./bin/status.sh"
    echo -e "${YELLOW}View logs:${NC} pm2 logs compauto-production"
    if [ -f "$PREVIOUS_FILE" ]; then
        echo -e "${YELLOW}Rollback if needed:${NC} ./bin/rollback.sh"
    fi
else
    echo -e "${RED}====================================${NC}"
    echo -e "${RED}✗ Application failed to start${NC}"
    echo -e "${RED}====================================${NC}"
    echo "Check logs: pm2 logs compauto-production"

    # Auto-rollback if previous release exists
    if [ -f "$PREVIOUS_FILE" ]; then
        echo -e "${YELLOW}Attempting auto-rollback...${NC}"
        ./bin/rollback.sh
    fi
    exit 1
fi
