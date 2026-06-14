import * as THREE from 'three';
import { createRoadTexture, extractRoadFromReference } from './textureUtils';

const REF_PATH = '/assets/combat/wasteland-ref.png';

export class WastelandEnvironment {
  readonly world: THREE.Group;
  private refTexture: THREE.Texture | null = null;
  private roadTex: THREE.CanvasTexture;
  private floorMesh: THREE.Mesh | null = null;
  private scrollZ = 0;
  private readonly loader = new THREE.TextureLoader();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.world = new THREE.Group();
    scene.add(this.world);

    scene.background = new THREE.Color(0xc2d0de);
    scene.fog = new THREE.Fog(0xc2d0de, 70, 240);

    this.roadTex = createRoadTexture();

    const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x6a4020, 0.7);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0d8, 1.55);
    sun.position.set(-35, 55, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.bias = -0.0002;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0xaaccff, 0.3);
    rim.position.set(20, 15, -30);
    scene.add(rim);

    this.buildFullVista(camera);
    this.buildScrollFloor();
    this.buildOverheadGantries();
  }

  /** 参考图全屏 vista — 按相机视锥 1:1 铺满 */
  private buildFullVista(camera: THREE.PerspectiveCamera): void {
    const dist = 72;
    const vFOV = (camera.fov * Math.PI) / 180;
    const viewH = 2 * Math.tan(vFOV / 2) * dist;
    const viewW = viewH * camera.aspect;

    this.loader.load(REF_PATH, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.refTexture = tex;

      const roadFromRef = extractRoadFromReference(tex.image as HTMLImageElement);
      if (roadFromRef) {
        this.roadTex.dispose();
        this.roadTex = roadFromRef;
        this.roadTex.wrapS = THREE.RepeatWrapping;
        this.roadTex.wrapT = THREE.RepeatWrapping;
        this.roadTex.repeat.set(1, 12);
        if (this.floorMesh) {
          (this.floorMesh.material as THREE.MeshStandardMaterial).map = this.roadTex;
          (this.floorMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }
      }

      const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false });
      const vista = new THREE.Mesh(new THREE.PlaneGeometry(viewW * 1.08, viewH * 1.08), mat);
      vista.position.set(0, camera.position.y + 0.05, camera.position.z - dist);
      vista.renderOrder = -20;
      this.world.add(vista);
    });
  }

  /** 近景滚动路面 — 与 vista 路面纹理衔接 */
  private buildScrollFloor(): void {
    const mat = new THREE.MeshStandardMaterial({
      map: this.roadTex,
      roughness: 0.96,
      metalness: 0.02,
      color: 0xffffff,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 160), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, -55);
    floor.receiveShadow = true;
    this.floorMesh = floor;
    this.world.add(floor);
  }

  /** 参考图上的橙色龙门架 */
  private buildOverheadGantries(): void {
    const rust = new THREE.MeshStandardMaterial({
      color: 0xc05828,
      roughness: 0.75,
      metalness: 0.5,
    });
    const white = new THREE.MeshStandardMaterial({
      color: 0xf0f2f5,
      roughness: 0.78,
      metalness: 0.06,
    });

    for (const z of [-18, -38, -58]) {
      const g = this.buildGantry(rust, white);
      g.position.set(0, 0, z);
      g.scale.setScalar(0.95 + Math.abs(z) * 0.002);
      this.world.add(g);
    }
  }

  private buildGantry(rust: THREE.MeshStandardMaterial, white: THREE.MeshStandardMaterial): THREE.Group {
    const g = new THREE.Group();
    const h = 13;
    for (const x of [-6.5, 6.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.85, h, 0.85), rust);
      leg.position.set(x, h / 2, 0);
      leg.castShadow = true;
      g.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 1.1), rust);
    beam.position.set(0, h, 0);
    g.add(beam);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h - 1.2, 12), white);
    piston.position.set(0, (h - 1.2) / 2 + 0.4, 0);
    g.add(piston);
    for (const s of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.28, h * 0.72, 0.28), white);
      brace.position.set(s * 3, h * 0.36, 0.2);
      brace.rotation.z = s * 0.3;
      g.add(brace);
    }
    return g;
  }

  update(delta: number, scrollSpeed: number): void {
    this.scrollZ += scrollSpeed * delta;
    this.roadTex.offset.y = this.scrollZ * 0.04;
  }

  dispose(): void {
    this.roadTex.dispose();
    this.refTexture?.dispose();
    this.world.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m: THREE.Material) => m.dispose());
      }
    });
  }
}

export const LANE_X = [-2.8, 0, 2.8] as const;
export const PLAYER_Z = 8;
export const SPAWN_Z = -75;

/** 战斗主角立绘 — 按参考图屏幕比例定位（仅玩家，不影响敌人逻辑） */
export const COMBAT_PLAYER = {
  /** 立绘高度占屏高比例（参考图约 28–30%） */
  heightScreenRatio: 0.29,
  /** 脚底距屏幕底边比例（参考图约 3–5%） */
  feetScreenRatio: 0.042,
  /** 立绘宽/高（背面全身约 20% / 29%） */
  aspect: 0.69,
} as const;

const _footProj = new THREE.Vector3();

export function billboardScale(z: number, cameraZ: number): number {
  const dist = Math.max(5, cameraZ - z);
  const refDist = 42;
  return refDist / dist;
}

/** 将世界坐标 (x,?,z) 的 Y 二分对齐到屏幕底部指定比例处（用于脚底锚点） */
export function worldYForScreenFooting(
  camera: THREE.PerspectiveCamera,
  x: number,
  z: number,
  feetFromBottom: number,
): number {
  camera.updateMatrixWorld(true);
  const targetNdcY = feetFromBottom * 2 - 1;
  let lo = -4;
  let hi = 12;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) * 0.5;
    _footProj.set(x, mid, z);
    _footProj.project(camera);
    if (_footProj.y > targetNdcY) hi = mid;
    else lo = mid;
  }
  return (lo + hi) * 0.5;
}

/** 按参考图比例计算玩家 billboard 世界尺寸与位置（每帧随窗口比例更新） */
export function getPlayerCombatLayout(
  camera: THREE.PerspectiveCamera,
  lane: number,
  z: number = PLAYER_Z,
): { x: number; y: number; scaleW: number; scaleH: number } {
  const camZ = camera.position.z;
  const dist = Math.max(5, camZ - z);
  const vFOV = (camera.fov * Math.PI) / 180;
  const viewH = 2 * Math.tan(vFOV / 2) * dist;
  const scaleH = viewH * COMBAT_PLAYER.heightScreenRatio;
  const scaleW = scaleH * COMBAT_PLAYER.aspect;
  const x = LANE_X[lane];
  const y = worldYForScreenFooting(camera, x, z, COMBAT_PLAYER.feetScreenRatio);
  return { x, y, scaleW, scaleH };
}

export function roadY(z: number, cameraZ: number): number {
  const t = Math.min(1, Math.max(0, (cameraZ - z) / 105));
  return 0.1 + t * 0.42;
}

/** 追背俯视镜头 — 拉远以看清道路，近大远小透视 */
export function setupCombatCamera(camera: THREE.PerspectiveCamera): void {
  camera.fov = 68;
  camera.near = 0.1;
  camera.far = 280;
  camera.position.set(0, 7.5, 32);
  camera.lookAt(0, 0.2, -75);
  camera.updateProjectionMatrix();
}
