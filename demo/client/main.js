var globe = null;
var nav = null;
var pathAnimation = null;
var geocoder = null;
var previousFrameNumber = 0;
var imageries = {};
var activeImagery = null;
var elevations = {};
var activeElevation = null;

// Called when go to is clicked
onGoToClicked = function(e)
{
	var address = document.getElementById("address").value;
	if ( !geocoder )
	{
		geocoder = new google.maps.Geocoder();
	}
	
	geocoder.geocode( { 'address': address }, function(results, status)
	{
      if (status == google.maps.GeocoderStatus.OK)
	  {
        var lat = results[0].geometry.location.lat();
		var lon = results[0].geometry.location.lng();
		
		nav.zoomTo( [lon, lat], 20000, 1500 );
      }
	  else
	  {
        alert("Geocoding was not successful for the following reason: " + status);
      }
	})
}

// Called when an imagery is clicked
onImageryClicked = function(e)
{
	var value = e.currentTarget.value;
	activeImagery = imageries[value];
	globe.setBaseImagery( activeImagery );
}

// Called when elevation is clicked
onElevationClicked = function(e)
{
	var value = e.currentTarget.value;
	activeElevation = elevations[value];
	globe.setBaseElevation( activeElevation );
}

// Called when a POI is clicked
onPoiClicked = function(e)
{
	nav.zoomTo( [e.currentTarget.lon, e.currentTarget.lat], 20000, 1500 );
}

