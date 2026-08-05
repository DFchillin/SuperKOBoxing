import * as THREE from 'three';
import { Config } from '../core/Config.js';
import { FighterSprite } from './FighterSprite.js';

// Builds the 3D ring/venue and owns the two billboard fighters. Pure rendering:
// it reads fighter game-state each frame and never mutates it.
export class RingScene {
  constructor(canvas, fighters) {
    this.fighters = fighters;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setClearColor(Config.render.clearColor, 1);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, Config.render.pixelRatioCap) * Config.render.internalScale,
    );

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(Config.render.clearColor, 8, 22);

    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 3.0, 6.2);
    this.camera.lookAt(0, 1.1, 0);

    this._buildLights();
    this._buildRing();
    this._buildCrowd();

    this.sprites = fighters.map((f) => {
      const s = new FighterSprite(f);
      this.scene.add(s.sprite);
      return s;
    });

    this.resize(canvas.clientWidth || 960, canvas.clientHeight || 540);
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x4a4a66, 1.1));
    const key = new THREE.SpotLight(0xfff4d6, 2.4, 40, Math.PI / 4, 0.5, 1.2);
    key.position.set(0, 12, 4);
    key.target.position.set(0, 0, 0);
    this.scene.add(key, key.target);
    const rim = new THREE.PointLight(0x3366ff, 0.8, 30);
    rim.position.set(-6, 5, -4);
    this.scene.add(rim);
  }

  _buildRing() {
    const H = Config.ring.halfSize + 0.6;

    // Canvas mat.
    const mat = new THREE.Mesh(
      new THREE.BoxGeometry(H * 2, 0.3, H * 2),
      new THREE.MeshStandardMaterial({ color: 0x18314f, roughness: 0.9 }),
    );
    mat.position.y = -0.15;
    this.scene.add(mat);

    // Painted centre ring.
    const centre = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xf0c020, side: THREE.DoubleSide }),
    );
    centre.rotation.x = -Math.PI / 2;
    centre.position.y = 0.011;
    this.scene.add(centre);

    // Apron.
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(H * 2 + 0.8, 0.6, H * 2 + 0.8),
      new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 1 }),
    );
    apron.position.y = -0.5;
    this.scene.add(apron);

    // Corner posts + ropes.
    const postMat = new THREE.MeshStandardMaterial({ color: 0xc02434, roughness: 0.6 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, roughness: 0.5 });
    const corners = [[-H, -H], [H, -H], [H, H], [-H, H]];
    const posts = corners.map(([x, z]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), postMat);
      post.position.set(x, 0.6, z);
      this.scene.add(post);
      return { x, z };
    });
    for (let level = 0; level < 3; level++) {
      const y = 0.45 + level * 0.33;
      for (let i = 0; i < posts.length; i++) {
        const a = posts[i];
        const b = posts[(i + 1) % posts.length];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), ropeMat);
        rope.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
        rope.rotation.z = Math.PI / 2;
        rope.rotation.y = Math.atan2(b.z - a.z, b.x - a.x);
        this.scene.add(rope);
      }
    }
  }

  _buildCrowd() {
    // Cheap arena backdrop: a dark dome with sparse glowing "crowd" points.
    const geo = new THREE.BufferGeometry();
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 9 + Math.random() * 6;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = 1 + Math.random() * 6;
      pos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x8899cc, size: 0.18, sizeAttenuation: true }),
    );
    this.scene.add(points);
    this.crowd = points;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  render(nowMs) {
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const f = s.fighter;
      const y = f.down ? 0.35 : 1.15;
      s.sprite.position.set(f.pos.x, y, f.pos.z);
      s.redraw(nowMs);
    }
    if (this.crowd) this.crowd.rotation.y = Math.sin(nowMs / 4000) * 0.03;
    this.renderer.render(this.scene, this.camera);
  }
}
