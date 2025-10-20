# 🚀 Deployment Guide - Sleeper FF Helper

## Quick Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Why Vercel:**
- ✅ Free hosting
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ One-click deploy
- ✅ Auto-deploy on git push

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd /home/andre/NeverChopped
   vercel
   ```

3. **Follow prompts:**
   - Link to existing project? No
   - Project name? sleeper-ff-helper
   - Deploy? Yes

4. **Your app will be live at:** `https://sleeper-ff-helper.vercel.app`

5. **Set up automatic deployments:**
   ```bash
   # Initialize git if not already
   git init
   git add .
   git commit -m "Initial commit"
   
   # Push to GitHub
   # Create repo at github.com/new
   git remote add origin https://github.com/YOUR_USERNAME/sleeper-ff-helper.git
   git push -u origin main
   
   # Link Vercel to GitHub (through dashboard)
   # Future pushes auto-deploy!
   ```

---

### Option 2: Netlify

**Why Netlify:**
- ✅ Free hosting
- ✅ Simple drag-and-drop
- ✅ Great for static sites
- ✅ Easy custom domains

**Steps:**

1. **Build your app**
   ```bash
   npm run build
   ```

2. **Deploy via CLI**
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```

   OR

3. **Deploy via drag-and-drop**
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag your `dist/` folder
   - Done! Instant URL

---

### Option 3: GitHub Pages

**Why GitHub Pages:**
- ✅ Completely free
- ✅ Integrated with GitHub
- ✅ Good for open source

**Steps:**

1. **Update `vite.config.ts`**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: '/sleeper-ff-helper/', // Your repo name
     // ... rest of config
   })
   ```

2. **Install gh-pages**
   ```bash
   npm install -D gh-pages
   ```

3. **Add deploy script to `package.json`**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable in GitHub settings**
   - Go to repo settings → Pages
   - Source: gh-pages branch
   - Your site: `https://USERNAME.github.io/sleeper-ff-helper/`

---

### Option 4: Self-Host (VPS/Cloud)

**For advanced users with their own server:**

1. **Build production files**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to server**

3. **Serve with nginx/apache**
   ```nginx
   # nginx config
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

---

## 🔒 Important: Secure Your Config

**⚠️ WARNING:** Your `src/config.ts` contains your Sleeper user ID and league ID. These aren't super sensitive, but best practices:

### Option A: Environment Variables (Production)

1. **Create `.env` file** (local only, not committed)
   ```env
   VITE_USER_ID=your_user_id
   VITE_LEAGUE_ID=your_league_id
   VITE_USERNAME=your_username
   VITE_TEAM_NAME=your_team_name
   ```

2. **Update `config.ts`**
   ```typescript
   export const defaultConfig: LeagueConfig = {
     userId: import.meta.env.VITE_USER_ID || '1268309493943373825',
     leagueId: import.meta.env.VITE_LEAGUE_ID || '1265326608424648704',
     username: import.meta.env.VITE_USERNAME || 'CHRONiiC',
     teamName: import.meta.env.VITE_TEAM_NAME || 'Gods Gift to Girth'
   };
   ```

3. **Set environment variables in hosting platform**
   - Vercel: Dashboard → Settings → Environment Variables
   - Netlify: Site settings → Build & Deploy → Environment
   - GitHub Pages: Use GitHub Secrets

### Option B: Settings UI (Better UX)

Create a settings panel where users enter their league info:
- No hardcoded values
- Stored in localStorage only
- More flexible for others to use your code

---

## 📱 Mobile App Options

Want a native mobile app feel?

### Progressive Web App (PWA)

1. **Install PWA plugin**
   ```bash
   npm install -D vite-plugin-pwa
   ```

2. **Update `vite.config.ts`**
   ```typescript
   import { VitePWA } from 'vite-plugin-pwa'
   
   export default defineConfig({
     plugins: [
       react(),
       VitePWA({
         registerType: 'autoUpdate',
         manifest: {
           name: 'Sleeper FF Helper',
           short_name: 'FF Helper',
           description: 'Advanced Fantasy Football Analytics',
           theme_color: '#7c3aed',
           icons: [
             {
               src: 'icon-192.png',
               sizes: '192x192',
               type: 'image/png'
             }
           ]
         }
       })
     ]
   })
   ```

3. **Benefits:**
   - Install to home screen
   - Works offline (with caching)
   - Native app feel

---

## 🎯 Post-Deployment Checklist

After deploying, verify:

- [ ] App loads correctly
- [ ] All tabs functional
- [ ] Data fetches from Sleeper API
- [ ] Refresh button works
- [ ] Responsive on mobile
- [ ] HTTPS enabled
- [ ] Custom domain (optional)
- [ ] Analytics setup (optional)

---

## 🔧 Maintenance

### Updating Your Deployed App

**With Vercel/Netlify (auto-deploy):**
```bash
git add .
git commit -m "Update features"
git push
# Auto-deploys!
```

**With GitHub Pages:**
```bash
npm run deploy
```

**Manual hosting:**
```bash
npm run build
# Upload new dist/ files
```

---

## 📊 Optional: Add Analytics

Track usage of your app:

### Google Analytics

1. **Get tracking ID** from analytics.google.com

2. **Add to `index.html`**
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

### Plausible Analytics (Privacy-friendly)

1. **Sign up** at plausible.io

2. **Add script** to `index.html`
   ```html
   <script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
   ```

---

## 🌐 Custom Domain

Make it yours: `ff.yourdomain.com`

**Vercel:**
1. Dashboard → Settings → Domains
2. Add custom domain
3. Update DNS records

**Netlify:**
1. Site settings → Domain management
2. Add custom domain
3. Netlify DNS or external DNS

**Cost:** $10-15/year for domain

---

## 💡 Pro Tips

1. **Use a staging environment**
   - Deploy to `staging-sleeper-ff.vercel.app`
   - Test before promoting to production

2. **Set up monitoring**
   - UptimeRobot (free) for downtime alerts
   - Sentry for error tracking

3. **Add a changelog**
   - Document updates for your league mates
   - Show what's new

4. **Collect feedback**
   - Add a feedback form
   - GitHub issues for bug reports

---

## 🆘 Troubleshooting Deployment

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### API calls fail in production
- Check CORS settings
- Verify Sleeper API is accessible
- Check browser console for errors

### App shows blank page
- Check browser console
- Verify `base` path in vite.config.ts
- Check network tab for 404s

---

**Need help?** Check deployment platform docs:
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [GitHub Pages Docs](https://docs.github.com/pages)
