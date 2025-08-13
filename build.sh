#!/bin/bash

# KBBCO Games Plugin Build Script
# Alternative to Taskfile for systems without Task installed

set -e  # Exit on error

PLUGIN_NAME="kbbco-games"
VERSION=$(grep -E "Version:" kbbco-games.php | sed 's/.*Version: *\([0-9.]*\).*/\1/' | tr -d ' ')
BUILD_DIR="build"
DIST_DIR="dist"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to show usage
show_help() {
    echo "KBBCO Games Plugin Build Script"
    echo ""
    echo "Usage: ./build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build              Build production ZIP"
    echo "  build-dev          Build development ZIP (includes example.html)"
    echo "  clean              Clean build directories"
    echo "  version            Show current version"
    echo "  update-version X   Update version to X (e.g., 1.2.0)"
    echo "  test               Run basic tests"
    echo "  release X          Create release with version X"
    echo "  help               Show this help"
    echo ""
}

# Function to clean directories
clean() {
    print_info "Cleaning build directories..."
    rm -rf "$BUILD_DIR"
    rm -rf "$DIST_DIR"
    print_status "Cleaned build directories"
}

# Function to show version
show_version() {
    echo "Current version: $VERSION"
}

# Function to update version
update_version() {
    local new_version="$1"
    
    if [ -z "$new_version" ]; then
        print_error "Please specify a version number"
        echo "Usage: ./build.sh update-version 1.2.0"
        exit 1
    fi
    
    print_info "Updating version from $VERSION to $new_version..."
    
    # Update version in main PHP file
    sed -i.bak "s/Version: [0-9.]*/Version: $new_version/" kbbco-games.php
    sed -i.bak "s/private \$version = '[0-9.]*'/private \$version = '$new_version'/" kbbco-games.php
    rm kbbco-games.php.bak
    
    # Update version in README
    sed -i.bak "s/Version: [0-9.]*/Version: $new_version/" README.md
    sed -i.bak "s/\*\*Version:\*\* [0-9.]*/\*\*Version:\*\* $new_version/" README.md
    rm README.md.bak
    
    # Update VERSION variable for this session
    VERSION="$new_version"
    
    print_status "Updated version to $new_version"
}

# Function to check file structure
check_files() {
    print_info "Checking file structure..."
    
    local missing_files=()
    
    [ ! -f "kbbco-games.php" ] && missing_files+=("kbbco-games.php")
    [ ! -f "README.md" ] && missing_files+=("README.md")
    [ ! -f "assets/kbbco-games.css" ] && missing_files+=("assets/kbbco-games.css")
    [ ! -f "assets/kbbco-games.js" ] && missing_files+=("assets/kbbco-games.js")
    [ ! -f "example.html" ] && missing_files+=("example.html")
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_error "Missing files:"
        printf '%s\n' "${missing_files[@]}"
        exit 1
    fi
    
    print_status "File structure OK"
}

# Function to check PHP syntax
check_php() {
    print_info "Checking PHP syntax..."
    if command -v php >/dev/null 2>&1; then
        php -l kbbco-games.php > /dev/null
        print_status "PHP syntax OK"
    else
        print_warning "PHP not found, skipping syntax check"
    fi
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    check_files
    check_php
    print_status "All tests passed"
}

