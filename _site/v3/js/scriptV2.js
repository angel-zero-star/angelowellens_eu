var isMenuOpen = false;
  
jQuery(document).ready(function() {

	var scrollTop = window.innerHeight;
	var background = $(".bg-video");
	var center = $("#center");
	var menu = $("#menu");
	var title = $("h1");
	var previousScroll = 0;
	
	//alert(scrollTop);
	var SCROLL_THRESHOLD = 0;
	
    
    var hasScroll = false;
    var menuHidden = false;
    
    $( "#m-bg").height(0);
    
    window.addEventListener("scroll", function(e) {
    	background.css({
	    	"-webkit-transform": "translateY(" + window.scrollY * -0.2 + "px)",
	    	"transform": "translateY(" + window.scrollY * -0.2 + "px)"
    	});
    	
    	center.css({
	    	"-webkit-transform": "translateY(" + window.scrollY * 0.5 + "px)",
	    	"transform": "translateY(" + window.scrollY * 0.5 + "px)"
    	});

    	
    	/*if(window.scrollY > previousScroll) {
	    	menu.addClass("menu-hide");
    	} else {
	    	menu.removeClass("menu-hide");
    	}*/
    	
    	previousScroll = window.scrollY;
    	
        if(window.scrollY > window.innerHeight+15) {
            if(hasScroll) return
            hasScroll = true;
            menu.addClass("menu-fix");
 
          
        } else {
            if(!hasScroll) return
            hasScroll = false;
            menu.removeClass("menu-fix");
        }
    });
 //-------------- scroll -------------------------------      



 //-------------- menu -------------------------------  
 	document.querySelector( "#nav-toggle" )
 	.addEventListener( "click", function() {
    this.classList.toggle( "active" );
  });
 	// Enable the API on each Vimeo video
    jQuery('iframe.vimeo').each(function(){
        Froogaloop(this).addEvent('ready', ready);
    });
    
    function ready(playerID){
        // Add event listerns
        //Froogaloop(playerID).addEvent('play', play(playerID));
           
    }
});
    
    function play(playerID){
    	$("#cross").fadeIn(200);
    	$("#showreel").addClass("vimeo-alt");
    	Froogaloop(playerID).api('play');
    	
    	$("html,body").animate({
          scrollTop: 0
        }, 500);
    	
        //alert(playerID + " is playing!!!");
    }
    
       function stop(playerID){
    	$("#showreel").removeClass("vimeo-alt");
    	$("#cross").fadeOut(200);
    	Froogaloop(playerID).api('pause');
    	
    	
    	
        //alert(playerID + " is playing!!!");
    }

 function menu(){
	 
	 if(window.scrollY < window.innerHeight) {
		 $("html,body").animate({
	          scrollTop: window.innerHeight
	        }, 500);
	 }

    if ( $( "#m-bg").is(":visible")) {
    	isMenuOpen = false;
    	enableScroll();
         $( "#m-bg").animate({ height: 0 }, function(){ $(this).hide(); });
    } else {
    	isMenuOpen = true;
    	disableScroll();
         $( "#m-bg").show().animate({
            height: "100%"
        });
    }
    //console.log("isMenuOpen", isMenuOpen);
  }
  
function close() { 
	//$( "#content").fadeOut( "fast", function() {
		$( "#overlay" ).fadeOut( "fast", function() {
		$("body").css( "overflow-y", "scroll" );
		$('#remove').remove();
		});  
	//});  
}

function disableScroll() {
	window.onmousewheel = document.onmousewheel = function(e) {
	    e = e || window.event;
	    if (e.preventDefault)
	        e.preventDefault();
	    e.returnValue = false;
	};
}

function enableScroll() {
	window.onmousewheel = document.onmousewheel = null;
}

var $black_white = $('.black_white'),
		img_width = $('.black_white img').width(),
		init_split = Math.round(img_width/2);
  
  $black_white.width(init_split);  

		$('.before_after_slider').mousemove(function(e){
		var offX  = (e.offsetX || e.clientX - $black_white.offset().left);
			$black_white.width(offX);
		});

		$('.before_after_slider').mouseleave(function(e){
		$black_white.stop().animate({
		width: init_split
		},1000)
		});

$(".more").hover(function() {
   $(".square").toggleClass("move");
});

