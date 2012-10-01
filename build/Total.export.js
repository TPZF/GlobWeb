window['GlobWeb'] = {};
window['GlobWeb']['Globe'] = GlobWeb.Globe;
window['GlobWeb']['Stats'] = GlobWeb.Stats;
window['GlobWeb']['Navigation'] = GlobWeb.Navigation;
window['GlobWeb']['AstroNavigation'] = GlobWeb.AstroNavigation;

// Layers
window['GlobWeb']['HEALPixLayer'] = GlobWeb.HEALPixLayer;
window['GlobWeb']['WMSElevationLayer'] = GlobWeb.WMSElevationLayer;
window['GlobWeb']['WCSElevationLayer'] = GlobWeb.WCSElevationLayer;
window['GlobWeb']['WMSLayer'] = GlobWeb.WMSLayer;
window['GlobWeb']['OSMLayer'] = GlobWeb.OSMLayer;
window['GlobWeb']['BingLayer'] = GlobWeb.BingLayer;
window['GlobWeb']['BasicElevationLayer'] = GlobWeb.BasicElevationLayer;
window['GlobWeb']['VectorLayer'] = GlobWeb.VectorLayer;
window['GlobWeb']['GroundOverlayLayer'] = GlobWeb.GroundOverlayLayer;
window['GlobWeb']['EquatorialGridLayer'] = GlobWeb.EquatorialGridLayer;
window['GlobWeb']['TileWireframeLayer'] = GlobWeb.TileWireframeLayer;

window['GlobWeb']['VectorLayer'].prototype.visible = GlobWeb.VectorLayer.prototype.visible;
window['GlobWeb']['TileWireframeLayer'].prototype.visible = GlobWeb.TileWireframeLayer.prototype.visible;
window['GlobWeb']['EquatorialGridLayer'].prototype.visible = GlobWeb.EquatorialGridLayer.prototype.visible;

// FeatureStyle exports
window['GlobWeb']['FeatureStyle'] = GlobWeb.FeatureStyle;

// Hack for inheritance problem
//window['GlobWeb']['a'] = GlobWeb.RasterLayer;
//window['GlobWeb']['b'] = GlobWeb.BatchVectorRenderable;

// Globe exports
GlobWeb.Globe.prototype['addLayer'] = GlobWeb.Globe.prototype.addLayer;
GlobWeb.Globe.prototype['removeLayer'] = GlobWeb.Globe.prototype.removeLayer;
GlobWeb.Globe.prototype['dispose'] = GlobWeb.Globe.prototype.dispose;
GlobWeb.Globe.prototype['getFrameNumber'] = GlobWeb.Globe.prototype.getFrameNumber;
GlobWeb.Globe.prototype['getLonLatFromPixel'] = GlobWeb.Globe.prototype.getLonLatFromPixel;
GlobWeb.Globe.prototype['getViewportGeoBound'] = GlobWeb.Globe.prototype.getViewportGeoBound;
GlobWeb.Globe.prototype['setBaseImagery'] = GlobWeb.Globe.prototype.setBaseImagery;
GlobWeb.Globe.prototype['setBaseElevation'] = GlobWeb.Globe.prototype.setBaseElevation;

// CoordinateSystem exports
window['GlobWeb']['CoordinateSystem'] = GlobWeb.CoordinateSystem;
window['GlobWeb']['CoordinateSystem']['fromEquatorialToGeo'] = GlobWeb.CoordinateSystem.fromEquatorialToGeo;
window['GlobWeb']['CoordinateSystem']['fromGeoTo3D'] = GlobWeb.CoordinateSystem.fromGeoTo3D;
window['GlobWeb']['CoordinateSystem']['from3DToGeo'] = GlobWeb.CoordinateSystem.from3DToGeo;
window['GlobWeb']['CoordinateSystem']['fromGeoToEquatorial'] = GlobWeb.CoordinateSystem.fromGeoToEquatorial;

// VectorLayer exports
GlobWeb.VectorLayer.prototype['addFeatureCollection'] = GlobWeb.VectorLayer.prototype.addFeatureCollection;
GlobWeb.VectorLayer.prototype['addFeature'] = GlobWeb.VectorLayer.prototype.addFeature;
GlobWeb.VectorLayer.prototype['modifyFeatureStyle'] = GlobWeb.VectorLayer.prototype.modifyFeatureStyle;
GlobWeb.VectorLayer.prototype['removeFeature'] = GlobWeb.VectorLayer.prototype.removeFeature;

// Navigation exports
GlobWeb.Navigation.prototype['zoomTo'] = GlobWeb.Navigation.prototype.zoomTo;
GlobWeb.Navigation.prototype['subscribe'] = GlobWeb.Navigation.prototype.subscribe;
GlobWeb.Navigation.prototype['unsubscribe'] = GlobWeb.Navigation.prototype.unsubscribe;
GlobWeb.Navigation.prototype['getFov'] = GlobWeb.Navigation.prototype.getFov;

// AstroNavigator exports
GlobWeb.AstroNavigation.prototype['zoomTo'] = GlobWeb.AstroNavigation.prototype.zoomTo;
GlobWeb.AstroNavigation.prototype['subscribe'] = GlobWeb.AstroNavigation.prototype.subscribe;
GlobWeb.AstroNavigation.prototype['unsubscribe'] = GlobWeb.AstroNavigation.prototype.unsubscribe;
GlobWeb.AstroNavigation.prototype['getFov'] = GlobWeb.AstroNavigation.prototype.getFov;

// Path animation exports
window['GlobWeb']['PathAnimation'] = GlobWeb.PathAnimation;
GlobWeb.PathAnimation.prototype['stop'] = GlobWeb.PathAnimation.prototype.stop;
GlobWeb.PathAnimation.prototype['start'] = GlobWeb.PathAnimation.prototype.start;
GlobWeb.PathAnimation.prototype['setAltitudeOffset'] = GlobWeb.PathAnimation.prototype.setAltitudeOffset;
GlobWeb.PathAnimation.prototype['setDirectionAngle'] = GlobWeb.PathAnimation.prototype.setDirectionAngle;
GlobWeb.PathAnimation.prototype['setSpeed'] = GlobWeb.PathAnimation.prototype.setSpeed;

// GeoBound exports
window['GlobWeb']['GeoBound'] = GlobWeb.GeoBound;
GlobWeb.GeoBound.prototype['getSouth'] = GlobWeb.GeoBound.prototype.getSouth;
GlobWeb.GeoBound.prototype['getNorth'] = GlobWeb.GeoBound.prototype.getNorth;
GlobWeb.GeoBound.prototype['getEast'] = GlobWeb.GeoBound.prototype.getEast;
GlobWeb.GeoBound.prototype['getWest'] = GlobWeb.GeoBound.prototype.getWest;




