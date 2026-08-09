import { generateQuestionBatch } from '../src/engine/questions/preview.js';
import { PEAKS } from '../src/engine/peaks.js';

function parseArg(name: string, fallback: number): number {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value)) {
    throw new Error(`${flag} expects a number, got "${process.argv[index + 1]}"`);
  }
  return value;
}

const peakId = parseArg('peak', 1);
const difficulty = parseArg('difficulty', 3);
const seed = parseArg('seed', Date.now());
const samples = parseArg('samples', 3);

const peak = PEAKS.find((p) => p.id === peakId);
if (!peak) {
  console.error(`No peak with id ${peakId}. Valid ids: ${PEAKS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}

console.log(
  `\nPeak ${peak.id}. ${peak.name} (${peak.emphasis}) — difficulty ${difficulty} — seed ${seed}\n`,
);

const batch = generateQuestionBatch(seed, peakId, difficulty, samples);

for (const q of batch) {
  console.log(`[${q.typeId}] ${q.prompt}`);
  q.answer.options.forEach((option: string, index: number) => {
    const marker = index === q.answer.correctIndex ? '*' : ' ';
    console.log(`  ${marker} ${option}`);
  });
  console.log(`  -> ${q.explainCorrect}`);
  console.log(`  (${q.timeLimitMs} ms)\n`);
}

console.log(`${batch.length} questions. Re-run with --seed ${seed} to reproduce this batch.`);
console.log('Flags: --peak <1-10> --difficulty <1-10> --seed <n> --samples <per type>\n');
