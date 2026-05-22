let mangaList = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon"; // Default mode gulir
let currentMangaPageIdx = 0; // Index halaman aktif untuk mode Manga

// State Navigasi
let currentPageState = "catalog"; // catalog | detail | reader

window.onload = function() {
    fetchMangaData();
};

// 1. Mengambil data komik
async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik...</p>";
    
    try {
        const response = await fetch('manga_data.json');
        if (response.ok) {
            mangaList = await response.json();
            displayCatalog(mangaList);
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca file manga_data.json.</p>";
        }
    } catch (err) {
        console.error("Eror file json:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog komik.</p>";
    }
}

// 2. Menampilkan katalog utama di beranda
function displayCatalog(list) {
    const container = document.getElementById('manga-container');
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p class='status-msg'>Belum ada koleksi komik.</p>";
        return;
    }

    list.forEach(manga => {
        const card = document.createElement('div');
        card.className = "manga-card-box";
        card.innerHTML = `
            <div class="aspect-cover-holder">
                <img src="${manga.cover}" alt="Cover" onerror="this.src='https://via.placeholder.com/300x420?text=Cover+Error'">
            </div>
            <div class="manga-meta-title">${manga.title}</div>
        `;
        
        card.onclick = () => openMangaDetail(manga);
        container.appendChild(card);
    });
}

// Shortcut klik tombol Hero Banner langsung ke Detail Komik berdasarkan ID
function openMangaDetailDirect(id) {
    const targetManga = mangaList.find(m => m.id === id);
    if(targetManga) openMangaDetail(targetManga);
}

// 3. Membuka Halaman Detail Komik
function openMangaDetail(manga) {
    currentSelectedManga = manga;
    navigateTo('detail');

    // Mengisi Metadata Info Komik
    document.getElementById('detail-cover').src = manga.cover;
    document.getElementById('detail-title').innerText = manga.title;
    
    // Render Genre Tags
    const genreContainer = document.getElementById('detail-genres-container');
    genreContainer.innerHTML = "";
    if (manga.genres) {
        manga.genres.forEach(genre => {
            const span = document.createElement('span');
            span.className = "genre-tag";
            span.innerText = genre;
            genreContainer.appendChild(span);
        });
    }

    // Render Daftar Chapter (Simulasi statis berbasis data objek komik tunggal)
    const chapterContainer = document.getElementById('chapter-list-container');
    chapterContainer.innerHTML = "";
    
    const chapterItem = document.createElement('div');
    chapterItem.className = "chapter-item";
    chapterItem.innerHTML = `
        <span>Chapter 01 (Rilisan Utama)</span>
        <span style="color: #a1a1aa; font-size: 0.85rem;">Terbaru</span>
    `;
    chapterItem.onclick = () => startReading(0);
    chapterContainer.appendChild(chapterItem);
}

// 4. Inisiasi lembaran pembaca komik
function startReading(startingPageIdx = 0) {
    currentMangaPageIdx = startingPageIdx;
    navigateTo('reader');
    renderReaderContent();
}

// 5. Merender gambar komik sesuai mode pembaca yang dipilih
function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = ""; // Clear

    if (!currentSelectedManga || !currentSelectedManga.pages) return;

    if (currentReaderMode === "webtoon") {
        // Mode Mengalir Tanpa Jeda Spasi Rapat ke Bawah
        navButtons.style.display = "none";
        
        const streamWrapper = document.createElement('div');
        streamWrapper.className = "webtoon-stream-clean";

        currentSelectedManga.pages.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = imgUrl.trim();
            img.alt = "Lembaran Webtoon";
            img.onerror = function() { 
                this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat'; 
            };
            streamWrapper.appendChild(img);
        });
        reader.appendChild(streamWrapper);
    } else {
        // Mode Manga Tradisional (Per halaman klik Kanan/Kiri)
        navButtons.style.display = "flex";
        document.getElementById('page-indicator').innerText = `${currentMangaPageIdx + 1} / ${currentSelectedManga.pages.length}`;

        const mangaWrapper = document.createElement('div');
        mangaWrapper.className = "manga-mode-layout";

        const img = document.createElement('img');
        img.src = currentSelectedManga.pages[currentMangaPageIdx].trim();
        img.alt = `Manga Page ${currentMangaPageIdx + 1}`;
        img.onclick = () => nextPage(); // Klik gambar untuk lanjut
        img.onerror = function() { 
            this.src = 'https://via.placeholder.com/600x800?text=Halaman+Gagal+Dimuat'; 
        };

        mangaWrapper.appendChild(img);
        reader.appendChild(mangaWrapper);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mengganti Mode Pembaca
function switchReaderMode(mode) {
    currentReaderMode = mode;
    currentMangaPageIdx = 0; // reset page jika ganti mode
    renderReaderContent();
}

// Navigasi Per Halaman (Manga Mode)
function nextPage() {
    if (currentSelectedManga && currentMangaPageIdx < currentSelectedManga.pages.length - 1) {
        currentMangaPageIdx++;
        renderReaderContent();
    } else if (currentMangaPageIdx === currentSelectedManga.pages.length - 1) {
        alert("Anda telah mencapai halaman terakhir chapter ini.");
    }
}

function prevPage() {
    if (currentMangaPageIdx > 0) {
        currentMangaPageIdx--;
        renderReaderContent();
    }
}

// 6. Sistem Manajemen Navigasi Router Sederhana
function navigateTo(targetState) {
    currentPageState = targetState;
    
    // Definisikan DOM Elemen Kontainer Page
    const catalogPage = document.getElementById('catalog-page');
    const detailPage = document.getElementById('detail-page');
    const readerPage = document.getElementById('reader-page');
    const backBtn = document.getElementById('back-btn');

    // Sembunyikan Semua Dahulu
    catalogPage.style.display = "none";
    detailPage.style.display = "none";
    readerPage.style.display = "none";

    if (targetState === 'catalog') {
        catalogPage.style.display = "block";
        backBtn.style.display = "none";
    } else if (targetState === 'detail') {
        detailPage.style.display = "block";
        backBtn.style.display = "block";
    } else if (targetState === 'reader') {
        readerPage.style.display = "block";
        backBtn.style.display = "block";
    }
}

// Menangani Aksi Tombol Kembali di Header
function handleBackAction() {
    if (currentPageState === 'reader') {
        navigateTo('detail');
    } else if (currentPageState === 'detail') {
        navigateTo('catalog');
    }
}

// Fallback untuk klik judul logo teks utama
function backToCatalog() {
    navigateTo('catalog');
}
