import jscompiler
import os
import os.path
import sys

advanced = False

commonFiles= [
		"glMatrix.js",
		"Stats.js",
		"Utils.js",
		"GeoBound.js",
		"BoundingBox.js",
		"BaseLayer.js",
		"TileWireframeLayer.js",
		"Numeric.js",
		"Animation.js",
		"InterpolatedAnimation.js",
		"SegmentedAnimation.js",
		"CoordinateSystem.js",
		"Frustum.js",
		"RenderContext.js",
		"Program.js",
		"TileIndexBuffer.js",
		"Tile.js",
		"TilePool.js",
		"TileManager.js",
		"RasterLayer.js",
		"TileRequest.js",
		"Globe.js",
		"AttributionHandler.js",
		"PathAnimation.js",
		"MouseNavigationHandler.js",
		"KeyboardNavigationHandler.js",
		"BaseNavigation.js",
		"RasterOverlayRenderer.js",
		"InertiaAnimation.js"
	]
		
globFiles = [
		#"PositionAttitudeAnimation.js", 
		"Navigation.js", 
		"AtmosphereLayer.js",
		"GeoTiling.js", 
		"MercatorTiling.js",
		"WMSLayer.js",
		"WMTSLayer.js",
		#"WMSElevationLayer.js",
		"WCSElevationLayer.js",
		"BingLayer.js",
		"OSMLayer.js", 
		#"BasicElevationLayer.js", 
	]

vectorFiles = [
		"RendererTileData.js",
		"VectorRendererManager.js",
		"PointRenderer.js",
		"FeatureStyle.js",
		"TiledVectorRenderable.js",
		"LineStringRenderable.js",
		"TiledVectorRenderer.js",
		"VectorLayer.js",
		"KMLParser.js"
   ]

astroFiles = [
		"Mesh.js",
		"EquatorialCoordinateSystem.js",
		"HEALPixLayer.js",
		"HEALPixTiling.js",
		#"SimpleLineRenderer.js",
		"PointSpriteRenderer.js",
		"ConvexPolygonRenderer.js",
		"AstroNavigation.js",
		"HEALPixTables.js",
		"HEALPixBase.js",
		"EquatorialGridLayer.js",
		"Long.js",
		"OpenSearchLayer.js"
    ]

experimentalFiles = [
		"Triangulator.js",
		"PolygonRenderable.js",
    ]

response = 0

def clear():
	os.system('cls')

# changed in case of call from other repertory
buildPath = './'
if len(sys.argv) > 2:
	# predefined response
	response = int(sys.argv[1])
	buildPath = sys.argv[2]
else:
	while (response < 1 or response > 4) :  
		print "Compilation modes : \n"
		print "\t1 - Basic GlobWeb only"
		print "\t2 - Basic AstroWeb only"
		print "\t3 - Basic GlobWeb + AstroWeb"
		print "\t4 - Basic and experimental GlobWeb + AstroWeb"
		try:
			response = int(raw_input("\nEnter your choice: "))
		except ValueError: 
			pass
		clear()

sourceFiles = []

def makeSourceFiles(packageArray, exportFile):
		
		global sourceFiles
		
		# common for every case files
		sourceFiles.extend(commonFiles)
		sourceFiles.extend(vectorFiles)
		
		# extend necessary files
		for package in packageArray:
			sourceFiles.extend(package)
		
		# Add ../src to normal source files
		sourceFiles = map(lambda file: buildPath+"../src/"+file, sourceFiles)
		
		# Add GlobWeb namespaces
		sourceFiles.insert( 0, buildPath+"GlobWeb.ns.js" )
		
		# Add export
		if advanced:
			sourceFiles.append(exportFile)


# array of arrays files
package = []

if response == 1:
	package.append(globFiles)
	makeSourceFiles(package, buildPath+"GlobWeb.export.js")
	outputFilename="GlobWeb.min.js"
elif response == 2:
	package.append(astroFiles)
	makeSourceFiles(package, buildPath+"AstroWeb.export.js")
	outputFilename="AstroWeb.min.js"
elif response == 3:
	package.append(globFiles)
	package.append(astroFiles)
	makeSourceFiles(package, buildPath+"Total.export.js")
	outputFilename="GlobWeb.min.js"
elif response == 4:
	package.append(globFiles)
	package.append(astroFiles)
	package.append(experimentalFiles)
	makeSourceFiles(package, buildPath+"Total.export.js")
	outputFilename="TotalWeb.min.js"


# Setup compiler flags
compilerFlags = [
    "--externs", buildPath+"externs.js",
    "--language_in", "ECMASCRIPT5"
   ]

if advanced:
	compilerFlags.extend(["--compilation_level", "ADVANCED_OPTIMIZATIONS"])
	# To Debug
	#compilerFlags.extend([ "--formatting", "pretty_print"])
else:
	compilerFlags.extend(["--compilation_level", "SIMPLE_OPTIMIZATIONS"])
	# To Debug
	#compilerFlags.extend([ "--formatting", "pretty_print"])

print "Building minized file."
minimized, error = jscompiler.Compile(buildPath + 'compiler.jar',sourceFiles,compilerFlags)
print error

print "Writing to %s." % outputFilename
licence = file(buildPath+"licence.txt","r+").read()
if not os.path.exists(buildPath+"generated"):
    os.mkdir(buildPath+"generated")
file(buildPath+"generated/" + outputFilename,"w").write(licence+minimized)

raw_input("Press a key to finish.")
