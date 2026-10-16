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
  ChevronRight,
  Upload,
  Download,
  FileSpreadsheet,
  Cpu,
  History,
  CheckSquare,
  Bot,
  Send,
  Sliders,
  SlidersHorizontal,
  ThumbsUp,
  ArrowUpDown
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
  const [checkoutValidation, setCheckoutValidation] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // AI Shopping Assistant Chat State
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    {
      sender: "bot",
      text: "سلام! من دستیار هوشمند خرید بازارگاه شاهکار هستم. چطور می‌توانم در انتخاب و خرید کالا به شما کمک کنم؟",
      recommendations: [],
      follow_ups: ["به دنبال چه محصولی می‌گردید؟", "ارزان‌ترین گوشی‌های هوشمند بازار کدامند؟"]
    }
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Advanced Filters State for Catalog
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [inStockFilter, setInStockFilter] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");

  const handleSendAssistantMessage = async (msgToSend) => {
    const text = msgToSend || assistantInput;
    if (!text || !text.trim()) return;

    const userMsg = { sender: "user", text };
    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const res = await apiFetch("./api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history: assistantMessages })
      });

      const botMsg = {
        sender: "bot",
        text: res.reply,
        recommendations: res.recommendations || [],
        follow_ups: res.follow_ups || []
      };

      setAssistantMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setAssistantLoading(false);
    }
  };

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
    if (e) e.preventDefault();
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
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }
    if (selectedBrandFilter) {
      list = list.filter((p) => p.brand?.toLowerCase().includes(selectedBrandFilter.toLowerCase()));
    }
    if (inStockFilter) {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    }
    if (minPriceFilter) {
      list = list.filter((p) => (p.discount_price || p.price) >= parseFloat(minPriceFilter));
    }
    if (maxPriceFilter) {
      list = list.filter((p) => (p.discount_price || p.price) <= parseFloat(maxPriceFilter));
    }

    if (priceSort === "price_asc") {
      list.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (priceSort === "price_desc") {
      list.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }
    return list;
  }, [products, selectedCategory, searchScopeCategory, searchQuery, selectedBrandFilter, inStockFilter, minPriceFilter, maxPriceFilter, priceSort]);

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
              <span>سیستم هوشمند مدیریت محصولات شاهکار</span>
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
              <span>تست و پایش سلامت سیستم (۱۰ لایه)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN ALIBABA HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo */}
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
                    {settings.site_name || "شاهکار"}
                  </h1>
                  <span className="bg-[#FF6A00] text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    بازارگاه
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">سامانه هوشمند مدیریت محصولات و تجارت</p>
              </div>
            </div>

            {/* Search Box */}
            <div className="flex-1 max-w-3xl mx-2 hidden md:block">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveTab("catalog");
                }}
                className="relative flex items-center bg-[#F4F5F7] border-2 border-[#FF6A00] rounded-xl overflow-hidden shadow-sm"
              >
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
                  placeholder="نام کالا، برند، کد SKU یا مشخصات فنی..."
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

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
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

                  {authUser.role === "SELLER" && (
                    <button
                      onClick={() => setActiveTab("seller_panel")}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>مرکز مدیریت محصولات</span>
                    </button>
                  )}

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

        {/* SECONDARY NAV BAR */}
        <nav className="bg-[#1E2229] text-white text-xs font-semibold border-t border-slate-800 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-2 py-2">
              <button
                onClick={() => { setSelectedCategory(""); setActiveTab("catalog"); }}
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
                <span>کالاهای آمادۀ ارسال (Ready to Ship)</span>
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
                <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>مدیریت هوشمند محصولات و ورود CSV</span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* DYNAMIC CONTENT ROUTER */}
      <main className="flex-1">
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

        {activeTab === "product_detail" && (
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
            onRefreshProducts={loadInitialData}
          />
        )}

        {activeTab === "admin_panel" && (
          <AdminPanel
            apiFetch={apiFetch}
            showNotification={showNotification}
            onReloadSystem={loadInitialData}
          />
        )}
      </main>

      {/* SYSTEM TESTS MODAL */}
      {showTestsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="bg-[#1E2229] p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">گزارش آزمون‌های سلامت و پایگاه داده شاهکار</h3>
              </div>
              <button onClick={() => setShowTestsModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {testsLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-10 h-10 text-[#FF6A00] animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">در حال اجرای آزمون‌های یکپارچگی کالاها، الگوریتم‌های AI و امنیت...</p>
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

// HOME PAGE
function HomePage({ products, categories, stores, onSelectCategory, onSelectProduct, onSelectStore, onAddToCart, onOpenRfq }) {
  const featuredProducts = products.filter((p) => p.is_featured || p.discount_price);

  return (
    <div className="space-y-10 pb-16">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm hidden lg:block">
            <h3 className="text-xs font-black text-slate-900 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span>دسته‌بندی اصلی محصولات</span>
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

          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E2229] via-slate-900 to-[#1E2229] text-white p-7 sm:p-10 shadow-xl border border-slate-800 flex-1 flex flex-col justify-between">
              <div className="relative z-10 space-y-3">
                <span className="bg-[#FF6A00] text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                  سیستم هوشمند مدیریت و تولید اطلاعات کالا
                </span>

                <h2 className="text-xl sm:text-3xl font-black leading-snug text-white">
                  بازارگاه بین‌المللی شاهکار با پشتیبانی از هوش مصنوعی و ورود گروهی
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
                  امکان ورود یکباره کالاها از فایل CSV، تولید عنوان و مشخصات با دستیار AI و پایش ارزیابی کیفیت.
                </p>
              </div>

              <div className="pt-6 relative z-10 flex flex-wrap gap-3">
                <button
                  onClick={() => onSelectCategory("")}
                  className="px-6 py-3 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <span>مشاهده کاتالوگ محصولات</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6A00] font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">دستیار هوش مصنوعی</h4>
                  <p className="text-[10px] text-slate-500">تولید محتوا و سئو کالاها</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#FF6A00]" /> کالاها و محصولات پرفروش شاهکار
          </h3>
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
    </div>
  );
}

// PRODUCT CARD
function ProductCard({ product, onSelect, onAddToCart }) {
  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const mainImg = imgs[product.main_image_index || 0] || imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const hasDiscount = product.discount_price && product.discount_price < product.price;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-[#FF6A00] transition-all flex flex-col group">
      <div className="relative aspect-square overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onSelect(product.id)}>
        <img
          src={mainImg}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.brand && (
          <span className="absolute top-2 right-2 bg-slate-900/80 text-white font-bold text-[9px] px-2 py-0.5 rounded-md backdrop-blur">
            {product.brand}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="cursor-pointer space-y-1.5" onClick={() => onSelect(product.id)}>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span>فروشگاه: {product.store_name}</span>
            {product.sku && <span className="bg-slate-100 px-1.5 py-0.5 rounded">SKU: {product.sku}</span>}
          </div>
          <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-relaxed">
            {product.title}
          </h4>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
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

// CATALOG PAGE
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900">کاتالوگ کالاها و محصولات شاهکار</h2>
          <p className="text-xs text-slate-500 mt-1">نمایش محصولات تأییدشده با اطلاعات کامل و مشخصات ساختاریافته</p>
        </div>

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
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#FF6A00]" /> دسته‌بندی‌ها
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
        </div>

        <div className="lg:col-span-9">
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center text-slate-400 border border-slate-200">
              <Package className="w-16 h-16 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">هیچ کالایی یافت نشد.</p>
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

// PRODUCT DETAIL PAGE
function ProductDetailPage({ productId, apiFetch, authUser, onAddToCart, onBack, showNotification, onOpenRfq }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`./api/products/${productId}`);
      setProduct(data);
      const revs = await apiFetch(`./api/products/${productId}/reviews`);
      setReviews(revs || []);
      const hst = await apiFetch(`./api/products/${productId}/history`);
      setHistoryLogs(hst || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-10 h-10 text-[#FF6A00] animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">در حال دریافت اطلاعات جامع کالا...</p>
      </div>
    );
  }

  const imgs = product.images_json ? JSON.parse(product.images_json) : [];
  const specs = product.specs_json ? JSON.parse(product.specs_json) : [];
  const mainImg = imgs[product.main_image_index || 0] || imgs[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FF6A00]">
        <ChevronRight className="w-4 h-4" />
        <span>بازگشت به فهرست</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={mainImg} alt={product.title} className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-400 block">برند: {product.brand || "نامشخص"} | SKU: {product.sku || "N/A"}</span>
                <h1 className="text-lg font-black text-slate-900 leading-snug">{product.title}</h1>
              </div>

              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200 space-y-1">
                <span className="text-xs text-slate-500 font-bold block">قیمت محصول:</span>
                {product.discount_price ? (
                  <div>
                    <span className="text-xs text-slate-400 line-through ml-2">{formatPrice(product.price)}</span>
                    <span className="text-xl font-black text-[#FF6A00]">{formatPrice(product.discount_price)} تومان</span>
                  </div>
                ) : (
                  <span className="text-xl font-black text-slate-900">{formatPrice(product.price)} تومان</span>
                )}
              </div>

              <button
                onClick={() => onAddToCart(product.id, quantity)}
                className="w-full py-3.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>افزودن به سبد خرید</span>
              </button>
            </div>
          </div>

          {/* Structured Specs Table */}
          {specs.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-black text-sm text-slate-900 border-b pb-2">مشخصات فنی ساختاریافته</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {specs.map((sp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                    <span className="font-bold text-slate-500">{sp.name}:</span>
                    <span className="font-extrabold text-slate-900">{sp.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-sm text-slate-900 border-b pb-2">توضیحات جامع محصول</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{product.description || "توضیحی ثبت نشده است."}</p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-xs text-slate-900 border-b pb-2">سوابق تغییرات و ویرایش‌ها (Audit History)</h3>
            <div className="space-y-2 text-[11px]">
              {historyLogs.map((h) => (
                <div key={h.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="font-bold text-slate-700">{h.change_type}</span>
                  <span className="text-slate-400">{new Date(h.created_at).toLocaleDateString("fa-IR")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SELLER PANEL WITH BULK IMPORT & AI ASSISTANT TOOL
function SellerPanel({ authUser, authStore, categories, apiFetch, showNotification, onRefreshProducts }) {
  const [storeProducts, setStoreProducts] = useState([]);
  const [ledger, setLedger] = useState({ balance: 0 });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single Product Form
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [catId, setCatId] = useState(categories[0]?.id || "");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [specsText, setSpecsText] = useState("پردازنده: Intel | حافظه رم: 16GB");
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800");

  // AI Assistant State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState([]);
  const [aiAudit, setAiAudit] = useState(null);

  const loadSellerData = async () => {
    try {
      const prds = await apiFetch("./api/seller/products");
      setStoreProducts(prds || []);
      const ldg = await apiFetch("./api/seller/ledger");
      setLedger(ldg || { balance: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  // AI Assistant trigger
  const handleAIGenerate = async (type) => {
    try {
      setAiLoading(true);
      const res = await apiFetch("./api/ai/generate-product-content", {
        method: "POST",
        body: JSON.stringify({
          type,
          data: {
            title,
            brand,
            category_name: categories.find((c) => c.id === catId)?.name_fa,
            raw_text: specsText,
            description: desc,
            price,
            sku,
            images: [imageUrl]
          }
        })
      });

      if (type === "suggest_titles" && res.result?.titles) {
        setAiTitles(res.result.titles);
        showNotification("عناوین پیشنهادی هوش مصنوعی آماده گردید.");
      } else if (type === "generate_descriptions" && res.result) {
        if (res.result.short_description) setShortDesc(res.result.short_description);
        if (res.result.description) setDesc(res.result.description);
        showNotification("توضیحات کوتاه و جامع با هوش مصنوعی تولید شد.");
      } else if (type === "extract_specs" && res.result?.specs) {
        const specsStr = res.result.specs.map((s) => `${s.name}: ${s.value}`).join(" | ");
        setSpecsText(specsStr);
        showNotification("مشخصات فنی ساختاریافته استخراج گردید.");
      } else if (type === "audit_quality" && res.result) {
        setAiAudit(res.result);
        showNotification(`کیفیت کالا ارزیابی شد. امتیاز: ${res.result.score}/100`);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  // CSV Preview & Import
  const handleBulkPreview = async () => {
    try {
      setBulkLoading(true);
      const data = await apiFetch("./api/seller/products/bulk-preview", {
        method: "POST",
        body: JSON.stringify({ csv_text: bulkCsvText })
      });
      setBulkPreview(data);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkImportCommit = async () => {
    if (!bulkPreview || !bulkPreview.rows) return;
    const approvedRows = bulkPreview.rows.filter((r) => r.valid);
    if (approvedRows.length === 0) {
      showNotification("هیچ سطر معتبری برای ثبت وجود ندارد.", "error");
      return;
    }

    try {
      setBulkLoading(true);
      const res = await apiFetch("./api/seller/products/bulk-import", {
        method: "POST",
        body: JSON.stringify({ approved_rows: approvedRows })
      });
      showNotification(res.message);
      setShowBulkModal(false);
      setBulkCsvText("");
      setBulkPreview(null);
      loadSellerData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      // Parse Specs
      const specsArr = specsText.split("|").map((pair) => {
        const [n, v] = pair.split(":");
        return { name: n ? n.trim() : "ویژگی", value: v ? v.trim() : "-" };
      });

      await apiFetch("./api/seller/products", {
        method: "POST",
        body: JSON.stringify({
          title,
          brand,
          sku,
          barcode,
          price: Number(price),
          discount_price: discountPrice ? Number(discountPrice) : null,
          stock: Number(stock),
          category_id: catId || categories[0]?.id,
          short_description: shortDesc,
          description: desc,
          specs: specsArr,
          images: [imageUrl],
          main_image_index: 0
        })
      });
      showNotification("محصول جدید با موفقیت اضافه شد.");
      setTitle("");
      setPrice("");
      setDiscountPrice("");
      loadSellerData();
      if (onRefreshProducts) onRefreshProducts();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Seller Header */}
      <div className="bg-[#1E2229] p-6 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase">
            مرکز مدیریت کامل محصولات شاهکار
          </span>
          <h2 className="font-black text-xl mt-1 text-white">{authStore?.store_name || "پنل فروشگاه"}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#E05900] text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ورود گروهی کالاها (CSV Import)</span>
          </button>

          <div className="text-left bg-slate-800 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 block">مانده قابل تسویه:</span>
            <span className="text-sm font-black text-[#FF6A00]">{formatPrice(ledger.balance)} تومان</span>
          </div>
        </div>
      </div>

      {/* Add Product Form with AI Assistant */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-black text-base text-slate-900">افزودن کالای جدید با سیستم AI و فرم جامع</h3>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAIGenerate("suggest_titles")}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#FF6A00] border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> <span>عنوان AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleAIGenerate("generate_descriptions")}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-[#1E2229] text-white hover:bg-black rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> <span>توضیحات AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleAIGenerate("audit_quality")}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> <span>ارزیابی AI</span>
            </button>
          </div>
        </div>

        {/* AI Suggested Titles Options */}
        {aiTitles.length > 0 && (
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-200 space-y-2">
            <span className="text-xs font-black text-slate-900 block">عناوین پیشنهادی هوش مصنوعی (کلیک کنید تا انتخاب شود):</span>
            <div className="space-y-1">
              {aiTitles.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTitle(t)}
                  className="w-full text-right p-2 bg-white hover:bg-orange-100 rounded-xl text-xs font-bold text-slate-800 border border-slate-200"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Quality Audit Results */}
        {aiAudit && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-amber-400">گزارش پایش کیفیت اطلاعات کالا</span>
              <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded">امتیاز: {aiAudit.score}/100</span>
            </div>
            {aiAudit.issues?.map((iss, i) => (
              <p key={i} className="text-rose-400 flex items-center gap-1">⚠️ {iss}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">عنوان کالا</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان کامل محصول..." className="w-full text-xs p-2.5 border rounded-xl" />
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
            <label className="block text-xs font-bold text-slate-800 mb-1">برند کالا</label>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="مثلاً: ایسوس، سامسونگ" className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">کد SKU انبار</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="مثلاً: ASUS-ROG-16" className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">کد بارکد بین‌المللی</label>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="کد ۱۲ رقمی بارکد" className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">قیمت پایه (تومان)</label>
            <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">قیمت تخفیف‌دار (اختیاری)</label>
            <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">موجودی انبار</label>
            <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-800 mb-1">مشخصات فنی (با فرمت: نام:مقدار | نام:مقدار)</label>
            <input type="text" value={specsText} onChange={(e) => setSpecsText(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-800 mb-1">توضیحات کوتاه مارکتینگ</label>
            <input type="text" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="خلاصه ۲ خطی محصول..." className="w-full text-xs p-2.5 border rounded-xl" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-800 mb-1">توضیحات جامع و کامل کالا</label>
            <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="شرح کامل کاربرد و مزایا..." className="w-full text-xs p-2.5 border rounded-xl"></textarea>
          </div>

          <div className="md:col-span-3">
            <button type="submit" className="px-6 py-3 bg-[#FF6A00] text-white font-extrabold text-xs rounded-xl shadow-md">
              ثبت نهایی کالا در شاهکار
            </button>
          </div>
        </form>
      </div>

      {/* Existing Products List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 border-b border-slate-100 pb-3">لیست کلیه محصولات انبار شما ({toFaDigits(storeProducts.length)})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeProducts.map((p) => (
            <div key={p.id} className="p-4 bg-[#F4F5F7] rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-900">{p.title}</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">{p.status}</span>
              </div>
              <p className="text-[11px] text-slate-500">برند: {p.brand || "-"} | SKU: {p.sku || "-"}</p>
              <p className="text-[11px] text-slate-600 font-bold">قیمت: {formatPrice(p.price)} تومان | موجودی: {toFaDigits(p.stock ?? 0)} عدد</p>
            </div>
          ))}
        </div>
      </div>

      {/* BULK CSV IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="bg-[#1E2229] p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#FF6A00]" />
                <h3 className="font-extrabold text-base">ورود گروهی کالاها از فایل CSV</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">ابتدا ساختار نمونه فایل CSV را دریافت نمائید:</span>
                <a
                  href="./api/seller/products/sample-csv"
                  download
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> <span>دانلود قالب نمونه CSV</span>
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">متن یا محتوای فایل CSV را جای‌گذاری کنید:</label>
                <textarea
                  rows={5}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={`title,category_slug,price,discount_price,stock,brand,sku\n"گوشی آیفون 15","electronics",79000000,76500000,10,"اپل","IPH15-256"`}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                ></textarea>
              </div>

              <button
                onClick={handleBulkPreview}
                disabled={bulkLoading || !bulkCsvText.trim()}
                className="px-5 py-2.5 bg-[#1E2229] text-white font-bold text-xs rounded-xl hover:bg-black transition-colors"
              >
                {bulkLoading ? "در حال بررسی..." : "اعتبارسنجی و پیش‌نمایش سطور"}
              </button>

	                  {bulkPreview && (
	                <div className="space-y-3 pt-3 border-t">
	                  <div className="flex items-center gap-4 text-xs font-bold">
	                    <span className="text-slate-900">کل سطور: {bulkPreview.total_rows}</span>
	                    <span className="text-emerald-600">سطور معتبر: {bulkPreview.valid_rows_count}</span>
	                    <span className="text-rose-600">سطور دارای خطا: {bulkPreview.invalid_rows_count}</span>
	                  </div>

	                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-xl p-2 text-xs">
	                    {bulkPreview.rows?.map((r, idx) => (
	                      <div key={idx} className={`p-2 rounded-lg border ${r.valid ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
	                        <span className="font-bold block">سطر {r.row_num}: {r.product_data?.title}</span>
	                        {r.errors?.map((err, eIdx) => (
	                          <span key={eIdx} className="text-rose-600 text-[11px] block">{err}</span>
	                        ))}
	                      </div>
	                    ))}
	                  </div>

	                  {bulkPreview.valid_rows_count > 0 && (
	                    <button
	                      onClick={handleBulkImportCommit}
	                      disabled={bulkLoading}
	                      className="w-full py-3 bg-[#FF6A00] hover:bg-[#E05900] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
	                    >
	                      ثبت نهایی {bulkPreview.valid_rows_count} محصول معتبر در انبار
	                    </button>
	                  )}
	                </div>
	              )}
	            </div>
	          </div>
	        </div>
	      )}
	    </div>
	  );
	}

                  <button
                    onClick={handleBulkImportCommit}
                    disabled={bulkLoading || bulkPreview.valid_rows_count === 0}
                    className="w-full py-3 bg-[#FF6A00] text-white font-black text-xs rounded-xl shadow-lg"
                  >
                    ثبت نهایی {bulkPreview.valid_rows_count} کالای معتبر در انبار
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ADMIN PANEL WITH APPROVAL WORKFLOW QUEUE
function AdminPanel({ apiFetch, showNotification, onReloadSystem }) {
  const [stats, setStats] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);

  const loadAdminData = async () => {
    try {
      const data = await apiFetch("./api/admin/stats");
      setStats(data);
      const pending = await apiFetch("./api/admin/products/pending");
      setPendingProducts(pending || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleApproveProduct = async (id) => {
    try {
      await apiFetch(`./api/admin/products/${id}/approve`, { method: "PUT" });
      showNotification("محصول با موفقیت تأیید گردید.");
      loadAdminData();
      if (onReloadSystem) onReloadSystem();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const handleRejectProduct = async (id) => {
    try {
      await apiFetch(`./api/admin/products/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: "عدم تطابق با استانداردهای انتشار کالا" })
      });
      showNotification("محصول رد گردید.");
      loadAdminData();
      if (onReloadSystem) onReloadSystem();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-[#1E2229] p-6 rounded-3xl text-white">
        <h2 className="font-black text-xl text-white">داشبورد مدیریت ارشد شاهکار</h2>
        <p className="text-xs text-slate-400 mt-1">پایش کامل امور مالی، تأیید کالاها و مدیریت کاربران</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">کل فروش (GMV):</span>
            <span className="text-lg font-black text-[#FF6A00] mt-1 block">{formatPrice(stats.totalGMV ?? 0)} تومان</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">سهم کمیسیون ۵٪:</span>
            <span className="text-lg font-black text-emerald-600 mt-1 block">{formatPrice(stats.totalCommission ?? 0)} تومان</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">تعداد سفارشات:</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">{toFaDigits(stats.orderCount ?? 0)}</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">غرفه‌ها:</span>
            <span className="text-lg font-black text-blue-600 mt-1 block">{toFaDigits(stats.storeCount ?? 0)}</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">کالاهای منتشرشده:</span>
            <span className="text-lg font-black text-indigo-600 mt-1 block">{toFaDigits(stats.productCount ?? 0)}</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] text-slate-500 font-bold block">در انتظار بررسی:</span>
            <span className="text-lg font-black text-rose-600 mt-1 block">{toFaDigits(stats.pendingProductsCount ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Pending Approval Queue */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-base text-slate-900 border-b pb-3">صف بررسی و انتشار کالاها ({toFaDigits(pendingProducts.length)})</h3>

        {pendingProducts.length === 0 ? (
          <p className="text-xs text-slate-500">هیچ کالایی در صف بررسی وجود ندارد.</p>
        ) : (
          <div className="space-y-3">
            {pendingProducts.map((p) => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">{p.title}</h4>
                  <p className="text-[11px] text-slate-500">فروشگاه: {p.store_name} | قیمت: {formatPrice(p.price)} تومان</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApproveProduct(p.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">تأیید و انتشار</button>
                  <button onClick={() => handleRejectProduct(p.id)} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl">رد محصول</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// AUTH MODAL
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
      showNotification(`حساب ساخته شد! خوش آمدید ${res.user.full_name}`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-[#1E2229] p-6 text-white text-center relative border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] flex items-center justify-center font-black text-2xl mx-auto mb-2 text-white">a</div>
          <h3 className="font-black text-lg">{mode === "login" ? "ورود به شاهکار" : "ثبت‌نام حساب جدید"}</h3>
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "login" ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block text-center">ورود سریع آزمایشی با یک کلیک:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => onLogin(e, "admin@bazargah.ir", "admin123")}
                    className="py-2 px-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-[10px] font-bold border border-amber-300"
                  >
                    👑 مدیر کل
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onLogin(e, "tech@bazargah.ir", "seller123")}
                    className="py-2 px-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-[10px] font-bold border border-emerald-300"
                  >
                    🏬 فروشنده
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onLogin(e, "user@bazargah.ir", "user123")}
                    className="py-2 px-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-[10px] font-bold border border-blue-300"
                  >
                    🛒 خریدار
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => onLogin(e, email, password)} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="پست الکترونیک..." className="w-full text-xs p-3 rounded-xl border" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور..." className="w-full text-xs p-3 rounded-xl border" />
                <button type="submit" className="w-full py-3 bg-[#FF6A00] text-white font-extrabold rounded-xl text-xs shadow-lg">ورود به حساب</button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="نام و نام خانوادگی..." className="w-full text-xs p-3 rounded-xl border" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="پست الکترونیک..." className="w-full text-xs p-3 rounded-xl border" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور..." className="w-full text-xs p-3 rounded-xl border" />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full text-xs p-3 rounded-xl border">
                <option value="BUYER">حساب خریدار عادی</option>
                <option value="SELLER">حساب فروشنده (غرفه‌دار)</option>
              </select>
              {role === "SELLER" && (
                <input type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="نام فروشگاه یا برند شما..." className="w-full text-xs p-3 rounded-xl border" />
              )}
              <button type="submit" className="w-full py-3 bg-[#FF6A00] text-white font-extrabold rounded-xl text-xs shadow-lg">ایجاد حساب کاربری</button>
            </form>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-xs text-[#FF6A00] font-bold hover:underline"
            >
              {mode === "login" ? "حساب کاربری ندارید؟ ثبت‌نام کنید" : "قبلاً ثبت‌نام کرده‌اید؟ وارد شوید"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mount App
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
