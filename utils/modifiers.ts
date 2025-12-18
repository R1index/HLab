import type { ContractModifier } from '../types';
import {
  AlertTriangle,
  Bomb,
  Bug,
  Clock,
  Crosshair,
  EyeOff,
  FileWarning,
  Layers,
  Shield,
  ShieldAlert,
  ShieldOff,
  Star,
  Zap,
} from 'lucide-react';

type ModifierMeta = {
  icon: typeof ShieldAlert;
  title: string;
  description: string;
  colorClass: string;
  textColor: string;
};

const DEFAULT_META: ModifierMeta = {
  icon: ShieldAlert,
  title: 'Unknown',
  description: 'Unknown anomaly',
  colorClass: 'border-slate-700 text-slate-400 bg-slate-900',
  textColor: 'text-slate-400',
};

const MODIFIER_META: Record<ContractModifier, ModifierMeta> = {
  chaos: {
    icon: Zap,
    title: 'chaos',
    description: 'Spawns are erratic',
    colorClass: 'border-yellow-500/50 text-yellow-400 bg-yellow-950',
    textColor: 'text-yellow-400',
  },
  precision: {
    icon: Crosshair,
    title: 'precision',
    description: 'Misses deal 5x damage',
    colorClass: 'border-red-500/50 text-red-400 bg-red-950',
    textColor: 'text-red-400',
  },
  fragile: {
    icon: ShieldOff,
    title: 'fragile',
    description: 'Stability regen disabled',
    colorClass: 'border-orange-500/50 text-orange-400 bg-orange-950',
    textColor: 'text-orange-400',
  },
  volatile: {
    icon: AlertTriangle,
    title: 'volatile',
    description: 'Explosive targets deal 2x dmg',
    colorClass: 'border-red-500 text-red-500 bg-red-950',
    textColor: 'text-red-500',
  },
  hardened: {
    icon: ShieldAlert,
    title: 'hardened',
    description: 'Targets need extra clicks',
    colorClass: 'border-slate-400 text-slate-300 bg-slate-800',
    textColor: 'text-slate-300',
  },
  rushed: {
    icon: Clock,
    title: 'rushed',
    description: '+20% Spawn rate',
    colorClass: 'border-cyan-500/50 text-cyan-400 bg-cyan-950',
    textColor: 'text-cyan-400',
  },
  dense: {
    icon: Layers,
    title: 'dense',
    description: 'Grid density increased',
    colorClass: 'border-purple-500/50 text-purple-400 bg-purple-950',
    textColor: 'text-purple-400',
  },
  lucky: {
    icon: Star,
    title: 'lucky',
    description: 'High value targets appear more often',
    colorClass: 'border-green-500/50 text-green-400 bg-green-950',
    textColor: 'text-green-400',
  },
  glitch: {
    icon: Zap,
    title: 'glitch',
    description: 'Targets shift position unexpectedly',
    colorClass: 'border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-950',
    textColor: 'text-fuchsia-400',
  },
  bureaucracy: {
    icon: FileWarning,
    title: 'bureaucracy',
    description: 'Red Tape hurts score if ignored',
    colorClass: 'border-blue-500/50 text-blue-400 bg-blue-950',
    textColor: 'text-blue-400',
  },
  bombardment: {
    icon: Bomb,
    title: 'bombardment',
    description: 'Bombs explode for massive damage',
    colorClass: 'border-red-500/70 text-red-400 bg-red-900/40',
    textColor: 'text-red-400',
  },
  replicator: {
    icon: Bug,
    title: 'replicator',
    description: 'Viruses multiply rapidly',
    colorClass: 'border-emerald-500/50 text-emerald-400 bg-emerald-950',
    textColor: 'text-emerald-400',
  },
  stealth: {
    icon: EyeOff,
    title: 'stealth',
    description: 'Targets are partially invisible',
    colorClass: 'border-slate-500 text-white bg-black',
    textColor: 'text-white',
  },
  shielded: {
    icon: Shield,
    title: 'shielded',
    description: 'Targets have heavy shields (4-5 clicks)',
    colorClass: 'border-blue-500 text-blue-300 bg-blue-950',
    textColor: 'text-blue-300',
  },
};

export const getModifierMeta = (mod: ContractModifier): ModifierMeta => MODIFIER_META[mod] || DEFAULT_META;
