<p align="center">
  <img src="electron-app/public/PrimePick_pure.svg" alt="Prime Pick Logo" width="180" />
</p>

# Prime Pick

Prime Pick 是一个用于“批量评估照片技术质量并辅助筛选”的桌面工具：

- 桌面端：Electron + React（在 `electron-app/`）
- 计算/写入：Python（在 `photo_selector/`）

它会对照片做基础技术指标分析（如清晰度、曝光等），生成评分结果，并可按规则写入 XMP sidecar（用于 Lightroom 等工作流里的星级/颜色标签/关键词）。

## 版本与发布

- 已在 GitHub 发布稳定版：v1.0.0（见 Releases / Tags）
- 本 README 默认按“从源码运行”说明（适用于克隆仓库或下载 Source code 压缩包）
- 如果你下载的是已打包的桌面端安装包（例如 exe/dmg），通常可直接安装运行；若功能依赖 Python，则仍需在本机安装 Python 与相关依赖

## 功能概览

- 批量计算照片指标与评分，输出 `results.csv` / `results.json`
- 缓存计算结果（SQLite），提升重复运行速度
- 将评分/标签/原因写入 `*.xmp` sidecar（可与 Lightroom 联动）
- 支持配置权重/阈值与缩放尺寸（用于速度/精度取舍）

## 目录结构

- `electron-app/`：桌面端 UI（Vite + React + Electron）
  - `electron-app/electron/`：主进程与 preload（负责调用 Python）
  - `electron-app/src/`：渲染进程 UI 与状态管理
  - `electron-app/presets_example.json`：预设示例
- `photo_selector/`：Python 核心库与命令行
  - `photo_selector/cli.py`：提供 `compute` / `write-xmp` 子命令（供 Electron 调用）
  - `photo_selector/pipeline/`：指标计算（stage1）与写 XMP（stage2）
  - `photo_selector/metrics/`：清晰度/曝光等指标实现
  - `photo_selector/lr/xmp_writer.py`：XMP 读写逻辑

## 安装与使用（当前版本）

### 环境要求

- Node.js（用于桌面端）
- Python 3（用于指标计算 / 相似分组 / 写入 XMP）

当前阶段仅扫描 `jpg/jpeg`（含大小写扩展名）。

### 安装（桌面端 + Python）

1) 安装桌面端依赖（一次即可）：

```bash
cd electron-app
npm install
```

2) 安装 Python 依赖（建议使用虚拟环境）：

```bash
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -U pip
python -m pip install numpy opencv-python
```

