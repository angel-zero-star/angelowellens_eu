(function($){
	console.log("split debug");

  $.fn.twentytwenty = function(options) {
    var options = $.extend({default_offset_pct: 0.5, orientation: 'horizontal', before_label: 'Before', after_label: 'After', no_overlay: false}, options);
    return this.each(function() {

      var sliderPct = options.default_offset_pct;
      var container = $(this);
      var sliderOrientation = options.orientation;
      var beforeDirection = (sliderOrientation === 'vertical') ? 'down' : 'left';
      var afterDirection = (sliderOrientation === 'vertical') ? 'up' : 'right';


      container.wrap("<div class='twentytwenty-wrapper twentytwenty-" + sliderOrientation + "'></div>");
      if(!options.no_overlay) {
        container.append("<div class='twentytwenty-overlay'></div>");
      }
      // either side can be a <video> (a looping screen recording) as well as an <img>
      var media = container.find("img, video");
      var beforeImg = media.first();
      var afterImg = media.last();
      container.append("<div class='twentytwenty-handle'></div>");
      var slider = container.find(".twentytwenty-handle");
      slider.append("<span class='twentytwenty-" + beforeDirection + "-arrow'></span>");
      slider.append("<span class='twentytwenty-" + afterDirection + "-arrow'></span>");
      container.addClass("twentytwenty-container");
      beforeImg.addClass("twentytwenty-before");
      afterImg.addClass("twentytwenty-after");

/*
      var overlay = container.find(".twentytwenty-overlay");
      overlay.append("<div class='twentytwenty-before-label' data-content='"+options.before_label+"'></div>");
      overlay.append("<div class='twentytwenty-after-label' data-content='"+options.after_label+"'></div>");
*/

      var calcOffset = function(dimensionPct) {
        var w = beforeImg.width();
        var h = beforeImg.height();
        return {
          w: w+"px",
          h: h+"px",
          cw: (dimensionPct*w)+"px",
          ch: (dimensionPct*h)+"px"
        };
      };

      // clip-path rather than clip: Safari ignores clip on a <video>, which
      // then shows through on both sides of the handle
      var cut = function(el, t, r, b, l) {
        el.css({ clip: "auto", "clip-path": "inset(" + t + "px " + r + "px " + b + "px " + l + "px)", "-webkit-clip-path": "inset(" + t + "px " + r + "px " + b + "px " + l + "px)" });
      };
      var adjustContainer = function(offset) {
        var w = parseFloat(offset.w), h = parseFloat(offset.h), cw = parseFloat(offset.cw), ch = parseFloat(offset.ch);
      	if (sliderOrientation === 'vertical') {
          cut(beforeImg, 0, 0, h - ch, 0);
          cut(afterImg, ch, 0, 0, 0);
      	}
      	else {
          cut(beforeImg, 0, w - cw, 0, 0);
          cut(afterImg, 0, 0, 0, cw);
    	}
        container.css("height", offset.h);
      };

      var adjustSlider = function(pct) {
        var offset = calcOffset(pct);
        slider.css((sliderOrientation==="vertical") ? "top" : "left", (sliderOrientation==="vertical") ? offset.ch : offset.cw);
        adjustContainer(offset);
      };

      $(window).on("resize.twentytwenty", function(e) {
        adjustSlider(sliderPct);
      });

      var offsetX = 0;
      var offsetY = 0;
      var imgWidth = 0;
      var imgHeight = 0;
      
      slider.on("movestart", function(e) {
        if (((e.distX > e.distY && e.distX < -e.distY) || (e.distX < e.distY && e.distX > -e.distY)) && sliderOrientation !== 'vertical') {
          e.preventDefault();
        }
        else if (((e.distX < e.distY && e.distX < -e.distY) || (e.distX > e.distY && e.distX > -e.distY)) && sliderOrientation === 'vertical') {
          e.preventDefault();
        }
        container.addClass("active");
        offsetX = container.offset().left;
        offsetY = container.offset().top;
        imgWidth = beforeImg.width(); 
        imgHeight = beforeImg.height();          
      });

      slider.on("moveend", function(e) {
        container.removeClass("active");
      });

      slider.on("move", function(e) {
        if (container.hasClass("active")) {
          sliderPct = (sliderOrientation === 'vertical') ? (e.pageY-offsetY)/imgHeight : (e.pageX-offsetX)/imgWidth;
          if (sliderPct < 0) {
            sliderPct = 0;
          }
          if (sliderPct > 1) {
            sliderPct = 1;
          }
          adjustSlider(sliderPct);
        }
      });

      container.find("img, video").on("mousedown", function(event) {
        event.preventDefault();
      });

      // a video only knows its height once its metadata is in
      media.filter("video").on("loadedmetadata", function() { adjustSlider(sliderPct); });
      $(window).trigger("resize.twentytwenty");
    });
  };

})(jQuery);
