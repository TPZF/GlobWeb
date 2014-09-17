requirejs.config({
	paths: {
		gw: '../../src'
	}
});

require(['gw/Globe','gw/WMSLayer', 'gw/TouchNavigationHandler',
	'gw/Navigation','gw/Stats'], 
	function(Globe,WMSLayer,TouchNavigationHandler,Navigation,Stats) {

var globe = null;
var nav = null;
var pathAnimation = null;
var geocoder = null;
var previousFrameNumber = 0;
var imageries = {};
var activeImagery = null;
var elevations = {};
var activeElevation = null;

		var cvs = document.getElementById("GlobWebCanvas");
		cvs.width = window.innerWidth;
		cvs.height = window.innerHeight;
		
		var sizeElt = document.getElementById("size");
		sizeElt.innerHTML = "Canvas SIze : " + cvs.width + "x" + cvs.height;
			
		globe = new Globe( { canvas: cvs, 
				continuousRendering: true } );
				
		new Stats(globe.renderContext,{element: 'fps', verbose: true});

		nav = new Navigation(globe, {
			handlers: [ new TouchNavigationHandler() ]
		});
			
		var blueMarbleLayer = new WMSLayer({ baseUrl: "http://demonstrator.telespazio.com/wmspub", layers: "BlueMarble" });
		globe.setBaseImagery( blueMarbleLayer );


});




