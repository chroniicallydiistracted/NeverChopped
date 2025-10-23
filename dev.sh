#!/bin/bash
set -euo pipefail

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
INTERACTIVE=false
RUN_FRONTEND=true
RUN_API=true
PORT_START=3000
PORT_END=3010
DOMAIN=${TUNNEL_DOMAIN:-sleeper.westfam.media}
PYTHON_BIN=""

usage() {
    cat <<USAGE
${YELLOW}Usage:${NC} $(basename "$0") [options]

Options:
    -b, --background     Start servers in the background (no traps). Logs -> dev.log / espn-api.log
    -n, --no-clean       Skip killing ports and npm/vite processes
    -f, --full-clean     Full clean: ports + caches + reinstall dependencies
    -d, --domain NAME    Override external access domain (default: ${DOMAIN})
    -i, --interactive    Interactive mode - prompts for server selection
        --frontend-only  Only start the Vite dev server
        --api-only       Only start the ESPN API server
    -h, --help           Show this help

Commands:
    stop                 Stop any background dev processes started by this script

Notes:
    - This script never starts/stops Cloudflare. Manage tunnels manually.
    - To access externally, ensure your tunnel routes ${DOMAIN} -> localhost:3000
    - Use --full-clean for a fresh build (clears caches and reinstalls)
    - Default mode starts both the frontend and ESPN API server
USAGE
}

stop_pid_file() {
    local file="$1"
    local label="$2"

    if [[ -f "$file" ]]; then
        local pid
        pid=$(cat "$file" 2>/dev/null || true)
        if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping ${label} (PID: ${pid})...${NC}"
            kill "$pid" 2>/dev/null || true
            sleep 0.5
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$file"
    fi
}

