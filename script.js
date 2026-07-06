const API_KEY = '6c2d6bbc08a413c299d58e29e0a42f4c';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w300';
const IMG_L = 'https://image.tmdb.org/t/p/w500';
const colorThief = new ColorThief();

let currentGenre = '';
let currentType = 'popular';
let minRating = 0;
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

const moviesDiv = document.getElementById('movies');
const searchInput = document.getElementById('searchInput');
const genreBtns = document.querySelectorAll('.genre-btn');
const tabs = document.querySelectorAll('.tab');
const ratingFilter = document.getElementById('ratingFilter');
const ratingValue = document.getElementById('ratingValue');
const popupContainer = document.getElementById('popup-container');
const watchlistPanel = document.getElementById('watchlistPanel');
const watchlistItems = document.getElementById('watchlistItems');

async function fetchMovies(query = '') {
  let url;
  if (query) {
    url = `${BASE}/search/movie?api_key=${API_KEY}&query=${query}`;
  } else if (currentGenre) {
    url = `${BASE}/discover/movie?api_key=${API_KEY}&with_genres=${currentGenre}&sort_by=popularity.desc`;
  } else if (currentType === 'trending') {
    url = `${BASE}/trending/movie/week?api_key=${API_KEY}`;
  } else if (currentType === 'top_rated') {
    url = `${BASE}/movie/top_rated?api_key=${API_KEY}`;
  } else {
    url = `${BASE}/movie/popular?api_key=${API_KEY}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  const filtered = data.results.filter(m => m.vote_average >= minRating);
  displayMovies(filtered);
}

function displayMovies(movies) {
  moviesDiv.innerHTML = '';
  movies.forEach(movie => {
    if (!movie.poster_path) return;
    const inWL = watchlist.some(w => w.id === movie.id);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${inWL ? '<span class="watchlisted">♥</span>' : ''}
      <img src="${IMG}${movie.poster_path}" alt="${movie.title}"/>
      <div class="card-info">
        <h3>${movie.title}</h3>
        <div class="card-meta">
          <span>${movie.release_date?.split('-')[0] || 'N/A'}</span>
          <span class="rating">⭐ ${movie.vote_average?.toFixed(1)}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => showPopup(movie));
    moviesDiv.appendChild(card);
  });
}

function showPopup(movie) {
  const inWL = watchlist.some(w => w.id === movie.id);
  popupContainer.innerHTML = `
    <div class="popup-overlay" id="overlay">
      <div class="popup" id="popupBox">
        <button class="close-btn" id="closeBtn">✕</button>
        <img id="popupImg" src="${IMG_L}${movie.poster_path}" alt="${movie.title}" crossorigin="anonymous"/>
        <div class="popup-info">
          <h2>${movie.title}</h2>
          <div class="popup-meta">
            ⭐ ${movie.vote_average?.toFixed(1)} &nbsp;·&nbsp;
            ${movie.release_date?.split('-')[0] || 'N/A'} &nbsp;·&nbsp;
            ${movie.original_language?.toUpperCase()}
          </div>
          <p>${movie.overview || 'No description available.'}</p>
          <div class="popup-actions">
            <button class="add-watchlist-btn" id="wlBtn">
              ${inWL ? '✓ In Watchlist' : '+ Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Color extraction from poster
  const img = document.getElementById('popupImg');
  const popupBox = document.getElementById('popupBox');
  img.addEventListener('load', () => {
    try {
      const [r, g, b] = colorThief.getColor(img);
      popupBox.style.background = `linear-gradient(135deg, rgb(${r},${g},${b}) 0%, #110d0b 60%)`;
    } catch(e) {}
  });
  if (img.complete) img.dispatchEvent(new Event('load'));

  document.getElementById('closeBtn').addEventListener('click', () => popupContainer.innerHTML = '');
  document.getElementById('overlay').addEventListener('click', e => {
    if (e.target.id === 'overlay') popupContainer.innerHTML = '';
  });
  document.getElementById('wlBtn').addEventListener('click', () => toggleWatchlist(movie));
}

function toggleWatchlist(movie) {
  const idx = watchlist.findIndex(w => w.id === movie.id);
  if (idx === -1) {
    watchlist.push({ id: movie.id, title: movie.title, poster: movie.poster_path, rating: movie.vote_average, year: movie.release_date?.split('-')[0] });
  } else {
    watchlist.splice(idx, 1);
  }
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
  popupContainer.innerHTML = '';
  showPopup(movie);
  fetchMovies();
  renderWatchlist();
}

function renderWatchlist() {
  if (watchlist.length === 0) {
    watchlistItems.innerHTML = '<p class="wl-empty">No movies saved yet.<br/>Click a movie and add it!</p>';
    return;
  }
  watchlistItems.innerHTML = watchlist.map(m => `
    <div class="wl-item">
      <img src="${IMG}${m.poster}" alt="${m.title}"/>
      <div>
        <h4>${m.title}</h4>
        <span>${m.year} · ⭐ ${m.rating?.toFixed(1)}</span>
      </div>
      <button class="wl-remove" data-id="${m.id}">✕</button>
    </div>
  `).join('');
  watchlistItems.querySelectorAll('.wl-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      watchlist = watchlist.filter(w => w.id != btn.dataset.id);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      renderWatchlist();
      fetchMovies();
    });
  });
}

// Tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    currentGenre = '';
    genreBtns.forEach(b => b.classList.remove('active'));
    genreBtns[0].classList.add('active');
    fetchMovies();
  });
});

// Genres
genreBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    genreBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentGenre = btn.dataset.id;
    fetchMovies();
  });
});

// Rating filter
ratingFilter.addEventListener('input', () => {
  minRating = parseFloat(ratingFilter.value);
  ratingValue.textContent = minRating + '+';
  fetchMovies();
});

// Search
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  if (q.length > 2) fetchMovies(q);
  else fetchMovies();
});

// Watchlist panel
document.getElementById('watchlistToggle').addEventListener('click', () => {
  watchlistPanel.classList.toggle('open');
  renderWatchlist();
});
document.getElementById('panelClose').addEventListener('click', () => {
  watchlistPanel.classList.remove('open');
});

fetchMovies();
renderWatchlist();