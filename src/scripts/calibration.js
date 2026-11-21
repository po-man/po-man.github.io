(function () {
  "use strict";

  var BASE_QUESTIONS = [
    {
      q: "A browser sends a CORS preflight before a cross-origin POST with `Content-Type: application/json`.",
      answer: true,
      why: "`application/json` is not a safelisted content type, so the browser sends an `OPTIONS` request first."
    },
    {
      q: "A cross-origin POST with `Content-Type: application/x-www-form-urlencoded` triggers a CORS preflight.",
      answer: false,
      why: "That content type is safelisted, so the browser sends the POST directly."
    },
    {
      q: "A Content-Security-Policy delivered in a `<meta>` tag can enforce `frame-ancestors`.",
      answer: false,
      why: "`frame-ancestors` is ignored in a meta tag. It needs an HTTP header."
    },
    {
      q: "JavaScript's default `Array.sort()` compares numbers numerically.",
      answer: false,
      why: "It converts values to strings and compares UTF-16 code units."
    },
    {
      q: "In TypeScript, a value typed `unknown` can be passed to a function expecting `string` without a check.",
      answer: false,
      why: "`unknown` must be narrowed before it can be used as a string."
    },
    {
      q: "A JWT payload is encrypted by default.",
      answer: false,
      why: "A signed JWT is encoded and signed, not encrypted. Encryption requires JWE."
    },
    {
      q: "The OAuth 2.0 authorization code flow without PKCE is safe for public clients that cannot keep a secret.",
      answer: false,
      why: "A public client cannot keep a secret. PKCE is the extension that makes the code flow safe for it."
    },
    {
      q: "A left join can return more rows than the left table contains.",
      answer: true,
      why: "Multiple matches on the right side duplicate left rows."
    },
    {
      q: "In SQL, `NULL = NULL` evaluates to true.",
      answer: false,
      why: "It evaluates to unknown. Use `IS NULL`."
    },
    {
      q: "`COUNT(*)` ignores rows where every column is NULL.",
      answer: false,
      why: "`COUNT(*)` counts rows. `COUNT(column)` ignores NULLs in that column."
    },
    {
      q: "In Git, `git reset --hard` removes untracked files.",
      answer: false,
      why: "It resets tracked files. Untracked files remain."
    },
    {
      q: "In Git, `git rebase` rewrites commit hashes.",
      answer: true,
      why: "Rebase creates new commits with new hashes."
    },
    {
      q: "A deadlock can occur when two processes each hold a lock that the other needs.",
      answer: true,
      why: "Each waits for the other, so neither can proceed."
    },
    {
      q: "An index can make a write slower.",
      answer: true,
      why: "The index has to be updated on writes."
    },
    {
      q: "A cache can make a system slower.",
      answer: true,
      why: "Lookup overhead, misses, and invalidation can cost more than the cache saves."
    },
    {
      q: "In HTTP/2, multiple requests can share one TCP connection.",
      answer: true,
      why: "HTTP/2 multiplexes streams over a single connection."
    },
    {
      q: "TCP preserves message boundaries.",
      answer: false,
      why: "TCP is a byte stream. The application has to frame messages."
    },
    {
      q: "A `<button>` inside a form submits the form unless its `type` is set.",
      answer: true,
      why: "The default type is `submit`."
    },
    {
      q: "`aria-hidden=\"true\"` removes an element from the accessibility tree.",
      answer: true,
      why: "Assistive technology ignores the element and its descendants."
    },
    {
      q: "In Docker, containers share the host machine's kernel.",
      answer: true,
      why: "Containers are isolated processes, not separate kernels."
    }
  ];

  var BINS = [55, 65, 75, 85, 95];
  var quizView = document.getElementById("quiz-view");
  var resultsView = document.getElementById("results-view");
  var card = document.getElementById("question-card");
  var progressLabel = document.getElementById("progress-label");
  var progress = document.getElementById("progress");
  var progressBar = document.getElementById("progress-bar");
  var backButton = document.getElementById("back");
  var nextButton = document.getElementById("next");

  var questions = [];
  var answers = [];
  var index = 0;

  function shuffle(items) {
    var list = items.slice();
    for (var i = list.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(value) {
    return esc(value).replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function current() {
    return answers[index];
  }

  function setProgress() {
    var done = index;
    var total = questions.length;
    progressLabel.textContent = "Question " + (index + 1) + " of " + total;
    progress.setAttribute("aria-valuenow", String(done));
    progress.setAttribute("aria-valuetext", done + " of " + total + " answered");
    progressBar.style.width = ((done / total) * 100) + "%";
  }

  function updateNext() {
    var state = current();
    var ready = state && state.answer !== null && state.confidence !== null;
    nextButton.disabled = !ready;
    nextButton.textContent = index === questions.length - 1 ? "See results" : "Next question";
    backButton.disabled = index === 0;
  }

  function renderQuestion() {
    var state = current();
    var q = questions[index];

    card.innerHTML =
      '<fieldset class="question" tabindex="-1">' +
        '<legend class="question__text"><span class="mono">Q ' + String(index + 1).padStart(2, "0") + "</span><br>" + fmt(q.q) + "</legend>" +
        '<div class="choices" role="radiogroup" aria-label="Answer">' +
          '<label class="choice"><input type="radio" name="answer" value="true"><span>True</span></label>' +
          '<label class="choice"><input type="radio" name="answer" value="false"><span>False</span></label>' +
        "</div>" +
        '<p class="quiz__label mono">How sure are you?</p>' +
        '<div class="confidence" role="radiogroup" aria-label="Confidence">' +
          BINS.map(function (value) {
            return '<label class="choice"><input type="radio" name="confidence" value="' + value + '"><span>' + value + "%</span></label>";
          }).join("") +
        "</div>" +
      "</fieldset>";

    if (state.answer !== null) {
      var answerInput = card.querySelector('input[name="answer"][value="' + state.answer + '"]');
      if (answerInput) answerInput.checked = true;
    }

    if (state.confidence !== null) {
      var confidenceInput = card.querySelector('input[name="confidence"][value="' + state.confidence + '"]');
      if (confidenceInput) confidenceInput.checked = true;
    }

    setProgress();
    updateNext();
    card.querySelector(".question").focus({ preventScroll: true });
  }

  function selectRadio(name, value) {
    var input = card.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  card.addEventListener("change", function (event) {
    var target = event.target;
    if (!target || !target.name) return;
    var state = current();
    if (target.name === "answer") {
      state.answer = target.value === "true";
    }
    if (target.name === "confidence") {
      state.confidence = Number(target.value);
    }
    updateNext();
  });

  backButton.addEventListener("click", function () {
    if (index === 0) return;
    index -= 1;
    renderQuestion();
  });

  nextButton.addEventListener("click", function () {
    var state = current();
    if (state.answer === null || state.confidence === null) return;
    if (index === questions.length - 1) {
      showResults();
      return;
    }
    index += 1;
    renderQuestion();
  });

  document.addEventListener("keydown", function (event) {
    if (resultsView && !resultsView.classList.contains("hidden")) return;
    var tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.key === "Enter" && !nextButton.disabled) {
      event.preventDefault();
      nextButton.click();
      return;
    }
    if (event.key.toLowerCase() === "t") {
      selectRadio("answer", "true");
    }
    if (event.key.toLowerCase() === "f") {
      selectRadio("answer", "false");
    }
    if (/^[1-5]$/.test(event.key)) {
      selectRadio("confidence", BINS[Number(event.key) - 1]);
    }
  });

  function buildPlot(bins) {
    var width = 720;
    var height = 440;
    var left = 64;
    var right = 28;
    var top = 28;
    var bottom = 64;
    var xMin = 50;
    var xMax = 100;
    var plotWidth = width - left - right;
    var plotHeight = height - top - bottom;

    function x(value) {
      return left + ((value - xMin) / (xMax - xMin)) * plotWidth;
    }

    function y(value) {
      return height - bottom - (value / 100) * plotHeight;
    }

    var grid = "";
    var v;
    for (v = 0; v <= 100; v += 20) {
      grid += '<line x1="' + left + '" y1="' + y(v) + '" x2="' + (width - right) + '" y2="' + y(v) + '" stroke="#d6cebd" stroke-width="1"/>';
      grid += '<text x="' + (left - 12) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" fill="#6c675b">' + v + "%</text>";
    }
    for (v = 50; v <= 100; v += 10) {
      grid += '<line x1="' + x(v) + '" y1="' + top + '" x2="' + x(v) + '" y2="' + (height - bottom) + '" stroke="#d6cebd" stroke-width="1"/>';
      grid += '<text x="' + x(v) + '" y="' + (height - bottom + 24) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" fill="#6c675b">' + v + "%</text>";
    }

    var active = bins.filter(function (bin) { return bin.count > 0; });
    var linePoints = active.map(function (bin) { return x(bin.confidence) + "," + y(bin.accuracy); }).join(" ");

    var points = active.map(function (bin) {
      var radius = 4 + Math.min(7, Math.sqrt(bin.count) * 2);
      return (
        '<circle cx="' + x(bin.confidence) + '" cy="' + y(bin.accuracy) + '" r="' + radius + '" fill="#b23a22" stroke="#f3f0e7" stroke-width="2">' +
          "<title>" + bin.confidence + "% confidence, " + bin.count + " answers, " + bin.accuracy.toFixed(0) + "% correct</title>" +
        "</circle>" +
        '<text x="' + x(bin.confidence) + '" y="' + (y(bin.accuracy) - radius - 7) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#b23a22">' + bin.count + "</text>"
      );
    }).join("");

    return (
      '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-labelledby="plot-title plot-desc">' +
        '<title id="plot-title">Calibration curve</title>' +
        '<desc id="plot-desc">Stated confidence on the horizontal axis and actual accuracy on the vertical axis. The dashed line is perfect calibration.</desc>' +
        grid +
        '<line x1="' + x(50) + '" y1="' + y(0) + '" x2="' + x(100) + '" y2="' + y(100) + '" stroke="#181712" stroke-width="1" stroke-dasharray="5 5" opacity="0.5"/>' +
        (linePoints ? '<polyline points="' + linePoints + '" fill="none" stroke="#b23a22" stroke-width="1.5"/>' : "") +
        points +
        '<text x="' + (left + plotWidth / 2) + '" y="' + (height - 10) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#6c675b">STATED CONFIDENCE</text>' +
        '<text x="16" y="' + (top + plotHeight / 2) + '" text-anchor="middle" transform="rotate(-90 16 ' + (top + plotHeight / 2) + ')" font-family="IBM Plex Mono, monospace" font-size="10" fill="#6c675b">ACTUAL ACCURACY</text>' +
      "</svg>"
    );
  }

  function showResults() {
    var total = questions.length;
    var correct = 0;
    var confidenceSum = 0;
    var brierSum = 0;
    var bins = BINS.map(function (confidence) {
      return { confidence: confidence, count: 0, correct: 0, accuracy: 0 };
    });
    var binLookup = {};
    bins.forEach(function (bin) { binLookup[bin.confidence] = bin; });

    questions.forEach(function (q, position) {
      var state = answers[position];
      var bin = binLookup[state.confidence];
      var isCorrect = state.answer === q.answer;
      bin.count += 1;
      if (isCorrect) {
        bin.correct += 1;
        correct += 1;
      }
      confidenceSum += state.confidence;
      brierSum += Math.pow(state.confidence / 100 - (isCorrect ? 1 : 0), 2);
    });

    bins.forEach(function (bin) {
      bin.accuracy = bin.count ? (bin.correct / bin.count) * 100 : 0;
    });

    var accuracy = (correct / total) * 100;
    var meanConfidence = confidenceSum / total;
    var brier = brierSum / total;

    var summary =
      '<div class="results__head">' +
        '<h2 id="results-title">Your calibration</h2>' +
        '<p class="mono">' + total + " questions / shuffled order</p>" +
      "</div>" +
      '<div class="summary">' +
        '<div class="stat"><p class="stat__label mono">Mean confidence</p><p class="stat__value">' + meanConfidence.toFixed(0) + '%</p><p class="stat__note">What you said on average.</p></div>' +
        '<div class="stat"><p class="stat__label mono">Accuracy</p><p class="stat__value">' + accuracy.toFixed(0) + '%</p><p class="stat__note">' + correct + " of " + total + " correct.</p></div>" +
        '<div class="stat"><p class="stat__label mono">Brier score</p><p class="stat__value">' + brier.toFixed(2) + '</p><p class="stat__note">Lower is better. 0.25 is the score for always saying 50 percent.</p></div>' +
      "</div>" +
      '<section class="results__section" aria-labelledby="plot-heading">' +
        '<h3 id="plot-heading">Calibration curve</h3>' +
        '<p>The dashed line is perfect calibration. The oxide line follows your actual accuracy at each confidence level. Point size shows how many answers landed in that bin.</p>' +
        '<div class="plot-wrap">' + buildPlot(bins) + "</div>" +
        '<p class="plot-caption">A point above the dashed line means you were underconfident. A point below it means you were overconfident.</p>' +
      "</section>" +
      '<section class="results__section" aria-labelledby="table-heading">' +
        '<h3 id="table-heading">By confidence level</h3>' +
        '<div class="table-wrap"><table class="results-table"><caption>Answers grouped by stated confidence</caption><thead><tr><th scope="col">Confidence</th><th scope="col">Answers</th><th scope="col">Correct</th><th scope="col">Accuracy</th><th scope="col">Gap</th></tr></thead><tbody>' +
          bins.map(function (bin) {
            var gap = bin.count ? (bin.accuracy - bin.confidence).toFixed(0) + " pts" : "No answers";
            return "<tr><td>" + bin.confidence + "%</td><td>" + bin.count + "</td><td>" + bin.correct + "</td><td>" + (bin.count ? bin.accuracy.toFixed(0) + "%" : "No answers") + "</td><td>" + gap + "</td></tr>";
          }).join("") +
        "</tbody></table></div>" +
      "</section>" +
      '<section class="results__section" aria-labelledby="review-heading">' +
        '<h3 id="review-heading">Question review</h3>' +
        '<p>Every question, with your answer, the correct answer, and a short explanation.</p>' +
        '<div class="review">' +
          questions.map(function (q, position) {
            var state = answers[position];
            var isCorrect = state.answer === q.answer;
            var yourAnswer = state.answer ? "True" : "False";
            var correctAnswer = q.answer ? "True" : "False";
            return (
              '<details class="review__item">' +
                "<summary>" +
                  '<span class="review__no">Q ' + String(position + 1).padStart(2, "0") + "</span>" +
                  '<span class="review__q">' + fmt(q.q) + "</span>" +
                  '<span class="review__result ' + (isCorrect ? "review__result--right" : "review__result--wrong") + '">' + (isCorrect ? "Correct" : "Incorrect") + "</span>" +
                "</summary>" +
                '<div class="review__body">' +
                  '<p class="review__meta">Your answer: ' + yourAnswer + ". Correct answer: " + correctAnswer + ". Confidence: " + state.confidence + "%.</p>" +
                  "<p>" + fmt(q.why) + "</p>" +
                "</div>" +
              "</details>"
            );
          }).join("") +
        "</div>" +
      "</section>" +
      '<div class="results__actions"><button type="button" class="button" id="retake">Take it again</button><a class="text-button" href="/">Back to Field Notes</a></div>';

    resultsView.innerHTML = summary;
    quizView.classList.add("hidden");
    resultsView.classList.remove("hidden");
    resultsView.focus({ preventScroll: true });
    progressBar.style.width = "100%";
    progress.setAttribute("aria-valuenow", String(total));

    document.getElementById("retake").addEventListener("click", reset);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  function reset() {
    questions = shuffle(BASE_QUESTIONS);
    answers = questions.map(function () {
      return { answer: null, confidence: null };
    });
    index = 0;
    resultsView.classList.add("hidden");
    quizView.classList.remove("hidden");
    renderQuestion();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  reset();
})();
