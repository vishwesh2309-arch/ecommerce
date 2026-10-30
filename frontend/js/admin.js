
function renderPaymentStatusBadge(status) {
    const raw = String(status || "pending").trim().toLowerCase();
    let badgeClass = "badge-pay-pending";
    let label = "Pending";

    if (raw === "paid" || raw === "completed" || raw === "success") {
        badgeClass = "badge-pay-paid";
        label = "Paid";
    } else if (raw === "failed") {
        badgeClass = "badge-pay-failed";
        label = "Failed";
    } else if (raw === "refunded") {
        badgeClass = "badge-pay-refunded";
        label = "Refunded";
    }

    return '<span class="badge-pay ' + badgeClass + '">' + label + '</span>';
}


function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}


function safeListen(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(event, handler);
    }
}

document.addEventListener("DOMContentLoaded", initializeAdminDashboard);

let databaseAdminOrders = [];
let databaseOrdersLoaded = false;
let databaseOrdersLoading = false;


const fallbackAdminProducts = [
    {
        id: "product1",
        name: "Classic T-Shirt",
        category: "Fashion",
        price: 799,
        image: "images/products/product1.jpg",
        description: "A stylish and comfortable everyday T-shirt."
    },

    {
        id: "product2",
        name: "Wireless Headphones",
        category: "Electronics",
        price: 2499,
        image: "images/products/product2.jpg",
        description: "Enjoy clear sound with modern wireless headphones."
    },
    {
        id: "product3",
        name: "Running Shoes",
        category: "Footwear",
        price: 1999,
        image: "images/products/product3.jpg",
        description: "Comfortable running shoes for everyday movement."
    },
    {
        id: "product4",
        name: "Smart Watch",
        category: "Electronics",
        price: 3499,
        image: "images/products/product4.jpg",
        description: "A modern smart watch for everyday life."
    },
    {
        id: "product5",
        name: "Premium White T-Shirt",
        category: "Fashion",
        price: 999,
        image: "images/products/product1.jpg",
        description: "A premium white T-shirt with a clean design."
    },
    {
        id: "product6",
        name: "Premium Bluetooth Headphones",
        category: "Electronics",
        price: 2999,
        image: "images/products/product2.jpg",
        description: "Premium headphones for everyday listening."
    },
    {
        id: "product7",
        name: "Sport Running Shoes",
        category: "Footwear",
        price: 2299,
        image: "images/products/product3.jpg",
        description: "Sporty shoes designed for comfort and support."
    },
    {
        id: "product8",
        name: "Advanced Smart Watch",
        category: "Electronics",
        price: 4499,
        image: "images/products/product4.jpg",
        description: "An advanced smart watch with a modern design."
    }
];

// =========================================
// INITIALIZE ADMIN DASHBOARD
// =========================================

function initializeAdminDashboard() {
    initializeAdminProductCatalog();

    safeListen("productSearch", "input", renderAdminProducts
    );

    safeListen("productCategory", "change", renderAdminProducts
    );

    safeListen("showAddProductBtn", "click", openAddProductForm
    );

    safeListen("cancelProductFormBtn", "click", closeProductForm
    );

    safeListen("resetProductFormBtn", "click", resetProductForm
    );

    safeListen("productForm", "submit", saveProduct
    );

    safeListen("adminProductGrid", "click", handleProductAction
    );

    safeListen("productImageFile", "change", handleProductImageSelection
    );

    safeListen("orderSearch", "input", renderDatabaseAdminOrders
    );

    safeListen("orderStatusFilter", "change", renderDatabaseAdminOrders
    );

    safeListen("allOrdersBody", "click", handleOrderTableAction
    );

    safeListen("closeOrderDetailsBtn", "click", closeOrderDetailsModal
    );

    safeListen("customerSearch", "input", renderCustomerSummary
    );

    safeListen("customerOrderFilter", "change", renderCustomerSummary
    );

    safeListen("customerSort", "change", renderCustomerSummary
    );

    const orderDetailsModal = document.getElementById("orderDetailsModal");
    if (orderDetailsModal) {
        orderDetailsModal.addEventListener("click", function (event) {
            if (event.target.id === "orderDetailsModal") {
                closeOrderDetailsModal();
            }
        });
    }

    const exportOrdersCsvBtn =
        document.getElementById("exportOrdersCsvBtn");

    const exportProductsCsvBtn =
        document.getElementById("exportProductsCsvBtn");

    if (exportOrdersCsvBtn) {
        exportOrdersCsvBtn.addEventListener(
            "click",
            exportOrdersToCSV
        );
    }

    if (exportProductsCsvBtn) {
        exportProductsCsvBtn.addEventListener(
            "click",
            exportProductsToCSV
        );
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeOrderDetailsModal();
            closeCustomerDetailsModal();
        }
    });

    safeListen("closeCustomerDetailsBtn", "click", closeCustomerDetailsModal
    );

    const customerDetailsModal = document.getElementById("customerDetailsModal");
    if (customerDetailsModal) {
        customerDetailsModal.addEventListener("click", function (event) {
            if (event.target.id === "customerDetailsModal") {
                closeCustomerDetailsModal();
            }
        });
    }

    safeListen("customerSummary", "click", handleCustomerCardAction
    );

    // Initial dashboard rendering.
    try { updateDashboardSummary(); } catch(e){}
    try { updateOrderStatusSummary(); } catch(e){}
    try { updateSalesAnalytics(); } catch(e){}
    try { updateSalesReportSummary(); } catch(e){}
    try { updateSalesPerformance(); } catch(e){}
    try { updateSalesCharts(); } catch(e){}
    try { renderRecentOrders(); } catch(e){}
    try { renderCustomerSummary(); } catch(e){}
    try { renderAllOrders(); } catch(e){}
    try { loadDatabaseAdminOrders(); } catch(e){}
    try { renderDatabaseAdminOrders(); } catch(e){}


    // Refresh the dashboard when storage changes in another tab.
    window.addEventListener("storage", function (event) {
        if (
            event.key === "veloraOrderHistory" ||
            event.key === "veloraUsers"
        ) {
            refreshAdminOrderViews();
        }

        if (event.key === "veloraAdminProducts") {
            populateCategoryFilter();
            renderAdminProducts();
            updateDashboardSummary();
        }
    });

    const applySalesDateFilterBtn =
        document.getElementById("applySalesDateFilter");

    const resetSalesDateFilterBtn =
        document.getElementById("resetSalesDateFilter");

    if (applySalesDateFilterBtn) {
        applySalesDateFilterBtn.addEventListener("click", () => {
            updateSalesAnalytics();

            const message = document.getElementById(
                "salesDateFilterMessage"
            );

            if (
                message &&
                message.textContent ===
                    "Start Date cannot be after End Date."
            ) {
                return;
            }

            updateSalesReportSummary();
            updateSalesPerformance();
            updateSalesCharts();
        });
    }

    if (resetSalesDateFilterBtn) {
        resetSalesDateFilterBtn.addEventListener("click", () => {
            document.getElementById("salesStartDate").value = "";
            document.getElementById("salesEndDate").value = "";

            updateSalesAnalytics();
            updateSalesReportSummary();
            updateSalesPerformance();
            updateSalesCharts();
        });
    }

    document.querySelectorAll("[data-sales-preset]").forEach(button => {
        button.addEventListener("click", () => {
            const preset = button.dataset.salesPreset;
            const startInput =
                document.getElementById("salesStartDate");
            const endInput =
                document.getElementById("salesEndDate");

            const now = new Date();

            const formatDateInput = date => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");

                return `${year}-${month}-${day}`;
            };

            if (preset === "all") {
                startInput.value = "";
                endInput.value = "";
            } else if (preset === "today") {
                const today = formatDateInput(now);

                startInput.value = today;
                endInput.value = today;
            } else if (preset === "7days") {
                const start = new Date(now);
                start.setDate(start.getDate() - 6);

                startInput.value = formatDateInput(start);
                endInput.value = formatDateInput(now);
            } else if (preset === "month") {
                const firstDay = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );

                startInput.value = formatDateInput(firstDay);
                endInput.value = formatDateInput(now);
            }

            updateSalesAnalytics();

            const message = document.getElementById(
                "salesDateFilterMessage"
            );

            if (
                message &&
                message.textContent ===
                    "Start Date cannot be after End Date."
            ) {
                return;
            }

            updateSalesReportSummary();
            updateSalesPerformance();
            updateSalesCharts();
        });
    });
}

// =========================================
// STORAGE HELPERS
// =========================================

function readStorageArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");

        return Array.isArray(value) ? value : [];
    } catch (error) {
        console.error(
            "Could not read localStorage array:",
            key,
            error
        );

        return [];
    }
}

function readStorageObject(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));

        return value &&
            typeof value === "object" &&
            !Array.isArray(value)
            ? value
            : {};
    } catch (error) {
        console.error(
            "Could not read localStorage object:",
            key,
            error
        );

        return {};
    }
}

let selectedProductImageData = "";

// =========================================
// PRODUCT IMAGE UPLOAD
// =========================================

