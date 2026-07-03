var isMenuOpen = false;

// ── Circle reveal ──
// The project page opens as a growing circle from the exact click point,
// like ink spreading from where you touched the grid.
var _clickPoint = null;

document.addEventListener('click', function(e) {
  var a = e.target.closest ? e.target.closest('a[href^="javascript:folio"]') : null;
  if (a) _clickPoint = { x: e.clientX, y: e.clientY };
}, true);

function circleReveal() {
  var p = _clickPoint;
  _clickPoint = null;
  if (!p) return;
  var els = [document.getElementById('overlay'), document.getElementById('content')];
  // radius to the farthest viewport corner from the click point
  var r = Math.ceil(Math.hypot(
    Math.max(p.x, window.innerWidth - p.x),
    Math.max(p.y, window.innerHeight - p.y)
  ));
  els.forEach(function(el) {
    if (!el) return;
    el.style.clipPath = 'circle(0px at ' + p.x + 'px ' + p.y + 'px)';
    el.style.webkitClipPath = el.style.clipPath;
    el.style.transition = 'clip-path 0.9s cubic-bezier(0.22,1,0.36,1)';
  });
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      els.forEach(function(el) {
        if (!el) return;
        el.style.clipPath = 'circle(' + r + 'px at ' + p.x + 'px ' + p.y + 'px)';
        el.style.webkitClipPath = el.style.clipPath;
      });
    });
  });
  setTimeout(function() {
    els.forEach(function(el) {
      if (!el) return;
      el.style.clipPath = '';
      el.style.webkitClipPath = '';
      el.style.transition = '';
    });
  }, 1000);
}

// ── Parallax ──
// BG drifts slowly, top layer drifts faster — supports multiple .parallax-section elements.
var _parallaxItems = [];
var _parallaxRafRunning = false;

function initParallax() {
  _parallaxItems = [];
  document.querySelectorAll('.parallax-section').forEach(function(section) {
    var fan = section.querySelector('.phones-fan');
    _parallaxItems.push({
      section: section,
      bg:  section.querySelector('.parallax-bg'),
      top: fan ? null : section.querySelector('.parallax-top'),
      fan: fan ? {
        left:   section.querySelector('.phone-left'),
        center: section.querySelector('.phone-center'),
        right:  section.querySelector('.phone-right')
      } : null
    });
  });
  if (_parallaxItems.length && !_parallaxRafRunning) {
    _parallaxRafRunning = true;
    parallaxLoop();
  }
}

function parallaxLoop() {
  _parallaxItems = _parallaxItems.filter(function(item) { return item.section.isConnected; });
  if (!_parallaxItems.length) {
    _parallaxRafRunning = false;
    return;
  }
  _parallaxItems.forEach(function(item) {
    var rect     = item.section.getBoundingClientRect();
    var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    progress = Math.max(0, Math.min(1, progress));
    var c = progress - 0.5; // -0.5 (entering) .. +0.5 (leaving)
    if (item.bg)  item.bg.style.transform  = 'translateY(' + (c * -80)  + 'px)';
    if (item.top) item.top.style.transform = 'translateY(' + (c * -240) + 'px)';
    if (item.fan) {
      var f = item.fan;
      // Center drifts straight up; side phones lift up AND spread outward as you scroll down.
      if (f.left)   f.left.style.transform   = 'translate(-50%, -42%) translate(' + (c * -90) + 'px, ' + (c * -200) + 'px) rotate(' + (-7 + c * -6) + 'deg)';
      if (f.center) f.center.style.transform = 'translate(-50%, -50%) translateY(' + (c * -190) + 'px) rotate(-1deg)';
      if (f.right)  f.right.style.transform  = 'translate(-50%, -42%) translate(' + (c * 90) + 'px, ' + (c * -200) + 'px) rotate(' + (5 + c * 6) + 'deg)';
    }
  });
  requestAnimationFrame(parallaxLoop);
}

