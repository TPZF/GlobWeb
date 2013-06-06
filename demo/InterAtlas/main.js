requirejs.config({
	paths: {
		gw: '../../src'
	}
});

require(['gw/RenderContext','gw/SceneGraph/Navigation','gw/SceneGraph/Renderer', 'gw/SceneGraph/SceneGraph', 'gw/SceneGraph/LODNode'], 
	function(RenderContext,Navigation,SceneGraphRenderer,SceneGraph,LODNode) {

var stats = function()
{
	if ( fpsElement != null )
	{
		fpsElement.innerHTML = "FPS : " + renderContext.numFrames + "<br># rendered node : " + LODNode.Loader.numRendered;
	}

	renderContext.numFrames = 0;
}

var fpsElement = document.getElementById("stats");
window.setInterval(stats,1000);

var canvas = document.getElementById('WebGLCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var renderContext = new RenderContext( { canvas: canvas });
var root = new SceneGraph.Node();

var nav = new Navigation(renderContext,root);
nav.setupDefaultEventHandlers();

var sgRenderer = new SceneGraphRenderer(renderContext,root);
sgRenderer.postFrame = function() { LODNode.Loader.postFrame() };

var addToRoot = function(node) {
	nav.center = vec3.create( node.center );
	nav.distance = 3 * node.radius;
	nav.computeViewMatrix();
	
	root.children.push( node );
};

LODNode.load("Data/Collada-ecef/Data/Tile_-009_-006/Tile_-009_-006.xml", addToRoot );

LODNode.load("Data/Collada-ecef/Data/Tile_-009_-007/Tile_-009_-007.xml", addToRoot );

LODNode.load("Data/Collada-ecef/Data/Tile_-009_-008/Tile_-009_-008.xml", addToRoot );

LODNode.load("Data/Collada-ecef/Data/Tile_-010_-006/Tile_-010_-006.xml", addToRoot );

LODNode.load("Data/Collada-ecef/Data/Tile_-010_-007/Tile_-010_-007.xml", addToRoot );

LODNode.load("Data/Collada-ecef/Data/Tile_-010_-008/Tile_-010_-008.xml",addToRoot );


var tick = function() {
	requestAnimationFrame(tick);
	if ( sgRenderer )
		sgRenderer.render();
	renderContext.numFrames++;
}
window.requestAnimationFrame(tick);

});