let allMangaData = [];
let currentSelectedManga = null;
let currentReaderMode = "webtoon";
let currentMangaPageIdx = 0;
let currentPageState = "catalog";
let currentNavType = "all"; 

window.onload = function() {
    fetchMangaData();
    initUploadFeature(); // Menghidupkan tombol upload ImgBB
};

async function fetchMangaData() {
    const container = document.getElementById('manga-container');
    container.innerHTML = "<p class='status-msg'>Memuat database komik...</p>";
    
    try {
        const response = await fetch('manga_data.json');
        if (response.ok) {
            const rawData = await response.json();
            
            allMangaData = rawData.map(m => {
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
            
            displayCatalog(allMangaData);
        } else {
            container.innerHTML = "<p class='status-msg'>Gagal membaca file manga_data.json.</p>";
        }
    } catch (err) {
        console.error("Error file json:", err);
        container.innerHTML = "<p class='status-msg'>Gagal memuat katalog komik.</p>";
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
    executeCombinedFilter();
}

function applyAdvancedFilters() {
    executeCombinedFilter();
}

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

    const pagesToRender = currentSelectedManga.pages || [currentSelectedManga.cover];

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

function switchReaderMode(mode) { 
    currentReaderMode = mode; 
    currentMangaPageIdx = 0;
    renderReaderContent(); 
}

function nextPage() { 
    const pagesLength = currentSelectedManga.pages ? currentSelectedManga.pages.length : 1;
    if (currentMangaPageIdx < pagesLength - 1) { 
        currentMangaPageIdx++; 
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
        executeCombinedFilter(); 
    }
}

function prevPage() { 
    if (currentMangaPageIdx > 0) { 
        currentMangaPageIdx--; 
        renderReaderContent(); 
    } 
}

// 9. Integrasi ImgBB API
function initUploadFeature() {
    const uploadBtn = document.getElementById('upload-status-btn');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', async function() {
        const fileInput = document.getElementById('imgbb-upload-input');
        const file = fileInput.files[0];

        if (!file) {
            alert("Silakan pilih gambar cover komik terlebih dahulu!");
            return;
        }

        const apiKey = '85e56ee4e01bcb8c426c77b81f29a68c'; 
        
        uploadBtn.innerText = "Mengunggah...";
        uploadBtn.style.backgroundColor = "#eab308";
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const permanentImageUrl = result.data.url;
                const mangaTitle = prompt("Masukkan Judul Komik Baru Anda:", "Komik Baru");
                
                if (mangaTitle) {
                    const newManga = {
                        "id": String(allMangaData.length + 1),
                        "title": mangaTitle,
                        "cover": permanentImageUrl,
                        "status": "Ongoing",
                        "type": "Manga",
                        "genres": ["Action"],
                        "pages": [permanentImageUrl] 
                    };

                    allMangaData.unshift(newManga);
                    displayCatalog(allMangaData);
                    alert(`Sukses! "${mangaTitle}" berhasil ditambahkan ke rak utama.`);
                }
                fileInput.value = "";
            } else {
                alert("ImgBB menolak unggahan. Periksa status kuota API.");
            }
        } catch (error) {
            console.error("Error upload:", error);
            alert("Gagal terhubung dengan server ImgBB.");
        } finally {
            uploadBtn.innerText = "Upload";
            uploadBtn.style.backgroundColor = "#10b981";
            uploadBtn.disabled = false;
        }
    });
}
