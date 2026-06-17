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

// FIREBASE CONFIG — Fill with your actual values
const firebaseConfig = {
  apiKey: "AIzaSyCzKseC2oMxm6Qojf_8I6wGPb5hA79DTAg",
  authDomain: "lost-found-42d53.firebaseapp.com",
  projectId: "lost-found-42d53",
  storageBucket: "lost-found-42d53.firebasestorage.app",
  messagingSenderId: "419997734702",
  appId: "1:419997734702:web:64f5e4ecf6d69939110cbf"
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// API BASE URL (Dynamic — Local vs Production)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? "http://localhost:5000/api"
    : "https://lost-and-found-lac-beta.vercel.app/api";

// PAGE REFERENCES
const pages = {
    login: document.getElementById("loginPage"),
    register: document.getElementById("registerPage"),
    dashboard: document.getElementById("dashboardPage"),
    lost: document.getElementById("lostItemPage"),
    found: document.getElementById("foundItemPage"),
    view: document.getElementById("viewItemsPage"),
    search: document.getElementById("searchPage")
};

// PAGE NAVIGATION HELPERS
function hideAllPages() {
    Object.values(pages).forEach(function(page) {
        if (page) {
            page.style.display = "none";
        }
    });
}

function showPage(pageName) {
    hideAllPages();
    const page = pages[pageName];
    if (!page) {
        return;
    }
    if (pageName === "login" || pageName === "register") {
        page.style.display = "flex";
    } else {
        page.style.display = "block";
    }
    console.log("Switched to page: " + pageName);
}

// AUTH STATE LISTENER
onAuthStateChanged(auth, function(user) {
    console.log("Auth state changed:", user ? "Logged In" : "Logged Out");
    if (user) {
        showPage("dashboard");
        loadUserProfile(user.uid);
    } else {
        showPage("login");
    }
});


// LOAD USER PROFILE FROM FIRESTORE
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

// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const fullName = document.getElementById("regFullName").value.trim();
        const dsuId = document.getElementById("regDsuId").value.trim();
        const department = document.getElementById("regDepartment").value.trim();
        const semester = document.getElementById("regSemester").value.trim();
        const phone = document.getElementById("regPhone").value.trim();
        const password = document.getElementById("registerPassword").value;

        // Validation
        if (!/^[0-9]{11}$/.test(phone)) {
            alert("Phone must be exactly 11 digits");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        const email = dsuId.toLowerCase() + "@dsu.edu";

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCred.user;

            await updateProfile(user, { displayName: fullName });

            await setDoc(doc(db, "students", user.uid), {
                fullName: fullName,
                dsuId: dsuId,
                department: department,
                semester: semester,
                phone: phone,
                email: email,
                createdAt: new Date()
            });

            alert("Registration Successful!");
            document.getElementById("registerForm").reset();
            showPage("login");

        } catch (error) {
            if (error.code === "auth/email-already-in-use") {
                alert("DSU ID already registered. Please login.");
            } else {
                alert(error.message);
            }
        }
    });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const dsuId = document.getElementById("loginDSU").value.trim();
        const password = document.getElementById("loginPassword").value;
        const email = dsuId.toLowerCase() + "@dsu.edu";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login Successful");

            const user = auth.currentUser;
            if (user) {
                showPage("dashboard");
                await loadUserProfile(user.uid);
            }

        } catch (error) {
            alert("❌ Wrong DSU ID or Password");
        }
    });
}

// LOGOUT
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async function() {
        await signOut(auth);
        showPage("login");
    });
}

// NAVIGATION BUTTONS
const goRegisterBtn = document.getElementById("goRegisterBtn");
if (goRegisterBtn) {
    goRegisterBtn.onclick = function() { showPage("register"); };
}

const backToLoginBtn = document.getElementById("backToLoginBtn");
if (backToLoginBtn) {
    backToLoginBtn.onclick = function() { showPage("login"); };
}

const lostItemCard = document.getElementById("lostItemCard");
if (lostItemCard) {
    lostItemCard.onclick = function() { showPage("lost"); };
}

const foundItemCard = document.getElementById("foundItemCard");
if (foundItemCard) {
    foundItemCard.onclick = function() { showPage("found"); };
}

const viewItemsCard = document.getElementById("viewItemsCard");
if (viewItemsCard) {
    viewItemsCard.onclick = function() {
        showPage("view");
        loadAllItems();
    };
}

const searchItemsCard = document.getElementById("searchItemsCard");
if (searchItemsCard) {
    searchItemsCard.onclick = function() {
        showPage("search");
    };
}

// All "Back to Dashboard" buttons
var backButtons = document.querySelectorAll(".dashboardBack");
backButtons.forEach(function(btn) {
    btn.onclick = function() {
        showPage("dashboard");
    };
});

// API HELPER
async function callAPI(endpoint, options) {
    if (!options) {
        options = {};
    }
    const url = API_BASE + endpoint;
    const config = {
        headers: { "Content-Type": "application/json" },
        method: options.method || "GET"
    };
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, config);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API Error");
    }
    return response.json();
}

