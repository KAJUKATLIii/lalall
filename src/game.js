const COLORS = ['red', 'yellow', 'green', 'blue'];
const NUMBER_VALUES = Array.from({ length: 10 }, (_, number) => ({ kind: 'number', number }));
const ACTION_VALUES = [{ kind: 'skip' }, { kind: 'reverse' }, { kind: 'draw2' }];

export const DECK_THEMES = ['default', 'cricket', 'football', 'f1', 'minecraft', 'pokemon'];

function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function buildDeck(theme = 'default', random = Math.random) {
  if (!DECK_THEMES.includes(theme)) throw new Error(`Unknown deck theme: ${theme}`);
  const deck = [];
  for (const color of COLORS) {
    deck.push({ color, ...NUMBER_VALUES[0] });
    for (const value of [...NUMBER_VALUES.slice(1), ...ACTION_VALUES]) {
      deck.push({ color, ...value }, { color, ...value });
    }
  }
  for (let index = 0; index < 4; index += 1) deck.push({ color: 'wild', kind: 'wild' }, { color: 'wild', kind: 'wild4' });
  return shuffle(deck, random);
}

const THEME_FACES = {
  default: { icon: '', number: (number) => String(number), skip: 'Skip', reverse: 'Reverse', draw2: '+2', wild: 'Wild', wild4: 'Wild +4' },
  cricket: { icon: '🏏 ', number: (number) => `Run ${number}`, skip: 'Dot Ball', reverse: 'Switch End', draw2: 'Wicket +2', wild: 'Free Hit', wild4: 'Powerplay +4' },
  football: { icon: '⚽ ', number: (number) => `Goal ${number}`, skip: 'Offside', reverse: 'Counter', draw2: 'Yellow +2', wild: 'Tactical', wild4: 'Red +4' },
  f1: { icon: '🏎️ ', number: (number) => `Lap ${number}`, skip: 'Pit Stop', reverse: 'Reverse Grid', draw2: 'Penalty +2', wild: 'Tyre Choice', wild4: 'Safety Car +4' },
  minecraft: { icon: '⛏️ ', number: (number) => `Block ${number}`, skip: 'Creeper', reverse: 'Redstone', draw2: 'Zombie +2', wild: 'Enchant', wild4: 'Ender Dragon +4' },
  pokemon: { icon: '⚡ ', number: (number) => `Energy ${number}`, skip: 'Sleep', reverse: 'Evolve', draw2: 'Damage +2', wild: 'Type Shift', wild4: 'Hyper Beam +4' }
};

export function cardLabel(card, theme = 'default') {
  const faces = THEME_FACES[theme] ?? THEME_FACES.default;
  const face = card.kind === 'number' ? faces.number(card.number) : faces[card.kind];
  return `${faces.icon}${card.color === 'wild' ? '' : `${card.color.toUpperCase()} · `}${face}`.trim();
}

export function themeName(theme) {
  return { default: 'Classic UNO', cricket: 'Cricket XI', football: 'Football Club', f1: 'Grand Prix', minecraft: 'Overworld', pokemon: 'Pokémon League' }[theme] ?? 'Classic UNO';
}

export function canPlay(card, topCard, activeColor) {
  return card.color === 'wild' || card.color === activeColor || (card.kind === 'number' && topCard.kind === 'number' && card.number === topCard.number) || (card.kind !== 'number' && card.kind === topCard.kind);
}

export class UnoGame {
  constructor({ hostId, hostName, theme = 'default', random = Math.random }) {
    this.theme = theme;
    this.random = random;
    this.players = [{ id: hostId, name: hostName, bot: false, hand: [] }];
    this.deck = buildDeck(theme, random);
    this.discard = [];
    this.current = 0;
    this.direction = 1;
    this.started = false;
    this.winner = null;
  }

  get currentPlayer() { return this.players[this.current]; }
  get topCard() { return this.discard.at(-1); }
  get activeColor() { return this.forcedColor ?? this.topCard?.color; }

  addPlayer(id, name, bot = false) {
    if (this.started) throw new Error('The game has already started.');
    if (this.players.some((player) => player.id === id)) throw new Error('That player is already at the table.');
    if (this.players.length >= 8) throw new Error('This table is full (8 players maximum).');
    this.players.push({ id, name, bot, hand: [] });
  }

