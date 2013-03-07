/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *
 * GlobWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, version 3 of the License, or
 * (at your option) any later version.
 *
 * GlobWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GlobWeb. If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

 // Declare the AstroWeb namespace
 define( ["./Globe",
		"./VectorLayer", "./HEALPixLayer", "./OpenSearchLayer", "./TileWireframeLayer", // Layers
		"./AstroNavigation", "./FeatureStyle", "./Stats", // Others
		"./PointSpriteRenderer", "./ConvexPolygonRenderer"], // Renderers
	function(Globe, VectorLayer, HEALPixLayer, OpenSearchLayer, TileWireframeLayer, AstroNavigation, FeatureStyle, Stats) {

// Declare AstroWeb 
var AstroWeb = {};

AstroWeb.Globe = Globe;
AstroWeb.VectorLayer = VectorLayer;
AstroWeb.HEALPixLayer = HEALPixLayer;
AstroWeb.OpenSearchLayer = OpenSearchLayer;
AstroWeb.TileWireframeLayer = TileWireframeLayer;
AstroWeb.AstroNavigation = AstroNavigation;
AstroWeb.FeatureStyle = FeatureStyle;
AstroWeb.Stats = Stats;

window.AstroWeb = AstroWeb;

return AstroWeb;

});