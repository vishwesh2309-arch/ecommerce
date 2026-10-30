// ======================================================
// VELORA E-COMMERCE - MAIN JAVASCRIPT
// ======================================================

// PRODUCT DATA — ORIGINAL DEFAULT PRODUCTS
const productDetails = {
    product1: {
        name: "Classic T-Shirt",
        category: "Fashion",
        price: 799,
        image: "images/products/product1.jpg",
        description: "A stylish and comfortable everyday T-shirt."
    },
    product2: {
        name: "Wireless Headphones",
        category: "Electronics",
        price: 2499,
        image: "images/products/product2.jpg",
        description: "Enjoy clear sound with modern wireless headphones."
    },
    product3: {
        name: "Running Shoes",
        category: "Footwear",
        price: 1999,
        image: "images/products/product3.jpg",
        description: "Comfortable running shoes for everyday movement."
    },
    product4: {
        name: "Smart Watch",
        category: "Electronics",
        price: 3499,
        image: "images/products/product4.jpg",
        description: "A modern smart watch for everyday life."
    },
    product5: {
        name: "Premium White T-Shirt",
        category: "Fashion",
        price: 999,
        image: "images/products/product1.jpg",
        description: "A premium white T-shirt with a clean design."
    },
    product6: {
        name: "Premium Bluetooth Headphones",
        category: "Electronics",
        price: 2999,
        image: "images/products/product2.jpg",
        description: "Premium headphones for everyday listening."
    },
    product7: {
        name: "Sport Running Shoes",
        category: "Footwear",
        price: 2299,
        image: "images/products/product3.jpg",
        description: "Sporty shoes designed for comfort and support."
    },
    product8: {
        name: "Advanced Smart Watch",
        category: "Electronics",
        price: 4499,
        image: "images/products/product4.jpg",
        description: "An advanced smart watch with a modern design."
    }
};


// ======================================================
// SHARED ADMIN / CUSTOMER PRODUCT CATALOG
// ======================================================

const VELORA_DEFAULT_PRODUCTS = Object.keys(productDetails).map(function (id) {
    return {
        id: id,
        ...productDetails[id]
    };
});

function normalizeCatalogCategory(category) {
    const value = String(category || "").trim().toLowerCase();

    if (value === "clothing" || value === "fashion") {
        return "Fashion";
    }

    if (value === "electronics" || value === "electronic") {
        return "Electronics";
    }

    if (
        value === "footwear" ||
        value === "shoes" ||
        value === "shoe"
    ) {
        return "Footwear";
    }

    return String(category || "Other").trim();
}

function readAdminCatalog() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("veloraAdminProducts")
        );

        if (Array.isArray(saved)) {
            return saved;
        }
    } catch (error) {
        console.error(
            "Could not read the shared product catalog:",
            error
        );
    }

    // First-time setup: seed the catalog with the original products.
    try {
        localStorage.setItem(
            "veloraAdminProducts",
            JSON.stringify(VELORA_DEFAULT_PRODUCTS)
        );
    } catch (error) {
        console.error(
            "Could not initialize the shared product catalog:",
            error
        );
    }

    return VELORA_DEFAULT_PRODUCTS.map(function (product) {
        return { ...product };
    });
}

function normalizeCatalogProduct(product, index) {
    if (!product || typeof product !== "object") {
        return null;
    }

    const id = String(
        product.id ||
        product.productId ||
        `product${index + 1}`
    ).trim();

    const name = String(
        product.name ||
        product.title ||
        ""
    ).trim();

    if (!id || !name) {
        return null;
    }

    const fallback = productDetails[id] || {};

    const priceValue = Number(product.price);

    const price =
        Number.isFinite(priceValue) && priceValue >= 0
            ? priceValue
            : Number(fallback.price) || 0;

    return {
        id: id,
        name: name,
        category: normalizeCatalogCategory(
            product.category || fallback.category
        ),
        price: price,
        image: String(
            product.image || fallback.image || ""
        ),
        description: String(
            product.description || fallback.description || ""
        ),
        active:
            product.active !== false &&
            product.deleted !== true
    };
}

function getCatalogProducts() {
    return readAdminCatalog()
        .map(normalizeCatalogProduct)
        .filter(function (product) {
            return product && product.active;
        });
}

// Keep the original productDetails object compatible with cart,
// wishlist, reviews, and product-detail page code.
function syncProductDetailsFromCatalog() {
    const catalog = readAdminCatalog();

    catalog.forEach(function (rawProduct, index) {
        const product = normalizeCatalogProduct(
            rawProduct,
            index
        );

        if (!product) {
            return;
        }

        productDetails[product.id] = {
            name: product.name,
            category: product.category,
            price: product.price,
            image: product.image,
            description: product.description
        };
    });
}

function escapeCatalogHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];
    });
}


// ======================================================
// DYNAMIC CUSTOMER PRODUCT CATALOG
// ======================================================

