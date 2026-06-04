---
name: "macOS Command Scripts"
description: "Use when: writing shell scripts, build commands, or system automation for macOS. Ensures native optimization and proper path handling."
applyTo: "scripts/**/*.sh"
---

# macOS-Native Scripting Best Practices

## Shell Commands
- Use `zsh` shebang: `#!/bin/zsh`
- Leverage macOS-specific tools: `security`, `xcrun`, `plutil`, `tccutil`
- Avoid GNU utils; use BSD equivalents (install via Homebrew if needed)

```bash
#!/bin/zsh

# ✓ Good: Use $HOME, proper quoting
CACHE_DIR="${HOME}/.cache/myapp"
mkdir -p "${CACHE_DIR}"

# ✗ Avoid: Hardcoded paths, unquoted variables
CACHE_DIR=/Users/john/.cache/myapp
ls $CACHE_DIR
```

## Environment Setup
```bash
# Load user environment
if [[ -f "${HOME}/.zshenv" ]]; then
  source "${HOME}/.zshenv"
fi

# Check macOS version
MACOS_VERSION=$(sw_vers -productVersion)
MAJOR=$(echo "$MACOS_VERSION" | cut -d. -f1)

if [[ $MAJOR -lt 12 ]]; then
  echo "Requires macOS 12 or later"
  exit 1
fi
```

## Homebrew Dependency Management
Create `Brewfile` for reproducible environments:
```ruby
# Brewfile
tap "homebrew/cask"

brew "node"
brew "postgresql@15"
brew "redis"

cask "visual-studio-code"
cask "docker"
```

Install dependencies:
```bash
brew bundle install
```

## Process Management with launchd
Create `.plist` for background daemons:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mycompany.myapp.worker</string>
    <key>ProgramArguments</key>
    <array>
        <string>${HOME}/.local/bin/worker.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/myapp.log</string>
</dict>
</plist>
```

Install & load:
```bash
cp com.mycompany.myapp.worker.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mycompany.myapp.worker.plist
```

## Build Commands
- Use native `clang` for C/C++; no GCC unless necessary
- Leverage Xcode build system: `xcodebuild` with scheme specifications
- Cache build artifacts in `${HOME}/.cache` or Xcode's DerivedData

## Error Handling
```bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

trap 'echo "Script failed at line $LINENO"' ERR

# Check command availability
if ! command -v python3 &> /dev/null; then
  echo "Error: python3 not found"
  exit 1
fi
```

---
