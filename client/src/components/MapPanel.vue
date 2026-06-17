<template>
  <section class="map-panel">
    <header class="map-header">
      <div>
        <h2>{{ activeNode?.name || '中国地图' }}</h2>
        <p>{{ status }}</p>
      </div>
      <div class="map-badges">
        <span class="coord-badge">{{ coordinateLabel }}</span>
        <span class="zoom-badge">Zoom {{ zoomLabel }}</span>
      </div>
    </header>
    <div ref="mapEl" class="map-canvas"></div>
    <div v-if="mapUnavailable" class="fallback-map" aria-live="polite">
      <div class="fallback-region">
        <span>{{ activeNode?.name || '中国' }}</span>
      </div>
      <div class="fallback-map-note">
        <strong>{{ activeNode?.name || '中国地图' }}</strong>
        <span>{{ activePathNames.join(' / ') }}</span>
        <small>配置高德 Key 后显示真实地图边界</small>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { loadAmap } from '../amap';

const emit = defineEmits(['coordinate-resolved']);

const SELECTED_REGION_STYLE = {
  faceFill: '#2DD4BF',
  faceStroke: '#0F766E',
  sideFill: '#0E7490',
  sideStroke: '#0891B2',
  shadowFill: '#0F172A'
};

const mapEl = ref(null);
const activeNode = ref(null);
const status = ref('地图初始化中');
const zoom = ref(4);
const currentPosition = ref([104.195397, 35.86166]);
const activePathNames = ref(['中国']);
const mapUnavailable = ref(false);

let AMap = null;
let map = null;
let districtSearch = null;
let geocoder = null;
let overlays = [];
let marker = null;
let infoWindow = null;

const zoomLabel = computed(() => zoom.value.toFixed(1));
const coordinateLabel = computed(() => {
  if (!Array.isArray(currentPosition.value) || currentPosition.value.length !== 2) {
    return '经纬度：暂无';
  }
  const [lng, lat] = currentPosition.value;
  return `经度 ${Number(lng).toFixed(6)} · 纬度 ${Number(lat).toFixed(6)}`;
});

function zoomByLevel(level) {
  if (level === 1) return 6.6;
  if (level === 2) return 9.4;
  if (level === 3) return 12.5;
  if (level >= 4) return 15.8;
  return 4.2;
}

function clearMap() {
  if (!map) return;
  if (overlays.length) {
    map.remove(overlays);
    overlays = [];
  }
  if (marker) {
    map.remove(marker);
    marker = null;
  }
  if (infoWindow) {
    infoWindow.close();
    infoWindow = null;
  }
}

function resolveCenter(node) {
  if (Array.isArray(node.center) && node.center.length === 2) return node.center;
  return null;
}

function syncNodeCoordinate(node, position) {
  if (!node?.code || !Array.isArray(position) || position.length !== 2) return;
  const normalized = [Number(position[0]), Number(position[1])];
  if (normalized.some((value) => Number.isNaN(value))) return;
  currentPosition.value = normalized;
  emit('coordinate-resolved', {
    code: node.code,
    center: normalized
  });
}

function fullKeyword(node, pathNames = []) {
  if (node.code && node.code.length === 6) return node.code;
  return pathNames.length ? pathNames.join('') : node.name;
}

function coordinatePair(point) {
  if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];
  return [Number(point.lng), Number(point.lat)];
}

function floatingOffset(zoomValue) {
  const offset = Math.max(0.0012, 0.2 / 2 ** (zoomValue - 5));
  return {
    lng: offset,
    lat: -offset * 0.72
  };
}

function offsetBoundaryPath(boundary, zoomValue) {
  const offset = floatingOffset(zoomValue);
  return boundary.map((point) => {
    const [lng, lat] = coordinatePair(point);
    return [lng + offset.lng, lat + offset.lat];
  });
}

