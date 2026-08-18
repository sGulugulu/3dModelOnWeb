/**
 * 准备 3DGS 展示所需的静态资源(public/gs-data 与 public/gs-viewer)。
 *
 * 这些资源体积大且属于生成物,已加入 .gitignore,本脚本用于一键重建:
 *   - 从高斯泼溅数据目录复制 scene.sog 与 model-gs-sog-tile 到 public/gs-data
 *   - 从 npm 包 @playcanvas/supersplat-viewer 提取官方 viewer 静态文件到 public/gs-viewer
 *   - 生成默认 settings.json
 *
 * 用法:
 *   node scripts/prepare-gs-assets.mjs [数据源目录]
 *   默认数据源目录: D:/..repository/fan/照片GS-三种格式
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const dataRoot = process.argv[2] ?? 'D:/..repository/fan/照片GS-三种格式';

const SOG_SOURCE = join(dataRoot, 'model-gs-sog', 'scene.sog');
const TILE_SOURCE = join(dataRoot, 'model-gs-sog-tile');
const PLY_SOURCE = join(dataRoot, 'model-gs-ply', 'scene.ply');
const GS_DATA_DIR = join(root, 'public', 'gs-data');
const GS_VIEWER_DIR = join(root, 'public', 'gs-viewer');

const DEFAULT_SETTINGS = {
  version: 2,
  tonemapping: 'aces2',
  highPrecisionRendering: true,
  background: { color: [0.06, 0.07, 0.09] },
  postEffectSettings: {
    sharpness: { enabled: true, amount: 0.4 },
    bloom: { enabled: false, intensity: 0.1, blurLevel: 8 },
    grading: { enabled: false, brightness: 0, contrast: 1, saturation: 1, tint: [1, 1, 1] },
    vignette: { enabled: false, intensity: 1, inner: 0.4, outer: 1, curvature: 0.8 },
    fringing: { enabled: false, intensity: 1 }
  },
  animTracks: [],
  cameras: [],
  annotations: [],
  startMode: 'default'
};

// 定位 @playcanvas/supersplat-viewer 包内的 public 文件
function resolveViewerPackage() {
  // 包的 exports 未暴露 package.json,且主入口导出的是源码字符串而非文件路径;
  // 直接按 node_modules 布局解析包根目录
  return join(root, 'node_modules', '@playcanvas', 'supersplat-viewer');
}

async function main() {
  // 1. 复制高斯泼溅数据
  if (!existsSync(SOG_SOURCE)) throw new Error(`未找到 SOG 文件: ${SOG_SOURCE}`);
  if (!existsSync(TILE_SOURCE)) throw new Error(`未找到 tile 目录: ${TILE_SOURCE}`);

  await mkdir(GS_DATA_DIR, { recursive: true });
  await cp(SOG_SOURCE, join(GS_DATA_DIR, 'scene.sog'));
  await cp(TILE_SOURCE, join(GS_DATA_DIR, 'model-gs-sog-tile'), { recursive: true });
  if (existsSync(PLY_SOURCE)) {
    await cp(PLY_SOURCE, join(GS_DATA_DIR, 'scene.ply'));
    console.log('[1/3] 已复制高斯泼溅数据(SOG + Tile + PLY) -> public/gs-data');
  } else {
    console.log('[1/3] 已复制高斯泼溅数据(SOG + Tile) -> public/gs-data(未找到 scene.ply,跳过)');
  }

  // 2. 提取官方 viewer 静态文件
  const viewerRoot = resolveViewerPackage();
  const viewerPublic = join(viewerRoot, 'public');
  await mkdir(GS_VIEWER_DIR, { recursive: true });
  for (const name of ['index.html', 'index.css', 'index.js']) {
    const src = join(viewerPublic, name);
    if (!existsSync(src)) throw new Error(`viewer 包中缺少 ${name}: ${src}`);
    await cp(src, join(GS_VIEWER_DIR, name));
  }
  console.log('[2/3] 已提取官方 viewer -> public/gs-viewer');

  // 3. 生成 settings.json
  await writeFile(join(GS_VIEWER_DIR, 'settings.json'), JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
  console.log('[3/3] 已生成 public/gs-viewer/settings.json');

  // 4. 生成 models.json(仅当不存在,避免覆盖用户自定义的模型清单)
  const modelsFile = join(GS_DATA_DIR, 'models.json');
  if (!existsSync(modelsFile)) {
    const defaultModels = {
      models: [
        {
          id: 'gongsi-panorama',
          name: '公司全景(照片GS)',
          formats: {
            sog: 'scene.sog',
            tile: 'model-gs-sog-tile/MipModel/lod-meta.json',
            ply: 'scene.ply'
          }
        }
      ]
    };
    await writeFile(modelsFile, JSON.stringify(defaultModels, null, 2), 'utf8');
    console.log('[4/4] 已生成 public/gs-data/models.json(可手动编辑添加更多模型)');
  } else {
    console.log('[4/4] public/gs-data/models.json 已存在,保留用户配置');
  }

  console.log('完成。可运行 npm run dev 预览 3DGS 展示。');
}

main().catch((err) => {
  console.error('准备资源失败:', err.message);
  process.exit(1);
});
