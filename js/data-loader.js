(function() {
  'use strict';

  const DataLoader = {
    async loadAll() {
      try {
        const [bio, projects, services, education, contact] = await Promise.all([
          fetch('data/bio.json').then(r => r.json()),
          fetch('data/projects.json').then(r => r.json()),
          fetch('data/services.json').then(r => r.json()),
          fetch('data/education.json').then(r => r.json()),
          fetch('data/contact.json').then(r => r.json())
        ]);
        return { bio, projects, services, education, contact };
      } catch (err) {
        console.error('Failed to load data:', err);
        return null;
      }
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
        heroVideoEl.load();
      }
    },

    renderServices(data) {
      const grid = document.getElementById('services-grid');
      if (!grid) return;
      grid.innerHTML = data.services.map(s => `
        <article class="service-card reveal">
          <span class="service-icon" aria-hidden="true">${s.icon}</span>
          <h3>${s.title}</h3>
          <p>${s.description}</p>
        </article>
      `).join('');
    },

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
      const poster = p.thumbnail || p.poster || '';
      return `
        <article class="project-card reveal" data-video-src="${p.videoSrc}" data-poster="${poster}">
          <div class="project-thumb">
            ${poster ? `<img src="${poster}" alt="${p.title}" loading="lazy">` : ''}
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

    bindProjectCards() {
      document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
          const videoSrc = card.dataset.videoSrc;
          const poster = card.dataset.poster;
          if (videoSrc && !card.dataset.loaded) {
            this.loadVideoEmbed(card, videoSrc, poster);
          }
        }, { once: true });
      });
    },

    loadVideoEmbed(card, videoSrc, poster) {
      const thumb = card.querySelector('.project-thumb');
      thumb.innerHTML = '';
      const video = document.createElement('video');
      video.className = 'project-embed';
      video.src = videoSrc;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      if (poster) video.poster = poster;
      thumb.appendChild(video);
      card.dataset.loaded = 'true';
    },

    switchTab(activeId, categories) {
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
    },

    renderEducation(data) {
      const timeline = document.getElementById('education-timeline');
      if (!timeline) return;
      timeline.innerHTML = data.entries.map(e => `
        <article class="education-item reveal">
          <div class="education-year">${e.year}</div>
          <h3 class="education-degree">${e.degree}</h3>
          <p class="education-school">${e.school}</p>
          <p class="education-desc">${e.description}</p>
        </article>
      `).join('');
    },

    renderContact(data) {
      const emailEl = document.querySelector('[data-bind="email"]');
      if (emailEl) {
        emailEl.href = `mailto:${data.email}`;
        emailEl.textContent = data.email;
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
        
      };
      return icons[platform] || '';
    }
  };

  window.DataLoader = DataLoader;
})();
