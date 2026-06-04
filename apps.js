// Konfigurasi Cloud Database GitHub API Anda
const GITHUB_CONFIG = {
    username: "ParagiMaca",           
    repo: "ParagiMaca",               
    path: "manga_data.json",          
    get token() {
        return getExternalToken();
    }
};

const IMGBB_API_KEY = 'dcc7ad0221271f70dc18e41030f004a8';

function getExternalToken() {
    let token = localStorage.getItem('GITHUB_DB_TOKEN');
    if (!token) {
        token = prompt("Masukkan GitHub Personal Access Token Anda untuk mengakses database:");
        if (token) {
            token = token.trim();
            localStorage.setItem('GITHUB_DB_TOKEN', token);
        } else {
            console.warn("Peringatan: Aplikasi memerlukan token GitHub yang valid untuk melakukan perubahan.");
        }
    }
    return token;
}

function resetExternalToken() {
    localStorage.removeItem('GITHUB_DB_TOKEN');
    const token = prompt("Token lama dihapus. Masukkan GitHub Personal Access Token baru Anda:");
    if (token) {
        localStorage.setItem('GITHUB_DB_TOKEN', token.trim());
        alert("Token baru berhasil disimpan!");
        location.reload();
    } else {
        alert("Aplikasi dimuat ulang tanpa token.");
        location.reload();
    }
}

// Helper delay untuk menghindari pembatasan rate-limit api dari ImgBB
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fungsi Helper untuk Upload ke ImgBB agar kodenya bersih
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // Melakukan percobaan hingga 2 kali jika terjadi kegagalan jaringan sementara
    let attempt = 0;
    while (attempt < 2) {
        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
                method: 'POST', 
                body: formData 
            });
            
            if (!res.ok) {
                throw new Error(`HTTP Error! status: ${res.status}`);
            }
            
            const data = await res.json();
            if (data && data.success && data.data && data.data.url) {
                return data.data.url;
            } else {
                throw new Error(data.error?.message || "Respons API ImgBB menyatakan kegagalan.");
            }
        } catch (error) {
            attempt++;
            if (attempt >= 2) throw error;
            console.warn(`Unggahan gagal, mencoba kembali dalam 1 detik... (Percobaan ${attempt})`);
            await delay(1000);
        }
    }
}

let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentChapterIdx = 0;   
let currentPageIdx = 0;      
let currentPageState = "catalog";
let currentNavType = "all"; 

