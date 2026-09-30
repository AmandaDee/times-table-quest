import "./style.css";

type KeyStage = "ks1" | "ks2";
type BadgeId = "first-round" | "perfect-round" | "streak-5" | "heart-25";

interface PlayerStats {
  roundsPlayed: number;
  correctAnswers: number;
  answersGiven: number;
  bestStreak: number;
  hearts: number;
  badges: BadgeId[];
}

interface Question {
  table: number;
  multiplier: number;
  answer: number;
  choices: number[];
}

interface AnswerRecord {
  table: number;
  multiplier: number;
  correctAnswer: number;
  chosenAnswer: number;
  correct: boolean;
}

interface GameState {
  stage: KeyStage;
  selectedTables: number[];
  questionNumber: number;
  score: number;
  streak: number;
  roundBestStreak: number;
  roundCorrect: number;
  current: Question | null;
  feedback: string;
  feedbackKind: "idle" | "correct" | "incorrect";
  answerLocked: boolean;
  roundFinished: boolean;
  answers: AnswerRecord[];
}

const STORAGE_KEY = "times-table-quest:progress:v3";
const ROUND_LENGTH = 10;
const KS1_TABLES = [2, 5, 10];
const KS2_TABLES = Array.from({length: 12}, (_, index) => index + 1);
const DEFAULT_STATS: PlayerStats = {
  roundsPlayed: 0,
  correctAnswers: 0,
  answersGiven: 0,
  bestStreak: 0,
  hearts: 0,
  badges: [],
};

const BADGES: Record<
  BadgeId,
  { name: string; mark: string; description: string }
> = {
  "first-round": {
    name: "First Quest",
    mark: "01",
    description: "Finish your first round",
  },
  "perfect-round": {
    name: "Perfect Ten",
    mark: "10",
    description: "Get 10 out of 10",
  },
  "streak-5": {
    name: "On Fire",
    mark: "×5",
    description: "Build a five-answer streak",
  },
  "heart-25": {
    name: "Heart Hero",
    mark: "♥",
    description: "Collect 25 hearts",
  },
};

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) throw new Error("Times Table Quest could not find #app.");
const app: HTMLDivElement = appElement;

const state: GameState = {
  stage: "ks1",
  selectedTables: [...KS1_TABLES],
  questionNumber: 0,
  score: 0,
  streak: 0,
  roundBestStreak: 0,
  roundCorrect: 0,
  current: null,
  feedback: "",
  feedbackKind: "idle",
  answerLocked: false,
  roundFinished: false,
  answers: [],
};

let stats = loadStats();
let advanceTimer: number | undefined;

function loadStats(): PlayerStats {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);
    if (!saved) return {...DEFAULT_STATS};
    const parsed = JSON.parse(saved) as Partial<Omit<PlayerStats, "badges">> & {
      stars?: number;
      badges?: string[];
    };
    const migratedBadges = Array.isArray(parsed.badges)
      ? parsed.badges
        .map((badge) => (badge === "star-25" ? "heart-25" : badge))
        .filter(isBadgeId)
      : [];
    return {
      ...DEFAULT_STATS,
      ...parsed,
      hearts:
        typeof parsed.hearts === "number" ? parsed.hearts : (parsed.stars ?? 0),
      badges: migratedBadges,
    };
  } catch {
    return {...DEFAULT_STATS};
  }
}

function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === "string" && value in BADGES;
}

function saveStats(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
  }
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapWith]] = [items[swapWith]!, items[index]!];
  }
  return items;
}

function createQuestion(): Question {
  const table = randomItem(state.selectedTables);
  const maxMultiplier = state.stage === "ks1" ? 10 : 12;
  const multiplier = Math.floor(Math.random() * maxMultiplier) + 1;
  const answer = table * multiplier;
  const choices = new Set<number>([answer]);

  while (choices.size < 4) {
    const nearbyMultiplier = Math.max(
      1,
      Math.min(maxMultiplier, multiplier + randomItem([-2, -1, 1, 2])),
    );
    const candidates = [
      table * nearbyMultiplier,
      answer + randomItem([-10, -5, -2, -1, 1, 2, 5, 10]),
      Math.max(1, (table + randomItem([-1, 1])) * multiplier),
    ].filter((value) => value > 0);
    choices.add(randomItem(candidates));
  }

  return {table, multiplier, answer, choices: shuffle([...choices])};
}

