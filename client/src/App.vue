<template>
  <main class="app-shell">
    <header class="topbar">
      <section class="brand">
        <span class="brand-mark">
          <img src="/logo.svg" alt="" />
        </span>
        <div>
          <h1>知域图谱</h1>
          <p>行政区划树形下钻 · 经纬度联动 · 高德地图边界高亮</p>
        </div>
      </section>

      <SearchBox
        :results="searchResults"
        :loading="searching"
        @search="handleSearch"
        @select="handleSearchSelect"
      />
    </header>

    <PathBar :path="activePath" :target-code="activeCode" />

    <section class="split-layout">
      <section class="left-workspace">
        <div class="toolbar">
          <div class="metric">
            <strong>{{ loadedCount }}</strong>
            <span>已加载节点</span>
          </div>
          <div class="metric">
            <strong>{{ activeLevelName }}</strong>
            <span>当前层级</span>
          </div>
          <div class="tree-hint">支持五级下钻 · 懒加载 · 可收缩</div>
        </div>

        <MindMap
          ref="mindMapRef"
          :tree="root"
          :active-code="activeCode"
          :highlighted-code="highlightedCode"
          :loading-node="loadingNode"
          @node-click="handleNodeClick"
          @node-hover="handleNodeHover"
          @collapse-all="collapseAllTree"
        />
      </section>

      <MapPanel ref="mapPanelRef" @coordinate-resolved="handleCoordinateResolved" />
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { fetchDivisions, searchDivisions } from './api';
import MapPanel from './components/MapPanel.vue';
import MindMap from './components/MindMap.vue';
import PathBar from './components/PathBar.vue';
import SearchBox from './components/SearchBox.vue';
import {
  attachChildren,
  createRootNode,
  expandPath,
  findNode,
  getPath
} from './treeStore';

const root = ref(createRootNode());
const activeCode = ref('000000');
const highlightedCode = ref('');
const loadingNode = ref('');
const searching = ref(false);
const searchResults = ref([]);
const mindMapRef = ref(null);
const mapPanelRef = ref(null);

const activePath = computed(() => getPath(root.value, activeCode.value));
const activeNode = computed(() => findNode(root.value, activeCode.value));
const loadedCount = computed(() => countNodes(root.value));
const activeLevelName = computed(() => {
  const names = ['国家', '省级', '市级', '区县级', '乡镇街道', '村/社区'];
  return names[activeNode.value?.level || 0] || '节点';
});

function countNodes(node) {
  return 1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
}

async function loadChildren(parentCode) {
  const parent = findNode(root.value, parentCode);
  if (!parent || parent.loaded || !parent.hasChildren) return;

  loadingNode.value = parent.name;
  try {
    const children = await fetchDivisions(parentCode);
    attachChildren(root.value, parentCode, children);
  } finally {
    loadingNode.value = '';
  }
}

async function expandSearchPath(pathCodes) {
  for (const parentCode of pathCodes.slice(0, -1)) {
    await loadChildren(parentCode);
  }
  expandPath(root.value, pathCodes);
}

async function handleNodeClick(nodeData) {
  const node = findNode(root.value, nodeData.code);
  if (!node) return;

  if (node.code === root.value.code) {
    await collapseAllTree();
    return;
  }

  activeCode.value = node.code;
  highlightedCode.value = node.code;

  const wasOpen = node.hasChildren && node.loaded && !node.collapsed;

  if (node.hasChildren && !node.loaded) {
    await loadChildren(node.code);
  } else if (node.hasChildren) {
    node.collapsed = wasOpen;
  }

  const path = getPath(root.value, node.code);
  if (!wasOpen) {
    collapseOutsidePath(root.value, new Set(path.map((item) => item.code)));
    expandPath(root.value, path.map((item) => item.code));
  }

  await nextTick();
  mindMapRef.value?.render();
  mindMapRef.value?.focus(node.code);
  mapPanelRef.value?.drillTo(node, path);
}

function handleNodeHover(nodeData) {
  highlightedCode.value = nodeData.code;
}

function collapseNode(node) {
  for (const child of node.children || []) {
    child.collapsed = true;
    collapseNode(child);
  }
}

function collapseOutsidePath(node, pathCodes) {
  for (const child of node.children || []) {
    if (!pathCodes.has(child.code)) {
      child.collapsed = true;
      collapseNode(child);
    } else {
      collapseOutsidePath(child, pathCodes);
    }
  }
}

function handleCoordinateResolved({ code, center }) {
  const node = findNode(root.value, code);
  if (!node) return;
  node.center = center;
}

async function collapseAllTree() {
  collapseNode(root.value);
  root.value.collapsed = false;
  activeCode.value = root.value.code;
  highlightedCode.value = root.value.code;

  const path = getPath(root.value, root.value.code);
  await nextTick();
  mindMapRef.value?.focus(root.value.code);
  mapPanelRef.value?.drillTo(root.value, path);
}

async function handleSearch(keyword) {
  searching.value = true;
  searchResults.value = [];
  try {
    searchResults.value = await searchDivisions(keyword);
  } finally {
    searching.value = false;
  }
}

async function handleSearchSelect(result) {
  await expandSearchPath(result.pathCodes);
  activeCode.value = result.code;
  highlightedCode.value = result.code;

  const target = findNode(root.value, result.code) || result;
  const path = getPath(root.value, result.code);
  collapseOutsidePath(root.value, new Set(path.map((item) => item.code)));
  expandPath(root.value, path.map((item) => item.code));

  await nextTick();
  mindMapRef.value?.render();
  mindMapRef.value?.focus(result.code);
  mapPanelRef.value?.drillTo(target, path);
}

onMounted(async () => {
  await loadChildren('000000');
  const path = getPath(root.value, '000000');
  mapPanelRef.value?.drillTo(root.value, path);
});
</script>
