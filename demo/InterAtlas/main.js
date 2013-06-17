requirejs.config({
	paths: {
		gw: '../../src'
	}
});

require(['gw/RenderContext','gw/SceneGraph/Navigation','gw/SceneGraph/Renderer', 'gw/SceneGraph/SceneGraph', 'gw/SceneGraph/LODNode', 'gw/SceneGraph/LODTreeLoader'], 
	function(RenderContext,Navigation,SceneGraphRenderer,SceneGraph,LODNode,loadLODTree) {

var stats = function()
{
	if ( fpsElement != null )
	{
		var numRender = 0;
		if ( renderContext.numFrames > 0 )
		{
			numRender = (LODNode.Loader.numRendered / renderContext.numFrames).toFixed(2);
		}
		fpsElement.innerHTML = "FPS : " + renderContext.numFrames + "<br># rendered node : " + numRender;
	}

	LODNode.Loader.numRendered = 0;
	renderContext.numFrames = 0;
}

var fpsElement = document.getElementById("stats");
window.setInterval(stats,1000);

var canvas = document.getElementById('WebGLCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var renderContext = new RenderContext({ canvas: canvas, backgroundColor: [1.0,1.0,1.0,1.0], continuousRendering: true });
var root = new SceneGraph.Node();

var nav = new Navigation(renderContext, { node: root, 
		inertia: false,
		mouse: {
			rotateButton: 2
		}
	});

var sgRenderer = new SceneGraphRenderer(renderContext,root);
sgRenderer.postFrame = function() { LODNode.Loader.postFrame() };


var addToRoot = function(node) {
	nav.center = vec3.create( node.center );
	nav.distance = 3 * node.radius;
	nav.computeViewMatrix();
	
	root.children.push( node );
};

loadLODTree("Data/Collada-ecef/Data/Tile_-009_-006/Tile_-009_-006.xml", addToRoot );

loadLODTree("Data/Collada-ecef/Data/Tile_-009_-007/Tile_-009_-007.xml", addToRoot );

loadLODTree("Data/Collada-ecef/Data/Tile_-009_-008/Tile_-009_-008.xml", addToRoot );

loadLODTree("Data/Collada-ecef/Data/Tile_-010_-006/Tile_-010_-006.xml", addToRoot );

loadLODTree("Data/Collada-ecef/Data/Tile_-010_-007/Tile_-010_-007.xml", addToRoot );

loadLODTree("Data/Collada-ecef/Data/Tile_-010_-008/Tile_-010_-008.xml",addToRoot );


});