// ── Scroll progress ring / close button (bottom-right) ──
// The arc draws around an × as the page is read; at the end the circle
// fills dark — "you're done, close me". Clicking it closes the project.
function initScrollProgress() {
  var content = document.getElementById('content');
  if (!content) return;
  var old = document.getElementById('scroll-progress');
  if (old) old.remove();

  var size = 44, stroke = 2;
  var c = size / 2;
  var r = (size - stroke) / 2;
  var circ = 2 * Math.PI * r;
  var xo = 6;   // half-size of the ×

  var el = document.createElement('div');
  el.id = 'scroll-progress';
  el.style.cssText =
    'position:fixed;right:26px;top:26px;width:' + size + 'px;height:' + size + 'px;' +
    'cursor:pointer;z-index:999;transition:transform 0.2s ease;';
  el.innerHTML =
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="sp-bg" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#ffffff" ' +
        'stroke="rgba(0,0,0,0.1)" stroke-width="' + stroke + '" style="transition:fill 0.3s ease;"/>' +
      '<circle class="sp-arc" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" ' +
        'stroke="#191919" stroke-width="' + stroke + '" stroke-linecap="round" ' +
        'stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" ' +
        'transform="rotate(-90 ' + c + ' ' + c + ')"/>' +
      '<line class="sp-x" x1="' + (c - xo) + '" y1="' + (c - xo) + '" x2="' + (c + xo) + '" y2="' + (c + xo) + '" ' +
        'stroke="#191919" stroke-width="1.25" stroke-linecap="round" style="transition:stroke 0.3s ease;"/>' +
      '<line class="sp-x" x1="' + (c + xo) + '" y1="' + (c - xo) + '" x2="' + (c - xo) + '" y2="' + (c + xo) + '" ' +
        'stroke="#191919" stroke-width="1.25" stroke-linecap="round" style="transition:stroke 0.3s ease;"/>' +
    '</svg>';
  content.appendChild(el);   // lives inside #content → removed automatically on close
  var arc = el.querySelector('.sp-arc');
  var bg = el.querySelector('.sp-bg');
  var xs = el.querySelectorAll('.sp-x');


  var complete = false, hover = false;
  function paint() {
    var filled = complete || hover;
    bg.style.fill = filled ? '#191919' : '#ffffff';
    xs.forEach(function(l) { l.style.stroke = filled ? '#ffffff' : '#191919'; });
  }

  function update() {
    var max = content.scrollHeight - content.clientHeight;
    var p = max > 0 ? content.scrollTop / max : 0;
    p = Math.max(0, Math.min(1, p));
    arc.style.strokeDashoffset = circ * (1 - p);
    complete = p > 0.985;
    paint();
  }

  el.addEventListener('mouseenter', function() { hover = true; el.style.transform = 'scale(1.08)'; paint(); });
  el.addEventListener('mouseleave', function() { hover = false; el.style.transform = ''; paint(); });
  el.addEventListener('click', function(e) {
    e.stopPropagation();   // #content click also closes — avoid double-close
    close();
  });

  content.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// ── Design approach scroll (pinned split: numbered items + crossfading image) ──
function initApproachScroll() {
  var section = document.querySelector('.approach-scroll');
  if (!section) return;
  var pin = section.querySelector('.approach-pin');
  var items = Array.from(section.querySelectorAll('.approach-item'));
  var imgs = Array.from(section.querySelectorAll('.approach-img'));
  var n = items.length;
  var content = document.getElementById('content');
  if (!content) return;

  var STEP_VH = 55;
  section.style.height = ((n - 1) * STEP_VH + 100) + 'vh';

  // Snap anchors — one per item.
  section.querySelectorAll('.approach-snap').forEach(function(m) { m.remove(); });
  for (var k = 0; k < n; k++) {
    var mk = document.createElement('div');
    mk.className = 'approach-snap';
    mk.style.top = (k * STEP_VH) + 'vh';
    section.appendChild(mk);
  }

  var current = -1;

  function update() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - pin.offsetHeight;
    var progress = total > 0 ? (-rect.top) / total : 0;
    progress = Math.max(0, Math.min(1, progress));

    var active = Math.min(n - 1, Math.round(progress * (n - 1)));
    if (active !== current) {
      current = active;
      items.forEach(function(el, k) { el.classList.toggle('active', k === active); });
      imgs.forEach(function(el, k) { el.classList.toggle('active', k === active); });
    }

    content.classList.toggle('snap-active', progress > 0.002 && progress < 0.998);
  }

  content.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// ── Process carousel (pinned; vertical scroll drives horizontal track travel) ──
function initProcessStack() {
  var section = document.querySelector('.process-stack');
  if (!section) return;
  var pin = section.querySelector('.stack-pin');
  var viewport = section.querySelector('.stack-viewport');
  var track = section.querySelector('.stack-track');
  var cards = Array.from(section.querySelectorAll('.stack-card'));
  var captions = Array.from(section.querySelectorAll('.stack-caption-item'));
  var n = cards.length;
  var content = document.getElementById('content');
  if (!content) return;
  var current = -1;
  var STEP_VH = 55;   // vertical scroll per image (one snap gesture)
  var wrap = document.getElementById('wrap_project');

  // Build the scroll runway + one snap anchor per image.
  section.style.height = ((n - 1) * STEP_VH + 100) + 'vh';
  section.querySelectorAll('.stack-snap').forEach(function(m) { m.remove(); });
  for (var k = 0; k < n; k++) {
    var mk = document.createElement('div');
    mk.className = 'stack-snap';
    mk.style.top = (k * STEP_VH) + 'vh';
    section.appendChild(mk);
  }

  // Card width = text column width (.project-details, max-width 780px).
  function sizeCards() {
    var details = document.querySelector('.project-details');
    var cw = details ? details.clientWidth : (wrap ? wrap.clientWidth : viewport.clientWidth);
    cards.forEach(function(c) { c.style.width = Math.round(cw) + 'px'; });
  }
  sizeCards();

  // translateX that centres card i in the viewport
  function targetX(i) {
    var card = cards[i];
    return -(card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function update() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - pin.offsetHeight;   // scroll distance while pinned
    var progress = total > 0 ? (-rect.top) / total : 0;
    progress = Math.max(0, Math.min(1, progress));

    // Interpolate the track toward the target image; snapping lands progress on
    // exact per-image steps, so the track settles each image dead-centre.
    var seg = progress * (n - 1);
    var i = Math.min(n - 2, Math.floor(seg));
    var f = seg - i;
    var e = smooth(f);
    var x = n > 1 ? targetX(i) + (targetX(i + 1) - targetX(i)) * e : targetX(0);
    track.style.transform = 'translateX(' + x + 'px)';

    var active = n > 1 ? Math.round(seg) : 0;
    if (active !== current) {
      current = active;
      cards.forEach(function(c, k) { c.classList.toggle('active', k === active); });
      captions.forEach(function(c, k) { c.classList.toggle('active', k === active); });
    }

    // Enable native snap only while travelling between the first and last image,
    // so the page scrolls normally before/after (and never traps on the last marker).
    content.classList.toggle('snap-active', progress > 0.002 && progress < 0.998);
  }

  content.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', function() { sizeCards(); update(); });
  update();
}

// ── Scroll reveal ──
function initReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('#wrap_project .breakout:not(.gif-grid):not(.process-stack):not(.approach-scroll)').forEach(function(el) {
    el.classList.add('reveal');
    observer.observe(el);
  });

  var grid = document.querySelector('.gif-grid');
  if (!grid) return;
  var cells = grid.querySelectorAll('.gif-cell');
  cells.forEach(function(cell) { cell.classList.add('reveal'); });
  var gridObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      var rect = grid.getBoundingClientRect();
      var base = rect.top < window.innerHeight * 0.5 ? 1000 : 0;
      cells.forEach(function(cell, i) {
        setTimeout(function() { cell.classList.add('revealed'); }, base + i * 150);
      });
      gridObserver.disconnect();
    }
  }, { threshold: 0.08 });
  gridObserver.observe(grid);
}

