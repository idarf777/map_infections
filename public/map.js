// 地図を設定
const MAP_ZOOM = 17;
const MAP_PITCH = 40;
const MAP_CENTER = [138.6728926, 35.1637692];
const MAP_OPTIONS = { antialias: true };
map = new mapboxgl.Map( { ...MAP_OPTIONS, container: 'map', style: 'mapbox://styles/mapbox/light-v10', zoom: MAP_ZOOM, pitch: MAP_PITCH, center: MAP_CENTER } );
// access tokenは別にセットする

// 操作ボタンを設定
map.addControl( new mapboxgl.NavigationControl() );
// 縮尺ボタンを設定
map.addControl( new mapboxgl.ScaleControl( {maxWidth: 250, unit: 'metric'} ) );

// 3Dモデルの属性値
const layerAttr = {};

// カメラと光源
const THREE = window.THREE;
const camera = new THREE.Camera();
const scene = new THREE.Scene();
const createLights = ( color ) => {
  const l1 = new THREE.DirectionalLight( color, 1.0 );
  l1.position.set( 100, -70, 0 ).normalize();
  const l2 = new THREE.DirectionalLight( color, 0.5 );
  l2.position.set( 100, 70, 0 ).normalize();
  const l3 = new THREE.AmbientLight( color, 0.5 );
  return [ l1, l2, l3 ];
};
for ( const l of createLights( 0xffffff ) )
  scene.add( l );

// 3Dモデルの標高
const modelAltitude = 0; // [m]
// キューブの縦横幅
const modelWidth = 10;  // [m]
// 初期表示位置
const modelOrigin = mapboxgl.MercatorCoordinate.fromLngLat( MAP_CENTER, modelAltitude );
// キューブ配置点
const pointdesc = [
  { id: 'bar0001', color: 0xff0000, geopos: MAP_CENTER },
  { id: 'bar0002', color: 0x00ff00, geopos: [138.674155, 35.163537] }
];

const createLayer = ( desc ) => {
  return { ...desc,
    onAdd: ( map, gl ) => {
      for ( const pt of pointdesc )
      {
        // 属性値を設定
        layerAttr[ pt.id ] = { zscale: 1.0, color: pt.color };
        // 3Dモデルを準備する
        const geometry = new THREE.CubeGeometry( 1.0, 1.0, 1.0 ).applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0.5, 0 ) );
        const material = new THREE.MeshLambertMaterial( { color: pt.color } );
        const model = new THREE.Mesh( geometry, material );
        model.name = pt.id;
        // 配置点に置く 配置座標は初期表示位置を基準点とする
        const coord = mapboxgl.MercatorCoordinate.fromLngLat( pt.geopos, modelAltitude );
        const scale = coord.meterInMercatorCoordinateUnits() * modelWidth;
        let m = new THREE.Matrix4()
          .makeTranslation( modelOrigin.x - coord.x, modelOrigin.z - coord.z, modelOrigin.y - coord.y )
          .scale( new THREE.Vector3( scale, scale, scale ) );
        model.applyMatrix( m );
        // シーンに3Dモデルを追加
        scene.add( model );
      }
      this.renderer = new THREE.WebGLRenderer( { canvas: map.getCanvas(), context: gl, antialias: true } );
      this.renderer.autoClear = false;
    },

    render: ( gl, matrix ) => {
      // 初期表示位置を基準点としてprojection matrixを構成する
      const scale = new THREE.Matrix4().makeScale( 1, 1, -1 );
      const rotation = new THREE.Matrix4().multiplyMatrices(
        new THREE.Matrix4().makeRotationX( -0.5 * Math.PI ),
        new THREE.Matrix4().makeRotationY( Math.PI )
      );
      const cameraTransform = new THREE.Matrix4()
        .multiplyMatrices( scale, rotation )
        .setPosition( modelOrigin.x, modelOrigin.y, modelOrigin.z );
      camera.projectionMatrix = new THREE.Matrix4().fromArray( matrix ).multiply( cameraTransform );

      // const
      //   {_fov, cameraToCenterDistance, _pitch, width, height} = map.transform,
      //   halfFov = _fov / 2,
      //   angle = Math.PI / 2 - _pitch,
      //   topHalfSurfaceDistance = Math.sin(halfFov) * cameraToCenterDistance / Math.sin(angle - halfFov),
      //   furthestDistance = Math.cos(angle) * topHalfSurfaceDistance + cameraToCenterDistance,
      //   nearZ = height / 50,
      //   halfHeight = Math.tan(halfFov) * nearZ,
      //   halfWidth = halfHeight * width / height,
      //
      //   m = new THREE.Matrix4().fromArray(matrix),
      //   l = new THREE.Matrix4()
      //     .makeTranslation(modelOrigin.x, modelOrigin.y, 0)
      //     .scale(new THREE.Vector3(1, -1, 1)),
      //
      //   projectionMatrixI = new THREE.Matrix4();
      //
      // camera.projectionMatrix = new THREE.Matrix4().makePerspective(
      //   -halfWidth, halfWidth, halfHeight, -halfHeight, nearZ, furthestDistance * 1.01);
      // projectionMatrixI.getInverse(camera.projectionMatrix);
      // camera.matrix.getInverse(projectionMatrixI.multiply(m).multiply(l));
      // camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);

      this.renderer.state.reset();
      this.renderer.render( scene, camera );
      map.triggerRepaint();
    }
  };
};

// configuration of the custom layer for a 3D model per the CustomLayerInterface
map.on( 'style.load', () => {
  map.addLayer( createLayer( { id: '3dgram', type: 'custom', renderingMode: '3d' } ), 'waterway-label' );
  set_slider_date( 0 )
} );

const set_slider_date = v => {
  const t = config.DATE_BEGIN + v*config.DATE_PERIOD_MSEC;
  const date = new Date( t );
  document.getElementById( 'current_date' ).textContent = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
};

document.getElementById('slider_date').addEventListener('input', ( e ) => {
  set_slider_date( parseInt( e.target.value, 10 ) );
} );
document.getElementById('blue_button' ).addEventListener('click', () => {
  // 高さを倍にする
  const model = scene.getObjectByName( 'bar0002' );
  const prevzscale = layerAttr[ model.name ].zscale;
  layerAttr[ model.name ].zscale *= 2;
  model.applyMatrix( new THREE.Matrix4().makeScale( 1, layerAttr[ model.name ].zscale / prevzscale, 1 ) );
  map.triggerRepaint();
} );

document.getElementById('green_button' ).addEventListener('click', () => {
  // 色を青にする
  const model = scene.getObjectByName( 'bar0001' );
  layerAttr[ model.name ].color = 0x0000ff;
  model.material.color.setHex( layerAttr[ model.name ].color );
  map.triggerRepaint();
} );
