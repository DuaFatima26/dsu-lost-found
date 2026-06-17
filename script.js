// ========================================
// FIREBASE AUTH (Same as before)
// ========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- YOUR FIREBASE CONFIG (Fill karein) ----------
const firebaseConfig = {
  apiKey: "AIzaSyCzKseC2oMxm6Qojf_8I6wGPb5hA79DTAg",
  authDomain: "lost-found-42d53.firebaseapp.com",
  projectId: "lost-found-42d53",
  storageBucket: "lost-found-42d53.firebasestorage.app",
  messagingSenderId: "419997734702",
  appId: "1:419997734702:web:64f5e4ecf6d69939110cbf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- API BASE URL (Flask server) ----------
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:5000/api"
    : "https://lost-and-found-lac-beta.vercel.app";  // ⚠️ Baad mein actual name change karna

// ---------- PAGE REFERENCES ----------
const pages = {
    login: document.getElementById("loginPage"),
    register: document.getElementById("registerPage"),
    dashboard: document.getElementById("dashboardPage"),
    lost: document.getElementById("lostItemPage"),
    found: document.getElementById("foundItemPage"),
    view: document.getElementById("viewItemsPage"),
    search: document.getElementById("searchPage")
};

function hideAllPages() {
    Object.values(pages).forEach(page => page.style.display = "none");
}

function showPage(name) {
    hideAllPages();
    const page = pages[name];
    if (!page) return;
    page.style.display = (name === "login" || name === "register") ? "flex" : "block";
}

// ---------- AUTH STATE ----------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showPage("dashboard");
        await loadUserProfile(user.uid);
    } else {
        showPage("login");
    }
});

async function loadUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "students", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("profileName").textContent = data.fullName || "—";
            document.getElementById("profileDsuId").textContent = data.dsuId || "—";
            document.getElementById("profileDept").textContent = data.department || "—";
            document.getElementById("profileSem").textContent = data.semester || "—";
            document.getElementById("profilePhone").textContent = data.phone || "—";
            document.getElementById("profileEmail").textContent = data.email || "—";
        }
    } catch (error) {
        console.error("Profile load error:", error);
    }
}

// ---------- REGISTER ----------
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("regFullName").value.trim();
    const dsuId = document.getElementById("regDsuId").value.trim();
    const department = document.getElementById("regDepartment").value.trim();
    const semester = document.getElementById("regSemester").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!/^[0-9]{11}$/.test(phone)) { alert("Phone must be 11 digits"); return; }
    if (password.length < 6) { alert("Password min 6 chars"); return; }

    const email = dsuId.toLowerCase() + "@dsu.edu";
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: fullName });
        await setDoc(doc(db, "students", userCred.user.uid), {
            fullName, dsuId, department, semester, phone, email, createdAt: new Date()
        });
        alert("Registration Successful!");
        document.getElementById("registerForm").reset();
        showPage("login");
    } catch (error) {
        alert(error.code === "auth/email-already-in-use" ? "DSU ID already registered." : error.message);
    }
});

// ---------- LOGIN ----------
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dsuId = document.getElementById("loginDSU").value.trim();
    const password = document.getElementById("loginPassword").value;
    try {
        await signInWithEmailAndPassword(auth, dsuId.toLowerCase() + "@dsu.edu", password);
        alert("Login Successful");
    } catch (error) {
        alert("Wrong DSU ID or Password");
    }
});

// ---------- LOGOUT ----------
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    showPage("login");
});

// ---------- NAVIGATION ----------
document.getElementById("goRegisterBtn").onclick = () => showPage("register");
document.getElementById("backToLoginBtn").onclick = () => showPage("login");
document.getElementById("lostItemCard").onclick = () => showPage("lost");
document.getElementById("foundItemCard").onclick = () => showPage("found");
document.getElementById("viewItemsCard").onclick = () => { showPage("view"); loadAllItems(); };
document.getElementById("searchItemsCard").onclick = () => { showPage("search"); };
document.querySelectorAll(".dashboardBack").forEach(btn => btn.onclick = () => showPage("dashboard"));

// ---------- API HELPER ----------
async function callAPI(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, config);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "API Error");
    }
    return response.json();
}

