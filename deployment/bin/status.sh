#!/bin/bash
#
# status.sh - Check application status
# Usage: ./bin/status.sh
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/compauto"
CURRENT_DIR="$APP_DIR/current"
STAGING_DIR="$APP_DIR/staging"

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Compauto Application Status${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Production status
echo -e "${YELLOW}PRODUCTION${NC}"
echo "----------------------------------------"

if [ -L "$CURRENT_DIR" ]; then
    CURRENT_VERSION=$(basename "$(readlink "$CURRENT_DIR")")
    echo -e "Version:   ${GREEN}$CURRENT_VERSION${NC}"
    echo -e "Path:      $CURRENT_DIR"
else
    echo -e "Status:    ${RED}NOT DEPLOYED${NC}"
fi

if pm2 describe compauto-production > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-production") | .pm2_env.status')
    UPTIME=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-production") | .pm2_env.pm_uptime')
    MEMORY=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-production") | .monit.memory' | numfmt --to=iec)
    CPU=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-production") | .monit.cpu')
    RESTARTS=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-production") | .pm2_env.restart_time')

    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "PM2 Status: ${GREEN}$PM2_STATUS${NC}"
    else
        echo -e "PM2 Status: ${RED}$PM2_STATUS${NC}"
    fi

    echo "Memory:     $MEMORY"
    echo "CPU:        $CPU%"
    echo "Restarts:   $RESTARTS"

    if [ -n "$UPTIME" ] && [ "$UPTIME" != "null" ]; then
        UPTIME_HUMAN=$(date -d "@$((UPTIME/1000))" -u +'%-Hh %-Mm' 2>/dev/null || echo "N/A")
        echo "Uptime:     $UPTIME_HUMAN"
    fi
else
    echo -e "PM2 Status: ${RED}NOT RUNNING${NC}"
fi

echo ""

# Staging status
echo -e "${YELLOW}STAGING${NC}"
echo "----------------------------------------"

if [ -L "$STAGING_DIR" ]; then
    STAGING_VERSION=$(basename "$(readlink "$STAGING_DIR")")
    echo -e "Version:   ${GREEN}$STAGING_VERSION${NC}"
    echo -e "Path:      $STAGING_DIR"
else
    echo -e "Status:    ${RED}NOT DEPLOYED${NC}"
fi

if pm2 describe compauto-staging > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-staging") | .pm2_env.status')
    MEMORY=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-staging") | .monit.memory' | numfmt --to=iec)
    CPU=$(pm2 jlist | jq -r '.[] | select(.name=="compauto-staging") | .monit.cpu')

    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "PM2 Status: ${GREEN}$PM2_STATUS${NC}"
    else
        echo -e "PM2 Status: ${RED}$PM2_STATUS${NC}"
    fi

    echo "Memory:     $MEMORY"
    echo "CPU:        $CPU%"
else
    echo -e "PM2 Status: ${RED}NOT RUNNING${NC}"
fi

echo ""
echo -e "${BLUE}====================================${NC}"
echo ""
echo -e "${YELLOW}Quick commands:${NC}"
echo "  View production logs:  pm2 logs compauto-production"
echo "  View staging logs:     pm2 logs compauto-staging"
echo "  Restart production:    pm2 restart compauto-production"
echo "  Restart staging:       pm2 restart compauto-staging"
echo "  Monitor all:           pm2 monit"
