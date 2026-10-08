/* Marko's Commissions — interactions: motion toggle (default ON), Lenis smooth
   scroll + velocity blur, reveals, counters, timeline, nav + side dots,
   mail chooser modal, form, effects. */

const html = document.documentElement;
const body = document.body;
const EMAIL = "marko@marko21022.com";

const motion = true;

let lenis = null;
let lenisRaf = 0;

function initLenis() {
  if (lenis || typeof Lenis === "undefined") return;
  lenis = new Lenis({ lerp: 0.105, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on("scroll", onScroll);
  const raf = (time) => {
    lenis.raf(time);
    lenisRaf = requestAnimationFrame(raf);
  };
  lenisRaf = requestAnimationFrame(raf);
}

function destroyLenis() {
  if (!lenis) return;
  cancelAnimationFrame(lenisRaf);
  lenis.destroy();
  lenis = null;
}


const nav = document.getElementById("nav");
const heroInner = document.getElementById("hero-inner");
const heroWords = document.querySelectorAll(".hero-h1 .w");
const heroTexts = document.querySelectorAll(".hero-sub, .hero-cta, .hero-facts, .hero-logo-wrap");
const progress = document.getElementById("progress");
const tl = document.getElementById("tl");
const tlFill = document.getElementById("tl-fill");
const watermarks = document.querySelectorAll(".watermark");

let lastY = 0;
let targetVel = 0;

function onScroll(e) {
  const y = e.scroll ?? window.scrollY;
  if (lenis) targetVel = e.velocity ?? 0;

  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

  nav.classList.toggle("scrolled", y > 30);
  const dy = y - lastY;
  if (y > 320 && dy > 6 && !menuOpen) nav.classList.add("hidden");
  else if (dy < -2 || y <= 320) nav.classList.remove("hidden");
  lastY = y;

  // hero exit: drift + fade the block, blur the text elements themselves
  // (never an ancestor — ancestor filters break the gradient text clip)
  if (heroInner && motion) {
    const p = Math.min(Math.max(y / (window.innerHeight * 0.85), 0), 1);
    heroInner.style.transform = `translateY(${p * 64}px)`;
    heroInner.style.opacity = String(1 - p * 1.05);
  }

  // timeline fill follows scroll
  if (tl && tlFill && motion) {
    const r = tl.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      const prog = Math.min(Math.max((window.innerHeight * 0.6 - r.top) / r.height, 0), 1);
      tlFill.style.height = `${(prog * 100).toFixed(1)}%`;
    }
  }

  // watermark parallax
  if (motion && watermarks.length) {
    for (const wm of watermarks) {
      const sec = wm.closest(".section");
      if (!sec) continue;
      const r = sec.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        const off = Math.max(-70, Math.min(70, (r.top - window.innerHeight / 2) * -0.07));
        wm.style.transform = `translateY(${off.toFixed(1)}px)`;
      }
    }
  }

  /* monitor showcase: rotate with scroll, swap screen phases */
  updateMonitor();

  window.dispatchEvent(new CustomEvent("uim-scroll", { detail: { y } }));
}

window.addEventListener("scroll", () => {
  if (lenis) return;
  const y = window.scrollY;
  targetVel = Math.max(-40, Math.min(40, y - lastY));
  onScroll({ scroll: y, velocity: 0 });
}, { passive: true });

/* marquee reacts to scroll velocity */
const marquees = [...document.querySelectorAll(".marquee-track")].map((t) => ({
  el: t,
  x: 0,
  dir: t.classList.contains("reverse") ? 1 : -1,
  w: 0,
}));

