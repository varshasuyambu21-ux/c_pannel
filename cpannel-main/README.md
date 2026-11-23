# Modern cPanel &reg; - Web Hosting Control Panel

A full-featured, responsive, and interactive **Web Hosting Control Panel (cPanel)** application built with modern web technologies, inspired by the cPanel **Jupiter** theme.

![cPanel Modern](public/images/logo.svg)

---

## 🚀 Features

### 1. **Live Server Resource & Statistics Gauges**
- **Real-Time Polling**: Automatic 3-second background polling via `/api/stats`.
- **Hardware Metrics**: Live CPU usage %, memory (RAM) allocation, disk quota, inode counter, and entry processes.
- **System Information**: Apache, PHP, MySQL version, server IP, hostname, and system uptime.

### 2. **Interactive File Manager**
- Browse `public_html` directory structure safely.
- Create new files and folders.
- Integrated **Code Editor** with syntax support, line wrapping, and saving directly to disk.
- Rename and delete files/directories.
- Upload simulation and sample seeded hosting files (`index.html`, `style.css`, `wp-config-sample.php`, `contact.php`, `.htaccess`).

### 3. **MySQL&reg; Database Management & phpMyAdmin**
- Create and remove databases and database users.
- Embedded **phpMyAdmin SQL Console** with query runner (`SELECT`, `SHOW TABLES`, `SHOW PROCESSLIST`).

### 4. **DNS Zone Editor**
- Manage DNS records (`A`, `AAAA`, `CNAME`, `MX`, `TXT`).
- Configure custom TTL and destination addresses.

### 5. **Email Accounts & Roundcube Webmail**
- Create virtual mail accounts (`user@example.com`) with password and custom storage quota.
- Embedded **Roundcube Webmail preview** with inbox viewer.

### 6. **Web Terminal Emulator**
- Integrated interactive in-browser CLI.
- Executes real and simulated server commands (`uptime`, `ls`, `pwd`, `whoami`, `cat`, `free -m`, `df -h`, `uname`, `help`).
- Command history navigation using Up/Down arrow keys.

### 7. **Softaculous 1-Click App Installer**
- Install popular web software with a single click:
  - **WordPress**
  - **Node.js App**
  - **Laravel**
  - **phpBB**
- Visual installation wizard with progress indicator and automatic root file generation.

### 8. **Cron Jobs Scheduler**
- Preset schedule selector (Every minute, hourly, daily, weekly, monthly).
- Custom cron expressions (`* * * * *`) with command execution.

### 9. **Security & AutoSSL**
- Let's Encrypt / AutoSSL certificate status validation.
- One-click AutoSSL check simulation.
- Full backup and home directory backup download wizard.

---

## 🛠️ Quick Start

### Prerequisites
- Node.js (v16.0 or higher)

### Run the Control Panel
Open your terminal in this directory and run:

```bash
node server.js
```

Or using npm:

```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:2083
```
*(If port `2083` is occupied or restricted, the server will automatically start on `http://localhost:3000`)*.

---

## 📁 Project Structure

```
new 1/
├── package.json          # Node.js project manifest
├── server.js             # HTTP server, system metrics, File API & Web Terminal
├── storage/
│   ├── cpanel_data.json  # Data store for databases, DNS, emails, and cron
│   └── public_html/      # Web hosting sandbox directory managed by File Manager
│       ├── index.html    # Default hosted site page
│       ├── style.css     # Sample stylesheet
│       ├── contact.php   # Sample contact endpoint
│       ├── .htaccess     # Apache configuration rules
│       └── wp-config-sample.php
├── public/
│   ├── index.html        # Main cPanel Jupiter UI
│   ├── css/
│   │   └── style.css     # Styling, theme variables & animations
│   └── js/
│       └── app.js        # Frontend controller & API integrations
└── README.md
```

---

## ⌨️ Keyboard Shortcuts
- Press `/` or `Ctrl + K`: Quickly focus the global tool search bar.
- Press `Escape`: Close any open modal dialog.
