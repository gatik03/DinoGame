'use strict';

function createNeonFallback(THREE, kind, width, height) {
  const color = kind === 'player' ? 0x00e5ff : 0xff0044;
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.28), material);
  body.position.y = height / 2;
  group.add(body);

  if (kind === 'player') {
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.65, height * 0.12, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff00ff }),
    );
    visor.position.set(0, height * 0.28, -0.18);
    group.add(visor);
  }
  return group;
}

window.createNeonFallback = createNeonFallback;
