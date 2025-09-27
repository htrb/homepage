#! /usr/bin/ruby
$KCODE = "e"

dat = []

IO.foreach(ARGV[0]) {|l|
  a = l.chomp.split('&')
  next if (a.length != 4)
  dat.push(a.collect{|c| c.strip})
}

File.open(ARGV[1], 'w') {|f|
f.print <<EOF
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html lang="ja">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=euc-jp">
<link rev=made href="mailto:ZXB01226@nifty.ne.jp">
<link rel="stylesheet" title="black" href="black.css" type="text/css">
<link rel="stylesheet" title="white" href="white.css" type="text/css">
<style>
span {color: yellow}
</style>
<title>過去の演奏曲目</title>
</head>
<script language="JavaScript">

/**************************************************************
 データ検索用 JavaScript version 0.3  Copyright (C) H.Ito 2002

 動作確認 : Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.0rc3)
                         Gecko/20020523, build 2002052316

CD() とデータ定義を書き換えれば、そこそこ汎用的に使用可能だと
思います。ライセンスは GPL に従うものとします。
***************************************************************/

JAPANISE = /^ja/.exec(window.navigator.language);

/***************************************************************
  検索項目に応じて変更
****************************************************************/
function CD(date, piece, orchestra, hall){
  this.items = new Object();
  this.items['date']  = date;
  this.items['piece'] = piece;
  this.items['orchestra'] = orchestra;
  this.items['hall']  = hall;
}

CD.prototype.item_name = new Object();
CD.prototype.item_name['date']  = "演奏日";
CD.prototype.item_name['piece'] = "曲目";
CD.prototype.item_name['orchestra'] = "団体";
CD.prototype.item_name['hall']  = "会場";
/***************************************************************/

CD.prototype.item_name['all']    = "全部";


CD.prototype.addMatch = function (node, str, reg, replace){
  var index = 0;

  if(replace){
    while((r = reg.exec(str)) != null){
      if(index < r.index)
	node.appendChild(document.createTextNode(r.input.substring(index, r.index)));
      var span = document.createElement('span');
      span.appendChild(document.createTextNode(r[0]));
      node.appendChild(span);
      index = reg.lastIndex;
    }
    node.appendChild(document.createTextNode(str.substring(index)));
  }else{
    node.appendChild(document.createTextNode(str));
  }
}

CD.prototype.addCol = function (node, str, regexp, replace){
  var reg = /\\n/g;
  var index = 0;

  while((r = reg.exec(str)) != null){
    if(index < r.index)
      this.addMatch(node, r.input.substring(index, r.index), regexp, replace);
      node.appendChild(document.createElement('br'));
    index = reg.lastIndex;
  }
  this.addMatch(node, str.substring(index), regexp, replace);
}

CD.prototype.cdSort = function (cd, key){
  cd.sort(function(x, y){
    var a, b;
    a = x.items[key].toUpperCase();
    b = y.items[key].toUpperCase();
    if(a > b){
      return 1;
    }else if(a < b){
      return -1;
    }else{
      return 0;
    }
  });
}

CD.prototype.initTable = function (table){
  var len = table.rows.length - 1;
  for(i = 0; i < len; i++){
    window.status= "Initialize... " + i + "\/" + len;
    table.deleteRow(1);
  }
}

CD.prototype.writeTable = function (doc, item, regexp, cd){
  var items = this.items;
  var row = 0;
  var col = 0;
  var table = results;
  var found = false;
  var total = cd.length;

  this.initTable(table);
  for(i in cd){
    window.status= "Search... " + i + "\/" + total;
    found = false;
    if(item == 'all'){
      for(j in items){
	if(cd[i].items[j].match(regexp)){
	  found = true;
	  break;
	}
      }
    }else if(cd[i].items[item].match(regexp)){
      found = true;
    }
    if(found){
      row++;
      table.insertRow(row);
      col = 0;
      for(j in items){
	table.rows[row].insertCell(col);
	if(item == 'all' || item == j){
	  this.addCol(table.rows[row].cells[col], cd[i].items[j], regexp, true);
	}else{
	  this.addCol(table.rows[row].cells[col], cd[i].items[j], regexp, false);
	}
	col++;
      }
    }
  }
}

CD.prototype.writeTableAll = function (doc, cd){
  var items = this.items;
  var row = 0;
  var col = 0;
  var table = results;
  var total = cd.length;

  this.initTable(table);
  for(i in cd){
    window.status= "Writing... " + i + "\/" + total;
    row++;
    table.insertRow(row);
    col = 0;
    for(j in items){
      table.rows[row].insertCell(col);
      this.addCol(table.rows[row].cells[col], cd[i].items[j], null, false);
      col++;
    }
  }
}

CD.prototype.replaceCell = function (row, col, str){
  info.rows[row].deleteCell(col)
  info.rows[row].insertCell(col)
  info.rows[row].cells[col].appendChild(document.createTextNode(str));
}

CD.prototype.dispInfo = function (word, item, key, num){
  this.replaceCell(1, 0, word);
  this.replaceCell(1, 1, item);
  this.replaceCell(1, 2, key);
  this.replaceCell(1, 3, num);
}

/******************************************************************
  検索フォーム作成関数
*******************************************************************/
CD.prototype.writeSearchForm = function (){
  var items = this.items;
  var iname = this.item_name;

  document.writeln('<form  onsubmit="writeResultsFromForm(); return false"><table>');
  document.writeln('<tr><td>検索項目:<\/td><td><select name="item">');
  for(i in items){
    document.writeln('<option value="' + i +'"> ' + iname[i] +'<\/option>');
  }
  document.writeln('<option name="item" value="all" selected>' + iname['all'] + '<\/option>')
  document.writeln('<\/select> ');
  document.writeln('(検索結果を<select name="sort">');
  for(i in items){
    document.writeln('<option value="' + i +'"> ' + iname[i] +'<\/option>');
  }
  document.writeln('<\/select>で整列。)<\/td><\/tr>');
  document.writeln('<tr><td>検索語句:<\/td><td><input type="text"  name="word" size="20" maxlength="30">');
  document.writeln('<input type="button" value="search" onclick="writeResultsFromForm()"><\/td><\/tr>');
  document.writeln('<tr><td><\/td><td>');
  document.writeln('<input type="button" value="全てのデータを表示" onclick="writeAllFromForm()">');
  document.writeln('<\/td><\/tr><\/table><\/form>');

  document.writeln('<p><table name="results" id="t2" border="1">');
  document.writeln('<tr><th>検索語<\/th><th>検索項目<\/th><th>整列項目<\/th><th>件数<\/th><\/tr>');
  document.writeln('<tr><td>----<\/td><td>----<\/td><td>----<\/td><td>----<\/td><\/tr>');
  document.writeln('<\/table><\/p>');

  document.writeln('<p><table name="results" id="t1" border="1" class="small">');
  var s = '<tr>';
  for(i in items){
    s += '<th>' + iname[i] + '<\/th>';
  }
  document.writeln(s + '<\/tr>');
  document.writeln('<\/table><\/p>');

  results=document.getElementById("t1");
  info=document.getElementById("t2");
}

/******************************************************************
  検索結果表示関数
*******************************************************************/
CD.prototype.writeResults = function (doc, cd, item, key, word){
  var r = new RegExp(word, "igm");
  var items = this.items;
  var iname = this.item_name;
  var result;
  var date = new Date();

  if(word.length < 1) return;

  this.cdSort(cd, key);
  this.writeTable(doc, item, r, cd);

  this.dispInfo(word, iname[item], iname[key], results.rows.length - 1);
  date = (new Date() - date)/1000;
  window.status= "Search: Done (" + date + " secs).";
}

/******************************************************************
  全データ表示関数
*******************************************************************/
CD.prototype.writeAll = function (doc, cd, key){
  var items = this.items;
  var iname = this.item_name;
  var date = new Date();

  this.cdSort(cd, key);
  this.writeTableAll(doc, cd);
  this.dispInfo("----", "----", iname[key], cd.length);
  date = (new Date() - date)/1000;
  window.status= "Document: Done (" + date + " secs).";
}

/******************************************************************/
  
function writeResultsFromForm(){
  var f = document.forms[0];
  var item = f.item.options[f.item.selectedIndex].value;
  var key = f.sort.options[f.sort.selectedIndex].value;
  cdObj.writeResults(document, cdArray, item, key, f.word.value);
}

function writeAllFromForm(){
  var key = document.forms[0].sort.options[document.forms[0].sort.selectedIndex].value;
  cdObj.writeAll(document, cdArray, key);
}
cdObj = new CD("", "", "", "");
cdArray = new Array();
i=0
EOF

  dat.each{ |l|
    f.print("cdArray[i++] = new CD('#{l[0]}','#{l[1]}','#{l[2]}','#{l[3]}')\n")
  }

f.print <<EOF
</script>
</head>
<body>
<h1>過去の演奏曲目</h1>
<hr>
<script language="JavaScript">
cdObj.writeSearchForm();
</script>
<noscript>
<table class="small" border="1">
<tr><th>日時</th><th>曲目</th><th>団体</th><th>会場</th></tr>
EOF

  dat.each{ |l|
    f.print("<tr><td>#{l[0]}</td><td>#{l[1]}</td><td>#{l[2]}</td><td>#{l[3]}</td></tr>\n")
  }

f.print <<EOF
</table>
</noscript>
<hr>
<p>
動作確認 : Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.0rc3)Gecko/20020523, build 2002052316
</p>
</body>
</html>
EOF
}
