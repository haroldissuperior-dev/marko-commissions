results = []

def patch(path, pairs):
    s = open(path, encoding='utf8').read()
    for old, new, tag in pairs:
        if old in s:
            s = s.replace(old, new)
            results.append(tag + ": OK")
        else:
            results.append(tag + ": SKIP (" + path + ")")
    open(path, 'w', encoding='utf8').write(s)

# ============ index.html ============
patch('index.html', [
    # service cards become interactive (open Clanko V2 with a question)
    ('<article class="card rv" style="--d:0">\n            <div class="card-top">\n              <span class="card-tag">Design</span>',
     '<article class="card rv clickable" style="--d:0" data-chat="Tell me about the graphic design services" title="Click to ask Clanko V2 about design">\n            <div class="card-top">\n              <span class="card-tag">Design</span>', "cardA"),
    ('<article class="card rv" style="--d:1">\n            <div class="card-top">\n              <span class="card-tag">Code</span>',
     '<article class="card rv clickable" style="--d:1" data-chat="Tell me about the bot services" title="Click to ask Clanko V2 about bots">\n            <div class="card-top">\n              <span class="card-tag">Code</span>', "cardB"),

    # why items interactive
    ('<div class="why-item rv" style="--d:0">\n            <h4>Fixed quotes</h4>',
     '<div class="why-item rv clickable" style="--d:0" data-chat="How does pricing work?" title="Click to ask Clanko V2 about pricing">\n            <h4>Fixed quotes</h4>', "why0"),
    ('<div class="why-item rv" style="--d:1">\n            <h4>Direct line</h4>',
     '<div class="why-item rv clickable" style="--d:1" data-chat="How do I contact the team?" title="Click to ask Clanko V2 about contact">\n            <h4>Direct line</h4>', "why1"),
    ('<div class="why-item rv" style="--d:2">\n            <h4>After delivery</h4>',
     '<div class="why-item rv clickable" style="--d:2" data-chat="What about bug fixes and hosting?" title="Click to ask Clanko V2 about support">\n            <h4>After delivery</h4>', "why2"),

    # footer brand + version become links
    ("""      <div class="footer-brand">
        <img class="footer-logo" src="assets/logo.png" alt="Marko's Commissions logo" width="36" height="27">
        <div>
          <p class="footer-name"><b>Marko's</b>&nbsp;Commissions</p>
          <p class="footer-tag">Graphic design &amp; bot services.</p>
        </div>
      </div>""",
     """      <a class="footer-brand" href="#top" aria-label="Back to top">
        <img class="footer-logo" src="assets/logo.png" alt="Marko's Commissions logo" width="36" height="27">
        <div>
          <p class="footer-name"><b>Marko's</b>&nbsp;Commissions</p>
          <p class="footer-tag">Graphic design &amp; bot services.</p>
        </div>
      </a>""", "footer-brand"),
    ('<p>All work quoted and delivered as described in the terms above. <span class="ver">V.1.25</span></p>',
     '<p>All work quoted and delivered as described in the terms above. <a class="ver" href="https://github.com/haroldissuperior-dev/marko-commissions" target="_blank" rel="noopener noreferrer" title="View the source repository">V.1.25</a></p>', "ver-link"),
])

patch('terms.html', [
    ('<p>These terms were written to be read, not skimmed past. <span class="ver">V.1.25</span></p>',
     '<p>These terms were written to be read, not skimmed past. <a class="ver" href="https://github.com/haroldissuperior-dev/marko-commissions" target="_blank" rel="noopener noreferrer" title="View the source repository">V.1.25</a></p>', "ver-link"),
])

# ============ main.js ============
js = open('js/main.js', encoding='utf8').read()

# expose a minimal Clanko API + interactive card/why clicks
old = """function initChat() {
  const launcher = document.getElementById("chat-launcher");
  if (!launcher) return;"""
new = """function initChat() {
  const launcher = document.getElementById("chat-launcher");
  if (!launcher) return;"""
results = []

old2 = """  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    ask(v);
  });
}"""
new2 = """  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    ask(v);
  });

  window.clanko = {
    open: () => setPanel(true),
    ask: (t) => { setPanel(true); ask(t); },
  };
}"""
assert old2 in js
js = js.replace(old2, new2)
results.append("clanko-api: OK")

# clickable cards / why items -> clanko
old = """/* ---------------- FAQ: keep one open ---------------- */"""
new = """/* clickable info cards: they ask Clanko V2 the matching question */
document.querySelectorAll("[data-chat]").forEach((el) => {
  el.classList.add("clickable");
  el.addEventListener("click", () => {
    if (window.clanko) window.clanko.ask(el.dataset.chat);
  });
});

/* ---------------- FAQ: keep one open ---------------- */"""
assert old in js
js = js.replace(old, new)
results.append("clickable: OK")

# marquee words scroll to their sections
old = """/* ---------------- nav + side dots active section ---------------- */"""
new = """/* marquee words navigate to their section */
const MARQUEE_TARGETS = {
  "graphic design": "#overview",
  "discord bots": "#overview",
  "brand identity": "#overview",
  "ui / ux": "#overview",
  "automation": "#overview",
  "dashboards": "#overview",
  "emotes & assets": "#overview",
  "marko's commissions": "top",
  "support applications open": "#apply",
};
document.querySelectorAll(".marquee").forEach((mq) => {
  mq.style.cursor = "pointer";
  mq.addEventListener("click", (e) => {
    const span = e.target.closest(".marquee-set span");
    if (!span) return;
    const key = span.textContent.trim().toLowerCase();
    const target = MARQUEE_TARGETS[key];
    if (!target) return;
    if (target === "top") {
      lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.querySelector(target);
      if (el) lenis ? lenis.scrollTo(el, { offset: -70, duration: 1.4 }) : el.scrollIntoView({ behavior: "smooth" });
    }
  });
});

/* ---------------- nav + side dots active section ---------------- */"""
assert old in js
js = js.replace(old, new)
results.append("marquee-nav: OK")

open('js/main.js', 'w', encoding='utf8').write(js)
print("\n".join(results))
