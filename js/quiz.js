/* ==========================================================================
   quiz.js  -  self-assessment quiz for quiz.html (IT 3203 Milestone 2)
   Author: Rico Burley

   What this script does:
     1. Start button  -> unlocks the questions and starts a 10-minute timer
     2. Timer         -> counts down every second; auto-submits at 0:00
     3. Submit        -> grades every question against ANSWER_KEY,
                         calculates the score, and shows the results
                         (pass/fail, total score, each question, time spent)
     4. Reset         -> clears every input and every result and starts over

   The script is wrapped in an IIFE (an immediately-invoked function) so none
   of its variables leak into the global scope.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Settings ---------- */
  const TIME_LIMIT = 10 * 60;   // 10 minutes, in seconds
  const POINTS_EACH = 10;       // 10 questions x 10 points = 100
  const PASS_MARK = 70;         // need 70 or more to pass
  const WARNING_AT = 60;        // timer turns orange in the last minute

  // Skip smooth scrolling for users who turned off animations
  const SCROLL = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  /* ---------- 2. Answer key ----------
     One entry per question number (matches data-q in the HTML).
     type tells grade() how to read the user's answer:
       "text"     -> fill in the blank; any string in `accept` is correct
       "radio"    -> one correct value
       "checkbox" -> an exact set of correct values (all-or-nothing)
       "select"   -> one correct <option> value
     `show` is the answer text displayed in the results. */
  const ANSWER_KEY = {
    1:  { type: "text",     accept: ["ip", "ip address"], show: "IP" },
    2:  { type: "text",     accept: ["404"],              show: "404" },
    3:  { type: "text",     accept: ["443"],              show: "443" },
    4:  { type: "radio",    correct: "berners-lee",       show: "Tim Berners-Lee" },
    5:  { type: "radio",    correct: "nginx",             show: "Nginx" },
    6:  { type: "radio",    correct: "post",              show: "POST" },
    7:  { type: "radio",    correct: "front",             show: "Receives every request first and passes it to the right server behind it" },
    8:  { type: "checkbox", correct: ["ddos", "sqli", "xss"],          show: "DDoS flooding, SQL injection, Cross-site scripting (XSS)" },
    9:  { type: "checkbox", correct: ["compression", "caching", "cdn"], show: "Compression, Caching, Content delivery network" },
    10: { type: "select",   correct: "htaccess",          show: ".htaccess" }
  };
  const TOTAL_QUESTIONS = Object.keys(ANSWER_KEY).length;

  /* ---------- 3. Page elements ---------- */
  const form       = document.getElementById("quiz-form");
  const questions  = document.getElementById("quiz-questions");
  const startBtn   = document.getElementById("start-btn");
  const submitBtn  = document.getElementById("submit-btn");
  const resetBtn   = document.getElementById("reset-btn");
  const timerEl    = document.getElementById("timer");
  const progressEl = document.getElementById("progress");
  const methodEl   = document.getElementById("request-method");

  const resultsEl  = document.getElementById("quiz-results");
  const verdictEl  = document.getElementById("result-verdict");
  const scoreEl    = document.getElementById("result-score");
  const correctEl  = document.getElementById("result-correct");
  const timeEl     = document.getElementById("result-time");
  const noteEl     = document.getElementById("result-note");
  const rowsEl     = document.getElementById("result-rows");

  /* ---------- 4. Quiz state ---------- */
  let state = "ready";     // "ready" -> "running" -> "done"
  let startedAt = 0;       // time Start was pressed (milliseconds)
  let timerId = null;      // id returned by setInterval, used to stop it


  /* ==========================================================================
     Helper functions
     ========================================================================== */

  /* Turns a number of seconds into "m:ss", e.g. 125 -> "2:05" */
  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  /* Turns seconds into words for the results, e.g. 125 -> "2 min 5 sec" */
  function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (m > 0 ? m + " min " : "") + s + " sec";
  }

  /* Cleans up typed answers so " IP. " and "ip" are treated the same */
  function normalize(text) {
    return text.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?]+$/, "");
  }

  /* Seconds since Start was pressed, never more than the time limit */
  function secondsElapsed() {
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    return Math.min(secs, TIME_LIMIT);
  }

  /* Returns the visible label text for a radio/checkbox input */
  function labelText(input) {
    return input.closest("label").textContent.trim();
  }

  /* Reads what the user entered for one question.
     Returns { values: [...], text: "readable answer" } */
  function readAnswer(num) {
    const key = ANSWER_KEY[num];
    const name = "q" + num;

    if (key.type === "text" || key.type === "select") {
      const field = form.elements[name];
      const value = field.value;
      let text = value.trim();
      if (key.type === "select" && value) {
        text = field.options[field.selectedIndex].text;
      }
      return { values: value ? [value] : [], text: text };
    }

    // radio or checkbox: collect every checked box with this name
    const checked = form.querySelectorAll('input[name="' + name + '"]:checked');
    const values = Array.from(checked, function (box) { return box.value; });
    const text = Array.from(checked, labelText).join(", ");
    return { values: values, text: text };
  }

  /* Decides whether one answer is correct */
  function isCorrect(num, answer) {
    const key = ANSWER_KEY[num];

    switch (key.type) {
      case "text":
        return answer.values.length > 0 && key.accept.includes(normalize(answer.values[0]));
      case "radio":
      case "select":
        return answer.values[0] === key.correct;
      case "checkbox":
        // exact match: same number of picks, and every pick is a correct one
        return answer.values.length === key.correct.length &&
               answer.values.every(function (v) { return key.correct.includes(v); });
      default:
        return false;
    }
  }

  /* Counts how many questions have some answer, for the progress label */
  function countAnswered() {
    let count = 0;
    for (const num in ANSWER_KEY) {
      if (readAnswer(num).values.some(function (v) { return v.trim() !== ""; })) {
        count++;
      }
    }
    return count;
  }

  function updateProgress() {
    progressEl.textContent = countAnswered() + " of " + TOTAL_QUESTIONS + " answered";
  }


  /* ==========================================================================
     Timer
     ========================================================================== */

  /* Runs every second while the quiz is going */
  function tick() {
    const remaining = TIME_LIMIT - secondsElapsed();
    timerEl.textContent = formatClock(remaining);
    timerEl.classList.toggle("timer-low", remaining <= WARNING_AT);

    // Time is up: grade whatever the user has entered so far
    if (remaining <= 0) {
      finishQuiz(true);
    }
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }


  /* ==========================================================================
     Start, submit, reset
     ========================================================================== */

  /* Start button: unlock the questions and begin the countdown */
  function startQuiz() {
    state = "running";
    startedAt = Date.now();
    questions.disabled = false;
    submitBtn.disabled = false;
    startBtn.hidden = true;
    timerId = setInterval(tick, 1000);
    tick();
    form.elements.q1.focus();   // put the cursor in the first blank
  }

  /* Submit button: ask before submitting if some questions are blank */
  function handleSubmit(event) {
    event.preventDefault();      // stop the browser from reloading the page
    if (state !== "running") return;

    const blank = TOTAL_QUESTIONS - countAnswered();
    if (blank > 0) {
      const ok = window.confirm(
        "You left " + blank + (blank === 1 ? " question" : " questions") +
        " blank. Blank answers are marked incorrect. Submit anyway?"
      );
      if (!ok) return;
    }
    finishQuiz(false);
  }

  /* Grades the quiz and shows the results.
     timedOut is true when the 10 minutes ran out. */
  function finishQuiz(timedOut) {
    if (state !== "running") return;
    state = "done";
    stopTimer();

    const timeSpent = secondsElapsed();
    let correctCount = 0;
    rowsEl.innerHTML = "";

    // Grade each question, mark it on the page, and add a row to the table
    for (const num in ANSWER_KEY) {
      const key = ANSWER_KEY[num];
      const answer = readAnswer(num);
      const right = isCorrect(num, answer);
      if (right) correctCount++;

      markQuestion(num, answer, right);
      addResultRow(num, answer, key, right);
    }

    const score = correctCount * POINTS_EACH;
    const passed = score >= PASS_MARK;

    // Summary at the top of the results panel
    verdictEl.textContent = passed ? "Passed" : "Not passed";
    resultsEl.classList.toggle("is-pass", passed);
    resultsEl.classList.toggle("is-fail", !passed);
    scoreEl.textContent = score + " / 100";
    correctEl.textContent = correctCount + " of " + TOTAL_QUESTIONS;
    timeEl.textContent = formatDuration(timeSpent);
    noteEl.textContent = (timedOut ? "Time ran out, so the quiz was submitted automatically. " : "") +
      (passed
        ? "Nice work. Review any questions marked incorrect below."
        : "You need " + PASS_MARK + " to pass. Review the topics below, then press Reset quiz to try again.");

    // Lock the answers so they can't be changed after grading
    questions.disabled = true;
    submitBtn.disabled = true;
    methodEl.textContent = "POST";   // the "request" in the header is now a form submission

    // Show the results and move the screen (and keyboard focus) to them
    resultsEl.hidden = false;
    resultsEl.focus();
    resultsEl.scrollIntoView({ behavior: SCROLL, block: "start" });
  }

  /* Colors one question green or orange and writes feedback under it */
  function markQuestion(num, answer, right) {
    const key = ANSWER_KEY[num];
    const box = form.querySelector('.question[data-q="' + num + '"]');
    const feedback = box.querySelector(".q-feedback");

    box.classList.add(right ? "is-correct" : "is-wrong");
    feedback.textContent = right
      ? "Correct, +" + POINTS_EACH + " points"
      : "Incorrect. Answer: " + key.show;

    // For radio/checkbox questions, highlight the right options
    // and any wrong option the user picked
    if (key.type === "radio" || key.type === "checkbox") {
      const correctValues = key.type === "radio" ? [key.correct] : key.correct;
      box.querySelectorAll("input").forEach(function (input) {
        const label = input.closest("label");
        if (correctValues.includes(input.value)) {
          label.classList.add("is-answer");
        } else if (input.checked) {
          label.classList.add("is-wrong-pick");
        }
      });
    }
  }

  /* Adds one row to the results table.
     Built with createElement + textContent (not innerHTML) so anything
     the user typed is shown as plain text and can never run as code. */
  function addResultRow(num, answer, key, right) {
    const row = document.createElement("tr");
    row.className = right ? "row-correct" : "row-wrong";

    const cells = [
      num,
      right ? "Correct" : "Incorrect",
      answer.text || "(no answer)",
      key.show,
      (right ? POINTS_EACH : 0) + " / " + POINTS_EACH
    ];

    cells.forEach(function (value, i) {
      const cell = document.createElement("td");
      if (i === 1) {
        // the Result column gets a colored chip
        const chip = document.createElement("span");
        chip.className = "chip " + (right ? "chip-ok" : "chip-bad");
        chip.textContent = value;
        cell.appendChild(chip);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });

    rowsEl.appendChild(row);
  }

  /* Reset button: clear every answer and every result, back to the start */
  function resetQuiz() {
    stopTimer();
    state = "ready";
    form.reset();   // clears text boxes, radios, checkboxes and the select

    // Remove grading colors and feedback from every question
    form.querySelectorAll(".question").forEach(function (box) {
      box.classList.remove("is-correct", "is-wrong");
      box.querySelector(".q-feedback").textContent = "";
    });
    form.querySelectorAll(".is-answer, .is-wrong-pick").forEach(function (label) {
      label.classList.remove("is-answer", "is-wrong-pick");
    });

    // Hide and empty the results panel
    resultsEl.hidden = true;
    resultsEl.classList.remove("is-pass", "is-fail");
    rowsEl.innerHTML = "";

    // Put the controls back the way they were when the page loaded
    questions.disabled = true;
    submitBtn.disabled = true;
    startBtn.hidden = false;
    timerEl.textContent = formatClock(TIME_LIMIT);
    timerEl.classList.remove("timer-low");
    methodEl.textContent = "GET";
    updateProgress();

    window.scrollTo({ top: 0, behavior: SCROLL });
    startBtn.focus();
  }


  /* ---------- 5. Wire up the events ---------- */
  startBtn.addEventListener("click", startQuiz);
  form.addEventListener("submit", handleSubmit);
  resetBtn.addEventListener("click", resetQuiz);
  form.addEventListener("input", updateProgress);    // typing in blanks
  form.addEventListener("change", updateProgress);   // radios, checkboxes, select
})();
