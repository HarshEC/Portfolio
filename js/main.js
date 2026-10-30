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
      this.initReelFit();
      this.initVideoScrollPlay();
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
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;
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
        // Metadata may already be available from cache/preload.
        if (video.readyState >= 1 && video.videoWidth) fit(video);
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

    // Auto-play/pause videos based on scroll visibility
    initVideoScrollPlay() {
      // Select all video elements that should auto-play on scroll
      const videoSelectors = [
        '#hero-video',           // Hero background video
        '.reel-video',           // Showreel video
        '.project-preview',      // Project preview videos (before click)
        '.project-embed',        // Project embedded videos (after click)
        '.skill-preview',        // Skill preview videos (before click)
        '.skill-embed'           // Skill embedded videos (after click)
      ];

      const videos = document.querySelectorAll(videoSelectors.join(', '));
      if (!videos.length) return;

      // Track which videos have been user-interacted with
      const userInteracted = new WeakSet();

      // Mark video as user-interacted when they manually play/pause
      videos.forEach(video => {
        video.addEventListener('play', () => {
          if (!video.hasAttribute('data-autoplay')) {
            userInteracted.add(video);
          }
        }, { passive: true });
        video.addEventListener('pause', () => {
          userInteracted.add(video);
        }, { passive: true });
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          const isVisible = entry.isIntersecting;
          const intersectionRatio = entry.intersectionRatio;

          // Only auto-play if at least 50% visible
          const shouldPlay = isVisible && intersectionRatio >= 0.5;

          if (shouldPlay) {
            // Don't auto-play if user has manually interacted with this video
            if (userInteracted.has(video)) return;

            // Pause other auto-playing videos (enforce one at a time)
            videos.forEach(otherVideo => {
              if (otherVideo !== video && !userInteracted.has(otherVideo)) {
                otherVideo.pause();
                otherVideo.currentTime = 0;
              }
            });

            // Play this video
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Autoplay was prevented (e.g., browser policy), mark as interacted
                userInteracted.add(video);
              });
            }
            video.setAttribute('data-autoplay', 'true');
          } else {
            // Pause when not sufficiently visible
            if (!video.paused && video.hasAttribute('data-autoplay')) {
              video.pause();
              video.currentTime = 0;
            }
            video.removeAttribute('data-autoplay');
          }
        });
      }, {
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      });

      const observeVideo = (video) => {
        // Ensure video is muted for autoplay to work
        video.muted = true;
        video.playsInline = true;
        // Add interaction listeners
        video.addEventListener('play', () => {
          if (!video.hasAttribute('data-autoplay')) {
            userInteracted.add(video);
          }
        }, { passive: true });
        video.addEventListener('pause', () => {
          userInteracted.add(video);
        }, { passive: true });
        observer.observe(video);
      };

      // Observe initial videos
      videos.forEach(observeVideo);

      // Expose for dynamically added videos
      window.VideoScrollPlay = { observeVideo, observer };
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
