"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const els = {
    // Letter / Envelope
    envelope: document.getElementById("envelope"),
    sealBtn: document.getElementById("sealBtn"),
    envelopeHint: document.getElementById("envelopeHint"),

    // Card / Game
    card: document.getElementById("card"),
    stage: document.getElementById("stage"),
    noBtn: document.getElementById("noBtn"),
    yesBtn: document.getElementById("yesBtn"),
    hint: document.getElementById("hint"),

    // Video (shown FIRST after YES)
    videoOverlay: document.getElementById("videoOverlay"),
    valentineVideo: document.getElementById("valentineVideo"),
    skipVideoBtn: document.getElementById("skipVideoBtn"), // this is your "Close" button on the video

    // Success overlay ("It's a date..." shown AFTER video close)
    overlay: document.getElementById("overlay"),
    closeOverlayBtn: document.getElementById("closeOverlayBtn"),
    burst: document.getElementById("burst"),
  };

  /* -------------------- OPEN LETTER -> SHOW CARD -------------------- */
  function showCard() {
    if (!els.card) return;

    els.card.classList.remove("is-hidden");

    if (els.envelope) {
      els.envelope.style.opacity = "0";
      els.envelope.style.transform = "translateY(14px)";
      els.envelope.style.transition = "opacity .35s ease, transform .35s ease";
      setTimeout(() => (els.envelope.style.display = "none"), 360);
    }

    setTimeout(() => {
      if (els.noBtn && els.stage) randomNo();
    }, 80);
  }

  if (els.sealBtn && els.envelope) {
    els.sealBtn.addEventListener("click", () => {
      els.envelope.classList.add("is-open");
      if (els.envelopeHint) els.envelopeHint.textContent = "Opening… 💞";
      setTimeout(showCard, 700);
    });
  }

  /* -------------------- REQUIRED ELEMENTS CHECK -------------------- */
  if (!els.stage || !els.noBtn || !els.yesBtn || !els.card) {
    console.error("Missing required IDs: card, stage, yesBtn, noBtn");
    return;
  }

  let locked = false;

  /* -------------------- YES GROWS (SLOW + SMOOTH) WHILE CHASING NO -------------------- */
  let yesScale = 1;
  let yesTargetScale = 1;
  let lastMoveAt = 0;

  const YES_MAX_SCALE = 2.2;
  const YES_GROW_PER_MOVE = 0.012;
  const YES_DECAY_PER_SEC = 0.045;

  function applyYesScale() {
    yesScale += (yesTargetScale - yesScale) * 0.06;
    els.yesBtn.style.transform = `scale(${yesScale})`;
  }

  function boostYesBecauseChase() {
    yesTargetScale = Math.min(YES_MAX_SCALE, yesTargetScale + YES_GROW_PER_MOVE);

    if (els.hint) {
      if (yesTargetScale > 1.35) els.hint.textContent = "Hmm… YES is looking bigger 👀";
      if (yesTargetScale > 1.9) els.hint.textContent = "You know you want to click YES 😌💚";
    }
  }

  function tick() {
    if (!locked) {
      const now = performance.now();
      const dt = 16 / 1000;

      if (now - lastMoveAt > 700) {
        yesTargetScale = Math.max(1, yesTargetScale - YES_DECAY_PER_SEC * dt);
      }
      applyYesScale();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* -------------------- NO BUTTON POSITIONING -------------------- */
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function placeNo(x, y) {
    const stageRect = els.stage.getBoundingClientRect();
    const btnW = Math.max(els.noBtn.offsetWidth, 120);
    const btnH = Math.max(els.noBtn.offsetHeight, 48);

    const minX = 10, minY = 10;
    const maxX = stageRect.width - btnW - 10;
    const maxY = stageRect.height - btnH - 10;

    const nx = clamp(x, minX, maxX);
    const ny = clamp(y, minY, maxY);

    els.noBtn.style.left = `${nx}px`;
    els.noBtn.style.top = `${ny}px`;
    els.noBtn.style.transform = "translate(0,0)";
  }

  function randomNo() {
    const stageRect = els.stage.getBoundingClientRect();
    const btnW = Math.max(els.noBtn.offsetWidth, 120);
    const btnH = Math.max(els.noBtn.offsetHeight, 48);

    const x = 10 + Math.random() * (stageRect.width - btnW - 20);
    const y = 10 + Math.random() * (stageRect.height - btnH - 20);
    placeNo(x, y);
  }

  randomNo();

  /* -------------------- EVADE LOGIC -------------------- */
  function evade(clientX, clientY) {
    if (locked) return;

    const stageRect = els.stage.getBoundingClientRect();
    const noRect = els.noBtn.getBoundingClientRect();

    const mx = clientX - stageRect.left;
    const my = clientY - stageRect.top;

    const cx = noRect.left - stageRect.left + noRect.width / 2;
    const cy = noRect.top - stageRect.top + noRect.height / 2;

    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.hypot(dx, dy);

    const dangerRadius = 120;
    if (dist < dangerRadius) {
      const push = 150;
      const angle = Math.atan2(dy, dx) + (Math.random() * 0.9 - 0.45);

      const nx = cx - Math.cos(angle) * push + (Math.random() * 60 - 30);
      const ny = cy - Math.sin(angle) * push + (Math.random() * 60 - 30);

      placeNo(nx - noRect.width / 2, ny - noRect.height / 2);

      lastMoveAt = performance.now();
      boostYesBecauseChase();
    }
  }

  els.stage.addEventListener("mousemove", (e) => evade(e.clientX, e.clientY));
  els.stage.addEventListener("touchstart", (e) => {
    const t = e.touches?.[0];
    if (t) evade(t.clientX, t.clientY);
  }, { passive: true });

  els.noBtn.addEventListener("mouseenter", () => {
    if (locked) return;
    randomNo();
    lastMoveAt = performance.now();
    boostYesBecauseChase();
  });

  /* -------------------- IF NO IS CLICKED (RARE): FINALE -------------------- */
  els.noBtn.addEventListener("click", (e) => {
    e.preventDefault();
    locked = true;
    els.card.classList.add("finale");
    if (els.hint) els.hint.textContent = "Nice try 😅 But… YES wins.";
    els.yesBtn.focus();
  });

  /* -------------------- SUCCESS OVERLAY (IT'S A DATE) -------------------- */
  function burstHearts() {
    if (!els.burst) return;
    els.burst.innerHTML = "";

    const rect = els.stage.getBoundingClientRect();
    const originX = rect.width * 0.5;
    const originY = rect.height * 0.58;

    const n = 22;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      const angle = Math.PI * 2 * (i / n) + Math.random() * 0.4;
      const dist = 80 + Math.random() * 110;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.8;

      s.style.setProperty("--x", `${originX + (Math.random() * 18 - 9)}px`);
      s.style.setProperty("--y", `${originY + (Math.random() * 18 - 9)}px`);
      s.style.setProperty("--dx", `${dx}px`);
      s.style.setProperty("--dy", `${dy}px`);

      const pink = Math.random() > 0.35;
      s.style.background = pink ? "rgba(255,95,162,.95)" : "rgba(32,201,151,.95)";
      els.burst.appendChild(s);
    }
  }

  function openOverlay() {
    if (!els.overlay) return;
    els.overlay.classList.add("is-visible");
    els.overlay.setAttribute("aria-hidden", "false");
    burstHearts();
  }

  function closeOverlay() {
    if (!els.overlay) return;
    els.overlay.classList.remove("is-visible");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  if (els.closeOverlayBtn) els.closeOverlayBtn.addEventListener("click", closeOverlay);
  if (els.overlay) {
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closeOverlay();
    });
  }

  /* -------------------- VIDEO (SHOWN FIRST AFTER YES) -------------------- */
  function openVideo() {
    if (!els.videoOverlay) {
      // fallback
      openOverlay();
      return;
    }

    els.videoOverlay.classList.add("is-visible");
    els.videoOverlay.setAttribute("aria-hidden", "false");

    if (els.valentineVideo) {
      els.valentineVideo.currentTime = 0;
      const p = els.valentineVideo.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }

  function closeVideoOnly() {
    if (!els.videoOverlay) return;

    els.videoOverlay.classList.remove("is-visible");
    els.videoOverlay.setAttribute("aria-hidden", "true");

    if (els.valentineVideo) {
      els.valentineVideo.pause();
    }
  }

  // ✅ This is what you want:
  // When clicking the video's "Close" button -> hide video -> show "It's a date..."
  function closeVideoAndShowItsADate() {
    closeVideoOnly();
    openOverlay();
  }

  // Video Close/Continue button
  if (els.skipVideoBtn) {
    els.skipVideoBtn.addEventListener("click", closeVideoAndShowItsADate);
  }

  // Also when the video ends -> show "It's a date..."
  if (els.valentineVideo) {
    els.valentineVideo.addEventListener("ended", closeVideoAndShowItsADate);
  }

  // click outside video panel -> same behavior
  if (els.videoOverlay) {
    els.videoOverlay.addEventListener("click", (e) => {
      if (e.target === els.videoOverlay) closeVideoAndShowItsADate();
    });
  }

  /* -------------------- YES CLICK: HIDE NO + SHOW VIDEO FIRST -------------------- */
  els.yesBtn.addEventListener("click", () => {
    locked = true;

    // hide NO after YES
    els.noBtn.style.opacity = "0";
    els.noBtn.style.pointerEvents = "none";
    setTimeout(() => {
      els.noBtn.style.display = "none";
    }, 180);

    if (els.hint) els.hint.textContent = "Best answer 💚";

    // First show video
    openVideo();
  });

  /* -------------------- RESIZE SAFETY -------------------- */
  window.addEventListener("resize", () => {
    if (!locked) randomNo();
  });
});
