#!/bin/bash
#
# setup-ip.sh - Configure additional IP address for the server
# Usage: sudo ./bin/setup-ip.sh <IP_ADDRESS> <NETMASK> <INTERFACE>
# Example: sudo ./bin/setup-ip.sh 192.168.1.100 255.255.255.0 eth0
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Usage: sudo $0 <IP_ADDRESS> <NETMASK> <INTERFACE>"
    exit 1
fi

# Check arguments
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: sudo $0 <IP_ADDRESS> <NETMASK> <INTERFACE>"
    echo ""
    echo "Example (Timeweb Cloud):"
    echo "  sudo $0 185.104.248.123 255.255.255.0 eth0"
    echo ""
    echo "To find your interface name, run: ip link show"
    exit 1
fi

IP_ADDRESS="$1"
NETMASK="$2"
INTERFACE="$3"

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Additional IP Configuration${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo -e "${YELLOW}IP Address: $IP_ADDRESS${NC}"
echo -e "${YELLOW}Netmask:    $NETMASK${NC}"
echo -e "${YELLOW}Interface:  $INTERFACE${NC}"
echo ""

# Validate IP address format
if ! [[ $IP_ADDRESS =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo -e "${RED}Error: Invalid IP address format${NC}"
    exit 1
fi

# Check if interface exists
if ! ip link show "$INTERFACE" > /dev/null 2>&1; then
    echo -e "${RED}Error: Interface $INTERFACE not found${NC}"
    echo "Available interfaces:"
    ip link show | grep "^[0-9]" | awk '{print "  " $2}' | sed 's/:$//'
    exit 1
fi

# Check if IP is already configured
if ip addr show "$INTERFACE" | grep -q "$IP_ADDRESS"; then
    echo -e "${YELLOW}Warning: IP $IP_ADDRESS is already configured on $INTERFACE${NC}"
    echo -e "${YELLOW}Skipping configuration...${NC}"
else
    # Add IP to interface
    echo -e "${YELLOW}Adding IP address to $INTERFACE...${NC}"
    ip addr add "$IP_ADDRESS/$NETMASK" dev "$INTERFACE"
    echo -e "${GREEN}✓ IP address added${NC}"
fi

# Create persistent configuration for Ubuntu/Debian (netplan)
NETPLAN_FILE="/etc/netplan/60-additional-ip.yaml"

if command -v netplan > /dev/null 2>&1; then
    echo -e "${YELLOW}Creating persistent netplan configuration...${NC}"

    cat > "$NETPLAN_FILE" <<EOF
network:
  version: 2
  ethernets:
    $INTERFACE:
      addresses:
        - $IP_ADDRESS/$(ipcalc -n -b "$IP_ADDRESS" "$NETMASK" | grep "^Network" | awk '{print $2}' | cut -d'/' -f2 || echo "24")
EOF

    # Apply netplan
    netplan apply
    echo -e "${GREEN}✓ Netplan configuration created and applied${NC}"

# Alternative: CentOS/RHEL style configuration
elif [ -d "/etc/sysconfig/network-scripts" ]; then
    echo -e "${YELLOW}Creating persistent network-scripts configuration...${NC}"

    IFCFG_FILE="/etc/sysconfig/network-scripts/ifcfg-$INTERFACE:0"

    cat > "$IFCFG_FILE" <<EOF
DEVICE=$INTERFACE:0
BOOTPROTO=static
IPADDR=$IP_ADDRESS
NETMASK=$NETMASK
ONBOOT=yes
EOF

    # Restart network
    systemctl restart network
    echo -e "${GREEN}✓ Network configuration created and applied${NC}"

else
    echo -e "${YELLOW}Warning: Could not create persistent configuration${NC}"
    echo -e "${YELLOW}Configuration is temporary and will not survive reboot${NC}"
    echo ""
    echo -e "${YELLOW}To make it persistent, add the following to your network configuration:${NC}"
    echo "  Interface: $INTERFACE"
    echo "  IP: $IP_ADDRESS"
    echo "  Netmask: $NETMASK"
fi

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✓ IP Configuration Complete${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""

# Show current configuration
echo -e "${YELLOW}Current IP addresses on $INTERFACE:${NC}"
ip addr show "$INTERFACE" | grep "inet " | awk '{print "  " $2}'
echo ""

# Test connectivity
echo -e "${YELLOW}Testing connectivity...${NC}"
if ping -c 1 -W 2 "$IP_ADDRESS" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ IP $IP_ADDRESS is reachable${NC}"
else
    echo -e "${RED}⚠ Could not ping $IP_ADDRESS${NC}"
    echo -e "${YELLOW}This may be normal depending on your network configuration${NC}"
fi

echo ""
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo "1. Update your nginx configuration with the correct domain:"
echo "   Edit: /etc/nginx/sites-available/compauto.conf"
echo "   Replace 'yourdomain.ru' with your actual domain"
echo ""
echo "2. The domain should be pointed to IP: $IP_ADDRESS"
echo ""
echo "3. After DNS propagation, obtain SSL certificate:"
echo "   sudo certbot --nginx -d yourdomain.ru -d www.yourdomain.ru"
echo ""
echo "4. Deploy your application:"
echo "   cd /var/www/compauto"
echo "   ./bin/deploy.sh v1.0.0"
echo "   ./bin/preview.sh v1.0.0"
echo "   ./bin/promote.sh v1.0.0"
