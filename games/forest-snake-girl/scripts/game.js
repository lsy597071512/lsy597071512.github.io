import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { normalizeMeta, ACHIEVEMENTS, RANKS, SHOP_ITEMS, renderAchievementPanel } from "./shared/meta.js";
import { applyI18n, t, getRankName, getAchievementText, getCrystalTierKey } from "./shared/i18n.js";

let scene,camera,renderer,skyboxMesh=null;
let platformModel=null,platformMeshes=[],platformRaycaster=new THREE.Raycaster();
let platformMaterialCache=null;
let platformWalkRadiusX=20,platformWalkRadiusZ=20,platformReady=false,platformTopY=0,platformCollisionModel=null;
let platformCollisionMeshes=[],platformCollisionBox=null,platformCollisionCenterX=0,platformCollisionCenterZ=0;
const _platformDownDir=new THREE.Vector3(0,-1,0),_platformRayOrigin=new THREE.Vector3();

let player,playerFallbackBody=null,playerModel=null,playerMixer=null;
let playerActions={},currentPlayerAnim="",playerHitAnimTimer=0,playerIsDead=false;
let playerTintTargets=[],playerLocatorGroup=null;
let playerHeadUISprite=null,playerHeadUICanvas=null,playerHeadUIContext=null,playerHeadUITexture=null;
let lastHeadUIHp=-1;
let playerSideEffects=[],crystalScorePopups=[],playerBaseColorTexture=null,playerRoughnessTexture=null,playerMetalnessTexture=null,playerNormalTexture=null,playerSpeedColorTexture=null,playerInvincibleColorTexture=null;
let speedTextureActive=false,speedEndTransitionTimer=0;

let playerRadius=.65,clock=new THREE.Clock();
let gameRunning=false,gameOverPending=false,score=0,hp=50,aliveTime=0;
let mysteryHealAvailable=false,mysterySlowTimer=0;
let crystals=[],enemies=[],rocks=[],fruits=[],enemySpawnQueue=[],crystalBursts=[],purpleEnemyPool=[],enemyDeathExplosions=[];
let rockModels=[],rockMaterial=null;
let bossModel=null,bossMaterial=null;
let platformCloudTexture=null,airParticleTexture=null;
let platformAirPointSystem=null,platformAirParticleData=[];
let sandstorms=[],dustParticleTexture=null;
let keys={},moveInput=new THREE.Vector2(0,0),playerMovingThisFrame=false;

let enemySpawnTimer=0,crystalSpawnTimer=0,fruitSpawnTimer=0,purpleEnemySpawnTimer=0,nextPurpleEnemySpawnTime=20;
let invincibleFruitSpawnTimer=0,nextInvincibleFruitSpawnTime=THREE.MathUtils.randFloat(6,8),invincibleTimer=0,invincibleVisualActive=false,invincibleHue=0;
let invincibleTextureActive=false,invincibleEndTransitionTimer=0;
let invincibleAura=null;
let ghostBossSpawnTimer=0;
let speedBuffTimer=0,speedStackLevel=0,damageFlashTimer=0,lowHpWarningTimer=0,knockbackVelocity=new THREE.Vector3(0,0,0);

let isPaused=false,debugCameraMode=false,originalCameraState=null;
let debugCameraTarget=new THREE.Vector3(),debugCameraSpherical=new THREE.Spherical(20,Math.PI/3,Math.PI/4);
let debugCameraSpeed=10,debugSpeedPresets=[3,10,30],debugSpeedIndex=1;
let debugMouseDown=false,debugMouseRight=false,debugPrevMouse=new THREE.Vector2();
let debugHighlightObjects=[],debugHighlightOriginal={},debugSelectedObject=null;
let debugHighlightEnabled=true,debugWireframeEnabled=false;
let debugRaycaster=new THREE.Raycaster();
debugRaycaster.far=200;
let debugCollisionEntities=[],debugCollisionSaved=[];

let audioCtx=null,audioUnlocked=false,bgmTimer=null,bgmStep=0;
let bgmMenu=null,bgmBattle=null,bgmCurrent=null,bgmFadeTimer=null,bgmVolume=.5;
const BGM_MENU_URL="music/jiemian01.mp3",BGM_BATTLE_URL="music/zhandou01.mp3",BGM_FADE_DURATION=1.5;
let meta=null;
let newlyUnlockedAchievements=[];
const _debugParams=new URLSearchParams(location.search);
const DEBUG_ENABLED=["localhost","127.0.0.1","::1"].includes(location.hostname)&&_debugParams.get("debug")==="1";
let _joystickRelease=null;
let _navigatingHome=false;

function releaseJoystickInput(){
  if(typeof _joystickRelease==="function")_joystickRelease();
}
let runUsesDebugCheats=false;

let performanceLevel=1;
let frameTimeHistory=[];
const FIXED_DT=1/60,MAX_FRAME_TIME=.1;
let accumulator=0;
const PERFORMANCE_CHECK_INTERVAL=60;
let performanceCheckCounter=0;

let fps=0,fpsFrameCount=0,fpsLastTime=performance.now();

let playerStatusSprite=null,playerStatusCanvas=null,playerStatusCtx=null,playerStatusTexture=null,playerStatusTimer=0,playerStatusType="";

let _isMobile=false;
let _cachedTier=null;
let _tierCacheScore=-1;
let _tierCacheFrame=0;
let _frameCount=0;
let _prevTierHex=-1;
const _fruitColor0=new THREE.Color(),_fruitColor1=new THREE.Color(),_fruitColor2=new THREE.Color(),_fruitColor3=new THREE.Color();
let _purpleCount=0,_ghostBossCount=0;
let _shadowSkipCounter=0;
let _frustum=new THREE.Frustum(),_frustumProj=new THREE.Matrix4();
let _playerLastY=0,_camLookTarget=new THREE.Vector3();
let bossLoadPromise=null,bossAssetsReady=false;

let _totalLoads=0,_loadedCount=0,_loadPromises=[],_loadStarted=0,_bootWatchdogTimer=null;
function _trackLoad(promise){_totalLoads++;const p=promise.then(()=>{_loadedCount++;_updateLoadingUI();if(_loadedCount>=_totalLoads)_checkAllLoaded()}).catch(()=>{_loadedCount++;_updateLoadingUI();if(_loadedCount>=_totalLoads)_checkAllLoaded()});_loadPromises.push(p);return p}
function _updateLoadingUI(){
  if(!lBar||!lPct)return;
  const pct=_totalLoads?Math.min(98,Math.floor(_loadedCount/_totalLoads*100)):0;
  lBar.style.width=pct+"%";
  lPct.textContent=pct+"％";
}
let _allLoaded=false,_startGameAttempted=false;
function _checkAllLoaded(){
  if(_allLoaded)return;
  if(_loadedCount>=_totalLoads&&_loadStarted&&Date.now()-_loadStarted>200){
    _allLoaded=true;
    onAllLoaded();
  }else if(_loadedCount>=_totalLoads&&_loadStarted){
    setTimeout(_checkAllLoaded,50);
  }
}
function _autoTrackFBX(url,cb){_trackLoad(new Promise(resolve=>{new FBXLoader().load(url,fbx=>{cb(fbx);resolve()},undefined,()=>resolve())}))}
function _hideLoadingScreen(){
  const loading=document.getElementById("loadingScreen");
  if(loading)loading.style.display="none";
}
function _showBootError(message){
  const loading=document.getElementById("loadingScreen");
  const subtitle=document.querySelector("#loadingScreen .l-subtitle");
  if(subtitle)subtitle.textContent=message;
  if(loading)loading.style.display="flex";
}
function safeStartGame(reason="boot"){
  if(gameRunning||gameOverPending)return true;
  if(!_playerAnimsReady){
    ensurePlayerAnimationsReady().then(()=>{if(!gameRunning&&!gameOverPending)safeStartGame(reason)});
    return false;
  }
  window.__bootState={reason,hasPlayer:!!player,hasScene:!!scene,gameRunning,gameOverPending,animsReady:_playerAnimsReady,platformReady};
  try{
    startGame();
    _startGameAttempted=true;
    window.__bootState.started=true;
    if(_bootWatchdogTimer){clearTimeout(_bootWatchdogTimer);_bootWatchdogTimer=null}
    return true;
  }catch(err){
    window.__lastStartGameError=String(err&&(err.stack||err.message)||err);
    window.__bootState.error=window.__lastStartGameError;
    console.error(`startGame error (${reason}):`,err);
    _showBootError(t("game.bootError"));
    return false;
  }
}
function onAllLoaded(){
  warmRenderPipeline().then(()=>{
    if(lBar)lBar.style.width="100%";
    if(lPct)lPct.textContent="100％";
    _hideLoadingScreen();
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{safeStartGame("assets-ready")});
    });
  });
  _totalLoads=0;_loadedCount=0;
}
function warmRenderPipeline(){
  return new Promise(resolve=>{
    if(!renderer||!scene||!camera){resolve();return}
    try{
      if(playerMixer){
        playPlayerAnim("idle",0,true);
        playerMixer.update(1/60);
      }
      renderer.compile(scene,camera);
      renderer.render(scene,camera);
    }catch(err){
      console.warn("warmRenderPipeline:",err);
    }
    requestAnimationFrame(()=>{
      try{renderer.render(scene,camera)}catch(e){}
      window.__bootDiagnostics={
        animsReady:_playerAnimsReady,
        animNames:Object.keys(playerActions),
        platformReady,
        hasPlayerModel:!!playerModel,
        hasPlayerMixer:!!playerMixer,
        hasPlatformMaterial:!!platformMaterialCache
      };
      resolve();
    });
  });
}
function _scheduleBootWatchdog(){
  if(_bootWatchdogTimer)clearTimeout(_bootWatchdogTimer);
  _bootWatchdogTimer=setTimeout(()=>{
    if(gameRunning||gameOverPending)return;
    window.__bootState={reason:"watchdog",hasPlayer:!!player,hasScene:!!scene,gameRunning,gameOverPending,allLoaded:_allLoaded};
    if(!player||!scene){
      _showBootError(t("game.bootError"));
      return;
    }
    _hideLoadingScreen();
    safeStartGame("watchdog");
  },12000);
}

const lBar=document.getElementById("lBar");
const lPct=document.getElementById("lPct");

const shared={geo:{},mat:{}};
const _v3a=new THREE.Vector3(),_v3b=new THREE.Vector3(),_v3c=new THREE.Vector3(),_v3d=new THREE.Vector3(),_v3e=new THREE.Vector3(),_v3f=new THREE.Vector3(),_v3g=new THREE.Vector3(),_v3h=new THREE.Vector3();
const _v2a=new THREE.Vector2(),_v2b=new THREE.Vector2();
const _color=new THREE.Color(),_box=new THREE.Box3(),_size=new THREE.Vector3(),_center=new THREE.Vector3();
const _ab=new THREE.Vector3(),_ac=new THREE.Vector3(),_normal=new THREE.Vector3(),_triCenter=new THREE.Vector3();

function dist2DSq(ax,az,bx,bz){const dx=ax-bx,dz=az-bz;return dx*dx+dz*dz}
function disposeMaterial(material){if(!material)return;if(Array.isArray(material)){material.forEach(disposeMaterial);return}if(material.map)material.map.dispose();material.dispose()}
function disposeSpriteSafe(sprite){if(!sprite||!sprite.material)return;sprite.material.map=null;sprite.material.dispose()}
function disposeObj(obj){if(obj.geometry)obj.geometry.dispose();disposeMaterial(obj.material)}
function disposeGroup(group,parent){parent.remove(group);group.traverse(obj=>disposeObj(obj))}
function releaseRuntimeGroupResources(group){
  if(!group||!group.userData)return;
  const materials=group.userData.disposeMaterials;
  if(Array.isArray(materials))materials.forEach(disposeMaterial);
  else if(materials)disposeMaterial(materials);
  group.userData.disposeMaterials=[];
}
function removeSceneGroup(group){
  if(!group)return;
  releaseRuntimeGroupResources(group);
  scene.remove(group);
}

const worldSize=42,maxHp=50,maxCrystals=120,INITIAL_CRYSTAL_COUNT=80,CRYSTAL_SPAWN_INTERVAL=0.16;
const maxFruits=42,maxSpeedFruits=30,maxHealFruits=12;
const maxPurpleEnemies=12,purpleStartTime=15,basePlayerSpeed=5.0;
const HEAL_AMOUNT=8;
const ENEMY_MAX_DIFFICULTY_TIME=120,MAX_SCENE_ENEMIES=55,ENEMY_INITIAL_COUNT=16;
const ENEMY_STUCK_DESTROY_TIME=2.0,ENEMY_STUCK_MOVE_EPSILON=0.08;
const INVINCIBLE_FRUIT_COUNT=3,INVINCIBLE_FRUIT_LIFE=4.0,INVINCIBLE_DURATION=5.0,INVINCIBLE_SPEED_MULTIPLIER=2.0;
function getScoreMultiplier(){
  const hasSpeed=speedBuffTimer>0;
  const hasInvincible=invincibleTimer>0;
  if(hasSpeed&&hasInvincible)return 2.0;
  if(hasInvincible)return 1.6;
  if(hasSpeed)return 1.2;
  return 1.0;
}
const GHOST_BOSS_SPAWN_INTERVAL=60,GHOST_BOSS_LIFETIME=23,GHOST_BOSS_DAMAGE=13;

const ASSET_VERSION="v2";
function assetUrl(path){return path+"?v="+ASSET_VERSION}

const SKYBOX_TEXTURE_URL=assetUrl("model/tex/skybox_basecolor_01.png");
const PLATFORM_MODEL_URL=assetUrl("model/Sphere001.fbx");
const PLATFORM_COL_MODEL_URL=assetUrl("model/Sphere001_col.FBX");
const PLATFORM_BASECOLOR_TEXTURE_URL=assetUrl("model/tex/Sphere001_BaseColor.png");
const PLATFORM_ROUGHNESS_TEXTURE_URL=assetUrl("model/tex/Sphere001_Roughness.png");
const PLATFORM_NORMAL_TEXTURE_URL=assetUrl("model/tex/Sphere001_Normal.png");
const PLATFORM_EXTRA_SCALE=1.5,PLATFORM_TOP_Y=0;

const OBSTACLE_COLOR=0x9F7448;
const ROCK_NEW_MODEL_URLS=[
  assetUrl("model/rock_new01.FBX"),assetUrl("model/rock_new03.FBX")
];
const SCENE_ROCK_COUNT=8,MOBILE_ROCK_COUNT=8,ROCK_MIN_DISTANCE=.35,ROCK_PLAYER_CLEAR_RADIUS=4.5;

const BOSS_MODEL_URL=assetUrl("model/boss01.fbx");
const BOSS_BASECOLOR_TEXTURE_URL=assetUrl("model/tex/boss01_d.png");
const BOSS_ROUGHNESS_TEXTURE_URL=assetUrl("model/tex/boss01_r.png");
const BOSS_EMISSIVE_TEXTURE_URL=assetUrl("model/tex/boss01_e.png");
const BOSS_MODEL_SCALE=.055;

const PLAYER_MODEL_URL=assetUrl("model/wanjia01.FBX");
const PLAYER_BASE_COLOR_URL=assetUrl("model/tex/wanjia01_basecolor.PNG");
const PLAYER_ROUGHNESS_URL=assetUrl("model/tex/wanjia01_r.png");
const PLAYER_METALNESS_URL=assetUrl("model/tex/wanjia01_m.png");
const PLAYER_NORMAL_MAP_URL=assetUrl("model/tex/wanjia01_normalmap.PNG");
const PLAYER_SPEED_COLOR_URL=assetUrl("model/tex/wanjia01_basecolor_zhuangtai.PNG");
const PLAYER_INVINCIBLE_COLOR_URL=assetUrl("model/tex/wanjia01_basecolor_zhuangtai02.PNG");
const PLAYER_IDLE_ANIM_URL=assetUrl("model/ani/wanjia01_idle.FBX");
const PLAYER_RUN_ANIM_URL=assetUrl("model/ani/wanjia01_run.fbx");
const PLAYER_ATTACKED_ANIM_URL=assetUrl("model/ani/wanjia01_attacked.fbx");
const PLAYER_MODEL_SCALE=.018,PLAYER_MODEL_X_ROTATION=-Math.PI/2,PLAYER_MODEL_Y_ROTATION=0,PLAYER_MODEL_Z_ROTATION=0,PLAYER_TEXTURE_FLIP_Y=true;

const playerNormalColor=0x1689ff,playerDamageColor=0xff3333;

const hudGame=document.getElementById("hudGame");
const warning=document.getElementById("warning");
const damageOverlay=document.getElementById("damageOverlay");
const gameOverScreen=document.getElementById("gameOverScreen");
const tip=document.getElementById("tip");
const startToast=document.getElementById("startToast");
const finalScore=document.getElementById("finalScore");
const finalTime=document.getElementById("finalTime");

function applyGameI18n(){
  applyI18n(document,"game");
  const gameOverLead=document.getElementById("gameOverLead");
  if(gameOverLead&&!gameOverPending)gameOverLead.textContent=t("game.overLead");
  const shopEntryBtn2=document.getElementById("shopEntryBtn2");
  if(shopEntryBtn2)shopEntryBtn2.title=t("game.home");
}

init();

function getRendererBufferSize(){
  const canvas=document.getElementById("game");
  const viewW=Math.max(1,canvas?.clientWidth||window.innerWidth||1);
  const viewH=Math.max(1,canvas?.clientHeight||window.innerHeight||1);
  if(isMobileLayout()){
    const maxW=854,maxH=480;
    const scale=Math.min(1,maxW/viewW,maxH/viewH);
    return {w:Math.max(320,Math.round(viewW*scale)),h:Math.max(180,Math.round(viewH*scale))};
  }
  return {w:1280,h:720};
}
function getMaxAnisotropy(preferred){
  const cap=renderer?.capabilities?.getMaxAnisotropy?.();
  if(!Number.isFinite(cap)||cap<=0)return Math.min(preferred,4);
  return Math.min(preferred,cap);
}
function createWebGLRenderer(canvas){
  const base={
    canvas,
    alpha:false,
    depth:true,
    stencil:false,
    antialias:!_isMobile,
    powerPreference:_isMobile?"default":"high-performance",
    failIfMajorPerformanceCaveat:false,
    preserveDrawingBuffer:false
  };
  let instance=new THREE.WebGLRenderer(base);
  if(!instance.getContext()){
    instance.dispose();
    instance=new THREE.WebGLRenderer({...base,antialias:false,powerPreference:"default"});
  }
  return instance;
}
function setupRendererContextHandlers(canvas){
  if(!canvas||canvas.__webglHandlersBound)return;
  canvas.__webglHandlersBound=true;
  canvas.addEventListener("webglcontextlost",event=>{
    event.preventDefault();
    gameRunning=false;
  },false);
  canvas.addEventListener("webglcontextrestored",()=>{
    if(renderer){
      applyRendererSize();
      applyPerformanceLevel();
    }
    if(!gameRunning&&!gameOverPending&&_allLoaded)safeStartGame("context-restored");
  },false);
}
function beginSceneBoot(){
  const canvas=document.getElementById("game");
  if(!canvas||(canvas.clientWidth<=0&&canvas.clientHeight<=0)){
    requestAnimationFrame(beginSceneBoot);
    return;
  }
  setupRendererContextHandlers(canvas);
  renderer=createWebGLRenderer(canvas);
  applyRendererSize();
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=_isMobile?1.08:1.02;
  renderer.setClearColor(0x050816,1);
  renderer.shadowMap.enabled=!_isMobile;
  renderer.shadowMap.type=THREE.BasicShadowMap;
  applyPerformanceLevel();
  initSharedResources();
  createLights();
  _loadAllAssets();
  forceLandscape();
  animate();
  _scheduleBootWatchdog();
}
function applyRendererSize(){
  if(!renderer||!camera)return;
  const {w,h}=getRendererBufferSize();
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
  applyPerformanceLevel();
  updatePlayerHeadUIScale();
}
function detectHandheldDevice(){
  const ua=navigator.userAgent||"";
  const platform=navigator.platform||"";
  const maxTouchPoints=navigator.maxTouchPoints||0;
  const hasCoarsePointer=window.matchMedia?window.matchMedia("(pointer: coarse)").matches:false;
  const isMobileUA=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isIPadOS=platform==="MacIntel"&&maxTouchPoints>1;
  return isMobileUA||isIPadOS||(hasCoarsePointer&&maxTouchPoints>0&&Math.min(screen.width,screen.height)<=1024);
}
function updateLayoutCache(){
  _isMobile=detectHandheldDevice();
  document.body.classList.toggle("touch-device",_isMobile);
}
function isMobileLayout(){return _isMobile}

function setHUDVisible(visible){
  if(!hudGame)return;
  hudGame.style.display=visible?"flex":"none";
}
let _hudBinds={},_hudValues={};
function setBind(name,value){if(!_hudBinds[name])_hudBinds[name]=document.querySelectorAll(`[data-bind="${name}"]`);if(_hudValues[name]===value)return;_hudValues[name]=value;_hudBinds[name].forEach(el=>el.textContent=value)}

function init(){
  updateLayoutCache();
  applyGameI18n();
  _loadStarted=Date.now();
  meta=loadMeta();
  bgmVolume=meta.bgmVolume||.5;
  setBGMVolume(bgmVolume);
  const bgmVolSlider2=document.getElementById("bgmVolSlider2");
  if(bgmVolSlider2)bgmVolSlider2.value=Math.round(bgmVolume*100);
  function syncVolSliders(val){
    if(bgmVolSlider2)bgmVolSlider2.value=val;
    setBGMVolume(val/100);
    if(meta){meta.bgmVolume=bgmVolume;saveMeta()}
  }
  if(bgmVolSlider2)bgmVolSlider2.oninput=()=>syncVolSliders(bgmVolSlider2.value);

  scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0xa8c0d8,_isMobile? .0006:.001);
  camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,.1,1000);
  const camYStart=isMobileLayout()?22:18;
  const camZStart=isMobileLayout()?26:18;
  camera.position.set(0,camYStart,camZStart);
  camera.lookAt(0,0,0);

  setupControls();
  setupJoystick();

  window.addEventListener("pointerdown",()=>unlockAudio(),{once:true});
  window.addEventListener("resize",onResize);
  window.addEventListener("orientationchange",()=>setTimeout(()=>{forceLandscape();applyRendererSize()},300));

  const restartBtn=document.getElementById("restartBtn");
  const shopEntryBtn2=document.getElementById("shopEntryBtn2");
  if(restartBtn)restartBtn.onclick=startGame;
  if(shopEntryBtn2){
    shopEntryBtn2.onclick=returnToHome;
    shopEntryBtn2.title=t("game.home");
  }

  beginSceneBoot();
}

function _loadAllAssets(){
  _trackLoad(new Promise(resolve=>{createSkybox(resolve)}));
  loadPlatformTextures();
  createPlatformModel();
  createPlayer();
  loadRockModels();
}

