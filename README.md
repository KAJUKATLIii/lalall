# NULL — Discord UNO Bot

NULL is a real, multi-server Discord bot for UNO-style matches. Each Discord server receives its own independent table, so communities can play simultaneously without sharing players, cards, or game state.

## Features

- `/null create` starts a server-local table with a **default, cricket, football, F1, Minecraft, or Pokémon** deck skin. Themes change card faces while retaining standard UNO play rules.
- `/null join`, `/null add-ai`, and `/null start` support games with humans, NULL_AI, or both.
- `/null hand` keeps each player's cards private; `/null cards` renders their themed hand as a card gallery with an interactive card picker, wild-color menu, and draw button; `/null play` and `/null draw` remain available as command alternatives.
- `/null status` displays the current card, player card counts, current turn, and deck theme.
- The game engine automatically handles shuffle/recycling, reverse, skip, draw-two, wild, and wild-draw-four cards. For example, the F1 deck uses Pit Stop, Reverse Grid, Penalty +2, and Safety Car +4 cards; Minecraft uses Creeper, Redstone, Zombie +2, and Ender Dragon +4.

## Setup

1. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications), then invite it with the `applications.commands` and `bot` scopes.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and provide `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Set `DISCORD_GUILD_ID` too for instant, development-server-only command registration.
4. Register the slash command, then start the bot:

   ```bash
   npm run register
   npm start
   ```

## Commands

| Command | What it does |
| --- | --- |
| `/null create [deck]` | Opens a new table for this server. |
| `/null join` | Seats the caller before the game starts. |
| `/null add-ai` | Adds a NULL_AI opponent. |
| `/null start` | Deals seven cards and begins the match. |
| `/null hand` | Shows the caller's numbered hand privately. |
| `/null cards` | Shows the caller's themed cards privately, with interactive play and draw controls. |
| `/null play card:<number> [color]` | Plays a numbered card; color is required for wilds. |
| `/null draw` | Draws one card and ends the turn. |
| `/null status` | Shows the active match. |
| `/null leave` | Closes the table in this server. |

> Game state is held in memory. Restarting the process clears active tables.