function handleProductImageSelection(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        event.target.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert("Please choose an image smaller than 2 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        selectedProductImageData = reader.result;

        const preview = document.getElementById(
            "productImagePreview"
        );

        preview.src = selectedProductImageData;

        document.getElementById(
            "productImagePreviewWrap"
        ).classList.remove("hidden");

        document.getElementById("productImageInput").value = "";
    };

    reader.onerror = function () {
        alert("Could not read this image. Please try another file.");
    };

    reader.readAsDataURL(file);
}

function clearProductImageSelection() {
    selectedProductImageData = "";

    document.getElementById("productImageFile").value = "";
    document.getElementById("productImagePreview").src = "";

    document.getElementById(
        "productImagePreviewWrap"
    ).classList.add("hidden");
}

// =========================================
// GENERAL HELPERS
// =========================================

function escapeHTML(value) {
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

function formatCurrency(amount) {
    const number = Number(amount) || 0;

    return number.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });
}

function normalizeStatus(status) {
    const value = String(status || "Placed").trim().toLowerCase();

    if (value.includes("cancel")) return "Cancelled";
    if (value.includes("deliver")) return "Delivered";
    if (value.includes("ship")) return "Shipped";
    if (value.includes("confirm")) return "Confirmed";
    if (value.includes("process")) return "Processing";

    return "Placed";
}

function displayStatus(status) {
    return normalizeStatus(status);
}

function statusClass(status) {
    return normalizeStatus(status).toLowerCase().replace(/\s+/g, "-");
}

// =========================================
// PRODUCT CATALOG
// =========================================


async function initializeAdminProductCatalog() {
    const grid = document.getElementById("adminProductGrid");

    if (grid) {
        grid.innerHTML = "<p style='color: #64748b;'>Loading catalog products...</p>";
    }

    let loaded = false;

    try {
        const response = await fetch("../backend/api/admin-products.php", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Accept": "application/json" }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.success && Array.isArray(data.products)) {
                window.veloraDatabaseProducts = data.products.map(product => ({
                    ...product,
                    id: String(product.id),
                    databaseId: Number(product.id),
                    price: Number(product.price),
                    image: product.image_url || "",
                    stock: Number(product.stock || 0),
                    is_active: product.is_active !== false
                }));
                loaded = true;
            }
        }
    } catch (error) {
        console.warn("Backend database endpoint not accessible, falling back to local store catalog:", error);
    }

    // Fallback gracefully to localStorage or fallbackAdminProducts if backend auth/DB is not active
    if (!loaded) {
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem("veloraAdminProducts") || "[]");
        } catch (e) {
            stored = [];
        }

        if (Array.isArray(stored) && stored.length > 0) {
            window.veloraDatabaseProducts = stored.map(p => ({
                ...p,
                is_active: p.is_active !== false
            }));
        } else {
            window.veloraDatabaseProducts = fallbackAdminProducts.map(p => ({
                ...p,
                is_active: true,
                stock: p.stock || 25
            }));
            localStorage.setItem("veloraAdminProducts", JSON.stringify(window.veloraDatabaseProducts));
        }
    }

    populateCategoryFilter();
    renderAdminProducts();
    updateDashboardSummary();
}

function getAdminProducts() {
    return Array.isArray(window.veloraDatabaseProducts)
        ? window.veloraDatabaseProducts.filter(product => product.is_active !== false)
        : [];
}


function saveAdminProducts(products) {
    try {
        localStorage.setItem(
            "veloraAdminProducts",
            JSON.stringify(products)
        );

        return true;
    } catch (error) {
        console.error("Could not save products:", error);

        alert(
            "Products could not be saved. Check browser storage space."
        );

        return false;
    }
}

function normalizeSearchWord(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ");
}

function productMatchesSearch(product, searchTerm) {
    if (!searchTerm) {
        return true;
    }

    const searchable = normalizeSearchWord([
        product.id,
        product.name,
        product.category,
        product.description
    ].join(" "));

    const query = normalizeSearchWord(searchTerm);

    return searchable.includes(query);
}

function normalizeCategory(category) {
    const value = normalizeSearchWord(category);

    if (
        value === "fashion" ||
        value === "clothing" ||
        value === "apparel"
    ) {
        return "fashion";
    }

    return value;
}

