'use strict';

class NeonScene {
  constructor(THREE, host) {
    this.THREE = THREE;
    this.host = host;
    this.scene = new THREE.Scene();
    // The frustum is the logical world: x=0/y=0 is its top-left corner.
    // Keep the camera at that same origin so it adds no gameplay translation.
    this.camera = new THREE.OrthographicCamera(0, 9, 0, -3, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
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

    const scale = window.NEON_WORLD_SCALE || 0.01;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.65 }),
    );
    ground.position.set(
      CONFIG.CANVAS.WIDTH * scale / 2,
      gameplayToWorld(0, CONFIG.CANVAS.GROUND_Y).y,
      0,
    );
    this.scene.add(ground);
    this.resize({
      logicalWidth: CONFIG.CANVAS.WIDTH,
      logicalHeight: CONFIG.CANVAS.HEIGHT,
      width: CONFIG.CANVAS.WIDTH,
      height: CONFIG.CANVAS.HEIGHT,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
  }

  resize(viewport) {
    const scale = window.NEON_WORLD_SCALE || 0.01;
    const { logicalWidth, logicalHeight, width, height, dpr } = viewport;
    this.camera.left = 0;
    this.camera.right = logicalWidth * scale;
    this.camera.top = 0;
    this.camera.bottom = -logicalHeight * scale;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(logicalWidth, logicalHeight, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

window.NeonScene = NeonScene;
