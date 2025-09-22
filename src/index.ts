import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { load, persist, upsertPlayer } from './db.js';
import { loadConfig } from './config.js';
import { loadGirlTemplates } from './girls.js';
import { doLazyTick, performGacha, assign as doAssign, sellPrice, createStarterGirl, createStarterCreature } from './logic.js';
import {
  creatureActionRow,
  creatureEmbed,
  creaturesSelectMenu,
  girlActionRow,
  girlEmbed,
  girlsSelectMenu,
  roomsEmbed
} from './ui.js';
import type { Assignment, Creature, Girl, Room } from './types.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

let state = load();
const cfg = loadConfig();
loadGirlTemplates(); // validate file exists

const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) => Date.parse(b.created_at) - Date.parse(a.created_at);

const activeAssignmentForGirl = (girlId: string): Assignment | null =>
  Object.values(state.assignments).find((a) => a.girl_id === girlId && a.active) ?? null;

const activeAssignmentForCreature = (creatureId: string): Assignment | null =>
  Object.values(state.assignments).find((a) => a.creature_id === creatureId && a.active) ?? null;

const resolveRoom = (roomId?: string | null): Room | null => (roomId ? state.rooms[roomId] ?? null : null);

const listGirls = (ownerId: string) =>
  Object.values(state.girls)
    .filter((g) => g.owner_id === ownerId)
    .sort(byCreatedDesc);

const listCreatures = (ownerId: string) =>
  Object.values(state.creatures)
    .filter((c) => c.owner_id === ownerId)
    .sort(byCreatedDesc);

interface GirlView {
  list: Girl[];
  selected: Girl;
  index: number;
  total: number;
  assignment: Assignment | null;
  room: Room | null;
}

const buildGirlView = (ownerId: string, preferredId?: string): GirlView | null => {
  const all = listGirls(ownerId);
  if (!all.length) return null;
  const list = all.slice(0, 25);
  const preferredIndex = preferredId ? list.findIndex((g) => g.id === preferredId) : 0;
  const index = preferredIndex >= 0 ? preferredIndex : 0;
  const selected = list[index];
  return {
    list,
    selected,
    index,
    total: all.length,
    assignment: activeAssignmentForGirl(selected.id),
    room: resolveRoom(selected.room_id)
  };
};

interface CreatureView {
  list: Creature[];
  selected: Creature;
  index: number;
  total: number;
  assignment: Assignment | null;
  room: Room | null;
  price: number;
}

const buildCreatureView = (ownerId: string, preferredId?: string): CreatureView | null => {
  const all = listCreatures(ownerId);
  if (!all.length) return null;
  const list = all.slice(0, 25);
  const preferredIndex = preferredId ? list.findIndex((c) => c.id === preferredId) : 0;
  const index = preferredIndex >= 0 ? preferredIndex : 0;
  const selected = list[index];
  return {
    list,
    selected,
    index,
    total: all.length,
    assignment: activeAssignmentForCreature(selected.id),
    room: resolveRoom(selected.room_id),
    price: sellPrice(selected, cfg)
  };
};

