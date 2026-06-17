<template>
  <article
    class="tree-node"
    :class="{ active: isActive, highlighted: isHighlighted, collapsed: node.collapsed }"
    :style="{ '--branch-color': branchColor, '--depth': depth }"
    :data-node-code="node.code"
    role="treeitem"
    :aria-expanded="node.hasChildren ? String(!node.collapsed) : undefined"
  >
    <button
      type="button"
      class="tree-node-main"
      @click="$emit('node-click', node)"
      @mouseenter="$emit('node-hover', node)"
    >
      <span class="tree-toggle" aria-hidden="true">{{ toggleMark }}</span>
      <span class="tree-node-content">
        <span class="tree-node-name">{{ node.name }}</span>
        <span class="tree-node-meta">
          <b>{{ levelName }}</b>
          <small>{{ node.code }}</small>
        </span>
        <span class="tree-node-coords">{{ coordinateText }}</span>
      </span>
      <span v-if="node.hasChildren" class="tree-state">{{ stateLabel }}</span>
    </button>

    <section v-if="node.children?.length && !node.collapsed" class="tree-children" role="group">
      <TreeNode
        v-for="(child, index) in node.children"
        :key="child.code"
        :node="child"
        :depth="depth + 1"
        :sibling-index="index"
        :active-code="activeCode"
        :highlighted-code="highlightedCode"
        @node-click="$emit('node-click', $event)"
        @node-hover="$emit('node-hover', $event)"
      />
    </section>
  </article>
</template>

<script setup>
import { computed } from 'vue';

defineOptions({ name: 'TreeNode' });

const BRANCH_COLORS = ['#08b8a6', '#ff9f0a', '#ff2d62', '#9b51e0', '#1d9bf0', '#37b24d'];
const LEVEL_NAMES = ['国家', '省级', '市级', '区县', '街道', '村社'];

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  siblingIndex: {
    type: Number,
    default: 0
  },
  activeCode: {
    type: String,
    default: ''
  },
  highlightedCode: {
    type: String,
    default: ''
  }
});

defineEmits(['node-click', 'node-hover']);

const branchColor = computed(() => {
  if (props.depth === 0) return '#0875c9';
  return BRANCH_COLORS[props.siblingIndex % BRANCH_COLORS.length];
});

const isActive = computed(() => props.node.code === props.activeCode);
const isHighlighted = computed(() => props.node.code === props.highlightedCode);
const levelName = computed(() => LEVEL_NAMES[props.node.level] || '节点');
const coordinateText = computed(() => {
  if (!Array.isArray(props.node.center) || props.node.center.length !== 2) {
    return '经纬度：点击定位后显示';
  }
  const [lng, lat] = props.node.center;
  return `经度 ${Number(lng).toFixed(6)} · 纬度 ${Number(lat).toFixed(6)}`;
});
const toggleMark = computed(() => {
  if (!props.node.hasChildren) return '';
  return props.node.loaded && !props.node.collapsed ? '-' : '+';
});
const stateLabel = computed(() => {
  if (!props.node.loaded) return '展开';
  return props.node.collapsed ? '展开' : '收起';
});
</script>
