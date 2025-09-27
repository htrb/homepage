function Display(w, h, code){
  this.width = w;
  this.height = h;
  if(code == 0){
    this.WidthRefChar = "M";
    this.HeightRefChar = "M";
  }else{
    this.WidthRefChar = "¡±";
    this.HeightRefChar = "|";
  }
  this.space = "&nbsp;"
}

Display.prototype.createDisplay = function (){
  var w = this.width;
  var h = this.height;
  var s;

  document.writeln('<table id="display" border="0" cellspacing="0" cellpadding="0">');
  for(var j = 0; j < h; j++){
    s = '<tr>';
    for(var i = 0; i < w; i++){
      s += '<td>' + this.space + '<\/td>';
    }
    document.writeln(s + '<td><font color="white">' + this.HeightRefChar + '<\/font><\/td><\/tr>\n');
  }

  s = '<tr>';
  for(var i = 0; i < w; i++){
    s += '<td><font color="white">' + this.WidthRefChar + '<\/font><\/td>';
  }
  document.writeln(s + '<td><font color="white">' + this.HeightRefChar + '<\/font><\/td><\/tr>\n');

  document.writeln('<\/table\n>');
  this.display = document.getElementById("display");
}

Display.prototype.mvAddChar = function (x, y, c){
  if(x < 0 || x >= this.width || y < 0 || y >= this.height) return;
  var node = this.display.rows[y].cells[x].firstChild;
  if(node.nodeValue != c){
     node.nodeValue = c;
    //node.removeChild(node.firstChild);
    //node.appendChild(document.createTextNode(c));
  }
}

Display.prototype.clearDisplay = function(){
  var w = this.width;
  var h = this.height;

  for(var j = 0; j < h; j++){
    for(var i = 0; i < w; i++){
      this.mvAddChar(i, j, " ");
    }
  }
}
