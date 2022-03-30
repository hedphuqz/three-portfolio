import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import * as TWEEN from "@tweenjs/tween.js";

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
  controls.rotateSpeed = 1;
  controls.zoomSpeed = 0.4;
  controls.minDistance = 0.6;

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

export const tweenCamera = (
  camera: THREE.Camera,
  controls: OrbitControls,
  coords: { x?: number; y?: number; z?: number }
) => {
  coords.x = coords.x ? coords.x : camera.position.x;
  coords.y = coords.y ? coords.y : camera.position.y;
  coords.z = coords.z ? coords.z : camera.position.z;

  console.log(coords)
  new TWEEN.Tween(camera.position)
    .to(coords, 10000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();

};

export const animate = (
  time: number,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bokehPass = new BokehPass(scene, camera, { focus: 0.5 });
  composer.addPass(bokehPass);

  TWEEN.update(time)
  composer.render();
};
