/*
 * REQUEST ANIMATION FRAME POLYFILL
 */

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel


 
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

(function() {

	var bool;
    if(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
      bool = true;
    }

    if (bool) {
		document.documentElement.className += ' touch';
    } else {
		document.documentElement.className += ' no-touch';
    }

})();

// site code
(function($, window, undefined) {

	var Swiper = function( $el ) {

		var $window;
		var slideCount;
		var $countSpan;

		var self = this;

		this._init = function() {

			$window = $(window);
			slideCount = $el.find('img').length;

			this.swiper = new Swipe($el.find('.swipe')[0], {
				speed: 400,
				continuous: true,
				disableScroll: false,
				callback: self._updateIndex
			});

			var controls = self._createControls();
			$el.append(controls);
			$countSpan = $el.find('.counter');

			self._events();
			self._registerSwiper();
		};

		this._registerSwiper = function() {

			var $post = $el.closest('.post');

			window.swipers = window.swipers || {};
			window.swipers[ $post.attr('id') ] = this.swiper;
			$post.data('hasSwiper', true);

		};

		this._createControls = function() {

			var html = '<p class="controls"><a href="#" class="prev inactive">Prev</a> / ';
				html += '<a href="#" class="next">Next</a> ';
				html += '(<span class="counter">1</span> of '+slideCount+')</p>';

			return html;

		};

		this._updateIndex = function(index) {

			$el.find('.inactive').removeClass('inactive');
			$countSpan.text(index+1);

			if ( index === 0 ) {
				$el.find('.prev').addClass('inactive');
			} else if ( index === (slideCount-1) ) {
				$el.find('.next').addClass('inactive');
			}

		};

		this._prevSlide = function() {

			self.swiper.prev();

		};

		this._nextSlide = function() {

			self.swiper.next();

		};

		this._events = function() {

			$el.on('click', '.prev', function(e) {
				e.preventDefault();
				self._prevSlide();
			});

			$el.on('click', '.next', function(e) {
				e.preventDefault();
				self._nextSlide();
			});

			$el.on('click', 'img', self._nextSlide);

		};

		this._init();

		return false;

	};

	var Angelo = function() {

		var $window;
		var $html;
		var $posts;
		var $headerWrap;
		var $arrow;
		var $toggleClasses;
		var $sharers;
		var viewportHeight;

		var STICKY_NAV_DISTANCE = 107;
		var TRANSITION_DURATION = 300;

		var stickyNavOn = false;
		var ticking = false;

		var posts = [];
		var postsLength;

		var firstLoadId;

		var self = this;

		this._init = function() {

			$window = $(window);
			$html = $('html').eq(0);
			$posts = $('.post');
			$headerWrap = $('#headerwrap');
			$arrow = $('#arrow');
			$toggleClasses = $('[data-toggleClasses]');
			$sharers = $('[data-sharer]');
			viewportHeight = $window.outerHeight();

			self._createSwipers();
			self._getPostDistances();
			self._events();

			if ( window.location.hash && window.location.hash !== '#/' ) {
				firstLoadId = window.location.hash.replace('#/','');
				self._scrollTo( firstLoadId );
				self._initialHeaderLoad();
			} else {
				setTimeout(function() {
					self._scrollPostUpdate(0);
					self._initialHeaderLoad();
				}, 500);
			}

		};

		this._initialHeaderLoad = function() {

			$html.addClass('site-loaded');
			setTimeout(function() { $html.removeClass('site-loading'); }, TRANSITION_DURATION );

		};

		this._createSwipers = function() {

			var $swipers = $('.swipe-container');

			for ( var i = 0, len = $swipers.length; i < len; i++ ) {

				var swiper = new Swiper($swipers.eq(i));

			}

		};

		this._getPostDistances = function() {

			var $post;

			for ( var i = 0, len = $posts.length; i < len; i++ ) {

				$post = $posts.eq(i);

				posts[i] = {
					el: $post,
					id : $post.attr('id'),
					name: $post.find('h1').text(),
					offset : $post.offset().top,
					height: $post.height()
				};

			}

			postsLength = posts.length;

		};

			this._showStickyNav = function() {
	
				$headerWrap.css({ 'position': 'fixed', 'top': '-120px' });
				$arrow.css('opacity','0.9');
	
				stickyNavOn = true;
	
			};
	
			this._hideStickyNav = function() {
	
				$headerWrap.css({ 'position': 'absolute', 'top': '-13px' });
				$arrow.css('opacity','0');
	
				stickyNavOn = false;
	
			};

		this._stickyMenuToggle = function() {

			if ( $html.hasClass('sticky-menu-open') ) {
				$html.removeClass('sticky-menu-open');
				setTimeout(function() { $html.removeClass('sticky-menu-transition'); }, TRANSITION_DURATION);
			} else {
				$html.addClass('sticky-menu-transition sticky-menu-open');
			}

		};

		this._scrollPostUpdate = function( scrollPos ) {

			var hash;
			var name;

			for ( var i = 0; i < postsLength; i++ ) {

				if ( scrollPos < 145 ) {
					hash = '';
					name = '@AngeloWellens - Porfolio';
				} else if ( i === postsLength-1 && scrollPos >= posts[i].offset ) {
					hash = posts[i].id;
					name = posts[i].name + ' - ANGELO WELLENS';
				} else if ( scrollPos >= posts[i].offset && scrollPos < posts[i+1].offset ) {
					hash = posts[i].id;
					name = posts[i].name + ' - ANGELO WELLENS';
				}

				if ( (scrollPos+viewportHeight) > posts[i].offset && scrollPos < (posts[i].offset + posts[i].height) ) {
					posts[i].el.addClass('show-post');
				} else {
					posts[i].el.removeClass('show-post');
				}

			}

			window.location.hash = '/'+hash;
			window.document.title = name;

		};

		this._scrollTo = function( id ) {

			id = id || window.location.hash.replace('#/','');

			var scrollPos = $('#'+id).offset().top + 10;

			$.scrollTo(scrollPos, 500);

		};

		this._scroll = function() {

			scrolledDistance = $window.scrollTop();

			if ( !stickyNavOn && scrolledDistance >= STICKY_NAV_DISTANCE ) {
				self._showStickyNav();
			} else if ( stickyNavOn && scrolledDistance < STICKY_NAV_DISTANCE ) {
				self._hideStickyNav();
				if ( $html.hasClass('sticky-menu-open') ) self._stickyMenuToggle();
			}

			self._scrollPostUpdate(scrolledDistance);

			ticking = false;

		};


		this._toggleClasses = function( $this ) {

			var id = $this.attr('data-toggleClasses').split(',')[0];
			var button = $this.attr('data-toggleClasses').split(',')[1];
			var $post = $this.closest('.post');

			var growDiv = document.getElementById(id);

			if (growDiv.clientHeight != 0) {
				growDiv.style.height = 0;
				$("#"+button+" a").text("VIEW");
				$('html,body').animate({ scrollTop: $(growDiv).offset().top}, 'slow', function() {
				setTimeout(function() {
					var y = $(window).scrollTop();  
					$("html, body").animate({ scrollTop: y + 20 }, 200);
				}, 500);
				});
					
				
				
			} else {
				var wrapper = document.querySelector('.'+id);
				$(growDiv).css({'height' : wrapper.clientHeight + "px"});
				$("#"+button+" a").text("CLOSE");
			}

			setTimeout(function() { self._getPostDistances(); }, 1000);

			// if post has a swiper, set it up again coz dimesions will be skewed when hiding
			// post with CSS transforms
			if ( $post.data('hasSwiper') ) {
				window.swipers[$post.attr('id')].setup();
			}

		};
		
		this._facebook = function( e, $this ) {

			e.preventDefault();

			var link = window.location.href.split('#')[0] + '#/' + $this.closest('.post').attr('id');

            width = 640;
            height = 320;
            pos = newPosition(width, height);

            url = 'https://www.facebook.com/sharer/sharer.php?u=';
            url += encodeURIComponent( link );

            window.open(url, 'fbshare', 'width='+width+', height='+height+', top='+pos.top+', left='+pos.left+', menubar=no, status=no, toolbar=no, ');

		};

		this._twitter = function( e, $this ) {

			e.preventDefault();

			var url;
			var link = window.location.href.split('#')[0] + '#/' + $this.closest('.post').attr('id');
			var title = $this.closest('.post').find('h1').text() + ' - ANGELO WELLENS';

			var width = 550;
			var height = 450;
			pos = newPosition(width, height);

			url = 'https://twitter.com/share?url=' + encodeURIComponent( link ) +
				'&text=' + encodeURIComponent( title ) +
				'&via=Akollectiv';

			window.open(url, '', 'width='+width+', height='+height+', top='+pos.top+', left='+pos.left+', menubar=no, status=no, toolbar=no, ');

		};

		this._events = function() {

			$arrow.on('click', self._stickyMenuToggle);

			$window.on('scroll', function() {

				if( !ticking ) {
					requestAnimationFrame(self._scroll);
					ticking = true;
				}

			});

			$window.on('load', function() {

				setTimeout(self._getPostDistances, TRANSITION_DURATION);
				if ( firstLoadId ) self._scrollTo( firstLoadId );

			});

			$toggleClasses.on('click', function(e) {

				e.preventDefault();

				var $this = $(this);

				self._toggleClasses($this);

				$this.blur();

			});

			$sharers.on('click', function(e) {

				e.preventDefault();

				var $this = $(this);

				switch ( $this.attr('data-sharer') ) {
					case 'facebook': self._facebook( e, $this ); break;
					case 'twitter': self._twitter( e, $this ); break;
				}

				$this.blur();

			});

		};

		function newPosition(width, height) {

			var position = {};

			width = parseInt(width, 10) || 500;
			height = parseInt(height, 10) || 500;

			position.left = ( screen.width / 2 ) - ( width / 2 );
			position.top = ( screen.height / 2 ) - ( height / 2 );

			return position;

		}

		this._init();

		return false;

	};

	$(function() {

		if ( $('body').attr('data-page') !== 'about' ) {
			var angelo = new Angelo();
		} else {
			$('html').addClass('site-loaded');
			setTimeout(function() { $('html').removeClass('site-loading'); }, 300 );
			$('.post').addClass('show-post');
		}

	});

})(jQuery, window);