// 1. Inisialisasi Aplikasi Saat Halaman Selesai Dimuat
window.onload = function() {
    if (GITHUB_CONFIG.token) {
        fetchMangaData();
    } else {
        const container = document.getElementById('manga-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <p class='status-msg' style="margin-bottom: 15px;">Aplikasi memerlukan token GitHub untuk mengakses database.</p>
                    <button onclick="resetExternalToken()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Input Token GitHub</button>
                </div>
            `;
        }
    }
    initGenreCheckboxes(); 
};

function initGenreCheckboxes() {
    const container = document.getElementById('manga-genre-checkbox-container');
    const editContainer = document.getElementById('edit-genre-checkbox-container');
    if (!container) return;
    
    const genreOptions = Array.from(document.querySelectorAll('#filter-genre option'))
                              .map(opt => opt.value)
                              .filter(val => val !== 'all');

    container.innerHTML = "";
    if (editContainer) editContainer.innerHTML = "";

    genreOptions.forEach(genre => {
        const label = document.createElement('label');
        label.style.cssText = "display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #fff; cursor: pointer; user-select: none;";
        label.innerHTML = `<input type="checkbox" name="contributor-genres" value="${genre}" style="width:auto; margin:0; cursor:pointer;"> <span>${genre}</span>`;
        container.appendChild(label);

        if (editContainer) {
            const labelEdit = document.createElement('label');
            labelEdit.style.cssText = "display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #fff; cursor: pointer; user-select: none;";
            labelEdit.innerHTML = `<input type="checkbox" name="edit-manga-genres" value="${genre}" style="width:auto; margin:0; cursor:pointer;"> <span>${genre}</span>`;
            editContainer.appendChild(labelEdit);
        }
    });
}

async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik dari GitHub...</p>";
    
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?timestamp=${new Date().getTime()}`;
        
        const response = await fetch(url, {
            headers: { "Authorization": `token ${GITHUB_CONFIG.token}` }
        });

        if (response.ok) {
            const fileData = await response.json();
            const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
            const rawData = JSON.parse(decodedContent);
            
            allMangaData = rawData.map(m => {
                let detectedType = "Manhwa"; 
                if (m.title.toLowerCase().includes("manga")) detectedType = "Manga";
                if (m.title.toLowerCase().includes("manhua")) detectedType = "Manhua";
                if (m.title.toLowerCase().includes("doujinshi") || m.title.toLowerCase().includes("doujin")) detectedType = "Doujinshi";

                return {
                    ...m,
                    type: m.type || detectedType, 
                    status: m.status || "Ongoing",
                    genres: m.genres || ["Action"],
                    synopsis: m.synopsis || "Kisah seru petualangan di platform ParagiMaca.",
                    chapters: m.chapters || []
                };
            });
            
            displayCatalog(allMangaData);
            populateMangaDropdown(); 
            restoreAppState();
        } else {
            let errorMsg = `Gagal terhubung (Status: ${response.status})`;
            if (response.status === 401 || response.status === 403) {
                errorMsg = "Token GitHub salah, kedaluwarsa, atau tidak memiliki izin akses (repo scope).";
            }
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 10px; max-width: 500px; margin: 0 auto; background: #1c1c24; border: 1px solid #27272a; border-radius: 8px;">
                    <p class='status-msg' style="color: #ef4444; margin-bottom: 15px; font-weight: 500;">❌ Koneksi GitHub Gagal</p>
                    <p style="color: #a1a1aa; font-size: 0.85rem; margin-bottom: 20px;">${errorMsg}</p>
                    <button onclick="resetExternalToken()" style="padding: 8px 16px; background: #ef4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Input Ulang Token</button>
                </div>
            `;
        }
    } catch (err) {
        console.error("Error database GitHub:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat data jaringan. Cek koneksi Anda.</p>";
    }
}

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

function toggleUploadMode(mode) {
    const isUpdate = (mode === 'update');
    document.getElementById('existing-manga-wrapper').style.display = isUpdate ? 'block' : 'none';
    document.getElementById('meta-manga-fields').style.display = isUpdate ? 'none' : 'grid';
    document.getElementById('synopsis-wrapper').style.display = isUpdate ? 'none' : 'block';
    document.getElementById('cover-picker-wrapper').style.display = isUpdate ? 'none' : 'block';
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
                <img src="${manga.cover}" alt="Cover" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618519764620-7403abdbfee9?w=300&q=80'">
            </div>
            <div class="manga-meta-title">${manga.title}</div>
        `;
        
        card.onclick = () => openMangaDetail(manga);
        container.appendChild(card);
    });
}

function filterByNav(type, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        document.getElementById('nav-all').classList.add('active');
    }
    currentNavType = type;
    applyAdvancedFilters();
}

function applyAdvancedFilters() {
    const sortVal = document.getElementById('filter-sort').value;
    const typeVal = document.getElementById('filter-type').value;
    const genreVal = document.getElementById('filter-genre').value;
    const statusVal = document.getElementById('filter-status').value;

    let filtered = [...allMangaData];

    if (currentNavType !== 'all') filtered = filtered.filter(m => m.type === currentNavType);
    if (typeVal !== 'all') filtered = filtered.filter(m => m.type === typeVal);
    if (statusVal !== 'all') filtered = filtered.filter(m => m.status === statusVal);
    if (genreVal !== 'all') filtered = filtered.filter(m => m.genres && m.genres.includes(genreVal));
    
    if (sortVal === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    displayCatalog(filtered);
}

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
        chapterContainer.innerHTML = `<p class='status-msg' style='padding:10px;'>Belum ada chapter terunggah.</p>`;
    }
}

function readFirstChapter() {
    if (currentSelectedManga && currentSelectedManga.chapters && currentSelectedManga.chapters.length > 0) {
        let lastIdx = currentSelectedManga.chapters.length - 1; 
        startReading(lastIdx);
    } else {
        alert("Belum ada chapter yang tersedia untuk komik ini.");
    }
}

function startReading(idx) {
    currentChapterIdx = idx;
    currentPageIdx = 0; 
    navigateTo('reader');
    renderReaderContent();
}