function renderCustomerProductCatalog() {
    const grid = document.getElementById("productGrid");

    if (!grid) {
        return;
    }

    syncProductDetailsFromCatalog();

    const products = getCatalogProducts();

    if (products.length === 0) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = products.map(function (product) {
        const id = escapeCatalogHtml(product.id);
        const name = escapeCatalogHtml(product.name);
        const category = escapeCatalogHtml(product.category);
        const image = escapeCatalogHtml(product.image);
        const price = Number(product.price) || 0;

        return `
            <article
                class="product-card"
                data-category="${category}"
                data-id="${id}"
            >
                <div class="product-image">
                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy"
                        onerror="this.style.visibility='hidden'"
                    >
                </div>

                <div class="product-info">

                    <p class="product-category">
                        ${category}
                    </p>

                    <h3>${name}</h3>

                    <div
                        class="product-rating"
                        data-rating-for="${id}"
                    >
                        <span class="rating-stars">☆☆☆☆☆</span>
                        <span class="rating-text">No reviews yet</span>
                    </div>

                    <div class="product-bottom">

                        <p
                            class="product-price"
                            data-price="${price}"
                        >
                            ₹${price.toLocaleString("en-IN")}
                        </p>

                        <button
                            type="button"
                            class="add-cart"
                            data-product="${name}"
                            data-price="${price}"
                            title="Add to cart"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            Add to Cart
                        </button>

                        <button
                            type="button"
                            class="add-wishlist"
                            data-product="${name}"
                        >
                            ♡ Add to Wishlist
                        </button>

                    </div>

                    <a
                        href="product-details.html?id=${encodeURIComponent(product.id)}"
                        class="view-details"
                    >
                        View Details
                    </a>

                </div>
            </article>
        `;
    }).join("");

    // ADD TO CART
    grid.querySelectorAll(".add-cart").forEach(function (button) {
        button.addEventListener("click", function () {
            const card = button.closest(".product-card");
            const id = card ? card.dataset.id : "";
            const product = productDetails[id];

            if (!product) {
                alert(
                    "This product could not be found. Please refresh the page."
                );
                return;
            }

            addToCart({
                id: id,
                name: product.name,
                price: Number(product.price) || 0,
                image: product.image || ""
            });

            const previousText = button.textContent;

            const previousHtml = button.innerHTML;
            button.classList.add("added");
            button.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added!';
            button.disabled = true;

            setTimeout(function () {
                button.classList.remove("added");
                button.innerHTML = previousHtml || '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> Add to Cart';
                button.disabled = false;
            }, 1200);
        });
    });

    // ADD / REMOVE FROM WISHLIST
    grid.querySelectorAll(".add-wishlist").forEach(function (button) {
        const card = button.closest(".product-card");
        const id = card ? card.dataset.id : "";

        button.addEventListener("click", function () {
            const product = productDetails[id];

            if (!product) {
                return;
            }

            if (isInWishlist(id)) {
                wishlist = wishlist.filter(function (item) {
                    return item.id !== id;
                });
            } else {
                wishlist.push({
                    id: id,
                    name: product.name,
                    price: Number(product.price) || 0,
                    image: product.image || ""
                });
            }

            saveWishlist();
            updateWishlistButtons();
            renderWishlist();
        });
    });

    updateWishlistButtons();
    updateProductCardRatings();
}

// Sync the admin catalog before other features use productDetails.
syncProductDetailsFromCatalog();


// ======================================================
// LOAD STORED ARRAYS
// ======================================================

function loadStoredArray(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key));

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(
            "Unable to read storage:",
            key,
            error
        );

        return [];
    }
}

let cart = loadStoredArray("veloraCart");


// ======================================================
// REPAIR OLD WISHLIST ITEMS
// ======================================================

function normalizeWishlistItems(items) {
    return items.map(function (item) {
        if (!item || typeof item !== "object") {
            return null;
        }

        let matchedId =
            item.id && productDetails[item.id]
                ? item.id
                : null;

        if (!matchedId && item.name) {
            matchedId = Object.keys(productDetails).find(
                function (id) {
                    return productDetails[id].name === item.name;
                }
            ) || null;
        }

        if (!matchedId) {
            return {
                id: item.id || "",
                name: item.name || "Unknown product",
                price: Number.isFinite(Number(item.price))
                    ? Number(item.price)
                    : 0,
                image: item.image || ""
            };
        }

        const product = productDetails[matchedId];

        return {
            ...item,
            id: matchedId,
            name: product.name,
            price: Number(product.price),
            image: product.image
        };
    }).filter(Boolean);
}

let wishlist = normalizeWishlistItems(
    loadStoredArray("veloraWishlist")
);

// Save repaired wishlist data.
try {
    localStorage.setItem(
        "veloraWishlist",
        JSON.stringify(wishlist)
    );
} catch (error) {
    console.error(
        "Unable to repair saved wishlist:",
        error
    );
}


// ======================================================
// CART COUNT
// ======================================================

function updateCartCount() {
    const elements = document.querySelectorAll(".cart-count");

    const quantity = cart.reduce(function (total, item) {
        return total + (Number(item.quantity) || 1);
    }, 0);

    elements.forEach(function (element) {
        element.textContent = quantity;
    });
}


// ======================================================
// SAVE CART
// ======================================================

function saveCart() {
    localStorage.setItem(
        "veloraCart",
        JSON.stringify(cart)
    );

    updateCartCount();
}


// ======================================================
// ADD TO CART
// ======================================================

function addToCart(product) {
    if (!product || !product.id) {
        console.error("Invalid product:", product);
        return;
    }

    const existing = cart.find(function (item) {
        return item.id === product.id;
    });

    if (existing) {
        existing.quantity =
            (Number(existing.quantity) || 1) + 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image || "",
            quantity: 1
        });
    }

    saveCart();
}


// Render the shared catalog before binding customer interactions.

/* ======================================================
   STAGE 20.5.8 — LOAD PRODUCTS FROM SUPABASE PHP API
   ====================================================== */

async function loadProductsFromSupabase() {
    try {
        const response = await fetch("../backend/api/products.php", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error(
                "Products API returned HTTP " + response.status
            );
        }

        const result = await response.json();

        if (result.success !== true) {
            throw new Error(
                result.message || "Could not load products."
            );
        }

        const products = result.data.products;

        if (!Array.isArray(products)) {
            throw new Error("Invalid products API response.");
        }

        // Preserve the product codes used by the existing
        // cart, wishlist and product-details features.
        const catalog = products.map(function (product) {
            return {
                id: String(product.product_code),
                name: String(product.name || ""),
                category: normalizeCatalogCategory(
                    product.category
                ),
                price: Number(product.price) || 0,
                image: String(product.image_url || ""),
                description: String(product.description || ""),
                active: true
            };
        });

        // Use Supabase as the source for the customer catalog.
        localStorage.setItem(
            "veloraAdminProducts",
            JSON.stringify(catalog)
        );

        // Refresh the shared in-memory product details.
        syncProductDetailsFromCatalog();

        // Rebuild the visible storefront.
        renderCustomerProductCatalog();

        // Refresh category filters using the database products.
        if (typeof refreshProductCategoryOptions === "function") {
            refreshProductCategoryOptions();
        }

        if (typeof filterProducts === "function") {
            filterProducts();
        }

        // Refresh the currently open product details page.
        if (typeof renderCurrentProductDetails === "function") {
            renderCurrentProductDetails();
        }

        console.log(
            "Velora: loaded " + catalog.length +
            " products from Supabase."
        );

    } catch (error) {
        console.error(
            "Could not load products from Supabase:",
            error
        );

        console.warn(
            "The existing locally saved catalog remains available."
        );
    }
}