(function velLoop() {
  let cur = 0;
  function step() {
    if (motion) {
      updateMonitor();
      cur += (targetVel - cur) * 0.32;
      targetVel *= 0.88;
      const boost = Math.min(Math.abs(cur) * 0.12, 14);
      for (const m of marquees) {
        if (!m.w) m.w = m.el.scrollWidth / 4 || 1;
        m.x += m.dir * (0.55 + boost);
        if (m.x <= -m.w) m.x += m.w;
        if (m.x >= 0) m.x -= m.w;
        m.el.style.transform = `translateX(${m.x.toFixed(1)}px)`;
      }
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

/* monitor showcase: scroll rotation + cursor glare/tilt */
const showcase = document.querySelector(".showcase");
const m3d = document.getElementById("monitor-3d");
const screenGlare = document.querySelector(".screen-glare");
const mon = { p: 0, hoverX: 0, hoverY: 0, sx: 0, sy: 0 };

function updateMonitor() {
  if (!showcase || !m3d) return;
  const r = showcase.getBoundingClientRect();
  if (r.top >= window.innerHeight || r.bottom <= 0) return;
  if (motion) {
    const total = showcase.offsetHeight - window.innerHeight;
    mon.p = Math.min(Math.max(-r.top / total, 0), 1);
    mon.sx += (mon.hoverX - mon.sx) * 0.06;
    mon.sy += (mon.hoverY - mon.sy) * 0.06;
    const rotY = (0.5 - mon.p) * 14 + mon.sx * 3.5;
    const rotX = 6.5 - mon.p * 8 - mon.sy * 2.5;
    m3d.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
    const phase = Math.min(3, Math.floor(mon.p * 4));
    document.querySelectorAll("[data-scr]").forEach((el) => {
      el.classList.toggle("is-on", Number(el.dataset.scr) === phase);
    });
    document.querySelectorAll("[data-cap]").forEach((el) => {
      el.classList.toggle("is-on", Number(el.dataset.cap) === phase);
    });
    const num = document.getElementById("hud-num");
    if (num) num.textContent = String(phase + 1).padStart(2, "0");
    if (screenGlare) {
      screenGlare.style.translate = `${(24 - mon.sx * 34).toFixed(1)}px ${(-14 - mon.sy * 22).toFixed(1)}px`;
    }
  }
}

if (m3d) {
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = m3d.getBoundingClientRect();
    if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
    mon.hoverX = (e.clientX / window.innerWidth - 0.5) * 2;
    mon.hoverY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
}

/* text decode on section titles as they reveal */
function decodeText(el) {
  const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
  const origs = nodes.map((n) => n.textContent);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let frame = 0;
  const total = 24;
  function tick() {
    frame++;
    nodes.forEach((n, i) => {
      const o = origs[i];
      const reveal = Math.floor((frame / total) * o.length);
      let s = o.slice(0, reveal);
      for (let j = reveal; j < o.length; j++) {
        s += o[j] === " " ? " " : chars[(Math.random() * chars.length) | 0];
      }
      n.textContent = s;
    });
    if (frame < total) requestAnimationFrame(tick);
    else nodes.forEach((n, i) => (n.textContent = origs[i]));
  }
  requestAnimationFrame(tick);
}

const io = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("in");
      if (en.target.classList.contains("sec-title") && motion) decodeText(en.target);
      io.unobserve(en.target);
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

/* spotlight hover borders on stats + faq cards */
document.querySelectorAll(".stat, .faq-item").forEach((el) => el.classList.add("spot"));

/* terms page: table-of-contents scroll spy */
const toc = document.querySelector(".toc");
if (toc) {
  const tocLinks = new Map(
    [...toc.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const tocIO = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        tocLinks.forEach((l) => l.classList.remove("active"));
        tocLinks.get(en.target.id)?.classList.add("active");
      }
    },
    { rootMargin: "-25% 0px -65% 0px" }
  );
  document.querySelectorAll(".doc-sec").forEach((s) => tocIO.observe(s));
}


const steps = document.querySelectorAll(".tl-step");
const stepIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      en.target.classList.toggle("active", en.isIntersecting);
    }
  },
  { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
);
steps.forEach((s) => stepIO.observe(s));


const statsIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.querySelectorAll("[data-count]").forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const dur = 1300;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(end * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        if (motion) requestAnimationFrame(tick);
        else el.textContent = String(end);
      });
      statsIO.unobserve(en.target);
    }
  },
  { threshold: 0.4 }
);
const statsEl = document.getElementById("stats");
if (statsEl) statsIO.observe(statsEl);


