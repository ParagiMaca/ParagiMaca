let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentMangaPageIdx = 0; // Menyimpan indeks array chapter yang sedang dibaca
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
            
            // Memberikan proteksi nilai default jika properti tertentu belum terdefinisi di JSON
            allMangaData = rawData.map(m => {
                let detectedType = "Manhwa"; 
                if (m.title.toLowerCase().includes("manga")) detectedType = "Manga";
                if (m.title.toLowerCase().includes("manhua")) detectedType = "Manhua";

                return {
                    ...m,
                    type: m.type || detectedType, 
                    status: m.status || "Ongoing",
                    genres: m.genres || ["Action"],
                    synopsis: m.synopsis || "Kisah seru petualangan yang tidak boleh Anda lewatkan begitu saja di platform ParagiMaca.",
                    chapters: m.chapters || []
                };
            });
            
            displayCatalog(allMangaData);
            populateMangaDropdown(); // Mengisi list pilihan komik lama ke form update
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca file manga_data.json.</p>";
        }
    } catch (err) {
        console.error("Error file json:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog komik.</p>";
    }
}

// 3. Memasukkan Judul Komik yang Sudah Ada ke Dropdown Form Update secara Otomatis
function populateMangaDropdown() {
    const selectEl = document.getElementById('existing-manga-select');
    if (!selectEl) return;
    selectEl.innerHTML = "";
    
    allMangaData.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.title;
        selectEl.appendChild(opt);
    });
}

// 4. Mengatur Animasi/Visibilitas Form Berdasarkan Mode Tindakan (Buat Baru vs Update)
function toggleUploadMode(mode) {
    const isUpdate = (mode === 'update');
    document.getElementById('existing-manga-wrapper').style.display = isUpdate ? 'block' : 'none';
    document.getElementById('meta-manga-fields').style.display = isUpdate ? 'none' : 'grid';
    document.getElementById('synopsis-wrapper').style.display = isUpdate ? 'none' : 'block';
    document.getElementById('cover-picker-wrapper').style.display = isUpdate ? 'none' : 'block';
}

// 5. Merender Grid Utama Katalog Komik ke Layar Beranda
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

// 6. Pengendali Filter Tab Navigasi Atas (Beranda, Manga, Manhua, Manhwa)
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

// 7. Menerapkan Filter Lanjutan dari Tombol Cari
function applyAdvancedFilters() {
    executeCombinedFilter();
}

// 8. Eksekusi Logika Filter Kombinasi dan Pengurutan Judul
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

// 9. Membuka Tampilan Informasi Detail Komik & Daftar Bab Secara Dinamis
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
    
    // Perbaikan: Merender daftar bab berdasarkan indeks asli dari file JSON
    if (manga.chapters && manga.chapters.length > 0) {
        manga.chapters.forEach((ch, idx) => {
            const chItem = document.createElement('div');
            chItem.className = "chapter-item";
            // idx dikirim utuh agar startReading membuka data bab yang tepat
            chItem.onclick = () => startReading(idx);
            chItem.innerHTML = `
                <span>Chapter ${ch.chapter_number}</span>
                <span style="color:#2563eb; font-weight: bold;">BACA</span>
            `;
            chapterContainer.appendChild(chItem);
        });
    } else {
        chapterContainer.innerHTML = `<p class='status-msg' style='padding:10px;'>Belum ada chapter terunggah.</p>`;
    }
}

// 10. Masuk Ke Halaman Ruang Baca Pembaca (Reader Viewport)
function startReading(idx) {
    currentMangaPageIdx = idx;
    navigateTo('reader');
    renderReaderContent();
}

