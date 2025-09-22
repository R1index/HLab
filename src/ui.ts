import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import type { Assignment, Creature, Girl, Room } from './types.js';

const SPEC_EMOJI: Record<string, string> = {
  INSECT: '🪲',
  BEAST: '🦊',
  MONSTER: '👹',
  CREATURE: '🐉'
};

const SPEC_COLOR: Record<string, number> = {
  INSECT: 0x8dc63f,
  BEAST: 0xff7f50,
  MONSTER: 0x8a2be2,
  CREATURE: 0x1e90ff
};

const STATUS_LABEL: Record<Girl['status'], string> = {
  free: 'Available',
  assigned: 'On duty',
  resting: 'Resting'
};

const STATUS_EMOJI: Record<Girl['status'], string> = {
  free: '🟢',
  assigned: '🛠️',
  resting: '💤'
};

const safeTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  const seconds = Math.floor(ms / 1000);
  return `<t:${seconds}:R>`;
};

const wrapDescription = (lines: Array<string | null | undefined>) =>
  lines.filter((line): line is string => Boolean(line)).join('\n');

export interface EmbedContext {
  position?: { index: number; total: number };
}

export interface GirlEmbedContext extends EmbedContext {
  assignment?: Assignment | null;
  room?: Room | null;
}

export interface CreatureEmbedContext extends EmbedContext {
  assignment?: Assignment | null;
  room?: Room | null;
  sellPrice?: number;
}

export function girlEmbed(g: Girl, ctx: GirlEmbedContext = {}) {
  const specEmoji = SPEC_EMOJI[g.spec] ?? '👩';
  const statusLine = `${STATUS_EMOJI[g.status]} Status: **${STATUS_LABEL[g.status]}**`;
  const roomLine = ctx.room
    ? `🏠 Room: **${ctx.room.id}** ${ctx.room.occupied ? '• occupied' : '• free'}`
    : '🏠 Room: —';
  const assignmentLine = ctx.assignment
    ? `🔗 Linked to creature \`${ctx.assignment.creature_id}\` ${ctx.assignment.active ? '• active' : '• paused'}`
    : null;
  const progress = `❤️ **${Math.round(g.health)}**  |  ⚡ **${Math.round(g.energy)}**\n💪 **${g.strength}**  |  🏃 **${g.stamina}**`;
  const footer = ctx.position
    ? `Girl ${ctx.position.index + 1} of ${ctx.position.total}`
    : undefined;

  return new EmbedBuilder()
    .setColor(SPEC_COLOR[g.spec] ?? 0x5865f2)
    .setTitle(`${specEmoji} ${g.name}`)
    .setDescription(
      wrapDescription([
        `ID: \`${g.id}\``,
        statusLine,
        roomLine,
        assignmentLine,
        `🗓 Created ${safeTimestamp(g.created_at)}`
      ])
    )
    .addFields(
      {
        name: 'Core Stats',
        value: progress,
        inline: false
      }
    )
    .setFooter(footer ? { text: footer } : null);
}

export function creatureEmbed(c: Creature, ctx: CreatureEmbedContext = {}) {
  const specEmoji = SPEC_EMOJI[c.spec] ?? '🧬';
  const roomLine = ctx.room ? `🏠 Room: **${ctx.room.id}**` : '🏠 Room: —';
  const assignmentLine = ctx.assignment
    ? `🔗 Paired with girl \`${ctx.assignment.girl_id}\` ${ctx.assignment.active ? '• active' : '• paused'}`
    : null;
  const parentsLine = c.parents
    ? `🧾 Parents: girl \`${c.parents.girl_id}\`${c.parents.creature_id ? ` × creature \`${c.parents.creature_id}\`` : ''}`
    : null;
  const footer = ctx.position
    ? `Creature ${ctx.position.index + 1} of ${ctx.position.total}`
    : undefined;

  const fields = [
    {
      name: 'Attributes',
      value: `📏 **${c.size}**  |  💪 **${c.strength}**\n❤️ **${c.health}**  |  🏃 **${c.stamina}**`,
      inline: false
    }
  ];

  if (ctx.sellPrice !== undefined) {
    fields.push({
      name: 'Market Value',
      value: `💰 Estimated sell price: **${ctx.sellPrice}**`,
      inline: false
    });
  }

  return new EmbedBuilder()
    .setColor(SPEC_COLOR[c.spec] ?? 0x57f287)
    .setTitle(`${specEmoji} Creature ${c.spec}`)
    .setDescription(
      wrapDescription([
        `ID: \`${c.id}\``,
        roomLine,
        assignmentLine,
        parentsLine,
        `🗓 Created ${safeTimestamp(c.created_at)}`
      ])
    )
    .addFields(fields)
    .setFooter(footer ? { text: footer } : null);
}

