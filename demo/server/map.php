<?php

/* -------------------------------------------------------------------- */
/*      Load required modules                                           */
/* -------------------------------------------------------------------- */
/*if (PHP_OS == "WINNT" || PHP_OS == "WIN32")
{
    $dlext = "dll";
}
else
{
    $dlext = "so";
}

if (!extension_loaded("MapScript"))
{
    dl("php_mapscript.$dlext");
}
if (!extension_loaded("dbase"))
{
    dl("php_dbase.$dlext");
}
*/
$tmp_root = 'C:/ms4w/tmp';
$doc_root = 'C:/ms4w/apps/globweb';

// Initialize header
header('Access-Control-Allow-Origin: *');
header('Content-type: text/plain');

$map = ms_newMapObj("gwmap_wms.map");

$extent = explode(",",$_GET['extent']);
error_log("Extent requested : $extent[0],$extent[1],$extent[2],$extent[3]\n",3,"$doc_root/log");
$map->setExtent($extent[0],$extent[1],$extent[2],$extent[3]);

$size = explode(",",$_GET['size']);
$map->setSize( $size[0], $size[1] );
//error_log("$map->extent.minx,$map->extent.miny",3,"$doc_root/log");

$map->selectOutputFormat( 'asc' );
$ext = $map->extent;
error_log("Extent drawn : $ext->minx,$ext->miny,$ext->maxx,$ext->maxy\n",3,"$doc_root/log");

$img = $map->draw();

$filePath = $img->saveWebImage();
$img->saveImage("$doc_root/$filePath",$map);
$file = fopen("$tmp_root/$filePath","r");

// Skip the first 5 lines
fgets($file);
fgets($file);
fgets($file);
fgets($file);
fgets($file);

// Now convert the ASCII to JSON
$first = true;
while (($buffer = fgets($file)) !== false) 
{
	if ($first)
	{
		echo "[";
		$first = false;
	}
	else
	{
		echo ",";
	}
	echo str_replace(" ",",",trim($buffer));
}
echo "]";

fclose($file);



// Return the image directly
/*
$doc_root = 'C:/ms4w/apps/globweb';
$map->selectOutputFormat( 'jpeg' );
$map->setSize( 256, 256 );
$img = $map->draw();
header('Content-type: image/jpeg');
$img->saveImage("");
*/

//$img->saveImage("$doc_root/test.jpg");
//echo $map->numlayers;

?>