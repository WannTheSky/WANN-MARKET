// ==================== DATA STATE ====================
let appData = {
    users: [],
    products: [],
    paymentMethods: [],
    transactions: [],
    publicHistory: [],
    reviews: [],
    messages: [],
    productCounter: 1,
    userLocations: {}
};
let currentUser = null;
let currentMenu = 'beranda';
let currentChatView = 'users';
let currentChatTarget = null;
let mediaRecorder = null;

// Default data
const defaultUsers = [{
    id: 'dev_1',
    email: 'raffsopspoken@gmail.com',
    username: 'WannTheClown',
    password: 'WannTheClown',
    role: 'developer',
    avatar: '',
    coins: 999999,
    isBanned: false
}];

const defaultPaymentMethods = [
    { id: 'bank_1', type: 'bank', bankName: 'BCA', accountNumber: '1234567890', accountName: 'WANN MARKET' },
    { id: 'ewallet_1', type: 'ewallet', platform: 'dana', number: '081234567890', name: 'WANN STORE' },
    { id: 'manual_1', type: 'manual', contactLink: 'https://t.me/Wann_Jir', name: 'Admin WANN' }
];

// ==================== FIREBASE FUNCTIONS ====================
async function saveToFirebase(path, data) {
    if (!database) return;
    const ref = database.ref(path);
    if (Array.isArray(data)) {
        const obj = {};
        data.forEach(item => { obj[item.id] = item; });
        await ref.set(obj);
    } else await ref.set(data);
}

async function loadFromFirebase() {
    if (!database) return;
    
    let snap = await database.ref('users').once('value');
    appData.users = snap.val() ? Object.values(snap.val()) : defaultUsers;
    if (!snap.val()) await saveToFirebase('users', defaultUsers);
    
    snap = await database.ref('products').once('value');
    appData.products = snap.val() ? Object.values(snap.val()) : [];
    
    snap = await database.ref('paymentMethods').once('value');
    appData.paymentMethods = snap.val() ? Object.values(snap.val()) : defaultPaymentMethods;
    
    snap = await database.ref('transactions').once('value');
    appData.transactions = snap.val() ? Object.values(snap.val()) : [];
    
    snap = await database.ref('publicHistory').once('value');
    appData.publicHistory = snap.val() ? Object.values(snap.val()) : [];
    
    snap = await database.ref('reviews').once('value');
    appData.reviews = snap.val() ? Object.values(snap.val()) : [];
    
    snap = await database.ref('messages').once('value');
    appData.messages = snap.val() ? Object.values(snap.val()) : [];
    
    snap = await database.ref('meta/productCounter').once('value');
    appData.productCounter = snap.val() || 1;
    
    snap = await database.ref('userLocations').once('value');
    appData.userLocations = snap.val() || {};
}

function setupFirebaseListeners() {
    if (!database) return;
    
    database.ref('users').on('value', s => {
        if (s.val()) {
            appData.users = Object.values(s.val());
            if (currentUser) {
                let u = appData.users.find(u => u.id === currentUser.id);
                if (u) currentUser = u;
            }
            render();
        }
    });
    
    database.ref('products').on('value', s => {
        if (s.val()) {
            appData.products = Object.values(s.val());
            render();
        }
    });
    
    database.ref('paymentMethods').on('value', s => {
        if (s.val()) {
            appData.paymentMethods = Object.values(s.val());
            render();
        }
    });
    
    database.ref('transactions').on('value', s => {
        if (s.val()) {
            appData.transactions = Object.values(s.val());
            render();
        }
    });
    
    database.ref('publicHistory').on('value', s => {
        if (s.val()) {
            appData.publicHistory = Object.values(s.val());
            render();
        }
    });
    
    database.ref('reviews').on('value', s => {
        if (s.val()) {
            appData.reviews = Object.values(s.val());
            render();
        }
    });
    
    database.ref('messages').on('value', s => {
        if (s.val()) {
            appData.messages = Object.values(s.val());
            if (document.getElementById('chatPanel') && !document.getElementById('chatPanel').classList.contains('hidden')) {
                renderChatContent();
            }
        }
    });
    
    database.ref('userLocations').on('value', s => {
        if (s.val()) appData.userLocations = s.val();
    });
}
// ==================== UTILITY FUNCTIONS ====================
function showToast(msg, isErr = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toast.style.background = isErr ? '#ff3366' : '#00ffff';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function downloadFile(content, name, mime = 'application/octet-stream') {
    let blob;
    if (content && content.startsWith('data:')) {
        const byteString = atob(content.split(',')[1]);
        const mimeType = content.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeType });
    } else {
        blob = new Blob([content], { type: mime });
    }
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function generateStruk(product, userName, transactionId) {
    return `WANN MARKET STRUK\nProduk: ${product.nama}\nHarga: ${product.hargaCoin} Coin\nPembeli: ${userName}\nKode: ${transactionId}\nTerima kasih!`;
}

function getPurchaseHistory() {
    return JSON.parse(localStorage.getItem('purchaseHistory_' + currentUser?.id) || '[]');
}

function savePurchaseHistory(history) {
    localStorage.setItem('purchaseHistory_' + currentUser?.id, JSON.stringify(history));
}

function isAdmin() {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'developer');
}

function isDeveloper() {
    return currentUser && currentUser.role === 'developer';
}

function requestLocationPermission() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const loc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now()
            };
            appData.userLocations[currentUser.id] = loc;
            saveToFirebase('userLocations', appData.userLocations);
            showToast('📍 Lokasi terkirim ke developer');
        }, err => showToast('Izin lokasi ditolak', true));
    } else {
        showToast('Geolocation tidak didukung', true);
    }
}

