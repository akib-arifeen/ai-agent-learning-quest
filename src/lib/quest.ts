/**
 * The whole quest, as data. Every page, the XP maths, the schedule and the AI coach's
 * context are derived from this one file — edit wording here, nowhere else.
 *
 * Each quest has a `main` variant (the original task list) plus alternatives that
 * teach the SAME concept at the SAME difficulty, so swapping never skips a lesson.
 * All variants of a quest share the same number of sittings, so the schedule never moves
 * when the learner swaps.
 *
 * Text never names one AI tool. It uses slots ({tool}, {plan}, {mention}, {undo}…) that
 * `variantOf` fills with the learner's own tool's words; see tools.ts for the list.
 */

import { DEFAULT_SETUP, forTool, toolOf, type Setup } from './tools'

export type Sitting = { title: string; steps: string[] }

export type Variant = {
  id: 'main' | 'alt-a' | 'alt-b'
  title: string
  tagline: string
  tools: string[]
  folder: string
  make: string[]
  expected: string
  stretch?: string
  tips: string[]
  concept: { name: string; body: string; experiment?: string }
  learning: string
  sittings: Sitting[]
}

export type Quest = {
  id: string
  num: number
  level: number
  boss?: boolean
  time: string
  xp: number
  /** Scheduled on the same day as the next quest (Base Camp + Quest 1 share day one). */
  pairWithNext?: boolean
  variants: Variant[]
}

export type Level = { num: number; name: string; blurb: string; tone: 'pear' | 'cyan' | 'mint' | 'lav' | 'ink' }

export const LEVELS: Level[] = [
  { num: 0, name: 'Base Camp', blurb: 'Gear up. Fifteen minutes and you are in.', tone: 'ink' },
  { num: 1, name: 'Warm-ups', blurb: 'Tiny, glowing, fun. Learn to brief the agent.', tone: 'pear' },
  { num: 2, name: 'Your own files', blurb: 'Your art, your music, your story — in the browser.', tone: 'cyan' },
  { num: 3, name: 'Creative tools', blurb: 'The agent writes the script. You run it in the big apps.', tone: 'mint' },
  { num: 4, name: 'Projects', blurb: 'Multi-day builds that end up online with your name on them.', tone: 'lav' },
]

// Shared tip text, reused across variants so the facts stay identical everywhere.
const COPY_PATH =
  'Copy a path: Windows → Shift + right-click → Copy as path. Mac → right-click, hold Option → Copy "…" as Pathname. In VS Code → right-click → Copy Path.'
const REVEAL =
  'To open your page: find index.html in File Explorer (Windows) or Finder (Mac) and double-click it. In VS Code: right-click it → Reveal in File Explorer / Reveal in Finder.'
const SNAPSHOT = 'Break it on purpose, then roll back. {undo}'
const BLENDER_PATHS =
  'Blender lives here — Windows: "C:\\Program Files\\Blender Foundation\\Blender x.y\\blender.exe". Mac: "/Applications/Blender.app/Contents/MacOS/Blender". Give the agent yours.'

const C_SPECIFIC = {
  name: 'Specific beats vague',
  body: 'The agent can only build what you describe. “Make something cool with particles” gets a generic demo; a brief with Goal, Context, Constraints and Done-when gets YOUR idea.',
  experiment: 'Send a lazy one-line prompt in a new chat. Then send your full brief in another new chat. Compare the two results side by side.',
}
const C_SMALL = {
  name: 'Iterate in small steps · use references',
  body: 'One behaviour per message keeps every change small enough to test and undo. A reference carries a whole style in a few words — “moves like a Ghibli soot sprite”.',
  experiment: 'Describe one behaviour twice: once in plain words, once with a reference. Which one got closer to what you pictured?',
}
const C_CONTEXT = {
  name: 'Context',
  body: 'The agent only knows three things: the folder that is open, the files you {mention}, and this chat. Everything else, it guesses.',
  experiment: 'Ask “what files can you see?” before you add your image to the chat, then again after. Notice the difference.',
}
const C_PLAN = {
  name: 'Plan first · feedback = what you saw',
  body: 'On bigger jobs, let {plan} ask you questions before anything gets built. When something is off, describe exactly what you saw or heard — like notes to an editor.',
  experiment: '{planHow}, and ask it to list its questions for you before it plans.',
}
const C_CONSTRAINTS = {
  name: 'Constraints up front · content vs code',
  body: 'Constraints said at the start shape the whole build; said at the end, they cause rewrites. Keeping your words (content) separate from the player (code) means you can change one without breaking the other.',
  experiment: 'Ask the agent: “Which file do I edit to change the content, and which file should I never touch?”',
}
const C_ERRORS = {
  name: 'Errors are information · your setup is context · ask for knobs',
  body: 'An error is not failure — it is the exact clue the agent needs. Paste it word for word, with your app version. And ask for “knobs”: every number you might tweak, at the top of the script.',
  experiment: 'Break one setting on purpose (e.g. type a word where a number goes), run it, and paste the exact error. See how fast it gets fixed vs “it doesn’t work”.',
}
const C_LIMITS = {
  name: 'Agents have limits · hallucination',
  body: 'The agent works through tools: it can write text files, but it cannot click around inside your editor or see your viewport. It can also sound very sure about functions that do not exist.',
  experiment: 'When it names a function, ask: “Does this exist in my exact version? Check the docs.” Then look it up yourself.',
}
const C_RULES = {
  name: 'Rules = standing instructions · let the AI interview you · you’re the creative director',
  body: 'A rule file is said once and followed in every chat. An interview pulls out things you did not know to say. And taste is your job — the agent proposes, you decide.',
  experiment: 'Start a new chat and ask “what rules are you following?” — check it actually read your rule file.',
}
const C_SCALE = {
  name: 'Test small, then scale · verify, don’t trust · ask for options',
  body: 'Run 4 frames before 36. Check the files yourself (count them, open one) instead of trusting “done!”. When there is more than one way, ask for the options and pick.',
  experiment: 'Before any code, ask for 2 ways to do it with pros and cons. Choose one and say why.',
}
const C_CAPSTONE = {
  name: 'Break work down · the context window · memory lives in files · save points',
  body: 'A long chat fills the agent’s short-term memory (the context window) and it starts forgetting. Files never forget: your design doc and progress.md are the project’s memory. Back up every working milestone.',
  experiment: 'Start a fresh chat, {mention} only progress.md, and ask “where are we and what’s next?”',
}

const RULES_TIP = '{rules}'
const INTERVIEW_TIP = 'In {plan}: “Interview me one question at a time before you plan.” Answer in your own words.'
const PHONE_TIP = 'Check the phone view: open DevTools (F12, or Cmd+Option+I on Mac) → toggle the device toolbar.'
const CAPSTONE_TIPS = [
  'Never use one chat across days. New chat per milestone: start it by adding your design doc and progress.md to the chat ({mention} them).',
  'End every sitting by asking the agent to update progress.md: what works, what’s next, known bugs.',
  'Save points: after each milestone that works, zip a backup (or make a git commit).',
]

