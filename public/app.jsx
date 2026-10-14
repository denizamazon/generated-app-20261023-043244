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
  ChevronLeft,
  Award,
  Globe,
  FileText,
  Zap,
  Building2,
  Grid,
  List,
  Sparkles,
  MessageSquare,
  Lock,
  ChevronRight
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
  const [searchScopeCategory, setSearchScopeCategory] = useState("");

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

  // RFQ Modal State
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [rfqSuccess, setRfqSuccess] = useState(false);

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
    const catToUse = searchScopeCategory || selectedCategory;
    if (catToUse) {
      list = list.filter((p) => p.category_id === catToUse || p.category_name === catToUse);
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
  }, [products, selectedCategory, searchScopeCategory, searchQuery, priceSort]);

  // Total items in cart counter
  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-slate-900 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold transition-all transform animate-bounce ${
          toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* TOP ALIBABA UTILITY BAR */}
      <div className="bg-[#1E2229] text-slate-300 text-xs py-1.5 px-4 font-medium border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>ایران - IRT (تومان) | فارسی</span>
            </span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ضمانت تجارت علی‌بابا (Trade Assurance) فعال است</span>
            </span>
          </div>

          <div className="flex items-center gap-5 text-slate-300">
            <button
              onClick={() => setShowRfqModal(true)}
              className="text-[#FF6A00] hover:text-orange-400 font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>استعلام قیمت عمده (RFQ)</span>
            </button>

            <button 
              onClick={handleRunTests}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              <span>تست و پایش سلامت سیستم</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN ALIBABA HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Alibaba Styled Logo */}
            <div 
              onClick={() => { setActiveTab("home"); setSelectedCategory(""); setSearchQuery(""); setSearchScopeCategory(""); }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#E05200] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                a
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-2xl text-[#1E2229] leading-none tracking-tight">
                    {settings.site_name || "علی‌بابا"}
                  </h1>
                  <span className="bg-[#FF6A00] text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    بازارگاه
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">پلتفرم بین‌المللی تجارت و چندفروشنده‌ای</p>
              </div>
            </div>

            {/* Alibaba Multi-segment Search Box */}
            <div className="flex-1 max-w-3xl mx-2 hidden md:block">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveTab("catalog");
                }}
                className="relative flex items-center bg-[#F4F5F7] border-2 border-[#FF6A00] rounded-xl overflow-hidden shadow-sm"
              >
                {/* Category Scope Dropdown */}
                <select
                  value={searchScopeCategory}
                  onChange={(e) => setSearchScopeCategory(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3 px-3 border-l border-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="">همه دسته‌ها</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_fa}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام کالا، برند، کارخانه، تامین‌کننده یا شماره فنی..."
                  className="w-full px-4 py-2.5 bg-transparent text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
                />

                <button
                  type="submit"
                  className="bg-[#FF6A00] hover:bg-[#E05900] text-white px-6 py-3 text-xs font-black transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-4 h-4 stroke-[3]" />
                  <span>جستجو</span>
                </button>
              </form>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Cart Drawer Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl border border-slate-200 hover:border-[#FF6A00] hover:bg-orange-50 transition-all flex items-center gap-2 group"
                title="سبد خرید"
              >
                <ShoppingBag className="w-5 h-5 text-slate-700 group-hover:text-[#FF6A00] transition-colors" />
                <span className="hidden xl:inline text-xs font-bold text-slate-800">سبد خرید</span>
                {totalCartCount > 0 && (
                  <span className="bg-[#FF6A00] text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
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
                        ? "bg-orange-50 border-[#FF6A00] text-[#FF6A00] font-bold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <User className="w-4 h-4 text-[#FF6A00]" />
                    <span className="text-xs font-bold max-w-[100px] truncate">{authUser.full_name}</span>
                  </button>

                  {/* Seller Panel Button */}
                  {authUser.role === "SELLER" && (
                    <button
                      onClick={() => setActiveTab("seller_panel")}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>مرکز فروشندگان</span>
                    </button>
                  )}

                  {/* Admin Panel Button */}
                  {authUser.role === "ADMIN" && (
                    <button
                      onClick={() => setActiveTab("admin_panel")}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>پنل مدیریت ارشد</span>
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
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6A00] hover:bg-[#E05900] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02]"
                >
                  <User className="w-4 h-4" />
                  <span>ورود / ثبت‌نام</span>
                </button>
              )}

            </div>
          </div>
        </div>

        {/* ALIBABA SECONDARY NAV BAR */}
        <nav className="bg-[#1E2229] text-white text-xs font-semibold border-t border-slate-800 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-2 py-2">
              
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setActiveTab("catalog");
                }}
                className="bg-[#FF6A00] hover:bg-[#E05900] text-white font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Layers className="w-4 h-4" />
                <span>همه دسته‌بندی‌ها</span>
              </button>

              <button
                onClick={() => { setSelectedCategory(""); setActiveTab("catalog"); }}
                className="hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>کالاهای آماده ارسال (Ready to Ship)</span>
              </button>

              <button
                onClick={() => { setSelectedCategory(""); setActiveTab("catalog"); }}
                className="hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>تأمین‌کنندگان ارزیابی‌شده (Verified Suppliers)</span>
              </button>

              <button
                onClick={() => setShowRfqModal(true)}
                className="hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>مرکز استعلام قیمت (RFQ)</span>
              </button>

              <button
                onClick={() => {
                  if (authUser?.role === "SELLER") setActiveTab("seller_panel");
                  else {
                    setShowAuthModal(true);
                    setAuthMode("register");
                  }
                }}
                className="hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>فروشنده شوید (Sell on Alibaba)</span>
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-4 text-slate-300 text-[11px] py-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> تضمین بازگشت کامل وجه
              </span>
            </div>
          </div>
        </nav>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-24 text-center">
            <div className="inline-block w-12 h-12 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-bold text-sm">در حال دریافت اطلاعات بازارگاه بین‌المللی علي‌بابا...</p>
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
                onOpenRfq={() => setShowRfqModal(true)}
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
                onOpenRfq={() => setShowRfqModal(true)}
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

      {/* ALIBABA STYLED FOOTER */}
      <footer className="bg-[#1E2229] text-slate-400 text-xs border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4 text-white">
                <div className="w-8 h-8 rounded-lg bg-[#FF6A00] flex items-center justify-center font-black text-lg">a</div>
                <span className="font-black text-lg tracking-tight">علی‌بابا بازارگاه</span>
              </div>
              <p className="leading-relaxed text-slate-400 mb-4">
                بزرگ‌ترین بازارگاه بین‌المللی B2B و چندفروشنده‌ای برای خریداران، کارخانجات و تامین‌کنندگان معتبر با تضمین معامله (Trade Assurance).
              </p>
              <p className="text-slate-300 font-semibold">پشتیبانی بین‌المللی: {settings.contact_phone || "021-91008080"}</p>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-sm mb-4">خدمات خریداران</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => setActiveTab("home")} className="hover:text-[#FF6A00] transition-colors">صفحه اصلی بازارگاه</button></li>
                <li><button onClick={() => { setSelectedCategory(""); setActiveTab("catalog"); }} className="hover:text-[#FF6A00] transition-colors">کاتالوگ کالاها و تامین‌کنندگان</button></li>
                <li><button onClick={() => setShowRfqModal(true)} className="hover:text-[#FF6A00] transition-colors">ثبت درخواست استعلام قیمت (RFQ)</button></li>
                <li><button onClick={handleRunTests} className="hover:text-amber-400 transition-colors">بررسی سلامت زیرساخت</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-sm mb-4">حساب‌های کاربری آزمایشی</h4>
              <ul className="space-y-2 text-[11px] text-slate-300">
                <li className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-amber-400 font-bold block">مدیر کل:</span> admin@bazargah.ir / admin123
                </li>
                <li className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-emerald-400 font-bold block">فروشگاه تکنولوژی:</span> tech@bazargah.ir / seller123
                </li>
                <li className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-orange-400 font-bold block">خریدار نمونه:</span> user@bazargah.ir / user123
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-sm mb-4">تضمین امنیت و کیفیت</h4>
              <div className="space-y-3">
                <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Trade Assurance</span>
                    <span className="text-[10px] text-slate-400 block">تضمین ۱۰۰٪ امنیت معامله</span>
                  </div>
                </div>
                <div className="bg-slate-800 p-3.5 rounded-2xl border border-slate-700 flex items-center gap-3">
                  <Award className="w-8 h-8 text-[#FF6A00] shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Verified Supplier Pro</span>
                    <span className="text-[10px] text-slate-400 block">تأیید رسمی کارخانه و انبار</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© ۲۰۲۶ تمام حقوق این سامانه متعلق به علی‌بابا بازارگاه می‌باشد.</span>
            <span>طراحی بر پایه استانداردهای بین‌المللی Alibaba Global Marketplace</span>
          </div>
        </div>
      </footer>

      {/* CART DRAWER SIDEBAR */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              
              <div className="px-6 py-4 bg-[#1E2229] text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#FF6A00]" />
                  <h3 className="font-extrabold text-base">سبد خرید شما ({toFaDigits(cartItems.length)} کالا)</h3>
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
                  <div className="py-20 text-center text-slate-400">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-700">سبد خرید شما خالی است.</p>
                    <p className="text-xs text-slate-500 mt-1">محصولات مورد نظر خود را انتخاب کنید.</p>
                  </div>
                ) : (
                  <>
                    {cartItems.map((item) => {
                      const imgs = item.images_json ? JSON.parse(item.images_json) : [];
                      const effectivePrice = item.discount_price ? item.discount_price : item.price;

                      return (
                        <div key={item.cart_item_id} className="flex gap-3 p-3.5 rounded-2xl border border-slate-200 bg-[#F4F5F7]">
                          <img
                            src={imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">فروشنده: {item.store_name}</p>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                                <button
                                  onClick={() => updateCartQty(item.cart_item_id, item.quantity - 1)}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-r-lg font-bold"
                                >
                                  -
                                </button>
                                <span className="px-3 text-xs font-extrabold text-slate-900">{toFaDigits(item.quantity)}</span>
                                <button
                                  onClick={() => updateCartQty(item.cart_item_id, item.quantity + 1)}
                                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-l-lg font-bold"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-left">
                                <span className="text-xs font-black text-[#FF6A00] block">
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
                      <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-[#FF6A00]" /> آدرس تحویل سفارش
                      </label>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-rose-600 font-semibold">آدرسی یافت نشد. لطفاً در پنل کاربری آدرس خود را ثبت نمایید.</p>
                      ) : (
                        <select
                          value={selectedAddressId}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
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
                      <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-amber-600" /> کد تخفیف
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="مثلاً: BAZAR2026"
                          className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                        />
                        <button
                          onClick={handleValidateCheckout}
                          className="px-4 py-2 bg-[#1E2229] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
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
                    <div className="flex justify-between text-xs text-emerald-600 font-bold">
                      <span>تخفیف کد ({checkoutValidation.couponApplied}):</span>
                      <span>- {formatPrice(checkoutValidation.discountAmount)} تومان</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>هزینه ارسال:</span>
                    <span>{checkoutValidation.shippingCost === 0 ? "رایگان" : `${formatPrice(checkoutValidation.shippingCost)} تومان`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-3 border-t border-slate-200">
                    <span>مبلغ قابل پرداخت:</span>
                    <span className="text-[#FF6A00] text-lg">{formatPrice(checkoutValidation.totalAmount)} تومان</span>
                  </div>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full mt-4 py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold rounded-xl text-sm shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>پرداخت با تضمین معامله (Trade Assurance)</span>
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
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-gradient-to-r from-[#1E2229] to-slate-900 p-6 text-white text-center relative border-b border-slate-800">
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <h3 className="font-black text-lg">پرداخت امن Trade Assurance</h3>
              <p className="text-xs text-slate-300 mt-1">وجه تا زمان تحویل و تأیید سلامت کالا محفوظ می‌ماند</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200 text-center">
                <span className="text-xs text-slate-600 block mb-1">مبلغ پرداختی فاکتور:</span>
                <span className="text-2xl font-black text-[#FF6A00]">{formatPrice(checkoutValidation.totalAmount)} تومان</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">شماره کارت بانکی ۱۶ رقمی</label>
                  <input
                    type="text"
                    defaultValue="6037 - 9918 - 2381 - 4402"
                    className="w-full text-center text-sm font-mono tracking-widest p-3 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">CVV2</label>
                    <input type="text" defaultValue="391" className="w-full text-center text-sm font-mono p-3 rounded-xl border border-slate-300 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">رمز پویا (SMS)</label>
                    <input type="text" defaultValue="849201" className="w-full text-center text-sm font-mono p-3 rounded-xl border border-slate-300 bg-slate-50" />
                  </div>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <button
                  onClick={handleExecutePayment}
                  disabled={paymentLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  {paymentLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>تأیید نهایی و پرداخت آنلاین</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFQ MODAL */}
      {showRfqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-[#1E2229] p-6 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-[#FF6A00]" />
                <div>
                  <h3 className="font-extrabold text-base">درخواست استعلام قیمت عمده (RFQ)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">دریافت پیشنهاد قیمت از تامین‌کنندگان و کارخانجات معتبر</p>
                </div>
              </div>
              <button onClick={() => { setShowRfqModal(false); setRfqSuccess(false); }} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {rfqSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                  <h4 className="font-extrabold text-lg text-slate-900">درخواست شما با موفقیت ثبت گردید!</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    پیشنهادات قیمت تامین‌کنندگان ظرف کمتر از ۲۴ ساعت به صندوق پیام‌ها و ایمیل شما ارسال خواهد شد.
                  </p>
                  <button
                    onClick={() => { setShowRfqModal(false); setRfqSuccess(false); }}
                    className="mt-4 px-6 py-2.5 bg-[#FF6A00] text-white text-xs font-bold rounded-xl"
                  >
                    متوجه شدم
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setRfqSuccess(true); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">عنوان کالا یا تجهیزات مورد نیاز</label>
                    <input
                      type="text"
                      required
                      placeholder="مثلاً: ۱۰۰۰ عدد لپ‌تاپ یا قطعات صنعتی..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">تعداد / تیراژ مورد نیاز</label>
                      <input
                        type="number"
                        required
                        placeholder="مثلاً: ۵۰"
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">دسته‌بندی مرتبط</label>
                      <select className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none">
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name_fa}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">توضیحات و مشخصات فنی لازم</label>
                    <textarea
                      rows={3}
                      placeholder="برند مد نظر، زمان تحویل، استانداردهای خاص..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold rounded-xl text-xs shadow-lg transition-all"
                  >
                    ارسال استعلام به تمام تامین‌کنندگان معتبر
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM TESTS MODAL */}
      {showTestsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="bg-[#1E2229] p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">گزارش پایش سلامت و آزمون‌های یکپارچگی سیستم</h3>
              </div>
              <button onClick={() => setShowTestsModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {testsLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-10 h-10 text-[#FF6A00] animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">در حال اجرای آزمون‌های محاسباتی، انبار و دسترسی‌ها...</p>
                </div>
              ) : testResults ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">نتیجه آزمون: کلیه سیستم‌ها عملیاتی هستند</span>
                        <span className="text-xs text-slate-600">زمان اجرا: {testResults.timestamp}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-lg">
                      {testResults.passed}/{testResults.total} موفق
                    </span>
                  </div>

                  <div className="space-y-2">
                    {testResults.tests?.map((t, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{t.name}</span>
                        <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                          <Check className="w-4 h-4 stroke-[3]" /> پاس شد
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          apiFetch={apiFetch}
          showNotification={showNotification}
          setAuthToken={setAuthToken}
          setAuthUser={setAuthUser}
          setAuthStore={setAuthStore}
        />
      )}
    </div>
  );
}

// ALIBABA HOME PAGE COMPONENT
function HomePage({ products, categories, stores, onSelectCategory, onSelectProduct, onSelectStore, onAddToCart, onOpenRfq }) {
  const featuredProducts = products.filter((p) => p.is_featured || p.discount_price);

  return (
    <div className="space-y-10 pb-16">
      
      {/* ALIBABA HERO SECTION: 3 COLUMNS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Column 1: Vertical Categories Sidebar */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm hidden lg:block">
            <h3 className="text-xs font-black text-slate-900 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span>دسته‌بندی کالاها</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </h3>
            <div className="mt-2 space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#FF6A00] hover:bg-orange-50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-[#FF6A00] flex items-center justify-center text-xs font-black group-hover:bg-[#FF6A00] group-hover:text-white transition-colors">
                      {cat.name_fa.charAt(0)}
                    </span>
                    <span>{cat.name_fa}</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF6A00] transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Alibaba Main Hero Banner */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E2229] via-slate-900 to-[#1E2229] text-white p-7 sm:p-10 shadow-xl border border-slate-800 flex-1 flex flex-col justify-between">
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-[#FF6A00] text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    جشنواره تامین‌کنندگان معتبر
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Trade Assurance
                  </span>
                </div>

                <h2 className="text-xl sm:text-3xl font-black leading-snug text-white">
                  بازارگاه بین‌المللی تجارت و خریدهای عمومی و عمده
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
                  اتصال مستقیم به بیش از هزاران کارخانه، عمده‌فروش و تامین‌کننده ارزیابی‌شده با تضمین اصالت و بازگشت وجه.
                </p>
              </div>

              <div className="pt-6 relative z-10 flex flex-wrap gap-3">
                <button
                  onClick={() => onSelectCategory("")}
                  className="px-6 py-3 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <span>جستجو و مشاهده کالاها</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenRfq}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all"
                >
                  درخواست استعلام قیمت (RFQ)
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Interactive Buyer Action Box */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6A00] font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">خوش آمدید به علی‌بابا</h4>
                  <p className="text-[10px] text-slate-500">پلتفرم تجارت امن بین‌المللی</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={onOpenRfq}
                  className="w-full py-2.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>ثبت استعلام قیمت سریع</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-900 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> تضمین معامله (Trade Assurance)
              </span>
              <ul className="text-[10px] text-slate-600 space-y-1">
                <li className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> بازرسی اصالت و کیفیت کالا</li>
                <li className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> تضمین تحویل در زمان مقرر</li>
                <li className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> بازگشت وجه در صورت عدم تطابق</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* VALUE PROPOSITION BADGES (ALIBABA 4 PILLARS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-[#FF6A00] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Trade Assurance</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">تضمین ۱۰۰٪ امنیت معامله و تحویل</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-[#FF6A00] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Verified Supplier Pro</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">تأیید رسمی کارخانه و انبار فروشنده</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-[#FF6A00] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Ready to Ship</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">ارسال فوری از انبار آماده تامین‌کننده</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-[#FF6A00] transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">خرید مستقیم عمده</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">قیمت کارخانه بدون واسطه</p>
            </div>
          </div>

        </div>
      </section>

      {/* INSTANT RFQ CALLOUT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-[#1E2229] via-slate-900 to-[#1E2229] rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 shadow-xl">
          <div className="space-y-2 text-center md:text-right">
            <span className="bg-[#FF6A00] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              درخواست استعلام قیمت (RFQ)
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">نیازمند خرید عمده یا سفارش خاص از کارخانجات هستید؟</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              مشخصات کالای مد نظر خود را بفرستید تا تامین‌کنندگان ارزیابی‌شده ظرف ۲۴ ساعت بهترین پیشنهاد قیمت را ارسال کنند.
            </p>
          </div>
          <button
            onClick={onOpenRfq}
            className="px-6 py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-500/30 whitespace-nowrap transition-all hover:scale-105"
          >
            ثبت درخواست استعلام قیمت (RFQ)
          </button>
        </div>
      </section>

      {/* FEATURED & DISCOUNTED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#FF6A00]" /> پیشنهادهای ویژه و کالاهای پرفروش
            </h3>
            <p className="text-xs text-slate-500 mt-1">محصولات منتخب با ضمانت اصالت و تخفیف مستقیم تامین‌کننده</p>
          </div>
          <button
            onClick={() => onSelectCategory("")}
            className="text-xs font-bold text-[#FF6A00] hover:text-orange-700 flex items-center gap-1"
          >
            <span>مشاهده همه کالاها</span> <ChevronLeft className="w-4 h-4" />
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

      {/* VERIFIED SUPPLIERS SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" /> تأمین‌کنندگان و کارخانجات ارزیابی‌شده (Verified Suppliers)
              </h3>
              <p className="text-xs text-slate-500 mt-1">فروشگاه‌های دارای تأییدیه رسمی خط تولید، مدارک ثبتی و بازرسی مستقل</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stores.map((st) => (
              <div
                key={st.id}
                onClick={() => onSelectStore(st.slug)}
                className="bg-[#F4F5F7] rounded-2xl p-5 border border-slate-200 hover:border-[#FF6A00] hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={st.logo_url || "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200"}
                      alt={st.store_name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#FF6A00] transition-colors">{st.store_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" /> Verified Pro
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">۵ سال در بازارگاه</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-2">{st.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 text-amber-600 font-extrabold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {toFaDigits(st.rating || 5.0)} (رضایت خریداران)
                  </span>
                  <span className="text-[#FF6A00] font-bold text-xs flex items-center gap-1 group-hover:underline">
                    <span>مشاهده فروشگاه</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

// ALIBABA PRODUCT CARD COMPONENT
function ProductCard({ product, onSelect, onAddToCart }) {
  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const mainImg = imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const hasDiscount = product.discount_price && product.discount_price < product.price;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-[#FF6A00] transition-all flex flex-col group">
      
      {/* Product Image & Badges */}
      <div className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelect(product.id)}>
        <img
          src={mainImg}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow">
              تخفیف ویژه
            </span>
          )}
          <span className="bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="cursor-pointer space-y-1.5" onClick={() => onSelect(product.id)}>
          <span className="text-[10px] font-bold text-slate-400 block truncate">فروشگاه: {product.store_name}</span>
          <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-relaxed">
            {product.title}
          </h4>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-400 font-bold">حداقل سفارش: ۱ عدد</span>
            {hasDiscount ? (
              <div className="text-left">
                <span className="text-[11px] text-slate-400 line-through block">{formatPrice(product.price)}</span>
                <span className="text-sm font-black text-[#FF6A00]">{formatPrice(product.discount_price)} تومان</span>
              </div>
            ) : (
              <span className="text-sm font-black text-slate-900">{formatPrice(product.price)} تومان</span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product.id, 1);
            }}
            className="w-full py-2 bg-[#FF6A00] hover:bg-[#E05900] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>افزودن به سبد خرید</span>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900">کاتالوگ کالاها و محصولات علی‌بابا</h2>
          <p className="text-xs text-slate-500 mt-1">نمایش محصولات ارزیابی‌شده با تضمین کیفیت و ارسال سریع</p>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">مرتب‌سازی:</span>
          <select
            value={priceSort}
            onChange={(e) => onPriceSortChange(e.target.value)}
            className="text-xs font-bold py-2 px-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
          >
            <option value="newest">جدیدترین محصولات</option>
            <option value="price_asc">ارزان‌ترین به گران‌ترین</option>
            <option value="price_desc">گران‌ترین به ارزان‌ترین</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Filter Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#FF6A00]" /> فیلتر دسته‌بندی‌ها
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => onSelectCategory("")}
                className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  !selectedCategory ? "bg-[#FF6A00] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                همه دسته‌ها
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCategory(c.id)}
                  className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === c.id ? "bg-[#FF6A00] text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {c.name_fa}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 pb-2 border-b border-slate-100">نوع فروشنده</h3>
            <label className="flex items-center gap-2 text-xs text-slate-700 font-bold cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#FF6A00] focus:ring-[#FF6A00]" />
              <span>Verified Supplier Pro</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 font-bold cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#FF6A00] focus:ring-[#FF6A00]" />
              <span>دارای Trade Assurance</span>
            </label>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-slate-400 border border-slate-200">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">هیچ کالایی با مشخصات انتخابی یافت نشد.</p>
              <button
                onClick={() => { onSelectCategory(""); onSearchChange(""); }}
                className="mt-4 px-4 py-2 bg-[#FF6A00] text-white text-xs font-bold rounded-xl"
              >
                پاکسازی فیلترها
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
function ProductDetailPage({ productId, apiFetch, authUser, onAddToCart, onBack, showNotification, onOpenRfq }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState("");
  const [newRating, setNewRating] = useState(5);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`./api/products/${productId}`);
      setProduct(data);
      const revs = await apiFetch(`./api/products/${productId}/reviews`);
      setReviews(revs || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!authUser) {
      showNotification("برای ثبت نظر وارد حساب شوید.", "error");
      return;
    }
    try {
      await apiFetch(`./api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: newRating, comment: newReviewText })
      });
      setNewReviewText("");
      showNotification("نظر شما ثبت گردید.");
      loadProduct();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-10 h-10 text-[#FF6A00] animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">در حال دریافت اطلاعات کالا...</p>
      </div>
    );
  }

  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const mainImg = imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const effectivePrice = product.discount_price ? product.discount_price : product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FF6A00] transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
        <span>بازگشت به فهرست کالاها</span>
      </button>

      {/* Main Product Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left/Middle Column: Image & Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Gallery Image */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={mainImg} alt={product.title} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Title & Pricing */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 block">دسته‌بندی: {product.category_name}</span>
                <h1 className="text-lg font-black text-slate-900 leading-snug">{product.title}</h1>
              </div>

              {/* Verified Tag */}
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Verified Supplier
                </span>
                <span className="bg-orange-100 text-[#FF6A00] font-extrabold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Trade Assurance
                </span>
              </div>

              {/* Price Display */}
              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">قیمت واحد برای خریداران:</span>
                {product.discount_price ? (
                  <div>
                    <span className="text-xs text-slate-400 line-through ml-2">{formatPrice(product.price)}</span>
                    <span className="text-xl font-black text-[#FF6A00]">{formatPrice(product.discount_price)} تومان</span>
                  </div>
                ) : (
                  <span className="text-xl font-black text-slate-900">{formatPrice(product.price)} تومان</span>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">تعداد سفارش:</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 rounded-xl bg-white p-1">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 rounded-lg">-</button>
                    <span className="px-4 font-black text-sm">{toFaDigits(quantity)}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 rounded-lg">+</button>
                  </div>
                  <span className="text-xs text-slate-500 font-bold">موجودی انبار: {toFaDigits(product.stock_quantity)} عدد</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                <button
                  onClick={() => onAddToCart(product.id, quantity)}
                  className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>افزودن به سبد خرید</span>
                </button>

                <button
                  onClick={onOpenRfq}
                  className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#FF6A00]" />
                  <span>استعلام قیمت عمده و تیراژ بالا (RFQ)</span>
                </button>
              </div>

            </div>

          </div>

          {/* Description & Specs */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">توضیحات و مشخصات کالا</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{product.description || "توضیحاتی ثبت نشده است."}</p>
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">نظرات خریداران ({toFaDigits(reviews.length)})</h3>

            {/* Review Form */}
            <form onSubmit={handleAddReview} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">ثبت نظر جدید:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">امتیاز شما:</span>
                <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="text-xs p-1.5 border border-slate-300 rounded-lg">
                  <option value={5}>⭐⭐⭐⭐⭐ ( عالی )</option>
                  <option value={4}>⭐⭐⭐⭐ ( خوب )</option>
                  <option value={3}>⭐⭐⭐ ( متوسط )</option>
                  <option value={2}>⭐⭐ ( ضعیف )</option>
                  <option value={1}>⭐ ( خیلی ضعیف )</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="تجربه خریدار و کیفیت کالا..."
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
              ></textarea>
              <button type="submit" className="px-4 py-2 bg-[#FF6A00] text-white font-bold text-xs rounded-xl">ثبت نظر</button>
            </form>

            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 bg-[#F4F5F7] rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{r.user_name}</span>
                    <span className="text-amber-500 font-bold text-xs flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {toFaDigits(r.rating)}/۵
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Supplier Box */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-xs text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF6A00]" /> اطلاعات فروشگاه تامین‌کننده
            </h3>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-900">{product.store_name}</h4>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3]" /> Verified Supplier Pro (تأیید رسمی)
              </div>

              <ul className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <li className="flex justify-between">
                  <span>سابقه در بازارگاه:</span>
                  <span className="font-bold text-slate-900">۵ سال فعال</span>
                </li>
                <li className="flex justify-between">
                  <span>میزان رضایت خریداران:</span>
                  <span className="font-bold text-amber-600">۴.۹ / ۵</span>
                </li>
                <li className="flex justify-between">
                  <span>زمان پاسخگویی:</span>
                  <span className="font-bold text-emerald-600">کمتر از ۱ ساعت</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-[#1E2229] rounded-3xl p-6 text-white space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h4 className="font-black text-xs text-white">Trade Assurance Protection</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              با پرداخت آنلاین در سامانه علی‌بابا، مبلغ پرداختی تا زمان تحویل فیزیکی کالا و تایید کیفیت توسط شما به امانت می‌ماند.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// STORE DETAIL PAGE COMPONENT
function StoreDetailPage({ storeSlug, onSelectProduct, onAddToCart }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
      <Building2 className="w-16 h-16 text-[#FF6A00] mx-auto mb-3" />
      <h2 className="text-xl font-black text-slate-900">غرفه اختصاصی فروشگاه</h2>
      <p className="text-xs text-slate-500 mt-1">کلیه محصولات این تامین‌کننده دارای ضمانت کیفیت می‌باشند.</p>
    </div>
  );
}

// ACCOUNT DASHBOARD COMPONENT
function AccountDashboard({ authUser, addresses, apiFetch, loadAddresses, showNotification }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await apiFetch("./api/orders");
        setOrders(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* User Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6A00] flex items-center justify-center font-black text-xl">
            {authUser?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-900">{authUser?.full_name}</h2>
            <p className="text-xs text-slate-500">{authUser?.email} | نقش: {authUser?.role}</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">تاریخچه سفارش‌های من</h3>

        {loadingOrders ? (
          <p className="text-xs text-slate-500">در حال دریافت سفارش‌ها...</p>
        ) : orders.length === 0 ? (
          <p className="text-xs text-slate-500">هنوز هیچ سفارشی ثبت نکرده‌اید.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="p-4 bg-[#F4F5F7] rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-900">شماره سفارش: {o.order_number}</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    وضعیت: {o.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <span>مبلغ پرداختی: {formatPrice(o.total_amount)} تومان</span>
                  <span>تاریخ: {new Date(o.created_at * 1000).toLocaleDateString("fa-IR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// SELLER PANEL COMPONENT
function SellerPanel({ authUser, authStore, categories, apiFetch, showNotification }) {
  const [storeProducts, setStoreProducts] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Add Product Form State
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [catId, setCatId] = useState(categories[0]?.id || "");
  const [desc, setDesc] = useState("");

  const loadSellerData = async () => {
    try {
      setLoading(true);
      const prds = await apiFetch("./api/seller/products");
      setStoreProducts(prds || []);
      const ldg = await apiFetch("./api/seller/ledger");
      setLedger(ldg || { balance: 0, pending: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("./api/seller/products", {
        method: "POST",
        body: JSON.stringify({
          title,
          price: Number(price),
          discount_price: discountPrice ? Number(discountPrice) : null,
          stock_quantity: Number(stock),
          category_id: catId || categories[0]?.id,
          description: desc,
          images_json: JSON.stringify(["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"])
        })
      });
      showNotification("محصول جدید با موفقیت اضافه شد.");
      setTitle("");
      setPrice("");
      setDiscountPrice("");
      loadSellerData();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Seller Header */}
      <div className="bg-[#1E2229] p-6 rounded-3xl text-white flex items-center justify-between">
        <div>
          <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase">
            Verified Supplier Seller Center
          </span>
          <h2 className="font-black text-xl mt-1 text-white">{authStore?.store_name || "پنل مدیریت فروشگاه"}</h2>
        </div>

        {/* Ledger Summary */}
        <div className="text-left bg-slate-800 p-3.5 rounded-2xl border border-slate-700">
          <span className="text-[10px] text-slate-400 block">مانده حساب قابل تسویه:</span>
          <span className="text-lg font-black text-[#FF6A00]">{formatPrice(ledger.balance)} تومان</span>
        </div>
      </div>

      {/* Add Product Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">افزودن کالای جدید به غرفه</h3>
        
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">عنوان کالا</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">دسته‌بندی</label>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_fa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">قیمت پایه (تومان)</label>
            <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">قیمت با تخفیف (اختیاری)</label>
            <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">موجودی انبار</label>
            <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div className="md:col-span-3">
            <button type="submit" className="px-6 py-3 bg-[#FF6A00] text-white font-extrabold text-xs rounded-xl shadow-md">
              ثبت محصول جدید
            </button>
          </div>
        </form>
      </div>

      {/* Existing Products */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">محصولات موجود غرفه شما ({toFaDigits(storeProducts.length)})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeProducts.map((p) => (
            <div key={p.id} className="p-4 bg-[#F4F5F7] rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900">{p.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1">قیمت: {formatPrice(p.price)} تومان | موجودی: {toFaDigits(p.stock_quantity)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ADMIN PANEL COMPONENT
function AdminPanel({ apiFetch, showNotification, onReloadSystem }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        const data = await apiFetch("./api/admin/stats");
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadAdminStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-[#1E2229] p-6 rounded-3xl text-white">
        <h2 className="font-black text-xl text-white">داشبورد مدیریت ارشد علی‌بابا بازارگاه</h2>
        <p className="text-xs text-slate-400 mt-1">پایش کل گردش مالی، فروشگاه‌ها و سفارشات بازارگاه</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold block">کل فروش بازارگاه (GMV):</span>
            <span className="text-xl font-black text-[#FF6A00] mt-1 block">{formatPrice(stats.gmv)} تومان</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold block">درآمد کارمزد بازارگاه (کمیسیون ۵٪):</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{formatPrice(stats.platformRevenue)} تومان</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold block">تعداد سفارش‌ها:</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{toFaDigits(stats.totalOrders)} عدد</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold block">فروشگاه‌های فعال:</span>
            <span className="text-xl font-black text-blue-600 mt-1 block">{toFaDigits(stats.totalStores)} غرفه</span>
          </div>
        </div>
      )}
    </div>
  );
}

// AUTHENTICATION MODAL COMPONENT
function AuthModal({ mode, setMode, onClose, onLogin, apiFetch, showNotification, setAuthToken, setAuthUser, setAuthStore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("BUYER");
  const [storeName, setStoreName] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("./api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
          store_name: role === "SELLER" ? storeName : undefined
        })
      });
      setAuthToken(res.token);
      localStorage.setItem("bazargah_token", res.token);
      setAuthUser(res.user);
      setAuthStore(res.store);
      onClose();
      showNotification(`حساب کاربری با موفقیت ساخته شد! خوش آمدید ${res.user.full_name}`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        
        <div className="bg-[#1E2229] p-6 text-white text-center relative border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] flex items-center justify-center font-black text-2xl mx-auto mb-2 text-white">a</div>
          <h3 className="font-black text-lg">{mode === "login" ? "ورود به علی‌بابا بازارگاه" : "ثبت‌نام حساب جدید"}</h3>
          <p className="text-xs text-slate-400 mt-1">پلتفرم بین‌المللی تجارت و خریدهای عمومی و عمده</p>
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "login" ? (
            <form onSubmit={(e) => onLogin(e, email, password)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">ایمیل یا نام کاربری</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@bazargah.ir"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">رمز عبور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all"
              >
                ورود به حساب کاربری
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">نام و نام خانوادگی کامل</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد رضایی"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">آدرس ایمیل معتبر</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="newuser@bazargah.ir"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">رمز عبور امن</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">نوع حساب کاربری</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                >
                  <option value="BUYER">خریدار کالا (Buyer)</option>
                  <option value="SELLER">فروشنده و تامین‌کننده (Verified Supplier)</option>
                </select>
              </div>

              {role === "SELLER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">نام تجاری فروشگاه / کارخانه</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="فروشگاه نوین تجارت"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#FF6A00] focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all"
              >
                ثبت‌نام و ایجاد حساب
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 text-center text-xs">
            {mode === "login" ? (
              <p className="text-slate-600">
                حساب کاربری ندارید؟{" "}
                <button onClick={() => setMode("register")} className="text-[#FF6A00] font-extrabold hover:underline">
                  ثبت‌نام کنید
                </button>
              </p>
            ) : (
              <p className="text-slate-600">
                قبلاً ثبت‌نام کرده‌اید؟{" "}
                <button onClick={() => setMode("login")} className="text-[#FF6A00] font-extrabold hover:underline">
                  وارد شوید
                </button>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Render React App
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