const endAssignment = (assignment: Assignment) => {
  assignment.active = false;
  const girl = state.girls[assignment.girl_id];
  if (girl) {
    girl.status = 'free';
    if (girl.room_id) {
      const room = state.rooms[girl.room_id];
      if (room && room.occupant_id === girl.id) {
        room.occupied = false;
        room.occupant_id = null;
      }
    }
    girl.room_id = null;
  }
  const creature = state.creatures[assignment.creature_id];
  if (creature) {
    if (creature.room_id) {
      const room = state.rooms[creature.room_id];
      if (room && room.occupant_id === creature.id) {
        room.occupied = false;
        room.occupant_id = null;
      }
    }
    creature.room_id = null;
  }
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const userId = interaction.user.id;
    const player = upsertPlayer(state, userId);

    Object.values(state.assignments)
      .filter((a) => a.owner_id === userId && a.active)
      .forEach((a) => doLazyTick(state, player, a));
    persist(state);

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'girls:view') {
        const view = buildGirlView(userId, interaction.values[0]);
        if (!view) {
          await interaction.update({ content: 'You have no girls yet.', embeds: [], components: [] });
          return;
        }
        await interaction.update({
          embeds: [
            girlEmbed(view.selected, {
              assignment: view.assignment,
              room: view.room,
              position: { index: view.index, total: view.total }
            })
          ],
          components: [girlsSelectMenu(view.list, view.selected.id), girlActionRow(view.selected)]
        });
        return;
      }
      if (interaction.customId === 'creatures:view') {
        const view = buildCreatureView(userId, interaction.values[0]);
        if (!view) {
          await interaction.update({ content: 'You have no creatures yet.', embeds: [], components: [] });
          return;
        }
        await interaction.update({
          embeds: [
            creatureEmbed(view.selected, {
              assignment: view.assignment,
              room: view.room,
              position: { index: view.index, total: view.total },
              sellPrice: view.price
            })
          ],
          components: [creaturesSelectMenu(view.list, view.selected.id), creatureActionRow(view.selected)]
        });
        return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('girl:rest:')) {
        const girlId = interaction.customId.split(':')[2];
        const girl = state.girls[girlId];
        if (!girl || girl.owner_id !== userId) {
          await interaction.reply({ content: 'Girl not found.', ephemeral: true });
          return;
        }
        if (girl.status === 'resting') {
          await interaction.reply({ content: `${girl.name} is already resting.`, ephemeral: true });
          return;
        }
        const assignment = activeAssignmentForGirl(girl.id);
        if (assignment) {
          await interaction.reply({ content: 'This girl is currently assigned. Unassign her before resting.', ephemeral: true });
          return;
        }
        girl.status = 'resting';
        persist(state);
        const view = buildGirlView(userId, girl.id);
        if (view) {
          await interaction.update({
            embeds: [
              girlEmbed(view.selected, {
                assignment: view.assignment,
                room: view.room,
                position: { index: view.index, total: view.total }
              })
            ],
            components: [girlsSelectMenu(view.list, view.selected.id), girlActionRow(view.selected)]
          });
        } else {
          await interaction.update({ content: 'You have no girls yet.', embeds: [], components: [] });
        }
        return;
      }
      if (interaction.customId.startsWith('girl:wake:')) {
        const girlId = interaction.customId.split(':')[2];
        const girl = state.girls[girlId];
        if (!girl || girl.owner_id !== userId) {
          await interaction.reply({ content: 'Girl not found.', ephemeral: true });
          return;
        }
        if (girl.status !== 'resting') {
          await interaction.reply({ content: `${girl.name} is already active.`, ephemeral: true });
          return;
        }
        girl.status = 'free';
        persist(state);
        const view = buildGirlView(userId, girl.id);
        if (view) {
          await interaction.update({
            embeds: [
              girlEmbed(view.selected, {
                assignment: view.assignment,
                room: view.room,
                position: { index: view.index, total: view.total }
              })
            ],
            components: [girlsSelectMenu(view.list, view.selected.id), girlActionRow(view.selected)]
          });
        } else {
          await interaction.update({ content: 'You have no girls yet.', embeds: [], components: [] });
        }
        return;
      }
      if (interaction.customId.startsWith('creature:sell:')) {
        const creatureId = interaction.customId.split(':')[2];
        const creature = state.creatures[creatureId];
        if (!creature || creature.owner_id !== userId) {
          await interaction.reply({ content: 'Creature not found.', ephemeral: true });
          return;
        }
        const assignment = activeAssignmentForCreature(creature.id);
        let assignmentClosedText = '';
        if (assignment) {
          endAssignment(assignment);
          assignmentClosedText = ` Assignment ${assignment.id} closed.`;
        }
        const price = sellPrice(creature, cfg);
        delete state.creatures[creature.id];
        if (creature.room_id) {
          const room = state.rooms[creature.room_id];
          if (room && room.occupant_id === creature.id) {
            room.occupied = false;
            room.occupant_id = null;
          }
        }
        player.money += price;
        persist(state);
        const view = buildCreatureView(userId);
        if (view) {
          await interaction.update({
            content: `💰 Sold for **${price}**.${assignmentClosedText}`,
            embeds: [
              creatureEmbed(view.selected, {
                assignment: view.assignment,
                room: view.room,
                position: { index: view.index, total: view.total },
                sellPrice: view.price
              })
            ],
            components: [creaturesSelectMenu(view.list, view.selected.id), creatureActionRow(view.selected)]
          });
        } else {
          await interaction.update({ content: `💰 Sold for **${price}**.${assignmentClosedText}`, embeds: [], components: [] });
        }
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'start') {
      const hasGirls = Object.values(state.girls).some((g) => g.owner_id === userId);
      const hasCreatures = Object.values(state.creatures).some((c) => c.owner_id === userId);
      if (player.starter_claimed || hasGirls || hasCreatures) {
        if (!player.starter_claimed && (hasGirls || hasCreatures)) {
          player.starter_claimed = true;
          persist(state);
        }
        await interaction.reply({ content: 'You have already claimed your starter bundle.', ephemeral: true });
        return;
      }
      try {
        const girl = createStarterGirl(state, player);
        const creature = createStarterCreature(state, player);
        player.starter_claimed = true;
        persist(state);
        await interaction.reply({
          content: `🧪 Welcome to the lab! You've received **${girl.name}** and a starter creature.`,
          embeds: [girlEmbed(girl), creatureEmbed(creature)],
          ephemeral: true
        });
      } catch (e: any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
      return;
    }

    if (interaction.commandName === 'profile') {
      await interaction.reply({
        content: `💳 Money: **${player.money}** | 🪙 INSECT: ${player.unique.INSECT} | 🦊 BEAST: ${player.unique.BEAST} | 👹 MONSTER: ${player.unique.MONSTER} | 🐉 CREATURE: ${player.unique.CREATURE}\n🔬 Laboratory: **Lv.${player.lab_level}**`,
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === 'girls') {
      const view = buildGirlView(userId);
      if (!view) {
        await interaction.reply({ content: 'You have no girls yet.', ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          girlEmbed(view.selected, {
            assignment: view.assignment,
            room: view.room,
            position: { index: view.index, total: view.total }
          })
        ],
        components: [girlsSelectMenu(view.list, view.selected.id), girlActionRow(view.selected)],
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === 'creatures') {
      const view = buildCreatureView(userId);
      if (!view) {
        await interaction.reply({ content: 'You have no creatures yet.', ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          creatureEmbed(view.selected, {
            assignment: view.assignment,
            room: view.room,
            position: { index: view.index, total: view.total },
            sellPrice: view.price
          })
        ],
        components: [creaturesSelectMenu(view.list, view.selected.id), creatureActionRow(view.selected)],
        ephemeral: true
      });
      return;
    }

    if (interaction.commandName === 'summon') {
      const spec = interaction.options.getString('spec', true) as any;
      try {
        const girl = performGacha(state, player, spec);
        persist(state);
        await interaction.reply({
          content: `🎰 You pulled **${girl.name}** [${girl.spec}] — ID \`${girl.id}\``,
          embeds: [girlEmbed(girl)],
          ephemeral: true
        });
      } catch (e: any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
      return;
    }

    if (interaction.commandName === 'assign') {
      const girlId = interaction.options.getString('girl_id', true);
      const creatureId = interaction.options.getString('creature_id', true);
      const girl = state.girls[girlId];
      const creature = state.creatures[creatureId];
      if (!girl || girl.owner_id !== userId) {
        await interaction.reply({ content: 'Girl not found.', ephemeral: true });
        return;
      }
      if (!creature || creature.owner_id !== userId) {
        await interaction.reply({ content: 'Creature not found.', ephemeral: true });
        return;
      }
      try {
        const assignment = doAssign(state, player, girl, creature);
        persist(state);
        await interaction.reply({ content: `✅ Assigned: \`${girl.id}\` ↔ \`${creature.id}\` (assignment ${assignment.id})`, ephemeral: true });
      } catch (e: any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
      return;
    }

    if (interaction.commandName === 'rooms') {
      const rooms = Object.values(state.rooms).filter((r) => r.owner_id === userId);
      await interaction.reply({ embeds: [roomsEmbed(rooms, state.girls, state.creatures)], ephemeral: true });
      return;
    }

    if (interaction.commandName === 'sell') {
      const id = interaction.options.getString('creature_id', true);
      const creature = state.creatures[id];
      if (!creature || creature.owner_id !== userId) {
        await interaction.reply({ content: 'Creature not found.', ephemeral: true });
        return;
      }
      const assignment = activeAssignmentForCreature(creature.id);
      let assignmentClosedText = '';
      if (assignment) {
        endAssignment(assignment);
        assignmentClosedText = ` Assignment ${assignment.id} closed.`;
      }
      const price = sellPrice(creature, cfg);
      delete state.creatures[id];
      const room = Object.values(state.rooms).find((r) => r.occupant_id === id);
      if (room) {
        room.occupied = false;
        room.occupant_id = null;
      }
      player.money += price;
      persist(state);
      await interaction.reply({ content: `💰 Sold for **${price}**.${assignmentClosedText}`, ephemeral: true });
      return;
    }

    if (interaction.commandName === 'exchange') {
      const money = interaction.options.getInteger('money', true);
      if (player.money < money) {
        await interaction.reply({ content: 'Not enough money.', ephemeral: true });
        return;
      }
      const gained = Math.floor(money * cfg.economy.money_to_unique_rate);
      player.money -= money;
      const per = Math.floor(gained / 4);
      player.unique.INSECT += per;
      player.unique.BEAST += per;
      player.unique.MONSTER += per;
      player.unique.CREATURE += gained - per * 3;
      persist(state);
      await interaction.reply({ content: `Exchanged. Gained unique currency: **${gained}**.`, ephemeral: true });
      return;
    }

    if (interaction.commandName === 'lab') {
      await interaction.reply({ content: `🔬 Laboratory level: **${player.lab_level}**`, ephemeral: true });
      return;
    }

    if (interaction.commandName === 'rest') {
      const girlId = interaction.options.getString('girl_id', true);
      const girl = state.girls[girlId];
      if (!girl || girl.owner_id !== userId) {
        await interaction.reply({ content: 'Girl not found.', ephemeral: true });
        return;
      }
      if (girl.status === 'assigned') {
        await interaction.reply({ content: 'This girl is currently assigned. Unassign her before resting.', ephemeral: true });
        return;
      }
      girl.status = 'resting';
      persist(state);
      await interaction.reply({ content: `💤 ${girl.name} is now resting.`, ephemeral: true });
    }
  } catch (e) {
    console.error(e);
  }
});

client.login(process.env.DISCORD_TOKEN);
