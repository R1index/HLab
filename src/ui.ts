import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { Creature, Girl, Room } from './types.js';

export function girlEmbed(g: Girl) {
  return new EmbedBuilder()
    .setTitle(`👩 ${g.name} [${g.spec}]`)
    .setDescription(`ID: \`${g.id}\``)
    .addFields(
      { name: 'Status', value: g.status, inline: true },
      { name: '❤️ Health', value: String(Math.round(g.health)), inline: true },
      { name: '⚡ Energy', value: String(Math.round(g.energy)), inline: true },
      { name: '💪 Strength', value: String(g.strength), inline: true },
      { name: '🏃 Stamina', value: String(g.stamina), inline: true }
    );
}

export function creatureEmbed(c: Creature) {
  return new EmbedBuilder()
    .setTitle(`🧬 Creature [${c.spec}]`)
    .setDescription(`ID: \`${c.id}\``)
    .addFields(
      { name: '📏 Size', value: String(c.size), inline: true },
      { name: '💪 Strength', value: String(c.strength), inline: true },
      { name: '❤️ Health', value: String(c.health), inline: true },
      { name: '🏃 Stamina', value: String(c.stamina), inline: true }
    );
}

export function roomsEmbed(rooms: Room[]) {
  const e = new EmbedBuilder().setTitle('🏠 Rooms');
  e.setDescription(rooms.map(r => `• ${r.kind === 'GIRL' ? '👩' : '🧬'} **${r.id}** — ${r.occupied ? `occupied by \`${r.occupant_id}\`` : 'free'}`).join('\n') || 'No rooms');
  return e;
}

export function pager(current: number, total: number, customIdBase: string) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${customIdBase}:prev`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(current<=0),
    new ButtonBuilder().setCustomId(`${customIdBase}:next`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(current>=total-1)
  );
  return row;
}
