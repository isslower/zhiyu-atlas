export function createRootNode() {
  return {
    id: '000000',
    code: '000000',
    name: '中国',
    parentCode: null,
    level: 0,
    center: [104.195397, 35.86166],
    hasChildren: true,
    loaded: false,
    collapsed: false,
    children: []
  };
}

export function normalizeNode(node) {
  return {
    id: node.code,
    code: node.code,
    name: node.name,
    parentCode: node.parentCode,
    level: node.level,
    center: node.center || null,
    hasChildren: node.hasChildren,
    loaded: false,
    collapsed: node.hasChildren,
    children: []
  };
}

export function findNode(root, code) {
  if (!root) return null;
  if (root.code === code) return root;
  for (const child of root.children || []) {
    const found = findNode(child, code);
    if (found) return found;
  }
  return null;
}

export function attachChildren(root, parentCode, children) {
  const parent = findNode(root, parentCode);
  if (!parent) return null;

  const existingByCode = new Map((parent.children || []).map((child) => [child.code, child]));
  parent.children = children.map((child) => {
    const existing = existingByCode.get(child.code);
    return existing
      ? { ...existing, ...normalizeNode(child), children: existing.children || [] }
      : normalizeNode(child);
  });
  parent.loaded = true;
  parent.collapsed = false;
  return parent;
}

export function getPath(root, code) {
  const path = [];

  function walk(node) {
    path.push(node);
    if (node.code === code) return true;
    for (const child of node.children || []) {
      if (walk(child)) return true;
    }
    path.pop();
    return false;
  }

  walk(root);
  return path;
}

export function expandPath(root, pathCodes) {
  for (const code of pathCodes) {
    const node = findNode(root, code);
    if (node) node.collapsed = false;
  }
}