function refreshRockMaterial(){
  if(!platformMaterialCache)return;
  rockMaterial=platformMaterialCache;
  for(const model of rockModels){
    model.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh)obj.material=rockMaterial;
    });
  }
  for(const rock of rocks){
    if(!rock.mesh)continue;
    rock.mesh.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh)obj.material=rockMaterial;
    });
  }
}
function refreshPlatformMaterial(){
  if(!platformMaterialCache||!platformModel)return;
  platformModel.traverse(obj=>{
    if(obj.isMesh||obj.isSkinnedMesh)obj.material=platformMaterialCache;
  });
}
function loadRockModels(){
  for(const url of ROCK_NEW_MODEL_URLS){
    _autoTrackFBX(url,fbx=>{
      rockMaterial=createPlatformMaterial();
      fbx.traverse(obj=>{
        if(obj.isMesh||obj.isSkinnedMesh){
          obj.material=rockMaterial;
          obj.receiveShadow=true;
        }
      });
      rockModels.push(fbx);
    });
  }
}

function loadBossModel(){
  if(bossAssetsReady)return Promise.resolve();
  if(bossLoadPromise)return bossLoadPromise;
  const textureLoader=new THREE.TextureLoader();
  const textures={};
  let texLoaded=0,matReady=false,modelReady=false;

  function tryApplyBossMaterial(){
    if(!matReady||!modelReady||!bossModel)return;
    bossModel.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh){
        obj.material=bossMaterial;
        obj.castShadow=true;
        obj.receiveShadow=true;
        if(obj.isSkinnedMesh)obj.frustumCulled=false;
      }
    });
    bossAssetsReady=true;
  }

  function onTexDone(key,tex,isSRGB){
    texLoaded++;
    if(tex){
      tex.colorSpace=isSRGB?THREE.SRGBColorSpace:THREE.NoColorSpace;
      tex.anisotropy=8;
      textures[key]=tex;
    }
    if(texLoaded===3){
      bossMaterial=new THREE.MeshStandardMaterial({
        map:textures.baseColor||null,
        roughnessMap:textures.roughness||null,
        emissiveMap:textures.emissive||null,
        emissive:0xffffff,
        emissiveIntensity:.8,
        roughness:.7,
        metalness:.1,
        color:0xffffff
      });
      matReady=true;
      tryApplyBossMaterial();
    }
  }

  textureLoader.load(BOSS_BASECOLOR_TEXTURE_URL,
    tex=>onTexDone("baseColor",tex,true),
    undefined,
    ()=>onTexDone("baseColor",null,true)
  );
  textureLoader.load(BOSS_ROUGHNESS_TEXTURE_URL,
    tex=>onTexDone("roughness",tex,false),
    undefined,
    ()=>onTexDone("roughness",null,false)
  );
  textureLoader.load(BOSS_EMISSIVE_TEXTURE_URL,
    tex=>onTexDone("emissive",tex,true),
    undefined,
    ()=>onTexDone("emissive",null,true)
  );

  bossLoadPromise=_trackLoad(new Promise(resolve=>{
    new FBXLoader().load(BOSS_MODEL_URL,fbx=>{
      bossModel=fbx;
      modelReady=true;
      bossModel.traverse(obj=>{
        if(obj.isMesh||obj.isSkinnedMesh){
          obj.castShadow=!_isMobile;
          obj.receiveShadow=true;
          if(obj.isSkinnedMesh)obj.frustumCulled=false;
        }
      });
      tryApplyBossMaterial();
      resolve();
    },undefined,err=>{
      console.warn("Boss 模型加载失败：",BOSS_MODEL_URL,err);
      resolve();
    });
  }));
  return bossLoadPromise;
}

function loadMeta(){
  const def={bestScore:0,bestTime:0,gamesPlayed:0,achievements:{},bgmVolume:.5,totalPoints:0,purchasedItemId:null,purchasedItemLabel:null};
  try{
    const raw=localStorage.getItem("starCrystalSurvivalMeta");
    return raw?normalizeMeta(Object.assign(def,JSON.parse(raw))):normalizeMeta(def);
  }catch(e){return normalizeMeta(def)}
}
function saveMeta(){meta=normalizeMeta(meta);localStorage.setItem("starCrystalSurvivalMeta",JSON.stringify(meta))}

function applyPurchasedBuffs(){
  if(meta.purchasedItemId===null)return;
  const pid=meta.purchasedItemId;
  meta.purchasedItemId=null;
  meta.purchasedItemLabel=null;
  saveMeta();

  // Handle mystery items
  if(pid.startsWith("mystery_")){
    const parts=pid.split("_"); // mysterystype, duration, [heal]
    const mType=parts[1],mDur=parseFloat(parts[2])||0;
    if(mType==="speed"){
      speedBuffTimer=mDur;speedStackLevel=3;speedEndTransitionTimer=0;
      if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}
    }else if(mType==="invincible"){
      invincibleTimer=mDur;invincibleVisualActive=true;invincibleTextureActive=true;
      applyPlayerInvincibleTexture(true);createInvincibleAura();
    }else if(mType==="chargeSpeed"){
      // First 5s slow, then 10s acceleration
      mysterySlowTimer=5;speedStackLevel=0;
      setTimeout(()=>{
        if(gameRunning){speedBuffTimer=mDur;speedStackLevel=3;speedEndTransitionTimer=0;
        if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}}
      },5000);
    }else if(mType==="healPack"){
      speedBuffTimer=mDur;speedStackLevel=3;speedEndTransitionTimer=0;
      if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}
      mysteryHealAvailable=true;
    }
    // "nothing" — no effect
    return;
  }

  const item=SHOP_ITEMS.find(i=>i.id===pid);
  if(!item)return;
  if(item.type==="speed"){
    speedBuffTimer=item.duration;
    speedStackLevel=3;
    speedEndTransitionTimer=0;
    if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}
  }else if(item.type==="invincible"){
    invincibleTimer=item.duration;
    invincibleVisualActive=true;
    invincibleTextureActive=true;
    applyPlayerInvincibleTexture(true);
    createInvincibleAura();
  }else if(item.type==="both"){
    speedBuffTimer=item.duration;
    speedStackLevel=3;
    speedEndTransitionTimer=0;
    if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}
    invincibleTimer=item.duration;
    invincibleVisualActive=true;
    invincibleTextureActive=true;
    applyPlayerInvincibleTexture(true);
    createInvincibleAura();
  }
}

function getRankInfo(scoreValue){
  let current=RANKS[0],next=null;
  for(let i=0;i<RANKS.length;i++){
    if(scoreValue>=RANKS[i].score)current=RANKS[i];
    else{next=RANKS[i];break}
  }
  return {current,next};
}

function evaluateAchievements(){
  newlyUnlockedAchievements=[];
  for(const a of ACHIEVEMENTS){
    if(!meta.achievements[a.id]&&a.check(meta)){
      meta.achievements[a.id]=true;
      newlyUnlockedAchievements.push(a);
    }
  }
}

function forceLandscape(){
  if(!isMobileLayout())return;
  try{
    if(document.documentElement.requestFullscreen&&!document.fullscreenElement){
      document.documentElement.requestFullscreen();
    }
  }catch(e){}
  try{
    if(screen.orientation&&screen.orientation.lock){
      screen.orientation.lock("landscape");
    }
  }catch(e){}
}

function setPlayerStatusText(type,duration){
  playerStatusType=type;
  playerStatusTimer=duration;
  if(!playerStatusCanvas){playerStatusCanvas=document.createElement("canvas");playerStatusCanvas.width=3072;playerStatusCanvas.height=1536;playerStatusCtx=playerStatusCanvas.getContext("2d")}
  const ctx=playerStatusCtx;
  ctx.clearRect(0,0,playerStatusCanvas.width,playerStatusCanvas.height);
  ctx.save();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="900 460px Orbitron, Exo 2, Microsoft YaHei, Arial";
  let text="";
  if(type==="speed")text=t("status.speed");
  else if(type==="invincible")text=t("status.invincible");
  else if(type==="heal")text=t("status.heal",{n:HEAL_AMOUNT});
  ctx.fillStyle="#ffffff";
  ctx.fillText(text,playerStatusCanvas.width/2,playerStatusCanvas.height/2);
  ctx.restore();
  if(!playerStatusTexture){playerStatusTexture=new THREE.CanvasTexture(playerStatusCanvas);playerStatusTexture.colorSpace=THREE.SRGBColorSpace;playerStatusTexture.minFilter=THREE.LinearMipmapLinearFilter;playerStatusTexture.magFilter=THREE.LinearFilter}else playerStatusTexture.needsUpdate=true;
  if(!playerStatusSprite){const mat2=new THREE.SpriteMaterial({map:playerStatusTexture,transparent:true,opacity:1,depthWrite:false,depthTest:false});playerStatusSprite=new THREE.Sprite(mat2);playerStatusSprite.scale.set(isMobileLayout()?246:216,isMobileLayout()?123:108,1);player.add(playerStatusSprite)}
  playerStatusSprite.position.set(0,isMobileLayout()?6.0:5.0,0);
  playerStatusSprite.visible=true;
}

function refreshPlayerStatusText(){
  const hasInvincible=invincibleTimer>0;
  const hasSpeed=speedBuffTimer>0;
  let type="",text="",duration=0;
  if(hasInvincible&&hasSpeed){type="invincibleSpeed";text=t("status.invSpeed");duration=Math.max(invincibleTimer,speedBuffTimer)}
  else if(hasInvincible){type="invincible";text=t("status.invincible");duration=invincibleTimer}
  else if(hasSpeed){type="speed";text=t("status.speed");duration=speedBuffTimer}
  else{
    if(!playerStatusType||playerStatusType==="heal")return;
    playerStatusType="";playerStatusTimer=.3;return;
  }
  if(playerStatusType===type)return;
  playerStatusType=type;playerStatusTimer=duration;
  if(!playerStatusCanvas){playerStatusCanvas=document.createElement("canvas");playerStatusCanvas.width=3072;playerStatusCanvas.height=1536;playerStatusCtx=playerStatusCanvas.getContext("2d")}
  const ctx=playerStatusCtx;
  ctx.clearRect(0,0,playerStatusCanvas.width,playerStatusCanvas.height);
  ctx.save();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="900 460px Orbitron, Exo 2, Microsoft YaHei, Arial";
  ctx.fillStyle="#ffffff";
  ctx.fillText(text,playerStatusCanvas.width/2,playerStatusCanvas.height/2);
  ctx.restore();
  if(!playerStatusTexture){playerStatusTexture=new THREE.CanvasTexture(playerStatusCanvas);playerStatusTexture.colorSpace=THREE.SRGBColorSpace;playerStatusTexture.minFilter=THREE.LinearMipmapLinearFilter;playerStatusTexture.magFilter=THREE.LinearFilter}else playerStatusTexture.needsUpdate=true;
  if(!playerStatusSprite){const mat2=new THREE.SpriteMaterial({map:playerStatusTexture,transparent:true,opacity:1,depthWrite:false,depthTest:false});playerStatusSprite=new THREE.Sprite(mat2);playerStatusSprite.scale.set(isMobileLayout()?246:216,isMobileLayout()?123:108,1);player.add(playerStatusSprite)}
  playerStatusSprite.position.set(0,isMobileLayout()?6.0:5.0,0);
  playerStatusSprite.visible=true;
}

function updatePlayerStatusText(dt){
  if(!playerStatusSprite||playerStatusTimer<=0)return;
  playerStatusTimer-=dt;
  if(playerStatusSprite.material)playerStatusSprite.material.opacity=THREE.MathUtils.clamp(playerStatusTimer/.3,0,1);
  if(playerStatusTimer<=0){playerStatusSprite.visible=false;playerStatusType=""}
}

function initSharedResources(){
  shared.geo.enemyBody=new THREE.SphereGeometry(.65,6,6);
  shared.geo.enemyHorn=new THREE.ConeGeometry(.25,.5,4);
  shared.geo.enemyEye=new THREE.SphereGeometry(.08,4,4);
  shared.geo.purpleBody=new THREE.SphereGeometry(.65*1.3,6,6);
  shared.geo.purpleHorn=new THREE.ConeGeometry(.32*1.3,.65*1.3,4);
  shared.geo.purpleAura=new THREE.TorusGeometry(.82*1.3,.045,4,12);
  shared.geo.ghostBody=new THREE.SphereGeometry(.65*1.3*2,8,6);
  shared.geo.ghostAura=new THREE.TorusGeometry(.82*1.3*2.2,.25,6,12);
  shared.geo.ghostCore=new THREE.IcosahedronGeometry(.4*1.3*2,0);
  shared.geo.rock=new THREE.DodecahedronGeometry(1,0);
  shared.geo.speedFruit=new THREE.SphereGeometry(.45,7,7);
  shared.geo.speedRing=new THREE.TorusGeometry(.58,.035,4,10);
  shared.geo.healBox=new THREE.BoxGeometry(.85,.65,.85);
  shared.geo.healCrossA=new THREE.BoxGeometry(.52,.12,.08);
  shared.geo.healCrossB=new THREE.BoxGeometry(.12,.52,.08);
  shared.geo.invCore=new THREE.IcosahedronGeometry(.7,1);
  shared.geo.invAura1=new THREE.TorusGeometry(.95,.05,10,48);
  shared.geo.invAura2=new THREE.TorusGeometry(.72,.04,10,48);
  shared.geo.crystal=new THREE.OctahedronGeometry(.65,0);

  shared.mat.enemyBody=new THREE.MeshStandardMaterial({color:0xff3333,emissive:0x660000,emissiveIntensity:.35,roughness:.5});
  shared.mat.enemyHorn=new THREE.MeshStandardMaterial({color:0x280000});
  shared.mat.enemyEye=new THREE.MeshBasicMaterial({color:0xffff66});
  shared.mat.purpleBody=new THREE.MeshStandardMaterial({color:0x9b35ff,emissive:0x5a00aa,emissiveIntensity:.55,roughness:.42,metalness:.08});
  shared.mat.purpleHorn=new THREE.MeshStandardMaterial({color:0x2b0048,emissive:0x4b0082,emissiveIntensity:.35});
  shared.mat.purpleAura=new THREE.MeshBasicMaterial({color:0xd99cff,transparent:true,opacity:.85});
  shared.mat.obstacle=new THREE.MeshStandardMaterial({color:OBSTACLE_COLOR,roughness:.92,metalness:0});
  shared.mat.speedFruit=new THREE.MeshStandardMaterial({color:0x7cff6b,emissive:0x1aff00,emissiveIntensity:.55,roughness:.35});
  shared.mat.speedRing=new THREE.MeshBasicMaterial({color:0x99ff88});
  shared.mat.healBox=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xff4444,emissiveIntensity:.28,roughness:.35});
  shared.mat.healCross=new THREE.MeshBasicMaterial({color:0xff2222});
  shared.mat.invCore=new THREE.MeshStandardMaterial({color:0xfff36a,emissive:0xff66ff,emissiveIntensity:.75,roughness:.18,metalness:.2});
  shared.mat.invAura1=new THREE.MeshBasicMaterial({color:0x66ffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
  shared.mat.invAura2=new THREE.MeshBasicMaterial({color:0xff66ff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});

  shared.mat.ghostBody=new THREE.MeshStandardMaterial({color:0xaaccff,emissive:0x334466,emissiveIntensity:.4,roughness:.6,metalness:0,transparent:true,opacity:.5,depthWrite:false});
  shared.mat.ghostCore=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false});
  shared.mat.ghostAura1=new THREE.MeshBasicMaterial({color:0xff4411,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  shared.mat.ghostAura2=new THREE.MeshBasicMaterial({color:0xff6633,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false});
  shared.geo.ghostParticle=new THREE.SphereGeometry(.3,6,6);
  shared.mat.ghostParticle=new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending});
}

function createLights(){
  const ambIntensity=isMobileLayout()?1.05:1.15;
  const sunIntensity=isMobileLayout()?2.2:2.65;
  scene.add(new THREE.AmbientLight(0x6AB7BC,ambIntensity));

  const sun=new THREE.DirectionalLight(0xE59F3E,sunIntensity);
  sun.position.set(-18,28,16);
  sun.castShadow=!isMobileLayout();

  const target=new THREE.Object3D();
  target.position.set(0,0,0);
  scene.add(target);
  sun.target=target;

  const mapSize=isMobileLayout()?512:512;
  sun.shadow.mapSize.width=mapSize;
  sun.shadow.mapSize.height=mapSize;
  const shadowRange=isMobileLayout()?18:35;
  sun.shadow.camera.near=1;
  sun.shadow.camera.far=isMobileLayout()?24:90;
  sun.shadow.camera.left=-shadowRange;
  sun.shadow.camera.right=shadowRange;
  sun.shadow.camera.top=shadowRange;
  sun.shadow.camera.bottom=-shadowRange;
  sun.shadow.bias=-0.0008;
  sun.shadow.normalBias=0.065;
  sun.shadow.radius=isMobileLayout()?4:6;
  scene.add(sun);
}

function createSkybox(resolve){
  new THREE.TextureLoader().load(
    SKYBOX_TEXTURE_URL,
    texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=THREE.ClampToEdgeWrapping;
      texture.wrapT=THREE.ClampToEdgeWrapping;
      texture.anisotropy=4;

      const seg={w:_isMobile?32:64,h:_isMobile?16:32};
      skyboxMesh=new THREE.Mesh(
        new THREE.SphereGeometry(480,seg.w,seg.h),
        new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false,depthTest:false})
      );
      skyboxMesh.renderOrder=-999;
      scene.add(skyboxMesh);

      const fogShellGeo=new THREE.SphereGeometry(460,32,16);
      const fogShellAlpha=.55;
      const fogShellMat=new THREE.ShaderMaterial({
        uniforms:{uFogColor:{value:new THREE.Color(0xa8c0d8)}},
        vertexShader:'varying vec3 vWNormal;\nvoid main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);vWNormal=normalize(mat3(modelMatrix)*normal);}',
        fragmentShader:`varying vec3 vWNormal;\nuniform vec3 uFogColor;\nvoid main(){float hz=clamp(1.-abs(vWNormal.y),0.,1.);float a=hz*hz*${fogShellAlpha};gl_FragColor=vec4(uFogColor,a);}`,
        side:THREE.BackSide,depthWrite:false,depthTest:false,transparent:true
      });
      const fogShell=new THREE.Mesh(fogShellGeo,fogShellMat);
      fogShell.renderOrder=-998;
      skyboxMesh.add(fogShell);
      resolve();
    },
    undefined,
    err=>{
      console.warn("天空盒贴图加载失败：",SKYBOX_TEXTURE_URL,err);
      scene.background=new THREE.Color(0x050816);
      resolve();
    }
  );
}

function loadTexture(url,options={}){
  const texture=new THREE.Texture();
  texture.colorSpace=options.colorSpace||THREE.SRGBColorSpace;
  texture.wrapS=options.wrapS||THREE.RepeatWrapping;
  texture.wrapT=options.wrapT||THREE.RepeatWrapping;
  texture.repeat.set(options.repeatX??1,options.repeatY??1);
  texture.flipY=options.flipY??false;
  texture.anisotropy=options.anisotropy??4;
  _trackLoad(new Promise(resolve=>{
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>{
      let src=img;
      if(_isMobile&&options.resizeHalf!==false){
        const mw=Math.floor(img.naturalWidth/2);
        const mh=Math.floor(img.naturalHeight/2);
        const c=document.createElement("canvas");
        c.width=mw;c.height=mh;
        const ctx=c.getContext("2d");
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality="high";
        ctx.drawImage(img,0,0,mw,mh);
        src=c;
      }
      texture.image=src;
      texture.needsUpdate=true;
      resolve();
    };
    img.onerror=()=>{texture.image=null;texture.needsUpdate=true;resolve()};
    img.src=url;
  }));
  return texture;
}

function buildPlatformMaterial(baseColor,roughness,normal){
  const aniso=getMaxAnisotropy(_isMobile?4:16);
  for(const tex of [baseColor,roughness,normal]){
    if(tex)tex.anisotropy=aniso;
  }
  return new THREE.MeshStandardMaterial({
    name:"Sphere001_mat",
    map:baseColor||null,
    roughnessMap:roughness||null,
    normalMap:normal||null,
    normalScale:new THREE.Vector2(1,-1),
    roughness:1,
    metalness:0,
    flatShading:false,
    color:0xffffff
  });
}
function configurePlatformTexture(texture,isSRGB){
  if(!texture)return null;
  texture.colorSpace=isSRGB?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.RepeatWrapping;
  texture.flipY=true;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  return texture;
}
function loadPlatformTextures(){
  return _trackLoad(new Promise(resolve=>{
    const textureLoader=new THREE.TextureLoader();
    const slots={baseColor:null,roughness:null,normal:null};
    let done=0;
    const finish=()=>{
      done++;
      if(done<3)return;
      platformMaterialCache=buildPlatformMaterial(slots.baseColor,slots.roughness,slots.normal);
      refreshPlatformMaterial();
      refreshRockMaterial();
      resolve();
    };
    textureLoader.load(PLATFORM_BASECOLOR_TEXTURE_URL,t=>{slots.baseColor=configurePlatformTexture(t,true);finish()},undefined,()=>finish());
    textureLoader.load(PLATFORM_ROUGHNESS_TEXTURE_URL,t=>{slots.roughness=configurePlatformTexture(t,false);finish()},undefined,()=>finish());
    textureLoader.load(PLATFORM_NORMAL_TEXTURE_URL,t=>{slots.normal=configurePlatformTexture(t,false);finish()},undefined,()=>finish());
  }));
}
function createPlatformMaterial(){
  return platformMaterialCache||buildPlatformMaterial(null,null,null);
}