clean_ports() {
    echo -e "${YELLOW}🧹 Cleaning up ports and background processes...${NC}"

    stop_pid_file ".dev_server.pid" "frontend dev server"
    stop_pid_file ".espn_api.pid" "ESPN API server"

    for port in $(seq $PORT_START $PORT_END); do
        pid=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$pid" ]]; then
            echo -e "${RED}Killing process on port $port (PID: $pid)${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done

    echo -e "${YELLOW}🔪 Killing lingering dev processes...${NC}"
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "espn-api-server" 2>/dev/null || true
    pkill -9 -f "api:espn" 2>/dev/null || true

    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

check_dependencies() {
    echo -e "${YELLOW}📦 Checking dependencies...${NC}"
    if [[ ! -d "node_modules" ]]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
        npm install
    else
        if [[ "package.json" -nt "node_modules" || "package-lock.json" -nt "node_modules" ]]; then
            echo -e "${YELLOW}⚠️  Dependencies may be outdated. Running npm install...${NC}"
            npm install
        else
            echo -e "${GREEN}✅ Dependencies up to date${NC}"
        fi
    fi
}

clear_caches() {
    echo -e "${YELLOW}🗑️  Clearing build caches...${NC}"
    if [[ -d "node_modules/.vite" ]]; then
        rm -rf node_modules/.vite
        echo -e "${GREEN}✅ Vite cache cleared${NC}"
    fi
    if [[ -f ".tsbuildinfo" ]]; then
        rm -f .tsbuildinfo
        echo -e "${GREEN}✅ TypeScript build info cleared${NC}"
    fi
    if [[ -d "dist" ]]; then
        rm -rf dist
        echo -e "${GREEN}✅ Dist folder cleared${NC}"
    fi
}

print_access_info() {
    echo -e "${BLUE}Frontend Access URLs:${NC}"
    echo -e "  - Local:   ${GREEN}http://localhost:3000${NC}"
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

detect_python() {
    if [[ -n "$PYTHON_BIN" ]]; then
        return
    fi
    for candidate in python python3; do
        if command -v "$candidate" >/dev/null 2>&1; then
            PYTHON_BIN="$candidate"
            break
        fi
    done
    if [[ -z "$PYTHON_BIN" ]]; then
        echo -e "${RED}❌ Python is not installed. Please install Python to use the ESPN API.${NC}"
        exit 1
    fi
}

# ...existing code...
ensure_pyespn() {
    detect_python

    # When inside a virtualenv, pip --user is invalid because the virtualenv hides user site-packages.
    # Choose whether to pass --user based on presence of VIRTUAL_ENV.
    local PIP_USER_FLAG=""
    if [[ -n "${VIRTUAL_ENV:-}" ]]; then
        PIP_USER_FLAG=""
    else
        PIP_USER_FLAG="--user"
    fi

    local requirements_file=""
    local candidates=("requirements.txt" "py/requirements.txt" "py scripts/requirements.txt")
    for candidate in "${candidates[@]}"; do
        if [[ -f "$candidate" ]]; then
            requirements_file="$candidate"
            break
        fi
    done

    if [[ -n "$requirements_file" ]]; then
        local checksum marker installed_checksum
        checksum=$(sha1sum "$requirements_file" | awk '{print $1}')
        marker=".python-deps.sha1"
        installed_checksum=""
        if [[ -f "$marker" ]]; then
            installed_checksum=$(cat "$marker" 2>/dev/null || true)
        fi

        if [[ "$checksum" != "$installed_checksum" ]]; then
            echo -e "${YELLOW}⚙️  Installing Python dependencies from ${requirements_file}...${NC}"
            # Use PIP_USER_FLAG which is empty inside virtualenv and "--user" otherwise.
            "$PYTHON_BIN" -m pip install ${PIP_USER_FLAG} --upgrade --requirement "$requirements_file"
            echo "$checksum" > "$marker"
        else
            echo -e "${GREEN}✅ Python dependencies are current (${requirements_file}).${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No requirements file found. Falling back to pyespn presence check.${NC}"
    fi

    # Ensure pyespn is installed; again respect virtualenv vs --user
    if ! "$PYTHON_BIN" -c "import pyespn" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  pyespn not found for ${PYTHON_BIN}. Installing...${NC}"
        "$PYTHON_BIN" -m pip install ${PIP_USER_FLAG} pyespn
    fi
}
# ...existing code...

start_frontend_background() {
    echo -e "${YELLOW}🚀 Starting dev server (background)...${NC}"
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

start_frontend_foreground() {
    echo -e "${YELLOW}🚀 Starting dev server (foreground)...${NC}"
    cleanup() {
        echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
        stop_services
        exit 0
    }
    trap cleanup SIGINT SIGTERM
    print_access_info
    npm run dev
}

start_api_background() {
    ensure_pyespn
    echo -e "${YELLOW}🏈 Starting ESPN API server (background)...${NC}"
    nohup npm run api:espn > espn-api.log 2>&1 &
    ESPN_PID=$!
    echo $ESPN_PID > .espn_api.pid
    sleep 0.5
    if ps -p $ESPN_PID >/dev/null 2>&1; then
        echo -e "${GREEN}✅ ESPN API server started (PID: $ESPN_PID)${NC}"
        print_espn_access_info
        echo -e "${BLUE}Logs:${NC} tail -f espn-api.log"
    else
        echo -e "${RED}❌ Failed to start ESPN API server. Check espn-api.log for details.${NC}"
        exit 1
    fi
}

start_api_foreground() {
    ensure_pyespn
    echo -e "${YELLOW}🏈 Starting ESPN API server...${NC}"
    (
        npm run api:espn 2>&1 | tee espn-api.log
    ) &
    ESPN_PID=$!
    echo $ESPN_PID > .espn_api.pid
    sleep 0.5
    if ps -p $ESPN_PID >/dev/null 2>&1; then
        print_espn_access_info
        echo -e "${BLUE}ESPN API logs are streaming to this terminal and mirrored to espn-api.log${NC}"
    else
        echo -e "${RED}❌ Failed to start ESPN API server. Check espn-api.log for details.${NC}"
        exit 1
    fi
}

start_frontend() {
    if [[ "$RUN_FRONTEND" = false ]]; then
        return
    fi
    if [[ "$BACKGROUND" = true ]]; then
        start_frontend_background
    else
        start_frontend_foreground
    fi
}

start_api() {
    if [[ "$RUN_API" = false ]]; then
        return
    fi
    if [[ "$BACKGROUND" = true ]]; then
        start_api_background
    else
        start_api_foreground
    fi
}

stop_services() {
    stop_pid_file ".dev_server.pid" "frontend dev server"
    stop_pid_file ".espn_api.pid" "ESPN API server"
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "espn-api-server" 2>/dev/null || true
    pkill -9 -f "api:espn" 2>/dev/null || true
    rm -f dev.log espn-api.log
}

interactive_mode() {
    echo -e "${BLUE}=== Interactive Server Selection ===${NC}"
    echo "1) Frontend only"
    echo "2) ESPN API only"
    echo "3) Both Frontend and ESPN API"
    echo "4) Exit"

    read -rp "Select an option [1-4]: " choice

    case $choice in
        1)
            RUN_FRONTEND=true
            RUN_API=false
            ;;
        2)
            RUN_FRONTEND=false
            RUN_API=true
            ;;
        3)
            RUN_FRONTEND=true
            RUN_API=true
            ;;
        4)
            echo -e "${YELLOW}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please select 1-4.${NC}"
            interactive_mode
            return
            ;;
    esac

    if [[ "$RUN_API" = true ]]; then
        start_api
    fi

    if [[ "$RUN_FRONTEND" = true ]]; then
        if [[ "$BACKGROUND" = true ]]; then
            start_frontend_background
        else
            start_frontend_foreground
        fi
    fi

    if [[ "$BACKGROUND" = false && "$RUN_FRONTEND" = true ]]; then
        echo -e "${YELLOW}Press Ctrl+C to stop the dev server${NC}"
        wait
    fi
}

# --- Argument parsing ---
if [[ ${1:-} == "stop" ]]; then
    stop_services
    clean_ports
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
        --frontend-only)
            RUN_FRONTEND=true
            RUN_API=false
            shift
            ;;
        --api-only)
            RUN_FRONTEND=false
            RUN_API=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option:${NC} $1"
            usage
            exit 1
            ;;
    esac
done

if [[ "$NOCLEAN" = false ]]; then
    clean_ports
    if [[ "$FULLCLEAN" = true ]]; then
        echo -e "${YELLOW}🔥 Full clean requested...${NC}"
        clear_caches
        check_dependencies
    else
        check_dependencies
    fi
else
    echo -e "${YELLOW}⚠️  Skipping cleanup as requested (--no-clean).${NC}"
    check_dependencies
fi

if [[ "$INTERACTIVE" = true ]]; then
    interactive_mode
    exit 0
fi

if [[ "$RUN_API" = true ]]; then
    start_api
fi

if [[ "$RUN_FRONTEND" = true ]]; then
    if [[ "$BACKGROUND" = true ]]; then
        start_frontend_background
        echo -e "${YELLOW}✅ Services started in background. Use './dev.sh stop' to terminate.${NC}"
    else
        start_frontend_foreground
    fi
else
    echo -e "${YELLOW}No services requested. Use --frontend-only or --api-only to specify targets.${NC}"
fi
