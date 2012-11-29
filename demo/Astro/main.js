var globe = null;
var fpsElement = null;
var geoCenterCoord = null;
var culledElement = null;
var astroNavigator = null;
var constellationNameFeatureCollection = {};
var constellationShapesFeatureCollection = {};
var vectorRendererManager = null;
var constellationShapesLayer = null;
var constellationNamesLayer = null;

// **** for JS implementation ****
// // Called when a POI is clicked
// onPoiClicked = function(e)
// {
	// astroNavigator.zoomTo([parseFloat(e.currentTarget.Long), parseFloat(e.currentTarget.Lat)], 20000, 5000 );
// }

// onWindowResize = function(e)
// {
	// var canvas = document.getElementById("HEALPixCanvas");
	// canvas.width = window.innerWidth;
	// canvas.height = window.innerHeight;
// }

// // Initialize the POI into GlobWeb
// initializePoi = function(pois)
// {
	// for (var i=0; i < pois.length; i++)
	// {	
		// pois[i].name = pois[i].innerHtml;
		// pois[i].RA = pois[i].getAttribute("RA") ;
		// pois[i].Decl = pois[i].getAttribute("Decl") ;
		// pois[i].Long = pois[i].getAttribute("Long");
		// pois[i].Lat = pois[i].getAttribute("Lat");
		// // pois[i].height = parseFloat( pois[i].getAttribute("data-height") );	
		
		// // var poi = new GlobWeb.Poi(pois[i].name,pois[i].lat,pois[i].lon,pois[i].height);
		// // globe.addPoi( poi );
	// }

// }
// *******************************