function createPlatformModel(){
  _autoTrackFBX(PLATFORM_COL_MODEL_URL,colFbx=>{
    platformCollisionModel=colFbx;
    platformCollisionModel.rotation.set(Math.PI/2,Math.PI,Math.PI);
    platformCollisionModel.scale.set(.025,.025,.025);
    platformCollisionModel.position.set(0,0,0);
    platformCollisionModel.updateMatrixWorld(true);
    platformCollisionMeshes=[];
    platformCollisionModel.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh){
        obj.visible=false;
        obj.castShadow=false;
        obj.receiveShadow=false;
        if(obj.geometry){
          obj.geometry.computeBoundingBox();
          obj.geometry.computeBoundingSphere();
        }
        if(obj.material){
          obj.material=new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide});
        }
        obj.userData.isPlatformCollision=true;
        platformCollisionMeshes.push(obj);
      }
    });
    const colBox=new THREE.Box3().setFromObject(platformCollisionModel);
    const colCenter=new THREE.Vector3();colBox.getCenter(colCenter);
    platformCollisionModel.position.y+=PLATFORM_TOP_Y-colBox.max.y;
    platformCollisionModel.updateMatrixWorld(true);
    platformCollisionBox=new THREE.Box3().setFromObject(platformCollisionModel);
    const colSize=new THREE.Vector3();platformCollisionBox.getSize(colSize);
    const colCenter2=new THREE.Vector3();platformCollisionBox.getCenter(colCenter2);
    platformCollisionCenterX=colCenter2.x;
    platformCollisionCenterZ=colCenter2.z;
    platformWalkRadiusX=colSize.x*.46;
    platformWalkRadiusZ=colSize.z*.46;
    platformTopY=platformCollisionBox.max.y;
    scene.add(platformCollisionModel);
    _autoTrackFBX(PLATFORM_MODEL_URL,fbx=>{
      platformModel=fbx;
      platformModel.rotation.set(Math.PI/2,Math.PI,Math.PI);
      platformMeshes=[];
      platformModel.position.set(0,0,0);
      platformModel.scale.set(.025,.025,.025);
      platformModel.updateMatrixWorld(true);
      const platformMaterial=createPlatformMaterial();
      platformModel.traverse(obj=>{
        if(obj.isMesh||obj.isSkinnedMesh){
          obj.castShadow=false;
          obj.receiveShadow=true;
          if(obj.geometry){obj.geometry.computeBoundingBox();obj.geometry.computeVertexNormals()}
          obj.material=platformMaterial;
          platformMeshes.push(obj);
        }
      });
      platformModel.position.set(0,0,0);
      platformModel.updateMatrixWorld(true);
      scene.add(platformModel);
      platformReady=true;
    });
  });
}

function updatePlatformWalkBounds(){
  const col=platformCollisionModel;
  if(!col||platformCollisionMeshes.length===0){
    if(platformModel){
      platformModel.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(platformModel),size=new THREE.Vector3();
      box.getSize(size);
      platformWalkRadiusX=size.x*.46;
      platformWalkRadiusZ=size.z*.46;
      platformTopY=box.max.y;
      const ctr=new THREE.Vector3();box.getCenter(ctr);
      platformCollisionCenterX=ctr.x;
      platformCollisionCenterZ=ctr.z;
    }else{
      platformWalkRadiusX=worldSize/2-1;
      platformWalkRadiusZ=worldSize/2-1;
      platformTopY=PLATFORM_TOP_Y;
      platformCollisionCenterX=0;
      platformCollisionCenterZ=0;
    }
    return;
  }
  col.updateMatrixWorld(true);
  platformCollisionBox=new THREE.Box3().setFromObject(col);
  const size=new THREE.Vector3();platformCollisionBox.getSize(size);
  const ctr=new THREE.Vector3();platformCollisionBox.getCenter(ctr);
  platformCollisionCenterX=ctr.x;
  platformCollisionCenterZ=ctr.z;
  platformWalkRadiusX=size.x*.46;
  platformWalkRadiusZ=size.z*.46;
  platformTopY=platformCollisionBox.max.y;
}

function clampToPlatform(pos,margin=0){
  const cx=platformCollisionCenterX,cz=platformCollisionCenterZ;
  const rx=Math.max(.1,platformWalkRadiusX-margin),rz=Math.max(.1,platformWalkRadiusZ-margin);
  const dx=pos.x-cx,dz=pos.z-cz;
  const nx=dx/rx,nz=dz/rz,len=Math.sqrt(nx*nx+nz*nz);
  if(len>1){pos.x=cx+nx/len*rx;pos.z=cz+nz/len*rz}
  pos.y=getPlatformHeightAt(pos.x,pos.z);
  return pos;
}

function getPlatformHeightAt(x,z){
  const dx=x-platformCollisionCenterX,dz=z-platformCollisionCenterZ;
  const rx=Math.max(.01,platformWalkRadiusX*1.05),rz=Math.max(.01,platformWalkRadiusZ*1.05);
  if(dx*dx/(rx*rx)+dz*dz/(rz*rz)<=1)return platformTopY;
  if(platformCollisionMeshes.length>0&&platformCollisionBox){
    const rayY=platformCollisionBox.max.y+5;
    _platformRayOrigin.set(x,rayY,z);
    platformRaycaster.set(_platformRayOrigin,_platformDownDir);
    platformRaycaster.far=Math.max(20,(platformCollisionBox.max.y-platformCollisionBox.min.y)+10);
    const hits=platformRaycaster.intersectObjects(platformCollisionMeshes,false);
    if(hits.length>0)return hits[0].point.y;
  }
  return platformTopY;
}

function isOnPlatform(x,z,extra=0){
  const cx=platformCollisionCenterX,cz=platformCollisionCenterZ;
  const rx=Math.max(.01,platformWalkRadiusX+extra),rz=Math.max(.01,platformWalkRadiusZ+extra);
  const dx=x-cx,dz=z-cz;
  return (dx*dx)/(rx*rx)+(dz*dz)/(rz*rz)<=1;
}

function snapObjectToPlatform(object3D,extraY=0){object3D.position.y=getPlatformHeightAt(object3D.position.x,object3D.position.z)+extraY}

function createPlayer(){
  _trackLoad((async()=>{
    player=new THREE.Group();
    player.position.set(0,0,0);
    scene.add(player);
    const fallback=new THREE.Group();
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.5,1.1,6,12),new THREE.MeshStandardMaterial({color:playerNormalColor,roughness:.42,emissive:0x003466,emissiveIntensity:.25}));
    body.position.y=1;body.castShadow=true;body.receiveShadow=true;fallback.add(body);
    const face=new THREE.Mesh(new THREE.SphereGeometry(.18,12,12),new THREE.MeshBasicMaterial({color:0xffffff}));
    face.position.set(0,1.25,.45);fallback.add(face);
    playerFallbackBody=fallback;player.add(fallback);
    registerPlayerTintTarget(body);
    createPlayerLocatorHalo();
    createPlayerHeadUI();
    await loadPlayerTexturesAsync();
    await loadPlayerFBXAsync();
    await preloadPlayerAnimationsAsync();
  })());
}

function createPlayerLocatorHalo(){
  playerLocatorGroup=new THREE.Group();
  const ringMat=new THREE.MeshBasicMaterial({color:0x00f0ff,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.78,1.05,72),ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.y=.18;ring.renderOrder=-1;playerLocatorGroup.add(ring);
  const outerMat=new THREE.MeshBasicMaterial({color:0xb44dff,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
  const outerRing=new THREE.Mesh(new THREE.RingGeometry(1.12,1.2,72),outerMat);
  outerRing.rotation.x=-Math.PI/2;outerRing.position.y=.18;outerRing.renderOrder=-1;playerLocatorGroup.add(outerRing);
  const discMat=new THREE.MeshBasicMaterial({color:0x00f0ff,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});
  const disc=new THREE.Mesh(new THREE.CircleGeometry(.72,72),discMat);
  disc.rotation.x=-Math.PI/2;disc.position.y=.18;disc.renderOrder=-1;playerLocatorGroup.add(disc);
  player.add(playerLocatorGroup);
  playerLocatorGroup.renderOrder=-1;
}

function updatePlayerLocatorHalo(dt){
  if(!playerLocatorGroup)return;
  playerLocatorGroup.rotation.y+=dt*1.8;
  const scale=1+Math.sin(aliveTime*5)*.08;
  playerLocatorGroup.scale.set(scale,scale,scale);
  for(const child of playerLocatorGroup.children){
    if(child.material&&child.geometry&&child.geometry.type==="RingGeometry")child.material.opacity=.65+Math.sin(aliveTime*4)*.18;
  }
}

function createPlayerHeadUI(){
  playerHeadUICanvas=document.createElement("canvas");
  playerHeadUICanvas.width=512;playerHeadUICanvas.height=320;
  playerHeadUIContext=playerHeadUICanvas.getContext("2d");
  playerHeadUITexture=new THREE.CanvasTexture(playerHeadUICanvas);
  playerHeadUITexture.colorSpace=THREE.SRGBColorSpace;
  playerHeadUITexture.needsUpdate=true;
  const material=new THREE.SpriteMaterial({map:playerHeadUITexture,transparent:true,depthWrite:false,depthTest:false});
  playerHeadUISprite=new THREE.Sprite(material);
  playerHeadUISprite.position.set(0,4.8,0);
  playerHeadUISprite.scale.set(isMobileLayout()?3.8:3.4,isMobileLayout()?3.6:3.2,1);
  player.add(playerHeadUISprite);
  updatePlayerHeadUIScale();
  updatePlayerHeadUI(true);
}

function updatePlayerHeadUIScale(){
  if(playerHeadUISprite)playerHeadUISprite.scale.set(isMobileLayout()?3.8:3.4,isMobileLayout()?3.6:3.2,1);
  if(playerStatusSprite){playerStatusSprite.scale.set(isMobileLayout()?246:216,isMobileLayout()?123:108,1);playerStatusSprite.position.set(0,isMobileLayout()?6.0:5.0,0)}
}

function drawRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function updatePlayerHeadUI(force=false){
  if(!playerHeadUISprite||!playerHeadUIContext||!playerHeadUITexture)return;
  const safeHp=Math.max(0,hp);
  if(!force&&lastHeadUIHp===safeHp)return;
  const ctx=playerHeadUIContext;
  ctx.clearRect(0,0,playerHeadUICanvas.width,playerHeadUICanvas.height);
  ctx.save();
  const barX=76,barY=180,barW=360,barH=44,hpRatio=THREE.MathUtils.clamp(safeHp/maxHp,0,1);
  drawRoundRect(ctx,barX,barY,barW,barH,22);
  ctx.fillStyle="rgba(0,0,0,.5)";ctx.fill();
  ctx.lineWidth=2;ctx.strokeStyle="rgba(0,240,255,.2)";
  drawRoundRect(ctx,barX,barY,barW,barH,22);ctx.stroke();
  const grad=ctx.createLinearGradient(barX,barY,barX+barW,barY);
  if(hpRatio>.55){grad.addColorStop(0,"#39ff14");grad.addColorStop(1,"#00c853")}
  else if(hpRatio>.25){grad.addColorStop(0,"#ffd700");grad.addColorStop(1,"#ff8c00")}
  else{grad.addColorStop(0,"#ff1744");grad.addColorStop(1,"#b71c1c")}
  drawRoundRect(ctx,barX,barY,barW*hpRatio,barH,22);
  ctx.fillStyle=grad;ctx.fill();
  ctx.restore();
  playerHeadUITexture.needsUpdate=true;
  lastHeadUIHp=safeHp;
}

function createTextSprite(text,color){
  const canvas=document.createElement("canvas");
  canvas.width=768;canvas.height=288;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font="900 94px Orbitron, Exo 2, Microsoft YaHei, Arial";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.shadowColor="rgba(0,240,255,.5)";ctx.shadowBlur=32;
  ctx.lineWidth=20;ctx.strokeStyle="rgba(0,0,0,.85)";
  ctx.strokeText(text,384,144);
  ctx.fillStyle=color;ctx.fillText(text,384,144);
  ctx.shadowBlur=0;
  ctx.fillStyle="rgba(255,255,255,.08)";ctx.font="900 94px Orbitron, Exo 2, Microsoft YaHei, Arial";
  ctx.fillText(text,384,144);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false});
  const sprite=new THREE.Sprite(material);
  sprite.scale.set(5.4,2.04,1);
  return sprite;
}

function createCrystalScoreSprite(text){
  const canvas=document.createElement("canvas");
  canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="900 460px Orbitron, Exo 2, Microsoft YaHei, Arial";
  ctx.fillStyle="#ffffff";ctx.fillText(text,512,264);
  ctx.restore();
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,depthTest:false});
  const sprite=new THREE.Sprite(material);
  sprite.scale.set(isMobileLayout()?82:72,isMobileLayout()?41:36,1);
  return sprite;
}

function spawnCrystalScorePopup(value){
  const sprite=createCrystalScoreSprite(`+${value}`);
  sprite.position.copy(player.position);
  sprite.position.y+=5.5;
  scene.add(sprite);
  crystalScorePopups.push({sprite,life:1.4,maxLife:1.4,startY:sprite.position.y});
}

function updateCrystalScorePopups(dt){
  for(let i=crystalScorePopups.length-1;i>=0;i--){
    const popup=crystalScorePopups[i];
    popup.life-=dt;
    const progress=1-popup.life/popup.maxLife,fade=THREE.MathUtils.clamp(popup.life/popup.maxLife,0,1);
    popup.sprite.position.y=popup.startY+progress*1.45;
    popup.sprite.scale.multiplyScalar(1+dt*.18);
    if(popup.sprite.material)popup.sprite.material.opacity=fade;
    if(popup.life<=0){
      scene.remove(popup.sprite);disposeObj(popup.sprite);
      crystalScorePopups.splice(i,1);
    }
  }
}

function clearCrystalScorePopups(){
  for(const popup of crystalScorePopups){
    if(popup.sprite){scene.remove(popup.sprite);disposeObj(popup.sprite)}
  }
  crystalScorePopups.length=0;
}

function ensurePlatformCloudTexture(){
  if(platformCloudTexture)return;
  const size=isMobileLayout()?64:128;
  const canvas=document.createElement("canvas");
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  const cx=size/2,cy=size/2,r=size*.46;
  const g=ctx.createRadialGradient(cx-size*.08,cy-size*.12,0,cx,cy,r);
  g.addColorStop(0,"rgba(255,255,255,1)");
  g.addColorStop(.22,"rgba(255,255,255,.95)");
  g.addColorStop(.45,"rgba(240,245,255,.78)");
  g.addColorStop(.68,"rgba(210,225,248,.38)");
  g.addColorStop(.88,"rgba(180,200,235,.08)");
  g.addColorStop(1,"rgba(160,185,225,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
  ctx.beginPath();ctx.arc(cx-size*.06,cy-size*.14,r*.58,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx+size*.08,cy-size*.06,r*.42,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(cx-size*.1,cy+size*.08,r*.38,0,Math.PI*2);ctx.fill();
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;
  tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=false;
  platformCloudTexture=tex;

  const aSize=isMobileLayout()?32:64;
  const aCanvas=document.createElement("canvas");
  aCanvas.width=aSize;aCanvas.height=aSize;
  const aCtx=aCanvas.getContext("2d");
  aCtx.clearRect(0,0,aSize,aSize);
  const aCx=aSize/2,aCy=aSize/2,aR=aSize*.48;
  const ag=aCtx.createRadialGradient(aCx,aCy,0,aCx,aCy,aR);
  ag.addColorStop(0,"rgba(255,255,255,.72)");
  ag.addColorStop(.35,"rgba(240,245,255,.42)");
  ag.addColorStop(.7,"rgba(210,225,248,.08)");
  ag.addColorStop(1,"rgba(180,200,235,0)");
  aCtx.fillStyle=ag;aCtx.fillRect(0,0,aSize,aSize);
  const aTex=new THREE.CanvasTexture(aCanvas);
  aTex.colorSpace=THREE.SRGBColorSpace;aTex.needsUpdate=true;
  aTex.minFilter=THREE.LinearFilter;aTex.magFilter=THREE.LinearFilter;
  aTex.generateMipmaps=false;
  airParticleTexture=aTex;
}

function createCloudParticleMesh(size,texture){
  const mat=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,depthTest:true,blending:THREE.NormalBlending});
  const sprite=new THREE.Sprite(mat);
  sprite.scale.set(size,size,1);
  return sprite;
}

function spawnCrystalBurst(){
  const t=getTier();
  ensurePlatformCloudTexture();
  const pos=_v3a.copy(player.position);pos.y+=.5;
  const count=20;
  const particles=[];
  for(let i=0;i<count;i++){
    const size=(.25+Math.random()*.35)*4;
    const sprite=createCloudParticleMesh(size,platformCloudTexture);
    sprite.material.color.set(t.crystalColor);
    const angle=Math.random()*Math.PI*2;
    const upAngle=Math.random()*Math.PI*.45;
    const speed=.3+Math.random()*.6;
    sprite.position.copy(pos);
    sprite.position.x+=Math.cos(angle)*Math.sin(upAngle)*1.8;
    sprite.position.z+=Math.sin(angle)*Math.sin(upAngle)*1.8;
    sprite.position.y+=Math.cos(upAngle)*1.8+.2;
    sprite.material.opacity=.65+Math.random()*.35;
    scene.add(sprite);
    particles.push({
      sprite,
      vel:new THREE.Vector3(Math.cos(angle)*speed,.2+Math.random()*.55,Math.sin(angle)*speed),
      baseY:sprite.position.y,
      phase:Math.random()*Math.PI*2,
      life:.6+Math.random()*.3,
      maxLife:.6+Math.random()*.3
    });
  }
  if(!isMobileLayout()){
    const ringCloud=createCloudParticleMesh(1.0,platformCloudTexture);
    ringCloud.material.color.set(t.crystalColor);
    ringCloud.position.copy(pos);
    scene.add(ringCloud);
    crystalBursts.push({ringCloud,ringLife:.7,ringMaxLife:.7,particles});
  } else {
    crystalBursts.push({ringCloud:null,ringLife:0,ringMaxLife:0,particles});
  }
}

function updateCrystalBursts(dt){
  for(let i=crystalBursts.length-1;i>=0;i--){
    const burst=crystalBursts[i];
    burst.ringLife-=dt;
    const ringT=1-burst.ringLife/burst.ringMaxLife;
    if(burst.ringCloud){
      burst.ringCloud.scale.setScalar((isMobileLayout()?.8:1.25)*(1+ringT*4.5));
      if(burst.ringCloud.material)burst.ringCloud.material.opacity=.85*(1-ringT);
      if(burst.ringLife<=0){scene.remove(burst.ringCloud);disposeSpriteSafe(burst.ringCloud);burst.ringCloud=null}
    }
    for(let j=burst.particles.length-1;j>=0;j--){
      const p=burst.particles[j];
      p.life-=dt;
      p.sprite.position.addScaledVector(p.vel,dt);
      p.vel.y-=.35*dt;
      p.sprite.position.y=p.baseY+Math.sin(aliveTime*3.5+p.phase)*.15;
      const fade=THREE.MathUtils.clamp(p.life/p.maxLife,0,1);
      if(p.sprite.material)p.sprite.material.opacity=fade*.65;
      p.sprite.scale.setScalar(p.sprite.scale.x*(1+dt*1.4));
      if(p.life<=0){
        scene.remove(p.sprite);disposeSpriteSafe(p.sprite);
        burst.particles.splice(j,1);
      }
    }
    if(burst.ringLife<=0&&burst.particles.length===0)crystalBursts.splice(i,1);
  }
}

function clearCrystalBursts(){
  for(const burst of crystalBursts){
    if(burst.ringCloud){scene.remove(burst.ringCloud);disposeSpriteSafe(burst.ringCloud)}
    for(const p of burst.particles){scene.remove(p.sprite);disposeSpriteSafe(p.sprite)}
  }
  crystalBursts.length=0;
}

/* ===== Enemy Death Explosion ===== */
function spawnEnemyDeathExplosion(pos){
  ensurePlatformCloudTexture();
  const particles=[];
  const count=10;
  const basePos=pos.clone();
  for(let i=0;i<count;i++){
    const size=.3+Math.random()*.7;
    const sprite=createCloudParticleMesh(size,platformCloudTexture);
    sprite.material.color.set(0x000000);
    sprite.material.opacity=.85+Math.random()*.15;
    const phi=Math.acos(2*(i+.5)/count-1);
    const theta=Math.PI*(1+Math.sqrt(5))*(i+Math.random()*.3);
    const speed=.8+Math.random()*1.6;
    const dx=Math.sin(phi)*Math.cos(theta);
    const dy=Math.cos(phi);
    const dz=Math.sin(phi)*Math.sin(theta);
    sprite.position.copy(basePos);
    sprite.position.y+=.2+Math.random()*.2;
    scene.add(sprite);
    particles.push({
      sprite,
      vel:new THREE.Vector3(dx*speed,dy*speed*.7+Math.random()*.4,dz*speed),
      baseY:sprite.position.y,
      phase:Math.random()*Math.PI*2,
      life:.55+Math.random()*.45,
      maxLife:.55+Math.random()*.45
    });
  }
  enemyDeathExplosions.push({particles,life:.65,maxLife:.65});
}

function updateEnemyDeathExplosions(dt){
  for(let i=enemyDeathExplosions.length-1;i>=0;i--){
    const ex=enemyDeathExplosions[i];
    ex.life-=dt;
    for(let j=ex.particles.length-1;j>=0;j--){
      const p=ex.particles[j];
      p.life-=dt;
      p.sprite.position.addScaledVector(p.vel,dt);
      p.vel.y-=.6*dt;
      p.sprite.position.y=p.baseY+Math.sin(aliveTime*4.5+p.phase)*.25;
      const fade=THREE.MathUtils.clamp(p.life/p.maxLife,0,1);
      if(p.sprite.material)p.sprite.material.opacity=fade*.8;
      p.sprite.scale.setScalar(p.sprite.scale.x*(1+dt*0.25));
      if(p.life<=0){
        scene.remove(p.sprite);disposeSpriteSafe(p.sprite);
        ex.particles.splice(j,1);
      }
    }
    if(ex.life<=0&&ex.particles.length===0)enemyDeathExplosions.splice(i,1);
  }
}

function clearEnemyDeathExplosions(){
  for(const ex of enemyDeathExplosions){
    for(const p of ex.particles){scene.remove(p.sprite);disposeSpriteSafe(p.sprite)}
  }
  enemyDeathExplosions.length=0;
}

function initPlatformAirParticles(){
  if(!platformReady)return;
  clearPlatformAirParticles();
  ensurePlatformCloudTexture();
  const count=18;
  const rx=platformWalkRadiusX*1.05,rz=platformWalkRadiusZ*1.05;
  const positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const size=.15+Math.random()*.22;
    const ang=Math.random()*Math.PI*2;
    const dist=.4+Math.random()*.6;
    const x=Math.cos(ang)*rx*dist;
    const y=PLATFORM_TOP_Y-.4+Math.random()*.9;
    const z=Math.sin(ang)*rz*dist;
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
    platformAirParticleData.push({
      size,baseX:x,baseZ:z,baseY:y,
      driftAngle:Math.random()*Math.PI*2,
      driftSpeed:.18+Math.random()*.42,
      driftAmp:.45+Math.random()*.85,
      riseSpeed:.08+Math.random()*.32,
      riseOffset:Math.random()*1.4,
      wobbleAmp:.14+Math.random()*.32,
      wobbleSpeed:.65+Math.random()*1.35,
      wobbleOffset:Math.random()*Math.PI*2,
    });
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({
    map:airParticleTexture,
    size:1.14,
    transparent:true,
    depthWrite:false,
    depthTest:false,
    blending:THREE.NormalBlending,
    sizeAttenuation:true,
    opacity:.75,
    alphaTest:.05,
  });
  platformAirPointSystem=new THREE.Points(geometry,material);
  platformAirPointSystem.renderOrder=1;
  scene.add(platformAirPointSystem);
}