// 11. Merender Gambar Isi Komik & Menampilkan Tombol Bab Otomatis di Akhir Halaman
function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = "";

    if (!currentSelectedManga) return;

    // Ambil data array halaman secara akurat dari dalam objek bab yang aktif
    let pagesToRender = [];
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentMangaPageIdx]) {
        pagesToRender = currentSelectedManga.chapters[currentMangaPageIdx].pages || [];
    } else {
        // Fallback pengaman jika array halaman kosong
        pagesToRender = [currentSelectedManga.cover];
    }

    if (currentReaderMode === "webtoon") {
        navButtons.style.display = "none";
        const wrapper = document.createElement('div');
        wrapper.className = "webtoon-stream-clean";

        // Render aliran gambar vertikal
        pagesToRender.forEach((p, index) => {
            const img = document.createElement('img');
            img.loading = "lazy";
            img.src = p.trim();
            img.alt = `Halaman ${index + 1}`;
            img.onerror = function() { this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat'; };
            wrapper.appendChild(img);
        });
        reader.appendChild(wrapper);

        // ==========================================================================
        // TOMBOL NAVIGASI CHAPTER DI UJUNG BAWAH SCROLL WEBTOON
        // ==========================================================================
        const bottomNavWrapper = document.createElement('div');
        bottomNavWrapper.style.cssText = "padding: 30px 12px; display: flex; flex-direction: column; gap: 12px; align-items: center; background: #0b0b0d;";

        // Karena data chapter baru di-unshift ke indeks 0, maka:
        // - Bab berikutnya (angka lebih tinggi) ada di urutan indeks SEBELUMNYA (currentMangaPageIdx - 1)
        // - Bab sebelumnya (angka lebih kecil) ada di urutan indeks SESUDAHNYA (currentMangaPageIdx + 1)
        const hasNextChapter = currentMangaPageIdx > 0;
        const hasPrevChapter = currentSelectedManga.chapters && currentMangaPageIdx < currentSelectedManga.chapters.length - 1;

        if (hasNextChapter) {
            const nextChObj = currentSelectedManga.chapters[currentMangaPageIdx - 1];
            const nextBtn = document.createElement('button');
            nextBtn.className = "primary-btn";
            nextBtn.style.cssText = "background: #2563eb; width: 100%; max-width: 400px; padding: 12px; font-size: 0.9rem; border-radius: 6px; box-shadow: 0 4px 12px rgba(37,99,235,0.2); cursor: pointer;";
            nextBtn.innerText = `Selanjutnya: Chapter ${nextChObj.chapter_number} ➡`;
            nextBtn.onclick = () => navigateToNextChapter(currentMangaPageIdx - 1);
            bottomNavWrapper.appendChild(nextBtn);
        } else {
            const infoText = document.createElement('p');
            infoText.style.cssText = "color: #a1a1aa; font-size: 0.82rem; font-style: italic; margin-bottom: 5px;";
            infoText.innerText = "Anda telah membaca chapter terbaru dari komik ini.";
            bottomNavWrapper.appendChild(infoText);
        }

        if (hasPrevChapter) {
            const prevChObj = currentSelectedManga.chapters[currentMangaPageIdx + 1];
            const prevBtn = document.createElement('button');
            prevBtn.style.cssText = "background: transparent; border: 1px solid #27272a; color: #a1a1aa; width: 100%; max-width: 400px; padding: 8px; font-size: 0.8rem; border-radius: 6px; cursor: pointer;";
            prevBtn.innerText = `⬅ Mundur ke Chapter ${prevChObj.chapter_number}`;
            prevBtn.onclick = () => navigateToNextChapter(currentMangaPageIdx + 1);
            bottomNavWrapper.appendChild(prevBtn);
        }

        reader.appendChild(bottomNavWrapper);

    } else {
        // Mode Per Halaman (Manga Tradisional Klik Kanan/Kiri)
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
    
    // Geser kembali layar secara otomatis ke koordinat paling atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 11b. Eksekutor Perpindahan Bab Tanpa Reload Page
function navigateToNextChapter(targetChapterIdx) {
    currentMangaPageIdx = targetChapterIdx;
    renderReaderContent();
}

// 12. Kontrol Navigasi Halaman Pembaca Khusus Mode Per Halaman (Manga Style)
function switchReaderMode(mode) { 
    currentReaderMode = mode; 
    currentMangaPageIdx = 0;
    renderReaderContent(); 
}

function nextPage() { 
    let maxPages = 0;
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentMangaPageIdx]) {
        maxPages = currentSelectedManga.chapters[currentMangaPageIdx].pages.length;
    }
    if (currentMangaPageIdx < maxPages - 1) { 
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

// 13. Router Pengendali Blok Tampilan CSS Halaman Platform HTML
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

// 14. LOGIKA ENGINE UPLOAD KE IMGBB (DUAL MODE + CHRONOLOGICAL PEN-SEQUENTIAL)
function initUploadFeature() {
    const uploadBtn = document.getElementById('upload-status-btn');
    const progressText = document.getElementById('upload-progress-text');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', async function() {
        const actionType = document.getElementById('upload-action-type').value;
        const chNumVal = document.getElementById('chapter-num-input').value.trim();
        const pageFiles = document.getElementById('imgbb-pages-input').files;

        if (!chNumVal || pageFiles.length === 0) {
            alert("Harap isi nomor chapter baru dan pilih file gambar isi bab!");
            return;
        }

        // Warning konfirmasi jika mendeteksi unggahan dalam jumlah raksasa (>50 lembar)
        if (pageFiles.length > 50) {
            const yakin = confirm(`Anda mendeteksi pemilihan ${pageFiles.length} gambar. Proses pengiriman batch membutuhkan waktu beberapa saat. Tetap lanjutkan?`);
            if (!yakin) return;
        }

        const apiKey = '85e56ee4e01bcb8c426c77b81f29a68c'; 
        uploadBtn.innerText = "Mengunggah...";
        uploadBtn.disabled = true;
        progressText.style.color = "#eab308";

        try {
            let uploadedCoverUrl = "";
            let targetManga = null;

            if (actionType === 'new') {
                // JALUR PROSES KOMIK BARU SEGARR
                const titleVal = document.getElementById('manga-title-input').value.trim();
                const synopsisVal = document.getElementById('manga-synopsis-input').value.trim();
                const coverFile = document.getElementById('imgbb-cover-input').files[0];

                if (!titleVal || !synopsisVal || !coverFile) {
                    throw new Error("Lengkapi data judul, sinopsis, dan gambar cover komik baru!");
                }

                progressText.innerText = "Status: Mengunggah cover komik...";
                const coverFormData = new FormData();
                coverFormData.append('image', coverFile);
                const coverRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: coverFormData });
                const coverData = await coverRes.json();
                if (!coverData.success) throw new Error("Gagal mengunggah foto cover ke server.");
                uploadedCoverUrl = coverData.data.url;
            } else {
                // JALUR PROSES UPDATE CHAPTER KOMIK LAWAS
                const selectedId = document.getElementById('existing-manga-select').value;
                targetManga = allMangaData.find(m => m.id === selectedId);
                if (!targetManga) throw new Error("Komik target tidak ditemukan!");
            }

            // PROSES URUT BATCH FILE BERDASARKAN ALFANUMERIK NAMA ASLI FILE
            const sortedFiles = Array.from(pageFiles).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
            let uploadedPageUrls = [];
            let count = 1;
            const total = sortedFiles.length;

            // Pengiriman Antrean Berurutan (Sequential Loop) menghindari Crash Memory Browser HP
            for (const singleFile of sortedFiles) {
                const percent = Math.round((count / total) * 100);
                progressText.innerText = `Status: Memproses halaman (${count}/${total}) - ${percent}%`;

                const pageFormData = new FormData();
                pageFormData.append('image', singleFile);

                try {
                    const pRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: pageFormData });
                    const pData = await pRes.json();
                    if (pData.success) uploadedPageUrls.push(pData.data.url);
                } catch (e) {
                    console.warn(`Melewati halaman ke-${count} karena masalah kendala jaringan, berlanjut...`);
                }
                count++;
            }

            if (uploadedPageUrls.length === 0) throw new Error("Gagal memproses seluruh lembaran halaman komik.");

            const newChapterObject = {
                "chapter_number": chNumVal,
                "pages": uploadedPageUrls
            };

            if (actionType === 'new') {
                // Masukkan objek sebagai komik baru di baris katalog paling atas
                const finalMangaObject = {
                    "id": String(allMangaData.length + 1),
                    "title": document.getElementById('manga-title-input').value.trim(),
                    "status": "Ongoing",
                    "type": document.getElementById('manga-type-input').value,
                    "genres": [document.getElementById('manga-genre-input').value],
                    "synopsis": document.getElementById('manga-synopsis-input').value.trim(),
                    "cover": uploadedCoverUrl,
                    "chapters": [newChapterObject]
                };
                allMangaData.unshift(finalMangaObject);
                alert(`Sukses menerbitkan komik baru beserta Chapter ${chNumVal}!`);
            } else {
                // Tambahkan bab baru ke urutan atas (index 0) pada komik lama yang dipilih
                if (!targetManga.chapters) targetManga.chapters = [];
                targetManga.chapters.unshift(newChapterObject); 
                alert(`Sukses menambahkan Chapter ${chNumVal} ke dalam komik "${targetManga.title}"!`);
            }

            // Perbarui visualisasi komponen DOM web tanpa reload browser
            displayCatalog(allMangaData);
            populateMangaDropdown();

            // Pembersihan form input menjadi kosong kembali
            document.getElementById('manga-title-input').value = "";
            document.getElementById('chapter-num-input').value = "";
            document.getElementById('manga-synopsis-input').value = "";
            document.getElementById('imgbb-cover-input').value = "";
            document.getElementById('imgbb-pages-input').value = "";
            
            progressText.innerText = "Status: Sukses Diterbitkan!";
            progressText.style.color = "#10b981";

        } catch (error) {
            alert(`Gagal: ${error.message}`);
            progressText.innerText = "Status: Terjadi kesalahan.";
            progressText.style.color = "#ef4444";
        } finally {
            uploadBtn.innerText = "Terbitkan Update";
            uploadBtn.disabled = false;
        }
    });
}
