/* СТЕНА: сравнение «до/после», расчёт сметы, проверка заявки. */
(() => {
  "use strict";

  /* ---------- шапка ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- появление блоков ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- до / после ---------- */
  const ba = document.getElementById("ba");
  if (ba) {
    const before = document.getElementById("baBefore");
    const line = document.getElementById("baLine");
    const set = (percent) => {
      const p = Math.max(4, Math.min(96, percent));
      before.style.width = p + "%";
      line.style.left = p + "%";
    };
    const fromEvent = (e) => {
      const r = ba.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100);
    };
    // ширину блока отдаём в CSS: по ней растягивается картинка «до»
    const syncWidth = () => ba.style.setProperty("--ba-w", ba.clientWidth + "px");
    window.addEventListener("resize", syncWidth, { passive: true });
    syncWidth();

    let dragging = false;
    ba.addEventListener("pointerdown", (e) => { dragging = true; fromEvent(e); ba.setPointerCapture(e.pointerId); });
    ba.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    ba.addEventListener("pointerup", () => { dragging = false; });
    ba.addEventListener("pointercancel", () => { dragging = false; });
    // с клавиатуры — стрелками, когда кружок в фокусе
    ba.querySelector(".ba-grip").addEventListener("keydown", (e) => {
      const now = parseFloat(before.style.width) || 50;
      if (e.key === "ArrowLeft") { set(now - 4); e.preventDefault(); }
      if (e.key === "ArrowRight") { set(now + 4); e.preventDefault(); }
    });
    set(50);
  }

  /* ---------- калькулятор сметы ---------- */
  // Цены условные, как в демо: рубли за квадратный метр.
  const PRICE = { cosmetic: 7900, capital: 13500, design: 19800 };
  const DAYS = { cosmetic: 0.42, capital: 0.62, design: 0.78 };
  const EXTRA = { wiring: 1700, plumb: 1400, floor: 1150, doors: 950 };

  const area = document.getElementById("area");
  const sum = document.getElementById("sum");
  const days = document.getElementById("days");

  const money = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n / 1000) * 1000) + " ₽";

  const плюрал = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  function count() {
    if (!area || !sum) return;
    const m2 = Math.max(10, Math.min(400, Number(area.value) || 0));
    const kind = document.querySelector('input[name="kind"]:checked').value;
    let perM2 = PRICE[kind];
    document.querySelectorAll("#extras input:checked").forEach((c) => { perM2 += EXTRA[c.value]; });

    const total = m2 * perM2;
    const d = Math.round(m2 * DAYS[kind]) + 7;   // неделя на подготовку и приёмку
    sum.textContent = money(total);
    days.textContent = `${d} ${плюрал(d, "день", "дня", "дней")}`;
  }

  document.getElementById("calcForm")?.addEventListener("input", count);
  count();

  /* ---------- заявка ---------- */
  const form = document.getElementById("leadForm");
  if (form) {
    const ok = document.getElementById("ok");

    const bad = (input, text) => {
      const field = input.closest(".field");
      field.classList.add("bad");
      if (!field.querySelector(".err")) {
        const p = document.createElement("p");
        p.className = "err";
        p.textContent = text;
        field.appendChild(p);
      }
    };
    const clean = (input) => {
      const field = input.closest(".field");
      field.classList.remove("bad");
      field.querySelector(".err")?.remove();
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name");
      const phone = document.getElementById("phone");
      [name, phone].forEach(clean);

      let valid = true;
      if (name.value.trim().length < 2) { bad(name, "Напишите, как к вам обращаться"); valid = false; }
      // в телефоне должно остаться 11 цифр (или 10 без кода страны)
      const digits = phone.value.replace(/\D/g, "");
      if (digits.length < 10) { bad(phone, "Проверьте номер телефона"); valid = false; }
      if (!valid) return;

      ok.hidden = false;
      form.querySelector("button[type=submit]").disabled = true;
      setTimeout(() => { form.reset(); ok.hidden = true;
        form.querySelector("button[type=submit]").disabled = false; }, 6000);
    });

    // подсказываем формат телефона прямо при вводе
    document.getElementById("phone")?.addEventListener("input", (e) => {
      const d = e.target.value.replace(/\D/g, "").slice(0, 11);
      if (!d) { e.target.value = ""; return; }
      const body = d.length === 11 ? d.slice(1) : d;
      const parts = [body.slice(0, 3), body.slice(3, 6), body.slice(6, 8), body.slice(8, 10)];
      e.target.value = "+7 " + parts[0] + (parts[1] ? " " + parts[1] : "") +
        (parts[2] ? "-" + parts[2] : "") + (parts[3] ? "-" + parts[3] : "");
    });
  }

  /* ---------- перенос расчёта в заявку ---------- */
  document.getElementById("toForm")?.addEventListener("click", () => {
    const note = document.getElementById("note");
    if (note && !note.value) {
      const kind = document.querySelector('input[name="kind"]:checked').nextElementSibling.textContent;
      note.value = `${kind} ремонт, ${area.value} м². Предварительно ${sum.textContent}.`;
    }
  });
})();
