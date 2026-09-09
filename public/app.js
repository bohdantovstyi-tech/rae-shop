// cart script for webflow + wayforpay (Purchase)
"use strict";

window.Webflow ||= [];
window.Webflow.push(() => {
  const ENABLE_AUTO_REDIRECT = true;

  // WayForPay. merchantAccount/merchantDomain/секрет живуть лише на бекенді —
  // тут їх немає й бути не повинно.
  // TODO: валюта не підтверджена. Sandbox приймає UAH/USD/EUR на етапі створення
  // платіжного URL, тож питання вирішує лише кабінет реального мерчанта Rae.
  // Якщо там увімкнено тільки UAH — змінити тут і звузити ALLOWED_CURRENCIES
  // у netlify/functions/utils/validate-wfp.js.
  const WFP_CURRENCY = "USD";
  const WFP_DEFAULT_PSP = "card";
  const WFP_PAYMENT_SYSTEMS = "card;googlePay;applePay";
  const WFP_DELIVERY_LIST = "nova;nova_pl;other";

  // Бекенд (Netlify Function), який рахує HMAC і викликає WayForPay offline.
  // Збірки немає, тож підставити значення на етапі build нікому — це константа.
  // window.RAE_CHECKOUT_ENDPOINT виставляється ЛИШЕ в test/local-preview.html,
  // щоб можна було перемкнути на localhost/тунель без правки цього файлу.
  const CHECKOUT_ENDPOINT =
    window.RAE_CHECKOUT_ENDPOINT || "https://rae-shop.netlify.app/.netlify/functions/checkout";

  // Сторінка кошика на Webflow-сайті. Порожньо = редірект після додавання вимкнено.
  // TODO: заповнити фінальним URL перед продом (див. PROD_CHECKLIST.md, розділ 2).
  const CART_PAGE_URL = "";

  // ==============================
  // СТОРІНКА ТОВАРУ
  // ==============================
  const isProductPage = !!document.querySelector('.product');
  const materialInputs = document.querySelectorAll('input[name="product-material"]')
  const colorInputs = document.querySelectorAll('input[name="product-color"]')

  if (isProductPage && materialInputs.length) {
    materialInputs.forEach((input, index) => {
        input.addEventListener('change', () => {
          const selectedMaterial = input.dataset.material;
          console.log("Selected material:", selectedMaterial);

          // Спільний контейнер продукту
          const wrapper = input.closest('[data-item="product-wrapper"]');
          if (!wrapper) {
              console.warn('⚠️ Не знайдено картку продукту');
              return;
          }

          const productEl = wrapper.querySelector('.product');
          if (productEl) {
              productEl.setAttribute('data-product-material', selectedMaterial);
              console.log("✅ Встановлено в .product:", productEl.dataset.productMaterial);
          } else {
              console.warn('⚠️ Не знайдено .product всередині мерчу!');
          }
        });

        if(index === 0){
            input.checked = true;
            input.dispatchEvent(new Event('change'));
        }
    });
  }

  if (isProductPage && colorInputs.length) {
    colorInputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        const selectedColor = input.dataset.color;
        console.log("Selected color:", selectedColor);

        // Спільний контейнер продукту
        const wrapper = input.closest('[data-item="product-wrapper"]');
        if (!wrapper) {
            console.warn('⚠️ Не знайдено картку продукту');
            return;
        }

        const productEl = wrapper.querySelector('.product');
        if (productEl) {
            productEl.setAttribute('data-product-color', selectedColor);
            const sampleUrl = input.dataset.colorSample || "";
            productEl.setAttribute('data-product-color-sample', sampleUrl);
            console.log("✅ Встановлено в .product:", productEl.dataset.productColor, sampleUrl);
        } else {
            console.warn('⚠️ Не знайдено .product!');
        }
      });

      if(index === 0){
          input.checked = true;
          input.dispatchEvent(new Event('change'));
      }
    });
  }
  // ==============================
  // КОШИК (localStorage)
  // ==============================
  function setCartWithExpiry(cart) {
    const now = Date.now();
    const data = { items: cart, savedAt: now };
    localStorage.setItem("cart", JSON.stringify(data));
  }

  function getCartWithExpiry() {
    const dataStr = localStorage.getItem("cart");
    if (!dataStr) return [];
    try {
      const data = JSON.parse(dataStr);
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (!data.savedAt || now - data.savedAt > threeDays) {
        localStorage.removeItem("cart");
        return [];
      }
      return data.items || [];
    } catch (e) {
      console.error("Помилка читання кошика:", e);
      localStorage.removeItem("cart");
      return [];
    }
  }

  // ==============================
  // ДОДАВАННЯ / ІНКРЕМЕНТ / ДЕКРЕМЕНТ / ВИДАЛЕННЯ
  // ==============================
  function addToCart(button) {
    const product = button?.closest(".product");
    if (!product) {
      console.warn("addToCart: .product не знайдено для кнопки", button);
      return;
    }

    const rawName = product.dataset.name;
    const imgSrc = product.dataset.imgSrc;
    const productPageLink = product.dataset.productPage;
    const rawPrice = product.dataset.price || "";
    const price = parseInt(rawPrice.replace(/[^\d]/g, ""), 10);

    const rawHeight = product.dataset.productHeight;
    const height = !rawHeight || rawHeight === "undefined" || rawHeight === "null" ? "" : rawHeight;
    const rawRadius = product.dataset.productRadius;
    const radius = !rawRadius || rawRadius === "undefined" || rawRadius === "null" ? "" : rawRadius;
    const rawMaterial = product.dataset.productMaterial;
    const material = !rawMaterial || rawMaterial === "undefined" || rawMaterial === "null" ? "" : rawMaterial;
    const color = product.dataset.productColor;
    const colorSample = product.dataset.productColorSample;

    if (!rawName || Number.isNaN(price)) {
      console.warn("addToCart: відсутні name/price у data-* атрибутах", { rawName, rawPrice });
      return;
    }

    // const variantParts = [size, material].filter(Boolean);
    // const name = variantParts.length ? `${rawName}, ${variantParts.join(", ")}` : rawName;
    const name = rawName;
    const cart = getCartWithExpiry();

    const existing = cart.find(
      (item) => item.rawName === rawName && item.price === price && item.height === height && item.radius === radius && item.material === material && item.color === color
    );

    if (existing) existing.cnt += 1;
    else cart.push({ rawName, name, imgSrc, price, cnt: 1, productPageLink, height, radius, material, color, colorSample });

    setCartWithExpiry(cart);
    renderCart();
    updateGlobalCartQuantity();
  }

  // Делегування кліків: додати у кошик
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-add-to-cart");
    if (!btn) return;
    if (btn.tagName === "A") e.preventDefault();
    addToCart(btn);
    // Редірект на сторінку кошика після додавання — лише якщо URL заданий
    if (CART_PAGE_URL) {
      setTimeout(() => {
        window.location.href = CART_PAGE_URL;
      }, 100);
    }
  });

  // Інкремент/декремент
  document.addEventListener("click", (e) => {
    const plus = e.target.closest(".plus-btn");
    if (plus) {
      e.stopPropagation();
      const wrap = plus.closest(".summary-product");
      const index = wrap ? Number(wrap.dataset.index) : -1;
      if (index >= 0) incrementItem(index);
      return;
    }
    const minus = e.target.closest(".minus-btn");
    if (minus) {
      e.stopPropagation();
      const wrap = minus.closest(".summary-product");
      const index = wrap ? Number(wrap.dataset.index) : -1;
      if (index >= 0) decrementItem(index);
      return;
    }
  });

  function incrementItem(index) {
    const cart = getCartWithExpiry();
    if (index < 0 || index >= cart.length) return;
    cart[index].cnt += 1;
    setCartWithExpiry(cart);
    renderCart();
    updateGlobalCartQuantity();
  }

  function decrementItem(index) {
    const cart = getCartWithExpiry();
    if (index < 0 || index >= cart.length) return;
    if (cart[index].cnt > 1) cart[index].cnt -= 1;
    else cart.splice(index, 1);
    setCartWithExpiry(cart);
    renderCart();
    updateGlobalCartQuantity();
  }

  // Видалення
  function removeFromCart(index) {
    const cart = getCartWithExpiry();
    if (index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    setCartWithExpiry(cart);
    renderCart();
    updateGlobalCartQuantity();
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const wrap = btn.closest(".summary-product");
    const index = wrap ? Number(wrap.dataset.index) : -1;
    if (index >= 0) removeFromCart(index);
  });

  // ==============================
  // РЕНДЕР КОШИКА
  // ==============================
  function renderCart() {
    const cart = getCartWithExpiry();
    const container = document.getElementById("cart-container");
    const cartBottom = document.querySelector(".cart-bottom");

    if (!container) return;
    container.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
      container.innerHTML += `
        <div class="cart-inner-empty-wrap">
          <p class="cart-inner-empty-text">Ваш кошик пустий</p>
          <a href="https://rae-otsedesign.webflow.io" class="checkout-button-empty">Перейти до каталогу</a>
        </div>
      `;
      if (cartBottom) cartBottom.style.display = "none";
    } else {
      cart.forEach((item, index) => {
        const itemTotal = item.price * item.cnt;
        total += itemTotal;

        const height = item.height || "";
        const radius = item.radius || "";

        const materialBlock = item.material
          ? `<div>|</div><div class="cart-product-material-wr flex-wrap"><div>${item.material}</div></div>`
          : "";

        container.innerHTML += `
          <div class="summary-product" data-index="${index}">
            <a class="sum-image-wrap" href="${item.productPageLink}">
              <img src="${item.imgSrc}" loading="lazy" alt="" class="product-min-image">
            </a>
            <div class="sum-info">
              <div class="sum-col">
                <div class="sum-product-name">${item.name}</div>
                <div class="cart-product-info flex-wrap">
                  <div class="flex-wrap">
                    <div class="cart-product-color">
                      <img src="${item.colorSample}" class="cart-product-img"/>
                    </div>
                    <div class="cart-product-size-wr flex-wrap">
                      <div class="cart-product-height">${height}</div>
                      <div class="cart-product-size-text">х</div>
                      <div class="cart-product-radius">${radius}</div>
                    </div>
                    <div>CM</div>
                  </div>
                  ${materialBlock}
                </div>
              </div>
              <div class="sum-col is-02">
                <div class="flex-wrap">
                  <div class="quantity-wrap">
                    <div class="minus-btn"><div>-</div></div>
                    <p class="cart-quantity-text">
                      (
                      <span class="quantity">${item.cnt}</span>
                      )
                    </p>
                    <div class="plus-btn"><div>+</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      if (cartBottom) cartBottom.style.display = "block";
    }

    const checkoutPriceEl = document.querySelector(".checkout-cost");
    if (checkoutPriceEl) checkoutPriceEl.textContent = `${total}`;
  }

  function updateGlobalCartQuantity() {
    const cart = getCartWithExpiry();
    const totalItems = cart.reduce((sum, item) => sum + item.cnt, 0);
    document.querySelectorAll(".cart-total-quantity").forEach((el) => {
      el.textContent = totalItems;
    });
    if (cartGlobalWrapper) {
      cartGlobalWrapper.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    if (cartTotalProductEl){
      cartTotalProductEl.style.opacity = totalItems > 0 ? 1 : 0;
    }
  }

  // ==============================
  // WFP ХЕЛПЕРИ
  // ==============================
  function toMoney(value) {
    // 100 -> "100.00", 547.3 -> "547.30"
    const n = Number(value || 0);
    return n.toFixed(2);
  }

  // Вшиває конфігурації товару (матеріал, колір, розміри) у назву позиції.
  // Це головна відмінність Rae від Punkt: WFP не має окремих полів під варіанти,
  // тож усе, що покупець обрав, має потрапити в productName одним рядком.
  // Рядок іде в HMAC-підпис, тому на беку його НЕ можна додатково трансформувати.
  function composeProductName(item) {
    const size = item.height && item.radius ? `${item.height}x${item.radius} CM` : "";
    const parts = [item.name, item.material, item.color, size].filter(Boolean);
    // WFP має ліміт довжини назви товару — підстраховуємось обрізанням
    return parts.join(", ").slice(0, 255);
  }

  function mapCartToWfpArrays(cart) {
    // однаковий порядок для всіх масивів — критично для підпису
    const productName = [];
    const productPrice = [];
    const productCount = [];

    cart.forEach((item) => {
      productName.push(composeProductName(item));
      productPrice.push(toMoney(item.price));
      productCount.push(String(item.cnt));
    });

    return { productName, productPrice, productCount };
  }

  function makeOrderReference(prefix = "RAE") {
    return `${prefix}_${Date.now()}`;
  }

  function unixSeconds(date = new Date()) {
    return Math.floor(date.getTime() / 1000);
  }

  function buildWfpPayload(cart) {
    const { productName, productPrice, productCount } = mapCartToWfpArrays(cart);
    const total = cart.reduce((sum, item) => sum + item.price * item.cnt, 0);

    // формуємо payload без підпису — бек його порахує
    const wfp = {
      merchantAuthType: "SimpleSignature",
      merchantTransactionType: "AUTO",
      merchantTransactionSecureType: "AUTO",
      apiVersion: "1",
      language: "EN",

      orderReference: makeOrderReference("RAE"),
      orderDate: unixSeconds(),
      amount: toMoney(total),
      currency: WFP_CURRENCY,

      productName,
      productPrice,
      productCount,

      // UX/налаштування
      defaultPaymentSystem: WFP_DEFAULT_PSP,
      paymentSystems: WFP_PAYMENT_SYSTEMS,
      deliveryList: WFP_DELIVERY_LIST,

      // returnUrl і serviceUrl підставляє бекенд з env — клієнт їх не шле,
      // щоб не мати змоги перенаправити callback про оплату на свій сервер
    };

    return wfp;
  }

  // Відправка POST-форми (fallback, якщо бек поверне "mode: form")
  function postViaForm(actionUrl, fields) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;
    form.acceptCharset = "utf-8";
    form.style.display = "none";

    Object.entries(fields).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          const input = document.createElement("input");
          input.name = key.endsWith("[]") ? key : `${key}[]`;
          input.value = String(v);
          form.appendChild(input);
        });
      } else {
        const input = document.createElement("input");
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  }
  // ==============================
  // OPEN/CLOSE CART MODAL
  // ==============================
  const cartGlobalWrapper = document.getElementById('cart-global-el');
  const cartGlobalToggle = document.getElementById('cart-global-toggle-btn');
  const cartGlobalHolder = document.getElementById('cart-global-main');
  const closeCartGlobalBtn = document.querySelector('[data-cart-global-button="close"]')
  
  const cartToggleProductBtn = document.getElementById('cart-product-toggle-btn');
  const cartProductHolder = document.getElementById('cart-product-main');
  const closeCartProductBtn = document.querySelector('[data-cart-product-button="close"]')
  const cartTotalProductEl = document.getElementById('cart-product-total-el');
  

  // Глобальний кошик: тогл + accessibility
  if (cartGlobalToggle && cartGlobalHolder) {
    cartGlobalToggle.setAttribute('aria-controls', 'cart-global-main');
    cartGlobalToggle.setAttribute('aria-expanded', 'false');
    cartGlobalHolder.setAttribute('aria-label', 'Кошик');

    cartGlobalToggle.addEventListener('click', function(){
      cartGlobalHolder.showModal();
      cartGlobalToggle.setAttribute('aria-expanded', 'true');
      if (window.matchMedia('(max-width: 767px)').matches) {
        document.documentElement.classList.add('no-scroll');
      }
    });

    // Клік по backdrop <dialog> ставить e.target саме на сам діалог
    cartGlobalHolder.addEventListener('click', function(e){
      if (e.target === cartGlobalHolder) cartGlobalHolder.close();
    });

    cartGlobalHolder.addEventListener('close', function(){
      cartGlobalToggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('no-scroll');
    });

    closeCartGlobalBtn?.addEventListener('click', function(){
      cartGlobalHolder.close();
    })
  }

  // Кошик на сторінці товару: тогл + accessibility
  if (cartToggleProductBtn && cartProductHolder) {
    cartToggleProductBtn.setAttribute('aria-controls', 'cart-product-main');
    cartToggleProductBtn.setAttribute('aria-expanded', 'false');
    cartProductHolder.setAttribute('aria-label', 'Кошик');

    cartToggleProductBtn.addEventListener('click', function () {
      cartProductHolder.showModal();
      cartToggleProductBtn.setAttribute('aria-expanded', 'true');
      if (window.matchMedia('(max-width: 767px)').matches) {
        document.documentElement.classList.add('no-scroll');
      }
    });

    cartProductHolder.addEventListener('click', function (e) {
      if (e.target === cartProductHolder) cartProductHolder.close();
    });

    cartProductHolder.addEventListener('close', function () {
      cartToggleProductBtn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('no-scroll');
    });

    closeCartProductBtn?.addEventListener('click', function () {
      cartProductHolder.close();
    });
  }


  // ==============================
  // ЧЕК-АУТ
  // ==============================

  // fetch з повторними спробами (exponential backoff) для тимчасових мережевих збоїв.
  // 4xx НЕ ретраяться — це помилки самого запиту, повтор дасть той самий результат.
  async function fetchWithRetry(url, options, { retries = 2, baseDelayMs = 800 } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          return res;
        }
        lastError = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      }

      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // .checkout-button у Webflow — зазвичай <a> або <div>, а не <button>, тож
  // властивість disabled на ньому не працює. Стан блокування тримаємо в aria-disabled.
  function setCheckoutButtonLoading(btn, isLoading) {
    if (isLoading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Обробка...";
      btn.setAttribute("aria-disabled", "true");
      btn.classList.add("is-loading");
      if (btn.tagName === "BUTTON") btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
      btn.removeAttribute("aria-disabled");
      btn.classList.remove("is-loading");
      if (btn.tagName === "BUTTON") btn.disabled = false;
    }
  }

  async function submitOrder(btn) {
    const cart = getCartWithExpiry();
    if (cart.length === 0) {
      alert("Ваш кошик порожній!");
      setCheckoutButtonLoading(btn, false);
      return;
    }

    const wfpPayload = buildWfpPayload(cart);

    try {
      const res = await fetchWithRetry(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "wayforpay",
          wfp: wfpPayload, // бек рахує merchantSignature та викликає offline
        }),
      });
      const data = await res.json();
      console.log("Відповідь з Netlify (checkout):", data);

      // A) Offline-режим — отримали URL для оплати
      if (data && data.mode === "offline" && data.payUrl) {
        console.log("payUrl:", data.payUrl);
        if (ENABLE_AUTO_REDIRECT) {
          window.location.href = data.payUrl; // редірект на платіжну сторінку
        }
        return;
      }

      // B) Fallback — бек повернув поля для стандартного HTML POST
      if (data && data.mode === "form" && data.wfp?.actionUrl && data.wfp?.fields) {
        console.log("Fallback to form POST:", data.wfp);
        if (ENABLE_AUTO_REDIRECT) {
          postViaForm(data.wfp.actionUrl, data.wfp.fields);
        }
        return;
      }

      console.error("Не отримано даних для оплати WayForPay:", data);
      alert("Не вдалося ініціювати оплату. Спробуйте ще раз.");
      setCheckoutButtonLoading(btn, false);
    } catch (err) {
      console.error("Помилка оформлення замовлення (WayForPay):", err);
      alert("Не вдалося створити замовлення. Спробуйте ще раз.");
      setCheckoutButtonLoading(btn, false);
    }
  }

  // Клік по кнопці оформлення замовлення.
  // aria-disabled — і індикатор стану, і захист від подвійного сабміту.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".checkout-button");
    if (!btn || btn.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    setCheckoutButtonLoading(btn, true);
    submitOrder(btn);
  });

  // Ініціалізація
  renderCart();
  updateGlobalCartQuantity();
});
