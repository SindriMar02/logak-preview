/* LÖGFRÆÐIÞJÓNUSTA AKRANESS — shared script for the homepage and the practice-area subpages:
   mask reveal, drift, mobile menu, contact form, and the homepage intro. The intro guards on
   the hero's own elements, so it no-ops on every subpage. */

(function(){
  "use strict";
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('js');

  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.5 });
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* mask reveal, fires once */
  var masks = [].slice.call(document.querySelectorAll('.mask'));
  if (reduce || !('IntersectionObserver' in window)) {
    masks.forEach(function(m){ m.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    masks.forEach(function(m){ io.observe(m); });
    requestAnimationFrame(function(){
      masks.forEach(function(m){
        if (m.getBoundingClientRect().top < innerHeight * 0.92) m.classList.add('in');
      });
    });
  }

  /* Heklusýn drift — batch ALL reads, then ALL writes */
  var drifters = [].slice.call(document.querySelectorAll('.frame-in, .drift'));
  var hdr = document.getElementById('hdr'), lastScrolled = null;
  /* Ceiling for a text block's drift, in px. A % translate resolves against the element's OWN
     height, so a long column would otherwise swing many times further than a short one. */
  function driftCap(){ return innerWidth < 1000 ? 12 : 26; }

  function loop(){
    requestAnimationFrame(loop);
    var sy = window.scrollY;
    var scrolled = sy > 40;
    if (hdr && scrolled !== lastScrolled){ hdr.classList.toggle('scrolled', scrolled); lastScrolled = scrolled; }
    if (reduce || !drifters.length) return;
    var vh = window.innerHeight, cap = driftCap(), i, rects = new Array(drifters.length);

    for (i = 0; i < drifters.length; i++){                       // READS
      var el = drifters[i];
      rects[i] = (el.classList.contains('frame-in') ? el.parentElement : el).getBoundingClientRect();
    }

    for (i = 0; i < drifters.length; i++){                       // WRITES
      var dEl = drifters[i], r = rects[i];
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var p = (r.top + r.height/2 - vh/2) / (vh/2 + r.height/2);
      if (p < -1) p = -1; else if (p > 1) p = 1;
      var d = parseFloat(dEl.dataset.drift) || 9;
      if (dEl.classList.contains('frame-in')){
        dEl.style.transform = 'translate3d(0,' + (-p * d).toFixed(3) + '%,0)';
      } else {
        /* resolve the % against the block's height once, then cap it in px, so a long stacked
           column cannot shear into the heading above it */
        var t = -p * d / 100 * r.height;
        if (t > cap) t = cap; else if (t < -cap) t = -cap;
        dEl.style.transform = 'translate3d(0,' + t.toFixed(2) + 'px,0)';
      }
    }
  }
  requestAnimationFrame(loop);

  /* mobile menu. html.menu-open lets the header turn white over the night overlay. */
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  function setMenu(open){
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Loka valmynd' : 'Opna valmynd');
    mnav.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  if (burger && mnav){
    burger.addEventListener('click', function(){ setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    addEventListener('keydown', function(e){
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true'){ setMenu(false); burger.focus(); }
    });
    mnav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
  }

  /* ---------- contact form ----------
     FormSubmit's HTTP 200 means "I received your POST", never "I did what you asked" —
     a fresh recipient address returns 200 with success:"false" until it is activated. So this
     NEVER shows a success message off res.ok alone: it checks the JSON body's success field,
     and treats anything else as a failure that hands the visitor the phone number and email. */
  (function(){
    var form = document.getElementById('cform');
    if (!form) return;
    var status = document.getElementById('cform-status');
    var btn = form.querySelector('button[type="submit"]');
    var btnDefault = btn.textContent;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (form.querySelector('[name="_honey"]').value) return;   // bot filled the trap, drop silently
      if (!form.checkValidity()){ form.reportValidity(); return; }

      status.textContent = '';
      status.className = 'cform-status';
      btn.disabled = true;
      btn.textContent = 'Sendi fyrirspurn…';

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data && (data.success === true || data.success === 'true')){
          status.textContent = 'Fyrirspurnin hefur verið send.';
          status.className = 'cform-status ok';
          form.reset();
        } else {
          throw new Error('not confirmed');
        }
      })
      .catch(function(){
        status.innerHTML = 'Ekki tókst að staðfesta að fyrirspurnin hafi borist. Hringdu í <a href="tel:+3548578660">857 8660</a> eða sendu tölvupóst á <a href="mailto:baldvin@delikt.is">baldvin@delikt.is</a>.';
        status.className = 'cform-status err';
      })
      .finally(function(){
        btn.disabled = false;
        btn.textContent = btnDefault;
      });
    });
  })();

  /* ---------- homepage intro ----------
     The inline script in <head> has already added html.is-intro + html.is-hold (once per
     session, never under reduced motion). This splits the headline into characters, waits
     for the painting to DECODE (never a bare timer), then releases the hold. */
  (function(){
    var root = document.documentElement;
    if (!root.classList.contains('is-intro')) return;
    var hero = document.querySelector('.hero');
    var h1 = document.getElementById('h1');
    var art = hero && hero.querySelector('.hero-art picture img');
    if (!hero || !h1 || !art){ root.classList.remove('is-hold', 'is-intro'); return; }

    // split the h1 into chars WITHOUT destroying its accessible name or textContent
    var text = h1.textContent;
    h1.setAttribute('aria-label', text);
    var frag = document.createDocumentFragment(), n = 0;
    var words = text.split(' ');
    words.forEach(function(word, wi){
      var w = document.createElement('span');
      w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function(c){
        var s = document.createElement('span');
        s.className = 'ch'; s.textContent = c;
        s.style.setProperty('--i', n++);
        w.appendChild(s);
      });
      frag.appendChild(w);
      // a REAL space between words, so textContent stays right and lines can break there
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    h1.textContent = '';
    h1.appendChild(frag);
    h1.classList.add('is-split');

    var started = false;
    function start(){
      if (started) return; started = true;
      try { sessionStorage.setItem('la-intro', '1'); } catch(e){}
      root.classList.remove('is-hold');
      setTimeout(function(){ root.classList.remove('is-intro'); }, 3000);   // base styles are the end state
    }
    setTimeout(start, 2000);                                              // ceiling for a slow image
    if (art.decode) art.decode().then(start, start);
    else if (art.complete) start();
    else { art.addEventListener('load', start); art.addEventListener('error', start); }
  })();

  /* anchors */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var el = document.querySelector(id); if (!el) return;
      e.preventDefault();
      requestAnimationFrame(function(){
        if (lenis) lenis.scrollTo(el, { offset: -64 });
        else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  });
})();
