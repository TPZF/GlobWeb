var globe = null;
var geocoder = null;
var nav = null;

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
		
		nav.zoomTo( [lon, lat], 30000, 5000 );
      }
	  else
	  {
        alert("Geocoding was not successful for the following reason: " + status);
      }
	})
}


// Main function called the page is loaded
function main()
{
	// Initialize go to
	var goTo = document.getElementById('goToButton');
	goTo.onclick = onGoToClicked;

	// Initialize webgl
	globe = new GlobWeb.Globe({ canvas: 'GlobWebCanvas'});
	nav = new GlobWeb.Navigation(globe);
	nav.setupMouseEventHandlers(true);
	
	var blueMarbleLayer = new GlobWeb.WMSLayer({ baseUrl: "http://demonstrator.vegaspace.com/wmspub", layers: "BlueMarble,esat" });
	globe.setBaseImagery( blueMarbleLayer );
	var elevationLayer = new GlobWeb.BasicElevationLayer({ baseUrl:"http://demonstrator.vegaspace.com/json_elevations/get.php"});
	globe.setBaseElevation( elevationLayer );
	
	//var osmLayer = new GlobWeb.OSMLayer( {baseUrl:"http://tile.openstreetmap.org"} );
	//globe.setBaseImagery( osmLayer );
}

window.onload = main;


