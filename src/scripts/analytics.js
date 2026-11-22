(function () {
  "use strict";

  function outboundLink(node) {
    if (!node || typeof node.closest !== "function") return null;

    var link = node.closest("a[href]");
    if (!link) return null;

    var raw = link.getAttribute("href") || "";
    if (/^(#|mailto:|tel:|javascript:)/i.test(raw)) return null;

    var url;
    try {
      url = new URL(raw, window.location.href);
    } catch (error) {
      return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    // Relative links stay inside this site; absolute links are outbound.
    var absolute = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(raw);
    if (url.origin === window.location.origin && !absolute) return null;

    return { url: url, link: link };
  }

  function send(vars) {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count(vars);
      return;
    }

    // count.js loads async, so wait for it before sending.
    var tries = 0;
    var timer = window.setInterval(function () {
      if (window.goatcounter && window.goatcounter.count) {
        window.clearInterval(timer);
        window.goatcounter.count(vars);
      } else if (++tries > 20) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function track(found) {
    var host = found.url.host.replace(/^www\./, "");
    var title = (found.link.textContent || "").replace(/\s+/g, " ").trim();

    send({
      path: "ext-" + host,
      title: title || found.url.href,
      event: true
    });
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented) return;

    var found = outboundLink(event.target);
    if (!found) return;

    track(found);
  });
})();