/**
*	Fill the Points of Interest table
*/
function fillPOI() {
	
	var names;
	var catalogue;
	var readyCatalogue = false;
	var readyNames = false;
		
	/**
	*	Asynchronous requests to load stars database composed of:
	*		1) Names.tsv 	 : containing couples between HR and star name
	*		2) Catalogue.tsv : containing all necessary information about each star
	*/
	function loadDatabase(){
		// read names.tsv
		var req = new XMLHttpRequest();
		req.crossOrigin = '';
		if ( req.overrideMimeType ) req.overrideMimeType( "text/xml" );
		req.onreadystatechange = function() {
			if( req.readyState == 4 ) {
				if( req.status == 0 || req.status == 200 ) {
					if ( req.responseText ) {
						names = req.responseText;
						readyNames = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
							
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req.open( "GET", "Names.tsv", true );
		req.send( null );

		// read catalogue.tsv
		var req2 = new XMLHttpRequest();
		if ( req2.overrideMimeType ) req2.overrideMimeType( "text/xml" );
		req2.onreadystatechange = function() {
			if( req2.readyState == 4 ) {
				if( req2.status == 0 || req2.status == 200 ) {
					if ( req2.responseText ) {
						catalogue = req2.responseText;
						readyCatalogue = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
						
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req2.open( "GET", "Catalogue.tsv", true );
		req2.send( null );
	}
	
	/**
	*	Appends to the poiTable all known stars
	*/
	function extractDatabase(){
		// extract the table data

		var tab = names.slice(names.indexOf("897;Acamar"), names.indexOf('1231;Zaurak')+11);
		var namesTab = tab.split("\n");
		
		tab = catalogue.slice(catalogue.indexOf("001."), catalogue.indexOf("4.98;K3Ibv")+10);
		var catalogueTab = tab.split("\n");

		// var oUl = document.getElementById("poiTable");
		var poiTable = $("#poiTable");
		
		// for each known star
		for(var i=0; i<namesTab.length; i++){
			var word = namesTab[i].split(";"); // word[0] = HR, word[1] = name;
			var HR = parseInt(word[0]);
			var starName = word[1];
				
			// search corresponding HR in catalogue
			for(var j=0; j<catalogueTab.length; j++){
				word = catalogueTab[j].split(";");
				if(parseInt(word[2]) == HR){
					// star found in catalogue
					
					var raString = word[6]; // ra format : "hours minutes seconds"
					var declString = word[7]; // decl format : "degrees minutes seconds"
					
					var geo = [];
					GlobWeb.CoordinateSystem.fromEquatorialToGeo([raString, declString], geo);
					
					// append new star to the poiTable
					// *** jQuery ***
					var li = "<li class=\"poi\" RA=\""+raString+"\" Decl=\""+declString+"\" Long="+geo[0]+" Lat="+geo[1]+">"+starName+"</li>";
					// var li = $('<li class="poi">' + starName + '</li>');
					// li.attr('RA',raString);
					// li.attr('Decl',declString);
					// li.attr('Long',geo[0]);
					// li.attr('Lat',geo[1]);
					poiTable.append(li);
					
					var style = new GlobWeb.FeatureStyle();
					
					var poi = {
						geometry: {
							type: "Point",
							coordinates: [geo[0],geo[1]]
						},
						properties: {
							name: starName
						}
					};
						
					style.label = true;
					style['iconUrl'] = null;
					vectorRendererManager.addFeature(poi,style);
					
					// *** JS ***
					// var oLi = document.createElement("li");
					
					// oLi.setAttribute("RA",raString);
					// oLi.setAttribute("Decl",declString);

					// oLi.setAttribute("Long",geo[0]);
					// oLi.setAttribute("Lat",geo[1]);
					
					// var oText = document.createTextNode(starName);
					
					// oLi.appendChild(oText);
					// oUl.appendChild(oLi);
				}
			}
		}
		
		// Attach event to created li's
		$("#poiTable > li").click(function(event){
			astroNavigator.zoomTo([parseFloat($(this).attr("long")), parseFloat($(this).attr("lat"))], 20000, 5000 );
		});
		
	}
	
	loadDatabase();
}

/**
*	Load files then fill constellationShapesLayer & constellationNamesLayer
*/
function fillConstellations(){
	
	var names;
	var catalogue;
	var readyNames = false;
	var readyCatalogue = false;
	var constellations = {};
	
	/*
	*	Asynchronous request to load stars database composed of:
	*		1) Names.tsv 	 : containing correspondance between HR and star name
	*		2) Catalogue.tsv : containing all information about each star
	*/
	function loadDatabase(){
		// read names.tsv
		var req = new XMLHttpRequest();
		req.crossOrigin = '';
		if ( req.overrideMimeType ) req.overrideMimeType( "text/xml" );
		req.onreadystatechange = function() {
			if( req.readyState == 4 ) {
				if( req.status == 0 || req.status == 200 ) {
					if ( req.responseText ) {
						names = req.responseText;
						readyNames = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
						
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req.open( "GET", "ConstellationNames.tsv", true );
		req.send( null );

		// read catalogue.tsv
		var req2 = new XMLHttpRequest();
		if ( req2.overrideMimeType ) req2.overrideMimeType( "text/xml" );
		req2.onreadystatechange = function() {
			if( req2.readyState == 4 ) {
				if( req2.status == 0 || req2.status == 200 ) {
					if ( req2.responseText ) {
						catalogue = req2.responseText;
						readyCatalogue = true;
						
						if( readyNames && readyCatalogue )
							extractDatabase();
					} else {
						console.error( "HEALPixRenderer: Empty or non-existing file (" + url + ")" );
					}
				}
			}
		}
		
		req2.open( "GET", "bound_20.dat", true );
		req2.send( null );
	}
	
	/*
	*	Extract loaded database to the corresponding layers
	*/
	function extractDatabase(){
		
		var constellationNames = names.split("\n");
		var catalogueTab = catalogue.split("\n");
		
		// 
		for( var i=0; i<catalogueTab.length; i++ ){
			var word = catalogueTab[i].replace("  ", " "); // hack to replace double space by a simple one
			word = word.split(" "); // word = "RA Decl Abbreviation "I"/"O"(Inerpolated/Original(Corner))"
			var currentAbb = word[2];
			var RA = parseFloat(word[0]);
			var Decl = parseFloat(word[1]);
			var IO = word[3];
			
			// convert hours to degrees
			RA*=15;
			
			if(!constellations[ currentAbb ]){
				// find constellation name if abbreviation don't exist
				for( j=0; j<constellationNames.length; j++ ){
					var word = constellationNames[j].split(";"); // word[0] = abbreviation, word[1] = name;
					var abb = word[0];
					
					if( abb == currentAbb ){
						var name = word[1];
						constellations[ currentAbb ] = {
							coord : [],
							name : name,
							
							// values used to calculate the position of the center of constellation
							x : 0.,
							y : 0.,
							z : 0.,
							nbStars : 0
						}
						break;
					}
				}
			}
			
			// Calculate the center of constillation
			var pos3d = [];
			// need to convert to 3D because of 0h -> 24h notation
			GlobWeb.CoordinateSystem.fromGeoTo3D([RA, Decl], pos3d);
			constellations[ currentAbb ].x+=pos3d[0];
			constellations[ currentAbb ].y+=pos3d[1];
			constellations[ currentAbb ].z+=pos3d[2];
			constellations[ currentAbb ].nbStars++;
			
			constellations[ currentAbb ].coord.push(pos3d[0]);
			constellations[ currentAbb ].coord.push(pos3d[1]);
			constellations[ currentAbb ].coord.push(pos3d[2]);
		}
		
		var constellationNames = [];
		var constellationShapes = [];
		// fill constellationShapes & constellationNames
		for( var i in constellations){
			var current = constellations[i];
			
			var constellationShape = {
				geometry: {
					type: "SimpleLineCollection",
					coordinates: current.coord
				},
				properties: {
					name: current.name
				}
			};
			
			constellationShapes.push( constellationShape );
				
			// calculate mean value to show the constellation name in the center of constellation..
			// .. sometimes out of constellation's perimeter because of the awkward constellation's shape(ex. "Hydra" or "Draco" constellations)
			var geoPos = [];
			GlobWeb.CoordinateSystem.from3DToGeo([current.x/current.nbStars, current.y/current.nbStars, current.z/current.nbStars], geoPos);
			
			var constellationName = {
				geometry: {
					type: "Point",
					coordinates: [geoPos[0], geoPos[1]]
				},
				properties: {
					name: current.name,
					textColor: '#083BA8'
				}
			};			
			constellationNames.push( constellationName );
		}
		
		//
		constellationShapesFeatureCollection = {
			type: "FeatureCollection",
			features : constellationShapes
		};
		
		constellationNameFeatureCollection = {
			type: "FeatureCollection",
			features : constellationNames
		};
		
		var options = {};
		options.style = new GlobWeb.FeatureStyle();
		options.style.label = true;
		options.style.iconUrl = null;
		
		constellationShapesLayer = new GlobWeb.VectorLayer(options);
		constellationShapesLayer._attach(globe);
		constellationNamesLayer = new GlobWeb.VectorLayer(options);
		constellationNamesLayer._attach(globe);
		
		constellationShapesLayer.addFeatureCollection( constellationShapesFeatureCollection );
		constellationNamesLayer.addFeatureCollection( constellationNameFeatureCollection );

	}
	
	loadDatabase();
}

function setImageriesButtonsetLayout(){
	// make it vertical
	$(':radio, :checkbox', '#ImageriesDiv').wrap('<div style="margin: 1px"/>'); 
	$('label:first', '#ImageriesDiv').removeClass('ui-corner-left').addClass('ui-corner-top');
	$('label:last', '#ImageriesDiv').removeClass('ui-corner-right').addClass('ui-corner-bottom');
	
	// make the same width for all labels
	mw = 100; // max witdh
	$('label', '#ImageriesDiv').each(function(index){
		w = $(this).width();
		if (w > mw) mw = w; 
	});
	
	// Another way to find a max
	// mw = Math.max.apply(Math, $('label', '#ImageriesDiv').map(function(){ return $(this).width(); }).get());
	
	$('label', '#ImageriesDiv').each(function(index){
		$(this).width(mw);
	});
}

$(function()
{	
	// create accordeon
	$( "#accordion" ).accordion( { autoHeight: false, active: 0, collapsible: true } );
	
	// create Imagery button set
	$( "#ImageriesDiv" ).buttonset();
	setImageriesButtonsetLayout();
	
	var canvas = document.getElementById('HEALPixCanvas');
	
	// make fullscreen
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// JS
	// window.onresize = onWindowResize;
	
	// jQuery
	$(window).resize(function() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;	
	});
	
	// Initialize webgl
	try
	{
		globe = new GlobWeb.Globe( { canvas: "HEALPixCanvas", 
			showWireframe: false, 
			continuousRendering: true
		} );
	}
	catch (err)
	{
		document.getElementById('HEALPixCanvas').style.display = "none";
		document.getElementById('webGLNotAvailable').style.display = "block";
	}
	
	// Add stats
	var stats = new GlobWeb.Stats( globe, {element: 'fps', verbose: false} );
	
	// Initialize vector renderer manager used for stars name rendering
	vectorRendererManager = new GlobWeb.VectorRendererManager(globe);

	// Initialize navigator
	astroNavigator = new GlobWeb.AstroNavigation(globe);
	
	var cdsLayer = new GlobWeb.HEALPixLayer( { baseUrl: "/Alasky/DssColor/"} );
	globe.setBaseImagery( cdsLayer );
	
	// Event for changing imagery provider
	$("#ImageriesDiv :input").click(function(event){
		var cdsProvider;
		if( this.value == "SDSS"){
			cdsProvider = new GlobWeb.HEALPixLayer({ baseUrl: "/Alasky/SDSS/Color"});
			globe.setBaseImagery( cdsProvider );
		}
		
		if( this.value == "DSS" ){
			cdsProvider = new GlobWeb.HEALPixLayer({ baseUrl: "/Alasky/DssColor/"});
			globe.setBaseImagery( cdsProvider );
		}
	});
	
	// Event to show HEALPix wireframe grid
	$("#grid").click(function(event){
		if ($("#grid:checked").length)
		{
			globe.setOption("showWireframe", true);
		}
		else
		{
			globe.setOption("showWireframe", false);
		}
	});
	
	// Event to show constellations
	$("#constellation").click(function(event){
		
		if ($("#constellation:checked").length)
		{
			constellationShapesLayer.addFeatureCollection( constellationShapesFeatureCollection );
			constellationNamesLayer.addFeatureCollection( constellationNameFeatureCollection );
		}
		else
		{
			constellationShapesLayer.removeFeatureCollection( constellationShapesFeatureCollection );
			constellationNamesLayer.removeFeatureCollection( constellationNameFeatureCollection );
		}
	});
	
	function roundNumber(num, dec) {
		var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
		return result;
	}
	
	// Click event to show equatorial coordinates
	$("#HEALPixCanvas").click(function(event){
		if(event.ctrlKey){
			var equatorial = [];
			geo = globe.getLonLatFromPixel(event.pageX, event.pageY);		
			GlobWeb.CoordinateSystem.fromGeoToEquatorial(geo, equatorial);
			
			var wordRA = equatorial[0].split(" ");
			var wordDecl = equatorial[1].split(" ");
			$("#equatorialCoordinates").html("<em>Right ascension:</em> <br/>&nbsp&nbsp&nbsp&nbsp" + wordRA[0] +"h "+ wordRA[1] +"mn "+ roundNumber(parseFloat(wordRA[2]), 4) +"s<br /><em>Declination :</em> <br/>&nbsp&nbsp&nbsp&nbsp" + wordDecl[0] +"&#186 "+ wordDecl[1] +"' "+ roundNumber(parseFloat(wordDecl[2]), 4) +"\"");
		}
	});
	
	// Create li's from catalogue
	fillPOI();
	
	// Create constellations from catalogue
	fillConstellations();
	
	// *** JS implementation ***
	// Initialize pois in Poi menu
	// var layerDiv = document.getElementById('poiTable');
	// var pois = layerDiv.getElementsByTagName('li');
	
	// initializePoi(pois);

	
});