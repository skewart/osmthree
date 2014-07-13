

function constructor( readyCallback, scale, origin, options ) {

	var 
		options = options || {},
		_readyCallback = readyCallback,
		_scale = scale,
		_origin = lonLatToWorld( origin[0], origin[1] ),
		_meshCallback = options.meshCallback || createMesh,
		_defaultColor = options.defaultColor || 0xf0f0f0;


	this.build = function( items ) {

		var bldg, currVerLen,
			mats = [],
			ids = [];
			//geom = new THREE.Geometry();

		for ( var i=0, len=items.length; i < len; i++ ) {
			bldg = makeBldgGeom( items[i] );
			if (bldg) { 
				_readyCallback( _meshCallback.call( this, bldg, items[i] ) );
			}
			//currVerLen = geom.vertices.length;
			//geom.vertices = geom.vertices.concat( bldg.vertices );
			//geom.faces = geom.faces.concat( updateFaces( bldg.faces, currVerLen ) );
			//mats = mats.concat( bldg.materials );
			// Is this really necessary?
			//for ( var j = 0, fLen = bldg.faces.length; j < fLen; j++ ) {
				//ids.push( i );
			//}
		}

		// TODO Create the mesh object and any necessary material objects
		//_scene.add( new THREE.Mesh( geom, new THREE.MeshNormalMaterial() ) );

	}


	function updateFaces( faces, len ) {
		for ( var i=0, flen = faces.length; i < flen; i++ ) {
			faces[i].a += len;
			faces[i].b += len;
			faces[i].c += len;
			if ( faces[i].d ) {
				faces[i].d += len;
			}
		}
		return faces;
	}


	function createMesh( geom, osmData ) {
		//	return new THREE.Mesh( geom, new THREE.MeshLambertMaterial() );
		var face,
			mats = [],
			wci = 0,
			rci = 0;
		if ( osmData.wallColor ) {
			mats.push( new THREE.MeshLambertMaterial( {color: osmData.wallColor }) );
		} else {
			mats.push( new THREE.MeshLambertMaterial( {color: _defaultColor } ) );
		}
		if ( osmData.roofColor ) {
			mats.push( new THREE.MeshLambertMaterial( {color: osmData.roofColor }) );
			rci = 1;
		}
		for ( var i=0, len=geom.faces.length; i < len; i++ ) {
			face = geom.faces[i];
			( face.normal.y === 1 ) ? face.materialIndex = rci
								    : face.materialIndex = wci;
		}
		var m = new THREE.Mesh( geom, new THREE.MeshFaceMaterial( mats ) );
		m.footprint = osmData.footprint;
		return m;
	}


	function lonLatToWorld( lon, lat ) {
		var x, y, pointX, pointY, latRad, mercN,
			worldWidth = 40075000,
			worldHeight = 40008000;

		x = ( lon + 180 ) * ( worldWidth / 360);
		latRad = lat*Math.PI/180;
		mercN = Math.log( Math.tan((Math.PI/4)+(latRad/2)));
		y = (worldHeight/2)-(worldHeight*mercN/(2*Math.PI));
		return [ x, y ]
	}


	function lonLatToScene( lon, lat ) {
		var point = lonLatToWorld( lon, lat );
		// This looks weird, and it is kind of a hack, but it's done because of the way THREE.ExtrudeGeometry converts
		// Vector2 x,y coordinates into x,z coordinates in Vector3 objects.  +x +y goes to -z,-x.  This effectively rotates
		// the geometries, putting them in the correct quadrant.   Doing an actual rotation might be cleaner, but, well.
		return new THREE.Vector2( _origin[1] - point[1], _origin[0] - point[0] );
	}


	function makeBldgGeom( item ) {
		// Create a path
		var pointX, pointY, extrudePath, eg,
			path, shapes,
			bldgHeight = item.height,
			pathPoints = [];
		
		for ( var i = 0, last = item.footprint.length-1; i < last; i+=2 ) {
			pathPoints.push( lonLatToScene( item.footprint[i+1], item.footprint[i] ) );
		}

		path = new THREE.Path( pathPoints );
		shapes = path.toShapes(); // isCCW, noHoles

		extrudePath = new THREE.CurvePath();
		extrudePath.add( new THREE.LineCurve3( new THREE.Vector3(0,0,0), new THREE.Vector3(0,bldgHeight,0) ) );

		eg = new THREE.ExtrudeGeometry( shapes, {
			extrudePath: extrudePath,
			material: 0
		})

		return eg;

	}

}

module.exports = constructor;