import test from 'node:test';
import assert from 'node:assert/strict';
import { UnoGame, buildDeck, canPlay, cardLabel } from '../src/game.js';
import { renderHandSvg } from '../src/card-art.js';

test('buildDeck creates a full UNO deck for every supported theme', () => {
  assert.equal(buildDeck('f1', () => 0.5).length, 108);
  assert.throws(() => buildDeck('unknown'), /Unknown deck theme/);
});

test('cards are playable by matching color, number, action, or wild', () => {
  const top = { color: 'red', kind: 'number', number: 4 };
  assert.equal(canPlay({ color: 'red', kind: 'skip' }, top, 'red'), true);
  assert.equal(canPlay({ color: 'blue', kind: 'number', number: 4 }, top, 'red'), true);
  assert.equal(canPlay({ color: 'wild', kind: 'wild' }, top, 'red'), true);
  assert.equal(canPlay({ color: 'green', kind: 'number', number: 7 }, top, 'red'), false);
});

test('games isolate players and expose a private hand', () => {
  const game = new UnoGame({ hostId: 'host', hostName: 'Host', random: () => 0.4 });
  game.addPlayer('guest', 'Guest');
  game.start();
  assert.equal(game.players[0].hand.length, 7);
  assert.match(game.handFor('host'), /\*\*1\.\*\*/);
  assert.throws(() => game.handFor('stranger'), /not seated/);
});

test('draw cards penalize and skip the next player', () => {
  const game = new UnoGame({ hostId: 'a', hostName: 'A', random: () => 0.3 });
  game.addPlayer('b', 'B');
  game.addPlayer('c', 'C');
  game.started = true;
  game.discard = [{ color: 'red', kind: 'number', number: 9 }];
  game.players[0].hand = [{ color: 'red', kind: 'draw2' }];
  game.players[1].hand = [];
  game.players[2].hand = [];
  game.play('a', 1);
  assert.equal(game.players[1].hand.length, 2);
  assert.equal(game.currentPlayer.id, 'c');
});


test('themed decks give cards theme-specific faces without changing UNO rules', () => {
  const card = { color: 'red', kind: 'draw2' };
  assert.match(cardLabel(card, 'f1'), /🏎️ RED · Penalty \+2/);
  assert.match(cardLabel(card, 'minecraft'), /⛏️ RED · Zombie \+2/);
  assert.match(cardLabel({ color: 'wild', kind: 'wild4' }, 'pokemon'), /Hyper Beam \+4/);
  assert.equal(canPlay(card, { color: 'red', kind: 'number', number: 1 }, 'red'), true);
});


test('themed card gallery renders playable hand art', () => {
  const image = renderHandSvg([{ color: 'red', kind: 'skip' }, { color: 'wild', kind: 'wild4' }], 'f1', 'Racer');
  assert.match(image, /NULL \/\/ GRAND PRIX/);
  assert.match(image, /Pit Stop/);
  assert.match(image, /Safety Car \+4/);
  assert.match(image, /RACER · 2 CARDS/);
});
