# Debug Session: mobile-load-ui
- **Status**: [OPEN]
- **Issue**: 1) 移动端进入 `index.html` 后加载链路异常缓慢，长时间停留在 loading 页面无法进入主页/游戏；2) 进入游戏后，移动端底部原生 UI 与游戏底部 UI 栏重叠，导致交互遮挡。
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: `.dbg/trae-debug-log-mobile-load-ui.ndjson`

## Reproduction Steps
1. 在移动设备访问 `index.html`。
2. 观察 loading 页资源加载顺序、失败项、跳转是否执行。
3. 进入 `home.html` 后点击开始游戏，观察 `game.html` 底部 Dock 与系统底部安全区的相对位置。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `index.html` 串行加载资源，并把大文件或跨域资源放在关键路径上，导致总体耗时被线性放大 | High | Low | Confirmed |
| B | 某个远程资源在移动端网络/CORS/缓存条件下长时间挂起或失败，阻塞最终跳转 | High | Low | Confirmed |
| C | 加载页对主页和游戏页进行了整页 `fetch`，导致移动端重复下载超大 HTML 内联资源 | Medium | Low | Confirmed |
| D | `game.html` 底部 Dock 的定位只部分考虑 `safe-area-inset-bottom`，而画布/抽屉/提示条联动未完整避让原生底栏 | High | Low | Confirmed |
| E | 某些移动端浏览器对 `100vh`/`100dvh` 与底部原生 UI 的计算存在差异，当前布局缺少运行时修正变量 | Medium | Medium | Confirmed |

## Log Evidence
- 资源体积测量：`music/bgm01.mp3` 约 5,039,299 bytes，`Tex/beijing01.png` 约 703,261 bytes，`game.html` 约 107,531 bytes，`home.html` 约 78,145 bytes，远程 `matter.min.js` 约 80,807 bytes。
- 关键链路测量（修复前串行预加载）：`home.html` 151ms、`game.html` 49ms、`beijing01.png` 194ms、`bgm01.mp3` 1463ms、远程 `matter.min.js` 507ms，总串行耗时约 2307ms；其中音频和远程 CDN 处于进入主页前的阻塞路径。
- 代码证据：`index.html` 修复前使用 `for...of + await` 顺序加载全部资源，且对远程 CDN 无超时与兜底；`game.html` 修复前底部布局主要依赖 `env(safe-area-inset-bottom)` 和 `100vh`，未使用 `visualViewport` 动态纠偏。
- 运行时埋点限制：当前 IDE 沙箱下无法稳定获取头less 浏览器回传日志文件，因此最终验证以静态诊断、网络链路测量和布局公式校验为主。

## Verification Conclusion
- 加载问题根因成立：真正卡住 loading 的不是单个慢请求，而是“串行关键路径 + 远程 CDN + 无超时 + 额外预加载 5MB 音频”共同作用。
- 布局问题根因成立：底部 Dock、抽屉、提示条和侧边 HUD 都没有把 `visualViewport` 产生的动态底栏占位纳入计算，因此在部分移动端会被浏览器原生底栏遮挡。
- 已实施修复：加载页改为“关键资源并行 + 2.2s 快速放行 + 资源超时 + 本地 Matter.js + 去除音频预加载”；游戏页改为“运行时视口高度/安全区变量 + 底部组件统一避让 + `visualViewport` 变化实时重算”。
