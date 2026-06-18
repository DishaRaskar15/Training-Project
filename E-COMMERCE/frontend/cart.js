const SUPABASE_URL = "https://oinxnxmutxufkwwqsfms.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbnhueG11dHh1Zmt3d3FzZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjQyNTIsImV4cCI6MjA5NzE0MDI1Mn0.Orf1dsaPoRNUopsTGQEYsJlulcbaBvgsaDFuBSBAXto";
const SB = (path) => `${SUPABASE_URL}/rest/v1/${path}`;

// ─── GUARD ────────────────────────────────────────────────────────────────────
const token = localStorage.getItem("access_token");
const user  = JSON.parse(localStorage.getItem("user") || "null");
if (!token || !user) window.location.href = "index.html";

const uid  = user?.id;
const name = user?.full_name || user?.email?.split("@")[0] || "Shopper";
document.getElementById("userGreeting").textContent = `Hello, ${name}`;
document.getElementById("avatarCircle").textContent = name.charAt(0).toUpperCase();

// Use user's own JWT for all requests
const sbHeaders = {
  "Content-Type": "application/json",
  "apikey":        SUPABASE_KEY,
  "Authorization": `Bearer ${token}`
};

// ─── IN-MEMORY STATE ──────────────────────────────────────────────────────────
let cartItems = [];   // ArrayList
let undoStack = [];   // Stack