function startRound(): void {
  window.clearTimeout(advanceTimer);
  Object.assign(state, {
    questionNumber: 1,
    score: 0,
    streak: 0,
    roundBestStreak: 0,
    roundCorrect: 0,
    current: createQuestion(),
    feedback: "Pick the answer you think is right.",
    feedbackKind: "idle",
    answerLocked: false,
    roundFinished: false,
    answers: [],
  });
  render();
  document.querySelector<HTMLElement>(".play-card")?.focus();
}

function submitAnswer(choice: number): void {
  if (!state.current || state.answerLocked) return;
  state.answerLocked = true;
  const question = state.current;
  const correct = choice === question.answer;
  state.answers.push({
    table: question.table,
    multiplier: question.multiplier,
    correctAnswer: question.answer,
    chosenAnswer: choice,
    correct,
  });

  if (correct) {
    state.roundCorrect += 1;
    state.streak += 1;
    state.roundBestStreak = Math.max(state.roundBestStreak, state.streak);
    state.score += 100 + Math.min(state.streak - 1, 5) * 20;
    state.feedbackKind = "correct";
    state.feedback = randomItem([
      "Yes! That one is yours.",
      "Spot on, keep the streak going!",
      "Great multiplication!",
      "Nailed it. Next one!",
    ]);
  } else {
    state.streak = 0;
    state.feedbackKind = "incorrect";
    state.feedback = `Good try.  ${question.table} × ${question.multiplier} = ${question.answer}.`;
  }

  render();
  advanceTimer = window.setTimeout(advanceRound, 1100);
}

function advanceRound(): void {
  if (state.questionNumber >= ROUND_LENGTH) {
    finishRound();
    return;
  }
  state.questionNumber += 1;
  state.current = createQuestion();
  state.feedback = "Pick the answer you think is right.";
  state.feedbackKind = "idle";
  state.answerLocked = false;
  render();
}

function finishRound(): void {
  stats.roundsPlayed += 1;
  stats.correctAnswers += state.roundCorrect;
  stats.answersGiven += ROUND_LENGTH;
  stats.bestStreak = Math.max(stats.bestStreak, state.roundBestStreak);
  stats.hearts += heartsForRound(state.roundCorrect);
  unlockBadges();
  saveStats();
  state.roundFinished = true;
  state.questionNumber = 0;
  state.current = null;
  state.answerLocked = false;
  render();
}

function heartsForRound(correct: number): number {
  if (correct === 10) return 5;
  if (correct >= 8) return 4;
  if (correct >= 6) return 3;
  if (correct >= 4) return 2;
  return 1;
}

function unlockBadges(): void {
  const unlocked = new Set(stats.badges);
  if (stats.roundsPlayed >= 1) unlocked.add("first-round");
  if (state.roundCorrect === 10) unlocked.add("perfect-round");
  if (state.roundBestStreak >= 5) unlocked.add("streak-5");
  if (stats.hearts >= 25) unlocked.add("heart-25");
  stats.badges = [...unlocked];
}

function setStage(stage: KeyStage): void {
  window.clearTimeout(advanceTimer);
  state.stage = stage;
  state.selectedTables = stage === "ks1" ? [...KS1_TABLES] : [2, 5, 10];
  resetRoundView();
}

function resetRoundView(): void {
  Object.assign(state, {
    questionNumber: 0,
    current: null,
    answerLocked: false,
    roundFinished: false,
    feedback: "",
    feedbackKind: "idle",
    answers: [],
  });
  render();
}

function toggleTable(table: number): void {
  if (state.selectedTables.includes(table)) {
    if (state.selectedTables.length === 1) return;
    state.selectedTables = state.selectedTables.filter(
      (value) => value !== table,
    );
  } else {
    state.selectedTables = [...state.selectedTables, table].sort(
      (a, b) => a - b,
    );
  }
  render();
}

