# Selo POS Backend

ဆိုင်တစ်ဆိုင်အတွက် retail POS backend learning project ဖြစ်ပြီး TypeScript၊ Express နဲ့ MySQL ကို အသုံးပြုဖို့ ရည်ရွယ်ထားပါတယ်။ Currency က MMK၊ staff roles က `OWNER` နဲ့ `CASHIER` ဖြစ်ပါတယ်။

## လက်ရှိအခြေအနေ

**Phase 1 — Foundation** ကို တည်ဆောက်နေဆဲ ဖြစ်ပါတယ်။

- Express server နဲ့ `GET /health`
- Zod ဖြင့် environment configuration validation
- JSON request parsing
- `AppError` နဲ့ common error middleware
- Unknown routes အတွက် JSON `404`၊ malformed JSON အတွက် `400`
- TypeScript development၊ typecheck နဲ့ build scripts

MySQL pool၊ database tables၊ authentication နဲ့ business APIs မရေးရသေးပါဘူး။ Folder နဲ့ placeholder files ရှိခြင်းကို feature ပြီးစီးခြင်းအဖြစ် မသတ်မှတ်ထားပါဘူး။

## Technology

- TypeScript၊ Node.js၊ Express
- MySQL 8.x၊ `mysql2/promise`၊ raw parameterized SQL — ဆက်လက်တည်ဆောက်ရန်
- Zod၊ dotenv၊ tsx
- bcrypt၊ JWT HttpOnly cookie authentication — ဆက်လက်တည်ဆောက်ရန်
- Bruno နဲ့ MySQL Workbench — API/data verification အတွက်

## Local setup

Node.js နဲ့ npm လိုအပ်ပါတယ်။ လက်ရှိ setup ကို Node.js `22.15.0` နဲ့ အသုံးပြုထားပါတယ်။

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`.env` ရှိပြီးသားဆို copy လုပ်တဲ့အဆင့်ကို ကျော်ပါ။ Local secrets တွေကို Git ထဲ မတင်ပါနဲ့။

| Variable | Default | အသုံးပြုပုံ |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production` |
| `PORT` | `3000` | HTTP port၊ integer `1–65535` |

Configuration မှားရင် startup မှာ validation error နဲ့ ရပ်ပါမယ်။

## Commands

| Command | အသုံးပြုပုံ |
| --- | --- |
| `npm run dev` | Changes ရှိတိုင်း server restart လုပ်ရန် |
| `npm run typecheck` | Output files မထုတ်ဘဲ TypeScript စစ်ရန် |
| `npm run build` | `src/` ကို `dist/` ထဲ JavaScript အဖြစ် build လုပ်ရန် |
| `npm start` | Build ထုတ်ပြီးသား `dist/server.js` ကို run ရန် |

## Foundation smoke checks

Server run ထားပြီး Bruno မှာ အောက်ပါ requests တွေ ပို့စစ်နိုင်ပါတယ်။ အောက်ကစာရင်းက စစ်ဆေးရန် expected results ဖြစ်ပြီး tests passed မှတ်တမ်း မဟုတ်ပါဘူး။

| Request | Expected result |
| --- | --- |
| `GET http://localhost:3000/health` | `200` နဲ့ အောက်ပါ JSON |
| `GET http://localhost:3000/api/v1/unknown` | `404`, code `NOT_FOUND` |
| `POST http://localhost:3000/health`၊ `Content-Type: application/json`၊ body `{"test":` | `400`, code `INVALID_JSON` |

လက်ရှိ health response:

```json
{
  "success": true,
  "message": "Server is health"
}
```

`/health` က HTTP server အလုပ်လုပ်မှုကိုသာ စစ်ပြီး database connectivity ကို မစစ်သေးပါဘူး။ Business API base URL က `/api/v1` ဖြစ်ဖို့ သတ်မှတ်ထားပေမဲ့ business routes မရှိသေးပါဘူး။

## Architecture နဲ့ V1 scope

Request flow: `Route → Middleware → Controller → Service → Repository → MySQL`။ Business rules နဲ့ transactions ကို Service မှာ၊ parameterized SQL ကို Repository မှာ ထားပါမယ်။

V1 design က **16 tables / 7 domains** နဲ့ **53 endpoints / 14 groups** ဖြစ်ပါတယ်။ Catalog၊ base-unit inventory၊ suppliers/purchasing၊ Cash/manual QR sales၊ customers/loyalty၊ partial returns/refunds၊ staff၊ reports နဲ့ dashboard တို့ ပါဝင်ဖို့ ရည်ရွယ်ထားပါတယ်။

Stock နဲ့ points ကို negative မဖြစ်စေဖို့၊ historical snapshots ထိန်းဖို့၊ purchase/sale/return workflows တွေကို transactions၊ locking နဲ့ idempotency သုံးဖို့ သတ်မှတ်ထားပါတယ်။ Multi-branch၊ cashier shifts၊ Cash+QR split၊ payment gateway နဲ့ full accounting မပါဝင်ပါဘူး။

## Development roadmap

| Phase | အပိုင်း | အခြေအနေ |
| --- | --- | --- |
| 1 | Foundation | ဆောင်ရွက်နေဆဲ |
| 2 | Database | မစရသေး |
| 3 | Auth & Staff | မစရသေး |
| 4 | Catalog | မစရသေး |
| 5 | Inventory & Suppliers | မစရသေး |
| 6 | Purchasing | မစရသေး |
| 7 | Walk-in Sales & Payments | မစရသေး |
| 8 | Customers & Loyalty | မစရသေး |
| 9 | Returns & Refunds | မစရသေး |
| 10 | Reports & Dashboard | မစရသေး |
| 11 | Final Backend Verification | မစရသေး |

Phase တစ်ခုစီမှာ implementation၊ Bruno API tests၊ သက်ဆိုင်ရာ Workbench data checks နဲ့ review ပြီး developer အတည်ပြုမှ နောက် phase ကို ဆက်ပါမယ်။ Backend ပြီးစီးပြီးမှ frontend ကို ဆက်လက်ဆွေးနွေးပါမယ်။
