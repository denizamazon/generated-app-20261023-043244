# مستند جامع پایگاه داده و مدل‌های موجودیت (Database Schema - توسعه پرامپت شماره ۲)

پایگاه داده پروژه شاهکار بر پایه **SQLite / Cloudflare Durable Objects Storage** توسعه یافته و کاملاً آماده مهاجرت کنترل‌شده به **PostgreSQL** می‌باشد.

---

### ۱. جدول محصولات (`products`)
- `id`: شناسه یکتای محصول (`prd_...`)
- `store_id`: شناسه غرفه/فروشگاه عرضه‌کننده (`str_...`)
- `category_id`: شناسه دسته‌بندی اصلی
- `subcategory_id`: شناسه زیردسته
- `title`: عنوان کامل محصول (فارسی/انگلیسی)
- `slug`: شناسه یکتا جهت نمایش در آدرس وب (URL)
- `brand`: برند یا نام تولیدکننده
- `sku`: کد یکتای انبارداری (Stock Keeping Unit)
- `barcode`: کد بارکد بین‌المللی کالا
- `price`: قیمت پایه محصول (واحد: تومان IRT)
- `discount_price`: قیمت تخفیف‌دار (تومان IRT)
- `currency`: واحد پول (پیش‌فرض: `IRT`)
- `stock`: تعداد موجودی واقعی انبار
- `short_description`: خلاصه‌توضیحات کوتاه مارکتینگ
- `description`: توضیحات کامل فنی و کاربردی
- `specs_json`: جدول مشخصات فنی ساختاریافته (`[{name, value}]`)
- `images_json`: لیست لینک‌های تصویر محصول
- `image_alts_json`: متن‌های جایگزین تصاویر جهت دسترس‌پذیری و SEO
- `main_image_index`: اندیس تصویر اصلی کالا
- `weight_gram`: وزن کالا (گرم)
- `dimensions_cm`: ابعاد فیزیکی کالا (سانتی‌متر)
- `shipping_info`: شرایط و نحوه ارسال
- `variants_json`: تنوع‌های کالا (رنگ، سایز، گارانتی)
- `seo_title`: عنوان سئو
- `seo_description`: متاتوضیحات سئو
- `seo_keywords`: کلمات کلیدی سئو
- `status`: وضعیت انتشار (`APPROVED` | `PENDING_APPROVAL` | `DRAFT` | `REJECTED` | `INACTIVE` | `ARCHIVED`)
- `rejection_reason`: دلیل رد کالا توسط مدیر ارشد
- `is_featured`: پرچمدار / ویژه (۱ یا ۰)
- `data_source`: منبع ورود داده (`MANUAL` | `CSV_IMPORT` | `AI_GENERATED`)
- `version`: شماره نسخه ویرایش کالا
- `created_at`: مهر زمانی ایجاد
- `updated_at`: مهر زمانی آخرین ویرایش

---

### ۲. جدول تاریخچه تغییرات کالا (`product_history`)
- `id`: شناسه یکتا (`phist_...`)
- `product_id`: شناسه محصول
- `user_id`: شناسه کاربر ویرایش‌کننده
- `change_type`: نوع تغییر (`CREATE` | `UPDATE` | `STATUS_CHANGE` | `BULK_IMPORT` | `AI_ENRICH`)
- `old_data_json`: بک‌آپ اطلاعات قبلی کالا
- `new_data_json`: اطلاعات جدید کالا
- `created_at`: زمان ثبت تغییر

---

### ۳. جدول عملیات ورود گروهی (`bulk_import_jobs`)
- `id`: شناسه کار ورود گروهی (`job_...`)
- `store_id`: شناسه فروشگاه
- `file_name`: نام فایل یا منبع ورودی
- `total_rows`: کل سطور فایل
- `success_count`: تعداد موفق ثبت‌شده
- `error_count`: تعداد دارای خطا
- `review_needed_count`: تعداد نیازمند بررسی
- `report_json`: گزارش جزئیات خطاها و تکراری‌ها
- `status`: وضعیت پردازش (`COMPLETED` | `FAILED`)
- `created_at`: زمان اجرا

---

### ۴. جدول پیش‌نویس کالا و هوش مصنوعی (`product_drafts`)
- `id`: شناسه پیش‌نویس
- `product_id`: شناسه کالای مربوطه
- `store_id`: شناسه فروشگاه
- `ai_generated_json`: محتوای تولیدشده توسط دستیار AI
- `status`: وضعیت پیش‌نویس (`DRAFT` | `PENDING_REVIEW` | `APPROVED`)

---

### ۵. سایر جداول سیستم
- `users`: حساب‌های کاربران، خریداران، فروشندگان و مدیران
- `stores`: مشخصات غرفه‌ها، کمیسیون، موجودی تسویه و آمار فروش
- `categories`: دسته‌بندی‌های دو سطحی کالاها
- `cart_items`: سبد خرید خریداران
- `orders` & `order_items`: سفارشات ثبت‌شده و اقلام تفکیک‌شده
- `seller_ledger`: دفتر مالی شفـاف فروشندگان
- `coupons`: کدهای تخفیف درصدی و ثابتی
- `reviews`: نظرات و امتیازدهی خریداران
- `ai_agent_logs` & `audit_logs`: لاگ‌های ممیزی و نظارتی عامل‌های هوش مصنوعی
