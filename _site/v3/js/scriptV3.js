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
	    	"-webkit-transform": "translateY(" + window.scrollY * -0.5 + "px)",
	    	"transform": "translateY(" + window.scrollY * -0.5 + "px)"
    	});
    	
    	center.css({
	    	"-webkit-transform": "translateY(" + window.scrollY * 0.2 + "px)",
	    	"transform": "translateY(" + window.scrollY * 0.2 + "px)"
    	});

    	
    	/*if(window.scrollY > previousScroll) {
	    	menu.addClass("menu-hide");
    	} else {
	    	menu.removeClass("menu-hide");
    	}*/
    	
    	previousScroll = window.scrollY;
    	
        if(window.scrollY > 15) {
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
    
 
 function menu(){
	 
	 
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

$(".more").hover(function() {
   $(".square").toggleClass("move");
});


