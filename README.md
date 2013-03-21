GlobWeb
=======

Virtual Globe with WebGL

GlobWeb is a Javascript library developed by Telespazio France using the new WebGL standard. WebGL allows embedding 3D visualisation in a browser without any plugin and is supported on recent versions of Mozilla Firefox and Google Chrome.
The main focus of GlobWeb is to provide a high performance 3D library for visualizing geospatial data, Telespazio being itself a provider of geospatial data through its partner GeoEye.
Through a partnership with CNES and CDS, GlobWeb also supports visualization of astronomical data.  
GlobWeb supports the following features:
 * Base raster layer using WMS, Bing Map REST API, WorldWind Tile Service, HEALPix
 * Manipulation of vector data through GeoJSON interface: add/remove/select/style modification
 * Overlay raster layer on top of existing base layers
 * High performance vector rendering  : automatic tiling of vector data
 
### Demos ###

<a href="http://demonstrator.telespazio.com/GlobWeb/">Demonstration with earth observation data</a>  
<a href="http://demonstrator.telespazio.com/AstroWeb/">Demonstration with astronomic data</a>  
<a href="http://demonstrator.telespazio.com/EoliWebGL/">Prototype done for ESA</a>  

### Quick start ###

Pre-build stable version can be downloaded here :<br>
<a href="http://tpzf.github.com/GlobWeb/download/v1.0.0/GlobWeb.min.js">GlobWeb v1.0.0</a>  
<a href="http://tpzf.github.com/GlobWeb/download/v1.0.0/AstroWeb.min.js">AstroWeb v1.0.0</a>

See the following example for basic usage.
<a href="https://raw.github.com/TPZF/GlobWeb/master/examples/Basic_api.html">Basic usage</a>

Internally, GlobWeb is using Standard Asynchronous Module Definition (AMD) modules.
You can also use GlobWeb using any AMD loader such as RequireJS or Dojo.

See the following example for using GlobWeb with Require.js :
<a href="https://github.com/TPZF/GlobWeb/tree/master/demo/client">Demo with Require.js</a>

### Documentation ###
<a href="http://tpzf.github.com/GlobWeb/api/index.html">API Documentation</a>  

### Build ###

GlobWeb use Require.js optimizer to build a minified version of GlobWeb.
See <a href="http://requirejs.org/docs/optimization.html">RequireJS Optimizer</a> for more information on how to build a minified version of GlobWeb.



### License ###

LGPL v3
