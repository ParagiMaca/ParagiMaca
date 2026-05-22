let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentMangaPageIdx = 0;
let currentPageState = "catalog";
let currentNavType = "all"; // Menyimpan state tab aktif (all, Manga, Manhua, Manhwa)

window.onload = function() {
    fetchMangaData();
};

// 1. Mengambil data komik dari file JSON
async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik...</p>";
    
    try {
        const response = await fetch('manga_data.json');
        if (response.ok) {
            const rawData = await response.json();
            
            // SOLUSI FILTER: Berikan nilai default jika properti tidak ada di JSON Anda
            allMangaData = rawData.map(m => {
                // Contoh manipulasi dinamis berdasarkan judul jika di json belum ada key-nya
                let detectedType = "Manhwa"; 
                if (m.title.toLowerCase().includes("manga")) detectedType = "Manga";
                if (m.title.toLowerCase().includes("manhua")) detectedType = "Manhua";

                return {
                    ...m,
                    type: m.type || detectedType, 
                    status: m.status || "Ongoing",
                    genres: m.genres || ["Action", "Romance", "Urban"]
                };
            });
            
            // Tampilkan semua data di awal
            displayCatalog(allMangaData);
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca file manga_data.json.</p>";
        }
    } catch (err) {
        console.error("Error file json:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog komik.</p>";
    }
}

// 2. Menampilkan daftar komik ke dalam Grid
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
                <img src="${manga.cover}" alt="Cover" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618519764620-7403abdbfee9?w=300&q=80'">
            </div>
            <div class="manga-meta-title">${manga.title}</div>
        `;
        
        card.onclick = () => openMangaDetail(manga);
        container.appendChild(card);
    });
}

// 3. Navigasi Filter lewat Tab Menu Atas (Beranda, Manga, Manhua, Manhwa)
function filterByNav(type, element) {
    // Ubah kelas active pada tombol tab
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        // Jika dipicu via klik logo/tombol lain
        document.getElementById('nav-all').classList.add('active');
    }

    currentNavType = type;
    executeCombinedFilter();
}

// 4. Menjalankan penyaringan gabungan antara Tab Atas + Dropdown Box
function applyAdvancedFilters() {
    executeCombinedFilter();
}

function executeCombinedFilter() {
    const sortVal = document.getElementById('filter-sort').value;
    const typeVal = document.getElementById('filter-type').value;
    const genreVal = document.getElementById('filter-genre').value;
    const statusVal = document.getElementById('filter-status').value;

    let filtered = [...allMangaData];

    // Filter berdasarkan Tab Menu Atas
    if (currentNavType !== 'all') {
        filtered = filtered.filter(m => m.type === currentNavType);
    }

    // Filter berdasarkan Dropdown Box Selector
    if (typeVal !== 'all') {
        filtered = filtered.filter(m => m.type === typeVal);
    }
    if (statusVal !== 'all') {
        filtered = filtered.filter(m => m.status === statusVal);
    }
    if (genreVal !== 'all') {
        filtered = filtered.filter(m => m.genres && m.genres.includes(genreVal));
    }

    // Pengurutan data (Sorting)
    if (sortVal === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    displayCatalog(filtered);
}

// 5. Membuka Halaman Detail Komik (Sinopsis & Tombol Baca)
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
    chapterContainer.innerHTML = `
        <div class="chapter-item" onclick="startReading(0)">
            <span>Chapter 01</span>
            <span style="color:#2563eb; font-weight: bold;">BACA</span>
        </div>
    `;
}

// 6. Masuk ke halaman pembaca gambar komik
function startReading(idx) {
    currentMangaPageIdx = idx;
    navigateTo('reader');
    renderReaderContent();
}

// 7. Merender Gambar Komik dengan Optimasi Kecepatan (Lazy Loading)
function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = "";

    if (!currentSelectedManga) return;

    if (currentReaderMode === "webtoon") {
        navButtons.style.display = "none";
        const wrapper = document.createElement('div');
        wrapper.className = "webtoon-stream-clean";

        currentSelectedManga.pages.forEach((p, index) => {
            const img = document.createElement('img');
            
            // OPTIMASI SPEED: Gunakan loading="lazy" bawaan browser untuk menghemat kuota & loading instan
            img.loading = "lazy";
            img.src = p.trim();
            img.alt = `Halaman ${index + 1}`;
            img.onerror = function() {
                this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat';
            };
            wrapper.appendChild(img);
        });
        reader.appendChild(wrapper);
    } else {
        // Mode per halaman (Manga style)
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchReaderMode(mode) { 
    currentReaderMode = mode; 
    currentMangaPageIdx = 0;
    renderReaderContent(); 
}

function nextPage() { 
    if (currentMangaPageIdx < currentSelectedManga.pages.length - 1) { 
        currentMangaPageIdx++; 
        renderReaderContent(); 
    } 
}

function prevPage() { 
    if (currentMangaPageIdx > 0) { 
        currentMangaPageIdx--; 
        renderReaderContent(); 
    } 
}

// 8. Sistem Router Pengendali Tampilan Halaman
function navigateTo(state) {
    currentPageState = state;
    document.getElementById('catalog-page').style.display = state === 'catalog' ? 'block' : 'none';
    document.getElementById('detail-page').style.display = state === 'detail' ? 'block' : 'none';
    document.getElementById('reader-page').style.display = state === 'reader' ? 'block' : 'none';
    document.getElementById('back-btn').style.display = state === 'catalog' ? 'none' : 'block';
}

function handleBackAction() {
    if (currentPageState === 'reader') navigateTo('detail');
    else if (currentPageState === 'detail') {
        navigateTo('catalog');
        executeCombinedFilter(); // refresh grid katalog saat kembali
    }
}