function updatePlatformAirParticles(dt){
  if(!platformAirPointSystem||platformAirParticleData.length===0)return;
  const positions=platformAirPointSystem.geometry.attributes.position.array;
  for(let i=platformAirParticleData.length-1;i>=0;i--){
    const p=platformAirParticleData[i];
    p.driftAngle+=p.driftSpeed*dt;
    let x=p.baseX+Math.cos(p.driftAngle)*p.driftAmp;
    let z=p.baseZ+Math.sin(p.driftAngle)*p.driftAmp;
    const rise=((aliveTime*p.riseSpeed+p.riseOffset)%1.4)-.7;
    let y=p.baseY+rise+Math.sin(aliveTime*p.wobbleSpeed+p.wobbleOffset)*p.wobbleAmp;
    if(y>PLATFORM_TOP_Y+1.2)y=PLATFORM_TOP_Y-.7;
    if(y<PLATFORM_TOP_Y-1.2)y=PLATFORM_TOP_Y+.7;
    const distFromCenter=Math.sqrt(x*x+z*z);
    const maxR=Math.max(platformWalkRadiusX,platformWalkRadiusZ)*1.25;
    if(distFromCenter>maxR){
      const ang=Math.atan2(z,x);
      p.baseX=Math.cos(ang)*maxR*.85;
      p.baseZ=Math.sin(ang)*maxR*.85;
      x=p.baseX;z=p.baseZ;
    }
    positions[i*3]=x;
    positions[i*3+1]=y;
    positions[i*3+2]=z;
  }
  platformAirPointSystem.geometry.attributes.position.needsUpdate=true;
}

function clearPlatformAirParticles(){
  if(platformAirPointSystem){
    scene.remove(platformAirPointSystem);
    platformAirPointSystem.geometry.dispose();
    platformAirPointSystem.material.dispose();
    platformAirPointSystem=null;
  }
  platformAirParticleData.length=0;
}

/* ===== Sandstorm System ===== */
function ensureDustParticleTexture(){
  if(dustParticleTexture)return;
  const size=128;
  const canvas=document.createElement("canvas");
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  // Small square dust grain
  const s2=size/2,grainW=4,grainH=4;
  const gx=s2-grainW/2,gy=s2-grainH/2;
  ctx.fillStyle="rgba(210,155,115,.75)";
  ctx.fillRect(gx,gy,grainW,grainH);
  ctx.fillStyle="rgba(190,130,90,.35)";
  ctx.fillRect(gx-2,gy-2,grainW+4,grainH+4);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;
  tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=false;
  dustParticleTexture=tex;
}

function initSandstorms(){
  if(!platformReady)return;
  ensureDustParticleTexture();
  clearSandstorms();
  const count=1;
  const rx=platformWalkRadiusX*.7,rz=platformWalkRadiusZ*.7;
  for(let s=0;s<count;s++){
    const particleCount=750;
    const positions=new Float32Array(particleCount*3);
    const centerX=(Math.random()-.5)*rx*1.4;
    const centerZ=(Math.random()-.5)*rz*1.4;
    const group=new THREE.Group();
    group.position.set(centerX,PLATFORM_TOP_Y+.3,centerZ);
    const stormData={
      group,
      particleCount,
      centerX,centerZ,
      dirX:Math.random()-.5,dirZ:Math.random()-.5,
      speed:.3+Math.random()*.5,
      dirChangeTimer:3+Math.random()*5,
      particleAngles:new Float32Array(particleCount),
      particleRadii:new Float32Array(particleCount),
      particleHeights:new Float32Array(particleCount),
      particleSpeeds:new Float32Array(particleCount),
    };
    for(let i=0;i<particleCount;i++){
      const ang=Math.random()*Math.PI*2;
      const radius=2+Math.random()*18+Math.random()*14;
      const height=(Math.random()-.3)*22;
      stormData.particleAngles[i]=ang;
      stormData.particleRadii[i]=radius;
      stormData.particleHeights[i]=height;
      stormData.particleSpeeds[i]=.15+Math.random()*1.2;
      positions[i*3]=Math.cos(ang)*radius;
      positions[i*3+1]=height;
      positions[i*3+2]=Math.sin(ang)*radius;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const material=new THREE.PointsMaterial({
      map:dustParticleTexture,
      size:6.4,
      transparent:true,
      depthWrite:false,
      depthTest:true,
      blending:THREE.NormalBlending,
      sizeAttenuation:true,
      opacity:.6,
      alphaTest:.02,
      color:new THREE.Color().setHSL(.12+Math.random()*.04,.55+Math.random()*.15,.45+Math.random()*.25),
    });
    const points=new THREE.Points(geometry,material);
    points.renderOrder=2;
    group.add(points);
    scene.add(group);
    sandstorms.push(stormData);
  }
}

function updateSandstorms(dt){
  if(sandstorms.length===0)return;
  const rx=platformWalkRadiusX*.85,rz=platformWalkRadiusZ*.85;
  for(const s of sandstorms){
    s.dirChangeTimer-=dt;
    if(s.dirChangeTimer<=0){
      s.dirChangeTimer=4+Math.random()*7;
      const ang=Math.random()*Math.PI*2;
      s.dirX=Math.cos(ang);s.dirZ=Math.sin(ang);
    }
    s.centerX+=s.dirX*s.speed*dt;
    s.centerZ+=s.dirZ*s.speed*dt;
    if(Math.abs(s.centerX)>rx){s.dirX*=-1;s.centerX=THREE.MathUtils.clamp(s.centerX,-rx,rx)}
    if(Math.abs(s.centerZ)>rz){s.dirZ*=-1;s.centerZ=THREE.MathUtils.clamp(s.centerZ,-rz,rz)}
    s.group.position.x=THREE.MathUtils.lerp(s.group.position.x,s.centerX,2.5*dt);
    s.group.position.z=THREE.MathUtils.lerp(s.group.position.z,s.centerZ,2.5*dt);
    const positions=s.group.children[0].geometry.attributes.position.array;
    for(let i=0;i<s.particleCount;i++){
      const baseAng=s.particleAngles[i];
      const ang=baseAng+aliveTime*s.particleSpeeds[i];
      const r=s.particleRadii[i]+Math.sin(aliveTime*2.3+i*1.7)*2.4;
      const px=Math.cos(ang)*r;
      const py=s.particleHeights[i]+Math.sin(aliveTime*1.5+i*.8)*3.2;
      const pz=Math.sin(ang)*r;
      positions[i*3]=px;positions[i*3+1]=py;positions[i*3+2]=pz;
    }
    s.group.children[0].geometry.attributes.position.needsUpdate=true;
  }
}

function clearSandstorms(){
  for(const s of sandstorms){
    scene.remove(s.group);
    const pts=s.group.children[0];
    if(pts){pts.geometry.dispose();pts.material.dispose()}
  }
  sandstorms.length=0;
}

function spawnPlayerSideEffect(type){
  if(!player)return;
  const group=new THREE.Group();
  const isHeal=type==="heal",isInvincible=type==="invincible",isShield=type==="shield",isSpeed=type==="speed";
  let mainColor=0x6ffcff,secondColor=0xE59F3E,text=t("popup.speed"),textColor="#6ffcff";
  if(isHeal){mainColor=0x66ff8a;secondColor=0xffffff;text=`+${HEAL_AMOUNT} HP`;textColor="#74ff9b"}
  if(isInvincible){mainColor=0xfff36a;secondColor=0x8effff;text=t("popup.inv");textColor="#fff36a"}
  if(isShield){mainColor=0xff66ff;secondColor=0x66ffff;text=t("popup.shield");textColor="#ff9cff"}

  let ring=null;
  if(!isSpeed){
    const ringMat=new THREE.MeshBasicMaterial({color:mainColor,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
    ring=new THREE.Mesh(new THREE.RingGeometry(.75,1.18,72),ringMat);
    ring.rotation.x=-Math.PI/2;ring.position.set(1.25,.28,.05);group.add(ring);
  }

  let pulse=null;
  if(!isSpeed){
    const pulseMat=new THREE.MeshBasicMaterial({color:secondColor,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
    pulse=new THREE.Mesh(new THREE.CircleGeometry(.88,72),pulseMat);
    pulse.rotation.x=-Math.PI/2;pulse.position.set(1.25,.26,.05);group.add(pulse);
  }

  if(!isInvincible&&!isSpeed){
    const sprite=createTextSprite(text,textColor);
    sprite.position.set(1.25,1.75,.05);group.add(sprite);
  } else {group.userData.noSprite=true}
  let spriteRef=isInvincible?null:group.children[group.children.length-1];

  group.scale.setScalar(1.65);
  player.add(group);
  playerSideEffects.push({group,ring,pulse,sprite:spriteRef,type,life:isShield?.75:1.25,maxLife:isShield?.75:1.25});
  if(!isShield)playSfx(type);
}

function updatePlayerSideEffects(dt){
  for(let i=playerSideEffects.length-1;i>=0;i--){
    const fx=playerSideEffects[i];
    fx.life-=dt;
    const t=1-fx.life/fx.maxLife,fade=THREE.MathUtils.clamp(fx.life/fx.maxLife,0,1);
    fx.group.position.y=t*.72;
    fx.group.rotation.y+=dt*4.2;
    if(fx.ring){fx.ring.rotation.z+=dt*7;fx.ring.scale.setScalar(1+t*.9);fx.ring.material.opacity=.9*fade}
    if(fx.pulse){fx.pulse.scale.setScalar(1+t*1.4);fx.pulse.material.opacity=.5*fade}
    if(fx.sprite){fx.sprite.position.y=1.75+t*.65;fx.sprite.material.opacity=fade}
    if(fx.life<=0){
      disposeGroup(fx.group,player);
      playerSideEffects.splice(i,1);
    }
  }
}

function clearPlayerSideEffects(){
  for(const fx of playerSideEffects){if(fx.group)disposeGroup(fx.group,player)}
  playerSideEffects.length=0;
}

function loadPlayerTexturesAsync(){
  return new Promise(resolve=>{
    const textureLoader=new THREE.TextureLoader();
    const aniso=getMaxAnisotropy(_isMobile?4:8);
    let loadedCount=0;
    function doneOne(){loadedCount++;if(loadedCount>=6)resolve()}
    function bindTex(texture,isSRGB){
      if(!texture)return;
      texture.colorSpace=isSRGB?THREE.SRGBColorSpace:THREE.NoColorSpace;
      texture.flipY=PLAYER_TEXTURE_FLIP_Y;
      texture.anisotropy=aniso;
    }
    textureLoader.load(PLAYER_BASE_COLOR_URL,texture=>{bindTex(texture,true);playerBaseColorTexture=texture;doneOne()},undefined,err=>{console.warn("玩家颜色贴图加载失败：",PLAYER_BASE_COLOR_URL,err);doneOne()});
    textureLoader.load(PLAYER_NORMAL_MAP_URL,texture=>{bindTex(texture,false);playerNormalTexture=texture;doneOne()},undefined,err=>{console.warn("玩家法线贴图加载失败：",PLAYER_NORMAL_MAP_URL,err);doneOne()});
    textureLoader.load(PLAYER_ROUGHNESS_URL,texture=>{bindTex(texture,false);playerRoughnessTexture=texture;doneOne()},undefined,err=>{console.warn("玩家粗糙度贴图加载失败：",PLAYER_ROUGHNESS_URL,err);doneOne()});
    textureLoader.load(PLAYER_METALNESS_URL,texture=>{bindTex(texture,false);playerMetalnessTexture=texture;doneOne()},undefined,err=>{console.warn("玩家金属度贴图加载失败：",PLAYER_METALNESS_URL,err);doneOne()});
    textureLoader.load(PLAYER_SPEED_COLOR_URL,texture=>{bindTex(texture,true);playerSpeedColorTexture=texture;doneOne()},undefined,err=>{console.warn("玩家加速状态贴图加载失败：",PLAYER_SPEED_COLOR_URL,err);doneOne()});
    textureLoader.load(PLAYER_INVINCIBLE_COLOR_URL,texture=>{bindTex(texture,true);playerInvincibleColorTexture=texture;doneOne()},undefined,err=>{console.warn("玩家无敌状态贴图加载失败：",PLAYER_INVINCIBLE_COLOR_URL,err);doneOne()});
  });
}

function createPlayerMaterial(){
  return new THREE.MeshStandardMaterial({map:playerBaseColorTexture||null,roughnessMap:playerRoughnessTexture||null,metalnessMap:playerMetalnessTexture||null,normalMap:playerNormalTexture||null,normalScale:new THREE.Vector2(1,1),color:0xffffff,roughness:.8,metalness:.3,emissive:0x000000,emissiveIntensity:0});
}

function applyPlayerSpeedTexture(active){
  const texture=active?playerSpeedColorTexture:playerBaseColorTexture;
  if(!texture)return;
  for(const target of playerTintTargets){
    if(target.mat&&target.mat.map!==undefined){
      target.mat.map=texture;
      target.mat.needsUpdate=true;
    }
  }
}

function updateSpeedTextureTransition(dt){
  if(!speedTextureActive&&speedEndTransitionTimer<=0)return;
  if(speedEndTransitionTimer>0){
    speedEndTransitionTimer-=dt;
    const midPoint=.25,total=0.5;
    const progress=1-speedEndTransitionTimer/total;
    let glow=0;
    if(progress<.5)glow=progress*2*.45;
    else glow=(1-progress)*2*.45;
    for(const target of playerTintTargets){
      if(target.mat&&target.mat.emissive){
        target.mat.emissive.set(0x66ffff);
        target.mat.emissiveIntensity=glow;
      }
    }
    if(progress>=.5&&speedTextureActive){
      speedTextureActive=false;
      applyPlayerSpeedTexture(false);
    }
    if(speedEndTransitionTimer<=0){
      for(const target of playerTintTargets){
        if(target.mat&&target.mat.emissive){
          target.mat.emissive.set(0x000000);
          target.mat.emissiveIntensity=0;
        }
      }
    }
  }
}

function applyPlayerInvincibleTexture(active){
  let texture;
  if(active){
    texture=playerInvincibleColorTexture;
  }else if(speedTextureActive){
    texture=playerSpeedColorTexture;
  }else{
    texture=playerBaseColorTexture;
  }
  if(!texture)return;
  for(const target of playerTintTargets){
    if(target.mat&&target.mat.map!==undefined){
      target.mat.map=texture;
      target.mat.needsUpdate=true;
    }
  }
}

function updateInvincibleTextureTransition(dt){
  if(!invincibleTextureActive&&invincibleEndTransitionTimer<=0)return;
  if(invincibleEndTransitionTimer>0){
    invincibleEndTransitionTimer-=dt;
    const total=0.5;
    const progress=1-invincibleEndTransitionTimer/total;
    let glow=0;
    if(progress<.5)glow=progress*2*.45;
    else glow=(1-progress)*2*.45;
    for(const target of playerTintTargets){
      if(target.mat&&target.mat.emissive){
        target.mat.emissive.set(0xff66ff);
        target.mat.emissiveIntensity=glow;
      }
    }
    if(progress>=.5&&invincibleTextureActive){
      invincibleTextureActive=false;
      applyPlayerInvincibleTexture(false);
    }
    if(invincibleEndTransitionTimer<=0){
      for(const target of playerTintTargets){
        if(target.mat&&target.mat.emissive){
          target.mat.emissive.set(0x000000);
          target.mat.emissiveIntensity=0;
        }
      }
    }
  }
}

function registerPlayerTintTarget(mesh){
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const mat of mats){
    if(!mat)continue;
    if(mat.color)playerTintTargets.push({mat,color:mat.color.clone(),emissive:mat.emissive?mat.emissive.clone():null});
  }
}

function setPlayerTintDamaged(enabled){
  if(invincibleTimer>0&&enabled)return;
  for(const target of playerTintTargets){
    if(enabled){
      if(target.mat.color)target.mat.color.setHex(playerDamageColor);
      if(target.mat.emissive)target.mat.emissive.setHex(0x330000);
    }else{
      if(target.mat.color)target.mat.color.copy(target.color);
      if(target.mat.emissive&&target.emissive)target.mat.emissive.copy(target.emissive);
    }
  }
}

function sanitizeFBXNodeName(name){return name?name.replace(/[\s.:\/\\]/g,""):name}
function normalizeBoneNameForMatch(name){
  if(!name)return "";
  let result=name;
  if(result.includes("|"))result=result.split("|").pop();
  return result.replace(/[\s.:\/\\]/g,"").toLowerCase();
}
function buildModelNodeMap(root){
  const map=new Map();
  root.traverse(obj=>{
    if(!obj.name)return;
    map.set(obj.name,obj.name);
    map.set(normalizeBoneNameForMatch(obj.name),obj.name);
  });
  return map;
}
function retargetClipToModel(rawClip,modelRoot,clipName){
  const nodeMap=buildModelNodeMap(modelRoot),newTracks=[];
  for(const track of rawClip.tracks){
    const dotIndex=track.name.indexOf(".");
    if(dotIndex===-1){newTracks.push(track.clone());continue}
    const trackNodeName=track.name.substring(0,dotIndex),propertyName=track.name.substring(dotIndex),normalizedTrackName=normalizeBoneNameForMatch(trackNodeName);
    const matchedName=nodeMap.get(trackNodeName)||nodeMap.get(normalizedTrackName);
    if(matchedName){const newTrack=track.clone();newTrack.name=matchedName+propertyName;newTracks.push(newTrack)}
  }
  const newClip=rawClip.clone();
  newClip.name=clipName;
  newClip.tracks=newTracks;
  return newClip;
}

function loadPlayerFBXAsync(){
  return new Promise(resolve=>{
    new FBXLoader().load(
      PLAYER_MODEL_URL,
      fbx=>{
        playerModel=fbx;
        playerModel.scale.setScalar(PLAYER_MODEL_SCALE);
        playerModel.rotation.set(PLAYER_MODEL_X_ROTATION,PLAYER_MODEL_Y_ROTATION,PLAYER_MODEL_Z_ROTATION);
        playerModel.position.set(0,0,0);
        playerTintTargets=[];
        playerModel.traverse(obj=>{
          if(obj.name)obj.name=sanitizeFBXNodeName(obj.name);
          if(obj.isMesh||obj.isSkinnedMesh){
            obj.castShadow=!_isMobile;
            obj.receiveShadow=true;
            obj.material=createPlayerMaterial();
            if(obj.isSkinnedMesh)obj.frustumCulled=false;
            registerPlayerTintTarget(obj);
          }
        });
        if(playerFallbackBody)playerFallbackBody.visible=false;
        player.add(playerModel);
        playerMixer=new THREE.AnimationMixer(playerModel);
        resolve();
      },
      undefined,
      err=>{console.warn("玩家模型加载失败：",PLAYER_MODEL_URL,err);resolve()}
    );
  });
}

const PLAYER_ANIM_DEFS=[
  {name:"idle",url:PLAYER_IDLE_ANIM_URL,loop:true},
  {name:"run",url:PLAYER_RUN_ANIM_URL,loop:true},
  {name:"attacked",url:PLAYER_ATTACKED_ANIM_URL,loop:false}
];
let _playerAnimsReady=false;
let _playerAnimsLoadingPromise=null;

function loadPlayerAnimationAsync(name,url,loop){
  if(playerActions[name])return Promise.resolve();
  return new Promise(resolve=>{
    new FBXLoader().load(
      url,
      animFbx=>{
        if(!playerMixer||!playerModel){resolve();return}
        if(!animFbx.animations||animFbx.animations.length===0){
          console.warn("玩家动画为空：",url);
          resolve();
          return;
        }
        const clip=retargetClipToModel(animFbx.animations[0],playerModel,name);
        if(!clip.tracks||clip.tracks.length===0){
          console.warn("玩家动画轨道为空：",url);
          resolve();
          return;
        }
        const action=playerMixer.clipAction(clip,playerModel);
        action.enabled=true;action.paused=false;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);
        if(loop){action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false}
        else{action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true}
        playerActions[name]=action;
        resolve();
      },
      undefined,
      err=>{console.warn("玩家动画加载失败：",url,err);resolve()}
    );
  });
}

function preloadPlayerAnimationsAsync(){
  if(_playerAnimsReady)return Promise.resolve();
  if(_playerAnimsLoadingPromise)return _playerAnimsLoadingPromise;
  _playerAnimsLoadingPromise=Promise.all(
    PLAYER_ANIM_DEFS.map(def=>loadPlayerAnimationAsync(def.name,def.url,def.loop))
  ).then(()=>{
    _playerAnimsReady=!!(playerActions.idle&&playerActions.run);
    if(_playerAnimsReady){
      playPlayerAnim("idle",0,true);
      if(playerMixer)playerMixer.update(1/60);
    }
  }).finally(()=>{_playerAnimsLoadingPromise=null});
  return _playerAnimsLoadingPromise;
}

function ensurePlayerAnimationsReady(){
  return preloadPlayerAnimationsAsync();
}

function stopAllPlayerActions(exceptName=""){
  for(const key in playerActions){
    const action=playerActions[key];
    if(!action)continue;
    if(key!==exceptName)action.fadeOut(.12);
  }
}
function playPlayerAnim(name,fade=.12,restart=false){
  const action=playerActions[name];
  if(!action)return;
  if(currentPlayerAnim===name&&!restart)return;
  stopAllPlayerActions(name);
  if(restart)action.reset();
  action.enabled=true;action.paused=false;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);action.fadeIn(fade);action.play();
  currentPlayerAnim=name;
}
function forcePlayPlayerAnim(name,fade=.05){
  const action=playerActions[name];
  if(!action)return;
  stopAllPlayerActions(name);
  action.reset();action.enabled=true;action.paused=false;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);action.fadeIn(fade);action.play();
  currentPlayerAnim=name;
}
function updatePlayerAnimation(dt){
  if(playerMixer)playerMixer.update(dt);
  if(playerIsDead)return;
  if(playerHitAnimTimer>0){
    playerHitAnimTimer-=dt;
    if(playerHitAnimTimer<=0){
      if(playerMovingThisFrame)playPlayerAnim("run",.12,false);
      else playPlayerAnim("idle",.12,false);
    }
    return;
  }
  if(playerMovingThisFrame)playPlayerAnim("run",.12,false);
  else playPlayerAnim("idle",.18,false);
}
function clearPlayerActions(){
  for(const key in playerActions){
    const action=playerActions[key];
    if(action){action.stop();action.reset();action.enabled=true;action.paused=false;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1)}
  }
  currentPlayerAnim="";
}

