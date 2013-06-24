requirejs.config({
	paths: {
		gw: '../../src'
	}
});

require(['gw/RenderContext', 'gw/SceneGraph/Navigation', 'gw/SceneGraph/LODTreeRenderer', 
	'gw/SceneGraph/SceneGraph', 'gw/SceneGraph/LODNode', 'gw/SceneGraph/LODTreeLoader', 'gw/Stats'], 
	function(RenderContext,Navigation,LODTreeRenderer,SceneGraph,LODNode,loadLODTree,Stats) {

	var canvas = document.getElementById('WebGLCanvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	var renderContext = new RenderContext({ canvas: canvas, backgroundColor: [1.0,1.0,1.0,1.0], continuousRendering: true });
	var root = new SceneGraph.Node();

	var stats = new Stats(renderContext, {
			element: "stats"
		});

	var nav = new Navigation(renderContext, { node: root, 
			inertia: false,
			mouse: {
				rotateButton: 2
			}
		});

	var renderer = new LODTreeRenderer(renderContext,root);

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