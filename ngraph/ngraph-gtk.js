var VERSION="6.09.10";
var IMAGE_FILE_URL = {};
var OS = ["linux", "windows", "mac"];

window.onload = function() {
    init_image_file_url();
    create_index();
}

function init_image_file_url() {
    var i, n;
    var prefix = "link_";
    n = OS.length;
    for (i = 0; i < n; i ++) {
	IMAGE_FILE_URL[OS[i]] = document.getElementById(prefix + OS[i]).href;
    }
}

function show_ss(os) {
  OS.forEach(function(i) {
      if (i == os) {
//	document.getElementById("ss_" + i).style.display = "inherit";
//	document.getElementById("ss_" + i).style.visibility = "visible";
	document.getElementById("ss_" + i).style.opacity = "1";
	document.getElementById("btn_" + i).style.color = "#6f6";
	document.getElementById("btn_" + i).style.textShadow = "0px 0px 1px #cfc";
	document.getElementById("link_mac").href = IMAGE_FILE_URL[i];
      } else {
//	document.getElementById("ss_" + i).style.display = "none";
//	document.getElementById("ss_" + i).style.visibility = "hidden";
	document.getElementById("ss_" + i).style.opacity = "0";
	document.getElementById("btn_" + i).style.color = "black";
	document.getElementById("btn_" + i).style.textShadow = "none";
      }
    });
}

function create_dl_link() {
    var base_url, url, mac_ext, win32_ext, win64_ext, src_ext, link_str, ver, ua, snap;
    base_url = "https://github.com/htrb/ngraph-gtk/releases/download/v%VERSION%/ngraph-gtk-%VERSION%";
    mac_ext = ".dmg";
    win32_ext = "-win64.zip";
    win64_ext = "-win64.zip";
    src_ext = ".tar.gz";

    url = base_url.replace(/%VERSION%/g, VERSION);

    link_str = "<p>Latest version: " + VERSION + "</p>\n";
    link_str += '<div id="dl">Download:<p id="os"><a href="'

    snap = "";
    ua = navigator.userAgent;
/*
    if(ua.indexOf('Mac') != -1) {
	link_str += url + "-x86_64" + mac_ext + '">macOS (x86_64)</a></p>\n';
	link_str += '<p id="os"><a href="' + url + "-arm64" + mac_ext + '">macOS (arm64)</a></p>\n';
	show_ss("mac");
	} else
*/
    if(ua.indexOf('Win64') != -1) {
	link_str += url + win64_ext + '">Windows (64bit)</a></p>\n';
	show_ss("windows");
    } else if(ua.indexOf('Win32') != -1) {
	link_str += url + win32_ext + '">Windows (64bit)</a></p>\n';
	show_ss("windows");
    } else if(ua.indexOf('WOW64') != -1) {
	link_str += url + win64_ext + '">Windows (64bit)</a></p>\n';
	show_ss("windows");
    } else {
	link_str += url + src_ext + '">source</a></p>\n';
	show_ss("linux");
	snap = '<p><a href="https://snapcraft.io/ngraph-gtk-htrb"><img alt="Get it from the Snap Store" src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg" /></a></p>';
    }
    link_str += '<p><a href="https://github.com/htrb/ngraph-gtk/releases/latest">他の版</a></p></div>' + snap;
    link_str += '<div class="sf-root" data-id="313819" data-badge="oss-community-choice-black" data-metadata="achievement=oss-community-choice" style="width:125px">';
    link_str += '<a href="https://sourceforge.net/projects/ngraph-gtk/" target="_blank">Ngraph-gtk</a></div>';
    link_str += '<p><a href="https://repology.org/project/ngraph-gtk/versions"><img src="https://repology.org/badge/tiny-repos/ngraph-gtk.svg" alt="Packaging status"></a></p>'

    return link_str;
}

function sf_badge() {
    var sc = document.createElement('script');
    sc.type='text/javascript';
    sc.async=true;
    sc.src='https://b.sf-syn.com/badge_js?sf_id=313819';
    var p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(sc, p);
}

function create_index() {
    var h2, index_div, index_txt, n;

    h2 = document.getElementsByTagName("h2");
    index_txt = '<ul id="navi">\n'
    n = h2.length;
    for (var i = 0; i < n; i++) {
	var str;
	str = h2[i].innerText;
	index_txt += '<li><a href="#' + str + '">' + str + '</a>\n';
	h2[i].innerHTML = '<a name="' + str + '">' + str + '</a>\n';
    }
    index_div = document.getElementById("navi");
    index_div.innerHTML = index_txt + "</ul>\n" + create_dl_link();
    sf_badge();
}
