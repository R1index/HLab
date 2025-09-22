import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { load, persist, upsertPlayer } from './db.js';
import { loadConfig } from './config.js';
import { loadGirlTemplates } from './girls.js';
import { doLazyTick, performGacha, assign as doAssign, sellPrice, createStarterGirl, createStarterCreature } from './logic.js';
import { creatureEmbed, girlEmbed, roomsEmbed } from './ui.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

let state = load();
const cfg = loadConfig();
loadGirlTemplates(); // validate file exists

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    const player = upsertPlayer(state, userId);

    // Lazy tick for all assignments of this player on every action
    Object.values(state.assignments).filter(a=>a.owner_id===userId && a.active).forEach(a=>doLazyTick(state, player, a));
    persist(state);

    if (interaction.commandName === 'start') {
      const hasGirls = Object.values(state.girls).some(g => g.owner_id === userId);
      const hasCreatures = Object.values(state.creatures).some(c => c.owner_id === userId);
      if (player.starter_claimed || hasGirls || hasCreatures) {
        if (!player.starter_claimed && (hasGirls || hasCreatures)) {
          player.starter_claimed = true;
          persist(state);
        }
        return interaction.reply({ content: 'You have already claimed your starter bundle.', ephemeral: true });
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
      } catch (e:any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
    }

    if (interaction.commandName === 'profile') {
      await interaction.reply({
        content: `💳 Money: **${player.money}** | 🪙 INSECT: ${player.unique.INSECT} | 🦊 BEAST: ${player.unique.BEAST} | 👹 MONSTER: ${player.unique.MONSTER} | 🐉 CREATURE: ${player.unique.CREATURE}\n🔬 Laboratory: **Lv.${player.lab_level}**`,
        ephemeral: true
      });
    }

    if (interaction.commandName === 'girls') {
      const girls = Object.values(state.girls).filter(g=>g.owner_id===userId);
      if (!girls.length) return interaction.reply({ content: 'You have no girls yet.', ephemeral: true });
      const embeds = girls.slice(0,10).map(girlEmbed);
      await interaction.reply({ embeds, ephemeral: true });
    }

    if (interaction.commandName === 'creatures') {
      const creatures = Object.values(state.creatures).filter(c=>c.owner_id===userId);
      if (!creatures.length) return interaction.reply({ content: 'You have no creatures yet.', ephemeral: true });
      const embeds = creatures.slice(0,10).map(creatureEmbed);
      await interaction.reply({ embeds, ephemeral: true });
    }

    if (interaction.commandName === 'summon') {
      const spec = interaction.options.getString('spec', true) as any;
      try {
        const girl = performGacha(state, player, spec);
        persist(state);
        await interaction.reply({ content: `🎰 You pulled **${girl.name}** [${girl.spec}] — ID \`${girl.id}\``, embeds: [girlEmbed(girl)], ephemeral: true });
      } catch (e:any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
    }

    if (interaction.commandName === 'assign') {
      const girlId = interaction.options.getString('girl_id', true);
      const creatureId = interaction.options.getString('creature_id', true);
      const g = state.girls[girlId]; const c = state.creatures[creatureId];
      if (!g || g.owner_id!==userId) return interaction.reply({ content:'Girl not found.', ephemeral: true });
      if (!c || c.owner_id!==userId) return interaction.reply({ content:'Creature not found.', ephemeral: true });
      try {
        const a = doAssign(state, player, g, c);
        persist(state);
        await interaction.reply({ content: `✅ Assigned: \`${g.id}\` ↔ \`${c.id}\` (assignment ${a.id})`, ephemeral: true });
      } catch (e:any) {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
      }
    }

    if (interaction.commandName === 'rooms') {
      const rooms = Object.values(state.rooms).filter(r=>r.owner_id===userId);
      await interaction.reply({ embeds: [roomsEmbed(rooms)], ephemeral: true });
    }

    if (interaction.commandName === 'sell') {
      const id = interaction.options.getString('creature_id', true);
      const c = state.creatures[id];
      if (!c || c.owner_id !== userId) return interaction.reply({ content: 'Creature not found.', ephemeral: true });
      const price = sellPrice(c, cfg);
      delete state.creatures[id];
      const room = Object.values(state.rooms).find(r=>r.occupant_id===id);
      if (room) { room.occupied = false; room.occupant_id = null; }
      player.money += price;
      persist(state);
      await interaction.reply({ content: `💰 Sold for **${price}**.`, ephemeral: true });
    }

    if (interaction.commandName === 'exchange') {
      const money = interaction.options.getInteger('money', true);
      if (player.money < money) return interaction.reply({ content: 'Not enough money.', ephemeral: true });
      const gained = Math.floor(money * cfg.economy.money_to_unique_rate);
      player.money -= money;
      const per = Math.floor(gained / 4);
      player.unique.INSECT += per;
      player.unique.BEAST += per;
      player.unique.MONSTER += per;
      player.unique.CREATURE += (gained - per*3);
      persist(state);
      await interaction.reply({ content: `Exchanged. Gained unique currency: **${gained}**.`, ephemeral: true });
    }

    if (interaction.commandName === 'lab') {
      await interaction.reply({ content: `🔬 Laboratory level: **${player.lab_level}**`, ephemeral: true });
    }

    if (interaction.commandName === 'rest') {
      const girlId = interaction.options.getString('girl_id', true);
      const g = state.girls[girlId];
      if (!g || g.owner_id !== userId) return interaction.reply({ content: 'Girl not found.', ephemeral: true });
      g.status = 'resting';
      persist(state);
      await interaction.reply({ content: `💤 ${g.name} is now resting.`, ephemeral: true });
    }
  } catch (e) {
    console.error(e);
  }
});

client.login(process.env.DISCORD_TOKEN);