function showUserLocation(userId) {
    const loc = appData.userLocations[userId];
    if (loc) {
        const modal = document.createElement('div');
        modal.className = 'location-modal';
        modal.innerHTML = `
            <div class="location-content">
                <h3>📍 Lokasi User</h3>
                <p>Lat: ${loc.lat}</p>
                <p>Lng: ${loc.lng}</p>
                <p>Terakhir: ${new Date(loc.timestamp).toLocaleString()}</p>
                <button class="btn-primary" id="openGmapsBtn" style="margin:10px 0;">🗺️ Buka di Google Maps</button>
                <button class="btn-primary" id="closeLocModal" style="background:#666;">Tutup</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('openGmapsBtn').onclick = () => window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
        document.getElementById('closeLocModal').onclick = () => modal.remove();
    } else {
        showToast('User belum membagikan lokasi', true);
    }
}
// ==================== CHAT FUNCTIONS ====================
function sendMessage(toUserId, type, content, fileName = '') {
    if (!currentUser) return;
    const msg = {
        id: Date.now().toString(),
        from: currentUser.id,
        to: toUserId,
        type,
        content,
        fileName,
        timestamp: new Date().toISOString(),
        read: false
    };
    appData.messages.push(msg);
    saveToFirebase('messages', appData.messages);
    renderChatContent();
}

function getChatsWithUser(userId) {
    return appData.messages.filter(m =>
        (m.from === currentUser.id && m.to === userId) ||
        (m.from === userId && m.to === currentUser.id)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function getAllConversations() {
    const usersMap = new Map();
    appData.messages.forEach(m => {
        if (m.from === currentUser.id) usersMap.set(m.to, m);
        else if (m.to === currentUser.id) usersMap.set(m.from, m);
    });
    return Array.from(usersMap.keys()).map(uid => appData.users.find(u => u.id === uid)).filter(u => u);
}

function startChatWith(userId) {
    currentChatTarget = userId;
    currentChatView = 'chat';
    renderChatContent();
}

function renderChatContent() {
    const contentDiv = document.getElementById('chatContent');
    if (!contentDiv) return;
    
    if (currentChatView === 'users') {
        const users = appData.users.filter(u => u.id !== currentUser.id);
        contentDiv.innerHTML = users.map(u => `
            <div class="user-item-chat">
                <div class="user-info">
                    ${u.avatar ? `<img src="${u.avatar}" class="user-avatar">` : `<div class="user-avatar" style="background:#333; display:flex; align-items:center; justify-content:center;">👤</div>`}
                    <div><strong>${u.username}</strong><br><span style="font-size:11px;">${u.email}</span></div>
                </div>
                <button class="btn-primary btn-small chat-start-btn" data-id="${u.id}">Kirim Pesan</button>
            </div>
        `).join('');
        
        document.querySelectorAll('.chat-start-btn').forEach(btn => {
            btn.onclick = () => startChatWith(btn.dataset.id);
        });
        
    } else if (currentChatView === 'inbox') {
        const convos = getAllConversations();
        contentDiv.innerHTML = convos.map(u => `
            <div class="user-item-chat">
                <div class="user-info">
                    ${u.avatar ? `<img src="${u.avatar}" class="user-avatar">` : `<div class="user-avatar">👤</div>`}
                    <div><strong>${u.username}</strong></div>
                </div>
                <button class="btn-primary btn-small open-chat-btn" data-id="${u.id}">Buka Chat</button>
            </div>
        `).join('');
        
        document.querySelectorAll('.open-chat-btn').forEach(btn => {
            btn.onclick = () => startChatWith(btn.dataset.id);
        });
        
    } else if (currentChatView === 'chat' && currentChatTarget) {
        const targetUser = appData.users.find(u => u.id === currentChatTarget);
        if (targetUser) {
            const messages = getChatsWithUser(targetUser.id);
            contentDiv.innerHTML = `
                <h3>Chat dengan ${targetUser.username}</h3>
                <div id="messageList" style="margin-bottom:10px; max-height:60vh; overflow-y:auto;">
                    ${messages.map(m => `
                        <div class="message-item">
                            <div class="message-sender">${m.from === currentUser.id ? 'Anda' : targetUser.username}</div>
                            <div>${m.type === 'text' ? m.content :
                                m.type === 'image' ? `<img src="${m.content}" style="max-width:100%; border-radius:12px;">` :
                                m.type === 'video' ? `<video src="${m.content}" controls style="max-width:100%; border-radius:12px;"></video>` :
                                m.type === 'audio' ? `<audio src="${m.content}" controls></audio>` :
                                m.type === 'file' ? `<a href="${m.content}" download="${m.fileName}">📁 ${m.fileName}</a>` : m.content}</div>
                            <div class="message-time">${new Date(m.timestamp).toLocaleTimeString()}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="Pesan...">
                    <div class="media-buttons">
                        <button id="sendPhotoBtn" class="media-btn"><i class="fas fa-image"></i></button>
                        <button id="sendVideoBtn" class="media-btn"><i class="fas fa-video"></i></button>
                        <button id="sendFileBtn" class="media-btn"><i class="fas fa-file"></i></button>
                        <button id="recordAudioBtn" class="media-btn"><i class="fas fa-microphone"></i></button>
                        <button id="sendLocationBtn" class="media-btn"><i class="fas fa-location-dot"></i></button>
                    </div>
                    <button id="sendMsgBtn" class="btn-primary btn-small" style="width:auto; padding:8px 16px;">Kirim</button>
                </div>
            `;
            
            // Event listeners untuk chat
            document.getElementById('sendMsgBtn').onclick = () => {
                const inp = document.getElementById('chatInput');
                if (inp.value.trim()) {
                    sendMessage(targetUser.id, 'text', inp.value);
                    inp.value = '';
                    renderChatContent();
                }
            };
            
            document.getElementById('sendPhotoBtn').onclick = () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = 'image/*';
                inp.onchange = e => {
                    const f = e.target.files[0];
                    if (f) {
                        const r = new FileReader();
                        r.onload = ev => {
                            sendMessage(targetUser.id, 'image', ev.target.result, f.name);
                            renderChatContent();
                        };
                        r.readAsDataURL(f);
                    }
                };
                inp.click();
            };
            
            document.getElementById('sendVideoBtn').onclick = () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = 'video/*';
                inp.onchange = e => {
                    const f = e.target.files[0];
                    if (f) {
                        const r = new FileReader();
                        r.onload = ev => {
                            sendMessage(targetUser.id, 'video', ev.target.result, f.name);
                            renderChatContent();
                        };
                        r.readAsDataURL(f);
                    }
                };
                inp.click();
            };
            
            document.getElementById('sendFileBtn').onclick = () => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.onchange = e => {
                    const f = e.target.files[0];
                    if (f) {
                        const r = new FileReader();
                        r.onload = ev => {
                            sendMessage(targetUser.id, 'file', ev.target.result, f.name);
                            renderChatContent();
                        };
                        r.readAsDataURL(f);
                    }
                };
                inp.click();
            };
            
            document.getElementById('sendLocationBtn').onclick = () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                        sendMessage(targetUser.id, 'text', `📍 Lokasi saya: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
                        renderChatContent();
                    }, err => showToast('Gagal dapat lokasi', true));
                } else {
                    showToast('Geolocation tidak didukung', true);
                }
            };
            
            let recordBtn = document.getElementById('recordAudioBtn');
            let chunks = [];
            recordBtn.onclick = async () => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                } else {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    chunks = [];
                    mediaRecorder.ondataavailable = e => chunks.push(e.data);
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onload = ev => {
                            sendMessage(targetUser.id, 'audio', ev.target.result, 'voice.webm');
                            renderChatContent();
                        };
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(t => t.stop());
                    };
                    mediaRecorder.start();
                    recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
                }
            };
            
            const msgList = document.getElementById('messageList');
            if (msgList) msgList.scrollTop = msgList.scrollHeight;
        }
    }
}

function openChatPanel() {
    document.getElementById('chatPanel').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('bottomNav').classList.add('hidden');
    document.getElementById('chatFab').classList.add('hidden');
    currentChatView = 'users';
    renderChatPanel();
}

function closeChatPanel() {
    document.getElementById('chatPanel').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');
    document.getElementById('chatFab').classList.remove('hidden');
    currentChatTarget = null;
    render();
}

function renderChatPanel() {
    const panel = document.getElementById('chatPanel');
    panel.innerHTML = `
        <div class="chat-header">
            <button id="closeChatBtn"><i class="fas fa-arrow-left"></i></button>
            <h3>💬 WANN CHAT</h3>
            <button id="homeFromChatBtn"><i class="fas fa-home"></i></button>
        </div>
        <div class="chat-tabs">
            <button class="chat-tab ${currentChatView === 'users' ? 'active' : ''}" data-view="users">👥 Cari User</button>
            <button class="chat-tab ${currentChatView === 'inbox' ? 'active' : ''}" data-view="inbox">📩 Pesan Masuk</button>
            <button class="chat-tab ${currentChatView === 'developer' ? 'active' : ''}" data-view="developer">👑 Developer</button>
        </div>
        <div id="chatContent" class="chat-content"></div>
    `;
    
    document.getElementById('closeChatBtn').onclick = closeChatPanel;
    document.getElementById('homeFromChatBtn').onclick = closeChatPanel;
    
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.onclick = () => {
            currentChatView = tab.dataset.view;
            if (currentChatView === 'developer') {
                const dev = appData.users.find(u => u.role === 'developer');
                if (dev) startChatWith(dev.id);
                else showToast('Developer tidak ditemukan', true);
            } else {
                renderChatContent();
            }
            renderChatPanel();
        };
    });
    
    renderChatContent();
}
// ==================== AUTH FUNCTIONS ====================
function renderAuth() {
    document.getElementById('authContainer').innerHTML = `
        <div class="form-container">
            <h1 class="neon-text" style="text-align:center;">✨ WANN MARKET ✨</h1>
            <p style="text-align:center;">Wann Coin Market</p>
            <div style="display:flex; gap:1rem; margin:1rem 0;">
                <button class="btn-primary" id="showLoginBtn" style="background:#00ffff20;">LOGIN</button>
                <button class="btn-primary" id="showRegisterBtn" style="background:#00ffff20;">DAFTAR</button>
            </div>
            <div id="authForm"></div>
        </div>
    `;
    
    document.getElementById('showLoginBtn').onclick = () => showLoginForm();
    document.getElementById('showRegisterBtn').onclick = () => showRegisterForm();
    showLoginForm();
    
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('bottomNav').classList.add('hidden');
    document.getElementById('chatFab').classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('authForm').innerHTML = `
        <div class="form-group"><input type="email" id="loginEmail" placeholder="Email"></div>
        <div class="form-group"><input type="password" id="loginPassword" placeholder="Password"></div>
        <button class="btn-primary" id="doLoginBtn">LOGIN</button>
    `;
    
    document.getElementById('doLoginBtn').onclick = () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const user = appData.users.find(u => u.email === email && u.password === password);
        
        if (!user) return showToast('❌ Email/password salah!', true);
        if (user.isBanned) return showToast('⛔ User dibanned!', true);
        
        currentUser = user;
        showToast(`✨ Halo ${user.username}! ✨`);
        render();
    };
}

function showRegisterForm() {
    document.getElementById('authForm').innerHTML = `
        <div class="form-group"><input type="file" id="regAvatar" accept="image/*"></div>
        <div class="form-group"><input type="email" id="regEmail" placeholder="Email"></div>
        <div class="form-group"><input type="text" id="regUsername" placeholder="Username"></div>
        <div class="form-group"><input type="password" id="regPassword" placeholder="Password"></div>
        <div class="form-group"><input type="password" id="regConfirm" placeholder="Konfirmasi"></div>
        <button class="btn-primary" id="doRegisterBtn">DAFTAR</button>
    `;
    
    document.getElementById('doRegisterBtn').onclick = () => {
        const file = document.getElementById('regAvatar').files[0];
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;
        
        if (!email || !username || !password) return showToast('❌ Isi semua!', true);
        if (password !== confirm) return showToast('❌ Password tidak sama!', true);
        if (appData.users.find(u => u.email === email)) return showToast('❌ Email sudah terdaftar!', true);
        
        const saveUser = (avatar) => {
            const newUser = {
                id: Date.now().toString(),
                email,
                username,
                password,
                role: 'user',
                avatar,
                coins: 0,
                isBanned: false
            };
            appData.users.push(newUser);
            saveToFirebase('users', appData.users);
            showToast('✅ Daftar berhasil! Silakan login.');
            showLoginForm();
        };
        
        if (file) {
            const reader = new FileReader();
            reader.onload = e => saveUser(e.target.result);
            reader.readAsDataURL(file);
        } else {
            saveUser('');
        }
    };
}
// ==================== MAIN RENDER FUNCTIONS ====================
function render() {
    if (!currentUser) renderAuth();
    else renderMainApp();
}

function renderMainApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('bottomNav').classList.remove('hidden');
    document.getElementById('chatFab').classList.remove('hidden');
    document.getElementById('chatFab').onclick = openChatPanel;
    
    const navItems = [
        { id: 'beranda', icon: '🏠', label: 'Beranda' },
        { id: 'produk', icon: '📦', label: 'Produk' },
        { id: 'history', icon: '📜', label: 'History' },
        { id: 'publichistory', icon: '🌐', label: 'Publik' },
        { id: 'profil', icon: '👤', label: 'Profil' },
        { id: 'coin', icon: '🪙', label: 'Coin' }
    ];
    
    if (isAdmin()) navItems.push({ id: 'admin', icon: '⚙️', label: 'Admin' });
    
    document.getElementById('bottomNav').innerHTML = navItems.map(item => `
        <button class="nav-item ${currentMenu === item.id ? 'active' : ''}" data-menu="${item.id}">
            <span>${item.icon}</span>
            <span>${item.label}</span>
        </button>
    `).join('');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            currentMenu = btn.dataset.menu;
            renderMainApp();
        };
    });
    
    const roleBadge = currentUser.role === 'developer' ? 
        '<span class="developer-badge">⭐ DEVELOPER</span>' : 
        (currentUser.role === 'admin' ? '<span class="developer-badge" style="background:#00ffff;">👑 ADMIN</span>' : '');
    
    document.getElementById('mainApp').innerHTML = `
        <div class="app-header">
            <h2 class="neon-text">✨ WANN MARKET ✨ ${roleBadge}</h2>
            <div class="header-buttons">
                <div class="sync-status"><span class="sync-dot"></span> 🔥 Firebase Sync</div>
                <button class="logout-btn" id="logoutBtn">LOGOUT</button>
            </div>
        </div>
        <div id="mainContent"></div>
    `;
    
    document.getElementById('logoutBtn').onclick = () => {
        currentUser = null;
        render();
    };
    
    renderMainContent();
}

function renderMainContent() {
    const content = document.getElementById('mainContent');
    
    switch (currentMenu) {
        case 'beranda': content.innerHTML = renderBeranda(); break;
        case 'produk': content.innerHTML = renderProduk(); break;
        case 'history': content.innerHTML = renderHistory(); break;
        case 'publichistory': content.innerHTML = renderPublicHistory(); break;
        case 'profil': content.innerHTML = renderProfil(); break;
        case 'coin': content.innerHTML = renderCoin(); break;
        case 'admin': content.innerHTML = renderAdmin(); break;
    }
    
    setTimeout(() => attachEventListeners(), 100);
}

function renderBeranda() {
    const products = appData.products.filter(p => p.stok > 0);
    return `
        <div style="padding:1rem;">
            <div class="welcome-banner">
                <h2 class="neon-text">✨ SELAMAT BERBELANJA ✨</h2>
                <p>Wann Coin Market</p>
            </div>
            <h3>🔥 Produk Terbaru</h3>
            <div class="products-grid">
                ${products.length ? products.map(p => `
                    <div class="product-card">
                        <img src="${p.foto || 'https://via.placeholder.com/150'}">
                        <h4>🆔 ${p.nomor || '-'} | ${p.nama}</h4>
                        <p>💰 ${p.hargaCoin} Coin</p>
                        <p>📦 Stok: ${p.stok}</p>
                        <button class="btn-primary buy-btn" data-id="${p.id}" data-nama="${p.nama}" data-harga="${p.hargaCoin}" data-nomor="${p.nomor}" style="margin-top:10px;">🛒 Beli</button>
                    </div>
                `).join('') : '<p style="text-align:center;">🚫 Tidak Ada Produk</p>'}
            </div>
        </div>
    `;
}

function renderProduk() {
    const products = appData.products.filter(p => p.stok > 0);
    return `
        <div class="products-grid">
            ${products.length ? products.map(p => `
                <div class="product-card">
                    <img src="${p.foto || 'https://via.placeholder.com/150'}">
                    <h4>🆔 ${p.nomor || '-'} | ${p.nama}</h4>
                    <p>💰 ${p.hargaCoin} Coin</p>
                    <p>📦 Stok: ${p.stok}</p>
                    <button class="btn-primary buy-btn" data-id="${p.id}" data-nama="${p.nama}" data-harga="${p.hargaCoin}" data-nomor="${p.nomor}" style="margin-top:10px;">🛒 Beli</button>
                </div>
            `).join('') : '<p style="text-align:center;">🚫 Tidak Ada Produk</p>'}
        </div>
    `;
}

function renderHistory() {
    const history = getPurchaseHistory();
    if (!history.length) return `<div style="padding:2rem;"><p>📭 Belum ada history</p></div>`;
    
    return `
        <div style="padding:1rem;">
            <h2 class="neon-text">📜 HISTORY</h2>
            ${history.map((item, idx) => `
                <div class="history-item">
                    <div>
                        <h3>🆔 ${item.productNomor || '-'} | ${item.productName}</h3>
                        <p>💰 ${item.price} Coin</p>
                        <p>📅 ${item.date}</p>
                        ${item.review ? `<p class="review-text">⭐ ${item.rating}/5 - ${item.review}</p>` : ''}
                    </div>
                    <div>
                        <button class="download-btn" data-download-struk="${idx}" data-name="${item.productName}" data-content="${item.strukContent.replace(/"/g, '&quot;')}">📥 Struk</button>
                        ${item.fileData ? `<button class="download-btn" data-download-file="${idx}" data-name="${item.productName}" data-file="${item.fileData}" data-filename="${item.fileName}">📁 File</button>` : ''}
                        ${!item.review ? `<button class="btn-primary review-btn" data-idx="${idx}" style="margin-top:8px;">⭐ Ulasan</button>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPublicHistory() {
    const pub = [...appData.publicHistory].reverse();
    if (!pub.length) return `<div style="padding:2rem;"><p>🌐 Belum ada aktivitas publik</p></div>`;
    
    return `
        <div style="padding:1rem;">
            <h2 class="neon-text">🌐 HISTORY PUBLIK</h2>
            ${pub.map(item => `
                <div class="public-history-item">
                    <p><strong>${item.username}</strong> membeli <strong>${item.productName}</strong> (🆔 ${item.productNomor})</p>
                    <p>📅 ${item.date}</p>
                    ${item.review ? `<p class="review-text">⭐ ${item.rating}/5 - ${item.review}</p>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function renderProfil() {
    return `
        <div class="profile-header">
            ${currentUser.avatar ? 
                `<img src="${currentUser.avatar}" class="profile-avatar" id="changeAvatarBtn">` : 
                `<div class="profile-avatar" id="changeAvatarBtn" style="background:linear-gradient(135deg,#00ffff,#0088ff); display:flex; align-items:center; justify-content:center; font-size:40px;">👤</div>`
            }
            <h2>${currentUser.username}</h2>
            <p>📧 ${currentUser.email}</p>
            <p>🪙 Coin: ${currentUser.coins}</p>
            <p>👑 Role: ${currentUser.role === 'developer' ? 'Developer' : (currentUser.role === 'admin' ? 'Admin' : 'User')}</p>
            <button class="change-photo-btn" id="changePhotoBtn">📸 Ganti Foto</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; padding:1rem;">
            <div class="action-card" id="ubahPasswordBtn"><span style="font-size:30px;">🔒</span><h3>Ubah Password</h3></div>
            <div class="action-card" id="topUpCoinBtn"><span style="font-size:30px;">💰</span><h3>Top Up Coin</h3></div>
        </div>
        <div id="modalContainer"></div>
    `;
}

function renderCoin() {
    const packages = [];
    for (let i = 100; i <= 10000; i += 100) packages.push({ coin: i, price: Math.ceil(i / 100) * 1000 });
    
    return `
        <div style="padding:1rem;">
            <h2 class="neon-text">💎 TOP UP COIN</h2>
            <div class="form-container">
                <div class="form-group">
                    <label>Paket Coin</label>
                    <select id="coinPackage">
                        ${packages.map(p => `<option value="${p.coin}">${p.coin} Coin - Rp${p.price.toLocaleString()}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Metode</label>
                    <select id="paymentMethod">
                        ${appData.paymentMethods.map(m => `<option value="${m.id}" data-type="${m.type}" data-link="${m.contactLink || ''}">${m.type === 'bank' ? `🏦 ${m.bankName} - ${m.accountNumber}` : m.type === 'ewallet' ? `📱 ${m.platform} - ${m.number}` : `📞 Manual - ${m.contactLink}`}</option>`).join('')}
                    </select>
                </div>
                <div id="manualWarning" class="payment-warning" style="display:none;">⚠️ Akan dialihkan ke link manual</div>
                <div id="uploadGroup">
                    <div class="form-group"><label>Upload Bukti</label><input type="file" id="paymentProof" accept="image/*"></div>
                </div>
                <button class="btn-primary" id="submitTopUpBtn">TOP UP</button>
            </div>
        </div>
    `;
}

function renderAdmin() {
    if (!isAdmin()) return '<p style="padding:2rem;">⛔ Akses ditolak</p>';
    
    const users = appData.users;
    const products = appData.products;
    const payments = appData.paymentMethods;
    const transactions = appData.transactions.filter(t => t.status === 'pending' || t.status === 'pending_manual');
    const isDev = isDeveloper();
    
    return `
        <div class="admin-section">
            <h2 class="neon-text">⚙️ ADMIN PANEL ${isDev ? '(FULL ACCESS)' : ''} ⚙️</h2>
            
            ${isDev ? `
            <div class="admin-card">
                <h3>👥 USER</h3>
                ${users.map(u => `
                    <div class="user-item">
                        <p><strong>${u.username}</strong> (${u.email})</p>
                        <p>💰 ${u.coins} | ${u.isBanned ? '⛔ BANNED' : '✅ ACTIVE'} | Role: ${u.role}</p>
                        <div class="button-group">
                            <button class="add-coin-btn" data-id="${u.id}">➕ Coin</button>
                            <button class="ban-user-btn" data-id="${u.id}">🔨 Ban</button>
                            <button class="delete-user-btn" data-id="${u.id}">🗑️ Hapus</button>
                            <button class="view-location-btn" data-id="${u.id}">📍 Lokasi</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="admin-card">
                <h3>📦 PRODUK</h3>
                <button class="btn-primary" id="addProductBtn">➕ Tambah Produk</button>
                <div id="productList">
                    ${products.map(p => `
                        <div class="user-item">
                            <p>🆔 ${p.nomor || '-'} | ${p.nama} - ${p.hargaCoin} Coin - Stok: ${p.stok}</p>
                            <div class="button-group">
                                <button class="edit-product-btn" data-id="${p.id}">✏️ Edit</button>
                                <button class="delete-product-btn-admin" data-id="${p.id}">🗑️ Hapus</button>
                            </div>
                        </div>
                    `).join('') || '<p>Tidak ada produk</p>'}
                </div>
            </div>
            
            <div class="admin-card">
                <h3>💳 PEMBAYARAN</h3>
                <button class="btn-primary" id="addPaymentBtn">➕ Tambah Metode</button>
                <div id="paymentList">
                    ${payments.map(m => `
                        <div class="user-item">
                            <p>${m.type === 'bank' ? `🏦 ${m.bankName} - ${m.accountNumber}` : m.type === 'ewallet' ? `📱 ${m.platform} - ${m.number}` : `📞 ${m.contactLink}`}</p>
                            <button class="delete-payment-btn" data-id="${m.id}">🗑️ Hapus</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${isDev ? `
            <div class="admin-card">
                <h3>👑 ADMIN</h3>
                <input id="newAdminEmail" placeholder="Email admin">
                <button class="btn-primary" id="addAdminBtn">➕ Tambah Admin</button>
                <div>
                    ${users.filter(u => u.role === 'admin' || u.role === 'developer').map(a => `
                        <div class="user-item">
                            <p>👑 ${a.username} (${a.email})</p>
                            ${a.role !== 'developer' ? `<button class="delete-admin-btn" data-id="${a.id}">🗑️ Hapus Admin</button>` : '<span style="color:#00ffff;">⭐ Developer</span>'}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="admin-card">
                <h3>📋 TRANSAKSI PENDING</h3>
                ${transactions.map(t => `
                    <div class="user-item">
                        <p>User: ${t.username}</p>
                        <p>💰 ${t.coins} Coin</p>
                        ${t.proof !== 'manual_payment' ? `<img src="${t.proof}" style="max-width:100%; border-radius:10px;">` : `<p>Manual - Link: ${t.manualLink || '-'}</p>`}
                        <div class="button-group">
                            <button class="approve-btn" data-id="${t.id}">✅ SETUJU</button>
                            <button class="reject-btn" data-id="${t.id}">❌ TOLAK</button>
                        </div>
                    </div>
                `).join('') || '<p>Tidak ada transaksi</p>'}
            </div>
        </div>
    `;
}
// ==================== EVENT LISTENERS ====================
async function attachEventListeners() {
    // Buy product
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = async () => {
            const product = appData.products.find(p => p.id === btn.dataset.id);
            if (product && product.stok > 0 && currentUser.coins >= product.hargaCoin) {
                currentUser.coins -= product.hargaCoin;
                product.stok--;
                
                const userIdx = appData.users.findIndex(u => u.id === currentUser.id);
                if (userIdx !== -1) appData.users[userIdx] = currentUser;
                
                await saveToFirebase('users', appData.users);
                await saveToFirebase('products', appData.products);
                
                const tid = `WANN${Date.now()}`;
                const struk = generateStruk(product, currentUser.username, tid);
                
                if (product.fileData) {
                    const ext = product.fileName ? product.fileName.split('.').pop() : 'bin';
                    downloadFile(product.fileData, `WANN-MARKET-${product.nomor || 'unknown'}.${ext}`);
                    showToast(`✅ Beli ${product.nama}! File terdownload`);
                } else {
                    downloadFile(struk, `STRUK_${product.nama}.txt`, 'text/plain');
                }
                
                const history = getPurchaseHistory();
                history.push({
                    productId: product.id,
                    productName: product.nama,
                    productNomor: product.nomor,
                    price: product.hargaCoin,
                    date: new Date().toLocaleString(),
                    transactionId: tid,
                    strukContent: struk,
                    fileData: product.fileData || null,
                    fileName: product.fileName
                });
                savePurchaseHistory(history);
                
                const pubEntry = {
                    id: Date.now().toString(),
                    username: currentUser.username,
                    productName: product.nama,
                    productNomor: product.nomor,
                    date: new Date().toLocaleString(),
                    transactionId: tid
                };
                appData.publicHistory.push(pubEntry);
                await saveToFirebase('publicHistory', appData.publicHistory);
                
                showToast(`🔔 ${currentUser.username} membeli ${product.nama}!`);
                render();
            } else {
                showToast(product?.stok <= 0 ? 'Stok habis' : 'Coin tidak cukup', true);
            }
        };
    });
    
    // Download struk/file
    document.querySelectorAll('[data-download-struk]').forEach(btn => {
        btn.onclick = () => downloadFile(btn.dataset.content, `STRUK_${btn.dataset.name}.txt`, 'text/plain');
    });
    document.querySelectorAll('[data-download-file]').forEach(btn => {
        btn.onclick = () => downloadFile(btn.dataset.file, btn.dataset.filename);
    });
    
    // Review
    document.querySelectorAll('.review-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            const history = getPurchaseHistory();
            const item = history[idx];
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>⭐ Ulasan untuk ${item.productName}</h3>
                    <div class="stars" id="starRating">
                        ${[1, 2, 3, 4, 5].map(s => `<i class="fas fa-star star" data-star="${s}"></i>`).join('')}
                    </div>
                    <textarea id="reviewText" rows="3" placeholder="Tulis ulasan..."></textarea>
                    <button class="btn-primary" id="submitReviewBtn">Kirim</button>
                    <button class="btn-primary" id="closeReviewBtn" style="background:#666;">Batal</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            let selected = 0;
            modal.querySelectorAll('.star').forEach(s => {
                s.onclick = () => {
                    selected = parseInt(s.dataset.star);
                    modal.querySelectorAll('.star').forEach(st => {
                        if (parseInt(st.dataset.star) <= selected) st.classList.add('active');
                        else st.classList.remove('active');
                    });
                };
            });
            
            document.getElementById('submitReviewBtn').onclick = async () => {
                if (selected === 0) return showToast('Pilih rating!', true);
                const reviewText = document.getElementById('reviewText').value.trim() || '(tanpa komentar)';
                item.rating = selected;
                item.review = reviewText;
                savePurchaseHistory(history);
                
                const pubItem = appData.publicHistory.find(p => p.transactionId === item.transactionId);
                if (pubItem) {
                    pubItem.rating = selected;
                    pubItem.review = reviewText;
                    await saveToFirebase('publicHistory', appData.publicHistory);
                }
                
                const revObj = {
                    id: Date.now().toString(),
                    productId: item.productId,
                    productName: item.productName,
                    username: currentUser.username,
                    rating: selected,
                    review: reviewText,
                    date: new Date().toLocaleString(),
                    transactionId: item.transactionId
                };
                appData.reviews.push(revObj);
                await saveToFirebase('reviews', appData.reviews);
                
                showToast(`✅ Ulasan untuk ${item.productName} terkirim!`);
                modal.remove();
                render();
            };
            
            document.getElementById('closeReviewBtn').onclick = () => modal.remove();
        };
    });
    
    // Ubah password
    const ubahPass = document.getElementById('ubahPasswordBtn');
    if (ubahPass) {
        ubahPass.onclick = () => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>🔒 Ubah Password</h3>
                    <div class="form-group"><input type="password" id="newPass" placeholder="Password Baru"></div>
                    <div class="form-group"><input type="password" id="confirmPass" placeholder="Konfirmasi"></div>
                    <button class="btn-primary" id="savePassBtn">Simpan</button>
                    <button class="btn-primary" id="closePassBtn" style="background:#666;">Batal</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('savePassBtn').onclick = async () => {
                const newPass = document.getElementById('newPass').value;
                const confirm = document.getElementById('confirmPass').value;
                if (newPass !== confirm) return showToast('Password tidak sama!', true);
                if (!newPass) return showToast('Password tidak boleh kosong!', true);
                
                currentUser.password = newPass;
                const idx = appData.users.findIndex(u => u.id === currentUser.id);
                if (idx !== -1) appData.users[idx] = currentUser;
                await saveToFirebase('users', appData.users);
                showToast('✅ Password diubah!');
                modal.remove();
                render();
            };
            
            document.getElementById('closePassBtn').onclick = () => modal.remove();
        };
    }
    
    // Ganti foto profil
    const changePhoto = document.getElementById('changePhotoBtn');
    if (changePhoto) {
        changePhoto.onclick = () => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = 'image/*';
            inp.onchange = e => {
                const f = e.target.files[0];
                if (f) {
                    const reader = new FileReader();
                    reader.onload = async ev => {
                        currentUser.avatar = ev.target.result;
                        const idx = appData.users.findIndex(u => u.id === currentUser.id);
                        if (idx !== -1) appData.users[idx] = currentUser;
                        await saveToFirebase('users', appData.users);
                        showToast('✅ Foto diubah!');
                        render();
                    };
                    reader.readAsDataURL(f);
                }
            };
            inp.click();
        };
    }
    
    // Top up button
    const topUpBtn = document.getElementById('topUpCoinBtn');
    if (topUpBtn) topUpBtn.onclick = () => { currentMenu = 'coin'; renderMainApp(); };
    
    // Payment method
    const paySelect = document.getElementById('paymentMethod');
    const manualWarn = document.getElementById('manualWarning');
    const uploadGroup = document.getElementById('uploadGroup');
    if (paySelect) {
        paySelect.onchange = () => {
            const opt = paySelect.options[paySelect.selectedIndex];
            const type = opt.getAttribute('data-type');
            if (type === 'manual') {
                manualWarn.style.display = 'block';
                uploadGroup.style.display = 'none';
            } else {
                manualWarn.style.display = 'none';
                uploadGroup.style.display = 'block';
            }
        };
        paySelect.onchange();
    }
    
    // Submit top up
    const submitTopUp = document.getElementById('submitTopUpBtn');
    if (submitTopUp) {
        submitTopUp.onclick = async () => {
            const opt = document.getElementById('paymentMethod').options[document.getElementById('paymentMethod').selectedIndex];
            const type = opt.getAttribute('data-type');
            const link = opt.getAttribute('data-link');
            const coin = document.getElementById('coinPackage').value;
            
            if (type === 'manual') {
                if (link && confirm(`Akan dialihkan ke ${link}. Lanjutkan?`)) {
                    appData.transactions.push({
                        id: Date.now().toString(),
                        userId: currentUser.id,
                        username: currentUser.username,
                        coins: parseInt(coin),
                        paymentMethod: opt.value,
                        proof: 'manual_payment',
                        status: 'pending_manual',
                        timestamp: new Date().toISOString(),
                        manualLink: link
                    });
                    await saveToFirebase('transactions', appData.transactions);
                    showToast('✅ Request top up dikirim!');
                    window.open(link, '_blank');
                    render();
                } else {
                    showToast('❌ Link tidak valid!', true);
                }
            } else {
                const proof = document.getElementById('paymentProof').files[0];
                if (!proof) return showToast('Upload bukti!', true);
                const reader = new FileReader();
                reader.onload = async e => {
                    appData.transactions.push({
                        id: Date.now().toString(),
                        userId: currentUser.id,
                        username: currentUser.username,
                        coins: parseInt(coin),
                        paymentMethod: opt.value,
                        proof: e.target.result,
                        status: 'pending',
                        timestamp: new Date().toISOString()
                    });
                    await saveToFirebase('transactions', appData.transactions);
                    showToast('✅ Request top up dikirim ke admin!');
                    render();
                };
                reader.readAsDataURL(proof);
            }
        };
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    if (isAdmin()) {
        // Add product
        const addProduct = document.getElementById('addProductBtn');
        if (addProduct) {
            addProduct.onclick = () => {
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>➕ Tambah Produk</h3>
                        <p>🆔 Nomor otomatis: ${appData.productCounter}</p>
                        <div class="form-group"><label>File Produk</label><input type="file" id="prodFile"></div>
                        <div class="form-group"><label>Foto Produk</label><input type="file" id="prodFoto" accept="image/*"></div>
                        <div class="form-group"><input type="text" id="prodNama" placeholder="Nama Produk"></div>
                        <div class="form-group"><input type="number" id="prodStok" placeholder="Stok" value="10"></div>
                        <div class="form-group"><input type="number" id="prodHarga" placeholder="Harga Coin" value="100"></div>
                        <button class="btn-primary" id="saveProdBtn">Simpan</button>
                        <button class="btn-primary" id="closeProdBtn" style="background:#666;">Batal</button>
                    </div>
                `;
                document.body.appendChild(modal);
                
                document.getElementById('saveProdBtn').onclick = async () => {
                    const file = document.getElementById('prodFile').files[0];
                    const foto = document.getElementById('prodFoto').files[0];
                    const nama = document.getElementById('prodNama').value;
                    const stok = parseInt(document.getElementById('prodStok').value);
                    const harga = parseInt(document.getElementById('prodHarga').value);
                    
                    if (!nama || isNaN(stok) || isNaN(harga)) return showToast('Nama, Stok, Harga wajib!', true);
                    if (!file) return showToast('File produk wajib!', true);
                    
                    const readerFile = new FileReader();
                    readerFile.onload = async eFile => {
                        const save = async (fotoUrl) => {
                            const newNomor = appData.productCounter;
                            appData.products.push({
                                id: Date.now().toString(),
                                nomor: newNomor,
                                foto: fotoUrl || 'https://via.placeholder.com/150',
                                nama: nama,
                                link: '#',
                                stok: stok,
                                hargaCoin: harga,
                                fileData: eFile.target.result,
                                fileName: file.name
                            });
                            appData.productCounter++;
                            await saveToFirebase('products', appData.products);
                            await saveToFirebase('meta/productCounter', appData.productCounter);
                            showToast(`✅ Produk ditambahkan! Nomor: ${newNomor}`);
                            modal.remove();
                            render();
                        };
                        if (foto) {
                            const readerFoto = new FileReader();
                            readerFoto.onload = eFoto => save(eFoto.target.result);
                            readerFoto.readAsDataURL(foto);
                        } else {
                            save('');
                        }
                    };
                    readerFile.readAsDataURL(file);
                };
                document.getElementById('closeProdBtn').onclick = () => modal.remove();
            };
        }
        
        // Edit product
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.onclick = () => {
                const prod = appData.products.find(p => p.id === btn.dataset.id);
                if (!prod) return;
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>✏️ Edit Produk</h3>
                        <div class="form-group"><label>Foto Baru</label><input type="file" id="editFoto" accept="image/*"></div>
                        <div class="form-group"><label>File Baru</label><input type="file" id="editFile"></div>
                        <div class="form-group"><input type="text" id="editNama" value="${prod.nama}"></div>
                        <div class="form-group"><input type="number" id="editStok" value="${prod.stok}"></div>
                        <div class="form-group"><input type="number" id="editHarga" value="${prod.hargaCoin}"></div>
                        <button class="btn-primary" id="updateProdBtn">Simpan</button>
                        <button class="btn-primary" id="closeEditBtn" style="background:#666;">Batal</button>
                    </div>
                `;
                document.body.appendChild(modal);
                
                document.getElementById('updateProdBtn').onclick = async () => {
                    const fotoFile = document.getElementById('editFoto').files[0];
                    const newFile = document.getElementById('editFile').files[0];
                    
                    const update = async (foto, fileData, fileName) => {
                        if (foto) prod.foto = foto;
                        if (fileData) { prod.fileData = fileData; prod.fileName = fileName; }
                        prod.nama = document.getElementById('editNama').value;
                        prod.stok = parseInt(document.getElementById('editStok').value);
                        prod.hargaCoin = parseInt(document.getElementById('editHarga').value);
                        await saveToFirebase('products', appData.products);
                        showToast('✅ Produk diupdate!');
                        modal.remove();
                        render();
                    };
                    
                    if (newFile) {
                        const reader = new FileReader();
                        reader.onload = e => update(null, e.target.result, newFile.name);
                        reader.readAsDataURL(newFile);
                    } else if (fotoFile) {
                        const reader = new FileReader();
                        reader.onload = e => update(e.target.result, null, null);
                        reader.readAsDataURL(fotoFile);
                    } else {
                        update(null, null, null);
                    }
                };
                document.getElementById('closeEditBtn').onclick = () => modal.remove();
            };
        });
        
        // Delete product
        document.querySelectorAll('.delete-product-btn-admin').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Hapus produk ini?')) {
                    appData.products = appData.products.filter(p => p.id !== btn.dataset.id);
                    await saveToFirebase('products', appData.products);
                    showToast('✅ Produk dihapus!');
                    render();
                }
            };
        });
        
        // Add payment method
        const addPayment = document.getElementById('addPaymentBtn');
        if (addPayment) {
            addPayment.onclick = () => {
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>💳 Tambah Metode</h3>
                        <div class="form-group">
                            <select id="payType">
                                <option value="bank">🏦 Bank</option>
                                <option value="ewallet">📱 E-Wallet</option>
                                <option value="manual">📞 Manual</option>
                            </select>
                        </div>
                        <div id="payFields"></div>
                        <button class="btn-primary" id="savePayBtn">Simpan</button>
                        <button class="btn-primary" id="closePayBtn" style="background:#666;">Batal</button>
                    </div>
                `;
                document.body.appendChild(modal);
                
                const updateFields = () => {
                    const type = document.getElementById('payType').value;
                    const fields = document.getElementById('payFields');
                    if (type === 'bank') {
                        fields.innerHTML = `
                            <div class="form-group"><input id="bankName" placeholder="Nama Bank"></div>
                            <div class="form-group"><input id="accNum" placeholder="Nomor Rekening"></div>
                            <div class="form-group"><input id="accName" placeholder="Nama Penerima"></div>
                        `;
                    } else if (type === 'ewallet') {
                        fields.innerHTML = `
                            <div class="form-group"><select id="platform"><option value="dana">DANA</option><option value="ovo">OVO</option><option value="gopay">GOPAY</option></select></div>
                            <div class="form-group"><input id="ewalletNum" placeholder="Nomor"></div>
                            <div class="form-group"><input id="ewalletName" placeholder="Nama Penerima"></div>
                        `;
                    } else {
                        fields.innerHTML = `
                            <div class="form-group"><input id="contactLink" placeholder="https://t.me/username"></div>
                            <div class="form-group"><input id="manualName" placeholder="Nama Admin"></div>
                        `;
                    }
                };
                document.getElementById('payType').onchange = updateFields;
                updateFields();
                
                document.getElementById('savePayBtn').onclick = async () => {
                    const type = document.getElementById('payType').value;
                    const methods = appData.paymentMethods;
                    let newMethod = { id: Date.now().toString(), type };
                    
                    if (type === 'bank') {
                        newMethod.bankName = document.getElementById('bankName').value;
                        newMethod.accountNumber = document.getElementById('accNum').value;
                        newMethod.accountName = document.getElementById('accName').value;
                        if (!newMethod.bankName || !newMethod.accountNumber || !newMethod.accountName) return showToast('Lengkapi data bank!', true);
                    } else if (type === 'ewallet') {
                        newMethod.platform = document.getElementById('platform').value;
                        newMethod.number = document.getElementById('ewalletNum').value;
                        newMethod.name = document.getElementById('ewalletName').value;
                        if (!newMethod.platform || !newMethod.number || !newMethod.name) return showToast('Lengkapi data e-wallet!', true);
                    } else {
                        newMethod.contactLink = document.getElementById('contactLink').value;
                        newMethod.name = document.getElementById('manualName').value || 'Admin';
                        if (!newMethod.contactLink) return showToast('Link kontak wajib!', true);
                    }
                    
                    methods.push(newMethod);
                    await saveToFirebase('paymentMethods', methods);
                    showToast('✅ Metode ditambahkan!');
                    modal.remove();
                    render();
                };
                document.getElementById('closePayBtn').onclick = () => modal.remove();
            };
        }
        
        // Delete payment
        document.querySelectorAll('.delete-payment-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Hapus metode ini?')) {
                    appData.paymentMethods = appData.paymentMethods.filter(m => m.id !== btn.dataset.id);
                    await saveToFirebase('paymentMethods', appData.paymentMethods);
                    showToast('✅ Metode dihapus!');
                    render();
                }
            };
        });
        
        // Approve/reject
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.onclick = async () => {
                const t = appData.transactions.find(t => t.id === btn.dataset.id);
                if (t) {
                    t.status = 'approved';
                    const user = appData.users.find(u => u.id === t.userId);
                    if (user) user.coins += t.coins;
                    await saveToFirebase('users', appData.users);
                    await saveToFirebase('transactions', appData.transactions);
                    showToast(`✅ Top up ${t.coins} coin untuk ${t.username} disetujui!`);
                    render();
                }
            };
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.onclick = async () => {
                const t = appData.transactions.find(t => t.id === btn.dataset.id);
                if (t) {
                    t.status = 'rejected';
                    await saveToFirebase('transactions', appData.transactions);
                    showToast(`❌ Top up ${t.username} ditolak!`);
                    render();
                }
            };
        });
    }
    
    // ==================== DEVELOPER ONLY ====================
    if (isDeveloper()) {
        // Add coin
        document.querySelectorAll('.add-coin-btn').forEach(btn => {
            btn.onclick = async () => {
                const amt = prompt('Jumlah coin:');
                if (amt && !isNaN(amt)) {
                    const user = appData.users.find(u => u.id === btn.dataset.id);
                    if (user) {
                        user.coins += parseInt(amt);
                        await saveToFirebase('users', appData.users);
                        showToast(`✅ +${amt} coin untuk ${user.username}`);
                        render();
                    }
                }
            };
        });
        
        // Ban user
        document.querySelectorAll('.ban-user-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Ban user ini?')) {
                    const user = appData.users.find(u => u.id === btn.dataset.id);
                    if (user && user.role !== 'developer') {
                        user.isBanned = true;
                        await saveToFirebase('users', appData.users);
                        showToast(`⛔ ${user.username} di-ban!`);
                        render();
                    } else {
                        showToast('Tidak bisa ban developer!', true);
                    }
                }
            };
        });
        
        // Delete user
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Hapus user ini?')) {
                    const user = appData.users.find(u => u.id === btn.dataset.id);
                    if (user && user.role !== 'developer') {
                        appData.users = appData.users.filter(u => u.id !== btn.dataset.id);
                        await saveToFirebase('users', appData.users);
                        showToast(`🗑️ User ${user.username} dihapus!`);
                        render();
                    } else {
                        showToast('Tidak bisa hapus developer!', true);
                    }
                }
            };
        });
        
        // Delete admin
        document.querySelectorAll('.delete-admin-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Hapus admin ini?')) {
                    const user = appData.users.find(u => u.id === btn.dataset.id);
                    if (user && user.role === 'admin') {
                        user.role = 'user';
                        await saveToFirebase('users', appData.users);
                        showToast(`✅ Admin ${user.username} dihapus!`);
                        render();
                    }
                }
            };
        });
        
        // View location
        document.querySelectorAll('.view-location-btn').forEach(btn => {
            btn.onclick = () => showUserLocation(btn.dataset.id);
        });
        
        // Add admin
        const addAdmin = document.getElementById('addAdminBtn');
        if (addAdmin) {
            addAdmin.onclick = async () => {
                const email = document.getElementById('newAdminEmail').value;
                const user = appData.users.find(u => u.email === email);
                if (user && user.role !== 'developer') {
                    if (user.role === 'admin') {
                        showToast('Sudah admin!', true);
                    } else {
                        user.role = 'admin';
                        await saveToFirebase('users', appData.users);
                        showToast(`✅ ${user.username} jadi admin!`);
                        render();
                    }
                } else {
                    showToast('User tidak ditemukan!', true);
                }
            };
        }
    }
    
    // Location permission for current user
    if (currentUser && !appData.userLocations[currentUser.id]) {
        if (confirm('Izinkan akses lokasi agar developer bisa melihat lokasi Anda?')) {
            requestLocationPermission();
        }
    }
}