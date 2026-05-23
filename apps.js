let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentMangaPageIdx = 0;
let currentPageState = "catalog";
let currentNavType = "all"; 

// 1. Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
window.onload = function() {
    fetchMangaData();
    initUploadFeature(); 
};

// 2. Mengambil Data Komik Mendalam dari File JSON
async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik...</p>";
    
    try {
        const response = await fetch('manga_data.json');
        if (response.ok) {
            const rawData = await response.json();
            
            // Berikan proteksi nilai default jika properti tertentu belum terdefinisi di JSON
            allMangaData = rawData.map(m => {
                let detectedType = "Manhwa"; 
                if (m.title.toLowerCase().includes("manga")) detectedType = "Manga";
                if (m.title.toLowerCase().includes("manhua")) detectedType = "Manhua";

                return {
                    ...m,
                    type: m.type || detectedType, 
                    status: m.status || "Ongoing",
                    genres: m.genres || ["Action"],
                    synopsis: m.synopsis || "Kisah seru petualangan yang tidak boleh Anda lewatkan begitu saja di platform ParagiMaca."
                };
            });
            
            displayCatalog(allMangaData);
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca file manga_data.json.</p>";
        }
    } catch (err) {
        console.error("Error file json:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog komik.</p>";
    }
}

// 3. Merender Grid Utama Katalog Komik ke Layar
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

// 4. Pengendali Filter Tab Navigasi Atas (Beranda, Manga, Manhua, Manhwa)
function filterByNav(type, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        document.getElementById('nav-all').classList.add('active');
    }

    currentNavType = type;
    executeCombinedFilter();
}

// 5. Menerapkan Filter Lanjutan dari Tombol Cari
function applyAdvancedFilters() {
    executeCombinedFilter();
}

