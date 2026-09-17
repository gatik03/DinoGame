'use strict';

class NeonScene {
  constructor(THREE, host) {
    this.THREE = THREE;
    this.host = host;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 9, 0, -3, 0.1, 100);
    this.camera.position.set(4.5, -1.5, 10);
    this.camera.lookAt(4.5, -1.5, 0);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.id = 'three-layer';
    this.renderer.domElement.style.pointerEvents = 'none';
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0x6688aa, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(4, 5, 8);
    this.scene.add(light);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.65 }),
    );
    ground.position.set(4.5, -2.52, 0);
    this.scene.add(ground);
    this.resize(900, 300);
  }

  resize(width, height) {
    const scale = window.NEON_WORLD_SCALE || 0.01;
    this.camera.left = 0;
    this.camera.right = width * scale;
    this.camera.top = 0;
    this.camera.bottom = -height * scale;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

window.NeonScene = NeonScene;
