import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as TWEEN from "@tweenjs/tween.js";
import arrowModel from '../assets/arrow.json'
import {ArrowCollection, Direction} from '../types'
import { generateUUID } from "three/src/math/MathUtils";
import EventEmitter from "events";

const ORIGIN = new THREE.Vector3(0,0,0)

export  declare interface IntersectEmitter {
  on(event: 'mouseout', listener: (object: any) => void): this;
  on(event: 'mousein', listener: (object: any) => void): this;
}

export class IntersectEmitter extends EventEmitter {
  lastIntersected: any;
  constructor() {
    super()
    this.lastIntersected = null
  }

findIntersects(intersects: any) {
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;

    if (this.lastIntersected === null) {
      // Mouse moves over object, intersect detected
      // after absence.
      this.lastIntersected = intersectedObject
      this.emit('mousein', intersectedObject)
    }
    

    if (this.lastIntersected.uuid !== intersectedObject.uuid) {
        // pointer has moved onto a new object now so we need to trriger
      // mouseout and mousein
      this.emit('mouseout', this.lastIntersected)
      this.lastIntersected = intersectedObject
      this.emit('mousein', this.lastIntersected)
      }
  } else {
    // If no intersect, simple emit mouseout and move on
    if (this.lastIntersected) {
      this.emit('mouseout', this.lastIntersected)
      this.lastIntersected = null;
    }
  }
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
  controls.enableRotate = false
  controls.enablePan = false

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
    arrow.rotateZ(270 * (Math.PI / 180))
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(0.01, 0, 0))
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
    arrow.rotateZ(90 * (Math.PI / 180))
    const adjustedPosition = adjustPosition(arrow.position, new THREE.Vector3(-0.01, 0, 0))
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

export const tweenObjectPosition = (
  tweenState: Record<string, TWEEN.Tween<{ x?: number; y?: number; z?: number }>>,
  object: THREE.Group | THREE.Object3D,
  coords: { x?: number; y?: number; z?: number }
) => {
  coords.x = coords.x ?? object.position.x;
  coords.y = coords.y ?? object.position.y;
  coords.z = coords.z ?? object.position.z;

  const tween = new TWEEN.Tween(object.position)
    .to(coords, 1000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start();

  tweenState[object.uuid] = tween
  

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
    .onUpdate(() => camera.lookAt(ORIGIN))
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
