// StreamingHanz Frontend JavaScript
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentVideo = null;
let currentEpisode = null;
let adInterval = null;

// Generate unique user identifier
function getUserIdentifier() {
    let userId = localStorage.getItem('userIdentifier');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userIdentifier', userId);
    }
    return userId;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    currentUser = getUserIdentifier();
    
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        loadHomePage();
    }, 2000);
    
    // Setup search functionality
    setupSearch();
});

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    return response;
}

// Load Homepage
async function loadHomePage() {
    try {
        const response = await apiRequest('/streaming/homepage');
        const data = await response.json();
        
        if (data.success) {
            // Load hero slider
            loadHeroSlider(data.data.featured);
            
            // Load featured content
            loadContentSlider('featuredContent', data.data.featured);
            
            // Load latest movies
            loadContentSlider('latestMovies', data.data.latest_movies);
            
            // Load popular series
            loadContentSlider('popularSeries', data.data.popular_series);
            
            // Load categories
            loadCategoriesGrid(data.data.categories);
        }
    } catch (error) {
        console.error('Load homepage error:', error);
        showToast('Gagal memuat konten', 'error');
    }
}

function loadHeroSlider(content) {
    const heroSlider = document.getElementById('heroSlider');
    heroSlider.innerHTML = content.slice(0, 3).map(item => `
        <div class="hero-item" style="background-image: url('${item.poster_url || item.thumbnail || 'https://via.placeholder.com/400x250'}')" onclick="showDetail(${item.id}, '${item.type}')">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                ${item.is_premium ? '<span class="hero-badge">Premium</span>' : ''}
                <h3>${item.title}</h3>
                <p>${item.description ? item.description.substring(0, 100) + '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

function loadContentSlider(containerId, content) {
    const container = document.getElementById(containerId);
    container.innerHTML = content.map(item => `
        <div class="content-card" onclick="showDetail(${item.id}, '${item.type}')">
            <div class="content-card-wrapper">
                <img src="${item.thumbnail || 'https://via.placeholder.com/140x200'}" alt="${item.title}">
                ${item.is_premium ? '<span class="premium-badge">Premium</span>' : ''}
            </div>
            <h4>${item.title}</h4>
            <p>${item.category_name || 'No Category'}</p>
        </div>
    `).join('');
}

function loadCategoriesGrid(categories) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = categories.map(category => `
        <div class="category-card" onclick="showCategory('${category.slug}')">
            <i class="fas fa-tag"></i>
            <h4>${category.name}</h4>
            <p>${category.video_count} video</p>
        </div>
    `).join('');
}

// Show Detail Page
function showDetail(videoId, type) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show detail page
    document.getElementById('detailPage').classList.add('active');
    
    // Load video details
    loadVideoDetail(videoId, type);
}

async function loadVideoDetail(videoId, type) {
    try {
        const response = await apiRequest(`/videos/${videoId}`);
        const data = await response.json();
        
        if (data.success) {
            const video = data.data;
            currentVideo = video;
            
            // Update detail UI
            document.getElementById('detailPoster').src = video.poster_url || video.thumbnail || 'https://via.placeholder.com/400x300';
            document.getElementById('detailTitle').textContent = video.title;
            document.getElementById('detailType').textContent = video.type === 'movie' ? 'Film' : 'Series';
            document.getElementById('detailYear').textContent = video.release_year || '';
            document.getElementById('detailDuration').textContent = video.duration || '';
            document.getElementById('detailRating').textContent = video.rating ? `⭐ ${video.rating}` : '';
            document.getElementById('detailCategory').textContent = video.category_name || '';
            document.getElementById('detailDescription').textContent = video.description || '';
            document.getElementById('detailViews').textContent = video.views || 0;
            
            // Show/hide premium tag
            const premiumTag = document.getElementById('detailPremium');
            if (video.is_premium) {
                premiumTag.style.display = 'inline-block';
            } else {
                premiumTag.style.display = 'none';
            }
            
            // Load seasons for series
            if (type === 'series' && video.seasons) {
                document.getElementById('seasonsSection').style.display = 'block';
                loadSeasons(video.seasons);
            } else {
                document.getElementById('seasonsSection').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Load video detail error:', error);
        showToast('Gagal memuat detail video', 'error');
    }
}

function loadSeasons(seasons) {
    const seasonsList = document.getElementById('seasonsList');
    seasonsList.innerHTML = seasons.map(season => `
        <div class="season-item">
            <div class="season-header" onclick="toggleSeason(${season.id})">
                <div>
                    <h4>Season ${season.season_number}</h4>
                    <p>${season.title || ''}</p>
                </div>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="episodes-list" id="episodes-${season.id}" style="display: none;">
                ${season.episodes.map(episode => `
                    <div class="episode-item" onclick="watchEpisode(${episode.video_id}, ${episode.id})">
                        <img class="episode-thumbnail" src="${episode.thumbnail_url || 'https://via.placeholder.com/80x45'}" alt="${episode.title}">
                        <div class="episode-info">
                            <h4>Episode ${episode.episode_number}: ${episode.title}</h4>
                            <p>${episode.description ? episode.description.substring(0, 80) + '...' : ''}</p>
                            <div class="episode-meta">
                                <span><i class="fas fa-eye"></i> ${episode.views || 0}</span>
                                <span>${episode.duration || ''}</span>
                            </div>
                        </div>
                        ${episode.is_premium ? '<span class="episode-premium">Premium</span>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function toggleSeason(seasonId) {
    const episodesDiv = document.getElementById(`episodes-${seasonId}`);
    const icon = episodesDiv.previousElementSibling.querySelector('i');
    
    if (episodesDiv.style.display === 'none') {
        episodesDiv.style.display = 'block';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        episodesDiv.style.display = 'none';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Watch Content
function watchContent() {
    if (!currentVideo) return;
    
    if (currentVideo.type === 'movie') {
        watchEpisode(currentVideo.id);
    } else {
        // For series, user needs to select an episode
        showToast('Pilih episode untuk menonton', 'info');
    }
}

async function watchEpisode(videoId, episodeId = null) {
    try {
        // Check access first
        const accessResponse = await apiRequest('/streaming/check-access', {
            method: 'POST',
            body: JSON.stringify({
                user_identifier: currentUser,
                video_id: videoId,
                episode_id: episodeId
            })
        });
        
        const accessData = await accessResponse.json();
        
        if (accessData.success) {
            if (accessData.can_watch) {
                // Show player
                showPlayer(videoId, episodeId);
            } else {
                // Show unlock overlay
                showUnlockOverlay(accessData.ads_watched, accessData.ads_required, videoId, episodeId);
            }
        }
    } catch (error) {
        console.error('Check access error:', error);
        showToast('Gagal memeriksa akses', 'error');
    }
}

function showPlayer(videoId, episodeId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show player page
    document.getElementById('playerPage').classList.add('active');
    
    // Load player data
    loadPlayer(videoId, episodeId);
}

async function loadPlayer(videoId, episodeId) {
    try {
        const response = await apiRequest(`/streaming/player/${videoId}?episode_id=${episodeId}`);
        const data = await response.json();
        
        if (data.success) {
            const content = data.data.content;
            const ads = data.data.ads;
            
            // Update player title
            document.getElementById('playerTitle').textContent = content.title;
            document.getElementById('playerSubtitle').textContent = content.video_title ? 
                `${content.video_title} - Episode ${content.episode_number}` : '';
            
            // Set video source
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.src = content.video_url || content.trailer_url || '';
            
            // Show preroll ads if available
            if (ads.preroll && ads.preroll.length > 0) {
                showAdOverlay(ads.preroll[0], 'preroll');
            }
        }
    } catch (error) {
        console.error('Load player error:', error);
        showToast('Gagal memuat player', 'error');
    }
}

function showUnlockOverlay(watched, required, videoId, episodeId) {
    // Store current video/episode for unlock
    currentVideo = { videoId, episodeId };
    
    // Show unlock overlay
    document.getElementById('unlockOverlay').style.display = 'flex';
    document.getElementById('adsWatched').textContent = watched;
    document.getElementById('adsTotal').textContent = required;
    document.getElementById('adsRequired').textContent = required - watched;
    
    // Update progress bar
    const progress = (watched / required) * 100;
    document.getElementById('unlockProgress').style.width = progress + '%';
    
    // Show player page
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('playerPage').classList.add('active');
}

function watchAd() {
    // Get active ads
    apiRequest('/ads/active?ad_type=rewarded').then(response => {
        response.json().then(data => {
            if (data.data && data.data.length > 0) {
                const ad = data.data[0];
                showAdOverlay(ad, 'rewarded');
            } else {
                // Show sample ad for demo
                showSampleAd();
            }
        });
    });
}

function showAdOverlay(ad, type) {
    document.getElementById('adOverlay').style.display = 'flex';
    document.getElementById('adCountdown').textContent = 'Iklan dimulai dalam 3 detik...';
    
    // Load ad code
    const adContainer = document.getElementById('adContainer');
    adContainer.innerHTML = ad.ad_code || getSampleAdCode();
    
    // Countdown
    let countdown = 3;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            document.getElementById('adCountdown').textContent = `Iklan dimulai dalam ${countdown} detik...`;
        } else {
            clearInterval(countdownInterval);
            document.getElementById('adCountdown').textContent = 'Tonton iklan untuk membuka konten';
            
            // Start ad timer
            startAdTimer(ad.id, type);
        }
    }, 1000);
}

function startAdTimer(adId, type) {
    let adDuration = 15; // 15 seconds for demo
    let currentTime = 0;
    
    adInterval = setInterval(() => {
        currentTime++;
        const progress = (currentTime / adDuration) * 100;
        document.getElementById('adProgress').style.width = progress + '%';
        document.getElementById('adProgressText').textContent = `${currentTime}/${adDuration}`;
        
        if (currentTime >= adDuration) {
            clearInterval(adInterval);
            completeAdView(adId, type);
        }
    }, 1000);
}

async function completeAdView(adId, type) {
    try {
        // Record ad view
        await apiRequest('/ads/view', {
            method: 'POST',
            body: JSON.stringify({
                user_identifier: currentUser,
                video_id: currentVideo?.videoId || null,
                episode_id: currentVideo?.episodeId || null,
                ad_id: adId
            })
        });
        
        // Hide ad overlay
        document.getElementById('adOverlay').style.display = 'none';
        
        // Check access again
        const accessResponse = await apiRequest('/streaming/check-access', {
            method: 'POST',
            body: JSON.stringify({
                user_identifier: currentUser,
                video_id: currentVideo?.videoId || null,
                episode_id: currentVideo?.episodeId || null
            })
        });
        
        const accessData = await accessResponse.json();
        
        if (accessData.can_watch) {
            // Hide unlock overlay and show video
            document.getElementById('unlockOverlay').style.display = 'none';
            showToast('Konten terbuka! Selamat menonton!', 'success');
        } else {
            // Update unlock overlay
            document.getElementById('adsWatched').textContent = accessData.ads_watched;
            document.getElementById('adsRequired').textContent = accessData.ads_required - accessData.ads_watched;
            
            const progress = (accessData.ads_watched / accessData.ads_required) * 100;
            document.getElementById('unlockProgress').style.width = progress + '%';
            
            showToast(`Iklan selesai! ${accessData.ads_required - accessData.ads_watched} iklan lagi`, 'success');
        }
    } catch (error) {
        console.error('Complete ad view error:', error);
        showToast('Gagal merekam iklan', 'error');
    }
}

function showSampleAd() {
    const adContainer = document.getElementById('adContainer');
    adContainer.innerHTML = getSampleAdCode();
    document.getElementById('adOverlay').style.display = 'flex';
    startAdTimer('sample_ad', 'rewarded');
}

function getSampleAdCode() {
    return `
        <div style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h3>Sample Advertisement</h3>
            <p>This is a demo ad for StreamingHanz</p>
            <button style="background: white; color: #667eea; border: none; padding: 10px 20px; border-radius: 20px; margin-top: 15px; cursor: pointer;">
                Learn More
            </button>
        </div>
    `;
}

// Search Functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                performSearch(query);
            }
        }, 500);
    });
}

function showSearch() {
    document.getElementById('searchBar').style.display = 'block';
    document.getElementById('searchInput').focus();
}

function hideSearch() {
    document.getElementById('searchBar').style.display = 'none';
    document.getElementById('searchInput').value = '';
}

async function performSearch(query) {
    try {
        const response = await apiRequest(`/streaming/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Show search page
        document.getElementById('searchPage').classList.add('active');
        
        // Display results
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = data.data.map(item => `
            <div class="search-result-item" onclick="showDetail(${item.id}, '${item.type}')">
                <img src="${item.thumbnail || 'https://via.placeholder.com/80x120'}" alt="${item.title}">
                <div class="search-result-info">
                    <h4>${item.title}</h4>
                    <p>${item.description ? item.description.substring(0, 100) + '...' : ''}</p>
                    <div class="search-result-meta">
                        <span>${item.type === 'movie' ? 'Film' : 'Series'}</span>
                        <span>${item.category_name || ''}</span>
                        <span><i class="fas fa-eye"></i> ${item.views || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('Gagal melakukan pencarian', 'error');
    }
}

// Show Category Page
function showCategory(category) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show category page
    document.getElementById('categoryPage').classList.add('active');
    
    // Set category title
    const titles = {
        'movies': 'Film',
        'series': 'Series',
        'premium': 'Premium Content'
    };
    document.getElementById('categoryTitle').textContent = titles[category] || category;
    
    // Load category content
    loadCategoryContent(category);
}

async function loadCategoryContent(category) {
    try {
        let url = '/videos?limit=50';
        if (category === 'movies') url += '&type=movie';
        if (category === 'series') url += '&type=series';
        if (category === 'premium') url += '&is_premium=true';
        
        const response = await apiRequest(url);
        const data = await response.json();
        
        const container = document.getElementById('categoryContent');
        container.innerHTML = data.data.map(item => `
            <div class="content-item" onclick="showDetail(${item.id}, '${item.type}')">
                <img src="${item.thumbnail || 'https://via.placeholder.com/160x240'}" alt="${item.title}">
                <h4>${item.title}</h4>
                <p>${item.category_name || ''}</p>
                ${item.is_premium ? '<span class="premium-badge">Premium</span>' : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Load category error:', error);
        showToast('Gagal memuat kategori', 'error');
    }
}

// Navigation Functions
function showHome() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('homePage').classList.add('active');
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item').classList.add('active');
}

function goBack() {
    if (document.getElementById('playerPage').classList.contains('active')) {
        exitPlayer();
    } else {
        showHome();
    }
}

function exitPlayer() {
    // Clear any running intervals
    if (adInterval) {
        clearInterval(adInterval);
    }
    
    // Hide overlays
    document.getElementById('adOverlay').style.display = 'none';
    document.getElementById('unlockOverlay').style.display = 'none';
    
    // Go back to previous page
    showHome();
}

function shareContent() {
    if (navigator.share) {
        navigator.share({
            title: currentVideo?.title || 'StreamingHanz',
            text: 'Lihat konten menarik di StreamingHanz!',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link disalin ke clipboard!', 'success');
        });
    }
}

function showWatchHistory() {
    showToast('Fitur riwayat menonton - Coming soon!', 'info');
}

// Player Controls
function togglePlay() {
    const iframe = document.getElementById('videoPlayer');
    // Implementation depends on video player API
    showToast('Play/Pause - Coming soon!', 'info');
}

function toggleFullscreen() {
    const iframe = document.getElementById('videoPlayer');
    if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        warning: '#ed8936',
        info: '#4299e1'
    };
    
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause any playing content
        if (adInterval) {
            clearInterval(adInterval);
        }
    }
});

// Prevent right-click on video player (optional)
document.getElementById('videoPlayer')?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});