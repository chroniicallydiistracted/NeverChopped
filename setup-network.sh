#!/bin/bash

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🌐 WSL2 Network Setup for iPad Access${NC}\n"

# Get WSL IP
WSL_IP=$(ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)
echo -e "${BLUE}WSL IP:${NC} $WSL_IP"

# Get Windows IP from resolv.conf
WIN_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo -e "${BLUE}Windows Host IP (from WSL):${NC} $WIN_IP"

echo -e "\n${YELLOW}📱 For iPad Access:${NC}"
echo -e "${GREEN}You need to run this command in PowerShell (as Administrator) on Windows:${NC}\n"

cat << 'POWERSHELL'
# Run this in PowerShell as Administrator:
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=WSL_IP

# To check if it worked:
netsh interface portproxy show all

# To remove later:
# netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
POWERSHELL

# Replace WSL_IP placeholder
echo ""
echo -e "${YELLOW}Replace WSL_IP with: ${GREEN}$WSL_IP${NC}"
echo ""

echo -e "${BLUE}After running that PowerShell command, find your Windows WiFi IP:${NC}"
echo "1. Open Windows Settings"
echo "2. Go to Network & Internet > WiFi"
echo "3. Click on your WiFi network"
echo "4. Look for 'IPv4 address'"
echo ""
echo -e "Then on your iPad, go to: ${GREEN}http://[WINDOWS_WIFI_IP]:3000${NC}"

echo -e "\n${YELLOW}💡 Alternative: Use ngrok for easier access${NC}"
echo "Run: npm install -g ngrok"
echo "Then: ngrok http 3000"
echo "It will give you a public URL that works from anywhere!"
