window['GlobWeb'] = {};
window['GlobWeb']['Globe'] = GlobWeb.Globe;
window['GlobWeb']['Stats'] = GlobWeb.Stats;
window['GlobWeb']['AstroNavigator'] = GlobWeb.AstroNavigator;

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
GlobWeb.Globe.prototype['setOption'] = GlobWeb.Globe.prototype.setOption;

// Layers
window['GlobWeb']['HEALPixLayer'] = GlobWeb.HEALPixLayer;
window['GlobWeb']['CoordinateSystem'] = GlobWeb.CoordinateSystem;
window['GlobWeb']['CoordinateSystem']['fromEquatorialToGeo'] = GlobWeb.CoordinateSystem.fromEquatorialToGeo;
window['GlobWeb']['CoordinateSystem']['fromGeoTo3D'] = GlobWeb.CoordinateSystem.fromGeoTo3D;
window['GlobWeb']['CoordinateSystem']['from3DToGeo'] = GlobWeb.CoordinateSystem.from3DToGeo;
window['GlobWeb']['CoordinateSystem']['fromGeoToEquatorial'] = GlobWeb.CoordinateSystem.fromGeoToEquatorial;

// FeatureStyle exports
window['GlobWeb']['FeatureStyle'] = GlobWeb.FeatureStyle;
GlobWeb.FeatureStyle.prototype['_attach'] = GlobWeb.FeatureStyle._attach;

// VectorRendererManager exports
window['GlobWeb']['VectorRendererManager'] = GlobWeb.VectorRendererManager;
GlobWeb.VectorRendererManager.prototype['addFeature'] = GlobWeb.VectorRendererManager.prototype.addFeature;

// VectorLayer exports
window['GlobWeb']['VectorLayer'] = GlobWeb.VectorLayer;
GlobWeb.VectorLayer.prototype['addFeature'] = GlobWeb.VectorLayer.prototype.addFeature;
GlobWeb.VectorLayer.prototype['addFeatureCollection'] = GlobWeb.VectorLayer.prototype.addFeatureCollection;
GlobWeb.VectorLayer.prototype['modifyFeatureStyle'] = GlobWeb.VectorLayer.prototype.modifyFeatureStyle;
GlobWeb.VectorLayer.prototype['removeFeature'] = GlobWeb.VectorLayer.prototype.removeFeature;
GlobWeb.VectorLayer.prototype['removeFeatureCollection'] = GlobWeb.VectorLayer.prototype.removeFeatureCollection;
GlobWeb.VectorLayer.prototype['_attach'] = GlobWeb.VectorLayer.prototype._attach;

// AstroNavigator exports
GlobWeb.AstroNavigator.prototype['zoomTo'] = GlobWeb.AstroNavigator.prototype.zoomTo;
GlobWeb.AstroNavigator.prototype['subscribe'] = GlobWeb.AstroNavigator.prototype.subscribe;
GlobWeb.AstroNavigator.prototype['unsubscribe'] = GlobWeb.AstroNavigator.prototype.unsubscribe;
GlobWeb.AstroNavigator.prototype['setupDefaultEventHandlers'] = GlobWeb.AstroNavigator.prototype.setupDefaultEventHandlers;
GlobWeb.AstroNavigator.prototype['computeViewMatrix'] = GlobWeb.AstroNavigator.prototype.computeViewMatrix;

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


