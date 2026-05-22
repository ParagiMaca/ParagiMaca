let mangaList = [];

// Berjalan otomatis saat browser selesai memuat halaman website
window.onload = function() {
    fetchMangaData();
};

// 1. Mengambil data komik dari file manga_data.json yang ada di GitHub Anda
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

// 2. Menampilkan daftar komik (Rak Buku) di halaman utama
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
        
        card.onclick = () => openReader(manga);
        container.appendChild(card);
    });
}

// 3. Fungsi membaca Webtoon mengalir rapat ke bawah tanpa jeda spasi
function openReader(manga) {
    document.getElementById('manga-container').style.display = 'none';
    
    const reader = document.getElementById('reader-container');
    reader.innerHTML = ""; // Bersihkan lembaran lama
    reader.style.display = 'block';

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.style.display = 'block';

    const streamWrapper = document.createElement('div');
    streamWrapper.className = "webtoon-stream-clean";

    // Menyusun gambar secara berurutan rapat ke bawah
    manga.pages.forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl.trim();
        img.alt = "Halaman Manga";
        img.onerror = function() { 
            this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat'; 
        };
        streamWrapper.appendChild(img);
    });

    reader.appendChild(streamWrapper);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. Kembali ke halaman muka katalog depan
function backToCatalog() {
    document.getElementById('manga-container').style.display = 'grid';
    document.getElementById('reader-container').style.display = 'none';
    
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.style.display = 'none';
}
