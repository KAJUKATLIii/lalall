import { SlashCommandBuilder } from 'discord.js';

export const nullCommand = new SlashCommandBuilder()
  .setName('null')
  .setDescription('Play UNO with NULL.')
  .addSubcommand((command) => command.setName('create').setDescription('Create a new table.').addStringOption((option) => option.setName('deck').setDescription('Card deck theme').addChoices(...['default', 'cricket', 'football', 'f1', 'minecraft', 'pokemon'].map((value) => ({ name: value.toUpperCase(), value })))))
  .addSubcommand((command) => command.setName('join').setDescription('Join the current table.'))
  .addSubcommand((command) => command.setName('add-ai').setDescription('Add a NULL_AI opponent.'))
  .addSubcommand((command) => command.setName('start').setDescription('Deal cards and start the game.'))
  .addSubcommand((command) => command.setName('hand').setDescription('View your hand privately.'))
  .addSubcommand((command) => command.setName('cards').setDescription('Show your themed cards privately.'))
  .addSubcommand((command) => command.setName('play').setDescription('Play a card from your hand.').addIntegerOption((option) => option.setName('card').setDescription('The number shown by /null hand').setRequired(true).setMinValue(1).setMaxValue(30)).addStringOption((option) => option.setName('color').setDescription('Required when playing a wild card').addChoices(...['red', 'yellow', 'green', 'blue'].map((value) => ({ name: value.toUpperCase(), value })))))
  .addSubcommand((command) => command.setName('draw').setDescription('Draw one card and end your turn.'))
  .addSubcommand((command) => command.setName('status').setDescription('Show the table status.'))
  .addSubcommand((command) => command.setName('leave').setDescription('Close this server table.'));
