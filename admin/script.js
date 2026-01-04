// Admin Panel JavaScript
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showLoginPage();
    }
});

// Authentication Functions
async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showDashboard();
            loadDashboardData();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            errorDiv.textContent = '';
            showDashboard();
            loadDashboardData();
            showToast('Login successful!', 'success');
        } else {
            errorDiv.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        console.error('Login error:', error);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    authToken = null;
    showLoginPage();
    showToast('Logged out successfully', 'success');
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        if (item.id === 'logoutBtn') return;
        
        e.preventDefault();
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show corresponding page
        const pageName = item.dataset.page;
        showPage(pageName);
    });
});

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const pageElement = document.getElementById(pageName + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        videos: 'Video Management',
        episodes: 'Episode Management',
        categories: 'Categories',
        ads: 'Ad Management',
        database: 'Database Setup'
    };
    
    document.getElementById('pageTitle').textContent = titles[pageName] || 'Dashboard';
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'videos':
            loadVideos();
            break;
        case 'episodes':
            loadEpisodes();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'ads':
            loadAds();
            break;
        case 'database':
            loadDatabaseStatus();
            break;
    }
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
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

// Dashboard Data
async function loadDashboardData() {
    try {
        // Get stats
        const [videosRes, episodesRes, adsRes] = await Promise.all([
            apiRequest('/videos?limit=1'),
            apiRequest('/episodes/video/1'),
            apiRequest('/ads')
        ]);
        
        if (videosRes.ok) {
            const videosData = await videosRes.json();
            document.getElementById('totalVideos').textContent = videosData.pagination.total;
            
            // Show recent videos
            const recentVideos = videosData.data.slice(0, 6);
            const recentContainer = document.getElementById('recentVideos');
            recentContainer.innerHTML = recentVideos.map(video => `
                <div class="recent-item">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/200x120'}" alt="${video.title}">
                    <h4>${video.title}</h4>
                </div>
            `).join('');
        }
        
        // Get total views
        const [allVideos] = await Promise.all([
            apiRequest('/videos?limit=1000')
        ]);
        
        if (allVideos.ok) {
            const videos = await allVideos.json();
            const totalViews = videos.data.reduce((sum, video) => sum + video.views, 0);
            document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        }
        
        if (adsRes.ok) {
            const adsData = await adsRes.json();
            const activeAds = adsData.data.filter(ad => ad.status === 'active');
            document.getElementById('totalAds').textContent = activeAds.length;
        }
        
        // Count episodes
        if (videosData.data.length > 0) {
            const videoId = videosData.data[0].id;
            const episodesRes = await apiRequest(`/episodes/video/${videoId}`);
            if (episodesRes.ok) {
                const episodesData = await episodesRes.json();
                let totalEpisodes = 0;
                episodesData.data.seasons.forEach(season => {
                    totalEpisodes += season.episodes.length;
                });
                document.getElementById('totalEpisodes').textContent = totalEpisodes;
            }
        }
        
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// Video Management
async function loadVideos() {
    try {
        const response = await apiRequest('/videos?limit=50');
        const data = await response.json();
        
        const tbody = document.getElementById('videosTableBody');
        tbody.innerHTML = data.data.map(video => `
            <tr>
                <td>${video.id}</td>
                <td><img src="${video.thumbnail || 'https://via.placeholder.com/50'}" class="table-image" alt="${video.title}"></td>
                <td><strong>${video.title}</strong></td>
                <td><span class="status-badge ${video.type === 'movie' ? 'status-active' : 'status-inactive'}">${video.type}</span></td>
                <td>${video.category_name || '-'}</td>
                <td>${video.is_premium ? '<span class="premium-badge">Premium</span>' : 'Free'}</td>
                <td>${video.views || 0}</td>
                <td><span class="status-badge status-${video.status}">${video.status}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="editVideo(${video.id})" style="padding: 6px 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteVideo(${video.id})" style="padding: 6px 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Load categories for video form
        loadCategoriesSelect('videoCategorySelect');
        
    } catch (error) {
        console.error('Load videos error:', error);
    }
}

function showAddVideoModal() {
    document.getElementById('addVideoModal').style.display = 'block';
}

// Add Video Form Handler
document.getElementById('addVideoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('addVideoModal');
            e.target.reset();
            loadVideos();
            showToast('Video added successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to add video', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Add video error:', error);
    }
});

async function deleteVideo(id) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        const response = await apiRequest(`/videos/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadVideos();
            showToast('Video deleted successfully!', 'success');
        } else {
            showToast('Failed to delete video', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Episode Management
async function loadEpisodes() {
    try {
        // Get videos first
        const videosResponse = await apiRequest('/videos?type=series');
        const videosData = await videosResponse.json();
        
        let allEpisodes = [];
        
        for (const video of videosData.data) {
            const episodesResponse = await apiRequest(`/episodes/video/${video.id}`);
            const episodesData = await episodesResponse.json();
            
            episodesData.data.seasons.forEach(season => {
                season.episodes.forEach(episode => {
                    allEpisodes.push({
                        ...episode,
                        video_title: video.title,
                        season_number: season.season_number
                    });
                });
            });
        }
        
        const tbody = document.getElementById('episodesTableBody');
        tbody.innerHTML = allEpisodes.map(episode => `
            <tr>
                <td>${episode.id}</td>
                <td>${episode.video_title}</td>
                <td>Season ${episode.season_number}</td>
                <td>Episode ${episode.episode_number}</td>
                <td><strong>${episode.title}</strong></td>
                <td>${episode.is_premium ? '<span class="premium-badge">Premium</span>' : 'Free'}</td>
                <td>${episode.views || 0}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editEpisode(${episode.id})" style="padding: 6px 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteEpisode(${episode.id})" style="padding: 6px 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Load series for episode forms
        loadSeriesSelect('episodeVideoSelect');
        loadSeriesSelect('seasonVideoSelect');
        
    } catch (error) {
        console.error('Load episodes error:', error);
    }
}

function showAddSeasonModal() {
    document.getElementById('addSeasonModal').style.display = 'block';
}

function showAddEpisodeModal() {
    document.getElementById('addEpisodeModal').style.display = 'block';
}

// Handle video selection change for seasons
document.getElementById('episodeVideoSelect').addEventListener('change', async (e) => {
    const videoId = e.target.value;
    if (!videoId) return;
    
    try {
        const response = await apiRequest(`/videos/${videoId}`);
        const videoData = await response.json();
        
        const seasonSelect = document.getElementById('episodeSeasonSelect');
        seasonSelect.innerHTML = '<option value="">Select Season</option>';
        
        videoData.data.seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.id;
            option.textContent = `Season ${season.season_number} - ${season.title}`;
            seasonSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Load seasons error:', error);
    }
});

// Add Season Form Handler
document.getElementById('addSeasonForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiRequest('/episodes/season', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addSeasonModal');
            e.target.reset();
            showToast('Season added successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to add season', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Add season error:', error);
    }
});

// Add Episode Form Handler
document.getElementById('addEpisodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/episodes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('addEpisodeModal');
            e.target.reset();
            loadEpisodes();
            showToast('Episode added successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to add episode', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Add episode error:', error);
    }
});

async function deleteEpisode(id) {
    if (!confirm('Are you sure you want to delete this episode?')) return;
    
    try {
        const response = await apiRequest(`/episodes/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadEpisodes();
            showToast('Episode deleted successfully!', 'success');
        } else {
            showToast('Failed to delete episode', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Categories Management
async function loadCategories() {
    try {
        const response = await apiRequest('/categories');
        const data = await response.json();
        
        const tbody = document.getElementById('categoriesTableBody');
        tbody.innerHTML = data.data.map(category => `
            <tr>
                <td>${category.id}</td>
                <td>${category.name}</td>
                <td>${category.slug}</td>
                <td>${category.video_count}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editCategory(${category.id})" style="padding: 6px 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteCategory(${category.id})" style="padding: 6px 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

function showAddCategoryModal() {
    document.getElementById('addCategoryModal').style.display = 'block';
}

// Add Category Form Handler
document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addCategoryModal');
            e.target.reset();
            loadCategories();
            showToast('Category added successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to add category', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Add category error:', error);
    }
});

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await apiRequest(`/categories/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadCategories();
            showToast('Category deleted successfully!', 'success');
        } else {
            showToast('Failed to delete category', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Ad Management
async function loadAds() {
    try {
        const [adsResponse, networksResponse] = await Promise.all([
            apiRequest('/ads'),
            apiRequest('/ads/networks')
        ]);
        
        const adsData = await adsResponse.json();
        const networksData = await networksResponse.json();
        
        const tbody = document.getElementById('adsTableBody');
        tbody.innerHTML = adsData.data.map(ad => `
            <tr>
                <td>${ad.id}</td>
                <td>${ad.name}</td>
                <td>${ad.network_name || 'Custom'}</td>
                <td><span class="status-badge status-${ad.ad_type.includes('roll') ? 'info' : 'active'}">${ad.ad_type}</span></td>
                <td>${ad.position || '-'}</td>
                <td>${ad.priority}</td>
                <td><span class="status-badge status-${ad.status}">${ad.status}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="editAd(${ad.id})" style="padding: 6px 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAd(${ad.id})" style="padding: 6px 12px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Load ad networks for form
        const networkSelect = document.getElementById('adNetworkSelect');
        networkSelect.innerHTML = '<option value="">Select Network</option>';
        networksData.data.forEach(network => {
            const option = document.createElement('option');
            option.value = network.id;
            option.textContent = network.name;
            networkSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Load ads error:', error);
    }
}

function showAddAdModal() {
    document.getElementById('addAdModal').style.display = 'block';
}

// Add Ad Form Handler
document.getElementById('addAdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await apiRequest('/ads', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addAdModal');
            e.target.reset();
            loadAds();
            showToast('Advertisement added successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to add advertisement', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Add ad error:', error);
    }
});

async function deleteAd(id) {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
        const response = await apiRequest(`/ads/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadAds();
            showToast('Advertisement deleted successfully!', 'success');
        } else {
            showToast('Failed to delete advertisement', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Database Management
async function loadDatabaseStatus() {
    const statusDiv = document.getElementById('databaseStatus');
    
    try {
        const response = await apiRequest('/database/status');
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = `
                <h3>Database Status: Connected</h3>
                <p>Database: ${data.data.database}</p>
                <h4>Tables:</h4>
                <ul>
                    ${data.data.tables.map(table => `<li>${table.TABLE_NAME}: ${table.TABLE_ROWS} rows</li>`).join('')}
                </ul>
            `;
        } else {
            statusDiv.innerHTML = `<p class="error">Database not connected. Click "Install Database" to setup.</p>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<p class="error">Database connection error: ${error.message}</p>`;
    }
}

async function installDatabase() {
    if (!confirm('This will create all necessary database tables. Continue?')) return;
    
    try {
        const response = await apiRequest('/database/install', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showToast('Database installed successfully!', 'success');
            loadDatabaseStatus();
        } else {
            showToast(data.error || 'Database installation failed', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
        console.error('Install database error:', error);
    }
}

async function testConnection() {
    try {
        const response = await apiRequest('/database/test');
        const data = await response.json();
        
        if (data.success) {
            showToast('Database connection successful!', 'success');
            loadDatabaseStatus();
        } else {
            showToast('Database connection failed', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
}

// Helper Functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

async function loadCategoriesSelect(selectId) {
    try {
        const response = await apiRequest('/categories');
        const data = await response.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Category</option>';
        
        data.data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

async function loadSeriesSelect(selectId) {
    try {
        const response = await apiRequest('/videos?type=series');
        const data = await response.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Series</option>';
        
        data.data.forEach(video => {
            const option = document.createElement('option');
            option.value = video.id;
            option.textContent = video.title;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Load series error:', error);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Placeholder functions for edit
c function editVideo(id) {
    showToast('Edit functionality - Coming soon!', 'info');
}

function editEpisode(id) {
    showToast('Edit functionality - Coming soon!', 'info');
}

function editCategory(id) {
    showToast('Edit functionality - Coming soon!', 'info');
}

function editAd(id) {
    showToast('Edit functionality - Coming soon!', 'info');
}