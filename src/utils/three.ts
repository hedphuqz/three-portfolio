import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as TWEEN from "@tweenjs/tween.js";

type Direction = 'left' | 'right' | 'down' | 'up'

export const initScene = () => {
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.z = 1;

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.2;
  controls.enableZoom = false
  controls.rotateSpeed = 1

  return { camera, scene, renderer, controls };
};

export const resizeScene = (
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
) => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

export const createWireSphere = () => {
  const geometry = new THREE.SphereBufferGeometry(0.5, 32, 32);
  const material = new THREE.MeshLambertMaterial({
    wireframe: true,
    emissive: 0xff8f13,
  });
  const sphere = new THREE.Mesh(geometry, material);
  return { sphere, geometry, material };
};

export const createArrow = async (direction: Direction, position: THREE.Vector3Tuple) => {
  const arrowMaterial = new THREE.MeshStandardMaterial({color: 0xff8f13,  emissive: 0xff8f13})
  const arrow = await new Promise<THREE.Object3D>((resolve, reject) => {
    const loader = new THREE.ObjectLoader()
    loader.load('/arrow.json',
      resolve,
      console.log,
      reject
    )
  })

  arrow.position.set(...position)
  
  // Had to cast nodes to any to set material... :( 
  arrow.traverse(function (node: any) {
    console.log(node)
    node.material = arrowMaterial
  })
  
  return arrow


  
}
  

export const tweenCamera = (
  camera: THREE.Camera,
  coords: { x?: number; y?: number; z?: number }
) => {
  coords.x = coords.x ?? camera.position.x;
  coords.y = coords.y ?? camera.position.y;
  coords.z = coords.z ?? camera.position.z;

  console.log(coords)
  new TWEEN.Tween(camera.position)
    .to(coords, 10000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();

};

export const setupPostProcessing = (renderer:  THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
  const composer = new EffectComposer(renderer);

  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  const unrealBloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85, 0, 0.5)
  composer.addPass(unrealBloomPass)

  return composer
}

export const animate = (
  time: number,
  renderer: EffectComposer
) => {

  TWEEN.update(time)
  renderer.render();
};
