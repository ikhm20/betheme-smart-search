<?php
/**
 * Search normalization helpers.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_Normalize {
    public static function has_mb() {
        return function_exists('mb_strtolower') && function_exists('mb_strlen') && function_exists('mb_stripos');
    }

    public static function to_lc($value) {
        $value = (string) $value;
        if (self::has_mb()) {
            return mb_strtolower($value, 'UTF-8');
        }
        return strtolower($value);
    }

    public static function length($value) {
        $value = (string) $value;
        if (self::has_mb()) {
            return mb_strlen($value, 'UTF-8');
        }
        return strlen($value);
    }

    public static function contains_ci($haystack, $needle) {
        $haystack = (string) $haystack;
        $needle = (string) $needle;
        if ($needle === '' || $haystack === '') {
            return false;
        }
        if (self::has_mb()) {
            return mb_stripos($haystack, $needle, 0, 'UTF-8') !== false;
        }
        return strpos(self::to_lc($haystack), self::to_lc($needle)) !== false;
    }

    /**
     * Determine whether a search term looks like a product code (SKU / barcode) rather than a natural-language query.
     */
    public static function is_code_like_query($query) {
        $q = is_string($query) ? trim($query) : '';
        if ($q === '') {
            return false;
        }

        if (preg_match('/\\s/u', $q)) {
            return false;
        }

        if (preg_match('/\\d/', $q)) {
            return true;
        }

        if (preg_match('/[-_]/', $q)) {
            return true;
        }

        if (preg_match('/^[A-Za-z]+$/', $q)) {
            if (self::length($q) > 4) {
                return false;
            }
            return $q === strtoupper($q);
        }

        return false;
    }

    public static function normalize_code($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        $value = preg_replace('/[\\s\\-\\x{2013}\\x{2014}_]+/u', '', $value);
        return strtoupper($value);
    }

    public static function normalize_barcode_digits($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        return preg_replace('/\\D+/', '', $value);
    }

    public static function contains_cyrillic($value) {
        return is_string($value) && preg_match('/[\\x{0401}\\x{0451}\\x{0410}-\\x{044F}]/u', $value);
    }

    public static function translit_ru_to_en($value) {
        if (!is_string($value) || $value === '') {
            return '';
        }

        $map = array(
            "\x{0430}" => 'a',  "\x{0431}" => 'b',   "\x{0432}" => 'v',  "\x{0433}" => 'g',
            "\x{0434}" => 'd',  "\x{0435}" => 'e',   "\x{0451}" => 'yo', "\x{0436}" => 'zh',
            "\x{0437}" => 'z',  "\x{0438}" => 'i',   "\x{0439}" => 'y',  "\x{043A}" => 'k',
            "\x{043B}" => 'l',  "\x{043C}" => 'm',   "\x{043D}" => 'n',  "\x{043E}" => 'o',
            "\x{043F}" => 'p',  "\x{0440}" => 'r',   "\x{0441}" => 's',  "\x{0442}" => 't',
            "\x{0443}" => 'u',  "\x{0444}" => 'f',   "\x{0445}" => 'h',  "\x{0446}" => 'ts',
            "\x{0447}" => 'ch', "\x{0448}" => 'sh',  "\x{0449}" => 'sch',"\x{044A}" => '',
            "\x{044B}" => 'y',  "\x{044C}" => '',    "\x{044D}" => 'e',  "\x{044E}" => 'yu',
            "\x{044F}" => 'ya',
        );

        $value = self::to_lc($value);
        $value = strtr($value, $map);
        return $value;
    }

    public static function swap_keyboard_layout($value) {
        if (!is_string($value) || $value === '') {
            return '';
        }

        $en = array(
            'q','w','e','r','t','y','u','i','o','p','[',']',
            'a','s','d','f','g','h','j','k','l',';','\'',
            'z','x','c','v','b','n','m',',','.',
        );
        $ru = array(
            "\x{0439}","\x{0446}","\x{0443}","\x{043A}","\x{0435}","\x{043D}","\x{0433}","\x{0448}","\x{0449}","\x{0437}","\x{0445}","\x{044A}",
            "\x{0444}","\x{044B}","\x{0432}","\x{0430}","\x{043F}","\x{0440}","\x{043E}","\x{043B}","\x{0434}","\x{0436}","\x{044D}",
            "\x{044F}","\x{0447}","\x{0441}","\x{043C}","\x{0438}","\x{0442}","\x{044C}","\x{0431}","\x{044E}",
        );

        $map_en_to_ru = array_combine($en, $ru);
        $map_ru_to_en = array_combine($ru, $en);

        $chars = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
        $out = '';

        foreach ($chars as $ch) {
            $lower = self::to_lc($ch);
            $is_upper = ($ch !== $lower);

            if (isset($map_en_to_ru[$lower])) {
                $mapped = $map_en_to_ru[$lower];
            } elseif (isset($map_ru_to_en[$lower])) {
                $mapped = $map_ru_to_en[$lower];
            } else {
                $mapped = $ch;
            }

            if ($is_upper) {
                $mapped = self::has_mb() ? mb_strtoupper($mapped, 'UTF-8') : strtoupper($mapped);
            }

            $out .= $mapped;
        }

        return $out;
    }

    public static function parse_stopwords($raw) {
        $raw = is_string($raw) ? trim($raw) : '';
        if ($raw === '') {
            return array();
        }

        $parts = preg_split('/[\\s,;]+/u', $raw, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($parts)) {
            return array();
        }

        $out = array();
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            $out[] = self::to_lc($part);
        }

        return array_values(array_unique(array_filter($out)));
    }

    public static function filter_tokens($tokens, $options = null) {
        $tokens = is_array($tokens) ? $tokens : array();
        $options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();

        $min_len = isset($options['min_token_length']) ? (int) $options['min_token_length'] : 2;
        $min_len = max(1, min(10, $min_len));

        $stopwords = isset($options['stopwords']) ? self::parse_stopwords($options['stopwords']) : array();
        $stopwords = array_fill_keys($stopwords, true);

        $filtered = array();
        foreach ($tokens as $token) {
            $token = is_string($token) ? trim($token) : '';
            if ($token === '') {
                continue;
            }

            if (self::length($token) < $min_len) {
                continue;
            }

            $token_lc = self::to_lc($token);
            if (!empty($stopwords) && isset($stopwords[$token_lc])) {
                continue;
            }

            $filtered[] = $token;
        }

        return array_values(array_unique($filtered));
    }

    public static function tokenize($value, $options = null) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return array();
        }
        $parts = preg_split('/[\\s\\-\\x{2013}\\x{2014}_]+/u', $value, -1, PREG_SPLIT_NO_EMPTY);
        $parts = is_array($parts) ? array_values(array_filter(array_map('trim', $parts))) : array();
        return self::filter_tokens($parts, $options);
    }
}
