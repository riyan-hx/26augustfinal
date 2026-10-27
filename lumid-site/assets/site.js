document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (window.lucide) window.lucide.createIcons();

// Nav: hairline once the page scrolls, mobile sheet toggle
const nav = document.querySelector(".nav");
const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const toggle = document.querySelector(".nav-toggle");
const sheet = document.querySelector(".nav-sheet");
if (toggle && sheet) {
  toggle.addEventListener("click", () => {
    const open = sheet.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheet.classList.contains("is-open")) {
      sheet.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
}

// Reveal on scroll, content visible by default without JS
const revealables = document.querySelectorAll(".rv");
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add("is-in"));
}

// Hero ticket: a held slot (WL) confirms (CNF) only when payment lands
const stub = document.querySelector("[data-stub]");
if (stub) {
  const tickets = [
    { code: "LMD 4821 0937", who: "Divya Prasad", session: "Individual · 50 min", when: "Thu 28 Aug · 5:00 PM", fee: "₹1,500", seat: "Google Meet" },
    { code: "LMD 4821 1044", who: "Vikram Shetty", session: "First consultation · 60 min", when: "Thu 28 Aug · 6:30 PM", fee: "₹2,000", seat: "Google Meet" },
    { code: "LMD 4822 0215", who: "Lakshmi Iyer", session: "Individual · 50 min", when: "Fri 29 Aug · 11:00 AM", fee: "₹1,500", seat: "Google Meet" },
    { code: "LMD 4822 0388", who: "Rahul Sharma", session: "Follow-up · 30 min", when: "Fri 29 Aug · 3:00 PM", fee: "₹1,200", seat: "Google Meet" },
  ];
  const set = (k, v) => stub.querySelectorAll(`[data-f="${k}"]`).forEach((el) => (el.textContent = v));
  const payNote = stub.querySelector("[data-f=pay]");
  const statusNote = stub.querySelector("[data-f=note]");
  let i = 0;

  const show = (t, state) => {
    stub.dataset.state = state;
    if (state === "wl") {
      payNote.textContent = `Waiting for ${t.fee} via UPI`;
      statusNote.textContent = "Slot held for 30 min. Not on your calendar yet.";
    } else {
      payNote.textContent = `${t.fee} received · UPI`;
      statusNote.textContent = "Paid. Added to your chart.";
    }
  };
  const load = (t) => {
    set("code", t.code); set("who", t.who); set("session", t.session);
    set("when", t.when); set("fee", t.fee); set("seat", t.seat);
  };

  load(tickets[0]);
  if (reduceMotion) {
    show(tickets[0], "cnf");
  } else {
    show(tickets[0], "wl");
    const cycle = () => {
      setTimeout(() => show(tickets[i], "cnf"), 2200);
      setTimeout(() => {
        i = (i + 1) % tickets.length;
        stub.classList.add("is-swapping");
        load(tickets[i]);
        show(tickets[i], "wl");
        stub.classList.remove("is-swapping");
        cycle();
      }, 6200);
    };
    cycle();
  }
}

// Chart index: each row switches the screen in view
document.querySelectorAll("[data-index]").forEach((root) => {
  const tabs = [...root.querySelectorAll("[role=tab]")];
  const imgs = [...root.querySelectorAll("[data-view]")];
  const cap = root.querySelector("[data-cap]");
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const id = tab.dataset.target;
    imgs.forEach((img) => img.classList.toggle("is-on", img.dataset.view === id));
    if (cap) cap.textContent = tab.dataset.cap || "";
    if (focus) tab.focus();
  };
  tabs.forEach((tab, n) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = tabs[(n + (e.key === "ArrowDown" ? 1 : tabs.length - 1)) % tabs.length];
        select(next, true);
      }
    });
  });
});

// Contact form: validate, then hand off to the visitor's mail app
const form = document.querySelector("[data-contact]");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("[data-req]").forEach((input) => {
      const fld = input.closest(".fld");
      const bad = input.type === "email" ? !/^\S+@\S+\.\S+$/.test(input.value.trim()) : !input.value.trim();
      fld.classList.toggle("has-error", bad);
      if (bad && ok) { input.focus(); ok = false; }
    });
    if (!ok) return;
    const data = new FormData(form);
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Practice: ${data.get("practice") || "-"}`,
      `City: ${data.get("city") || "-"}`,
      "",
      data.get("message"),
    ].join("\n");
    const subject = `Lumid AI: ${data.get("topic")}`;
    window.location.href = `mailto:riyan@lumid.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.querySelector(".form-done").classList.add("is-on");
  });
  form.querySelectorAll("[data-req]").forEach((input) =>
    input.addEventListener("input", () => input.closest(".fld").classList.remove("has-error"))
  );
}

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
