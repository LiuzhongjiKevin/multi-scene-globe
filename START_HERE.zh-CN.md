# 从这里开始

这是展开后的完整工程，不需要恢复 Git bundle，也不需要 npm install。

## 完整源码包内容

- `dist/`：两个场景的可编辑 JavaScript 源码、HTML、CSS、GLB、地图与本地 Three.js。
- `design-review/`：4 个 Blender 源文件、建模/导出脚本、OSM 原始数据、布局、逻辑检查与离线渲染。
- `docs/branches/`：两个独立分支各自的 README 副本。
- `scripts/check-package.py`：前端入口及依赖检查。
- `Dockerfile` / `compose.yaml`：静态网站容器配置。
- `FILE_MANIFEST.json`：逐文件大小及 SHA-256，用于核对完整性。

原始项目结构是 `dist` + `design-review`；没有把不存在的 `src`、纹理或 HDR 文件列为已交付。
工程通过重复使用模型与程序化材质降低体积，不存在“完整 3D 工程必须大于 200 MB”的要求。
本包包含完整主分支当前文件，不含 `.git` 历史；原 Git bundle 可另用于恢复分支历史。

## 最简单：Python 启动

在包含 dist 的解压目录打开终端：

```sh
python3 -m http.server 8080 --directory dist
```

Windows 可以用 `py -m http.server 8080 --directory dist`。
浏览器打开以下地址：

- 夕暮町：http://localhost:8080/index.html
- 京都二三年坂原版：http://localhost:8080/kyoto.html

不要直接双击 HTML。Ctrl+C 停止服务器。无需额外下载 Three.js 或 GLB。

## Docker / 群晖 Container Manager

已安装 Docker 的电脑或 NAS 可以执行：

```sh
docker compose up -d --build
```

或：

```sh
docker build -t multi-scene-globe .
docker run -d --name multi-scene-globe -p 8080:80 --restart unless-stopped multi-scene-globe
```

打开 `http://服务器IP:8080`，场景路径同上。首次构建需要拉取 nginx:alpine 镜像。
群晖可在 Container Manager 的“项目”中选择包含 compose.yaml 的解压目录并构建启动。
服务端只提供静态文件，3D 渲染由访问者浏览器的 WebGL 完成。
Docker 配置已提供；本次环境没有 Docker 服务，未声称已实测构建镜像。

## 部署包与源码包区别

部署包含完整 `dist/`、Docker 配置、许可和本说明，可直接按上述步骤运行。
它有意不带 Blender 建模源文件和离线审查资料；这些保存在完整源码包。

## 验证与素材说明

在源码包执行 `python3 scripts/check-package.py` 验证两个入口的本地依赖。
本次打包逐文件校验 ZIP 解压内容的 SHA-256，并核对 GLB 文件头和内嵌资源。
README 配图为标明来源的 Blender 渲染，未把它们当作当前网页截图。
地图数据 © OpenStreetMap contributors / ODbL 1.0；其他许可见 THIRD_PARTY_NOTICES.md。