function renderReaderContent() {
    const reader = document.getElementById('reader-container');
    const navButtons = document.getElementById('manga-nav-buttons');
    reader.innerHTML = "";

    if (!currentSelectedManga) return;

    let pagesToRender = [];
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentChapterIdx]) {
        pagesToRender = currentSelectedManga.chapters[currentChapterIdx].pages || [];
    } else {
        pagesToRender = [currentSelectedManga.cover];
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
            img.onerror = function() { this.src = 'https://via.placeholder.com/800x600?text=Gambar+Gagal+Dimuat'; };
            wrapper.appendChild(img);
        });
        reader.appendChild(wrapper);

        const bottomNavWrapper = document.createElement('div');
        bottomNavWrapper.style.cssText = "padding: 30px 12px; display: flex; flex-direction: column; gap: 12px; align-items: center; background: #0b0b0d;";

        const hasNextChapter = currentChapterIdx > 0;
        const hasPrevChapter = currentSelectedManga.chapters && currentChapterIdx < currentSelectedManga.chapters.length - 1;

        if (hasNextChapter) {
            const nextChObj = currentSelectedManga.chapters[currentChapterIdx - 1];
            const nextBtn = document.createElement('button');
            nextBtn.className = "primary-btn";
            nextBtn.style.cssText = "background: #2563eb; width: 100%; max-width: 400px; padding: 12px; font-size: 0.9rem; border-radius: 6px; box-shadow: 0 4px 12px rgba(37,99,235,0.2); cursor: pointer;";
            nextBtn.innerText = `Selanjutnya: Chapter ${nextChObj.chapter_number} ➡`;
            nextBtn.onclick = () => navigateToNextChapter(currentChapterIdx - 1);
            bottomNavWrapper.appendChild(nextBtn);
        } else {
            const infoText = document.createElement('p');
            infoText.style.cssText = "color: #a1a1aa; font-size: 0.82rem; font-style: italic; margin-bottom: 5px;";
            infoText.innerText = "Anda telah membaca chapter terbaru dari komik ini.";
            bottomNavWrapper.appendChild(infoText);
        }

        const tocBlock = document.createElement('div');
        tocBlock.className = 'toc-navigation-block';

        const tocPrev = document.createElement('button');
        tocPrev.className = 'toc-nav-btn';
        tocPrev.innerText = '⬅️ Prev Ch';
        tocPrev.disabled = !hasPrevChapter;
        if (hasPrevChapter) {
            tocPrev.onclick = () => navigateToNextChapter(currentChapterIdx + 1);
        }

        const tocHome = document.createElement('button');
        tocHome.className = 'toc-nav-btn';
        tocHome.innerText = '📋 TOC (Daftar Isi)';
        tocHome.onclick = () => handleBackAction();

        const tocNext = document.createElement('button');
        tocNext.className = 'toc-nav-btn';
        tocNext.innerText = 'Next Ch ➡️';
        tocNext.disabled = !hasNextChapter;
        if (hasNextChapter) {
            tocNext.onclick = () => navigateToNextChapter(currentChapterIdx - 1);
        }

        tocBlock.appendChild(tocPrev);
        tocBlock.appendChild(tocHome);
        tocBlock.appendChild(tocNext);
        bottomNavWrapper.appendChild(tocBlock);
        reader.appendChild(bottomNavWrapper);

    } else {
        navButtons.style.display = "flex";
        document.getElementById('page-indicator').innerText = `${currentPageIdx + 1} / ${pagesToRender.length}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = "manga-mode-layout";
        
        const img = document.createElement('img');
        img.src = pagesToRender[currentPageIdx] ? pagesToRender[currentPageIdx].trim() : '';
        img.onclick = nextPage;
        wrapper.appendChild(img);
        reader.appendChild(wrapper);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToNextChapter(targetChapterIdx) {
    currentChapterIdx = targetChapterIdx;
    currentPageIdx = 0; 
    renderReaderContent();
    saveAppState();
}

function switchReaderMode(mode) { 
    currentReaderMode = mode; 
    currentPageIdx = 0;
    renderReaderContent(); 
    saveAppState();
}

function nextPage() { 
    let maxPages = 0;
    if (currentSelectedManga.chapters && currentSelectedManga.chapters[currentChapterIdx]) {
        maxPages = currentSelectedManga.chapters[currentChapterIdx].pages.length;
    }
    if (currentPageIdx < maxPages - 1) { 
        currentPageIdx++; 
        renderReaderContent(); 
        saveAppState();
    } 
}

function prevPage() {
    if (currentPageIdx > 0) {
        currentPageIdx--;
        renderReaderContent();
        saveAppState();
    }
}

function scrollToExtreme(direction) {
    if (direction === 'up') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// -----------------------------------------------------
// FUNGSI UPLOAD (DIPERBAIKI DENGAN PENANGANAN EROR AKURAT)
// -----------------------------------------------------
async function executeUploadAction() {
    const uploadBtn = document.getElementById('upload-status-btn');
    const progressText = document.getElementById('upload-progress-text');

    if (!GITHUB_CONFIG.token) {
        alert("Operasi ditolak. Token GitHub tidak ditemukan!");
        resetExternalToken();
        return;
    }

    const actionType = document.getElementById('upload-action-type').value;
    const chNumVal = document.getElementById('chapter-num-input').value.trim();
    const pageFiles = document.getElementById('imgbb-pages-input').files;

    if (!chNumVal || pageFiles.length === 0) {
        alert("Harap isi nomor chapter baru dan pilih file gambar isi bab!");
        return;
    }

    uploadBtn.innerText = "Mengunggah...";
    uploadBtn.disabled = true;
    progressText.style.color = "#eab308";

    try {
        let uploadedCoverUrl = "";
        let targetManga = null;
        let selectedGenres = [];

        if (actionType === 'new') {
            const titleVal = document.getElementById('manga-title-input').value.trim();
            const synopsisVal = document.getElementById('manga-synopsis-input').value.trim();
            const coverFile = document.getElementById('imgbb-cover-input').files[0];

            selectedGenres = Array.from(document.querySelectorAll('input[name="contributor-genres"]:checked'))
                                  .map(cb => cb.value);

            if (!titleVal || !synopsisVal || !coverFile) throw new Error("Lengkapi data judul, sinopsis, dan gambar cover komik baru!");
            if (selectedGenres.length === 0) throw new Error("Pilih minimal 1 genre!");

            progressText.innerText = "Status: Mengunggah cover komik...";
            uploadedCoverUrl = await uploadToImgBB(coverFile);
            await delay(500); // Berikan jeda sejenak untuk stabilitas API
        } else {
            const selectedId = document.getElementById('existing-manga-select').value;
            targetManga = allMangaData.find(m => m.id === selectedId);
            if (!targetManga) throw new Error("Komik target tidak ditemukan!");
        }

        const sortedFiles = Array.from(pageFiles).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
        let uploadedPageUrls = [];
        let count = 1;
        let failedUploadsCount = 0;
        
        for (const singleFile of sortedFiles) {
            const percent = Math.round((count / sortedFiles.length) * 100);
            progressText.innerText = `Status: Mengunggah Halaman (${count}/${sortedFiles.length}) - ${percent}%`;
            try {
                const pUrl = await uploadToImgBB(singleFile);
                uploadedPageUrls.push(pUrl);
                await delay(300); // Jeda kecil antar unggahan halaman
            } catch (e) {
                console.error(`Gagal unggah hal ${count}:`, e);
                failedUploadsCount++;
            }
            count++;
        }

        // Jika semua file gagal diunggah ke ImgBB
        if (uploadedPageUrls.length === 0) {
            throw new Error("Gagal mengunggah lembaran halaman komik ke ImgBB. Pastikan koneksi stabil dan API Key masih aktif.");
        }

        // Peringatan jika hanya sebagian gambar yang gagal diunggah
        if (failedUploadsCount > 0) {
            const confirmProceed = confirm(`Ada ${failedUploadsCount} halaman yang gagal diunggah karena kendala jaringan. Apakah Anda ingin melanjutkan proses publikasi dengan halaman yang berhasil saja (${uploadedPageUrls.length} halaman)?`);
            if (!confirmProceed) {
                throw new Error("Proses dihentikan oleh pengguna karena unggahan tidak lengkap.");
            }
        }

        const newChapterObject = { "chapter_number": chNumVal, "pages": uploadedPageUrls };

        if (actionType === 'new') {
            const finalMangaObject = {
                "id": String(allMangaData.length + 1),
                "title": document.getElementById('manga-title-input').value.trim(),
                "status": "Ongoing",
                "type": document.getElementById('manga-type-input').value,
                "genres": selectedGenres, 
                "synopsis": document.getElementById('manga-synopsis-input').value.trim(),
                "cover": uploadedCoverUrl,
                "chapters": [newChapterObject]
            };
            allMangaData.unshift(finalMangaObject);
        } else {
            if (!targetManga.chapters) targetManga.chapters = [];
            targetManga.chapters.unshift(newChapterObject); 
        }

        progressText.innerText = "Status: Menyinkronkan database ke GitHub...";
        await pushDatabaseUpdate(`Kontributor Update: Chapter ${chNumVal}`);

        alert("Sukses! Update komik berhasil diterbitkan!");

        displayCatalog(allMangaData);
        populateMangaDropdown();

        document.getElementById('manga-title-input').value = "";
        document.getElementById('chapter-num-input').value = "";
        document.getElementById('manga-synopsis-input').value = "";
        document.getElementById('imgbb-cover-input').value = "";
        document.getElementById('imgbb-pages-input').value = "";
        document.querySelectorAll('input[name="contributor-genres"]').forEach(cb => cb.checked = false);
        
        progressText.innerText = "Status: Sukses Diterbitkan!";
        progressText.style.color = "#10b981";
        navigateTo('catalog');

    } catch (error) {
        alert(`Gagal: ${error.message}`);
        progressText.innerText = "Status: Kesalahan pengiriman.";
        progressText.style.color = "#ef4444";
    } finally {
        uploadBtn.innerText = "🚀 Terbitkan Update";
        uploadBtn.disabled = false;
    }
}

// -----------------------------------------------------
// MODAL EDIT DAN UPLOAD BAB BARU DARI MODAL
// -----------------------------------------------------
function switchModalTab(tabId) {
    const tabMetaBtn = document.getElementById('tab-edit-meta');
    const tabUploadBtn = document.getElementById('tab-upload-chap');
    const contentMeta = document.getElementById('modal-tab-content-meta');
    const contentUpload = document.getElementById('modal-tab-content-upload');

    if (tabId === 'meta') {
        tabMetaBtn.classList.add('active');
        tabUploadBtn.classList.remove('active');
        contentMeta.style.display = 'block';
        contentUpload.style.display = 'none';
    } else {
        tabMetaBtn.classList.remove('active');
        tabUploadBtn.classList.add('active');
        contentMeta.style.display = 'none';
        contentUpload.style.display = 'block';
    }
}

function openEditPostModal() {
    if (!currentSelectedManga) return;
    const modal = document.getElementById('edit-post-modal');
    modal.style.display = 'flex';

    switchModalTab('meta');

    document.getElementById('edit-manga-title').value = currentSelectedManga.title;
    document.getElementById('edit-manga-type').value = currentSelectedManga.type;
    document.getElementById('edit-manga-status').value = currentSelectedManga.status;
    document.getElementById('edit-manga-cover').value = currentSelectedManga.cover;
    document.getElementById('edit-manga-synopsis').value = currentSelectedManga.synopsis || "";

    const genreCheckboxes = document.querySelectorAll('input[name="edit-manga-genres"]');
    genreCheckboxes.forEach(cb => {
        cb.checked = currentSelectedManga.genres && currentSelectedManga.genres.includes(cb.value);
    });

    const chapterSelector = document.getElementById('edit-chapter-select');
    chapterSelector.innerHTML = '<option value="">Pilih Chapter...</option>';
    
    if (currentSelectedManga.chapters && currentSelectedManga.chapters.length > 0) {
        currentSelectedManga.chapters.forEach((ch, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `Chapter ${ch.chapter_number}`;
            chapterSelector.appendChild(opt);
        });
    }

    document.getElementById('editor-chapter-pages-container').style.display = 'none';
    document.getElementById('edit-progress-text').innerText = "Siap melakukan perubahan.";
    document.getElementById('edit-progress-text').style.color = "#a1a1aa";
    
    document.getElementById('modal-chapter-num-input').value = "";
    document.getElementById('modal-imgbb-pages-input').value = "";
    document.getElementById('edit-chapter-pages-bulk-input').value = "";
}

function closeEditPostModal() {
    document.getElementById('edit-post-modal').style.display = 'none';
}

function loadChapterPagesToEditor(chapterIdxStr) {
    const container = document.getElementById('editor-chapter-pages-container');
    const listWrapper = document.getElementById('pages-edit-list');
    listWrapper.innerHTML = "";
    document.getElementById('edit-chapter-pages-bulk-input').value = ""; 

    if (chapterIdxStr === "") {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    const chIdx = parseInt(chapterIdxStr);
    const selectedCh = currentSelectedManga.chapters[chIdx];
    if (!selectedCh || !selectedCh.pages) return;

    selectedCh.pages.forEach((pUrl, index) => {
        const row = document.createElement('div');
        row.className = 'page-url-row';
        row.innerHTML = `
            <span class="page-num-lbl">Hal ${index + 1}</span>
            <input type="text" class="edit-page-url-input" value="${pUrl.trim()}" placeholder="Masukkan Link URL Gambar...">
            <button type="button" class="del-page-row-btn" onclick="this.parentElement.remove(); reindexPageLabels();" title="Hapus Halaman">&times;</button>
        `;
        listWrapper.appendChild(row);
    });
}

function reindexPageLabels() {
    const rows = document.querySelectorAll('#pages-edit-list .page-url-row');
    rows.forEach((row, idx) => {
        row.querySelector('.page-num-lbl').innerText = `Hal ${idx + 1}`;
    });
}

function addNewPageUrlRow() {
    const listWrapper = document.getElementById('pages-edit-list');
    const newIdx = listWrapper.children.length + 1;
    const row = document.createElement('div');
    row.className = 'page-url-row';
    row.innerHTML = `
        <span class="page-num-lbl">Hal ${newIdx}</span>
        <input type="text" class="edit-page-url-input" value="" placeholder="Masukkan Link URL Gambar Baru...">
        <button type="button" class="del-page-row-btn" onclick="this.parentElement.remove(); reindexPageLabels();">&times;</button>
    `;
    listWrapper.appendChild(row);
}

function deleteCurrentChapter() {
    const chapterSelector = document.getElementById('edit-chapter-select');
    const chIdxStr = chapterSelector.value;
    if (chIdxStr === "") return;

    if (confirm("Apakah Anda yakin ingin menghapus chapter ini secara permanen?")) {
        const chIdx = parseInt(chIdxStr);
        currentSelectedManga.chapters.splice(chIdx, 1);
        
        openEditPostModal();
        alert("Bab terhapus dari memori lokal. Jangan lupa tekan 'Simpan Perubahan' di bawah untuk menyinkronkan ke server cloud GitHub!");
    }
}

async function uploadNewChapterFromModal() {
    if (!GITHUB_CONFIG.token) {
        alert("Operasi ditolak. Token GitHub tidak ditemukan!");
        return;
    }

    const chNumVal = document.getElementById('modal-chapter-num-input').value.trim();
    const pageFiles = document.getElementById('modal-imgbb-pages-input').files;
    const uploadBtn = document.getElementById('modal-chapter-upload-btn');
    const progressText = document.getElementById('edit-progress-text');

    if (!chNumVal || pageFiles.length === 0) {
        alert("Harap isi nomor chapter baru dan pilih file gambar isi bab!");
        return;
    }

    uploadBtn.innerText = "Mengunggah...";
    uploadBtn.disabled = true;
    progressText.innerText = "Status: Mempersiapkan pengunggahan bab...";
    progressText.style.color = "#eab308";

    try {
        const sortedFiles = Array.from(pageFiles).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
        let uploadedPageUrls = [];
        let count = 1;
        let failedCount = 0;

        for (const singleFile of sortedFiles) {
            progressText.innerText = `Status: Mengunggah gambar (${count}/${sortedFiles.length})...`;
            try {
                const pUrl = await uploadToImgBB(singleFile);
                uploadedPageUrls.push(pUrl);
                await delay(300);
            } catch (e) {
                console.warn(`Gagal upload halaman ${count}:`, e);
                failedCount++;
            }
            count++;
        }

        if (uploadedPageUrls.length === 0) {
            throw new Error("Gagal mengunggah lembaran halaman komik ke ImgBB. Periksa koneksi data internet Anda.");
        }

        if (failedCount > 0) {
            const proceed = confirm(`Sebanyak ${failedCount} halaman gagal dimuat. Lanjutkan penyimpanan ${uploadedPageUrls.length} halaman sisanya?`);
            if (!proceed) throw new Error("Pengunggahan bab dibatalkan oleh pengguna.");
        }

        const newChapterObject = { "chapter_number": chNumVal, "pages": uploadedPageUrls };

        if (!currentSelectedManga.chapters) currentSelectedManga.chapters = [];
        currentSelectedManga.chapters.unshift(newChapterObject); 

        progressText.innerText = "Status: Sinkronisasi bab baru ke GitHub Cloud...";
        
        const elementIndex = allMangaData.findIndex(m => m.id === currentSelectedManga.id);
        if (elementIndex !== -1) allMangaData[elementIndex] = currentSelectedManga;

        await pushDatabaseUpdate(`Kontributor Sunting (Upload Bab): ${currentSelectedManga.title} Ch ${chNumVal}`);

        progressText.innerText = "Status: Bab Sukses Diterbitkan!";
        progressText.style.color = "#10b981";
        alert(`Sukses! Chapter ${chNumVal} berhasil ditambahkan ke komik ini.`);

        closeEditPostModal();
        openMangaDetail(currentSelectedManga);
        displayCatalog(allMangaData);

    } catch (error) {
        alert(`Gagal: ${error.message}`);
        progressText.innerText = "Status: Kesalahan pengiriman bab.";
        progressText.style.color = "#ef4444";
    } finally {
        uploadBtn.innerText = "🚀 Terbitkan Bab Baru";
        uploadBtn.disabled = false;
    }
}

// -----------------------------------------------------
// FUNGSI SIMPAN EDIT (DENGAN DUKUNGAN EDIT GAMBAR MASSAL)
// -----------------------------------------------------
async function saveMangaChanges() {
    if (!GITHUB_CONFIG.token) {
        alert("Operasi ditolak. Token GitHub tidak ditemukan!");
        return;
    }

    const saveBtn = document.getElementById('save-edit-btn');
    const progressText = document.getElementById('edit-progress-text');
    
    const newTitle = document.getElementById('edit-manga-title').value.trim();
    const newCover = document.getElementById('edit-manga-cover').value.trim();
    const newSynopsis = document.getElementById('edit-manga-synopsis').value.trim();
    const newType = document.getElementById('edit-manga-type').value;
    const newStatus = document.getElementById('edit-manga-status').value;
    const selectedGenres = Array.from(document.querySelectorAll('input[name="edit-manga-genres"]:checked')).map(cb => cb.value);

    if (!newTitle || !newCover) {
        alert("Judul dan Tautan Cover tidak boleh kosong!");
        return;
    }

    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;
    progressText.innerText = "Status: Memperbarui objek lokal...";
    progressText.style.color = "#eab308";

    try {
        currentSelectedManga.title = newTitle;
        currentSelectedManga.cover = newCover;
        currentSelectedManga.synopsis = newSynopsis;
        currentSelectedManga.type = newType;
        currentSelectedManga.status = newStatus;
        currentSelectedManga.genres = selectedGenres;

        const chapterSelector = document.getElementById('edit-chapter-select');
        const activeChIdxStr = chapterSelector.value;
        
        if (activeChIdxStr !== "") {
            const chIdx = parseInt(activeChIdxStr);
            const editBulkFiles = document.getElementById('edit-chapter-pages-bulk-input').files;
            let finalPages = [];

            // JIKA ADA FILE DIPILIH DARI EDIT MASSAL
            if (editBulkFiles.length > 0) {
                progressText.innerText = `Status: Memproses ${editBulkFiles.length} gambar baru...`;
                const sortedFiles = Array.from(editBulkFiles).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
                let count = 1;
                let failedCount = 0;
                
                for (const file of sortedFiles) {
                    progressText.innerText = `Status: ImgBB Upload Edit (${count}/${editBulkFiles.length})...`;
                    try {
                        const url = await uploadToImgBB(file);
                        finalPages.push(url);
                        await delay(300);
                    } catch(e) {
                        console.warn("Gagal upload halaman", count, e);
                        failedCount++;
                    }
                    count++;
                }

                if (finalPages.length === 0) {
                    throw new Error("Gagal mengunggah semua gambar edit massal.");
                }
            } else {
                // JIKA TIDAK, AMBIL DARI URL TEKS MANUAL
                const inputElements = document.querySelectorAll('#pages-edit-list .edit-page-url-input');
                finalPages = Array.from(inputElements)
                                  .map(inp => inp.value.trim())
                                  .filter(val => val !== "");
            }
            
            // TIMPA HALAMAN BAB YANG DIPILIH
            if (currentSelectedManga.chapters[chIdx]) {
                currentSelectedManga.chapters[chIdx].pages = finalPages;
            }
        }

        const elementIndex = allMangaData.findIndex(m => m.id === currentSelectedManga.id);
        if (elementIndex !== -1) allMangaData[elementIndex] = currentSelectedManga;

        progressText.innerText = "Status: Mengirim data teranyar ke GitHub Cloud...";
        await pushDatabaseUpdate(`Kontributor Sunting: ${newTitle}`);

        progressText.innerText = "Status: Sukses Diperbarui!";
        progressText.style.color = "#10b981";
        alert("Sukses! Suntingan postingan komik berhasil disimpan ke database!");
        
        closeEditPostModal();
        openMangaDetail(currentSelectedManga);
        displayCatalog(allMangaData);

    } catch (e) {
        console.error(e);
        progressText.innerText = "Status: Gagal menyinkronkan.";
        progressText.style.color = "#ef4444";
        alert(`Gagal menyimpan suntingan: ${e.message}`);
    } finally {
        saveBtn.innerText = "Simpan Perubahan";
        saveBtn.disabled = false;
    }
}

async function pushDatabaseUpdate(commitMessage) {
    const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
    const fileMetaRes = await fetch(getUrl, {
        headers: { "Authorization": `token ${GITHUB_CONFIG.token}` }
    });
    
    if (!fileMetaRes.ok) throw new Error("Gagal mengambil meta SHA database dari GitHub.");
    
    const fileMeta = await fileMetaRes.json();
    const currentSha = fileMeta.sha;

    const rawJsonText = JSON.stringify(allMangaData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(rawJsonText)));

    const pushResponse = await fetch(getUrl, {
        method: 'PUT',
        headers: {
            "Authorization": `token ${GITHUB_CONFIG.token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: commitMessage,
            content: encodedContent,
            sha: currentSha
        })
    });

    if (!pushResponse.ok) throw new Error("Database gagal disinkronkan ke Cloud GitHub.");
}

