# 🎬 IPTV Web Player

A professional, modern, and feature-rich **IPTV streaming player** built with React, TypeScript, and Vite. Watch live TV channels with favorites management, search capabilities, and offline support via PWA.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)

## ✨ Features

- 🎥 **HLS Streaming Support** - Professional video streaming with adaptive bitrate
- ⭐ **Favorites Management** - Save and quickly access your favorite channels
- 🔍 **Advanced Search** - Search channels by name or country
- 📺 **Smart Filtering** - Filter channels by category and country
- 🌙 **Dark Theme** - Beautiful glassmorphism UI with smooth animations
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile
- 🌐 **PWA Ready** - Install as standalone app with offline support
- 🚀 **Performance Optimized** - Virtual scrolling for smooth 2000+ channels
- ♿ **Accessible** - Keyboard navigation, ARIA labels, screen reader support
- 🔐 **Secure** - XSS protection, CSP security headers, input validation
- 🆓 **100% Free** - No paywall, no premium tier — monetisation is 100% ad-based (multi-advertiser)

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+ 
- npm 9.0+ or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/iptv-web-player.git
cd iptv-web-player

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start Vite dev server with HMR

# Building
npm run build           # TypeScript check + Vite build
npm run build:analyze   # Build with bundle analysis

# Code Quality
npm run lint            # Run ESLint with auto-fix
npm run lint:check      # Check ESLint without fixing
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests (vitest)
npm run test:ui         # Run tests with UI dashboard
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run Playwright E2E tests

# IPTV
npm run generate:iptv-playlist   # Generate M3U from playlist.json

# Preview
npm run preview         # Preview production build locally
```

## 🏗️ Project Structure

```
iptv-web-player/
├── src/
│   ├── components/          # React components
│   │   ├── Player.tsx      # Video player with HLS.js
│   │   ├── Sidebar.tsx     # Channel list, search, filters
│   │   ├── ErrorBoundary.tsx
│   │   ├── admin/          # Admin dashboard sub-components
│   │   │   ├── OnlineUsersPanel.tsx
│   │   │   ├── LiveDevicesPanel.tsx
│   │   │   ├── BarList.tsx
│   │   │   ├── AdHelpers.ts
│   │   │   ├── AdvertiserForm.tsx
│   │   │   └── CampaignForm.tsx
│   │   └── __tests__/      # Component tests
│   ├── pages/               # Route pages (AdminPage)
│   ├── hooks/               # Custom React hooks
│   │   ├── useFavorites.ts
│   │   ├── useAuth.ts
│   │   ├── useDeadChannels.ts
│   │   ├── useAdvertisers.ts
│   │   ├── useCampaigns.ts
│   │   └── __tests__/      # Hook tests
│   ├── stores/              # Zustand global stores
│   │   ├── authStore.ts
│   │   ├── favoritesStore.ts
│   │   ├── playerStore.ts
│   │   └── __tests__/
│   ├── lib/                 # External service clients
│   │   ├── sentry.ts       # Sentry monitoring
│   │   └── supabaseClient.ts
│   ├── utils/               # Utility functions
│   │   ├── validation.ts
│   │   ├── virtualScroll.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── __tests__/
│   ├── App.tsx              # Main player route
│   ├── App.css              # App styles
│   ├── main.tsx             # Entry point (router + Sentry + PWA)
│   └── index.css            # Global styles
├── public/                  # Static assets
│   ├── ads.json             # Ad campaign configuration
│   ├── ads/                 # Ad media files
│   └── playlist.json        # Default playlist (auto-generated)
├── .husky/                  # Git hooks (lint-staged)
├── .github/workflows/       # CI/CD (lint, test, build, deploy)
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── eslint.config.js
├── .prettierrc
├── vercel.json              # Deployment + security headers
└── package.json
```

## 🎮 Usage

### Loading Playlists

The app loads a default M3U8 playlist from `public/playlist.json`. To use your own:

1. **Option 1**: Place your `playlist.json` in the `public/` folder
2. **Option 2**: Update the fetch URL in `src/config.ts`:

```typescript
export const PLAYLIST_URL = 'https://your-server.com/playlist.json';
```

### Playlist Format

Expected JSON format:

```json
[
  {
    "name": "Channel Name",
    "country": "FR",
    "group": "France",
    "logo": "https://example.com/logo.png",
    "url": "https://example.com/stream.m3u8"
  }
]
```

### Génération d'une playlist M3U IPTV

Le projet peut générer un fichier M3U adapté aux lecteurs IPTV statiques sans écraser les fichiers existants.

```bash
npm run generate:iptv-playlist
```

Options utiles :

```bash
node scripts/generate-m3u-iptv.mjs \
  --input=public/playlist.json \
  --output=public/playlist.iptv.fr.m3u \
  --country=FR \
  --group=Francophone \
  --xmltv=./data/guide.xml \
  --public-url=https://your-domain.com
