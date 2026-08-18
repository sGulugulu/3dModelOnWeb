# 3D Model On Web

基于 [google/model-viewer](https://github.com/google/model-viewer)（Apache-2.0，star 8k+，持续维护）构建的 GLB 3D 模型展示网页，并集成官方 [SuperSplat Viewer](https://github.com/playcanvas/supersplat-viewer)（MIT）实现 **3D 高斯泼溅（3DGS）** 展示。

## 功能

- 🧊 **GLB 模式**：点击按钮或**拖拽**上传 `.glb` 模型
- ✨ **高斯泼溅模式**：展示 3DGS 场景，支持两种数据格式：
  - `SOG 文件`：SuperSplat 优化压缩格式（单文件全量加载）
  - `Tile 流式`：MipModel 格式，按视角渐进式加载 LOD
- 🖱️ 鼠标左键拖动旋转 · 🔍 滚轮放大/缩小 · 🖐️ 右键/双指平移
- 📌 **点位标记（POI）**（GLB 模式，默认静止）：在模型上放置可点击的观察点，点击后拉近镜头；位置可自定义
- 🔢 **数显（设备数据）**（GLB 模式）：在模型对应位置显示设备实时数字（可填设备名/单位；未接真实数据时为固定 `123.456` 演示值）
- 🔄 **旋转模式二选一**（GLB 模式，默认静止）：静止 / 旋转

## 使用

```bash
npm install
npm run dev      # 开发模式,自动打开 http://localhost:5173
npm run build    # 生产构建,输出到 dist/ 可直接静态部署
npm run preview  # 预览构建产物
```

## 3D 高斯泼溅展示

顶栏切换到「✨ 高斯泼溅」模式后，可选择：

| 数据格式 | 说明 |
|---------|------|
| **SOG 文件** | 加载 `public/gs-data/scene.sog`，SuperSplat 压缩格式，全量渲染 |
| **Tile 流式** | 加载 `public/gs-data/model-gs-sog-tile/MipModel/lod-meta.json`，按视角流式加载 LOD |
| **PLY 原始(全精度)** | 加载 `public/gs-data/scene.ply`（835 万点浮点精度，无压缩损失），拉近最清晰；体积大、加载较慢 |

画质档位（两种档位同时影响所有格式）：

| 档位 | 渲染预算 | 说明 |
|------|---------|------|
| **高清(1000万)** | 1000 万高斯 | 覆盖全场景 835 万点，拉近细节最足（默认） |
| **均衡(400万)** | 400 万高斯 | 性能优先，低端设备流畅 |

### 多模型切换

GS 工具条的「模型」下拉由 `public/gs-data/models.json` 驱动。要添加/更换模型：

1. 把模型数据放到 `public/gs-data/` 下（单文件 `.ply/.sog` 或 tile 目录）；
2. 编辑 `models.json`，按下面结构添加条目（`formats` 里列出该模型实际可用的格式，`tile` 填 `lod-meta.json` 的路径）：

```json
{
  "models": [
    {
      "id": "gongsi-panorama",
      "name": "公司全景(照片GS)",
      "formats": {
        "sog": "scene.sog",
        "tile": "model-gs-sog-tile/MipModel/lod-meta.json",
        "ply": "scene.ply"
      }
    },
    {
      "id": "my-model",
      "name": "我的新模型",
      "formats": {
        "ply": "my-model/scene.ply"
      }
    }
  ]
}
```

刷新页面即可在下拉中看到新模型；切换模型时格式选项会自动过滤为该模型可用的格式。

> `models.json` 不存在时自动回退到默认「公司全景(照片GS)」。`npm run prepare:gs` 会在缺失时生成默认模板，不会覆盖你的自定义配置。

### 资源准备

3DGS 数据与官方 viewer 体积较大（约 300MB），**不纳入版本库**（见 `.gitignore`），通过脚本一键生成：

```bash
npm run prepare:gs        # 默认数据源: D:/..repository/fan/照片GS-三种格式
npm run prepare:gs -- "自定义数据源目录"
```

该脚本会：
1. 复制 `scene.sog`、`scene.ply` 与 `model-gs-sog-tile` 到 `public/gs-data/`
2. 从 npm 包 `@playcanvas/supersplat-viewer` 提取官方 viewer 到 `public/gs-viewer/`
3. 生成默认 `settings.json`

> 说明：高斯泼溅渲染由官方 SuperSplat Viewer 驱动（WebGPU 优先，自动回退 WebGL），支持轨道/飞行相机、流式 LOD 等能力。

## 点位标记（POI）

观察点：用于在模型关键位置做标记，点击即可拉近镜头观察该处。

1. 点工具栏「📍 编辑点位」开启编辑模式（右侧出现编辑面板）。
2. **点击模型表面空白处**即可在点击位置添加一个点位（橙色圆点 + 序号），坐标自动来自模型表面。
3. 面板列出所有点位，可：
   - **跳转**：把镜头拉近并锁定到该点
   - **删除**：移除该点
   - **微调**：直接编辑 `x/y/z` 坐标
4. 点「完成」关闭面板；工具栏「点位」按钮用于切换点位**高亮 / 低亮**（低亮为 50% 透明）。

点击模型上的任意橙色圆点，镜头会平滑拉近到该点位。

## 数显（设备数据）

用于在模型对应位置显示设备传来的**实时数字**（独立于观察点位）。

1. 点工具栏「🔢 添加数显」开启数显模式（右侧出现数显面板）。
2. **点击模型表面**在设备对应位置添加一个数显（绿色数据气泡）。
3. 面板列出所有数显，可填写**设备名**与**单位**，并可微调坐标 / 删除。
4. 设备传来的实时数字会显示在气泡中（未接真实数据前，`src/live-data.js` 的演示数据源会推送固定值 `123.456`）。

> 观察点位与数显是两套独立标注：点位是橙色圆点（近距离观察用），数显是绿色气泡（显示设备数据用），二者互不干扰、可同时存在。
>
> 编辑时需**单击**模型表面才添加标记——按住拖动旋转/平移模型不会误加。两个编辑面板（点位/数显）宽度都可在左边缘**拖拽调整**；工具栏「数显」按钮同「点位」一样在**高亮/低亮**间切换。

## 旋转模式

视图工具条提供两个互斥选项（默认**静止**）：

| 选项 | 行为 |
|------|------|
| **静止** | 模型与镜头都不动，可用鼠标自行操作（默认） |
| **旋转** | 模型绕垂直轴自动旋转（`autoRotate`） |

> 说明：model-viewer 的 `autoRotate` 默认绕 Y 轴转动，即模型以 XZ 平面为旋转面（y-up）。页面进入时默认静止，需在工具栏手动切换为「旋转」。

## 说明

- 仅支持 `.glb` 格式（推荐使用**单文件** GLB，内嵌纹理与材质，加载最佳）。
- 上传流程：读取本地文件 → `URL.createObjectURL` → 赋给 `<model-viewer>` 的 `src`。

## 技术栈

`@google/model-viewer` · `vite`