const navLinks = new Map([...document.querySelectorAll(".nav-links a")].map((a) => [a.dataset.nav, a]));
const dots = new Map([...document.querySelectorAll(".dots a")].map((a) => [a.dataset.dot, a]));

const secIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      navLinks.forEach((l) => l.classList.remove("active"));
      dots.forEach((d) => d.classList.remove("active"));
      navLinks.get(en.target.id)?.classList.add("active");
      dots.get(en.target.id)?.classList.add("active");
    }
  },
  { rootMargin: "-40% 0px -55% 0px" }
);
["top", "overview", "terms", "faq", "apply"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) secIO.observe(el);
});


for (const id of ["marquee-track", "marquee-2"]) {
  const track = document.getElementById(id);
  if (!track) continue;
  const set = track.querySelector(".marquee-set");
  for (let i = 0; i < 3; i++) track.appendChild(set.cloneNode(true));
}


const glow = document.querySelector(".cursor-glow");
if (glow) {
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    tx = e.clientX; ty = e.clientY;
    glow.style.opacity = "1";
  });
  (function gloop() {
    gx += (tx - gx) * 0.09;
    gy += (ty - gy) * 0.09;
    glow.style.transform = `translate(${gx - 310}px, ${gy - 310}px)`;
    requestAnimationFrame(gloop);
  })();
}


