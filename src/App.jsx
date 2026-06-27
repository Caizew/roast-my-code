import { useState, useRef, useEffect } from "react";

/* localStorage shim (replaces the in-artifact window.storage) */
const store = {
  async get(k) { const v = localStorage.getItem(k); return v == null ? null : { key: k, value: v }; },
  async set(k, v) { localStorage.setItem(k, v); return { key: k, value: v }; },
  async delete(k) { localStorage.removeItem(k); return { key: k, deleted: true }; },
};

/* ============================================================
   ROAST MY CODE — a fighting-game code review arena
   Two Claude personas brawl over your code, a Judge rules.
   Voice = browser TTS. Meme SFX = synthesized Web Audio.
   ============================================================ */

const C = {
  void: "#0b0710",
  arena: "#160d24",
  panel: "#1f1230",
  cyan: "#2ff3df",
  magma: "#ff2e63",
  acid: "#ffe347",
  bone: "#f4ecff",
  dim: "#8a7da3",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Web Audio meme SFX ---------------- */
let _ac = null;
function ac() {
  try {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === "suspended") _ac.resume();
    return _ac;
  } catch (e) {
    return null;
  }
}
function tone({ freq = 440, type = "sine", dur = 0.2, gain = 0.25, slideTo = null, delay = 0 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}
function noise({ dur = 0.2, gain = 0.25, delay = 0, hp = null }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = src;
  if (hp) {
    const f = a.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    src.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(a.destination);
  src.start(t0);
  src.stop(t0 + dur);
}
const SFX = {
  on: true,
  vineBoom() {
    if (!this.on) return;
    tone({ freq: 150, slideTo: 38, type: "sine", dur: 0.85, gain: 0.55 });
    tone({ freq: 80, slideTo: 30, type: "sine", dur: 0.9, gain: 0.4, delay: 0.02 });
  },
  airhorn() {
    if (!this.on) return;
    [0, 0.18, 0.36].forEach((d, i) => {
      tone({ freq: 415 + i * 6, type: "sawtooth", dur: 0.14, gain: 0.22, delay: d });
      tone({ freq: 312 + i * 4, type: "sawtooth", dur: 0.14, gain: 0.18, delay: d });
    });
  },
  baDumTss() {
    if (!this.on) return;
    tone({ freq: 190, type: "sine", dur: 0.12, gain: 0.4, delay: 0 });
    tone({ freq: 150, type: "sine", dur: 0.14, gain: 0.4, delay: 0.16 });
    noise({ dur: 0.4, gain: 0.16, delay: 0.32, hp: 5000 });
  },
  sadTrombone() {
    if (!this.on) return;
    const notes = [233, 207, 185, 155];
    notes.forEach((f, i) =>
      tone({ freq: f, slideTo: f * 0.92, type: "sawtooth", dur: 0.32, gain: 0.22, delay: i * 0.3 })
    );
  },
  ko() {
    if (!this.on) return;
    noise({ dur: 0.5, gain: 0.4, hp: 200 });
    tone({ freq: 110, slideTo: 35, type: "square", dur: 0.6, gain: 0.45 });
  },
  hit() {
    if (!this.on) return;
    noise({ dur: 0.08, gain: 0.22, hp: 2500 });
    tone({ freq: 880, slideTo: 400, type: "square", dur: 0.08, gain: 0.12 });
  },
  ding() {
    if (!this.on) return;
    tone({ freq: 1320, type: "sine", dur: 0.12, gain: 0.2 });
    tone({ freq: 1760, type: "sine", dur: 0.18, gain: 0.16, delay: 0.06 });
  },
  laugh(deep) {
    if (!this.on) return;
    const a = ac();
    if (!a) return;
    const base = deep ? 135 : 300;
    const syl = deep ? 6 : 4;
    let t = a.currentTime;
    for (let i = 0; i < syl; i++) {
      const dur = deep ? 0.16 : 0.12;
      const f = base * (1 - i * 0.05) * (i % 2 === 0 ? 1 : 0.9);
      const osc = a.createOscillator();
      const g = a.createGain();
      const bp = a.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = deep ? 650 : 1100;
      bp.Q.value = 5;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f * 1.08, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, f), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(deep ? 0.5 : 0.34, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(bp);
      bp.connect(g);
      g.connect(a.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
      // breathy "h" transient per syllable
      const nlen = Math.floor(a.sampleRate * 0.03);
      const nbuf = a.createBuffer(1, nlen, a.sampleRate);
      const nd = nbuf.getChannelData(0);
      for (let k = 0; k < nlen; k++) nd[k] = (Math.random() * 2 - 1) * 0.3;
      const nsrc = a.createBufferSource();
      nsrc.buffer = nbuf;
      const ng = a.createGain();
      ng.gain.setValueAtTime(0.12, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      const nf = a.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 1500;
      nsrc.connect(nf);
      nf.connect(ng);
      ng.connect(a.destination);
      nsrc.start(t);
      nsrc.stop(t + 0.04);
      t += dur + (deep ? 0.06 : 0.05);
    }
  },
  victory() {
    if (!this.on) return;
    const notes = [523, 659, 784, 1047]; // C E G C — bright major arpeggio
    notes.forEach((f, i) => {
      tone({ freq: f, type: "triangle", dur: 0.2, gain: 0.32, delay: i * 0.11 });
      tone({ freq: f * 2, type: "sine", dur: 0.16, gain: 0.1, delay: i * 0.11 });
    });
    tone({ freq: 1568, type: "sine", dur: 0.45, gain: 0.18, delay: 0.5 });
    tone({ freq: 2093, type: "sine", dur: 0.4, gain: 0.12, delay: 0.55 });
  },
  laughDeep() {
    this.laugh(true);
  },
  bruh() {
    if (!this.on) return;
    tone({ freq: 180, slideTo: 68, type: "sawtooth", dur: 0.55, gain: 0.42 });
    tone({ freq: 360, slideTo: 138, type: "sine", dur: 0.55, gain: 0.16 });
  },
  recordScratch() {
    if (!this.on) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime;
    const len = Math.floor(a.sampleRate * 0.5);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 8;
    bp.frequency.setValueAtTime(300, t0);
    bp.frequency.linearRampToValueAtTime(2200, t0 + 0.12);
    bp.frequency.linearRampToValueAtTime(180, t0 + 0.24);
    bp.frequency.linearRampToValueAtTime(1600, t0 + 0.36);
    bp.frequency.linearRampToValueAtTime(220, t0 + 0.5);
    const g = a.createGain();
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    src.connect(bp);
    bp.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 0.5);
  },
  drumroll() {
    if (!this.on) return;
    for (let i = 0; i < 22; i++) noise({ dur: 0.04, gain: 0.1 + i * 0.004, delay: i * 0.05, hp: 1400 });
    noise({ dur: 0.3, gain: 0.32, delay: 1.1, hp: 200 });
    tone({ freq: 200, slideTo: 80, type: "sine", dur: 0.3, gain: 0.3, delay: 1.1 });
  },
  crickets() {
    if (!this.on) return;
    [0, 0.5, 1.0].forEach((d) => {
      tone({ freq: 2400, type: "sine", dur: 0.04, gain: 0.13, delay: d });
      tone({ freq: 2650, type: "sine", dur: 0.04, gain: 0.1, delay: d + 0.08 });
    });
  },
  crowdOhh() {
    if (!this.on) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime;
    const len = Math.floor(a.sampleRate * 1.1);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(480, t0);
    bp.frequency.linearRampToValueAtTime(900, t0 + 0.4);
    bp.frequency.linearRampToValueAtTime(380, t0 + 1.0);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.3, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    src.connect(bp);
    bp.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 1.1);
    tone({ freq: 300, slideTo: 250, type: "sawtooth", dur: 0.9, gain: 0.07, delay: 0.2 });
  },
  buzzer() {
    if (!this.on) return;
    tone({ freq: 140, type: "sawtooth", dur: 0.5, gain: 0.35 });
    tone({ freq: 143, type: "square", dur: 0.5, gain: 0.18 });
  },
  boing() {
    if (!this.on) return;
    tone({ freq: 420, slideTo: 120, type: "sine", dur: 0.3, gain: 0.3 });
    tone({ freq: 120, slideTo: 420, type: "sine", dur: 0.22, gain: 0.14, delay: 0.28 });
  },
  jackpot() {
    if (!this.on) return;
    for (let i = 0; i < 8; i++) tone({ freq: 760 + i * 130, type: "square", dur: 0.08, gain: 0.18, delay: i * 0.06 });
    tone({ freq: 1600, type: "sine", dur: 0.4, gain: 0.16, delay: 0.5 });
    tone({ freq: 2400, type: "sine", dur: 0.35, gain: 0.1, delay: 0.55 });
  },
};

/* ---------------- Text to speech ---------------- */
const TTS = { on: false, voices: [] };
function warmVoices() {
  if (!window.speechSynthesis) return;
  TTS.voices = window.speechSynthesis.getVoices() || [];
  window.speechSynthesis.onvoiceschanged = () => {
    TTS.voices = window.speechSynthesis.getVoices() || [];
  };
}
function pickVoice(idx) {
  const en = TTS.voices.filter((v) => /en[-_]/i.test(v.lang));
  const pool = en.length ? en : TTS.voices;
  if (!pool.length) return null;
  return pool[idx % pool.length];
}
function speak(text, persona) {
  if (!TTS.on || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 230));
    if (persona === "roaster") {
      u.rate = 1.18;
      u.pitch = 0.6;
      u.voice = pickVoice(1);
    } else if (persona === "defender") {
      u.rate = 1.02;
      u.pitch = 1.15;
      u.voice = pickVoice(0);
    } else {
      u.rate = 0.92;
      u.pitch = 0.85;
      u.voice = pickVoice(2);
    }
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------------- Claude API ---------------- */
async function callClaude(system, userContent) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) throw new Error("API " + res.status);
  const data = await res.json();
  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

/* ---------------- Prompts ---------------- */
const ROAST_TONE = {
  professional: "lowkey mode — pretty chill, friendly, just gently calls out the messy bits with light slang",
  savage: "no-chill mode — funny Gen Z roast energy, lots of slang, drags the code but keeps it playful",
  unhinged:
    "fully feral Gen Z — pure chaos, skull-emoji energy, dramatic 'THIS CODE IS SO COOKED' vibes — but still points out the actual real problems",
};
function langLine(lang) {
  return lang === "uz"
    ? "VERY IMPORTANT: Write your ENTIRE reply ONLY in Uzbek (o'zbek tilida). Use casual, funny, simple everyday Uzbek a young developer would use. Do NOT write English sentences."
    : "Write your reply in English.";
}
function roasterSystem(tone) {
  return `You are THE ROASTER in a code battle and you talk like a funny Gen Z coder online. Roast the user's code: point out bugs, stuff that'll break, and messy parts.
Keep it SIMPLE — everyday words + Gen Z slang (cooked, no cap, mid, it's giving, lowkey, bro really, 💀). NO heavy jargon — talk like texting a friend who JUST started coding.
Vibe: ${ROAST_TONE[tone]}.
Rules: under 70 words. Roast the CODE, never the person. Your very last line must be [HIT:n], n is 0-40 = how bad your strongest real point is. Nothing after the tag.`;
}
const TEACHER_SYSTEM = `You are THE TEACHER — a chill, funny mentor in a code battle. The Roaster just dragged the user's code. Your job is to actually TEACH: in simple words, explain WHAT is really going on and HOW to fix it, and stick up for the learner when the Roaster is too harsh. Warm, a little witty, never condescending.
Keep it SIMPLE — short sentences, everyday words, a tiny bit of slang is fine. Give ONE clear, concrete fix they can actually do. NO heavy jargon.
Rules: under 80 words. Your very last line must be [BLOCK:n], n is 0-40 = how strong/clear your lesson is. Nothing after the tag.`;
const JUDGE_SYSTEM = `You are THE JUDGE of a code battle. Read the code and the Roaster-vs-Teacher debate and give the final call. Only count problems that are actually real.
Explain everything in SIMPLE plain words a total beginner understands. No heavy jargon. A little Gen Z flavor is fine.
Return ONLY a JSON object — no markdown, no backticks, no extra text — exactly like this:
{
  "winner": "roaster" | "teacher" | "draw",
  "verdict": "one short punchy sentence",
  "issues": [ { "title": "short simple name", "severity": "critical" | "major" | "minor", "explanation": "one simple sentence that INCLUDES how to fix it" } ],
  "fixedCode": "the fully fixed code as one string",
  "challenge": "one small concrete task telling the user to fix ONE specific thing themselves, in simple friendly words",
  "stat": "one funny one-line stat about this code"
}
If the code is fine, "issues" can be empty and "winner" is "teacher". Keep "fixedCode" complete and working. JSON only.`;
const GRADER_SYSTEM = `You are THE TEACHER grading a student's fix attempt. You get the ORIGINAL code, the CHALLENGE you set, and the student's NEW attempt. Decide if they actually fixed the thing.
Be encouraging and funny. Explain simply. If they're wrong, give a real HINT (don't just hand over the answer).
Return ONLY a JSON object — no markdown, no backticks — exactly:
{
  "passed": true | false,
  "feedback": "one or two simple friendly sentences",
  "roast": "one short funny one-liner from the Roaster reacting to the attempt"
}
JSON only.`;

function buildUser(code, language, transcript, instruction) {
  return `LANGUAGE: ${language}

CODE UNDER REVIEW:
\`\`\`
${code}
\`\`\`
${transcript ? "\nFIGHT SO FAR:\n" + transcript + "\n" : ""}
${instruction}`;
}

function parseTag(text) {
  const m = text.match(/\[(HIT|BLOCK)\s*:\s*(\d+)\]/i);
  let dmg = m ? Math.min(40, parseInt(m[2], 10) || 0) : 0;
  const clean = text.replace(/\[(HIT|BLOCK)\s*:\s*\d+\]/gi, "").trim();
  if (!m) dmg = 8 + Math.floor(Math.random() * 12);
  return { clean, dmg };
}
function extractJSON(text) {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

function cringeFrom(issues, defHealth) {
  const pts = (issues || []).reduce(
    (s, i) => s + (i.severity === "critical" ? 34 : i.severity === "major" ? 18 : 8),
    0
  );
  return Math.max(0, Math.min(100, Math.round(pts + (100 - defHealth) * 0.4)));
}
function rankFor(score, lang) {
  const uz = lang === "uz";
  if (score <= 10) return { t: uz ? "Haqiqiy Zo'r Dasturchi" : "Certified W Coder", e: "🏆", c: "#2ff3df" };
  if (score <= 25) return { t: uz ? "Ancha Toza, Rosti" : "Pretty Clean Honestly", e: "🧼", c: "#2ff3df" };
  if (score <= 45) return { t: uz ? "O'rtacha (Yaxshi Ma'noda)" : "Mid (Affectionate)", e: "🤷", c: "#ffe347" };
  if (score <= 65) return { t: uz ? "Biroz Kuygan" : "Slightly Cooked", e: "🍳", c: "#ffe347" };
  if (score <= 85) return { t: uz ? "Sho'rva Oshpazi" : "Certified Spaghetti Chef", e: "🍝", c: "#ff2e63" };
  return { t: uz ? "Butunlay Kuygan" : "Absolutely Cooked", e: "💀🔥", c: "#ff2e63" };
}

/* ---------------- Scouting report (client-side, no API) ---------------- */
function scout(code, lang) {
  const uz = lang === "uz";
  const out = [];
  const push = (s) => out.length < 4 && out.push(s);
  if (/\bvar\s+/.test(code)) push(uz ? "Hali ham `var`? 💀 2015-yil hidi keladi." : "Bro still using `var`? 💀 it's giving 2015.");
  if (/[^=!<>]==[^=]/.test(code)) push(uz ? "`==` ko'rindi. lowkey g'alati xatolar chiqaradi." : "Loose `==` spotted. lowkey gonna cause weird bugs.");
  if (/console\.log/.test(code)) push(uz ? "Hamma yerda console.log 😭 debug rejimi fr." : "console.log everywhere lol. debugging arc fr.");
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(code)) push(uz ? "Bo'sh catch bloki = xatolar yo'qolib ketadi 😭" : "Empty catch block = errors just vanish into the void 😭");
  if (/TODO|FIXME|HACK/i.test(code)) push(uz ? "TODO izohlari... kelajakdagi o'zingga muammo." : "TODO comments... we love a future-you problem.");
  if (/function[^(]*\([^)]{40,}\)/.test(code)) push(uz ? "Bu funksiya 10 ta narsa oladi, biroz sekinroq." : "This function takes like 10 things bro chill.");
  if (/\bany\b/.test(code)) push(uz ? "`any` bor. type-checker taslim bo'ldi." : "`any` in there. the type checker straight up gave up.");
  return out;
}

const EXAMPLES = {
  "Cooked average": `function avg(nums) {
  var total = 0;
  for (var i = 0; i <= nums.length; i++) {
    total += nums[i];
  }
  return total / nums.length;
}`,
  "Sus login": `async function login(user, pass) {
  let users = await db.query("SELECT * FROM users WHERE name='" + user + "'");
  if (users[0].password == pass) {
    return true;
  }
}`,
};

const THINKING = {
  en: {
    roaster: ["cooking", "loading the roast", "typing furiously", "screenshotting this", "sharpening claws"],
    defender: ["explaining patiently", "grabbing the chalk", "drawing a diagram", "finding the lesson", "rolling up sleeves"],
    judge: ["watching the replay", "thinking real hard", "weighing it up"],
  },
  uz: {
    roaster: ["pishiryapti", "tanqid tayyorlayapti", "tez yozyapti", "skrinshot olyapti", "tirnoqlarini charxlayapti"],
    defender: ["sabr bilan tushuntiryapti", "boʻr olyapti", "diagramma chizyapti", "darsni topyapti", "yenglarini shimaryapti"],
    judge: ["qaytadan koʻryapti", "qattiq oʻylayapti", "tarozida tortyapti"],
  },
};
const rand = (a) => a[Math.floor(Math.random() * a.length)];

const SOUNDS = [
  ["📢 Air Horn", "airhorn"],
  ["💥 Vine Boom", "vineBoom"],
  ["😐 Bruh", "bruh"],
  ["🥁 Ba-Dum-Tss", "baDumTss"],
  ["🎺 Sad Trombone", "sadTrombone"],
  ["💿 Record Scratch", "recordScratch"],
  ["🦗 Crickets", "crickets"],
  ["🟠 Boing", "boing"],
  ["❌ Buzzer", "buzzer"],
  ["😮 Crowd Ohh", "crowdOhh"],
  ["🥁 Drumroll", "drumroll"],
  ["😈 Evil Laugh", "laughDeep"],
  ["🎉 Win Jingle", "victory"],
  ["🎰 Jackpot", "jackpot"],
];

const STR = {
  drop: { en: "▸ DROP YOUR CODE HERE", uz: "▸ KODINGIZNI BU YERGA TASHLANG" },
  placeholder: { en: "// paste your code here and let them cook...", uz: "// kodingizni shu yerga tashla, qani koʻramiz..." },
  noCode: { en: "no code? try one of these 👇", uz: "kod yoʻqmi? mana bularni sina 👇" },
  scouting: { en: "⚑ SCOUTING REPORT", uz: "⚑ DASTLABKI TEKSHIRUV" },
  langLabel: { en: "CODE LANGUAGE", uz: "DASTURLASH TILI" },
  intensity: { en: "ROASTER INTENSITY", uz: "TANQIDCHI DARAJASI" },
  optLow: { en: "Lowkey · chill roast", uz: "Yumshoq · xotirjam" },
  optMid: { en: "No chill · funny & mean", uz: "Shafqatsiz · kulgili" },
  optFeral: { en: "Feral · pure chaos 💀", uz: "Vahshiy · toʻliq xaos 💀" },
  fight: { en: "⚔ FIGHT", uz: "⚔ JANG BOSHLASH" },
  hint: {
    en: "two AIs fight over your code, then a judge picks a winner and fixes it up. easy. 💀",
    uz: "ikki AI kodingiz ustida bahslashadi, hakam gʻolibni tanlab kodni tuzatadi. oson. 💀",
  },
  soundboard: { en: "🎛️ MEME SOUNDBOARD — go nuts", uz: "🎛️ MEME OVOZLAR — maza qil" },
  hall: { en: "🏆 HALL OF SHAME · best", uz: "🏆 SHARMANDALIK ZALI · eng yaxshi" },
  clear: { en: "clear", uz: "tozalash" },
  teacher: { en: "🎓 THE TEACHER", uz: "🎓 USTOZ" },
  roaster: { en: "THE ROASTER 🔥", uz: "TANQIDCHI 🔥" },
  teacherName: { en: "The Teacher", uz: "Ustoz" },
  roasterName: { en: "The Roaster", uz: "Tanqidchi" },
  judgeName: { en: "The Judge", uz: "Hakam" },
  done: { en: "DONE", uz: "TUGADI" },
  winTeacher: { en: "WINNER: THE TEACHER 🎓", uz: "GʻOLIB: USTOZ 🎓" },
  winRoaster: { en: "WINNER: THE ROASTER 🔥", uz: "GʻOLIB: TANQIDCHI 🔥" },
  draw: { en: "DRAW", uz: "DURRANG" },
  cringe: { en: "CRINGE METER · lower = cleaner code", uz: "UYAT DARAJASI · pastroq = tozaroq kod" },
  validHits: { en: "VALID HITS", uz: "HAQIQIY XATOLAR" },
  fixedCode: { en: "FIXED CODE", uz: "TUZATILGAN KOD" },
  copy: { en: "COPY", uz: "NUSXA" },
  copied: { en: "✓ COPIED", uz: "✓ NUSXALANDI" },
  rematch: { en: "↻ REMATCH", uz: "↻ QAYTA JANG" },
  newCode: { en: "NEW CODE", uz: "YANGI KOD" },
  cleanMsg: { en: "No surviving hits. The code walks out clean. 🏆", uz: "Birorta xato qolmadi. Kod toza chiqdi. 🏆" },
  yourTurn: { en: "📝 YOUR TURN — fix it yourself", uz: "📝 SENING NAVBATING — oʻzing tuzat" },
  challengeLbl: { en: "Teacher's task:", uz: "Ustozning topshirigʻi:" },
  fixPlaceholder: { en: "// write your fixed version here...", uz: "// tuzatilgan variantni shu yerga yoz..." },
  checkFix: { en: "✓ CHECK MY FIX", uz: "✓ TEKSHIRIB BER" },
  checking: { en: "Teacher is checking", uz: "Ustoz tekshiryapti" },
  tryAgain: { en: "TRY AGAIN", uz: "QAYTA URIN" },
  nailed: { en: "YOU NAILED IT! 🎉", uz: "QOYIL QILDING! 🎉" },
  notYet: { en: "NOT QUITE YET 🤔", uz: "HALI EMAS 🤔" },
  errMsg: {
    en: "The fighters got stuck in traffic. Check your connection and try the rematch.",
    uz: "Jangchilar yoʻlda qolib ketdi. Internetni tekshirib qayta urin.",
  },
};

/* ---------------- Typewriter speech bubble ---------------- */
function Bubble({ msg, animate }) {
  const isR = msg.who === "roaster";
  const isJ = msg.who === "judge";
  const accent = isJ ? C.acid : isR ? C.magma : C.cyan;
  const [shown, setShown] = useState(animate ? "" : msg.text);
  useEffect(() => {
    if (!animate) {
      setShown(msg.text);
      return;
    }
    let i = 0;
    setShown("");
    const id = setInterval(() => {
      i += 2;
      setShown(msg.text.slice(0, i));
      if (i >= msg.text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [msg.text, animate]);
  return (
    <div className="rmc-row" style={{ justifyContent: isR ? "flex-end" : "flex-start" }}>
      <div
        className="rmc-bubble"
        style={{
          borderColor: accent,
          background: isR ? "rgba(255,46,99,0.08)" : isJ ? "rgba(255,227,71,0.08)" : "rgba(47,243,223,0.07)",
          boxShadow: `5px 5px 0 ${accent}`,
        }}
      >
        <div className="rmc-bubble-name" style={{ color: accent }}>
          {msg.name}
        </div>
        <div className="rmc-bubble-text">{shown}</div>
      </div>
    </div>
  );
}

/* ---------------- Health bar ---------------- */
function Health({ value, color, align }) {
  const c = value > 55 ? color : value > 25 ? C.acid : C.magma;
  return (
    <div className="rmc-hp" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
      <div className="rmc-hp-track">
        <div
          className="rmc-hp-fill"
          style={{
            width: Math.max(0, value) + "%",
            background: c,
            marginLeft: align === "right" ? "auto" : 0,
            boxShadow: `0 0 12px ${c}`,
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("input"); // input | fighting | verdict
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [mode, setMode] = useState("savage");
  const [sound, setSound] = useState(true);
  const [voice, setVoice] = useState(false);

  const [convo, setConvo] = useState([]);
  const [round, setRound] = useState(0);
  const [dh, setDh] = useState(100);
  const [rh, setRh] = useState(100);
  const [thinking, setThinking] = useState(null); // {who, label}
  const [flash, setFlash] = useState(null); // big centered text
  const [shake, setShake] = useState(0);
  const [pops, setPops] = useState([]); // floating dmg numbers
  const [verdict, setVerdict] = useState(null);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState(null); // {text, color}
  const [boardOpen, setBoardOpen] = useState(true);
  const [shame, setShame] = useState([]);
  const [lang, setLang] = useState("en"); // en | uz
  const [attempt, setAttempt] = useState("");
  const [grade, setGrade] = useState(null); // {passed, feedback, roast}
  const [grading, setGrading] = useState(false);

  const L = (id) => (STR[id] ? STR[id][lang] : id);

  const feedRef = useRef(null);
  const popId = useRef(0);

  useEffect(() => {
    warmVoices();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        if (!store) return;
        const r = await store.get("rmc-shame");
        if (r && r.value) setShame(JSON.parse(r.value));
      } catch (e) {}
    })();
  }, []);
  useEffect(() => {
    SFX.on = sound;
  }, [sound]);
  useEffect(() => {
    TTS.on = voice;
    if (!voice && window.speechSynthesis) window.speechSynthesis.cancel();
  }, [voice]);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [convo, thinking]);

  function showFlash(t, ms = 900) {
    setFlash(t);
    setTimeout(() => setFlash(null), ms);
  }
  function pop(side, value) {
    const id = ++popId.current;
    setPops((p) => [...p, { id, side, value }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  }
  function doShake(mag) {
    setShake(mag);
    setTimeout(() => setShake(0), 320);
  }
  function board(key) {
    SFX.on = true;
    if (!sound) setSound(true);
    ac();
    const f = SFX[key];
    if (typeof f === "function") f.call(SFX);
  }
  async function saveShame(entry) {
    let arr = [entry, ...shame].slice(0, 20);
    setShame(arr);
    try {
      if (store) await store.set("rmc-shame", JSON.stringify(arr), false);
    } catch (e) {}
  }
  async function clearShame() {
    setShame([]);
    try {
      if (store) await store.delete("rmc-shame", false);
    } catch (e) {}
  }
  async function checkFix() {
    if (!attempt.trim() || !verdict) return;
    SFX.on = sound;
    ac();
    setGrading(true);
    setGrade(null);
    try {
      const sys = GRADER_SYSTEM + "\n\n" + langLine(lang);
      const challenge =
        verdict.challenge || (verdict.issues && verdict.issues[0] ? verdict.issues[0].title : "Fix the main problem.");
      const userContent = `ORIGINAL CODE:
\`\`\`
${code}
\`\`\`

CHALLENGE: ${challenge}

STUDENT'S ATTEMPT:
\`\`\`
${attempt}
\`\`\`

Grade it as JSON.`;
      const raw = await callClaude(sys, userContent);
      let g;
      try {
        g = extractJSON(raw);
      } catch (e) {
        g = { passed: false, feedback: raw.slice(0, 220), roast: "the judge needs new glasses lol" };
      }
      setGrade(g);
      if (g.passed) {
        SFX.victory();
        showFlash(L("nailed"), 1100);
      } else {
        SFX.buzzer();
      }
    } catch (e) {
      setGrade({ passed: false, feedback: L("errMsg"), roast: "" });
    }
    setGrading(false);
  }

  const transcriptText = (arr) => arr.map((m) => `${m.name.toUpperCase()}: ${m.text}`).join("\n\n");

  async function runFight() {
    ac(); // unlock audio on user gesture
    setErr(null);
    setVerdict(null);
    setConvo([]);
    setAnnounce(null);
    setAttempt("");
    setGrade(null);
    setDh(100);
    setRh(100);
    setRound(1);
    setPhase("fighting");

    let convoLocal = [];
    let hp = { d: 100, r: 100 };
    const tk = THINKING[lang];

    const turns = [
      { who: "roaster", round: 1, name: L("roasterName") },
      { who: "defender", round: 1, name: L("teacherName") },
      { who: "roaster", round: 2, name: L("roasterName") },
      { who: "defender", round: 2, name: L("teacherName") },
    ];

    try {
      let curRound = 0;
      for (const turn of turns) {
        if (turn.round !== curRound) {
          curRound = turn.round;
          setRound(curRound);
          SFX.airhorn();
          showFlash(`ROUND ${curRound}`, 750);
          await sleep(800);
        }
        setThinking({ who: turn.who, label: rand(tk[turn.who]) });
        const sys = (turn.who === "roaster" ? roasterSystem(mode) : TEACHER_SYSTEM) + "\n\n" + langLine(lang);
        const instr = turn.who === "roaster" ? "Deliver your roast now." : "Teach the fix now.";
        const raw = await callClaude(sys, buildUser(code, language, transcriptText(convoLocal), instr));
        const { clean, dmg } = parseTag(raw);
        setThinking(null);

        const msg = { who: turn.who, name: turn.name, text: clean || "..." };
        convoLocal = [...convoLocal, msg];
        setConvo(convoLocal);
        speak(clean, turn.who);

        // apply damage to the OTHER fighter
        await sleep(250);
        if (turn.who === "roaster") {
          hp.d = Math.max(0, hp.d - dmg);
          setDh(hp.d);
          pop("left", dmg);
        } else {
          hp.r = Math.max(0, hp.r - dmg);
          setRh(hp.r);
          pop("right", dmg);
        }
        const isRoaster = turn.who === "roaster";
        const uz = lang === "uz";
        if (dmg >= 30) {
          doShake(16);
          setAnnounce({
            text: isRoaster ? (uz ? "SHAFQATSIZ! 💀" : "BRUTAL! 💀") : uz ? "ZOʻR HIMOYA! 🎓" : "GREAT LESSON! 🎓",
            color: isRoaster ? C.magma : C.cyan,
          });
          SFX.crowdOhh();
          if (isRoaster) SFX.laugh(true);
          else SFX.vineBoom();
        } else if (dmg >= 22) {
          doShake(10);
          setAnnounce({
            text: isRoaster ? (uz ? "ACHCHIQ! 🔥" : "SAVAGE! 🔥") : uz ? "BARAKALLA!" : "NICE ONE!",
            color: isRoaster ? C.magma : C.cyan,
          });
          SFX.hit();
          if (isRoaster) SFX.laugh(false);
        } else if (dmg >= 14) {
          doShake(7);
          SFX.hit();
          if (isRoaster && mode !== "professional") SFX.laugh(false);
        } else {
          SFX.hit();
        }
        setTimeout(() => setAnnounce(null), 1250);
        if ((turn.who === "roaster" && hp.d <= 20) || (turn.who === "defender" && hp.r <= 20)) {
          SFX.sadTrombone();
        }
        await sleep(1100);
      }

      // Judge
      setThinking({ who: "judge", label: rand(tk.judge) });
      await sleep(400);
      const raw = await callClaude(
        JUDGE_SYSTEM + "\n\n" + langLine(lang),
        buildUser(code, language, transcriptText(convoLocal), "Deliver the final ruling as JSON.")
      );
      setThinking(null);
      let v;
      try {
        v = extractJSON(raw);
      } catch (e) {
        v = {
          winner: hp.d > hp.r ? "teacher" : "roaster",
          verdict: lang === "uz" ? "Hakam biroz chalkashdi, lekin kod oʻzini koʻrsatdi." : "The judge spilled coffee, but the code spoke for itself.",
          issues: [],
          fixedCode: raw.slice(0, 1200),
          challenge: "",
          stat: lang === "uz" ? "Hakamlarning 100% biroz uxlashi kerak edi." : "100% of judges surveyed needed a nap.",
        };
      }
      const score = cringeFrom(v.issues, hp.d);
      v._cringe = score;
      v._rank = rankFor(score, lang);
      setVerdict(v);
      const clean = !Array.isArray(v.issues) || v.issues.length === 0;
      if (clean) {
        SFX.victory();
        showFlash(lang === "uz" ? "TOZA! 🏆" : "CLEAN! 🏆", 1100);
      } else {
        SFX.ko();
        if (v.winner === "roaster") setTimeout(() => SFX.laugh(true), 550);
        showFlash("K.O.", 1100);
      }
      doShake(18);
      saveShame({ ts: Date.now(), lang: language, score, rank: v._rank.t + " " + v._rank.e, winner: v.winner });
      await sleep(900);
      setPhase("verdict");
    } catch (e) {
      setThinking(null);
      setErr(L("errMsg"));
      setPhase("verdict");
    }
  }

  function reset() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setPhase("input");
    setVerdict(null);
    setConvo([]);
    setErr(null);
    setAttempt("");
    setGrade(null);
  }
  function copyFix() {
    if (!verdict?.fixedCode) return;
    try {
      navigator.clipboard.writeText(verdict.fixedCode);
      setCopied(true);
      SFX.ding();
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  }

  const reports = phase === "input" ? scout(code, lang) : [];
  const sevColor = { critical: C.magma, major: C.acid, minor: C.cyan };

  return (
    <div className="rmc-root">
      <style>{CSS}</style>

      <div
        className="rmc-shell"
        style={{ transform: shake ? `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)` : "none" }}
      >
        {/* Header */}
        <header className="rmc-header">
          <h1 className="rmc-title">
            <span style={{ color: C.cyan }}>ROAST</span>{" "}
            <span style={{ color: C.bone }}>MY</span>{" "}
            <span style={{ color: C.magma }}>CODE</span>
          </h1>
          <div className="rmc-toggles">
            <button
              className="rmc-switch on"
              onClick={() => setLang((l) => (l === "en" ? "uz" : "en"))}
              style={{ borderColor: C.cyan, boxShadow: `3px 3px 0 ${C.cyan}`, color: C.cyan }}
            >
              {lang === "en" ? "🇺🇿 UZ" : "🇬🇧 EN"}
            </button>
            <button className={`rmc-switch ${sound ? "on" : ""}`} onClick={() => setSound((s) => !s)}>
              SFX {sound ? "ON" : "OFF"}
            </button>
            <button className={`rmc-switch ${voice ? "on" : ""}`} onClick={() => setVoice((v) => !v)}>
              🔊 VOICE {voice ? "ON" : "OFF"}
            </button>
          </div>
        </header>

        {/* INPUT */}
        {phase === "input" && (
          <section className="rmc-input">
            {shame.length > 0 && (
              <div className="rmc-shame">
                <div className="rmc-shame-h">
                  <span>
                    {L("hall")}: {Math.min(...shame.map((s) => s.score))}/100
                  </span>
                  <button className="rmc-clear" onClick={clearShame}>
                    {L("clear")}
                  </button>
                </div>
                {shame.slice(0, 5).map((s, i) => (
                  <div key={i} className="rmc-shame-row">
                    <span>
                      {s.lang} · {s.rank}
                    </span>
                    <span
                      className="rmc-shame-score"
                      style={{ color: s.score > 65 ? C.magma : s.score > 25 ? C.acid : C.cyan }}
                    >
                      {s.score}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="rmc-insert">{L("drop")}</div>
            <textarea
              className="rmc-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={L("placeholder")}
              spellCheck={false}
            />
            <div className="rmc-examples">
              <span className="rmc-lbl">{L("noCode")}</span>
              {Object.keys(EXAMPLES).map((k) => (
                <button key={k} className="rmc-chip" onClick={() => setCode(EXAMPLES[k])}>
                  {k}
                </button>
              ))}
            </div>

            {reports.length > 0 && (
              <div className="rmc-scout">
                <div className="rmc-scout-h">{L("scouting")}</div>
                {reports.map((r, i) => (
                  <div key={i} className="rmc-scout-line">
                    {r}
                  </div>
                ))}
              </div>
            )}

            <div className="rmc-controls">
              <label className="rmc-field">
                <span>{L("langLabel")}</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "PHP", "Other"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="rmc-field">
                <span>{L("intensity")}</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="professional">{L("optLow")}</option>
                  <option value="savage">{L("optMid")}</option>
                  <option value="unhinged">{L("optFeral")}</option>
                </select>
              </label>
            </div>

            <button className="rmc-fight" disabled={!code.trim()} onClick={runFight}>
              {L("fight")}
            </button>
            <p className="rmc-hint">{L("hint")}</p>

            <div className="rmc-board">
              <div className="rmc-board-h" onClick={() => setBoardOpen((o) => !o)}>
                <span className="rmc-board-title">{L("soundboard")}</span>
                <span style={{ color: C.dim }}>{boardOpen ? "▲" : "▼"}</span>
              </div>
              {boardOpen && (
                <div className="rmc-board-grid">
                  {SOUNDS.map(([label, key]) => (
                    <button key={key} className="rmc-snd" onClick={() => board(key)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* FIGHTING + VERDICT share the arena view */}
        {phase !== "input" && (
          <section className="rmc-arena">
            {/* HP bars */}
            <div className="rmc-vsbar">
              <div className="rmc-fighter">
                <div className="rmc-fhead">
                  <span className="rmc-ava" style={{ borderColor: C.cyan, boxShadow: `0 0 14px ${C.cyan}` }}>
                    🎓
                  </span>
                  <div className="rmc-fname" style={{ color: C.cyan }}>
                    {L("teacher")}
                  </div>
                </div>
                <Health value={dh} color={C.cyan} align="left" />
              </div>
              <div className="rmc-round">{phase === "verdict" ? L("done") : `R${round}`}</div>
              <div className="rmc-fighter rmc-right">
                <div className="rmc-fhead rmc-fhead-r">
                  <div className="rmc-fname" style={{ color: C.magma, textAlign: "right" }}>
                    {L("roaster")}
                  </div>
                  <span className="rmc-ava" style={{ borderColor: C.magma, boxShadow: `0 0 14px ${C.magma}` }}>
                    🔥
                  </span>
                </div>
                <Health value={rh} color={C.magma} align="right" />
              </div>
              {pops.map((p) => (
                <div key={p.id} className={`rmc-pop ${p.side}`}>
                  -{p.value}
                </div>
              ))}
            </div>

            {announce && (
              <div className="rmc-announce">
                <div
                  className="rmc-announce-in"
                  style={{
                    color: announce.color,
                    borderColor: announce.color,
                    background: announce.color === C.magma ? "rgba(255,46,99,0.12)" : "rgba(47,243,223,0.12)",
                  }}
                >
                  {announce.text}
                </div>
              </div>
            )}

            {/* Feed */}
            <div className="rmc-feed" ref={feedRef}>
              {convo.map((m, i) => (
                <Bubble key={i} msg={m} animate={i === convo.length - 1 && phase === "fighting"} />
              ))}
              {thinking && (
                <div
                  className="rmc-row"
                  style={{ justifyContent: thinking.who === "roaster" ? "flex-end" : "flex-start" }}
                >
                  <div
                    className="rmc-thinking"
                    style={{
                      borderColor: thinking.who === "roaster" ? C.magma : thinking.who === "judge" ? C.acid : C.cyan,
                    }}
                  >
                    {(thinking.who === "judge"
                      ? L("judgeName")
                      : thinking.who === "roaster"
                      ? L("roasterName")
                      : L("teacherName")) +
                      (lang === "uz" ? " " : " is ") +
                      thinking.label}
                    <span className="rmc-dots">
                      <i>.</i>
                      <i>.</i>
                      <i>.</i>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* VERDICT */}
            {phase === "verdict" && (
              <div className="rmc-verdict">
                {err ? (
                  <div className="rmc-err">{err}</div>
                ) : verdict ? (
                  <>
                    <div
                      className="rmc-winner"
                      style={{
                        color: verdict.winner === "roaster" ? C.magma : verdict.winner === "teacher" ? C.cyan : C.acid,
                        borderColor: verdict.winner === "roaster" ? C.magma : verdict.winner === "teacher" ? C.cyan : C.acid,
                      }}
                    >
                      {verdict.winner === "draw" ? L("draw") : verdict.winner === "roaster" ? L("winRoaster") : L("winTeacher")}
                    </div>
                    <div className="rmc-vtext">“{verdict.verdict}”</div>

                    {verdict._cringe != null && verdict._rank && (
                      <div className="rmc-cringe">
                        <div className="rmc-cringe-top">
                          <span className="rmc-cringe-rank" style={{ color: verdict._rank.c }}>
                            {verdict._rank.e} {verdict._rank.t}
                          </span>
                          <span className="rmc-cringe-num" style={{ color: verdict._rank.c }}>
                            {verdict._cringe}/100
                          </span>
                        </div>
                        <div className="rmc-cringe-track">
                          <div
                            className="rmc-cringe-fill"
                            style={{
                              width: verdict._cringe + "%",
                              background: verdict._rank.c,
                              boxShadow: `0 0 12px ${verdict._rank.c}`,
                            }}
                          />
                        </div>
                        <div className="rmc-cringe-cap">{L("cringe")}</div>
                      </div>
                    )}

                    {Array.isArray(verdict.issues) && verdict.issues.length > 0 ? (
                      <div className="rmc-issues">
                        <div className="rmc-section-h">{L("validHits")}</div>
                        {verdict.issues.map((is, i) => (
                          <div key={i} className="rmc-issue">
                            <span
                              className="rmc-sev"
                              style={{
                                background: sevColor[is.severity] || C.dim,
                                color: is.severity === "major" ? "#221a00" : "#1a0a14",
                              }}
                            >
                              {is.severity}
                            </span>
                            <div>
                              <strong>{is.title}</strong>
                              <p>{is.explanation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rmc-clean">{L("cleanMsg")}</div>
                    )}

                    {verdict.challenge && Array.isArray(verdict.issues) && verdict.issues.length > 0 && (
                      <div className="rmc-practice">
                        <div className="rmc-practice-h">{L("yourTurn")}</div>
                        <div className="rmc-challenge">
                          <strong>{L("challengeLbl")}</strong> {verdict.challenge}
                        </div>
                        <textarea
                          className="rmc-fixbox"
                          value={attempt}
                          onChange={(e) => setAttempt(e.target.value)}
                          placeholder={L("fixPlaceholder")}
                          spellCheck={false}
                        />
                        <button className="rmc-checkbtn" disabled={!attempt.trim() || grading} onClick={checkFix}>
                          {grading ? L("checking") + "…" : L("checkFix")}
                        </button>
                        {grade && (
                          <div className="rmc-grade" style={{ borderColor: grade.passed ? C.cyan : C.magma }}>
                            <div className="rmc-grade-top" style={{ color: grade.passed ? C.cyan : C.magma }}>
                              {grade.passed ? L("nailed") : L("notYet")}
                            </div>
                            <p className="rmc-grade-fb">{grade.feedback}</p>
                            {grade.roast && <p className="rmc-grade-roast">🔥 {grade.roast}</p>}
                            {!grade.passed && (
                              <button className="rmc-checkbtn alt" disabled={!attempt.trim() || grading} onClick={checkFix}>
                                {L("tryAgain")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {verdict.fixedCode && (
                      <div className="rmc-fix">
                        <div className="rmc-fix-head">
                          <span className="rmc-section-h">{L("fixedCode")}</span>
                          <button className="rmc-copy" onClick={copyFix}>
                            {copied ? L("copied") : L("copy")}
                          </button>
                        </div>
                        <pre className="rmc-pre">
                          <code>{verdict.fixedCode}</code>
                        </pre>
                      </div>
                    )}
                    {verdict.stat && <div className="rmc-stat">📊 {verdict.stat}</div>}
                  </>
                ) : null}

                <div className="rmc-actions">
                  <button className="rmc-fight small" onClick={runFight}>
                    {L("rematch")}
                  </button>
                  <button className="rmc-ghost" onClick={reset}>
                    {L("newCode")}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Big centered flash */}
        {flash && (
          <div className="rmc-flashwrap">
            <div className="rmc-flash">{flash}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.rmc-root *{box-sizing:border-box;}
.rmc-root{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:
    radial-gradient(900px 500px at 50% -10%, #2a1346 0%, transparent 60%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px),
    ${C.void};
  color:${C.bone}; min-height:100%; padding:18px;
}
.rmc-shell{max-width:880px;margin:0 auto;}
.rmc-header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.rmc-title{
  font-family:'Arial Black','Helvetica Neue',Impact,sans-serif;
  font-weight:900;letter-spacing:1px;margin:0;line-height:0.9;
  font-size:clamp(30px,7vw,52px);text-transform:uppercase;
  text-shadow:3px 3px 0 #000;
}
.rmc-toggles{display:flex;gap:8px;flex-wrap:wrap;}
.rmc-switch{
  font-family:'Arial Black',sans-serif;font-size:12px;letter-spacing:1px;
  background:${C.panel};color:${C.dim};border:3px solid #000;
  padding:8px 12px;cursor:pointer;box-shadow:3px 3px 0 #000;text-transform:uppercase;
}
.rmc-switch.on{color:${C.acid};border-color:${C.acid};box-shadow:3px 3px 0 ${C.acid};}
.rmc-switch:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #000;}

/* input */
.rmc-input{display:flex;flex-direction:column;gap:14px;}
.rmc-insert{font-family:'Arial Black',sans-serif;color:${C.acid};letter-spacing:2px;font-size:14px;}
.rmc-code{
  width:100%;min-height:190px;resize:vertical;background:#0a0613;color:${C.cyan};
  border:4px solid #000;box-shadow:6px 6px 0 ${C.magma};padding:16px;
  font-family:'SF Mono','JetBrains Mono',Consolas,'Courier New',monospace;font-size:14px;line-height:1.55;
}
.rmc-code:focus{outline:none;box-shadow:6px 6px 0 ${C.cyan};}
.rmc-code::placeholder{color:#5a4f72;}
.rmc-examples{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.rmc-lbl{color:${C.dim};font-size:13px;}
.rmc-chip{
  background:transparent;border:2px dashed ${C.dim};color:${C.bone};
  padding:6px 12px;border-radius:999px;cursor:pointer;font-size:13px;
}
.rmc-chip:hover{border-color:${C.acid};color:${C.acid};}
.rmc-scout{border-left:4px solid ${C.acid};background:rgba(255,227,71,0.05);padding:12px 14px;}
.rmc-scout-h{font-family:'Arial Black',sans-serif;color:${C.acid};font-size:12px;letter-spacing:2px;margin-bottom:6px;}
.rmc-scout-line{font-size:13px;color:#d8cdef;padding:2px 0;}
.rmc-controls{display:flex;gap:14px;flex-wrap:wrap;}
.rmc-field{flex:1;min-width:200px;display:flex;flex-direction:column;gap:6px;}
.rmc-field>span{font-family:'Arial Black',sans-serif;font-size:11px;letter-spacing:2px;color:${C.dim};}
.rmc-field select{
  background:${C.panel};color:${C.bone};border:3px solid #000;box-shadow:3px 3px 0 #000;
  padding:11px;font-size:14px;cursor:pointer;
}
.rmc-fight{
  font-family:'Arial Black',sans-serif;font-size:clamp(20px,4vw,28px);letter-spacing:3px;
  background:${C.magma};color:#fff;border:4px solid #000;box-shadow:7px 7px 0 #000;
  padding:18px;cursor:pointer;text-transform:uppercase;transition:transform .05s;
}
.rmc-fight:hover:not(:disabled){background:#ff4d7c;}
.rmc-fight:active:not(:disabled){transform:translate(3px,3px);box-shadow:4px 4px 0 #000;}
.rmc-fight:disabled{background:#3a2b45;color:#6a5d78;box-shadow:7px 7px 0 #000;cursor:not-allowed;}
.rmc-fight.small{font-size:16px;padding:13px 20px;}
.rmc-hint{color:${C.dim};font-size:13px;text-align:center;margin:0;}

/* arena */
.rmc-arena{display:flex;flex-direction:column;gap:14px;}
.rmc-vsbar{position:relative;display:flex;align-items:flex-start;gap:10px;
  background:${C.arena};border:4px solid #000;box-shadow:6px 6px 0 #000;padding:14px;}
.rmc-fighter{flex:1;min-width:0;}
.rmc-fname{font-family:'Arial Black',sans-serif;font-size:clamp(11px,2.4vw,15px);letter-spacing:1px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rmc-round{font-family:'Arial Black',sans-serif;color:${C.acid};font-size:clamp(16px,3.5vw,24px);align-self:center;padding:0 4px;text-shadow:2px 2px 0 #000;}
.rmc-hp{display:flex;align-items:center;}
.rmc-hp-track{flex:1;height:20px;background:#06040c;border:3px solid #000;overflow:hidden;}
.rmc-hp-fill{height:100%;transition:width .5s cubic-bezier(.2,.8,.2,1);}
.rmc-pop{position:absolute;top:6px;font-family:'Arial Black',sans-serif;font-size:26px;color:${C.magma};
  text-shadow:2px 2px 0 #000;animation:rmcpop .9s ease-out forwards;pointer-events:none;}
.rmc-pop.left{left:18%;} .rmc-pop.right{right:18%;}
@keyframes rmcpop{0%{transform:translateY(0) scale(.6);opacity:0;}20%{opacity:1;transform:translateY(-6px) scale(1.2);}100%{transform:translateY(-46px) scale(1);opacity:0;}}

.rmc-feed{display:flex;flex-direction:column;gap:14px;max-height:46vh;overflow-y:auto;padding:6px 2px;}
.rmc-row{display:flex;width:100%;}
.rmc-bubble{max-width:82%;border:3px solid;padding:11px 14px;}
.rmc-bubble-name{font-family:'Arial Black',sans-serif;font-size:11px;letter-spacing:2px;margin-bottom:5px;}
.rmc-bubble-text{font-size:14.5px;line-height:1.55;white-space:pre-wrap;color:#efe7ff;}
.rmc-thinking{border:3px dashed;padding:9px 13px;font-size:13px;color:${C.dim};font-style:italic;}
.rmc-dots i{animation:rmcblink 1.2s infinite;opacity:0;}
.rmc-dots i:nth-child(2){animation-delay:.2s;} .rmc-dots i:nth-child(3){animation-delay:.4s;}
@keyframes rmcblink{0%,100%{opacity:0;}50%{opacity:1;}}

/* verdict */
.rmc-verdict{background:${C.arena};border:4px solid #000;box-shadow:6px 6px 0 #000;padding:18px;display:flex;flex-direction:column;gap:14px;}
.rmc-winner{font-family:'Arial Black',sans-serif;font-size:clamp(20px,4.5vw,30px);letter-spacing:2px;
  border:4px solid;padding:12px;text-align:center;text-shadow:2px 2px 0 #000;}
.rmc-vtext{font-size:16px;font-style:italic;text-align:center;color:#e7ddff;}
.rmc-section-h{font-family:'Arial Black',sans-serif;font-size:12px;letter-spacing:2px;color:${C.dim};}
.rmc-issues{display:flex;flex-direction:column;gap:10px;}
.rmc-issue{display:flex;gap:10px;align-items:flex-start;background:#0e0819;border:2px solid #2a1c3c;padding:10px;}
.rmc-issue p{margin:3px 0 0;font-size:13.5px;color:#cbbfe3;}
.rmc-issue strong{font-size:14.5px;}
.rmc-sev{font-family:'Arial Black',sans-serif;font-size:10px;letter-spacing:1px;padding:4px 8px;text-transform:uppercase;white-space:nowrap;}
.rmc-clean{color:${C.cyan};font-size:15px;text-align:center;padding:8px;}
.rmc-fix-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.rmc-copy{font-family:'Arial Black',sans-serif;font-size:11px;letter-spacing:1px;background:${C.cyan};color:#04201d;
  border:3px solid #000;padding:7px 12px;cursor:pointer;box-shadow:2px 2px 0 #000;}
.rmc-copy:active{transform:translate(2px,2px);box-shadow:0 0 0 #000;}
.rmc-pre{background:#06040c;border:3px solid #000;padding:14px;overflow-x:auto;margin:0;
  font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:13px;line-height:1.6;color:${C.cyan};}
.rmc-stat{background:rgba(255,227,71,0.06);border-left:4px solid ${C.acid};padding:10px 12px;font-size:13.5px;color:#e7dcae;}
.rmc-err{color:${C.magma};font-size:15px;text-align:center;padding:10px;}
.rmc-actions{display:flex;gap:12px;flex-wrap:wrap;}
.rmc-ghost{font-family:'Arial Black',sans-serif;font-size:16px;letter-spacing:2px;background:transparent;color:${C.bone};
  border:3px solid ${C.bone};padding:13px 20px;cursor:pointer;}
.rmc-ghost:hover{border-color:${C.cyan};color:${C.cyan};}

/* flash */
.rmc-flashwrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:50;}
.rmc-flash{font-family:'Arial Black',sans-serif;font-size:clamp(48px,16vw,140px);color:${C.acid};
  letter-spacing:4px;text-shadow:5px 5px 0 #000, 0 0 40px ${C.magma};animation:rmcflash .85s ease-out forwards;}
@keyframes rmcflash{0%{transform:scale(2.4) rotate(-6deg);opacity:0;}30%{opacity:1;transform:scale(1) rotate(-3deg);}100%{transform:scale(1.05) rotate(-3deg);opacity:0;}}

button:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid ${C.acid};outline-offset:2px;}

/* soundboard */
.rmc-board{border:4px solid #000;background:${C.arena};box-shadow:6px 6px 0 #000;padding:14px;margin-top:4px;}
.rmc-board-h{display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;}
.rmc-board-title{font-family:'Arial Black',sans-serif;color:${C.acid};letter-spacing:2px;font-size:13px;}
.rmc-board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:8px;margin-top:12px;}
.rmc-snd{font-family:'Arial Black',sans-serif;font-size:11px;letter-spacing:.3px;background:${C.panel};color:${C.bone};
  border:3px solid #000;box-shadow:3px 3px 0 #000;padding:11px 6px;cursor:pointer;text-align:center;}
.rmc-snd:hover{border-color:${C.acid};color:${C.acid};}
.rmc-snd:active{transform:translate(3px,3px);box-shadow:0 0 0 #000;background:${C.magma};color:#fff;}

/* hall of shame */
.rmc-shame{border-left:4px solid ${C.magma};background:rgba(255,46,99,0.05);padding:12px 14px;}
.rmc-shame-h{font-family:'Arial Black',sans-serif;color:${C.magma};font-size:12px;letter-spacing:1.5px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}
.rmc-clear{background:transparent;border:2px solid ${C.dim};color:${C.dim};font-size:10px;padding:4px 9px;cursor:pointer;border-radius:6px;letter-spacing:1px;}
.rmc-clear:hover{border-color:${C.magma};color:${C.magma};}
.rmc-shame-row{display:flex;justify-content:space-between;font-size:12.5px;color:#d8cdef;padding:4px 0;border-bottom:1px dashed #2a1c3c;gap:10px;}
.rmc-shame-score{font-family:'Arial Black',sans-serif;white-space:nowrap;}

/* cringe meter */
.rmc-cringe{background:#0e0819;border:3px solid #2a1c3c;padding:14px;}
.rmc-cringe-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;flex-wrap:wrap;gap:6px;}
.rmc-cringe-rank{font-family:'Arial Black',sans-serif;font-size:clamp(15px,3.5vw,22px);letter-spacing:.5px;}
.rmc-cringe-num{font-family:'Arial Black',sans-serif;font-size:22px;}
.rmc-cringe-track{height:18px;background:#06040c;border:3px solid #000;overflow:hidden;}
.rmc-cringe-fill{height:100%;transition:width .8s cubic-bezier(.2,.8,.2,1);}
.rmc-cringe-cap{font-size:11px;color:${C.dim};margin-top:7px;letter-spacing:1.5px;}

/* announcer */
.rmc-announce{text-align:center;margin-top:-4px;}
.rmc-announce-in{display:inline-block;font-family:'Arial Black',sans-serif;font-size:clamp(20px,5vw,34px);
  letter-spacing:2px;padding:6px 18px;border:4px solid #000;text-shadow:2px 2px 0 #000;
  animation:rmcann .4s cubic-bezier(.2,1.5,.4,1);}
@keyframes rmcann{0%{transform:scale(.4) rotate(-8deg);opacity:0;}100%{transform:scale(1) rotate(-2deg);opacity:1;}}

/* fighter avatars */
.rmc-fhead{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.rmc-fhead-r{justify-content:flex-end;}
.rmc-ava{font-size:20px;width:38px;height:38px;min-width:38px;display:flex;align-items:center;justify-content:center;
  background:#0a0613;border:3px solid #000;border-radius:50%;}

/* practice / chalkboard */
.rmc-practice{background:#0c1f17;border:4px solid #0a3a28;box-shadow:6px 6px 0 #06150f;padding:16px;
  background-image:repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 22px);}
.rmc-practice-h{font-family:'Arial Black',sans-serif;color:#7CFFB2;letter-spacing:1.5px;font-size:14px;margin-bottom:10px;}
.rmc-challenge{font-size:14px;line-height:1.5;color:#e6fff0;margin-bottom:12px;background:rgba(124,255,178,0.07);
  border-left:4px solid #7CFFB2;padding:10px 12px;}
.rmc-challenge strong{color:#7CFFB2;}
.rmc-fixbox{width:100%;min-height:120px;resize:vertical;background:#061611;color:#9effc4;border:3px solid #0a3a28;
  padding:12px;font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:13px;line-height:1.5;}
.rmc-fixbox:focus{outline:none;border-color:#7CFFB2;}
.rmc-fixbox::placeholder{color:#3f6553;}
.rmc-checkbtn{margin-top:10px;font-family:'Arial Black',sans-serif;font-size:14px;letter-spacing:1.5px;
  background:#7CFFB2;color:#04201a;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:12px 18px;cursor:pointer;text-transform:uppercase;}
.rmc-checkbtn:hover:not(:disabled){background:#9effc4;}
.rmc-checkbtn:active:not(:disabled){transform:translate(3px,3px);box-shadow:1px 1px 0 #000;}
.rmc-checkbtn:disabled{background:#1d3a2d;color:#4a6b5b;cursor:not-allowed;box-shadow:4px 4px 0 #000;}
.rmc-checkbtn.alt{background:transparent;color:#7CFFB2;border-color:#7CFFB2;box-shadow:3px 3px 0 #0a3a28;}
.rmc-grade{margin-top:12px;border:3px solid;padding:12px;background:#06140f;}
.rmc-grade-top{font-family:'Arial Black',sans-serif;font-size:16px;letter-spacing:1px;margin-bottom:6px;}
.rmc-grade-fb{font-size:14px;line-height:1.5;color:#e6fff0;margin:0;}
.rmc-grade-roast{font-size:13.5px;color:#ffb3c8;margin:8px 0 0;font-style:italic;}

@media (max-width:560px){
  .rmc-root{padding:12px;}
  .rmc-bubble{max-width:90%;}
  .rmc-pop.left{left:10%;} .rmc-pop.right{right:10%;}
  .rmc-feed{max-height:50vh;}
}
@media (prefers-reduced-motion:reduce){
  .rmc-flash{animation:none;opacity:1;} .rmc-pop{animation:none;}
  .rmc-shell{transform:none !important;}
}
`;
