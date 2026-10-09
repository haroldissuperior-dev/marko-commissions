/* hero particles — monochrome dust field with mouse parallax.
   Cheap single-canvas system; pauses off-screen and when hidden. */

const canvas = document.getElementById("hero-particles");
if (canvas && document.documentElement.classList.contains("motion-on")) {
  const hero = canvas.closest(".hero");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  let parts = [];
  let mx = 0, my = 0, sx = 0, sy = 0;
  let inView = true;

  function spawn(anywhere) {
    return {
      x: Math.random(),
      y: anywhere ? Math.random() : 1.02 + Math.random() * 0.08,
      z: 0.25 + Math.random() * 0.75,
      vx: -(0.00005 + Math.random() * 0.00013),
      vy: -(0.00004 + Math.random() * 0.00011),
      r: 0.4 + Math.random() * 1.15,
      tw: Math.random() * Math.PI * 2,
      ts: 0.4 + Math.random() * 0.9,
    };
  }

  function resize() {
    const r = hero.getBoundingClientRect();
    W = canvas.width = Math.max(2, Math.round(r.width * dpr));
    H = canvas.height = Math.max(2, Math.round(r.height * dpr));
    const n = Math.min(Math.round((r.width * r.height) / 15000), 90);
    parts = Array.from({ length: n }, () => spawn(true));
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  });

  new IntersectionObserver((es) => (inView = es[0].isIntersecting), {
    rootMargin: "40px",
  }).observe(hero);

  // click burst: spawn a short-lived spark ring at the pointer
  let bursts = [];
  hero.addEventListener("pointerdown", (e) => {
    const r = hero.getBoundingClientRect();
    const ux = (e.clientX - r.left) / r.width;
    const uy = (e.clientY - r.top) / r.height;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = 0.12 + Math.random() * 0.22;
      bursts.push({ x: ux, y: uy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, z: 0.5 + Math.random() * 0.5, r: 0.6 + Math.random() * 1.2 });
    }
  });

  window.addEventListener("resize", resize);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (inView && !document.hidden) {
      sx += (mx - sx) * 0.04;
      sy += (my - sy) * 0.04;

      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      bursts = bursts.filter((b) => b.life > 0);
      for (const b of bursts) {
        b.life -= dt * 1.6;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += dt * 0.12;
        ctx.beginPath();
        ctx.arc(b.x * W, b.y * H, b.r * b.z * dpr * b.life, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255," + (b.life * 0.9).toFixed(3) + ")";
        ctx.fill();
      }

      for (const p of parts) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        const px = (p.x + sx * 0.035 * p.z) * W;
        const py = (p.y + sy * 0.035 * p.z) * H;
        const a = p.z * (0.28 + 0.3 * (0.5 + 0.5 * Math.sin(p.tw + t * p.ts)));
        ctx.beginPath();
        ctx.arc(px, py, p.r * p.z * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
