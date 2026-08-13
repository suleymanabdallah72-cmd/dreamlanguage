# AcademyPro — Production English Academy Management App

AcademyPro is a responsive, multi-user academy management system built for an English language centre.

It uses **Supabase** for:
- secure email/password authentication,
- PostgreSQL cloud database,
- Row Level Security (RLS),
- private document storage,
- managed database backups (depending on plan).

The frontend is static HTML/CSS/JavaScript, so it can be deployed free on **GitHub Pages**, Cloudflare Pages, Netlify or Vercel.

## Included

### User accounts and permissions
- Admin — full system
- Teacher — assigned classes, students, attendance, progress reports
- Reception — registration, schedules, attendance and billing
- Accountant — billing, payments, payroll and financial reports

Database access is also protected by Supabase Row Level Security; hiding a menu is not the security layer.

### Students
- Cloud student records
- Contact and guardian information
- Course and level
- Status
- Class packages and remaining credits
- Notes

### Scheduling
- Teacher assignment
- Date/time/duration
- Rooms or Zoom links
- Regular / trial / replacement / make-up classes
- Recurring weekly classes (4, 8 or 12 weeks)
- Teacher availability

### Attendance
- Present / late / absent / excused
- Completed-class tracking
- Deducts package credits on first Present/Late attendance mark

### Student progress
- Speaking, listening, reading and writing scores
- Teacher feedback
- Next goals
- Progress history

### Billing
- Tuition invoices
- Discounts and tax
- Payment recording
- Outstanding balances
- Overdue detection
- Downloadable invoice PDFs
- Downloadable receipt PDFs

### Payroll
- Monthly teacher payroll
- Completed teaching hours × hourly rate
- Payroll status
- Downloadable payslip PDFs

### WhatsApp reminders
- Builds class reminders for tomorrow
- Builds outstanding-payment reminders
- Opens `wa.me` with recipient and message pre-filled

**Important:** automatic sending through WhatsApp is intentionally not faked. Fully automated WhatsApp delivery requires the WhatsApp Business Platform or an approved provider. This version gives staff a safe one-click send workflow.

### Reports
- Enrollment by course
- Attendance rate
- Collection rate
- Teaching hours
- JSON export

---

# 1. Create your Supabase project

Create a new project at Supabase.

Once created, find:
- your Project URL
- your browser-safe publishable key / anon key

Do **not** put a `service_role` key in frontend code.

---

# 2. Create the database

Open:

**Supabase Dashboard → SQL Editor**

Open `supabase/schema.sql` from this project.

Copy the entire file into the SQL Editor and run it once.

It creates:
- profiles
- students
- class_packages
- teacher_availability
- classes
- attendance
- progress_reports
- invoices
- payments
- payroll
- reminders
- settings
- private Storage bucket
- RLS policies

---

# 3. Configure the app

Duplicate:

```text
config.example.js
```

Rename the copy to:

```text
config.js
```

Edit it:

```js
window.ACADEMY_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY"
};
```

The anon/publishable browser key is safe to expose **only when your RLS policies are correctly enabled**, which this project does in `schema.sql`.

Never use your Supabase `service_role` key in `config.js`.

---

# 4. Create the first Admin

In Supabase:

**Authentication → Users → Add user**

Create the owner's account.

Copy the user's UUID.

Then open SQL Editor and run:

```sql
insert into public.profiles
(id, full_name, email, role, hourly_rate)
values
(
  'PASTE-AUTH-USER-UUID-HERE',
  'Academy Owner',
  'owner@example.com',
  'admin',
  0
);
```

Now sign in to AcademyPro with that user's email/password.

---

# 5. Add Teachers / Reception / Accountant

For each staff member:

1. Create the login under **Supabase → Authentication → Users**.
2. Copy the Auth User UUID.
3. Sign into AcademyPro as Admin.
4. Open **Staff → Add staff profile**.
5. Paste the Auth UUID.
6. Choose:
   - `teacher`
   - `reception`
   - `accountant`
   - `admin`

For a teacher, set the hourly rate.

---

# 6. Run locally

Because the browser loads `config.js`, use a simple local web server instead of double-clicking the HTML file.

Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

# 7. Push to GitHub

Create a new GitHub repository, for example:

```text
academy-pro
```

From this project folder:

```bash
git init
git add .
git commit -m "Launch AcademyPro"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/academy-pro.git
git push -u origin main
```

---

# 8. Publish with GitHub Pages

In GitHub:

**Repository → Settings → Pages**

Choose:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Save.

Your site will normally appear at:

```text
https://YOUR-USERNAME.github.io/academy-pro/
```

---

# 9. Supabase Auth URL settings

Because password-reset emails redirect back to your app, add your deployed URL in:

**Supabase → Authentication → URL Configuration**

Set the Site URL to your GitHub Pages URL.

Also add it to allowed Redirect URLs.

For local development, also allow:

```text
http://localhost:8000
```

---

# 10. Backups

The app includes a manual **Export academy JSON** control for convenient business-level exports.

Your real database backup policy is managed in Supabase. Review the backup features available to your plan before relying on the system for business-critical records.

Keep at least:
- Supabase managed backups appropriate to your plan
- periodic JSON exports
- your SQL schema in GitHub

---

# 11. WhatsApp automation

The current app creates reminders and opens WhatsApp with the correct number and text prefilled.

To make reminders send automatically, a future production step is:

```text
AcademyPro
   ↓
Supabase Edge Function / scheduled job
   ↓
WhatsApp Business Platform or approved provider
   ↓
Student
```

Do not place WhatsApp API secrets in frontend JavaScript.

---

# 12. PDF documents

Invoice, receipt and payslip PDFs are generated in the browser using jsPDF.

Academy details in **Settings** automatically appear on the PDFs.

---

# 13. Recommended production hardening

Before using the system for a large academy:

- add MFA for Admin/Accountant users,
- enable the Supabase backup plan you require,
- restrict Supabase Auth signups so staff cannot self-register,
- review the RLS policies against your real organisation,
- add audit logging,
- set an academy privacy/data-retention policy,
- add proper invoice numbering rules required by your jurisdiction,
- add accounting/tax logic appropriate to the business,
- integrate an approved WhatsApp provider if automatic messaging is required.

---

## File structure

```text
academy-pro/
├── index.html
├── styles.css
├── app.js
├── config.example.js
├── config.js              # you create this
├── README.md
└── supabase/
    └── schema.sql
```

## Security note

Frontend role checks improve the interface, but **security is enforced in the database using Row Level Security policies**. Never remove RLS just to make a query work.

Never commit a Supabase `service_role` secret or WhatsApp API secret to GitHub.
