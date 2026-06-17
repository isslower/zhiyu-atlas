<template>
  <section class="mindmap-panel tree-browser">
    <header class="tree-browser-header">
      <div>
        <strong>行政区划树</strong>
        <span>点击节点展开、收起和地图下钻</span>
      </div>
      <div class="mindmap-actions">
        <button type="button" title="定位当前节点" @click="focus(activeCode)">定位当前</button>
        <button type="button" title="收起已展开节点" @click="$emit('collapse-all')">全部收起</button>
      </div>
    </header>

    <div ref="treeEl" class="division-tree" role="tree">
      <TreeNode
        :node="tree"
        :depth="0"
        :active-code="activeCode"
        :highlighted-code="highlightedCode"
        @node-click="$emit('node-click', $event)"
        @node-hover="$emit('node-hover', $event)"
      />
    </div>

    <div v-if="loadingNode" class="loading-pill">正在展开 {{ loadingNode }}</div>
  </section>
</template>

<script setup>
import { nextTick, ref } from 'vue';
import TreeNode from './TreeNode.vue';

defineProps({
  tree: {
    type: Object,
    required: true
  },
  activeCode: {
    type: String,
    default: '000000'
  },
  highlightedCode: {
    type: String,
    default: ''
  },
  loadingNode: {
    type: String,
    default: ''
  }
});

defineEmits(['node-click', 'node-hover', 'collapse-all']);

const treeEl = ref(null);

function render() {
  // Kept for compatibility with the parent component after data changes.
}

function focus(code) {
  nextTick(() => {
    const target = treeEl.value?.querySelector(`[data-node-code="${code}"]`);
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  });
}

defineExpose({ render, focus });
</script>
