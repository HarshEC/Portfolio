(function() {
  'use strict';

  const DataLoader = {
    async loadAll() {
      try {
        const [bio, projects, skills, certificates, contact, media] = await Promise.all([
          fetch('data/bio.json').then(r => r.json()),
          fetch('data/projects.json').then(r => r.json()),
          fetch('data/skills.json').then(r => r.json()),
          fetch('data/certificates.json').then(r => r.json()),
          fetch('data/contact.json').then(r => r.json()),
          // Optional: poster/dimension map. Missing file must not break the site.
          fetch('data/media.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
        ]);
        this.media = media || {};
        return { bio, projects, skills, certificates, contact };
      } catch (err) {
        console.error('Failed to load data:', err);
        return null;
      }
    },

    mediaInfo(videoSrc) {
      return (this.media && this.media[videoSrc]) || null;
    },

    // Posters live beside the videos in assets/posters, mirroring the tree.
    posterFor(videoSrc) {
      const info = this.mediaInfo(videoSrc);
      if (info && info.poster) return info.poster;
      return videoSrc
        .replace(/^assets\/videos\//, 'assets/posters/')
        .replace(/\.(mp4|mov|webm|m4v)$/i, '.jpg');
    },

    // A static poster keeps the page light: no video bytes are fetched until
    // the card approaches the viewport (or the visitor clicks it). Explicit
    // width/height avoids layout shift because the browser reserves space
    // before the image arrives.
    createPoster(videoSrc, alt, className) {
      const info = this.mediaInfo(videoSrc);
      const size = info && info.width && info.height
        ? ` width="${info.width}" height="${info.height}"`
        : '';
      return `<img class="${className}" src="${this.posterFor(videoSrc)}" alt="${alt}"${size} loading="lazy" decoding="async">`;
    },

    renderBio(data) {
      const { name, brand, tagline, photo, experience, experienceYears, currentAgency, heroVideo } = data;
      document.querySelector('[data-bind="name"]').textContent = name;
      document.querySelector('[data-bind="brand"]').textContent = brand;
      document.querySelector('[data-bind="tagline"]').textContent = tagline;
      document.querySelector('[data-bind="experience"]').textContent = experience;
      document.querySelector('[data-bind="experience-years"]').textContent = experienceYears;
      document.querySelector('[data-bind="current-agency"]').textContent = currentAgency;
      const photoEl = document.querySelector('[data-bind="photo"]');
      if (photoEl) { photoEl.src = photo; photoEl.alt = `${name} - ${brand}`; }
      const heroVideoEl = document.getElementById('hero-video');
      if (heroVideoEl && heroVideo) {
        heroVideoEl.innerHTML = '';
        const source = document.createElement('source');
        source.src = heroVideo;
        source.type = heroVideo.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
        heroVideoEl.appendChild(source);

        // Load the hero reel only after the page has painted, so it never
        // competes with the first render / LCP image for bandwidth.
        const startHero = () => {
          heroVideoEl.load();
          const play = heroVideoEl.play();
          if (play && play.catch) play.catch(() => {});
        };
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(startHero, { timeout: 1500 });
        } else {
          window.setTimeout(startHero, 600);
        }
      }
    },

    renderSkills(data) {
      const tabsContainer = document.getElementById('skill-tabs');
      const panelsContainer = document.getElementById('skill-panels');
      const mobileGridContainer = document.getElementById('skills-grid-mobile');
      if (!tabsContainer || !panelsContainer) return;

      tabsContainer.innerHTML = '';
      panelsContainer.innerHTML = '';
      if (mobileGridContainer) mobileGridContainer.innerHTML = '';

      // Each skill is its own category (tab) with one video
      data.skills.forEach((skill, i) => {
        const tabId = `skill-tab-${skill.id}`;
        const panelId = `skill-panel-${skill.id}`;

        const btn = document.createElement('button');
        btn.className = 'skill-tab';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-controls', panelId);
        btn.id = tabId;
        btn.textContent = skill.title;
        btn.addEventListener('click', () => this.switchSkillTab(skill.id, data.skills));
        tabsContainer.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'skill-panel' + (i === 0 ? ' active' : '');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabId);
        panel.id = panelId;
        panel.innerHTML = `
          <div class="skills-grid" data-skill="${skill.id}">
            ${this.createSkillCard(skill)}
          </div>
        `;
        panelsContainer.appendChild(panel);

        // Also add to mobile grid (single card per skill)
        if (mobileGridContainer) {
          mobileGridContainer.insertAdjacentHTML('beforeend', this.createSkillCard(skill));
        }
      });

      this.bindSkillCards();
    },

    createSkillCard(s) {
      // Static poster by default — the video mounts just before it scrolls in,
      // keeping the bulk of the source footage off the initial load.
      return `
        <article class="skill-card reveal" data-video-src="${s.videoSrc}" tabindex="0" role="button" aria-label="Play ${s.title}">
          <div class="skill-thumb">
            ${this.createPoster(s.videoSrc, s.title, 'skill-poster')}
            <div class="skill-play" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="skill-info">
            <h3>${s.title}</h3>
            <p>${s.description}</p>
          </div>
        </article>
      `;
    },

    bindSkillCards() {
      document.querySelectorAll('.skill-card').forEach(card => {
        this.bindVideoCard(card, () => this.loadSkillVideoEmbed(card, card.dataset.videoSrc));
      });
    },

    bindProjectCards() {
      document.querySelectorAll('.project-card').forEach(card => {
        this.bindVideoCard(card, () => this.loadVideoEmbed(card, card.dataset.videoSrc));
      });
    },

    // A card loads its video shortly before entering the viewport, so playback
    // can start by itself as the visitor scrolls — no click required. Clicking
    // still works and simply mounts immediately.
    bindVideoCard(card, activate) {
      const start = () => {
        if (card.dataset.loaded) return;
        if (card.dataset.videoSrc) activate();
      };
      card.addEventListener('click', start);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      });
      this.observeCard(card, start);
    },

    observeCard(card, start) {
      if (!('IntersectionObserver' in window)) return;
      if (!this.cardObserver) {
        this.cardObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            if (entry.target.__startVideo) entry.target.__startVideo();
          });
        }, {
          // Mount a little early so the first frame is ready by the time the
          // card is actually on screen.
          rootMargin: '400px 0px',
          threshold: 0.01
        });
      }
      card.__startVideo = start;
      this.cardObserver.observe(card);
    },

    // Replaces a card's poster with a real player. Playback itself is driven
    // by the scroll manager in main.js (one audible video at a time).
    mountVideo(card, videoSrc, { thumbSelector, videoClass, title }) {
      const thumb = card.querySelector(thumbSelector);
      if (!thumb) return;

      thumb.innerHTML = '';
      const video = document.createElement('video');
      video.className = videoClass;
      video.src = videoSrc;
      video.poster = this.posterFor(videoSrc);
      const info = this.mediaInfo(videoSrc);
      if (info && info.width && info.height) {
        // Reserve the exact aspect ratio before metadata loads.
        video.width = info.width;
        video.height = info.height;
      }
      video.controls = true;
      video.muted = false;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-label', title || 'Video player');
      thumb.appendChild(video);
      card.dataset.loaded = 'true';
      card.classList.remove('is-loading');

      if (window.VideoScrollPlay && window.VideoScrollPlay.observeVideo) {
        window.VideoScrollPlay.observeVideo(video);
      }
    },

    loadSkillVideoEmbed(card, videoSrc) {
      card.classList.add('is-loading');
      this.mountVideo(card, videoSrc, {
        thumbSelector: '.skill-thumb',
        videoClass: 'skill-embed',
        title: card.querySelector('h3') && card.querySelector('h3').textContent
      });
    },

    // Shared pause logic for both projects and skills
    pauseAllVideos(exceptCard = null) {
      // Pause project videos
      document.querySelectorAll('.project-embed').forEach(video => {
        if (exceptCard && exceptCard.contains(video)) return;
        if (!video.paused) {
          video.pause();
          video.currentTime = 0;
        }
      });
      // Pause skill videos
      document.querySelectorAll('.skill-embed').forEach(video => {
        if (exceptCard && exceptCard.contains(video)) return;
        if (!video.paused) {
          video.pause();
          video.currentTime = 0;
        }
      });
    },

    // Pause only skill videos (for skill tab switching)
    pauseSkillVideos(exceptCard = null) {
      document.querySelectorAll('.skill-embed').forEach(video => {
        if (exceptCard && exceptCard.contains(video)) return;
        if (!video.paused) {
          video.pause();
          video.currentTime = 0;
        }
      });
    },

    switchSkillTab(activeId, skills) {
      // Pause all videos when switching tabs
      this.pauseSkillVideos();
      
      document.querySelectorAll('.skill-tab').forEach(btn => {
        const isActive = btn.getAttribute('aria-controls') === `skill-panel-${activeId}`;
        btn.setAttribute('aria-selected', isActive);
      });
      document.querySelectorAll('.skill-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `skill-panel-${activeId}`);
      });
      const panel = document.getElementById(`skill-panel-${activeId}`);
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.VideoScrollPlay) window.VideoScrollPlay.refresh();
    },

    // Keep the original project functions for backward compatibility
    renderProjects(data) {
      const tabsContainer = document.getElementById('project-tabs');
      const panelsContainer = document.getElementById('project-panels');
      if (!tabsContainer || !panelsContainer) return;

      tabsContainer.innerHTML = '';
      panelsContainer.innerHTML = '';

      data.categories.forEach((cat, i) => {
        const tabId = `tab-${cat.id}`;
        const panelId = `panel-${cat.id}`;

        const btn = document.createElement('button');
        btn.className = 'project-tab';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        btn.setAttribute('aria-controls', panelId);
        btn.id = tabId;
        btn.textContent = cat.title;
        btn.addEventListener('click', () => this.switchTab(cat.id, data.categories));
        tabsContainer.appendChild(btn);

        const panel = document.createElement('div');
        panel.className = 'project-panel' + (i === 0 ? ' active' : '');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabId);
        panel.id = panelId;
        panel.innerHTML = `
          <div class="projects-grid" data-category="${cat.id}">
            ${cat.projects.map(p => this.createProjectCard(p)).join('')}
          </div>
        `;
        panelsContainer.appendChild(panel);
      });

      this.bindProjectCards();
    },

    createProjectCard(p) {
      return `
        <article class="project-card reveal" data-video-src="${p.videoSrc}" tabindex="0" role="button" aria-label="Play ${p.title}">
          <div class="project-thumb">
            ${this.createPoster(p.videoSrc, p.title, 'project-poster')}
            <div class="project-play" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="project-info">
            <h3>${p.title}</h3>
            <p>${p.description}</p>
          </div>
        </article>
      `;
    },

    loadVideoEmbed(card, videoSrc) {
      card.classList.add('is-loading');
      this.mountVideo(card, videoSrc, {
        thumbSelector: '.project-thumb',
        videoClass: 'project-embed',
        title: card.querySelector('h3') && card.querySelector('h3').textContent
      });
    },

    // Updated to pause both project and skill videos
    pauseAllProjectVideos(exceptCard = null) {
      this.pauseAllVideos(exceptCard);
    },

    switchTab(activeId, categories) {
      this.pauseAllVideos();
      
      document.querySelectorAll('.project-tab').forEach(btn => {
        const isActive = btn.getAttribute('aria-controls') === `panel-${activeId}`;
        btn.setAttribute('aria-selected', isActive);
      });
      document.querySelectorAll('.project-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${activeId}`);
      });
      const panel = document.getElementById(`panel-${activeId}`);
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.VideoScrollPlay) window.VideoScrollPlay.refresh();
    },

    renderCertificates(data) {
      const grid = document.getElementById('certificates-grid');
      if (!grid) return;
      grid.innerHTML = data.certificates.map(cert => `
        <article class="certificate-card reveal">
          <div class="certificate-image">
            <img src="${cert.image}" alt="${cert.title}" loading="lazy" decoding="async">
          </div>
          <div class="certificate-info">
            <div class="certificate-meta">
              <span class="certificate-year">${cert.year}</span>
              <span class="certificate-issuer">${cert.issuer}</span>
            </div>
            <h3>${cert.title}</h3>
            <p>${cert.description}</p>
          </div>
        </article>
      `).join('');
    },

    renderContact(data) {
      const emailEl = document.querySelector('[data-bind="email"]');
      if (emailEl) {
        emailEl.href = `mailto:${data.email}`;
        emailEl.textContent = data.email;
      }
      const phoneEl = document.querySelector('[data-bind="phone"]');
      if (phoneEl && data.phone) {
        phoneEl.href = `tel:${data.phoneRaw || data.phone.replace(/\s+/g, '')}`;
        phoneEl.textContent = data.phone;
      }
      const socialContainer = document.getElementById('social-links');
      if (socialContainer) {
        socialContainer.innerHTML = data.social.map(s => `
          <a href="${s.url}" class="social-link" aria-label="${s.label}" target="_blank" rel="noopener">
            ${this.getSocialIcon(s.platform)}
          </a>
        `).join('');
      }
    },

    getSocialIcon(platform) {
      const icons = {
        youtube: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        instagram: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        linkedin: '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
        twitter: '<svg viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
        whatsapp: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>'
      };
      return icons[platform.toLowerCase()] || '';
    }
  };

  window.DataLoader = DataLoader;
})();