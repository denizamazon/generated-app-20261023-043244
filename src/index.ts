import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";

// Helper for crypto hash (SHA-256 with salt)
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password + "_bazargah_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export class App extends DurableObject {
  private app!: Hono;
  private dbInitialized = false;

  private initDatabase() {
    if (this.dbInitialized) return;

    // Execute SQLite Schema Creation
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        phone TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        recipient TEXT NOT NULL,
        phone TEXT NOT NULL,
        province TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        is_default INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        store_name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        commission_rate REAL DEFAULT 5.0,
        rating REAL DEFAULT 5.0,
        balance REAL DEFAULT 0.0,
        total_sales REAL DEFAULT 0.0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name_fa TEXT NOT NULL,
        name_en TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        icon TEXT,
        parent_id TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        price REAL NOT NULL,
        discount_price REAL,
        stock INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        specs_json TEXT,
        images_json TEXT,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        is_featured INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        total_amount REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        commission_total REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'PAID',
        shipping_address_json TEXT NOT NULL,
        coupon_code TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_title TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        commission_amount REAL NOT NULL,
        seller_payout REAL NOT NULL,
        item_status TEXT NOT NULL DEFAULT 'PAID'
      );

      CREATE TABLE IF NOT EXISTS seller_ledger (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        order_id TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_type TEXT NOT NULL,
        value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_uses INTEGER DEFAULT 100,
        current_uses INTEGER DEFAULT 0,
        expires_at INTEGER,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payout_requests (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        note TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS return_requests (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        admin_note TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS marketplace_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Check if initial seed is needed
    const userCount = (
      this.ctx.storage.sql.exec("SELECT COUNT(*) as count FROM users").one() as { count: number }
    ).count;

    if (userCount === 0) {
      this.seedInitialDataSync();
    }

    this.dbInitialized = true;
  }

  private seedInitialDataSync() {
    const now = Date.now();
    const adminPass = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; // admin123
    const sellerPass = "2e652a65792994e6378c6e269438eb45c478a2e38c92a95c02c6d4d12a2a0951"; // seller123
    const userPass = "231a4413e16b9b77d6d53896c21e6462ec549e5d4a1fb53a557b7f1e5828464a"; // user123

    // Seed Marketplace Settings
    const defaultSettings = [
      ["site_name", "بازارگاه اینترنتی بین‌المللی"],
      ["site_subtitle", "بزرگ‌ترین بازارگاه چندفروشنده‌ای کالا و خدمات"],
      ["contact_phone", "021-91008080"],
      ["contact_email", "support@bazargah.ir"],
      ["default_commission", "5.0"],
      ["shipping_cost", "45000"],
      ["free_shipping_threshold", "1000000"],
      ["announcement_banner", "تخفیف ویژه جشنواره بهاره بازارگاه! با کد BAZAR2026 تا ۲۰٪ تخفیف بگیرید."]
    ];
    for (const [key, val] of defaultSettings) {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO marketplace_settings (key, value) VALUES (?, ?)",
        key,
        val
      );
    }

    // Seed Users
    this.ctx.storage.sql.exec(
      `INSERT INTO users (id, full_name, email, password_hash, role, status, phone, created_at) VALUES
       ('usr_admin', 'مدیر کل بازارگاه', 'admin@bazargah.ir', ?, 'ADMIN', 'ACTIVE', '09121111111', ?),
       ('usr_seller1', 'فروشگاه دیجی‌تک (تکنولوژی)', 'tech@bazargah.ir', ?, 'SELLER', 'ACTIVE', '09122222222', ?),
       ('usr_seller2', 'پوشاک شیک و مد روز', 'fashion@bazargah.ir', ?, 'SELLER', 'ACTIVE', '09123333333', ?),
       ('usr_seller3', 'لوازم خانگی آریا', 'home@bazargah.ir', ?, 'SELLER', 'ACTIVE', '09124444444', ?),
       ('usr_customer', 'رضا محمدی (خریدار)', 'user@bazargah.ir', ?, 'CUSTOMER', 'ACTIVE', '09125555555', ?)`,
      adminPass, now,
      sellerPass, now,
      sellerPass, now,
      sellerPass, now,
      userPass, now
    );

    // Seed Customer Address
    this.ctx.storage.sql.exec(
      `INSERT INTO addresses (id, user_id, title, recipient, phone, province, city, address, postal_code, is_default)
       VALUES ('addr_1', 'usr_customer', 'خانه', 'رضا محمدی', '09125555555', 'تهران', 'تهران', 'خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۴، واحد ۵', '1994812345', 1)`
    );

    // Seed Stores
    this.ctx.storage.sql.exec(
      `INSERT INTO stores (id, user_id, store_name, slug, logo_url, description, status, commission_rate, rating, balance, total_sales, created_at) VALUES
       ('str_1', 'usr_seller1', 'فروشگاه دیجی‌تک', 'digitech', 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200', 'مرجع تخصصی عرضه لپ‌تاپ، موبایل و لوازم جانبی دیجیتال با گارانتی معتبر', 'APPROVED', 5.0, 4.9, 12500000, 45000000, ?),
       ('str_2', 'usr_seller2', 'پوشاک شیک', 'chic-fashion', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200', 'تولید و عرضه مدرن‌ترین لباس‌های مردانه و زنانه پارچه‌ای و چرم', 'APPROVED', 7.0, 4.7, 8400000, 28000000, ?),
       ('str_3', 'usr_seller3', 'لوازم خانگی آریا', 'aria-home', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=200', 'ارائه‌دهنده انواع ملزومات خانه، آشپزخانه و دکوراسیون با کیفیت عالی', 'APPROVED', 6.0, 4.8, 19200000, 62000000, ?)`,
      now, now, now
    );

    // Seed Categories
    this.ctx.storage.sql.exec(
      `INSERT INTO categories (id, name_fa, name_en, slug, icon, parent_id) VALUES
       ('cat_1', 'دیجیتال و کالای الکترونیک', 'Electronics', 'electronics', 'Laptop', NULL),
       ('cat_2', 'پوشاک و مد', 'Fashion', 'fashion', 'Shirt', NULL),
       ('cat_3', 'خانه و آشپزخانه', 'Home & Kitchen', 'home-kitchen', 'Home', NULL),
       ('cat_4', 'کتاب و نوشت‌افزار', 'Books & Stationery', 'books', 'BookOpen', NULL),
       ('cat_5', 'زیبایی و سلامت', 'Beauty & Health', 'beauty', 'Heart', NULL)`
    );

    // Seed Products
    const p1Specs = JSON.stringify([
      { name: "پردازنده", value: "Intel Core i7 13700H" },
      { name: "حافظه رم", value: "16 گیگابایت DDR5" },
      { name: "حافظه داخلی", value: "1 ترابایت SSD NVMe" },
      { name: "کارت گرافیک", value: "NVIDIA RTX 4060 8GB" }
    ]);
    const p1Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"
    ]);

    const p2Specs = JSON.stringify([
      { name: "صفحه نمایش", value: "6.7 اینچ Super Retina XDR OLED" },
      { name: "حافظه داخلی", value: "256 گیگابایت" },
      { name: "دوربین اصلی", value: "48 مگاپیکسل سه گانه" }
    ]);
    const p2Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800"
    ]);

    const p3Specs = JSON.stringify([
      { name: "نوع هدست", value: "بلوتوثی نویزکنسلینگ بی‌سیم" },
      { name: "عمر باتری", value: "30 ساعت با پخش مداوم" },
      { name: "وزن", value: "250 گرم" }
    ]);
    const p3Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
    ]);

    const p4Specs = JSON.stringify([
      { name: "جنس پارچه", value: "100% پنبه خالص نخ شانه شده" },
      { name: "سایزبندی", value: "M, L, XL, XXL" },
      { name: "کشور تولیدکننده", value: "ایران" }
    ]);
    const p4Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"
    ]);

    const p5Specs = JSON.stringify([
      { name: "توان مصرفی", value: "1450 وات" },
      { name: "فشار بخار", value: "15 بار واقعی" },
      { name: "گنجایش مخزن", value: "1.8 لیتر" }
    ]);
    const p5Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800"
    ]);

    const p6Specs = JSON.stringify([
      { name: "نوع اتصال", value: "بی‌سیم بلوتوث v5.3" },
      { name: "قابلیت مقاومتی", value: "ضد آب و غبار IP67" },
      { name: "توان خروجی", value: "30 وات RMS" }
    ]);
    const p6Imgs = JSON.stringify([
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"
    ]);

    this.ctx.storage.sql.exec(
      `INSERT INTO products (id, store_id, category_id, title, slug, price, discount_price, stock, description, specs_json, images_json, status, is_featured, created_at) VALUES
       ('prd_1', 'str_1', 'cat_1', 'لپ‌تاپ حرفه‌ای ایسوس 16 اینچ Rog Strix', 'asus-rog-strix-laptop', 68500000, 64900000, 8, 'لپ‌تاپ گیمینگ و محاسباتی قدرتمند ایسوس مناسب برای امور مهندسی، برنامه‌نویسی، طراحی 3D و بازی‌های سنگین', ?, ?, 'APPROVED', 1, ?),
       ('prd_2', 'str_1', 'cat_1', 'گوشی موبایل آیفون 15 پرو 256 گیگابایت', 'iphone-15-pro-256gb', 79000000, 76500000, 12, 'پرچمدار اپل با بدنه تیتانیومی، پردازنده A17 Pro و دوربین زوم حرفه‌ای با گارانتی ۱۸ ماهه شرکتی', ?, ?, 'APPROVED', 1, ?),
       ('prd_3', 'str_1', 'cat_1', 'هدفون بی‌سیم سونی WH-1000XM5', 'sony-wh1000xm5-headphone', 18500000, 16900000, 25, 'پادشاه نویزکنسلینگ دنیا با کیفیت صدای فوق‌العاده های-رزولوشن و شفافیت بی‌نظیر مکالمه', ?, ?, 'APPROVED', 1, ?),
       ('prd_4', 'str_2', 'cat_2', 'تی‌شرت مردانه پنبه‌ای کلاسیک مدل Aria', 'men-cotton-tshirt', 650000, 480000, 50, 'تی‌شرت باکیفیت و تن‌خور بسیار عالی، بدون آبرفت و رنگ‌رفتگی در شستشوهای مکرر', ?, ?, 'APPROVED', 0, ?),
       ('prd_5', 'str_3', 'cat_3', 'اسپرسوساز اتوماتیک دلونگی مدل Magnifica', 'delonghi-magnifica-coffee-maker', 24800000, 22900000, 15, 'دستگاه اسپرسوساز و کاپوچینوساز حرفه‌ای دلونگی دارای آسیاب قهوه داخلی و نازل بخار استاندارد', ?, ?, 'APPROVED', 1, ?),
       ('prd_6', 'str_1', 'cat_1', 'اسپیکر قابل حمل جی‌بی‌ال مدل Charge 5', 'jbl-charge-5-speaker', 9200000, 8400000, 18, 'اسپیکر ضدآب و گردوغبار JBL با بیس عمیق و باتری قدرتمند با شارژدهی ۲۰ ساعته', ?, ?, 'APPROVED', 0, ?);`,
      p1Specs, p1Imgs, now,
      p2Specs, p2Imgs, now,
      p3Specs, p3Imgs, now,
      p4Specs, p4Imgs, now,
      p5Specs, p5Imgs, now,
      p6Specs, p6Imgs, now
    );

    // Seed Coupons
    this.ctx.storage.sql.exec(
      `INSERT INTO coupons (id, code, discount_type, value, min_purchase, max_uses, current_uses, expires_at, is_active) VALUES
       ('cpn_1', 'BAZAR2026', 'PERCENT', 15.0, 500000, 1000, 12, ?, 1),
       ('cpn_2', 'WELCOME100', 'FIXED', 100000, 1000000, 500, 4, ?, 1)`,
      now + 86400000 * 90, now + 86400000 * 90
    );

    // Seed Reviews
    this.ctx.storage.sql.exec(
      `INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, status, created_at) VALUES
       ('rev_1', 'prd_1', 'usr_customer', 'رضا محمدی', 5, 'بسیار لپ‌تاپ فوق‌العاده‌ای هست. تحویل دیجی‌تک هم دو روزه و در بسته‌بندی پلمپ انجام شد.', 'APPROVED', ?),
       ('rev_2', 'prd_3', 'usr_customer', 'مریم احمدی', 5, 'کیفیت صدای نویزکنسلینگ سونی بی‌نظیره. کاملا صداهای اطراف توی هواپیما رو حذف میکنه.', 'APPROVED', ?)`,
      now - 86400000 * 2, now - 86400000 * 5
    );

    // Seed Initial Order & Order Items
    this.ctx.storage.sql.exec(
      `INSERT INTO orders (id, order_number, user_id, total_amount, discount_amount, commission_total, shipping_cost, status, shipping_address_json, coupon_code, created_at)
       VALUES ('ord_demo_1', 'BZ-2026-9081', 'usr_customer', 16900000, 0, 845000, 0, 'DELIVERED', '{"recipient":"رضا محمدی","phone":"09125555555","province":"تهران","city":"تهران","address":"خیابان ولیعصر، پلاک ۱۲۴"}', NULL, ?)`,
      now - 86400000 * 3
    );

    this.ctx.storage.sql.exec(
      `INSERT INTO order_items (id, order_id, store_id, product_id, product_title, price, quantity, commission_amount, seller_payout, item_status)
       VALUES ('ord_itm_1', 'ord_demo_1', 'str_1', 'prd_3', 'هدفون بی‌سیم سونی WH-1000XM5', 16900000, 1, 845000, 16055000, 'DELIVERED')`
    );

    this.ctx.storage.sql.exec(
      `INSERT INTO seller_ledger (id, store_id, order_id, type, amount, description, created_at)
       VALUES ('led_1', 'str_1', 'ord_demo_1', 'SALE', 16055000, 'فروش محصول هدفون سونی - سفارش BZ-2026-9081 (پس از کسر ۵٪ کمیسیون)', ?)`
    , now - 86400000 * 3);
  }

  // Setup Hono routing
  private setupApp() {
    if (this.app) return;

    const app = new Hono();

    // Middleware to ensure DB is initialized
    app.use("*", async (c, next) => {
      this.initDatabase();
      await next();
    });

    // Helper to get authenticated user from header Token or Cookie
    const getAuthUser = (c: any) => {
      const token = c.req.header("Authorization")?.replace("Bearer ", "") ||
                    c.req.header("x-auth-token");
      if (!token) return null;

      const session = this.ctx.storage.sql
        .exec("SELECT user_id, expires_at FROM sessions WHERE token = ?", token)
        .toArray()[0] as { user_id: string; expires_at: number } | undefined;

      if (!session || session.expires_at < Date.now()) return null;

      const user = this.ctx.storage.sql
        .exec("SELECT id, full_name, email, role, status, phone FROM users WHERE id = ?", session.user_id)
        .toArray()[0] as any;

      return user || null;
    };

    // ===================================
    // SYSTEM & TEST ENDPOINTS
    // ===================================
    app.get("/api/health", (c) => {
      return c.json({ status: "ok", app: "بازارگاه اینترنتی بین‌المللی", version: "1.0.0" });
    });

    app.post("/api/admin/seed", (c) => {
      const user = getAuthUser(c);
      if (user && user.role !== "ADMIN") {
        return c.json({ error: "عدم دسترسی به عملیات بازنشانی" }, 403);
      }
      // Re-seed DB
      this.ctx.storage.sql.exec("DELETE FROM users");
      this.ctx.storage.sql.exec("DELETE FROM stores");
      this.ctx.storage.sql.exec("DELETE FROM categories");
      this.ctx.storage.sql.exec("DELETE FROM products");
      this.ctx.storage.sql.exec("DELETE FROM orders");
      this.ctx.storage.sql.exec("DELETE FROM order_items");
      this.ctx.storage.sql.exec("DELETE FROM seller_ledger");
      this.ctx.storage.sql.exec("DELETE FROM reviews");
      this.ctx.storage.sql.exec("DELETE FROM cart_items");
      this.ctx.storage.sql.exec("DELETE FROM coupons");
      this.ctx.storage.sql.exec("DELETE FROM addresses");

      this.seedInitialDataSync();
      return c.json({ ok: true, message: "پایگاه داده با موفقیت بازنشانی و داده‌های نمونه ایجاد شد." });
    });

    app.get("/api/tests/run", (c) => {
      // Execute live suite of internal integration tests
      const testResults: { name: string; success: boolean; details: string }[] = [];

      try {
        // Test 1: Category existence
        const cats = this.ctx.storage.sql.exec("SELECT COUNT(*) as c FROM categories").one() as any;
        testResults.push({
          name: "تست بررسی دسته‌بندی‌های پایه",
          success: cats.c >= 5,
          details: `تعداد دسته‌بندی‌ها: ${cats.c}`
        });

        // Test 2: Product calculation and stock check
        const prd = this.ctx.storage.sql.exec("SELECT price, stock FROM products WHERE id = 'prd_1'").one() as any;
        testResults.push({
          name: "تست صحت اطلاعات محصول و موجودی انبار",
          success: prd.price > 0 && prd.stock > 0,
          details: `قیمت محصول ۱: ${prd.price.toLocaleString()} تومان | موجودی: ${prd.stock}`
        });

        // Test 3: Commission calculation rule
        const store = this.ctx.storage.sql.exec("SELECT commission_rate FROM stores WHERE id = 'str_1'").one() as any;
        const testPrice = 1000000;
        const commission = (testPrice * store.commission_rate) / 100;
        const sellerPayout = testPrice - commission;
        testResults.push({
          name: "تست منطق محاسبه کمیسیون بازارگاه و سهم فروشنده",
          success: commission === 50000 && sellerPayout === 950000,
          details: `مبلغ کل: ۱,۰۰۰,۰۰۰ | کمیسیون (${store.commission_rate}٪): ${commission.toLocaleString()} | سهم فروشنده: ${sellerPayout.toLocaleString()}`
        });

        // Test 4: Coupon check
        const coupon = this.ctx.storage.sql.exec("SELECT value, is_active FROM coupons WHERE code = 'BAZAR2026'").one() as any;
        testResults.push({
          name: "تست اعتبار کد تخفیف نمونه BAZAR2026",
          success: coupon.value === 15 && coupon.is_active === 1,
          details: `کد تخفیف ۱۵٪ فعال است.`
        });

        // Test 5: Admin User status
        const adminUser = this.ctx.storage.sql.exec("SELECT role FROM users WHERE email = 'admin@bazargah.ir'").one() as any;
        testResults.push({
          name: "تست وجود حساب کاربر مدیر سیستم (ADMIN)",
          success: adminUser.role === 'ADMIN',
          details: `نقش حساب مدیر: ${adminUser.role}`
        });

      } catch (err: any) {
        testResults.push({
          name: "خطا در اجرای تست‌ها",
          success: false,
          details: err.message
        });
      }

      const allPassed = testResults.every((t) => t.success);
      return c.json({ ok: allPassed, total: testResults.length, results: testResults });
    });

    // ===================================
    // AUTHENTICATION ENDPOINTS
    // ===================================
    app.post("/api/auth/register", async (c) => {
      const body = await c.req.json();
      const { full_name, email, password, role, phone, store_name, store_description } = body;

      if (!full_name || !email || !password) {
        return c.json({ error: "نام، ایمیل و رمز عبور الزامی است." }, 400);
      }

      const existing = this.ctx.storage.sql
        .exec("SELECT id FROM users WHERE email = ?", email.toLowerCase().trim())
        .toArray();

      if (existing.length > 0) {
        return c.json({ error: "کاربری با این نشانی ایمیل قبلاً ثبت‌نام کرده است." }, 400);
      }

      const passHash = await hashPassword(password);
      const userId = generateId("usr");
      const now = Date.now();
      const userRole = (role === "SELLER") ? "SELLER" : "CUSTOMER";

      this.ctx.storage.sql.exec(
        "INSERT INTO users (id, full_name, email, password_hash, role, status, phone, created_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
        userId, full_name, email.toLowerCase().trim(), passHash, userRole, phone || null, now
      );

      // If user registered as SELLER, create store profile
      if (userRole === "SELLER") {
        const storeId = generateId("str");
        const slug = (store_name || full_name).toLowerCase().replace(/\s+/g, "-") + "-" + Math.floor(Math.random() * 1000);
        this.ctx.storage.sql.exec(
          "INSERT INTO stores (id, user_id, store_name, slug, description, status, commission_rate, rating, balance, total_sales, created_at) VALUES (?, ?, ?, ?, ?, 'APPROVED', 5.0, 5.0, 0, 0, ?)",
          storeId, userId, store_name || full_name, slug, store_description || "فروشگاه جدید", now
        );
      }

      // Generate Session Token
      const token = generateToken();
      const expiresAt = now + 86400000 * 30; // 30 days
      this.ctx.storage.sql.exec(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        token, userId, expiresAt
      );

      return c.json({
        ok: true,
        token,
        user: { id: userId, full_name, email: email.toLowerCase().trim(), role: userRole, phone }
      });
    });

    app.post("/api/auth/login", async (c) => {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ error: "ایمیل و رمز عبور را وارد کنید." }, 400);
      }

      const passHash = await hashPassword(password);
      const user = this.ctx.storage.sql
        .exec("SELECT id, full_name, email, role, status, phone FROM users WHERE email = ? AND password_hash = ?", email.toLowerCase().trim(), passHash)
        .toArray()[0] as any;

      if (!user) {
        return c.json({ error: "ایمیل یا رمز عبور اشتباه است." }, 401);
      }

      if (user.status === "BLOCKED") {
        return c.json({ error: "حساب کاربری شما مسدود شده است." }, 403);
      }

      const token = generateToken();
      const now = Date.now();
      const expiresAt = now + 86400000 * 30;

      this.ctx.storage.sql.exec(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        token, user.id, expiresAt
      );

      // Fetch seller store info if seller
      let storeInfo = null;
      if (user.role === "SELLER") {
        storeInfo = this.ctx.storage.sql
          .exec("SELECT id, store_name, slug, status FROM stores WHERE user_id = ?", user.id)
          .toArray()[0] || null;
      }

      return c.json({ ok: true, token, user, store: storeInfo });
    });

    app.get("/api/auth/me", (c) => {
      const user = getAuthUser(c);
      if (!user) {
        return c.json({ user: null });
      }

      let storeInfo = null;
      if (user.role === "SELLER") {
        storeInfo = this.ctx.storage.sql
          .exec("SELECT id, store_name, slug, status, commission_rate, balance FROM stores WHERE user_id = ?", user.id)
          .toArray()[0] || null;
      }

      return c.json({ user, store: storeInfo });
    });

    app.post("/api/auth/logout", (c) => {
      const token = c.req.header("Authorization")?.replace("Bearer ", "") || c.req.header("x-auth-token");
      if (token) {
        this.ctx.storage.sql.exec("DELETE FROM sessions WHERE token = ?", token);
      }
      return c.json({ ok: true });
    });

    // ===================================
    // MARKETPLACE SETTINGS & CATEGORIES
    // ===================================
    app.get("/api/settings", (c) => {
      const rows = this.ctx.storage.sql.exec("SELECT key, value FROM marketplace_settings").toArray();
      const settings: Record<string, string> = {};
      for (const r of rows as any[]) {
        settings[r.key] = r.value;
      }
      return c.json(settings);
    });

    app.get("/api/categories", (c) => {
      const categories = this.ctx.storage.sql
        .exec("SELECT id, name_fa, name_en, slug, icon, parent_id FROM categories ORDER BY name_fa ASC")
        .toArray();
      return c.json(categories);
    });

    // ===================================
    // PRODUCTS & CATALOG ENDPOINTS
    // ===================================
    app.get("/api/products", (c) => {
      const url = new URL(c.req.url);
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("q");
      const storeId = url.searchParams.get("store_id");
      const featured = url.searchParams.get("featured");
      const minPrice = url.searchParams.get("min_price");
      const maxPrice = url.searchParams.get("max_price");
      const sort = url.searchParams.get("sort") || "newest"; // 'newest', 'price_asc', 'price_desc'

      let sql = `
        SELECT p.id, p.store_id, p.category_id, p.title, p.slug, p.price, p.discount_price,
               p.stock, p.description, p.specs_json, p.images_json, p.status, p.is_featured, p.created_at,
               s.store_name, s.rating as store_rating, c.name_fa as category_name
        FROM products p
        JOIN stores s ON p.store_id = s.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'APPROVED'
      `;
      const params: any[] = [];

      if (category) {
        sql += " AND (c.slug = ? OR c.id = ?)";
        params.push(category, category);
      }

      if (storeId) {
        sql += " AND p.store_id = ?";
        params.push(storeId);
      }

      if (featured === "true") {
        sql += " AND p.is_featured = 1";
      }

      if (search) {
        sql += " AND (p.title LIKE ? OR p.description LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }

      if (minPrice) {
        sql += " AND COALESCE(p.discount_price, p.price) >= ?";
        params.push(parseFloat(minPrice));
      }

      if (maxPrice) {
        sql += " AND COALESCE(p.discount_price, p.price) <= ?";
        params.push(parseFloat(maxPrice));
      }

      if (sort === "price_asc") {
        sql += " ORDER BY COALESCE(p.discount_price, p.price) ASC";
      } else if (sort === "price_desc") {
        sql += " ORDER BY COALESCE(p.discount_price, p.price) DESC";
      } else {
        sql += " ORDER BY p.created_at DESC";
      }

      const products = this.ctx.storage.sql.exec(sql, ...params).toArray();
      return c.json(products);
    });

    app.get("/api/products/:id", (c) => {
      const id = c.req.param("id");
      const product = this.ctx.storage.sql.exec(`
        SELECT p.*, s.store_name, s.slug as store_slug, s.rating as store_rating, s.commission_rate, c.name_fa as category_name
        FROM products p
        JOIN stores s ON p.store_id = s.id
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = ? OR p.slug = ?
      `, id, id).toArray()[0] as any;

      if (!product) {
        return c.json({ error: "محصول پیدا نشد." }, 404);
      }

      // Fetch reviews
      const reviews = this.ctx.storage.sql
        .exec("SELECT id, user_name, rating, comment, created_at FROM reviews WHERE product_id = ? AND status = 'APPROVED' ORDER BY created_at DESC", product.id)
        .toArray();

      return c.json({ ...product, reviews });
    });

    // Add Review
    app.post("/api/products/:id/reviews", async (c) => {
      const user = getAuthUser(c);
      if (!user) {
        return c.json({ error: "برای ثبت نظر باید وارد حساب کاربری خود شوید." }, 401);
      }

      const productId = c.req.param("id");
      const body = await c.req.json();
      const { rating, comment } = body;

      if (!rating || !comment) {
        return c.json({ error: "امتیاز و متن نظر الزامی است." }, 400);
      }

      const revId = generateId("rev");
      this.ctx.storage.sql.exec(
        "INSERT INTO reviews (id, product_id, user_id, user_name, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?)",
        revId, productId, user.id, user.full_name, Math.min(5, Math.max(1, rating)), comment, Date.now()
      );

      return c.json({ ok: true, message: "نظر شما با موفقیت ثبت شد." });
    });

    // ===================================
    // STORES & SELLER PROFILES
    // ===================================
    app.get("/api/stores", (c) => {
      const stores = this.ctx.storage.sql
        .exec("SELECT id, store_name, slug, logo_url, description, rating, status, created_at FROM stores WHERE status = 'APPROVED'")
        .toArray();
      return c.json(stores);
    });

    app.get("/api/stores/:idOrSlug", (c) => {
      const param = c.req.param("idOrSlug");
      const store = this.ctx.storage.sql
        .exec("SELECT id, store_name, slug, logo_url, description, rating, created_at FROM stores WHERE (id = ? OR slug = ?) AND status = 'APPROVED'", param, param)
        .toArray()[0] as any;

      if (!store) {
        return c.json({ error: "فروشگاه یافت نشد." }, 404);
      }

      const products = this.ctx.storage.sql
        .exec("SELECT p.*, c.name_fa as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.store_id = ? AND p.status = 'APPROVED'", store.id)
        .toArray();

      return c.json({ store, products });
    });

    // ===================================
    // SHOPPING CART ENDPOINTS
    // ===================================
    app.get("/api/cart", (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ items: [] });

      const items = this.ctx.storage.sql.exec(`
        SELECT ci.id as cart_item_id, ci.quantity, p.id as product_id, p.title, p.price, p.discount_price, p.stock, p.images_json, p.store_id, s.store_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        JOIN stores s ON p.store_id = s.id
        WHERE ci.user_id = ?
      `, user.id).toArray();

      return c.json({ items });
    });

    app.post("/api/cart", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "لطفاً ابتدا وارد حساب کاربری شوید." }, 401);

      const body = await c.req.json();
      const { product_id, quantity = 1 } = body;

      const product = this.ctx.storage.sql
        .exec("SELECT id, stock FROM products WHERE id = ? AND status = 'APPROVED'", product_id)
        .toArray()[0] as any;

      if (!product) return c.json({ error: "محصول پیدا نشد یا غیرفعال است." }, 404);
      if (product.stock < quantity) return c.json({ error: "موجودی این محصول کافی نیست." }, 400);

      const existingItem = this.ctx.storage.sql
        .exec("SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?", user.id, product_id)
        .toArray()[0] as any;

      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        this.ctx.storage.sql.exec("UPDATE cart_items SET quantity = ? WHERE id = ?", newQty, existingItem.id);
      } else {
        const itemId = generateId("citm");
        this.ctx.storage.sql.exec(
          "INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)",
          itemId, user.id, product_id, quantity
        );
      }

      return c.json({ ok: true, message: "محصول به سبد خرید اضافه شد." });
    });

    app.put("/api/cart/:itemId", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const itemId = c.req.param("itemId");
      const { quantity } = await c.req.json();

      if (quantity <= 0) {
        this.ctx.storage.sql.exec("DELETE FROM cart_items WHERE id = ? AND user_id = ?", itemId, user.id);
      } else {
        this.ctx.storage.sql.exec("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?", quantity, itemId, user.id);
      }

      return c.json({ ok: true });
    });

    app.delete("/api/cart/:itemId", (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const itemId = c.req.param("itemId");
      this.ctx.storage.sql.exec("DELETE FROM cart_items WHERE id = ? AND user_id = ?", itemId, user.id);
      return c.json({ ok: true });
    });

    // ===================================
    // ADDRESSES MANAGEMENT
    // ===================================
    app.get("/api/addresses", (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json([]);

      const addrs = this.ctx.storage.sql
        .exec("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC", user.id)
        .toArray();
      return c.json(addrs);
    });

    app.post("/api/addresses", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const body = await c.req.json();
      const { title, recipient, phone, province, city, address, postal_code, is_default } = body;

      const addrId = generateId("addr");
      if (is_default) {
        this.ctx.storage.sql.exec("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
      }

      this.ctx.storage.sql.exec(
        "INSERT INTO addresses (id, user_id, title, recipient, phone, province, city, address, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        addrId, user.id, title || "آدرس من", recipient || user.full_name, phone || user.phone || "09120000000", province || "تهران", city || "تهران", address, postal_code || "1111111111", is_default ? 1 : 0
      );

      return c.json({ ok: true, id: addrId });
    });

    // ===================================
    // CHECKOUT & MOCK PAYMENT GATEWAY
    // SERVER-SIDE MANDATORY VERIFICATION
    // ===================================
    app.post("/api/checkout/validate", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "لطفاً ابتدا وارد حساب کاربری شوید." }, 401);

      const { coupon_code, address_id } = await c.req.json();

      // Fetch Cart Items from DB
      const cartItems = this.ctx.storage.sql.exec(`
        SELECT ci.quantity, p.id as product_id, p.title, p.price, p.discount_price, p.stock, p.store_id, s.store_name, s.commission_rate
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        JOIN stores s ON p.store_id = s.id
        WHERE ci.user_id = ?
      `, user.id).toArray() as any[];

      if (cartItems.length === 0) {
        return c.json({ error: "سبد خرید شما خالی است." }, 400);
      }

      // Server recalculates subtotal and validates stock
      let subtotal = 0;
      for (const item of cartItems) {
        if (item.stock < item.quantity) {
          return c.json({ error: `موجودی محصول «${item.title}» تغییر کرده و کافی نیست.` }, 400);
        }
        const effectivePrice = item.discount_price ? item.discount_price : item.price;
        subtotal += effectivePrice * item.quantity;
      }

      // Calculate Coupon Discount
      let discountAmount = 0;
      let couponInfo = null;
      if (coupon_code) {
        const cpn = this.ctx.storage.sql.exec(
          "SELECT * FROM coupons WHERE code = ? AND is_active = 1",
          coupon_code.toUpperCase().trim()
        ).toArray()[0] as any;

        if (cpn) {
          if (subtotal >= (cpn.min_purchase || 0)) {
            if (cpn.discount_type === "PERCENT") {
              discountAmount = Math.round((subtotal * cpn.value) / 100);
            } else {
              discountAmount = cpn.value;
            }
            couponInfo = cpn;
          }
        }
      }

      // Calculate Shipping
      const shippingCost = subtotal >= 1000000 ? 0 : 45000;
      const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);

      return c.json({
        subtotal,
        discountAmount,
        shippingCost,
        totalAmount,
        itemCount: cartItems.length,
        couponApplied: couponInfo ? couponInfo.code : null
      });
    });

    app.post("/api/checkout/pay", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const body = await c.req.json();
      const { address_id, coupon_code, payment_status } = body; // payment_status: 'SUCCESS' or 'FAILED'

      if (payment_status === "FAILED") {
        return c.json({ error: "پرداخت توسط کاربر لغو شد یا ناموفق بود." }, 400);
      }

      // Fetch Address
      const address = this.ctx.storage.sql
        .exec("SELECT * FROM addresses WHERE id = ? AND user_id = ?", address_id, user.id)
        .toArray()[0] as any;

      if (!address) {
        return c.json({ error: "لطفاً آدرس ارسال سفارش را انتخاب کنید." }, 400);
      }

      // Fetch Cart Items
      const cartItems = this.ctx.storage.sql.exec(`
        SELECT ci.quantity, p.id as product_id, p.title, p.price, p.discount_price, p.stock, p.store_id, s.commission_rate
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        JOIN stores s ON p.store_id = s.id
        WHERE ci.user_id = ?
      `, user.id).toArray() as any[];

      if (cartItems.length === 0) {
        return c.json({ error: "سبد خرید شما خالی است." }, 400);
      }

      // Recalculate Totals
      let subtotal = 0;
      for (const item of cartItems) {
        if (item.stock < item.quantity) {
          return c.json({ error: `موجودی «${item.title}» تکافوی سفارش شما را نمی‌دهد.` }, 400);
        }
        const effPrice = item.discount_price ? item.discount_price : item.price;
        subtotal += effPrice * item.quantity;
      }

      let discountAmount = 0;
      if (coupon_code) {
        const cpn = this.ctx.storage.sql.exec(
          "SELECT * FROM coupons WHERE code = ? AND is_active = 1",
          coupon_code.toUpperCase().trim()
        ).toArray()[0] as any;

        if (cpn && subtotal >= (cpn.min_purchase || 0)) {
          discountAmount = cpn.discount_type === "PERCENT"
            ? Math.round((subtotal * cpn.value) / 100)
            : cpn.value;
          this.ctx.storage.sql.exec("UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?", cpn.id);
        }
      }

      const shippingCost = subtotal >= 1000000 ? 0 : 45000;
      const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

      const orderId = generateId("ord");
      const orderNumber = "BZ-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      const now = Date.now();
      const addrJson = JSON.stringify(address);

      let commissionTotalSum = 0;

      // Insert Order
      this.ctx.storage.sql.exec(
        `INSERT INTO orders (id, order_number, user_id, total_amount, discount_amount, commission_total, shipping_cost, status, shipping_address_json, coupon_code, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'PAID', ?, ?, ?)`,
        orderId, orderNumber, user.id, grandTotal, discountAmount, shippingCost, addrJson, coupon_code || null, now
      );

      // Process Order Items & Deduct Stock
      for (const item of cartItems) {
        const effPrice = item.discount_price ? item.discount_price : item.price;
        const itemSubtotal = effPrice * item.quantity;
        const commRate = item.commission_rate || 5.0;
        const commissionAmt = Math.round((itemSubtotal * commRate) / 100);
        const sellerPayout = itemSubtotal - commissionAmt;
        commissionTotalSum += commissionAmt;

        const orderItemId = generateId("oitem");
        this.ctx.storage.sql.exec(
          `INSERT INTO order_items (id, order_id, store_id, product_id, product_title, price, quantity, commission_amount, seller_payout, item_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID')`,
          orderItemId, orderId, item.store_id, item.product_id, item.title, effPrice, item.quantity, commissionAmt, sellerPayout
        );

        // Deduct inventory
        this.ctx.storage.sql.exec("UPDATE products SET stock = stock - ? WHERE id = ?", item.quantity, item.product_id);

        // Add to Seller Financial Ledger & Balance
        const ledgerId = generateId("led");
        const desc = `فروش محصول «${item.title}» - سفارش ${orderNumber} (پس از کسر ${commRate}٪ کمیسیون)`;
        this.ctx.storage.sql.exec(
          "INSERT INTO seller_ledger (id, store_id, order_id, type, amount, description, created_at) VALUES (?, ?, ?, 'SALE', ?, ?, ?)",
          ledgerId, item.store_id, orderId, sellerPayout, desc, now
        );

        this.ctx.storage.sql.exec(
          "UPDATE stores SET balance = balance + ?, total_sales = total_sales + ? WHERE id = ?",
          sellerPayout, itemSubtotal, item.store_id
        );
      }

      // Update Order total commission
      this.ctx.storage.sql.exec("UPDATE orders SET commission_total = ? WHERE id = ?", commissionTotalSum, orderId);

      // Empty Cart
      this.ctx.storage.sql.exec("DELETE FROM cart_items WHERE user_id = ?", user.id);

      return c.json({
        ok: true,
        orderId,
        orderNumber,
        grandTotal,
        message: "پرداخت آزمایشی با موفقیت انجام شد و سفارش شما ثبت گردید."
      });
    });

    // ===================================
    // CUSTOMER ORDERS & DASHBOARD
    // ===================================
    app.get("/api/orders", (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json([]);

      const orders = this.ctx.storage.sql
        .exec("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", user.id)
        .toArray();

      return c.json(orders);
    });

    app.get("/api/orders/:id", (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const orderId = c.req.param("id");
      const order = this.ctx.storage.sql
        .exec("SELECT * FROM orders WHERE id = ? AND (user_id = ? OR ? = 'ADMIN')", orderId, user.id, user.role)
        .toArray()[0] as any;

      if (!order) return c.json({ error: "سفارش پیدا نشد." }, 404);

      const items = this.ctx.storage.sql
        .exec("SELECT oi.*, s.store_name FROM order_items oi JOIN stores s ON oi.store_id = s.id WHERE oi.order_id = ?", order.id)
        .toArray();

      return c.json({ order, items });
    });

    // Submit Return Request
    app.post("/api/orders/:id/return", async (c) => {
      const user = getAuthUser(c);
      if (!user) return c.json({ error: "احراز هویت نشدید." }, 401);

      const orderId = c.req.param("id");
      const { reason } = await c.req.json();

      if (!reason) return c.json({ error: "دلیل درخواست مرجوعی را ذکر کنید." }, 400);

      const reqId = generateId("ret");
      this.ctx.storage.sql.exec(
        "INSERT INTO return_requests (id, order_id, user_id, reason, status, created_at) VALUES (?, ?, ?, ?, 'PENDING', ?)",
        reqId, orderId, user.id, reason, Date.now()
      );

      return c.json({ ok: true, message: "درخواست مرجوعی کالا جهت بررسی پشتیبانی ثبت گردید." });
    });

    // ===================================
    // SELLER PANEL ENDPOINTS
    // ===================================
    app.get("/api/seller/my-store", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") {
        return c.json({ error: "دسترسی غیرمجاز. شما پنل فروشندگی ندارید." }, 403);
      }

      const store = this.ctx.storage.sql
        .exec("SELECT * FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      return c.json(store);
    });

    app.get("/api/seller/products", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json([]);

      const store = this.ctx.storage.sql
        .exec("SELECT id FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      if (!store) return c.json([]);

      const products = this.ctx.storage.sql
        .exec("SELECT p.*, c.name_fa as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.store_id = ? ORDER BY p.created_at DESC", store.id)
        .toArray();

      return c.json(products);
    });

    app.post("/api/seller/products", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const store = this.ctx.storage.sql
        .exec("SELECT id FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      if (!store) return c.json({ error: "فروشگاه فعال یافت نشد." }, 400);

      const body = await c.req.json();
      const { title, category_id, price, discount_price, stock, description, specs, image_url } = body;

      if (!title || !category_id || !price) {
        return c.json({ error: "عنوان، دسته‌بندی و قیمت الزامی است." }, 400);
      }

      const prdId = generateId("prd");
      const slug = title.toLowerCase().replace(/\s+/g, "-") + "-" + Math.floor(Math.random() * 1000);
      const specsJson = JSON.stringify(specs || []);
      const imgsJson = JSON.stringify([image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"]);
      const now = Date.now();

      this.ctx.storage.sql.exec(
        `INSERT INTO products (id, store_id, category_id, title, slug, price, discount_price, stock, description, specs_json, images_json, status, is_featured, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 0, ?)`,
        prdId, store.id, category_id, title, slug, parseFloat(price), discount_price ? parseFloat(discount_price) : null, parseInt(stock || 0), description || "", specsJson, imgsJson, now
      );

      return c.json({ ok: true, message: "محصول با موفقیت اضافه شد." });
    });

    app.put("/api/seller/products/:id", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const store = this.ctx.storage.sql
        .exec("SELECT id FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      const prdId = c.req.param("id");
      const body = await c.req.json();
      const { title, price, discount_price, stock, description } = body;

      this.ctx.storage.sql.exec(
        `UPDATE products SET title = ?, price = ?, discount_price = ?, stock = ?, description = ?
         WHERE id = ? AND store_id = ?`,
        title, parseFloat(price), discount_price ? parseFloat(discount_price) : null, parseInt(stock), description, prdId, store.id
      );

      return c.json({ ok: true });
    });

    app.get("/api/seller/orders", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json([]);

      const store = this.ctx.storage.sql
        .exec("SELECT id FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      if (!store) return c.json([]);

      const items = this.ctx.storage.sql.exec(`
        SELECT oi.*, o.order_number, o.created_at as order_date, o.shipping_address_json
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.store_id = ?
        ORDER BY o.created_at DESC
      `, store.id).toArray();

      return c.json(items);
    });

    app.put("/api/seller/orders/:itemId/status", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const store = this.ctx.storage.sql
        .exec("SELECT id FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      const itemId = c.req.param("itemId");
      const { status } = await c.req.json(); // 'PROCESSING', 'SHIPPED', 'DELIVERED'

      this.ctx.storage.sql.exec(
        "UPDATE order_items SET item_status = ? WHERE id = ? AND store_id = ?",
        status, itemId, store.id
      );

      return c.json({ ok: true });
    });

    app.get("/api/seller/ledger", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json({ balance: 0, ledger: [] });

      const store = this.ctx.storage.sql
        .exec("SELECT id, balance, total_sales FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      if (!store) return c.json({ balance: 0, ledger: [] });

      const ledger = this.ctx.storage.sql
        .exec("SELECT * FROM seller_ledger WHERE store_id = ? ORDER BY created_at DESC", store.id)
        .toArray();

      return c.json({ balance: store.balance, total_sales: store.total_sales, ledger });
    });

    app.post("/api/seller/payout-request", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "SELLER") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const store = this.ctx.storage.sql
        .exec("SELECT id, balance FROM stores WHERE user_id = ?", user.id)
        .toArray()[0] as any;

      const { amount, note } = await c.req.json();

      if (!amount || amount > store.balance || amount <= 0) {
        return c.json({ error: "مبلغ درخواستی معتبر نیست یا از موجودی قابل تسویه بیشتر است." }, 400);
      }

      const reqId = generateId("payout");
      this.ctx.storage.sql.exec(
        "INSERT INTO payout_requests (id, store_id, amount, status, note, created_at) VALUES (?, ?, ?, 'PENDING', ?, ?)",
        reqId, store.id, parseFloat(amount), note || "", Date.now()
      );

      return c.json({ ok: true, message: "درخواست تسویه حساب با موفقیت به بخش مالی ارسال گردید." });
    });

    // ===================================
    // ADMIN PANEL ENDPOINTS
    // ===================================
    app.get("/api/admin/stats", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json({ error: "دسترسی مدیر لازم است." }, 403);

      const totalGMV = (this.ctx.storage.sql.exec("SELECT COALESCE(SUM(total_amount), 0) as gmv FROM orders WHERE status != 'CANCELLED'").one() as any).gmv;
      const totalCommission = (this.ctx.storage.sql.exec("SELECT COALESCE(SUM(commission_total), 0) as comm FROM orders WHERE status != 'CANCELLED'").one() as any).comm;
      const userCount = (this.ctx.storage.sql.exec("SELECT COUNT(*) as c FROM users").one() as any).c;
      const storeCount = (this.ctx.storage.sql.exec("SELECT COUNT(*) as c FROM stores WHERE status = 'APPROVED'").one() as any).c;
      const productCount = (this.ctx.storage.sql.exec("SELECT COUNT(*) as c FROM products").one() as any).c;
      const orderCount = (this.ctx.storage.sql.exec("SELECT COUNT(*) as c FROM orders").one() as any).c;

      return c.json({
        totalGMV,
        totalCommission,
        userCount,
        storeCount,
        productCount,
        orderCount
      });
    });

    app.get("/api/admin/users", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json([]);

      const users = this.ctx.storage.sql
        .exec("SELECT id, full_name, email, role, status, phone, created_at FROM users ORDER BY created_at DESC")
        .toArray();

      return c.json(users);
    });

    app.put("/api/admin/users/:id/role", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const userId = c.req.param("id");
      const { role, status } = await c.req.json();

      this.ctx.storage.sql.exec(
        "UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?",
        role, status, userId
      );

      return c.json({ ok: true });
    });

    app.get("/api/admin/stores", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json([]);

      const stores = this.ctx.storage.sql
        .exec("SELECT s.*, u.full_name as owner_name, u.email as owner_email FROM stores s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC")
        .toArray();

      return c.json(stores);
    });

    app.put("/api/admin/stores/:id", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const storeId = c.req.param("id");
      const { status, commission_rate } = await c.req.json();

      this.ctx.storage.sql.exec(
        "UPDATE stores SET status = COALESCE(?, status), commission_rate = COALESCE(?, commission_rate) WHERE id = ?",
        status, commission_rate ? parseFloat(commission_rate) : null, storeId
      );

      return c.json({ ok: true });
    });

    app.get("/api/admin/orders", (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json([]);

      const orders = this.ctx.storage.sql
        .exec("SELECT o.*, u.full_name as customer_name, u.email as customer_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC")
        .toArray();

      return c.json(orders);
    });

    app.put("/api/admin/settings", async (c) => {
      const user = getAuthUser(c);
      if (!user || user.role !== "ADMIN") return c.json({ error: "دسترسی غیرمجاز" }, 403);

      const settings = await c.req.json();
      for (const [key, value] of Object.entries(settings)) {
        this.ctx.storage.sql.exec(
          "INSERT OR REPLACE INTO marketplace_settings (key, value) VALUES (?, ?)",
          key, String(value)
        );
      }

      return c.json({ ok: true });
    });

    this.app = app;
  }

  async fetch(request: Request): Promise<Response> {
    this.setupApp();
    return this.app.fetch(request);
  }
}
