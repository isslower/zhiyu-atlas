import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPackageDist = path.join(root, '.source-npm', 'node_modules', 'china-division', 'dist');
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPackageDist;
const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'client', 'public', 'data');

const SPECIAL_CENTERS = new Map([
  ['000000', [104.195397, 35.86166]],
  ['710000', [121.509062, 23.69781]],
  ['810000', [114.173355, 22.320048]],
  ['820000', [113.54909, 22.198951]]
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function toProvinceCode(code) {
  return `${String(code).padStart(2, '0')}0000`;
}

function toCityCode(code) {
  return `${String(code).padStart(4, '0')}00`;
}

function asPublicNode(row, hasChildren = false) {
  return {
    id: row.code,
    code: row.code,
    name: row.name,
    parentCode: row.parentCode,
    level: row.level,
    center: SPECIAL_CENTERS.get(row.code) || null,
    hasChildren
  };
}

function addNode(rows, row) {
  rows.push({
    code: String(row.code),
    name: String(row.name),
    parentCode: row.parentCode == null ? null : String(row.parentCode),
    level: Number(row.level),
    sort: Number(row.sort || rows.length + 1)
  });
}

function loadChinaDivisionDist(distDir) {
  const rows = [];
  addNode(rows, { code: '000000', name: '中国', parentCode: null, level: 0, sort: 0 });

  const provinces = readJson(path.join(distDir, 'provinces.json'));
  const cities = readJson(path.join(distDir, 'cities.json'));
  const areas = readJson(path.join(distDir, 'areas.json'));
  const streets = readJson(path.join(distDir, 'streets.json'));
  const villages = readJson(path.join(distDir, 'villages.json'));

  for (const item of provinces) {
    addNode(rows, {
      code: toProvinceCode(item.code),
      name: item.name,
      parentCode: '000000',
      level: 1,
      sort: Number(item.code)
    });
  }

  for (const item of cities) {
    const provinceName = provinces.find((p) => p.code === item.provinceCode)?.name || '';
    addNode(rows, {
      code: toCityCode(item.code),
      name: item.name === '市辖区' ? provinceName : item.name,
      parentCode: toProvinceCode(item.provinceCode),
      level: 2,
      sort: Number(item.code)
    });
  }

  for (const item of areas) {
    addNode(rows, {
      code: item.code,
      name: item.name,
      parentCode: toCityCode(item.cityCode),
      level: 3,
      sort: Number(item.code)
    });
  }

  for (const item of streets) {
    addNode(rows, {
      code: item.code,
      name: item.name,
      parentCode: item.areaCode,
      level: 4,
      sort: Number(item.code)
    });
  }

  for (const item of villages) {
    addNode(rows, {
      code: item.code,
      name: item.name,
      parentCode: item.streetCode,
      level: 5,
      sort: Number(item.code)
    });
  }

  appendHongKongMacaoTaiwan(rows, path.join(distDir, 'HK-MO-TW.json'));
  return rows;
}

function appendHongKongMacaoTaiwan(rows, file) {
  const source = readJson(file);
  const provinceCodes = {
    香港特别行政区: '810000',
    澳门特别行政区: '820000',
    台湾省: '710000'
  };

  for (const [provinceName, cities] of Object.entries(source)) {
    const provinceCode = provinceCodes[provinceName];
    if (!provinceCode) continue;
    addNode(rows, {
      code: provinceCode,
      name: provinceName,
      parentCode: '000000',
      level: 1,
      sort: Number(provinceCode)
    });

    let cityIndex = 1;
    for (const [cityName, areaNames] of Object.entries(cities)) {
      const cityCode = `${provinceCode.slice(0, 2)}${String(cityIndex).padStart(2, '0')}00`;
      addNode(rows, {
        code: cityCode,
        name: cityName,
        parentCode: provinceCode,
        level: 2,
        sort: cityIndex
      });

      areaNames.forEach((areaName, areaIndex) => {
        addNode(rows, {
          code: `${cityCode.slice(0, 4)}${String(areaIndex + 1).padStart(2, '0')}`,
          name: areaName,
          parentCode: cityCode,
          level: 3,
          sort: areaIndex + 1
        });
      });
      cityIndex += 1;
    }
  }
}

function loadGenericJson(file) {
  const source = readJson(file);
  if (!Array.isArray(source)) throw new Error('Generic source JSON must be an array.');
  const rows = [
    { code: '000000', name: '中国', parentCode: null, level: 0, sort: 0 },
    ...source.map((row, index) => ({
      code: String(row.code),
      name: String(row.name),
      parentCode: row.parent_code == null ? row.parentCode ?? null : String(row.parent_code),
      level: Number(row.level || inferLevel(String(row.code))),
      sort: Number(row.sort || row.sort_order || index + 1)
    }))
  ];
  return rows;
}

function inferLevel(code) {
  if (code === '000000') return 0;
  if (/^\d{6}$/.test(code) && code.endsWith('0000')) return 1;
  if (/^\d{6}$/.test(code) && code.endsWith('00')) return 2;
  if (/^\d{6}$/.test(code)) return 3;
  if (/^\d{9}$/.test(code)) return 4;
  return 5;
}

function shardKey(name) {
  return String(name || '#').trim().charAt(0) || '#';
}

function buildPath(row, byCode) {
  const path = [];
  let current = row;
  const seen = new Set();
  while (current && !seen.has(current.code)) {
    seen.add(current.code);
    path.unshift(current);
    current = current.parentCode ? byCode.get(current.parentCode) : null;
  }
  return path;
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data)}\n`, 'utf8');
}

const rows = fs.statSync(sourcePath).isDirectory()
  ? loadChinaDivisionDist(sourcePath)
  : loadGenericJson(sourcePath);

const byCode = new Map(rows.map((row) => [row.code, row]));
const childrenByParent = new Map();
for (const row of rows) {
  if (!row.parentCode) continue;
  if (!childrenByParent.has(row.parentCode)) childrenByParent.set(row.parentCode, []);
  childrenByParent.get(row.parentCode).push(row);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.join(outputDir, 'search'), { recursive: true });

for (const [parentCode, children] of childrenByParent.entries()) {
  const payload = children
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
    .map((row) => asPublicNode(row, childrenByParent.has(row.code)));
  writeJson(path.join(outputDir, `${parentCode}.json`), payload);
}

const shards = new Map();
for (const row of rows) {
  if (row.level === 0) continue;
  const pathRows = buildPath(row, byCode);
  const item = {
    ...asPublicNode(row, childrenByParent.has(row.code)),
    pathCodes: pathRows.map((node) => node.code),
    pathNames: pathRows.map((node) => node.name)
  };
  const key = shardKey(row.name);
  if (!shards.has(key)) shards.set(key, []);
  shards.get(key).push(item);
}

for (const [key, items] of shards.entries()) {
  writeJson(path.join(outputDir, 'search', `${key}.json`), items);
}

writeJson(path.join(outputDir, 'search-manifest.json'), {
  shardStrategy: 'first-character-of-name',
  shards: [...shards.keys()].sort()
});

writeJson(path.join(outputDir, 'meta.json'), {
  total: rows.length,
  parents: childrenByParent.size,
  searchShards: shards.size,
  generatedAt: new Date().toISOString(),
  source: fs.statSync(sourcePath).isDirectory() ? 'china-division/dist' : path.basename(sourcePath),
  notes: [
    '大陆数据来自 china-division 的 provinces/cities/areas/streets/villages。',
    '香港、澳门、台湾来自 HK-MO-TW.json，源数据覆盖到市/区县层级，不包含街道和村级。'
  ]
});

console.log(`Split ${rows.length} divisions into ${outputDir}`);
console.log(`Generated ${childrenByParent.size} parent files and ${shards.size} search shards.`);
