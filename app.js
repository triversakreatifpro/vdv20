import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, increment, getDoc, query, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "DEMO_KEY", authDomain: "demo.firebaseapp.com", projectId: "demo" }; // Fallback jika local

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vdv-web-app';

let currentUser = null;
let hasVotedLocal = false;

// --- GLOBAL FUNCTIONS ---
window.navigateTo = (pageId) => {
    // Hide all
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    
    // Navbar Active State
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('onclick').includes(pageId));
    if(activeBtn) activeBtn.classList.add('active');

    // Mobile Menu Close
    document.getElementById('mobile-menu').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load initial data for specific pages
    if(pageId === 'agendas') switchAgenda('VR');
    if(pageId === 'mubes' && window.lucide) window.lucide.createIcons();
};

window.toggleMobileMenu = () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
};

// --- AUTH UI ---
const updateAuthUI = (user) => {
    const desktopHtml = user 
        ? `<div class="flex items-center gap-3">
             <div class="text-right">
               <p class="text-[10px] text-law-gold font-bold uppercase">Anggota</p>
               <p class="text-sm text-white font-bold leading-none">${user.displayName}</p>
             </div>
             <button onclick="handleLogout()" class="text-gray-400 hover:text-red-500"><i data-lucide="log-out" class="w-4 h-4"></i></button>
           </div>`
        : `<button onclick="navigateTo('login')" class="bg-law-gold/20 text-law-gold px-4 py-1.5 rounded-full text-xs font-bold border border-law-gold/50 hover:bg-law-gold hover:text-black transition">Login Anggota</button>`;

    const mobileHtml = user
        ? `<button onclick="handleLogout()" class="w-full text-left p-3 text-red-400">Logout (${user.displayName})</button>`
        : `<button onclick="navigateTo('login')" class="w-full text-left p-3 text-law-gold">Login Anggota</button>`;

    document.getElementById('auth-desktop').innerHTML = desktopHtml;
    document.getElementById('auth-mobile').innerHTML = mobileHtml;
    if(window.lucide) window.lucide.createIcons();
};

window.handleLogin = async (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value;
    if(!name) return;
    try {
        if(!auth.currentUser) await signInAnonymously(auth);
        await updateProfile(auth.currentUser, { displayName: name });
        navigateTo('home');
    } catch(err) { alert("Error: " + err.message); }
};

window.handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
};

