/* ProFix Plumbing demo — small, dependency-free enhancements.
   The page works without JS; this layer adds convenience. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var digits = function (v) { return (v || '').replace(/\D/g, ''); };

  /* ---------- Header shadow ---------- */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $('.menu-toggle');
  var menu = $('#mobile-menu');
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('open', open);
    };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- Emergency bar: local Phoenix time (Arizona has no DST) ---------- */
  var etaNote = $('#eta-note');
  if (etaNote) {
    try {
      var time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', hour: 'numeric', minute: '2-digit' }).format(new Date());
      etaNote.textContent = 'Plumbers on call now · ' + time + ' in Phoenix';
    } catch (err) { /* keep static text */ }
  }

  /* ---------- Service links preselect the problem in the quick form ---------- */
  var problem = $('#q-problem');
  if (problem) {
    $$('a[data-problem]').forEach(function (a) {
      a.addEventListener('click', function () {
        var value = a.getAttribute('data-problem');
        if ($$('option', problem).some(function (o) { return o.value === value; })) problem.value = value;
      });
    });
  }

  /* ---------- Quick request form (demo: validates, nothing is sent) ---------- */
  var quick = $('#quick');
  var form = $('#quick-form');
  if (quick && form) {
    var fields = { problem: $('#q-problem'), phone: $('#q-phone'), zip: $('#q-zip') };
    var rules = {
      problem: function (v) { return v !== ''; },
      phone: function (v) { return digits(v).length >= 10; },
      zip: function (v) { return /^\d{5}$/.test(v.trim()); }
    };
    var validate = function (key) {
      var ok = rules[key](fields[key].value);
      fields[key].closest('.field').classList.toggle('invalid', !ok);
      fields[key].setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };
    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('input', function () {
        if (fields[key].closest('.field').classList.contains('invalid')) validate(key);
      });
      fields[key].addEventListener('change', function () { validate(key); });
    });
    fields.phone.addEventListener('input', function () {
      var d = digits(fields.phone.value).slice(0, 10), out = d;
      if (d.length > 6) out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
      else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
      else if (d.length > 0) out = '(' + d;
      fields.phone.value = out;
    });
    fields.zip.addEventListener('input', function () { fields.zip.value = digits(fields.zip.value).slice(0, 5); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.querySelector('input[name="company"]');
      if (hp && hp.value) return; // honeypot

      var firstBad = null;
      Object.keys(fields).forEach(function (key) { if (!validate(key) && !firstBad) firstBad = fields[key]; });
      if (firstBad) { firstBad.focus(); return; }

      var urgent = fields.problem.value === 'burst' || fields.problem.value === 'drain';
      var label = fields.problem.options[fields.problem.selectedIndex].text.toLowerCase();
      $('#q-success-title').textContent = urgent ? 'On it. A dispatcher is calling you now.' : 'Got it. A dispatcher is calling you back.';
      $('#q-success-text').textContent = 'We\u2019ll call ' + fields.phone.value + ' within 5 minutes about your ' + label + ' in ' + fields.zip.value + '.' +
        (urgent ? ' Until then: shut off the main and keep the water off.' : '');
      quick.classList.add('sent');
      quick.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- ZIP checker (Phoenix metro prefixes) ---------- */
  var zipForm = $('#zip-form');
  if (zipForm) {
    var zipInput = $('#zip', zipForm), zipResult = $('#zip-result', zipForm);
    var METRO = ['850', '851', '852', '853'];
    zipInput.addEventListener('input', function () { zipInput.value = digits(zipInput.value).slice(0, 5); });
    zipForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var zip = digits(zipInput.value);
      zipResult.className = 'zip-result';
      if (zip.length !== 5) {
        zipResult.textContent = 'Please enter a 5-digit ZIP code.';
        zipResult.classList.add('no');
        zipInput.focus();
        return;
      }
      if (METRO.indexOf(zip.slice(0, 3)) !== -1) {
        zipResult.textContent = 'Yes, we cover ' + zip + '. Typical arrival: about an hour.';
        zipResult.classList.add('ok');
      } else {
        zipResult.textContent = zip + ' is outside our usual area. Call (602) 555-0147 anyway; for emergencies we\u2019ll often still come, or we\u2019ll tell you who to call.';
        zipResult.classList.add('no');
      }
    });
  }

  /* ---------- Map: load the Google embed when the section comes near ---------- */
  var mapWrap = $('.map-wrap[data-map-src]');
  if (mapWrap) {
    var loadMap = function () {
      if (mapWrap.classList.contains('loaded')) return;
      var iframe = document.createElement('iframe');
      iframe.src = mapWrap.getAttribute('data-map-src');
      iframe.title = mapWrap.getAttribute('data-map-title') || 'Map';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      mapWrap.appendChild(iframe);
      mapWrap.classList.add('loaded');
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { loadMap(); io.disconnect(); }
      }, { rootMargin: '400px 0px' });
      io.observe(mapWrap);
    } else {
      loadMap();
    }
  }

  /* ---------- Footer year ---------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
