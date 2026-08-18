# 项目描述：3D Model On Web

一个面向工业设备 3D 展示的**纯前端 Web 应用**，同一页面同时支持两种主流 3D 渲染方式——
**GLB 网格模型**与 **3D 高斯泼溅（3DGS）**，并在此之上提供点位标注、设备数显等业务交互。通过 Vite 构建，产物可直接作为静态站点部署。

---

## 一、技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 构建工具 | **Vite 8** | 开发服务器 + 生产构建，零配置即可产出可静态部署的 `dist/` |
| 语言 | **JavaScript（ES Modules，原生）** | 无 TypeScript/框架，直接以原生 DOM + 组件写法组织 |
| 3D 渲染（GLB） | **@google/model-viewer 4.x** | Web 组件封装的三维查看器，负责 GLB 加载/渲染/镜头控制 |
| 3D 渲染（3DGS） | **@playcanvas/superpsplat-viewer** | 官方 SuperSplat Viewer，通过 iframe 集成，负责高斯泼溅渲染 |
| 底层 3D 依赖 | **three.js（0.183）** | 作为 model-viewer 的底层渲染引擎（间接依赖） |
| 实时数据 | **自研 `src/live-data.js`** | 数据源抽象层，基于 WebSocket / MQTT 骨架，当前用 Demo 数据模拟推送 |

> 注：`@playcanvas/supersplat-viewer` 作为 npm 依赖安装，运行时由 `scripts/prepare-gs-assets.mjs` 将官方 viewer 提取到 `public/gs-viewer/`，主页面以 `<iframe>` 方式加载它。

---

## 二、用到的开源项目

| 开源项目 | 版本 | License | 用途 |
|----------|------|---------|------|
| [google/model-viewer](https://github.com/google/model-viewer) | ^4.3.1 | Apache-2.0 | GLB 网格模型展示、镜头控制、autoRotate |
| [playcanvas/supersplat-viewer](https://github.com/playcanvas/supersplat-viewer) | ^1.29.1 | MIT | 3D 高斯泼溅渲染（SOG / Tile 流式 / PLY 三种格式） |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | ^0.183.2 | MIT | model-viewer 的底层 WebGL 渲染引擎 |
| [vitejs/vite](https://github.com/vitejs/vite) | ^8.2.1 | MIT | 构建工具与开发服务器 |
| [PlayCanvas](https://github.com/playcanvas) 生态 | - | MIT | SuperSplat Viewer 背后的项目生态 |

---

## 三、核心功能

1. **GLB 模式**：上传/拖拽 `.glb` 模型，支持旋转、缩放、平移。
2. **高斯泼溅模式（3DGS）**：支持 `scene.sog`（压缩）、`scene.ply`（全精度）、`MipModel Tile`（流式 LOD）三种格式；画质档位（1000 万/400 万高斯预算）；多模型下拉切换。
3. **点位标记（POI）**：在模型表面放置观察点，点击拉近镜头。
4. **数显（设备数据）**：在模型对应位置显示设备实时数字，通过 `live-data.js` 数据源驱动。
5. **数据源抽象层**：前端只订阅 `deviceId` 即可即时显示，预留 WebSocket / MQTT 真实接入骨架。

---

## 四、工程组织

```
src/main.js           应用主逻辑（GLB 渲染、3DGS 集成、点位/数显交互）
src/style.css         全站样式
src/live-data.js      实时数据源抽象层
scripts/prepare-gs-assets.mjs   一键生成 3DGS 数据与 viewer 资源
public/gs-data/       GS 模型数据（较大，不入库，脚本生成）
public/gs-viewer/     SuperSplat Viewer（较大，不入库，脚本提取）
```

**构建与运行**：`npm install` → `npm run dev`（开发）/ `npm run build`（生产构建到 `dist/`）→ `npm run prepare:gs`（准备 3DGS 资源）。