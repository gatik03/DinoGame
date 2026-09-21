'use strict';

class NeonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.host = canvas.parentElement;
    this.scene = null;
    this.playerMesh = null;
    this.obstacleMeshes = new Map();
    this.enabled = false;
    this.modelLoader = null;
    this.playerMixer = null;
    this.playerActions = new Map();
    this.activeAnimation = '';
    this.debug = typeof window !== 'undefined' &&
      (new URLSearchParams(window.location?.search || '')).has('debug');
    this.debugMeshes = new Map();
    this.debugLabel = null;

    const THREE = window.THREE;
    if (!THREE || !this._supportsWebGL(THREE)) return;
    try {
      this.scene = new NeonScene(THREE, this.host);
      this.enabled = true;
      this.THREE = THREE;
      this.modelLoader = new NeonModelLoader();
      this.playerMesh = createNeonFallback(THREE, 'player', 0.28, 0.44);
      this.scene.scene.add(this.playerMesh);
      if (this.debug) {
        this.debugLabel = document.createElement('div');
        this.debugLabel.style.cssText = 'position:absolute;top:6px;left:6px;color:#ffff00;font:11px monospace;line-height:1.25;white-space:pre;z-index:2;pointer-events:none';
        this.host.appendChild(this.debugLabel);
      }
      this._loadPlayerModel();
    } catch (error) {
      console.warn('Three.js renderer unavailable; using Canvas renderer.', error);
      this.scene = null;
    }
  }

  _supportsWebGL(THREE) {
    try {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl') || probe.getContext('experimental-webgl')) &&
        Boolean(THREE.WebGLRenderer);
    } catch (_) {
      return false;
    }
  }

  resize(viewport) {
    if (this.enabled) this.scene.resize(viewport);
  }

  async _loadPlayerModel() {
    try {
      const result = await this.modelLoader.load('/assets/models/player.glb');
      this.scene.scene.remove(this.playerMesh);
      this.playerMesh = result.scene;
      this.scene.scene.add(this.playerMesh);
      if (result.animations?.length) {
        this.playerMixer = new this.THREE.AnimationMixer(this.playerMesh);
        for (const clip of result.animations) {
          this.playerActions.set(clip.name.toLowerCase(), this.playerMixer.clipAction(clip));
        }
      }
    } catch (error) {
      // Procedural fallback remains active when assets or the loader are not
      // available, so asset delivery never blocks gameplay.
      console.info('Using procedural player model fallback.', error?.message || error);
    }
  }

  _syncMesh(mesh, x, y, width, height) {
    const point = gameplayToWorld(x, y);
    mesh.position.set(point.x, point.y, point.z);
    mesh.scale.set(width / (width || 1), height / (height || 1), 1);
  }

  render(state) {
    if (!this.enabled) return;
    const player = state.player;
    this._syncMesh(this.playerMesh, player.x, player.y, player.width, player.height);
    const animation = playerStateToAnimation(player.state);
    this.playerMesh.userData.animation = animation;
    if (this.playerMixer && animation !== this.activeAnimation) {
      this.playerActions.get(animation)?.reset().fadeIn(0.08).play();
      this.activeAnimation = animation;
    }
    this.playerMixer?.update(1 / 60);
    this.playerMesh.visible = state.gameState !== 'menu' && state.gameState !== 'gameover';
    this.playerMesh.scale.y = player.state === 'sliding' ? 0.5 : 1;
    if (this.debugLabel) {
      const playerPoint = gameplayToWorld(player.x, player.y);
      const camera = this.scene.camera;
      const rect = this.canvas.getBoundingClientRect();
      const firstObstacle = state.obstacles[0];
      const obstaclePoint = firstObstacle
        ? gameplayToWorld(firstObstacle.x + firstObstacle.width / 2, firstObstacle.y + firstObstacle.height)
        : null;
      this.debugLabel.textContent = [
        'RENDER DEBUG',
        `GAME logical: ${CONFIG.CANVAS.WIDTH}x${CONFIG.CANVAS.HEIGHT}  GROUND_Y: ${CONFIG.CANVAS.GROUND_Y}`,
        `PLAYER x: ${player.x.toFixed(1)} y: ${player.y.toFixed(1)} w: ${player.width} h: ${player.height} bottom: ${(player.y).toFixed(1)}`,
        `CANVAS topY: ${(player.y - player.height).toFixed(1)} feetY: ${player.y.toFixed(1)} renderer: ${this.enabled ? 'hidden (Three overlay)' : 'Canvas'}`,
        `THREE world: ${playerPoint.x.toFixed(3)}, ${playerPoint.y.toFixed(3)}, ${playerPoint.z.toFixed(3)} renderer: ${this.enabled ? 'Three.js' : 'inactive'}`,
        firstObstacle
          ? `OBSTACLE logical y: ${firstObstacle.y.toFixed(1)} h: ${firstObstacle.height} worldY: ${obstaclePoint.y.toFixed(3)}`
          : 'OBSTACLE none',
        `CAMERA l/r/t/b: ${camera.left} / ${camera.right} / ${camera.top} / ${camera.bottom}`,
        `CAMERA position: ${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)}`,
        `VIEWPORT css: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} dpr: ${window.devicePixelRatio || 1}`,
      ].join('\n');
    }
    this._syncDebugBox('player', this.playerMesh, player.width, player.height, player.x, player.y);

    const seen = new Set();
    for (const [index, obstacle] of state.obstacles.entries()) {
      // Laser barriers have a gameplay gap. Keep their authoritative Canvas
      // rendering visible instead of replacing the gap with a solid box.
      if (obstacle.type === 'laser') continue;
      const id = obstacle.id || index;
      seen.add(id);
      let mesh = this.obstacleMeshes.get(id);
      if (!mesh) {
        mesh = createNeonFallback(
          this.THREE,
          'obstacle',
          obstacle.width * window.NEON_WORLD_SCALE,
          obstacle.height * window.NEON_WORLD_SCALE,
        );
        this.obstacleMeshes.set(id, mesh);
        this.scene.scene.add(mesh);
      }
      // Obstacles use a top-left gameplay coordinate; the fallback mesh is
      // baseline-anchored just like the player mesh.
      this._syncMesh(
        mesh,
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height,
        obstacle.width,
        obstacle.height,
      );
      mesh.visible = state.gameState !== 'menu' && state.gameState !== 'gameover';
      this._syncDebugBox(id, mesh, obstacle.width, obstacle.height,
        obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height);
    }
    for (const [id, mesh] of this.obstacleMeshes) {
      if (!seen.has(id)) {
        this.scene.scene.remove(mesh);
        mesh.geometry?.dispose?.();
        this.obstacleMeshes.delete(id);
        this._removeDebugBox(id);
      }
    }
    this.scene.render();
  }

  _syncDebugBox(id, mesh, width, height, x, y) {
    if (!this.debug) return;
    let box = this.debugMeshes.get(id);
    if (!box) {
      const geometry = new this.THREE.BoxGeometry(
        width * window.NEON_WORLD_SCALE,
        height * window.NEON_WORLD_SCALE,
        0.03,
      );
      box = new this.THREE.LineSegments(
        new this.THREE.EdgesGeometry(geometry),
        new this.THREE.LineBasicMaterial({ color: 0xffff00 }),
      );
      this.debugMeshes.set(id, box);
      this.scene.scene.add(box);
    }
    const point = gameplayToWorld(x, y);
    box.position.set(point.x, point.y + height * window.NEON_WORLD_SCALE / 2, 0.2);
    box.visible = mesh.visible;
  }

  _removeDebugBox(id) {
    const box = this.debugMeshes.get(id);
    if (!box) return;
    this.scene.scene.remove(box);
    box.geometry.dispose();
    box.material.dispose();
    this.debugMeshes.delete(id);
  }
}

window.NeonRenderer = NeonRenderer;
