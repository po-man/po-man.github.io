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

  function initForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var submit = document.getElementById("contact-submit");
    var startedAt = document.getElementById("contact-started-at");
    var topic = document.getElementById("contact-topic");
    var endpoint = window.SITE_CONFIG && window.SITE_CONFIG.contactEndpoint;

    function setStatus(message, state) {
      status.textContent = message;
      if (state) {
        status.dataset.state = state;
      } else {
        delete status.dataset.state;
      }
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

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!endpoint) {
        setStatus("The form is not configured yet.", "error");
        return;
      }

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

      if (!payload.name || !payload.email || !payload.message) {
        setStatus("Please fill in your name, email, and message.", "error");
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
            setStatus("Message sent. I will reply when I can.", "success");
            return;
          }
          if (text === "error: wait") {
            setStatus("Please wait a few minutes before sending another message.", "error");
            return;
          }
          if (text === "error: invalid") {
            setStatus("Check the fields and try again.", "error");
            return;
          }
          setStatus("The form had a problem. Try again in a minute.", "error");
        })
        .catch(function () {
          setStatus("The message did not send. Try again in a minute.", "error");
        })
        .finally(function () {
          submit.disabled = false;
        });
    });
  }

  initClips();
  initForm();
})();
