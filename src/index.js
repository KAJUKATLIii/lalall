import 'dotenv/config';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits, StringSelectMenuBuilder } from 'discord.js';
import { nullCommand } from './commands.js';
import { UnoGame, canPlay, cardLabel, themeName } from './game.js';
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
function handControls(game, userId) {
  const cards = game.handCards(userId);
  const options = cards.slice(0, 25).map((card, index) => ({
    label: `${index + 1}. ${cardLabel(card, game.theme)}`.slice(0, 100),
    value: String(index),
    description: card.color === 'wild' ? 'Choose a color after selecting this card' : `Play ${card.color}`
  }));
  const selector = new StringSelectMenuBuilder()
    .setCustomId(`null:card:${userId}`)
    .setPlaceholder('Choose a card to play')
    .addOptions(options);
  const draw = new ButtonBuilder().setCustomId(`null:draw:${userId}`).setLabel('DRAW CARD').setStyle(ButtonStyle.Secondary).setEmoji('🃏');
  return [new ActionRowBuilder().addComponents(selector), new ActionRowBuilder().addComponents(draw)];
}

function colorControls(userId, position) {
  const colors = ['red', 'yellow', 'green', 'blue'];
  return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId(`null:color:${userId}:${position}`)
    .setPlaceholder('Choose the wild card color')
    .addOptions(colors.map((color) => ({ label: color.toUpperCase(), value: color }))))];
}

async function publishTurn(interaction, game, message) {
  const bots = runBots(game);
  await interaction.channel.send({ embeds: [embed(game, [message, ...bots].join(' '))] });
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
  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    try {
      if (!interaction.inGuild() || !interaction.customId.startsWith('null:')) return;
      const [, action, ownerId, cardPosition] = interaction.customId.split(':');
      if (interaction.user.id !== ownerId) throw new Error('These controls belong to another player. Use /null cards for your own hand.');
      const game = gameFor(interaction);
      if (action === 'card') {
        const position = Number(interaction.values[0]);
        const card = game.handCards(ownerId)[position];
        if (!card) throw new Error('That card is no longer in your hand. Open /null cards again.');
        if (card.color === 'wild') {
          await interaction.update({ content: '## Choose a color for your wild card', components: colorControls(ownerId, position), files: [] });
          return;
        }
        const result = game.play(ownerId, position + 1);
        await interaction.update({ content: '✅ Card played. Use /null cards on your next turn.', components: [], files: [] });
        await publishTurn(interaction, game, result.message);
        return;
      }
      if (action === 'color') {
        const result = game.play(ownerId, Number(cardPosition) + 1, interaction.values[0]);
        await interaction.update({ content: '✅ Wild card played. Use /null cards on your next turn.', components: [], files: [] });
        await publishTurn(interaction, game, result.message);
        return;
      }
      if (action === 'draw') {
        const result = game.draw(ownerId);
        await interaction.update({ content: '🃏 Card drawn. Use /null cards on your next turn.', components: [], files: [] });
        await publishTurn(interaction, game, result.message);
      }
    } catch (error) {
      const payload = { content: `⚠️ ${error.message}`, ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload); else await interaction.reply(payload);
    }
    return;
  }
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
      await interaction.reply({ content: '## Your themed NULL cards\nChoose a card below to play it.', files: [file], components: handControls(game, user.id), ephemeral: true });
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