# Function to prepare build directory
prepare_build() {
    local include_dev_files="$1"
    
    print_info "Preparing build directory..."
    
    # Create directories
    mkdir -p "$BUILD_DIR/$PLUGIN_NAME"
    mkdir -p "$DIST_DIR"
    
    # Copy README first
    cp README.md "$BUILD_DIR/$PLUGIN_NAME/"
    
    # Copy assets with timestamp
    mkdir -p "$BUILD_DIR/$PLUGIN_NAME/assets"
    
    # Generate timestamp for cache busting
    CSS_TIMESTAMP=$(stat -f "%m" assets/kbbco-games.css 2>/dev/null || stat -c "%Y" assets/kbbco-games.css 2>/dev/null)
    JS_TIMESTAMP=$(stat -f "%m" assets/kbbco-games.js 2>/dev/null || stat -c "%Y" assets/kbbco-games.js 2>/dev/null)
    
    # Copy files with timestamped names
    cp assets/kbbco-games.css "$BUILD_DIR/$PLUGIN_NAME/assets/kbbco-games.$CSS_TIMESTAMP.css"
    cp assets/kbbco-games.js "$BUILD_DIR/$PLUGIN_NAME/assets/kbbco-games.$JS_TIMESTAMP.js"
    
    # Copy and update PHP file with timestamped asset references
    cp kbbco-games.php "$BUILD_DIR/$PLUGIN_NAME/"
    sed -i.bak "s|assets/kbbco-games\.css|assets/kbbco-games.$CSS_TIMESTAMP.css|g" "$BUILD_DIR/$PLUGIN_NAME/kbbco-games.php"
    sed -i.bak "s|assets/kbbco-games\.js|assets/kbbco-games.$JS_TIMESTAMP.js|g" "$BUILD_DIR/$PLUGIN_NAME/kbbco-games.php"
    rm "$BUILD_DIR/$PLUGIN_NAME/kbbco-games.php.bak"
    
    # Copy development files if requested
    if [ "$include_dev_files" = "true" ]; then
        cp example.html "$BUILD_DIR/$PLUGIN_NAME/"
        print_info "Including development files"
    fi
    
    # Create plugin info file
    cat > "$BUILD_DIR/$PLUGIN_NAME/PLUGIN-INFO.txt" << EOF
KBBCO Basketball Games WordPress Plugin
Version: $VERSION
Built: $(date '+%Y-%m-%d %H:%M:%S')

Installation:
1. Upload this folder to /wp-content/plugins/
2. Activate in WordPress Admin → Plugins
3. Use shortcode [kbbco_games] in pages/posts

Documentation: See README.md
Test Page: Open example.html in browser (dev build only)
EOF

    print_status "Build directory prepared"
}

# Function to create ZIP
create_zip() {
    local zip_suffix="$1"
    local zip_name="$PLUGIN_NAME-v$VERSION$zip_suffix.zip"
    
    print_info "Creating ZIP: $zip_name..."
    
    cd "$BUILD_DIR"
    zip -r "../$DIST_DIR/$zip_name" "$PLUGIN_NAME/" > /dev/null
    cd ..
    
    print_status "Created $DIST_DIR/$zip_name"
}

# Function to build production version
build_production() {
    print_info "Building production version..."
    clean
    run_tests
    prepare_build false
    create_zip ""
    rm -rf "$BUILD_DIR"
    print_status "Production build complete: $DIST_DIR/$PLUGIN_NAME-v$VERSION.zip"
}

# Function to build development version
build_development() {
    print_info "Building development version..."
    clean
    run_tests
    prepare_build true
    create_zip "-dev"
    rm -rf "$BUILD_DIR"
    print_status "Development build complete: $DIST_DIR/$PLUGIN_NAME-v$VERSION-dev.zip"
}

# Function to create release
create_release() {
    local new_version="$1"
    
    if [ -z "$new_version" ]; then
        print_error "Please specify a version number"
        echo "Usage: ./build.sh release 1.2.0"
        exit 1
    fi
    
    print_info "Creating release v$new_version..."
    
    update_version "$new_version"
    run_tests
    build_production
    
    # Create release notes
    cat > "$DIST_DIR/RELEASE-NOTES-v$new_version.md" << EOF
# KBBCO Games Plugin Release v$new_version

**Release Date:** $(date '+%Y-%m-%d')
**Plugin Version:** $new_version

## Installation

1. Download \`$PLUGIN_NAME-v$new_version.zip\`
2. Upload to WordPress via Plugins → Add New → Upload Plugin
3. Activate the plugin
4. Use shortcode \`[kbbco_games]\` anywhere on your site

## Files Included

- Main plugin file with WordPress integration
- Modern responsive CSS styles
- JavaScript functionality with AJAX loading
- Complete documentation

## System Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Active internet connection (for VBL API)

## Support

For issues or questions, refer to the README.md file included in the plugin.
EOF

    print_status "Release v$new_version created successfully"
    print_info "Files created:"
    echo "  - $DIST_DIR/$PLUGIN_NAME-v$new_version.zip"
    echo "  - $DIST_DIR/RELEASE-NOTES-v$new_version.md"
}

# Main script logic
case "${1:-}" in
    "build")
        build_production
        ;;
    "build-dev")
        build_development
        ;;
    "clean")
        clean
        ;;
    "version")
        show_version
        ;;
    "update-version")
        update_version "$2"
        ;;
    "test")
        run_tests
        ;;
    "release")
        create_release "$2"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac