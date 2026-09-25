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
      await refreshCartCount();
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