const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
if (finePointer) {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      if (!motion) return;
      card.style.transition = "transform .14s ease-out";
      card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 5.5).toFixed(2)}deg) rotateY(${((x - 0.5) * 5.5).toFixed(2)}deg)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform .7s cubic-bezier(.22,1,.36,1), border-color .4s ease";
      card.style.transform = "";
    });
  });

  document.querySelectorAll(".spot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    });
  });

  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      if (!motion) return;
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transition = "transform .16s ease-out";
      btn.style.transform = `translate(${(dx * 0.18).toFixed(1)}px, ${(dy * 0.28).toFixed(1)}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
      btn.style.transform = "";
    });
  });

  // hero logo mouse tilt (img only — the wrapper owns the load-in transition)
  const logoTilt = document.querySelector(".hero-logo");
  if (logoTilt) {
    let rx = 0, ry = 0, trx = 0, tryy = 0;
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" || !motion) return;
      tryy = (e.clientX / window.innerWidth - 0.5) * 14;
      trx = (0.5 - e.clientY / window.innerHeight) * 10;
    });
    (function tilt() {
      rx += (trx - rx) * 0.06;
      ry += (tryy - ry) * 0.06;
      logoTilt.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      requestAnimationFrame(tilt);
    })();
  }
}

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (!motion || btn.classList.contains("mail-x")) return;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    const dark = btn.classList.contains("btn-solid");
    s.style.background = dark
      ? "radial-gradient(circle, rgba(8,8,10,.35) 0%, transparent 65%)"
      : "radial-gradient(circle, rgba(255,255,255,.28) 0%, transparent 65%)";
    s.style.width = s.style.height = `${d}px`;
    s.style.left = `${e.clientX - r.left - d / 2}px`;
    s.style.top = `${e.clientY - r.top - d / 2}px`;
    btn.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
});


const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    faqItems.forEach((other) => { if (other !== item) other.open = false; });
  });
});


const mailModal = document.getElementById("mail-modal");
const toast = document.getElementById("toast");
let mailOpen = false;

function setMail(open) {
  mailOpen = open;
  mailModal.classList.toggle("open", open);
  mailModal.setAttribute("aria-hidden", String(!open));
  if (lenis) open ? lenis.stop() : lenis.start();
  body.style.overflow = open && !lenis ? "hidden" : "";
  if (open) mailModal.querySelector(".mail-opt")?.focus();
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-mail-open]")) setMail(true);
});
mailModal?.querySelectorAll("[data-mail-close]").forEach((el) => {
  el.addEventListener("click", () => setMail(false));
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (mailOpen) setMail(false);
    else if (menuOpen) setMenu(false);
  }
});

document.getElementById("mail-copy")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(EMAIL);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = EMAIL;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
});


const form = document.getElementById("app-form");
const successPanel = document.getElementById("form-success");
const ENDPOINT = "/api/apply";

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector(".btn-submit");
    const msg = form.querySelector(".form-msg");
    msg.classList.remove("show", "error");
    msg.innerHTML = "";

    // honeypot filled → pretend success, send nothing
    if (data.company) { showSuccess(); return; }

    btn.disabled = true;
    btn.classList.add("is-loading");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "support",
          contact: data.contact,
          email: data.email,
          age: data.age,
          timezone: data.timezone,
          hours: data.hours,
          experience: data.experience,
          scenario: data.scenario,
          why: data.why,
          extra: data.extra,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        showSuccess();
      } else {
        throw Object.assign(new Error(json.error || "send failed"), { status: res.status });
      }
    } catch (err) {
      msg.textContent =
        err && err.status === 429
          ? "A few too many tries in a row — wait ten minutes, or reach us here:"
          : err && err.status === 503
            ? "Applications are paused right now — reach us here:"
            : err && err.status === 400
              ? "That didn't come through complete — double-check your answers, or reach us here:"
              : "Couldn't reach the queue from this page — reach us here instead:";
      const acts = document.createElement("span");
      acts.className = "form-actions";
      acts.innerHTML =
        '<a class="pa-discord" href="https://discord.gg/bj8VqJbYXE" target="_blank" rel="noopener noreferrer"><img src="assets/logos/discord.svg" alt="">Join the Discord</a>' +
        '<a href="#" data-mail-open>Email instead</a>';
      msg.appendChild(acts);
      msg.classList.add("show", "error");
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-loading");
    }
  });
}

function showSuccess() {
  form.hidden = true;
  if (successPanel) {
    successPanel.hidden = false;
    const check = successPanel.querySelector(".check");
    if (check && motion) {
      const clone = check.cloneNode(true);
      check.replaceWith(clone); // restart draw animations
    }
    successPanel.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "center" });
  }
}


const burger = document.getElementById("burger");
const menu = document.getElementById("menu");
let menuOpen = false;

function setMenu(open) {
  menuOpen = open;
  menu.classList.toggle("open", open);
  menu.setAttribute("aria-hidden", String(!open));
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  if (lenis) open ? lenis.stop() : lenis.start();
  body.style.overflow = open && !lenis ? "hidden" : "";
}

if (burger && menu) {
  burger.addEventListener("click", () => setMenu(!menuOpen));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
}


document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === "#top" ? 0 : -70, duration: 1.35 });
    else el.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
  });
});


function initCursor() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;
  let dot = document.querySelector(".cursor-dot");
  if (!dot) {
    dot = document.createElement("div");
    dot.className = "cursor-dot";
    document.body.append(dot);
  }
  html.classList.add("has-cursor");
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
  });
  document.documentElement.addEventListener("mouseleave", () => (dot.style.opacity = "0"));
  document.documentElement.addEventListener("mouseenter", () => (dot.style.opacity = ""));
}

html.classList.add("motion-on");
html.dataset.motion = "on";
window.dispatchEvent(new CustomEvent("uim-motion", { detail: { on: true } }));
initLenis();
initCursor();

const loader = document.getElementById("loader");
const markLoaded = () => body.classList.add("loaded");
let booted = false;
try { booted = sessionStorage.getItem("marko-booted") === "1"; } catch {}

if (motion && loader && !booted) {
  try { sessionStorage.setItem("marko-booted", "1"); } catch {}
  setTimeout(() => {
    markLoaded();
    loader.classList.add("done");
    setTimeout(() => loader.remove(), 900);
  }, 1050);
} else {
  if (loader) loader.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(markLoaded, 60)));
  setTimeout(markLoaded, 700);
}
