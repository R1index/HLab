import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder().setName('start').setDescription('Claim your starter girl and creature'),
  new SlashCommandBuilder().setName('profile').setDescription('Show your profile'),
  new SlashCommandBuilder().setName('girls').setDescription('List your girls'),
  new SlashCommandBuilder().setName('creatures').setDescription('List your creatures'),
  new SlashCommandBuilder().setName('summon').setDescription('Gacha roll for a girl')
    .addStringOption(o=>o.setName('spec').setDescription('Specialization').setRequired(true)
      .addChoices(
        {name:'INSECT', value:'INSECT'},
        {name:'BEAST', value:'BEAST'},
        {name:'MONSTER', value:'MONSTER'},
        {name:'CREATURE', value:'CREATURE'}
      )),
  new SlashCommandBuilder().setName('assign').setDescription('Assign a girl to a creature')
    .addStringOption(o=>o.setName('girl_id').setDescription('Girl ID').setRequired(true))
    .addStringOption(o=>o.setName('creature_id').setDescription('Creature ID').setRequired(true)),
  new SlashCommandBuilder().setName('rooms').setDescription('Show your rooms'),
  new SlashCommandBuilder().setName('sell').setDescription('Sell a creature for money')
    .addStringOption(o=>o.setName('creature_id').setDescription('Creature ID').setRequired(true)),
  new SlashCommandBuilder().setName('exchange').setDescription('Exchange money to unique currency (2:1)')
    .addIntegerOption(o=>o.setName('money').setDescription('Amount of money to exchange').setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName('lab').setDescription('Show laboratory status'),
  new SlashCommandBuilder().setName('rest').setDescription('Send a girl to rest')
    .addStringOption(o=>o.setName('girl_id').setDescription('Girl ID').setRequired(true))
].map(c=>c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
const route = Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!);

(async () => {
  await rest.put(route, { body: commands });
  console.log('Commands registered');
})().catch(console.error);
