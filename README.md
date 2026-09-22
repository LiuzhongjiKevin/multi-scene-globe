# Multi-Scene Globe · 多场景球体

以 Blender 原生模型与 Three.js / WebGL 构建的黄昏微缩街景：住宅小星球、京都二年坂三年坂，以及可绕行一周的京都球面街区。

A collection of interactive miniature worlds, with Blender-authored assets, autonomous
pedestrians, sliding doors and third-person exploration in the Kyoto scenes.

## 运行

无需 npm 安装或打包。克隆后，在仓库根目录运行（Python 3）：

```sh
python3 -m http.server 8080 --directory dist
```

Windows 也可以使用 `py -m http.server 8080 --directory dist`。浏览器打开
[http://localhost:8080](http://localhost:8080)，请通过 HTTP 访问，不要直接双击 HTML。
Three.js 与运行素材均随仓库提供，首次运行无需从 CDN 下载依赖。需要支持 WebGL 2 的浏览器。

## 场景与分支

| 分支 | 内容 | 页面 |
| --- | --- | --- |
| `main` | 全量项目：全部场景、历史源码、模型、地图、建模脚本和审核渲染 | 下列三个入口 |
| `scene/yugure` | 夕暮町住宅小星球：樱花、草地、河流、来往行人 | `index.html` |
| `scene/kyoto` | 京都二年坂三年坂微缩街区 | `index.html` |
| `scene/kyoto-loop` | 京都球面闭环街区 | `index.html` |

`main` 的入口：

- [夕暮町](http://localhost:8080/index.html)
- [京都原版](http://localhost:8080/kyoto.html)
- [京都球面环游](http://localhost:8080/kyoto-loop.html)

独立分支均能自行运行，包含对应的入口、依赖、模型和建模来源，不需要先检出 `main`。

```sh
git clone --branch scene/kyoto-loop https://github.com/LiuzhongjiKevin/multi-scene-globe.git
cd multi-scene-globe
python3 -m http.server 8080 --directory dist
```

## 操作

- 全景：拖动旋转，滚轮缩放；点击店门或住宅门交互。
- 三个场景都有来往行人、第三人称跟随、切换行人与暂停功能。
- 京都两版：点击“自由探索”，WASD / 方向键移动，拖动调整视角，靠近可交互店门后按鼠标左键或 E；Esc 退出探索。
- 京都两版提供触屏摇杆和独立交互按钮。夕暮町目前是行人跟随模式，没有玩家自由移动。
- 球面版主街首尾相接，可连续绕行；二年坂保留为支路。

## 技术与文件

原生 JavaScript ES Modules + Three.js 0.186.0；无需 React/Vue 或构建系统。
Blender 4.3.2 制作房屋、居民、自行车、路灯等原生模型，再导出 GLB。
道路、地形、植被分布、球面弯曲、人物运动、门与相机交互在 Three.js 中完成。
并非整个网页场景直接由一个 Blender 文件导出。

| 路径 | 用途 |
| --- | --- |
| `dist/` | 可直接静态托管的完整前端；这里的 JS 也是可编辑源码 |
| `dist/assets/` | GLB 模型、京都地图和资产来源记录 |
| `dist/vendor/` | 本地 Three.js 与第三方声明 |
| `design-review/yugure-form.blend` | 共用住宅、人物、自行车等模型源文件 |
| `design-review/*.py` | 共用模型建模、审查和导出脚本 |
| `design-review/sannenzaka/` | 京都模型源文件、OSM 源数据、提取脚本与离线渲染 |
| `design-review/sannenzaka-loop/` | 球面街区合成源文件、布局数据与离线渲染 |
| `scripts/check-package.py` | 当前分支入口、模块、资源和页面链接检查 |

`main` 保留旧版 `main.js`、`kyoto-theme.js` 和历史审核文件，用于追溯。
早期京都主题为哲学之道；当前 `kyoto.html` 已是二年坂三年坂。
内部托管配置、服务标识和对话授权摘录不在公开副本中；原发布站点不受影响。
历史模型审核状态仅适用于当时版本，不表示未来修改已获审核。

### 重新生成模型

已提供可直接运行的 GLB，不必安装 Blender。需要修改模型时，可用 Blender 4.3.2
打开 `.blend`；从根目录执行原生建模脚本示例（会更新对应产物）：

```sh
blender --background --python design-review/build.py
blender --background --python design-review/refine_form.py
blender --background --python design-review/export_assets.py
# 京都建筑；住宅独立分支不包含此脚本
blender --background --python design-review/sannenzaka/build_blender.py
```

共用导出脚本保留原有模型审核检查。离线 `district-composition.blend` 是阶段性的
结构审查快照；网页中的最终灯光、运动与相机逻辑以 `dist/` 为准。
各场景的 `render_composition.py` 可重新渲染已保存的合成数据。

## 验证与边界

Python 3 可检查打包资源，Node.js 22+ 可执行已有逻辑检查（使用 `import.meta.dirname`）：

```sh
python3 scripts/check-package.py
# 夕暮町（main / scene/yugure）
node --loader ./design-review/simulation-loader.mjs design-review/check-simulation.mjs
# 京都原版（main / scene/kyoto）
node --loader ./design-review/sannenzaka/test-loader.mjs design-review/sannenzaka/check-runtime.mjs
# 京都球面版（main / scene/kyoto-loop）
node --loader ./design-review/sannenzaka-loop/test-loader.mjs design-review/sannenzaka-loop/check-runtime.mjs
```

逻辑检查使用 Node DOM / 渲染器替身，覆盖人物、门、碰撞、探索与闭环运动；
不等同于浏览器 GPU 渲染、帧率或真机多点触控验证。截图目录里的 PNG 为 Blender
离线结构渲染，不能视为当前网页截图。旧审核记录保留其原有未通过项。

京都道路与建筑锚点来自 OSM；地形高度、立面、店内、灯光为艺术重建。
球面版对已有街段做重排和首尾连接，**不是现实京都地理闭环**，也不是逐栋测绘复刻。

## 开源许可

原创代码、建模脚本和原创模型几何使用 [MIT License](LICENSE)。
第三方依赖保留各自许可；地图数据库 © OpenStreetMap contributors，使用 ODbL 1.0，
不包含在 MIT 重新许可范围。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
