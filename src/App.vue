<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "@vue/runtime-core";
import {
  animate,
  createArrowGroup,
  createWireSphere,
  initScene,
  resizeScene,
  generateRippleEffect,
  setupPostProcessing,
  setupRaycasting,
  tweenBloom,
  tweenCamera,
  IntersectEmitter,
  tweenObjectPosition,
} from "./utils/three";
import * as THREE from "three";
import { ArrowCollection, Direction } from "./types";
import * as TWEEN from "@tweenjs/tween.js";

const threeContainer = ref<null | HTMLDivElement>(null);
const selectedDirection = ref<null | THREE.Object3D>(null);

interface ExperienceStatePoint {
  cameraPosition: THREE.Vector3;
  isVisited: boolean;
  associatedGroup: THREE.Group
}


// These represent points around our sphere...
// TODO Merrge the experience state points with the arrows
let currentStatePosition = 0
const EXPERIENCE_STATE: ExperienceStatePoint[] = [
  [ 0,  0,  1],
  [ 1,  0,  0],
  [ 0,  0, -1],
  [-1,  0,  0],
].map((position) => <ExperienceStatePoint>({
  cameraPosition: new THREE.Vector3(...position),
  isVisited: false,
}));

const { camera, renderer, scene, controls } = initScene();
const { composer, unrealBloomPass } = setupPostProcessing(
  renderer,
  scene,
  camera
);
const { raycaster, pointer } = setupRaycasting();

// We use this to see which object is intersected at a given time
const intersectEmitter = new IntersectEmitter();

const changeOrientation = () => {
  if (!selectedDirection.value) {
    // Don't do anything if nothing is selected :)
    return;
  }

  // If arrow is right, increment state, if arrow is left, decrement
  switch (selectedDirection.value.userData.direction) {
    case 'left':
      if (currentStatePosition === 0) {
        currentStatePosition = 3
      break;
      }
      currentStatePosition--
      break;
    case 'right': 
    if (currentStatePosition === 3) {
      currentStatePosition = 0
      break;
    }
    currentStatePosition++
    break;
    default:
      break;
  }
const cameraDestination = EXPERIENCE_STATE[currentStatePosition].cameraPosition
  tweenCamera(camera, cameraDestination);
};

const onPointerMove = (e: PointerEvent) => {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
};
const onResizeScreen = () => resizeScene(renderer, camera);

const { sphere, geometry } = createWireSphere();
scene.add(sphere);
// Setup arrayBuffers for wobbliness
const bufferGeometryCount = geometry.attributes.position.count;
const positionClone = Array.from(geometry.attributes.position.array);
const normalsClone = Array.from(geometry.attributes.normal.array);
const damping = 0.002;

// Set up dev bounding box & Axes
if (import.meta.env.MODE === "development") {
  const boundingSphere = new THREE.SphereGeometry();
  const object = new THREE.Mesh(
    boundingSphere,
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );

  const box = new THREE.BoxHelper(object, 0xffff00);
  scene.add(box);

  const axesHelper = new THREE.AxesHelper(1);
  scene.add(axesHelper);
}

onMounted(async () => {
  if (threeContainer.value === null) {
    return;
  } else {
    threeContainer.value.appendChild(renderer.domElement);
  }

  const allArrows: ArrowCollection[] = [
    // Front
    [[0, 0, 0.6], ["right", "left"], [0]],
    // Left
    [[0, 0, 0.6], ["right", "left"], [90]],
    // Right
    [[0, 0, 0.6], ["right", "left"], [180]],
    // Back
    [[0, 0, 0.6], ["right", "left"], [270]],
  ];

  const arrowGroups = await Promise.all(
    allArrows.map((arrowCollection) => createArrowGroup(arrowCollection))
  );
  arrowGroups.forEach((arrowGroup, i) => {
    // EXPERIENCE_STATE[i].associatedGroup = arrowGroup
    scene.add(arrowGroup)
    });
  const arrowUuids = arrowGroups.flatMap((group) =>
    group.children.map((child) => child.uuid)
  );

  if (import.meta.env.MODE === "production") {
    // Define initial camera starting point
    camera.position.z = 10;
    // Our dramatic zoom in...
    tweenCamera(camera, { z: 1 });

    // This tones down our bloom as the camera zooms in.
    unrealBloomPass.strength = 3;
    unrealBloomPass.radius = 2;
    unrealBloomPass.threshold = 0.5;
    tweenBloom(unrealBloomPass, { strength: 0.85, radius: 0, threshold: 0.5 });
  }

  // Use this to manage our tweens between different arrows
  const tweenState: Record<
    string,
    TWEEN.Tween<{ x?: number; y?: number; z?: number }>
  > = {};

  // Handle mouseovers
  intersectEmitter.on("mouseout", (object) => {
    selectedDirection.value = null;
    if (object.parent.type === "Group") {
      object = object.parent as THREE.Group;
    }

    if (tweenState[object.uuid]) {
      tweenState[object.uuid].stop();
      delete tweenState[object.uuid];
    }

    tweenObjectPosition(tweenState, object, { x: 0 });
    object.material.emissive.setHex(0xff8f13);
  });
  intersectEmitter.on("mousein", (object) => {
    if (object.geometry.type === "SphereGeometry") {
      // We will never want to interact with our sphere
      return;
    }

    // We grab the parent of the arrows i.e. the group
    if (object.parent.type === "Group") {
      object = object.parent as THREE.Group;
    }

    // The parent group of our intersected mesh contains the user data
    selectedDirection.value = object

    if (tweenState[object.uuid]) {
      tweenState[object.uuid].stop();
      delete tweenState[object.uuid];
    }

    const highlightedPosition = { x: 0 };
    switch (selectedDirection.value?.userData.direction) {
      case "right":
        highlightedPosition.x = 0.04;
        break;
      case "left":
        highlightedPosition.x = -0.04;
        break;
      default:
        break;
    }
    tweenObjectPosition(tweenState, object, highlightedPosition);
    object.material.emissive.setHex(0xbbbb77);
  });

  renderer.setAnimationLoop((time: number) => {
    // Ensure we have the nice waveyness
    const now = Date.now() * 0.005;
    generateRippleEffect(
      now,
      bufferGeometryCount,
      geometry,
      damping,
      positionClone,
      normalsClone
    );

    // Slowly move the camera around to give some life...
    camera.translateZ(Math.sin(time * 0.001) * 0.0005);

    // Raycasting
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    // For some reason typescript does not want to
    // recognize the material attribute so we cast this to any.
    const intersects: any = raycaster.intersectObjects(scene.children, true);
    // findIntersects(intersects, lastIntersected)
    intersectEmitter.findIntersects(intersects);

    return animate(time, composer);
  });

  addEventListener("resize", onResizeScreen);
  addEventListener("pointermove", onPointerMove);
});

onUnmounted(() => {
  removeEventListener("resize", onResizeScreen);
  removeEventListener("pointermove", onPointerMove);
});
</script>

<template>
  <div @click="changeOrientation" ref="threeContainer"></div>
</template>

<style lang="scss"></style>
