<template>
  <nav class="path-bar" aria-label="当前位置">
    <span
      v-for="(node, index) in path"
      :key="node.code"
      class="path-item"
      :class="{ active: node.code === targetCode }"
    >
      {{ node.name }}
      <small>{{ node.code }}</small>
      <b v-if="index < path.length - 1">/</b>
    </span>
  </nav>
</template>

<script setup>
defineProps({
  path: {
    type: Array,
    default: () => []
  },
  targetCode: {
    type: String,
    default: ''
  }
});
</script>
