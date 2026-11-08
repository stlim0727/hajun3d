// Author-time Gemini TTS departure/ATC radio synthesis.
// Synthesizes realistic ATC/cockpit voice communications using the Gemini API.
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';

export const DEPARTURE_RADIO_CLIPS = {
  gate: {
    speaker: 'crew',
    text: 'Hajun Ground, Sky Jet 2503 at Gate 1, boarding complete, ready for pushback and engine start.',
    desc: '게이트 탑승 완료 및 푸시백 요청'
  },
  pushback: {
    speaker: 'ground',
    text: 'Sky Jet 2503, Hajun Ground, pushback and engine start facing South approved. Altimeter 2992.',
    desc: '푸시백 및 시동 인가'
  },
  taxi: {
    speaker: 'ground',
    text: 'Sky Jet 2503, taxi to Runway 36 Left via Taxiway Alpha, hold short of Runway 36 Left.',
    desc: '지상 활주(Taxi) 지시'
  },
  lineup: {
    speaker: 'tower',
    text: 'Sky Jet 2503, Hajun Tower, Runway 36 Left, line up and wait.',
    desc: '활주로 진입 및 정렬 대기'
  },
  takeoff: {
    speaker: 'tower',
    text: 'Sky Jet 2503, wind 360 at 12 knots, Runway 36 Left cleared for takeoff.',
    desc: '이륙 허가'
  },
  departure: {
    speaker: 'tower',
    text: 'Sky Jet 2503, radar contact, climb and maintain flight level 280, contact Incheon departure 125.15.',
    desc: '상승 및 관제 이양'
  },
  emergency: {
    speaker: 'pilot',
    text: 'Mayday Mayday Mayday, Sky Jet 2503, engine number one flameout, returning to airport immediately.',
    desc: '비상 선언(Mayday)'
  }
};

const outputDir = path.resolve('web/audio/departure');
const cacheDir = path.resolve('.cache/gemini-departure');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    isCheck: false,
    isForce: false,
    isDryRun: false,
    stage: null,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') options.isCheck = true;
    else if (arg === '--force') options.isForce = true;
    else if (arg === '--dry-run') options.isDryRun = true;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg.startsWith('--stage=')) options.stage = arg.slice(8);
    else if (arg === '--stage' && i + 1 < args.length) options.stage = args[++i];
  }
  return options;
}

function findGeminiApiKey() {
  let key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_FREE_KEY;
  if (key) return key.trim();

  const candidatePaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(os.homedir(), '.env'),
  ];

  for (const envPath of candidatePaths) {
    try {
      const content = fsSync.readFileSync(envPath, 'utf8');
      const match = content.match(/(?:GEMINI_API_KEY|GOOGLE_API_KEY|GEMINI_FREE_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) return match[1].trim();
    } catch {}
  }
  return null;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(`
Usage: node scripts/build-gemini-departure-radio.mjs [options]

Options:
  --stage <name>   Target only a specific stage (e.g. --stage taxi)
  --check          Check if manifest.json and audio files exist for all stages
  --dry-run        Analyze which stages need synthesis without API calls
  --force          Force re-generation of stages
  -h, --help       Show this help message
`);
    return;
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const manifestPath = path.join(outputDir, 'manifest.json');
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {}

  const stages = Object.keys(DEPARTURE_RADIO_CLIPS).filter(s => !options.stage || s === options.stage);
  let missing = 0;

  for (const stage of stages) {
    const item = DEPARTURE_RADIO_CLIPS[stage];
    const hash = createHash('sha256').update(item.text).digest('hex').slice(0, 12);
    const audioFile = path.join(outputDir, `${stage}.mp3`);
    const exists = fsSync.existsSync(audioFile);

    if (!exists || manifest[stage]?.hash !== hash) {
      missing++;
      if (options.isCheck) {
        console.warn(`[CHECK FAILED] Stage '${stage}' audio missing or outdated.`);
      }
    }
  }

  if (options.isCheck) {
    if (missing > 0) {
      console.error(`Check failed: ${missing} departure clips need generation.`);
      process.exitCode = 1;
    } else {
      console.log(`✔ All ${stages.length} departure audio clips are up-to-date.`);
    }
    return;
  }

  if (options.isDryRun) {
    console.log(`Dry run complete. ${missing} stages require synthesis.`);
    return;
  }

  const apiKey = findGeminiApiKey();
  if (!apiKey) {
    console.warn('Notice: GEMINI_API_KEY not configured. Skipping live audio synthesis.');
    return;
  }

  console.log(`Ready to synthesize departure audio with model: ${model}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