// Show the existing catalog first, then replace it with
// the database catalog when the API responds.
renderCustomerProductCatalog();
loadProductsFromSupabase();



// ======================================================
// PRODUCT DETAILS PAGE
// ======================================================

const productDetailsContainer =
    document.getElementById("productDetails");

if (productDetailsContainer) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    syncProductDetailsFromCatalog();

    const product = productDetails[productId];

    if (product) {
        productDetailsContainer.innerHTML = `
            <div class="product-detail-image">
                <img
                    src="${escapeCatalogHtml(product.image)}"
                    alt="${escapeCatalogHtml(product.name)}"
                >
            </div>

            <div class="product-detail-info">

                <p class="product-category">
                    ${escapeCatalogHtml(product.category)}
                </p>

                <h1>${escapeCatalogHtml(product.name)}</h1>

                <p class="product-detail-price">
                    ₹${Number(product.price).toLocaleString("en-IN")}
                </p>

                <p class="product-description">
                    ${escapeCatalogHtml(product.description)}
                </p>

                <button
                    type="button"
                    id="detailAddCart"
                    class="add-cart"
                >
                    Add to Cart
                </button>

            </div>
        `;

        document.getElementById("detailAddCart")
            .addEventListener("click", function () {
                addToCart({
                    id: productId,
                    name: product.name,
                    price: product.price,
                    image: product.image
                });

                this.textContent = "Added to Cart";

                setTimeout(() => {
                    this.textContent = "Add to Cart";
                }, 1000);
            });
    } else {
        productDetailsContainer.innerHTML =
            "<p>Product not found. Please return to the shop.</p>";
    }
}


// ======================================================
// WISHLIST SAVE
// ======================================================

function saveWishlist() {
    localStorage.setItem(
        "veloraWishlist",
        JSON.stringify(wishlist)
    );
}

function isInWishlist(id) {
    return wishlist.some(function (item) {
        return item.id === id;
    });
}

function updateWishlistButtons() {
    document.querySelectorAll(".add-wishlist")
        .forEach(function (button) {
            const card = button.closest(".product-card");
            const id = card ? card.dataset.id : null;

            if (!id) {
                return;
            }

            if (isInWishlist(id)) {
                button.textContent = "♥ In Wishlist";
                button.classList.add("wishlisted");
            } else {
                button.textContent = "♡ Add to Wishlist";
                button.classList.remove("wishlisted");
            }
        });
}


// ======================================================
// PRODUCTS PAGE - SEARCH, FILTER AND SORT
// ======================================================

const productSearch =
    document.getElementById("productSearch");

const categoryFilter =
    document.getElementById("categoryFilter");

const sortProducts =
    document.getElementById("sortProducts");

const productGrid =
    document.getElementById("productGrid");

const productResultCount =
    document.getElementById("productResultCount");

const noProducts =
    document.getElementById("noProducts");

// Build category options from the shared catalog.
if (categoryFilter) {
    const previousValue = categoryFilter.value || "all";

    const categories = [...new Set(
        getCatalogProducts()
            .map(function (product) {
                return product.category;
            })
            .filter(Boolean)
    )];

    categoryFilter.innerHTML =
        '<option value="all">All Categories</option>' +
        categories.map(function (category) {
            const safeCategory = escapeCatalogHtml(category);

            return `
                <option value="${safeCategory}">
                    ${safeCategory}
                </option>
            `;
        }).join("");

    categoryFilter.value = categories.includes(previousValue)
        ? previousValue
        : "all";
}

function filterProducts() {
    if (!productGrid) {
        return;
    }

    const cards = Array.from(
        productGrid.querySelectorAll(".product-card")
    );

    const search = productSearch
        ? productSearch.value.trim().toLowerCase()
        : "";

    const selectedCategory = categoryFilter
        ? categoryFilter.value
        : "all";

    function normalizeSearchWord(word) {
        word = word.trim().toLowerCase();

        if (word.length > 3 && word.endsWith("ies")) {
            return word.slice(0, -3) + "y";
        }

        if (word.length > 3 && word.endsWith("es")) {
            return word.slice(0, -2);
        }

        if (word.length > 2 && word.endsWith("s")) {
            return word.slice(0, -1);
        }

        return word;
    }

    const searchWords = search
        .split(/\s+/)
        .filter(Boolean)
        .map(normalizeSearchWord);

    let visible = [];

    cards.forEach(function (card) {
        const name = (
            card.querySelector("h3")?.textContent || ""
        ).trim().toLowerCase();

        const category = card.dataset.category || "";

        const categoryMatch =
            selectedCategory === "all" ||
            category === selectedCategory;

        const searchMatch = searchWords.every(function (word) {
            const normalizedProductName =
                normalizeSearchWord(name);

            return (
                normalizedProductName.includes(word) ||
                name.includes(word)
            );
        });

        if (categoryMatch && searchMatch) {
            card.style.display = "";
            visible.push(card);
        } else {
            card.style.display = "none";
        }
    });

    const sortValue = sortProducts
        ? sortProducts.value
        : "default";

    if (sortValue !== "default") {
        visible.sort(function (a, b) {
            if (sortValue === "name") {
                const nameA =
                    a.querySelector("h3").textContent.trim();

                const nameB =
                    b.querySelector("h3").textContent.trim();

                return nameA.localeCompare(nameB);
            }

            const priceA = Number(
                a.querySelector("[data-price]")?.dataset.price ||
                a.querySelector(".price")?.textContent
                    .replace(/[^\d]/g, "") ||
                0
            );

            const priceB = Number(
                b.querySelector("[data-price]")?.dataset.price ||
                b.querySelector(".price")?.textContent
                    .replace(/[^\d]/g, "") ||
                0
            );

            return sortValue === "low-high"
                ? priceA - priceB
                : priceB - priceA;
        });

        visible.forEach(function (card) {
            productGrid.appendChild(card);
        });
    }

    if (productResultCount) {
        productResultCount.textContent =
            `Showing ${visible.length} product${
                visible.length === 1 ? "" : "s"
            }`;
    }

    if (noProducts) {
        noProducts.style.display =
            visible.length ? "none" : "block";
    }
}

