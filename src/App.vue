<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "@vue/runtime-core";
import {
  animate,
  createWireSphere,
  initScene,
  resizeScene,
  tweenCamera,
} from "./utils/three";
import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const threeContainer = ref<null | HTMLDivElement>(null);
const { camera, renderer, scene, controls } = initScene();
const onResizeScreen = () => resizeScene(renderer, camera)


const {sphere, geometry} = createWireSphere();
scene.add(sphere);

// Setup arrayBuffers for wobbliness
const bufferGeometryCount =  geometry.attributes.position.count
const positionClone =  Array.from(geometry.attributes.position.array)
const normalsClone = Array.from(geometry.attributes.normal.array)
const damping = 0.002;

// Set up dev bounding box
if (process.env.NODE_ENV === 'development') {
  const boundingSphere = new THREE.SphereGeometry();
  const object = new THREE.Mesh( boundingSphere, new THREE.MeshBasicMaterial( {color: 0xff0000}));
  const box = new THREE.BoxHelper( object, 0xffff00 );
  scene.add( box );

}

// Define initial camera starting point
camera.position.z = 8

onMounted(() => {
  if (threeContainer.value === null) {
    return;  
  } else {
    threeContainer.value.appendChild(renderer.domElement);
  }

  // Our dramatic zoom in...
  tweenCamera(camera, controls, {z: 1})

  renderer.setAnimationLoop((time: number) => {

    const now = Date.now() * 0.005

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

    geometry.computeVertexNormals()
    geometry.attributes.position.needsUpdate = true

    // Slowly move the camera around to give some life...
    camera.translateZ(Math.sin(time * 0.001) * 0.0005);
    
    return  animate(time, renderer, scene, camera)
  }
   
  );

  addEventListener("resize", onResizeScreen);
});

onUnmounted(() => {
  removeEventListener("resize", onResizeScreen);
})
</script>

<template>
  <div ref="threeContainer"></div>
</template>

<style lang="scss"></style>
