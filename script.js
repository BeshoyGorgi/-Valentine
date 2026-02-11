"use strict";

function getSessionId() {
  let id = localStorage.getItem("sid");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    localStorage.setItem("sid", id);
  }
  return id;
}

async function track(ev) {
  try {
    await fetch("/.netlify/functions/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        event: ev,
        page: location.pathname
      })
    });
  } catch {}
}

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
    skipVideoBtn: document.getElementById("skipVideoBtn"),

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

    // Ensure NO starts in a safe position (not on top of YES)
    setTimeout(() => {
      safeRandomNo();
    }, 80);
  }

  if (els.sealBtn && els.envelope) {
    els.sealBtn.addEventListener("click", () => {
      els.envelope.classList.add("is-open");
      if (els.envelopeHint) els.envelopeHint.textContent = "Opening… 💞";
      setTimeout(showCard, 700);
    });
  }

  if (!els.stage || !els.noBtn || !els.yesBtn || !els.card) {
    console.error("Missing required IDs: card, stage, yesBtn, noBtn");
    return;
  }

  let locked = false;

  /* -------------------- YES grows slowly while chasing NO -------------------- */
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

  /* -------------------- Helpers: geometry & overlap -------------------- */
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function rectsOverlap(a, b, pad = 0) {
    return !(
      a.right + pad < b.left ||
      a.left - pad > b.right ||
      a.bottom + pad < b.top ||
      a.top - pad > b.bottom
    );
  }

  function getRectInStage(el) {
    const s = els.stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      left: r.left - s.left,
      top: r.top - s.top,
      right: r.right - s.left,
      bottom: r.bottom - s.top,
      width: r.width,
      height: r.height
    };
  }

  /* -------------------- Place NO safely (never on YES) -------------------- */
  const SAFE_PAD = 16; // extra distance between yes/no

  function placeNo(x, y) {
    const stageRect = els.stage.getBoundingClientRect();
    const btnW = Math.max(els.noBtn.offsetWidth, 120);
    const btnH = Math.max(els.noBtn.offsetHeight, 44);

    const minX = 10, minY = 10;
    const maxX = stageRect.width - btnW - 10;
    const maxY = stageRect.height - btnH - 10;

    const nx = clamp(x, minX, maxX);
    const ny = clamp(y, minY, maxY);

    els.noBtn.style.left = `${nx}px`;
    els.noBtn.style.top = `${ny}px`;
    els.noBtn.style.transform = "translate(0,0) scale(0.92)";
  }

  function safeRandomNo() {
    const stageRect = els.stage.getBoundingClientRect();
    const yes = getRectInStage(els.yesBtn);

    const btnW = Math.max(els.noBtn.offsetWidth, 120);
    const btnH = Math.max(els.noBtn.offsetHeight, 44);

    // Try several times to find a position not overlapping YES
    for (let i = 0; i < 40; i++) {
      const x = 10 + Math.random() * (stageRect.width - btnW - 20);
      const y = 10 + Math.random() * (stageRect.height - btnH - 20);

      const noCandidate = {
        left: x,
        top: y,
        right: x + btnW,
        bottom: y + btnH
      };

      if (!rectsOverlap(noCandidate, yes, SAFE_PAD)) {
        placeNo(x, y);
        return;
      }
    }

    // Fallback: force it to a corner far from YES
    placeNo(10, stageRect.height - btnH - 10);
  }

  // Initial safe position (in case card is visible immediately)
  safeRandomNo();

  /* -------------------- Evade logic (mouse + touch + tap on NO) -------------------- */
  function safePlaceNear(nx, ny, approxW, approxH) {
    // Place and ensure it doesn't overlap YES. If overlap -> random safe position.
    placeNo(nx, ny);

    // After placing, verify overlap (using real rects)
    const noR = getRectInStage(els.noBtn);
    const yesR = getRectInStage(els.yesBtn);

    if (rectsOverlap(noR, yesR, SAFE_PAD)) {
      safeRandomNo();
    }
  }

  function evadeFromPoint(clientX, clientY) {
    if (locked) return;

    const stageRect = els.stage.getBoundingClientRect();
    const noRect = els.noBtn.getBoundingClientRect();

    const mx = clientX - stageRect.left;
    const my = clientY - stageRect.top;

    const cx = (noRect.left - stageRect.left) + noRect.width / 2;
    const cy = (noRect.top - stageRect.top) + noRect.height / 2;

    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.hypot(dx, dy);

    const dangerRadius = 140; // a bit larger for touch
    if (dist < dangerRadius) {
      const push = 170;
      const angle = Math.atan2(dy, dx) + (Math.random() * 0.9 - 0.45);

      const targetX = cx - Math.cos(angle) * push + (Math.random() * 60 - 30);
      const targetY = cy - Math.sin(angle) * push + (Math.random() * 60 - 30);

      const approxW = Math.max(els.noBtn.offsetWidth, 120);
      const approxH = Math.max(els.noBtn.offsetHeight, 44);

      safePlaceNear(targetX - approxW / 2, targetY - approxH / 2, approxW, approxH);

      lastMoveAt = performance.now();
      boostYesBecauseChase();
    }
  }

  // Desktop mouse
  els.stage.addEventListener("mousemove", (e) => evadeFromPoint(e.clientX, e.clientY));

  // Touch (finger in stage)
  els.stage.addEventListener("touchstart", (e) => {
    const t = e.touches?.[0];
    if (t) evadeFromPoint(t.clientX, t.clientY);
  }, { passive: true });

  // ✅ Mobile: tap on NO -> move away as if your finger is "the mouse"
  els.noBtn.addEventListener("click", (e) => {
    track("no_attempt");

    // Don't allow "No clicked" finale on mobile; instead, always dodge
    e.preventDefault();
    e.stopPropagation();

    const r = els.noBtn.getBoundingClientRect();
    // pretend pointer is on the button center (works on mobile)
    evadeFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  });

  // Extra: hover on desktop still dodges
  els.noBtn.addEventListener("mouseenter", () => {
    if (locked) return;
    safeRandomNo();
    lastMoveAt = performance.now();
    boostYesBecauseChase();
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
    if (els.videoOverlay) {
      els.videoOverlay.classList.remove("is-visible");
      els.videoOverlay.setAttribute("aria-hidden", "true");
    }
    if (els.valentineVideo) els.valentineVideo.pause();
  }

  function closeVideoAndShowItsADate() {
    closeVideoOnly();
    openOverlay();
  }

  // Robust: close button always works
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("#skipVideoBtn");
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      closeVideoAndShowItsADate();
    }
  });

  if (els.valentineVideo) {
    els.valentineVideo.addEventListener("ended", closeVideoAndShowItsADate);
  }

  if (els.videoOverlay) {
    els.videoOverlay.addEventListener("click", (e) => {
      if (e.target === els.videoOverlay) closeVideoAndShowItsADate();
    });
  }

  /* -------------------- YES CLICK: hide NO + show video first -------------------- */
  els.yesBtn.addEventListener("click", () => {
    track("yes_click");

    locked = true;

    // hide NO after YES
    els.noBtn.style.opacity = "0";
    els.noBtn.style.pointerEvents = "none";
    setTimeout(() => {
      els.noBtn.style.display = "none";
    }, 180);

    if (els.hint) els.hint.textContent = "Best answer 💚";
    openVideo();
  });

  /* -------------------- RESIZE SAFETY -------------------- */
  window.addEventListener("resize", () => {
    if (!locked) safeRandomNo();
  });
});
