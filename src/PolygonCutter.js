define( function() {

var PolygonCutter = function(pointSet)
{
	this.pointSet = pointSet;
	this.insidePolygons = [];
	this.outsidePolygons = [];
}

PolygonCutter.prototype.reset = function()
{
	this.insidePolygons = [];
	this.outsidePolygons = [];
}
	
PolygonCutter.prototype._lineIntersection = function( p1, p2, p3, p4 )
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
		var dist = this._pointLineDistance(p1,p2,p3);
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

PolygonCutter.prototype._pointLineDistance = function( p, a , b )
{
	var ba0 = b[0] - a[0];
	var ba1 = b[1] - a[1];
	var abLength = Math.sqrt( ba0 * ba0 + ba1 * ba1 );
	return ((p[0] - a[0]) * ba1 - (p[1] - a[1]) * ba0) / abLength;
}

PolygonCutter.prototype.cutMulti = function( polygons, a, b )
{
	this.reset();
	for ( var i = 0; i < polygons.length; i++ )
	{
		this._cut( polygons[i], a, b );
	}
}

PolygonCutter.prototype.cut = function( polygon, a, b )
{
	this.reset();
	this._cut( polygon, a, b );
}

PolygonCutter.prototype._cut = function( polygon, a, b )
{
	var EPS = 1e-10;
	if ( polygon.length < 3 )
	{
		return;
	}
		
	// Find all intersection between the line (a,b) and edges of polygon	
	var polygonWithIntersections = [];
	var intersections = [];
	
	for ( var i = 0; i < polygon.length - 1; i++ )
	{
		var p1 = this.pointSet.points[ polygon[i] ];
		var p2 = this.pointSet.points[ polygon[i+1] ];
		
		polygonWithIntersections.push( polygon[i] );
		
		var t = this._lineIntersection( a, b, p1, p2 );
		if ( t[1] > EPS && t[1] < 1.0 - EPS )
		{
			var newPoint = [ (1.0 - t[0]) * a[0] + t[0] * b[0], (1.0 - t[0]) * a[1] + t[0] * b[1] ];
			var index = this.pointSet.addPoint( newPoint );
			polygonWithIntersections.push( index );
			
			intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
		} 
		else if ( Math.abs(t[1]) < EPS )
		{
			// The vertex is on the cut line
			// Try to detect if the polygon vertex just 'touch' the cut line without traversing it
			var p0 = this.pointSet.points[ polygon[ i == 0 ? polygon.length - 2 : i-1 ] ];
			var dist1 = this._pointLineDistance(p0,a,b);
			var dist2 = this._pointLineDistance(p2,a,b);
			if ( dist1 * dist2 <= 0 ) {
				intersections.push( { index: polygonWithIntersections.length-1, t: t[0], crossIndex: -1, polygon: null } );
			}
		}
	}
		
	// Sort intersections
	if ( intersections.length > 0 )
	{
		intersections.sort( function(a,b) { return a.t < b.t; } );
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
	var firstPoint = this.pointSet.points[ polygonWithIntersections[0] ];
	var dist = this._pointLineDistance(firstPoint,a,b);
	while ( Math.abs(dist) < EPS)
	{
		startIndex++;
		firstPoint = this.pointSet.points[ polygonWithIntersections[startIndex] ];
		dist = this._pointLineDistance(firstPoint,a,b);
	}
	
	// Builds outputPolygons
	var currentPolygons;
	var otherPolygons;
	if ( dist > 0 )
	{
		currentPolygons = this.insidePolygons;
		otherPolygons = this.outsidePolygons; 
	}
	else
	{
		currentPolygons = this.outsidePolygons;
		otherPolygons = this.insidePolygons; 
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
	for ( var i = 0; i < this.outsidePolygons.length; i++ )
	{
		var poly = this.outsidePolygons[i];
		var lp = this.pointSet.points[ poly[ poly.length - 1 ] ];
		var fp = this.pointSet.points[ poly[0] ];
		if ( fp[0] != lp[0] || fp[1] != lp[1] ) {
			poly.push( poly[0] );
		}
	}
	for ( var i = 0; i < this.insidePolygons.length; i++ )
	{
		var poly = this.insidePolygons[i];
		var lp = this.pointSet.points[ poly[ poly.length - 1 ] ];
		var fp = this.pointSet.points[ poly[0] ];
		if ( fp[0] != lp[0] || fp[1] != lp[1] ) {
			poly.push( poly[0] );
		}
	}
}

return PolygonCutter;

});
