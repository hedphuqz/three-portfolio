import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as TWEEN from "@tweenjs/tween.js";
import arrowModel from '../assets/arrow.json'
import {ArrowCollection, Direction} from '../types'
import { generateUUID } from "three/src/math/MathUtils";

// Because we need to pass our LastIntersected in as a reference,
// we need to create a class to maintain a memory pointer.
export class LastIntersected {
  value: any;
  constructor() {
    this.value = null
  }
}

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


export const findIntersects = (intersects: any, lastIntersected: LastIntersected) => {
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;

    if (intersectedObject.geometry.type === 'SphereGeometry') {
      if (lastIntersected.value === null) {
          // Ensure that once we've set the hex we don't try to reset it
          return
        }
        // Set intersects to null when we move the pointer to our sphere.
        lastIntersected?.value?.material?.emissive?.setHex(lastIntersected.value.originalHex);
        lastIntersected.value = null;
  
        return
      }


    if (intersectedObject?.material?.emissive) {
      // Only work with emissives


      if (lastIntersected.value === null) {
        // Populate our lastIntersected and assign old hex
        lastIntersected.value = intersectedObject;
          lastIntersected.value.originalHex =
            lastIntersected.value.material.emissive.getHex();
          intersectedObject.material.emissive.setHex(0xbbbb77);
      }


      if (lastIntersected.value.uuid != intersectedObject.uuid) {
        // Update lastIntersected so we have a reference to the object
        lastIntersected.value.material.emissive.setHex(lastIntersected.value.originalHex);

        lastIntersected.value = intersectedObject;
          // Exclude our sphere
          lastIntersected.value.originalHex =
            lastIntersected.value.material.emissive.getHex();
          intersectedObject.material.emissive.setHex(0xbbbb77);
      }


    }


  } else {
    // If no intersect, simply apply old color and skip
    if (lastIntersected.value) {
      lastIntersected.value.material.emissive.setHex(lastIntersected.value.originalHex);
      lastIntersected.value = null;
    }
  }
}

const adjustPosition = (position: THREE.Vector3, adjustment: THREE.Vector3) => position.add(adjustment).toArray()

export const createArrow = async (direction: Direction, principalPosition: THREE.Vector3Tuple) => {
  const arrowJsonBase64 = window.btoa(JSON.stringify(arrowModel)) // required so we can directly import the json
  const arrowMaterial = new THREE.MeshStandardMaterial({color: 0xff8f13,  emissive: 0xff8f13})
  const arrow = await new Promise<THREE.Object3D>((resolve, reject) => {
    const loader = new THREE.ObjectLoader()
    loader.load(`data:application/json;base64,${arrowJsonBase64}`,
      resolve,
      () => { },
      reject
    )
  })

  arrow.position.set(...principalPosition)

  if (direction === 'up') {
    arrow.userData['direction'] = 'up'
    arrow.rotateZ(0)
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(0, 0.01, 0))
    arrow.position.set(...adjustedPosition)
  }

  if (direction === 'right') {
    arrow.userData['direction'] = 'right'
    arrow.rotateZ(90 * (Math.PI / 180))
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(-0.01, 0, 0))
    arrow.position.set(...adjustedPosition)

  }

  if (direction === 'down') {
    arrow.userData['direction'] = 'down'
    arrow.rotateZ(180 * (Math.PI / 180))
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(0, -0.01, 0))
    arrow.position.set(...adjustedPosition)

  }

  if (direction === 'left') {
    arrow.userData['direction'] = 'left'
    arrow.rotateZ(270 * (Math.PI / 180))
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(0.01, 0, 0))
    arrow.position.set(...adjustedPosition)

  }

  
  // Had to cast nodes to any to set material... :( 
  arrow.traverse(function (node: any) {
    node.material = arrowMaterial
  })
  
  return arrow  
}

export const createArrowGroup = async (arrows: ArrowCollection) => {
  const group = new THREE.Group()
  
  const [position, directions, [rotation]] = arrows
  const arrowModels = await Promise.all(directions.map(direction => createArrow(direction, position)))

  arrowModels.forEach(model => {
    model.uuid = generateUUID()
    group.add(model)
  })
  group.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotation * (Math.PI / 180))
  return group
}

export const tweenCamera = (
  camera: THREE.Camera,
  coords: { x?: number; y?: number; z?: number }
) => {
  coords.x = coords.x ?? camera.position.x;
  coords.y = coords.y ?? camera.position.y;
  coords.z = coords.z ?? camera.position.z;

  new TWEEN.Tween(camera.position)
    .to(coords, 10000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();

};

export const tweenBloom = (
  unrealBloomPass: UnrealBloomPass,
  desiredBloomState: {strength?: number, radius?: number, threshold?: number}
) => {
  desiredBloomState.strength = desiredBloomState.strength ?? unrealBloomPass.strength;
  desiredBloomState.radius = desiredBloomState.radius ?? unrealBloomPass.radius;
  desiredBloomState.threshold = desiredBloomState.threshold ?? unrealBloomPass.threshold;

  new TWEEN.Tween(unrealBloomPass)
    .to(desiredBloomState, 15000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();
}

export const setupRaycasting = () => ({raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2()})

export const setupPostProcessing = (renderer:  THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {

  const composer = new EffectComposer(renderer);
  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  
  const unrealBloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85, 0, 0.5)
  composer.addPass(unrealBloomPass)

  return {composer, unrealBloomPass}
}

export const generateRippleEffect = (
  now: number, 
  bufferGeometryCount: number, 
  geometry: THREE.SphereGeometry, 
  damping: number, 
  positionClone: number[],
  normalsClone: number[]
) => {
  for (let i = 0; i < bufferGeometryCount; i++) {
    const uX  = geometry.attributes.uv.getX(i) * Math.PI * 16
    const uY  = geometry.attributes.uv.getY(i) * Math.PI * 16

    const xAngle = uX + now
    const xSin = Math.sin(xAngle) * damping
    const yAngle = uY + now
    const yCos = Math.cos(yAngle) * damping


    // Indeces used to address position / normals clones
    const iX = i * 3
    const iY = i * 3 + 1
    const iZ = i * 3 + 2

    geometry.attributes.position.setX(i, positionClone[iX] + normalsClone[iX] * (xSin + yCos))
    geometry.attributes.position.setY(i, positionClone[iY] + normalsClone[iY] * (xSin + yCos))
    geometry.attributes.position.setZ(i, positionClone[iZ] + normalsClone[iZ] * (xSin + yCos))

  }

  geometry.attributes.position.needsUpdate = true


}

export const animate = (
  time: number,
  renderer: EffectComposer
) => {

  TWEEN.update(time)
  renderer.render();
};
