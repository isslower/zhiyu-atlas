import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const buildDir = path.join(root, '.docx-linkage-build');
const docxPath = path.join(docsDir, '思维导图地图联动.docx');
const zipPath = path.join(docsDir, '思维导图地图联动.zip');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, 'utf8');
}

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function paragraph(text, style = 'body') {
  const escaped = escapeXml(text);
  if (style === 'title') {
    return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="34"/></w:rPr><w:t>${escaped}</w:t></w:r></w:p>`;
  }
  if (style === 'heading') {
    return `<w:p><w:pPr><w:spacing w:before="220" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="25"/></w:rPr><w:t>${escaped}</w:t></w:r></w:p>`;
  }
  return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:sz w:val="21"/></w:rPr><w:t>${escaped}</w:t></w:r></w:p>`;
}

fs.rmSync(buildDir, { recursive: true, force: true });
fs.rmSync(docxPath, { force: true });
fs.rmSync(zipPath, { force: true });
ensureDir(docsDir);

write(
  path.join(buildDir, '[Content_Types].xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
);

write(
  path.join(buildDir, '_rels', '.rels'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
);

write(
  path.join(buildDir, 'docProps', 'app.xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>`
);

write(
  path.join(buildDir, 'docProps', 'core.xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>思维导图地图联动</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-17T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-17T00:00:00Z</dcterms:modified>
</cp:coreProperties>`
);

const content = [
  ['思维导图地图联动产品文档', 'title'],
  ['一、产品目标', 'heading'],
  ['建设一个零服务器成本的全国行政区划五级联动单页网页。左侧使用 ECharts Tree 呈现行政区划思维导图，右侧使用高德地图 JS API 2.0 呈现中国地图与行政边界。用户点击任一层级节点后，地图按层级自动下钻、缩放、绘制边界或定点标注。', 'body'],
  ['二、页面布局', 'heading'],
  ['页面采用左右分栏：顶部为标题、路径栏和全局搜索；左侧主体为思维导图画布，支持拖拽平移、滚轮缩放、节点懒加载；右侧为地图分栏，显示当前区域名称、状态和缩放层级。', 'body'],
  ['三、数据方案', 'heading'],
  ['项目不依赖云服务器和数据库。scripts/split-divisions.mjs 会将全国五级大 JSON 按 parent_code 拆分为 client/public/data/{parentCode}.json，并额外生成 search-index.json。前端通过 fetch 静态文件实现懒加载、搜索和路径溯源。', 'body'],
  ['四、地图下钻规则', 'heading'],
  ['点击省级节点时地图缩放到 6~7 级并绘制省边界；点击市级节点缩放到 9~10 级并绘制市边界；点击区县级节点缩放到 12~13 级并绘制区县边界；点击乡镇、街道、村或社区节点时，切换为定点打点模式，缩放到 15~16 级，并打开信息气泡。', 'body'],
  ['五、配色策略', 'heading'],
  ['地图与思维导图共用莫兰迪配色库：#E2F0D9、#DDEBF7、#FCE4D6、#E8E2F2、#FFF2CC。系统使用 code 哈希取模为每个行政区分配填充色，边界线统一使用 #99A9BF、1.5px，从而让相邻区域形成错开的低饱和色块。', 'body'],
  ['六、搜索联动', 'heading'],
  ['搜索框加载 search-index.json 后在前端进行名称和 code 模糊匹配。用户选择结果后，系统按 pathCodes 逐级 fetch 对应父级静态 JSON，批量展开思维导图完整路径，并同步触发地图下钻到目标节点。', 'body'],
  ['七、安全说明', 'heading'],
  ['高德 Key 和 securityJsCode 已按分段方式写入前端 loader，能降低直接文本爬取概率；但浏览器前端无法真正加密第三方地图凭证。生产环境仍应在高德控制台配置域名白名单、配额告警和 Referer 限制。', 'body'],
  ['八、可扩展方向', 'heading'],
  ['后续可加入搜索索引分片、拼音搜索、地图多边形缓存、离线 GeoJSON 边界、节点收藏、导出图片和移动端抽屉式地图视图。', 'body']
];

write(
  path.join(buildDir, 'word', 'document.xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content.map(([text, style]) => paragraph(text, style)).join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
);

execFileSync(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${buildDir.replaceAll('"', '`"')}\\*" -DestinationPath "${zipPath.replaceAll('"', '`"')}" -Force`
  ],
  { stdio: 'inherit' }
);

fs.renameSync(zipPath, docxPath);
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`Generated ${docxPath}`);
