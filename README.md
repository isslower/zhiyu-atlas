# 知域图谱

知域图谱是一个全国行政区划树形下钻与高德地图边界联动的可视化页面。它适合做行政区划查询、地址层级展示、区域边界定位，以及需要从省、市、区县继续下钻到街道、村级数据的业务原型。

我建议项目中文名叫 **知域图谱**，GitHub 仓库名使用 **zhiyu-atlas**。这个名字比“全国地址”更产品化，也能体现“知道区域、看见层级、联动地图”的感觉。

## 演示截图

> 截图文件位于 `docs/screenshots/`，如果本地没有配置高德 Key，页面会展示安全的地图占位效果；配置后会显示真实高德地图边界。

![知域图谱总览](docs/screenshots/overview.png)

![选中地块效果](docs/screenshots/selected-region.png)

## 功能特性

- 五级行政区划树状展示，支持逐级展开和自动收起其他分支。
- 左侧树节点与右侧地图联动，选中地址后地图聚焦对应区域。
- 选中区域使用立体抬升效果，突出当前地块边界。
- 支持展示经纬度，并在地图解析成功后回填到节点信息中。
- 静态 JSON 分片加载，不依赖数据库，适合静态部署。
- 高德地图 Key 通过运行时配置注入，避免把敏感配置提交到 GitHub。
- 未配置地图 Key 时提供降级展示，不影响树形数据浏览。

## 技术栈

- Vue 3
- Vite
- 高德地图 JS API 2.0
- 静态 JSON 数据分片
- Docker + Nginx 部署

## 配置高德地图

不要提交真实的高德 Key 或安全密钥。

本地运行时复制示例配置：

```powershell
Copy-Item client\public\config.example.json client\public\config.json
```

然后编辑 `client/public/config.json`：

```json
{
  "amapKey": "YOUR_AMAP_WEB_JS_KEY",
  "amapSecurityCode": "YOUR_AMAP_SECURITY_JS_CODE"
}
```

`client/public/config.json` 已加入 `.gitignore`，只保留 `config.example.json` 用于说明配置格式。

## 本地部署

安装依赖：

```bash
npm run install:all
```

构建前端：

```bash
npm run build
```

启动本地静态服务：

```bash
npm start
```

访问地址：

```text
http://127.0.0.1:8080/
```

Windows 下也可以双击 `启动本地网页.cmd` 启动本地服务。

## 开发模式

```bash
npm run dev:client
```

Vite 默认地址通常是：

```text
http://localhost:5173/
```

如果端口被占用，请以终端实际输出为准。

## Docker 部署

构建镜像：

```bash
docker build -t zhiyu-atlas .
```

Linux/macOS 运行：

```bash
docker run -d --name zhiyu-atlas -p 8080:80 \
  -e AMAP_KEY="your_amap_key" \
  -e AMAP_SECURITY_CODE="your_amap_security_code" \
  zhiyu-atlas
```

Windows PowerShell 运行：

```powershell
docker run -d --name zhiyu-atlas -p 8080:80 `
  -e AMAP_KEY="your_amap_key" `
  -e AMAP_SECURITY_CODE="your_amap_security_code" `
  zhiyu-atlas
```

Docker 容器启动时会根据环境变量自动生成 `/usr/share/nginx/html/config.json`，所以镜像里不会打包你的本地高德配置。

## 静态站点部署

如果部署到 Nginx、宝塔、静态托管或对象存储：

1. 执行 `npm run build`。
2. 上传 `client/dist/` 目录内容。
3. 在站点根目录额外放置一个 `config.json`，格式参考 `client/public/config.example.json`。
4. SPA 站点需要将未知路径回退到 `index.html`。

## 数据分片

如果需要重新生成行政区划数据，可以准备包含 `code`、`name`、`parent_code`、`level` 字段的 JSON 文件，然后执行：

```bash
node scripts/split-divisions.mjs path/to/divisions.json client/public/data
```

也可以使用项目内置脚本：

```bash
npm run split
```

生成结果会写入 `client/public/data/`，页面按父级编码按需加载子节点。

## 推送前检查

推送 GitHub 前建议执行：

```bash
git status --short
git check-ignore -v client/public/config.json .env
rg "amapKey|amapSecurityCode|AMAP_KEY|AMAP_SECURITY_CODE" README.md Dockerfile docker client/src client/public/config.example.json
```

确认只出现示例占位、环境变量名和运行时代码，没有真实 Key，也没有 `client/public/config.json` 被加入提交。
