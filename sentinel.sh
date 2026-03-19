#!/bin/sh
RELEASES_URL="https://bitcopper.tech/releases"
SENTINEL_DIR="$HOME/.bitcopper-sentinel"
LOG="$SENTINEL_DIR/sentinel.log"
BINARY="$SENTINEL_DIR/bitcopper-daemon"
IDENTITY_FILE="$SENTINEL_DIR/identity.json"
VERSION="2.0.0"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'; RED='\033[0;31m'
log()  { printf "${GREEN}[✓]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[!]${NC} %s\n" "$1"; }
err()  { printf "${RED}[✗]${NC} %s\n" "$1"; exit 1; }
info() { printf "${CYAN}[→]${NC} %s\n" "$1"; }
OS=$(uname -s); ARCH=$(uname -m); PLATFORM="linux"; BINARY_NAME="bitcopper-daemon-linux"
[ -d "/data/data/com.termux" ] || [ -n "$TERMUX_VERSION" ] && PLATFORM="android"
case "$OS" in
  Darwin) PLATFORM="macos"; case "$ARCH" in arm64) BINARY_NAME="bitcopper-daemon-mac-silicon";; *) BINARY_NAME="bitcopper-daemon-mac-intel";; esac ;;
  Linux)  case "$ARCH" in
    x86_64)        BINARY_NAME="bitcopper-daemon-linux" ;;
    aarch64|arm64) BINARY_NAME="bitcopper-daemon-android-arm64" ;;
    armv7l)        BINARY_NAME="bitcopper-daemon-android-arm32" ;;
  esac ;;
  MINGW*|MSYS*) PLATFORM="windows"; BINARY_NAME="bitcopper-daemon-windows.exe"; BINARY="$SENTINEL_DIR/bitcopper-daemon.exe" ;;
esac
mkdir -p "$SENTINEL_DIR"
[ -f "$BINARY" ] || { info "Descargando $BINARY_NAME..."; curl -fsSL "${RELEASES_URL}/${BINARY_NAME}" -o "$BINARY" && chmod +x "$BINARY" && log "Binario listo"; }
if [ ! -f "$IDENTITY_FILE" ]; then
  HW="$(hostname)$(uname -a)$(date +%s)"
  CMD="sha256sum"; command -v sha256sum >/dev/null 2>&1 || CMD="shasum -a 256"
  DID="CU-$(printf '%s' "$HW" | $CMD | cut -c1-64)"
  WAL="BTCU-$(printf '%s' "${DID}$(date +%s)" | $CMD | cut -c1-64)"
  printf '{"device_id":"%s","wallet":"%s","platform":"%s","binary":"%s","installed_at":"%s","sentinel_version":"%s"}\n' \
    "$DID" "$WAL" "$PLATFORM" "$BINARY_NAME" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$VERSION" > "$IDENTITY_FILE"
  log "Wallet: ${WAL:0:32}..."
fi
WAL=$(grep '"wallet"' "$IDENTITY_FILE" | cut -d'"' -f4)
DID=$(grep '"device_id"' "$IDENTITY_FILE" | cut -d'"' -f4)
case "$PLATFORM" in
  macos)
    PLIST="$HOME/Library/LaunchAgents/tech.bitcopper.sentinel.plist"
    printf '<?xml version="1.0"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>tech.bitcopper.sentinel</string><key>ProgramArguments</key><array><string>%s</string></array><key>EnvironmentVariables</key><dict><key>BITCOPPER_WALLET</key><string>%s</string><key>BITCOPPER_DEVICE_ID</key><string>%s</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>%s</string><key>StandardErrorPath</key><string>%s</string></dict></plist>\n' "$BINARY" "$WAL" "$DID" "$LOG" "$LOG" > "$PLIST"
    launchctl unload "$PLIST" 2>/dev/null; launchctl load "$PLIST" 2>/dev/null && log "Servicio macOS activo" || warn "Ejecuta: $BINARY" ;;
  linux|raspberry-pi|arm-linux)
    command -v systemctl >/dev/null 2>&1 && {
      sudo tee /etc/systemd/system/bitcopper-sentinel.service > /dev/null << EOF
[Unit]
Description=Bitcopper Sentinel
After=network.target
[Service]
ExecStart=${BINARY}
Restart=always
User=${USER}
Environment=BITCOPPER_WALLET=${WAL}
Environment=BITCOPPER_DEVICE_ID=${DID}
[Install]
WantedBy=multi-user.target
EOF
      sudo systemctl daemon-reload; sudo systemctl enable bitcopper-sentinel; sudo systemctl start bitcopper-sentinel
      log "Servicio systemd activo"; } || { nohup env BITCOPPER_WALLET="$WAL" BITCOPPER_DEVICE_ID="$DID" "$BINARY" > "$LOG" 2>&1 & log "Daemon iniciado (PID: $!)"; } ;;
  android) nohup env BITCOPPER_WALLET="$WAL" BITCOPPER_DEVICE_ID="$DID" "$BINARY" > "$LOG" 2>&1 & log "Android daemon iniciado (PID: $!)" ;;
esac
printf "\n${GREEN}${BOLD}Bitcopper Sentinel v%s instalado 🔥${NC}\n" "$VERSION"
printf "  Plataforma : %s\n  Wallet     : %s...\n  Log        : %s\n" "$PLATFORM" "${WAL:0:32}" "$LOG"
printf "\n${CYAN}  tail -f %s${NC}\n" "$LOG"
printf "${YELLOW}  In cuprum veritas.\n\n${NC}"
