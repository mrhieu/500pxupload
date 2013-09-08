<?php
/*
Simple File upload handler in PHP
Source: http://www.w3schools.com/php/php_file_upload.asp
Modified by Hieu Pham <mr_hie@yahoo.com>
*/

header('Content-type: application/json');
header('Access-Control-Allow-Origin: *');
sleep(2);// Imitate time for manipulating
echo json_encode(array('status' => 'OK'));

?>