export function roomsEmbed(rooms: Room[], girls: Record<string, Girl>, creatures: Record<string, Creature>) {
  const lines = rooms.map((room) => {
    const emoji = room.kind === 'GIRL' ? '👩' : '🧬';
    if (!room.occupied) {
      return `${emoji} **${room.id}** — free`;
    }
    const occupant = room.occupant_id
      ? room.kind === 'GIRL'
        ? girls[room.occupant_id]
        : creatures[room.occupant_id]
      : null;
    const occupantName = occupant ? ('name' in occupant ? occupant.name : `Creature ${occupant.spec}`) : `ID ${room.occupant_id}`;
    return `${emoji} **${room.id}** — occupied by **${occupantName}** \`${room.occupant_id ?? 'unknown'}\``;
  });

  return new EmbedBuilder()
    .setTitle('🏠 Laboratory Rooms')
    .setDescription(lines.join('\n') || 'No rooms owned yet.');
}

export function pager(current: number, total: number, customIdBase: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${customIdBase}:first`)
      .setEmoji('⏮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current <= 0),
    new ButtonBuilder()
      .setCustomId(`${customIdBase}:prev`)
      .setEmoji('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current <= 0),
    new ButtonBuilder()
      .setCustomId(`${customIdBase}:next`)
      .setEmoji('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= total - 1),
    new ButtonBuilder()
      .setCustomId(`${customIdBase}:last`)
      .setEmoji('⏭')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= total - 1)
  );
}

export function girlsSelectMenu(girls: Girl[], selectedId?: string) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('girls:view')
    .setPlaceholder('Choose a girl to inspect')
    .setMinValues(1)
    .setMaxValues(1);

  girls.slice(0, 25).forEach((g) => {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(g.name)
        .setValue(g.id)
        .setDescription(`${STATUS_LABEL[g.status]} • ${g.spec}`.slice(0, 100))
        .setEmoji(SPEC_EMOJI[g.spec] ?? '👩')
        .setDefault(g.id === selectedId)
    );
  });

  if (girls.length <= 1) {
    menu.setDisabled(true);
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function creaturesSelectMenu(creatures: Creature[], selectedId?: string) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('creatures:view')
    .setPlaceholder('Choose a creature')
    .setMinValues(1)
    .setMaxValues(1);

  creatures.slice(0, 25).forEach((c) => {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${c.spec} #${c.id.slice(-4)}`)
        .setValue(c.id)
        .setDescription(`STR ${c.strength} • STA ${c.stamina}`.slice(0, 100))
        .setEmoji(SPEC_EMOJI[c.spec] ?? '🧬')
        .setDefault(c.id === selectedId)
    );
  });

  if (creatures.length <= 1) {
    menu.setDisabled(true);
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function girlActionRow(g: Girl) {
  const restButton = new ButtonBuilder()
    .setCustomId(`girl:rest:${g.id}`)
    .setLabel('Send to rest')
    .setEmoji('💤')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(g.status === 'resting');

  const wakeButton = new ButtonBuilder()
    .setCustomId(`girl:wake:${g.id}`)
    .setLabel('Resume duty')
    .setEmoji('🟢')
    .setStyle(ButtonStyle.Success)
    .setDisabled(g.status !== 'resting');

  return new ActionRowBuilder<ButtonBuilder>().addComponents(restButton, wakeButton);
}

export function creatureActionRow(c: Creature, options: { disableSell?: boolean } = {}) {
  const sellButton = new ButtonBuilder()
    .setCustomId(`creature:sell:${c.id}`)
    .setLabel('Sell creature')
    .setEmoji('💰')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(Boolean(options.disableSell));

  return new ActionRowBuilder<ButtonBuilder>().addComponents(sellButton);
}
