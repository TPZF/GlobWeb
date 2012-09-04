window['GlobWeb'] = {};
window['GlobWeb']['Globe'] = GlobWeb.Globe;
window['GlobWeb']['Stats'] = GlobWeb.Stats;
window['GlobWeb']['Navigation'] = GlobWeb.Navigation;
window['GlobWeb']['AstroNavigator'] = GlobWeb.AstroNavigator;

// Layers
window['GlobWeb']['HEALPixLayer'] = GlobWeb.HEALPixLayer;

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

// VectorLayer exports
GlobWeb.VectorLayer.prototype['addFeatureCollection'] = GlobWeb.VectorLayer.prototype.addFeatureCollection;
GlobWeb.VectorLayer.prototype['addFeature'] = GlobWeb.VectorLayer.prototype.addFeature;
GlobWeb.VectorLayer.prototype['modifyFeatureStyle'] = GlobWeb.VectorLayer.prototype.modifyFeatureStyle;
GlobWeb.VectorLayer.prototype['removeFeature'] = GlobWeb.VectorLayer.prototype.removeFeature;

// Navigation exports
GlobWeb.Navigation.prototype['zoomTo'] = GlobWeb.Navigation.prototype.zoomTo;
GlobWeb.Navigation.prototype['subscribe'] = GlobWeb.Navigation.prototype.subscribe;
GlobWeb.Navigation.prototype['unsubscribe'] = GlobWeb.Navigation.prototype.unsubscribe;
GlobWeb.Navigation.prototype['setupDefaultEventHandlers'] = GlobWeb.Navigation.prototype.setupDefaultEventHandlers;
GlobWeb.Navigation.prototype['setupMouseEventHandlers'] = GlobWeb.Navigation.prototype.setupMouseEventHandlers;

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




