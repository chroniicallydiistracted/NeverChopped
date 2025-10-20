# 🚀 dev.sh Quick Reference Card

## Common Commands

```bash
# Standard startup (auto-checks dependencies)
./dev.sh

# Fresh build (clears caches + reinstalls)
./dev.sh --full-clean

# Background mode
./dev.sh --background

# Stop background server
./dev.sh stop

# Help
./dev.sh --help
```

---

## When to Use What

| Situation | Command |
|-----------|---------|
| **Normal development** | `./dev.sh` |
| **After git pull** | `./dev.sh` (auto-detects changes) |
| **Weird cache issues** | `./dev.sh --full-clean` |
| **TypeScript errors** | `./dev.sh --full-clean` |
| **Package.json changed** | `./dev.sh` (auto-detects) |
| **First time setup** | `./dev.sh` (auto-installs) |
| **Run in background** | `./dev.sh --background` |
| **Production testing** | `./dev.sh --full-clean` |

---

## What Gets Cleaned

### Normal Mode (`./dev.sh`)
- ✅ Ports 3000-3010
- ✅ npm/vite processes
- ✅ Auto-check/update dependencies

### Full Clean Mode (`./dev.sh --full-clean`)
- ✅ Everything from normal mode
- ✅ Vite cache (`node_modules/.vite`)
- ✅ TypeScript build info (`.tsbuildinfo`)
- ✅ Dist folder (`dist/`)
- ✅ Force reinstall dependencies

---

## Auto-Dependency Detection

Script automatically runs `npm install` when:
- ❌ `node_modules` doesn't exist
- 📝 `package.json` changed
- 🔒 `package-lock.json` changed

Otherwise: ✅ Skips (fast start!)

---

## Flags Cheat Sheet

| Flag | Description |
|------|-------------|
| `-b`, `--background` | Run in background (logs to `dev.log`) |
| `-n`, `--no-clean` | Skip port cleanup |
| `-f`, `--full-clean` | ⭐ Clear all caches + reinstall |
| `-d`, `--domain` | Override tunnel domain |
| `-h`, `--help` | Show help |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Module not found" | `./dev.sh` (auto-installs) |
| Port already in use | `./dev.sh` (auto-kills) |
| Stale imports | `./dev.sh --full-clean` |
| TypeScript errors | `./dev.sh --full-clean` |
| After git pull issues | `./dev.sh --full-clean` |

---

## Access URLs

After starting:
- **Local**: http://localhost:3000
- **Network**: http://192.168.x.x:3000
- **External**: https://sleeper.westfam.media (via tunnel)

---

**Most common usage**: Just run `./dev.sh` - it handles everything! 🎯