// --- AGENDA LOGIC ---
window.switchAgenda = (type) => {
    // UI Switch
    document.querySelectorAll('.agenda-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${type}`).classList.add('active');

    const display = document.getElementById('agenda-content-inner');
    let content = '';

    if(type === 'VR') {
        content = `
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-3xl font-serif font-bold text-law-gold mb-2">Open Recruitment</h3>
                    <p class="text-gray-400 mb-6 max-w-lg">Gerbang awal menjadi bagian dari keluarga VDV. Siapkan mental dan integritas anda.</p>
                </div>
                <i data-lucide="user-plus" class="w-16 h-16 text-law-gold/20"></i>
            </div>
            ${!currentUser 
                ? `<div class="p-4 border border-law-red/30 bg-law-red/10 rounded-lg text-red-300 text-sm flex items-center gap-2"><i data-lucide="lock" class="w-4 h-4"></i> Login untuk mendaftar.</div>`
                : `<form onsubmit="submitReg(event, 'VR')" class="space-y-4 max-w-md">
                     <div class="space-y-1">
                        <label class="text-xs text-gray-500 uppercase font-bold">Nama</label>
                        <input type="text" value="${currentUser.displayName}" readonly class="w-full bg-black/30 border border-gray-600 rounded p-2 text-gray-300">
                     </div>
                     <div class="space-y-1">
                        <label class="text-xs text-law-gold uppercase font-bold">NIM</label>
                        <input type="text" id="reg-nim" required placeholder="Contoh: 210711..." class="w-full bg-black/50 border border-law-gold/50 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-law-gold">
                     </div>
                     <button class="w-full bg-law-gold text-black font-bold py-2 rounded hover:bg-yellow-400">Daftar Sekarang</button>
                   </form>`
            }
        `;
    } else if (type === 'VMCC') {
        content = `
            <div class="text-center py-20 opacity-50">
                <i data-lucide="clock" class="w-16 h-16 mx-auto mb-4 text-gray-500"></i>
                <h3 class="text-xl font-bold text-gray-300">Segera Datang</h3>
                <p>Informasi VMCC belum tersedia.</p>
            </div>
        `;
    } else {
        content = `
            <h3 class="text-2xl font-bold text-white mb-6">Arsip Prestasi NMCC</h3>
            <div class="grid gap-4">
                <div class="bg-white/5 p-4 rounded-lg border-l-4 border-law-gold">
                    <h4 class="font-bold text-law-gold">Piala Soedarto (Undip)</h4>
                    <p class="text-xs text-gray-400">Delegasi 2023 - Berkas Terbaik</p>
                </div>
                <div class="bg-white/5 p-4 rounded-lg border-l-4 border-law-green">
                    <h4 class="font-bold text-law-green">Piala Mahkamah Agung</h4>
                    <p class="text-xs text-gray-400">Delegasi 2022</p>
                </div>
            </div>
        `;
    }
    display.innerHTML = content;
    if(window.lucide) window.lucide.createIcons();
};

window.submitReg = async (e, type) => {
    e.preventDefault();
    const nim = document.getElementById('reg-nim').value;
    try {
        await addDoc(collection(db, `artifacts/${appId}/public/data/registrations`), {
            type, nim, name: currentUser.displayName, uid: currentUser.uid, ts: serverTimestamp()
        });
        alert("Berhasil Mendaftar!");
    } catch(e) { alert("Gagal"); }
};

// --- MUBES LOGIC ---
const renderVoting = (cands) => {
    const container = document.getElementById('voting-area');
    const total = cands.reduce((a,b)=>a+b.votes,0);

    if(!currentUser) {
        container.innerHTML = `<div class="text-center py-10 text-gray-400">Silakan login untuk mengakses voting.</div>`;
        return;
    }

    let html = `<div class="grid gap-6 md:grid-cols-2">`;
    cands.forEach(c => {
        const pct = total ? ((c.votes/total)*100).toFixed(1) : 0;
        html += `
            <div class="bg-black/40 border ${hasVotedLocal ? 'border-gray-700' : 'border-law-gold'} rounded-xl p-6 relative overflow-hidden group">
                <div class="relative z-10">
                    <h4 class="text-xl font-bold text-white">${c.name}</h4>
                    <p class="text-sm text-gray-400 mb-4 italic">"${c.vision}"</p>
                    ${hasVotedLocal 
                        ? `<div class="text-3xl font-bold text-law-gold">${pct}% <span class="text-xs text-gray-500 font-normal">(${c.votes})</span></div>`
                        : `<button onclick="vote('${c.id}')" class="w-full bg-law-gold hover:bg-yellow-400 text-black font-bold py-2 rounded">PILIH</button>`
                    }
                </div>
                ${hasVotedLocal ? `<div class="absolute bottom-0 left-0 h-1 bg-law-green transition-all duration-1000" style="width:${pct}%"></div>` : ''}
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
};

window.vote = async (id) => {
    if(hasVotedLocal) return;
    try {
        await setDoc(doc(db, `artifacts/${appId}/public/data/votes`, currentUser.uid), { vid: id });
        await updateDoc(doc(db, `artifacts/${appId}/public/data/candidates`, id), { votes: increment(1) });
    } catch(e) { alert("Gagal voting"); }
};

// --- INIT ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateAuthUI(user);
    if(user) {
        const v = await getDoc(doc(db, `artifacts/${appId}/public/data/votes`, user.uid));
        if(v.exists()) hasVotedLocal = true;
    }
    
    // Realtime Candidates
    onSnapshot(query(collection(db, `artifacts/${appId}/public/data/candidates`)), (snap) => {
        if(snap.empty) {
            // Seed
            [{id:'1', name:'Kandidat 01', votes:0, vision:'Integritas'}, {id:'2', name:'Kandidat 02', votes:0, vision:'Solidaritas'}].forEach(d=>setDoc(doc(db,`artifacts/${appId}/public/data/candidates`,d.id),d));
        } else {
            renderVoting(snap.docs.map(d=>({id:d.id, ...d.data()})));
        }
    });
});

if(window.lucide) window.lucide.createIcons();