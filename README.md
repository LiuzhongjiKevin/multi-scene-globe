# Multi-Scene Globe · 夕暮町

这是 `scene/yugure` 独立场景分支。所有前端运行依赖与对应模型源文件均在当前分支中。

```sh
python3 -m http.server 8080 --directory dist
```

打开 [http://localhost:8080](http://localhost:8080)。Windows 可用 `py` 替换 `python3`。
无需 npm 安装；不要直接双击 HTML。

拖动旋转、滚轮缩放、点击住宅门交互；支持第三人称跟随行人与切换行人。此场景没有 WASD 自由探索。

Blender 4.3.2 原生模型通过 GLB 加载；地形、道路与交互由 Three.js / WebGL 完成。
`design-review/` 包含本场景使用的建模来源、共有模型与阶段性离线审查材料。
其中 PNG 是 Blender 离线结构渲染，并非当前浏览器截图。

## 验证

```sh
python3 scripts/check-package.py
node --loader ./design-review/simulation-loader.mjs design-review/check-simulation.mjs
```

逻辑测试需要 Node.js 22+，使用 DOM / 渲染器替身，不等同于浏览器 GPU 或真机触控验证。
检查报告为生成时的记录；共用模型的历史审核不表示此后修改已获审核。

## 完整项目与许可

[主分支与全部场景](https://github.com/LiuzhongjiKevin/multi-scene-globe/tree/main)。
原创代码与模型几何使用 [MIT](LICENSE)，第三方库与地图使用各自许可；
参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。京都地图 © OpenStreetMap contributors / ODbL 1.0。