// ── Counter animation ──
function initCounters() {
  function animateCounter(el) {
    var text = el.textContent.trim();
    // Capture any non-numeric prefix (#, +) and suffix (K, k, M, %, +, M+ …).
    var m = text.match(/^([^\d.]*)([\d.,]+)(.*)$/);
    if (!m) return;
    var prefix = m[1];
    var numStr = m[2].replace(/,/g, '');
    var suffix = m[3];
    var target = parseFloat(numStr);
    if (isNaN(target)) return;
    var decimals = numStr.indexOf('.') >= 0 ? numStr.split('.')[1].length : 0;
    var duration = 1400, startTime = null;
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      if (!startTime) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      el.textContent = prefix + (target * easeOut(p)).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = prefix + (0).toFixed(decimals) + suffix;
    requestAnimationFrame(step);
  }
  var grid = document.querySelector('.stats-grid');
  if (!grid) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-value').forEach(animateCounter);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(grid);
}

// ── Video autoplay on scroll ──
function initVideoObserver() {
  var video = document.querySelector('video.project-video');
  if (!video) return;
  video.muted = true;
  var vo = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { video.play(); } else { video.pause(); }
    });
  }, { threshold: 0.3 });
  vo.observe(video);
}

jQuery(document).ready(function() {
  var scrollTop = window.innerHeight;
  var background = $(".bg-video");
  var center = $("#center");
  var menu = $("#menu");
  var topbar = $("#topbar");
  var title = $("h1");
  var toggleM = $("#nav-toggle");

  var previousScroll = 0;

  //alert(scrollTop);
  var SCROLL_THRESHOLD = 0;

  var hasScroll = false;
  var menuHidden = false;

  $("#m-bg").height(0);

  var introEl = document.getElementById("intro");
  var logoEl = document.getElementById("logo_small");
  var rafPending = false;

  window.addEventListener("scroll", function(e) {
    previousScroll = window.scrollY;

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(function() {
        var sy = window.scrollY;
        var t = "translate3d(0px," + sy * -0.2 + "px,0px)";
        var t2 = "translate3d(0px," + sy * -0.1 + "px,0px)";
        if (introEl) { introEl.style.webkitTransform = t; introEl.style.transform = t; }
        if (logoEl)  { logoEl.style.webkitTransform  = t2; logoEl.style.transform  = t2; }

        if (sy > 420) {
          if (!hasScroll) {
            hasScroll = true;
            menu.addClass("menu-fix");
            topbar.show();
            toggleM.addClass("toggleS");
          }
        } else {
          if (hasScroll) {
            hasScroll = false;
            menu.removeClass("menu-fix");
            topbar.hide();
            toggleM.removeClass("toggleS");
          }
        }
        rafPending = false;
      });
    }
  }, { passive: true });
  //-------------- scroll -------------------------------

  //-------------- menu -------------------------------
  
    if (!isRootPath()) {
    	var url = window.location.pathname.substr(1, window.location.pathname.length);
    	setTimeout(function() {
	    	folio(url, 'content', false);
    	}, 500);
    }
    
    window.onpopstate = function (event) {
	    var isRoot = isRootPath();
	    if (isRoot) {
		    close(false);
	    } else if (!isRoot && event.state.url) {
		    folio(event.state.url, 'content', false);
	    }
	    
	    if (event.state && event.state.title) {
		    document.title = event.state.title;
	    }
    }
});

