/* ==========================================================================
   Interaction layer — language, navigation, timeline, music, micro-UX.
   No dependencies. Everything degrades gracefully.
   ========================================================================== */
(function () {
  "use strict";

  var I18N = window.I18N;
  if (!I18N) return;

  var LANG_KEY = "mcs-lang";
  var VOLUME_KEY = "mcs-volume";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var nav = $("#siteNav");
  var navToggle = $("#navToggle");
  var mobileMenu = $("#mobileMenu");
  var jobList = $("#jobList");
  var backTop = $("#backTop");
  var scrollBar = $("#scrollBar");
  var heroArt = $("#heroArt");
  var toast = $("#toast");

  var audio = $("#ambienceAudio");
  var ambience = $("#ambience");
  var ambienceBtn = $("#ambienceBtn");
  var ambienceVol = $("#ambienceVol");

  var lang = "en";
  var toastTimer = null;

  /* ----------------------------------------------------------------------
     Helpers
     ---------------------------------------------------------------------- */
  function get(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? acc : acc[key];
    }, obj);
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function tags(list) {
    return '<ul class="tag-list">' + list.map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("") + "</ul>";
  }

  function chips(list) {
    return list.map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("");
  }

  /* ----------------------------------------------------------------------
     Renderers
     ---------------------------------------------------------------------- */
  function renderStats() {
    var dict = I18N[lang];
    var grid = $("#statGrid");
    if (!grid) return;

    grid.innerHTML = dict.stats.map(function (s, i) {
      var suffix = s.suffix ? '<span class="suffix">' + esc(s.suffix) + "</span>" : "";
      return (
        '<div class="stat" data-reveal style="--reveal-delay:' + i * 70 + 'ms">' +
          '<p class="stat-value">' +
            '<span class="stat-number" data-count="' + esc(s.value) + '" data-decimals="' + (s.decimals || 0) + '" data-pad="' + (s.pad || 0) + '">0</span>' +
            suffix +
          "</p>" +
          '<p class="stat-label">' + esc(s.label) + "</p>" +
        "</div>"
      );
    }).join("");
  }

  function renderTicker() {
    var dict = I18N[lang];
    var html = dict.ticker.map(function (item) {
      return '<span class="ticker-item">' + esc(item) + "</span>";
    }).join("");

    ["#tickerA", "#tickerB"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.innerHTML = html;
    });
  }

  function renderJobs() {
    if (!jobList) return;
    var dict = I18N[lang];

    var previouslyOpen = $$(".job", jobList).reduce(function (acc, el, i) {
      if (el.classList.contains("is-open")) acc.push(i);
      return acc;
    }, []);
    var openSet = jobList.children.length ? previouslyOpen : [0];

    jobList.innerHTML = dict.jobs.map(function (job, i) {
      var isOpen = openSet.indexOf(i) !== -1;
      var panelId = "job-panel-" + i;
      var buttonId = "job-btn-" + i;

      return (
        '<article class="job' + (isOpen ? " is-open" : "") + '">' +
          '<h3 class="job-heading">' +
            '<button class="job-summary" type="button" id="' + buttonId + '" aria-expanded="' + isOpen + '" aria-controls="' + panelId + '">' +
              '<span class="job-node" aria-hidden="true"></span>' +
              '<span class="job-main">' +
                '<span class="job-role">' + esc(job.role) + "</span>" +
                '<span class="job-company">' +
                  "<span>" + esc(job.company) + "</span>" +
                  '<span class="sep" aria-hidden="true">·</span>' +
                  "<span>" + esc(job.location) + "</span>" +
                "</span>" +
              "</span>" +
              '<span class="job-period">' + esc(job.period) + "</span>" +
              '<span class="job-icon" aria-hidden="true"><svg><use href="#i-chevron"/></svg></span>' +
            "</button>" +
          "</h3>" +
          '<div class="job-panel" id="' + panelId + '" role="region" aria-labelledby="' + buttonId + '"' +
            (isOpen ? "" : ' aria-hidden="true" inert') + ">" +
            '<div class="job-panel-inner">' +
              '<div class="job-panel-content">' +
                '<ul class="job-list">' +
                  job.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") +
                "</ul>" +
                tags(job.tags) +
              "</div>" +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderOrgs() {
    var grid = $("#orgGrid");
    if (!grid) return;
    var dict = I18N[lang];

    grid.innerHTML = dict.orgs.map(function (item) {
      return (
        '<article class="org-card">' +
          "<div>" +
            '<p class="org-role">' + esc(item.role) + "</p>" +
            '<p class="org-name">' + esc(item.org) + "</p>" +
          "</div>" +
          '<p class="org-period">' + esc(item.period) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  function renderCapabilities() {
    var grid = $("#capGrid");
    if (!grid) return;
    var dict = I18N[lang];

    grid.innerHTML = dict.capabilities.map(function (cap, i) {
      return (
        '<article class="cap-card" data-reveal style="--reveal-delay:' + i * 90 + 'ms">' +
          '<div class="cap-media">' +
            '<img src="assets/images/' + esc(cap.image) + '" alt="" width="1920" height="1080" loading="lazy" decoding="async">' +
            '<span class="cap-num">0' + (i + 1) + " / 03</span>" +
          "</div>" +
          '<div class="cap-body">' +
            '<p class="cap-kicker">' + esc(cap.kicker) + "</p>" +
            '<h3 class="cap-title">' + esc(cap.title) + "</h3>" +
            '<p class="cap-text">' + esc(cap.text) + "</p>" +
            tags(cap.tags) +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderSkills() {
    var grid = $("#skillGrid");
    if (!grid) return;
    var dict = I18N[lang];

    grid.innerHTML = dict.skillGroups.map(function (group, i) {
      return (
        '<article class="skill-card">' +
          '<div class="skill-head">' +
            '<span class="skill-num">0' + (i + 1) + "</span>" +
            '<h3 class="skill-title">' + esc(group.title) + "</h3>" +
          "</div>" +
          '<ul class="chips">' + chips(group.items) + "</ul>" +
        "</article>"
      );
    }).join("");

    var toolList = $("#toolList");
    if (toolList) {
      toolList.innerHTML = dict.tools.map(function (tool) {
        return "<li>" + esc(tool) + "</li>";
      }).join("");
    }
  }

  function renderPublications() {
    var list = $("#pubList");
    if (!list) return;
    var dict = I18N[lang];

    list.innerHTML = dict.publications.map(function (pub) {
      return (
        '<li class="pub">' +
          '<span class="pub-year">' + esc(pub.year) + "</span>" +
          "<div>" +
            '<h4 class="pub-title">' + esc(pub.title) + "</h4>" +
            '<p class="pub-meta">' + esc(pub.authors) + "</p>" +
            '<p class="pub-venue">' + esc(pub.venue) + "</p>" +
          "</div>" +
        "</li>"
      );
    }).join("");
  }

  function renderCredentials() {
    var list = $("#credList");
    if (!list) return;
    var dict = I18N[lang];

    list.innerHTML = dict.credentials.map(function (cred) {
      return (
        '<article class="cred">' +
          '<div class="cred-top">' +
            '<h4 class="cred-title">' + esc(cred.title) + "</h4>" +
            '<span class="cred-year">' + esc(cred.year) + "</span>" +
          "</div>" +
          '<p class="cred-issuer">' + esc(cred.issuer) + "</p>" +
          '<p class="cred-detail">' + esc(cred.detail) + "</p>" +
        "</article>"
      );
    }).join("");
  }

  function renderDynamic() {
    renderStats();
    renderTicker();
    renderJobs();
    renderOrgs();
    renderCapabilities();
    renderSkills();
    renderPublications();
    renderCredentials();
    observeReveals();
    observeCounters();
  }

  /* ----------------------------------------------------------------------
     Static copy, meta, language state
     ---------------------------------------------------------------------- */
  function applyUI() {
    var dict = I18N[lang];

    $$("[data-i18n]").forEach(function (el) {
      var value = get(dict, el.dataset.i18n);
      if (typeof value === "string") el.textContent = value;
    });

    $$("[data-i18n-html]").forEach(function (el) {
      var value = get(dict, el.dataset.i18nHtml);
      if (typeof value === "string") el.innerHTML = value;
    });

    $$("[data-i18n-list]").forEach(function (el) {
      var value = get(dict, el.dataset.i18nList);
      if (Array.isArray(value)) {
        el.innerHTML = value.map(function (item) {
          return "<li>" + esc(item) + "</li>";
        }).join("");
      }
    });

    $$("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(",").forEach(function (pair) {
        var parts = pair.split(":");
        var attr = (parts[0] || "").trim();
        var path = (parts[1] || "").trim();
        var value = get(dict, path);
        if (attr && typeof value === "string") el.setAttribute(attr, value);
      });
    });

    document.title = dict.meta.title;
    var description = $('meta[name="description"]');
    if (description) description.setAttribute("content", dict.meta.description);
    document.documentElement.lang = lang;
  }

  function syncLanguageButtons() {
    $$("[data-lang]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
  }

  function syncToggleLabel() {
    if (!navToggle) return;
    var isOpen = document.body.classList.contains("nav-open");
    navToggle.setAttribute("aria-label", isOpen ? I18N[lang].ui.nav.close : I18N[lang].ui.nav.menu);
  }

  function setLanguage(next, persist) {
    lang = next === "id" ? "id" : "en";
    applyUI();
    renderDynamic();
    syncLanguageButtons();
    syncToggleLabel();
    updateMusicUI();

    if (persist) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (err) { /* private mode */ }
    }
  }

  $$("[data-lang]").forEach(function (button) {
    button.addEventListener("click", function () {
      setLanguage(button.dataset.lang, true);
    });
  });

  /* ----------------------------------------------------------------------
     Scroll reveal + counters
     ---------------------------------------------------------------------- */
  var revealObserver = null;
  var counterObserver = null;

  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.55 });
  }

  function observeReveals() {
    var targets = $$("[data-reveal]:not(.is-visible)");
    var viewport = window.innerHeight;

    targets.forEach(function (el) {
      if (reduceMotion.matches || !revealObserver) {
        el.classList.add("is-visible");
        return;
      }
      // Content already on screen should not flash in after a language swap.
      if (el.getBoundingClientRect().top < viewport * 0.92) {
        el.classList.add("is-visible");
      } else {
        revealObserver.observe(el);
      }
    });
  }

  function observeCounters() {
    var counters = $$(".stat-number");
    if (!counters.length) return;

    if (reduceMotion.matches || !counterObserver) {
      counters.forEach(function (el) { setCount(el, parseFloat(el.dataset.count)); });
      return;
    }

    counters.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        animateCount(el);
      } else {
        counterObserver.observe(el);
      }
    });
  }

  function setCount(el, value) {
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var pad = parseInt(el.dataset.pad || "0", 10);
    var locale = lang === "id" ? "id-ID" : "en-US";

    if (pad) {
      el.textContent = String(Math.round(value)).padStart(pad, "0");
      return;
    }

    if (decimals) {
      var formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: false
      }).format(value);
      el.textContent = formatted;
      return;
    }

    el.textContent = String(Math.round(value));
  }

  function animateCount(el) {
    if (el.dataset.animated === "true") return;
    el.dataset.animated = "true";

    var target = parseFloat(el.dataset.count) || 0;

    if (reduceMotion.matches) {
      setCount(el, target);
      return;
    }

    var duration = 1300;
    var start = performance.now();

    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setCount(el, target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------------------
     Navigation + scroll chrome
     ---------------------------------------------------------------------- */
  function closeMenu() {
    document.body.classList.remove("nav-open", "no-scroll");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", "true");
    syncToggleLabel();
  }

  function openMenu() {
    document.body.classList.add("nav-open", "no-scroll");
    if (navToggle) navToggle.setAttribute("aria-expanded", "true");
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", "false");
    syncToggleLabel();
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      if (document.body.classList.contains("nav-open")) closeMenu();
      else openMenu();
    });
  }

  if (mobileMenu) {
    $$("a", mobileMenu).forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
      closeMenu();
      if (navToggle) navToggle.focus();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1080 && document.body.classList.contains("nav-open")) closeMenu();
  });

  var scrollQueued = false;

  function onScrollFrame() {
    var y = window.scrollY || window.pageYOffset;

    if (nav) nav.classList.toggle("is-scrolled", y > 24);

    if (scrollBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(y / max, 1) : 0;
      scrollBar.style.width = (ratio * 100).toFixed(2) + "%";
    }

    if (backTop) backTop.classList.toggle("is-visible", y > window.innerHeight * 0.85);

    if (heroArt && !reduceMotion.matches && window.innerWidth > 900 && y < window.innerHeight * 1.4) {
      heroArt.style.setProperty("--parallax", Math.min(y * 0.16, 110) + "px");
    }

    scrollQueued = false;
  }

  window.addEventListener("scroll", function () {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(onScrollFrame);
    }
  }, { passive: true });

  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
  }

  // Active section marker
  if ("IntersectionObserver" in window) {
    var navLinks = $$(".nav-links a");
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          if (link.getAttribute("href") === "#" + id) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    ["about", "experience", "capabilities", "skills", "research", "contact"].forEach(function (id) {
      var section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  /* ----------------------------------------------------------------------
     Timeline accordion
     ---------------------------------------------------------------------- */
  if (jobList) {
    jobList.addEventListener("click", function (event) {
      var button = event.target.closest(".job-summary");
      if (!button) return;

      var job = button.closest(".job");
      if (!job) return;

      var isOpen = job.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));

      var panel = document.getElementById(button.getAttribute("aria-controls"));
      if (panel) {
        if (isOpen) {
          panel.removeAttribute("aria-hidden");
          panel.removeAttribute("inert");
        } else {
          panel.setAttribute("aria-hidden", "true");
          panel.setAttribute("inert", "");
        }
      }
    });
  }

  /* ----------------------------------------------------------------------
     Copy email + toast
     ---------------------------------------------------------------------- */
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (err) { /* ignore */ }
    document.body.removeChild(area);
  }

  var copyButton = $("#copyEmail");
  if (copyButton) {
    copyButton.addEventListener("click", function () {
      var email = I18N[lang].ui.contact.email;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () {
          showToast(I18N[lang].ui.toast.copied);
        }).catch(function () {
          fallbackCopy(email);
          showToast(I18N[lang].ui.toast.copied);
        });
      } else {
        fallbackCopy(email);
        showToast(I18N[lang].ui.toast.copied);
      }
    });
  }

  /* ----------------------------------------------------------------------
     Ambience player (opt-in)
     ---------------------------------------------------------------------- */
  function updateMusicUI() {
    if (!audio || !ambience || !ambienceBtn) return;
    var playing = !audio.paused;
    ambience.classList.toggle("is-playing", playing);
    ambienceBtn.setAttribute("aria-pressed", String(playing));
    ambienceBtn.setAttribute("aria-label", playing ? I18N[lang].ui.music.pause : I18N[lang].ui.music.play);
  }

  if (audio && ambienceBtn) {
    audio.volume = 0.35;

    try {
      var savedVolume = parseFloat(localStorage.getItem(VOLUME_KEY));
      if (Number.isFinite(savedVolume)) audio.volume = Math.min(Math.max(savedVolume, 0), 1);
    } catch (err) { /* private mode */ }

    if (ambienceVol) ambienceVol.value = String(audio.volume);

    ambienceBtn.addEventListener("click", function () {
      if (audio.paused) {
        var attempt = audio.play();
        if (attempt && typeof attempt.catch === "function") {
          attempt.catch(function () { updateMusicUI(); });
        }
      } else {
        audio.pause();
      }
      updateMusicUI();
    });

    audio.addEventListener("play", updateMusicUI);
    audio.addEventListener("pause", updateMusicUI);

    if (ambienceVol) {
      ambienceVol.addEventListener("input", function () {
        audio.volume = parseFloat(ambienceVol.value);
        try { localStorage.setItem(VOLUME_KEY, String(audio.volume)); } catch (err) { /* ignore */ }
      });
    }
  }

  /* ----------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */
  var stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch (err) { /* ignore */ }

  var year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  setLanguage(stored === "id" ? "id" : "en", false);
  onScrollFrame();
})();
