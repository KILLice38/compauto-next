#!/bin/bash
#
# clean.sh - Clean old releases
# Usage: ./bin/clean.sh [--keep N]
# Default: keeps last 5 releases
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/compauto"
RELEASES_DIR="$APP_DIR/releases"
CURRENT_DIR="$APP_DIR/current"
STAGING_DIR="$APP_DIR/staging"
KEEP=5  # Default: keep last 5 releases

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep)
            KEEP="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--keep N]"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}Cleaning old releases${NC}"
echo -e "${YELLOW}Keeping: $KEEP most recent${NC}"
echo -e "${YELLOW}====================================${NC}"

# Check if releases directory exists
if [ ! -d "$RELEASES_DIR" ]; then
    echo -e "${RED}Error: Releases directory not found: $RELEASES_DIR${NC}"
    exit 1
fi

# Get current and staging versions to protect them
PROTECTED_RELEASES=()

if [ -L "$CURRENT_DIR" ]; then
    CURRENT_VERSION=$(basename "$(readlink "$CURRENT_DIR")")
    PROTECTED_RELEASES+=("$CURRENT_VERSION")
    echo -e "${GREEN}Protected (current): $CURRENT_VERSION${NC}"
fi

if [ -L "$STAGING_DIR" ]; then
    STAGING_VERSION=$(basename "$(readlink "$STAGING_DIR")")
    if [[ ! " ${PROTECTED_RELEASES[@]} " =~ " ${STAGING_VERSION} " ]]; then
        PROTECTED_RELEASES+=("$STAGING_VERSION")
    fi
    echo -e "${GREEN}Protected (staging): $STAGING_VERSION${NC}"
fi

echo ""

# Get all releases sorted by modification time (newest first)
cd "$RELEASES_DIR" || exit 1
RELEASES=($(ls -1t))
TOTAL=${#RELEASES[@]}

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}No releases found${NC}"
    exit 0
fi

echo -e "${YELLOW}Found $TOTAL releases${NC}"
echo ""

# Calculate how many to delete
TO_DELETE_COUNT=$((TOTAL - KEEP))

if [ $TO_DELETE_COUNT -le 0 ]; then
    echo -e "${GREEN}No releases to delete (total: $TOTAL, keeping: $KEEP)${NC}"
    exit 0
fi

# Get releases to delete (oldest ones, skipping protected)
DELETED=0
SKIPPED=0

for ((i=$((TOTAL-1)); i>=KEEP-1; i--)); do
    RELEASE="${RELEASES[$i]}"

    # Check if release is protected
    if [[ " ${PROTECTED_RELEASES[@]} " =~ " ${RELEASE} " ]]; then
        echo -e "${YELLOW}Skipping (protected): $RELEASE${NC}"
        ((SKIPPED++))
        continue
    fi

    # Delete release
    echo -e "${RED}Deleting: $RELEASE${NC}"
    rm -rf "$RELEASES_DIR/$RELEASE"
    ((DELETED++))
done

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Cleanup complete${NC}"
echo -e "${GREEN}Deleted: $DELETED releases${NC}"
if [ $SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}Skipped: $SKIPPED protected releases${NC}"
fi
echo -e "${GREEN}Remaining: $((TOTAL - DELETED)) releases${NC}"
echo -e "${GREEN}====================================${NC}"

# Show disk usage
echo ""
echo -e "${YELLOW}Disk usage:${NC}"
du -sh "$RELEASES_DIR"