if (productSearch) {
    productSearch.addEventListener(
        "input",
        filterProducts
    );
}

if (categoryFilter) {
    categoryFilter.addEventListener(
        "change",
        filterProducts
    );
}

if (sortProducts) {
    sortProducts.addEventListener(
        "change",
        filterProducts
    );
}

// CATEGORY FROM HOMEPAGE
const urlParams =
    new URLSearchParams(window.location.search);

const categoryFromURL =
    urlParams.get("category");

if (categoryFilter && categoryFromURL) {
    const validCategories = [...new Set(
        getCatalogProducts().map(function (product) {
            return product.category;
        })
    )];

    const matchingCategory = validCategories.find(
        function (category) {
            return (
                category.toLowerCase() ===
                categoryFromURL.toLowerCase()
            );
        }
    );

    if (matchingCategory) {
        categoryFilter.value = matchingCategory;
    }
}

filterProducts();


// ======================================================
// CART PAGE
// ======================================================

const cartItemsContainer =
    document.getElementById("cartItems");

const cartSubtotal =
    document.getElementById("cartSubtotal");

const cartTotal =
    document.getElementById("cartTotal");

const cartItemsCount =
    document.getElementById("cartItemsCount");

const summaryItems =
    document.getElementById("summaryItems");

const emptyCartElement =
    document.getElementById("emptyCart");

function renderCart() {
    if (!cartItemsContainer) {
        return;
    }

    const totalQuantity = cart.reduce(function (total, item) {
        return total + (Number(item.quantity) || 1);
    }, 0);

    const subtotal = cart.reduce(function (total, item) {
        return total +
            (Number(item.price) || 0) *
            (Number(item.quantity) || 1);
    }, 0);

    if (cartItemsCount) {
        cartItemsCount.textContent =
            `${totalQuantity} ${
                totalQuantity === 1 ? "item" : "items"
            }`;
    }

    if (summaryItems) {
        summaryItems.textContent = totalQuantity;
    }

    if (cartSubtotal) {
        cartSubtotal.textContent =
            `₹${subtotal.toLocaleString("en-IN")}`;
    }

    if (cartTotal) {
        cartTotal.textContent =
            `₹${subtotal.toLocaleString("en-IN")}`;
    }

    if (emptyCartElement) {
        emptyCartElement.style.display =
            cart.length === 0 ? "block" : "none";
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "";
        return;
    }

    cartItemsContainer.innerHTML = "";

    cart.forEach(function (item, index) {
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const itemTotal = price * quantity;

        const row = document.createElement("article");
        row.className = "cart-item";

        row.innerHTML = `
            <div class="cart-item-image">
                <img
                    src="${item.image || ""}"
                    alt="${item.name || "Product"}"
                >
            </div>

            <div class="cart-item-info">
                <h3>${item.name || "Product"}</h3>

                <p class="cart-item-price">
                    ₹${price.toLocaleString("en-IN")}
                </p>
            </div>

            <div class="cart-item-actions">

                <div class="quantity-control">

                    <button
                        type="button"
                        class="quantity-button quantity-minus"
                        data-index="${index}"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>

                    <span class="quantity-number">
                        ${quantity}
                    </span>

                    <button
                        type="button"
                        class="quantity-button quantity-plus"
                        data-index="${index}"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>

                </div>

                <button
                    type="button"
                    class="remove-cart-item"
                    data-index="${index}"
                >
                    Remove
                </button>

            </div>

            <div class="cart-item-total">
                ₹${itemTotal.toLocaleString("en-IN")}
            </div>
        `;

        cartItemsContainer.appendChild(row);
    });

    // INCREASE QUANTITY
    cartItemsContainer.querySelectorAll(".quantity-plus")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.dataset.index);

                if (!cart[index]) {
                    return;
                }

                cart[index].quantity =
                    (Number(cart[index].quantity) || 1) + 1;

                saveCart();
                renderCart();
            });
        });

    // DECREASE QUANTITY
    cartItemsContainer.querySelectorAll(".quantity-minus")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.dataset.index);

                if (!cart[index]) {
                    return;
                }

                const quantity =
                    Number(cart[index].quantity) || 1;

                if (quantity > 1) {
                    cart[index].quantity = quantity - 1;
                } else {
                    cart.splice(index, 1);
                }

                saveCart();
                renderCart();
            });
        });

    // REMOVE CART ITEM
    cartItemsContainer.querySelectorAll(".remove-cart-item")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.dataset.index);

                if (
                    !Number.isInteger(index) ||
                    !cart[index]
                ) {
                    return;
                }

                cart.splice(index, 1);

                saveCart();
                renderCart();
            });
        });
}


// ======================================================
// WISHLIST PAGE
// ======================================================

const wishlistContainer =
    document.getElementById("wishlistItems");

function renderWishlist() {
    if (!wishlistContainer) {
        return;
    }

    wishlistContainer.innerHTML = "";

    if (wishlist.length === 0) {
        wishlistContainer.innerHTML = `
            <div class="empty-wishlist">
                <h3>Your wishlist is empty</h3>

                <p>
                    You haven't added any products to your wishlist yet.
                </p>

                <a href="products.html" class="btn">
                    Browse Products
                </a>
            </div>
        `;

        return;
    }

    wishlist.forEach(function (item, index) {
        const row = document.createElement("div");
        row.className = "wishlist-item";

        const price = Number.isFinite(Number(item.price))
            ? Number(item.price)
            : 0;

        row.innerHTML = `
            <div class="wishlist-image">
                <img
                    src="${item.image || ""}"
                    alt="${item.name || "Product"}"
                >
            </div>

            <div class="wishlist-info">
                <h3>${item.name || "Product"}</h3>

                <p>
                    ₹${price.toLocaleString("en-IN")}
                </p>
            </div>

            <button
                type="button"
                class="wishlist-cart"
                data-index="${index}"
            >
                Add to Cart
            </button>

            <button
                type="button"
                class="remove-wishlist"
                data-index="${index}"
            >
                Remove
            </button>
        `;

        const image = row.querySelector("img");

        image.addEventListener("error", function () {
            image.style.display = "none";
        });

        wishlistContainer.appendChild(row);
    });

    // ADD WISHLIST ITEM TO CART
    wishlistContainer.querySelectorAll(".wishlist-cart")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                const item =
                    wishlist[Number(button.dataset.index)];

                if (!item) {
                    return;
                }

                addToCart(item);

                button.textContent = "Added to Cart";

                setTimeout(function () {
                    button.textContent = "Add to Cart";
                }, 1000);
            });
        });

    // REMOVE WISHLIST ITEM
    wishlistContainer.querySelectorAll(".remove-wishlist")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.dataset.index);

                if (!wishlist[index]) {
                    return;
                }

                wishlist.splice(index, 1);

                saveWishlist();
                renderWishlist();
                updateWishlistButtons();
            });
        });
}