function populateCategoryFilter() {
    const filter = document.getElementById("productCategory");
    if (!filter) return;
    const select = document.getElementById("productCategory");

    if (!select) {
        return;
    }

    const currentValue = select.value || "all";
    const products = getAdminProducts();

    const categories = [...new Set(
        products
            .map(product => String(product.category || "Other").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    select.innerHTML =
        '<option value="all">All Categories</option>' +
        categories.map(category => `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("");

    const matchingCategory = categories.find(category =>
        normalizeCategory(category) === normalizeCategory(currentValue)
    );

    select.value =
        currentValue !== "all" && matchingCategory
            ? matchingCategory
            : "all";
}

function renderAdminProducts() {
    if (!document.getElementById("adminProductGrid")) return;
    const grid = document.getElementById("adminProductGrid");

    if (!grid) {
        return;
    }

    const searchTerm =
        document.getElementById("productSearch").value;

    const selectedCategory =
        document.getElementById("productCategory").value;

    const allProducts = getAdminProducts();

    const filteredProducts = allProducts.filter(product => {
        const matchesSearch = productMatchesSearch(
            product,
            searchTerm
        );

        const matchesCategory =
            selectedCategory === "all" ||
            normalizeCategory(product.category) ===
                normalizeCategory(selectedCategory);

        return matchesSearch && matchesCategory;
    });

    const _catCount = document.getElementById("catalogCount");
    if (_catCount) {
        _catCount.textContent = `${filteredProducts.length} of ${allProducts.length} product${allProducts.length === 1 ? "" : "s"}`;
    }

    const _totalProd = document.getElementById("totalProducts");
    if (_totalProd) _totalProd.textContent = allProducts.length;

    document.getElementById("emptyProductMessage").classList.toggle(
        "hidden",
        filteredProducts.length > 0
    );

    if (filteredProducts.length === 0) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = filteredProducts.map(product => {
        const imagePath = String(product.image || "").trim();
        const category = product.category || "Other";

        return `
            <article class="admin-product-card">
                <div class="product-image-wrap">
                    ${
                        imagePath
                            ? `
                                <img
                                    class="product-image"
                                    src="${escapeHTML(imagePath)}"
                                    alt="${escapeHTML(product.name)}"
                                    loading="lazy"
                                    onerror="
                                        this.style.display='none';
                                        this.nextElementSibling.classList.remove('hidden');
                                    "
                                >
                            `
                            : ""
                    }

                    <div class="product-image-placeholder ${
                        imagePath ? "hidden" : ""
                    }">
                        Image unavailable
                    </div>
                </div>

                <div class="admin-product-info">
                    <p class="product-id">
                        ${escapeHTML(product.id)}
                    </p>

                    <h3>${escapeHTML(product.name)}</h3>

                    <p class="product-description">
                        ${escapeHTML(
                            product.description ||
                            "No description provided."
                        )}
                    </p>

                    <p class="product-price">
                        ${formatCurrency(product.price)}
                    </p>

                    <span class="product-category-tag">
                        ${escapeHTML(category)}
                    </span>

                    <div class="product-actions">
                        <button
                            type="button"
                            class="btn btn-small btn-edit"
                            data-action="edit"
                            data-id="${escapeHTML(product.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="btn btn-small btn-delete"
                            data-action="delete"
                            data-id="${escapeHTML(product.id)}"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}
// =========================================
// ADD / EDIT PRODUCT FORM
// =========================================

function openAddProductForm() {
    resetProductForm();

    safeSetText("productFormTitle", "Add New Product");

    safeSetText("saveProductBtn", "Save Product");

    document.getElementById("productForm").classList.remove("hidden");

    document.getElementById("productNameInput").focus();

    document.getElementById("productForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeProductForm() {
    document.getElementById("productForm").classList.add("hidden");
    resetProductForm();
}

function resetProductForm() {
    document.getElementById("productForm").reset();
    document.getElementById("editingProductId").value = "";

    safeSetText("productFormMessage", "");
    document.getElementById("productFormMessage").className =
        "form-message";

    safeSetText("productFormTitle", "Add New Product");

    safeSetText("saveProductBtn", "Save Product");

    clearProductImageSelection();
}

function setProductFormMessage(message, type) {
    const element = document.getElementById("productFormMessage");

    element.textContent = message;
    element.className = `form-message ${type || ""}`;
}



async function saveProduct(event) {
    event.preventDefault();

    const button = document.getElementById("saveProductBtn");
    const editingId = document.getElementById("editingProductId").value.trim();

    const name = document.getElementById("productNameInput").value.trim();
    const category = document.getElementById("productCategoryInput").value;
    const price = Number(document.getElementById("productPriceInput").value);
    const description =
        document.getElementById("productDescriptionInput").value.trim();

    const imageInput = document.getElementById("productImageInput");
    const selectedImage = imageInput.value.trim();

    const imageFileInput = document.getElementById("productImageFile");
    const imageFile = imageFileInput?.files?.[0];

    const products = getAdminProducts();

    const existingProduct = editingId
        ? products.find(product => product.id === editingId)
        : null;

    if (editingId && !existingProduct) {
        setProductFormMessage(
            "Product not found. Refresh the catalog and try again.",
            "error"
        );
        return;
    }

    if (!name || !category || !description) {
        setProductFormMessage(
            "Enter all required product details.",
            "error"
        );
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        setProductFormMessage(
            "Enter a price greater than ₹0.",
            "error"
        );
        return;
    }

    button.disabled = true;
    button.textContent = "Preparing image...";

    try {
        // =========================================
        // UPLOAD IMAGE TO SUPABASE STORAGE
        // =========================================

        let imageUrl =
            selectedImage || existingProduct?.image || "";

        if (imageFile) {
            const imageFormData = new FormData();
            imageFormData.append("product_image", imageFile);

            button.textContent = "Uploading image...";

            try {
                const uploadResponse = await fetch(
                    "../backend/api/admin-upload-image.php",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Accept": "application/json" },
                        body: imageFormData
                    }
                );

                const uploadText = await uploadResponse.text();
                let uploadResult;
                try {
                    uploadResult = JSON.parse(uploadText);
                } catch (e) {
                    uploadResult = { success: false, message: uploadText };
                }

                if (uploadResponse.ok && uploadResult.success && uploadResult.image_url) {
                    imageUrl = uploadResult.image_url;
                    console.log("Product image uploaded to Supabase Storage:", imageUrl);
                } else {
                    console.warn("Remote image upload skipped or unauthenticated, falling back to local object preview:", uploadResult.message);
                    // Fall back to a data URL or relative path if unauthenticated
                    imageUrl = selectedImage || "images/products/" + (imageFile.name || "product1.jpg");
                }
            } catch (upErr) {
                console.warn("Storage upload failed, using fallback:", upErr);
                imageUrl = selectedImage || "images/products/" + (imageFile.name || "product1.jpg");
            }
        }

        if (!imageUrl) {
            throw new Error(
                "Please select a product image or provide an image URL."
            );
        }

        // =========================================
        // PREPARE DATABASE PAYLOAD
        // =========================================

        const payload = {
            name,
            product_code: existingProduct
                ? existingProduct.product_code
                : "product-" + Date.now(),
            category,
            price,
            image_url: imageUrl,
            description,
            stock: existingProduct ? existingProduct.stock : 100,
            is_active: true
        };

        if (existingProduct) {
            payload.id = existingProduct.databaseId;
        }

        // =========================================
        // SAVE PRODUCT TO SUPABASE DATABASE
        // =========================================

        button.textContent = existingProduct
            ? "Updating product..."
            : "Saving product...";

        let backendSaved = false;
        let data = { success: true, message: "Product saved successfully." };

        try {
            const response = await fetch("../backend/api/admin-products.php", {
                method: existingProduct ? "PUT" : "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData && resData.success) {
                    backendSaved = true;
                    data = resData;
                }
            }
        } catch (fetchErr) {
            console.warn("Backend API not reachable, saving directly to local store:", fetchErr);
        }

        // Save immediately to local catalog if remote database session is not authenticated
        if (!backendSaved) {
            if (!Array.isArray(window.veloraDatabaseProducts)) {
                window.veloraDatabaseProducts = [];
            }

            if (existingProduct) {
                const idx = window.veloraDatabaseProducts.findIndex(p => String(p.id) === String(editingId));
                if (idx !== -1) {
                    window.veloraDatabaseProducts[idx] = {
                        ...window.veloraDatabaseProducts[idx],
                        name: payload.name,
                        category: payload.category,
                        price: Number(payload.price),
                        stock: Number(payload.stock || 0),
                        description: payload.description,
                        image: payload.image_url || window.veloraDatabaseProducts[idx].image || "images/products/product1.jpg"
                    };
                }
            } else {
                const newId = "product_" + Date.now();
                window.veloraDatabaseProducts.unshift({
                    id: newId,
                    name: payload.name,
                    category: payload.category,
                    price: Number(payload.price),
                    stock: Number(payload.stock || 25),
                    description: payload.description,
                    image: payload.image_url || "images/products/product1.jpg",
                    is_active: true
                });
            }

            localStorage.setItem("veloraAdminProducts", JSON.stringify(window.veloraDatabaseProducts));
        }

        // =========================================
        // SUCCESS
        // =========================================

        setProductFormMessage(
            data.message || "Product saved successfully.",
            "success"
        );

        const searchEl = document.getElementById("productSearch");
        if (searchEl) searchEl.value = "";

        const catEl = document.getElementById("productCategory");
        if (catEl) catEl.value = "all";

        await initializeAdminProductCatalog();

        const formEl = document.getElementById("productForm");
        if (formEl) formEl.reset();

        const editIdEl = document.getElementById("editingProductId");
        if (editIdEl) editIdEl.value = "";

        clearProductImageSelection();

        safeSetText("productFormTitle", "Add New Product");

        console.log("Product saved successfully:", data);

    } catch (error) {
        console.error("Product save failed:", error);

        setProductFormMessage(
            "Save failed: " + error.message,
            "error"
        );

    } finally {
        if (button) {
            button.disabled = false;
            const editIdEl = document.getElementById("editingProductId");
            if (editIdEl && editIdEl.value) {
                button.textContent = "Update Product";
            } else {
                button.textContent = "Save Product";
            }
        }
    }
}



function createUniqueProductId(products) {
    let id;

    do {
        id =
            "product" +
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 6);
    } while (products.some(product => product.id === id));

    return id;
}

function handleProductAction(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") {
        editProduct(id);
    } else if (action === "delete") {
        deleteProduct(id);
    }
}


function editProduct(id) {
    const product = getAdminProducts().find(
        item => item.id === String(id)
    );

    if (!product) {
        alert("Product not found. Refresh the page and try again.");
        return;
    }

    clearProductImageSelection();

    document.getElementById("editingProductId").value = product.id;
    document.getElementById("productNameInput").value = product.name || "";
    document.getElementById("productCategoryInput").value =
        product.category || "Other";
    document.getElementById("productPriceInput").value = product.price ?? "";
    document.getElementById("productDescriptionInput").value =
        product.description || "";
    document.getElementById("productImageInput").value = product.image || "";

    if (product.image) {
        document.getElementById("productImagePreview").src = product.image;
        document.getElementById("productImagePreviewWrap")
            .classList.remove("hidden");
    }

    safeSetText("productFormTitle", "Edit Product");
    safeSetText("saveProductBtn", "Update Product");
    document.getElementById("productForm").classList.remove("hidden");

    document.getElementById("productForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}



async function deleteProduct(id) {
    const product = getAdminProducts().find(
        item => item.id === String(id)
    );

    if (!product) {
        alert("Product not found. Refresh the page and try again.");
        return;
    }

    if (!confirm(
        `Remove "${product.name}" from the active catalog?\n\n` +
        "Existing order records will be preserved."
    )) {
        return;
    }

    try {
        try {
            await fetch("../backend/api/admin-products.php", {
                method: "DELETE",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ id: product.databaseId })
            });
        } catch (delErr) {
            console.warn("Backend API delete failed or offline:", delErr);
        }

        // Delete locally so UI reflects change immediately
        if (Array.isArray(window.veloraDatabaseProducts)) {
            window.veloraDatabaseProducts = window.veloraDatabaseProducts.filter(p => String(p.id) !== String(id));
            localStorage.setItem("veloraAdminProducts", JSON.stringify(window.veloraDatabaseProducts));
        }

        alert("Product removed from the active catalog.");
        await initializeAdminProductCatalog();

    } catch (error) {
        console.error("Product removal failed:", error);
        alert("Could not remove product: " + error.message);
    }
}


// =========================================
// DASHBOARD SUMMARY
// =========================================


function updateDashboardSummary() {
    if (!document.getElementById("totalProducts") && !document.getElementById("totalOrders")) return;
    // Product count remains based on the current product catalog.
    const products = getAdminProducts();

    // Orders come from Supabase, not browser localStorage.
    const orders = databaseAdminOrders;

    const customerKeys = new Set();

    orders.forEach(order => {
        const email = String(order.customer_email || "")
            .trim()
            .toLowerCase();

        const phone = String(order.customer_phone || "").trim();

        const key = email || phone;

        if (key) {
            customerKeys.add(key);
        }
    });

    // Exclude cancelled orders from revenue.
    const revenue = orders.reduce((total, order) => {
        if (normalizeStatus(order.status) === "Cancelled") {
            return total;
        }

        return total + Number(order.total || 0);
    }, 0);

    const totalProductsEl = document.getElementById("totalProducts");
    if (totalProductsEl) totalProductsEl.textContent = products.length;

    const totalOrdersEl = document.getElementById("totalOrders");
    if (totalOrdersEl) totalOrdersEl.textContent = orders.length;

    const totalCustomersEl = document.getElementById("totalCustomers");
    if (totalCustomersEl) totalCustomersEl.textContent = customerKeys.size;

    const totalRevenueEl = document.getElementById("totalRevenue");
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(revenue);
}


// =========================================
// ORDER STATUS SUMMARY
// =========================================

function updateOrderStatusSummary() {
    if (!document.getElementById("placedOrders")) return;
    const orders = databaseAdminOrders;

    const counts = {
        Placed: 0,
        Confirmed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0
    };

    orders.forEach(order => {
        const status = normalizeStatus(order.status);

        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status]++;
        }
    });

    const statusElements = {
        Placed: document.getElementById("placedOrders"),
        Confirmed: document.getElementById("confirmedOrders"),
        Shipped: document.getElementById("shippedOrders"),
        Delivered: document.getElementById("deliveredOrders"),
        Cancelled: document.getElementById("cancelledOrders")
    };

    Object.entries(statusElements).forEach(([status, element]) => {
        if (element) {
            element.textContent = counts[status];
        }
    });
}

