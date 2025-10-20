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
INTERACTIVE=false

usage() {
    cat <<USAGE
${YELLOW}Usage:${NC} $(basename "$0") [options]

Options:
    -b, --background   Start servers in the background (no traps). Logs -> dev.log
    -n, --no-clean     Skip killing ports and npm/vite processes
    -f, --full-clean   Full clean: ports + caches + reinstall dependencies
    -d, --domain NAME  Override external access domain (default: ${DOMAIN})
    -i, --interactive  Interactive mode - prompts for server selection
    -h, --help         Show this help

Notes:
    - This script never starts/stops Cloudflare. Manage tunnels manually.
    - To access externally, ensure your tunnel routes ${DOMAIN} -> localhost:3000
    - Use --full-clean for a fresh build (clears caches and reinstalls)
    - Default mode starts both the frontend and ESPN API server
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
        -i|--interactive)
            INTERACTIVE=true
            shift
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
    echo -e "${BLUE}Frontend Access URLs:${NC}"
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

print_espn_access_info() {
    echo -e "${BLUE}ESPN API Server:${NC}"
    echo -e "  - Local:   ${GREEN}http://localhost:3001${NC}"
    if ip -o -4 addr show 2>/dev/null | grep -q "inet "; then
        ip -o -4 addr show | awk '{print $4}' | cut -d/ -f1 | grep -E '^[0-9]+' | while read -r ip; do
            [[ "$ip" == "127.0.0.1" ]] && continue
            echo -e "  - Network: ${GREEN}http://$ip:3001${NC}"
        done | head -n 1
    fi
}

start_foreground() {
    echo -e "${YELLOW}🚀 Starting dev server (foreground)...${NC}"
    # Trap to cleanup on exit (foreground only)
    cleanup() {
        echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
        pkill -9 -f "vite" 2>/dev/null || true
        pkill -9 -f "espn-api-server" 2>/dev/null || true
        [ -f .espn_api.pid ] && rm -f .espn_api.pid
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

start_espn_api() {
    echo -e "${YELLOW}🏈 Starting ESPN API server...${NC}"

    # Check if Python and required packages are installed
    if ! command -v python &> /dev/null; then
        echo -e "${RED}❌ Python is not installed. Please install Python to use the ESPN API.${NC}"
        return 1
    fi

    # Check if pyespn is installed
    if ! python -c "import pyespn" &>/dev/null; then
        echo -e "${YELLOW}⚠️  pyespn not found. Installing...${NC}"
        pip install pyespn
    fi

    # Start the ESPN API server
    if [ "$BACKGROUND" = true ]; then
        nohup node espn-api-server.cjs > espn-api.log 2>&1 &
        ESPN_PID=$!
        echo $ESPN_PID > .espn_api.pid
        sleep 0.5
        if ps -p $ESPN_PID >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ESPN API server started (PID: $ESPN_PID)${NC}"
            print_espn_access_info
            echo -e "${BLUE}Logs:${NC} tail -f espn-api.log"
        else
            echo -e "${RED}❌ Failed to start ESPN API server. Check espn-api.log for details.${NC}"
            return 1
        fi
    else
        # Start in foreground
        echo -e "${YELLOW}🏈 Starting ESPN API server (foreground)...${NC}"
        node espn-api-server.cjs &
        ESPN_PID=$!
        echo $ESPN_PID > .espn_api.pid
        print_espn_access_info
    fi
}

interactive_mode() {
    echo -e "${BLUE}=== Interactive Server Selection ===${NC}"
    echo "1) Frontend only"
    echo "2) ESPN API only"
    echo "3) Both Frontend and ESPN API"
    echo "4) Exit"

    read -p "Select an option [1-4]: " choice

    case $choice in
        1)
            echo -e "${YELLOW}Starting Frontend only...${NC}"
            if [ "$BACKGROUND" = true ]; then
                start_background
            else
                start_foreground
            fi
            ;;
        2)
            echo -e "${YELLOW}Starting ESPN API only...${NC}"
            start_espn_api
            if [ "$BACKGROUND" = false ]; then
                # Wait for user to stop
                echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
                wait
            fi
            ;;
        3)
            echo -e "${YELLOW}Starting both Frontend and ESPN API...${NC}"
            start_espn_api
            if [ "$BACKGROUND" = true ]; then
                start_background
            else
                # Start frontend in background so we can wait for both
                BACKGROUND=true
                start_background
                echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
                wait
            fi
            ;;
        4)
            echo -e "${YELLOW}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please select 1-4.${NC}"
            interactive_mode
            ;;
    esac
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

if [ "$INTERACTIVE" = true ]; then
    interactive_mode
else
    # Default behavior - start both servers
    start_espn_api
    if [ "$BACKGROUND" = true ]; then
        start_background
    else
        # Start frontend in background so we can wait for both
        BACKGROUND=true
        start_background
        echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
        wait
    fi
fi
