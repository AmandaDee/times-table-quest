import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {build} from "esbuild";
import {Window} from "happy-dom";

test("original progress migrates and a full round preserves scoring and review", async () => {
  const w = new Window({
    url: "http://localhost", settings: {enableJavaScriptEvaluation: true},
  });
  w.document.write(readFileSync("index.html", "utf8").replace(/<script.*?<\/script>/s, ""),);
  w.localStorage.setItem("times-table-quest:progress:v3", JSON.stringify({
    roundsPlayed: 2, correctAnswers: 15, answersGiven: 20, bestStreak: 5, stars: 25, badges: ["star-25"],
  }),);
  const queue = [];
  w.setTimeout = (fn) => {
    queue.push(fn);
    return queue.length;
  };
  w.clearTimeout = () => {
  };
  const bundle = await build({
    entryPoints: ["src/main.ts"], bundle: true, write: false, format: "iife", loader: {".css": "empty"},
  });
  w.eval(bundle.outputFiles[0].text);
  const click = (selector) => {
    const n = w.document.querySelector(selector);
    assert(n, selector);
    n.click();
  };
  assert.equal(w.document.querySelector(".brand").textContent, "AB.");
  assert.equal(w.document.querySelectorAll(".nav-links a").length, 3);
  assert.equal(w.document.querySelectorAll(".home-features article").length, 4);
  assert.equal(w.document.querySelector(".hero-art").getAttribute("src"), "/hero-mascot.png",);
  assert(w.document.querySelector(".stat-grid").textContent.includes("25"));
  assert.equal(w.document.querySelectorAll(".hero .primary-cta").length, 1);
  assert.equal(w.document.querySelectorAll("[data-mode]").length, 0);
  click("#start");
  for (let i = 0; i < 10; i++) {
    const [a, b] = w.document
      .querySelector(".sum")
      .textContent.match(/\d+/g)
      .map(Number);
    const buttons = [...w.document.querySelectorAll("[data-answer]")];
    buttons
      .find((n) => i === 0 ? Number(n.dataset.answer) !== a * b : Number(n.dataset.answer) === a * b,)
      .click();
    assert.equal(w.document.querySelectorAll(".answer-correct").length, 1);
    assert.equal(w.document.querySelectorAll(".answers button small").length, 0,);
    queue.shift()();
  }
  assert.equal(w.document.querySelectorAll(".review-item").length, 1);
  const saved = JSON.parse(w.localStorage.getItem("times-table-quest:progress:v3"),);
  assert.equal(saved.roundsPlayed, 3);
  assert.equal(saved.hearts, 29);
  assert.equal(saved.correctAnswers, 24);
  assert.equal(saved.answersGiven, 30);
  assert(saved.badges.includes("heart-25"));
  assert.equal(w.document.querySelectorAll(".footer-links").length, 0);
  await w.happyDOM.close();
});

test("Heart Hero shows live saved progress while locked", async () => {
  const w = new Window({
    url: "http://localhost", settings: {enableJavaScriptEvaluation: true},
  });
  w.document.write(readFileSync("index.html", "utf8").replace(/<script.*?<\/script>/s, ""),);
  w.localStorage.setItem("times-table-quest:progress:v3", JSON.stringify({
    roundsPlayed: 5,
    correctAnswers: 27,
    answersGiven: 50,
    bestStreak: 10,
    hearts: 12,
    badges: ["first-round", "perfect-round", "streak-5"],
  }),);
  const bundle = await build({
    entryPoints: ["src/main.ts"], bundle: true, write: false, format: "iife", loader: {".css": "empty"},
  });
  w.eval(bundle.outputFiles[0].text);
  assert.equal(w.document.querySelectorAll(".badge.unlocked").length, 3);
  assert.equal(w.document.querySelectorAll(".badge-medallion").length, 4);
  const bar = w.document.querySelector(".heart-progress");
  assert.equal(bar.getAttribute("value"), "12");
  assert.equal(bar.getAttribute("max"), "25");
  assert(w.document
    .querySelector(".badge.locked")
    .textContent.includes("12 / 25 hearts"),);
  assert(w.document.querySelector(".stat-grid").textContent.includes("54%"));
  assert(w.document
    .querySelector(".achievement-heading")
    .textContent.includes("3 of 4 unlocked"),);
  await w.happyDOM.close();
});

test("quest cards select levels and tables with accessible state", async () => {
  const w = new Window({
    url: "http://localhost", settings: {enableJavaScriptEvaluation: true},
  });
  w.document.write(readFileSync("index.html", "utf8").replace(/<script.*?<\/script>/s, ""),);
  const bundle = await build({
    entryPoints: ["src/main.ts"], bundle: true, write: false, format: "iife", loader: {".css": "empty"},
  });
  w.eval(bundle.outputFiles[0].text);
  assert(!w.document.querySelector("#game .eyebrow").textContent.includes("01"),);
  assert(!w.document.querySelector("#how .eyebrow").textContent.includes("02"));
  assert.equal(w.document.querySelector("#game .section-mascot").getAttribute("src"), "/mascot-blue.png",);
  assert.equal(w.document.querySelector("#how .section-mascot").getAttribute("src"), "/mascot-coral.png",);
  w.document.querySelector('[data-stage="ks2"]').click();
  assert.equal(w.document.querySelector('[data-stage="ks2"]').getAttribute("aria-pressed"), "true",);
  assert.equal(w.document.querySelectorAll("[data-table]").length, 12);
  w.document.querySelector('[data-table="7"]').click();
  assert.equal(w.document.querySelector('[data-table="7"]').getAttribute("aria-pressed"), "true",);
  assert.equal(w.document.querySelector("#how .steps").children.length, 3);
  assert.equal(w.document.querySelectorAll("#start").length, 1);
  await w.happyDOM.close();
});