// -----------------------------------------------------
// STATE & NAVIGASI PWA
// -----------------------------------------------------
function saveAppState() {
    const state = {
        currentPageState: currentPageState,
        currentSelectedMangaId: currentSelectedManga ? currentSelectedManga.id : null,
        currentChapterIdx: currentChapterIdx,
        currentPageIdx: currentPageIdx,
        currentReaderMode: currentReaderMode
    };
    sessionStorage.setItem('paragimaca_saved_state', JSON.stringify(state));
}

function restoreAppState() {
    const saved = sessionStorage.getItem('paragimaca_saved_state');
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        if (!state) return;
        
        if (state.currentReaderMode) {
            currentReaderMode = state.currentReaderMode;
            const modeSelect = document.getElementById('mode-select');
            if (modeSelect) modeSelect.value = currentReaderMode;
        }

        if (state.currentSelectedMangaId) {
            const found = allMangaData.find(m => m.id === state.currentSelectedMangaId);
            if (found) {
                currentSelectedManga = found;
                currentChapterIdx = state.currentChapterIdx || 0;
                currentPageIdx = state.currentPageIdx || 0;
                
                if (state.currentPageState === 'detail') {
                    openMangaDetail(currentSelectedManga);
                } else if (state.currentPageState === 'reader') {
                    openMangaDetail(found); 
                    currentPageState = 'reader';
                    navigateTo('reader');
                    renderReaderContent();
                } else {
                    navigateTo(state.currentPageState || 'catalog');
                }
                return;
            }
        }
        
        if (state.currentPageState && state.currentPageState !== 'catalog') {
            navigateTo(state.currentPageState);
        }
    } catch (e) {
        console.error("Gagal memulihkan status halaman ParagiMaca:", e);
    }
}

