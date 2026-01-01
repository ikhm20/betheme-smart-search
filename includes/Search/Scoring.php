<?php
/**
 * Search scoring (skeleton).
 *
 * Responsible for rank/score calculations.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_Scoring {
    public function rank_products($products, $query, $tokens_lc = array(), $options = array()) {
        if (empty($products) || !is_array($products)) {
            return array();
        }

        $query = is_string($query) ? trim($query) : '';
        $tokens_lc = is_array($tokens_lc) ? $tokens_lc : array();
        $options = is_array($options) ? $options : array();

        $needle_code = BeThemeSmartSearch_Search_Normalize::normalize_code($query);
        $query_lc = BeThemeSmartSearch_Search_Normalize::to_lc($query);

        $phrase_boost = isset($options['phrase_boost']) ? (int) $options['phrase_boost'] : 30;
        $exact_sku_boost = isset($options['exact_sku_boost']) ? (int) $options['exact_sku_boost'] : 120;
        $out_of_stock_penalty = isset($options['out_of_stock_penalty']) ? (int) $options['out_of_stock_penalty'] : 15;

        $sku_prefix_boost = max(0, $exact_sku_boost - 40);
        $sku_contains_boost = max(0, $exact_sku_boost - 70);

        $score_product = function ($p) use ($tokens_lc, $needle_code, $query_lc, $phrase_boost, $exact_sku_boost, $sku_prefix_boost, $sku_contains_boost, $out_of_stock_penalty) {
            $score = 0;

            $title = isset($p['title']) ? (string) $p['title'] : '';
            $title_lc = $title !== '' ? BeThemeSmartSearch_Search_Normalize::to_lc($title) : '';

            $sku = isset($p['sku']) ? (string) $p['sku'] : '';
            $sku_code = BeThemeSmartSearch_Search_Normalize::normalize_code($sku);

            $tax_terms = isset($p['tax_terms']) && is_array($p['tax_terms']) ? $p['tax_terms'] : array();
            $tax_terms_lc = array();
            $tax_matched = 0;
            $tax_token_total = 0;
            if (!empty($tax_terms)) {
                foreach ($tax_terms as $term) {
                    $term = is_string($term) ? trim($term) : '';
                    if ($term === '') {
                        continue;
                    }
                    $tax_terms_lc[] = BeThemeSmartSearch_Search_Normalize::to_lc($term);
                }
            }

            if ($needle_code !== '' && $sku_code !== '') {
                if ($sku_code === $needle_code) {
                    $score += $exact_sku_boost;
                } elseif (strpos($sku_code, $needle_code) === 0) {
                    $score += $sku_prefix_boost;
                } elseif (strpos($sku_code, $needle_code) !== false) {
                    $score += $sku_contains_boost;
                }
            }

            if ($title_lc !== '' && $query_lc !== '') {
                if (BeThemeSmartSearch_Search_Normalize::contains_ci($title_lc, $query_lc)) {
                    $score += $phrase_boost;
                }
                if ($title_lc === $query_lc) {
                    $score += 60;
                } elseif (strpos($title_lc, $query_lc) === 0) {
                    $score += 40;
                } elseif (BeThemeSmartSearch_Search_Normalize::contains_ci($title_lc, $query_lc)) {
                    $score += 30;
                }
            }

            $token_total = 0;
            $matched = 0;
            $precomputed = isset($p['token_hits'], $p['token_total']);
            if ($precomputed) {
                $matched = max(0, (int) $p['token_hits']);
                $token_total = max(0, (int) $p['token_total']);

                if ($token_total > 0 && $matched > 0) {
                    $score += $matched * 12;
                    if ($matched === $token_total) {
                        $score += 80;
                    }
                }
            } elseif (!empty($tokens_lc) && $title_lc !== '') {
                foreach ($tokens_lc as $t) {
                    if ($t === '') {
                        continue;
                    }
                    $token_total++;
                    if (BeThemeSmartSearch_Search_Normalize::contains_ci($title_lc, $t)) {
                        $matched++;
                        $score += 12;
                    }
                }

                if ($token_total > 0 && $matched > 0 && $matched === $token_total) {
                    $score += 80;
                }
            }

            if (!$precomputed && !empty($tokens_lc) && !empty($tax_terms_lc)) {
                foreach ($tokens_lc as $t) {
                    if ($t === '' || BeThemeSmartSearch_Search_Normalize::length($t) < 3) {
                        continue;
                    }
                    $tax_token_total++;
                    foreach ($tax_terms_lc as $term_lc) {
                        if ($term_lc !== '' && BeThemeSmartSearch_Search_Normalize::contains_ci($term_lc, $t)) {
                            $tax_matched++;
                            $score += 6;
                            break;
                        }
                    }
                }

                if ($tax_token_total > 0 && $tax_matched > 0 && $tax_matched === $tax_token_total) {
                    $score += 20;
                }
            }

            if ($token_total > 0 && $matched > 0 && $tax_matched > 0) {
                $covered = min($token_total, ($matched + $tax_matched));
                if ($covered === $token_total) {
                    $score += 25;
                }
            }

            if (!empty($p['in_stock'])) {
                $score += 6;
            } else {
                $score -= $out_of_stock_penalty;
            }

            return $score;
        };

        usort($products, function ($a, $b) use ($score_product) {
            $sa = $score_product($a);
            $sb = $score_product($b);
            if ($sa === $sb) {
                return strcasecmp((string) ($a['title'] ?? ''), (string) ($b['title'] ?? ''));
            }
            return $sb <=> $sa;
        });

        return $products;
    }
}