// REPORT LOST ITEM
const lostForm = document.getElementById("lostItemForm");
if (lostForm) {
    lostForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const data = {
            type: "lost",
            fullName: document.getElementById("lostFullName").value.trim(),
            dsuId: document.getElementById("lostDsuId").value.trim(),
            department: document.getElementById("lostDepartment").value.trim(),
            semester: document.getElementById("lostSemester").value.trim(),
            phone: document.getElementById("lostPhone").value.trim(),
            itemName: document.getElementById("lostItemName").value.trim(),
            // category: document.getElementById("lostCategory").value.trim(),
            color: document.getElementById("lostColor").value.trim(),
            location: document.getElementById("lostLocation").value.trim(),
            date: document.getElementById("lostDate").value,
            description: document.getElementById("lostDescription").value.trim(),
            status: "Pending"
        };

        try {
            await callAPI("/report", { method: "POST", body: data });
            alert("Lost item reported!");
            lostForm.reset();
        } catch (error) {
            alert("Error: " + error.message);
        }
    });
}

// REPORT FOUND ITEM
const foundForm = document.getElementById("foundItemForm");
if (foundForm) {
    foundForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const data = {
            type: "found",
            fullName: document.getElementById("foundFullName").value.trim(),
            dsuId: document.getElementById("foundDsuId").value.trim(),
            department: document.getElementById("foundDepartment").value.trim(),
            semester: document.getElementById("foundSemester").value.trim(),
            phone: document.getElementById("foundPhone").value.trim(),
            itemName: document.getElementById("foundItemName").value.trim(),
            // category: document.getElementById("foundCategory").value.trim(),
            color: document.getElementById("foundColor").value.trim(),
            location: document.getElementById("foundLocation").value.trim(),
            date: document.getElementById("foundDate").value,
            description: document.getElementById("foundDescription").value.trim(),
            status: "Found"
        };

        try {
            await callAPI("/report", { method: "POST", body: data });
            alert("Found item reported!");
            foundForm.reset();
        } catch (error) {
            alert("Error: " + error.message);
        }
    });
}


// LOAD ALL ITEMS (No Filters)
async function loadAllItems() {
    try {
        const items = await callAPI("/items?category=all&type=all&sort=latest");
        renderItems(items, "itemsContainer");
    } catch (error) {
        console.error("Load items error:", error);
        alert("Error loading items: " + error.message);
    }
}

// SEARCH
const searchBtn = document.getElementById("searchBtn");
if (searchBtn) {
    searchBtn.addEventListener("click", async function() {
        const query = document.getElementById("searchInput").value.trim();
        if (!query) {
            alert("Enter a search term");
            return;
        }
        try {
            const results = await callAPI("/search?q=" + encodeURIComponent(query));
            renderItems(results, "searchResults");
        } catch (error) {
            alert("Search error: " + error.message);
        }
    });
}

// FIND MATCHES (Global for onclick in HTML)
window.findMatches = async function() {
    try {
        const matches = await callAPI("/match");
        if (matches.length === 0) {
            alert("No matches found!");
            return;
        }
        var msg = "🔍 Matches Found:\n\n";
        matches.forEach(function(m, idx) {
            msg += (idx + 1) + ". Lost: " + m.lost_item.itemName + " (" + m.lost_item.location + ") | Found: " + m.found_item.itemName + " (" + m.found_item.location + ")\n";
            msg += "   Score: " + m.match_score + "%\n\n";
        });
        alert(msg);
    } catch (error) {
        alert("Match error: " + error.message);
    }
};

// RENDER ITEMS HELPER
function renderItems(items, containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
        console.warn("Container not found: " + containerId);
        return;
    }

    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="glass-card" style="padding:20px; text-align:center; color:#6a7488;">No items found.</p>';
        return;
    }

    items.forEach(function(item) {
        var card = document.createElement("div");
        card.className = "glass-card item-card";

        var statusClass = (item.type === "lost") ? "lost" : "found";

        var descriptionText = item.description ? item.description.substring(0, 80) : "";

        card.innerHTML =
            '<div class="card-header">' +
                '<h3>' + item.itemName + '</h3>' +
                '<span class="badge ' + statusClass + '">' + (item.status || item.type) + '</span>' +
            '</div>' +
            '<p><strong>Type:</strong> ' + item.type + '</p>' +
            '<p><strong>Category:</strong> ' + item.category + '</p>' +
            '<p><strong>Color:</strong> ' + (item.color || "N/A") + '</p>' +
            '<p><strong>Location:</strong> ' + item.location + '</p>' +
            '<p><strong>Date:</strong> ' + item.date + '</p>' +
            '<p><strong>Reported by:</strong> ' + item.fullName + ' (' + item.dsuId + ')</p>' +
            '<p>' + descriptionText + '</p>';

        container.appendChild(card);
    });
}
// CONSOLE LOGS (for debugging)
console.log("✅ DSU System with Flask Backend Loaded (No Filters)");
console.log("🔗 API_BASE:", API_BASE);