macOS/Linux：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install numpy opencv-python
```

相似分组（`group`）分两种模式：

- 轻量模式（推荐先跑通）：`--embed-model cv2_hist`，仅依赖 `opencv-python`、`numpy`
- 深度特征模式（默认 `mobilenet_v3_small`）：需要额外安装 `torch`、`torchvision`、`Pillow`

如果你希望在 GUI 里使用相似分组（桌面端默认走 `mobilenet_v3_small`），需要在同一 Python 环境中补齐：

```bash
python -m pip install pillow torch torchvision
```

3) 运行桌面端（开发模式）：

```bash
cd electron-app
npm run dev
```

桌面端会通过系统里的 `python` 启动 [photo_selector/cli.py](file:///c:/Users/Daniel/Documents/projects/ai_photographer/photo_selector/cli.py)。如果你使用了虚拟环境，请在已激活虚拟环境的终端中启动 `npm run dev`，确保 `python` 指向该环境。

### CLI 使用（不依赖 GUI）

推荐在项目根目录执行命令（与桌面端一致）。

典型流程：

1. `compute` 生成评分结果（`results.*`）
2. （可选）`group` 做相似分组（生成 `groups.json`，并把分组字段写回 `results.*`）
3. `write-xmp` 生成/更新 XMP sidecar

#### 1) 计算指标（生成 results.csv / results.json）

```bash
python photo_selector/cli.py compute --input-dir "你的图片目录" --profile daylight --workers 4 --config-json "配置.json"
```

- 输出：默认写入 `--input-dir`（可用 `--output-dir` 指定输出目录）
- 产物：`results.csv`、`results.json`
- 缓存：会在当前工作目录生成 `cache.db`（用于加速重复运行；从项目根目录运行时通常在根目录生成）
- 输出流：进度/完成事件以 JSON 行写到 stdout，日志写到 stderr（GUI 解析 stdout）

#### 2) 相似分组（生成 groups.json，并把分组字段写回 results.*）

轻量模式（无需 torch）：

```bash
python photo_selector/cli.py group --input-dir "你的图片目录" --output-dir "你的图片目录" --embed-model cv2_hist
```

深度特征模式（需要 torch/torchvision/Pillow）：

```bash
python photo_selector/cli.py group --input-dir "你的图片目录" --output-dir "你的图片目录" --embed-model mobilenet_v3_small
```

- 输出：`groups.json`，并更新 `results.csv` / `results.json`，新增/更新 `group_id`、`group_size`、`rank_in_group`、`is_group_best`
- 缓存：会在 `--output-dir` 生成 `embedding_cache.db`（用于加速重复分组）

#### 3) 写入 XMP（读取 results.* 并生成/更新 *.xmp）

```bash
python photo_selector/cli.py write-xmp --input-dir "你的图片目录" --only-selected --selection-file "selected.json" --config-json "配置.json"
```

其中 `selected.json` 为 JSON 数组，元素是图片文件名（与 `results.json` 中的 `filename` 字段一致），例如：

```json
[
  "IMG_0001.JPG",
  "IMG_0002.JPG"
]
```

XMP 文件命名采用标准 sidecar：`photo.jpg -> photo.xmp`（基于去扩展名的 base filename）。

#### 清理缓存（可选）

当你调整了阈值/权重、或想强制重算/重分组时，可以删除缓存文件：

- 评分缓存：`cache.db`（通常在项目根目录，或你执行命令的当前目录）
- 分组 embedding 缓存：`embedding_cache.db`（在 `--output-dir`）

## 配置说明（config-json）

桌面端会把预设写入临时 config JSON 并传给 CLI；你也可以在 CLI 中用 `--config-json` 传入文件。

当前支持的键（示例）：

```json
{
  "max_long_edge": 1024,
  "weights": {
    "sharpness": 0.6,
    "exposure": 0.4
  },
  "thresholds": {
    "sharpness": 100.0,
    "low_light": 40
  },
  "grouping": {
    "xmp": {
      "group_best_min_rating": 4,
      "group_top1_rating": 5,
      "group_nonbest_mode": "keep",
      "group_nonbest_max_rating": 2,
      "group_add_keywords": true,
      "group_similar_but_worse_delta": 15.0
    }
  }
}
```

说明：

- `max_long_edge`：读取图片时的最长边缩放（越小越快）
- `weights` / `thresholds`：用于计算技术评分
- `grouping.xmp.*`：当 results 中存在分组字段时，写入 XMP 的分组策略

## XMP 写入规则（当前实现）

基础规则：

- 若判定为不可用（`is_unusable=true`）：`rating=1` 且 `label="Red"`
- 否则按 `technical_score` 映射：
  - `>= 80`：`rating=5` 且 `label="Green"`
  - `>= 60`：`rating=4`
  - `>= 40`：`rating=3`
  - `< 40`：`rating=2`
- 关键词：会追加若干 `AI/<reason>`

分组增强（当存在 `group_id` 等字段）：

- 追加关键词：`AI/Group/<gid>`、`AI/GroupRank/<n>`，以及 `AI/BestInGroup` / `AI/Similar`
- 对组内最佳：可提升星级（由 `group_top1_rating` / `group_best_min_rating` 控制）
- 对非最佳：可选择保持/清空/降级（由 `group_nonbest_mode` 控制）

## 常见问题

### 1) 桌面端提示找不到 Python / 无法运行

- 确认 `python --version` 可用（避免 Microsoft Store 的占位 Python）
- 若使用虚拟环境：在已激活 `.venv` 的终端中启动 `npm run dev`

### 2) 运行 group 报缺少 torch/torchvision/Pillow

- 若只想先跑通：改用 `--embed-model cv2_hist`
- 若要用默认深度特征：安装 `pillow torch torchvision`

### 3) 写入 XMP 后 Lightroom 没变化

- 确认 Lightroom 的“自动读取 XMP”相关设置
- 确认 sidecar 命名：本项目写入 `photo.xmp`（不是 `photo.jpg.xmp`）