onWindowResize = function(e)
{
	var canvas = document.getElementById('GlobWebCanvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	globe.refresh();
}

// Initialize the POI into GlobWeb
initializePoi = function(pois)
{
	var poiLayer = new GlobWeb.VectorLayer();
	for (var i=0; i < pois.length; i++)
	{
		pois[i].lat = parseFloat( pois[i].getAttribute("data-lat") );
		pois[i].lon = parseFloat( pois[i].getAttribute("data-long") );
		pois[i].height = parseFloat( pois[i].getAttribute("data-height") );
		pois[i].name = pois[i].innerHtml;
		
		var poi = {
			geometry: {
				type: "Point",
				coordinates: [pois[i].lon,pois[i].lat,pois[i].height]
			}
		};
		//var poi = new GlobWeb.Poi(pois[i].name,pois[i].lat,pois[i].lon,pois[i].height);
		poiLayer.addFeature( poi );
	}
	globe.addLayer(poiLayer);
}

// Initialize the elevation
initializeElevation = function(value)
{
	elevations["None"] = null;
	elevations["GTOPO"] = new GlobWeb.WMSElevationLayer({ baseUrl: config.serverUrl + "/wmspub", layers: "GTOPO"});
		//new GlobWeb.BasicElevationLayer( { baseUrl: config.serverUrl + "/GlobeWeb/map.php"} );

	activeElevation = elevations[value];
	globe.setBaseElevation( activeElevation );
}

// Initialize the imagery
initializeImagery = function(value)
{
	imageries["PO"] = new GlobWeb.WMSLayer( { baseUrl: config.serverUrl + "/wmspo",  layers: "PO150m,POFrance15m,POI15m" } );
	//imageries["Landsat"] = new GlobWeb.WMSLayer( { baseUrl: config.serverUrl + "/wmspo",  layers: "PO150m,POFrance15m,POI15m" } );
	imageries["OSM"] = new GlobWeb.WMSLayer( { baseUrl: config.serverUrl + "/geocache/wms", layers: "imposm-fr", format: "image/png" } );

	activeImagery = imageries[value];
	globe.setBaseImagery( activeImagery );
}

initializePath = function()
{

	// Initialize buttons
	
	// Play button
	$( "#play" ).button({
		text: false,
		icons: {
			primary: "ui-icon-play"
		}
	})
	.click(function() {
		var options;
		if ( $( this ).text() === "play" ) {
			options = {
				label: "pause",
				icons: {
					primary: "ui-icon-pause"
				}
			};
			pathAnimation.start();
		} else {
			options = {
				label: "play",
				icons: {
					primary: "ui-icon-play"
				}
			};
			pathAnimation.pause();
		}
		$( this ).button( "option", options );
	});
	
	// Stop button
	$( "#stop" ).button({
		text: false,
		icons: {
			primary: "ui-icon-stop"
		}
	})
	.click(function() {
		pathAnimation.stop();
	});
	
	// 
	$( "#altitudeOffset" ).change( function() {
		var val = $(this).val();
		if ( val < 50 ) 
		{
			$(this).val( 50 );
			val = 50;
		}
		else if ( val > 50000 )
		{
			$(this).val( 50000 );
			val = 50000;
		}
		pathAnimation.setAltitudeOffset(val  );
	});
	$( "#verticalAngle" ).change( function() {
		pathAnimation.setDirectionAngle( $(this).val() );
	});
	$( "#speed" ).change( function() {
		var val = $(this).val();
		if ( val < 1 ) 
		{
			$(this).val( 1 );
			val = 1;
		}
		else if ( val > 50000 )
		{
			$(this).val( 50000 );
			val = 50000;
		}
		pathAnimation.setSpeed(val);
	});

	// Load path from XML
	$.ajax({
		  url: "coordonnees-geo-paris-marseille.xml",
		  success: function(doc){
			var points = doc.getElementsByTagName("point");
			var coords = [];
			for (var i = 0; i < points.length; i++)
			{
				var lon = points[i].getElementsByTagName("lon")[0];
				var lat = points[i].getElementsByTagName("lat")[0];
				coords.push( [ lon.childNodes[0].nodeValue / 1000000.0, lat.childNodes[0].nodeValue / 1000000.0 ] );
			}
			
			var pathLayer = new GlobWeb.VectorLayer();
			var feature = { type: "Feature", geometry: { type: "LineString", coordinates: coords } };
			pathLayer.addFeature( feature );
			globe.addLayer(pathLayer);
			
			pathAnimation = new GlobWeb.PathAnimation(coords,1000,undefined);
			globe.addAnimation(pathAnimation);
			
			}
	});
}


// Main function called the page is loaded
$(function()
{
	$( "#accordion" ).accordion( { autoHeight: false, collapsible: true } );
		
	// Initialize go to
	var goTo = document.getElementById('goToButton');
	goTo.onclick = onGoToClicked;
	
	// Initialize inputs in layer menu
	var imageryDiv = document.getElementById('imageryMenu');
	var inputs = imageryDiv.getElementsByTagName('input');
	for (var i=0; i < inputs.length; i++)
	{
		if ( inputs[i].name == 'imagery' )
		{
			inputs[i].onclick = onImageryClicked;
		}
	}
	var elevationDiv = document.getElementById('elevationMenu');
	var inputs = elevationDiv.getElementsByTagName('input');
	for (var i=0; i < inputs.length; i++)
	{
		if ( inputs[i].name == 'elevation' )
		{
			inputs[i].onclick = onElevationClicked;
		}
	}
	
	// Initialize pois in Poi menu
	var layerDiv = document.getElementById('poiMenu');
	var pois = layerDiv.getElementsByTagName('li');
	for (var i=0; i < pois.length; i++)
	{
		pois[i].onclick = onPoiClicked;
	}
	
	
	var canvas = document.getElementById('GlobWebCanvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	window.onresize = onWindowResize;

	// Initialize webgl
	try
	{
		globe = new GlobWeb.Globe({ canvas: 'GlobWebCanvas', 
				atmosphere: false, 
				shadersPath: config.shadersPath 
		});
	}
	catch (err)
	{
		document.getElementById('GlobWebCanvas').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
		
	nav = new GlobWeb.Navigation(globe);
	
	initializeImagery('PO');
	initializeElevation('GTOPO');
	initializePoi(pois);
	// Initialize follow path
	initializePath();

	// Init Stats
	var stats = new GlobWeb.Stats(globe,{element: "fps",verbose: false});

});


