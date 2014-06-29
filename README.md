OSMThree
========

OSMThree is a library that adds 3d models of buildings to a three.js scene. It fetches data describing the buildings
from the Open Street Maps database via the Overpass API, builds one or more THREE.Mesh objects for the buildings, and
adds them to the scene.  

OSMThree is still in the early stages of development, so it may be a little rough around the edges.

### How to get it

Either clone the github repo and use one of the files in the build directory, or grab it via NPM.

### How to use it

Currently there is only one public function in the library, makeBuildings.  It takes a THREE.Scene object, a bounding box
array, and an options object as its arguments.  It executes asynchronously and returns nothing. 

Suppose the variable myScene points to a THREE.Scene object...

```
OSM3.makeBuildings( myScene, [ 114.15, 22.2675, 114.165, 22.275 ] )
```

This would add all the buildings found in the Open Street Maps database within the given bounding box (which happens to be central Hong Kong)
to myScene using all of the default options.

