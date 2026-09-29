import 'dotenv/config';
import { AttachmentBuilder, Client, Events, GatewayIntentBits } from 'discord.js';
import { nullCommand } from './commands.js';
import { UnoGame, canPlay, themeName } from './game.js';
import { renderHandSvg } from './card-art.js';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('DISCORD_TOKEN is required. Copy .env.example to .env and add your bot token.');
const games = new Map();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function tableKey(interaction) { return interaction.guildId; }
function gameFor(interaction) {
  const game = games.get(tableKey(interaction));
  if (!game) throw new Error('No table exists in this server. Use /null create first.');
  return game;
}
function embed(game, message) {
  const state = game.summary(message);
  return {
    color: 0xFF5C42,
    title: 'NULL // UNO TABLE',
    description: state.message,
    fields: [
      { name: 'Top card', value: `**${state.topCard}**${state.activeColor !== game.topCard.color ? ` · color: **${state.activeColor}**` : ''}`, inline: true },
      { name: 'Turn', value: state.winner ? `🏆 **${state.winner}**` : `➡️ **${state.currentPlayer}**`, inline: true },
      { name: 'Players', value: state.players.map((player) => `${player.bot ? '🤖' : '👤'} ${player.name}: **${player.cards}** cards`).join('\n') }
    ],
    footer: { text: `${themeName(game.theme)} themed deck · one game per Discord server` }
  };
}
function runBots(game) {
  const updates = [];
  while (game.started && !game.winner && game.currentPlayer.bot) {
    const bot = game.currentPlayer;
    const position = bot.hand.findIndex((card) => canPlay(card, game.topCard, game.activeColor));
    if (position === -1) { game.draw(bot.id); updates.push(`${bot.name} drew a card.`); continue; }
    const card = bot.hand[position];
    const color = card.color === 'wild' ? ['red', 'yellow', 'green', 'blue'][Math.floor(Math.random() * 4)] : undefined;
    game.play(bot.id, position + 1, color);
    updates.push(`${bot.name} played ${card.kind === 'number' ? card.number : card.kind}.`);
  }
  return updates;
}

client.once(Events.ClientReady, (readyClient) => console.log(`NULL is online as ${readyClient.user.tag}`));
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'null') return;
  try {
    if (!interaction.inGuild()) throw new Error('NULL can only run inside a Discord server.');
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.user;
    if (subcommand === 'create') {
      if (games.has(tableKey(interaction))) throw new Error('This server already has a table. Use /null leave before creating another.');
      const theme = interaction.options.getString('deck') ?? 'default';
      const game = new UnoGame({ hostId: user.id, hostName: user.username, theme });
      games.set(tableKey(interaction), game);
      await interaction.reply({ embeds: [embed(game, `${user.username} opened a ${themeName(theme)} themed table. Use /null join or /null add-ai.`)] });
      return;
    }
    if (subcommand === 'leave') {
      gameFor(interaction);
      games.delete(tableKey(interaction));
      await interaction.reply('**NULL table closed.** Create another whenever you are ready.');
      return;
    }
    const game = gameFor(interaction);
    if (subcommand === 'join') { game.addPlayer(user.id, user.username); await interaction.reply({ embeds: [embed(game, `${user.username} joined the table.`)] }); return; }
    if (subcommand === 'add-ai') { game.addPlayer(`ai-${game.players.length}`, 'NULL_AI', true); await interaction.reply({ embeds: [embed(game, 'NULL_AI joined the table.')] }); return; }
    if (subcommand === 'start') { const state = game.start(); const bots = runBots(game); await interaction.reply({ embeds: [embed(game, [state.message, ...bots].join(' '))] }); return; }
    if (subcommand === 'hand') { await interaction.reply({ content: `## Your ${themeName(game.theme)} hand\n${game.handFor(user.id)}`, ephemeral: true }); return; }
    if (subcommand === 'cards') {
      const art = renderHandSvg(game.handCards(user.id), game.theme, user.username);
      const file = new AttachmentBuilder(Buffer.from(art), { name: 'null-themed-cards.svg' });
      await interaction.reply({ content: '## Your themed NULL cards', files: [file], ephemeral: true });
      return;
    }
    if (subcommand === 'status') { await interaction.reply({ embeds: [embed(game, 'Table status.')] }); return; }
    if (subcommand === 'play') {
      const result = game.play(user.id, interaction.options.getInteger('card'), interaction.options.getString('color'));
      const bots = runBots(game);
      await interaction.reply({ embeds: [embed(game, [result.message, ...bots].join(' '))] });
      return;
    }
    if (subcommand === 'draw') {
      const result = game.draw(user.id);
      const bots = runBots(game);
      await interaction.reply({ embeds: [embed(game, [result.message, ...bots].join(' '))] });
    }
  } catch (error) {
    const payload = { content: `⚠️ ${error.message}`, ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload); else await interaction.reply(payload);
  }
});

client.login(token);
