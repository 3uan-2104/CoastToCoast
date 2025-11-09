// Load a category from data/products.json and render it into .shop-panel-container

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.shop-panel-container');
    if (!container) return;

    try {
        const resp = await fetch('data/products.json');
        if (!resp.ok) throw new Error('Failed to fetch products.json');
        const data = await resp.json();

        const params = new URLSearchParams(location.search);
        const categoryId = params.get('id') || (data.categories && data.categories[0] && data.categories[0].id);
        const category = (data.categories || []).find(c => c.id === categoryId) || (data.categories && data.categories[0]);

        if (!category) {
            container.innerHTML = '<p class="shop-panel-error">Category not found.</p>';
            return;
        }

        container.innerHTML = '';
        const header = document.createElement('header');
        header.className = 'shop-panel-header';
        header.textContent = category.name;
        container.appendChild(header);

        (category.products || []).forEach(prod => {
            const tile = document.createElement('a');
            tile.className = 'shop-panel-tile';
            tile.href = `product.html?id=${encodeURIComponent(prod.id)}`;
            tile.setAttribute('aria-label', prod.name || 'Product');

            // use a consistent image property (prod.img or prod.image in your JSON)
            const imgSrc = prod.img || prod.image || 'assets/images/insert_image.jpg';

            // define price once and assign based on stock
            let priceText = '';
            if (prod.inStock === false) {
                priceText = '<b>Out of Stock</b>';
            } else {
                priceText = (prod.price !== undefined && !isNaN(prod.price))
                    ? `£${Number(prod.price).toFixed(2)}`
                    : '';
            }

            tile.innerHTML = `
                <img class="shop-panel-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(prod.name || 'Product')}">
                <div class="shop-panel-name">${escapeHtml(prod.name || '')}</div>
                <div class="shop-panel-price">${priceText}</div>
            `;
            container.appendChild(tile);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="shop-panel-error">Failed to load products.</p>';
    }
});