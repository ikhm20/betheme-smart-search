<?php
/**
 * Timeweb cron wrapper (PHP).
 *
 * Some Timeweb Cron configurations run the selected file with PHP. If you point Cron to a `.sh`,
 * PHP will print the shell script contents (and you'll get emails). Use this file instead.
 *
 * Usage (Timeweb Cron panel):
 * - Choose file: /home/c/<user>/.../wp-content/plugins/betheme-smart-search/scripts/timeweb-cron.php
 *
 * Logs:
 * - /tmp/betheme-smart-search-cron.log
 */

declare(strict_types=1);

$logFile = '/tmp/betheme-smart-search-cron.log';
$lockDir = '/tmp/betheme-smart-search-cron.lock';

// Never output to stdout/stderr (Timeweb may email it). Everything goes to the log.
ini_set('display_errors', '0');

function bss_cron_log(string $message): void {
    $logFile = '/tmp/betheme-smart-search-cron.log';
    @file_put_contents($logFile, $message . "\n", FILE_APPEND);
}

if (!@mkdir($lockDir, 0700)) {
    // Another run is in progress.
    exit(0);
}

register_shutdown_function(static function () use ($lockDir): void {
    @rmdir($lockDir);
});

$pluginDir = realpath(__DIR__ . '/..');
if (!$pluginDir) {
    bss_cron_log('[' . date(DATE_ATOM) . '] ERROR: Cannot resolve plugin dir.');
    exit(1);
}

$updateScript = $pluginDir . '/scripts/timeweb-update.sh';
if (!is_file($updateScript)) {
    bss_cron_log('[' . date(DATE_ATOM) . '] ERROR: Missing update script: ' . $updateScript);
    exit(1);
}

bss_cron_log('-----');
bss_cron_log('[' . date(DATE_ATOM) . '] Cron run start (php)');

// Run update via bash, append output to the same log file.
$cmd = 'bash ' . escapeshellarg($updateScript) . ' >> ' . escapeshellarg($logFile) . ' 2>&1';
$exitCode = 0;
@exec($cmd, $out, $exitCode);

bss_cron_log('[' . date(DATE_ATOM) . '] Cron run end (php), exit=' . (string) $exitCode);

exit($exitCode);