  start() {
    if (this.started) throw new Error('The game has already started.');
    if (this.players.length < 2) throw new Error('Invite a player or add NULL_AI before starting.');
    for (const player of this.players) player.hand = this.drawCards(7);
    let first = this.deck.pop();
    while (first.color === 'wild') { this.deck.unshift(first); first = this.deck.pop(); }
    this.discard.push(first);
    this.started = true;
    this.applyAction(first, false);
    return this.summary(`Game started. ${this.currentPlayer.name}'s turn.`);
  }

  drawCards(count) {
    const cards = [];
    while (cards.length < count) {
      if (this.deck.length === 0) this.recycleDiscard();
      cards.push(this.deck.pop());
    }
    return cards;
  }

  recycleDiscard() {
    if (this.discard.length < 2) throw new Error('No cards remain to draw.');
    const top = this.discard.pop();
    this.deck = shuffle(this.discard, this.random);
    this.discard = [top];
  }

  nextPlayer(steps = 1) {
    this.current = (this.current + this.direction * steps + this.players.length * 8) % this.players.length;
  }

  play(playerId, cardPosition, color) {
    this.assertTurn(playerId);
    const player = this.currentPlayer;
    const position = Number(cardPosition) - 1;
    const card = player.hand[position];
    if (!Number.isInteger(position) || !card) throw new Error('Choose a card number from your hand.');
    if (!canPlay(card, this.topCard, this.activeColor)) throw new Error(`That card cannot be played on ${cardLabel(this.topCard, this.theme)}.`);
    if (card.color === 'wild' && !COLORS.includes(color)) throw new Error('Choose red, yellow, green, or blue for a wild card.');
    player.hand.splice(position, 1);
    this.discard.push(card);
    this.forcedColor = card.color === 'wild' ? color : undefined;
    if (player.hand.length === 0) {
      this.applyAction(card, true);
      this.winner = player;
      return this.summary(`${player.name} called UNO and won!`);
    }
    this.applyAction(card, true);
    return this.summary(`${player.name} played ${cardLabel(card, this.theme)}. ${this.currentPlayer.name}'s turn.`);
  }

  draw(playerId) {
    this.assertTurn(playerId);
    const card = this.drawCards(1)[0];
    this.currentPlayer.hand.push(card);
    this.nextPlayer();
    return this.summary(`${this.players[(this.current - this.direction + this.players.length) % this.players.length].name} drew a card. ${this.currentPlayer.name}'s turn.`);
  }

  applyAction(card, advance) {
    // Opening discard cards set the table only; effects begin with the first turn.
    if (!advance) return;
    if (card.kind === 'reverse') {
      this.direction *= -1;
      this.nextPlayer(this.players.length === 2 ? 2 : 1);
      return;
    }
    if (card.kind === 'skip') { this.nextPlayer(2); return; }
    if (card.kind === 'draw2' || card.kind === 'wild4') {
      this.nextPlayer();
      this.currentPlayer.hand.push(...this.drawCards(card.kind === 'draw2' ? 2 : 4));
      this.nextPlayer();
      return;
    }
    this.nextPlayer();
  }

  assertTurn(playerId) {
    if (!this.started || this.winner) throw new Error('There is no active game.');
    if (this.currentPlayer.id !== playerId) throw new Error(`It is ${this.currentPlayer.name}'s turn.`);
  }

  handCards(playerId) {
    const player = this.players.find((item) => item.id === playerId);
    if (!player) throw new Error('You are not seated at this table.');
    return player.hand.map((card) => ({ ...card }));
  }

  handFor(playerId) {
    const player = this.players.find((item) => item.id === playerId);
    if (!player) throw new Error('You are not seated at this table.');
    return player.hand.map((card, index) => `**${index + 1}.** ${cardLabel(card, this.theme)}`).join('\n') || 'No cards.';
  }

  summary(message = '') {
    return { message, winner: this.winner?.name, currentPlayer: this.currentPlayer?.name, topCard: cardLabel(this.topCard, this.theme), activeColor: this.activeColor, players: this.players.map((player) => ({ name: player.name, cards: player.hand.length, bot: player.bot })) };
  }
}
