#!/bin/bash
#
# rollback.sh - Rollback to previous production release
# Usage: ./bin/rollback.sh
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
CURRENT_DIR="$APP_DIR/current"
PREVIOUS_FILE="$APP_DIR/.previous_release"

echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}Rollback to previous release${NC}"
echo -e "${YELLOW}====================================${NC}"

# Check if previous release file exists
if [ ! -f "$PREVIOUS_FILE" ]; then
    echo -e "${RED}Error: No previous release found${NC}"
    echo "Cannot rollback - no rollback information available."
    exit 1
fi

PREVIOUS_VERSION=$(cat "$PREVIOUS_FILE")
PREVIOUS_DIR="$RELEASES_DIR/$PREVIOUS_VERSION"

# Check if previous release directory exists
if [ ! -d "$PREVIOUS_DIR" ]; then
    echo -e "${RED}Error: Previous release directory not found${NC}"
    echo "Expected: $PREVIOUS_DIR"
    exit 1
fi

# Get current version for reporting
CURRENT_VERSION=""
if [ -L "$CURRENT_DIR" ]; then
    CURRENT_VERSION=$(basename "$(readlink "$CURRENT_DIR")")
fi

echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"
echo -e "${YELLOW}Rolling back to: $PREVIOUS_VERSION${NC}"
echo ""

# Confirmation prompt (skip in non-interactive mode)
if [ -t 0 ]; then
    echo -e "${YELLOW}Continue with rollback? (yes/no)${NC}"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo -e "${RED}Rollback cancelled${NC}"
        exit 0
    fi
fi

# Remove current symlink
if [ -L "$CURRENT_DIR" ]; then
    echo -e "${YELLOW}Removing current symlink...${NC}"
    rm "$CURRENT_DIR"
fi

# Create symlink to previous release
echo -e "${YELLOW}Creating symlink to $PREVIOUS_VERSION...${NC}"
ln -s "$PREVIOUS_DIR" "$CURRENT_DIR"

# Restart PM2 application
echo -e "${YELLOW}Restarting production application...${NC}"
pm2 reload compauto-production --update-env

# Wait for application to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

# Check if application is running
if pm2 describe compauto-production | grep -q "online"; then
    echo -e "${GREEN}====================================${NC}"
    echo -e "${GREEN}✓ Rollback successful${NC}"
    echo -e "${GREEN}Restored version: $PREVIOUS_VERSION${NC}"
    echo -e "${GREEN}====================================${NC}"
    echo ""
    echo -e "${YELLOW}Check status:${NC} ./bin/status.sh"
    echo -e "${YELLOW}View logs:${NC} pm2 logs compauto-production"

    # Clear previous release marker
    rm -f "$PREVIOUS_FILE"
else
    echo -e "${RED}====================================${NC}"
    echo -e "${RED}✗ Application failed to start after rollback${NC}"
    echo -e "${RED}====================================${NC}"
    echo "Check logs: pm2 logs compauto-production"
    exit 1
fi
