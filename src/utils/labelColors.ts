import type { TaskLabel } from '@/types/domain';

export const DEFAULT_LABEL_COLORS = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
] as const;

const LABEL_PILL_CLASSES: Record<string, string> = {
  red: 'bg-rose-100 text-rose-800 border-rose-200',
  'dark-red': 'bg-rose-100 text-rose-800 border-rose-200',
  coral: 'bg-rose-100 text-rose-800 border-rose-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  'yellow-orange': 'bg-amber-100 text-amber-800 border-amber-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  'yellow-green': 'bg-lime-100 text-lime-800 border-lime-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'dark-green': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'light-green': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'blue-green': 'bg-teal-100 text-teal-800 border-teal-200',
  teal: 'bg-teal-100 text-teal-800 border-teal-200',
  aqua: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  'dark-blue': 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  'dark-purple': 'bg-purple-100 text-purple-800 border-purple-200',
  'light-purple': 'bg-purple-100 text-purple-800 border-purple-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  'dark-pink': 'bg-pink-100 text-pink-800 border-pink-200',
  'hot-pink': 'bg-pink-100 text-pink-800 border-pink-200',
  'light-pink': 'bg-pink-100 text-pink-800 border-pink-200',
  'light-warm-gray': 'bg-stone-100 text-stone-700 border-stone-200',
  'cool-gray': 'bg-slate-100 text-slate-700 border-slate-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  grey: 'bg-gray-100 text-gray-700 border-gray-200',
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
  lime: 'bg-lime-100 text-lime-800 border-lime-200',
  black: 'bg-gray-800 text-white border-gray-900',
};

const LABEL_DOT_CLASSES: Record<string, string> = {
  red: 'bg-rose-500',
  'dark-red': 'bg-rose-600',
  coral: 'bg-rose-500',
  orange: 'bg-orange-500',
  'yellow-orange': 'bg-amber-500',
  yellow: 'bg-amber-500',
  'yellow-green': 'bg-lime-500',
  green: 'bg-emerald-500',
  'dark-green': 'bg-emerald-600',
  'light-green': 'bg-emerald-400',
  'blue-green': 'bg-teal-500',
  teal: 'bg-teal-500',
  aqua: 'bg-cyan-500',
  blue: 'bg-blue-500',
  'dark-blue': 'bg-blue-600',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
  'dark-purple': 'bg-purple-600',
  'light-purple': 'bg-purple-400',
  pink: 'bg-pink-500',
  'dark-pink': 'bg-pink-600',
  'hot-pink': 'bg-pink-500',
  'light-pink': 'bg-pink-400',
  'light-warm-gray': 'bg-stone-400',
  'cool-gray': 'bg-slate-400',
  gray: 'bg-gray-400',
  grey: 'bg-gray-400',
  sky: 'bg-sky-500',
  lime: 'bg-lime-500',
  black: 'bg-gray-800',
};

function isCssColor(color: string | null | undefined): color is string {
  if (!color) return false;
  const c = color.trim();
  return c.startsWith('#') || c.startsWith('rgb(') || c.startsWith('hsl(');
}

export function getLabelPillClass(color: string | null | undefined): string {
  const key = color?.trim().toLowerCase();
  return (key && LABEL_PILL_CLASSES[key]) || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getLabelPillStyle(
  color: string | null | undefined,
): Record<string, string> | undefined {
  if (!isCssColor(color)) return undefined;
  return {
    color,
    borderColor: `${color}45`,
    backgroundColor: `${color}15`,
  };
}

export function getLabelDotClass(color: string | null | undefined): string {
  const key = color?.trim().toLowerCase();
  return (key && LABEL_DOT_CLASSES[key]) || 'bg-gray-400';
}

export function getLabelDotStyle(
  color: string | null | undefined,
): Record<string, string> | undefined {
  if (!isCssColor(color)) return undefined;
  return { backgroundColor: color };
}

export function getLabelDisplayName(label: Pick<TaskLabel, 'name' | 'color'>): string {
  return label.name?.trim() || label.color || 'Label';
}
