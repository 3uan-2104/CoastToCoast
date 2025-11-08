// Load categories from data/products.json and render them into .catalog-container
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.catalog-container');
    if (!container) return;

    // capture the current last two catalog-button placeholders so we keep them at the end
    const initialButtons = Array.from(container.querySelectorAll('.catalog-button'));
    const staticPlaceholders = initialButtons.slice(-2); // may be empty if not present
    try {
        const resp = await fetch('data/products.json');
        if (!resp.ok) throw new Error('Failed to fetch products.json');
        const data = await resp.json();
        const categories = Array.isArray(data.categories) ? data.categories : [];

        if (categories.length === 0) return;

        const frag = document.createDocumentFragment();
        categories.forEach(cat => {
            const a = document.createElement('a');
            a.className = 'catalog-button';
            a.href = `category.html?id=${encodeURIComponent(cat.id)}`;
            a.setAttribute('aria-label', cat.name || 'Category');

            const imgSrc = cat.img || 'assets/images/insert_image.jpg';
            a.innerHTML = `
                <img src="${escapeHtml(imgSrc)}" class="catalog-img" alt="${escapeHtml(cat.name || '')}">
                <span class="catalog-text">${escapeHtml(cat.name || '')}</span>
            `;
            frag.appendChild(a);
        });

        if (staticPlaceholders.length > 0) {
            container.insertBefore(frag, staticPlaceholders[0]);
        } else {
            container.appendChild(frag);
        }
    } catch (err) {
        console.error('catalog load error:', err);
    }
});