// ======================================================
// CHECKOUT PAGE ELEMENTS
// ======================================================

const checkoutItems =
    document.getElementById("checkoutItems");

const checkoutSubtotal =
    document.getElementById("checkoutSubtotal");

const checkoutTotal =
    document.getElementById("checkoutTotal");

const checkoutForm =
    document.getElementById("checkoutForm");

const placeOrderBtn =
    document.getElementById("placeOrderBtn");

function resetCheckoutButton() {
    if (checkoutForm) {
        checkoutForm.dataset.submitting = "false";
    }

    if (placeOrderBtn) {
        placeOrderBtn.textContent = "Place Order";
        placeOrderBtn.disabled = cart.length === 0;

        placeOrderBtn.classList.add("place-order-button");
    }
}


// ======================================================
// RENDER CHECKOUT SUMMARY
// ======================================================

function renderCheckout() {
    if (!checkoutItems) {
        return;
    }

    if (cart.length === 0) {
        checkoutItems.innerHTML = `
            <p class="checkout-empty-message">
                Your cart is empty.
            </p>

            <a href="products.html" class="btn">
                Continue Shopping
            </a>
        `;

        if (checkoutSubtotal) {
            checkoutSubtotal.textContent = "₹0";
        }

        if (checkoutTotal) {
            checkoutTotal.textContent = "₹0";
        }

        resetCheckoutButton();
        return;
    }

    checkoutItems.innerHTML = "";

    let subtotal = 0;

    cart.forEach(function (item) {
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const total = price * quantity;

        subtotal += total;

        const row = document.createElement("div");
        row.className = "checkout-item";

        row.innerHTML = `
            <div class="checkout-item-info">
                <h3>
                    ${item.name || "Product"}
                    <span>× ${quantity}</span>
                </h3>
            </div>

            <span class="checkout-item-price">
                ₹${total.toLocaleString("en-IN")}
            </span>
        `;

        checkoutItems.appendChild(row);
    });

    if (checkoutSubtotal) {
        checkoutSubtotal.textContent =
            `₹${subtotal.toLocaleString("en-IN")}`;
    }

    if (checkoutTotal) {
        checkoutTotal.textContent =
            `₹${subtotal.toLocaleString("en-IN")}`;
    }

    resetCheckoutButton();
}


// ======================================================
// RESTORE STATE ON BACK/FORWARD NAVIGATION
// ======================================================

window.addEventListener("pageshow", function () {
    cart = loadStoredArray("veloraCart");

    wishlist = normalizeWishlistItems(
        loadStoredArray("veloraWishlist")
    );

    saveWishlist();

    updateCartCount();
    renderCart();
    renderCheckout();
    renderWishlist();
    updateWishlistButtons();
    resetCheckoutButton();
});


// ======================================================
// CHECKOUT FORM SUBMISSION
// ======================================================


if (checkoutForm) {
    checkoutForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        cart = loadStoredArray("veloraCart");

        if (cart.length === 0) {
            alert("Your cart is empty. Please add products before placing an order.");
            renderCheckout();
            resetCheckoutButton();
            return;
        }

        if (checkoutForm.dataset.submitting === "true") {
            return;
        }

        const fullName =
            document.getElementById("fullName")?.value.trim() || "";

        const email =
            document.getElementById("email")?.value.trim() || "";

        const phone =
            document.getElementById("phone")?.value.trim() || "";

        const address =
            document.getElementById("address")?.value.trim() || "";

        const city =
            document.getElementById("city")?.value.trim() || "";

        const pincode =
            document.getElementById("pincode")?.value.trim() || "";

        const paymentMethod = checkoutForm.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value;

        function validationError(message) {
            alert(message);
        }

        if (fullName.length < 2 || !/[A-Za-z]/.test(fullName)) {
            validationError("Please enter a valid full name.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            validationError("Please enter a valid email address.");
            return;
        }

        const normalizedPhone = phone.replace(/[\s()-]/g, "");

        if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
            validationError(
                "Please enter a valid phone number with country code if required."
            );
            return;
        }

        if (address.length < 5) {
            validationError("Please enter a valid delivery address.");
            return;
        }

        if (city.length < 2 || !/[A-Za-z]/.test(city)) {
            validationError("Please enter a valid city name.");
            return;
        }

        if (!/^[0-9]{6}$/.test(pincode)) {
            validationError("Please enter a valid 6-digit PIN code.");
            return;
        }

        if (paymentMethod !== "COD") {
            validationError("Please select Cash on Delivery.");
            return;
        }

        checkoutForm.dataset.submitting = "true";

        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = "Processing...";
        }

        try {
            const response = await fetch("../backend/api/create-order.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                cache: "no-store",
                body: JSON.stringify({
                    fullName: fullName,
                    email: email,
                    phone: normalizedPhone,
                    address: address,
                    city: city,
                    pincode: pincode,
                    paymentMethod: "COD",
                    items: cart.map(function (item) {
                        return {
                            id: String(item.id),
                            quantity: Number(item.quantity) || 1
                        };
                    })
                })
            });

            const result = await response.json();

            if (!response.ok || result.success !== true) {
                if (response.status === 401) {
                    alert("Your session has expired. Please log in again.");
                    window.location.href = "login.html";
                    return;
                }

                throw new Error(
                    result.message || "Could not place your order."
                );
            }

            const savedOrder = result.order;

            // Keep the existing order-success page compatible.
            const order = {
                orderId: savedOrder.orderId,
                databaseOrderId: savedOrder.id,

                customer: {
                    fullName: fullName,
                    email: email,
                    phone: normalizedPhone,
                    address: address,
                    city: city,
                    pincode: pincode
                },

                items: cart.map(function (item) {
                    return { ...item };
                }),

                total: Number(savedOrder.total),
                paymentMethod: savedOrder.paymentMethod,
                paymentStatus: savedOrder.paymentStatus,
                date: new Date().toISOString(),
                status: savedOrder.status
            };

            localStorage.setItem(
                "veloraOrder",
                JSON.stringify(order)
            );

            // Remove this order's items from the cart only after
            // the server confirms that the database transaction succeeded.
            localStorage.setItem("veloraCart", JSON.stringify([]));

            cart = [];
            updateCartCount();

            window.location.href = "order-success.html";

        } catch (error) {
            console.error("Velora checkout failed:", error);

            alert(
                error.message ||
                "Your order could not be placed. Please try again."
            );

            cart = loadStoredArray("veloraCart");
            resetCheckoutButton();
            renderCheckout();
        }
    });
}



