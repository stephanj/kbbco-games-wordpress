<?php
/**
 * Plugin Name: KBBCO Basketball Games
 * Plugin URI: https://kbbco.be
 * Description: Display basketball games and scores for KBBCO teams with a modern, responsive interface
 * Version: 1.0.3
 * Author: Stephan Janssen
 * License: GPL v2 or later
 * Text Domain: kbbco-games
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KBBCOGamesPlugin {
    
    private $api_url = 'https://vblcb.wisseq.eu/VBLCB_WebService/data/OrgMatchesByGuid?issguid=BVBL1075';
    private $version = '1.0.3';
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('kbbco_games', array($this, 'display_games'));
        add_action('wp_ajax_get_games_data', array($this, 'ajax_get_games_data'));
        add_action('wp_ajax_nopriv_get_games_data', array($this, 'ajax_get_games_data'));
        
        // Add activation hook
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Register widget
        add_action('widgets_init', array($this, 'register_widget'));
    }
    
    public function init() {
        // Plugin initialization
        load_plugin_textdomain('kbbco-games', false, dirname(plugin_basename(__FILE__)) . '/languages/');
    }
    
    public function register_widget() {
        register_widget('KBBCO_Games_Widget');
    }
    
    public function activate() {
        // Clear any existing cache on activation
        delete_transient('kbbco_games_data');
    }
    
    public function deactivate() {
        // Clean up on deactivation
        delete_transient('kbbco_games_data');
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('kbbco-games-js', plugin_dir_url(__FILE__) . 'assets/kbbco-games.js', array('jquery'), $this->version, true);
        wp_enqueue_style('kbbco-games-css', plugin_dir_url(__FILE__) . 'assets/kbbco-games.css', array(), $this->version);
        
        // Localize script for AJAX
        wp_localize_script('kbbco-games-js', 'kbbco_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('kbbco_games_nonce')
        ));
    }
    
    public function display_games($atts) {
        $atts = shortcode_atts(array(
            'show_weeks' => 4,
            'theme' => 'default'
        ), $atts);
        
        ob_start();
        ?>
        <div id="kbbco-games-container" class="kbbco-games-widget" data-theme="<?php echo esc_attr($atts['theme']); ?>">
            <div class="kbbco-games-header">
                <div class="week-navigation">
                    <button class="nav-btn prev-btn" onclick="kbbcoGames.prevWeek()" aria-label="Vorige week">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    <button class="nav-btn next-btn" onclick="kbbcoGames.nextWeek()" aria-label="Volgende week">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                </div>
                <h3 id="week-title" class="week-title">Wedstrijden van deze week</h3>
            </div>
            
            <div id="games-content" class="games-content">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Wedstrijden laden...</p>
                </div>
            </div>
            
            <div id="error-message" class="error-message" style="display: none;">
                <p>Er is een fout opgetreden bij het laden van de wedstrijden.</p>
                <button onclick="kbbcoGames.loadGames()" class="retry-btn">Opnieuw proberen</button>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function ajax_get_games_data() {
        check_ajax_referer('kbbco_games_nonce', 'nonce');
        
        // Try to get cached data first
        $cached_games = get_transient('kbbco_games_data');
        if ($cached_games !== false) {
            wp_send_json_success($cached_games);
            return;
        }
        
        $games = $this->fetch_games_data();
        
        if ($games === false) {
            wp_send_json_error('Unable to fetch games data');
            return;
        }
        
        $processed_games = $this->process_games_data($games);
        
        // Cache the processed data for 15 minutes
        set_transient('kbbco_games_data', $processed_games, 15 * MINUTE_IN_SECONDS);
        
        wp_send_json_success($processed_games);
    }
    
    private function fetch_games_data() {
        $response = wp_remote_get($this->api_url, array(
            'timeout' => 15,
            'sslverify' => false,
            'headers' => array(
                'User-Agent' => 'KBBCO-WordPress-Plugin/1.0.0'
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('KBBCO Games API Error: ' . $response->get_error_message());
            return false;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            error_log('KBBCO Games API HTTP Error: ' . $response_code);
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $games = json_decode($body, true);
        
        if (empty($games) || !is_array($games)) {
            error_log('KBBCO Games: Empty or invalid response from API');
            return false;
        }
        
        return $games;
    }
    
    private function process_games_data($games) {
        $dutch_months = array(
            1 => "januari", 2 => "februari", 3 => "maart", 4 => "april",
            5 => "mei", 6 => "juni", 7 => "juli", 8 => "augustus",
            9 => "september", 10 => "oktober", 11 => "november", 12 => "december"
        );
        
        $dutch_days = array(
            1 => "Maandag", 2 => "Dinsdag", 3 => "Woensdag", 
            4 => "Donderdag", 5 => "Vrijdag", 6 => "Zaterdag", 7 => "Zondag"
        );
        
        // Team mapping for cleaner display
        $team_mapping = array(
            'J18 B' => array('display' => 'U18 B', 'link' => 'ploegen/u18-kadetten/b', 'color' => '#e74c3c'),
            'J18 A' => array('display' => 'U18 A', 'link' => 'ploegen/u18-kadetten/a', 'color' => '#e74c3c'),
            'G12 A' => array('display' => 'U12 A', 'link' => 'ploegen/u12-benjamins/a', 'color' => '#3498db'),
            'G12 B' => array('display' => 'U12 B', 'link' => 'ploegen/u12-benjamins/b', 'color' => '#3498db'),
            'G12 C' => array('display' => 'U12 C', 'link' => 'ploegen/u12-benjamins/c', 'color' => '#3498db'),
            'J16 A' => array('display' => 'U16 A', 'link' => 'ploegen/u16-miniemen/a', 'color' => '#f39c12'),
            'J16 B' => array('display' => 'U16 B', 'link' => 'ploegen/u16-miniemen/b', 'color' => '#f39c12'),
            'J21 A' => array('display' => 'U21 A', 'link' => 'ploegen/u21-junioren/a', 'color' => '#9b59b6'),
            'J21 B' => array('display' => 'U21 B', 'link' => 'ploegen/u21-junioren/b', 'color' => '#9b59b6'),
            'G14 A' => array('display' => 'G14 A', 'link' => 'ploegen/u14-pupillen/a', 'color' => '#2ecc71'),
            'G14 B' => array('display' => 'G14 B', 'link' => 'ploegen/u14-pupillen/b', 'color' => '#2ecc71'),
            'G10 A' => array('display' => 'U10 A', 'link' => 'ploegen/u10-microben/a', 'color' => '#1abc9c'),
            'G10 B' => array('display' => 'U10 B', 'link' => 'ploegen/u10-microben/b', 'color' => '#1abc9c'),
            'G10 C' => array('display' => 'U10 C', 'link' => 'ploegen/u10-microben/c', 'color' => '#1abc9c'),
            'G10 D' => array('display' => 'U10 D', 'link' => 'ploegen/u10-microben/d', 'color' => '#1abc9c'),
            'G08 A' => array('display' => 'G08 A', 'link' => 'ploegen/u8-premicroben/a', 'color' => '#34495e'),
            'G08 B' => array('display' => 'G08 B', 'link' => 'ploegen/u8-premicroben/b', 'color' => '#34495e'),
            'HSE A' => array('display' => 'ONE', 'link' => 'ploegen/seniors/one', 'color' => '#c0392b'),
            'HSE B' => array('display' => 'TWO', 'link' => 'ploegen/seniors/two', 'color' => '#c0392b'),
            'HSE C' => array('display' => 'THREE', 'link' => 'ploegen/seniors/three', 'color' => '#c0392b')
        );
        
        // Sort games by date
        usort($games, function($a, $b) {
            return $a['jsDTCode'] - $b['jsDTCode'];
        });
        
        $processed_games = array();
        
        foreach ($games as $game) {
            $game_date = strtotime($game['datumString']);
            if ($game_date === false) continue;
            
            $dt = new DateTime(date('Y-m-d', $game_date));
            $week_number = (int) $dt->format("W");
            
            // Determine our team
            $our_team_name = '';
            $opponent_name = '';
            $is_home = false;
            
            if (strpos($game['tTNaam'], 'Oostkamp') !== false) {
                $our_team_name = $game['tTNaam'];
                $opponent_name = $game['tUNaam'];
                $is_home = true;
            } else {
                $our_team_name = $game['tUNaam'];
                $opponent_name = $game['tTNaam'];
                $is_home = false;
            }
            
            // Extract team level
            $team_info = $this->extract_team_info($our_team_name, $team_mapping);
            
            // Format date
            $day_of_week = date("N", $game_date);
            $formatted_date = $dutch_days[$day_of_week] . " " . 
                             date("j", $game_date) . " " . 
                             $dutch_months[date("n", $game_date)];
            
            // Parse score if available
            $score_home = '';
            $score_away = '';
            if (!empty($game['uitslag'])) {
                $scores = explode("-", $game['uitslag']);
                if (count($scores) === 2) {
                    $score_home = trim($scores[0]);
                    $score_away = trim($scores[1]);
                }
            }
            
            $processed_game = array(
                'week' => $week_number,
                'date' => $formatted_date,
                'time' => $game['beginTijd'],
                'is_cup' => strpos($game['pouleNaam'], 'Beker') !== false,
                'competition' => $game['pouleNaam'],
                'team_info' => $team_info,
                'opponent' => $this->clean_team_name($opponent_name, $team_info['original_level']),
                'opponent_guid' => $is_home ? $game['tUGUID'] : $game['tTGUID'],
                'is_home' => $is_home,
                'score_home' => $score_home,
                'score_away' => $score_away,
                'has_result' => !empty($game['uitslag'])
            );
            
            if (!isset($processed_games[$week_number])) {
                $processed_games[$week_number] = array();
            }
            
            $processed_games[$week_number][] = $processed_game;
        }
        
        return $processed_games;
    }
    
    private function extract_team_info($team_name, $team_mapping) {
        foreach ($team_mapping as $level => $info) {
            if (strpos($team_name, $level) !== false) {
                return array_merge($info, array('original_level' => $level));
            }
        }
        
        return array(
            'display' => 'Unknown',
            'link' => '#',
            'color' => '#95a5a6',
            'original_level' => ''
        );
    }
    
    private function clean_team_name($team_name, $level) {
        if (!empty($level)) {
            $team_name = str_replace($level, '', $team_name);
        }
        return trim($team_name);
    }
}

// Widget class
class KBBCO_Games_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'kbbco_games_widget',
            __('KBBCO Basketball Games', 'kbbco-games'),
            array(
                'description' => __('Display KBBCO basketball games and scores', 'kbbco-games')
            )
        );
    }
    
    public function widget($args, $instance) {
        echo $args['before_widget'];
        
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        
        $show_weeks = !empty($instance['show_weeks']) ? $instance['show_weeks'] : 4;
        $theme = !empty($instance['theme']) ? $instance['theme'] : 'default';
        
        echo do_shortcode('[kbbco_games show_weeks="' . $show_weeks . '" theme="' . $theme . '"]');
        
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('KBBCO Wedstrijden', 'kbbco-games');
        $show_weeks = !empty($instance['show_weeks']) ? $instance['show_weeks'] : 4;
        $theme = !empty($instance['theme']) ? $instance['theme'] : 'default';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php _e('Title:', 'kbbco-games'); ?></label> 
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" name="<?php echo esc_attr($this->get_field_name('title')); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('show_weeks')); ?>"><?php _e('Number of weeks to show:', 'kbbco-games'); ?></label> 
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('show_weeks')); ?>" name="<?php echo esc_attr($this->get_field_name('show_weeks')); ?>" type="number" value="<?php echo esc_attr($show_weeks); ?>" min="1" max="10">
        </p>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('theme')); ?>"><?php _e('Theme:', 'kbbco-games'); ?></label>
            <select class="widefat" id="<?php echo esc_attr($this->get_field_id('theme')); ?>" name="<?php echo esc_attr($this->get_field_name('theme')); ?>">
                <option value="default" <?php selected($theme, 'default'); ?>><?php _e('Default', 'kbbco-games'); ?></option>
                <option value="compact" <?php selected($theme, 'compact'); ?>><?php _e('Compact', 'kbbco-games'); ?></option>
            </select>
        </p>
        <?php 
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        $instance['show_weeks'] = (!empty($new_instance['show_weeks'])) ? (int) $new_instance['show_weeks'] : 4;
        $instance['theme'] = (!empty($new_instance['theme'])) ? sanitize_text_field($new_instance['theme']) : 'default';
        
        return $instance;
    }
}

// Initialize the plugin
new KBBCOGamesPlugin();
