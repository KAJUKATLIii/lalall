import { cardLabel, themeName } from './game.js';

const COLORS = { red: '#ff5c42', yellow: '#ffd33d', green: '#9be15d', blue: '#5ecaff', wild: '#292927' };
const ACCENTS = { default: '#f6f1e8', cricket: '#d6f55d', football: '#60d2ff', f1: '#ff5c42', minecraft: '#9be15d', pokemon: '#ffd33d' };

function escapeSvg(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function cardSvg(card, index, theme) {
  const x = 28 + index * 164;
  const label = escapeSvg(cardLabel(card, theme));
  const color = COLORS[card.color];
  const shortFace = card.kind === 'number' ? card.number : { skip: '⊘', reverse: '↺', draw2: '+2', wild: 'W', wild4: '+4' }[card.kind];
  return `<g transform="translate(${x} 66)">
    <rect x="5" y="6" width="142" height="204" fill="#11110f"/>
    <rect width="142" height="204" rx="5" fill="${color}" stroke="#11110f" stroke-width="4"/>
    <path d="M-12 142 L153 61 L153 111 L-12 192Z" fill="#f6f1e8" stroke="#11110f" stroke-width="3"/>
    <text x="12" y="25" font-family="monospace" font-size="11" font-weight="700">NULL</text>
    <text x="12" y="44" font-family="monospace" font-size="10">${escapeSvg(card.color.toUpperCase())}</text>
    <text x="71" y="132" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="46" fill="#11110f">${shortFace}</text>
    <text x="12" y="177" font-family="monospace" font-size="9" font-weight="700">${label}</text>
    <text x="130" y="192" text-anchor="end" font-family="monospace" font-size="11" font-weight="700">N</text>
  </g>`;
}

export function renderHandSvg(cards, theme, playerName) {
  const visibleCards = cards.slice(0, 8);
  const width = Math.max(320, visibleCards.length * 164 + 36);
  const cardMarkup = visibleCards.map((card, index) => cardSvg(card, index, theme)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="300" viewBox="0 0 ${width} 300" role="img" aria-label="${escapeSvg(playerName)}'s NULL cards">
    <rect width="100%" height="100%" fill="#f6f1e8"/>
    <path d="M0 0H${width}V44H0Z" fill="#11110f"/>
    <text x="26" y="29" font-family="Arial Black, sans-serif" font-size="19" fill="${ACCENTS[theme] ?? ACCENTS.default}">NULL // ${escapeSvg(themeName(theme).toUpperCase())}</text>
    <text x="${width - 24}" y="29" text-anchor="end" font-family="monospace" font-size="12" fill="#f6f1e8">${escapeSvg(playerName.toUpperCase())} · ${cards.length} CARDS</text>
    ${cardMarkup}
  </svg>`;
}
