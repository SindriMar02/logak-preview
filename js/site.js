/* LÖGFRÆÐIÞJÓNUSTA AKRANESS — shared script, extracted from index.html 2026-09-03 so the
   practice-area subpages reuse the same mask reveal, drift, mobile menu and contact-form
   logic without duplicating it. The aperture-intro IIFE near the bottom already guards on
   `if (!hero || !h1 || !heroImg) return;`, so it safely no-ops on any page without a .hero
   section — subpages load this unmodified, they just never trigger that block. */

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
     height, so a long column would otherwise swing many times further than a short one. Cap it:
     26 on desktop is the largest swing the design actually authors, and 12 on the stacked mobile
     layout stays comfortably inside the ~28px grid gap a drifting column has to clear. */
  function driftCap(){ return innerWidth < 1000 ? 12 : 26; }

  function loop(){
    requestAnimationFrame(loop);
    if (reduce || !drifters.length) return;
    var vh = window.innerHeight, cap = driftCap(), i, rects = new Array(drifters.length);

    for (i = 0; i < drifters.length; i++){                       // READS
      var el = drifters[i];
      rects[i] = (el.classList.contains('frame-in') ? el.parentElement : el).getBoundingClientRect();
    }
    var sy = window.scrollY;

    for (i = 0; i < drifters.length; i++){                       // WRITES
      var dEl = drifters[i], r = rects[i];
      if (r.bottom < -200 || r.top > vh + 200) continue;
      var p = (r.top + r.height/2 - vh/2) / (vh/2 + r.height/2);
      if (p < -1) p = -1; else if (p > 1) p = 1;
      var d = parseFloat(dEl.dataset.drift) || 9;
      if (dEl.classList.contains('frame-in')){
        /* An image inside an overflow:hidden frame. % of its own box is exactly what we want here
           (the drift scales with the crop) and it has nothing in flow to collide with. */
        dEl.style.transform = 'translate3d(0,' + (-p * d).toFixed(3) + '%,0)';
      } else {
        /* A text block in normal flow. A % translate is a % of the element's OWN height, so a long
           stacked column drifts much further than the short heading above it and shears into it —
           at 375px the #baldvin body swung 62px against the name's 17px and closed a 114px gap to
           69px mid-scroll. Resolve the % against the height once, then cap it in px so short and
           long blocks drift by the same order of magnitude. */
        var t = -p * d / 100 * r.height;
        if (t > cap) t = cap; else if (t < -cap) t = -cap;
        dEl.style.transform = 'translate3d(0,' + t.toFixed(2) + 'px,0)';
      }
    }

    var scrolled = sy > 40;
    if (scrolled !== lastScrolled){ hdr.classList.toggle('scrolled', scrolled); lastScrolled = scrolled; }
  }
  requestAnimationFrame(loop);

  /* mobile menu */
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  function setMenu(open){
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Loka valmynd' : 'Opna valmynd');
    mnav.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  burger.addEventListener('click', function(){ setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  addEventListener('keydown', function(e){
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true'){ setMenu(false); burger.focus(); }
  });
  mnav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });

  /* ---------- contact form ----------
     FormSubmit's HTTP 200 means "I received your POST", never "I did what you asked" —
     a fresh recipient address returns 200 with success:"false" until it is activated by
     clicking a one-time link FormSubmit emails to that address. So this NEVER shows a
     success message off res.ok alone: it checks the JSON body's success field explicitly,
     and treats anything else (activation pending, network failure, bad response) as a
     failure that hands the visitor the phone number and email instead of a false promise. */
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
      btn.textContent = 'Sendi…';

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data && (data.success === true || data.success === 'true')){
          status.textContent = 'Takk fyrir. Skilaboðin voru send og við höfum samband fljótlega.';
          status.className = 'cform-status ok';
          form.reset();
        } else {
          throw new Error('not confirmed');
        }
      })
      .catch(function(){
        status.innerHTML = 'Ekki tókst að staðfesta að skilaboðin hafi borist. Hringdu í <a href="tel:+3548578660">857 8660</a> eða sendu tölvupóst á <a href="mailto:baldvin@delikt.is">baldvin@delikt.is</a>.';
        status.className = 'cform-status err';
      })
      .finally(function(){
        btn.disabled = false;
        btn.textContent = btnDefault;
      });
    });
  })();

  /* ---------- aperture intro ----------
     Gate on real image DECODE, never a timer. Once per session; ?reveal forces it.
     Scroll is released 0.8s before the timeline ends so the last beat plays under
     the user's first scroll, with no dead pause. */
  (function(){
    var force = /[?&]reveal\b/.test(location.search);
    if (reduce) return;
    if (!force && sessionStorage.getItem('la-intro') === '1') return;

    var root = document.documentElement;
    var hero = document.querySelector('.hero');
    var h1 = document.getElementById('h1');
    var heroImg = hero && hero.querySelector('.frame img');
    if (!hero || !h1 || !heroImg) return;

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
      // a REAL space text node between words: keeps textContent correct and gives
      // the line-breaker somewhere legal to break
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    h1.textContent = '';
    h1.appendChild(frag);

    var started = false;
    function start(){
      if (started) return; started = true;
      sessionStorage.setItem('la-intro', '1');
      // hero copy is driven by the intro, so retire its scroll-mask reveal
      hero.querySelectorAll('.mask').forEach(function(m){ m.classList.add('in'); });
      root.classList.add('is-intro');
      root.classList.add('is-locked');
      if (lenis) lenis.stop();
      setTimeout(function(){                       // 4000 - 800: last beat plays under the first scroll
        if (lenis) lenis.start();
        root.classList.remove('is-locked');
      }, 3200);
      setTimeout(function(){                       // timeline over; base styles already ARE the end state
        root.classList.remove('is-intro');
      }, 4400);
    }
    // decode gate, with a ceiling so a slow image can never hang the page
    var done = false;
    var go = function(){ if (!done){ done = true; start(); } };
    setTimeout(go, 2500);
    if (heroImg.decode) heroImg.decode().then(go).catch(go);
    else if (heroImg.complete) go();
    else heroImg.addEventListener('load', go), heroImg.addEventListener('error', go);
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
