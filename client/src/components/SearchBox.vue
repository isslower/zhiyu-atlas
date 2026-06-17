<template>
  <section class="search-box">
    <form @submit.prevent="submit">
      <input
        v-model.trim="keyword"
        type="search"
        placeholder="搜索行政区划，如 粤海街道 / 百官"
        autocomplete="off"
      />
      <button type="submit" :disabled="loading || !keyword">
        {{ loading ? '搜索中' : '搜索' }}
      </button>
    </form>

    <div v-if="results.length" class="search-results">
      <button
        v-for="result in results"
        :key="result.code"
        type="button"
        @click="$emit('select', result)"
      >
        <strong>{{ result.name }}</strong>
        <span>{{ result.pathNames.join(' / ') }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  results: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['search', 'select']);
const keyword = ref('');

function submit() {
  if (keyword.value) emit('search', keyword.value);
}
</script>
