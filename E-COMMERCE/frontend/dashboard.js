const SUPABASE_URL = "https://oinxnxmutxufkwwqsfms.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbnhueG11dHh1Zmt3d3FzZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjQyNTIsImV4cCI6MjA5NzE0MDI1Mn0.Orf1dsaPoRNUopsTGQEYsJlulcbaBvgsaDFuBSBAXto";
const SB = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
// ─── GUARD ───────────────────────────────────────────────────────────────────
const token = localStorage.getItem("access_token");
const user  = JSON.parse(localStorage.getItem("user") || "null");
if (!token || !user) window.location.href = "index.html";

const uid  = user?.id;

// Use user's own JWT so Supabase RLS/FK checks pass
const sbHeaders = {
  "Content-Type": "application/json",
  "apikey":        SUPABASE_KEY,
  "Authorization": `Bearer ${token}`
};

// ─── USER INFO ────────────────────────────────────────────────────────────────
const name = user?.full_name || user?.email?.split("@")[0] || "Shopper";
document.getElementById("userGreeting").textContent = `Hello, ${name}`;
document.getElementById("avatarCircle").textContent = name.charAt(0).toUpperCase();

// ─── CART (ArrayList DS) ─────────────────────────────────────────────────────
async function addToCart(id, btn) {
  const product = products.find(p => p.id === id);
  btn.disabled  = true;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Adding...`;

  try {
    // Check if already in cart
    const check = await fetch(SB(`cart?user_id=eq.${uid}&product_id=eq.${product.id}&select=id,quantity`), { headers: sbHeaders });
    const existing = await check.json();

    let ok;
    if (existing.length > 0) {
      // Update quantity
      const upd = await fetch(SB(`cart?id=eq.${existing[0].id}`), {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({ quantity: existing[0].quantity + 1 })
      });
      ok = upd.ok;
    } else {
      // Insert new row
      const ins = await fetch(SB("cart"), {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          user_id: uid, product_id: product.id, name: product.name,
          price: product.price, original: product.original,
          image: product.image, category: product.category, quantity: 1
        })
      });
      ok = ins.ok;
    }

    if (ok) {
      // Update badge count
      const countRes = await fetch(SB(`cart?user_id=eq.${uid}&select=id`), { headers: sbHeaders });
      const countData = await countRes.json();
      document.getElementById("cartBadge").textContent = countData.length;

      btn.innerHTML = `<i class="fa fa-check"></i> Added!`;
      btn.classList.add("btn-added");
      showToast(`🎉 "${product.name}" added to your cart! <a href="cart.html" style="color:#fff;text-decoration:underline">View Cart →</a>`, "success");
      setTimeout(() => {
        btn.innerHTML = `<i class="fa fa-cart-plus"></i> Add to Cart`;
        btn.classList.remove("btn-added");
        btn.disabled = false;
      }, 2000);
    } else {
      btn.innerHTML = `<i class="fa fa-cart-plus"></i> Add to Cart`;
      btn.disabled  = false;
      showToast("Failed to add to cart");
    }
  } catch {
    btn.innerHTML = `<i class="fa fa-cart-plus"></i> Add to Cart`;
    btn.disabled  = false;
    showToast("Failed to add to cart");
  }
}

// ─── PRODUCTS DATA ────────────────────────────────────────────────────────────
const products = [
  {
    id: 1, category: "tops",
    name: "Floral Print Crop Top",
    desc: "Lightweight cotton crop top with vibrant floral print. Perfect for casual outings.",
    price: 599, original: 999,
    rating: 4.5, reviews: 128,
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=400&q=80",
    badge: "Bestseller"
  },
  {
    id: 2, category: "dress",
    name: "Boho Maxi Dress",
    desc: "Flowy bohemian maxi dress in soft rayon fabric. Ideal for beach & casual events.",
    price: 1299, original: 2199,
    rating: 4.7, reviews: 214,
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
    badge: "40% OFF"
  },
  {
    id: 3, category: "ethnic",
    name: "Embroidered Anarkali Kurta",
    desc: "Elegant anarkali kurta with intricate embroidery. Great for festive occasions.",
    price: 1799, original: 2999,
    rating: 4.8, reviews: 342,
    image: "https://showoffff.in/cdn/shop/files/RF-2841_White_1_c910d3cd-6d4b-4a8d-a4aa-b4ae234c2891.jpg?v=1778337161",
    badge: "New"
  },
  {
    id: 4, category: "jeans",
    name: "High-Waist Skinny Jeans",
    desc: "Stretchable high-waist skinny jeans in classic blue denim. All-day comfort.",
    price: 1099, original: 1799,
    rating: 4.4, reviews: 189,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
    badge: "Trending"
  },
  {
    id: 5, category: "tops",
    name: "Solid Ribbed Tank Top",
    desc: "Minimalist ribbed tank top in earthy tones. Layer it or wear it solo.",
    price: 449, original: 699,
    rating: 4.3, reviews: 96,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80",
    badge: ""
  },
  {
    id: 6, category: "dress",
    name: "Wrap Midi Dress",
    desc: "Elegant wrap-style midi dress with a flattering silhouette. Office to party ready.",
    price: 1499, original: 2499,
    rating: 4.6, reviews: 173,
    image: "https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=400&q=80",
    badge: "Hot"
  },
  {
    id: 7, category: "ethnic",
    name: "Printed Cotton Saree",
    desc: "Soft cotton saree with traditional block print design. Comes with a blouse piece.",
    price: 2199, original: 3499,
    rating: 4.9, reviews: 410,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80",
    badge: "Top Rated"
  },
  {
    id: 8, category: "jeans",
    name: "Ripped Boyfriend Jeans",
    desc: "Trendy ripped boyfriend jeans with a relaxed fit. Style it with any crop top.",
    price: 1249, original: 1999,
    rating: 4.5, reviews: 231,
    image: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=400&q=80",
    badge: "Trending"
  }
];

// ─── RENDER PRODUCTS ──────────────────────────────────────────────────────────
function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";
  list.forEach(p => {
    const discount = Math.round(((p.original - p.price) / p.original) * 100);
    const stars = renderStars(p.rating);
    grid.innerHTML += `
      <div class="product-card" data-category="${p.category}">
        ${p.badge ? `<span class="prod-badge">${p.badge}</span>` : ""}
        <div class="prod-img-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy"/>
          <button class="wishlist-btn" onclick="toggleWishlist(${p.id}, this)"><i class="fa fa-heart"></i></button>
        </div>
        <div class="prod-info">
          <h3 class="prod-name">${p.name}</h3>
          <p class="prod-desc">${p.desc}</p>
          <div class="prod-rating">${stars} <span>(${p.reviews} reviews)</span></div>
          <div class="prod-price">
            <span class="price-now">₹${p.price.toLocaleString()}</span>
            <span class="price-old">₹${p.original.toLocaleString()}</span>
            <span class="price-off">${discount}% off</span>
          </div>
          <button class="btn-add-cart" onclick="addToCart(${p.id}, this)">
            <i class="fa fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>`;
  });
}