function startGame(){
  forceLandscape();
  resetPauseUI();
  releaseJoystickInput();
  _navigatingHome=false;
  document.body.classList.remove("is-game-over");
  const gameCanvas=document.getElementById("game");
  if(gameCanvas)gameCanvas.style.pointerEvents="";

  gameRunning=true;
  gameOverPending=false;
  playerIsDead=false;

  if(gameOverScreen){
    gameOverScreen.style.display="none";
    gameOverScreen.style.pointerEvents="";
  }
  setHUDVisible(true);

  unlockAudio();
  playSfx("start");
  startBGM();
  runUsesDebugCheats=false;

  loadBossModel();
  const scanlinesEl=document.getElementById("scanlines");
  if(scanlinesEl)scanlinesEl.style.display=isMobileLayout()?"none":"block";
  const pauseBtnEl=document.getElementById("pauseBtn");
  if(pauseBtnEl)pauseBtnEl.style.display="flex";
  const joystickEl=document.getElementById("joystick");
  if(joystickEl)joystickEl.style.display="";
  const gameOverLead=document.getElementById("gameOverLead");
  if(gameOverLead)gameOverLead.textContent=t("game.overLead");

  if(tip)tip.style.display="none";

  if(startToast){
    startToast.style.animation="none";
    void startToast.offsetWidth;
    startToast.style.display="block";
    startToast.style.animation="toastFade 4.5s forwards";
  }

  score=0;hp=maxHp;aliveTime=0;mysteryHealAvailable=false;mysterySlowTimer=0;speedBuffTimer=0;speedStackLevel=0;speedTextureActive=false;speedEndTransitionTimer=0;applyPlayerSpeedTexture(false);invincibleTimer=0;invincibleVisualActive=false;invincibleTextureActive=false;invincibleEndTransitionTimer=0;damageFlashTimer=0;lowHpWarningTimer=0;playerHitAnimTimer=0;knockbackVelocity.set(0,0,0);
  removeInvincibleAura();
  applyPlayerInvincibleTexture(false);
  enemySpawnTimer=0;crystalSpawnTimer=0;fruitSpawnTimer=0;purpleEnemySpawnTimer=0;invincibleFruitSpawnTimer=0;ghostBossSpawnTimer=0;
    nextPurpleEnemySpawnTime=randomInt(15,35);nextInvincibleFruitSpawnTime=THREE.MathUtils.randFloat(6,8);enemySpawnQueue.length=0;
  _cachedTier=null;_tierCacheScore=-1;_prevTierHex=-1;

  player.position.set(platformCollisionCenterX,getPlatformHeightAt(platformCollisionCenterX,platformCollisionCenterZ),platformCollisionCenterZ);
  _camLookTarget.copy(player.position);
  player.rotation.set(0,0,0);

  clearPlayerActions();
  setPlayerTintDamaged(false);
  restorePlayerTint();
  playPlayerAnim("idle",.15,true);
  updatePlayerHeadUI(true);

  damageOverlay.style.opacity=0;
  warning.style.display="none";

  for(const c of crystals){
    scene.remove(c.mesh);
    if(c.mat)c.mat.dispose();
  }
  crystals.length=0;
  clearObjects(enemies);
  _purpleCount=0;_ghostBossCount=0;
  clearObjects(fruits);
  clearCrystalScorePopups();
  clearCrystalBursts();
  clearPlatformAirParticles();
  clearSandstorms();
  clearEnemyDeathExplosions();
  clearPlayerSideEffects();
  if(playerStatusSprite){playerStatusSprite.visible=false}playerStatusTimer=0;playerStatusType="";
  prewarmPurpleEnemyPool();

  applyPurchasedBuffs();
  spawnSceneRocks();
  const initialCrystals=INITIAL_CRYSTAL_COUNT;
  const batchSize=8,batchCount=Math.ceil(initialCrystals/batchSize);
  for(let b=0;b<batchCount;b++){
    if(b===0){for(let i=0;i<batchSize;i++)spawnCrystal()}
    else setTimeout(()=>{for(let i=0;i<batchSize;i++)if(crystals.length<initialCrystals)spawnCrystal()},b*35);
  }
  setTimeout(()=>{spawnEnemyGroup(4)},60);
  setTimeout(()=>{initPlatformAirParticles();initSandstorms()},80);

  updateHUD();
  clock.getDelta();
  accumulator=0;
  fpsFrameCount=0;
  fpsLastTime=performance.now();
}

function clearObjects(arr,dispose=false){
  arr.forEach(o=>{
    if(o.mesh){
      removeSceneGroup(o.mesh);
      if(dispose)disposeObj(o.mesh);
    }
  });
  arr.length=0;
}

function getTier(){
  if(_cachedTier&&_tierCacheScore===score&&_frameCount===_tierCacheFrame)return _cachedTier;
  let t;
  if(score>=2000)t={crystalColor:0xffffff,crystalTierKey:"starWhite",crystalValue:80,enemyLevel:10,enemySpeed:5.5,enemyDamage:14};
  else if(score>=1500)t={crystalColor:0xfff1a8,crystalTierKey:"gold",crystalValue:60,enemyLevel:9,enemySpeed:5.2,enemyDamage:12};
  else if(score>=1100)t={crystalColor:0xffd700,crystalTierKey:"yellow",crystalValue:45,enemyLevel:8,enemySpeed:4.9,enemyDamage:11};
  else if(score>=800)t={crystalColor:0xff8c00,crystalTierKey:"orange",crystalValue:30,enemyLevel:7,enemySpeed:4.5,enemyDamage:9};
  else if(score>=550)t={crystalColor:0x001f8f,crystalTierKey:"deepBlue",crystalValue:20,enemyLevel:6,enemySpeed:4.2,enemyDamage:7};
  else if(score>=350)t={crystalColor:0xff3030,crystalTierKey:"red",crystalValue:14,enemyLevel:5,enemySpeed:3.9,enemyDamage:5};
  else if(score>=200)t={crystalColor:0xb14cff,crystalTierKey:"purple",crystalValue:10,enemyLevel:4,enemySpeed:3.6,enemyDamage:3};
  else if(score>=100)t={crystalColor:0x2ecc71,crystalTierKey:"green",crystalValue:7,enemyLevel:3,enemySpeed:3.2,enemyDamage:3};
  else if(score>=40)t={crystalColor:0x48a8ff,crystalTierKey:"skyBlue",crystalValue:6,enemyLevel:2,enemySpeed:2.9,enemyDamage:3};
  else t={crystalColor:0x87ceeb,crystalTierKey:"lightBlue",crystalValue:5,enemyLevel:1,enemySpeed:2.6,enemyDamage:3};
  t.crystalName=getCrystalTierKey(t.crystalTierKey);
  _cachedTier=t;_tierCacheScore=score;_tierCacheFrame=_frameCount;
  return t;
}

function getEnemyDifficultyProgress(){return THREE.MathUtils.clamp(aliveTime/ENEMY_MAX_DIFFICULTY_TIME,0,1)}
function getMaxEnemies(){
  const p=getEnemyDifficultyProgress();
  const maxEnemies=MAX_SCENE_ENEMIES;
  const initialCount=ENEMY_INITIAL_COUNT;
  return Math.min(maxEnemies,Math.floor(THREE.MathUtils.lerp(initialCount,maxEnemies,p)));
}
function getEnemyGroupSize(){
  const p=getEnemyDifficultyProgress();
  if(p>=1)return randomInt(12,18);
  if(p>=.75)return randomInt(9,15);
  if(p>=.5)return randomInt(6,12);
  if(p>=.25)return randomInt(6,12);
  return randomInt(6,9);
}
function getEnemySpawnInterval(){return THREE.MathUtils.lerp(4.0,2.0,getEnemyDifficultyProgress())}
function getPurpleEnemyCount(){return enemies.filter(e=>e.type==="purple").length}
function getPurpleMaxCount(){
  if(aliveTime<purpleStartTime)return 0;
  const p=THREE.MathUtils.clamp((aliveTime-purpleStartTime)/(60-purpleStartTime),0,1);
  return Math.min(maxPurpleEnemies,Math.floor(THREE.MathUtils.lerp(3,maxPurpleEnemies,p)));
}
function getPurpleSpawnInterval(){
  if(aliveTime<purpleStartTime)return Infinity;
  const p=THREE.MathUtils.clamp((aliveTime-purpleStartTime)/(60-purpleStartTime),0,1);
  return THREE.MathUtils.lerp(20,8,p);
}

function spawnCrystal(){
  const t=getTier();
  const pos=findSafePosition(1.2);
  const mat=new THREE.MeshStandardMaterial({color:t.crystalColor,emissive:t.crystalColor,emissiveIntensity:.55,roughness:.25,metalness:.15});
  const mesh=new THREE.Mesh(shared.geo.crystal,mat);
  mesh.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z)+.8,pos.z);
  mesh.receiveShadow=true;
  scene.add(mesh);
  crystals.push({mesh,radius:.75,value:t.crystalValue,mat,baseY:getPlatformHeightAt(pos.x,pos.z)+.8,rotY:THREE.MathUtils.randFloat(.4,1.2),rotX:THREE.MathUtils.randFloat(.15,.45)});
}

function spawnSceneRocks(){
  if(rockModels.length===0)return;
  clearSceneRocks();
  const count=isMobileLayout()?MOBILE_ROCK_COUNT:SCENE_ROCK_COUNT;
  const placed=[];
  const minDist2=ROCK_MIN_DISTANCE*ROCK_MIN_DISTANCE;
  const playerStartX=player.position.x,playerStartZ=player.position.z;
  const safeDist2=(ROCK_PLAYER_CLEAR_RADIUS+playerRadius+.12)*(ROCK_PLAYER_CLEAR_RADIUS+playerRadius+.12);
  for(let attempt=0;attempt<count*16&&placed.length<count;attempt++){
    const pos=randomPosition();
    if(!isOnPlatform(pos.x,pos.z,-.05))continue;
    const dx=pos.x-playerStartX,dz=pos.z-playerStartZ;
    if(dx*dx+dz*dz<safeDist2)continue;
    let tooClose=false;
    for(const p of placed){
      if(dist2DSq(pos.x,pos.z,p.position.x,p.position.z) < minDist2){tooClose=true;break}
    }
    if(tooClose)continue;
    const srcModel=rockModels[Math.floor(Math.random()*rockModels.length)];
    const rockClone=srcModel.clone(true);
    const scale=.005+Math.random()*.006;
    rockClone.scale.setScalar(scale);
    rockClone.rotation.set((Math.random()-.5)*.3,Math.random()*Math.PI*2,0);
    rockClone.updateMatrixWorld(true);
    rockClone.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh){
        obj.material=rockMaterial;
        obj.castShadow=!_isMobile;
        obj.receiveShadow=true;
      }
    });
    const rockBox=new THREE.Box3().setFromObject(rockClone);
    const rockSize=new THREE.Vector3();rockBox.getSize(rockSize);
    const radius=Math.max(rockSize.x,rockSize.z)*.3+.02;
    rockClone.position.set(pos.x,0,pos.z);
    scene.add(rockClone);
    placed.push(rockClone);
    rocks.push({mesh:rockClone,radius});
  }
}

function clearSceneRocks(){
  for(const rock of rocks){
    if(rock.mesh)scene.remove(rock.mesh);
  }
  rocks.length=0;
}

function spawnEnemyGroup(count){
  const canSpawn=Math.max(0,getMaxEnemies()-enemies.length-enemySpawnQueue.length);
  const real=Math.min(count,canSpawn);
  if(real<=0)return;
  for(let i=0;i<real;i++){
    const pos=randomEdgePosition();
    clampToWorld(pos);
    enemySpawnQueue.push(pos);
  }
}

function processEnemySpawnQueue(){
  const perFrame=5;
  for(let i=0;i<perFrame&&enemySpawnQueue.length>0;i++){
    if(enemies.length>=getMaxEnemies()){enemySpawnQueue.length=0;return}
    spawnEnemyAt(enemySpawnQueue.shift());
  }
}

function spawnEnemyAt(pos){
  const t=getTier();
  const group=new THREE.Group();
  const body=new THREE.Mesh(shared.geo.enemyBody,shared.mat.enemyBody);
  body.position.y=.75;body.castShadow=true;body.receiveShadow=true;group.add(body);
  const horn=new THREE.Mesh(shared.geo.enemyHorn,shared.mat.enemyHorn);
  horn.position.y=1.45;horn.castShadow=true;group.add(horn);
  const eye1=new THREE.Mesh(shared.geo.enemyEye,shared.mat.enemyEye);
  eye1.position.set(-.2,.85,.58);group.add(eye1);
  const eye2=new THREE.Mesh(shared.geo.enemyEye,shared.mat.enemyEye);
  eye2.position.set(.2,.85,.58);group.add(eye2);
  group.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z),pos.z);
  scene.add(group);
  enemies.push({mesh:group,type:"normal",radius:.7,speed:t.enemySpeed,damage:t.enemyDamage,spawnTime:performance.now(),active:false,agility:1.0,stuckTimer:0,lastCheckPos:group.position.clone(),lastDir:new THREE.Vector3(0,0,0),jumpTimer:Math.random()*.75,basePlatformY:getPlatformHeightAt(pos.x,pos.z)});
}

function spawnPurpleEnemy(){
  if(getPurpleEnemyCount()>=getPurpleMaxCount())return;
  const t=getTier();
  const pos=randomEdgePosition();
  let group;
  if(purpleEnemyPool.length>0){
    group=purpleEnemyPool.pop();
  }else{
    group=createPurpleEnemyMesh();
  }
  group.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z),pos.z);
  group.visible=true;
  scene.add(group);
  enemies.push({mesh:group,type:"purple",radius:.7*1.3,speed:t.enemySpeed*1.1,damage:Math.round(t.enemyDamage*1.6),spawnTime:performance.now(),active:false,agility:1.45,stuckTimer:0,lastCheckPos:group.position.clone(),lastDir:new THREE.Vector3(0,0,0),jumpTimer:Math.random()*.75,basePlatformY:getPlatformHeightAt(pos.x,pos.z)});
  _purpleCount++;
  playSfx("purple");
}

function createPurpleEnemyMesh(){
  const group=new THREE.Group();
  const body=new THREE.Mesh(shared.geo.purpleBody,shared.mat.purpleBody);
  body.position.y=.75*1.3;body.castShadow=!isMobileLayout();body.receiveShadow=true;group.add(body);
  const horn=new THREE.Mesh(shared.geo.purpleHorn,shared.mat.purpleHorn);
  horn.position.y=1.48*1.3;horn.castShadow=!isMobileLayout();group.add(horn);
  const aura=new THREE.Mesh(shared.geo.purpleAura,shared.mat.purpleAura);
  aura.position.y=.78*1.3;aura.rotation.x=Math.PI/2;group.add(aura);
  group.userData.torusChild=aura;
  return group;
}

function returnPurpleEnemyToPool(group){
  scene.remove(group);
  group.visible=false;
  purpleEnemyPool.push(group);
  _purpleCount--;
}

function prewarmPurpleEnemyPool(){
  const count=6;
  while(purpleEnemyPool.length<count){
    const group=createPurpleEnemyMesh();
    group.visible=false;
    purpleEnemyPool.push(group);
  }
}

function createGhostBossMesh(){
  const group=new THREE.Group();
  const disposeMaterials=[];
  if(bossModel){
    const bossClone=bossModel.clone();
    bossClone.scale.setScalar(BOSS_MODEL_SCALE);
    const playerMat=createPlayerMaterial();
    disposeMaterials.push(playerMat);
    bossClone.traverse(obj=>{
      if(obj.isMesh||obj.isSkinnedMesh){
        const name=(obj.name||"").toLowerCase();
        obj.material=name.includes("head")?playerMat:bossMaterial;
        obj.castShadow=!_isMobile;
        obj.receiveShadow=true;
        if(obj.isSkinnedMesh)obj.frustumCulled=false;
      }
    });
    bossClone.position.y=.3;
    group.add(bossClone);
  }else{
    const bodyMat=shared.mat.ghostBody.clone();
    disposeMaterials.push(bodyMat);
    const body=new THREE.Mesh(shared.geo.ghostBody,bodyMat);
    body.position.y=1.0;group.add(body);
  }
  const aura1=new THREE.Mesh(shared.geo.ghostAura,shared.mat.ghostAura1);
  aura1.position.y=3.7;aura1.rotation.x=Math.PI/2;group.add(aura1);
  const aura2=new THREE.Mesh(shared.geo.ghostAura,shared.mat.ghostAura2);
  aura2.position.y=3.7;aura2.rotation.y=Math.PI/2;group.add(aura2);
  group.userData.torusChildren=[aura1,aura2];
  for(let i=0;i<4;i++){
    const particle=new THREE.Mesh(shared.geo.ghostParticle,shared.mat.ghostParticle);
    const angle=(i/4)*Math.PI*2;
    particle.position.set(Math.cos(angle)*1.8,1+Math.sin(i*2.5)*.5,Math.sin(angle)*1.8);
    group.add(particle);
  }
  group.userData={...group.userData,aura1Mat:shared.mat.ghostAura1,aura2Mat:shared.mat.ghostAura2,coreMat:shared.mat.ghostCore,disposeMaterials};
  return group;
}

function spawnGhostBoss(){
  const t=getTier();
  const group=createGhostBossMesh();
  const centerX=0,centerZ=0;
  group.position.set(centerX,getPlatformHeightAt(centerX,centerZ),centerZ);
  scene.add(group);
  enemies.push({mesh:group,type:"ghost",radius:.65*1.3*2.2,speed:t.enemySpeed*1.1,damage:GHOST_BOSS_DAMAGE,spawnTime:performance.now(),active:true,life:GHOST_BOSS_LIFETIME,agility:0.8,stuckTimer:0,lastCheckPos:group.position.clone(),lastDir:new THREE.Vector3(0,0,0)});
  _ghostBossCount++;
  playSfx("purple");
}

function getFruitSpawnInterval(){if(aliveTime<5)return Infinity;if(aliveTime>=90)return 0.16;if(aliveTime>=60)return 0.25;if(aliveTime>=25)return 0.4;return 0.6}
function getSpeedFruitCount(){return fruits.filter(f=>f.type==="speed").length}
function getHealFruitCount(){return fruits.filter(f=>f.type==="heal").length}
function chooseFruitType(){if(aliveTime<8)return"speed";if(aliveTime<30)return Math.random()<.25?"heal":"speed";return Math.random()<.5?"speed":"heal"}

function spawnFruit(){
  if(aliveTime<5||fruits.length>=maxFruits)return;
  const type=chooseFruitType();
  if(type==="speed"&&getSpeedFruitCount()>=maxSpeedFruits){
    if(getHealFruitCount()<maxHealFruits){spawnFruitOfType("heal")}
    return;
  }
  if(type==="heal"&&getHealFruitCount()>=maxHealFruits){
    if(getSpeedFruitCount()<maxSpeedFruits){spawnFruitOfType("speed")}
    return;
  }
  spawnFruitOfType(type);
}
function spawnFruitOfType(type){
  const pos=findSafePosition(1.0);
  const group=createFruitMesh(type);
  group.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z),pos.z);
  scene.add(group);
  fruits.push({mesh:group,radius:.72,type,life:type==="speed"?9:8});
}

