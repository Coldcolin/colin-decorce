const canvas  = document.getElementById('scroll-canvas');
const context = canvas.getContext('2d');

const frameCount   = 240; // MUST equal the number of files in /frames
const currentFrame = i => `./frames/frame_${i.toString().padStart(6, '0')}.webp`;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Preload all frames up front
const images = [];
for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = currentFrame(i);
  images.push(img);
}

// Size the canvas to the first frame and draw it
images[0].onload = () => {
  canvas.width  = images[0].naturalWidth  || 1920;
  canvas.height = images[0].naturalHeight || 1080;
  context.drawImage(images[0], 0, 0);
};

let currentFrameIndex = 0;

if (!prefersReducedMotion) {
  window.addEventListener('scroll', () => {
    const scrollTop     = document.documentElement.scrollTop;
    const maxScrollTop  = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFraction = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;

    let frameIndex = Math.floor(scrollFraction * frameCount);
    frameIndex = Math.min(frameCount - 1, Math.max(0, frameIndex));

    if (frameIndex !== currentFrameIndex) {
      currentFrameIndex = frameIndex;
      requestAnimationFrame(() => {
        if (images[frameIndex] && images[frameIndex].complete) {
          context.drawImage(images[frameIndex], 0, 0);
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const mainNav = document.getElementById('main-nav');
  const navIndicator = document.querySelector('.nav-indicator');
  const navItems = document.querySelectorAll('.nav-item');
  const footerLinks = document.querySelectorAll('.footer-nav a');
  const sections = document.querySelectorAll('section[id]');

  const closeMobileNav = () => {
    if (!mainNav || !hamburger) return;
    mainNav.classList.remove('mobile-open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
  };

  if (hamburger && mainNav) {
    hamburger.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = mainNav.classList.toggle('mobile-open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    navItems.forEach((item) => {
      item.addEventListener('click', closeMobileNav);
    });

    document.addEventListener('click', (event) => {
      if (!mainNav.classList.contains('mobile-open')) return;
      if (mainNav.contains(event.target) || hamburger.contains(event.target)) return;
      closeMobileNav();
    });
  }

  const setActiveNav = (id) => {
    navItems.forEach((item) => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href === `#${id}`);
    });

    footerLinks.forEach((item) => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href === `#${id}`);
    });

    updateIndicator();
  };

  const updateIndicator = () => {
    if (!navIndicator || !mainNav) return;
    if (window.innerWidth <= 600) {
      navIndicator.style.width = '0px';
      return;
    }

    const active = mainNav.querySelector('.nav-item.active') || navItems[0];
    if (!active) return;

    const navRect = mainNav.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    navIndicator.style.width = `${itemRect.width}px`;
    navIndicator.style.left = `${itemRect.left - navRect.left}px`;
  };

  if (sections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        setActiveNav(visible.target.id);
      }
    }, {
      rootMargin: '-40% 0px -60% 0px',
      threshold: 0
    });

    sections.forEach((section) => observer.observe(section));
  }

  const syncNavFromScroll = () => {
    const about = document.getElementById('about');
    if (about && window.scrollY < about.offsetTop - window.innerHeight * 0.4) {
      setActiveNav('about');
    }
  };

  window.addEventListener('scroll', syncNavFromScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 600) closeMobileNav();
    updateIndicator();
  });

  setActiveNav('about');
  updateIndicator();

  const cases = document.querySelectorAll('.case');

  const setCaseOpen = (caseEl, open) => {
    const button = caseEl.querySelector('.case-toggle');
    const panel = caseEl.querySelector('.case-panel');
    const action = caseEl.querySelector('.case-action');
    const title = caseEl.querySelector('h3');
    if (!button || !panel || !title) return;

    caseEl.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    if (open) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');

    const label = open ? 'Close' : 'Read the case';
    if (action) action.textContent = label;
    button.setAttribute('aria-label', `${label}: ${title.textContent}`);
  };

  cases.forEach((caseEl) => {
    const button = caseEl.querySelector('.case-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
      const willOpen = button.getAttribute('aria-expanded') !== 'true';
      cases.forEach((other) => setCaseOpen(other, false));
      if (willOpen) setCaseOpen(caseEl, true);
    });
  });

  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const formResult = document.getElementById('form-result');

  if (form && submitBtn && formResult) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = (document.getElementById('email') || {}).value || '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        formResult.style.display = 'block';
        formResult.className = 'error';
        formResult.textContent = 'Please enter a valid email address.';
        return;
      }

      const originalLabel = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      formResult.style.display = 'none';

      try {
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        formResult.style.display = 'block';
        if (response.status === 200) {
          formResult.className = 'success';
          formResult.textContent = data.message || 'Message sent. I will get back to you soon.';
          form.reset();
          setTimeout(() => {
            formResult.style.display = 'none';
          }, 5000);
        } else {
          formResult.className = 'error';
          formResult.textContent = data.message || 'Something went wrong. Please try again.';
        }
      } catch (error) {
        formResult.style.display = 'block';
        formResult.className = 'error';
        formResult.textContent = 'Unable to send your message. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    });
  }
});
