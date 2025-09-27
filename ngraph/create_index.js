var VERSION="6.07.02";

window.onload = function() {
    create_index();
}

function show_ss(os) {
  ["linux", "windows", "mac"].forEach(function(i) {
    document.getElementById("ss_" + i).style.display = "none";
    document.getElementById("btn_" + i).style.color = "initial";
  });
  document.getElementById("ss_" + os).style.display = "inherit";
  document.getElementById("btn_" + os).style.color = "red";
}

function create_dl_link() {
    var base_url, url, mac_ext, win32_ext, win64_ext, src_ext, link_str, ver, ua;
    base_url = "https://github.com/htrb/ngraph-gtk/releases/download/v%VERSION%/ngraph-gtk-%VERSION%";
    mac_ext = "-x86_64.dmg";
    win32_ext = "-win32.zip";
    win64_ext = "-win64.zip";
    src_ext = ".tar.gz";

    url = base_url.replace(/%VERSION%/g, VERSION);

    link_str = "<p>Latest version: " + VERSION + "</p>\n";
    link_str += '<div id="dl">Download:<p id="os"><a href="'

    ua = navigator.userAgent;
    if(ua.indexOf('Mac') != -1) {
	link_str += url + mac_ext + '">macOS</a></p>\n';
	show_ss("mac");
    } else if(ua.indexOf('Win64') != -1) {
	link_str += url + win64_ext + '">Windows (64bit)</a></p>\n';
	show_ss("windows");
    } else if(ua.indexOf('Win32') != -1) {
	link_str += url + win32_ext + '">Windows (32bit)</a></p>\n';
	show_ss("windows");
    } else {
	link_str += url + src_ext + '">source</a></p>\n';
	show_ss("linux");
    }
    link_str += '<p><a href="https://github.com/htrb/ngraph-gtk/releases/latest">他の版</a></p></div>'
    return link_str;
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
}
