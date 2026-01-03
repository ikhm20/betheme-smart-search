<?php
/**
 * Query variants and synonym expansion.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_Variants {
    /**
     * Build a small set of query variants to improve matching (SKU separators, keyboard layout, translit, synonyms).
     */
    public static function build($term, $options = null) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }

        $variants = array($term);
        $options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();

        if (!empty($options['enable_synonyms'])) {
            $synonyms_map = self::parse_synonyms_rules(isset($options['synonyms_rules']) ? $options['synonyms_rules'] : '');
            if (!empty($synonyms_map)) {
                $variants = array_merge($variants, self::expand_synonyms_variants($term, $synonyms_map, 12));
            }
        }

        $code = BeThemeSmartSearch_Search_Normalize::normalize_code($term);
        if ($code && $code !== $term) {
            $variants[] = $code;
        }

        $digits = BeThemeSmartSearch_Search_Normalize::normalize_barcode_digits($term);
        if ($digits && $digits !== $term && $digits !== $code) {
            $variants[] = $digits;
        }

        $swapped = BeThemeSmartSearch_Search_Normalize::swap_keyboard_layout($term);
        if ($swapped && $swapped !== $term) {
            $variants[] = $swapped;
        }

        if (BeThemeSmartSearch_Search_Normalize::contains_cyrillic($term)) {
            $tr = BeThemeSmartSearch_Search_Normalize::translit_ru_to_en($term);
            if ($tr && $tr !== $term) {
                $variants[] = $tr;
            }
        }

        $variants = array_values(array_unique(array_filter($variants)));
        return array_slice($variants, 0, 8);
    }

    /**
     * Parse synonyms rules from textarea. Format (one per line):
     * - `from=to1,to2`
     * - `from => to1, to2`
     */
    public static function parse_synonyms_rules($raw) {
        $raw = is_string($raw) ? trim($raw) : '';
        if ($raw === '') {
            return array();
        }

        $lines = preg_split("/\\r\\n|\\n|\\r/", $raw);
        $map = array();

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }

            $line = str_replace('=>', '=', $line);
            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $from = trim($parts[0]);
            $to = trim($parts[1]);
            if ($from === '' || $to === '') {
                continue;
            }

            $targets = preg_split('/\\s*,\\s*/', $to, -1, PREG_SPLIT_NO_EMPTY);
            if (empty($targets)) {
                continue;
            }

            $from_norm = BeThemeSmartSearch_Search_Normalize::to_lc($from);
            foreach ($targets as $t) {
                $t = trim($t);
                if ($t === '') {
                    continue;
                }
                $map[$from_norm][] = $t;
            }
        }

        foreach ($map as $k => $vals) {
            $vals = array_values(array_unique(array_filter($vals)));
            if (!empty($vals)) {
                $map[$k] = $vals;
            } else {
                unset($map[$k]);
            }
        }

        return $map;
    }

    private static function expand_synonyms_variants($term, $synonyms_map, $limit) {
        $limit = max(1, min(50, (int) $limit));
        if (!is_string($term) || $term === '' || !is_array($synonyms_map) || empty($synonyms_map)) {
            return array();
        }

        $tokens = BeThemeSmartSearch_Search_Normalize::tokenize($term);
        if (empty($tokens)) {
            return array();
        }

        $expanded = array();
        $positions = array();

        foreach ($tokens as $i => $tok) {
            $key = BeThemeSmartSearch_Search_Normalize::to_lc($tok);
            if (isset($synonyms_map[$key])) {
                $positions[] = $i;
            }
        }

        $positions = array_slice($positions, 0, 2);
        if (empty($positions)) {
            return array();
        }

        $queue = array($tokens);
        foreach ($positions as $pos) {
            $next = array();
            foreach ($queue as $tok_list) {
                $orig = $tok_list[$pos];
                $key = BeThemeSmartSearch_Search_Normalize::to_lc($orig);
                $alts = isset($synonyms_map[$key]) ? $synonyms_map[$key] : array();
                foreach ($alts as $alt) {
                    $copy = $tok_list;
                    $copy[$pos] = $alt;
                    $next[] = $copy;
                    if (count($next) >= $limit) {
                        break 2;
                    }
                }
            }
            $queue = array_merge($queue, $next);
            if (count($queue) > $limit) {
                $queue = array_slice($queue, 0, $limit);
            }
        }

        foreach ($queue as $tok_list) {
            $v = trim(implode(' ', $tok_list));
            if ($v !== '' && $v !== $term) {
                $expanded[] = $v;
            }
        }

        return array_slice(array_values(array_unique($expanded)), 0, $limit);
    }
}
