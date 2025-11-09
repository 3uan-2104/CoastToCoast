const CART_KEY = 'coast_cart_v1';

function _loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
        return [];
    }
}

function _saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

/**
 * Add product to cart (merge if exists)
 * @param {string} productId
 * @param {number} qty
 * @returns {Array} cart items
 */
function addToCart(productId, qty = 1) {
    qty = Math.max(1, Number(qty) || 1);
    const items = _loadCart();
    const existing = items.find(i => String(i.id) === String(productId));
    if (existing) {
        existing.qty = existing.qty + qty;
    } else {
        items.push({ id: String(productId), qty });
    }
    _saveCart(items);
    window.dispatchEvent(new CustomEvent('cartupdated', { detail: { cart: items } }));
    return items;
}

function updateCartItem(productId, qty) {
    qty = Number(qty);
    const items = _loadCart();
    const idx = items.findIndex(i => String(i.id) === String(productId));
    if (idx === -1) return items;
    if (qty <= 0) items.splice(idx, 1);
    else items[idx].qty = Math.max(1, qty);
    _saveCart(items);
    window.dispatchEvent(new CustomEvent('cartupdated', { detail: { cart: items } }));
    return items;
}

function removeFromCart(productId) {
    const items = _loadCart().filter(i => String(i.id) !== String(productId));
    _saveCart(items);
    window.dispatchEvent(new CustomEvent('cartupdated', { detail: { cart: items } }));
    return items;
}

function clearCart() {
    _saveCart([]);
    window.dispatchEvent(new CustomEvent('cartupdated', { detail: { cart: [] } }));
}

function getCart() {
    return _loadCart();
}

function getCartTotalItems() {
    return _loadCart().reduce((s, i) => s + (Number(i.qty) || 0), 0);
}

// expose API
window.Cart = {
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCart,
    getCartTotalItems
};
// convenience global
window.addToCart = addToCart;