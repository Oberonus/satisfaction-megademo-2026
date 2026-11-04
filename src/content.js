
// All text is new and written *about* the original, as an unofficial fan
// tribute. It never speaks for the authors, never quotes or paraphrases their
// own scroller lines, and never points at places or private details.
// The original authors are credited for the original work only: code, graphics
// and music of the 1994 ZX Spectrum demo whose art, fonts and themes are reused.
// Scroller rows use the ZX font: plain ASCII only.
export const SCROLLERS = {
  balls: "130 BALLS ON A 3.5 MHZ Z80. RESPECT!   ",
  balls2: "ORIGINAL ZX CODE: RST7 AND MAX IWAMOTO. RESPECT!   ",
  greet: "GREETINGS FROM 2026!   ",
  bm2: "EIGHT BALLS, SIXTEEN FLIGHTS, ZERO CRASHES.   ",
  bm2b: "16 FLIGHTS!   ",
  bm2c: "SATISFIED YET?   ",
  wow: "AUGUST 1992: CODE BUSTERS IS FORMED.  SUMMER 1993: SATISFACTION BEGINS.  SEPTEMBER 1993: AN AMIGA 600 ARRIVES AND EVERYTHING STOPS.  MARCH 1994: BACK TO THE SPECCY.  WOOOW!  ",
  map: "THE ORIGINAL HAD A BONUS GAME: COUNT EVERY LETTER IN THE DEMO!   ",
  glenz: "ONE INK, ONE PAPER, ZERO GPUS...   ",
  glenz2: "PURE Z80 MAGIC.   ",
  crawl: "APRIL 1994. THREE FRIENDS FINISH A MEGADEMO FOR A COMPUTER WITH 128K, A Z80 AND AN AY CHIP. 32 YEARS LATER IT STILL MAKES PEOPLE GRIN. THIS IS AN UNOFFICIAL FAN TRIBUTE TO THEIR WORK. ORIGINAL ZX CODE: RST7 AND MAX IWAMOTO. GRAPHICS: MAX IWAMOTO. MUSIC: KLAV, RST7 AND ANDREI KOLESNIK. THANK YOU FOR THE SATISFACTION.",
};

// The 24-scroll tribute board: one line per scroll, all our own words.
export const SCROLLS24 = [
  "24 SCROLLERS AT ONCE. ON A SPECCY. IN 1994.",
  "THIS BOARD IS A SALUTE TO THAT ONE.",
  "ORIGINAL ZX CODE: RST7 AND MAX IWAMOTO.",
  "ORIGINAL GRAPHICS: MAX IWAMOTO.",
  "ORIGINAL MUSIC: KLAV, RST7, ANDREI KOLESNIK.",
  "THE MUSIC HERE: NEW COVERS OF THEIR THEMES.",
  "3.5 MHZ. 128K. ONE AY CHIP.",
  "NO GPU. NO INTERNET. NO EXCUSES.",
  "EVERY CYCLE COUNTED BY HAND.",
  "SCROLLERS WERE THE SOCIAL MEDIA OF 1994.",
  "LIKES WERE MEASURED IN COPIED DISKS.",
  "COMMENTS ARRIVED BY MAIL. MONTHS LATER.",
  "R TAPE LOADING ERROR? NOT TODAY.",
  "THE BORDER IS PART OF THE ART.",
  "ATTRIBUTE CLASH, BUT MAKE IT FASHION.",
  "ONE INK, ONE PAPER, ENDLESS IDEAS.",
  "THEY DID THE HARD PART IN 1994.",
  "WE JUST ADDED SOME SHADERS.",
  "IF YOU EVER LOADED FROM TAPE, YOU KNOW.",
  "PRESS SPACE TO CONTINUE. OR DON'T.",
  "THIS IS AN UNOFFICIAL FAN TRIBUTE.",
  "ALL ORIGINAL WORK BELONGS TO ITS AUTHORS.",
  "MADE WITH RESPECT AND A LOT OF NOSTALGIA.",
  "THANK YOU, CODE BUSTERS!",
];

// The greetings list of the 1994 original, shown as rapid-fire kinetic type.
// Grouped by platform only: no places.
export const GREETINGS = [
  { where: 'CODE BUSTERS', names: ['RST7', 'MAX IWAMOTO', 'KLAV', 'HACKER 13', 'NSG'] },
  { where: 'SPECCY SCENE', names: ['HOME-SOFT', 'HF-SOFT', 'ANDREI KOLESNIK', 'OVERMASTER', '(R)SOFT', 'JAMES ADVENT', 'STALKER', 'TORNADO', 'SLAYER', 'V.M.G.', 'VVV-SOFT'] },
  { where: 'SPECCY SCENE', names: ['MAGIC SOFT', 'SOFTSTAR', 'MI-SOFT', 'SOVIET SOFT', 'PERESTROIKA', 'MEGABYTE GROUP', 'DREAM TEAM'] },
  { where: 'SPECCY SCENE', names: ['DREAM MAKERS', 'SA.CORP'] },
  { where: 'SPECCY SCENE', names: ['E.S.I.', 'WISE-MAN', 'BZZZYK', 'TAD', 'THORGAL', 'EXTERMINATOR', 'THE LORDS', 'GOLDEN TRIANGLE'] },
  { where: 'AMIGA', names: ['MAD ELKS', 'SPACEBALLS', 'SILENTS', 'FAIRLIGHT', 'SKID ROW', 'ANARCHY', 'ALCATRAZ', 'CRUSADERS', 'RED SECTOR', 'TRILOGY', 'PARADOX'] },
  { where: 'MSX', names: ['SOLID SOFT', 'F&B GROUP', 'MASTERSOFT', 'ISU IWAMOTO'] },
  { where: 'GAME-MAKERS', names: ['KONAMI', 'COMPILE', 'OCEAN', 'PSYGNOSIS', 'DMA DESIGN', 'TEAM 17', 'FACTOR 5'] },
];

// Credits for the 1994 original (not for this tribute).
export const CREDITS = [
  ['ORIGINAL ZX CODE', 'RST7', 'MAX IWAMOTO'],
  ['ORIGINAL GRAPHICS', 'MAX IWAMOTO'],
  ['ORIGINAL MUSIC', 'KLAV', 'RST7', 'ANDREI KOLESNIK'],
];

export const PEOPLE = [
  { name: 'RST7', role: 'ORIGINAL CODE & MUSIC', crop: [2, 2, 250, 156] },
  { name: 'KLAV', role: 'ORIGINAL MUSIC', crop: [258, 113, 254, 158] },
  { name: 'MAX IWAMOTO', role: 'ORIGINAL CODE & GRAPHICS', crop: [2, 227, 250, 156] },
];