function isRootPath() {
	var path = window.location.pathname;
    return path === '/' || path === ''; 
}

function menu() {
  if ($("#m-bg").is(":visible")) {
    isMenuOpen = false;
    /* enableScroll(); */
    $("#m-bg").animate({ height: 0 }, function() {
      $(this).hide();
    });
  } else {
    isMenuOpen = true;
    /* disableScroll(); */
    $("#m-bg")
      .show()
      .animate({
        height: "100%"
      });
    folio("about", "content");
  }
  //console.log("isMenuOpen", isMenuOpen);
}

function disableScroll() {
  window.onmousewheel = document.onmousewheel = function(e) {
    e = e || window.event;
    if (e.preventDefault) e.preventDefault();
    e.returnValue = false;
  };
}

function enableScroll() {
  window.onmousewheel = document.onmousewheel = null;
}

function loadFolio(url, target) {
  $("body").append('<div id="remove"><div id="content"></div></div>');
  circleReveal();
  $("#overlay").fadeIn("fast", function() {
    $("body").css("overflow", "hidden");
    $("#content").fadeIn("slow", function() {
      //document.getElementById(target).innerHTML = 'sending...';
      if (window.XMLHttpRequest) {
        req = new XMLHttpRequest();
        req.onreadystatechange = function() {
          folioDone(target);
        };
        req.open("GET", url, true);
        req.send(null);
        // IE/Windows ActiveX version
      } else if (window.ActiveXObject) {
        req = new ActiveXObject("Microsoft.XMLHTTP");
        if (req) {
          req.onreadystatechange = function() {
            folioDone(target);
          };
          req.open("GET", url, true);
          req.send();
        }
      }
    });
  });
}

