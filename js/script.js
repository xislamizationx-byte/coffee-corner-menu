
document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    // --------------------------
    // TOAST NOTIFICATIONS
    // --------------------------

    function toast(message) {
        let element = $("#cafe-toast");

        if (!element) {
            element = document.createElement("div");
            element.id = "cafe-toast";
            element.className = "toast";
            element.setAttribute("role", "status");
            element.setAttribute("aria-live", "polite");
            document.body.append(element);
        }

        element.textContent = message;
        element.classList.add("show");

        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => {
            element.classList.remove("show");
        }, 2500);
    }

    // --------------------------
    // MOBILE NAVIGATION
    // --------------------------

    const toggle = $(".menu-toggle");
    const nav = $(".nav-links");

    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            const opened = nav.classList.toggle("open");

            toggle.textContent = opened ? "✕" : "☰";
            toggle.setAttribute("aria-expanded", String(opened));
            toggle.setAttribute(
                "aria-label",
                opened ? "Close navigation" : "Open navigation"
            );
        });

        $$(".nav-links a").forEach(link => {
            link.addEventListener("click", () => {
                nav.classList.remove("open");
                toggle.textContent = "☰";
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // --------------------------
    // SCROLL ANIMATIONS
    // --------------------------

    const revealItems = $$(".reveal");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealItems.forEach(item => observer.observe(item));
    } else {
        revealItems.forEach(item => item.classList.add("visible"));
    }

    // --------------------------
    // DARK / LIGHT THEME
    // --------------------------

    const themeButton = $("#theme-toggle");

    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem("cafe-theme") || "light";
    } catch (error) {
        console.warn("Theme preference unavailable.");
    }

    function applyTheme(theme) {
        document.body.classList.toggle(
            "dark-theme",
            theme === "dark"
        );

        if (themeButton) {
            themeButton.textContent =
                theme === "dark" ? "☀" : "☾";

            themeButton.setAttribute(
                "aria-label",
                theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
            );
        }
    }

    applyTheme(savedTheme);

    themeButton?.addEventListener("click", () => {
        savedTheme =
            document.body.classList.contains("dark-theme")
                ? "light"
                : "dark";

        applyTheme(savedTheme);

        try {
            localStorage.setItem("cafe-theme", savedTheme);
        } catch (error) {
            console.warn("Theme preference could not be saved.");
        }
    });

    // --------------------------
    // MENU SEARCH AND FILTER
    // --------------------------

    const search = $("#menu-search");
    const filterButtons = $$(".filter-btn");
    const products = $$(".menu-item");

    let activeCategory = "all";

    function filterProducts() {
        const term = (search?.value || "").trim().toLowerCase();

        products.forEach(product => {
            const name = (
                product.dataset.name ||
                product.querySelector("h3")?.textContent ||
                ""
            ).toLowerCase();

            const description =
                product.querySelector("p")?.textContent.toLowerCase() || "";

            const categoryMatch =
                activeCategory === "all" ||
                product.dataset.category === activeCategory;

            const searchMatch =
                name.includes(term) || description.includes(term);

            product.hidden = !(categoryMatch && searchMatch);
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.filter;

            filterButtons.forEach(item => {
                const active = item === button;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            filterProducts();
        });
    });

    search?.addEventListener("input", filterProducts);

    // --------------------------
    // FAVORITES
    // --------------------------

    function readStorage(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch {
            return fallback;
        }
    }

    let favorites = readStorage("cafe-favorites", []);

    if (!Array.isArray(favorites)) favorites = [];

    function saveFavorites() {
        try {
            localStorage.setItem(
                "cafe-favorites",
                JSON.stringify(favorites)
            );
        } catch {
            toast("Unable to save favorites.");
        }
    }

    function updateFavorites() {
        $$(".favorite-btn").forEach(button => {
            const product = button.closest(".menu-item");
            const name = product?.dataset.name;

            const active = favorites.includes(name);

            button.textContent = active ? "♥" : "♡";
            button.setAttribute("aria-pressed", String(active));
            button.setAttribute(
                "aria-label",
                `${active ? "Remove" : "Add"} ${name} ${active ? "from" : "to"} favorites`
            );
        });
    }

    $$(".favorite-btn").forEach(button => {
        button.addEventListener("click", () => {
            const name = button.closest(".menu-item").dataset.name;

            favorites = favorites.includes(name)
                ? favorites.filter(item => item !== name)
                : [...favorites, name];

            saveFavorites();
            updateFavorites();

            toast("Favorites updated ♥");
        });
    });

    updateFavorites();

    // --------------------------
    // SHOPPING CART
    // --------------------------

    let cart = readStorage("cafe-cart", {});

    if (!cart || Array.isArray(cart) || typeof cart !== "object") {
        cart = {};
    }

    function saveCart() {
        try {
            localStorage.setItem("cafe-cart", JSON.stringify(cart));
        } catch {
            toast("Unable to save your cart.");
        }
    }

    function money(amount) {
        return "Rs. " + amount.toLocaleString("en-PK");
    }

    function updateCart() {
        const count = Object.values(cart)
            .reduce((sum, item) => sum + item.quantity, 0);

        const countElement = $("#cart-count");
        const totalElement = $("#cart-total");
        const itemsElement = $("#cart-items");

        if (countElement) countElement.textContent = count;

        const total = Object.values(cart)
            .reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

        if (totalElement) totalElement.textContent = money(total);

        if (!itemsElement) return;

        itemsElement.replaceChildren();

        if (!count) {
            itemsElement.textContent =
                "Your bag is waiting for something delicious.";
            return;
        }

        Object.entries(cart).forEach(([name, item]) => {
            const row = document.createElement("div");
            row.className = "cart-row";

            const details = document.createElement("div");
            const heading = document.createElement("strong");
            const quantity = document.createElement("p");

            heading.textContent = name;
            quantity.textContent =
                `${item.quantity} × ${money(item.price)}`;

            details.append(heading, quantity);

            const remove = document.createElement("button");
            remove.textContent = "Remove";
            remove.setAttribute(
                "aria-label",
                `Remove ${name} from cart`
            );

            remove.addEventListener("click", () => {
                delete cart[name];
                saveCart();
                updateCart();
                toast("Item removed.");
            });

            row.append(details, remove);
            itemsElement.append(row);
        });
    }

    $$(".add-cart-btn").forEach(button => {
        button.addEventListener("click", () => {
            const product = button.closest(".menu-item");

            const name = product.dataset.name;
            const price = Number(product.dataset.price);

            if (!name || !Number.isSafeInteger(price) || price < 0) {
                toast("This product has invalid information.");
                return;
            }

            if (cart[name]) {
                cart[name].quantity++;
            } else {
                cart[name] = {
                    price,
                    quantity: 1
                };
            }

            saveCart();
            updateCart();
            toast(`${name} added to your bag!`);
        });
    });

    const drawer = $("#cart-drawer");
    const overlay = $("#cart-overlay");
    const openCart = $("#cart-open");
    const closeCart = $("#cart-close");

    function setCartOpen(open) {
        if (!drawer || !overlay) return;

        drawer.classList.toggle("open", open);
        overlay.classList.toggle("open", open);

        drawer.setAttribute("aria-hidden", String(!open));
        drawer.inert = !open;
        document.body.style.overflow = open ? "hidden" : "";

        if (open) {
            closeCart?.focus();
        } else {
            openCart?.focus();
        }
    }

    openCart?.addEventListener("click", () => setCartOpen(true));
    closeCart?.addEventListener("click", () => setCartOpen(false));
    overlay?.addEventListener("click", () => setCartOpen(false));

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && drawer?.classList.contains("open")) {
            setCartOpen(false);
        }
    });

    $("#clear-cart")?.addEventListener("click", () => {
        cart = {};
        saveCart();
        updateCart();
        toast("Your bag has been cleared.");
    });

    updateCart();

    // --------------------------
    // SCROLL PROGRESS
    // --------------------------

    const progress = $("#scroll-progress");
    const backTop = $("#back-to-top");

    function updateScroll() {
        const scrollable =
            document.documentElement.scrollHeight - window.innerHeight;

        const percentage = scrollable > 0
            ? window.scrollY / scrollable * 100
            : 0;

        if (progress) {
            progress.style.width = percentage + "%";
        }

        backTop?.classList.toggle("visible", window.scrollY > 450);
    }

    window.addEventListener("scroll", updateScroll, {
        passive: true
    });

    updateScroll();

    backTop?.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // --------------------------
    // CURRENT FOOTER YEAR
    // --------------------------

    const year = $("#current-year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // --------------------------
    // HOMEPAGE WELCOME
    // --------------------------

    if (
        document.body.dataset.page === "home" &&
        !sessionStorage.getItem("cafeWelcomed")
    ) {
        setTimeout(() => {
            alert("Welcome to The Cozy Café! ☕\nFresh coffee, warm moments.");

            sessionStorage.setItem("cafeWelcomed", "true");
        }, 500);
    }

});
