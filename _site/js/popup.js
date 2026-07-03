function openWindow(url,title) {
windowspecs='width=1,height=1,toolbar=no,location=1,menubar=no,directories=no,scrollbars=1,status=no, resizable=0'
var width = (screen.availWidth)*0.7;
var height = (screen.availHeight)*0.7;
var heightspeed = 40; // vertical scrolling speed (higher = slower)
var widthspeed = 60;  // horizontal scrolling speed (higher = slower)
var leftdist = (screen.availWidth - width)/2;    // distance to left edge of window
var topdist = (screen.availHeight - height)/2;     // distance to top edge of window

if (window.resizeTo&&navigator.userAgent.indexOf("Opera")==-1) {
var winwidth = (screen.availWidth)*0.7;
var winheight = (screen.availHeight)*0.7;
var sizer = window.open("","","left=" + leftdist + ",top=" + topdist +","+ windowspecs);
for (sizeheight = 1; sizeheight < winheight; sizeheight += heightspeed)
sizer.resizeTo("1", sizeheight);
for (sizewidth = 1; sizewidth < winwidth; sizewidth += widthspeed)
sizer.resizeTo(sizewidth, sizeheight);
sizer.location = url;
}
else
window.open(url,title);
}

