/* Herbs & Spices — front-end behaviour.
   Vanilla JS, no dependencies. Each block only runs when its markup is on the page.
   Cart events: after any successful add we dispatch `hsd:cart-updated` on document
   (detail = cart JSON) so the host theme's cart drawer can refresh itself. */
(() => {
  const money = (cents) => {
    const fmt = window.HSD?.moneyFormat || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return fmt.replace(/\{\{\s*amount[^}]*\}\}/, amount.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  };

  const refreshCartCount = async () => {
    const cart = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`).then((r) => r.json());
    document.querySelectorAll('[data-hsd-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
    document.dispatchEvent(new CustomEvent('hsd:cart-updated', { detail: cart }));
    return cart;
  };

  /* Spice puff: after a successful add, a pinch of grains in the product's
     spice colour (data-hsd-spice, set from custom.spice_color) flies from the
     button to the cart icon. Decorative only; skipped for reduced motion.
     Resolves when the grains have landed (or straight away when skipped). */
  const puff = (button) => new Promise((done) => {
    const cartEl = document.getElementById('hsd-cart-icon');
    if (!button || !cartEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    const a = button.getBoundingClientRect();
    const b = cartEl.getBoundingClientRect();
    if (!b.width || b.bottom < 0 || b.top > window.innerHeight) { done(); return; } // cart icon not on screen
    const color = button.closest('[data-hsd-spice]')?.dataset.hsdSpice || '#E0A21B';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:90';
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const grains = Array.from({ length: 42 }, () => ({
      sx: ax + (Math.random() - 0.5) * a.width * 0.6,
      sy: ay + (Math.random() - 0.5) * a.height * 0.6,
      cx: (ax + bx) / 2 + (Math.random() - 0.5) * 160,
      cy: Math.min(ay, by) - 60 - Math.random() * 140,
      delay: Math.random() * 180,
      dur: 620 + Math.random() * 300,
      r: 1.2 + Math.random() * 2.2,
      fill: Math.random() < 0.08 ? '#FBF4E2' : color,
      alpha: 0.6 + Math.random() * 0.4,
    }));
    const start = performance.now();
    const tick = (now) => {
      ctx.clearRect(0, 0, c.width, c.height);
      let alive = false;
      for (const g of grains) {
        const t = Math.min(Math.max((now - start - g.delay) / g.dur, 0), 1);
        if (t < 1) alive = true;
        const e = 1 - (1 - t) * (1 - t); // ease-out
        const x = (1 - e) * (1 - e) * g.sx + 2 * (1 - e) * e * g.cx + e * e * bx;
        const y = (1 - e) * (1 - e) * g.sy + 2 * (1 - e) * e * g.cy + e * e * by;
        ctx.globalAlpha = g.alpha * (t > 0.8 ? (1 - t) / 0.2 : 1);
        ctx.fillStyle = g.fill;
        ctx.beginPath();
        ctx.arc(x, y, g.r * (1 - e * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      if (alive) requestAnimationFrame(tick);
      else {
        c.remove();
        cartEl.classList.remove('is-bumped');
        void cartEl.offsetWidth;
        cartEl.classList.add('is-bumped');
        setTimeout(done, 250);
      }
    };
    requestAnimationFrame(tick);
  });

  const addToCart = async (payload, button) => {
    const label = button?.innerHTML;
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    try {
      const isForm = payload instanceof FormData;
      const res = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
        method: 'POST',
        headers: isForm ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: isForm ? payload : JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || 'Could not add to cart');
      const cart = await refreshCartCount();
      // Once the puff lands, tell the cart drawer (it opens, or just refreshes).
      puff(button).then(() => document.dispatchEvent(new CustomEvent('hsd:item-added', { detail: { cart, item: data } })));
      if (button) {
        button.innerHTML = 'Added ✓';
        setTimeout(() => { button.innerHTML = label; }, 1800);
      }
      return data;
    } finally {
      if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
    }
  };

  /* ---------- Quick add on product cards ---------- */
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-hsd-quick-add]');
    if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    try { await addToCart(new FormData(form), btn); }
    catch (err) { form.submit(); } // graceful fallback to normal POST
  });

  /* ---------- Cart drawer ----------
     Markup lives in the HSD Header section. The drawer is filled from /cart.js,
     and quantity changes go through /cart/change.js. */
  const cartDrawer = document.querySelector('[data-hsd-cart-drawer]');
  if (cartDrawer) {
    const root = window.Shopify?.routes?.root || '/';
    const $ = (sel) => cartDrawer.querySelector(sel);
    const list = $('[data-hsd-cart-items]');
    const status = document.querySelector('[data-hsd-cart-status]');
    const threshold = Number(cartDrawer.dataset.threshold) || 0;
    const cartLink = document.getElementById('hsd-cart-icon');
    const onCartPage = /\/cart\/?$/.test(window.location.pathname);
    let lastFocus = null;

    const setCounts = (cart) => {
      document.querySelectorAll('[data-hsd-cart-count]').forEach((el) => { el.textContent = cart.item_count; el.hidden = cart.item_count === 0; });
      if (cartLink) cartLink.setAttribute('aria-label', `Cart, ${cart.item_count} items`);
    };

    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const sized = (src, w) => { try { const u = new URL(src, window.location.origin); u.searchParams.set('width', w); return u.href; } catch { return src; } };

    const render = (cart) => {
      $('[data-hsd-cart-drawer-count]').textContent = cart.item_count ? `(${cart.item_count})` : '';
      $('[data-hsd-cart-empty]').hidden = cart.item_count > 0;
      $('[data-hsd-cart-foot]').hidden = cart.item_count === 0;
      $('[data-hsd-cart-subtotal]').textContent = money(cart.items_subtotal_price ?? cart.total_price);

      const ship = $('[data-hsd-cart-ship]');
      ship.hidden = !threshold || cart.item_count === 0;
      if (threshold) {
        const left = threshold - cart.total_price;
        const pct = Math.min(100, Math.round((cart.total_price / threshold) * 100));
        $('[data-hsd-cart-ship-text]').textContent = left > 0 ? `You're ${money(left)} away from free shipping` : "You've got free shipping";
        $('[data-hsd-cart-ship-bar]').style.width = `${pct}%`;
        ship.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', pct);
      }

      list.replaceChildren(...cart.items.map((item, i) => {
        const line = i + 1;
        const li = el('li', 'hsd-cart-line');
        if (item.image) {
          const img = el('img', 'hsd-cart-line__img');
          img.src = sized(item.image, 160); img.alt = ''; img.width = 64; img.height = 64; img.loading = 'lazy';
          li.append(img);
        } else li.append(el('span', 'hsd-cart-line__img'));

        const mid = el('div');
        const title = el('a', 'hsd-cart-line__title', item.product_title || item.title);
        title.href = item.url;
        mid.append(title);
        if (!item.product_has_only_default_variant && item.variant_title) mid.append(el('span', 'hsd-cart-line__variant', item.variant_title));

        const controls = el('div', 'hsd-cart-line__controls');
        const qty = el('div', 'hsd-mini-qty');
        const minus = el('button', null, '−');
        minus.type = 'button'; minus.setAttribute('aria-label', `One fewer ${item.product_title}`);
        minus.addEventListener('click', () => change(line, item.quantity - 1, li));
        const plus = el('button', null, '+');
        plus.type = 'button'; plus.setAttribute('aria-label', `One more ${item.product_title}`);
        plus.addEventListener('click', () => change(line, item.quantity + 1, li));
        const n = el('span', null, String(item.quantity));
        n.setAttribute('aria-label', `Quantity ${item.quantity}`);
        qty.append(minus, n, plus);
        const remove = el('button', 'hsd-cart-line__remove', 'Remove');
        remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${item.product_title}`);
        remove.addEventListener('click', () => change(line, 0, li));
        controls.append(qty, remove);
        mid.append(controls);

        li.append(mid, el('span', 'hsd-cart-line__price', money(item.final_line_price)));
        return li;
      }));
    };

    const change = async (line, quantity, li) => {
      li.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(`${root}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line, quantity }),
        });
        const cart = await res.json();
        if (!res.ok) throw new Error(cart.description || 'Could not update the cart');
        render(cart); setCounts(cart);
        status.textContent = `Cart updated. ${cart.item_count} items, subtotal ${money(cart.total_price)}.`;
        document.dispatchEvent(new CustomEvent('hsd:cart-updated', { detail: cart }));
        (list.querySelector('button') || $('button[data-hsd-cart-close]')).focus();
      } catch (err) {
        li.removeAttribute('aria-busy');
        status.textContent = err.message;
      }
    };

    const focusables = () => [...cartDrawer.querySelectorAll('a[href], button:not([disabled]), input')].filter((n) => n.offsetParent !== null);
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const open = () => {
      if (!cartDrawer.hidden) return;
      lastFocus = document.activeElement;
      cartDrawer.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => cartDrawer.classList.add('is-open'));
      cartDrawer.addEventListener('keydown', onKey);
      $('button[data-hsd-cart-close]').focus();
    };
    function close() {
      cartDrawer.classList.remove('is-open');
      cartDrawer.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => { cartDrawer.hidden = true; }, reduce ? 0 : 300);
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }
    cartDrawer.querySelectorAll('[data-hsd-cart-close]').forEach((b) => b.addEventListener('click', close));

    cartLink?.addEventListener('click', async (e) => {
      if (onCartPage || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the link work normally
      e.preventDefault();
      const cart = await fetch(`${root}cart.js`).then((r) => r.json());
      render(cart); open();
    });

    document.addEventListener('hsd:item-added', (e) => {
      const { cart, item } = e.detail;
      render(cart);
      status.textContent = `${item?.product_title || 'Item'} added to cart. ${cart.item_count} items in cart.`;
      if (cartDrawer.dataset.openOnAdd === 'true' && !onCartPage) open();
    });
    document.addEventListener('hsd:cart-updated', (e) => { if (!cartDrawer.hidden && e.detail?.items) render(e.detail); });
  }

  /* ---------- Horizontal product rows ---------- */
  document.querySelectorAll('[data-hsd-scroller]').forEach((wrap) => {
    const track = wrap.querySelector('.hsd-scroller');
    const step = () => track.clientWidth * 0.9;
    wrap.querySelector('[data-hsd-prev]')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    wrap.querySelector('[data-hsd-next]')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  /* ---------- Mobile menu drawer ---------- */
  document.querySelectorAll('[data-hsd-drawer-open]').forEach((btn) => {
    const drawer = document.getElementById(btn.getAttribute('aria-controls'));
    if (!drawer) return;
    const close = () => { drawer.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); document.body.style.overflow = ''; };
    btn.addEventListener('click', () => {
      drawer.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
      drawer.querySelector('a, button')?.focus();
    });
    drawer.querySelectorAll('[data-hsd-drawer-close]').forEach((c) => c.addEventListener('click', close));
    drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  });

  /* ---------- Story video: load the player only on click ---------- */
  document.querySelectorAll('[data-hsd-video]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const holder = btn.parentElement;
      const tpl = holder.querySelector('template');
      if (!tpl) return;
      holder.appendChild(tpl.content.cloneNode(true));
      btn.remove();
      holder.querySelector('video')?.play();
    });
  });

  /* ---------- Kits: add every product in the basket ---------- */
  document.querySelectorAll('[data-hsd-kit-add]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ids = JSON.parse(btn.dataset.hsdKitAdd || '[]');
      if (!ids.length) return;
      try { await addToCart({ items: ids.map((id) => ({ id, quantity: 1 })) }, btn); }
      catch (err) { alert(err.message); }
    });
  });

  /* ---------- Collection / search: filters + sort (plain GET forms, auto-submitted) ---------- */
  document.querySelectorAll('[data-hsd-autosubmit]').forEach((el) => {
    el.addEventListener('change', () => el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit());
  });
  const filterForm = document.querySelector('[data-hsd-filter-form]');
  if (filterForm) {
    let t;
    const submit = () => {
      // Drop empty price fields so URLs stay clean (?filter.v.price.gte= is noise)
      filterForm.querySelectorAll('input[type="number"]').forEach((i) => { i.disabled = i.value === ''; });
      filterForm.submit();
    };
    filterForm.addEventListener('change', (e) => {
      if (window.matchMedia('(max-width: 989px)').matches) return; // phones: apply with "Show results"
      clearTimeout(t);
      t = setTimeout(submit, e.target.type === 'number' ? 700 : 0);
    });
    filterForm.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    const wrap = document.querySelector('[data-hsd-filters-wrap]');
    document.querySelector('[data-hsd-filters-open]')?.addEventListener('click', () => { wrap.classList.add('is-open'); document.body.style.overflow = 'hidden'; });
    const closeFilters = () => { wrap.classList.remove('is-open'); document.body.style.overflow = ''; };
    wrap?.addEventListener('click', (e) => { if (e.target === wrap) closeFilters(); });
    document.querySelector('[data-hsd-filters-close]')?.addEventListener('click', closeFilters);
  }

  /* ---------- Cart page: +/- and typed quantities update the basket ---------- */
  const cartForm = document.querySelector('[data-hsd-cart-form]');
  if (cartForm) {
    let t;
    const update = () => { clearTimeout(t); t = setTimeout(() => cartForm.submit(), 450); };
    cartForm.querySelectorAll('[data-hsd-line-qty]').forEach((box) => {
      const input = box.querySelector('input');
      box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        input.value = Math.max(0, (parseInt(input.value, 10) || 0) + (b.dataset.step === 'up' ? 1 : -1));
        update();
      }));
      input.addEventListener('change', update);
    });
  }

  /* ==========================================================================
     Product page
     ========================================================================== */
  const pdp = document.querySelector('[data-hsd-pdp]');
  if (!pdp) return;

  const variants = JSON.parse(pdp.querySelector('[data-hsd-variants]')?.textContent || '[]');
  const form = pdp.querySelector('[data-hsd-product-form]');
  const idInput = form?.querySelector('input[name="id"]');
  const addBtn = form?.querySelector('[data-hsd-add]');
  const addLabel = addBtn?.querySelector('[data-hsd-add-label]');
  const errorEl = pdp.querySelector('[data-hsd-form-error]');
  const qtyInput = pdp.querySelector('[data-hsd-qty] input');
  const sticky = document.querySelector('[data-hsd-sticky-atc]');
  let current = variants.find((v) => String(v.id) === idInput?.value) || variants[0];

  const updateTotals = () => {
    if (!current) return;
    const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
    const total = money(current.price * qty);
    if (addLabel) addLabel.textContent = current.available ? `Add to cart · ${total}` : 'Sold out';
    if (sticky) {
      sticky.querySelector('[data-hsd-sticky-price]').textContent = total;
      const sBtn = sticky.querySelector('button');
      sBtn.disabled = !current.available;
      sBtn.textContent = current.available ? 'Add to cart' : 'Sold out';
    }
  };

  const renderVariant = () => {
    if (!current) return;
    idInput.value = current.id;
    addBtn.disabled = !current.available;
    const priceEl = pdp.querySelector('[data-hsd-price-current]');
    if (priceEl) priceEl.textContent = money(current.price);
    const cmp = pdp.querySelector('[data-hsd-price-compare]');
    if (cmp) { cmp.hidden = !(current.compare_at_price > current.price); cmp.lastChild.textContent = money(current.compare_at_price || 0); }
    const unit = pdp.querySelector('[data-hsd-price-unit]');
    if (unit && current.unit_price) {
      const m = current.unit_price_measurement;
      unit.textContent = `${money(current.unit_price)} / ${m.reference_value !== 1 ? m.reference_value + ' ' : ''}${m.reference_unit}`;
    }
    pdp.querySelectorAll('[data-hsd-variant-text]').forEach((el) => { el.textContent = current.title; });
    if (current.featured_media) showSlide(String(current.featured_media.id));
    const url = new URL(window.location.href);
    url.searchParams.set('variant', current.id);
    window.history.replaceState({}, '', url);
    updateTotals();
  };

  pdp.querySelectorAll('[data-hsd-option]').forEach((input) => {
    input.addEventListener('change', () => {
      const chosen = [...pdp.querySelectorAll('[data-hsd-option]:checked')].map((i) => i.value);
      current = variants.find((v) => v.options.every((o, idx) => o === chosen[idx])) || current;
      renderVariant();
    });
  });

  /* Quantity */
  pdp.querySelectorAll('[data-hsd-qty] button').forEach((b) => {
    b.addEventListener('click', () => {
      const n = parseInt(qtyInput.value || '1', 10) + (b.dataset.step === 'up' ? 1 : -1);
      qtyInput.value = Math.min(Math.max(n, 1), 99);
      updateTotals();
    });
  });
  qtyInput?.addEventListener('change', updateTotals);

  /* Add to cart (AJAX with plain-POST fallback) */
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.hidden = true;
    try { await addToCart(new FormData(form), addBtn); updateTotals(); }
    catch (err) {
      if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
    }
  });
  sticky?.querySelector('button')?.addEventListener('click', () => form.requestSubmit());

  /* Gallery */
  const slides = [...pdp.querySelectorAll('[data-hsd-slide]')];
  const thumbs = [...pdp.querySelectorAll('[data-hsd-thumb]')];
  const dots = [...pdp.querySelectorAll('[data-hsd-dot]')];
  const tag = pdp.querySelector('[data-hsd-gallery-tag]');
  function showSlide(id) {
    const isMobile = window.matchMedia('(max-width: 989px)').matches;
    slides.forEach((s) => {
      const on = s.dataset.hsdSlide === id;
      s.classList.toggle('is-active', on);
      if (on && isMobile) s.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (on && tag) tag.textContent = s.dataset.label || '';
    });
    thumbs.forEach((t) => t.setAttribute('aria-current', String(t.dataset.hsdThumb === id)));
  }
  thumbs.forEach((t) => t.addEventListener('click', () => showSlide(t.dataset.hsdThumb)));
  if (dots.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = slides.indexOf(en.target);
        dots.forEach((d, j) => d.classList.toggle('is-active', i === j));
      });
    }, { root: pdp.querySelector('.hsd-gallery__main'), threshold: 0.6 });
    slides.forEach((s) => io.observe(s));
  }

  /* Label tabs (desktop) + accordion (mobile) share the same panels */
  const tabs = [...document.querySelectorAll('[data-hsd-tab]')];
  const accBtns = [...document.querySelectorAll('[data-hsd-acc]')];
  const panels = [...document.querySelectorAll('[data-hsd-panel]')];
  const openPanel = (key, toggle = false) => {
    const panel = panels.find((p) => p.dataset.hsdPanel === key);
    const willClose = toggle && panel && !panel.hidden;
    panels.forEach((p) => { p.hidden = willClose || p.dataset.hsdPanel !== key; });
    tabs.forEach((t) => { const on = t.dataset.hsdTab === key; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    accBtns.forEach((b) => {
      const on = !willClose && b.dataset.hsdAcc === key;
      b.setAttribute('aria-expanded', String(on));
      b.querySelector('span').textContent = on ? '−' : '+';
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => openPanel(t.dataset.hsdTab));
    t.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); openPanel(next.dataset.hsdTab);
    });
  });
  accBtns.forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.hsdAcc, true)));

  /* Sticky add-to-cart bar on phones: show once the main button scrolls away */
  if (sticky && addBtn && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0))
      .observe(addBtn);
  }

  updateTotals();
})();