function createFruitMesh(type){
  const group=new THREE.Group();
  const disposeMaterials=[];
  if(type==="speed"){
    const fruit=new THREE.Mesh(shared.geo.speedFruit,shared.mat.speedFruit);
    fruit.position.y=.65;group.add(fruit);
    const ring=new THREE.Mesh(shared.geo.speedRing,shared.mat.speedRing);
    ring.position.y=.65;ring.rotation.x=Math.PI/2;group.add(ring);
    group.userData={torusChildren:[ring]};
  }
  if(type==="heal"){
    const box=new THREE.Mesh(shared.geo.healBox,shared.mat.healBox);
    box.position.y=.55;group.add(box);
    const crossA=new THREE.Mesh(shared.geo.healCrossA,shared.mat.healCross);
    crossA.position.set(0,.58,.43);group.add(crossA);
    const crossB=new THREE.Mesh(shared.geo.healCrossB,shared.mat.healCross);
    crossB.position.set(0,.58,.44);group.add(crossB);
  }
  if(type==="invincible"){
    const coreMat=new THREE.MeshStandardMaterial({color:0xfff36a,emissive:0xff66ff,emissiveIntensity:.75,roughness:.18,metalness:.2});
    disposeMaterials.push(coreMat);
    const core=new THREE.Mesh(shared.geo.invCore,coreMat);
    core.position.y=.7;group.add(core);
    const aura1Mat=new THREE.MeshBasicMaterial({color:0x66ffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
    disposeMaterials.push(aura1Mat);
    const aura1=new THREE.Mesh(shared.geo.invAura1,aura1Mat);
    aura1.position.y=.7;aura1.rotation.x=Math.PI/2;group.add(aura1);
    const aura2Mat=new THREE.MeshBasicMaterial({color:0xff66ff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
    disposeMaterials.push(aura2Mat);
    const aura2=new THREE.Mesh(shared.geo.invAura2,aura2Mat);
    aura2.position.y=.7;aura2.rotation.y=Math.PI/2;group.add(aura2);
    group.userData={coreMat,aura1Mat,aura2Mat,torusChildren:[aura1,aura2],disposeMaterials};
  }
  if(disposeMaterials.length&&!group.userData.disposeMaterials)group.userData.disposeMaterials=disposeMaterials;
  return group;
}

function getInvincibleFruitCount(){return fruits.filter(f=>f.type==="invincible").length}
function spawnInvincibleFruit(){
  if(getInvincibleFruitCount()>=INVINCIBLE_FRUIT_COUNT)return;
  const pos=findSafePosition(1.0);
  const group=createFruitMesh("invincible");
  group.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z),pos.z);
  scene.add(group);
  fruits.push({mesh:group,radius:1.1,type:"invincible",life:INVINCIBLE_FRUIT_LIFE});
}
function activateInvincible(){
  invincibleTimer=INVINCIBLE_DURATION;
  invincibleVisualActive=true;
  invincibleTextureActive=true;
  invincibleEndTransitionTimer=0;
  ensureInvincibleAura();
  applyPlayerInvincibleTexture(true);
  playSfx("invincible");
}

function ensureInvincibleAura(){
  if(!player)return;
  if(invincibleAura){
    invincibleAura.ring.material.opacity=.9;
    invincibleAura.pulse.material.opacity=.5;
    return;
  }
  const group=new THREE.Group();
  const ringMat=new THREE.MeshBasicMaterial({color:0xfff36a,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.75,1.18,72),ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.set(1.25,.28,.05);group.add(ring);
  const pulseMat=new THREE.MeshBasicMaterial({color:0x8effff,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const pulse=new THREE.Mesh(new THREE.CircleGeometry(.88,72),pulseMat);
  pulse.rotation.x=-Math.PI/2;pulse.position.set(1.25,.26,.05);group.add(pulse);
  group.scale.setScalar(1.65);
  player.add(group);
  invincibleAura={group,ring,pulse};
}
const AURA_COLLISION_RADIUS=3.3;

function removeInvincibleAura(){
  if(!invincibleAura)return;
  disposeGroup(invincibleAura.group,player);
  invincibleAura=null;
}

function updateInvincibleState(dt){
  if(invincibleTimer>0){invincibleTimer-=dt;if(invincibleTimer<0)invincibleTimer=0}
  if(invincibleTimer>0){
    invincibleHue=(invincibleHue+dt*.75)%1;
    const color=new THREE.Color().setHSL(invincibleHue,.95,.62);
    const emissive=new THREE.Color().setHSL((invincibleHue+.35)%1,.95,.45);
    const pulseV=.45+Math.sin(aliveTime*18)*.25;
    for(const target of playerTintTargets){
      if(target.mat.color)target.mat.color.copy(color);
      if(target.mat.emissive){target.mat.emissive.copy(emissive);target.mat.emissiveIntensity=.35+pulseV}
    }
    if(invincibleAura){
      const pct=Math.min(1,invincibleTimer/INVINCIBLE_DURATION);
      invincibleAura.group.rotation.y+=dt*4.2;
      invincibleAura.ring.rotation.z+=dt*7;
      invincibleAura.ring.scale.setScalar(1+Math.sin(aliveTime*8)*.15);
      invincibleAura.ring.material.opacity=.55+.4*pct;
      invincibleAura.pulse.scale.setScalar(1+Math.sin(aliveTime*6+.5)*.2);
      invincibleAura.pulse.material.opacity=.3+.25*pct;
    }
  }else if(invincibleVisualActive){
    invincibleVisualActive=false;
    removeInvincibleAura();
    restorePlayerTint();
    invincibleEndTransitionTimer=.5;
  }
}

function applyAuraKillToEnemies(){
  if(!invincibleAura||!player||invincibleTimer<=0)return;
  const aRadSq=AURA_COLLISION_RADIUS*AURA_COLLISION_RADIUS;
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(dist2DSq(player.position.x,player.position.z,e.mesh.position.x,e.mesh.position.z)<aRadSq){
      spawnEnemyDeathExplosion(e.mesh.position);
      if(e.type==="purple")returnPurpleEnemyToPool(e.mesh);
      else{if(e.type==="ghost")_ghostBossCount--;removeSceneGroup(e.mesh)}
      enemies.splice(i,1);
    }
  }
}

function restorePlayerTint(){
  for(const target of playerTintTargets){
    if(target.mat.color)target.mat.color.copy(target.color);
    if(target.mat.emissive&&target.emissive){target.mat.emissive.copy(target.emissive);target.mat.emissiveIntensity=0}
  }
}

function updateFog(){
  if(!scene.fog)return;
  const h=Math.max(camera.position.y,.2);
  const heightFactor=Math.exp(-h*.04);
  scene.fog.density=(isMobileLayout()? .0006:.001)*(.45+.55*heightFactor);
}

function resetPauseUI(){
  isPaused=false;
  const btn=document.getElementById("pauseBtn");
  if(btn)btn.classList.remove("is-paused");
  const overlay=document.getElementById("debugOverlay");
  if(DEBUG_ENABLED&&overlay){
    overlay.classList.remove("active");
    exitDebugCameraMode();
    clearDebugHighlight();
    updateDebugInfoPanel(null);
  }
  const pauseMenu=document.getElementById("pauseMenu");
  if(pauseMenu){
    pauseMenu.style.display="none";
    pauseMenu.setAttribute("aria-hidden","true");
  }
}

function returnToHome(){
  if(_navigatingHome)return;
  _navigatingHome=true;
  releaseJoystickInput();
  resetPauseUI();
  gameRunning=false;
  moveInput.set(0,0);
  stopBGM();
  try{
    if(document.fullscreenElement)document.exitFullscreen();
  }catch(e){}
  location.href="home.html";
}

function togglePause(){
  if(!gameRunning)return;
  isPaused=!isPaused;
  const btn=document.getElementById("pauseBtn");
  const overlay=document.getElementById("debugOverlay");
  const pauseMenu=document.getElementById("pauseMenu");
  if(isPaused){
    btn.classList.add("is-paused");
    if(pauseMenu){
      pauseMenu.style.display="flex";
      pauseMenu.setAttribute("aria-hidden","false");
    }
    if(DEBUG_ENABLED&&overlay){
      overlay.classList.add("active");
      enterDebugCameraMode();
    }
    pauseBGM();
  }else{
    btn.classList.remove("is-paused");
    if(pauseMenu){
      pauseMenu.style.display="none";
      pauseMenu.setAttribute("aria-hidden","true");
    }
    if(DEBUG_ENABLED&&overlay){
      overlay.classList.remove("active");
      exitDebugCameraMode();
      clearDebugHighlight();
      updateDebugInfoPanel(null);
    }
    resumeBGM();
  }
}

function enterDebugCameraMode(){
  if(!debugCameraMode){
    originalCameraState={
      position:camera.position.clone(),
      target:new THREE.Vector3().copy(player?player.position:new THREE.Vector3()),
      rotation:camera.rotation.clone()
    };
  }
  debugCameraMode=true;
  if(scene.fog)scene.fog.density=isMobileLayout()?.00045:.0007;
  collectDebugHighlightObjects();
  if(debugHighlightEnabled)applyDebugHighlight();
}

function exitDebugCameraMode(){
  debugCameraMode=false;
  toggleCollisionVisibility(false);
  const colToggle=document.getElementById("dbgCollisionToggle");
  if(colToggle)colToggle.checked=false;
  if(scene.fog)scene.fog.density=(isMobileLayout()?.0006:.001)*(.45+.55*Math.exp(-Math.max(camera.position.y,.2)*.04));
  clearDebugHighlight();
  debugSelectedObject=null;
}

function updateDebugCamera(dt){
  if(!debugCameraMode||!isPaused)return;
  const speed=debugCameraSpeed;
  const moveDir=new THREE.Vector3();
  const forward=new THREE.Vector3();
  camera.getWorldDirection(forward);
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  if(keys["KeyW"])moveDir.add(forward);
  if(keys["KeyS"])moveDir.sub(forward);
  if(keys["KeyA"])moveDir.sub(right);
  if(keys["KeyD"])moveDir.add(right);
  if(keys["KeyQ"])moveDir.y-=1;
  if(keys["KeyE"])moveDir.y+=1;
  if(keys["ShiftLeft"]||keys["ShiftRight"])moveDir.multiplyScalar(2.5);
  if(moveDir.lengthSq()>0){
    moveDir.normalize().multiplyScalar(speed*dt);
    camera.position.add(moveDir);
  }
  if(debugMouseRight||keys["KeyR"]){
    debugCameraSpherical.theta-=(mouseDX||0)*.005;
    debugCameraSpherical.phi-=(mouseDY||0)*.005;
    debugCameraSpherical.phi=Math.max(.05,Math.min(Math.PI-.05,debugCameraSpherical.phi));
    debugCameraTarget.copy(camera.position).addScaledVector(forward,debugCameraSpherical.radius);
    camera.position.set(
      debugCameraTarget.x+debugCameraSpherical.radius*Math.sin(debugCameraSpherical.phi)*Math.cos(debugCameraSpherical.theta),
      debugCameraTarget.y+debugCameraSpherical.radius*Math.cos(debugCameraSpherical.phi),
      debugCameraTarget.z+debugCameraSpherical.radius*Math.sin(debugCameraSpherical.phi)*Math.sin(debugCameraSpherical.theta)
    );
    camera.lookAt(debugCameraTarget);
  }
  updateDebugTooltip();
}

let mouseDX=0,mouseDY=0;
function setupDebugInput(){
  document.getElementById("pauseBtn").addEventListener("click",togglePause);
  const pauseResumeBtn=document.getElementById("pauseResumeBtn");
  const pauseHomeBtn=document.getElementById("pauseHomeBtn");
  if(pauseResumeBtn)pauseResumeBtn.addEventListener("click",()=>{if(isPaused)togglePause()});
  if(pauseHomeBtn)pauseHomeBtn.addEventListener("click",returnToHome);
  if(!DEBUG_ENABLED)return;
  const canvas=document.getElementById("game");
  canvas.addEventListener("contextmenu",e=>{if(debugCameraMode&&isPaused)e.preventDefault()});
  window.addEventListener("mousedown",e=>{
    if(!debugCameraMode||!isPaused)return;
    if(e.button===2){debugMouseRight=true;debugPrevMouse.set(e.clientX,e.clientY)}
    if(e.button===0){
      debugMouseDown=true;
      debugPrevMouse.set(e.clientX,e.clientY);
      updateDebugTooltip();
    }
  });
  window.addEventListener("mouseup",e=>{
    if(!debugCameraMode||!isPaused){debugMouseDown=false;debugMouseRight=false;return}
    if(e.button===2)debugMouseRight=false;
    if(e.button===0){
      if(Math.abs(e.clientX-debugPrevMouse.x)<3&&Math.abs(e.clientY-debugPrevMouse.y)<3){
        if(!e.target.closest("#debugOverlay")){
          pickDebugObject(e.clientX,e.clientY);
        }
      }
      debugMouseDown=false;
    }
  });
  window.addEventListener("mousemove",e=>{
    if(!debugCameraMode||!isPaused){debugMouseDown=false;debugMouseRight=false;return}
    mouseDX=e.clientX-debugPrevMouse.x;
    mouseDY=e.clientY-debugPrevMouse.y;
    debugPrevMouse.set(e.clientX,e.clientY);
    if(!debugMouseRight){mouseDX=0;mouseDY=0}
    if(debugMouseDown&&!debugMouseRight){
      updateDebugTooltip();
    }
  });
  window.addEventListener("wheel",e=>{
    if(!debugCameraMode||!isPaused)return;
    debugCameraSpeed=Math.max(.5,Math.min(200,debugCameraSpeed*(e.deltaY>0?1.15:.87)));
  },{passive:true});
  document.querySelectorAll(".dbg-speed-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".dbg-speed-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      debugSpeedIndex=parseInt(btn.dataset.speed);
      debugCameraSpeed=debugSpeedPresets[debugSpeedIndex];
    });
  });
  document.getElementById("dbgHighlightToggle").addEventListener("change",e=>{
    debugHighlightEnabled=e.target.checked;
    if(debugHighlightEnabled)applyDebugHighlight();
    else clearDebugHighlight();
  });
  document.getElementById("dbgWireframeToggle").addEventListener("change",e=>{
    debugWireframeEnabled=e.target.checked;
    applyDebugWireframe();
  });
  document.getElementById("dbgCollisionToggle").addEventListener("change",e=>{
    toggleCollisionVisibility(e.target.checked);
  });
  document.getElementById("dbgSpawnInvincible").addEventListener("click",()=>{
    if(!gameRunning)return;
    runUsesDebugCheats=true;
    for(let i=0;i<20;i++){
      const pos=findSafePosition(1.0);
      const group=createFruitMesh("invincible");
      group.position.set(pos.x,getPlatformHeightAt(pos.x,pos.z),pos.z);
      scene.add(group);
      fruits.push({mesh:group,radius:1.1,type:"invincible",life:INVINCIBLE_FRUIT_LIFE});
    }
  });
  document.getElementById("dbgSpawnBoss").addEventListener("click",()=>{
    if(!gameRunning)return;
    runUsesDebugCheats=true;
    spawnGhostBoss();
  });
  document.getElementById("dbgSpawnBothFruits").addEventListener("click",()=>{
    if(!gameRunning)return;
    runUsesDebugCheats=true;
    for(let i=0;i<30;i++){
      const pos1=findSafePosition(1.0);
      const g1=createFruitMesh("invincible");
      g1.position.set(pos1.x,getPlatformHeightAt(pos1.x,pos1.z),pos1.z);
      scene.add(g1);
      fruits.push({mesh:g1,radius:1.1,type:"invincible",life:INVINCIBLE_FRUIT_LIFE});
    }
    for(let i=0;i<30;i++){
      const pos2=findSafePosition(1.0);
      const g2=createFruitMesh("speed");
      g2.position.set(pos2.x,getPlatformHeightAt(pos2.x,pos2.z),pos2.z);
      scene.add(g2);
      fruits.push({mesh:g2,radius:.72,type:"speed",life:9});
    }
  });
}

function collectDebugHighlightObjects(){
  clearDebugHighlight();
  debugHighlightObjects=[];
  debugHighlightOriginal={};
  scene.traverse(obj=>{
    if(obj.isMesh&&!obj.isSprite&&obj!==skyboxMesh&&obj.visible){
      debugHighlightObjects.push(obj);
    }
  });
}

function applyDebugHighlight(){
  if(!debugHighlightEnabled)return;
  debugHighlightObjects.forEach((obj,i)=>{
    const key=i;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    if(!debugHighlightOriginal[key]){
      debugHighlightOriginal[key]=materials.map(m=>({
        emissive:m.emissive?m.emissive.getHex():0,
        emissiveIntensity:m.emissiveIntensity||0
      }));
    }
    materials.forEach(m=>{
      if(m.emissive)m.emissive.setHex(0x00a0cc);
      m.emissiveIntensity=.15;
    });
  });
}

function clearDebugHighlight(){
  Object.keys(debugHighlightOriginal).forEach(key=>{
    const obj=debugHighlightObjects[parseInt(key)];
    if(obj&&obj.material){
      const materials=Array.isArray(obj.material)?obj.material:[obj.material];
      const saved=debugHighlightOriginal[key];
      if(Array.isArray(saved)){
        materials.forEach((m,i)=>{
          if(i<saved.length){
            if(m.emissive)m.emissive.setHex(saved[i].emissive);
            m.emissiveIntensity=saved[i].emissiveIntensity;
          }
        });
      }
    }
  });
  debugHighlightOriginal={};
  debugHighlightObjects=[];
}

function applyDebugWireframe(){
  debugHighlightObjects.forEach(obj=>{
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    materials.forEach(m=>{
      if(m.wireframe!==undefined)m.wireframe=debugWireframeEnabled;
    });
  });
}

function collectAllCollisionEntities(){
  debugCollisionEntities=[];
  if(platformCollisionModel){
    platformCollisionModel.traverse(obj=>{if(obj.isMesh||obj.isSkinnedMesh)debugCollisionEntities.push({mesh:obj,type:'平台碰撞',color:0xff2d55,group:platformCollisionModel,radius:platformWalkRadiusX})});
  }
  if(player){
    player.traverse(obj=>{if((obj.isMesh||obj.isSkinnedMesh)&&obj.material&&!obj.material.isPointsMaterial)debugCollisionEntities.push({mesh:obj,type:'玩家',color:0x00ff88,group:player,radius:playerRadius})});
  }
  for(const e of enemies){
    e.mesh.traverse(obj=>{if(obj.isMesh||obj.isSkinnedMesh)debugCollisionEntities.push({mesh:obj,type:e.type==='ghost'?'幽灵Boss':e.type==='purple'?'紫色怪':'普通敌人',color:e.type==='ghost'?0x00f0ff:e.type==='purple'?0xb44dff:0xff8800,group:e.mesh,radius:e.radius})});
  }
  for(const c of crystals){
    debugCollisionEntities.push({mesh:c.mesh,type:'晶石',color:0x00ccff,group:c.mesh,radius:c.radius,value:c.value});
  }
  for(const f of fruits){
    f.mesh.traverse(obj=>{if(obj.isMesh||obj.isSkinnedMesh)debugCollisionEntities.push({mesh:obj,type:f.type==='invincible'?'无敌果实':f.type==='speed'?'加速果实':'治愈果实',color:f.type==='invincible'?0xff00ff:f.type==='speed'?0xffcc00:0x44ff44,group:f.mesh,radius:f.radius})});
  }
}

function toggleCollisionVisibility(show){
  if(show){
    collectAllCollisionEntities();
    debugCollisionSaved=[];
    const colorMatCache={};
    for(const ent of debugCollisionEntities){
      if(!colorMatCache[ent.color]){
        colorMatCache[ent.color]=new THREE.MeshBasicMaterial({color:ent.color,wireframe:true,transparent:true,opacity:.82,depthTest:true});
      }
      const mat=colorMatCache[ent.color];
      if(ent.mesh.material)debugCollisionSaved.push({mesh:ent.mesh,material:ent.mesh.material});
      else debugCollisionSaved.push({mesh:ent.mesh,material:null});
      ent.mesh.visible=true;
      ent.mesh.material=mat;
    }
    const types={};for(const e of debugCollisionEntities){types[e.type]=(types[e.type]||0)+1}
    const summary=Object.entries(types).map(([k,v])=>`${k}:${v}`).join(' ');
    const bar=document.getElementById("debugTopBar");
    if(bar)bar.innerHTML='<span class="dbg-dot" style="background:var(--c-red)"></span>SCENE DEBUG · PAUSED · 碰撞 '+debugCollisionEntities.length+' ('+summary+')';
    collectDebugHighlightObjects();
    if(debugHighlightEnabled)applyDebugHighlight();
  }else{
    for(const saved of debugCollisionSaved){
      if(saved.material)saved.mesh.material=saved.material;
      else saved.mesh.material=null;
      if(platformCollisionModel&&isChildOf(saved.mesh,platformCollisionModel))saved.mesh.visible=false;
    }
    debugCollisionSaved=[];
    debugCollisionEntities=[];
    const bar=document.getElementById("debugTopBar");
    if(bar)bar.innerHTML='<span class="dbg-dot"></span>SCENE DEBUG · PAUSED';
    collectDebugHighlightObjects();
    if(debugHighlightEnabled)applyDebugHighlight();
  }
}

function pickDebugObject(clientX,clientY){
  const canvas=document.getElementById("game");
  const rect=canvas.getBoundingClientRect();
  const mouse=new THREE.Vector2(
    ((clientX-rect.left)/rect.width)*2-1,
    -((clientY-rect.top)/rect.height)*2+1
  );
  debugRaycaster.setFromCamera(mouse,camera);
  const intersects=debugRaycaster.intersectObjects(debugHighlightObjects,false);
  if(intersects.length>0){
    const obj=intersects[0].object;
    updateDebugInfoPanel(obj);
    highlightSelectedObject(obj);
  }else{
    updateDebugInfoPanel(null);
    clearSelectedObject();
  }
}

function highlightSelectedObject(obj){
  clearSelectedObject();
  if(!obj||!obj.material)return;
  debugSelectedObject=obj;
  const materials=Array.isArray(obj.material)?obj.material:[obj.material];
  const original=materials.map(m=>({
    emissive:m.emissive?m.emissive.getHex():0,
    emissiveIntensity:m.emissiveIntensity||0
  }));
  debugHighlightOriginal["_selected"]={obj,original};
  materials.forEach(m=>{
    if(m.emissive)m.emissive.setHex(0xff2d95);
    m.emissiveIntensity=.45;
  });
}

function clearSelectedObject(){
  if(!debugHighlightOriginal["_selected"])return;
  const {obj,original}=debugHighlightOriginal["_selected"];
  if(obj&&obj.material){
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    if(Array.isArray(original)){
      materials.forEach((m,i)=>{
        if(i<original.length){
          if(m.emissive)m.emissive.setHex(original[i].emissive);
          m.emissiveIntensity=original[i].emissiveIntensity;
        }
      });
    }
  }
  delete debugHighlightOriginal["_selected"];
  debugSelectedObject=null;
}

function updateDebugInfoPanel(obj){
  const body=document.getElementById("debugInfoBody");
  if(!obj){
    body.innerHTML='<div class="dbg-empty">点击模型查看属性</div>';
    return;
  }
  const bbox=new THREE.Box3().setFromObject(obj);
  const size=new THREE.Vector3();bbox.getSize(size);
  const center=new THREE.Vector3();bbox.getCenter(center);
  const vertCount=obj.geometry?.attributes?.position?.count||0;
  const faceCount=obj.geometry?.index?obj.geometry.index.count/3:vertCount/3;
  const matName=Array.isArray(obj.material)?`${obj.material.length}材质`:(obj.material?.name||"未命名");
  const geoType=obj.geometry?.type||"未知";
  const meshType=obj.type||"Mesh";
  const worldPos=new THREE.Vector3();obj.getWorldPosition(worldPos);
  const scale=new THREE.Vector3();obj.getWorldScale(scale);
  const isCollision=isChildOf(obj,platformCollisionModel);
  const colBadge=isCollision?'<span style="display:inline-block;padding:1px 8px;margin-left:4px;border-radius:4px;background:#ff2d55;color:#07071e;font-size:10px;font-weight:700">碰撞体</span>':'';
  let colInfo='';
  const colEntity=debugCollisionEntities.find(e=>e.mesh===obj);
  if(colEntity){
    colInfo=`
      <div class="dbg-kv" style="color:#ff2d55;font-weight:700">碰撞实体</div>
      <div class="dbg-kv">类别 <span style="color:${'#'+colEntity.color.toString(16).padStart(6,'0')}">${colEntity.type}</span></div>
      <div class="dbg-kv">碰撞半径 <span>${(colEntity.radius||0).toFixed(3)}</span></div>
      ${colEntity.value!==undefined?`<div class="dbg-kv">分值 <span>${colEntity.value}</span></div>`:''}
      ${colEntity.damage!==undefined?`<div class="dbg-kv">伤害 <span>${colEntity.damage}</span></div>`:''}
      ${colEntity.life!==undefined?`<div class="dbg-kv">存活时间 <span>${colEntity.life.toFixed(1)}s</span></div>`:''}
    `;
  }
  body.innerHTML=`
    <div class="dbg-kv">类型 <span>${meshType}${colBadge}</span></div>
    <div class="dbg-kv">名称 <span>${obj.name||"未命名"}</span></div>
    <div class="dbg-kv">UUID <span style="font-size:10px;word-break:break-all">${obj.uuid}</span></div>
    <div class="dbg-kv">几何体 <span>${geoType}</span></div>
    <div class="dbg-kv">面数 <span>${Math.round(faceCount)}</span></div>
    <div class="dbg-kv">顶点 <span>${vertCount}</span></div>
    <div class="dbg-kv">材质 <span>${matName}</span></div>
    <div class="dbg-kv">包围盒 <span>${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}</span></div>
    <div class="dbg-kv">位置 <span>${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)}</span></div>
    <div class="dbg-kv">缩放 <span>${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)}</span></div>
    <div class="dbg-kv">可见 <span>${obj.visible?"是":"否"}</span></div>
    ${colInfo}
    ${(()=>{const mats=Array.isArray(obj.material)?obj.material:[obj.material];const hasNorm=mats.some(m=>m.normalMap);if(!hasNorm)return'';const firstNorm=mats.find(m=>m.normalMap&&m.normalMap!==null);const ns=firstNorm?firstNorm.normalScale:new THREE.Vector2(1,1);const flipX=ns.x<0,flipY=ns.y<0;return`
      <label class="dbg-toggle" style="margin-top:6px"><input type="checkbox" id="dbgNormalToggle" ${mats.some(m=>m.normalMap&&m.normalMap!==null)?'checked':''} />法线贴图</label>
      <label class="dbg-toggle"><input type="checkbox" id="dbgNormalFlipX" ${flipX?'checked':''} />法线 反转X</label>
      <label class="dbg-toggle"><input type="checkbox" id="dbgNormalFlipY" ${flipY?'checked':''} />法线 反转Y</label>
    `})()}
  `;
  const normalToggle=document.getElementById("dbgNormalToggle");
  if(normalToggle){
    normalToggle.addEventListener("change",()=>{
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      mats.forEach(m=>{
        if(normalToggle.checked){m.normalMap=m.userData._savedNormalMap||m.normalMap;m.needsUpdate=true}
        else{m.userData._savedNormalMap=m.normalMap;m.normalMap=null;m.needsUpdate=true}
      });
    });
  }
  const flipXToggle=document.getElementById("dbgNormalFlipX");
  if(flipXToggle){
    flipXToggle.addEventListener("change",()=>{
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      mats.forEach(m=>{if(m.normalScale){m.normalScale.x=flipXToggle.checked?-Math.abs(m.normalScale.x):Math.abs(m.normalScale.x);m.needsUpdate=true}});
    });
  }
  const flipYToggle=document.getElementById("dbgNormalFlipY");
  if(flipYToggle){
    flipYToggle.addEventListener("change",()=>{
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      mats.forEach(m=>{if(m.normalScale){m.normalScale.y=flipYToggle.checked?-Math.abs(m.normalScale.y):Math.abs(m.normalScale.y);m.needsUpdate=true}});
    });
  }
}

function updateDebugTooltip(){
  const tooltip=document.getElementById("debugTooltip");
  if(!debugHighlightEnabled||!isPaused||!debugCameraMode||typeof mouseDX!=="number"){tooltip.style.display="none";return}
  const canvas=document.getElementById("game");
  const rect=canvas.getBoundingClientRect();
  const mouseX=(debugPrevMouse.x-rect.left)/rect.width*2-1;
  const mouseY=-(debugPrevMouse.y-rect.top)/rect.height*2+1;
  const mouse=new THREE.Vector2(mouseX,mouseY);
  debugRaycaster.setFromCamera(mouse,camera);
  const intersects=debugRaycaster.intersectObjects(debugHighlightObjects,false);
  if(intersects.length>0){
    const obj=intersects[0].object;
    tooltip.style.display="block";
    tooltip.style.left=(debugPrevMouse.x+16)+"px";
    tooltip.style.top=(debugPrevMouse.y-12)+"px";
    const name=obj.name||"未命名";
    const type=obj.type||"Mesh";
    tooltip.innerHTML=`<b>${name}</b> &middot; ${type}<br><span style="opacity:.65">点击查看详情</span>`;
  }else{
    tooltip.style.display="none";
  }
}

function animate(){
  requestAnimationFrame(animate);
  try{
    _frameCount++;
    const rawFrameTime=clock.getDelta();
    let frameTime=rawFrameTime;
    if(frameTime>MAX_FRAME_TIME)frameTime=MAX_FRAME_TIME;
    fpsFrameCount++;
    const fpsNow=performance.now();
    const fpsElapsed=fpsNow-fpsLastTime;
    if(fpsElapsed>=500){
      fps=Math.round(fpsFrameCount*1000/fpsElapsed);
      fpsFrameCount=0;
      fpsLastTime=fpsNow;
    }
    if(skyboxMesh&&camera)skyboxMesh.position.copy(camera.position);
    updateFog();
    if(isPaused){
      updateDebugCamera(frameTime);
      renderer.render(scene,camera);
      updateHUD();
      return;
    }
    if(gameOverPending){
      if(playerMixer)playerMixer.update(frameTime);
      renderer.render(scene,camera);
      return;
    }
    processEnemySpawnQueue();
    updatePerformance(Math.min(rawFrameTime,.05));
    if(gameRunning&&!gameOverPending){
      accumulator+=frameTime;
      let physicsSteps=0;
      const maxSteps=gameOverPending?0:8;
      while(accumulator>=FIXED_DT&&physicsSteps<maxSteps){
        update(FIXED_DT);
        if(gameOverPending)break;
        updatePlayerStatusText(FIXED_DT);
        accumulator-=FIXED_DT;
        physicsSteps++;
        if(!gameRunning||gameOverPending)break;
      }
      if(gameOverPending)accumulator=0;
      updateCamera(FIXED_DT);
    }else if(playerMixer)playerMixer.update(frameTime);
    applyFrustumCulling();
    renderer.render(scene,camera);
    updateHUD();
  }catch(err){
    console.error("animate error:",err);
  }
}

function updatePerformance(dt){
  frameTimeHistory.push(dt);
  performanceCheckCounter++;
  if(performanceCheckCounter>=PERFORMANCE_CHECK_INTERVAL){
    performanceCheckCounter=0;
    const avgFrameTime=frameTimeHistory.reduce((a,b)=>a+b,0)/frameTimeHistory.length;
    frameTimeHistory=[];
    if(avgFrameTime>.025&&performanceLevel<3){
      performanceLevel++;
      applyPerformanceLevel();
      frameTimeHistory=[];
    } else if(avgFrameTime<.014&&performanceLevel>1){
      performanceLevel--;
      applyPerformanceLevel();
      frameTimeHistory=[];
    }
  }
}

function applyPerformanceLevel(){
  if(!renderer)return;
  const pixelRatioCap=performanceLevel===1?(isMobileLayout()?1.15:1.35):performanceLevel===2?1:0.85;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,pixelRatioCap));
  renderer.shadowMap.enabled=performanceLevel===1&&!isMobileLayout();
  renderer.toneMappingExposure=isMobileLayout()?(performanceLevel===3?1.02:1.08):(performanceLevel===3?.98:1.02);
  if(platformAirPointSystem)platformAirPointSystem.visible=performanceLevel<3;
  for(const storm of sandstorms)storm.group.visible=performanceLevel<3;
}

