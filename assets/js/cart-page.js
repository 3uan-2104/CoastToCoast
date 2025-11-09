// Render cart contents, allow qty changes and removal, update subtotal (with deals support)

(function () {
  'use strict';

  function formatPrice(n) {
    return `£${Number(n || 0).toFixed(2)}`;
  }

  // return { productsMap: Map<id,product>, dealsMap: Map<id,deal> }
  async function getProductsData() {
    try {
      const resp = await fetch('data/products.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('products.json fetch failed');
      const data = await resp.json();
      const productsMap = new Map();
      (data.categories || []).forEach(cat => {
        (cat.products || []).forEach(p => productsMap.set(String(p.id), Object.assign({}, p, { category: cat })));
      });

      const dealsMap = new Map();
      // support data.deals as array or object
      if (Array.isArray(data.deals)) {
        data.deals.forEach(d => {
          if (d && d.id) dealsMap.set(String(d.id), d);
        });
      } else if (data.deals && typeof data.deals === 'object') {
        Object.keys(data.deals).forEach(k => dealsMap.set(k, data.deals[k]));
      }

      return { productsMap, dealsMap };
    } catch (err) {
      console.error('getProductsData', err);
      return { productsMap: new Map(), dealsMap: new Map() };
    }
  }

  function createCartItemNode(item, product) {
    const tile = document.createElement('div');
    tile.className = 'cart-item';
    const imgSrc = (product && (product.img || product.image)) || 'assets/images/insert_image.jpg';
    const name = (product && product.name) || `Product ${item.id}`;
    const unitPrice = (product && !isNaN(product.price)) ? Number(product.price) : 0;

    tile.innerHTML = `
      <div class="cart-item-left">
        <img class="cart-item-img" src="${imgSrc}" alt="${escapeHtml(name)}">
      </div>
      <div class="cart-item-body">
        <div class="cart-item-row">
          <div class="cart-item-name">${escapeHtml(name)}</div>
          <button class="cart-item-remove" data-id="${escapeHtml(item.id)}" title="Remove item">✕</button>
        </div>
        <div class="cart-item-row cart-item-meta">
          <div class="cart-item-price">Unit: <span class="cart-unit-price">${formatPrice(unitPrice)}</span></div>
          <div class="cart-item-qty">
            <button class="qty-decrease" data-id="${escapeHtml(item.id)}">−</button>
            <input class="qty-input" type="number" min="1" value="${Number(item.qty)}" data-id="${escapeHtml(item.id)}">
            <button class="qty-increase" data-id="${escapeHtml(item.id)}">+</button>
          </div>
          <div class="cart-item-subtotal">Subtotal: <span class="cart-item-subtotal-val">${formatPrice(unitPrice * Number(item.qty))}</span></div>
        </div>
      </div>
    `;
    return tile;
  }

  // minimal HTML escaping
  function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // compute discounts for deals present in cart
  // returns numeric totalDiscount (positive number)
  function computeDiscounts(items, productsMap, dealsMap) {
    let totalDiscount = 0;

    // gather products' deal assignments (assumes product.deals is array of deal ids)
    // NOTE: if products can belong to multiple deals, this implementation applies each deal independently and may double-count;
    // ideally deals should not overlap or additional logic should choose best deal per product.
    dealsMap.forEach((deal, dealId) => {
      // collect items that are assigned this deal
      const affected = [];
      items.forEach(it => {
        const prod = productsMap.get(String(it.id));
        if (!prod) return;
        const prodDeals = prod.deals || prod.deal || prod.dealIds || [];
        // support string or array
        const hasDeal = Array.isArray(prodDeals) ? prodDeals.includes(dealId) : String(prodDeals) === String(dealId);
        if (hasDeal) affected.push({ item: it, product: prod, qty: Number(it.qty || 0), unitPrice: (prod.price !== undefined && !isNaN(prod.price)) ? Number(prod.price) : 0 });
      });

      if (!affected.length) return;

      const totalQty = affected.reduce((s, a) => s + a.qty, 0);
      const originalTotal = affected.reduce((s, a) => s + a.unitPrice * a.qty, 0);

      const required = Number(deal.requiredQty || deal.requiredQuantity || deal.qty || 0);
      if (!required || totalQty < required) return;

      if (String(deal.type) === 'percentage') {
        const pct = Number(deal.percent || deal.percentOff || deal.percentOff || 0);
        if (pct > 0) {
          totalDiscount += originalTotal * (pct / 100);
        }
      } else if (String(deal.type) === 'bySet') {
        const setPrice = Number(deal.setPrice || deal.set_total || deal.setPrice || 0);
        if (setPrice >= 0) {
          const sets = Math.floor(totalQty / required);
          const remainder = totalQty - sets * required;
          // approximate remainder cost proportional to original prices (keeps relative prices)
          const avgUnit = totalQty > 0 ? originalTotal / totalQty : 0;
          const newTotal = sets * setPrice + remainder * avgUnit;
          const discount = originalTotal - newTotal;
          if (discount > 0) totalDiscount += discount;
        }
      }
    });

    return totalDiscount;
  }

  async function renderCart() {
    const container = document.querySelector('.cart-container');
    if (!container) return;
    container.innerHTML = '';

    const items = (window.Cart && typeof window.Cart.getCart === 'function') ? window.Cart.getCart() : [];
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="cart-empty">Your basket is empty.</div>';
      updateTotalsDisplay(0, 0);
      return;
    }

    const { productsMap, dealsMap } = await getProductsData();

    let grandTotal = 0;
    const frag = document.createDocumentFragment();

    items.forEach(item => {
      const product = productsMap.get(String(item.id));
      const unit = product && !isNaN(product.price) ? Number(product.price) : 0;
      grandTotal += unit * Number(item.qty || 0);
      const node = createCartItemNode(item, product);
      frag.appendChild(node);
    });

    // compute discounts across deals
    const totalDiscount = computeDiscounts(items, productsMap, dealsMap);

    container.appendChild(frag);
    updateTotalsDisplay(grandTotal, totalDiscount);
    attachCartControls();
  }

  function updateTotalsDisplay(subtotal, discount) {
    const discountEl = document.getElementById('cart-discounts');
    const subtotalEl = document.getElementById('cart-subtotal');
    if (discountEl) discountEl.textContent = `-${formatPrice(discount)}`;
    if (subtotalEl) subtotalEl.textContent = formatPrice(Math.max(0, subtotal - (discount || 0)));
  }

  function attachCartControls() {
    // qty increase
    document.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const input = document.querySelector(`.qty-input[data-id="${id}"]`);
        const newQty = Math.max(1, Number(input.value || 0) + 1);
        input.value = newQty;
        if (window.Cart) window.Cart.updateCartItem(id, newQty);
      });
    });

    // qty decrease
    document.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const input = document.querySelector(`.qty-input[data-id="${id}"]`);
        const newQty = Math.max(1, Number(input.value || 0) - 1);
        input.value = newQty;
        if (window.Cart) window.Cart.updateCartItem(id, newQty);
      });
    });

    // manual qty input
    document.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = input.dataset.id;
        let v = parseInt(input.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        input.value = v;
        if (window.Cart) window.Cart.updateCartItem(id, v);
      });
    });

    // remove
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        if (window.Cart) window.Cart.removeFromCart(id);
      });
    });

    // clear — replace node with a clone to remove previously attached listeners
    const clearBtn = document.getElementById('cart-clear');
    if (clearBtn && clearBtn.parentNode) {
      const newClear = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newClear, clearBtn);
      newClear.addEventListener('click', () => {
        if (confirm('Clear all items from your basket?')) {
          if (window.Cart) window.Cart.clearCart();
        }
      });
    }

    // checkout — same treatment to avoid duplicate listeners
    const checkout = document.getElementById('cart-checkout');
    if (checkout && checkout.parentNode) {
      const newCheckout = checkout.cloneNode(true);
      checkout.parentNode.replaceChild(newCheckout, checkout);
      newCheckout.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Proceeding to checkout (not implemented)');
      });
    }
  }

  // re-render when cart updates
  window.addEventListener('cartupdated', () => {
    renderCart();
  });

  // initial render
  document.addEventListener('DOMContentLoaded', () => {
    renderCart();
  });
})();