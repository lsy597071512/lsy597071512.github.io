/** 波次逻辑单元测试 — node scripts/verify-combat-logic.mjs */

function shouldEndVictory(alive, pendingSpawns, wave, maxWaves, everSpawned) {
  return alive === 0 && pendingSpawns <= 0 && wave >= maxWaves && everSpawned;
}

function nextWaveAfterClear(alive, pendingSpawns, wave, maxWaves) {
  if (alive !== 0 || pendingSpawns > 0) return null;
  if (wave < maxWaves) return wave + 1;
  return null;
}

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

assert(!shouldEndVictory(0, 5, 1, 3, false), 'frame0: pending spawns blocks victory');
assert(!shouldEndVictory(0, 0, 1, 3, false), 'frame0: no spawn yet blocks victory');
assert(nextWaveAfterClear(0, 0, 1, 3) === 2, 'wave1 clear advances to wave2');
assert(!shouldEndVictory(0, 0, 1, 3, true), 'wave1 clear is not final victory');
assert(nextWaveAfterClear(0, 0, 2, 3) === 3, 'wave2 clear advances to wave3');
assert(shouldEndVictory(0, 0, 3, 3, true), 'wave3 clear triggers victory');
assert(nextWaveAfterClear(0, 4, 1, 3) === null, 'pending spawns block wave advance');

// 模拟首帧连跳 bug：pending>0 时不应胜利
let wave = 1;
const maxWaves = 3;
let pending = 6;
let alive = 0;
let everSpawned = false;
if (nextWaveAfterClear(alive, pending, wave, maxWaves) !== null) wave++;
assert(wave === 1 && !shouldEndVictory(alive, pending, wave, maxWaves, everSpawned), 'first frame cascade blocked');

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll combat wave logic tests passed.');
