#!/bin/bash
#
# deploy.sh - Deploy new release from GitHub via SSH
# Usage: ./bin/deploy.sh <version>
# Example: ./bin/deploy.sh v1.0.0
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/compauto"
REPO_URL="git@github.com:KILLice38/compauto-next.git"
SSH_KEY="$HOME/.ssh/github"
RELEASES_DIR="$APP_DIR/releases"

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
echo -e "${YELLOW}Deploying version: $VERSION${NC}"
echo -e "${YELLOW}====================================${NC}"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    echo "Please ensure your GitHub SSH key is located at $SSH_KEY"
    exit 1
fi

# Check if release already exists
if [ -d "$RELEASE_DIR" ]; then
    echo -e "${RED}Error: Release $VERSION already exists at $RELEASE_DIR${NC}"
    echo "If you want to redeploy, first remove the existing release:"
    echo "  sudo rm -rf $RELEASE_DIR"
    exit 1
fi

# Create releases directory if it doesn't exist
if [ ! -d "$RELEASES_DIR" ]; then
    echo -e "${YELLOW}Creating releases directory...${NC}"
    mkdir -p "$RELEASES_DIR"
fi

# Clone repository via SSH
echo -e "${YELLOW}Cloning repository via SSH...${NC}"
GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" \
  git clone --branch "$VERSION" --depth 1 "$REPO_URL" "$RELEASE_DIR"

# Remove .git directory to save space
echo -e "${YELLOW}Cleaning up .git directory...${NC}"
rm -rf "$RELEASE_DIR/.git"

# Success message
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✓ Release $VERSION deployed successfully${NC}"
echo -e "${GREEN}Location: $RELEASE_DIR${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the release:      ./bin/preview.sh $VERSION"
echo "  2. Promote to production: ./bin/promote.sh $VERSION"
