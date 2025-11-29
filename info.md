# info.md  
Updated Full System Specification – **PulsePay**

---

## 0. Platform / Tech Environment (IMPORTANT)

PulsePay will be built using the following tech stack:

### **Frontend (Main Platform)**
- **Next.js 14+ (App Router)**
- **TypeScript**
- **TailwindCSS**
- Optional UI: ShadCN

### **Backend**
- **Supabase (Backend-as-a-Service)**  
  - Supabase Auth  
  - Supabase Postgres Database  
  - Supabase Realtime (for live transfers)  
  - Supabase RLS (Row Level Security)  
  - Supabase RPC (Postgres Stored Procedures)

### **Deployment**
- **Vercel** for hosting Next.js frontend  
- **Supabase** for hosting backend  

### **Note**
- No Python backend  
- No Node/Express server  
- No Django / Flask  
- Only: **Next.js + Supabase**  
- Because this is a demo banking system and Supabase handles realtime + auth + DB + RPC in one platform.

---

## 1. Project Name  
**PulsePay** – A portfolio-grade demo banking app with fake money transfers and real-time balance updates.

---

## 2. Project Purpose  
Showcase full-stack ability using a realistic mini-banking simulation:
- Auth system  
- Account & balance management  
- Atomic internal money transfers  
- Real-time UI updates  
- Clean dashboard  
- Modern stack  
- Secure database rules  

No real payments.

---

## 3. Tech Stack Summary  
**Frontend:** Next.js + TypeScript + TailwindCSS  
**Backend:** Supabase (Auth, Postgres, Realtime, RPC, RLS)  
**Deployment:** Vercel + Supabase  

---

## 4. Core Features  
- Registration  
- Login / Logout  
- Auto account creation  
- Fake balance system  
- Money transfer between users  
- Atomic transfer through RPC  
- Realtime updates on receiver dashboard  
- Transaction history  

---

## 5. Database Schema  

### **profiles**
- id (uuid, FK → auth.users)  
- full_name (text)  
- account_number (text unique)  
- balance (numeric default 10000)  
- created_at  

### **transactions**
- id (uuid)  
- from_acc  
- to_acc  
- amount  
- type (DEBIT/CREDIT)  
- reference  
- created_at  

### Enum  
transaction_type = 'DEBIT' | 'CREDIT'

---

## 6. Stored Procedure: perform_transfer()  

A Postgres RPC function that must:

1. Identify sender via `auth.uid()`  
2. Validate receiver exists  
3. Check sufficient funds  
4. Prevent transfer to self  
5. Perform a **single DB transaction**:
   - Deduct from sender  
   - Add to receiver  
   - Insert DEBIT  
   - Insert CREDIT  
6. Throw errors for any invalid case  

Must use **SECURITY DEFINER**.

---

## 7. RLS Policies  
### profiles  
- User can read and update ONLY their own profile.

### transactions  
- User can read rows where they appear in `from_acc` OR `to_acc`.

---

## 8. Frontend Pages (Next.js App Router)

### /register  
- Signup form  
- Creates Supabase user  
- Inserts profile with account number  

### /login  
- Login form  
- Redirect to dashboard  

### /dashboard  
- Shows:
  - Balance  
  - Account number  
  - Transfer form  
  - Recent transactions  
  - Realtime listener  

Components needed:
- Navbar  
- BalanceCard  
- TransferForm  
- TransactionRow  

---

## 9. Realtime Logic  
Use Supabase `postgres_changes`:

- Subscribe to new transactions  
- Check if `to_acc` matches logged-in user  
- Update:
  - Balance  
  - Transaction list  

---

## 10. Error Handling  
Show errors for:  
- Wrong account  
- Insufficient balance  
- Invalid amount  
- Self-transfer  
- RPC failure  

---

## 11. Deployment Requirements  
- Supabase project setup  
- Run SQL schema  
- Add env vars for Next.js  
- Deploy Next.js to Vercel  
- Test realtime  
- Provide README

---

## 12. Testing Steps  
1. Register User A  
2. Register User B  
3. A → send money to B  
4. B sees realtime update  
5. Check transaction entries  
6. Try insufficient amount  
7. Try invalid account  
8. Try self-transfer  

---

## 13. Deliverables Codex Must Produce  

### **Database**
- Schema SQL  
- RLS rules  
- RPC function  

### **Frontend**
- Full Next.js structure  
- All pages  
- Components  
- Realtime logic  

### **Backend Integration**
- RPC calling  
- Profile fetch  
- Transaction fetch  

### **Deployment**
- .env file  
- Vercel instructions  
- Supabase SQL  

---

# End of info.md
