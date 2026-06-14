const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(process.env.USERPROFILE || '', 'Desktop', 'rust-belt-era-preview');
const dist = path.join(root, 'dist');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(dist)) {
  console.error('请先执行 npm run build');
  process.exit(1);
}

if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
copyDir(dist, out);

const previewServe = fs.readFileSync(path.join(root, 'scripts', 'serve-preview.cjs'), 'utf8');
fs.mkdirSync(path.join(out, 'scripts'), { recursive: true });
fs.writeFileSync(path.join(out, 'scripts', 'serve.cjs'), previewServe);

const bat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE="
if exist "C:\\Program Files\\nodejs\\node.exe" set "NODE=C:\\Program Files\\nodejs\\node.exe"
if not defined NODE where node >nul 2>&1 && set "NODE=node"
if not defined NODE (
  echo 未找到 Node.js。可将本文件夹上传到 Netlify / Cloudflare Pages 静态托管。
  pause
  exit /b 1
)
"%NODE%" "%~dp0scripts\\serve.cjs"
pause
`;
fs.writeFileSync(path.join(out, 'start-preview.bat'), bat);

fs.writeFileSync(
  path.join(out, 'README.txt'),
  '锈带纪元预览站\n\n本地：双击 start-preview.bat\n\n上线：将本文件夹全部上传到 Cloudflare Pages / Netlify / GitHub Pages\n',
);

console.log('预览站已导出到:', out);
