export const MORANDI_COLORS = ['#08B8A6', '#FF9F0A', '#FF2D62', '#9B51E0', '#1D9BF0', '#37B24D'];
export const BORDER_COLOR = '#0875C9';

export function hashCode(code = '') {
  return String(code)
    .split('')
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0);
}

export function colorForCode(code = '') {
  return MORANDI_COLORS[hashCode(code) % MORANDI_COLORS.length];
}

export function readableTextColor(code = '') {
  const color = colorForCode(code).replace('#', '');
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 220 ? '#263241' : '#ffffff';
}