function update(dt){
  if(gameOverPending)return;
  aliveTime+=dt;
  if(speedBuffTimer>0){speedBuffTimer-=dt;if(speedBuffTimer<=0){speedBuffTimer=0;speedStackLevel=0;if(speedTextureActive){speedEndTransitionTimer=.5}}}
  if(mysterySlowTimer>0){mysterySlowTimer-=dt;if(mysterySlowTimer<=0)mysterySlowTimer=0}
  if(lowHpWarningTimer>0){lowHpWarningTimer-=dt;warning.style.display="block"}else warning.style.display="none";
  updateSpeedTextureTransition(dt);
  updateInvincibleState(dt);
  updateInvincibleTextureTransition(dt);
  updatePlayer(dt);
  updatePlayerHeadUI();
  updatePlayerLocatorHalo(dt);
  updatePlayerSideEffects(dt);
  updateCrystalScorePopups(dt);
  updateCrystalBursts(dt);
  updateEnemyDeathExplosions(dt);
  if(performanceLevel<3)updatePlatformAirParticles(dt);
  if(performanceLevel<3)updateSandstorms(dt);
  updateDamageFeedback(dt);
  updatePlayerAnimation(dt);
  updateCrystals(dt);
  updateEnemies(dt);
  if(gameOverPending)return;
  applyAuraKillToEnemies();
  if(gameOverPending)return;
  updateFruits(dt);
  updateSpawns(dt);
  refreshPlayerStatusText();
  // Mystery heal: auto-heal when HP < 20%
  if(mysteryHealAvailable&&hp>0&&hp<maxHp*0.2){hp=maxHp;mysteryHealAvailable=false;setPlayerStatusText("heal",2.0)}
}

function updatePlayer(dt){
  playerMovingThisFrame=false;
  if(playerIsDead)return;
  _v2a.set(0,0);
  if(keys["KeyW"]||keys["ArrowUp"])_v2a.y-=1;
  if(keys["KeyS"]||keys["ArrowDown"])_v2a.y+=1;
  if(keys["KeyA"]||keys["ArrowLeft"])_v2a.x-=1;
  if(keys["KeyD"]||keys["ArrowRight"])_v2a.x+=1;
  _v2a.x+=moveInput.x;_v2a.y+=moveInput.y;
  if(_v2a.length()>1)_v2a.normalize();
  const speed=Math.min(basePlayerSpeed*(mysterySlowTimer>0?3/basePlayerSpeed:1)*(speedBuffTimer>0?1+speedStackLevel*0.5:1)*(invincibleTimer>0?INVINCIBLE_SPEED_MULTIPLIER:1),12);
  _v3a.set(_v2a.x,0,_v2a.y).multiplyScalar(speed*dt);
  if(_v3a.lengthSq()>0){
    playerMovingThisFrame=true;
    _v3b.copy(player.position);
    player.position.add(_v3a);
    clampToWorld(player.position);
    if(collidesWithRocks(player.position,playerRadius)){player.position.copy(_v3b);clampToWorld(player.position)}
    player.position.y=getPlatformHeightAt(player.position.x,player.position.z);
    player.rotation.y=Math.atan2(_v3a.x,_v3a.z);
  }else{
    player.position.y=getPlatformHeightAt(player.position.x,player.position.z);
  }
  if(knockbackVelocity.lengthSq()>.01){
    _v3b.copy(player.position);
    player.position.addScaledVector(knockbackVelocity,dt);
    clampToWorld(player.position);
    if(collidesWithRocks(player.position,playerRadius)){player.position.copy(_v3b);clampToWorld(player.position);knockbackVelocity.multiplyScalar(.25)}
    const ty=getPlatformHeightAt(player.position.x,player.position.z);
    player.position.y=ty;_playerLastY=ty;
    knockbackVelocity.multiplyScalar(Math.pow(.04,dt));
  }else knockbackVelocity.set(0,0,0);
}

function updateDamageFeedback(dt){
  if(invincibleTimer>0){damageFlashTimer=0;setPlayerTintDamaged(false);damageOverlay.style.opacity=0;return}
  if(damageFlashTimer>0){damageFlashTimer-=dt;setPlayerTintDamaged(true);damageOverlay.style.opacity=1}
  else{setPlayerTintDamaged(false);damageOverlay.style.opacity=0}
}

function updateCamera(dt){
  const camYOff=isMobileLayout()?24:17;
  const camZOff=isMobileLayout()?28:18;
  _v3c.set(player.position.x,player.position.y+camYOff,player.position.z+camZOff);
  camera.position.lerp(_v3c,1-Math.exp(-9*dt));
  _camLookTarget.lerp(player.position,1-Math.exp(-12*dt));
  camera.lookAt(_camLookTarget.x,_camLookTarget.y,_camLookTarget.z);
}

function updateCrystals(dt){
  const t=getTier();
  const tierChanged=_prevTierHex!==t.crystalColor;
  if(tierChanged){
    _prevTierHex=t.crystalColor;
    for(const c of crystals){
      c.value=t.crystalValue;
      c.mat.color.setHex(t.crystalColor);
      c.mat.emissive.setHex(t.crystalColor);
    }
  }
  for(let i=crystals.length-1;i>=0;i--){
    const c=crystals[i];
    if(c.collectTimer!=null){
      c.collectTimer+=dt;
      c.mesh.rotation.y+=dt*14;c.mesh.rotation.x+=dt*5;
      const progress=c.collectTimer/.5;
      const s=1-progress;
      c.mesh.scale.setScalar(s);
      c.mesh.position.y=c.collectBaseY+progress*3.5;
      if(c.collectTimer>=.5){
        spawnCrystalBurst();
        scene.remove(c.mesh);
        c.mat.dispose();
        crystals.splice(i,1);
        if(crystals.length<maxCrystals){
          setTimeout(()=>{if(gameRunning&&crystals.length<maxCrystals)spawnCrystal()},500);
        }
      }
      continue;
    }
    c.mesh.rotation.y+=dt*c.rotY;c.mesh.rotation.x+=dt*c.rotX;
    c.mesh.position.y=(c.baseY!=null?c.baseY:getPlatformHeightAt(c.mesh.position.x,c.mesh.position.z)+.8)+Math.sin(aliveTime*3+i)*.12;
    if(dist2DSq(player.position.x,player.position.z,c.mesh.position.x,c.mesh.position.z)<(playerRadius+c.radius)*(playerRadius+c.radius)){
      const mult=getScoreMultiplier();
      const addValue=Math.round(c.value*mult);
      score+=addValue;
      spawnCrystalScorePopup(addValue);
      playSfx("crystal");
      c.collectTimer=0;
      c.collectBaseY=c.mesh.position.y;
    }
  }
}

function updateEnemies(dt){
  const now=performance.now();
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(!e.active&&now-e.spawnTime>=300)e.active=true;
    if(!e.active){const s=1+Math.sin(now*.03)*.08;e.mesh.scale.setScalar(s);continue}
    const epx=e.mesh.position.x,epz=e.mesh.position.z;
    if(e.type==="purple"){
      e.mesh.scale.setScalar(1+Math.sin(aliveTime*6+i)*.035);
      if(e.mesh.userData.torusChild)e.mesh.userData.torusChild.rotation.z+=dt*3.5;
    }
    if(e.type==="ghost"){
      e.life-=dt;
      if(e.life<=0){_ghostBossCount--;removeSceneGroup(e.mesh);enemies.splice(i,1);continue}
      e.mesh.position.y=getPlatformHeightAt(e.mesh.position.x,e.mesh.position.z)+2.5+Math.sin(aliveTime*2.992+i)*.6;
      e.mesh.scale.setScalar(1+Math.sin(aliveTime*2+i)*.08);
      if(e.mesh.userData.torusChildren){for(const t of e.mesh.userData.torusChildren)t.rotation.z+=dt*4.5}
      if(e.mesh.userData.bodyMat){e.mesh.userData.bodyMat.opacity=.35+Math.sin(aliveTime*3)*.15}
      const dir=getEnemySteeringDirection(e);
      if(dir.lengthSq()>.001){
        e.mesh.position.addScaledVector(dir,e.speed*dt);
        clampToWorld(e.mesh.position);
        snapObjectToPlatform(e.mesh,0);
        e.mesh.rotation.y=Math.atan2(dir.x,dir.z);
      }
      if(dist2DSq(player.position.x,player.position.z,e.mesh.position.x,e.mesh.position.z)<(playerRadius+e.radius)*(playerRadius+e.radius)){
        applyPlayerDamage(e.damage,e.mesh.position);
      }
      continue;
    }
    const dir=getEnemySteeringDirection(e);
    if(dir.lengthSq()>.001){
      _v3a.copy(e.mesh.position);
      e.mesh.position.addScaledVector(dir,e.speed*dt);
      clampToWorld(e.mesh.position);
      if(collidesWithRocks(e.mesh.position,e.radius)){
        e.mesh.position.copy(_v3a);
        const escapeDir=getEnemyEscapeDirection(e);
        if(escapeDir.lengthSq()>.001){
          escapeDir.lerp(_v3h.set(Math.random()-.5,0,Math.random()-.5).normalize(),.13).normalize();
          e.mesh.position.addScaledVector(escapeDir,e.speed*dt*1.35);
          clampToWorld(e.mesh.position);
          if(collidesWithRocks(e.mesh.position,e.radius)){
            e.mesh.position.copy(_v3a);
            const tangentDir=getEnemyTangentEscape(e);
            e.mesh.position.addScaledVector(tangentDir,e.speed*dt*1.8);
            clampToWorld(e.mesh.position);
            if(collidesWithRocks(e.mesh.position,e.radius)){e.mesh.position.copy(_v3a)}
        }
      }
      }
      snapObjectToPlatform(e.mesh,0);
      e.mesh.rotation.y=Math.atan2(dir.x,dir.z);
    }else snapObjectToPlatform(e.mesh,0);
    updateJump(e,dt);
    updateEnemyStuckState(e,dt,epx,epz);
    if(e.type==="normal"&&now-e.spawnTime>=13000){
      spawnEnemyDeathExplosion(e.mesh.position);
      scene.remove(e.mesh);
      enemies.splice(i,1);
      continue;
    }
    if(e.stuckTimer>=ENEMY_STUCK_DESTROY_TIME){
      if(e.type==="purple"||e.type==="normal")spawnEnemyDeathExplosion(e.mesh.position);
      if(e.type==="purple")returnPurpleEnemyToPool(e.mesh);
      else{if(e.type==="ghost")_ghostBossCount--;removeSceneGroup(e.mesh)}
      enemies.splice(i,1);
      continue;
    }
    if(dist2DSq(player.position.x,player.position.z,e.mesh.position.x,e.mesh.position.z)<(playerRadius+e.radius)*(playerRadius+e.radius)){
      if(invincibleTimer<=0)applyPlayerDamage(e.damage,e.mesh.position);
      else{spawnPlayerSideEffect("shield");playSfx("invincibleHit")}
      spawnEnemyDeathExplosion(e.mesh.position);
      if(e.type==="purple")returnPurpleEnemyToPool(e.mesh);
      else removeSceneGroup(e.mesh);
      enemies.splice(i,1);
    }
  }
}

function updateEnemyStuckState(enemy,dt,startX,startZ){
  const frameMoveSq=dist2DSq(enemy.mesh.position.x,enemy.mesh.position.z,startX,startZ);
  if(frameMoveSq>ENEMY_STUCK_MOVE_EPSILON*ENEMY_STUCK_MOVE_EPSILON){
    enemy.stuckTimer=0;enemy.lastCheckPos.copy(enemy.mesh.position);return;
  }
  const totalMoveSq=dist2DSq(enemy.mesh.position.x,enemy.mesh.position.z,enemy.lastCheckPos.x,enemy.lastCheckPos.z);
  if(totalMoveSq>ENEMY_STUCK_MOVE_EPSILON*ENEMY_STUCK_MOVE_EPSILON*4){
    enemy.stuckTimer=0;enemy.lastCheckPos.copy(enemy.mesh.position);
  }else enemy.stuckTimer+=dt;
}

function updateJump(e,dt){
  if(!e.jumpTimer)return;
  e.jumpTimer+=dt;
  if(e.jumpTimer>=.75)e.jumpTimer-=.75;
  const phase=e.jumpTimer/.75;
  const h=Math.sin(phase*Math.PI);
  const jumpH=e.type==="purple"?2.0:1.8;
  e.basePlatformY=getPlatformHeightAt(e.mesh.position.x,e.mesh.position.z);
  e.mesh.position.y=e.basePlatformY+h*jumpH;
}

function getEnemyEscapeDirection(enemy){
  const pos=enemy.mesh.position,away=_v3b.set(0,0,0);
  for(const rock of rocks){
    const rx=rock.mesh.position.x,rz=rock.mesh.position.z,rr=rock.radius;
    const danger=rr+enemy.radius+0.6,dangerSq=danger*danger;
    const sx=pos.x-rx,sz=pos.z-rz,dSq=sx*sx+sz*sz;
    if(dSq<dangerSq){
      _v3c.set(sx,0,sz);
      if(_v3c.lengthSq()>.001){_v3c.normalize();away.addScaledVector(_v3c,(danger-Math.sqrt(dSq))/danger+0.35)}
    }
  }
  for(const other of enemies){
    if(other===enemy)continue;
    const ox=other.mesh.position.x,oz=other.mesh.position.z;
    const dx=pos.x-ox,dz=pos.z-oz,dSq=dx*dx+dz*dz;
    const sepDist=enemy.radius+other.radius+0.5,sepSq=sepDist*sepDist;
    if(dSq<sepSq&&dSq>.001){
      const invD=1/Math.sqrt(dSq);
      _v3c.set(dx*invD,0,dz*invD);
      away.addScaledVector(_v3c,(sepDist-Math.sqrt(dSq))/sepDist+0.15);
    }
  }
  if(away.lengthSq()<.001)away.set(Math.random()-.5,0,Math.random()-.5);
  away.normalize();
  return away;
}

function getEnemySteeringDirection(enemy){
  const pos=enemy.mesh.position,toPlayer=_v3b.subVectors(player.position,pos);
  toPlayer.y=0;
  const playerDistSq=toPlayer.lengthSq();
  if(playerDistSq>.001){
    if(playerDistSq>625){toPlayer.normalize();return toPlayer}
    toPlayer.normalize();
  }else return toPlayer.set(0,0,0);
  const agility=enemy.agility||1;
  const speedRatio=(enemy.speed||3.0)/3.0;
  const lookAhead=2.5*agility*speedRatio;
  const avoidance=_v3c.set(0,0,0),future=_v3d.copy(pos).addScaledVector(toPlayer,lookAhead);
  for(const rock of rocks){
    const rx=rock.mesh.position.x,rz=rock.mesh.position.z,rr=rock.radius;
    const danger=rr+enemy.radius+0.6*agility,dangerSq=danger*danger;
    const sx=pos.x-rx,sz=pos.z-rz,distNowSq=sx*sx+sz*sz;
    const fx=future.x-rx,fz=future.z-rz,distFutureSq=fx*fx+fz*fz;
    if(distNowSq<dangerSq||distFutureSq<dangerSq){
      const away=_v3e.set(sx,0,sz);
      if(away.lengthSq()>.001){
        away.normalize();
        const tangentA=_v3f.set(-away.z,0,away.x),tangentB=_v3g.set(away.z,0,-away.x),tangent=tangentA.dot(toPlayer)>tangentB.dot(toPlayer)?tangentA:tangentB;
        const strength=THREE.MathUtils.clamp((danger-Math.sqrt(Math.min(distNowSq,distFutureSq)))/danger,0,1);
        avoidance.addScaledVector(away,strength*0.5*agility);
        avoidance.addScaledVector(tangent,strength*1.5*agility);
      }
    }
  }
  for(const other of enemies){
    if(other===enemy)continue;
    const ox=other.mesh.position.x,oz=other.mesh.position.z;
    const dx=pos.x-ox,dz=pos.z-oz,dSq=dx*dx+dz*dz;
    const sepDist=enemy.radius+other.radius+0.5,sepSq=sepDist*sepDist;
    if(dSq<sepSq&&dSq>.001){
      const invD=1/Math.sqrt(dSq);
      _v3e.set(dx*invD,0,dz*invD);
      avoidance.addScaledVector(_v3e,(sepDist-Math.sqrt(dSq))/sepDist*0.35);
    }
  }
  toPlayer.multiplyScalar(enemy.type==="purple"?1.2:1.0).add(avoidance);
  if(toPlayer.lengthSq()>.001)toPlayer.normalize();
  return toPlayer;
}

function getEnemyTangentEscape(enemy){
  const pos=enemy.mesh.position;
  let nearestRock=null,nearestDistSq=Infinity;
  for(const rock of rocks){
    const dx=pos.x-rock.mesh.position.x,dz=pos.z-rock.mesh.position.z,dSq=dx*dx+dz*dz;
    if(dSq<nearestDistSq){nearestDistSq=dSq;nearestRock=rock;}
  }
  if(!nearestRock){_v3b.set(Math.random()-.5,0,Math.random()-.5).normalize();return _v3b}
  _v3b.set(pos.x-nearestRock.mesh.position.x,0,pos.z-nearestRock.mesh.position.z);
  if(_v3b.lengthSq()<.001){_v3b.set(Math.random()-.5,0,Math.random()-.5).normalize();return _v3b}
  _v3b.normalize();
  _v3d.set(-_v3b.z,0,_v3b.x);
  _v3e.set(_v3b.z,0,-_v3b.x);
  _v3c.subVectors(player.position,pos);_v3c.y=0;
  const tangent=_v3c.dot(_v3d)>_v3c.dot(_v3e)?_v3d:_v3e;
  _v3b.copy(tangent).lerp(_v3c.set(Math.random()-.5,0,Math.random()-.5).normalize(),.15).normalize();
  return _v3b;
}

