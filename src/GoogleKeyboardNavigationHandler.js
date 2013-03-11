/**************************************************************************************************************/

/** @export
	@constructor
	GoogleKeyboardNavigationHandler constructor
	@param options Configuration properties for the GoogleKeyboardNavigationHandler :
			<ul>
				<li>panFactor  : Factor for panning within the scene</li>
				<li>zoomFactor : Factor for zooming into the scene</li>
				<li>installOnDocument : True to install the event listener on the document and not on the canvas</li>
			</ul>
 */
GlobWeb.GoogleKeyboardNavigationHandler = function(options){
	
	/**************************************************************************************************************/
	
	/**
 	 * Private variables
	 */
	var _navigation = null;
	var self = this;
	
	/**
	 * Public variables
	 */
	this.panFactor = 10.;
	this.zoomFactor = 1.;
	
	// Setup options
	if ( options )
	{
		if ( options['panFactor'] && typeof options['panFactor'] == 'number' )
			this.panFactor = options['panFactor'];
		if ( options['zoomFactor'] && typeof options['zoomFactor'] == 'number' )
			this.zoomFactor = options['zoomFactor'];
	}
	
	/**************************************************************************************************************/
	
	/**
 	 * Private methods
	 */

	/**
	 * Set focus
	 */
	var _setFocus = function(event)
	{
		this.focus();
		return false;
	};
	  
	/**
	 *	Event handler for key down
	 */
	var _handleKeyDown = function(event)
	{
		switch( event.keyCode ){
			case 32 :
				// space bar
				// Stop all animations when an event is received
				_navigation.stopAnimations();
				break;
			case 187 :
				// + on Safari
			case 61 :
				// +(=) on Firefox and Opera
			case 107 :
				// + on other
				_navigation.zoom(-self.zoomFactor);
				break;
			case 189 :
				// - on Safari
			case 54 :
				// -(6) on Firefox and Opera
			case 109 :
				// - on other
				_navigation.zoom(self.zoomFactor);
				break;
			case 81 :
				// q
			case 37 :
				// Left arrow
				if ( event.shiftKey )
				{
					_navigation.rotate( self.panFactor, 0 );
				}
				else
				{
					_navigation.pan( self.panFactor, 0 );
				}
				break;
			case 90 :
				// z
			case 38 :
				// Up arrow
				if ( event.shiftKey )
				{
					_navigation.rotate( 0, self.panFactor );
				}
				else
				{

					_navigation.pan( 0, self.panFactor );
				}
				break;
			case 68 :
				// d
			case 39 :
				// Right arrow
				if ( event.shiftKey )
				{
					_navigation.rotate( -self.panFactor, 0 );
				}
				else
				{
					_navigation.pan( -self.panFactor, 0 );
				}
				break;
			case 83 :
				// s
			case 40 :
				// Down arrow
				if ( event.shiftKey )
				{
					_navigation.rotate( 0, -self.panFactor );
				}
				else
				{

					_navigation.pan( 0, -self.panFactor );
				}
				break;
		}
		_navigation.globe.renderContext.requestFrame();
	};

	/**************************************************************************************************************/
	
	 /**
	  * Public methods
	  */

	/** 
		Setup the default event handlers for the navigation
	 */
	this.install = function(navigation)
	{
		// Setup the keyboard event handlers
		_navigation = navigation;
		
		if ( options && options.installOnDocument )
		{
			document.addEventListener("keydown", _handleKeyDown);
		}
		else
		{
			var canvas = _navigation.globe.renderContext.canvas;
			canvas.addEventListener("keydown", _handleKeyDown);
			// Setup focus handling to receive keyboard event on canvas
			canvas.tabIndex = "0";
			canvas.addEventListener("mousedown", _setFocus);
		}
	};

	/** 
		Remove the default event handlers for the navigation
	 */
	this.uninstall = function()
	{	
		if ( options && options.installOnDocument )
		{
			document.removeEventListener("keydown", _handleKeyDown);
		}
		else
		{
			var canvas = _navigation.globe.renderContext.canvas;
			canvas.removeEventListener("keydown", _handleKeyDown);
			canvas.removeEventListener("mousedown", _setFocus);
		}
	};
	
};
