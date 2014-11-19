define( function() {

var PolygonCutter = {};

	
var _lineIntersection = function( p1, p2, p3, p4 )
{
	var x1 = p1[0];
	var x2 = p2[0];
	var x3 = p3[0];
	var x4 = p4[0];
	
	var y1 = p1[1];
	var y2 = p2[1];
	var y3 = p3[1];
	var y4 = p4[1];
	
	var det = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
	if ( det == 0 )
	{
		var dist = _pointLineDistance(p1,p2,p3);
		if ( dist == 0 )
		{
			return [ 0, 0 ];
		}
		else
		{
			return [ -1, -1 ];
		}
	}
	
	var ua = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
	var ub = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

	ua /= det;
	ub /= det;
	
	return [ ua, ub ];
}

var _pointLineDistance = function( p, a , b )
{
	var ba0 = b[0] - a[0];
	var ba1 = b[1] - a[1];
	var abLength = Math.sqrt( ba0 * ba0 + ba1 * ba1 );
	return ((p[0] - a[0]) * ba1 - (p[1] - a[1]) * ba0) / abLength;
}

PolygonCutter.cutMulti = function( polygons, pointSet, a, b )
{
	var result = {
		insidePolygons: [],
		outsidePolygons: []
	};
	for ( var i = 0; i < polygons.length; i++ )
	{
		PolygonCutter.cut( polygons[i], pointSet, a, b, result );
	}
	return result;
}

PolygonCutter.cut = function( polygon, pointSet, a, b, result )
{
	if (!result)
	{
		result = {
			insidePolygons: [],
			outsidePolygons: []
		};
	}
	
	var EPS = 1e-24;
	if ( polygon.length < 4 )
	{
		return result;
	}
		
	// Find all intersection between the line (a,b) and edges of polygon	
	var polygonWithIntersections = [];
	var intersections = [];
	
	for ( var i = 0; i < polygon.length - 1; i++ )
	{
		var p1 = pointSet.points[ polygon[i] ];
		var p2 = pointSet.points[ polygon[i+1] ];
		
		polygonWithIntersections.push( polygon[i] );
		
		var t = _lineIntersection( a, b, p1, p2 );
		if ( t[1] > EPS && t[1] < 1.0 - EPS )
		{
			var newPoint = [ (1.0 - t[0]) * a[0] + t[0] * b[0], (1.0 - t[0]) * a[1] + t[0] * b[1] ];
			var index = pointSet.addPoint( newPoint );
			polygonWithIntersections.push( index );
			
			intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
		} 
		else if ( Math.abs(t[1]) < EPS )
		{
			// The vertex is on the cut line
			// Try to detect if the polygon vertex just 'touch' the cut line without traversing it
			var p0 = pointSet.points[ polygon[ i == 0 ? polygon.length - 2 : i-1 ] ];
			var dist1 = _pointLineDistance(p0,a,b);
			var dist2 = _pointLineDistance(p2,a,b);
			if ( dist1 * dist2 <= 0 ) {
				intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
			}
		}
	}
		
	// Sort intersections
	if ( intersections.length > 0 )
	{
		intersections.sort( function(a,b) { return a.t - b.t; } );
	}
	//intersections.length = intersections.length & (~1);
	if ( intersections.length & 1 ) {
		console.log('error!');
		intersections.length = intersections.length & (~1);
	}
		
	// Build cross
	var intersectionMap = new Array( polygonWithIntersections.length );
	for ( var i = 0; i < intersections.length; i+= 2 )
	{
		intersections[i].crossIndex = intersections[i+1].index;
		intersections[i+1].crossIndex = intersections[i].index;
		
		intersectionMap[ intersections[i].index ] = intersections[i];
		intersectionMap[ intersections[i+1].index ] = intersections[i+1];
	}
	
	var startIndex = 0;
	var firstPoint = pointSet.points[ polygonWithIntersections[0] ];
	var dist = _pointLineDistance(firstPoint,a,b);
	while ( Math.abs(dist) < EPS)
	{
		startIndex++;
		firstPoint = pointSet.points[ polygonWithIntersections[startIndex] ];
		dist = _pointLineDistance(firstPoint,a,b);
	}
	
	// Builds outputPolygons	
	var currentPolygons;
	var otherPolygons;
	if ( dist > 0 )
	{
		currentPolygons = result.insidePolygons;
		otherPolygons = result.outsidePolygons; 
	}
	else
	{
		currentPolygons = result.outsidePolygons;
		otherPolygons = result.insidePolygons; 
	}
	
	// Create a polygon and add it to the list
	var currentPolygon = [];
	currentPolygons.push( currentPolygon );
	
	for ( var i = 0; i < polygonWithIntersections.length; i++ )
	{
		var n = (i+startIndex) % polygonWithIntersections.length;
		var index = polygonWithIntersections[ n  ];
		currentPolygon.push( index );
		
		var intersection = intersectionMap[ n ];
		if ( intersection )
		{
			// Swap polygons 
			var temp = currentPolygons;
			currentPolygons = otherPolygons;
			otherPolygons = temp;
			
			var crossIntersection = intersectionMap[intersection.crossIndex];
			if ( !crossIntersection.polygon )
			{
				crossIntersection.polygon = currentPolygon;
			}
				
			if ( !intersection.polygon )
			{				
				// Create a new polygon
				var newPolygon = [];
				currentPolygons.push( newPolygon );
				
				intersection.polygon = newPolygon;
				
				currentPolygon = newPolygon;
			}
			else
			{
				currentPolygon = intersection.polygon;
			}
			
			currentPolygon.push( index );
		}
	}
	
	// Close all polygons
	for ( var i = 0; i < result.outsidePolygons.length; i++ )
	{
		var poly = result.outsidePolygons[i];
		var lp = pointSet.points[ poly[ poly.length - 1 ] ];
		var fp = pointSet.points[ poly[0] ];
		if ( fp[0] != lp[0] || fp[1] != lp[1] ) {
			poly.push( poly[0] );
		}
	}
	for ( var i = 0; i < result.insidePolygons.length; i++ )
	{
		var poly = result.insidePolygons[i];
		var lp = pointSet.points[ poly[ poly.length - 1 ] ];
		var fp = pointSet.points[ poly[0] ];
		if ( fp[0] != lp[0] || fp[1] != lp[1] ) {
			poly.push( poly[0] );
		}
	}
	
	return result;
}


return PolygonCutter;

});