function getPurpleWanderDirection(enemy,dt){
  enemy.wanderTimer-=dt;
  if(enemy.wanderTimer<=0)resetPurpleWander(enemy);
  const dir=_v3b.copy(enemy.wanderDir),avoidance=_v3c.set(0,0,0),future=_v3d.copy(enemy.mesh.position).addScaledVector(dir,2.0);
  for(const rock of rocks){
    const rx=rock.mesh.position.x,rz=rock.mesh.position.z,rr=rock.radius;
    const danger=rr+enemy.radius+0.6,dangerSq=danger*danger;
    const dx=future.x-rx,dz=future.z-rz,dSq=dx*dx+dz*dz;
    if(dSq<dangerSq){
      const sx=enemy.mesh.position.x-rx,sz=enemy.mesh.position.z-rz;
      const away=_v3e.set(sx,0,sz);
      if(away.lengthSq()>.001){away.normalize();avoidance.addScaledVector(away,(danger-Math.sqrt(dSq))/danger*0.5)}
    }
  }
  dir.add(avoidance);
  if(dir.lengthSq()>.001)dir.normalize();
  return dir;
}

function resetPurpleWander(enemy){
  const a=Math.random()*Math.PI*2;
  enemy.wanderDir.set(Math.cos(a),0,Math.sin(a));
  enemy.wanderTimer=THREE.MathUtils.randFloat(1.5,3.8);
}

function applyPlayerDamage(damage,enemyPosition){
  if(playerIsDead)return;
  if(invincibleTimer>0){playSfx("invincibleHit");spawnPlayerSideEffect("shield");return}
  hp-=damage;
  playSfx("damage");
  damageFlashTimer=.18;
  playerHitAnimTimer=.45;
  forcePlayPlayerAnim("attacked",.05);
  if(hp<=15){lowHpWarningTimer=3.0;warning.style.display="block"}
  _v3h.subVectors(player.position,enemyPosition);
  _v3h.y=0;
  if(_v3h.lengthSq()<.001)_v3h.set(Math.random()-.5,0,Math.random()-.5);
  _v3h.normalize();
  knockbackVelocity.copy(_v3h.multiplyScalar(13.5));
  if(hp<=0){endGame();return;}
}

function updateFruits(dt){
  for(let i=fruits.length-1;i>=0;i--){
    const f=fruits[i];
    f.life-=dt;
    f.mesh.rotation.y+=dt*(f.type==="invincible"?22.5:2.5);
    if(f.mesh.userData.torusChildren){
      const rotZ=dt*(f.type==="invincible"?30:2.5);
      for(const t of f.mesh.userData.torusChildren)t.rotation.z+=rotZ;
    }
    if(f.type==="invincible"&&f.mesh.userData.coreMat){
      const hue=(aliveTime*1.2+f.mesh.id*0.7)%1;
      _fruitColor0.setHSL(hue,.9,.58);
      _fruitColor1.setHSL((hue+.35)%1,.95,.45);
      _fruitColor2.setHSL((hue+.15)%1,1,.6);
      _fruitColor3.setHSL((hue+.5)%1,1,.55);
      f.mesh.userData.coreMat.color.copy(_fruitColor0);
      f.mesh.userData.coreMat.emissive.copy(_fruitColor1);
      f.mesh.userData.aura1Mat.color.copy(_fruitColor2);
      f.mesh.userData.aura2Mat.color.copy(_fruitColor3);
    }
    f.mesh.position.y=getPlatformHeightAt(f.mesh.position.x,f.mesh.position.z)+Math.sin(aliveTime*4+i)*.12;
    if(f.life<=0){removeSceneGroup(f.mesh);fruits.splice(i,1);continue}
    if(dist2DSq(player.position.x,player.position.z,f.mesh.position.x,f.mesh.position.z)<(playerRadius+f.radius)*(playerRadius+f.radius)){
      if(f.type==="speed"){speedStackLevel=Math.min(speedStackLevel+1,5);speedBuffTimer=2.5;speedEndTransitionTimer=0;if(!speedTextureActive){speedTextureActive=true;applyPlayerSpeedTexture(true)}spawnPlayerSideEffect("speed");refreshPlayerStatusText()}
      if(f.type==="heal"){hp=Math.min(maxHp,hp+HEAL_AMOUNT);setPlayerStatusText("heal",2.0)}
      if(f.type==="invincible"){activateInvincible();refreshPlayerStatusText()}
      removeSceneGroup(f.mesh);
      fruits.splice(i,1);
    }
  }
}

function updateSpawns(dt){
  crystalSpawnTimer+=dt;enemySpawnTimer+=dt;fruitSpawnTimer+=dt;purpleEnemySpawnTimer+=dt;invincibleFruitSpawnTimer+=dt;ghostBossSpawnTimer+=dt;
  const maxCrystalCount=maxCrystals;
  if(crystalSpawnTimer>CRYSTAL_SPAWN_INTERVAL&&crystals.length<maxCrystalCount){crystalSpawnTimer=0;spawnCrystal()}
  if(enemySpawnTimer>getEnemySpawnInterval()){enemySpawnTimer=0;spawnEnemyGroup(getEnemyGroupSize())}
  const purpleInterval=getPurpleSpawnInterval();
  if(purpleInterval<Infinity&&purpleEnemySpawnTimer>purpleInterval){
    purpleEnemySpawnTimer=0;
    if(getPurpleEnemyCount()<getPurpleMaxCount())spawnPurpleEnemy();
  }
  if(aliveTime>=10&&invincibleFruitSpawnTimer>nextInvincibleFruitSpawnTime){
    invincibleFruitSpawnTimer=0;nextInvincibleFruitSpawnTime=THREE.MathUtils.randFloat(4.5,6.5);
    spawnInvincibleFruit();
  }
  const fruitInterval=getFruitSpawnInterval();
  if(fruitSpawnTimer>fruitInterval&&fruits.length<maxFruits){
    fruitSpawnTimer=0;
    const count=aliveTime>=120?randomInt(3,4):aliveTime>=60?randomInt(2,3):aliveTime>=25?randomInt(1,2):1;
    for(let i=0;i<count;i++){if(fruits.length<maxFruits)spawnFruit()}
  }
  if(ghostBossSpawnTimer>GHOST_BOSS_SPAWN_INTERVAL){
    ghostBossSpawnTimer=0;
    spawnGhostBoss();
  }
}

function updateHUD(){
  setBind("score",score);
  setBind("time",aliveTime.toFixed(1));
  setBind("fps",fps);
}

function endGame(){
  if(gameOverPending)return;
  gameOverPending=true;
  gameRunning=false;
  playerIsDead=true;
  accumulator=0;
  document.body.classList.add("is-game-over");
  const gameCanvas=document.getElementById("game");
  if(gameCanvas)gameCanvas.style.pointerEvents="none";

  releaseJoystickInput();
  resetPauseUI();
  const pauseBtn=document.getElementById("pauseBtn");
  if(pauseBtn)pauseBtn.style.display="none";
  const scanlinesEl=document.getElementById("scanlines");
  if(scanlinesEl)scanlinesEl.style.display="none";
  const joystickEl=document.getElementById("joystick");
  if(joystickEl)joystickEl.style.display="none";

  setHUDVisible(false);
  warning.style.display="none";
  damageOverlay.style.opacity=0;
  if(startToast)startToast.style.display="none";

  finalScore.textContent=score;
  finalTime.textContent=aliveTime.toFixed(1);
  const gameOverLead=document.getElementById("gameOverLead");
  if(gameOverLead)gameOverLead.textContent=t(runUsesDebugCheats?"game.overLeadDebug":"game.overLead");
  if(gameOverScreen){
    gameOverScreen.style.display="flex";
    gameOverScreen.style.pointerEvents="auto";
  }

  knockbackVelocity.set(0,0,0);
  moveInput.set(0,0);
  invincibleTimer=0;
  invincibleVisualActive=false;
  lowHpWarningTimer=0;

  stopBGM();
  playSfx("gameover");
  removeInvincibleAura();

  requestAnimationFrame(()=>{
    try{
      if(!runUsesDebugCheats){
        meta.gamesPlayed++;
        meta.bestScore=Math.max(meta.bestScore,score);
        meta.bestTime=Math.max(meta.bestTime,aliveTime);
        meta.totalPoints=(meta.totalPoints||0)+score;
        evaluateAchievements();
        saveMeta();
      }else{
        newlyUnlockedAchievements=[];
      }
      renderAchievementPanel("gameoverAchievementPanel",meta,{isGameover:true,newList:newlyUnlockedAchievements});
    }catch(err){
      console.error("endGame save/achievement error:",err);
    }
    try{
      clearPlatformAirParticles();
      clearSandstorms();
      clearEnemyDeathExplosions();
      enemySpawnQueue.length=0;
      restorePlayerTint();
      if(playerStatusSprite){playerStatusSprite.visible=false}playerStatusTimer=0;playerStatusType="";
      clearPlayerActions();
      playPlayerAnim("idle",.15,true);
    }catch(err){
      console.error("endGame cleanup error:",err);
    }
  });
}

function randomPosition(){
  const cx=platformCollisionCenterX,cz=platformCollisionCenterZ;
  const margin=platformWalkRadiusX*.08,rx=Math.max(.01,platformWalkRadiusX-margin),rz=Math.max(.01,platformWalkRadiusZ-margin);
  const angle=Math.random()*Math.PI*2,radius=Math.sqrt(Math.random());
  const x=cx+Math.cos(angle)*rx*radius,z=cz+Math.sin(angle)*rz*radius,y=getPlatformHeightAt(x,z);
  return new THREE.Vector3(x,y,z);
}
function randomEdgePosition(){
  const cx=platformCollisionCenterX,cz=platformCollisionCenterZ;
  const margin=platformWalkRadiusX*.06,rx=Math.max(.01,platformWalkRadiusX-margin),rz=Math.max(.01,platformWalkRadiusZ-margin);
  const angle=Math.random()*Math.PI*2,x=cx+Math.cos(angle)*rx,z=cz+Math.sin(angle)*rz,y=getPlatformHeightAt(x,z);
  return new THREE.Vector3(x,y,z);
}
function findSafePosition(radius){
  const minDist=Math.max(radius+.5,platformWalkRadiusX*.15);
  const avoidDist=Math.max(radius+.3,platformWalkRadiusX*.1);
  for(let i=0;i<90;i++){
    const pos=randomPosition();
    if(distance2D(pos,player.position)<minDist)continue;
    if(collidesWithRocks(pos,radius))continue;
    let tooClose=false;
    for(const c of crystals){if(distance2D(pos,c.mesh.position)<avoidDist){tooClose=true;break}}
    for(const f of fruits){if(distance2D(pos,f.mesh.position)<avoidDist){tooClose=true;break}}
    if(!tooClose)return pos;
  }
  return randomPosition();
}
function collidesWithRocks(pos,radius){
  for(const rock of rocks){
    if(!rock.mesh)continue;
    const dx=pos.x-rock.mesh.position.x,dz=pos.z-rock.mesh.position.z,minDist=radius+rock.radius;
    if(dx*dx+dz*dz<minDist*minDist)return true;
  }
  return false;
}
function isChildOf(child,parent){if(!parent)return false;let c=child;while(c){if(c===parent)return true;c=c.parent}return false}
function countAllFaces(obj){let count=0;obj.traverse(c=>{if(c.isMesh&&c.geometry){const v=c.geometry.attributes?.position?.count||0;const idx=c.geometry.index;count+=idx?idx.count/3:v/3}});return Math.round(count)}
function clampToWorld(pos){clampToPlatform(pos,platformWalkRadiusX*.03)}
function distance2D(a,b){const dx=a.x-b.x,dz=a.z-b.z;return Math.sqrt(dx*dx+dz*dz)}
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min}

const _cullSphere=new THREE.Sphere();
function applyFrustumCulling(){
  _frustumProj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_frustumProj);
  for(const c of crystals){
    if(!c.mesh)continue;
    _cullSphere.center.copy(c.mesh.position);_cullSphere.radius=1.0;
    c.mesh.visible=_frustum.intersectsSphere(_cullSphere);
  }
  for(const e of enemies){
    if(!e.mesh)continue;
    _cullSphere.center.copy(e.mesh.position);_cullSphere.radius=e.type==="ghost"?6:e.type==="purple"?2.2:1.6;
    e.mesh.visible=_frustum.intersectsSphere(_cullSphere);
  }
  for(const f of fruits){
    if(!f.mesh)continue;
    _cullSphere.center.copy(f.mesh.position);_cullSphere.radius=1.0;
    f.mesh.visible=_frustum.intersectsSphere(_cullSphere);
  }
  for(const r of rocks){
    if(!r.mesh)continue;
    _cullSphere.center.copy(r.mesh.position);_cullSphere.radius=r.radius+0.8;
    r.mesh.visible=_frustum.intersectsSphere(_cullSphere);
  }
  for(const s of sandstorms){
    _cullSphere.center.copy(s.group.position);_cullSphere.radius=14;
    s.group.visible=_frustum.intersectsSphere(_cullSphere);
  }
  for(const fx of playerSideEffects){
    _cullSphere.center.setFromMatrixPosition(fx.group.matrixWorld);_cullSphere.radius=2.5;
    fx.group.visible=_frustum.intersectsSphere(_cullSphere);
  }
}

function setupControls(){
  window.addEventListener("keydown",e=>{
    if(e.code==="KeyP"||e.code==="Escape"){
      e.preventDefault();
      togglePause();
      return;
    }
    if(isPaused&&debugCameraMode){
      keys[e.code]=true;
      return;
    }
    if(isPaused)return;
    keys[e.code]=true;
  });
  window.addEventListener("keyup",e=>{
    if(isPaused&&debugCameraMode){
      keys[e.code]=false;
      return;
    }
    if(isPaused)return;
    keys[e.code]=false;
  });
  setupDebugInput();
}

function setupJoystick(){
  const joystick=document.getElementById("joystick");
  const stick=document.getElementById("stick");
  let active=false,activePointerId=null,center={x:0,y:0},maxDist=42;

  function resetStick(){
    const base=joystick.getBoundingClientRect(),stickSize=stick.offsetWidth;
    stick.style.left=`${base.width/2-stickSize/2}px`;
    stick.style.top=`${base.height/2-stickSize/2}px`;
  }

  function releaseCapture(){
    active=false;
    moveInput.set(0,0);
    resetStick();
    if(joystick&&activePointerId!==null){
      try{joystick.releasePointerCapture(activePointerId)}catch(e){}
      activePointerId=null;
    }
  }

  _joystickRelease=releaseCapture;

  joystick.addEventListener("pointerdown",e=>{
    if(isPaused||gameOverPending)return;
    active=true;
    activePointerId=e.pointerId;
    unlockAudio();
    const rect=joystick.getBoundingClientRect();
    center.x=rect.left+rect.width/2;
    center.y=rect.top+rect.height/2;
    maxDist=rect.width*.35;
    try{joystick.setPointerCapture(e.pointerId)}catch(err){}
    updateStick(e.clientX,e.clientY);
  });

  joystick.addEventListener("pointermove",e=>{
    if(!isPaused&&!gameOverPending&&active)updateStick(e.clientX,e.clientY);
  });
  joystick.addEventListener("pointerup",e=>{if(e.pointerId===activePointerId||activePointerId===null)releaseCapture()});
  joystick.addEventListener("pointercancel",e=>{if(e.pointerId===activePointerId||activePointerId===null)releaseCapture()});

  function updateStick(x,y){
    let dx=x-center.x,dy=y-center.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>maxDist){dx=dx/dist*maxDist;dy=dy/dist*maxDist}
    const base=joystick.getBoundingClientRect(),stickSize=stick.offsetWidth;
    stick.style.left=`${base.width/2-stickSize/2+dx}px`;
    stick.style.top=`${base.height/2-stickSize/2+dy}px`;
    moveInput.set(dx/maxDist,dy/maxDist);
  }

  resetStick();
}

function onResize(){
  updateLayoutCache();
  applyRendererSize();
  if(gameRunning)setHUDVisible(true);
}

function initAudio(){
  if(audioCtx)return;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass){console.warn("当前浏览器不支持 WebAudio");return}
  audioCtx=new AudioContextClass();
}
function unlockAudio(){
  initAudio();
  if(!audioCtx)return;
  if(audioCtx.state==="suspended")audioCtx.resume();
  audioUnlocked=true;
  try{sessionStorage.setItem("starCrystalBgmUnlocked","1")}catch(e){}
  initBGM();
}
function playTone(freq,duration,type="sine",volume=.06,delay=0){
  if(!audioCtx||!audioUnlocked)return;
  const now=audioCtx.currentTime+delay;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,now);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(volume,now+.015);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now+duration+.05);
}
function playNoise(duration=.12,volume=.04){
  if(!audioCtx||!audioUnlocked)return;
  if(isMobileLayout()){playTone(110,.16,"square",.045,0);return}
  const bufferSize=Math.floor(audioCtx.sampleRate*duration);
  const buffer=audioCtx.createBuffer(1,bufferSize,audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++)data[i]=(Math.random()*2-1)*(1-i/bufferSize);
  const source=audioCtx.createBufferSource();
  const gain=audioCtx.createGain();
  source.buffer=buffer;
  gain.gain.value=volume;
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}
function playSfx(type){
  if(!audioCtx||!audioUnlocked)return;
  if(isMobileLayout()){
    if(type==="crystal"){playTone(660,.06,"triangle",.07,0);playTone(1174.66,.08,"triangle",.055,.08)}
    else if(type==="damage")playTone(110,.16,"square",.045,0);
    else if(type==="start"){playTone(392,.12,"sine",.08,0);playTone(659.25,.18,"sine",.07,.22)}
    else if(type==="purple")playTone(196,.16,"triangle",.035,0);
    else if(type==="gameover"){playTone(329.63,.18,"sine",.06,0);playTone(164.81,.35,"sine",.05,.42)}
    else if(type==="heal")playTone(523.25,.14,"sine",.055,.11);
    else if(type==="speed")playTone(523.25,.08,"sawtooth",.045,0);
    else if(type==="invincible")playTone(523.25,.08,"triangle",.07,0);
    else if(type==="invincibleSpawn")playTone(311.13,.16,"sine",.035,0);
    else if(type==="invincibleHit")playTone(740,.08,"square",.035,0);
    return;
  }
  if(type==="start"){playTone(392,.12,"sine",.08,0);playTone(523.25,.14,"sine",.075,.1);playTone(659.25,.18,"sine",.07,.22)}
  if(type==="crystal"){playTone(660,.06,"triangle",.07,0);playTone(880,.06,"triangle",.065,.04);playTone(1174.66,.08,"triangle",.06,.08);playTone(1396.91,.12,"triangle",.055,.14);playTone(1760,.18,"sine",.05,.22)}
  if(type==="speed"){playTone(523.25,.08,"sawtooth",.045,0);playTone(659.25,.08,"sawtooth",.04,.07);playTone(783.99,.12,"sawtooth",.035,.14)}
  if(type==="heal"){playTone(392,.12,"sine",.06,0);playTone(523.25,.14,"sine",.055,.11);playTone(659.25,.18,"sine",.05,.22)}
  if(type==="invincible"){playTone(523.25,.08,"triangle",.07,0);playTone(659.25,.08,"triangle",.065,.06);playTone(783.99,.09,"triangle",.06,.12);playTone(1046.5,.16,"triangle",.055,.2)}
  if(type==="invincibleSpawn"){playTone(311.13,.16,"sine",.035,0);playTone(466.16,.18,"sine",.032,.12)}
  if(type==="invincibleHit"){playTone(740,.08,"square",.035,0);playTone(988,.08,"square",.028,.05)}
  if(type==="damage"){playNoise(.12,.055);playTone(110,.16,"square",.045,0)}
  if(type==="purple"){playTone(196,.16,"triangle",.035,0);playTone(246.94,.22,"triangle",.03,.12)}
  if(type==="gameover"){playTone(329.63,.18,"sine",.06,0);playTone(246.94,.22,"sine",.055,.18);playTone(164.81,.35,"sine",.05,.42)}
}
function initBGM(){
  if(!bgmBattle){
    bgmBattle=new Audio(BGM_BATTLE_URL);
    bgmBattle.loop=true;
    bgmBattle.volume=0;
    bgmBattle.preload="auto";
  }
  if(bgmMenu)return;
  bgmMenu=new Audio(BGM_MENU_URL);
  bgmMenu.loop=true;
  bgmMenu.volume=0;
  bgmMenu.preload="metadata";
}
function playBGM(audio){
  if(!audio||bgmCurrent===audio)return;
  if(bgmFadeTimer){clearInterval(bgmFadeTimer);bgmFadeTimer=null}
  const old=bgmCurrent;
  bgmCurrent=audio;
  const steps=30,stepMs=BGM_FADE_DURATION*1000/steps;
  let step=0;
  function doFade(){
    bgmFadeTimer=setInterval(()=>{
      step++;
      if(old&&!old.paused){
        old.volume=Math.max(0,bgmVolume*(1-step/steps));
      }
      if(!audio.paused){
        audio.volume=Math.min(bgmVolume,bgmVolume*step/steps);
      }
      if(step>=steps){
        if(old){old.pause();old.volume=0}
        audio.volume=bgmVolume;
        clearInterval(bgmFadeTimer);
        bgmFadeTimer=null;
      }
    },stepMs);
  }
  audio.volume=0;
  audio.play().then(()=>{
    if(old&&!old.paused)doFade();
    else{
      step=0;
      bgmFadeTimer=setInterval(()=>{
        step++;
        audio.volume=Math.min(bgmVolume,bgmVolume*step/steps);
        if(step>=steps){clearInterval(bgmFadeTimer);bgmFadeTimer=null}
      },stepMs);
    }
  }).catch(()=>{});
}
function playMenuBGM(){
  initBGM();
  if(bgmCurrent===bgmMenu&&!bgmMenu.paused)return;
  playBGM(bgmMenu);
}
function playBattleBGM(){
  initBGM();
  if(bgmCurrent===bgmBattle&&!bgmBattle.paused)return;
  playBGM(bgmBattle);
}
function pauseBGM(){
  if(bgmMenu&&!bgmMenu.paused)bgmMenu.pause();
  if(bgmBattle&&!bgmBattle.paused)bgmBattle.pause();
  if(bgmFadeTimer){clearInterval(bgmFadeTimer);bgmFadeTimer=null}
}
function resumeBGM(){
  if(!bgmCurrent)return;
  if(bgmCurrent.paused)bgmCurrent.play().catch(()=>{});
}
function stopBGM(){
  if(bgmFadeTimer){clearInterval(bgmFadeTimer);bgmFadeTimer=null}
  if(bgmMenu){bgmMenu.pause();bgmMenu.currentTime=0;bgmMenu.volume=0}
  if(bgmBattle){bgmBattle.pause();bgmBattle.currentTime=0;bgmBattle.volume=0}
  bgmCurrent=null;
}
function setBGMVolume(v){
  bgmVolume=Math.max(0,Math.min(1,v));
  if(bgmCurrent&&!bgmCurrent.paused)bgmCurrent.volume=bgmVolume;
}
function startBGM(){
  playBattleBGM();
}