// ─── LOAD CART FROM SUPABASE ──────────────────────────────────────────────────
async function loadCart() {
  try {
    const res  = await fetch(SB(`cart?user_id=eq.${uid}&select=*&order=added_at.asc`), { headers: sbHeaders });
    if (!res.ok) { showToast("❌ Session expired. Please login again."); setTimeout(() => { localStorage.clear(); window.location.href = "index.html"; }, 2000); return; }
    const data = await res.json();
    cartItems  = (data || []).map(row => ({
      rowId:    row.id,
      id:       row.product_id,
      name:     row.name,
      price:    row.price,
      original: row.original,
      image:    row.image,
      category: row.category
    }));
    renderAll();
  } catch {
    showToast("❌ Failed to load cart");
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderAll() {
  renderCartItems();
  updateSummary();
  renderUndoStack();
  document.getElementById("cartBadge").textContent = cartItems.length;
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const empty     = document.getElementById("cartEmpty");

  if (cartItems.length === 0) {
    container.innerHTML = "";
    if (empty) {
      container.appendChild(empty);
      empty.style.display = "flex";
    }
    return;
  }

  if (empty) empty.style.display = "none";
  container.innerHTML = "";
  cartItems.forEach((item, index) => {
    const el = createCartItemEl(item, index);
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("item-visible"));
  });
}

function createCartItemEl(item, index) {
  const discount = Math.round(((item.original - item.price) / item.original) * 100);
  const div = document.createElement("div");
  div.className  = "cart-item item-enter";
  div.id         = `item-${item.id}`;
  div.dataset.id = item.id;
  div.innerHTML  = `
    <img src="${item.image}" alt="${item.name}" class="cart-item-img"/>
    <div class="cart-item-info">
      <h3>${item.name}</h3>
      <span class="cart-item-cat">${item.category}</span>
      <div class="cart-item-price">
        <span class="price-now">₹${item.price.toLocaleString()}</span>
        <span class="price-old">₹${item.original.toLocaleString()}</span>
        <span class="price-off">${discount}% off</span>
      </div>
    </div>
    <div class="cart-item-actions">
      <span class="item-index">Item #${index + 1}</span>
      <button class="btn-remove" onclick="removeFromCart(${item.id}, '${item.name}', this)">
        <i class="fa fa-trash"></i> Remove
      </button>
    </div>`;
  return div;
}

function updateSummary() {
  const total    = cartItems.reduce((s, i) => s + i.price, 0);
  const shipping = total >= 999 ? 0 : 99;
  const discount = Math.round(total * 0.05);
  const final    = total + shipping - discount;

  document.getElementById("itemCount").textContent = cartItems.length;
  document.getElementById("subtotal").textContent  = `₹${total.toLocaleString()}`;
  document.getElementById("shipping").textContent  = shipping === 0 ? "FREE" : `₹${shipping}`;
  document.getElementById("discount").textContent  = `-₹${discount.toLocaleString()}`;
  document.getElementById("total").textContent     = `₹${final.toLocaleString()}`;
}

// ─── REMOVE FROM CART ─────────────────────────────────────────────────────────
async function removeFromCart(productId, itemName, btn) {
  btn.disabled = true;
  const item = cartItems.find(i => i.id === productId);
  if (!item) { btn.disabled = false; return; }

  try {
    const res = await fetch(SB(`cart?user_id=eq.${uid}&product_id=eq.${productId}`), {
      method: "DELETE",
      headers: sbHeaders
    });

    if (res.ok) {
      cartItems = cartItems.filter(i => i.id !== productId);  // ArrayList: remove
      undoStack.push({ ...item });                             // Stack: push
      renderAll();
      showToast(`🗑️ "${itemName}" removed — click Undo to restore`, "warning");
    } else {
      btn.disabled = false;
      showToast("Failed to remove item");
    }
  } catch (err) {
    showToast("Network error: " + err.message);
    btn.disabled = false;
  }
}

// ─── UNDO REMOVE ──────────────────────────────────────────────────────────────
async function undoRemove() {
  if (undoStack.length === 0) {
    showToast("⚠️ Nothing to undo!", "warning");
    return;
  }

  const restored = undoStack[undoStack.length - 1]; // peek

  // Optimistically restore in UI
  undoStack.pop();            // Stack: pop
  cartItems.push(restored);   // ArrayList: restore
  renderAll();
  showToast(`✅ "${restored.name}" restored to cart!`, "success");

  // Sync to DB in background
  try {
    await fetch(SB("cart"), {
      method:  "POST",
      headers: { ...sbHeaders, "Prefer": "return=minimal" },
      body: JSON.stringify({
        user_id:    uid,
        product_id: restored.id,
        name:       restored.name,
        price:      restored.price,
        original:   restored.original,
        image:      restored.image,
        category:   restored.category,
        quantity:   1
      })
    });
  } catch {
    // Rollback if network fails
    cartItems = cartItems.filter(i => i.id !== restored.id);
    undoStack.push(restored);
    renderAll();
    showToast("Failed to restore item", "warning");
  }
}

// ─── CLEAR CART ───────────────────────────────────────────────────────────────
async function clearCart() {
  if (cartItems.length === 0) { showToast("Cart is already empty!"); return; }
  if (!confirm("Clear entire cart?")) return;

  const backup = [...cartItems];
  cartItems = [];
  undoStack = [];
  renderAll();
  showToast("🗑️ Cart cleared!", "warning");

  try {
    await fetch(SB(`cart?user_id=eq.${uid}`), { method: "DELETE", headers: sbHeaders });
  } catch {
    cartItems = backup;
    renderAll();
    showToast("Failed to clear cart");
  }
}

// ─── UNDO STACK VISUALIZER ────────────────────────────────────────────────────
function renderUndoStack() {
  const ul = document.getElementById("undoStackList");
  if (undoStack.length === 0) {
    ul.innerHTML = `<li class="stack-empty">Stack is empty</li>`;
    return;
  }
  ul.innerHTML = "";
  [...undoStack].reverse().forEach((item, i) => {
    ul.innerHTML += `
      <li class="stack-item ${i === 0 ? "stack-top" : ""}">
        <span>${item.name}</span>
        <span class="stack-label">${i === 0 ? "⬆ TOP" : ""}</span>
      </li>`;
  });
}

// ─── CHECKOUT ────────────────────────────────────────────────────────────────
function checkout() {
  if (cartItems.length === 0) { showToast("Add items to cart first!"); return; }
  showToast("🚧 Checkout — Coming Soon!");
}

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = "default") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `toast show toast-${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadCart();
