window['GlobWeb'] = {};
window['GlobWeb']['Globe'] = GlobWeb.Globe;
window['GlobWeb']['Navigation'] = GlobWeb.Navigation;
window['GlobWeb']['Stats'] = GlobWeb.Stats;
window['GlobWeb']['KMLParser'] = GlobWeb.KMLParser;
window['GlobWeb']['FeatureStyle'] = GlobWeb.FeatureStyle;

// Layers
window['GlobWeb']['WMSLayer'] = GlobWeb.WMSLayer;
//window['GlobWeb']['WMSElevationLayer'] = GlobWeb.WMSElevationLayer;
window['GlobWeb']['WCSElevationLayer'] = GlobWeb.WCSElevationLayer;
window['GlobWeb']['OSMLayer'] = GlobWeb.OSMLayer;
window['GlobWeb']['BingLayer'] = GlobWeb.BingLayer;
//window['GlobWeb']['BasicElevationLayer'] = GlobWeb.BasicElevationLayer;
window['GlobWeb']['VectorLayer'] = GlobWeb.VectorLayer;
window['GlobWeb']['GroundOverlayLayer'] = GlobWeb.GroundOverlayLayer;

// Hack for inheritance problem
//window['GlobWeb']['a'] = GlobWeb.RasterLayer;
//window['GlobWeb']['b'] = GlobWeb.BatchVectorRenderable;

// Globe exports
GlobWeb.Globe.prototype['addLayer'] = GlobWeb.Globe.prototype.addLayer;
GlobWeb.Globe.prototype['removeLayer'] = GlobWeb.Globe.prototype.removeLayer;
GlobWeb.Globe.prototype['dispose'] = GlobWeb.Globe.prototype.dispose;
GlobWeb.Globe.prototype['getLonLatFromPixel'] = GlobWeb.Globe.prototype.getLonLatFromPixel;
GlobWeb.Globe.prototype['getViewportGeoBound'] = GlobWeb.Globe.prototype.getViewportGeoBound;
GlobWeb.Globe.prototype['setBaseImagery'] = GlobWeb.Globe.prototype.setBaseImagery;
GlobWeb.Globe.prototype['setBaseElevation'] = GlobWeb.Globe.prototype.setBaseElevation;
GlobWeb.Globe.prototype['refresh'] = GlobWeb.Globe.prototype.refresh;
GlobWeb.Globe.prototype['subscribe'] = GlobWeb.Globe.prototype.subscribe;
GlobWeb.Globe.prototype['unsubscribe'] = GlobWeb.Globe.prototype.unsubscribe;

// Layer exports
GlobWeb.BaseLayer.prototype['visible'] = GlobWeb.BaseLayer.prototype.visible;
GlobWeb.BaseLayer.prototype['opacity'] = GlobWeb.BaseLayer.prototype.opacity;

// VectorLayer exports
GlobWeb.VectorLayer.prototype['addFeatureCollection'] = GlobWeb.VectorLayer.prototype.addFeatureCollection;
GlobWeb.VectorLayer.prototype['addFeature'] = GlobWeb.VectorLayer.prototype.addFeature;
GlobWeb.VectorLayer.prototype['modifyFeatureStyle'] = GlobWeb.VectorLayer.prototype.modifyFeatureStyle;
GlobWeb.VectorLayer.prototype['removeFeature'] = GlobWeb.VectorLayer.prototype.removeFeature;
GlobWeb.VectorLayer.prototype['removeAllFeatures'] = GlobWeb.VectorLayer.prototype.removeAllFeatures;

// Navigation exports
GlobWeb.Navigation.prototype['zoomTo'] = GlobWeb.Navigation.prototype.zoomTo;

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