// LOAD PROJECT
function folio(url, target, push = true) {
  loadFolio('/projects/' + url + '/' + url + '.html?v=' + Date.now(), target);
  var title = '@AngeloWellens | ' + url;
  document.title = title;
  if (push) {
	  window.history.pushState({ title: title, url: url }, title, '/' + url);
  }
}

function folioDone(target) {
	console.log('--- folio done', target);
  // only if req is "loaded"
  if (req.readyState == 4) {
    // only if "OK"
    if (req.status == 200) {
      results = req.responseText;
      document.getElementById(target).innerHTML = results;
      setTimeout(function() {
        $(".scroll").fadeIn();
      }, 100);

      setTimeout(function() {
        /* 				window.location.hash='#test'; */
        $(".twentytwenty-container[data-orientation!='vertical']")
          .delay(0)
          .twentytwenty({ default_offset_pct: 0.2 });
        $("#loader2").fadeOut();
        initParallax();
        initCounters();
        initVideoObserver();
        initReveal();
        initApproachScroll();
        initProcessStack();
        initScrollProgress();
        $("#wrap_project")
          .delay()
          .addClass("project-alt");
        $("#wrap_project2")
          .delay()
          .addClass("project-alt");
        $("#wrap_project3")
          .delay()
          .addClass("project-alt");
        $("#wrap_project4")
          .delay()
          .addClass("project-alt");
      }, 1500);

      $("#content img").on("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      });
      $("#content p").on("click", function(e) {
        /* e.preventDefault(); */
        e.stopImmediatePropagation();
      });
      $(".twentytwenty-container").on("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      });
      $("#content video").on("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      });

      $("#content").on("click", function(e) {
        close();
      });
      $("body").on("mousemove", function(e) {
        if (e.pageX > window.innerWidth - 30) {
          $("#content").css({ cursor: "default" });
        } else {
          $("#content").css({ cursor: "" });
        }
      });
    } else {
      document.getElementById(target).innerHTML =
        "jah error:\n" + req.statusText;
    }
  }
}

function close(clear = true) {
  if (clear) {
    var title = '@AngeloWellens | Portfolio';
    if (window.history.state) {
    	window.history.go(-1);
    } else {
	    window.history.pushState({ title: title, url: '/' }, title, '/');
    }
  	document.title = title;
  }

  $("#content").fadeOut("fast", function() {
    $("body").css("overflow-y", "scroll");
    $("#overlay").fadeOut("slow", function() {
      $("#remove").remove();
    });
  });
}

// ESC closes an open project (not the menu — that has its own toggle).
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && !isMenuOpen && document.getElementById('remove')) {
    close();
  }
});
