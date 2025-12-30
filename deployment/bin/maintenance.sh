#!/bin/bash
#
# maintenance.sh - Toggle maintenance mode
# Usage: ./bin/maintenance.sh [on|off]
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NGINX_MAINTENANCE_PAGE="/var/www/compauto/shared/maintenance.html"
NGINX_CONF="/etc/nginx/sites-available/compauto.conf"
MAINTENANCE_FLAG="/var/www/compauto/.maintenance_mode"

# Check if mode argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Mode argument is required${NC}"
    echo "Usage: $0 [on|off]"
    exit 1
fi

MODE="$1"

case "$MODE" in
    on)
        echo -e "${YELLOW}Enabling maintenance mode...${NC}"

        # Create maintenance flag
        touch "$MAINTENANCE_FLAG"

        # Create maintenance HTML page if it doesn't exist
        if [ ! -f "$NGINX_MAINTENANCE_PAGE" ]; then
            cat > "$NGINX_MAINTENANCE_PAGE" <<'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Техническое обслуживание</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>Техническое обслуживание</h1>
        <p>Сайт временно недоступен из-за планового технического обслуживания.</p>
        <p>Пожалуйста, зайдите позже. Приносим извинения за неудобства.</p>
    </div>
</body>
</html>
EOF
        fi

        # Stop PM2 applications
        echo -e "${YELLOW}Stopping applications...${NC}"
        pm2 stop compauto-production compauto-staging 2>/dev/null || true

        # Reload nginx
        echo -e "${YELLOW}Reloading nginx...${NC}"
        sudo nginx -t && sudo systemctl reload nginx

        echo -e "${GREEN}====================================${NC}"
        echo -e "${GREEN}✓ Maintenance mode enabled${NC}"
        echo -e "${GREEN}====================================${NC}"
        echo ""
        echo -e "${YELLOW}Applications stopped. Maintenance page is now served.${NC}"
        echo -e "${YELLOW}To disable: ./bin/maintenance.sh off${NC}"
        ;;

    off)
        echo -e "${YELLOW}Disabling maintenance mode...${NC}"

        # Remove maintenance flag
        rm -f "$MAINTENANCE_FLAG"

        # Start PM2 applications
        echo -e "${YELLOW}Starting applications...${NC}"
        pm2 restart compauto-production compauto-staging 2>/dev/null || true

        # Reload nginx
        echo -e "${YELLOW}Reloading nginx...${NC}"
        sudo nginx -t && sudo systemctl reload nginx

        echo -e "${GREEN}====================================${NC}"
        echo -e "${GREEN}✓ Maintenance mode disabled${NC}"
        echo -e "${GREEN}====================================${NC}"
        echo ""
        echo -e "${GREEN}Applications restored.${NC}"
        echo -e "${YELLOW}Check status: ./bin/status.sh${NC}"
        ;;

    *)
        echo -e "${RED}Error: Invalid mode '$MODE'${NC}"
        echo "Usage: $0 [on|off]"
        exit 1
        ;;
esac