// ======================================================
// ORDER SUCCESS PAGE
// ======================================================

function loadOrderSuccess() {
    const container =
        document.getElementById("orderSuccessDetails");

    const orderIdElement =
        document.getElementById("successOrderId");

    const orderTotalElement =
        document.getElementById("successOrderTotal");

    let order = null;

    try {
        order = JSON.parse(
            localStorage.getItem("veloraOrder")
        );
    } catch (error) {
        order = null;
    }

    if (container) {
        if (!order) {
            container.innerHTML = `
                <p>No recent order was found.</p>

                <a href="products.html" class="btn">
                    Continue Shopping
                </a>
            `;
        } else {
            container.innerHTML = `
                <p>
                    Order ID:
                    <strong>${escapeCatalogHtml(order.orderId)}</strong>
                </p>

                <p>
                    Total:
                    <strong>
                        ₹${(Number(order.total) || 0).toLocaleString("en-IN")}
                    </strong>
                </p>

                <p>Thank you for shopping with Velora.</p>
            `;
        }
    }

    if (orderIdElement) {
        orderIdElement.textContent =
            order ? order.orderId : "No order found";
    }

    if (orderTotalElement) {
        orderTotalElement.textContent = order
            ? `₹${(Number(order.total) || 0).toLocaleString("en-IN")}`
            : "₹0";
    }
}


// ======================================================
// HOMEPAGE SEARCH BUTTON
// ======================================================

const homeSearchBtn =
    document.getElementById("homeSearchBtn");

if (homeSearchBtn) {
    homeSearchBtn.addEventListener("click", function () {
        window.location.href = "products.html";
    });
}


// ======================================================
// INITIALIZE PAGE
// ======================================================

updateCartCount();
renderCart();
renderWishlist();
renderCheckout();
loadOrderSuccess();
updateWishlistButtons();


// ======================================================
// VELORA PRODUCT REVIEWS - SUBMIT, EDIT AND DELETE
// ======================================================

