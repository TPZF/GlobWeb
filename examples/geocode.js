require(['../src/GlobWeb'], function(GlobWeb) {

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

// Initialize go to
var goTo = document.getElementById('goToButton');
goTo.onclick = onGoToClicked;

// Initialize webgl
globe = new GlobWeb.Globe({ canvas: 'GlobWebCanvas'});
nav = new GlobWeb.Navigation(globe);

var blueMarbleLayer = new GlobWeb.WMSLayer({ baseUrl: "http://demonstrator.telespazio.com/wmspub", layers: "BlueMarble,esat" });
globe.setBaseImagery( blueMarbleLayer );

//var osmLayer = new GlobWeb.OSMLayer( {baseUrl:"http://tile.openstreetmap.org"} );
//globe.setBaseImagery( osmLayer );

});

