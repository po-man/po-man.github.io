(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initClips() {
    var clips = document.querySelectorAll(".plate__clip");
    if (!clips.length) return;

    Array.prototype.forEach.call(clips, function (clip) {
      var figure = clip.closest("figure");
      var button = figure ? figure.querySelector("[data-clip-toggle]") : null;
      var titleEl = clip.closest("article") ? clip.closest("article").querySelector(".project__title") : null;
      var clipName = "";
      if (titleEl) {
        var titleCopy = titleEl.cloneNode(true);
        var zh = titleCopy.querySelector(".project__zh");
        if (zh) zh.remove();
        clipName = titleCopy.textContent.trim();
      }
      var userPaused = false;

      function attemptPlay() {
        var promise = clip.play();
        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {});
        }
      }

      function setLabel(playing) {
        if (!button) return;
        button.textContent = playing ? "Pause" : "Play";
        button.setAttribute(
          "aria-label",
          (playing ? "Pause " : "Play ") + (clipName ? clipName + " clip" : "this clip")
        );
      }

      if (button) {
        button.hidden = false;
        setLabel(false);
        button.addEventListener("click", function () {
          if (clip.paused) {
            userPaused = false;
            attemptPlay();
          } else {
            userPaused = true;
            clip.pause();
          }
        });
      }

      clip.addEventListener("play", function () {
        setLabel(true);
      });

      clip.addEventListener("pause", function () {
        setLabel(false);
      });

      if (reduceMotion.matches) return;

      if (!("IntersectionObserver" in window)) {
        attemptPlay();
        return;
      }

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              if (!userPaused) attemptPlay();
            } else {
              clip.pause();
            }
          });
        },
        { rootMargin: "200px 0px" }
      );

      observer.observe(clip);
    });
  }

  function initFieldTest() {
    var plot = document.querySelector(".field-test__plot");
    if (!plot || reduceMotion.matches) return;

    var line = plot.querySelector(".field-test__line");
    var dots = plot.querySelectorAll(".field-test__dot");
    if (!line || !dots.length) return;

    var variances = [12, 10, 13, 8];
    var HOLD = 1000;
    var MOVE = 400;

    var points = Array.prototype.map.call(dots, function (dot, index) {
      var y = parseFloat(dot.getAttribute("cy"));
      return {
        el: dot,
        cx: dot.getAttribute("cx"),
        baseY: y,
        y: y,
        variance: variances[index] || variances[variances.length - 1]
      };
    });

    var timer = null;
    var frame = null;
    var inView = false;
    var moveStart = 0;
    var moves = [];

    function updateLine() {
      var d = "M20 100";
      for (var i = 0; i < points.length; i++) {
        var point = points[i];
        d += "L" + point.cx + " " + point.y.toFixed(2);
      }
      line.setAttribute("d", d);
    }

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(now) {
      var t = Math.min((now - moveStart) / MOVE, 1);
      var eased = ease(t);

      for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        var point = move.point;
        point.y = move.startY + (move.targetY - move.startY) * eased;
        point.el.setAttribute("cy", point.y.toFixed(2));
      }
      updateLine();

      if (t < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        frame = null;
        hold();
      }
    }

    function move() {
      timer = null;
      moveStart = performance.now();
      moves = [];
      for (var i = 0; i < points.length; i++) {
        var point = points[i];
        moves.push({
          point: point,
          startY: point.y,
          targetY: point.baseY + (Math.random() * 2 - 1) * point.variance
        });
      }
      frame = window.requestAnimationFrame(step);
    }

    function hold() {
      timer = window.setTimeout(move, HOLD);
    }

    function start() {
      if (timer !== null || frame !== null) return;
      hold();
    }

    function stop() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }

    function sync() {
      if (inView && document.visibilityState !== "hidden") start();
      else stop();
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            inView = entry.isIntersecting;
            sync();
          });
        },
        { rootMargin: "120px 0px" }
      );
      observer.observe(plot);
    } else {
      inView = true;
      sync();
    }

    document.addEventListener("visibilitychange", sync);
  }

  function initForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var submit = document.getElementById("contact-submit");
    var startedAt = document.getElementById("contact-started-at");
    var topic = document.getElementById("contact-topic");
    var endpoint = window.SITE_CONFIG && window.SITE_CONFIG.contactEndpoint;

    var MIN_MESSAGE = 10;
    var MAX_MESSAGE = 4000;
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var ERROR_COPY = {
      name: "Please add your name, 80 characters or fewer.",
      email: "Please check your email address.",
      topic: "Please choose a topic from the list.",
      message_short: "Please write at least " + MIN_MESSAGE + " characters so I know what this is about.",
      message_long: "That message is too long. Please keep it under " + MAX_MESSAGE + " characters.",
      duplicate: "This looks like the message you just sent.",
      throttled: "You sent a message recently. Please wait a few minutes before sending another.",
      busy: "The server is busy right now. Please try again in a minute.",
      rejected: "The message did not send. Please try again.",
      server: "The message did not send. Please try again in a minute."
    };

    var ERROR_FIELDS = {
      name: "contact-name",
      email: "contact-email",
      topic: "contact-topic",
      message_short: "contact-message",
      message_long: "contact-message"
    };

    function setStatus(message, state) {
      status.textContent = message;
      if (state) {
        status.dataset.state = state;
      } else {
        delete status.dataset.state;
      }
    }

    function clearInvalid() {
      form.querySelectorAll(".field--invalid").forEach(function (field) {
        field.classList.remove("field--invalid");
        var control = field.querySelector("input, select, textarea");
        if (control) control.removeAttribute("aria-invalid");
      });
    }

    function showError(code) {
      setStatus(ERROR_COPY[code] || ERROR_COPY.server, "error");

      var id = ERROR_FIELDS[code];
      if (!id) return;

      var control = document.getElementById(id);
      if (!control) return;

      var field = control.closest(".field");
      if (field) field.classList.add("field--invalid");
      control.setAttribute("aria-invalid", "true");
      control.focus();
    }

    function resetClock() {
      startedAt.value = String(Date.now());
    }

    resetClock();

    if (endpoint) {
      form.setAttribute("action", endpoint);
      form.setAttribute("method", "post");
    }

    document.querySelectorAll("[data-topic]").forEach(function (link) {
      link.addEventListener("click", function () {
        var value = link.getAttribute("data-topic");
        if (topic && value) topic.value = value;
      });
    });

    function preflight(payload) {
      if (!payload.name || payload.name.length > 80) return "name";
      if (!payload.email || payload.email.length > 120 || !EMAIL_PATTERN.test(payload.email)) return "email";

      var allowedTopics = Array.prototype.map.call(topic.options, function (option) {
        return option.value;
      });
      if (allowedTopics.indexOf(payload.topic) === -1) return "topic";

      if (payload.message.length < MIN_MESSAGE) return "message_short";
      if (payload.message.length > MAX_MESSAGE) return "message_long";
      return null;
    }

    form.addEventListener("input", function (event) {
      var field = event.target.closest(".field");
      if (field && field.classList.contains("field--invalid")) {
        field.classList.remove("field--invalid");
        event.target.removeAttribute("aria-invalid");
        if (status.dataset.state === "error") setStatus("", null);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearInvalid();

      var data = new FormData(form);
      var payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        topic: String(data.get("topic") || "").trim(),
        message: String(data.get("message") || "").trim(),
        website: String(data.get("website") || "").trim(),
        started_at: Number(data.get("started_at") || 0),
        origin: window.location.origin,
        page: window.location.pathname
      };

      var problem = preflight(payload);
      if (problem) {
        showError(problem);
        return;
      }

      if (!endpoint) {
        setStatus("The form is not configured yet.", "error");
        return;
      }

      submit.disabled = true;
      setStatus("Sending.", null);

      fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("request failed");
          return response.text();
        })
        .then(function (result) {
          var text = result.trim();
          if (text === "ok") {
            form.reset();
            resetClock();
            clearInvalid();
            setStatus("Message sent. I will reply when I can.", "success");
            return;
          }
          if (text.indexOf("error: ") === 0) {
            showError(text.slice(7).trim());
            return;
          }
          showError("server");
        })
        .catch(function () {
          setStatus("The message did not send. Check your connection and try again.", "error");
        })
        .finally(function () {
          submit.disabled = false;
        });
    });
  }

  function initNotes() {
    var notes = document.querySelectorAll("details.note");
    if (!notes.length) return;

    // The desktop view keeps the notes open (the markup ships them open). On
    // small screens they collapse before first paint, and printing always
    // restores them so the engineering notes are never lost from the dossier.
    function openAll() {
      Array.prototype.forEach.call(notes, function (note) {
        if (!note.open) {
          note.dataset.printClosed = "true";
          note.open = true;
        }
      });
    }

    function restore() {
      Array.prototype.forEach.call(notes, function (note) {
        if (note.dataset.printClosed) {
          note.open = false;
          delete note.dataset.printClosed;
        }
      });
    }

    window.addEventListener("beforeprint", openAll);
    window.addEventListener("afterprint", restore);
  }

  function initLightbox() {
    var dialog = document.getElementById("lightbox");
    if (!dialog) return;

    var deck = dialog.querySelector("[data-lightbox-deck]");
    var stage = dialog.querySelector("[data-lightbox-stage]");
    var caption = dialog.querySelector("[data-lightbox-caption]");
    var closeButton = dialog.querySelector("[data-lightbox-close]");
    var bar = dialog.querySelector("[data-lightbox-bar]");
    var countEl = dialog.querySelector("[data-lightbox-count]");
    var dotsEl = dialog.querySelector("[data-lightbox-dots]");
    var hintEl = dialog.querySelector("[data-lightbox-hint]");
    var prevButton = dialog.querySelector("[data-lightbox-prev]");
    var nextButton = dialog.querySelector("[data-lightbox-next]");
    if (!deck || !stage || !caption || !closeButton) return;
    if (!bar || !countEl || !dotsEl || !hintEl || !prevButton || !nextButton) return;

    var canShowModal = typeof dialog.showModal === "function";
    var lastTrigger = null;
    var openClip = null;
    var slides = [];
    var index = 0;
    var hintTimer = null;
    var hintDismissed = false;
    var touchStart = null;
    var suppressStageClick = false;

    function labelOf(figure) {
      var mark = figure.querySelector("figcaption span");
      return mark ? mark.textContent.trim() : "Figure";
    }

    function captionOf(figure) {
      var source = figure.querySelector("figcaption");
      if (!source) return "";
      var clone = source.cloneNode(true);
      var toggle = clone.querySelector("[data-clip-toggle]");
      if (toggle) toggle.remove();
      var mark = clone.querySelector("span");
      if (mark) mark.remove();
      return clone.textContent.replace(/\s+/g, " ").trim();
    }

    function sourceUrl(video) {
      var source = video.querySelector("source");
      return source ? source.src : video.currentSrc || video.src || "";
    }

    function slidesOf(figure) {
      var media = figure.querySelector(".plate__media");
      if (!media) return [];

      var list = [];
      var image = media.querySelector("img");
      var video = media.querySelector("video");
      var leadingCaption = captionOf(figure);

      if (image) {
        list.push({
          type: "image",
          src: image.currentSrc || image.src,
          alt: image.alt || "",
          caption: leadingCaption
        });
      } else if (video) {
        list.push({
          type: "video",
          src: sourceUrl(video),
          poster: video.poster || "",
          caption: leadingCaption
        });
      } else {
        return [];
      }

      var template = figure.querySelector("template[data-plate-slides]");
      if (!template || !template.content) return list;

      Array.prototype.forEach.call(template.content.querySelectorAll("img, video"), function (node) {
        if (node.tagName === "VIDEO") {
          list.push({
            type: "video",
            src: sourceUrl(node),
            poster: node.poster || "",
            caption: node.getAttribute("data-caption") || ""
          });
          return;
        }
        list.push({
          type: "image",
          src: node.getAttribute("src"),
          alt: node.alt || "",
          caption: node.getAttribute("data-caption") || node.alt || ""
        });
      });

      return list;
    }

    function stopClip() {
      if (openClip) {
        openClip.pause();
        openClip = null;
      }
    }

    function clearHintTimer() {
      if (hintTimer !== null) {
        window.clearTimeout(hintTimer);
        hintTimer = null;
      }
    }

    function dismissHint() {
      if (hintDismissed) return;
      hintDismissed = true;
      clearHintTimer();
      hintEl.classList.add("is-dismissed");
    }

    function scheduleHint() {
      clearHintTimer();
      if (hintDismissed) return;
      hintTimer = window.setTimeout(dismissHint, 4000);
    }

    function buildDots() {
      dotsEl.textContent = "";
      if (slides.length < 2) return;
      for (var i = 0; i < slides.length; i++) {
        var dot = document.createElement("span");
        dot.className = "lightbox__dot";
        dotsEl.appendChild(dot);
      }
    }

    function syncChrome() {
      var multi = slides.length > 1;
      var focusWasNext = document.activeElement === nextButton;
      var focusWasPrev = document.activeElement === prevButton;

      dialog.classList.toggle("lightbox--gallery", multi);
      dialog.classList.toggle("can-advance", multi && index < slides.length - 1);
      bar.hidden = !multi;
      prevButton.hidden = !multi || index === 0;
      nextButton.hidden = !multi || index === slides.length - 1;
      hintEl.hidden = !multi || index === slides.length - 1;

      if (!multi) return;

      countEl.textContent = index + 1 + " / " + slides.length;

      var dots = dotsEl.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("is-current", i === index);
      }

      // A clicked arrow hides at the end of the run; keep keyboard focus in the
      // dialog instead of dropping it back to the page.
      if (focusWasNext && nextButton.hidden) {
        (prevButton.hidden ? closeButton : prevButton).focus();
      } else if (focusWasPrev && prevButton.hidden) {
        (nextButton.hidden ? closeButton : nextButton).focus();
      }
    }

    function renderSlide() {
      var slide = slides[index];
      if (!slide) return;

      stopClip();
      stage.textContent = "";

      if (slide.type === "image") {
        var big = document.createElement("img");
        big.src = slide.src;
        big.alt = slide.alt || "";
        big.decoding = "async";
        stage.appendChild(big);
      } else {
        var clip = document.createElement("video");
        clip.controls = true;
        clip.playsInline = true;
        clip.preload = "metadata";
        if (slide.poster) clip.poster = slide.poster;
        if (slide.src) {
          var child = document.createElement("source");
          child.src = slide.src;
          clip.appendChild(child);
        }
        stage.appendChild(clip);
        openClip = clip;
      }

      caption.textContent = slide.caption;
      caption.hidden = !slide.caption;
      dialog.setAttribute("aria-label", slide.caption || "Figure");

      syncChrome();
    }

    function goTo(next) {
      if (slides.length < 2) return;
      if (next < 0 || next > slides.length - 1 || next === index) return;

      var media = stage.querySelector("video");
      if (media && !media.paused) media.pause();

      index = next;
      renderSlide();
      dismissHint();
    }

    function teardown() {
      stage.textContent = "";
      stopClip();
      clearHintTimer();
      slides = [];
      index = 0;
      hintDismissed = false;
      hintEl.classList.remove("is-dismissed");
      hintEl.textContent = "";
      dotsEl.textContent = "";
      countEl.textContent = "";
      dialog.classList.remove("lightbox--gallery");
      dialog.classList.remove("lightbox--portrait");
      dialog.classList.remove("can-advance");
      bar.hidden = true;
      prevButton.hidden = true;
      nextButton.hidden = true;
      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    }

    function closeLightbox() {
      if (dialog.open) dialog.close();
      teardown();
    }

    function openLightbox(figure) {
      slides = slidesOf(figure);
      if (!slides.length) return;
      index = 0;
      hintDismissed = false;
      dialog.classList.toggle("lightbox--portrait", figure.classList.contains("plate--portrait"));

      buildDots();
      renderSlide();

      if (hintEl.hidden === false) scheduleHint();

      if (!canShowModal) {
        var first = slides[0];
        var fallback = first.type === "image" ? first.src : first.src;
        if (fallback) window.open(fallback, "_blank", "noopener");
        teardown();
        return;
      }

      if (!dialog.open) dialog.showModal();
      closeButton.focus();

      // Warm the next frame so the first swipe or click is instant.
      for (var i = 1; i < slides.length; i++) {
        if (slides[i].type === "image") {
          var preload = new Image();
          preload.src = slides[i].src;
        }
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll(".plate"), function (figure) {
      var media = figure.querySelector(".plate__media");
      if (!media) return;
      if (!media.querySelector("img") && !media.querySelector("video")) return;

      media.setAttribute("role", "button");
      media.setAttribute("tabindex", "0");
      media.setAttribute("aria-haspopup", "dialog");
      media.setAttribute("aria-label", "Enlarge " + labelOf(figure));

      function activate() {
        lastTrigger = media;
        openLightbox(figure);
      }

      media.addEventListener("click", activate);
      media.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          activate();
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", function () {
      goTo(index - 1);
    });
    nextButton.addEventListener("click", function () {
      goTo(index + 1);
    });

    // On desktop the stage itself advances the gallery, so "Click" is literal.
    stage.addEventListener("click", function (event) {
      if (slides.length < 2) return;
      if (suppressStageClick) return;
      if (index >= slides.length - 1) return;
      if (event.target.closest("video, button, a")) return;
      goTo(index + 1);
    });

    dialog.addEventListener("keydown", function (event) {
      if (slides.length < 2) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      }
    });

    // Swipe: horizontal only, so a vertical drag still scrolls the page.
    deck.addEventListener(
      "touchstart",
      function (event) {
        if (slides.length < 2) return;
        var touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true }
    );

    deck.addEventListener(
      "touchend",
      function (event) {
        if (!touchStart || slides.length < 2) return;
        var touch = event.changedTouches[0];
        var dx = touch.clientX - touchStart.x;
        var dy = touch.clientY - touchStart.y;
        touchStart = null;

        if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
        if (event.target.closest("video")) return;

        // A swipe also emits a click; eat it so the gallery does not advance twice.
        suppressStageClick = true;
        window.setTimeout(function () {
          suppressStageClick = false;
        }, 400);

        goTo(dx < 0 ? index + 1 : index - 1);
      },
      { passive: true }
    );

    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      var inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) closeLightbox();
    });

    // Safety net for native closes (Escape): teardown is idempotent.
    dialog.addEventListener("close", teardown);
  }

  initFieldTest();
  initClips();
  initNotes();
  initLightbox();
  initForm();
})();
