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
  findIntersects,
  LastIntersected,
} from "./utils/three";
import * as THREE from "three";
import { ArrowCollection, Direction } from "./types";
import { Material } from "three";

const threeContainer = ref<null | HTMLDivElement>(null);
const { camera, renderer, scene, controls } = initScene();
const { composer, unrealBloomPass } = setupPostProcessing(
  renderer,
  scene,
  camera
);
const { raycaster, pointer } = setupRaycasting();

// We use this to see which object is intersected at a given time
const lastIntersected: LastIntersected = new LastIntersected();

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
  // scene.add(box);

  const axesHelper = new THREE.AxesHelper(1);
  // scene.add(axesHelper);
}

onMounted(async () => {
  if (threeContainer.value === null) {
    return;
  } else {
    threeContainer.value.appendChild(renderer.domElement);
  }

  const allArrows: ArrowCollection[] = [
    //  Front
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
  arrowGroups.forEach((arrowGroup) => scene.add(arrowGroup));
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
    findIntersects(intersects, lastIntersected)
    

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
  <div ref="threeContainer"></div>
</template>

<style lang="scss"></style>
