// Populate product.html from data/products.json using ?id=PRODUCT_ID
function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('product-price');
    const totalEl = document.getElementById('product-total-price');
    const imgEl = document.getElementById('product-image');
    const descEl = document.getElementById('product-description');
    const buyBtn = document.getElementById('buy-button');
    const qtyInput = document.getElementById('quantity');
    const params = new URLSearchParams(location.search);
    const productId = params.get('id');

    function showNotFound() {
        if (nameEl) nameEl.textContent = 'Product not found';
        if (priceEl) priceEl.textContent = '';
        if (totalEl) totalEl.textContent = '';
        if (imgEl) imgEl.src = 'assets/images/insert_image.jpg';
        if (descEl) descEl.innerHTML = '<p>Sorry, the product could not be located.</p>';
        if (buyBtn) {
            buyBtn.setAttribute('aria-disabled', 'true');
            buyBtn.classList.add('disabled');
            buyBtn.href = '#';
            buyBtn.textContent = 'Unavailable';
        }
        if (qtyInput) qtyInput.disabled = true;
    }

    if (!productId) {
        showNotFound();
        return;
    }

    // helper
    function formatPrice(n) {
        return `£${Number(n || 0).toFixed(2)}`;
    }

    let unitPrice = 0;

    try {
        const resp = await fetch('data/products.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('Failed to load products.json');
        const data = await resp.json();
        const categories = Array.isArray(data.categories) ? data.categories : [];

        let found = null;
        let parentCategory = null;
        for (const cat of categories) {
            if (!Array.isArray(cat.products)) continue;
            const p = cat.products.find(x => String(x.id) === String(productId));
            if (p) {
                found = p;
                parentCategory = cat;
                break;
            }
        }

        if (!found) {
            showNotFound();
            return;
        }

        // unit price
        unitPrice = (found.price !== undefined && !isNaN(found.price)) ? Number(found.price) : 0;

        // Populate page
        if (nameEl) nameEl.textContent = found.name || 'Unnamed product';
        if (priceEl) priceEl.textContent = formatPrice(unitPrice);
        if (imgEl) imgEl.src = found.img || (parentCategory && parentCategory.img) || 'assets/images/insert_image.jpg';
        if (imgEl) imgEl.alt = found.name || 'Product image';

        // initial total
        function updateTotal() {
            const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
            const total = unitPrice * qty;
            if (totalEl) totalEl.textContent = `Total: ${formatPrice(total)}`;
        }

        if (qtyInput) {
            qtyInput.value = 1;
            qtyInput.min = 1;
            qtyInput.addEventListener('input', () => {
                // sanitize value
                if (qtyInput.value === '' || isNaN(qtyInput.value)) qtyInput.value = 1;
                if (parseInt(qtyInput.value, 10) < 1) qtyInput.value = 1;
                updateTotal();
            });
        }

        updateTotal();

        // Description
        const descriptionHtml = escapeHtml(found.description || parentCategory && parentCategory.description || 'No description available.');
        if (descEl) {
            const bodyOnly = `<p>${descriptionHtml}</p>`;
            if (descEl.querySelector('h2')) {
                const existingP = descEl.querySelectorAll('p');
                existingP.forEach(n => n.remove());
                descEl.insertAdjacentHTML('beforeend', bodyOnly);
            } else {
                descEl.innerHTML = `<h2>Description</h2>${bodyOnly}`;
            }
        }

        // Buy / Add to basket button
        if (buyBtn) {
            if (found.inStock === false) {
                buyBtn.setAttribute('aria-disabled', 'true');
                buyBtn.classList.add('disabled');
                buyBtn.href = '#';
                buyBtn.textContent = 'Out of stock';
                if (qtyInput) qtyInput.disabled = true;
            } else {
                buyBtn.removeAttribute('aria-disabled');
                buyBtn.classList.remove('disabled');
                buyBtn.dataset.productId = String(found.id);
                buyBtn.href = '#';
                buyBtn.textContent = 'Add to basket';
                buyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
                    if (window.Cart && typeof window.Cart.addToCart === 'function') {
                        window.Cart.addToCart(found.id, qty);
                    } else {
                        // fallback: dispatch event for other handlers / debugging
                        window.dispatchEvent(new CustomEvent('add-to-cart', { detail: { id: found.id, qty } }));
                    }
                    const old = buyBtn.textContent;
                    buyBtn.textContent = 'Added ✓';
                    setTimeout(() => { buyBtn.textContent = old; }, 900);
                });
            }
        }

        // Update document title
        if (found.name) document.title = `${found.name} — Coast to Coast`;

    } catch (err) {
        console.error('product.js error', err);
        showNotFound();
    }
});