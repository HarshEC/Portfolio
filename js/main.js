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

    // One video plays at a time: whichever player is most visible on screen.
    // Scrolling to the next video pauses the previous one automatically, and
    // every player that comes into view starts on its own with sound.
    initVideoScrollPlay() {
      const videos = new Set();
      const programmaticPause = new WeakSet();
      let active = null;
      let pausedByUser = null;
      let soundUnlocked = false;
      let ticking = false;

      const isSilent = (video) => video.id === 'hero-video';

      const pauseNow = (video) => {
        if (video.paused) return;
        programmaticPause.add(video);
        video.pause();
      };

      // Autoplay with sound is blocked by browser policy until the visitor
      // interacts with the page. Try unmuted first; if refused, start muted
      // and unmute the active player as soon as any interaction happens.
      const playVideo = (video) => {
        if (isSilent(video)) video.muted = true;
        else if (soundUnlocked) video.muted = false;

        const attempt = video.play();
        if (!attempt || !attempt.catch) return;

        attempt.catch((err) => {
          if (isSilent(video) || (err && err.name !== 'NotAllowedError')) return;
          video.muted = true;
          const retry = video.play();
          if (retry && retry.catch) retry.catch(() => {});
        });
      };

      const unlockSound = () => {
        soundUnlocked = true;
        if (active && !isSilent(active)) {
          active.muted = false;
          if (active.paused) playVideo(active);
        }
      };

      const update = () => {
        ticking = false;

        const vh = window.innerHeight;
        let best = null;
        let bestScore = 0;
        let bestCenter = Infinity;

        videos.forEach((video) => {
          if (!video.isConnected) {
            videos.delete(video);
            return;
          }
          const rect = video.getBoundingClientRect();
          if (rect.height === 0 || rect.bottom <= 0 || rect.top >= vh) return;

          const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
          const score = visible / Math.min(rect.height, vh);
          const center = Math.abs((rect.top + rect.bottom) / 2 - vh / 2);

          // The most visible video wins; a near tie goes to the one closest
          // to the middle of the screen.
          if (score > bestScore + 0.05 || (Math.abs(score - bestScore) <= 0.05 && center < bestCenter)) {
            best = video;
            bestScore = score;
            bestCenter = center;
          }
        });

        if (bestScore < 0.5) best = null;

        if (best === active) {
          if (best && best.paused && best !== pausedByUser) playVideo(best);
          return;
        }

        if (active && active !== best) {
          pauseNow(active);
          if (pausedByUser === active) pausedByUser = null;
        }

        active = best;

        if (best) {
          if (best !== pausedByUser) playVideo(best);
        }
      };

      const scheduleUpdate = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      };

      const observeVideo = (video) => {
        if (videos.has(video)) return;
        video.playsInline = true;
        if (isSilent(video)) video.muted = true;
        videos.add(video);

        // A visitor pressing native controls owns the pause state until they
        // scroll away; our own pauses must not trigger that flag.
        video.addEventListener('pause', () => {
          if (programmaticPause.has(video)) {
            programmaticPause.delete(video);
            return;
          }
          if (video === active) pausedByUser = video;
        });
        video.addEventListener('play', () => {
          if (pausedByUser === video) pausedByUser = null;
          // A visitor pressing play on another card takes over; keep the
          // one-video-at-a-time rule.
          if (video !== active) {
            videos.forEach((other) => {
              if (other !== video) pauseNow(other);
            });
            active = video;
          }
        });

        scheduleUpdate();
      };

      document.querySelectorAll('#hero-video, .reel-video').forEach(observeVideo);

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate);
      document.addEventListener('visibilitychange', scheduleUpdate);

      // First interaction unlocks audible autoplay for this page.
      ['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
        document.addEventListener(type, unlockSound, { capture: true, passive: true, once: true });
      });

      // Expose for videos mounted later (project/skill cards).
      window.VideoScrollPlay = { observeVideo, refresh: scheduleUpdate };
      update();
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