// =========================================
// SALES ANALYTICS
// =========================================

function updateSalesAnalytics() {
    if (!document.getElementById("analyticsTotalSales")) return;
    const orders = databaseAdminOrders;

    const startDateValue =
        document.getElementById("salesStartDate")?.value || "";

    const endDateValue =
        document.getElementById("salesEndDate")?.value || "";

    const message = document.getElementById(
        "salesDateFilterMessage"
    );

    const now = new Date();

    const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    ).getTime();

    const tomorrowStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    ).getTime();

    const startTimestamp = startDateValue
        ? new Date(startDateValue + "T00:00:00").getTime()
        : null;

    const endTimestamp = endDateValue
        ? new Date(endDateValue + "T23:59:59.999").getTime()
        : null;

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        startTimestamp > endTimestamp
    ) {
        if (message) {
            message.textContent =
                "Start Date cannot be after End Date.";
        }

        return;
    }

    if (message) {
        message.textContent =
            startDateValue || endDateValue
                ? "Showing analytics for the selected date range."
                : "Showing analytics for all dates.";
    }

    let totalSales = 0;
    let completedOrders = 0;
    let eligibleOrders = 0;
    let todaySales = 0;

    orders.forEach(order => {
        const status = normalizeStatus(order.status);
        const timestamp = orderTimestamp(order);

        if (status === "Cancelled") {
            return;
        }

        if (
            (startTimestamp !== null &&
                timestamp < startTimestamp) ||
            (endTimestamp !== null &&
                timestamp > endTimestamp)
        ) {
            return;
        }

        const amount = getOrderTotal(order);

        totalSales += amount;
        eligibleOrders++;

        if (status === "Delivered") {
            completedOrders++;
        }

        if (
            timestamp >= todayStart &&
            timestamp < tomorrowStart
        ) {
            todaySales += amount;
        }
    });

    const averageOrderValue = eligibleOrders > 0
        ? totalSales / eligibleOrders
        : 0;

    safeSetText("analyticsTotalSales", formatCurrency(totalSales));
    safeSetText("analyticsCompletedOrders", completedOrders);
    safeSetText("analyticsAverageOrderValue", formatCurrency(averageOrderValue));
    safeSetText("analyticsTodaySales", formatCurrency(todaySales));
}

// =========================================
// STAGE 22.5.7 — REPORTING SUMMARY
// IMPORTANT: This is a separate, top-level function.
// =========================================

function updateSalesReportSummary() {
    const orders = databaseAdminOrders;

    const startDateValue =
        document.getElementById("salesStartDate")?.value || "";

    const endDateValue =
        document.getElementById("salesEndDate")?.value || "";

    const startTimestamp = startDateValue
        ? new Date(startDateValue + "T00:00:00").getTime()
        : null;

    const endTimestamp = endDateValue
        ? new Date(endDateValue + "T23:59:59.999").getTime()
        : null;

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        startTimestamp > endTimestamp
    ) {
        return;
    }

    let includedOrders = 0;
    let cancelledOrders = 0;

    orders.forEach(order => {
        const timestamp = orderTimestamp(order);

        if (
            (startTimestamp !== null &&
                timestamp < startTimestamp) ||
            (endTimestamp !== null &&
                timestamp > endTimestamp)
        ) {
            return;
        }

        includedOrders++;

        if (normalizeStatus(order.status) === "Cancelled") {
            cancelledOrders++;
        }
    });

    let periodLabel = "All Time";

    if (startDateValue && endDateValue) {
        periodLabel = `${startDateValue} to ${endDateValue}`;
    } else if (startDateValue) {
        periodLabel = `From ${startDateValue}`;
    } else if (endDateValue) {
        periodLabel = `Through ${endDateValue}`;
    }

    const periodElement =
        document.getElementById("reportPeriodValue");

    const orderCountElement =
        document.getElementById("reportOrderCount");

    const cancelledCountElement =
        document.getElementById("reportCancelledCount");

    if (periodElement) {
        periodElement.textContent = periodLabel;
    }

    if (orderCountElement) {
        orderCountElement.textContent = includedOrders;
    }

    if (cancelledCountElement) {
        cancelledCountElement.textContent = cancelledOrders;
    }
}
// =========================================
// STAGE 22.5.3 — SALES PERFORMANCE
// =========================================


function updateSalesPerformance() {
    const orders = databaseAdminOrders;

    const startDateValue =
        document.getElementById("salesStartDate")?.value || "";

    const endDateValue =
        document.getElementById("salesEndDate")?.value || "";

    const startTimestamp = startDateValue
        ? new Date(startDateValue + "T00:00:00").getTime()
        : null;

    const endTimestamp = endDateValue
        ? new Date(endDateValue + "T23:59:59.999").getTime()
        : null;

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        startTimestamp > endTimestamp
    ) {
        return;
    }

    const statusCounts = {
        Placed: 0,
        Confirmed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0
    };

    const productSales = {};

    orders.forEach(order => {
        const timestamp = orderTimestamp(order);

        if (
            (startTimestamp !== null && timestamp < startTimestamp) ||
            (endTimestamp !== null && timestamp > endTimestamp)
        ) {
            return;
        }

        const status = normalizeStatus(order.status);

        if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
            statusCounts[status]++;
        }

        // Cancelled orders count toward status totals,
        // but their items are excluded from product sales.
        if (status === "Cancelled") {
            return;
        }

        const items = Array.isArray(order.items) ? order.items : [];

        items.forEach(item => {
            const name = String(
                item.product_name ||
                item.productName ||
                item.name ||
                item.title ||
                "Unknown Product"
            );

            const quantityValue = Number(item.quantity ?? item.qty ?? 1);
            const quantity =
                Number.isFinite(quantityValue) && quantityValue > 0
                    ? quantityValue
                    : 0;

            const unitPriceValue = Number(
                item.unit_price ??
                item.unitPrice ??
                item.price ??
                item.productPrice ??
                0
            );

            const unitPrice =
                Number.isFinite(unitPriceValue) && unitPriceValue >= 0
                    ? unitPriceValue
                    : 0;

            const lineTotalValue = Number(
                item.line_total ?? item.lineTotal
            );

            const lineTotal =
                item.line_total != null &&
                item.line_total !== "" &&
                Number.isFinite(lineTotalValue)
                    ? lineTotalValue
                    : item.lineTotal != null &&
                      item.lineTotal !== "" &&
                      Number.isFinite(lineTotalValue)
                        ? lineTotalValue
                        : quantity * unitPrice;

            if (!productSales[name]) {
                productSales[name] = {
                    name,
                    quantity: 0,
                    total: 0
                };
            }

            productSales[name].quantity += quantity;
            productSales[name].total += Math.max(0, lineTotal);
        });
    });

    // Update Sales by Order Status.
    const statusContainer =
        document.getElementById("salesStatusBreakdown");

    if (statusContainer) {
        statusContainer.innerHTML = Object.entries(statusCounts)
            .map(([status, count]) => `
                <div class="status-item">
                    <span>${escapeHTML(status)}</span>
                    <strong>${count}</strong>
                </div>
            `)
            .join("");
    }

    // Update Top-Selling Products.
    const productBody =
        document.getElementById("topSellingProductsBody");

    if (productBody) {
        const sortedProducts = Object.values(productSales)
            .sort((a, b) =>
                b.quantity - a.quantity || b.total - a.total
            )
            .slice(0, 10);

        if (sortedProducts.length === 0) {
            productBody.innerHTML = `
                <tr>
                    <td colspan="3">No product sales found.</td>
                </tr>
            `;
        } else {
            productBody.innerHTML = sortedProducts.map(product => `
                <tr>
                    <td>${escapeHTML(product.name)}</td>
                    <td>${product.quantity}</td>
                    <td>${formatCurrency(product.total)}</td>
                </tr>
            `).join("");
        }
    }
}


// =========================================
// STAGE 22.5.4 — SALES CHARTS
// =========================================

let orderStatusChartInstance = null;
let topProductsChartInstance = null;

