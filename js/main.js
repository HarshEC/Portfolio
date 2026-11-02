(function() {
  'use strict';

  const App = {
    async init() {
      const data = await DataLoader.loadAll();
      if (!data) {
        console.error('Failed to load portfolio data');
        return;
      }

      DataLoader.renderBio(data.bio);
      DataLoader.renderSkills(data.skills);
      DataLoader.renderProjects(data.projects);
      DataLoader.renderCertificates(data.certificates);
      DataLoader.renderContact(data.contact);

      this.initScrollReveal();
      this.initSmoothScroll();
      this.initTabNavigation();
      this.initScrollProgress();
      this.initReelMedia();
      this.initReelFit();
      this.initVideoScrollPlay();
    },

    // Apply the poster + intrinsic size to the showreel before any video bytes
    // are fetched. Width/height reserve the correct box so nothing jumps.
    initReelMedia() {
      const video = document.querySelector('.reel-video');
      if (!video) return;
      const src = video.getAttribute('src');
      if (!src) return;

      const info = DataLoader.mediaInfo(src);
      if (info) {
        video.poster = DataLoader.posterFor(src);
        if (info.width && info.height) {
          video.width = info.width;
          video.height = info.height;
        }
      }

      const stage = video.closest('.reels-stage');
      if (stage && info && info.width && info.height) {
        const ratio = info.width / info.height;
        stage.classList.remove('is-portrait', 'is-landscape', 'is-square', 'is-unknown');
        stage.classList.add(ratio < 0.9 ? 'is-portrait' : ratio > 1.1 ? 'is-landscape' : 'is-square');
      }
    },

    // Edge case: prevent showreel cropping for any source aspect ratio
    // (9:16 short-form, 1:1, 16:9). Uses `contain` in CSS + narrows the
    // stage for portrait clips so the full frame fits without cover-crop.
    initReelFit() {
      const videos = document.querySelectorAll('.reel-video');
      if (!videos.length) return;

      const fit = (video) => {
        const stage = video.closest('.reels-stage');
        if (!stage) return;
        const w = video.videoWidth || video.width || 0;
        const h = video.videoHeight || video.height || 0;
        stage.classList.remove('is-portrait', 'is-landscape', 'is-square', 'is-unknown');
        if (!w || !h) {
          stage.classList.add('is-unknown');
          return;
        }
        const ratio = w / h;
        if (ratio < 0.9) stage.classList.add('is-portrait');
        else if (ratio > 1.1) stage.classList.add('is-landscape');
        else stage.classList.add('is-square');
      };

      videos.forEach((video) => {
        // Metadata may already be available from cache/preload. The poster's
        // width/height attributes are a safe fallback before metadata arrives.
        fit(video);
        video.addEventListener('loadedmetadata', () => fit(video));
        video.addEventListener('error', () => {
          const stage = video.closest('.reels-stage');
          if (stage) stage.classList.add('is-unknown');
        }, { once: true });
      });
    },

    initScrollReveal() {
      document.querySelectorAll('.section-header, .about-grid, .reels-stage, .footer-content').forEach(el => el.classList.add('reveal'));
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -10%',
        threshold: 0.1
      });

      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    },

    initSmoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          if (targetId === '#') return;
          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, '', targetId);
          }
        });
      });
    },

    initTabNavigation() {
      // Project tabs
      const projectTabsContainer = document.getElementById('project-tabs');
      if (projectTabsContainer) {
        projectTabsContainer.addEventListener('click', (e) => {
          const tab = e.target.closest('.project-tab');
          if (!tab) return;
          const panelId = tab.getAttribute('aria-controls');
          const panel = document.getElementById(panelId);
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }

      // Skill tabs
      const skillTabsContainer = document.getElementById('skill-tabs');
      if (skillTabsContainer) {
        skillTabsContainer.addEventListener('click', (e) => {
          const tab = e.target.closest('.skill-tab');
          if (!tab) return;
          const panelId = tab.getAttribute('aria-controls');
          const panel = document.getElementById(panelId);
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    },

    initScrollProgress() {
      const progress = document.createElement('div');
      progress.className = 'scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.appendChild(progress);

      let ticking = false;
      const updateProgress = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const amount = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progress.style.transform = `scaleX(${amount / 100})`;
        ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(updateProgress);
          ticking = true;
        }
      }, { passive: true });
      updateProgress();
    },

    // Auto-play/pause videos based on scroll visibility.
    // Only hero + showreel exist on first load. Clicked project/skill players
    // register themselves later through window.VideoScrollPlay.
    initVideoScrollPlay() {
      const videos = document.querySelectorAll('#hero-video, .reel-video');
      if (!videos.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          const shouldPlay = entry.isIntersecting && entry.intersectionRatio >= 0.4;

          if (shouldPlay) {
            // Keep decoding to one video at a time. Pause any other autoplay
            // video, but never touch a player the visitor controls manually.
            document.querySelectorAll('video').forEach(other => {
              if (other !== video && !other.paused && !other.controls) {
                other.pause();
              }
            });
            if (video.paused) {
              const playPromise = video.play();
              if (playPromise && playPromise.catch) playPromise.catch(() => {});
            }
          } else if (!video.paused && !video.controls) {
            // Leaving the viewport: stop decoding, keep the position.
            video.pause();
          } else if (!entry.isIntersecting && !video.paused) {
            // Offscreen user-controlled player: pause (preserve position).
            video.pause();
          }
        });
      }, {
        rootMargin: '100px 0px',
        threshold: [0, 0.4, 0.75]
      });

      const observeVideo = (video) => {
        if (!video.controls) {
          video.muted = true;
          video.playsInline = true;
        }
        observer.observe(video);
      };

      videos.forEach(observeVideo);

      // Expose for dynamically added videos (project/skill cards on click).
      window.VideoScrollPlay = { observeVideo, observer };
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