function render(): void {
  const availableTables = state.stage === "ks1" ? KS1_TABLES : KS2_TABLES;
  const accuracy = stats.answersGiven
    ? Math.round((stats.correctAnswers / stats.answersGiven) * 100)
    : 0;

  app.innerHTML = `
    <a class="skip-link" href="#game">Skip to the game</a>
    <header class="site-header" id="top">
      <nav class="site-nav" aria-label="Primary navigation">
        <a class="brand" href="https://amanda-bamford-hobby-site.amanda-dee-20-e42.workers.dev/" aria-label="Amanda Bamford portfolio">AB<span>.</span></a>
        <ul class="nav-links">
          <li><a href="https://amanda-bamford-hobby-site.amanda-dee-20-e42.workers.dev/#about">About</a></li>
          <li><a href="https://amanda-bamford-hobby-site.amanda-dee-20-e42.workers.dev/#projects">Projects</a></li>
          <li><a href="https://amanda-bamford-hobby-site.amanda-dee-20-e42.workers.dev/#hobbies">Hobbies</a></li>
        </ul>
        <a class="nav-button" href="https://amanda-bamford-hobby-site.amanda-dee-20-e42.workers.dev/assets/cv.pdf" target="_blank" rel="noopener noreferrer">Download CV</a>
      </nav>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">LEARN. PLAY. GROW.</p>
            <h1 id="hero-title">Times tables,<br><em>levelled up.</em></h1>
            <p class="lede">Fun times tables practice for curious minds.</p>

          </div>
          <div class="hero-playground">
            <div class="illustration-scene" aria-hidden="true">
              <img class="hero-art" src="/hero-mascot.png" alt="" width="1536" height="1024" fetchpriority="high">
              <div class="demo-quiz"><strong>6 × 8 = ?</strong><div class="demo-answers"><span>42</span><span class="demo-correct">48</span><span>54</span><span>56</span></div></div>
            </div>

          </div>
        <div class="hero-action"><a class="primary-cta" href="#game">Start a quest <span aria-hidden="true">→</span></a><p class="hero-note">KS1 &amp; KS2 · No account needed</p></div>
        </div>
        <div class="home-features" aria-label="Game features">
          <article><span class="feature-icon" aria-hidden="true"><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 3h8v7a4 4 0 0 1-8 0V3Z" />
                <path
                  d="M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8"
                />
              </svg></span><h2>Choose your challenge</h2><p>KS1 or KS2, with different tables to suit your learning stage.</p><a href="#game" aria-label="Choose your level">→</a></article>
          <article><span class="feature-icon" aria-hidden="true"><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
                />
              </svg></span><h2>Earn hearts</h2><p>Complete ten questions, build a streak and earn hearts for correct answers.</p><a href="#game" aria-label="Start answering questions">→</a></article>
          <article><span class="feature-icon" aria-hidden="true"><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M13 2c1 5-4 6-3 10 1-2 3-2 4-4 4 4 5 7 3 11-2 4-8 4-10 0-3-5 0-8 2-10-1 3 0 4 1 4-2-6 3-7 3-11Z"
                />
              </svg></span><h2>Build your streak</h2><p>See how many in a row you can get correct.</p><a href="#progress" aria-label="See your progress">→</a></article>
          <article><span class="feature-icon" aria-hidden="true"><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 13h4v8H3zm7-5h4v13h-4zm7-5h4v18h-4z" />
              </svg></span><h2>Review &amp; learn</h2><p>See the questions you got wrong at the end and try them again.</p><a href="#how" aria-label="Learn about review mode">→</a></article>
        </div>
      </section>

      <section id="game" class="section game-section">
        <div class="quest-heading"><div><p class="eyebrow">CHOOSE YOUR QUEST</p><h2>Ready, set, multiply.</h2><p class="section-subtitle">Pick your level and tables. Your next adventure starts here.</p></div><img class="section-mascot" src="/mascot-blue.png" alt="" width="160" height="160" loading="lazy"></div>
        <div class="controls" aria-label="Game options">
          <fieldset class="control"><legend>Choose your level</legend><div class="segmented">${stageButton("ks1", "KS1", "Ages 5–7")}${stageButton("ks2", "KS2", "Ages 7–11")}</div></fieldset>
          <fieldset class="control table-control"><legend>Choose your tables</legend><div class="chips">${availableTables.map(tableButton).join("")}</div></fieldset>
        </div>
        ${renderGamePanel()}
      </section>

      <section id="how" class="section how-it-works">
        <div class="quest-heading"><div><p class="eyebrow">HOW IT WORKS</p><h2>Practice without the pressure.</h2><p class="section-subtitle">Three simple steps to a little daily win.</p></div><img class="section-mascot" src="/mascot-coral.png" alt="" width="160" height="160" loading="lazy"></div>
        <div class="steps">
          <article><span class="step-icon purple" aria-hidden="true">${icon("flag")}</span><h3>Choose your challenge</h3><p>Pick your level and the tables you want to practise.</p></article>
          <article><span class="step-icon pink" aria-hidden="true">${icon("heart")}</span><h3>Play &amp; collect hearts</h3><p>Answer ten questions, build a streak and celebrate your effort.</p></article>
          <article><span class="step-icon yellow" aria-hidden="true">${icon("trophy")}</span><h3>Review &amp; learn</h3><p>Look back at tricky questions and try them again next time.</p></article>
        </div>
      </section>

      <section id="progress" class="section stats-section">
        <div class="progress-heading"><p class="eyebrow">YOUR PROGRESS</p><h2>Small wins add up.</h2><p>Look how far you’ve come!</p></div>
        <div class="stat-grid">
          <article><span class="stat-icon lilac" aria-hidden="true">${icon("flag")}</span><div><b>${stats.roundsPlayed}</b><span>Quests finished</span></div></article>
          <article><span class="stat-icon pink" aria-hidden="true">${icon("heart")}</span><div><b>${stats.hearts}</b><span>Hearts collected</span></div></article>
          <article><span class="stat-icon blue" aria-hidden="true">${icon("target")}</span><div><b>${accuracy}%</b><span>Practice accuracy</span></div></article>
          <article><span class="stat-icon gold" aria-hidden="true">${icon("bolt")}</span><div><b>${stats.bestStreak}</b><span>Best streak</span></div></article>
        </div>
        <div class="badge-wrap"><div class="achievement-heading"><div><h3>Your achievements</h3><p>${stats.badges.length} of ${Object.keys(BADGES).length} unlocked</p></div><img class="progress-mascot" src="/mascot.png" alt="" width="160" height="160" loading="lazy"></div><div class="badges">${renderBadges()}</div></div>
        <p class="privacy">Saved in this browser. No account needed.</p>
      </section>
    </main>

    <footer class="site-footer">
      <p>© 2026 Amanda Bamford.</p>
      <p>Built with HTML, CSS &amp; JavaScript.</p>
    </footer>`;
  bindEvents();
}