export const QUESTS: Quest[] = [
  {
    id: 't0',
    num: 0,
    level: 0,
    time: '15–30 min',
    xp: 50,
    pairWithNext: true,
    variants: [
      {
        id: 'main',
        title: 'Base Camp',
        tagline: 'Set up your gear once. Every quest after this starts here.',
        tools: ['{app}', '{tool}'],
        folder: 'ai-quest',
        make: [
          '{install}',
          'Make an ai-quest folder, {open}, and give each task its own subfolder.',
        ],
        expected: '{ready}',
        tips: [
          '{tip1}',
          '{tip2}',
          'Golden rule: never point the agent at the only copy of a project or art file. Copy it into ai-quest first.',
          'Brief recipe — a checklist, not a template: Goal · Context · Constraints · Done when.',
        ],
        concept: {
          name: 'The Golden Rule',
          body: 'Agents edit files for real. Work on copies inside ai-quest, so nothing precious can get broken.',
        },
        learning: 'Your toolkit, and the two habits every later quest relies on.',
        sittings: [
          {
            title: 'Gear up',
            steps: [
              '{setup1}',
              '{setup2}',
              '{setup3}',
              '{setup4}',
              'Read the Golden Rule',
              'Read the Brief recipe',
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────── Level 1 · Warm-ups ─────────────────────────────
  {
    id: 't1',
    num: 1,
    level: 1,
    time: '30–45 min',
    xp: 100,
    variants: [
      {
        id: 'main',
        title: 'Your Name in Stardust',
        tagline: 'Type a word. Watch it form out of thousands of glowing particles.',
        tools: ['{tool}', 'Browser'],
        folder: '01-stardust',
        make: [
          'A dark web page with a text box.',
          'The word you type is built from thousands of glowing particles.',
          'Your mouse scatters them, and they drift back.',
          'A click makes them explode, then return.',
        ],
        expected: '01-stardust/index.html opens on double-click and does all of the above.',
        tips: [
          '{Mention} the 01-stardust folder so the agent builds in the right place.',
          'Describe the feeling like a motion-design brief: speed, glow, colour, how floaty the drift is.',
          'Watch the plan → act → check loop. Read the plan before you approve it.',
          REVEAL,
        ],
        concept: C_SPECIFIC,
        learning: 'Writing a clear brief, and reading the agent’s plan → act → check loop.',
        sittings: [
          {
            title: 'Make it sparkle',
            steps: [
              'Make the 01-stardust folder',
              'Lazy prompt vs full brief experiment',
              'Your word forms from particles',
              'Mouse scatters them, they drift back',
              'Click → explode → return',
              'Opens on double-click',
            ],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Neon Sign Shop',
        tagline: 'Your word, bent into a buzzing neon tube on a brick wall.',
        tools: ['{tool}', 'Browser'],
        folder: '01-neon',
        make: [
          'A dark brick-wall page with a text box.',
          'What you type becomes a glowing neon sign in a handwritten-style font.',
          '4+ tube colours to pick from; the glow lights up the wall around it.',
          'One letter flickers at random, like a faulty tube.',
          'Click the sign to switch it off and on, with a soft electric hum made in code (no audio file).',
        ],
        expected: '01-neon/index.html opens on double-click and does all of the above.',
        tips: [
          '{Mention} the 01-neon folder so the agent builds in the right place.',
          'Brief it like a set dresser: “a cheap noodle-bar sign at 2am”, not just “neon”.',
          'Ask for the hum to be made with the Web Audio API so you need no sound files.',
          REVEAL,
        ],
        concept: C_SPECIFIC,
        learning: 'Writing a clear brief, and reading the agent’s plan → act → check loop.',
        sittings: [
          {
            title: 'Light it up',
            steps: [
              'Make the 01-neon folder',
              'Lazy prompt vs full brief experiment',
              'Typed word becomes a neon sign',
              '4+ colours and wall glow',
              'Random flicker',
              'Click on/off with a hum',
            ],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Kinetic Type Machine',
        tagline: 'An After Effects-style poster that animates every phrase you type.',
        tools: ['{tool}', 'Browser'],
        folder: '01-kinetic-type',
        make: [
          'A page with a text box and a big poster area.',
          'Type a short phrase: letters fly in one by one with a staggered, eased animation.',
          'Press Space for a new random layout — size, rotation and colour palette.',
          '3+ animation styles to choose from (e.g. slam, float, typewriter).',
          'A Save-as-PNG button for the finished poster.',
        ],
        expected: '01-kinetic-type/index.html opens on double-click; three styles work and Save PNG downloads the poster.',
        tips: [
          '{Mention} the 01-kinetic-type folder so the agent builds in the right place.',
          'Use the motion words you already know from After Effects — ease, stagger, overshoot. Agents understand them.',
          'Ask: “What can’t a plain web page do that After Effects can?” Good to know early.',
          REVEAL,
        ],
        concept: C_SPECIFIC,
        learning: 'Writing a clear brief, and reading the agent’s plan → act → check loop.',
        sittings: [
          {
            title: 'Make type move',
            steps: [
              'Make the 01-kinetic-type folder',
              'Lazy prompt vs full brief experiment',
              'Staggered letter animation',
              'Space shuffles the layout',
              '3 animation styles',
              'Save as PNG works',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 't2',
    num: 2,
    level: 1,
    boss: true,
    time: '1–1.5 h',
    xp: 150,
    variants: [
      {
        id: 'main',
        title: 'Desk Pet',
        tagline: 'A tiny creature you design, built one behaviour at a time.',
        tools: ['{tool}', 'Browser'],
        folder: '02-desk-pet',
        make: [
          'A creature you design, built one behaviour per message:',
          '1 · an idle animation',
          '2 · it follows the mouse',
          '3 · click to feed it, with a happy reaction',
          '4 · grumpy after 30 s ignored, asleep with “Zzz” after 60 s',
          '5 · a behaviour you invent',
        ],
        expected: '02-desk-pet/index.html does all five.',
        tips: [
          '{Mention} the file in every message, so the agent keeps editing the same pet.',
          'Test each round before asking for the next behaviour.',
          SNAPSHOT,
          'Ask the agent how to speed up time for testing, so you don’t wait 60 seconds every time.',
        ],
        concept: C_SMALL,
        learning: 'Iterating in small, testable steps — and rolling back when it goes wrong.',
        sittings: [
          {
            title: 'Bring it to life',
            steps: [
              'Design your creature (sketch or words)',
              'Idle animation',
              'Follows the mouse',
              'Click to feed + happy reaction',
              'Grumpy at 30 s, asleep at 60 s',
              'Your own invented behaviour',
              'Broke it on purpose and rolled back',
            ],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Pocket Aquarium',
        tagline: 'A fish you design, living in a glass tank in your browser.',
        tools: ['{tool}', 'Browser'],
        folder: '02-aquarium',
        make: [
          'A fish you design, built one behaviour per message:',
          '1 · it swims around idly, trailing bubbles',
          '2 · it swims toward your mouse',
          '3 · click to drop food flakes — it chases them and does a happy flip',
          '4 · ignored for 30 s it hides behind a plant; at 60 s it sleeps on the sand with “Zzz” bubbles',
          '5 · a behaviour you invent',
        ],
        expected: '02-aquarium/index.html does all five.',
        tips: [
          '{Mention} the file in every message, so the agent keeps editing the same fish.',
          'Describe the water: murky pond or bright tropical? That one word changes every colour.',
          SNAPSHOT,
          'Ask the agent how to speed up time for testing.',
        ],
        concept: C_SMALL,
        learning: 'Iterating in small, testable steps — and rolling back when it goes wrong.',
        sittings: [
          {
            title: 'Fill the tank',
            steps: [
              'Design your fish (sketch or words)',
              'Idle swim + bubbles',
              'Swims toward the mouse',
              'Click to feed + happy flip',
              'Hides at 30 s, sleeps at 60 s',
              'Your own invented behaviour',
              'Broke it on purpose and rolled back',
            ],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Mood Plant',
        tagline: 'A little pixel plant that needs you (just a bit).',
        tools: ['{tool}', 'Browser'],
        folder: '02-mood-plant',
        make: [
          'A pixel-art plant you design, built one behaviour per message:',
          '1 · it sways in a gentle breeze',
          '2 · it leans toward your mouse like sunlight',
          '3 · click to water it — it perks up and sprouts a flower',
          '4 · droops after 30 s without water; at 60 s the sky goes dark and it sleeps with “Zzz”',
          '5 · a behaviour you invent',
        ],
        expected: '02-mood-plant/index.html does all five.',
        tips: [
          '{Mention} the file in every message, so the agent keeps editing the same plant.',
          'For crisp pixel art, give the canvas size (e.g. 64×64, scaled up) and say “no smoothing”.',
          SNAPSHOT,
          'Ask the agent how to speed up time for testing.',
        ],
        concept: C_SMALL,
        learning: 'Iterating in small, testable steps — and rolling back when it goes wrong.',
        sittings: [
          {
            title: 'Grow it',
            steps: [
              'Design your plant (sketch or words)',
              'Breeze sway',
              'Leans toward the mouse',
              'Click to water + flower',
              'Droops at 30 s, sleeps at 60 s',
              'Your own invented behaviour',
              'Broke it on purpose and rolled back',
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────── Level 2 · Your own files ───────────────────────────
  {
    id: 't3',
    num: 3,
    level: 2,
    time: '1–2 h',
    xp: 150,
    variants: [
      {
        id: 'main',
        title: 'Living Poster',
        tagline: 'Your own drawing or render, melting and glitching under the mouse.',
        tools: ['{tool}', 'Browser', 'Your art'],
        folder: '03-living-poster',
        make: [
          'An interactive page built from your own drawing or render.',
          'Hovering melts or glitches the pixels, and they settle back.',
          'An ASCII-art toggle.',
          'A Save-as-PNG button.',
        ],
        expected: '03-living-poster/index.html shows your image with all three effects working.',
        tips: [
          'Copy the image into 03-living-poster first (Golden rule), then {mention} it, or paste its full path.',
          COPY_PATH,
          'If the effects fail on double-click, say exactly that. Browsers block some image tricks on local files, and the agent can work around it.',
          'Try 3 different images. Which one looks best melted?',
        ],
        concept: C_CONTEXT,
        learning: 'Giving the agent the right context, and working with your real files safely.',
        sittings: [
          {
            title: 'Make it melt',
            steps: [
              'Copied your image into the folder',
              '“What files can you see?” before & after adding it',
              'Your image on the page',
              'Hover melt / glitch that settles back',
              'ASCII toggle',
              'Save as PNG',
              'Tried 3 images',
            ],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Before / After Reveal',
        tagline: 'Show off your process: the sketch on one side, the final on the other.',
        tools: ['{tool}', 'Browser', 'Your art'],
        folder: '03-before-after',
        make: [
          'Two of your own images: a sketch, WIP or clay render, and the finished piece.',
          'A drag slider that wipes between them (works with touch too).',
          'A magnifier loupe that follows the mouse.',
          'A “flicker” toggle that flips quickly between the two.',
          'A Save-as-PNG button that saves the current split view.',
        ],
        expected: '03-before-after/index.html shows both images with all four features working.',
        tips: [
          'Copy both images into 03-before-after first (Golden rule), then {mention} them, or paste their full paths.',
          COPY_PATH,
          'Images different sizes? Say which one to fit to. That is exactly the kind of detail the agent can’t guess.',
          'If something fails on double-click, say exactly that — browsers block some image tricks on local files.',
        ],
        concept: C_CONTEXT,
        learning: 'Giving the agent the right context, and working with your real files safely.',
        sittings: [
          {
            title: 'Reveal the process',
            steps: [
              'Copied both images into the folder',
              '“What files can you see?” before & after adding them',
              'Drag slider wipe (mouse + touch)',
              'Magnifier loupe',
              'Flicker toggle',
              'Save as PNG',
              'Tried a second pair of images',
            ],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Palette Thief',
        tagline: 'Steal the colours out of your own art.',
        tools: ['{tool}', 'Browser', 'Your art'],
        folder: '03-palette-thief',
        make: [
          'Load one of your artworks into a page.',
          'It pulls out the 6 main colours as swatches with hex codes.',
          'Click a swatch to copy its hex.',
          'A duotone toggle that redraws your image in two of those colours.',
          'Export a palette card PNG (your image + swatches) for your moodboards.',
        ],
        expected: '03-palette-thief/index.html extracts 6 colours from your image, and the export downloads a card.',
        tips: [
          'Copy the image into 03-palette-thief first (Golden rule), then {mention} it, or paste its full path.',
          COPY_PATH,
          'Try 3 images. If the palette looks wrong, describe what’s missing: “the red jacket isn’t in the palette”.',
          'If it fails on double-click, say exactly that — browsers block some image tricks on local files.',
        ],
        concept: C_CONTEXT,
        learning: 'Giving the agent the right context, and working with your real files safely.',
        sittings: [
          {
            title: 'Steal the colours',
            steps: [
              'Copied your image into the folder',
              '“What files can you see?” before & after adding it',
              '6 swatches with hex codes',
              'Click to copy',
              'Duotone toggle',
              'Palette card export',
              'Tried 3 images',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 't4',
    num: 4,
    level: 2,
    time: '2–3 h · 2 sittings',
    xp: 200,
    variants: [
      {
        id: 'main',
        title: 'Beat Cut',
        tagline: 'Your images, cutting on the beat of a song.',
        tools: ['{tool}', 'Browser', 'Your art', 'Music'],
        folder: '04-beat-cut',
        make: [
          '15–20 of your images plus one song (your own, or from Pixabay Music).',
          'A page that cuts between the images on the beat.',
          '3+ transition styles that change in the loud parts.',
        ],
        expected: 'A 30-second screen recording of it running (Win+Alt+R on Windows / Cmd+Shift+5 on Mac).',
        tips: [
          'Start in {plan} and ask how it will “hear” the beat — before any code.',
          'Give precise feedback: “cuts land half a beat late” beats “it’s off”.',
          'Ask for a sensitivity slider so you can tune it yourself.',
        ],
        concept: C_PLAN,
        learning: 'Planning before building, and giving feedback the agent can act on.',
        sittings: [
          {
            title: 'Plan + first cut',
            steps: [
              '15–20 images + a song in 04-beat-cut',
              'Planned first: how will it hear the beat?',
              'First version cuts on the beat',
            ],
          },
          {
            title: 'Transitions + record',
            steps: ['3+ transition styles', 'Styles change in the loud parts', 'Sensitivity slider', '30 s screen recording'],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Bass Bloom Visualizer',
        tagline: 'Your artwork, breathing with the music.',
        tools: ['{tool}', 'Browser', 'Your art', 'Music'],
        folder: '04-visualizer',
        make: [
          'One of your artworks plus one song (your own, or from Pixabay Music).',
          'The art pulses and zooms on the bass.',
          'Sparks or particles fly on the high notes.',
          'Colours shift in the loud parts.',
          '3+ visual modes you switch with keys 1–3.',
        ],
        expected: 'A 30-second screen recording of it running (Win+Alt+R on Windows / Cmd+Shift+5 on Mac).',
        tips: [
          'Start in {plan} and ask how it will split the bass from the highs — before any code.',
          'Feedback like a director: “the pulse is too twitchy, it should feel like breathing”.',
          'Ask for sliders for intensity and smoothing so you can tune it yourself.',
        ],
        concept: C_PLAN,
        learning: 'Planning before building, and giving feedback the agent can act on.',
        sittings: [
          {
            title: 'Plan + first pulse',
            steps: ['Artwork + song in 04-visualizer', 'Planned first: how will it split bass and highs?', 'Art pulses on the bass'],
          },
          {
            title: 'Modes + record',
            steps: ['Sparks on the highs', 'Colour shift in loud parts', '3 visual modes (keys 1–3)', '30 s screen recording'],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Lyric Video Machine',
        tagline: 'Kinetic lyrics that land on every line.',
        tools: ['{tool}', 'Browser', 'Your art', 'Music'],
        folder: '04-lyric-video',
        make: [
          'One song plus its lyrics in lyrics.txt (yours to write or type up), and 5+ of your images.',
          'A “tap mode”: play the song and tap Space on each new line to timestamp it.',
          'Playback mode: the lyrics animate in on time over your images.',
          '3+ text animation styles that change in the loud parts.',
        ],
        expected: 'A 30-second screen recording of your lyric video (Win+Alt+R on Windows / Cmd+Shift+5 on Mac).',
        tips: [
          'Start in {plan} and ask how it will store the timings — before any code.',
          'Precise feedback: “line 4 appears half a beat late”.',
          'Ask for a “nudge all timings” control so you can fix sync without re-tapping.',
        ],
        concept: C_PLAN,
        learning: 'Planning before building, and giving feedback the agent can act on.',
        sittings: [
          {
            title: 'Plan + tap mode',
            steps: ['Song, lyrics.txt + images in 04-lyric-video', 'Planned first: how will it store timings?', 'Tap mode records timestamps'],
          },
          {
            title: 'Animate + record',
            steps: ['Lyrics play in sync', '3+ text animation styles', 'Styles change in loud parts', '30 s screen recording'],
          },
        ],
      },
    ],
  },
  {
    id: 't5',
    num: 5,
    level: 2,
    boss: true,
    time: '3–4 h · 2 sittings',
    xp: 300,
    variants: [
      {
        id: 'main',
        title: 'Choose-Your-Own-Adventure',
        tagline: 'Your story, your pictures, your music — and every choice matters.',
        tools: ['{tool}', 'Browser', 'Your writing', 'Your art'],
        folder: '05-adventure',
        make: [
          'You write story.txt: about 8 scenes, 2 choices each, 2+ endings.',
          'You collect scene images and music.',
          'The agent builds a player with a typewriter effect and a restart button.',
          'Twist: afterwards you add a branch by hand, with no agent.',
        ],
        expected: '05-adventure/index.html plays your whole story on double-click — including the branch you added yourself.',
        tips: [
          'Say it up front: “I’ll edit the story myself” and “must work by double-click”.',
          'If your own edit breaks it, ask the agent WHY first, before letting it fix anything.',
        ],
        concept: C_CONSTRAINTS,
        learning: 'Setting constraints early, and keeping content separate from code.',
        sittings: [
          {
            title: 'Write + build',
            steps: [
              'story.txt: 8 scenes, 2 choices, 2+ endings',
              'Scene images + music collected',
              'Constraints said up front',
              'Player works with typewriter effect',
            ],
          },
          {
            title: 'Polish + your own branch',
            steps: ['Restart button', 'Every ending reachable', 'Added a branch by hand — no agent', 'If it broke: asked WHY first'],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Creature Personality Quiz',
        tagline: 'Which of your creatures are you? Find out.',
        tools: ['{tool}', 'Browser', 'Your writing', 'Your art'],
        folder: '05-quiz',
        make: [
          'You write quiz.txt: 8 questions, 3–4 answers each, 4 results.',
          'Each result is one of your creatures or characters, with your art and a short description.',
          'The agent builds the quiz: animated answers, a progress bar, a big result reveal, music.',
          'A “Save my result” PNG card to share.',
          'Twist: afterwards you add a question by hand, with no agent.',
        ],
        expected: '05-quiz/index.html runs the whole quiz on double-click — including the question you added yourself.',
        tips: [
          'Say it up front: “I’ll edit the questions myself” and “must work by double-click”.',
          'If your own edit breaks it, ask the agent WHY first, before letting it fix anything.',
        ],
        concept: C_CONSTRAINTS,
        learning: 'Setting constraints early, and keeping content separate from code.',
        sittings: [
          {
            title: 'Write + build',
            steps: ['quiz.txt: 8 questions, 4 results', 'Result art collected', 'Constraints said up front', 'Quiz plays start to finish'],
          },
          {
            title: 'Polish + your own question',
            steps: ['Result reveal + Save card', 'Every result reachable', 'Added a question by hand — no agent', 'If it broke: asked WHY first'],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Mini Visual Novel',
        tagline: 'Your characters, your dialogue, your endings.',
        tools: ['{tool}', 'Browser', 'Your writing', 'Your art'],
        folder: '05-visual-novel',
        make: [
          'You write script.txt: about 8 scenes of dialogue, a choice in most, 2+ endings.',
          'Your character portraits, backgrounds and music.',
          'The agent builds the player: dialogue box with typewriter text, character on screen, choice buttons, restart.',
          'A “friendship meter” your choices change, which decides the ending.',
          'Twist: afterwards you add a scene by hand, with no agent.',
        ],
        expected: '05-visual-novel/index.html plays on double-click — including the scene you added yourself.',
        tips: [
          'Say it up front: “I’ll edit the script myself” and “must work by double-click”.',
          'If your own edit breaks it, ask the agent WHY first, before letting it fix anything.',
        ],
        concept: C_CONSTRAINTS,
        learning: 'Setting constraints early, and keeping content separate from code.',
        sittings: [
          {
            title: 'Write + build',
            steps: ['script.txt: 8 scenes, 2+ endings', 'Portraits, backgrounds + music', 'Constraints said up front', 'Dialogue plays with choices'],
          },
          {
            title: 'Polish + your own scene',
            steps: ['Friendship meter decides the ending', 'Every ending reachable', 'Added a scene by hand — no agent', 'If it broke: asked WHY first'],
          },
        ],
      },
    ],
  },

  // ─────────────────────────── Level 3 · Creative tools ───────────────────────────
  {
    id: 't6',
    num: 6,
    level: 3,
    time: '2–3 h · 2 sittings',
    xp: 250,
    variants: [
      {
        id: 'main',
        title: 'Staircase to Nowhere',
        tagline: 'A Blender script that builds a sunset spiral staircase for you.',
        tools: ['{tool}', 'Blender', 'Python'],
        folder: '06-stairs',
        make: [
          'stairs.py builds a 40-step spiral staircase with a sunset gradient.',
          'A glowing emission orb on top, plus a camera and lights.',
          'Settings at the top of the script; re-running doesn’t duplicate anything.',
        ],
        expected: 'Run it from Blender’s Scripting tab; change steps to 80 and re-run — one clean staircase, twice as tall.',
        tips: [
          'Give the agent your Blender version (Help → About).',
          'Errors go to the System Console (Windows) or the Info editor (Mac). Paste the exact error text.',
          'Ask for knobs: every number you might want to change, at the top.',
        ],
        concept: C_ERRORS,
        learning: 'Running agent-written scripts inside a creative tool, and debugging with real error messages.',
        sittings: [
          {
            title: 'Build the stairs',
            steps: ['06-stairs folder made', 'Told the agent your Blender version', '40 spiral steps', 'Sunset gradient'],
          },
          {
            title: 'Orb, camera, knobs',
            steps: ['Glowing orb on top', 'Camera + lights', 'Settings at the top', 'Re-run makes no duplicates', 'Changed to 80 steps and re-ran'],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Crystal Garden',
        tagline: 'Grow a glowing crystal cluster in Houdini — with code.',
        tools: ['{tool}', 'Houdini', 'Python'],
        folder: '06-crystals',
        make: [
          'crystals.py, a Houdini Python script (Houdini Apprentice is free for learning) that builds a rock with 60 crystals growing out of it.',
          'Crystals vary in size, tilt and colour (cyan → violet), with a glowing material.',
          'A camera and three lights.',
          'Settings at the top; re-running replaces the old setup instead of duplicating it.',
        ],
        expected: 'Run it inside Houdini; change crystals to 200 and re-run — one clean, denser cluster.',
        tips: [
          'Give the agent your Houdini version (Help → About Houdini).',
          'Ask for options: Python script vs a VEX wrangle — which suits this, and why?',
          'Ask the agent for the exact way to run a .py file in your Houdini version, then paste errors from the Python Shell word for word.',
          'Ask for knobs: every number you might want to change, at the top.',
        ],
        concept: C_ERRORS,
        learning: 'Running agent-written scripts inside a creative tool, and debugging with real error messages.',
        sittings: [
          {
            title: 'Grow the rock',
            steps: ['06-crystals folder made', 'Told the agent your Houdini version', 'Rock + 60 crystals', 'Size, tilt + colour variation'],
          },
          {
            title: 'Glow, camera, knobs',
            steps: ['Glowing material', 'Camera + lights', 'Settings at the top', 'Re-run makes no duplicates', 'Changed to 200 crystals and re-ran'],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Title Sequence Robot',
        tagline: 'A script that builds an animated After Effects title comp for you.',
        tools: ['{tool}', 'After Effects', 'ExtendScript'],
        folder: '06-title-robot',
        make: [
          'title_maker.jsx, an After Effects script that builds a 1080p, 6-second comp.',
          'Your name as 3 text layers that slide in with staggered, eased keyframes.',
          'A glow, a background gradient and a slow camera push-in.',
          'Settings at the top (text, colours, duration); re-running replaces the old comp.',
        ],
        expected: 'Run it with File → Scripts → Run Script File…; change the text and duration and re-run — one clean new comp.',
        tips: [
          'Give the agent your After Effects version (Help → About After Effects).',
          'Tell it AE scripts use ExtendScript — old-style JavaScript — so it avoids modern syntax AE can’t run.',
          'Errors pop up in a dialog: copy the message and the line number exactly.',
          'Ask for knobs: every number you might want to change, at the top.',
        ],
        concept: C_ERRORS,
        learning: 'Running agent-written scripts inside a creative tool, and debugging with real error messages.',
        sittings: [
          {
            title: 'Build the comp',
            steps: ['06-title-robot folder made', 'Told the agent your AE version', 'Script makes a 1080p comp', '3 staggered text layers'],
          },
          {
            title: 'Polish + knobs',
            steps: ['Glow + background gradient', 'Camera push-in', 'Settings at the top', 'Re-run makes no duplicates', 'Changed text + duration and re-ran'],
          },
        ],
      },
    ],
  },
  {
    id: 't7',
    num: 7,
    level: 3,
    boss: true,
    time: '4–6 h · 3 sittings',
    xp: 450,
    variants: [
      {
        id: 'main',
        title: 'Haunted Forest',
        tagline: 'A foggy Unreal forest, dressed by script, with orbs you build yourself.',
        tools: ['{tool}', 'Unreal Engine', 'Python', 'Blueprints'],
        folder: '07-haunted-forest',
        make: [
          'Part A · dress_forest.py (editor Python) scatters 200 trees and rocks with a winding clear path, fog and 6 coloured lights. Settings at the top; no duplicates on re-run.',
          'Part B · you build a “spirit orb” Blueprint yourself from the agent’s numbered steps: glow and bob, pickup, an “Orbs: 3/10” HUD, a win message.',
          'Part C · the script also places 10 orbs along the path.',
        ],
        expected: 'Play in the editor: walk the path, collect all 10 orbs, see your win message.',
        tips: [
          'Enable Edit → Plugins → Python Editor Script Plugin, then restart.',
          'Run a script from the Output Log: switch the box to Cmd and type py "path/to/dress_forest.py".',
          'Right-click an asset → Copy Reference to give the agent exact asset paths.',
          'Tell it your UE version. If your model accepts images, send screenshots.',
          'The agent can’t edit Blueprints (visual graphs) — that part is yours. Python runs in the editor only, not during gameplay.',
        ],
        concept: C_LIMITS,
        learning: 'Knowing what the agent can and can’t touch — and catching made-up answers.',
        sittings: [
          {
            title: 'Part A · Dress the forest',
            steps: ['Python plugin enabled', 'Asset paths via Copy Reference', '200 trees + rocks with a clear path', 'Fog + 6 coloured lights', 'Re-run makes no duplicates'],
          },
          {
            title: 'Part B · Build the orb',
            steps: ['Got numbered Blueprint steps', 'Orb glows and bobs', 'Pickup works', '“Orbs: 3/10” HUD', 'Win message'],
          },
          {
            title: 'Part C · Place the orbs',
            steps: ['Script places 10 orbs on the path', 'Asked “does this exist in my UE version?”', 'Full playthrough'],
          },
        ],
      },
      {
        id: 'alt-a',
        title: 'Firefly Meadow',
        tagline: 'Learn Godot 4 by building a glowing night meadow.',
        tools: ['{tool}', 'Godot 4', 'GDScript'],
        folder: '07-firefly-meadow',
        make: [
          'Part A · a GDScript that builds a 3D meadow: 200 trees and rocks around a winding clear path, fog and 6 coloured lights. Settings at the top; no duplicates on re-run.',
          'Part B · you build a “firefly” scene yourself in the Godot editor from the agent’s numbered steps: glow and bob, pickup, a “Fireflies: 3/10” label, a win message.',
          'Part C · the script also places 10 fireflies along the path.',
        ],
        expected: 'Press Play: walk the path, collect all 10 fireflies, see your win message.',
        tips: [
          'Godot is free and open source. Get Godot 4 (the standard build, not .NET).',
          'Tell the agent your exact Godot version — Godot 3 and 4 code differ a lot, and agents mix them up.',
          'Scenes (.tscn) and scripts (.gd) are text files, so the agent can read them: {mention} them.',
          'Ask for options: build the meadow when the game starts, or as an editor script? Pick one.',
          'Errors show in the Output and Debugger panels at the bottom — paste them exactly.',
        ],
        concept: { ...C_LIMITS, experiment: 'When it writes code, ask: “Is this Godot 4 or Godot 3? Check the Godot 4 docs.” Then look it up yourself.' },
        learning: 'Knowing what the agent can and can’t touch — and catching made-up answers.',
        sittings: [
          {
            title: 'Part A · Build the meadow',
            steps: ['Godot 4 project in 07-firefly-meadow', 'Told the agent your Godot version', '200 trees + rocks with a clear path', 'Fog + 6 coloured lights', 'Re-run makes no duplicates'],
          },
          {
            title: 'Part B · Build the firefly',
            steps: ['Got numbered editor steps', 'Firefly glows and bobs', 'Pickup works', '“Fireflies: 3/10” label', 'Win message'],
          },
          {
            title: 'Part C · Place the fireflies',
            steps: ['Script places 10 fireflies on the path', 'Asked “is this Godot 4?”', 'Full playthrough'],
          },
        ],
      },
      {
        id: 'alt-b',
        title: 'Coin Forest Obby',
        tagline: 'Your first Roblox world — with a script doing the heavy lifting.',
        tools: ['{tool}', 'Roblox Studio', 'Luau'],
        folder: '07-coin-forest',
        make: [
          'Part A · a Luau script that builds a forest of 200 trees and rocks around a winding path, with fog and 6 coloured lights. Settings at the top; no duplicates on re-run.',
          'Part B · you build a spinning, glowing coin yourself in Studio from the agent’s numbered steps: pickup on touch, a “Coins” leaderboard, a win message at 10.',
          'Part C · the script also places 10 coins along the path.',
        ],
        expected: 'Playtest in Studio: collect all 10 coins and see your win message.',
        tips: [
          'Roblox Studio is free. Its scripts live inside the place file, so you paste the agent’s code into a Script in Studio.',
          'Keep a copy of every script as a .luau file in your ai-quest folder so the agent can read and edit it.',
          'Errors show in View → Output. Paste them exactly.',
          'Ask: “Is this a real Roblox API? Check create.roblox.com/docs.”',
        ],
        concept: { ...C_LIMITS, experiment: 'When it uses a Roblox function, ask: “Is this real? Check create.roblox.com/docs.” Then look it up yourself.' },
        learning: 'Knowing what the agent can and can’t touch — and catching made-up answers.',
        sittings: [
          {
            title: 'Part A · Grow the forest',
            steps: ['New place in Roblox Studio', 'Script saved as a .luau file too', '200 trees + rocks with a path', 'Fog + 6 coloured lights', 'Re-run makes no duplicates'],
          },
          {
            title: 'Part B · Build the coin',
            steps: ['Got numbered Studio steps', 'Coin spins and glows', 'Pickup on touch', '“Coins” leaderboard', 'Win message at 10'],
          },
          {
            title: 'Part C · Place the coins',
            steps: ['Script places 10 coins on the path', 'Asked “is this a real API?”', 'Full playtest'],
          },
        ],
      },
    ],
  },

  // ────────────────────────────── Level 4 · Projects ──────────────────────────────
  {
    id: 't8',
    num: 8,
    level: 4,
    time: '5–8 h · 4 sittings',
    xp: 400,
    variants: [
      {
        id: 'main',
        title: 'Portfolio Site',
        tagline: 'Your work, your words, your site — and you’re the creative director.',
        tools: ['{tool}', 'Browser', 'Your art', 'Your writing'],
        folder: '08-portfolio',
        make: [
          'A raw/ folder of your work.',
          'about-me.txt and projects.txt, written by YOU.',
          'A project rule: “I’m not a coder, explain simply”, “never touch raw/”, “images under 500 KB”.',
          '{Plan} interviews you one question at a time, then the agent builds.',
        ],
        expected: 'A responsive site (check it in the DevTools phone view) — and raw/ is untouched.',
        stretch: 'Put it online with Netlify Drop.',
        tips: [RULES_TIP, INTERVIEW_TIP, PHONE_TIP, 'You’re the creative director: say no to anything that doesn’t feel like you.'],
        concept: C_RULES,
        learning: 'Standing instructions, being interviewed by the AI, and directing taste.',
        sittings: [
          { title: 'Gather + rules', steps: ['raw/ folder of your work', 'about-me.txt written by you', 'projects.txt written by you', 'Project rule file'] },
          { title: 'Interview + plan', steps: ['{Plan} interviewed you', 'Asked “what rules are you following?”', 'Approved the plan'] },
          { title: 'Build', steps: ['First build', 'Images under 500 KB', 'raw/ untouched'] },
          { title: 'Polish', steps: ['Phone view checked', 'Your 3 creative-director notes applied', 'Stretch: online with Netlify Drop'] },
        ],
      },
      {
        id: 'alt-a',
        title: 'Process Zine',
        tagline: 'A scroll-through zine of one project, from first sketch to final.',
        tools: ['{tool}', 'Browser', 'Your art', 'Your writing'],
        folder: '08-zine',
        make: [
          'Pick one project. A raw/ folder holds its sketches, WIPs and finals.',
          'zine.txt: the story of making it, page by page (8–12 pages), written by YOU.',
          'A project rule: “I’m not a coder, explain simply”, “never touch raw/”, “images under 500 KB”.',
          '{Plan} interviews you one question at a time, then the agent builds a scroll zine where each page snaps in with a transition.',
        ],
        expected: 'A responsive zine (check it in the DevTools phone view) — and raw/ is untouched.',
        stretch: 'Put it online with Netlify Drop.',
        tips: [RULES_TIP, INTERVIEW_TIP, PHONE_TIP, 'You’re the creative director: say no to anything that doesn’t feel like you.'],
        concept: C_RULES,
        learning: 'Standing instructions, being interviewed by the AI, and directing taste.',
        sittings: [
          { title: 'Gather + rules', steps: ['raw/ folder for one project', 'zine.txt written by you', 'Picked your 8–12 pages', 'Project rule file'] },
          { title: 'Interview + plan', steps: ['{Plan} interviewed you', 'Asked “what rules are you following?”', 'Approved the plan'] },
          { title: 'Build', steps: ['Pages snap in with transitions', 'Images under 500 KB', 'raw/ untouched'] },
          { title: 'Polish', steps: ['Phone view checked', 'Your 3 creative-director notes applied', 'Stretch: online with Netlify Drop'] },
        ],
      },
      {
        id: 'alt-b',
        title: 'Commission Shop Page',
        tagline: 'A one-page shop for your art commissions. Get paid for what you love.',
        tools: ['{tool}', 'Browser', 'Your art', 'Your writing'],
        folder: '08-commissions',
        make: [
          'A raw/ folder of your best 9–12 pieces.',
          'about-me.txt and prices.txt (3 tiers, what’s included, turnaround), written by YOU.',
          'A project rule: “I’m not a coder, explain simply”, “never touch raw/”, “images under 500 KB”.',
          '{Plan} interviews you one question at a time, then the agent builds: gallery with lightbox, price tiers, how it works, FAQ, a request form.',
        ],
        expected: 'A responsive shop page (check it in the DevTools phone view) — and raw/ is untouched.',
        stretch: 'Put it online with Netlify Drop, and ask the agent how to make the form actually reach you.',
        tips: [RULES_TIP, INTERVIEW_TIP, PHONE_TIP, 'You’re the creative director: say no to anything that doesn’t feel like you.'],
        concept: C_RULES,
        learning: 'Standing instructions, being interviewed by the AI, and directing taste.',
        sittings: [
          { title: 'Gather + rules', steps: ['raw/ folder of 9–12 pieces', 'about-me.txt written by you', 'prices.txt written by you', 'Project rule file'] },
          { title: 'Interview + plan', steps: ['{Plan} interviewed you', 'Asked “what rules are you following?”', 'Approved the plan'] },
          { title: 'Build', steps: ['Gallery, tiers, FAQ, form', 'Images under 500 KB', 'raw/ untouched'] },
          { title: 'Polish', steps: ['Phone view checked', 'Your 3 creative-director notes applied', 'Stretch: online with Netlify Drop'] },
        ],
      },
    ],
  },
  {
    id: 't9',
    num: 9,
    level: 4,
    time: '3–5 h · 2 sittings',
    xp: 350,
    variants: [
      {
        id: 'main',
        title: 'Blender → Web 360° Turntable',
        tagline: 'Spin your 3D model in any browser, on any phone.',
        tools: ['{tool}', 'Blender', 'Command line', 'Browser'],
        folder: '09-turntable',
        make: [
          '1 · Headless Blender (command line) renders 36 frames, 10° apart, with a transparent background.',
          '2 · viewer.html spins the model on drag or touch.',
          '3 · Add the viewer to your portfolio.',
        ],
        expected: 'Drag to spin your model in the browser — on laptop and phone — inside your portfolio.',
        tips: [
          BLENDER_PATHS,
          'Test 4 frames first, then all 36.',
          'Ask whether to rotate the model or orbit the camera — and why.',
        ],
        concept: C_SCALE,
        learning: 'Automating a creative app from the command line, and verifying instead of trusting.',
        sittings: [
          { title: 'Render', steps: ['Copied your .blend into 09-turntable', 'Asked: rotate model or orbit camera?', '4 test frames rendered + checked', 'All 36 frames rendered + counted'] },
          { title: 'Viewer', steps: ['viewer.html spins on drag', 'Works with touch on your phone', 'Added to your portfolio'] },
        ],
      },
      {
        id: 'alt-a',
        title: 'Sprite Sheet Factory',
        tagline: 'Turn a Blender animation into a game-ready sprite sheet.',
        tools: ['{tool}', 'Blender', 'Command line', 'Browser'],
        folder: '09-sprite-factory',
        make: [
          '1 · Headless Blender renders a short animation of your character or object (e.g. a 12-frame idle bounce) with a transparent background.',
          '2 · A script packs the frames into one sprite-sheet PNG.',
          '3 · preview.html plays the sheet, with a speed slider and frame-by-frame buttons.',
        ],
        expected: 'preview.html plays your sprite sheet smoothly — and the sheet is ready for your capstone game.',
        tips: [
          BLENDER_PATHS,
          'Test 4 frames first, then the full animation.',
          'Ask for options: pack the sheet with Blender’s own Python, or a separate tool? Pick one and say why.',
        ],
        concept: C_SCALE,
        learning: 'Automating a creative app from the command line, and verifying instead of trusting.',
        sittings: [
          { title: 'Render', steps: ['Copied your .blend into 09-sprite-factory', 'Asked for packing options', '4 test frames rendered + checked', 'Full animation rendered + counted'] },
          { title: 'Sheet + preview', steps: ['Frames packed into one PNG', 'preview.html plays it', 'Speed slider + frame stepping'] },
        ],
      },
      {
        id: 'alt-b',
        title: 'Lookdev Contact Sheet',
        tagline: 'One model, twelve moods — rendered while you make tea.',
        tools: ['{tool}', 'Blender', 'Command line', 'Browser'],
        folder: '09-lookdev',
        make: [
          '1 · Headless Blender renders one of your models with 4 lighting or material presets × 3 camera angles = 12 renders.',
          '2 · gallery.html shows them as a labelled contact sheet with a click-to-enlarge lightbox.',
          '3 · Add your favourite to your portfolio.',
        ],
        expected: 'gallery.html shows all 12 labelled renders, and any one enlarges on click.',
        tips: [
          BLENDER_PATHS,
          'Test 1 preset × 1 angle first, then all 12.',
          'Ask for options: one Blender run for everything, or one run per render? Pick one and say why.',
        ],
        concept: C_SCALE,
        learning: 'Automating a creative app from the command line, and verifying instead of trusting.',
        sittings: [
          { title: 'Render', steps: ['Copied your .blend into 09-lookdev', 'Asked for batching options', '1 test render checked', 'All 12 rendered + counted'] },
          { title: 'Contact sheet', steps: ['gallery.html with labels', 'Click-to-enlarge lightbox', 'Favourite added to your portfolio'] },
        ],
      },
    ],
  },
  {
    id: 't10',
    num: 10,
    level: 4,
    boss: true,
    time: '10–20 h · 9 sittings',
    xp: 1000,
    variants: [
      {
        id: 'main',
        title: 'Capstone: Browser Game on itch.io',
        tagline: 'The final boss. A real game, with your art, that anyone can play.',
        tools: ['{tool}', 'Browser', 'Blender', 'itch.io'],
        folder: '10-game',
        make: [
          '2–5 minutes of play, with your own art.',
          'A title screen, 3 levels, a score plus a saved high score.',
          'Sound and music, and an end screen.',
          'Process: you write game-design.md → {plan} turns it into milestones and recommends plain code vs Phaser (you decide) → one milestone per new chat, updating progress.md each time → backups or git → Blender sprites with your Task 9 technique → a friend playtests → publish.',
        ],
        expected: 'Your game is live on itch.io (zip with index.html at the root → Kind: HTML → “played in browser”), and a friend has played it start to finish.',
        tips: CAPSTONE_TIPS,
        concept: C_CAPSTONE,
        learning: 'Running a multi-day project with an agent — and shipping it.',
        sittings: [
          { title: 'Write game-design.md', steps: ['Idea, story + art style', 'The 3 levels described', 'What “fun” means for your game'] },
          { title: 'Plan milestones', steps: ['{Plan} turned it into milestones', 'Decided: plain code or Phaser', 'progress.md created'] },
          { title: 'Milestone · core play', steps: ['Player moves + core mechanic works', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · 3 levels', steps: ['3 levels playable', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · score + screens', steps: ['Score + saved high score', 'Title screen + end screen', 'Save point'] },
          { title: 'Sprites from Blender', steps: ['Rendered sprites (Task 9 technique)', 'Sprites in the game', 'Save point'] },
          { title: 'Sound + polish', steps: ['Sound effects + music', 'Your own polish list', 'Save point'] },
          { title: 'Playtest', steps: ['A friend played it start to finish', 'Fixed the top 3 issues', 'Save point'] },
          { title: 'Publish', steps: ['Zip with index.html at the root', 'itch.io: Kind = HTML, played in browser', 'Shared the link with your mentor'] },
        ],
      },
      {
        id: 'alt-a',
        title: 'Capstone: Godot Game on itch.io',
        tagline: 'The final boss, in Godot 4 — open source, and yours to keep learning.',
        tools: ['{tool}', 'Godot 4', 'GDScript', 'Blender', 'itch.io'],
        folder: '10-godot-game',
        make: [
          '2–5 minutes of play, with your own art, made in Godot 4 with GDScript.',
          'A title screen, 3 levels, a score plus a saved high score.',
          'Sound and music, and an end screen.',
          'Process: you write game-design.md → {plan} turns it into milestones → one milestone per new chat, updating progress.md each time → backups or git → Blender sprites/models with your Task 9 technique → a friend playtests → Web export → publish.',
        ],
        expected: 'Your game is live on itch.io and plays in the browser, and a friend has played it start to finish.',
        tips: [
          ...CAPSTONE_TIPS,
          'Web export needs Godot’s export templates. Ask which itch.io settings your Godot version needs for web games, then double-check the Godot docs (verify, don’t trust).',
        ],
        concept: C_CAPSTONE,
        learning: 'Running a multi-day project with an agent — and shipping it.',
        sittings: [
          { title: 'Write game-design.md', steps: ['Idea, story + art style', 'The 3 levels described', 'What “fun” means for your game'] },
          { title: 'Plan milestones', steps: ['{Plan} turned it into milestones', 'Godot version noted in progress.md', 'progress.md created'] },
          { title: 'Milestone · core play', steps: ['Player moves + core mechanic works', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · 3 levels', steps: ['3 levels playable', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · score + screens', steps: ['Score + saved high score', 'Title screen + end screen', 'Save point'] },
          { title: 'Art from Blender', steps: ['Rendered sprites/models (Task 9 technique)', 'Art in the game', 'Save point'] },
          { title: 'Sound + polish', steps: ['Sound effects + music', 'Your own polish list', 'Save point'] },
          { title: 'Playtest', steps: ['A friend played it start to finish', 'Fixed the top 3 issues', 'Save point'] },
          { title: 'Publish', steps: ['Web export works locally', 'itch.io: HTML, played in browser', 'Shared the link with your mentor'] },
        ],
      },
      {
        id: 'alt-b',
        title: 'Capstone: Roblox Experience',
        tagline: 'The final boss on Roblox — the first step toward earning from your games.',
        tools: ['{tool}', 'Roblox Studio', 'Luau', 'Blender'],
        folder: '10-roblox-game',
        make: [
          '2–5 minutes of play — an obby or collect-a-thon with your own art and style.',
          'A lobby/title area, 3 stages, a score or timer plus a saved best score.',
          'Sound and music, and an end celebration.',
          'Process: you write game-design.md → {plan} turns it into milestones → one milestone per new chat, updating progress.md each time → every script also saved as a .luau file → Blender models with your Task 9 skills → a friend playtests → publish.',
        ],
        expected: 'Your experience is public on Roblox, and a friend has played it start to finish.',
        tips: [
          ...CAPSTONE_TIPS,
          'Saved best scores use DataStores. Ask the agent what Studio needs to test them, then check create.roblox.com/docs.',
          'Stretch: read how Game Passes work on create.roblox.com/docs — that is how Roblox games earn Robux.',
        ],
        concept: C_CAPSTONE,
        learning: 'Running a multi-day project with an agent — and shipping it.',
        sittings: [
          { title: 'Write game-design.md', steps: ['Idea, theme + art style', 'The 3 stages described', 'What “fun” means for your game'] },
          { title: 'Plan milestones', steps: ['{Plan} turned it into milestones', 'Scripts folder for .luau copies', 'progress.md created'] },
          { title: 'Milestone · core play', steps: ['Movement + core mechanic works', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · 3 stages', steps: ['3 stages playable', 'progress.md updated', 'Save point'] },
          { title: 'Milestone · score + lobby', steps: ['Score/timer + saved best', 'Lobby + end celebration', 'Save point'] },
          { title: 'Models from Blender', steps: ['Your models imported', 'Art in the game', 'Save point'] },
          { title: 'Sound + polish', steps: ['Sound effects + music', 'Your own polish list', 'Save point'] },
          { title: 'Playtest', steps: ['A friend played it start to finish', 'Fixed the top 3 issues', 'Save point'] },
          { title: 'Publish', steps: ['Published from Studio', 'Set to Public', 'Shared the link with your mentor'] },
        ],
      },
    ],
  },
]

/** Look up a quest by id. */
export const questById = (id: string) => QUESTS.find((q) => q.id === id)

/** An official resource for an app a quest uses. `note` flags anything unusual (e.g. community-maintained). */
export type LearnLink = { label: string; url: string; note?: string }

/** Official docs for the apps the quests use, keyed by the quest tool chip they help with ('Blender', 'Godot 4'…). */
export const LEARN: Record<string, LearnLink[]> = {
  Blender: [
    { label: 'Blender Python API quickstart', url: 'https://docs.blender.org/api/current/info_quickstart.html' },
    { label: 'Blender from the command line', url: 'https://docs.blender.org/manual/en/latest/advanced/command_line/index.html' },
  ],
  Houdini: [{ label: 'Houdini Python (HOM) introduction', url: 'https://www.sidefx.com/docs/houdini/hom/intro.html' }],
  'After Effects': [{ label: 'After Effects Scripting Guide', url: 'https://ae-scripting.docsforadobe.dev/', note: 'community-maintained reference' }],
  ExtendScript: [{ label: 'After Effects Scripting Guide', url: 'https://ae-scripting.docsforadobe.dev/', note: 'community-maintained reference' }],
  'Unreal Engine': [{ label: 'Scripting the Unreal Editor using Python', url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python' }],
  'Godot 4': [{ label: 'Godot: Your first 3D game', url: 'https://docs.godotengine.org/en/stable/getting_started/first_3d_game/index.html' }],
  GDScript: [{ label: 'Godot: Your first 3D game', url: 'https://docs.godotengine.org/en/stable/getting_started/first_3d_game/index.html' }],
  'Roblox Studio': [{ label: 'Roblox: Scripting', url: 'https://create.roblox.com/docs/scripting' }],
  Luau: [{ label: 'Roblox: Scripting', url: 'https://create.roblox.com/docs/scripting' }],
  'itch.io': [{ label: 'itch.io: Uploading HTML5 games', url: 'https://itch.io/docs/creators/html5' }],
  Browser: [
    { label: 'MDN: Canvas tutorial', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial' },
  ],
  Music: [{ label: 'MDN: Using the Web Audio API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API' }],
  // Not mapped: 'Python' (the app-specific chip carries the Python docs), 'Netlify Drop' (no chip; t8's 'Your writing' is prose, not a deploy tool).
}

/**
 * Learn-more links for a variant: its tool chips' official docs, deduped by URL. A chip of
 * '{tool}', or the agent's name once variantOf has worded it, maps to that agent's official getting-started page.
 */
export const learnLinksFor = (tools: string[], setup: Setup = DEFAULT_SETUP): LearnLink[] => {
  const seen = new Set<string>()
  const out: LearnLink[] = []
  for (const chip of tools) {
    const agent = toolOf(setup.tool)
    const links = chip === '{tool}' || chip === agent.name ? (agent.start ? [agent.start] : []) : LEARN[chip] || []
    for (const l of links) if (!seen.has(l.url) && seen.add(l.url)) out.push(l)
  }
  return out
}

/** The concept pictures drawn by components/Diagram.tsx. */
export type DiagramName = 'loop' | 'brief' | 'context' | 'mcp' | 'delegate' | 'team'

/** Which picture belongs to a quest or pro level id (null = none). */
export const diagramFor = (id: string): DiagramName | null =>
  (({ t0: 'loop', t1: 'brief', t2: 'loop', t3: 'context', t4: 'loop', t8: 'context', p3: 'mcp', p5: 'delegate', p7: 'team' }) as Record<string, DiagramName>)[id] ?? null

// Worded variants are cached per tool + OS, so each one is one stable object (cheap to
// call in loops, and safe as a React dependency).
const worded = new Map<string, Variant>()

/**
 * The variant a quest is currently set to (falls back to main for unknown ids), with its
 * tool slots filled for the learner's setup. Leave `setup` out where only the shape
 * matters (ids, step counts, titles): the default is the Kilo Code wording.
 */
export const variantOf = (q: Quest, variantId?: string, setup: Setup = DEFAULT_SETUP): Variant => {
  const v = q.variants.find((x) => x.id === variantId) || q.variants[0]
  const key = `${q.id}:${v.id}:${setup.tool}:${setup.os}`
  let out = worded.get(key)
  if (!out) {
    const f = (s: string) => forTool(s, setup)
    out = {
      ...v,
      title: f(v.title),
      tagline: f(v.tagline),
      tools: [...new Set(v.tools.map(f))],
      make: v.make.map(f),
      expected: f(v.expected),
      stretch: v.stretch && f(v.stretch),
      tips: v.tips.map(f),
      concept: { name: f(v.concept.name), body: f(v.concept.body), experiment: v.concept.experiment && f(v.concept.experiment) },
      learning: f(v.learning),
      sittings: v.sittings.map((s) => ({ title: f(s.title), steps: s.steps.map(f) })),
    }
    worded.set(key, out)
  }
  return out
}

// ───────────────────────────────── Field guide ─────────────────────────────────

export const BRIEF_RECIPE = [
  { k: 'Goal', v: 'What you want to exist at the end, in one sentence.' },
  { k: 'Context', v: 'The files ({mention} them), your app + version, and what you already tried.' },
  { k: 'Constraints', v: 'The must-haves and must-nots: “works by double-click”, “don’t touch raw/”.' },
  { k: 'Done when', v: 'How you’ll know it worked — the quest’s expected output.' },
]

export const FREE_TIER_HABITS = [
  'From Quest 6 on, take smaller steps.',
  'New chat for each piece of work.',
  '{Mention} only the files that matter.',
  'Try a different model before blaming yourself.',
  'Rate-limited? Wait a bit, or switch models.',
]

export const WHEN_STUCK = [
  'Same error 3 times → start a fresh chat ({newChat}) and describe it from scratch.',
  'Describe what you SEE, not what you think is wrong.',
  'Rate-limited → switch model.',
  'Ask: “Explain what you just did in 3 bullets.”',
  'Never approve a deletion you don’t understand.',
]

export const UPGRADE_SIGNS = [
  'You’ve finished Quest 8+ and actually use what you built.',
  'You’re using it on your own work, not just quests.',
  'You keep hitting free-model limits despite good habits.',
  'Stuck before Quest 6? Upgrading won’t help — ask Spark or your mentor instead.',
]

export const DAY_RULES = [
  'Stop at a working point and note what’s next.',
  'If a day’s job takes over double its time, stop and get help.',
  'Ahead of schedule? Add your own idea instead of starting the next quest.',
  'Send a check-in screenshot on each deadline.',
  'The capstone never uses one chat across days.',
]
