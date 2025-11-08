/* Set the width of the side navigation to 250px */
function openNav() {
  document.getElementById("sidenav").style.width = "250px";
}

/* Set the width of the side navigation to 0 */
function closeNav() {
  document.getElementById("sidenav").style.width = "0";
}

// Carousel functionality for img-tiles
document.addEventListener("DOMContentLoaded", function() {
    const tiles = document.querySelectorAll('.img-tile-wrapper .img-tile');
    const indicatorsContainer = document.querySelector('.img-tile-indicators');
    const wrapper = document.querySelector('.img-tile-wrapper');
    const interval = 10000;
    let current = 0;
    let bars = [];
    let timer = null;
    let startTime = null;
    let remaining = interval;
    let paused = false;

    // Create indicator bars
    if (tiles.length > 0 && indicatorsContainer) {
        for (let i = 0; i < tiles.length; i++) {
            const bar = document.createElement('div');
            bar.className = 'img-tile-indicator-bar';
            const fill = document.createElement('div');
            fill.className = 'img-tile-indicator-bar-fill';
            bar.appendChild(fill);
            indicatorsContainer.appendChild(bar);
            bars.push(fill);
        }
    }

    function animateBar(index, duration, fromPercent = 0) {
        bars.forEach((fill, i) => {
            fill.style.transition = 'none';
            if (i === index) {
                fill.style.width = `${fromPercent}%`;
                // Animate to 100% over duration
                setTimeout(() => {
                    fill.style.transition = `width ${duration}ms linear`;
                    fill.style.width = '100%';
                }, 20);
            } else {
                fill.style.width = '0%';
            }
        });
    }

    function showTile(index, duration) {
        tiles.forEach(tile => tile.classList.remove('active'));
        tiles[index].classList.add('active');
        animateBar(index, duration);
    }

    function startTimer() {
        startTime = Date.now();
        animateBar(current, remaining);
        timer = setTimeout(() => {
            tiles[current].classList.remove('active');
            current = (current + 1) % tiles.length;
            tiles[current].classList.add('active');
            remaining = interval;
            startTimer();
        }, remaining);
    }

    function pauseTimer() {
        if (!paused) {
            paused = true;
            clearTimeout(timer);
            let elapsed = Date.now() - startTime;
            remaining -= elapsed;
            // Calculate percent complete
            const percent = ((interval - remaining) / interval) * 100;
            bars[current].style.transition = 'none';
            bars[current].style.width = `${percent}%`;
        }
    }

    function resumeTimer() {
        if (paused) {
            paused = false;
            // Calculate percent complete
            const percent = ((interval - remaining) / interval) * 100;
            // Animate bar from current width to 100% over remaining time
            animateBar(current, remaining, percent);
            startTime = Date.now();
            timer = setTimeout(() => {
                tiles[current].classList.remove('active');
                current = (current + 1) % tiles.length;
                tiles[current].classList.add('active');
                remaining = interval;
                animateBar(current, interval, 0);
                startTimer();
            }, remaining);
        }
    }

    if (tiles.length > 0) {
        tiles[current].classList.add('active');
        animateBar(current, interval);
        startTimer();

        if (wrapper) {
            wrapper.addEventListener('mouseenter', pauseTimer);
            wrapper.addEventListener('mouseleave', resumeTimer);
        }
    }
});

// populate sidenav with categories from data/products.json
async function populateSidenavCategories() {
    const sidenav = document.getElementById('sidenav');
    if (!sidenav) return;

    try {
        const resp = await fetch('data/products.json');
        if (!resp.ok) throw new Error('Failed to fetch data/products.json');
        const data = await resp.json();
        const categories = Array.isArray(data.categories) ? data.categories : [];
        if (categories.length === 0) return;

        // separator + heading
        const sep = document.createElement('hr');
        sep.className = 'sidenav-sep';
        sidenav.appendChild(sep);

        const heading = document.createElement('div');
        heading.className = 'sidenav-section';
        heading.textContent = 'Product Categories';
        sidenav.appendChild(heading);

        categories.forEach(cat => {
            const a = document.createElement('a');
            a.href = `category.html?id=${encodeURIComponent(cat.id)}`;
            a.textContent = cat.name || cat.id || 'Category';
            a.addEventListener('click', () => {
                // ensure sidenav closes on navigation
                closeNav();
            });
            sidenav.appendChild(a);
        });
    } catch (err) {
        console.error('populateSidenavCategories error:', err);
    }
}

// run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    populateSidenavCategories();
});