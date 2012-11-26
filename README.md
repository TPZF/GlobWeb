GlobWeb
=======

Virtual Globe with WebGL

GlobWeb is a Javascript library developed by Telespazio France using the new WebGL standard. WebGL allows embedding 3D visualisation in a browser without any plugin and is supported on recent versions of Mozilla Firefox and Google Chrome.
The main focus of GlobWeb is to provide a high performance 3D library for visualizing geospatial data, Telespazio being itself a provider of geospatial data through its partner GeoEye.
Through a partnership with CNES and CDS, GlobWeb also supports visualization of astronomical data.  
GlobWeb supports the following features:
 * Base raster layer using WMS, Bing Map REST API, WorldWind Tile Service, HEALPix
 * Manipulation of vector data through GeoJSON interface: add/remove/select/style modification
 * Overlay WMS layer on top of existing base layers
 * High performance vector rendering  : automatic tiling of vector data

### Demos ###

<a href="http://demonstrator.telespazio.com/GlobWeb/">Demonstration with earth observation data</a>  
<a href="http://demonstrator.telespazio.com/AstroWeb/">Demonstration with astronomic data</a>  
<a href="http://demonstrator.telespazio.com/EoliWebGL/">Prototype done for ESA</a>  

### Documentation ###
<a href="http://tpzf.github.com/GlobWeb/api/index.html">API Documentation</a>  

### Getting started ###

See the examples to show basic usage.

### Build ###

To build a minified version of GlobWeb, Python and Java is needed.
Google Closure Compiler is used in Advanced mode to produce a lightweight library.
To build, just execute the python script build.py in build/.

### License ###

LGPL v3
