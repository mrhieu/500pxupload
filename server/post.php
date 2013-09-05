<?php
/*
Simple File upload handler in PHP
Source: http://www.w3schools.com/php/php_file_upload.asp
Modified by Hieu Pham <mr_hie@yahoo.com>
*/

header('Content-type: application/json');

$allowedExts = array("jpeg", "jpg", "png");
$temp = explode(".", $_FILES["files"]["name"]);
$extension = end($temp);
if ((($_FILES["files"]["type"] == "image/jpeg")
|| ($_FILES["files"]["type"] == "image/jpg")
|| ($_FILES["files"]["type"] == "image/png"))
&& ($_FILES["files"]["size"] < 10000000)// 10MB
&& in_array($extension, $allowedExts)) {
  if ($_FILES["files"]["error"] > 0) {
    echo json_encode(array("content" => "Error occurs", "error_code" => $_FILES["files"]["error"]));
  } else {
    if (file_exists("upload/" . $_FILES["files"]["name"])) {
      // echo $_FILES["files"]["name"] . " already exists. ";
    } else {
      move_uploaded_file($_FILES["files"]["tmp_name"],
      "upload/" . $_FILES["files"]["name"]);
      echo json_encode(array('filename' => $_FILES["files"]["name"]));
    }
  }
} else {
  echo json_encode(array("Invalid file"));
}
sleep(2);// Imitate time of manipulating
?>