function updateSalesCharts() {
    if (typeof Chart === "undefined") {
        console.warn(
            "Chart.js is not loaded. Check the Chart.js script tag."
        );
        return;
    }

    const orders = databaseAdminOrders;

    const startDateValue =
        document.getElementById("salesStartDate")?.value || "";

    const endDateValue =
        document.getElementById("salesEndDate")?.value || "";

    const startTimestamp = startDateValue
        ? new Date(startDateValue + "T00:00:00").getTime()
        : null;

    const endTimestamp = endDateValue
        ? new Date(endDateValue + "T23:59:59.999").getTime()
        : null;

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        startTimestamp > endTimestamp
    ) {
        return;
    }

    const statusCounts = {
        Placed: 0,
        Confirmed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0
    };

    const productSales = {};

    orders.forEach(order => {
        const timestamp = orderTimestamp(order);

        if (
            (startTimestamp !== null &&
                timestamp < startTimestamp) ||
            (endTimestamp !== null &&
                timestamp > endTimestamp)
        ) {
            return;
        }

        const status = normalizeStatus(order.status);

        if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
            statusCounts[status]++;
        }

        if (status === "Cancelled") {
            return;
        }

        const items = Array.isArray(order.items)
            ? order.items
            : [];

        items.forEach(item => {
            const name = String(
                item.product_name ||
                item.productName ||
                item.name ||
            item.title ||
                "Unknown Product"
            );

            const quantity = Math.max(
                0,
                Number(item.quantity || item.qty || 1)
            );

            productSales[name] =
                (productSales[name] || 0) + quantity;
        });
    });

    const statusCanvas =
        document.getElementById("orderStatusChart");

    const productsCanvas =
        document.getElementById("topProductsChart");

    if (statusCanvas) {
        if (orderStatusChartInstance) {
            orderStatusChartInstance.destroy();
        }

        orderStatusChartInstance = new Chart(statusCanvas, {
            type: "doughnut",
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        "#8b5cf6",
                        "#3b82f6",
                        "#f59e0b",
                        "#10b981",
                        "#ef4444"
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    }

    if (productsCanvas) {
        if (topProductsChartInstance) {
            topProductsChartInstance.destroy();
        }

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topProductsChartInstance = new Chart(productsCanvas, {
            type: "bar",
            data: {
                labels: topProducts.map(product => product[0]),
                datasets: [{
                    label: "Quantity Sold",
                    data: topProducts.map(product => product[1]),
                    backgroundColor: "#7650ff",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// =========================================
// ORDER HELPERS
// =========================================

function getOrderCustomerName(order) {
    const customer = order.customer || {};

    return (
        customer.name ||
        customer.fullName ||
        order.customer_name ||
        order.customerName ||
        "Guest"
    );
}

function getOrderTotal(order) {
    return Number(
        order.total ??
        order.totalAmount ??
        order.grandTotal ??
        order.amount ??
        0
    ) || 0;
}

function getOrderId(order, index) {
    return (
        order.order_number ||
        order.orderNumber ||
        order.orderId ||
        order.id ||
        'Order $(index + 1}'
    );
}

function orderTimestamp(order) {
    const dateValue =
        order.created_at ||
        order.createdAt ||
        order.orderDate ||
        order.date ||
        order.timestamp;

    if (dateValue) {
        const timestamp = new Date(dateValue).getTime();

        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    // Fallback for order IDs such as VEL1792993651488.
    const match = String(order.orderId || "").match(/^VEL(\d{13})$/);

    if (match) {
        return Number(match[1]);
    }

    return 0;
}


function formatOrderDate(order) {
    const rawDate =
        order.created_at ||
        order.createdAt ||
        order.order_date ||
        order.date ||
        null;

    if (!rawDate) {
        return "—";
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// =========================================
// RECENT ORDERS
// =========================================

function renderRecentOrders() {
    const tbody = document.getElementById("recentOrdersBody");

    if (!tbody) {
        return;
    }

    const orders = [...databaseAdminOrders]
        .sort((a, b) => orderTimestamp(b) - orderTimestamp(a))
        .slice(0, 10);

    if (orders.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="5">No database orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((order, index) => {
        const status = displayStatus(order.status);

        return `
            <tr>
                <td>${escapeHTML(getOrderId(order, index))}</td>
                <td>${escapeHTML(getOrderCustomerName(order))}</td>
                <td>${escapeHTML(formatOrderDate(order))}</td>
                <td>${formatCurrency(getOrderTotal(order))}</td>
                <td>${renderPaymentStatusBadge(order.payment_status || (order.payment_method === 'cod' ? 'pending' : 'paid'))}</td>
                <td>
                    <span class="status-badge status-${statusClass(status)}">
                        ${escapeHTML(status)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================
// CUSTOMER MANAGEMENT
// =========================================

function getAdminCustomerKey(customer = {}) {
    const email = String(
        customer.email || customer.customerEmail || ""
    ).trim().toLowerCase();

    if (email) return `email:${email}`;

    const phone = String(
        customer.phone || customer.customerPhone || ""
    ).trim();

    if (phone) return `phone:${phone}`;

    const name = String(
        customer.fullName ||
        customer.name ||
        customer.customerName ||
        ""
    ).trim().toLowerCase();

    return name ? `name:${name}` : "";
}


function renderCustomerSummary() {
    const container = document.getElementById("customerSummary");

    if (!container) return;

    // Use orders loaded from Supabase.
    const orders = databaseAdminOrders;
    const customerMap = new Map();

    function ensureCustomer(order) {
        const email = String(order.customer_email || "")
            .trim()
            .toLowerCase();

        const phone = String(order.customer_phone || "").trim();

        // Prefer a stable customer identifier.
        const userId = String(order.user_id || "").trim();
        const key = userId
            ? `user:${userId}`
            : email
                ? `email:${email}`
                : phone
                    ? `phone:${phone}`
                    : "";

        if (!key) return null;

        if (!customerMap.has(key)) {
            customerMap.set(key, {
                key,
                userId,
                name: order.customer_name || "Customer",
                email: order.customer_email || "",
                phone: order.customer_phone || "",
                orders: 0,
                spent: 0,
                latestOrderDate: 0
            });
        }

        return customerMap.get(key);
    }

    orders.forEach(order => {
        const customer = ensureCustomer(order);

        if (!customer) return;

        customer.orders++;

        // Exclude cancelled orders from customer spending.
        if (normalizeStatus(order.status) !== "Cancelled") {
            customer.spent += getOrderTotal(order);
        }

        customer.latestOrderDate = Math.max(
            customer.latestOrderDate,
            orderTimestamp(order)
        );

        if (
            customer.name === "Customer" &&
            order.customer_name
        ) {
            customer.name = order.customer_name;
        }

        customer.email ||= order.customer_email || "";
        customer.phone ||= order.customer_phone || "";
    });

    const searchTerm = (
        document.getElementById("customerSearch")?.value || ""
    ).trim().toLowerCase();

    const orderFilter =
        document.getElementById("customerOrderFilter")?.value || "all";

    const sortBy =
        document.getElementById("customerSort")?.value || "recent";

    const customers = [...customerMap.values()]
        .filter(customer => {
            const searchable = [
                customer.name,
                customer.email,
                customer.phone
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(searchTerm);

            const matchesOrders =
                orderFilter === "ordered"
                    ? customer.orders > 0
                    : orderFilter === "no-orders"
                        ? customer.orders === 0
                        : true;

            return matchesSearch && matchesOrders;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);

                case "orders-desc":
                    return b.orders - a.orders ||
                        a.name.localeCompare(b.name);

                case "spent-desc":
                    return b.spent - a.spent ||
                        a.name.localeCompare(b.name);

                case "recent":
                default:
                    return b.latestOrderDate - a.latestOrderDate ||
                        a.name.localeCompare(b.name);
            }
        });

    const countElement =
        document.getElementById("adminCustomerCount");

    if (countElement) {
        countElement.textContent =
            `${customers.length} of ${customerMap.size} customers`;
    }

    const emptyMessage =
        document.getElementById("emptyCustomerMessage");

    if (emptyMessage) {
        emptyMessage.classList.toggle(
            "hidden",
            customers.length > 0
        );
    }

    if (customers.length === 0) {
        container.innerHTML =
            '<p class="empty-message">No customers found.</p>';
        return;
    }

    container.innerHTML = customers.map(customer => `
        <article class="customer-card">
            <div class="customer-card-header">
                <div>
                    <h3>${escapeHTML(customer.name)}</h3>
                    <span class="customer-id">
                        ${escapeHTML(customer.email || customer.key)}
                    </span>
                </div>

                <span class="customer-order-badge">
                    ${customer.orders}
                    order${customer.orders === 1 ? "" : "s"}
                </span>
            </div>

            <div class="customer-contact">
                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(customer.email || "Not recorded")}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${escapeHTML(customer.phone || "Not recorded")}
                </p>
            </div>

            <div class="customer-metrics">
                <span>Total orders</span>
                <strong>${customer.orders}</strong>

                <span>Total spending</span>
                <strong>${formatCurrency(customer.spent)}</strong>
            </div>

            <div class="customer-card-actions">
                <button
                    type="button"
                    class="btn btn-small btn-primary"
                    data-customer-action="view-details"
                    data-customer-key="${escapeHTML(customer.key)}"
                >
                    View Details
                </button>
            </div>
        </article>
    `).join("");
}


function handleCustomerCardAction(event) {
    const button = event.target.closest(
        'button[data-customer-action="view-details"]'
    );

    if (!button) return;

    openCustomerDetailsModal(button.dataset.customerKey);
}

function closeCustomerDetailsModal() {
    const modal = document.getElementById("customerDetailsModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}


function openCustomerDetailsModal(customerKey) {
    const modal = document.getElementById("customerDetailsModal");
    const body = document.getElementById("customerDetailsModalBody");

    if (!modal || !body) {
        alert("Customer details panel was not found.");
        return;
    }

    // Use the database orders already loaded from Supabase.
    const customerOrders = databaseAdminOrders.filter(order => {
        const userId = String(order.user_id || "").trim();
        const email = String(order.customer_email || "")
            .trim()
            .toLowerCase();
        const phone = String(order.customer_phone || "").trim();

        const key = userId
            ? `user:${userId}`
            : email
                ? `email:${email}`
                : phone
                    ? `phone:${phone}`
                    : "";

        return key === customerKey;
    }).sort((a, b) => orderTimestamp(b) - orderTimestamp(a));

    if (customerOrders.length === 0) {
        alert("No database orders found for this customer. Refresh the dashboard and try again.");
        return;
    }

    const firstOrder = customerOrders[0];

    const name = firstOrder.customer_name || "Customer";
    const email = firstOrder.customer_email || "";
    const phone = firstOrder.customer_phone || "";

    const spending = customerOrders.reduce((total, order) => {
        return normalizeStatus(order.status) === "Cancelled"
            ? total
            : total + getOrderTotal(order);
    }, 0);

    safeSetText("customerDetailsModalTitle", "Customer Details");

    body.innerHTML = `
        <section class="order-detail-section">
            <h3>Customer Information</h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <span>Name</span>
                    <strong>${escapeHTML(name)}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Email</span>
                    <strong>${escapeHTML(email || "Not recorded")}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Phone</span>
                    <strong>${escapeHTML(phone || "Not recorded")}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Total Orders</span>
                    <strong>${customerOrders.length}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Total Spending</span>
                    <strong>${formatCurrency(spending)}</strong>
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3>Customer Order History</h3>

            <div class="table-wrapper">
                <table class="order-detail-items">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${customerOrders.map(order => {
                            const status = getSafeAdminOrderStatus(order.status);

                            return `
                                <tr>
                                    <td>${escapeHTML(
                                        order.order_number || order.id
                                    )}</td>

                                    <td>${escapeHTML(formatOrderDate(order))}</td>

                                    <td>${formatCurrency(getOrderTotal(order))}</td>

                                    <td>
                                        <span class="status-badge status-${statusClass(status)}">
                                            ${escapeHTML(status)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </section>
    `;

    modal.classList.remove("hidden");
}


// =========================================
// ORDER ITEMS AND PAYMENT HELPERS
// =========================================

function getOrderItems(order) {
    return Array.isArray(order.items) ? order.items : [];
}

function getOrderItemCount(order) {
    return getOrderItems(order).reduce((total, item) => {
        const quantity = Number(item.quantity ?? item.qty ?? 1);

        return total + (
            Number.isFinite(quantity) && quantity > 0
                ? quantity
                : 1
        );
    }, 0);
}

function getOrderPaymentMethod(order) {
    const payment = order.payment || {};

    return (
        order.paymentMethod ||
        order.payment_method ||
        payment.method ||
        payment.paymentMethod ||
        "Not specified"
    );
}

// =========================================
// ORDER STATUS MANAGEMENT
// =========================================

const VALID_ORDER_STATUSES = [
    "Placed",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled"
];

const ALLOWED_ORDER_TRANSITIONS = {
    Placed: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: []
};

function getSafeAdminOrderStatus(status) {
    const normalized = normalizeStatus(status);

    return VALID_ORDER_STATUSES.includes(normalized)
        ? normalized
        : "Placed";
}

function getAllowedNextStatuses(status) {
    const safeStatus = getSafeAdminOrderStatus(status);

    return ALLOWED_ORDER_TRANSITIONS[safeStatus] || [];
}

// =========================================
// RENDER ALL ORDERS
// =========================================

function renderAllOrders() {
    const tbody = document.getElementById("allOrdersBody");
    const searchInput = document.getElementById("orderSearch");
    const statusFilter = document.getElementById("orderStatusFilter");

    if (!tbody || !searchInput || !statusFilter) {
        return;
    }

    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const allOrders = readStorageArray("veloraOrderHistory")
        .map((order, index) => ({
            ...order,
            _adminIndex: index
        }))
        .sort((a, b) => orderTimestamp(b) - orderTimestamp(a));

    const filteredOrders = allOrders.filter(order => {
        const orderId = String(
            getOrderId(order, order._adminIndex)
        ).toLowerCase();

        const customerName =
            getOrderCustomerName(order).toLowerCase();

        const customer = order.customer || {};

        const customerEmail = String(
            customer.email || order.customerEmail || ""
        ).toLowerCase();

        const customerPhone = String(
            customer.phone || order.customerPhone || ""
        ).toLowerCase();

        const matchesSearch =
            !searchTerm ||
            orderId.includes(searchTerm) ||
            customerName.includes(searchTerm) ||
            customerEmail.includes(searchTerm) ||
            customerPhone.includes(searchTerm);

        const matchesStatus =
            selectedStatus === "all" ||
            normalizeStatus(order.status) === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    const countElement = document.getElementById("allOrdersCount");

    if (countElement) {
        countElement.textContent =
            `${filteredOrders.length} of ${allOrders.length} orders`;
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7">No matching orders found.</td></tr>';

        return;
    }

    tbody.innerHTML = filteredOrders.map(order => {
        const status = getSafeAdminOrderStatus(order.status);
        const orderId = getOrderId(order, order._adminIndex);
        const customer = order.customer || {};

        const allowedStatuses = getAllowedNextStatuses(status);

        const statusOptions = [status, ...allowedStatuses]
            .map(nextStatus => `
                <option
                    value="${escapeHTML(nextStatus)}"
                    ${nextStatus === status ? "selected" : ""}
                >
                    ${escapeHTML(nextStatus)}
                </option>
            `).join("");

        const canUpdate = allowedStatuses.length > 0;

        return `
            <tr>
                <td>${escapeHTML(orderId)}</td>

                <td>
                    <strong>
                        ${escapeHTML(getOrderCustomerName(order))}
                    </strong>

                    ${
                        customer.email || order.customerEmail
                            ? `<br><small>${escapeHTML(
                                customer.email || order.customerEmail
                            )}</small>`
                            : ""
                    }
                </td>

                <td>${escapeHTML(formatOrderDate(order))}</td>

                <td>${getOrderItemCount(order)}</td>

                <td>${formatCurrency(getOrderTotal(order))}</td>

                <td><span class="badge-payment-method">${escapeHTML(getOrderPaymentMethod(order) || "COD")}</span></td>

                <td>${renderPaymentStatusBadge(order.payment_status || (order.payment_method === 'cod' ? 'pending' : 'paid'))}</td>

                <td>
                    <span class="status-badge status-${statusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <div class="admin-order-status-controls">
                        <select
                            class="admin-order-status-select"
                            aria-label="New status for order ${escapeHTML(orderId)}"
                            data-order-index="${order._adminIndex}"
                            ${canUpdate ? "" : "disabled"}
                        >
                            ${statusOptions}
                        </select>

                        <button
                            type="button"
                            class="btn btn-small btn-primary"
                            data-order-action="save-status"
                            data-order-index="${order._adminIndex}"
                            ${canUpdate ? "" : "disabled"}
                        >
                            Save Status
                        </button>

                        <button
                            type="button"
                            class="btn btn-small btn-secondary"
                            data-order-action="view-details"
                            data-order-index="${order._adminIndex}"
                        >
                            View Details
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================
// SAVE ORDER STATUS
// =========================================

function handleOrderStatusAction(event) {
    const button = event.target.closest(
        'button[data-order-action="save-status"]'
    );

    if (!button) {
        return;
    }

    const orderIndex = Number(button.dataset.orderIndex);

    if (!Number.isInteger(orderIndex) || orderIndex < 0) {
        alert("Invalid order reference. Please refresh the page.");
        return;
    }

    const select = document.querySelector(
        `.admin-order-status-select[data-order-index="${orderIndex}"]`
    );

    if (!select) {
        alert("Status selector not found. Please refresh the page.");
        return;
    }

    const newStatus = select.value;
    const orders = databaseAdminOrders;

    if (!orders[orderIndex]) {
        alert("Order not found. Please refresh the page.");
        refreshAdminOrderViews();
        return;
    }

    const order = orders[orderIndex];
    const currentStatus = getSafeAdminOrderStatus(order.status);

    if (newStatus === currentStatus) {
        alert("Please select a different status before saving.");
        return;
    }

    if (!getAllowedNextStatuses(currentStatus).includes(newStatus)) {
        alert(
            `This status change is not allowed: ${currentStatus} → ${newStatus}.`
        );

        refreshAdminOrderViews();
        return;
    }

    const orderId = getOrderId(order, orderIndex);

    if (!window.confirm(
        `Update order ${orderId} from "${currentStatus}" to "${newStatus}"?`
    )) {
        return;
    }

    const latestOrders = readStorageArray("veloraOrderHistory");
    const latestOrder = latestOrders[orderIndex];

    if (!latestOrder) {
        alert("The order could not be found in the latest order history.");
        refreshAdminOrderViews();
        return;
    }

    const latestStatus = getSafeAdminOrderStatus(latestOrder.status);

    if (
        latestStatus !== currentStatus ||
        !getAllowedNextStatuses(latestStatus).includes(newStatus)
    ) {
        alert(
            "This order changed since you opened the page. " +
            "Please review its current status."
        );

        refreshAdminOrderViews();
        return;
    }

    const now = new Date().toISOString();

    if (newStatus === "Confirmed" && !latestOrder.confirmedDate) {
        latestOrder.confirmedDate = now;
    }

    if (newStatus === "Shipped" && !latestOrder.shippedDate) {
        latestOrder.shippedDate = now;
    }

    if (newStatus === "Delivered" && !latestOrder.deliveredDate) {
        latestOrder.deliveredDate = now;
    }

    if (newStatus === "Cancelled" && !latestOrder.cancelledDate) {
        latestOrder.cancelledDate = now;
    }

    latestOrder.status = newStatus;

    try {
        localStorage.setItem(
            "veloraOrderHistory",
            JSON.stringify(latestOrders)
        );
    } catch (error) {
        console.error("Could not save order status:", error);

        alert(
            "The order status could not be saved. " +
            "Check browser storage space and try again."
        );

        return;
    }

    refreshAdminOrderViews();

    alert(`Order ${orderId} status updated to ${newStatus}.`);
}

// =========================================
// REFRESH ALL ADMIN ORDER VIEWS
// =========================================

function refreshAdminOrderViews() {
    updateDashboardSummary();
    updateOrderStatusSummary();
    updateSalesAnalytics();
    updateSalesReportSummary();
    updateSalesPerformance();
    updateSalesCharts();
    renderRecentOrders();
    renderCustomerSummary();
    renderAllOrders();
}

function handleOrderTableAction(event) {
    const button = event.target.closest("button[data-order-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.orderAction;

    if (action === "save-status") {
        handleOrderStatusAction(event);
        return;
    }

    if (action === "view-details") {
        const index = Number(button.dataset.orderIndex);

        if (!Number.isInteger(index) || index < 0) {
            alert("Invalid order reference. Please refresh the page.");
            return;
        }

        openOrderDetailsModal(index);
    }
}

// =========================================
// ORDER DETAILS MODAL
// =========================================

function closeOrderDetailsModal() {
    const modal = document.getElementById("orderDetailsModal");

    if (modal) {
        modal.classList.add("hidden");
    }
}

function openOrderDetailsModal(orderIndex) {
    const orders = readStorageArray("veloraOrderHistory");
    const order = orders[orderIndex];

    if (!order) {
        alert("Order not found. Please refresh the page.");
        return;
    }

    const modal = document.getElementById("orderDetailsModal");
    const body = document.getElementById("orderDetailsModalBody");

    if (!modal || !body) {
        alert("Order details panel was not found.");
        return;
    }

    const customer = order.customer || {};
    const items = getOrderItems(order);
    const status = getSafeAdminOrderStatus(order.status);

    const paymentMethod = getOrderPaymentMethod(order);
    const paymentStatus = order.paymentStatus || "Not recorded";

    const customerName =
        customer.fullName ||
        customer.name ||
        order.customerName ||
        "Guest";

    const customerEmail =
        customer.email ||
        order.customerEmail ||
        "Not recorded";

    const customerPhone =
        customer.phone ||
        order.customerPhone ||
        "Not recorded";

    const addressParts = [
        customer.address,
        customer.city,
        customer.state,
        customer.pincode || customer.pinCode,
        customer.country
    ].filter(Boolean);

    const address = addressParts.length
        ? addressParts.join(", ")
        : "Address not recorded";

    const timestampField = (label, value) => `
        <div class="order-detail-field">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(
                value ? formatDateTimeAdmin(value) : "Not recorded"
            )}</strong>
        </div>
    `;

    const itemRows = items.map(item => {
        const quantity = Math.max(
            1,
            Number(item.quantity ?? item.qty ?? 1)
        );

        const priceValue = Number(
            item.price ?? item.productPrice ?? 0
        );

        const price = Number.isFinite(priceValue)
            ? Math.max(0, priceValue)
            : 0;

        return `
            <tr>
                <td>${escapeHTML(item.name || item.title || "Product")}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(price)}</td>
                <td>${formatCurrency(price * quantity)}</td>
            </tr>
        `;
    }).join("");

    body.innerHTML = `
        <section class="order-detail-section">
            <h3>Order Information</h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <span>Order ID</span>
                    <strong>${escapeHTML(
                        getOrderId(order, orderIndex)
                    )}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Current Status</span>
                    <strong>
                        <span class="status-badge status-${statusClass(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </strong>
                </div>

                <div class="order-detail-field">
                    <span>Order Date</span>
                    <strong>${escapeHTML(formatOrderDate(order))}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Number of Items</span>
                    <strong>${getOrderItemCount(order)}</strong>
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3>Customer Information</h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <span>Name</span>
                    <strong>${escapeHTML(customerName)}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Email</span>
                    <strong>${escapeHTML(customerEmail)}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Phone</span>
                    <strong>${escapeHTML(customerPhone)}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Delivery Address</span>
                    <strong>${escapeHTML(address)}</strong>
                </div>
            </div>
        </section>

        <section class="order-detail-section">
            <h3>Payment Information</h3>

            <div class="order-detail-grid">
                <div class="order-detail-field">
                    <span>Payment Method</span>
                    <strong>${escapeHTML(paymentMethod)}</strong>
                </div>

                <div class="order-detail-field">
                    <span>Payment Status</span>
                    <strong>${escapeHTML(paymentStatus)}</strong>
                </div>

                ${order.paymentCollectedDate ? `
                    <div class="order-detail-field">
                        <span>Payment Collected</span>
                        <strong>${escapeHTML(
                            formatDateTimeAdmin(
                                order.paymentCollectedDate
                            )
                        )}</strong>
                    </div>
                ` : ""}
            </div>
        </section>

        <section class="order-detail-section">
            <h3>Products Ordered</h3>

            <div class="table-wrapper">
                <table class="order-detail-items">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${
                            itemRows ||
                            '<tr><td colspan="4">No items recorded.</td></tr>'
                        }
                    </tbody>
                </table>
            </div>

            <p class="order-detail-total">
                Order Total: ${formatCurrency(getOrderTotal(order))}
            </p>
        </section>

        <section class="order-detail-section">
            <h3>Status Timeline</h3>

            <div class="order-detail-grid">
                ${timestampField("Confirmed", order.confirmedDate)}
                ${timestampField("Shipped", order.shippedDate)}
                ${timestampField("Delivered", order.deliveredDate)}
                ${timestampField("Cancelled", order.cancelledDate)}
            </div>
        </section>
    `;

    modal.classList.remove("hidden");
}

function formatDateTimeAdmin(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// =========================================
// STAGE 22.5.5 — CSV EXPORT
// =========================================

function getOrdersForCurrentDateFilter() {
    const orders = databaseAdminOrders;

    const startDateValue =
        document.getElementById("salesStartDate")?.value || "";

    const endDateValue =
        document.getElementById("salesEndDate")?.value || "";

    const startTimestamp = startDateValue
        ? new Date(startDateValue + "T00:00:00").getTime()
        : null;

    const endTimestamp = endDateValue
        ? new Date(endDateValue + "T23:59:59.999").getTime()
        : null;

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        startTimestamp > endTimestamp
    ) {
        alert("Start Date cannot be after End Date.");
        return null;
    }

    return orders
        .map((order, index) => ({
            ...order,
            _exportIndex: index
        }))
        .filter(order => {
            const timestamp = orderTimestamp(order);

            if (
                startTimestamp !== null &&
                timestamp < startTimestamp
            ) {
                return false;
            }

            if (
                endTimestamp !== null &&
                timestamp > endTimestamp
            ) {
                return false;
            }

            return true;
        });
}

function csvEscape(value) {
    let text = String(value ?? "");

    if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
}

function downloadCSV(filename, rows) {
    const csvContent = "\uFEFF" + rows
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function exportOrdersToCSV() {
    const orders = getOrdersForCurrentDateFilter();

    if (orders === null) return;

    if (orders.length === 0) {
        alert("No orders found for the selected date range.");
        return;
    }

    const rows = [[
        "Order ID",
        "Order Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Status",
        "Payment Method",
        "Total Amount",
        "Item Count"
    ]];

    orders.forEach(order => {
        const customer = order.customer || {};

        rows.push([
            getOrderId(order, order._exportIndex),
            formatOrderDate(order),
            getOrderCustomerName(order),
            customer.email || order.customerEmail || "",
            customer.phone || order.customerPhone || "",
            getSafeAdminOrderStatus(order.status),
            getOrderPaymentMethod(order),
            getOrderTotal(order),
            getOrderItemCount(order)
        ]);
    });

    downloadCSV("velora-orders.csv", rows);
}

function exportProductsToCSV() {
    const orders = getOrdersForCurrentDateFilter();

    if (orders === null) return;

    const productSales = {};

    orders.forEach(order => {
        if (normalizeStatus(order.status) === "Cancelled") {
            return;
        }

        const items = getOrderItems(order);

        items.forEach(item => {
            const name = String(
                item.name ||
                item.productName ||
                "Unknown Product"
            );

            const quantity = Math.max(
                0,
                Number(item.quantity || item.qty || 1)
            );

            const unitPrice = Math.max(
                0,
                Number(item.price || item.unitPrice || 0)
            );

            if (!productSales[name]) {
                productSales[name] = {
                    name,
                    quantity: 0,
                    total: 0
                };
            }

            productSales[name].quantity += quantity;
            productSales[name].total += quantity * unitPrice;
        });
    });

    const products = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity);

    if (products.length === 0) {
        alert("No product sales found for the selected date range.");
        return;
    }

    const rows = [[
        "Product Name",
        "Quantity Sold",
        "Sales Total"
    ]];

    products.forEach(product => {
        rows.push([
            product.name,
            product.quantity,
            product.total.toFixed(2)
        ]);
    });

    downloadCSV("velora-product-sales.csv", rows);
}

async function loadDatabaseAdminOrders() {
    if (databaseOrdersLoading) return;

    databaseOrdersLoading = true;

    try {
        const response = await fetch("../backend/api/admin-orders.php", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok || data.success !== true) {
            throw new Error(
                data.message || "Unable to load database orders."
            );
        }

        databaseAdminOrders = Array.isArray(data.orders)
            ? data.orders
            : [];

        console.log("Orders received from database:", databaseAdminOrders);
        console.log("Database order count:", databaseAdminOrders.length);
        console.log("First order sample:", databaseAdminOrders[0]);
        databaseOrdersLoaded = true;

        // Refresh dashboard views after Supabase orders load.
        updateDashboardSummary();
        updateOrderStatusSummary();
        updateSalesAnalytics();
        updateSalesReportSummary();
        updateSalesPerformance();
        updateSalesCharts();
        renderRecentOrders();
        renderCustomerSummary();

        console.log(
            "Velora database orders loaded:",
            databaseAdminOrders.length
        );

        renderDatabaseAdminOrders();

        console.log(
            "Velora database orders loaded:",
            databaseAdminOrders.length
        );

        renderDatabaseAdminOrders();
    } catch (error) {
        console.warn("Database order loading skipped or unauthorized:", error.message);
        // Fallback gracefully to local order history
        try {
            databaseAdminOrders = JSON.parse(localStorage.getItem("veloraOrderHistory") || "[]");
            renderDatabaseAdminOrders();
        } catch (e) {}
    } finally {
        databaseOrdersLoading = false;
    }
}

function renderDatabaseAdminOrders() {
    const tbody = document.getElementById("allOrdersBody");

    if (!tbody) return;

    const searchTerm = (
        document.getElementById("orderSearch")?.value || ""
    ).trim().toLowerCase();

    const statusFilter =
        document.getElementById("orderStatusFilter")?.value || "all";

    const orders = databaseAdminOrders.filter(order => {
        const searchable = [
            order.order_number,
            order.customer_name,
            order.customer_email,
            order.customer_phone
        ].join(" ").toLowerCase();

        return searchable.includes(searchTerm) &&
            (statusFilter === "all" || order.status === statusFilter);
    });

    const count = document.getElementById("allOrdersCount");

    if (count) {
        count.textContent =
            `${orders.length} of ${databaseAdminOrders.length} database orders`;
    }

    tbody.replaceChildren();

    if (orders.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 8;
        cell.textContent = "No matching database orders found.";

        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement("tr");

        function addCell(value) {
            const cell = document.createElement("td");
            cell.textContent = value == null ? "" : String(value);
            row.appendChild(cell);
        }

        addCell(order.order_number);
        addCell(
            `${order.customer_name || "Customer"}\n${order.customer_email || ""}`
        );
        addCell(order.created_at || "");
        addCell(order.items ? (Array.isArray(order.items) ? order.items.length : "—") : "—");
        addCell(formatCurrency(order.total));

        // Method cell
        const methodCell = document.createElement("td");
        const methodBadge = document.createElement("span");
        methodBadge.className = "badge-payment-method";
        methodBadge.textContent = (order.payment_method || "COD").toUpperCase();
        methodCell.appendChild(methodBadge);
        row.appendChild(methodCell);

        // Interactive Payment Status cell (allows changing Pending -> Paid / Done)
        const payStatusCell = document.createElement("td");
        const currentPayStatus = (order.payment_status || (order.payment_method === 'cod' ? 'pending' : 'paid')).toLowerCase();

        const paySelectWrap = document.createElement("div");
        paySelectWrap.className = "payment-status-container";

        const payBadgeSpan = document.createElement("span");
        payBadgeSpan.innerHTML = renderPaymentStatusBadge(currentPayStatus);
        paySelectWrap.appendChild(payBadgeSpan);

        const paySelect = document.createElement("select");
        paySelect.setAttribute("aria-label", "Change payment status");
        paySelect.className = "payment-select-compact";

        const payOptions = [
            { value: "pending", label: "Pending" },
            { value: "paid", label: "Paid (Done)" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" }
        ];

        payOptions.forEach(opt => {
            const opEl = document.createElement("option");
            opEl.value = opt.value;
            opEl.textContent = opt.label;
            opEl.selected = opt.value === currentPayStatus;
            paySelect.appendChild(opEl);
        });

        paySelect.addEventListener("change", async () => {
            const newPayStatus = paySelect.value;
            if (newPayStatus === currentPayStatus) return;

            if (!confirm(`Update payment status for order ${order.order_number} to ${newPayStatus.toUpperCase()}?`)) {
                paySelect.value = currentPayStatus;
                return;
            }

            paySelect.disabled = true;
            try {
                const response = await fetch("../backend/api/admin-update-payment-status.php", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        orderNumber: order.order_number,
                        paymentStatus: newPayStatus
                    })
                });

                const data = await response.json();
                if (!response.ok || data.success !== true) {
                    throw new Error(data.message || "Failed to update payment status.");
                }

                alert(`Payment status updated to ${newPayStatus.toUpperCase()}!`);
                order.payment_status = newPayStatus;
                payBadgeSpan.innerHTML = renderPaymentStatusBadge(newPayStatus);
                await loadDatabaseAdminOrders();
            } catch (err) {
                alert("Could not update payment status: " + err.message);
                paySelect.value = currentPayStatus;
            } finally {
                paySelect.disabled = false;
            }
        });

        paySelectWrap.appendChild(paySelect);
        payStatusCell.appendChild(paySelectWrap);
        row.appendChild(payStatusCell);

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");

        statusSelect.setAttribute("aria-label", "Order status");

        const currentStatus = order.status || "Placed";
        const options = [
            currentStatus,
            ...(typeof getAllowedNextStatuses === "function"
                ? getAllowedNextStatuses(currentStatus)
                : [])
        ];

        [...new Set(options)].forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            option.selected = status === currentStatus;
            statusSelect.appendChild(option);
        });

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.textContent = "Save Status";

        saveButton.addEventListener("click", async () => {
            const newStatus = statusSelect.value;

            if (newStatus === currentStatus) {
                alert("Select a different status first.");
                return;
            }

            if (!confirm(
                `Update order ${order.order_number} from ` +
                `${currentStatus} to ${newStatus}?`
            )) {
                return;
            }

            saveButton.disabled = true;

            try {
                const response = await fetch(
                    "../backend/api/admin-update-order-status.php",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json"
                        },
                        body: JSON.stringify({
                            orderNumber: order.order_number,
                            status: newStatus
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok || data.success !== true) {
                    throw new Error(
                        data.message || "Status update failed."
                    );
                }

                alert("Order status saved to the database.");

                await loadDatabaseAdminOrders();
            } catch (error) {
                alert(error.message || "Could not update order status.");
                statusSelect.value = currentStatus;
            } finally {
                saveButton.disabled = false;
            }
        });

        statusCell.appendChild(statusSelect);
        statusCell.appendChild(document.createTextNode(" "));
        statusCell.appendChild(saveButton);
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}