// ---------- REPORT LOST (via Flask) ----------
document.getElementById("lostItemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        type: "lost",
        fullName: document.getElementById("lostFullName").value.trim(),
        dsuId: document.getElementById("lostDsuId").value.trim(),
        department: document.getElementById("lostDepartment").value.trim(),
        semester: document.getElementById("lostSemester").value.trim(),
        phone: document.getElementById("lostPhone").value.trim(),
        itemName: document.getElementById("lostItemName").value.trim(),
        category: document.getElementById("lostCategory").value.trim(),
        color: document.getElementById("lostColor").value.trim(),
        location: document.getElementById("lostLocation").value.trim(),
        date: document.getElementById("lostDate").value,
        description: document.getElementById("lostDescription").value.trim(),
        status: "Pending"
    };
    try {
        await callAPI('/report', { method: 'POST', body: data });
        alert("✅ Lost item reported!");
        document.getElementById("lostItemForm").reset();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// ---------- REPORT FOUND (via Flask) ----------
document.getElementById("foundItemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        type: "found",
        fullName: document.getElementById("foundFullName").value.trim(),
        dsuId: document.getElementById("foundDsuId").value.trim(),
        department: document.getElementById("foundDepartment").value.trim(),
        semester: document.getElementById("foundSemester").value.trim(),
        phone: document.getElementById("foundPhone").value.trim(),
        itemName: document.getElementById("foundItemName").value.trim(),
        category: document.getElementById("foundCategory").value.trim(),
        color: document.getElementById("foundColor").value.trim(),
        location: document.getElementById("foundLocation").value.trim(),
        date: document.getElementById("foundDate").value,
        description: document.getElementById("foundDescription").value.trim(),
        status: "Found"
    };
    try {
        await callAPI('/report', { method: 'POST', body: data });
        alert("✅ Found item reported!");
        document.getElementById("foundItemForm").reset();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// ---------- LOAD ALL ITEMS (via Flask) ----------
async function loadAllItems() {
    try {
        const category = document.getElementById("categoryFilter").value;
        const type = document.getElementById("typeFilter").value;
        const sort = document.getElementById("sortItems").value;
        const items = await callAPI(`/items?category=${category}&type=${type}&sort=${sort}`);
        renderItems(items, "itemsContainer");
    } catch (error) {
        alert("Error loading items: " + error.message);
    }
}

document.getElementById("categoryFilter").addEventListener("change", loadAllItems);
document.getElementById("typeFilter").addEventListener("change", loadAllItems);
document.getElementById("sortItems").addEventListener("change", loadAllItems);

// ---------- SEARCH (via Flask) ----------
document.getElementById("searchBtn").addEventListener("click", async () => {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return alert("Enter search term");
    try {
        const results = await callAPI(`/search?q=${encodeURIComponent(query)}`);
        renderItems(results, "searchResults");
    } catch (error) {
        alert("Search error: " + error.message);
    }
});

// ---------- FIND MATCHES (Python Algorithm via Flask) ----------
window.findMatches = async function() {
    try {
        const matches = await callAPI('/match');
        if (matches.length === 0) {
            alert("No matches found!");
            return;
        }
        let msg = "🔍 Matches Found:\n\n";
        matches.forEach((m, idx) => {
            msg += `${idx+1}. Lost: ${m.lost_item.itemName} (${m.lost_item.location}) | Found: ${m.found_item.itemName} (${m.found_item.location})\n`;
            msg += `   Score: ${m.match_score}%\n\n`;
        });
        alert(msg);
    } catch (error) {
        alert("Match error: " + error.message);
    }
};

// ---------- RENDER ITEMS ----------
function renderItems(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="glass-card" style="padding:20px; text-align:center;">No items found.</p>`;
        return;
    }
    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "glass-card item-card";
        const statusClass = item.type === "lost" ? "lost" : "found";
        card.innerHTML = `
            <h3>${item.itemName}</h3>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Color:</strong> ${item.color || "N/A"}</p>
            <p><strong>Location:</strong> ${item.location}</p>
            <p><strong>Date:</strong> ${item.date}</p>
            <p><strong>Reported by:</strong> ${item.fullName} (${item.dsuId})</p>
            <p>${item.description ? item.description.substring(0,80) : ""}</p>
            <span class="badge ${statusClass}">${item.status || item.type}</span>
        `;
        container.appendChild(card);
    });
}

console.log("✅ DSU System with Flask Backend Loaded");