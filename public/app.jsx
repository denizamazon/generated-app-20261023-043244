import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ShoppingBag,
  Search,
  User,
  Store,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Star,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronDown,
  ArrowRight,
  CreditCard,
  Settings,
  LogOut,
  LayoutDashboard,
  Tag,
  Package,
  Layers,
  Check,
  AlertTriangle,
  Code,
  DollarSign,
  TrendingUp,
  MapPin,
  RefreshCw,
  X,
  ExternalLink,
  ChevronLeft
} from "lucide-react";

// Number formatter for Tomans
function formatPrice(amount) {
  if (amount === undefined || amount === null) return "۰";
  return new Intl.NumberFormat("fa-IR").format(amount);
}

// Persian Digits Converter
function toFaDigits(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState("home"); // home, catalog, product_detail, store_detail, account, seller_panel, admin_panel
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedStoreSlug, setSelectedStoreSlug] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceSort, setPriceSort] = useState("newest");

  // Auth & User State
  const [authUser, setAuthUser] = useState(null);
  const [authStore, setAuthStore] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem("bazargah_token") || "");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login, register

  // Data State
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart Drawer & Checkout State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [checkoutValidation, setCheckoutValidation] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  // System Tests Modal State
  const [showTestsModal, setShowTestsModal] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testsLoading, setTestsLoading] = useState(false);

  // Seller & Admin Modals State
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const showNotification = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper fetcher with token
  const apiFetch = async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "خطایی در برقراری ارتباط رخ داد.");
    }
    return data;
  };

  // Fetch initial system state
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [stg, cats, prds, strs] = await Promise.all([
        fetch("./api/settings").then((r) => r.json()),
        fetch("./api/categories").then((r) => r.json()),
        fetch("./api/products").then((r) => r.json()),
        fetch("./api/stores").then((r) => r.json())
      ]);
      setSettings(stg || {});
      setCategories(cats || []);
      setProducts(prds || []);
      setStores(strs || []);

      // Check current auth user
      if (authToken) {
        try {
          const authData = await apiFetch("./api/auth/me");
          setAuthUser(authData.user);
          setAuthStore(authData.store);
          if (authData.user) {
            loadCart();
            loadAddresses();
          }
        } catch (e) {
          console.warn("Auth token invalid:", e);
          setAuthToken("");
          localStorage.removeItem("bazargah_token");
        }
      }
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const data = await apiFetch("./api/cart");
      setCartItems(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAddresses = async () => {
    try {
      const addrs = await apiFetch("./api/addresses");
      setAddresses(addrs || []);
      const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [authToken]);

  // Handle Login
  const handleLogin = async (e, email, password) => {
    e.preventDefault();
    try {
      const res = await apiFetch("./api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAuthToken(res.token);
      localStorage.setItem("bazargah_token", res.token);
      setAuthUser(res.user);
      setAuthStore(res.store);
      setShowAuthModal(false);
      showNotification(`خوش آمدید، ${res.user.full_name}!`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await apiFetch("./api/auth/logout", { method: "POST" });
    } catch (e) {}
    setAuthToken("");
    localStorage.removeItem("bazargah_token");
    setAuthUser(null);
    setAuthStore(null);
    setCartItems([]);
    setActiveTab("home");
    showNotification("با موفقیت از حساب کاربری خارج شدید.");
  };

  // Add Item to Cart
  const addToCart = async (productId, quantity = 1) => {
    if (!authUser) {
      setShowAuthModal(true);
      showNotification("لطفاً ابتدا وارد حساب کاربری شوید.", "error");
      return;
    }
    try {
      await apiFetch("./api/cart", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity })
      });
      await loadCart();
      setIsCartOpen(true);
      showNotification("محصول به سبد خرید افزوده شد.");
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Update Cart Qty
  const updateCartQty = async (itemId, newQty) => {
    try {
      await apiFetch(`./api/cart/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: newQty })
      });
      await loadCart();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Validate Checkout
  const handleValidateCheckout = async () => {
    if (cartItems.length === 0) return;
    try {
      const data = await apiFetch("./api/checkout/validate", {
        method: "POST",
        body: JSON.stringify({
          coupon_code: couponCode,
          address_id: selectedAddressId
        })
      });
      setCheckoutValidation(data);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  useEffect(() => {
    if (isCartOpen && cartItems.length > 0) {
      handleValidateCheckout();
    }
  }, [isCartOpen, cartItems, couponCode, selectedAddressId]);

  // Execute Mock Payment
  const handleExecutePayment = async () => {
    try {
      setPaymentLoading(true);
      const res = await apiFetch("./api/checkout/pay", {
        method: "POST",
        body: JSON.stringify({
          address_id: selectedAddressId,
          coupon_code: couponCode,
          payment_status: "SUCCESS"
        })
      });
      setShowPaymentModal(false);
      setIsCartOpen(false);
      setCartItems([]);
      showNotification(`سفارش شماره ${res.orderNumber} با موفقیت ثبت و پرداخت گردید!`);
      setActiveTab("account");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Run Integration Tests
  const handleRunTests = async () => {
    setShowTestsModal(true);
    setTestsLoading(true);
    try {
      const res = await apiFetch("./api/tests/run");
      setTestResults(res);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setTestsLoading(false);
    }
  };

  // Filtered Products for Catalog
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory) {
      list = list.filter((p) => p.category_id === selectedCategory || p.category_name === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (priceSort === "price_asc") {
      list.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (priceSort === "price_desc") {
      list.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }
    return list;
  }, [products, selectedCategory, searchQuery, priceSort]);

  // Total items in cart counter
  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium transition-all transform animate-bounce ${
          toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* TOP ANNOUNCEMENT BANNER */}
      {settings.announcement_banner && (
        <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-between shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">ویژه</span>
              <span>{settings.announcement_banner}</span>
            </div>
            <div className="hidden md:flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1">
                <Headphones className="w-3.5 h-3.5" /> پشتیبانی: {settings.contact_phone || '021-91008080'}
              </span>
              <button 
                onClick={handleRunTests}
                className="text-amber-300 hover:text-amber-200 underline flex items-center gap-1 font-semibold"
              >
                <Code className="w-3.5 h-3.5" /> سنجش سلامت و تست‌های سیستم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo */}
            <div 
              onClick={() => { setActiveTab("home"); setSelectedCategory(""); setSearchQuery(""); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
                ب
              </div>
              <div>
                <h1 className="font-extrabold text-xl text-slate-900 leading-none tracking-tight">
                  {settings.site_name || "بازارگاه"}
                </h1>
                <p className="text-[10px] text-slate-500 font-medium mt-1">پلتفرم بین‌المللی چندفروشنده‌ای</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-2 hidden sm:block">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveTab("catalog");
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در نام کالا، برند یا فروشگاه..."
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-sm rounded-xl border border-transparent focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-4 pointer-events-none" />
                <button
                  type="submit"
                  className="absolute left-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  جستجو
                </button>
              </form>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Cart Drawer Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
                title="سبد خرید"
              >
                <ShoppingBag className="w-5 h-5 text-slate-700" />
                <span className="hidden md:inline text-xs font-bold text-slate-800">سبد خرید</span>
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {toFaDigits(totalCartCount)}
                  </span>
                )}
              </button>

              {/* User Account / Auth Dropdown */}
              {authUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("account")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      activeTab === "account"
                        ? "bg-primary-50 border-primary-300 text-primary-700 font-semibold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <User className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-semibold max-w-[100px] truncate">{authUser.full_name}</span>
                  </button>

                  {/* Seller Panel Button if user is Seller */}
                  {authUser.role === "SELLER" && (
                    <button
                      onClick={() => setActiveTab("seller_panel")}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>پنل فروشگاه</span>
                    </button>
                  )}

                  {/* Admin Panel Button if user is Admin */}
                  {authUser.role === "ADMIN" && (
                    <button
                      onClick={() => setActiveTab("admin_panel")}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>مدیریت ارشد</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    title="خروج"
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02]"
                >
                  <User className="w-4 h-4" />
                  <span>ورود / ثبت‌نام</span>
                </button>
              )}

            </div>
          </div>
        </div>

        {/* CATEGORY NAV BAR */}
        <nav className="bg-slate-900 text-slate-200 text-xs font-medium border-t border-slate-800 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-1 py-2.5">
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setActiveTab("catalog");
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "catalog" && !selectedCategory
                    ? "bg-primary-600 text-white font-bold"
                    : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                همه کالاها
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setActiveTab("catalog");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? "bg-primary-600 text-white font-bold"
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  {cat.name_fa}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4 text-slate-400 text-[11px] whitespace-nowrap py-2.5">
              <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-primary-400" /> ارسال سریع سراسری</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ضمانت اصالت کالا</span>
              <span className="flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5 text-amber-400" /> ۷ روز ضمانت بازگشت</span>
            </div>
          </div>
        </nav>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium text-sm">در حال بارگذاری اطلاعات بازارگاه...</p>
          </div>
        ) : (
          <>
            {activeTab === "home" && (
              <HomePage
                products={products}
                categories={categories}
                stores={stores}
                onSelectCategory={(catId) => {
                  setSelectedCategory(catId);
                  setActiveTab("catalog");
                }}
                onSelectProduct={(id) => {
                  setSelectedProductId(id);
                  setActiveTab("product_detail");
                }}
                onSelectStore={(slug) => {
                  setSelectedStoreSlug(slug);
                  setActiveTab("store_detail");
                }}
                onAddToCart={addToCart}
              />
            )}

            {activeTab === "catalog" && (
              <CatalogPage
                products={filteredProducts}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                priceSort={priceSort}
                onPriceSortChange={setPriceSort}
                onSelectProduct={(id) => {
                  setSelectedProductId(id);
                  setActiveTab("product_detail");
                }}
                onAddToCart={addToCart}
              />
            )}

            {activeTab === "product_detail" && selectedProductId && (
              <ProductDetailPage
                productId={selectedProductId}
                apiFetch={apiFetch}
                authUser={authUser}
                onAddToCart={addToCart}
                onBack={() => setActiveTab("catalog")}
                showNotification={showNotification}
              />
            )}

            {activeTab === "store_detail" && selectedStoreSlug && (
              <StoreDetailPage
                storeSlug={selectedStoreSlug}
                onSelectProduct={(id) => {
                  setSelectedProductId(id);
                  setActiveTab("product_detail");
                }}
                onAddToCart={addToCart}
              />
            )}

            {activeTab === "account" && (
              <AccountDashboard
                authUser={authUser}
                addresses={addresses}
                apiFetch={apiFetch}
                loadAddresses={loadAddresses}
                showNotification={showNotification}
              />
            )}

            {activeTab === "seller_panel" && (
              <SellerPanel
                authUser={authUser}
                authStore={authStore}
                categories={categories}
                apiFetch={apiFetch}
                showNotification={showNotification}
              />
            )}

            {activeTab === "admin_panel" && (
              <AdminPanel
                apiFetch={apiFetch}
                showNotification={showNotification}
                onReloadSystem={loadInitialData}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3 text-white">
                <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-sm">ب</div>
                <span className="font-extrabold text-base">{settings.site_name || "بازارگاه"}</span>
              </div>
              <p className="leading-relaxed text-slate-400 mb-4">
                بزرگ‌ترین پلتفرم بین‌المللی چندفروشنده‌ای کالا و خدمات با تضمین قیمت، اصالت و شفافیت مالی برای خریداران و فروشندگان.
              </p>
              <p className="text-slate-500">پشتیبانی: {settings.contact_phone || "021-91008080"}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-sm mb-3">دسترسی سریع</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setActiveTab("home")} className="hover:text-white transition-colors">صفحه اصلی بازارگاه</button></li>
                <li><button onClick={() => { setSelectedCategory(""); setActiveTab("catalog"); }} className="hover:text-white transition-colors">کاتالوگ تمام محصولات</button></li>
                <li><button onClick={handleRunTests} className="hover:text-amber-400 transition-colors">اجرای آزمون‌های سیستم</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-sm mb-3">حساب‌های کاربری آزمایشی</h4>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                  <span className="text-amber-400 font-bold block">مدیر کل:</span> admin@bazargah.ir / admin123
                </li>
                <li className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                  <span className="text-emerald-400 font-bold block">فروشگاه تکنولوژی:</span> tech@bazargah.ir / seller123
                </li>
                <li className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                  <span className="text-primary-400 font-bold block">خریدار نمونه:</span> user@bazargah.ir / user123
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-sm mb-3">نماد اعتماد و امنیت</h4>
              <div className="flex gap-3">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center flex-1">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] block text-slate-300">درگاه پرداخت شبیه‌سازی‌شده</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center flex-1">
                  <LockIcon className="w-8 h-8 text-primary-400 mx-auto mb-1" />
                  <span className="text-[10px] block text-slate-300">امنیّت رمزنگاری شده</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© ۲۰۲۶ تمام حقوق این سامانه متعلق به بازارگاه اینترنتی بین‌المللی می‌باشد.</span>
            <span>نسخه نرم‌افزاری: 1.0.0 (SQLite DO Backend)</span>
          </div>
        </div>
      </footer>

      {/* CART DRAWER SIDEBAR */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary-400" />
                  <h3 className="font-bold text-base">سبد خرید شما ({toFaDigits(cartItems.length)} کالا)</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600">سبد خرید شما خالی است.</p>
                    <p className="text-xs mt-1">محصولات مورد علاقه خود را انتخاب کنید.</p>
                  </div>
                ) : (
                  <>
                    {cartItems.map((item) => {
                      const imgs = item.images_json ? JSON.parse(item.images_json) : [];
                      const effectivePrice = item.discount_price ? item.discount_price : item.price;

                      return (
                        <div key={item.cart_item_id} className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                          <img
                            src={imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-white"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">فروشنده: {item.store_name}</p>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                                <button
                                  onClick={() => updateCartQty(item.cart_item_id, item.quantity - 1)}
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 rounded-r-lg font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2.5 text-xs font-bold text-slate-800">{toFaDigits(item.quantity)}</span>
                                <button
                                  onClick={() => updateCartQty(item.cart_item_id, item.quantity + 1)}
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 rounded-l-lg font-bold"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-left">
                                <span className="text-xs font-extrabold text-primary-700 block">
                                  {formatPrice(effectivePrice * item.quantity)} تومان
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Address Selection */}
                    <div className="pt-4 border-t border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary-600" /> آدرس تحویل سفارش
                      </label>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-rose-600">آدرسی یافت نشد. لطفاً در پنل کاربری آدرس خود را وارد کنید.</p>
                      ) : (
                        <select
                          value={selectedAddressId}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {addresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {addr.title}: {addr.city} - {addr.address.substring(0, 30)}...
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Coupon Input */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-amber-600" /> کد تخفیف
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="مثلاً: BAZAR2026"
                          className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          onClick={handleValidateCheckout}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          اعمال
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {cartItems.length > 0 && checkoutValidation && (
                <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>جمع کل کالاها:</span>
                    <span>{formatPrice(checkoutValidation.subtotal)} تومان</span>
                  </div>
                  {checkoutValidation.discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                      <span>تخفیف کد ({checkoutValidation.couponApplied}):</span>
                      <span>- {formatPrice(checkoutValidation.discountAmount)} تومان</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>هزینه ارسال:</span>
                    <span>{checkoutValidation.shippingCost === 0 ? "رایگان" : `${formatPrice(checkoutValidation.shippingCost)} تومان`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>مبلغ قابل پرداخت:</span>
                    <span className="text-primary-700 text-base">{formatPrice(checkoutValidation.totalAmount)} تومان</span>
                  </div>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>ادامه و پرداخت آنلاین (آزمایشی)</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MOCK PAYMENT GATEWAY MODAL */}
      {showPaymentModal && checkoutValidation && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white text-center relative">
              <ShieldCheck className="w-12 h-12 mx-auto text-amber-400 mb-2" />
              <h3 className="font-extrabold text-lg">درگاه پرداخت الکترونیک شتاب (شبیه‌ساز)</h3>
              <p className="text-xs text-blue-200 mt-1">اتصال امن به شبکه‌ی بانکی کشور</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block mb-1">مبلغ پرداختی فاکتور:</span>
                <span className="text-xl font-black text-primary-700">{formatPrice(checkoutValidation.totalAmount)} تومان</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">شماره کارت بانکی ۱۶ رقمی</label>
                  <input
                    type="text"
                    defaultValue="6037 - 9918 - 2381 - 4402"
                    className="w-full text-center text-sm font-mono tracking-widest p-2.5 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CVV2</label>
                    <input type="text" defaultValue="391" className="w-full text-center text-sm font-mono p-2.5 rounded-xl border border-slate-300 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رمز پویا (SMS)</label>
                    <input type="text" defaultValue="849201" className="w-full text-center text-sm font-mono p-2.5 rounded-xl border border-slate-300 bg-slate-50" />
                  </div>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <button
                  onClick={handleExecutePayment}
                  disabled={paymentLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  {paymentLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>تأیید و پرداخت شبیه‌سازی شده</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors"
                >
                  انصراف و بازگشت به بازارگاه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          onRegister={async (e, data) => {
            e.preventDefault();
            try {
              const res = await apiFetch("./api/auth/register", {
                method: "POST",
                body: JSON.stringify(data)
              });
              setAuthToken(res.token);
              localStorage.setItem("bazargah_token", res.token);
              setAuthUser(res.user);
              setShowAuthModal(false);
              showNotification("ثبت‌نام شما با موفقیت انجام شد.");
            } catch (err) {
              showNotification(err.message, "error");
            }
          }}
        />
      )}

      {/* INTEGRATION TESTS MODAL */}
      {showTestsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Code className="w-6 h-6 text-primary-600" />
                <h3 className="font-extrabold text-base text-slate-900">گزارش تست و سلامت زیرساخت بازارگاه</h3>
              </div>
              <button onClick={() => setShowTestsModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="py-6">
              {testsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600 mb-2" />
                  <p className="text-xs text-slate-500">در حال اجرای سناریوهای تست و صحت‌سنجی پایگاه داده...</p>
                </div>
              ) : testResults ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl flex items-center justify-between font-bold text-sm ${
                    testResults.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}>
                    <span>وضعیت کلی سیستم:</span>
                    <span>{testResults.ok ? "پاس شده (۱۰۰٪ بدون خطا)" : "دارای خطای ناهمخوانی"}</span>
                  </div>

                  <div className="space-y-2 mt-4 max-h-72 overflow-y-auto">
                    {testResults.results.map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                        {t.success ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h5 className="font-bold text-xs text-slate-800">{t.name}</h5>
                          <p className="text-[11px] text-slate-500 mt-1">{t.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTestsModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// LockIcon helper component
function LockIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

// HOME PAGE COMPONENT
function HomePage({ products, categories, stores, onSelectCategory, onSelectProduct, onSelectStore, onAddToCart }) {
  const featuredProducts = products.filter((p) => p.is_featured || p.discount_price);

  return (
    <div className="space-y-12 pb-12">
      {/* HERO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full">
              تخفیف‌های ویژه بهاره
            </span>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight">
              بازارگاه بین‌المللی کالا و تجهیزات؛ خرید مستقیم از برترین فروشندگان
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              تنوع بی‌نظیر بیش از هزاران کالا با تضمین اصالت، امکان مقایسه قیمت فروشندگان مختلف و ارسال سریع به تمام نقاط.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onSelectCategory("")}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                مشاهده همه کالاها
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK CATEGORY CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-600" /> دسته‌بندی‌های محبوب بازارگاه
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                {cat.name_fa.charAt(0)}
              </div>
              <h4 className="font-bold text-xs text-slate-800 group-hover:text-primary-600 transition-colors">{cat.name_fa}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-rose-600" /> پیشنهادات ویژه و تخفیف‌دار
            </h3>
            <p className="text-xs text-slate-500 mt-1">محصولات منتخب با قیمت استثنایی فروشندگان</p>
          </div>
          <button
            onClick={() => onSelectCategory("")}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <span>مشاهده همه</span> <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </section>

      {/* FEATURED SELLERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" /> فروشندگان برتر بازارگاه
              </h3>
              <p className="text-xs text-slate-400 mt-1">فروشگاه‌های تأییدشده با بالاترین رضایت مشتریان</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stores.map((st) => (
              <div
                key={st.id}
                onClick={() => onSelectStore(st.slug)}
                className="bg-slate-800/90 rounded-2xl p-5 border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={st.logo_url || "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200"}
                    alt={st.store_name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-600"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{st.store_name}</h4>
                    <div className="flex items-center gap-1 text-amber-400 text-xs mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{toFaDigits(st.rating || 5.0)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{st.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// PRODUCT CARD COMPONENT
function ProductCard({ product, onSelect, onAddToCart }) {
  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const mainImg = imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const hasDiscount = product.discount_price && product.discount_price < product.price;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all flex flex-col group">
      <div className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelect(product.id)}>
        <img
          src={mainImg}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {hasDiscount && (
          <span className="absolute top-3 right-3 bg-rose-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg shadow-md">
            تخفیف ویژه
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="cursor-pointer" onClick={() => onSelect(product.id)}>
          <span className="text-[10px] text-slate-400 font-semibold block mb-1">فروشگاه: {product.store_name}</span>
          <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-relaxed hover:text-primary-600 transition-colors">
            {product.title}
          </h4>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            {hasDiscount && (
              <span className="text-[11px] text-slate-400 line-through block">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="font-extrabold text-sm text-primary-700">
              {formatPrice(product.discount_price || product.price)} تومان
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product.id)}
            className="p-2.5 bg-primary-50 hover:bg-primary-600 hover:text-white text-primary-700 rounded-xl transition-all shadow-sm"
            title="افزودن به سبد"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// CATALOG PAGE COMPONENT
function CatalogPage({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  priceSort,
  onPriceSortChange,
  onSelectProduct,
  onAddToCart
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR FILTERS */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 pb-3 border-b border-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary-600" /> فیلتر دسته‌بندی
            </h4>
            <div className="space-y-1">
              <button
                onClick={() => onSelectCategory("")}
                className={`w-full text-right text-xs py-2 px-3 rounded-xl transition-colors ${
                  !selectedCategory ? "bg-primary-50 text-primary-700 font-bold" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                همه دسته‌ها
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCategory(c.id)}
                  className={`w-full text-right text-xs py-2 px-3 rounded-xl transition-colors ${
                    selectedCategory === c.id ? "bg-primary-50 text-primary-700 font-bold" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {c.name_fa}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* PRODUCTS GRID */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-600">
              نمایش {toFaDigits(products.length)} کالا در کاتالوگ
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">مرتب‌سازی:</span>
              <select
                value={priceSort}
                onChange={(e) => onPriceSortChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="newest">جدیدترین</option>
                <option value="price_asc">ارزان‌ترین</option>
                <option value="price_desc">گران‌ترین</option>
              </select>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-700">هیچ کالایی متناسب با جستجوی شما یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={onSelectProduct}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// PRODUCT DETAIL PAGE COMPONENT
function ProductDetailPage({ productId, apiFetch, authUser, onAddToCart, onBack, showNotification }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`./api/products/${productId}`);
      setProduct(data);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`./api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      setReviewComment("");
      showNotification("نظر شما ثبت و منتشر گردید.");
      loadProduct();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const specs = product.specs_json ? JSON.parse(product.specs_json) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <button
        onClick={onBack}
        className="text-xs font-bold text-slate-600 hover:text-primary-600 flex items-center gap-1"
      >
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست محصولات
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            <img src={imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"} alt={product.title} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-primary-600 block mb-1">دسته‌بندی: {product.category_name}</span>
            <h2 className="text-xl font-black text-slate-900 leading-snug">{product.title}</h2>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">فروشگاه عرضه‌کننده:</span>
              <span className="font-bold text-sm text-slate-800">{product.store_name}</span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 block">وضعیت انبار:</span>
              <span className={`text-xs font-bold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {product.stock > 0 ? `موجود (${toFaDigits(product.stock)} عدد)` : "ناموجود"}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">قیمت محصول:</span>
              <span className="text-2xl font-black text-primary-700">
                {formatPrice(product.discount_price || product.price)} تومان
              </span>
            </div>

            <button
              onClick={() => onAddToCart(product.id)}
              disabled={product.stock <= 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-xs transition-all disabled:bg-slate-300"
            >
              افزودن به سبد خرید
            </button>
          </div>
        </div>

      </div>

      {/* Specifications */}
      {specs.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-base text-slate-900 mb-4">مشخصات فنی</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {specs.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between">
                <span className="text-slate-500 font-medium">{s.name}:</span>
                <span className="font-bold text-slate-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h3 className="font-extrabold text-base text-slate-900">نظرات خریداران</h3>

        {authUser && (
          <form onSubmit={handleSubmitReview} className="p-4 bg-slate-50 rounded-2xl space-y-3">
            <h4 className="font-bold text-xs text-slate-800">ثبت نظر برای این محصول</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">امتیاز:</span>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="p-1.5 rounded-lg border text-xs"
              >
                <option value={5}>۵ ستاره (عالی)</option>
                <option value={4}>۴ ستاره (خوب)</option>
                <option value={3}>۳ ستاره (متوسط)</option>
              </select>
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="دیدگاه شما درباره این محصول..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              required
            />
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">
              ارسال نظر
            </button>
          </form>
        )}

        <div className="space-y-3">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{rev.user_name}</span>
                  <span className="text-amber-400 font-bold text-xs">★ {toFaDigits(rev.rating)}</span>
                </div>
                <p className="text-xs text-slate-600">{rev.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">هنوز نظری برای این محصول ثبت نشده است.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// STORE DETAIL PAGE COMPONENT
function StoreDetailPage({ storeSlug, onSelectProduct, onAddToCart }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`./api/stores/${storeSlug}`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [storeSlug]);

  if (!data || !data.store) return <div className="p-20 text-center text-xs">در حال بارگذاری...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-slate-900 text-white rounded-3xl p-8 flex items-center gap-6">
        <img src={data.store.logo_url} alt={data.store.store_name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white" />
        <div>
          <h2 className="text-2xl font-black">{data.store.store_name}</h2>
          <p className="text-xs text-slate-300 mt-1">{data.store.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.products.map((p) => (
          <ProductCard key={p.id} product={p} onSelect={onSelectProduct} onAddToCart={onAddToCart} />
        ))}
      </div>
    </div>
  );
}

// CUSTOMER ACCOUNT DASHBOARD
function AccountDashboard({ authUser, addresses, apiFetch, loadAddresses, showNotification }) {
  const [orders, setOrders] = useState([]);
  const [newAddr, setNewAddr] = useState({ title: "", recipient: "", phone: "", province: "تهران", city: "تهران", address: "" });

  useEffect(() => {
    apiFetch("./api/orders").then((data) => setOrders(data));
  }, []);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("./api/addresses", {
        method: "POST",
        body: JSON.stringify({ ...newAddr, is_default: true })
      });
      setNewAddr({ title: "", recipient: "", phone: "", province: "تهران", city: "تهران", address: "" });
      showNotification("آدرس جدید اضافه شد.");
      loadAddresses();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
        <div className="w-14 h-14 bg-primary-100 text-primary-700 font-black text-2xl rounded-2xl flex items-center justify-center">
          {authUser?.full_name?.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{authUser?.full_name}</h2>
          <p className="text-xs text-slate-500">{authUser?.email} | نقش: خریدار</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">سفارش‌های من</h3>
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500">هنوز سفارشی ثبت نکرده‌اید.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">شماره سفارش: {o.order_number}</span>
                  <span className="text-[11px] text-slate-500">تاریخ: {new Date(o.created_at).toLocaleDateString("fa-IR")}</span>
                </div>
                <div className="text-left">
                  <span className="font-black text-sm text-primary-700 block">{formatPrice(o.total_amount)} تومان</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {o.status === "PAID" ? "پرداخت شده" : o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Management */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">مدیریت آدرس‌های ارسال</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 block">{a.title} ({a.recipient})</span>
              <p className="text-slate-600">{a.province}، {a.city} - {a.address}</p>
              <p className="text-slate-500">تلفن: {a.phone}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddAddress} className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="عنوان آدرس (مثلا خانه)" value={newAddr.title} onChange={(e) => setNewAddr({...newAddr, title: e.target.value})} className="text-xs p-2.5 rounded-xl border" required />
          <input type="text" placeholder="نام تحویل‌گیرنده" value={newAddr.recipient} onChange={(e) => setNewAddr({...newAddr, recipient: e.target.value})} className="text-xs p-2.5 rounded-xl border" required />
          <input type="text" placeholder="شماره تماس" value={newAddr.phone} onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} className="text-xs p-2.5 rounded-xl border" required />
          <input type="text" placeholder="نشانی دقیق پستی" value={newAddr.address} onChange={(e) => setNewAddr({...newAddr, address: e.target.value})} className="text-xs p-2.5 rounded-xl border" required />
          <button type="submit" className="sm:col-span-2 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">ثبت آدرس جدید</button>
        </form>
      </div>
    </div>
  );
}

// SELLER PANEL COMPONENT
function SellerPanel({ authUser, authStore, categories, apiFetch, showNotification }) {
  const [products, setProducts] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, ledger: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrd, setNewPrd] = useState({ title: "", category_id: "", price: "", discount_price: "", stock: "10", description: "" });

  const loadSellerData = async () => {
    try {
      const prds = await apiFetch("./api/seller/products");
      const led = await apiFetch("./api/seller/ledger");
      setProducts(prds || []);
      setLedger(led || { balance: 0, ledger: [] });
    } catch (e) {}
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("./api/seller/products", {
        method: "POST",
        body: JSON.stringify(newPrd)
      });
      setShowAddModal(false);
      showNotification("محصول جدید با موفقیت اضافه شد.");
      loadSellerData();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold">{authStore?.store_name}</h2>
          <p className="text-xs text-slate-400 mt-1">نرخ کمیسیون پلتفرم: {toFaDigits(authStore?.commission_rate || 5)}٪</p>
        </div>
        <div className="text-left bg-slate-800 p-3 rounded-2xl border border-slate-700">
          <span className="text-[10px] text-slate-400 block">موجودی قابل تسویه:</span>
          <span className="text-lg font-black text-emerald-400">{formatPrice(ledger.balance)} تومان</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-extrabold text-base text-slate-900">محصولات فروشگاه من</h3>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1">
          <Plus className="w-4 h-4" /> افزودن محصول جدید
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b">
            <tr>
              <th className="p-4">عنوان محصول</th>
              <th className="p-4">قیمت (تومان)</th>
              <th className="p-4">موجودی انبار</th>
              <th className="p-4">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-4 font-bold text-slate-800">{p.title}</td>
                <td className="p-4">{formatPrice(p.price)}</td>
                <td className="p-4">{toFaDigits(p.stock)}</td>
                <td className="p-4 text-emerald-600 font-bold">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateProduct} className="bg-white p-6 rounded-2xl max-w-md w-full space-y-3">
            <h3 className="font-bold text-sm text-slate-900">تعریف محصول جدید</h3>
            <input type="text" placeholder="عنوان محصول" value={newPrd.title} onChange={(e) => setNewPrd({...newPrd, title: e.target.value})} className="w-full p-2.5 text-xs border rounded-xl" required />
            <select value={newPrd.category_id} onChange={(e) => setNewPrd({...newPrd, category_id: e.target.value})} className="w-full p-2.5 text-xs border rounded-xl" required>
              <option value="">انتخاب دسته‌بندی</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_fa}</option>)}
            </select>
            <input type="number" placeholder="قیمت (تومان)" value={newPrd.price} onChange={(e) => setNewPrd({...newPrd, price: e.target.value})} className="w-full p-2.5 text-xs border rounded-xl" required />
            <input type="number" placeholder="تعداد موجودی" value={newPrd.stock} onChange={(e) => setNewPrd({...newPrd, stock: e.target.value})} className="w-full p-2.5 text-xs border rounded-xl" required />
            <textarea placeholder="توضیحات کامل محصول" value={newPrd.description} onChange={(e) => setNewPrd({...newPrd, description: e.target.value})} className="w-full p-2.5 text-xs border rounded-xl" rows={3} />
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">افزودن</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">انصراف</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ADMIN PANEL COMPONENT
function AdminPanel({ apiFetch, showNotification, onReloadSystem }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);

  const loadAdminData = async () => {
    try {
      const [s, u, st] = await Promise.all([
        apiFetch("./api/admin/stats"),
        apiFetch("./api/admin/users"),
        apiFetch("./api/admin/stores")
      ]);
      setStats(s);
      setUsers(u || []);
      setStores(st || []);
    } catch (e) {}
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleResetDB = async () => {
    if (!confirm("آیا از بازنشانی کلی پایگاه داده و ایجاد مجدد اطلاعات نمونه مطمئن هستید؟")) return;
    try {
      await apiFetch("./api/admin/seed", { method: "POST" });
      showNotification("داده‌ها با موفقیت بازنشانی گردید.");
      onReloadSystem();
      loadAdminData();
    } catch (e) {
      showNotification(e.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between bg-amber-500 text-slate-950 p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-black">پنل مدیریت کل بازارگاه</h2>
          <p className="text-xs text-slate-900 mt-1">نظارت مالی، مدیریت کاربران، فروشگاه‌ها و تنظیمات سیستم</p>
        </div>
        <button onClick={handleResetDB} className="px-4 py-2 bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md hover:bg-rose-800">
          بازنشانی کامل دیتابیس
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 block">حجم کل معاملات (GMV):</span>
            <span className="text-base font-black text-primary-700">{formatPrice(stats.totalGMV)} تومان</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 block">سهم کمیسیون بازارگاه:</span>
            <span className="text-base font-black text-emerald-600">{formatPrice(stats.totalCommission)} تومان</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 block">تعداد فروشگاه‌های فعال:</span>
            <span className="text-base font-black text-slate-800">{toFaDigits(stats.storeCount)}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 block">تعداد سفارشات:</span>
            <span className="text-base font-black text-slate-800">{toFaDigits(stats.orderCount)}</span>
          </div>
        </div>
      )}

      {/* Stores List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-base text-slate-900">فروشگاه‌های ثبت‌شده</h3>
        <div className="space-y-2">
          {stores.map((s) => (
            <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-900 block">{s.store_name} ({s.owner_name})</span>
                <span className="text-slate-500">نرخ کمیسیون: {toFaDigits(s.commission_rate)}٪</span>
              </div>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AUTH MODAL COMPONENT
function AuthModal({ mode, setMode, onClose, onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [storeName, setStoreName] = useState("");

  const quickFill = (eMail, pass) => {
    setEmail(eMail);
    setPassword(pass);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <h3 className="font-black text-base text-slate-900">{mode === "login" ? "ورود به بازارگاه" : "ثبت‌نام حساب جدید"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Quick Demo Login Buttons */}
        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs space-y-2">
          <span className="font-bold text-amber-900 block">ورود سریع آزمایشی (بدون تایپ):</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => quickFill("admin@bazargah.ir", "admin123")} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[11px]">مدیر کل</button>
            <button type="button" onClick={() => quickFill("tech@bazargah.ir", "seller123")} className="px-2.5 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-950 font-bold rounded-lg text-[11px]">فروشنده دیجی‌تک</button>
            <button type="button" onClick={() => quickFill("user@bazargah.ir", "user123")} className="px-2.5 py-1 bg-primary-200 hover:bg-primary-300 text-primary-950 font-bold rounded-lg text-[11px]">خریدار نمونه</button>
          </div>
        </div>

        <form onSubmit={mode === "login" ? (e) => onLogin(e, email, password) : (e) => onRegister(e, { full_name: fullName, email, password, role, store_name: storeName })} className="space-y-3">
          {mode === "register" && (
            <input type="text" placeholder="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl" required />
          )}

          <input type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl" required />
          <input type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl" required />

          {mode === "register" && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">نوع حساب:</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl">
                <option value="CUSTOMER">خریدار معمولی</option>
                <option value="SELLER">فروشنده کالا (ایجاد فروشگاه)</option>
              </select>
              {role === "SELLER" && (
                <input type="text" placeholder="نام فروشگاه آنلاین شما" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-2.5 text-xs border rounded-xl" required />
              )}
            </div>
          )}

          <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all">
            {mode === "login" ? "ورود به حساب" : "ایجاد حساب کاربری"}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          {mode === "login" ? (
            <span>حساب ندارید؟ <button onClick={() => setMode("register")} className="text-primary-600 font-bold underline">ثبت‌نام کنید</button></span>
          ) : (
            <span>قبلا ثبت‌نام کرده‌اید؟ <button onClick={() => setMode("login")} className="text-primary-600 font-bold underline">وارد شوید</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

// Mount React Root
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