function renderGamePanel(): string {
  if (state.current && state.questionNumber > 0) {
    const roundHearts = heartsForRound(state.roundCorrect);
    const latestAnswer = state.answerLocked
      ? state.answers[state.answers.length - 1]
      : undefined;
    const answerStateClass = (choice: number): string => {
      if (!state.answerLocked || !latestAnswer) return "";
      if (choice === state.current?.answer) return "answer-correct";
      if (choice === latestAnswer.chosenAnswer && !latestAnswer.correct)
        return "answer-wrong";
      return "answer-muted";
    };
    return `<div class="game-card play-card ${state.feedbackKind}" tabindex="-1" aria-label="Question ${state.questionNumber} of ${ROUND_LENGTH}">
      <div class="game-top"><span>QUESTION ${String(state.questionNumber).padStart(2, "0")} / ${ROUND_LENGTH}</span><span class="heart-meter" aria-label="Current round rating">${heartRow(roundHearts)}</span><span>SCORE ${state.score}</span><span>STREAK ${state.streak}${state.streak >= 3 ? " · ON FIRE" : ""}</span></div>
      <div class="progress" aria-hidden="true"><i style="width:${state.questionNumber * 10}%"></i></div>
      <p class="prompt">What is</p><div class="sum">${state.current.table} <span>×</span> ${state.current.multiplier} <span>=</span> ?</div>
      <div class="answers">${state.current.choices.map((choice) => `<button type="button" class="${answerStateClass(choice)}" data-answer="${choice}" ${state.answerLocked ? "disabled" : ""} aria-label="Answer ${choice}">${choice}</button>`).join("")}</div>
      <p class="feedback" aria-live="polite">${state.feedback}</p><p class="keyboard-hint">Tip: use keys 1–4 to answer.</p></div>`;
  }

  if (state.roundFinished) {
    const hearts = heartsForRound(state.roundCorrect);
    const wrongAnswers = state.answers.filter((answer) => !answer.correct);
    const message =
      state.roundCorrect === 10
        ? "Perfect ten. That was seriously sharp."
        : state.roundCorrect >= 7
          ? "Strong round. Your recall is getting quicker."
          : "Quest complete. Every round makes the next one easier.";
    return `<div class="results-layout">
      <div class="game-card result-card"><div><p class="tag">QUEST COMPLETE · ${state.stage.toUpperCase()}</p><h3>Great <em>work!</em></h3><p class="big-score">${state.roundCorrect} / ${ROUND_LENGTH}</p><p>${message}</p><div class="result-hearts" aria-label="${hearts} hearts earned">${heartRow(hearts)}</div><small>${hearts} hearts earned · ${state.score} points</small></div><div class="result-actions"><button id="start" class="play" type="button">PLAY AGAIN <span>→</span></button><button id="change-tables" class="text-button" type="button">Choose different tables</button></div></div>
      <section class="review-card" aria-labelledby="review-title"><p class="tag">REVIEW & LEARN</p><h3 id="review-title">${wrongAnswers.length ? "Review your answers" : "Nothing to review!"}</h3><p>${wrongAnswers.length ? "Take another look at the questions that caught you out. The right answer is here for next time." : "You got every question right. Brilliant recall!"}</p>${wrongAnswers.length ? `<div class="review-list">${wrongAnswers.map(renderReviewItem).join("")}</div>` : '<div class="perfect-review"><span>♥</span><strong>Perfect round</strong></div>'}</section>
    </div>`;
  }

  return `<div class="game-card intro-card"><span class="start-medallion" aria-hidden="true">${icon("heart")}</span><div><h3>A little practice. A big confidence boost.</h3><p>10 questions · Hearts to earn · Answers to review</p></div><button id="start" class="play" type="button">Let’s play <span aria-hidden="true">→</span></button></div>`;
}

