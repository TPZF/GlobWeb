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
 
define( ["./Globe", "./GeoBound",
		"./WMSLayer", "./WMTSLayer", "./WCSElevationLayer", "./OSMLayer", "./BingLayer", "./VectorLayer", "./AtmosphereLayer", "./GroundOverlayLayer", "./TileWireframeLayer", // Layers
		"./AitoffCoordinateSystem", "./MercatorCoordinateSystem", "./PlateCoordinateSystem", "./AugustCoordinateSystem", "./MollweideCoordinateSystem", // CoordinateSystems
		"./Navigation", "./FlatNavigation", "./FeatureStyle", "./Stats", "./KMLParser", "./PathAnimation", "./Numeric", "./SegmentedAnimation", // Others
		"./PointRenderer", "./LineStringRenderable", "./PolygonRenderer", "./LineRenderer" ], // Renderers
	function(Globe, GeoBound, WMSLayer, WMTSLayer, WCSElevationLayer, OSMLayer, BingLayer, VectorLayer, AtmosphereLayer, GroundOverlayLayer, TileWireframeLayer,
			AitoffCoordinateSystem, MercatorCoordinateSystem, PlateCoordinateSystem, AugustCoordinateSystem, MollweideCoordinateSystem,
		 	Navigation, FlatNavigation, FeatureStyle, Stats, KMLParser, PathAnimation, Numeric, SegmentedAnimation,
		  	PointRenderer) {

// Declare GlobWeb 
var GlobWeb = {};

GlobWeb.Globe = Globe;
GlobWeb.GeoBound = GeoBound;
GlobWeb.WMSLayer = WMSLayer;
GlobWeb.WMTSLayer = WMTSLayer;
GlobWeb.WCSElevationLayer = WCSElevationLayer;
GlobWeb.OSMLayer = OSMLayer;
GlobWeb.BingLayer = BingLayer;
GlobWeb.VectorLayer = VectorLayer;
GlobWeb.TileWireframeLayer = TileWireframeLayer;
GlobWeb.FeatureStyle = FeatureStyle;
GlobWeb.AtmosphereLayer = AtmosphereLayer;
GlobWeb.GroundOverlayLayer = GroundOverlayLayer;
GlobWeb.Navigation = Navigation;
GlobWeb.FlatNavigation = FlatNavigation;
GlobWeb.Stats = Stats;
GlobWeb.KMLParser = KMLParser;
GlobWeb.Numeric = Numeric;
GlobWeb.PathAnimation = PathAnimation;
GlobWeb.SegmentedAnimation = SegmentedAnimation;

GlobWeb.MercatorCoordinateSystem = MercatorCoordinateSystem
GlobWeb.PlateCoordinateSystem = PlateCoordinateSystem
GlobWeb.AugustCoordinateSystem = AugustCoordinateSystem;
GlobWeb.MollweideCoordinateSystem = MollweideCoordinateSystem;
GlobWeb.AitoffCoordinateSystem = AitoffCoordinateSystem;

window.GlobWeb = GlobWeb;

return GlobWeb;

});
