import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { nullCommand } from './commands.js';

const { DISCORD_TOKEN: token, DISCORD_CLIENT_ID: clientId, DISCORD_GUILD_ID: guildId } = process.env;
if (!token || !clientId) throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID are required.');
const rest = new REST({ version: '10' }).setToken(token);
const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);
await rest.put(route, { body: [nullCommand.toJSON()] });
console.log(`Registered NULL command ${guildId ? `in guild ${guildId}` : 'globally'}.`);