function drawBoundary(node, pathNames) {
  const targetZoom = zoomByLevel(node.level);
  zoom.value = targetZoom;
  status.value = `正在绘制 ${node.name} 行政边界`;
  clearMap();

  districtSearch.search(fullKeyword(node, pathNames), (searchStatus, result) => {
    const district = result?.districtList?.[0];
    const boundaries = district?.boundaries || [];

    if (!boundaries.length) {
      status.value = `${node.name} 暂无可用边界，已切换到中心定位`;
      drawMarker(node, pathNames);
      return;
    }

    const shadowOverlays = boundaries.map((boundary) => {
      return new AMap.Polygon({
        path: offsetBoundaryPath(boundary, targetZoom),
        strokeColor: '#17324d',
        strokeWeight: 0,
        strokeOpacity: 0,
        fillColor: SELECTED_REGION_STYLE.shadowFill,
        fillOpacity: 0.15,
        zIndex: 90,
        bubble: true
      });
    });

    const sideOverlays = boundaries.map((boundary) => {
      return new AMap.Polygon({
        path: offsetBoundaryPath(boundary, targetZoom * 1.01),
        strokeColor: SELECTED_REGION_STYLE.sideStroke,
        strokeWeight: 2,
        strokeOpacity: 0.28,
        fillColor: SELECTED_REGION_STYLE.sideFill,
        fillOpacity: 0.2,
        zIndex: 95,
        bubble: true
      });
    });

    const faceOverlays = boundaries.map((boundary) => {
      return new AMap.Polygon({
        path: boundary,
        strokeColor: SELECTED_REGION_STYLE.faceStroke,
        strokeWeight: 2.6,
        strokeOpacity: 1,
        fillColor: SELECTED_REGION_STYLE.faceFill,
        fillOpacity: 0.54,
        zIndex: 120,
        bubble: true
      });
    });

    overlays = [...shadowOverlays, ...sideOverlays, ...faceOverlays];

    map.add(overlays);
    map.setFitView(faceOverlays, false, [38, 38, 38, 38], targetZoom);
    const center = district?.center;
    if (center) syncNodeCoordinate(node, [center.lng, center.lat]);
    status.value = `${node.name} 边界已高亮`;
  });
}

function drawMarker(node, pathNames) {
  const targetZoom = zoomByLevel(node.level);
  zoom.value = targetZoom;
  status.value = `正在定位 ${node.name}`;
  clearMap();

  const center = resolveCenter(node);
  if (center) {
    placeMarker(center, node, targetZoom);
    return;
  }

  geocoder.getLocation(pathNames.join(''), (geoStatus, result) => {
    const location = result?.geocodes?.[0]?.location;
    if (!location) {
      status.value = `${node.name} 暂未解析到坐标`;
      return;
    }
    placeMarker([location.lng, location.lat], node, targetZoom);
  });
}

function placeMarker(position, node, targetZoom) {
  syncNodeCoordinate(node, position);
  marker = new AMap.Marker({
    position,
    title: node.name,
    anchor: 'bottom-center',
    offset: new AMap.Pixel(0, -4)
  });
  infoWindow = new AMap.InfoWindow({
    content: `<div class="map-info"><strong>${node.name}</strong><span>${node.code}</span><span>经度 ${Number(position[0]).toFixed(6)} · 纬度 ${Number(position[1]).toFixed(6)}</span></div>`,
    offset: new AMap.Pixel(0, -32)
  });
  map.add(marker);
  map.setZoomAndCenter(targetZoom, position, false, 420);
  infoWindow.open(map, position);
  status.value = `${node.name} 已定点标注`;
}

async function drillTo(node, path = []) {
  if (!node) return;
  activeNode.value = node;
  const pathNames = path.map((item) => item.name);
  activePathNames.value = pathNames.length ? pathNames : [node.name];

  const center = resolveCenter(node);
  if (center) {
    currentPosition.value = center;
  }

  if (!map) {
    status.value = '地图加载中，已更新选中地址';
    return;
  }

  if (node.level === 0) {
    clearMap();
    zoom.value = 4.2;
    currentPosition.value = [104.195397, 35.86166];
    map.setZoomAndCenter(4.2, [104.195397, 35.86166], false, 420);
    status.value = '全国视角';
    return;
  }

  if (node.level >= 4) {
    drawMarker(node, pathNames);
  } else {
    drawBoundary(node, pathNames);
  }
}

defineExpose({ drillTo });

onMounted(async () => {
  try {
    AMap = await loadAmap();
    map = new AMap.Map(mapEl.value, {
      viewMode: '2D',
      zoom: 4.2,
      center: [104.195397, 35.86166],
      resizeEnable: true,
      mapStyle: 'amap://styles/whitesmoke'
    });
    districtSearch = new AMap.DistrictSearch({
      subdistrict: 0,
      extensions: 'all'
    });
    geocoder = new AMap.Geocoder({ city: '全国' });
    mapUnavailable.value = false;
    status.value = '全国视角';
  } catch (error) {
    mapUnavailable.value = true;
    status.value = error?.message || '地图暂不可用';
  }
});

onBeforeUnmount(() => {
  map?.destroy();
});
</script>
