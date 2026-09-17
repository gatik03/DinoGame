import * as THREE from '/vendor/three/build/three.module.js';

// Keep the existing classic-script game modules unchanged while exposing the
// locally installed Three.js runtime to the optional renderer adapter.
window.THREE = THREE;
