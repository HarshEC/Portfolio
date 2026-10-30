(function() {
  'use strict';

  const DataLoader = {
    async loadAll() {
      try {
        const [bio, projects, skills, certificates, contact] = await Promise.all([
          fetch('data/bio.json').then(r => r.json()),
          fetch('data/projects.json').then(r => r.json()),
          fetch('data/skills.json').then(r => r.json()),
          fetch('data/certificates.json').then(r => r.json()),
          fetch('data/contact.json').then(r => r.json())
        ]);
        return { bio, projects, skills, certificates, contact };
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
      // Use the video itself as its own "poster" — browser shows first frame.
      // muted + playsinline + preload="metadata" lets the browser decode the first frame
      // without autoplaying. User clicks to play (loadSkillVideoEmbed swaps in the full player).
      return `
        <article class="skill-card reveal" data-video-src="${s.videoSrc}">
          <div class="skill-thumb">
            <video class="skill-preview" src="${s.videoSrc}" muted playsinline preload="metadata" aria-hidden="true"></video>
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
        card.addEventListener('click', () => {
          const videoSrc = card.dataset.videoSrc;
          if (videoSrc && !card.dataset.loaded) {
            this.loadSkillVideoEmbed(card, videoSrc);
          }
        }, { once: true });
      });
    },

    loadSkillVideoEmbed(card, videoSrc) {
      // Pause ALL videos (projects + skills) before starting this one
      this.pauseAllVideos(card);
      
      const thumb = card.querySelector('.skill-thumb');
      // Replace the preview video with the full player
      thumb.innerHTML = '';
      const video = document.createElement('video');
      video.className = 'skill-embed';
      video.src = videoSrc;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      thumb.appendChild(video);
      card.dataset.loaded = 'true';

      // Register with scroll auto-play observer
      if (window.VideoScrollPlay && window.VideoScrollPlay.observeVideo) {
        window.VideoScrollPlay.observeVideo(video);
      }
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
        <article class="project-card reveal" data-video-src="${p.videoSrc}">
          <div class="project-thumb">
            <video class="project-preview" src="${p.videoSrc}" muted playsinline preload="metadata" aria-hidden="true"></video>
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
          if (videoSrc && !card.dataset.loaded) {
            this.loadVideoEmbed(card, videoSrc);
          }
        }, { once: true });
      });
    },

    loadVideoEmbed(card, videoSrc) {
      this.pauseAllVideos(card);
      
      const thumb = card.querySelector('.project-thumb');
      thumb.innerHTML = '';
      const video = document.createElement('video');
      video.className = 'project-embed';
      video.src = videoSrc;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      thumb.appendChild(video);
      card.dataset.loaded = 'true';

      // Register with scroll auto-play observer
      if (window.VideoScrollPlay && window.VideoScrollPlay.observeVideo) {
        window.VideoScrollPlay.observeVideo(video);
      }
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
    },

    renderCertificates(data) {
      const grid = document.getElementById('certificates-grid');
      if (!grid) return;
      grid.innerHTML = data.certificates.map(cert => `
        <article class="certificate-card reveal">
          <div class="certificate-image">
            <img src="${cert.image}" alt="${cert.title}" loading="lazy">
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
        whatsapp: '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.466-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.194 1.871.18.255-.007.457-.13.61-.343.149-.198.198-.372.198-.57 0-.198-.088-.344-.273-.542-.472-.447-1.235-1.53-1.53-1.933a.994.994 0 0 1-.316-.568c-.115-.308.074-.758.343-1.088.348-.396.808-1.077 1.206-1.553.402-.482.597-.71.744-.9.149-.197.198-.371.173-.57-.026-.198-.2-.345-.422-.422-.308-.114-.616-.13-.793-.075-.173.05-.36.134-.542.242-.371.227-1.32.788-1.667 1.152-.274.287-.51.57-.75.826-.297.316-.59.633-.776.894-.199.287-.371.503-.496.673-.197.3-.358.635-.39.747-.033.114-.086.214-.13.316-.077.197-.198.371-.324.553-.149.21-.317.383-.522.522-.402.286-1.043.822-1.286 1.1-.243.275-.422.5-.57.673-.163.19-.316.382-.497.57-.181.188-.353.39-.497.57-.23.287-.52.684-.67.894-.3.375-.43.663-.54.92-.088.2-.158.37-.204.47-.046.099-.107.18-.18.273-.099.133-.22.23-.347.323-.23.173-.503.323-.73.422-.448.19-1.116.504-1.44.82-.297.297-.57.57-.82.82-.504.504-1.042 1.276-1.057 1.276-.15 0-.371-.17-.52-.343z" fill="currentColor"/></svg>'
      };
      return icons[platform.toLowerCase()] || '';
    }
  };

  window.DataLoader = DataLoader;
})();