# KBBCO Basketball Games WordPress Plugin

A modern, responsive WordPress plugin for displaying basketball games and scores for KBBCO teams with a professional interface.

## Features

✨ **Modern Design**
- Clean, card-based layout with smooth animations
- Responsive design that works on all devices
- Professional gradient backgrounds and hover effects
- Color-coded team levels for easy identification

🏀 **Game Display**
- Real-time game data from VBL API
- Week-by-week navigation
- Home/away game distinction
- Live scores when available
- Cup games highlighted with badges

⚡ **Performance**
- AJAX-powered data loading
- Cached API responses (15 minutes)
- Smooth transitions and animations
- Error handling and retry functionality

## Installation

### Upload to WordPress

1. **Copy the plugin folder** to your WordPress plugins directory:
   ```
   /wp-content/plugins/kbbco-games/
   ```

2. **File Structure** should be:
   ```
   /wp-content/plugins/kbbco-games/
   ├── kbbco-games.php
   ├── assets/
   │   ├── kbbco-games.css
   │   └── kbbco-games.js
   └── README.md
   ```

3. **Activate Plugin**
   - Go to WordPress Admin → Plugins
   - Find "KBBCO Basketball Games"
   - Click "Activate"

### Alternative: ZIP Installation

1. Create a ZIP file of the entire `kbbco-games` folder
2. In WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload the ZIP file and activate

## Usage

### Basic Shortcode

Display the games widget anywhere on your site:

```php
[kbbco_games]
```

### Advanced Options

```php
[kbbco_games show_weeks="6" theme="default"]
```

**Parameters:**
- `show_weeks`: Number of weeks to load (default: 4)
- `theme`: Display theme - "default" (default: "default")

### Template Integration

Add directly to your theme templates:

```php
<?php
if (function_exists('do_shortcode')) {
    echo do_shortcode('[kbbco_games]');
}
?>
```

### Widget Areas

The plugin can be used in any widget area that supports shortcodes.

## Team Configuration

The plugin includes mappings for all KBBCO teams:

### Youth Teams
- **U18 A/B** (J18 A/B) - Red gradient
- **U16 A/B** (J16 A/B) - Orange gradient  
- **U14 A/B** (G14 A/B) - Green gradient
- **U12 A/B/C** (G12 A/B/C) - Blue gradient
- **U10 A/B/C/D** (G10 A/B/C/D) - Teal gradient
- **U8 A/B** (G08 A/B) - Dark gradient

### Senior Teams
- **ONE** (HSE A) - Dark red gradient
- **TWO** (HSE B) - Dark red gradient
- **THREE** (HSE C) - Dark red gradient

### Youth Categories
- **U21 A/B** (J21 A/B) - Purple gradient

## API Integration

The plugin fetches data from the VBL (Vlaamse Basketball Liga) API:
- **Endpoint**: `https://vblcb.wisseq.eu/VBLCB_WebService/data/OrgMatchesByGuid?issguid=BVBL1075`
- **Format**: JSON
- **Caching**: WordPress transients (15 minutes)
- **Error Handling**: Graceful fallbacks and retry functionality

## Customization

### Override Styles

Add custom CSS to your theme's `style.css` or Additional CSS:

```css
/* Custom team colors */
.kbbco-games-widget .team-level.seniors {
    background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

/* Custom header styling */
.kbbco-games-header {
    background: linear-gradient(135deg, #your-brand-color, #secondary-color);
}
```

### Modify Team Links

Edit the `$team_mapping` array in `kbbco-games.php`:

```php
'HSE A' => array(
    'display' => 'ONE',
    'link' => 'your-custom-link',
    'color' => '#your-color'
)
```

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility Features

- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Reduced motion support for users with vestibular disorders
- Proper ARIA labels and semantic HTML

## Performance Optimization

### Recommendations

1. **Enable WordPress Caching**
   ```php
   // Add to wp-config.php
   define('WP_CACHE', true);
   ```

2. **Use a CDN** for faster asset loading

3. **Optimize Images** if you add custom graphics

### Caching Details

- API responses cached for 15 minutes using WordPress transients
- Automatic cleanup of expired data
- Manual cache clearing on plugin activation/deactivation

## Troubleshooting

### Common Issues

**"Games Not Loading"**
- Check if VBL API is accessible
- Verify internet connection
- Clear cache: deactivate and reactivate plugin
- Check browser console for JavaScript errors

**"Styling Issues"**
- Check for theme CSS conflicts
- Ensure plugin CSS is loading (check page source)
- Test with a default WordPress theme

**"Mobile Display Problems"**
- Verify viewport meta tag in theme header
- Test responsive breakpoints
- Check for JavaScript errors on mobile

### Debug Mode

Enable WordPress debug mode in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Check `/wp-content/debug.log` for errors.

## Security

- ✅ All AJAX requests use WordPress nonces
- ✅ Input sanitization and validation
- ✅ Secure API communication
- ✅ No direct file access allowed
- ✅ XSS protection with proper escaping

## Version History

### Version 1.0.0 (Current)
- Initial release
- Modern responsive design
- VBL API integration
- Week navigation
- Team-specific styling
- Mobile optimization
- Accessibility features
- Performance optimization

## Support

For issues or questions:

1. **Check the troubleshooting section** above
2. **Test with default theme** and other plugins disabled
3. **Check browser console** for JavaScript errors
4. **Enable WordPress debug mode** and check logs
5. **Document steps to reproduce** any issues

## License

GPL v2 or later - same as WordPress

## Credits

- **Developed for**: KBBCO (Koninklijke Basketball Club Oostkamp)
- **API Provider**: Vlaamse Basketball Liga (VBL)
- **Icons**: Custom SVG icons
- **Fonts**: System font stack for optimal performance

---

**Plugin URI**: https://kbbco.be  
**Author**: KBBCO Development Team  
**Version**: 1.0.0