function navigateTo(state) {
    currentPageState = state;
    document.getElementById('catalog-page').style.display = state === 'catalog' ? 'block' : 'none';
    document.getElementById('editor-page').style.display = state === 'editor' ? 'block' : 'none';
    document.getElementById('detail-page').style.display = state === 'detail' ? 'block' : 'none';
    document.getElementById('reader-page').style.display = state === 'reader' ? 'block' : 'none';
    
    const floatScroller = document.getElementById('floating-scroller-controls');
    if (floatScroller) {
        floatScroller.style.display = state === 'reader' ? 'flex' : 'none';
    }

    document.getElementById('back-btn').style.display = state === 'catalog' ? 'none' : 'block';
    
    const editorBtn = document.getElementById('nav-editor-btn');
    if (editorBtn) {
        if (state === 'editor') {
            editorBtn.classList.add('active');
        } else {
            editorBtn.classList.remove('active');
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveAppState();
}

function handleBackAction() {
    if (currentPageState === 'reader') {
        navigateTo('detail');
    } else if (currentPageState === 'detail' || currentPageState === 'editor') {
        navigateTo('catalog');
        applyAdvancedFilters(); 
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('PWA Service Worker berhasil didaftarkan pada scope:', registration.scope);
            })
            .catch(error => {
                console.error('PWA Service Worker gagal didaftarkan:', error);
            });
    });
}