(function () {
    const reviewForm =
        document.getElementById("reviewForm");

    if (!reviewForm) {
        return;
    }

    const reviewName =
        document.getElementById("reviewName");

    const reviewRating =
        document.getElementById("reviewRating");

    const reviewComment =
        document.getElementById("reviewComment");

    const reviewMessage =
        document.getElementById("reviewMessage");

    const productReviews =
        document.getElementById("productReviews");

    const params =
        new URLSearchParams(window.location.search);

    const productId =
        params.get("id");

    const product = productId && productDetails[productId]
        ? productDetails[productId]
        : null;

    let editingReviewId = null;

    if (!product) {
        reviewForm.hidden = true;

        if (reviewMessage) {
            reviewMessage.textContent =
                "Open a valid product before submitting a review.";
        }

        return;
    }

    // LOAD REVIEWS AND GIVE OLD REVIEWS STABLE IDs
    function loadReviews() {
        try {
            const saved = JSON.parse(
                localStorage.getItem("veloraReviews")
            );

            if (!Array.isArray(saved)) {
                return [];
            }

            let changed = false;

            saved.forEach(function (review) {
                if (
                    review &&
                    typeof review === "object" &&
                    !review.reviewId
                ) {
                    review.reviewId =
                        "REV-" +
                        Date.now().toString(36) +
                        "-" +
                        Math.random().toString(36).slice(2, 10);

                    changed = true;
                }
            });

            if (changed) {
                localStorage.setItem(
                    "veloraReviews",
                    JSON.stringify(saved)
                );
            }

            return saved.filter(function (review) {
                return review && typeof review === "object";
            });
        } catch (error) {
            console.error(
                "Could not load reviews:",
                error
            );

            return [];
        }
    }

    function saveReviews(reviews) {
        try {
            localStorage.setItem(
                "veloraReviews",
                JSON.stringify(reviews)
            );

            return true;
        } catch (error) {
            console.error(
                "Could not save reviews:",
                error
            );

            return false;
        }
    }

    function escapeReviewText(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function cancelEditing() {
        editingReviewId = null;

        reviewForm.reset();

        const submitButton = reviewForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.textContent = "Submit Review";
        }

        const cancelButton = document.getElementById(
            "cancelReviewEditBtn"
        );

        if (cancelButton) {
            cancelButton.remove();
        }
    }

    function showCancelEditButton() {
        let cancelButton = document.getElementById(
            "cancelReviewEditBtn"
        );

        if (cancelButton) {
            return;
        }

        cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.id = "cancelReviewEditBtn";
        cancelButton.className = "btn";
        cancelButton.textContent = "Cancel Editing";
        cancelButton.style.marginLeft = "10px";

        const submitButton = reviewForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.insertAdjacentElement(
                "afterend",
                cancelButton
            );
        } else {
            reviewForm.appendChild(cancelButton);
        }

        cancelButton.addEventListener("click", function () {
            cancelEditing();

            if (reviewMessage) {
                reviewMessage.textContent =
                    "Editing cancelled.";
            }

            reviewRating.focus();
        });
    }

    // RENDER REVIEWS
    function renderReviews() {
        if (!productReviews) {
            return;
        }

        const reviews = loadReviews().filter(
            function (review) {
                return review.productId === productId;
            }
        );

        if (reviews.length === 0) {
            productReviews.innerHTML =
                "<p>No reviews yet. Be the first to review this product.</p>";

            updateProductCardRatings();
            return;
        }

        const validReviews = reviews.filter(
            function (review) {
                const rating = Number(review.rating);

                return (
                    Number.isInteger(rating) &&
                    rating >= 1 &&
                    rating <= 5
                );
            }
        );

        const totalRating = validReviews.reduce(
            function (total, review) {
                return total + Number(review.rating);
            },
            0
        );

        const average = validReviews.length
            ? (totalRating / validReviews.length).toFixed(1)
            : "0.0";

        productReviews.innerHTML = `
            <h3>
                ${average} / 5
                <span class="rating-stars">★</span>
                (${reviews.length}
                ${reviews.length === 1 ? "review" : "reviews"})
            </h3>

            ${reviews.map(function (review) {
                const rating = Math.min(
                    5,
                    Math.max(0, Number(review.rating) || 0)
                );

                const stars =
                    "★".repeat(rating) +
                    "☆".repeat(5 - rating);

                const reviewDate = review.date
                    ? new Date(review.date).toLocaleDateString("en-IN")
                    : "";

                return `
                    <article class="review-entry">

                        <h3>
                            ${escapeReviewText(review.name || "Customer")}
                        </h3>

                        <p class="review-stars">${stars}</p>

                        <p class="review-comment">
                            ${escapeReviewText(review.comment || "")}
                        </p>

                        <small>
                            ${escapeReviewText(reviewDate)}
                        </small>

                        <div class="review-actions">

                            <button
                                type="button"
                                class="edit-review-btn"
                                data-review-id="${escapeReviewText(review.reviewId)}"
                            >
                                Edit Review
                            </button>

                            <button
                                type="button"
                                class="delete-review-btn"
                                data-review-id="${escapeReviewText(review.reviewId)}"
                            >
                                Delete Review
                            </button>

                        </div>

                    </article>
                `;
            }).join("")}
        `;

        // EDIT REVIEW
        productReviews.querySelectorAll(".edit-review-btn")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    const reviewId = button.dataset.reviewId;
                    const reviews = loadReviews();

                    const review = reviews.find(
                        function (item) {
                            return (
                                item.reviewId === reviewId &&
                                item.productId === productId
                            );
                        }
                    );

                    if (!review) {
                        reviewMessage.textContent =
                            "Review not found. Please refresh the page.";

                        return;
                    }

                    const enteredName = prompt(
                        "Enter the name used for this review:"
                    );

                    if (enteredName === null) {
                        return;
                    }

                    if (
                        enteredName.trim().toLowerCase() !==
                        String(review.name || "").trim().toLowerCase()
                    ) {
                        alert(
                            "The name does not match this review."
                        );

                        return;
                    }

                    editingReviewId = reviewId;

                    reviewName.value = review.name || "";
                    reviewRating.value = String(review.rating || "");
                    reviewComment.value = review.comment || "";

                    const submitButton = reviewForm.querySelector(
                        'button[type="submit"]'
                    );

                    if (submitButton) {
                        submitButton.textContent = "Save Changes";
                    }

                    showCancelEditButton();

                    reviewMessage.textContent =
                        "Edit your review above, then click Save Changes.";

                    reviewForm.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    reviewComment.focus();
                });
            });

        // DELETE REVIEW
        productReviews.querySelectorAll(".delete-review-btn")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    const reviewId = button.dataset.reviewId;
                    const reviews = loadReviews();

                    const review = reviews.find(
                        function (item) {
                            return (
                                item.reviewId === reviewId &&
                                item.productId === productId
                            );
                        }
                    );

                    if (!review) {
                        reviewMessage.textContent =
                            "Review not found. Please refresh the page.";

                        return;
                    }

                    const enteredName = prompt(
                        "Enter the name used for this review:"
                    );

                    if (enteredName === null) {
                        return;
                    }

                    if (
                        enteredName.trim().toLowerCase() !==
                        String(review.name || "").trim().toLowerCase()
                    ) {
                        alert(
                            "The name does not match this review."
                        );

                        return;
                    }

                    const confirmed = confirm(
                        "Are you sure you want to delete this review? This cannot be undone."
                    );

                    if (!confirmed) {
                        return;
                    }

                    const latestReviews = loadReviews();

                    const index = latestReviews.findIndex(
                        function (item) {
                            return (
                                item.reviewId === reviewId &&
                                item.productId === productId
                            );
                        }
                    );

                    if (index === -1) {
                        reviewMessage.textContent =
                            "Review not found. Please refresh the page.";

                        return;
                    }

                    latestReviews.splice(index, 1);

                    if (!saveReviews(latestReviews)) {
                        reviewMessage.textContent =
                            "Could not delete the review. Please try again.";

                        return;
                    }

                    if (editingReviewId === reviewId) {
                        cancelEditing();
                    }

                    reviewMessage.textContent =
                        "Review deleted successfully.";

                    renderReviews();
                    updateProductCardRatings();
                });
            });

        updateProductCardRatings();
    }

    // SUBMIT NEW REVIEW OR SAVE EDITED REVIEW
    reviewForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = reviewName.value.trim();
        const rating = Number(reviewRating.value);
        const comment = reviewComment.value.trim();

        if (name.length < 2) {
            reviewMessage.textContent =
                "Please enter a name with at least 2 characters.";

            return;
        }

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            reviewMessage.textContent =
                "Please select a rating from 1 to 5 stars.";

            return;
        }

        if (!comment) {
            reviewMessage.textContent =
                "Please write your review before submitting.";

            return;
        }

        const reviews = loadReviews();

        // SAVE EDIT
        if (editingReviewId) {
            const index = reviews.findIndex(
                function (review) {
                    return (
                        review.reviewId === editingReviewId &&
                        review.productId === productId
                    );
                }
            );

            if (index === -1) {
                reviewMessage.textContent =
                    "Review not found. Please refresh the page.";

                cancelEditing();
                renderReviews();

                return;
            }

            // Do not allow the reviewer's name to change.
            if (
                name.toLowerCase() !==
                String(reviews[index].name || "").trim().toLowerCase()
            ) {
                reviewMessage.textContent =
                    "The review name cannot be changed while editing.";

                return;
            }

            reviews[index] = {
                ...reviews[index],
                rating: rating,
                comment: comment,
                date: new Date().toISOString()
            };

            if (!saveReviews(reviews)) {
                reviewMessage.textContent =
                    "Could not save your changes. Please try again.";

                return;
            }

            cancelEditing();

            reviewMessage.textContent =
                "Your review was updated successfully.";

            renderReviews();
            updateProductCardRatings();

            return;
        }

        // SUBMIT NEW REVIEW
        reviews.unshift({
            reviewId:
                "REV-" +
                Date.now().toString(36) +
                "-" +
                Math.random().toString(36).slice(2, 10),

            productId: productId,
            productName: product.name,
            name: name,
            rating: rating,
            comment: comment,
            date: new Date().toISOString()
        });

        if (!saveReviews(reviews)) {
            reviewMessage.textContent =
                "Your review could not be saved. Please try again.";

            return;
        }

        reviewForm.reset();

        reviewMessage.textContent =
            "Your review was saved successfully.";

        renderReviews();
        updateProductCardRatings();
    });

    renderReviews();
})();


