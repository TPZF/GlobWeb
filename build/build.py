import jscompiler
import os
import os.path

advanced = True

commonFiles= [
		"glMatrix.js",
		"Stats.js",
		"Utils.js",
		"GeoBound.js",
		"BoundingBox.js",
		"Numeric.js",
		"Animation.js",
		"InterpolatedAnimation.js",
		"SegmentedAnimation.js",
		"CoordinateSystem.js",
		"Frustum.js",
		"RenderContext.js",
		"Mesh.js",
		"Program.js",
		"TileIndexBuffer.js",
		"Tile.js",
		"TilePool.js",
		"TileManager.js",
		"RasterLayer.js",
		"TileRequest.js",
		"Globe.js",
		"PathAnimation.js",
		"MouseNavigationHandler.js"
	]
		
globFiles = [
		"PositionAttitudeAnimation.js", 
		"Navigation.js", 
		"Atmosphere.js",
		"GeoTiling.js", 
		"MercatorTiling.js",
		"WMSLayer.js",
		"WMSElevationLayer.js",
        "WCSElevationLayer.js",
		"BingLayer.js",
		"OSMLayer.js", 
		"BasicElevationLayer.js", 
	]

vectorFiles = [
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
		"HEALPixLayer.js",
		"HEALPixTiling.js",
		"SimpleLineRenderer.js",
		"AstroNavigation.js",
		"HEALPixTables.js",
		"HEALPixBase.js",
		"Long.js"
    ]

experimentalFiles = [
		"Triangulator.js",
		"PolygonRenderable.js",
    ]

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
		sourceFiles = map(lambda file: "../src/"+file, sourceFiles)
		
		# Add GlobWeb namespaces
		sourceFiles.insert( 0, "GlobWeb.ns.js" )
		
		# Add export
		if advanced:
			sourceFiles.append(exportFile)

response = 0

def clear():
	os.system('cls')

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

# array of arrays files
package = []

if response == 1:
	package.append(globFiles)
	makeSourceFiles(package, "GlobWeb.export.js")
	outputFilename="GlobWeb.min.js"
elif response == 2:
	package.append(astroFiles)
	makeSourceFiles(package, "AstroWeb.export.js")
	outputFilename="AstroWeb.min.js"
elif response == 3:
	package.append(globFiles)
	package.append(astroFiles)
	makeSourceFiles(package, "Total.export.js")
	outputFilename="GlobAstroWeb.min.js"
elif response == 4:
	package.append(globFiles)
	package.append(astroFiles)
	package.append(experimentalFiles)
	makeSourceFiles(package, "Total.export.js")
	outputFilename="TotalWeb.min.js"


# Setup compiler flags
compilerFlags = [
    "--externs", "externs.js",
    "--language_in", "ECMASCRIPT5"
   ]

if advanced:
	compilerFlags.extend(["--compilation_level", "ADVANCED_OPTIMIZATIONS"])
	# To Debug
	#compilerFlags.extend([ "--formatting", "pretty_print"])
else:
	compilerFlags.extend(["--compilation_level", "SIMPLE_OPTIMIZATIONS",
        "--formatting", "pretty_print"])

print "Building minized file."
minimized, error = jscompiler.Compile('compiler.jar',sourceFiles,compilerFlags)
print error

print "Writing to %s." % outputFilename
licence = file("licence.txt","r+").read()
if not os.path.exists("generated"):
    os.mkdir("generated")
file("generated/" + outputFilename,"w").write(licence+minimized)

raw_input("Press a key to finish.")
