// Prepare a real, verified generated round for manual UI regression testing.
// This does not read or modify any browser save or advance any game clock.
import { writeFileSync } from 'node:fs';
import { activeAssets } from '../src/game/content';
import { generateBoard } from '../src/game/boardGenerator';
import { initialState } from '../src/game/state';
import { tapReading } from '../src/game/rules';
import { tailKana } from '../src/game/normalization';
import { exportReplay, importReplay } from '../src/game/replay';
for (let i = 0; i < 200; i++) {
  const seed = `terminal-manual-${i}`;
  const board = generateBoard(activeAssets, {seed, round: 0, difficulty: 'normal', discovered: []});
  const p = {ids:board.ids, head:board.head, usedIds:[], usedWords:[], discovered:[]};
  const candidate = activeAssets.find(a => {
    const r = tapReading(a,p); return r && ['basic','synonym'].includes(r.kind) && tailKana(r.kana) === 'ん';
  });
  if (!candidate) continue;
  const s = initialState();
  s.seed = seed; s.board = board;
  s.settings = {...s.settings, mode:'practice', tutorialSeen:true};
  const code = exportReplay(s);
  importReplay(code, activeAssets);
  writeFileSync('reports/visual-play/terminal-replay.txt',code);
  writeFileSync('reports/visual-play/terminal-fixture.json',JSON.stringify({seed,head:board.head,card:candidate.id,slot:board.ids.indexOf(candidate.id)+1,word:tapReading(candidate,p)!.kana,description:candidate.description},null,2));
  console.log({seed,head:board.head,card:candidate.id,word:tapReading(candidate,p)!.kana});
  break;
}