function renderStars(rating) {
  let s = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating))      s += '<i class="fa fa-star"></i>';
    else if (i - rating < 1)          s += '<i class="fa fa-star-half-stroke"></i>';
    else                              s += '<i class="fa-regular fa-star"></i>';
  }
  return `<span class="stars">${s}</span><span class="rating-num">${rating}</span>`;
}

// ─── FILTER (HashMap concept: category → products) ────────────────────────────
function filterProducts(category, btn) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  const filtered = category === "all" ? products : products.filter(p => p.category === category);
  renderProducts(filtered);
}

// ─── WISHLIST (HashSet concept) ───────────────────────────────────────────────
const wishlist = new Set(JSON.parse(localStorage.getItem("wishlist") || "[]"));

function toggleWishlist(id, btn) {
  if (wishlist.has(id)) {
    wishlist.delete(id);
    btn.classList.remove("wishlisted");
    showToast("Removed from Wishlist");
  } else {
    wishlist.add(id);
    btn.classList.add("wishlisted");
    showToast("❤️ Added to Wishlist!");
  }
  localStorage.setItem("wishlist", JSON.stringify([...wishlist]));
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "default") {
  const toast   = document.getElementById("toast");
  toast.innerHTML  = msg;
  toast.className  = `toast show toast-${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderProducts(products);

// Restore wishlist button states
wishlist.forEach(id => {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach(card => {
    if (parseInt(card.dataset.id) === id) {
      card.querySelector(".wishlist-btn").classList.add("wishlisted");
    }
  });
});