```

Le script :

- filtre les chaînes par `country` et/ou `group`
- enrichit `tvg-id` et `tvg-logo` à partir d'un guide XMLTV si fourni
- évite d'écraser un fichier existant en ajoutant un suffixe horodaté
- affiche le lien public si vous fournissez `--public-url`

Sur une hébergement statique (Vercel, Netlify, GitHub Pages), le fichier généré est accessible directement via l'URL du site + le chemin du fichier.

### Environment Variables

Create a `.env` file in the root:

```env
VITE_PLAYLIST_URL=https://your-server.com/playlist.json
VITE_ENABLE_ANALYTICS=true
VITE_API_TIMEOUT=10000
```

> **Modèle commercial** : l'application est **100% gratuite** pour les utilisateurs finaux.
> Pas d'essai, pas d'abonnement premium, pas de paywall.
> La monétisation repose entièrement sur la publicité in-player (pré-roll + bannières)
> ouverte à plusieurs annonceurs. Voir `public/ads.json` pour la configuration des campagnes.
>
> Les fichiers liés à l'ancien modèle premium ont été supprimés lors du nettoyage de la codebase.

## 🔧 Configuration

Edit `src/config.ts` to customize:

```typescript
export const appConfig = {
  playlistUrl: import.meta.env.VITE_PLAYLIST_URL || '/playlist.json',
  maxChannels: 2000,
  apiTimeout: 10000,
  enableLogging: true,
};
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- Player.test.tsx

# Generate coverage report
npm run test:coverage
```

## 🔐 Security

- ✅ Input validation with custom validators (`src/utils/validation.ts`)
- ✅ XSS protection on channel URLs
- ✅ Content Security Policy headers (via Vercel)
- ✅ Secure localStorage handling
- ✅ Role-based access control (admin routes guarded server-side)
- ✅ Sentry error monitoring
- ✅ No eval() or dangerous patterns
- ✅ Regular security audits via `npm audit`

## ⚡ Performance

- 📊 Virtual scrolling for 2000+ channels
- 🖼️ Lazy-loaded channel logos
- 🔄 Lazy-loaded admin routes with React.Suspense
- 💾 Progressive Web App caching

## ♿ Accessibility

- Keyboard navigation
- Screen reader support with ARIA labels
- High contrast dark theme
- Focus indicators on interactive elements

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Deploy directly from GitHub
# No additional configuration needed
```

### Docker

```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Manual Deployment

```bash
# Build the app
npm run build

# Upload the 'dist' folder to your hosting
# Configure server to serve index.html for all routes
```

## 📱 PWA Installation

The app works as a Progressive Web App:

1. Open in Chrome/Edge/Firefox
2. Click the "Install" prompt or use menu → "Install app"
3. Access offline with cached content

## 🛠️ Development Setup

### Code Style

We use Prettier for formatting and ESLint for linting:

```bash
# Auto-fix all files
npm run lint
npm run format

# Check without fixing
npm run lint:check
```

## 📚 Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, TypeScript 5.7 |
| **Build** | Vite 8, esbuild |
| **Streaming** | HLS.js 1.6 |
| **State** | Zustand 5 |
| **Routing** | React Router 7 |
| **Backend** | Supabase (auth, storage, RPC) |
| **Monitoring** | Sentry 10 |
| **Icons** | Lucide React 1.14 |
| **Testing** | Vitest 2, Testing Library, Playwright |
| **Linting** | ESLint 10, Prettier 3 |
| **PWA** | Vite PWA Plugin 1.3 |
| **CI/CD** | GitHub Actions, Husky, lint-staged |

## 🐛 Troubleshooting

### Build Fails

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Channels Not Loading

1. Check browser console for errors
2. Verify playlist URL in `src/config.ts`
3. Ensure M3U8 streams are accessible
4. Check CORS headers if using external URLs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [HLS.js](https://github.com/video-dev/hls.js) for streaming support
- [IPTV-ORG](https://github.com/iptv-org/iptv) for playlist data
- [React](https://react.dev) and [Vite](https://vitejs.dev) communities

---

Made with ❤️ by Thamany

**Last Updated:** July 2026 | **Version:** 1.0.0
