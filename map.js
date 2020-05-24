// 地図を設定
const MAP_ZOOM = 17;
const MAP_PITCH = 40;
const MAP_CENTER = [138.6728926, 35.1637692];
const MAP_OPTIONS = { antialias: true };
map = new mapboxgl.Map( { container: 'map', style: 'mapbox://styles/mapbox/light-v10', zoom: MAP_ZOOM, pitch: MAP_PITCH, center: MAP_CENTER } );
// access tokenは別にセットする

// 操作ボタンを設定
map.addControl( new mapboxgl.NavigationControl() );
// 縮尺ボタンを設定
map.addControl( new mapboxgl.ScaleControl( {maxWidth: 250, unit: 'metric'} ) );


// parameters to ensure the model is georeferenced correctly on the map
var modelOrigin = MAP_CENTER;
var modelAltitude = 0;
var modelRotate = [Math.PI / 2, 0, 0];

var modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
  modelOrigin,
  modelAltitude
);

// transformation parameters to position, rotate and scale the 3D model onto the map
var modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  rotateX: modelRotate[0],
  rotateY: modelRotate[1],
  rotateZ: modelRotate[2],
  /* Since our 3D model is in real world meters, a scale transform needs to be
  * applied since the CustomLayerInterface expects units in MercatorCoordinates.
  */
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 10
};

var THREE = window.THREE;

// configuration of the custom layer for a 3D model per the CustomLayerInterface
var customLayer = {
  id: '3d-model',
  type: 'custom',
  renderingMode: '3d',
  onAdd: function(map, gl) {
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

// create two three.js lights to illuminate the model
    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0, -70, 100).normalize();
    this.scene.add(directionalLight);

    var directionalLight2 = new THREE.DirectionalLight(0xffffff);
    directionalLight2.position.set(0, 70, 100).normalize();
    this.scene.add(directionalLight2);

// use the three.js GLTF loader to add the 3D model to the three.js scene
    var loader = new THREE.GLTFLoader();
    loader.load(
      //'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
      //'https://docs.mapbox.com/mapbox-gl-js/assets/34M_17/34M_17.gltf',
      'Box.gltf',
      function(gltf) {
        this.scene.add(gltf.scene);
      }.bind(this)
    );
    this.map = map;

// use the Mapbox GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });

    this.renderer.autoClear = false;
  },
  render: function(gl, matrix) {
    var rotationX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      modelTransform.rotateX
    );
    var rotationY = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 1, 0),
      modelTransform.rotateY
    );
    var rotationZ = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 0, 1),
      modelTransform.rotateZ
    );

    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4()
      .makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ
      )
      .scale(
        new THREE.Vector3(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        )
      )
      .multiply(rotationX)
      .multiply(rotationY)
      .multiply(rotationZ);

    this.camera.projectionMatrix = m.multiply(l);
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  }
};

map.on('style.load', function() {
  map.addLayer(customLayer, 'waterway-label');
});
