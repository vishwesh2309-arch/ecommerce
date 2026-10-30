<?php
header('Content-Type: text/plain');

echo "PHP version: " . PHP_VERSION . PHP_EOL;
echo "PHP SAPI: " . PHP_SAPI . PHP_EOL;
echo "Loaded php.ini: " . (php_ini_loaded_file() ?: 'NONE') . PHP_EOL;
echo "Extension directory: " . ini_get('extension_dir') . PHP_EOL;
echo "fileinfo loaded: " . (extension_loaded('fileinfo') ? 'YES' : 'NO') . PHP_EOL;
echo "curl loaded: " . (extension_loaded('curl') ? 'YES' : 'NO') . PHP_EOL;
echo "\n\nUpload configuration:\n";
echo "file_uploads: " . ini_get('file_uploads') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_tmp_dir: " . (ini_get('upload_tmp_dir') ?: 'System default') . "\n";

echo "\nTemporary directory writable: ";
$tempDir = ini_get('upload_tmp_dir') ?: sys_get_temp_dir();
echo is_dir($tempDir) && is_writable($tempDir) ? 'YES' : 'NO';
echo PHP_EOL . "fileinfo-related configuration:" . PHP_EOL;
foreach (ini_get_all(null, true) as $name => $setting) {
    if (stripos($name, 'fileinfo') !== false) {
        echo $name . ' = ' . var_export($setting['local_value'], true) . PHP_EOL;
    }
}
