# Build System Documentation

The KBBCO Games plugin includes three different build systems to accommodate different development preferences and environments.

## Option 1: Task (Recommended)

If you have [Task](https://taskfile.dev/) installed:

### Installation
```bash
# macOS
brew install go-task/tap/go-task

# or install via Go
go install github.com/go-task/task/v3/cmd/task@latest
```

### Usage
```bash
# Show available tasks
task

# Build production ZIP
task build

# Build development ZIP (includes example.html)
task build-dev

# Show current version
task version

# Update version and create release
task release VERSION=1.1.0

# Run tests
task test

# Clean build directories
task clean
```

## Option 2: Shell Script (No dependencies)

Use the included shell script (works on macOS, Linux, WSL):

```bash
# Show available commands
./build.sh help

# Build production ZIP
./build.sh build

# Build development ZIP
./build.sh build-dev

# Show current version  
./build.sh version

# Update version
./build.sh update-version 1.1.0

# Create release
./build.sh release 1.1.0

# Run tests
./build.sh test

# Clean build directories
./build.sh clean
```

## Option 3: npm Scripts (Node.js)

If you prefer npm/yarn workflow:

```bash
# Install (optional - no dependencies required)
npm install

# Build production ZIP
npm run build

# Build development ZIP
npm run build:dev

# Show version
npm run version

# Run tests
npm run test

# Clean
npm run clean
```

## Build Outputs

### Production Build (`task build` or `./build.sh build`)
Creates: `dist/kbbco-games-v{VERSION}.zip`

**Contains:**
- `kbbco-games.php` - Main plugin file
- `README.md` - Documentation  
- `assets/kbbco-games.css` - Styles
- `assets/kbbco-games.js` - JavaScript
- `PLUGIN-INFO.txt` - Installation instructions

### Development Build (`task build-dev` or `./build.sh build-dev`)
Creates: `dist/kbbco-games-v{VERSION}-dev.zip`

**Contains:** Everything from production build plus:
- `example.html` - Test/demo page

## Version Management

### Current Version
```bash
# Show current version from plugin file
task version
# or
./build.sh version
```

### Update Version
```bash
# Update version in all files
task update-version VERSION=1.2.0
# or  
./build.sh update-version 1.2.0
```

**Updates version in:**
- `kbbco-games.php` (plugin header and class property)
- `README.md` (documentation)
- `package.json` (npm package file)

### Create Release
```bash
# Update version, test, build, and create release notes
task release VERSION=1.2.0
# or
./build.sh release 1.2.0
```

**Creates:**
- `dist/kbbco-games-v1.2.0.zip` - Production build
- `dist/RELEASE-NOTES-v1.2.0.md` - Release documentation

## Testing

### Available Tests
- **File structure check** - Ensures all required files exist
- **PHP syntax check** - Validates PHP code (requires PHP CLI)
- **CSS validation** - Checks CSS syntax (requires csslint)
- **JavaScript validation** - Validates JS code (requires jshint)

### Run Tests
```bash
task test
# or
./build.sh test
```

## Local WordPress Installation

### Set Environment Variable
```bash
export WORDPRESS_PATH="/path/to/your/wordpress"
```

### Install Plugin
```bash
# Builds and installs to local WordPress
task install
```

## File Structure

```
kbbco-plugin/
├── kbbco-games.php          # Main plugin file
├── assets/
│   ├── kbbco-games.css      # Styles  
│   └── kbbco-games.js       # JavaScript
├── README.md                # Documentation
├── example.html             # Test/demo page
├── Taskfile.yml             # Task configuration
├── build.sh                 # Shell build script
├── package.json             # npm configuration
├── .gitignore              # Git ignore rules
└── BUILD.md                 # This file
```

### Build Directories (Created during build)
```
build/                       # Temporary build files
dist/                        # Final ZIP files
├── kbbco-games-v1.0.0.zip
├── kbbco-games-v1.0.0-dev.zip
└── RELEASE-NOTES-v1.0.0.md
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build Plugin
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Task
        uses: arduino/setup-task@v1
      - name: Run tests
        run: task test
      - name: Build plugin
        run: task build
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: kbbco-games-plugin
          path: dist/*.zip
```

## Tips

1. **Version Numbers**: Use semantic versioning (1.0.0, 1.1.0, 1.1.1)
2. **Clean Builds**: Always run `task clean` or `./build.sh clean` when switching between versions
3. **Testing**: Run `task test` before creating releases
4. **Development**: Use `task build-dev` to include test files
5. **Production**: Use `task build` for WordPress.org submissions

## Troubleshooting

### "Version not found" Error
- Ensure `kbbco-games.php` contains proper version header
- Check grep/sed are available on your system

### "PHP syntax error" 
- Install PHP CLI: `brew install php` (macOS) or `apt install php-cli` (Ubuntu)
- Or ignore with warning message

### "ZIP command not found"
- Install zip utility: Most systems have it by default
- macOS: `brew install zip`
- Ubuntu: `apt install zip`

### Permission Issues
- Make build script executable: `chmod +x build.sh`
- Ensure write permissions in project directory