const VERSION="6.10.00";
const IMAGE_FILE_URL = {};
const OS = ["linux", "windows", "mac"];

window.onload = function() {
    init_image_file_url();
    create_index();
}

function init_image_file_url() {
    const  prefix = "link_";
    const n = OS.length;
    for (let i = 0; i < n; i ++) {
	IMAGE_FILE_URL[OS[i]] = document.getElementById(prefix + OS[i]).href;
    }
}

function show_ss(os) {
  OS.forEach(i => {
      if (i == os) {
//	document.getElementById("ss_" + i).style.display = "inherit";
//	document.getElementById("ss_" + i).style.visibility = "visible";
	document.getElementById(`ss_${i}`).style.opacity = "1";
	document.getElementById(`btn_${i}`).style.color = "#6f6";
	document.getElementById(`btn_${i}`).style.textShadow = "0px 0px 1px #cfc";
	document.getElementById("link_mac").href = IMAGE_FILE_URL[i];
      } else {
//	document.getElementById(`ss_${i}`).style.display = "none";
//	document.getElementById(`ss_${i}`).style.visibility = "hidden";
	document.getElementById(`ss_${i}`).style.opacity = "0";
	document.getElementById(`btn_${i}`).style.color = "black";
	document.getElementById(`btn_${i}`).style.textShadow = "none";
      }
    });
}

function create_dl_link() {
    const base_url = "https://github.com/htrb/ngraph-gtk/releases/download/v%VERSION%/ngraph-gtk-%VERSION%";
    //    const mac_ext = ".dmg";
    const win32_ext = "-win64.zip";
    const win64_ext = "-win64.zip";
    const src_ext = ".tar.gz";

    const url = base_url.replace(/%VERSION%/g, VERSION);

    let link_str = `<p>Latest version: "${VERSION}</p>\n`;
    link_str += '<div id="dl">Download:<p id="os"><a href="'

    let snap = "";
    const ua = navigator.userAgent;
/*
    if(ua.indexOf('Mac') != -1) {
	link_str += url + "-x86_64" + mac_ext + '">macOS (x86_64)</a></p>\n';
	link_str += '<p id="os"><a href="' + url + "-arm64" + mac_ext + '">macOS (arm64)</a></p>\n';
	show_ss("mac");
	} else
*/
    if(ua.indexOf('Win64') != -1) {
	link_str += `${url}${win64_ext}">Windows (64bit)</a></p>\n`;
	show_ss("windows");
    } else if(ua.indexOf('Win32') != -1) {
	link_str += `${url}${win32_ext}">Windows (64bit)</a></p>\n`;
	show_ss("windows");
    } else if(ua.indexOf('WOW64') != -1) {
	link_str += `${url}${win64_ext}">Windows (64bit)</a></p>\n`;
	show_ss("windows");
    } else {
	link_str += `${url}${src_ext}">source</a></p>\n`;
	show_ss("linux");
	snap = '<p><a href="https://snapcraft.io/ngraph-gtk-htrb"><img alt="Get it from the Snap Store" src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg" /></a></p>';
    }
    link_str += `<p><a href="https://github.com/htrb/ngraph-gtk/releases/latest">他の版</a></p></div>${snap}`;
    link_str += '<div class="sf-root" data-id="313819" data-badge="oss-community-choice-black" data-metadata="achievement=oss-community-choice" style="width:125px">';
    link_str += '<a href="https://sourceforge.net/projects/ngraph-gtk/" target="_blank">Ngraph-gtk</a></div>';
    link_str += '<p><a href="https://repology.org/project/ngraph-gtk/versions"><img src="https://repology.org/badge/tiny-repos/ngraph-gtk.svg" alt="Packaging status"></a></p>'

    return link_str;
}

function sf_badge() {
    const sc = document.createElement('script');
    sc.type='text/javascript';
    sc.async=true;
    sc.src='https://b.sf-syn.com/badge_js?sf_id=313819';
    const p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(sc, p);
}

function escapeHTML(string){
    return string.replace(/&/g, '&lt;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "&#x27;");
}

function create_index() {
    const h2 = document.getElementsByTagName("h2");
    let index_txt = '<ul id="navi">\n'
    const n = h2.length;
    for (let i = 0; i < n; i++) {
	const str = escapeHTML(h2[i].innerText);
	index_txt += `<li><a href="#${str}">${str}</a>\n`;
	h2[i].innerHTML = `<a name="${str}">${str}</a>\n`;
    }
    const index_div = document.getElementById("navi");
    index_div.innerHTML = `${index_txt}</ul>\n${create_dl_link()}`;
    sf_badge();
}
