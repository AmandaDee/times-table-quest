# Times Table Quest

A personal project built to help my daughter practise multiplication and grow more confident with her times tables.

I wanted to make practice feel encouraging: a few questions at a time, clear choices and a chance to learn from mistakes. Times Table Quest turns that idea into a browser game where children can choose their tables, earn hearts and see their progress over time.

## Why I built it

This project brings together two things I care about: making useful things with code and supporting my daughter’s learning. It gave me an opportunity to explore how a small educational game could be playful, accessible and straightforward to use.

The design follows the dark navy and purple styling of my personal portfolio, with colourful mascots and simple controls to give the game its own personality.

## What the game does

- **Choose a level:** KS1 offers the 2, 5 and 10 times tables; KS2 offers tables from 1 to 12.
- **Pick tables to practise:** focus on one table or mix several together.
- **Play a short round:** answer ten multiple-choice multiplication questions.
- **Build a streak:** consecutive correct answers contribute to the score.
- **Earn hearts and achievements:** celebrate completed rounds and learning milestones.
- **Review mistakes:** see the multiplication, the chosen answer and the correct answer at the end.
- **Track progress:** view completed quests, collected hearts, accuracy and best streak.

The game has no countdown timer. After an answer, it shows feedback briefly before moving to the next question. Children can use a mouse, touch controls or keys **1–4** in the displayed answer order.

KS1 and KS2 are practice options rather than a formal assessment. A parent or teacher can choose the tables that suit the child.

## Built with

| Technology | Role |
| --- | --- |
| TypeScript | Game state, questions, scoring and browser interactions |
| HTML5 | Page structure and accessible controls |
| CSS3 | Responsive layouts, answer states and portfolio styling |
| Local Storage | Progress saved in the child’s browser |
| Vite | Local development and production builds |
| Node.js test runner, Happy DOM and esbuild | Automated game and DOM regression checks |
| Cloudflare Pages | Static hosting with GitHub deployment |

The application runs entirely in the browser. It needs no backend, database or API keys.

## Design and accessibility

The interface uses large answer buttons, readable text, visible keyboard focus and immediate feedback. Correct answers have a green border; incorrect choices are highlighted separately and explained in text.

The layout adapts to desktop, tablet and mobile screens. Decorative mascot images are separate from the HTML, so headings, controls and game content remain real page elements. Reduced-motion preferences are respected.

Mascot illustrations were created with AI assistance for this project. They are decorative assets; the game interface and logic are implemented in HTML, CSS and TypeScript.

## Run locally

Use Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The source `index.html` needs the development server; opening it directly as a file will not run the TypeScript application.

### Tests

```sh
npm test
```

The regression checks cover a complete round, answer feedback, wrong-answer review, saved-progress migration, achievement progress and level/table selection.

### Production build

```sh
npm run build
npm run preview
```

The build checks TypeScript and creates `dist/`. The preview command serves that built version locally.

## Deploy from GitHub to Cloudflare Pages

Keep `package.json` at the root of the GitHub repository alongside `index.html`, `src/` and `public/`. Commit `package-lock.json` so dependency versions are reproducible. Build output and `node_modules/` do not need to be committed.

In Cloudflare, create a **Pages** project, connect GitHub and select the repository. Use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main`, or the repository’s production branch |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave blank when `package.json` is at the repository root |

If the project lives in a subfolder, set the root directory to that folder. Cloudflare builds the site and deploys updates when changes are pushed to the production branch.

Deployment documentation: [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/).

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Application entry point and page metadata |
| `src/main.ts` | Game logic, rendering, scoring, achievements and storage |
| `src/style.css` | Responsive page and game styles |
| `public/hero-mascot.png` | Green homepage illustration |
| `public/mascot-blue.png` | Blue mascot for Choose your quest |
| `public/mascot-coral.png` | Coral mascot for How it works |
| `public/mascot.png` | Lilac mascot for Your progress |
| `public/_headers` | Security headers for Cloudflare Pages |
| `tests/project.test.mjs` | Game and DOM regression checks |

## Progress and privacy

Progress is saved locally in the browser. The game does not ask for a name, account or personal details, and does not include adverts or analytics.

Saved totals include completed rounds, hearts, correct answers, answers given, best streak and unlocked achievements. Individual answers are kept in memory for the current round’s review and are not saved permanently.

Progress belongs to the browser and website address being used. It does not sync between devices, and clearing browser storage removes it. If storage is unavailable, the game can still run, but progress may not be saved.


## What I’m learning

This project has been an opportunity to practise:

- Managing game state and interactions with TypeScript.
- Giving feedback that supports learning rather than only marking answers.
- Building responsive controls for touch and keyboard use.
- Testing game behavior and deploying a static application through GitHub.

---

A personal learning project by **Amanda Bamford**, made to help my daughter build confidence, one times table at a time.