// ======================================================
// UPDATE PRODUCT CARD RATINGS
// ======================================================

function updateProductCardRatings() {
    let reviews = [];

    try {
        const saved = JSON.parse(
            localStorage.getItem("veloraReviews")
        );

        if (Array.isArray(saved)) {
            reviews = saved;
        }
    } catch (error) {
        console.error(
            "Could not read product ratings:",
            error
        );
    }

    document.querySelectorAll("[data-rating-for]")
        .forEach(function (element) {
            const id = element.dataset.ratingFor;

            const productReviews = reviews.filter(
                function (review) {
                    return review.productId === id;
                }
            );

            const starsElement =
                element.querySelector(".rating-stars");

            const textElement =
                element.querySelector(".rating-text");

            if (!starsElement || !textElement) {
                return;
            }

            if (productReviews.length === 0) {
                starsElement.textContent = "☆☆☆☆☆";
                textElement.textContent = "No reviews yet";

                return;
            }

            const validReviews = productReviews.filter(
                function (review) {
                    const rating = Number(review.rating);

                    return (
                        Number.isInteger(rating) &&
                        rating >= 1 &&
                        rating <= 5
                    );
                }
            );

            if (validReviews.length === 0) {
                starsElement.textContent = "☆☆☆☆☆";
                textElement.textContent = "No valid ratings";

                return;
            }

            const total = validReviews.reduce(
                function (sum, review) {
                    return sum + Number(review.rating);
                },
                0
            );

            const average = total / validReviews.length;
            const rounded = Math.round(average);

            starsElement.textContent =
                "★".repeat(rounded) +
                "☆".repeat(5 - rounded);

            textElement.textContent =
                `${average.toFixed(1)} (${validReviews.length} ${
                    validReviews.length === 1 ? "review" : "reviews"
                })`;
        });
}

updateProductCardRatings();



/* ======================================================
   VELORA AUTH NAVIGATION — PHP SESSION
====================================================== */

document.addEventListener("DOMContentLoaded", async function () {
    const nav = document.querySelector(".nav-links");

    if (!nav) return;

    function findLink(href) {
        return nav.querySelector(`a[href="${href}"]`);
    }

    let loginLink = findLink("login.html");
    let registerLink = findLink("register.html");
    let accountLink = findLink("account.html");
    let ordersLink = findLink("my-orders.html");
    let logoutLink = document.getElementById("navLogoutBtn");

    if (!accountLink) {
        accountLink = document.createElement("a");
        accountLink.href = "account.html";
        accountLink.textContent = "Account";
        accountLink.id = "navAccountLink";
        nav.appendChild(accountLink);
    }

    if (!ordersLink) {
        ordersLink = document.createElement("a");
        ordersLink.href = "my-orders.html";
        ordersLink.textContent = "My Orders";
        ordersLink.id = "navOrdersLink";

        // Avoid adding a duplicate My Orders link.
        const existingOrdersLink = findLink("my-orders.html");

        if (!existingOrdersLink) {
            nav.appendChild(ordersLink);
        } else {
            ordersLink = existingOrdersLink;
        }
    }

    if (!logoutLink) {
        logoutLink = document.createElement("a");
        logoutLink.href = "login.html";
        logoutLink.textContent = "Logout";
        logoutLink.id = "navLogoutBtn";
        nav.appendChild(logoutLink);
    }

    function showLoggedOut() {
        if (loginLink) loginLink.style.display = "";
        if (registerLink) registerLink.style.display = "";

        accountLink.style.display = "none";
        ordersLink.style.display = "none";
        logoutLink.style.display = "none";
    }

    function showLoggedIn(user) {
        if (loginLink) loginLink.style.display = "none";
        if (registerLink) registerLink.style.display = "none";

        accountLink.style.display = "";
        ordersLink.style.display = "";
        logoutLink.style.display = "";

        accountLink.textContent = "Account";
        accountLink.title = "My Account";

        
    }

    // Default to logged out until the server confirms the session.
    showLoggedOut();

    try {
        const response = await fetch("../backend/api/session.php", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.ok) {
            const result = await response.json();

            if (result.success && result.authenticated) {
                showLoggedIn(result.user);
            } else {
                showLoggedOut();
            }
        } else if (response.status === 401) {
            showLoggedOut();
        } else {
            console.error(
                "Could not verify Velora session. HTTP",
                response.status
            );
        }
    } catch (error) {
        console.error("Velora session check failed:", error);
    }

    logoutLink.addEventListener("click", async function (event) {
        event.preventDefault();

        logoutLink.style.pointerEvents = "none";
        logoutLink.textContent = "Logging out...";

        try {
            const response = await fetch("../backend/api/logout.php", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Logout failed."
                );
            }

            // Remove compatibility flags used by older frontend code.
            localStorage.removeItem("veloraLoggedIn");
            localStorage.removeItem("veloraCurrentUser");

            window.location.href = "login.html";
        } catch (error) {
            console.error("Velora logout failed:", error);

            logoutLink.style.pointerEvents = "";
            logoutLink.textContent = "Logout";

            alert(
                "Could not log out from the server. Please try again."
            );
        }
    });
});
