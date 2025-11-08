// Populate product.html from data/products.json using ?id=PRODUCT_ID

function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
    const nameEl = document.getElementById('product-name');
    const priceEl = document.getElementById('product-price');
    const imgEl = document.getElementById('product-image');
    const descEl = document.getElementById('product-description');
    const buyBtn = document.getElementById('buy-button');
    const params = new URLSearchParams(location.search);
    const productId = params.get('id');

    function showNotFound() {
        if (nameEl) nameEl.textContent = 'Product not found';
        if (priceEl) priceEl.textContent = '';
        if (imgEl) imgEl.src = 'assets/images/insert_image.jpg';
        if (descEl) descEl.innerHTML = '<p>Sorry, the product could not be located.</p>';
        if (buyBtn) {
            buyBtn.setAttribute('aria-disabled', 'true');
            buyBtn.classList.add('disabled');
            buyBtn.href = '#';
            buyBtn.textContent = 'Unavailable';
        }
    }

    if (!productId) {
        showNotFound();
        return;
    }

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

        // Populate page
        if (nameEl) nameEl.textContent = found.name || 'Unnamed product';
        if (priceEl) priceEl.textContent = (found.price !== undefined && !isNaN(found.price))
            ? `£${Number(found.price).toFixed(2)}`
            : '';
        if (imgEl) imgEl.src = found.img || (parentCategory && parentCategory.img) || 'assets/images/insert_image.jpg';
        if (imgEl) imgEl.alt = found.name || 'Product image';

        // Description: use product.description else category description else placeholder
        const descriptionHtml = escapeHtml(found.description || parentCategory && parentCategory.description || 'No description available.');
        if (descEl) {
            const bodyOnly = `<p>${descriptionHtml}</p>`;
            // If product-description element already contains an <h2>, replace/append paragraph only
            if (descEl.querySelector('h2')) {
                const existingP = descEl.querySelectorAll('p');
                existingP.forEach(n => n.remove());
                descEl.insertAdjacentHTML('beforeend', bodyOnly);
            } else {
                descEl.innerHTML = `<h2>Description</h2>${bodyOnly}`;
            }
        }

        // Buy button setup
        if (buyBtn) {
            if (found.inStock === false) {
                buyBtn.setAttribute('aria-disabled', 'true');
                buyBtn.classList.add('disabled');
                buyBtn.href = '#';
                buyBtn.textContent = 'Out of stock';
            } else {
                buyBtn.removeAttribute('aria-disabled');
                buyBtn.classList.remove('disabled');
                // set a data attribute and href for future API wiring
                buyBtn.dataset.productId = String(found.id);
                buyBtn.href = `#buy-${encodeURIComponent(found.id)}`;
                buyBtn.textContent = 'Buy now';
                buyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                }, { once: false });
            }
        }

        // Update document title
        if (found.name) document.title = `${found.name} — Coast to Coast`;

    } catch (err) {
        console.error('product.js error', err);
        showNotFound();
    }
});