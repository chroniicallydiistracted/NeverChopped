#!/bin/bash

# NOTE: This startup script intentionally DOES NOT interact with Cloudflare.
# - No cloudflared start/stop commands
# - No DNS or Zero Trust operations
# Cloudflare tunnels (named or quick) must be started/stopped manually outside
# of this script to avoid coupling dev server lifecycle to external networking.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKGROUND=false
NOCLEAN=false
FULLCLEAN=false
PORT_START=3000
PORT_END=3010
DOMAIN=${TUNNEL_DOMAIN:-sleeper.westfam.media}

usage() {
    cat <<USAGE
${YELLOW}Usage:${NC} $(basename "$0") [options]

Options:
    -b, --background   Start Vite in the background (no traps). Logs -> dev.log
    -n, --no-clean     Skip killing ports and npm/vite processes
    -f, --full-clean   Full clean: ports + caches + reinstall dependencies
    -d, --domain NAME  Override external access domain (default: ${DOMAIN})
    -h, --help         Show this help

Notes:
    - This script never starts/stops Cloudflare. Manage tunnels manually.
    - To access externally, ensure your tunnel routes ${DOMAIN} -> localhost:3000
    - Use --full-clean for a fresh build (clears caches and reinstalls)
USAGE
}

if [[ "$1" == "stop" ]]; then
    echo -e "${YELLOW}🛑 Stopping dev server and cleaning ports...${NC}"
    clean_ports
    [ -f .dev_server.pid ] && rm -f .dev_server.pid
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--background)
            BACKGROUND=true
            shift
            ;;
        -n|--no-clean)
            NOCLEAN=true
            shift
            ;;
        -f|--full-clean)
            FULLCLEAN=true
            shift
            ;;
        -d|--domain)
            DOMAIN="$2"; shift 2
            ;;
        -h|--help)
            usage; exit 0
            ;;
        *)
            echo -e "${RED}Unknown option:${NC} $1"; usage; exit 1
            ;;
    esac
done

check_dependencies() {
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
        npm install
    else
        # Check if package.json is newer than node_modules
        if [ "package.json" -nt "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
            echo -e "${YELLOW}⚠️  Dependencies may be outdated. Running npm install...${NC}"
            npm install
        else
            echo -e "${GREEN}✅ Dependencies up to date${NC}"
        fi
    fi
}

clear_caches() {
    echo -e "${YELLOW}🗑️  Clearing build caches...${NC}"
    # Clear Vite cache
    if [ -d "node_modules/.vite" ]; then
        rm -rf node_modules/.vite
        echo -e "${GREEN}✅ Vite cache cleared${NC}"
    fi
    # Clear TypeScript build info
    if [ -f ".tsbuildinfo" ]; then
        rm -f .tsbuildinfo
        echo -e "${GREEN}✅ TypeScript build info cleared${NC}"
    fi
    # Clear dist folder
    if [ -d "dist" ]; then
        rm -rf dist
        echo -e "${GREEN}✅ Dist folder cleared${NC}"
    fi
}

clean_ports() {
    echo -e "${YELLOW}🧹 Cleaning up ports...${NC}"
    for port in $(seq $PORT_START $PORT_END); do
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            echo -e "${RED}Killing process on port $port (PID: $pid)${NC}"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    echo -e "${YELLOW}🔪 Killing any lingering npm/vite processes...${NC}"
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "npm run dev" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
}

print_access_info() {
    echo -e "${BLUE}Access URLs:${NC}"
    echo -e "  - Local:   ${GREEN}http://localhost:3000${NC}"
    # Best-effort network IPs
    if ip -o -4 addr show 2>/dev/null | grep -q "inet "; then
        ip -o -4 addr show | awk '{print $4}' | cut -d/ -f1 | grep -E '^[0-9]+' | while read -r ip; do
            [[ "$ip" == "127.0.0.1" ]] && continue
            echo -e "  - Network: ${GREEN}http://$ip:3000${NC}"
        done | head -n 3
    fi
    echo -e "  - External (via tunnel): ${GREEN}https://${DOMAIN}${NC}"
    echo -e "${YELLOW}Note:${NC} Tunnel must be running separately. This script will not start or stop it."
}

start_foreground() {
    echo -e "${YELLOW}🚀 Starting dev server (foreground)...${NC}"
    # Trap to cleanup on exit (foreground only)
    cleanup() {
        echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
        pkill -9 -f "vite" 2>/dev/null || true
        for port in $(seq $PORT_START $PORT_END); do
            pid=$(lsof -ti:$port 2>/dev/null)
            if [ -n "$pid" ]; then
                kill -9 $pid 2>/dev/null || true
            fi
        done
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    print_access_info
    npm run dev
}

start_background() {
    echo -e "${YELLOW}🚀 Starting dev server (background)...${NC}"
    # Start and detach
    nohup npm run dev > dev.log 2>&1 &
    DEV_PID=$!
    echo $DEV_PID > .dev_server.pid
    sleep 0.5
    if ps -p $DEV_PID >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Dev server started (PID: $DEV_PID)${NC}"
        print_access_info
        echo -e "${BLUE}Logs:${NC} tail -f dev.log"
    else
        echo -e "${RED}❌ Failed to start dev server. Check dev.log for details.${NC}"
        exit 1
    fi
}

if [ "$NOCLEAN" = false ]; then
    clean_ports
    
    if [ "$FULLCLEAN" = true ]; then
        echo -e "${YELLOW}🔥 Full clean requested...${NC}"
        clear_caches
        check_dependencies
    else
        # Always check dependencies even in normal mode
        check_dependencies
    fi
else
    echo -e "${YELLOW}⚠️  Skipping cleanup as requested (--no-clean).${NC}"
    # Still check dependencies in no-clean mode
    check_dependencies
fi

if [ "$BACKGROUND" = true ]; then
    start_background
else
    start_foreground
fi
