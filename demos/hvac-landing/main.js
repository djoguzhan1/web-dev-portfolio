/* CoolAir HVAC demo — small, dependency-free enhancements.
   Everything here degrades gracefully: the page works without JS. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Header shadow on scroll ---------- */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
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
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Open / closed status (business is in Dallas, Central Time) ---------- */
  var HOURS = { open: 7, close: 20, days: [1, 2, 3, 4, 5, 6] }; // Mon–Sat 7 AM – 8 PM
  var status = $('#open-status');
  if (status) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(new Date());
      var get = function (type) { var p = parts.filter(function (x) { return x.type === type; })[0]; return p ? p.value : ''; };
      var dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      var hour = parseInt(get('hour'), 10) % 24;
      var minute = parseInt(get('minute'), 10);
      var now = hour + minute / 60;
      var isOpen = HOURS.days.indexOf(dayIndex) !== -1 && now >= HOURS.open && now < HOURS.close;

      if (isOpen) {
        var closingSoon = HOURS.close - now <= 1;
        status.textContent = closingSoon ? 'Open now · closing soon (8 PM)' : 'Open now · closes 8 PM';
        status.classList.remove('closed');
      } else {
        status.textContent = 'Closed · emergency line open 24/7';
        status.classList.add('closed');
      }
    } catch (err) {
      status.textContent = 'Mon–Sat 7 AM – 8 PM';
    }
  }

  /* ---------- "Same-day appointments · Thu, Sep 24" ---------- */
  var availDay = $('#avail-day');
  if (availDay) {
    try {
      var label = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric'
      }).format(new Date());
      availDay.textContent = 'Same-day appointments · ' + label;
    } catch (err) { /* keep static text */ }
  }

  /* ---------- Service cards preselect the booking form ---------- */
  var serviceSelect = $('#f-service');
  if (serviceSelect) {
    $$('a[data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        var value = a.getAttribute('data-service');
        if ($$('option', serviceSelect).some(function (o) { return o.value === value; })) {
          serviceSelect.value = value;
        }
      });
    });
  }

  /* ---------- ZIP checker ---------- */
  var zipForm = $('#zip-form');
  if (zipForm) {
    var zipInput = $('#zip', zipForm);
    var zipResult = $('#zip-result', zipForm);
    var DFW_PREFIXES = ['750', '751', '752', '753', '754', '760', '761', '762'];

    zipForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var zip = (zipInput.value || '').replace(/\D/g, '');
      zipResult.className = 'zip-result';

      if (zip.length !== 5) {
        zipResult.textContent = 'Please enter a 5-digit ZIP code.';
        zipResult.classList.add('no');
        zipInput.focus();
        return;
      }
      var served = DFW_PREFIXES.indexOf(zip.slice(0, 3)) !== -1;
      if (served) {
        zipResult.textContent = 'Yes, we serve ' + zip + '. Same-day appointments available.';
        zipResult.classList.add('ok');
      } else {
        zipResult.textContent = zip + ' is outside our regular area. Call (214) 555-0198 — we can usually still help or point you to someone good.';
        zipResult.classList.add('no');
      }
    });
    zipInput.addEventListener('input', function () {
      zipInput.value = zipInput.value.replace(/\D/g, '').slice(0, 5);
    });
  }

  /* ---------- Map: load the Google embed only when the section is near the viewport ---------- */
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

  /* ---------- Booking form (demo: validates, nothing is sent) ---------- */
  var form = $('#book-form');
  var card = $('#form-card');
  if (form && card) {
    var fields = {
      name: $('#f-name'), phone: $('#f-phone'), zip: $('#f-zip'), service: $('#f-service')
    };
    var wrap = function (el) { return el.closest('.field'); };
    var validators = {
      name: function (v) { return v.trim().length >= 2; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 10; },
      zip: function (v) { return /^\d{5}$/.test(v.trim()); },
      service: function (v) { return v !== ''; }
    };
    var validate = function (key) {
      var ok = validators[key](fields[key].value);
      wrap(fields[key]).classList.toggle('invalid', !ok);
      fields[key].setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('blur', function () {
        if (fields[key].value !== '') validate(key);
      });
      fields[key].addEventListener('input', function () {
        if (wrap(fields[key]).classList.contains('invalid')) validate(key);
      });
    });

    // Light phone formatting: (214) 555-0198
    fields.phone.addEventListener('input', function () {
      var d = fields.phone.value.replace(/\D/g, '').slice(0, 10);
      var out = d;
      if (d.length > 6) out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
      else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
      else if (d.length > 0) out = '(' + d;
      fields.phone.value = out;
    });
    fields.zip.addEventListener('input', function () {
      fields.zip.value = fields.zip.value.replace(/\D/g, '').slice(0, 5);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: bots fill hidden fields, people don't.
      var hp = form.querySelector('input[name="company"]');
      if (hp && hp.value) return;

      var firstBad = null;
      Object.keys(fields).forEach(function (key) {
        if (!validate(key) && !firstBad) firstBad = fields[key];
      });
      if (firstBad) { firstBad.focus(); return; }

      var name = fields.name.value.trim().split(/\s+/)[0];
      var phone = fields.phone.value.trim();
      var urgent = fields.service.value === 'emergency' || $('#f-time').value === 'asap';

      $('#success-title').textContent = 'Thanks, ' + name + '. We\u2019ll call ' + phone + ' shortly.';
      $('#success-text').textContent = urgent
        ? 'Urgent requests go straight to dispatch. Expect a call within 15 minutes during business hours. If nobody has reached you in 20 minutes, call (214) 555-0198.'
        : 'Expect a call within 15 minutes during business hours (7 AM \u2013 8 PM, Mon\u2013Sat). Your $25 online discount is already noted on the ticket.';

      card.classList.add('sent');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- Footer year ---------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
