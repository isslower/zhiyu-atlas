async function request(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Static data ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export function fetchDivisions(parentId = '000000') {
  return request(`/data/${encodeURIComponent(parentId)}.json`);
}

const searchShardCache = new Map();

export async function searchDivisions(keyword) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [];

  const shard = encodeURIComponent(keyword.trim().charAt(0));
  if (!searchShardCache.has(shard)) {
    searchShardCache.set(shard, request(`/data/search/${shard}.json`).catch(() => []));
  }

  const items = await searchShardCache.get(shard);
  return items
    .filter((item) => item.name.toLowerCase().includes(normalized) || item.code.includes(normalized))
    .slice(0, 24);
}