// 6. Eksekusi Logika Filter Kombinasi dan Pengurutan Abjad
function executeCombinedFilter() {
    const sortVal = document.getElementById('filter-sort').value;
    const typeVal = document.getElementById('filter-type').value;
    const genreVal = document.getElementById('filter-genre').value;
    const statusVal = document.getElementById('filter-status').value;

    let filtered = [...allMangaData];

    if (currentNavType !== 'all') {
        filtered = filtered.filter(m => m.type === currentNavType);
    }

    if (typeVal !== 'all') {
        filtered = filtered.filter(m => m.type === typeVal);
    }
    if (statusVal !== 'all') {
        filtered = filtered.filter(m => m.status === statusVal);
    }
    if (genreVal !== 'all') {
        filtered = filtered.filter(m => m.genres && m.genres.includes(genreVal));
    }

    if (sortVal === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    displayCatalog(filtered);
}

// 7. Membuka dan Menyusun Tampilan Informasi Detail Komik
function openMangaDetail(manga) {
    currentSelectedManga = manga;
    navigateTo('detail');

    document.getElementById('detail-cover').src = manga.cover;
    document.getElementById('detail-title').innerText = manga.title;
    document.getElementById('detail-status-text').innerText = manga.status;
    document.getElementById('detail-synopsis-text').innerText = manga.synopsis || "Tidak ada sinopsis.";
    
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
    chapterContainer.innerHTML = "";
    
    if (manga.chapters && manga.chapters.length > 0) {
        manga.chapters.forEach((ch, idx) => {
            const chItem = document.createElement('div');
            chItem.className = "chapter-item";
            chItem.onclick = () => startReading(idx);
            chItem.innerHTML = `
                <span>Chapter ${ch.chapter_number}</span>
                <span style="color:#2563eb; font-weight: bold;">BACA</span>
            `;
            chapterContainer.appendChild(chItem);
        });
    } else {
        chapterContainer.innerHTML = `
            <div class="chapter-item" onclick="startReading(0)">
                <span>Chapter 01 (Mulai Baca)</span>
                <span style="color:#2563eb; font-weight: bold;">BACA</span>
            </div>
        `;
    }
}

// 8. Berpindah Ke Halaman Pembaca (Reader Viewport)
function startReading(idx) {
    currentMangaPageIdx = idx;
    navigateTo('reader');
    renderReaderContent();
}

// 9. Merender Gambar Isi Komik (Mendukung Scroll Webtoon & Klik Per Halaman)
function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = "";

    if (!currentSelectedManga) return;

    // Ambil data array halaman dari chapter terdaftar, jika kosong gunakan fallback gambar cover
    let pagesToRender = [];
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentMangaPageIdx]) {
        pagesToRender = currentSelectedManga.chapters[currentMangaPageIdx].pages || [];
    } else {
        pagesToRender = currentSelectedManga.pages || [currentSelectedManga.cover];
    }

    if (currentReaderMode === "webtoon") {
        navButtons.style.display = "none";
        const wrapper = document.createElement('div');
        wrapper.className = "webtoon-stream-clean";

        pagesToRender.forEach((p, index) => {
            const img = document.createElement('img');
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
        navButtons.style.display = "flex";
        document.getElementById('page-indicator').innerText = `${currentMangaPageIdx + 1} / ${pagesToRender.length}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = "manga-mode-layout";
        
        const img = document.createElement('img');
        img.src = pagesToRender[currentMangaPageIdx].trim();
        img.onclick = nextPage;
        wrapper.appendChild(img);
        reader.appendChild(wrapper);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 10. Kontrol Navigasi Halaman Pembaca (Ganti Mode, Maju, & Mundur)
function switchReaderMode(mode) { 
    currentReaderMode = mode; 
    currentMangaPageIdx = 0;
    renderReaderContent(); 
}

function nextPage() { 
    let pagesLength = 1;
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentMangaPageIdx]) {
        pagesLength = currentSelectedManga.chapters[currentMangaPageIdx].pages.length;
    } else if (currentSelectedManga.pages) {
        pagesLength = currentSelectedManga.pages.length;
    }

    if (currentMangaPageIdx < pagesLength - 1) { 
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

// 11. Router Pengendali Tampilan Status Blok Elemen Halaman HTML
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
        executeCombinedFilter(); 
    }
}

// 12. LOGIKA UTAMA BATCH UPLOAD KE IMGBB (Mendukung Ungguhan Skala Besar > 50 Gambar)
function initUploadFeature() {
    const uploadBtn = document.getElementById('upload-status-btn');
    const progressText = document.getElementById('upload-progress-text');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', async function() {
        // Ambil data nilai dari seluruh elemen input formulir
        const titleVal = document.getElementById('manga-title-input').value.trim();
        const chNumVal = document.getElementById('chapter-num-input').value.trim();
        const typeVal = document.getElementById('manga-type-input').value;
        const genreVal = document.getElementById('manga-genre-input').value;
        const synopsisVal = document.getElementById('manga-synopsis-input').value.trim();
        
        const coverFile = document.getElementById('imgbb-cover-input').files[0];
        const pageFiles = document.getElementById('imgbb-pages-input').files;

        // Validasi kelengkapan form sebelum mengirim ke API internet
        if (!titleVal || !chNumVal || !synopsisVal || !coverFile || pageFiles.length === 0) {
            alert("Harap lengkapi semua data teks, gambar cover, dan pilih gambar isi chapter!");
            return;
        }

        // Warning konfirmasi jika user mengunggah file dalam jumlah raksasa
        if (pageFiles.length > 50) {
            const yakin = confirm(`Anda mendeteksi pemilihan ${pageFiles.length} gambar. Proses pengiriman batch membutuhkan waktu beberapa saat. Tetap lanjutkan?`);
            if (!yakin) return;
        }

        const apiKey = '85e56ee4e01bcb8c426c77b81f29a68c'; 
        
        // Kunci interaksi tombol agar terhindar dari double klik/spam
        uploadBtn.innerText = "Mengunggah...";
        uploadBtn.style.backgroundColor = "#eab308";
        uploadBtn.disabled = true;
        progressText.style.color = "#eab308";

        try {
            // PROSES A: Unggah Sampul Depan Terlebih Dahulu
            progressText.innerText = "Status: Mengunggah gambar cover...";
            const coverFormData = new FormData();
            coverFormData.append('image', coverFile);
            
            const coverRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST', body: coverFormData
            });
            const coverData = await coverRes.json();
            if (!coverData.success) throw new Error("Gagal merespons server ImgBB saat unggah foto cover.");
            const uploadedCoverUrl = coverData.data.url;

            // PROSES B: Mengurutkan Nama File Agar Tidak Acak Saat Dirender di Halaman Baca
            const sortedFiles = Array.from(pageFiles).sort((a, b) => 
                a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'})
            );

            // PROSES C: Mengirim Antrean Gambar Isi Bab Satu Per Satu Secara Berurutan (Sequential Queue)
            let uploadedPageUrls = [];
            let currentCount = 1;
            const totalPages = sortedFiles.length;

            for (const singleFile of sortedFiles) {
                // Kalkulasi persentase realtime
                const percentComplete = Math.round((currentCount / totalPages) * 100);
                progressText.innerText = `Status: Memproses gambar (${currentCount}/${totalPages}) - ${percentComplete}%`;
                
                const pageFormData = new FormData();
                pageFormData.append('image', singleFile);

                try {
                    const pageRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST', body: pageFormData
                    });
                    const pageData = await pageRes.json();

                    if (pageData.success) {
                        uploadedPageUrls.push(pageData.data.url);
                    } else {
                        console.warn(`File ke-${currentCount} ditolak ImgBB, dilewati.`);
                    }
                } catch (err) {
                    console.error(`Masalah jaringan di file ke-${currentCount}, mencoba melompati...`);
                }
                currentCount++;
            }

            // Validasi akhir jika semua gambar isi bab gagal total terunggah
            if (uploadedPageUrls.length === 0) {
                throw new Error("Sistem mendeteksi kegagalan massal pengiriman isi halaman bab.");
            }

            // PROSES D: Konstruksi Penyusunan Struktur Skema Objek Komik Baru Lengkap
            const finalMangaObject = {
                "id": String(allMangaData.length + 1),
                "title": titleVal,
                "status": "Ongoing",
                "type": typeVal,
                "genres": [genreVal],
                "synopsis": synopsisVal,
                "cover": uploadedCoverUrl,
                "chapters": [
                    {
                        "chapter_number": chNumVal,
                        "pages": uploadedPageUrls
                    }
                ]
            };

            // Masukkan objek komik baru ke posisi baris katalog paling depan
            allMangaData.unshift(finalMangaObject);
            displayCatalog(allMangaData);
            
            // Tampilkan status sukses akhir
            progressText.innerText = "Status: Sukses Diterbitkan!";
            progressText.style.color = "#10b981";
            alert(`Sukses! Komik "${titleVal}" Bab ${chNumVal} dengan total ${uploadedPageUrls.length} halaman berhasil dimasukkan ke katalog.`);
            
            // Reset seluruh isi kolom formulir menjadi bersih kembali
            document.getElementById('manga-title-input').value = "";
            document.getElementById('chapter-num-input').value = "";
            document.getElementById('manga-synopsis-input').value = "";
            document.getElementById('imgbb-cover-input').value = "";
            document.getElementById('imgbb-pages-input').value = "";

        } catch (error) {
            console.error(error);
            alert(`Sistem Terhenti: ${error.message || "Gagal menghubungkan ke server ImgBB."}`);
            progressText.innerText = "Status: Gagal mengunggah.";
            progressText.style.color = "#ef4444";
        } finally {
            // Mengembalikan keadaan status tombol normal kembali
            uploadBtn.innerText = "Terbitkan Komik";
            uploadBtn.style.backgroundColor = "#10b981";
            uploadBtn.disabled = false;
        }
    });
}
