let mangaList = [];

window.onload = function() {
    fetchMangaData();
};

// Mengambil database JSON lokal Anda
async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    try {
        const response = await fetch('manga_data.json');
        mangaList = await response.json();
        displayCatalog(mangaList);
    } catch (err) {
        container.innerHTML = "<p class='status-msg'>Gagal memuat database JSON.</p>";
    }
}

// Menampilkan Rak Buku / Katalog Komik
function displayCatalog(list) {
    const container = document.getElementById('manga-container');
    container.innerHTML = "";

    list.forEach(manga => {
        const card = document.createElement('div');
        card.className = "manga-card-box";
        card.innerHTML = `
            <div class="aspect-cover-holder">
                <img src="${manga.cover}" alt="Cover">
            </div>
            <div class="manga-meta-title">${manga.title}</div>
        `;
        card.onclick = () => openReader(manga);
        container.appendChild(card);
    });
}

// Membuka lembaran bacaan Webtoon Rapat
function openReader(manga) {
    document.getElementById('manga-container').style.display = 'none';
    document.getElementById('reader-container').style.display = 'block';
    document.getElementById('back-btn').style.display = 'block';

    const reader = document.getElementById('reader-container');
    reader.innerHTML = "";

    const streamWrapper = document.createElement('div');
    streamWrapper.className = "webtoon-stream-clean";

    // Menyusun elemen gambar secara berurutan langsung ke dalam DOM
    manga.pages.forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = "Halaman Komik";
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat';
        };
        streamWrapper.appendChild(img);
    });

    reader.appendChild(streamWrapper);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToCatalog() {
    document.getElementById('manga-container').style.display = 'grid';
    document.getElementById('reader-container').style.display = 'none';
    document.getElementById('back-btn').style.display = 'none';
}
