# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

This project uses multiple build systems. Use any one of the following:

**npm scripts (recommended for simplicity):**
```bash
npm run build          # Build production ZIP
npm run build:dev      # Build development ZIP (includes example.html)
npm run clean          # Clean build directories
npm run test           # Run tests
npm run version        # Show current version
```

**Shell script (no dependencies required):**
```bash
./build.sh build       # Build production ZIP
./build.sh build-dev   # Build development ZIP
./build.sh test        # Run tests
./build.sh clean       # Clean build directories
./build.sh version     # Show current version
```

**Version management:**
```bash
./build.sh update-version 1.2.0    # Update version in all files
./build.sh release 1.2.0           # Create complete release with version bump
```

## Architecture Overview

This is a **WordPress plugin** that displays KBBCO basketball games and scores with a modern, responsive interface.

### Core Components

**Main Plugin (kbbco-games.php:17-359):**
- `KBBCOGamesPlugin` class handles WordPress integration
- Fetches data from VBL API (Vlaamse Basketball Liga)
- Provides `[kbbco_games]` shortcode and WordPress widget
- Implements AJAX endpoints for dynamic data loading
- Uses WordPress transients for 15-minute API response caching

**Frontend JavaScript (assets/kbbco-games.js:1-438):**
- `KBBCOGames` class manages UI interactions
- Week-based navigation system for games
- AJAX-powered game data loading with error handling
- Responsive game card rendering with team-specific styling
- Dutch language localization for dates/months

**Styling (assets/kbbco-games.css:1-599):**
- Modern card-based design with gradients
- Team-level color coding (U8-U21, Seniors)
- Responsive design with mobile optimizations
- Accessibility features (high contrast, reduced motion support)

### Team Organization System

The plugin includes a comprehensive team mapping system:
- **Youth teams:** U8 through U21 with A/B/C/D subdivisions
- **Senior teams:** ONE, TWO, THREE (mapped from HSE A/B/C)
- **Color coding:** Each age group has distinct gradient colors
- **Links:** Teams link to corresponding pages on kbbco.be

### API Integration

- **Source:** VBL API at `https://vblcb.wisseq.eu/VBLCB_WebService/data/OrgMatchesByGuid?issguid=BVBL1075`
- **Caching:** WordPress transients with 15-minute expiration
- **Processing:** Games grouped by week, with Dutch date formatting and team name normalization

### File Structure

```
kbbco-games.php          # Main plugin file (WordPress integration)
assets/
├── kbbco-games.css      # Complete styling with responsive design
└── kbbco-games.js       # Frontend functionality and AJAX handling
README.md                # Comprehensive user documentation
BUILD.md                 # Build system documentation
build.sh                 # Shell build script
package.json             # npm build configuration
example.html             # Standalone test page (dev builds only)
```

### WordPress Integration

- **Shortcode:** `[kbbco_games show_weeks="4" theme="default"]`
- **Widget:** Available in WordPress admin for widget areas
- **AJAX endpoints:** `get_games_data` for dynamic loading
- **Hooks:** Activation/deactivation cleanup of cached data

### Development Notes

- Plugin follows WordPress coding standards and security practices
- All user inputs are sanitized and escaped
- AJAX requests use WordPress nonces for security
- Error handling includes graceful fallbacks and retry functionality
- Responsive design tested across all major browsers and devices