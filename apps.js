let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentMangaPageIdx = 0;
let currentPageState = "catalog";

window.onload = function() {
    fetchMangaData();
};

async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik...</p>";
    
    try {
        const response = await fetch('manga_data.json');
        if (response.ok) {
            allMangaData = await response.json();
            // Menambahkan mock properti tipe & status jika tidak tersedia di json
            allMangaData = allMangaData.map(m => ({
                ...m,
                type: m.type || "Manhwa", 
                status: m.status || "Ongoing"
            }));
            displayCatalog(allMangaData);
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca database.</p>";
        }
    } catch (err) {
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog.</p>";
    }
}

function displayCatalog(list) {
    const container = document.getElementById('manga-container');
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p class='status-msg'>Tidak ada komik yang cocok dengan filter.</p>";
        return;
    }

    list.forEach(manga => {
        const card = document.createElement('div');
        card.className = "manga-card-box";
        card.innerHTML = `
            <div class="aspect-cover-holder">
                <img src="${manga.cover}" alt="Cover" onerror="this.src='https://via.placeholder.com/300x420?text=No+Cover'">
            </div>
            <div class="manga-meta-title">${manga.title}</div>
        `;
        card.onclick = () => openMangaDetail(manga);
        container.appendChild(card);
    });
}

// FUNGSI LOGIKA FILTER (Sesuai Opsi Pencarian dari Referensi Gambar)
function applyAdvancedFilters() {
    const sortVal = document.getElementById('filter-sort').value;
    const typeVal = document.getElementById('filter-type').value;
    const genreVal = document.getElementById('filter-genre').value;
    const statusVal = document.getElementById('filter-status').value;

    let filtered = [...allMangaData];

    if (typeVal !== 'all') filtered = filtered.filter(m => m.type === typeVal);
    if (statusVal !== 'all') filtered = filtered.filter(m => m.status === statusVal);
    if (genreVal !== 'all') filtered = filtered.filter(m => m.genres && m.genres.includes(genreVal));

    if (sortVal === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    displayCatalog(filtered);
}

// Filter Cepat melalui Nav Bar Atas
function filterByNav(type) {
    // Ubah status kelas active link
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    if(type === 'all') {
        displayCatalog(allMangaData);
    } else {
        const filtered = allMangaData.filter(m => m.type === type);
        displayCatalog(filtered);
    }
}

function openMangaDetail(manga) {
    currentSelectedManga = manga;
    navigateTo('detail');

    document.getElementById('detail-cover').src = manga.cover;
    document.getElementById('detail-title').innerText = manga.title;
    document.getElementById('detail-status-text').innerText = manga.status;
    
    const genreContainer = document.getElementById('detail-genres-container');
    genreContainer.innerHTML = "";
    if (manga.genres) {
        manga.genres.forEach(g => {
            const span = document.createElement('span');
            span.className = "genre-tag";
            span.innerText = g;
            genreContainer.appendChild(span);
        });
    }

    const chapterContainer = document.getElementById('chapter-list-container');
    chapterContainer.innerHTML = `<div class="chapter-item" onclick="startReading(0)">
        <span>Chapter 01</span><span style="color:#2563eb">Baca</span>
    </div>`;
}

function startReading(idx) {
    currentMangaPageIdx = idx;
    navigateTo('reader');
    renderReaderContent();
}

function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = "";

    if (!currentSelectedManga) return;

    if (currentReaderMode === "webtoon") {
        navButtons.style.display = "none";
        const wrapper = document.createElement('div');
        wrapper.className = "webtoon-stream-clean";
        currentSelectedManga.pages.forEach(p => {
            const img = document.createElement('img');
            img.src = p.trim();
            wrapper.appendChild(img);
        });
        reader.appendChild(wrapper);
    } else {
        navButtons.style.display = "flex";
        document.getElementById('page-indicator').innerText = `${currentMangaPageIdx + 1} / ${currentSelectedManga.pages.length}`;
        const wrapper = document.createElement('div');
        wrapper.className = "manga-mode-layout";
        const img = document.createElement('img');
        img.src = currentSelectedManga.pages[currentMangaPageIdx].trim();
        img.onclick = nextPage;
        wrapper.appendChild(img);
        reader.appendChild(wrapper);
    }
}

function switchReaderMode(mode) { currentReaderMode = mode; renderReaderContent(); }
function nextPage() { if (currentMangaPageIdx < currentSelectedManga.pages.length - 1) { currentMangaPageIdx++; renderReaderContent(); } }
function prevPage() { if (currentMangaPageIdx > 0) { currentMangaPageIdx--; renderReaderContent(); } }

function navigateTo(state) {
    currentPageState = state;
    document.getElementById('catalog-page').style.display = state === 'catalog' ? 'block' : 'none';
    document.getElementById('detail-page').style.display = state === 'detail' ? 'block' : 'none';
    document.getElementById('reader-page').style.display = state === 'reader' ? 'block' : 'none';
    document.getElementById('back-btn').style.display = state === 'catalog' ? 'none' : 'block';
}

function handleBackAction() {
    if (currentPageState === 'reader') navigateTo('detail');
    else if (currentPageState === 'detail') navigateTo('catalog');
}
