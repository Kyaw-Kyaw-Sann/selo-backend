# Local sample catalog

Project root မှာ run ပါ။ `.env` က local development database ကို ညွှန်းထားရပါမယ်။

```powershell
node --import tsx database/seeds/002_sample_catalog.ts
```

Sample data: users 6၊ categories 8၊ shared units 6၊ products 8 နဲ့ product units 18။ ရှိပြီးသား username၊ category name/parent၊ unit code၊ product SKU တွေကို skip လုပ်ပြီး overwrite မလုပ်ပါဘူး။ Seed တစ်ခုလုံး transaction တစ်ခုထဲ run ပါတယ်။

Demo login password: `SeloDemo123!`။ Database ထဲမှာ bcrypt hashes ပဲ သိမ်းပါတယ်။ ဒီ credentials တွေက local demo အတွက်ပဲ ဖြစ်ပါတယ်။

| Username | Role | Active |
| --- | --- | --- |
| `demo.owner` | OWNER | Yes |
| `demo.aung` | CASHIER | Yes |
| `demo.hnin` | CASHIER | Yes |
| `demo.koko` | CASHIER | Yes |
| `demo.may` | CASHIER | Yes |
| `demo.zaw` | CASHIER | No |

Coffee/tea၊ water/soft drinks၊ biscuits၊ rice/sugar နဲ့ laundry soap products ပါပါတယ်။ Prices တွေက MMK sample values ဖြစ်ပါတယ်။ Stock နဲ့ latest purchase cost က `0` ပါ။ Stock opening/purchase movements မဖန်တီးထားပါဘူး။

Owner/Cashier login နဲ့ စမ်းရန်:

```text
GET /api/products?search=DEMO-&limit=10
GET /api/products?search=DEMO-COF-001-PACK
GET /api/categories
GET /api/units
```

`demo.owner` နဲ့ `/api/users` ကို စမ်းနိုင်ပြီး `demo.zaw` login က disabled-user test အတွက် `401` ပြန်ရပါမယ်။
