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
      DataLoader.renderServices(data.services);
      DataLoader.renderProjects(data.projects);
      DataLoader.renderEducation(data.education);
      DataLoader.renderContact(data.contact);

      this.initScrollReveal();
      this.initSmoothScroll();
      this.initTabNavigation();
      this.initScrollProgress();
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
      const tabsContainer = document.getElementById('project-tabs');
      if (!tabsContainer) return;

      tabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.project-tab');
        if (!tab) return;

        const panelId = tab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
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
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
