// 地図を設定
const MAP_ZOOM = 17;
const MAP_PITCH = 0;
const MAP_CENTER = [138.6728926, 35.1637692];
const MAP_OPTIONS = { antialias: true };
map = new mapboxgl.Map( { ...MAP_OPTIONS, container: 'map', style: 'mapbox://styles/mapbox/light-v10', zoom: MAP_ZOOM, pitch: MAP_PITCH, center: MAP_CENTER } );
// access tokenは別にセットする

// 操作ボタンを設定
map.addControl( new mapboxgl.NavigationControl() );
// 縮尺ボタンを設定
map.addControl( new mapboxgl.ScaleControl( {maxWidth: 250, unit: 'metric'} ) );

const layerAttr = {};

// parameters to ensure the model is georeferenced correctly on the map
const MODEL_ALTITUDE = 0;

// カメラとグローバル光源
const THREE = window.THREE;
const camera = new THREE.Camera();
const scene = new THREE.Scene();
const createLights = ( color ) => {
  let directionalLight = new THREE.DirectionalLight( color, 1.0 );
  directionalLight.position.set( 100, -70, 0 ).normalize();
  let directionalLight2 = new THREE.DirectionalLight( color, 0.5 );
  directionalLight2.position.set( 100, 70, 0 ).normalize();
  let ambientLight = new THREE.AmbientLight( color, 0.5 );
  return [ directionalLight, ambientLight, directionalLight2 ];
};
for ( const l of createLights( 0xffffff ) )
  scene.add( l );

const pointdesc = [
  { id: 'bar0001', color: 0xff0000, geopos: MAP_CENTER }//,
  //{ id: 'bar0002', color: 0x00ff00, gepos: [138.674155, 35.163537] }
];

const createLayer = ( desc ) => {
  return { ...desc,
    onAdd: ( map, gl ) => {
      for ( const pt of pointdesc )
      {
        // 3Dモデルを準備する
        //new THREE.GLTFLoader().load( 'cubeZ.glb', (( gltf ) => { this.scene.add(gltf.scene); }).bind( this ) );
        const geometry = new THREE.CubeGeometry( 1.0, 1.0, 1.0 ).applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0.5, 0 ) );
        const material = new THREE.MeshLambertMaterial( { color: pt.color } );
        const cube = new THREE.Mesh( geometry, material );
        cube.name = pt.id;
/*
const center = mapboxgl.MercatorCoordinate.fromLngLat( map.getCenter(), MODEL_ALTITUDE );
const scale = mapboxgl.MercatorCoordinate.fromLngLat( pointdesc[ 0 ].geopos, MODEL_ALTITUDE ).meterInMercatorCoordinateUnits() * 10;
const coord = mapboxgl.MercatorCoordinate.fromLngLat( pt.geopos, MODEL_ALTITUDE );
let m = new THREE.Matrix4()
  .makeTranslation( coord.x - center.x, coord.y - center.y, coord.z - center.z )
  .scale( new THREE.Vector3( scale, -scale, scale * 1.0 ) )
  .multiply( new THREE.Matrix4().makeRotationAxis( new THREE.Vector3(1, 0, 0), modelRotate.x ) )
  .multiply( new THREE.Matrix4().makeRotationAxis( new THREE.Vector3(0, 1, 0), modelRotate.y ) )
  .multiply( new THREE.Matrix4().makeRotationAxis( new THREE.Vector3(0, 0, 1), modelRotate.z ) );
cube.applyMatrix( m );
*/
        scene.add( cube );
        layerAttr[ pt.id ] = { zscale: 1.0, color: null };
      }
      this.renderer = new THREE.WebGLRenderer( { canvas: map.getCanvas(), context: gl, antialias: true } );
      this.renderer.autoClear = false;
    },
    render: ( gl, matrix ) => {
      /*if ( layerAttr.${desc.id}.color )
      {
        // マテリアルの色を再設定する
        const cube = this.scene.getObjectByName( '${desc.id}' );
        renderer.renderLists.dispose();
console.log( this.scene );
console.log( cube );
        cube.material.color.setHex( layerAttr.${desc.id}.color );
        layerAttr.${desc.id}.color = null;
      }*/
      const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat( MAP_CENTER, MODEL_ALTITUDE );
      const scale = mapboxgl.MercatorCoordinate.fromLngLat( pointdesc[ 0 ].geopos, MODEL_ALTITUDE ).meterInMercatorCoordinateUnits() * 10;
      for ( const pt of pointdesc )
      {
        const coord = mapboxgl.MercatorCoordinate.fromLngLat( pt.geopos, MODEL_ALTITUDE );
        let m = new THREE.Matrix4()
          .makeTranslation( coord.x - modelOrigin.x, coord.y - modelOrigin.y, coord.z - modelOrigin.z )
          .scale( new THREE.Vector3( scale, scale * 2.0, scale ) );
        const model = scene.getObjectByName( pt.id );
        [ model.position.x, model.position.y, model.position.z ] = [ 0, 0, 0 ];
        [ model.rotation.x, model.rotation.y, model.rotation.z ] = [ 0, 0, 0 ];
        [ model.scale.x, model.scale.y, model.scale.z ] = [ 1, 1, 1 ];
        model.updateMatrix();
        model.applyMatrix( m );
      }

      {
        const {x, y, z} = modelOrigin;
        const scale = new THREE.Matrix4().makeScale( 1, 1, -1 );
        const rotation = new THREE.Matrix4().multiplyMatrices(
          new THREE.Matrix4().makeRotationX(-0.5 * Math.PI),
          new THREE.Matrix4().makeRotationY(Math.PI) );
        const cameraTransform = new THREE.Matrix4()
          .multiplyMatrices( scale, rotation )
          .setPosition( x, y, z );
        camera.projectionMatrix = new THREE.Matrix4().fromArray( matrix ).multiply( cameraTransform );
      }

/*
      const
        {_fov, cameraToCenterDistance, _pitch, width, height} = map.transform,
        halfFov = _fov / 2,
        angle = Math.PI / 2 - _pitch,
        topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(angle - halfFov),
        furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance,
        nearZ = height / 50,
        halfHeight = Math.tan(halfFov) * nearZ,
        halfWidth = halfHeight * width / height,

        m = new THREE.Matrix4().fromArray(matrix),
        l = new THREE.Matrix4()
          .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
          .scale(new THREE.Vector3(1, -1, 1)),

        projectionMatrixI = new THREE.Matrix4();

      camera.projectionMatrix = new THREE.Matrix4().makePerspective(
        -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 1.01);
      projectionMatrixI.getInverse(camera.projectionMatrix);
      camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
      camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
*/

      this.renderer.state.reset();
      this.renderer.render( scene, camera );
      map.triggerRepaint();
    }
  };
};

// configuration of the custom layer for a 3D model per the CustomLayerInterface
map.on('style.load', () => {
  map.addLayer( createLayer( { id: '3dgram', type: 'custom', renderingMode: '3d' } ), 'waterway-label' );
} );

document.getElementById('blue_button' ).addEventListener('click', () => {
  layerAttr[ 'bar0001' ].zscale *= 2;
  map.triggerRepaint();
} );
document.getElementById('green_button' ).addEventListener('click', () => {
  layerAttr[ 'bar0001' ].color = 0x00ff00;
  map.triggerRepaint();
} );