function heartRow(earned: number): string {
  return `${"♥".repeat(earned)}${"♡".repeat(5 - earned)}`;
}

function renderReviewItem(answer: AnswerRecord): string {
  return `<article class="review-item"><span class="review-x" aria-hidden="true">×</span><div><strong>${answer.table} × ${answer.multiplier} = ${answer.correctAnswer}</strong><small>You answered ${answer.chosenAnswer}</small></div><span class="review-arrow" aria-hidden="true">→</span></article>`;
}

function stageButton(value: KeyStage, label: string, detail: string): string {
  const selected = state.stage === value;
  return `<button type="button" data-stage="${value}" class="${selected ? "on" : ""}" aria-pressed="${selected}"><span class="level-medallion ${value}" aria-hidden="true">${icon(value === "ks1" ? "flag" : "target")}</span><span class="level-copy"><strong>${label}</strong><small>${detail}</small><span>${value === "ks1" ? "2, 5 and 10 times tables" : "Tables from 1 to 12"}</span></span><span class="selection-mark" aria-hidden="true">${selected ? "✓" : ""}</span></button>`;
}

function tableButton(table: number): string {
  const selected = state.selectedTables.includes(table);
  return `<button type="button" data-table="${table}" class="${selected ? "on" : ""}" aria-pressed="${selected}"><span>${table}×</span><span class="selection-mark" aria-hidden="true">${selected ? "✓" : ""}</span></button>`;
}

type IconName = "flag" | "heart" | "target" | "bolt" | "trophy";

function icon(name: IconName): string {
  const paths: Record<IconName, string> = {
    flag: '<path d="M5 21V3m0 1h14l-3 4 3 4H5"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    bolt: '<path d="m14 2-10 12h7l-1 8 10-12h-7l1-8Z"/>',
    trophy:
      '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function renderBadges(): string {
  const artwork: Record<BadgeId, { icon: IconName; colour: string }> = {
    "first-round": {icon: "flag", colour: "lilac"},
    "perfect-round": {icon: "trophy", colour: "gold"},
    "streak-5": {icon: "bolt", colour: "coral"},
    "heart-25": {icon: "heart", colour: "pink"},
  };
  return (Object.entries(BADGES) as [BadgeId, (typeof BADGES)[BadgeId]][])
    .map(([id, badge]) => {
      const unlocked = stats.badges.includes(id);
      const art = artwork[id];
      const status = unlocked
        ? '<p class="badge-status"><span aria-hidden="true">✓</span> Unlocked</p>'
        : id === "heart-25"
          ? `<p class="badge-status">${Math.min(stats.hearts, 25)} / 25 hearts</p><progress class="heart-progress" max="25" value="${Math.min(stats.hearts, 25)}" aria-label="Heart Hero progress"></progress>`
          : `<p class="badge-status">Locked</p><small>${badge.description}</small>`;
      return `<article class="badge ${unlocked ? "unlocked" : "locked"}"><span class="badge-medallion ${art.colour}" aria-hidden="true">${icon(art.icon)}</span><div><h4>${badge.name}</h4>${status}</div></article>`;
    })
    .join("");
}

function bindEvents(): void {
  document
    .querySelectorAll<HTMLButtonElement>("[data-stage]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        setStage(button.dataset.stage as KeyStage),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-table]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        toggleTable(Number(button.dataset.table)),
      ),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-answer]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        submitAnswer(Number(button.dataset.answer)),
      ),
    );
  document
    .querySelector<HTMLButtonElement>("#start")
    ?.addEventListener("click", startRound);
  document
    .querySelector<HTMLButtonElement>("#change-tables")
    ?.addEventListener("click", () => {
      resetRoundView();
      document.querySelector("#game")?.scrollIntoView({behavior: "smooth"});
    });
}

document.addEventListener("keydown", (event) => {
  if (!state.current || state.answerLocked) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < state.current.choices.length)
    submitAnswer(state.current.choices[index]!);
});

render();
