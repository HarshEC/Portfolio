# Portfolio Website

Dark-themed portfolio for video editing & motion graphics. Built with vanilla HTML/CSS/JS, data-driven via JSON files.

## Structure

```
portfolio/
├── index.html
├── css/
│   ├── variables.css      # Theme tokens (colors, spacing, type)
│   ├── main.css           # Layout & section styles
│   └── components.css     # Component styles (cards, tabs, embeds)
├── js/
│   ├── main.js            # App init, scroll animations, navigation
│   ├── data-loader.js     # Fetches JSON, renders all sections
│   └── youtube-player.js  # YouTube IFrame API wrapper
├── data/
│   ├── bio.json           # Name, brand, tagline, photo, experience, story, heroVideoId
│   ├── projects.json      # Categories with projects (title, youtubeId, thumbnail, desc)
│   ├── services.json      # Services list (title, description, icon)
│   ├── education.json     # Education entries (degree, school, year, description)
│   └── contact.json       # Email + social links
├── assets/
│   └── images/            # Profile photo, project thumbnails
└── README.md
```

## Quick Start

1. **Edit data files** in `/data/` — no code changes needed
2. **Add images** to `/assets/images/` (profile.jpg, project thumbnails)
3. **Open `index.html`** in browser to preview
4. **Deploy** (see below)

## Customization

### Theme (css/variables.css)
```css
:root {
  --accent: #ffffff;        /* Primary accent color */
  --bg-primary: #0a0a0a;    /* Background */
  --fg-primary: #ffffff;    /* Text */
  /* ... all tokens are here */
}
```

### Hero Background Video
Set `heroVideoId` in `bio.json` to any YouTube video ID (11 chars). The video autoplays muted, loops, no controls.

### Project Thumbnails
- Add custom thumbnails to `assets/images/`
- Reference in `projects.json` (optional)
- Falls back to YouTube's `maxresdefault.jpg` automatically

### Adding Projects
Edit `data/projects.json`:
```json
{
  "categories": [
    {
      "id": "new-category",
      "title": "New Category",
      "projects": [
        {
          "title": "Project Name",
          "youtubeId": "ABC123xyz",
          "thumbnail": "assets/images/thumb.jpg",
          "description": "Description"
        }
      ]
    }
  ]
}
```

## Deployment

### GitHub Pages (Recommended)
1. Push to GitHub repository
2. Settings → Pages → Source: `Deploy from branch` → `main` / `/ (root)`
3. Site live at `https://username.github.io/repo-name`

### Custom Domain
1. Add `CNAME` file to repo root with your domain
2. Configure DNS: `CNAME` → `username.github.io`
3. Enable "Enforce HTTPS" in Pages settings

### Other Static Hosts
- **Netlify**: Drag & drop `portfolio/` folder
- **Vercel**: `vercel deploy portfolio/`
- **Cloudflare Pages**: Connect Git repo
- **Firebase Hosting**: `firebase deploy`

## Local Development

For YouTube API to work (hero background), serve over HTTP(S):
```bash
# Option 1: VS Code Live Server extension (right-click index.html → "Open with Live Server")
# Option 2: npx serve
npx serve portfolio/
# Option 3: Python
cd portfolio && python -m http.server 8000
```

Then open `http://localhost:8000` (or 5500 for Live Server).

## Browser Support
- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- YouTube IFrame API requires internet connection
- `prefers-reduced-motion` respected for animations

## Performance Notes
- Project videos lazy-load on click (thumbnail → embed)
- Hero video uses YouTube's CDN
- Images: add `loading="lazy"` (already in template)
- No build step, no dependencies

## Accessibility
- Semantic HTML5 structure
- ARIA roles on tabs/tabpanels
- Focus-visible states
- Reduced motion support
- Alt text on all images

## License
MIT — customize freely.