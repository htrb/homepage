/* 
 * Copyright (C) 2003, Hiroyuki Ito. ZXB01226@nifty.com
 * 
 * "JSGraph" is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation; either version 2 of the License,
 * or (at your option) any later version.
 * 
 * "JSGraph" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 * 
 */

/* $Id: jsgraph.js,v 1.11 2005/04/07 04:33:10 hito Exp $ */

/**********************************************************************
Global variables.
***********************************************************************/
Is_mouse_down = false;
Mouse_x = 0;
Mouse_y = 0;
Mouse_position = 0;
Edge_width = 30;
Font_size = 16; /* px */

if (window.addEventListener) {
  document.create_element = function (e) {
    return this.createElement(e);
  }
  IE = false;
} else {
  document.create_element = function (e) {
    var element;
    element = this.createElement(e);
    element.addEventListener = function (ev, fun) {
      this["on" + ev] = fun;
    }
    return element;
  }
  IE = true;
}

Math.log10 = function(x) {
  return this.log(x) / this.LN10;
}

/**********************************************************************
Event Handlers.
***********************************************************************/
function change_curser (node, x, y) {
  var width  = parseInt(node.style.width);
  var height = parseInt(node.style.height);
  var cursor = node.style.cursor;

  if (x >= Edge_width && width - x >= Edge_width &&
      y >= Edge_width && height - y >= Edge_width &&
      cursor != 'auto') {
    node.style.cursor='auto';
    return;
  } else if (y < Edge_width) {
    if (x < Edge_width) {
      node.style.cursor = 'nw-resize';
    } else if (width - x < Edge_width) {
      node.style.cursor = 'ne-resize';
    } else {
      node.style.cursor = 'n-resize';
    }
  } else if (height - y < Edge_width) {
    if (x < Edge_width) {
      node.style.cursor = 'sw-resize';
    } else if (width - x < Edge_width) {
      node.style.cursor = 'se-resize';
    } else {
      node.style.cursor = 's-resize';
    }
  } else if (x < Edge_width) {
    node.style.cursor = 'w-resize';
  } else if (width - x < Edge_width) {
    node.style.cursor = 'e-resize';
  }
}

function resize_move (node, x, y) {
  var width  = parseInt(node.style.width);
  var height = parseInt(node.style.height);
  var left   = parseInt(node.style.left);
  var top    = parseInt(node.style.top);

  switch (Mouse_position) {
  case 1:
    node.style.left = (left + x) + 'px';
    node.style.top = (top + y) + 'px';
    node.style.width = (width - x) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 2:
    node.style.top = (top + y) + 'px';
    node.style.width = (width + x) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 3:
    node.style.width = (width + x) + 'px';
    node.style.height = (height + y) + 'px';
    break;
  case 4:
    node.style.left = (left + x) + 'px';
    node.style.width = (width - x) + 'px';
    node.style.height = (height + y) + 'px';
    break;
  case 5:
    node.style.top = (top + y) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 6:
    node.style.width = (width + x) + 'px';
    break;
  case 7:
    node.style.height = (height + y) + 'px';
    break;
  case 8:
    node.style.left = (left + x) + 'px';
    node.style.width = (width - x) + 'px';
    break;
  default:
    node.style.left = (left + x) + 'px';
    node.style.top = (top + y) + 'px';
  }
}

function move (node, x, y) {
  var left = parseInt(node.style.left);
  var top  = parseInt(node.style.top);

  node.style.left  = (left + x) + 'px';
  node.style.top = (top + y) + 'px';
  node.offset_x += x;
  node.offset_y += y;
}

function mouse_resize_move_dom (e) {
  var x, y, is_frame = false;

  if (IE) {
    e = window.event;
  }

  if (Is_mouse_down) {
    resize_move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
    if (this.frame) {
      if (this.firstChild) {
	if (this.style.cursor != 'move') {
	  this.style.cursor = this.frame.style.cursor;
	}
	this.removeChild(this.firstChild);
      }
      this.graph.update_position();
    }

    return;
  }

  if (IE) {
    x = e.offsetX;
    y = e.offsetY;
    if (e.srcElement.tagName == 'DIV' && this.parent_frame) {
      is_frame = true;
    }
  } else {
    x = e.layerX;
    y = e.layerY;
    if (e.currentTarget == e.target && this.parent_frame) {
      is_frame = true;
    }
  }

  if (is_frame) {
    window.status= "X: " + this.graph.get_data_x(x).toExponential(8) +
      "  Y: " + this.graph.get_data_y(y).toExponential(8);
    change_curser(this, x, y);
  } else {
    this.style.cursor='auto';
  }
}

function mouse_move_dom (e) {
  if (IE) {
    e = window.event;
  }
  if (Is_mouse_down) {
    move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
  }
}

function mouse_down_dom (e) {
  var x, y;
  var width  = parseInt(this.style.width);
  var height = parseInt(this.style.height);

  if (IE) {
    e = window.event;
    x = e.offsetX;
    y = e.offsetY;
    if (e.button != 1) {
      return;
    }
  } else {
    x = e.layerX;
    y = e.layerY;
    if (e.button != 0) {
      return;
    }
  }

  Mouse_x = e.clientX;
  Mouse_y = e.clientY;
  if (x < Edge_width && y < Edge_width) {
    Mouse_position = 1;
  } else if (width - x < Edge_width && y < Edge_width) {
    Mouse_position = 2;
  } else if (width - x < Edge_width && height - y < Edge_width) {
    Mouse_position = 3;
  } else if (x < Edge_width && height - y < Edge_width) {
    Mouse_position = 4;
  } else if (y < Edge_width) {
    Mouse_position = 5;
  } else if (width - x < Edge_width) {
    Mouse_position = 6;
  } else if (height - y < Edge_width) {
    Mouse_position = 7;
  } else if (x < Edge_width) {
    Mouse_position = 8;
  } else {
    Mouse_position = 0;
    this.style.cursor='move';
  }

  Is_mouse_down = true;
}

function mouse_up_dom (e) {
  if (this.graph && Is_mouse_down) {
    if (!this.firstChild) {
      this.appendChild(this.frame);
    }
    if (Mouse_position != 0) {
      this.graph.clear();
      this.graph.draw();
    } else {
      this.graph.update_position();
    }
  }
  Is_mouse_down = false;
}

function mouse_over_dom (e) {
  this.style.cursor='move';
}

/**********************************************************************
Definition of Text Object.
***********************************************************************/

function Text(s) {
  var text = document.createElement('span');

  text.style.position = 'absolute';
  text.style.fontSize = Font_size + 'px';
  text.innerHTML = s;
  this.text = text;
}

Text.prototype.init = function(node, x, y) {
  this.text.style.left = x + 'px';
  this.text.style.top = y + 'px';

  node.appendChild(this.text);
}

Text.prototype.set_text = function (s) {
  this.text.innerHTML = s;
}

Text.prototype.size = function (size) {
  this.text.style.fontSize = size + 'px';
}

Text.prototype.x = function (x) {
  this.text.style.left = x + 'px';
}

Text.prototype.y = function (y) {
  this.text.style.top = y + 'px';
}

Text.prototype.offset_x = function (x) {
  this.text.offset_x = x;
}

Text.prototype.offset_y = function (y) {
  this.text.offset_y = y;
}

/**********************************************************************
Definition of Caption Object.
***********************************************************************/
function Caption(s) {
  var text = document.create_element('span');

  text.style.position = 'absolute';
  text.style.fontSize = Font_size + 'px';
  text.appendChild(document.createTextNode(s));

  text.addEventListener("mousemove", mouse_move_dom, true);
  text.addEventListener("mousedown", mouse_down_dom, true);
  text.addEventListener("mouseup",   mouse_up_dom, true);
  text.addEventListener("mouseout",  mouse_up_dom, true);
  text.addEventListener("mouseover", mouse_over_dom, true);

  text.offset_x = 0;
  text.offset_y = 0;
  this.text = text;
}

Caption.prototype = new Text("");

/**********************************************************************
Definition of JSGraph Object.
***********************************************************************/
function JSGraph(id) {
  var parent_frame = document.create_element('div');
  var frame   = document.create_element('div');
  var legend  = document.create_element('table');
  var scale_x = document.createElement('div');
  var scale_y = document.createElement('div');
  var graph   = document.getElementById(id);
  var width, offset_x, offset_y;

  this.graph = graph;

  offset_x = graph.offsetLeft;
  offset_y = graph.offsetTop;

  parent_frame.style.position = 'absolute';
  parent_frame.style.overflow = 'hidden';
  parent_frame.style.position = 'absolute';
  parent_frame.style.overflow = 'hidden';
  parent_frame.style.backgroundColor = '#c0c0c0';
  parent_frame.style.top = (offset_y + 100) + 'px';
  parent_frame.style.left = (offset_x + 150) + 'px';
  parent_frame.style.width = '400px';
  parent_frame.style.height = '300px';
  parent_frame.style.borderColor = '#000000';
  parent_frame.style.borderWidth = '3px';
  parent_frame.style.borderStyle = 'ridge';
  parent_frame.graph = this;

  parent_frame.addEventListener("mousemove", mouse_resize_move_dom, true);
  parent_frame.addEventListener("mousedown", mouse_down_dom, true);
  parent_frame.addEventListener("mouseup",   mouse_up_dom, true);
  parent_frame.addEventListener("mouseout",  mouse_up_dom, true);

  graph.appendChild(parent_frame);
  this.parent_frame = parent_frame;

  frame.style.position = 'absolute';
  frame.style.overflow = 'hidden';
  frame.style.position = 'absolute';
  frame.style.overflow = 'hidden';
  frame.style.backgroundColor = '#c0c0c0';
  frame.style.top = '0px';
  frame.style.left = '0px';
  frame.style.width = '400px';
  frame.style.height = '300px';
  frame.style.borderColor = '#000000';
  frame.style.borderWidth = '0px';
  frame.style.borderStyle = 'none';

  frame.gauge = new Object();
  frame.gauge.width = '1';
  frame.gauge.length = '5';
  frame.gauge.color = '#000000';
  frame.graph = this;
  frame.parent_frame = parent_frame;

  frame.addEventListener("mousemove", mouse_resize_move_dom, true);

  this.frame = frame;
  parent_frame.frame = frame;
  parent_frame.appendChild(frame);

  legend.style.position = 'absolute';
  legend.style.backgroundColor = '#c0c0c0';
  legend.style.borderColor = '#000000';
  legend.style.borderWidth = '3px';
  legend.style.borderStyle = 'ridge';
  legend.offset_x = 40;
  legend.offset_y = 0;

  legend.addEventListener("mousemove", mouse_move_dom, true);
  legend.addEventListener("mousedown", mouse_down_dom, true);
  legend.addEventListener("mouseup",   mouse_up_dom, true);
  legend.addEventListener("mouseout",  mouse_up_dom, true);
  legend.addEventListener("mouseover", mouse_over_dom, true);

  graph.appendChild(legend);
  this.legend = legend;


  this.title = new Caption("Graph");
  this.title.init(graph, 0, 0);
  this.title.text.offset_x = parseInt(frame.style.width) / 2 - 25;
  this.title.text.offset_y = -25;

  this.caption_y = new Caption("Y-Axis");
  this.caption_y.init(graph, 0, 0);
  this.caption_y.text.offset_x = -100;
  this.caption_y.text.offset_y = (parseInt(frame.style.height) - Font_size) / 2;

  this.caption_x = new Caption("X-Axis");
  this.caption_x.init(graph, 0, 0);
  this.caption_x.text.offset_x = parseInt(frame.style.width) / 2 - 25;
  this.caption_x.text.offset_y = 40;

  scale_x.style.position = 'absolute';
  scale_x.style.overflow = 'visible';
  scale_x.style.backgroundColor = '#c0c0c0';
  scale_x.offset = 5;
  scale_x.graph = this;
  scale_x.type = 0;
  this.scale_x = scale_x;
  graph.appendChild(scale_x);

  scale_y.style.position = 'absolute';
  scale_y.style.overflow = 'visible';
  scale_y.style.backgroundColor = '#c0c0c0';
  scale_y.offset = -10;
  scale_y.graph = this;
  scale_y.type = 0;
  this.scale_y = scale_y;
  graph.appendChild(scale_y);

  this.min_x = 0;
  this.max_x =  10;
  this.min_y = -53000;
  this.max_y = -50000;

  this.data = new Array(0);
}

JSGraph.prototype.set_color = function (color) {
  this.legend.style.backgroundColor = color;
  this.frame.style.backgroundColor = color;
}

JSGraph.prototype.set_border_color = function (color) {
  this.legend.style.borderColor = color;
  this.frame.style.borderColor = color;
}

JSGraph.prototype.add_legend = function (str, color) {
  var table = this.legend;
  var row = table.rows.length;

  table.insertRow(row);
  table.rows[row].insertCell(0);
  table.rows[row].cells[0].style.color = color;
  table.rows[row].cells[0].appendChild(document.createTextNode(str));
}

JSGraph.prototype.autoscale = function () {
  var i;
  var minx = Infinity;
  var maxx = -Infinity;
  var miny = Infinity;
  var maxy = -Infinity;
  var data = this.data;

  if (data.length < 1) {
    return;
  }

  for (i = 0; i < data.length; i++) {
    data[i].autoscale();

    if (! data[i].draw) {
      continue;
    }

    if (data[i].min_x < minx) {
      minx = data[i].min_x;
    }
    if(data[i].max_x > maxx) {
      maxx = data[i].max_x
    }

    if (data[i].min_y < miny) {
      miny = data[i].min_y;
    }
    if(data[i].max_y > maxy) {
      maxy = data[i].max_y
    }
  }

  if (! isFinite(minx) || ! isFinite(maxx) || ! isFinite(miny) || ! isFinite(maxy)) {
    minx = -1;
    maxx =  1;
    miny = -1;
    maxy =  1;
  }

  if (this.scale_x.type == 0) {
    if (maxx - minx < 1E-15) {
      minx -= Math.abs(minx) * 0.1;
      maxx += Math.abs(maxx) * 0.1;
    }
    this.min_x = minx - (maxx - minx) * 0.05;
    this.max_x = maxx + (maxx - minx) * 0.05;
  } else {
    this.min_x = minx * 0.9;
    this.max_x = maxx * 1.1;
  }
  if (this.scale_y.type == 0) {
    if (maxy - miny < 1E-15) {
      miny -= Math.abs(miny) * 0.1;
      maxy += Math.abs(maxy) * 0.1;
    }
    this.min_y = miny - (maxy - miny) * 0.05;
    this.max_y = maxy + (maxy - miny) * 0.05;
  } else {
    this.min_y = miny * 0.9;
    this.max_y = maxy * 1.1;
  }
}


JSGraph.prototype.draw_each_data = function (data) {
  var i, x, y;

  for (i = 0; i < data.length(); i++) {
    x = this.get_x(data.data[i][0]);
    y = this.get_y(data.data[i][1]);

    this.create_rectangle(this.frame,
			  x - data.size / 2,
			  y - data.size / 2,
			  data.size, data.size, data.color);
  }
}

JSGraph.prototype.draw_data = function () {
  var i, x, y;
  var data = this.data;

  for (i = 0; i < data.length; i++) {
    if (data[i].draw) {
      this.draw_each_data(data[i]);
      this.add_legend(data[i].caption, data[i].color);
    }
  }
}

JSGraph.prototype.add_data = function (data) {
  this.data.push(data);
}

JSGraph.prototype.create_rectangle = function (parent, x, y, width, height, color) {
  if (!isFinite(x) || !isFinite(y)) {
    return;
  }

  var rect = document.createElement('image');

  rect.style.backgroundColor = color;
  rect.style.position = 'absolute';
  rect.style.top = y + 'px';
  rect.style.left = x + 'px';
  rect.style.width = width + 'px';
  rect.style.height = height + 'px';
  rect.style.minHeight = '1px';
  rect.style.minWidth  = '1px';
  rect.style.borderWidth = '0px';
  rect.style.padding = '0px';
  rect.style.margin = '0px';

  parent.appendChild(rect);
}

JSGraph.prototype.create_gauge = function (x, y) {
  var gauge = document.createElement('image');

  gauge.style.backgroundColor = this.frame.gauge.color;
  gauge.style.position = 'absolute';
  gauge.style.top = y + 'px';
  gauge.style.left = x + 'px';
  gauge.style.minHeight = '1px';
  gauge.style.minWidth = '1px';
  gauge.style.borderWidth = '0px';
  gauge.style.padding = '0px';
  gauge.style.margin = '0px';
    
  return gauge;
}

JSGraph.prototype.create_gauge_x = function (x, y, len) {
  var gauge = this.create_gauge(x, y, len);
  var frame = this.frame;

  gauge.style.width = frame.gauge.width + 'px';
  gauge.style.height = len + 'px';
  frame.appendChild(gauge);
}

JSGraph.prototype.create_gauge_y = function (x, y, len) {
  var gauge = this.create_gauge(x, y, len);
  var frame = this.frame;

  gauge.style.width = len + 'px';
  gauge.style.height = frame.gauge.width + 'px';
  frame.appendChild(gauge);
}

JSGraph.prototype.draw_gauge1_x = function (x) {
  this.create_gauge_x(x, 0, parseInt(this.frame.style.height));
}

JSGraph.prototype.draw_gauge1_y = function (y) {
  this.create_gauge_y(0, y, parseInt(this.frame.style.width));
}

JSGraph.prototype.draw_gauge2_x = function (x) {
  var frame = this.frame;
  var len = frame.gauge.length * 2;
  var y;

  this.create_gauge_x(x, 0, len);
  y = parseInt(frame.style.height) - len;
  this.create_gauge_x(x, y, len);
}

JSGraph.prototype.draw_gauge2_y = function (y) {
  var frame = this.frame;
  var len = frame.gauge.length * 2;
  var x;

  this.create_gauge_y(0, y, len);
  x = parseInt(frame.style.width) - len;
  this.create_gauge_y(x, y, len);
}

JSGraph.prototype.draw_gauge3_x = function (x) {
  var frame = this.frame;
  var len = frame.gauge.length;
  var y;

  this.create_gauge_x(x, 0, len);
  y = parseInt(frame.style.height) - len;
  this.create_gauge_x(x, y, len);
}

JSGraph.prototype.draw_gauge3_y = function (y) {
  var frame = this.frame;
  var len = frame.gauge.length;
  var x;

  this.create_gauge_y(0, y, len); 
  x = parseInt(frame.style.width) - len;
  this.create_gauge_y(x, y, len);
}

JSGraph.prototype.gauge_x = function () {
  var inc, d, j, start, l, len, n, m;
  var str, text;
  var frame = this.frame;
  var width  = parseInt(frame.style.width);

  if(this.min_x == this.max_x){
    this.min_x -= 1;
    this.max_x += 1;
  }else if(this.min_x > this.max_x){
    d = this.min_x;
    this.min_x = this.max_x;
    this.max_x = d;
  }

  m = Math.ceil(Math.log10(this.max_x - this.min_x));
  inc = Math.pow(10, m - 1);

  start = Math.ceil(this.min_x / inc);
  str = Math.abs(start).toFixed(0);
  len = str.length;

  for(j = start; j <= this.max_x / inc; j++){
    var decpt;

    str = j.toFixed(0);
    l = str.length;
    decpt = 1 + (l - len);

    if(l > decpt){
      str = str.substring(0, decpt) + "." + str.substring(decpt, l); 
    }
    n = this.get_x(j * inc);
    text = new Text(String(str));
    text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
  }

  m = Math.floor(Math.log10(inc * Math.abs((start == 0)? 1: start)));
  if (m != 0) {
    text = new Text("&times;10<sup>" + m + "</sup>");
    text.init(this.scale_x, width, this.scale_x.offset + 25);
  }

    
  for (m = 1, d = start - 0.1; m < 10; ++m, d -= 0.1) {
    n = this.get_x(d * inc);
    if (m == 5) {
      this.draw_gauge2_x(n);
    } else {
      this.draw_gauge3_x(n);
    }
  }

  for (; start <= this.max_x / inc; start++) {
    n = this.get_x(start * inc);
    this.draw_gauge1_x(n);
    for (m = 1, d = start + 0.1; m < 10; ++m, d += 0.1) {
      n = this.get_x(d*inc);
      if (m == 5) {
	this.draw_gauge2_x(n);
      } else {
	this.draw_gauge3_x(n);
      }
    }
  }
}

JSGraph.prototype.get_x = function (x) {
  if (this.scale_x.type == 0) {
    return parseInt(this.frame.style.width) * (x - this.min_x)/(this.max_x - this.min_x);
  } else {
    if (this.max_x <= 0 || this.min_x <= 0 || x <= 0) {
      return -1;
    }
    return parseInt(this.frame.style.width) * (Math.log10(x) - Math.log10(this.min_x))
    /(Math.log10(this.max_x) - Math.log10(this.min_x));
  }
}

JSGraph.prototype.get_data_x = function (x) {
  if (this.scale_x.type == 0) {
    return this.min_x + (this.max_x - this.min_x) * x / parseFloat(this.frame.style.width);
  } else {
    return 0;
  }
}

JSGraph.prototype.gauge_y = function () {
  var inc, d, j, start, l, len, n, m;
  var str, text;
  var frame = this.frame;

  if(this.min_y == this.max_y){
    this.min_y -= 1;
    this.max_y += 1;
  }else if(this.min_y > this.max_y){
    d = this.min_y;
    this.min_y = this.max_y;
    this.max_y = d;
  }

  m = Math.ceil(Math.log10(this.max_y - this.min_y));
  inc = Math.pow(10, m - 1);

  start = Math.ceil(this.min_y / inc);
  str = Math.abs(start).toFixed(0);
  len = str.length;

  for(j = start; j <= this.max_y / inc; j++){
    var decpt;

    str = j.toFixed(0);
    l = str.length;
    decpt = 1 + (l - len);

    if(l > decpt){
      str = str.substring(0, decpt) + "." + str.substring(decpt, l); 
    }
    n = this.get_y(j * inc);
    text = new Text(String(str));
    text.init(this.scale_y,
	      this.scale_y.offset - (len - 1) * Font_size / 2,
	      n - Font_size / 2);
  }

  m = Math.floor(Math.log10(inc * Math.abs((start == 0)? 1: start)));
  if (m != 0) {
    text = new Text("&times;10<sup>" + m + "</sup>");
    text.init(this.scale_y, this.scale_y.offset - 40,  -30);
  }

    
  for (m = 1, d = start - 0.1; m < 10; ++m, d -= 0.1) {
    n = this.get_y(d * inc);
    if (m == 5) {
      this.draw_gauge2_y(n);
    } else {
      this.draw_gauge3_y(n);
    }
  }

  for (; start <= this.max_y / inc; start++) {
    n = this.get_y(start * inc);
    this.draw_gauge1_y(n);
    for (m = 1, d = start + 0.1; m < 10; ++m, d += 0.1) {
      n = this.get_y(d*inc);
      if (m == 5) {
	this.draw_gauge2_y(n);
      } else {
	this.draw_gauge3_y(n);
      }
    }
  }
}

JSGraph.prototype.get_y = function (y) {
  if (this.scale_y.type == 0) {
    return parseInt(this.frame.style.height) * (1 - (y - this.min_y)/(this.max_y - this.min_y));
  } else {
    if (this.max_y <= 0 || this.min_y <= 0 || y <= 0) {
      return -1;
    }
    return parseInt(this.frame.style.height) * (Math.log10(this.max_y) - Math.log10(y))
    /(Math.log10(this.max_y) - Math.log10(this.min_y));
  }
}

JSGraph.prototype.get_data_y = function (y) {
  return this.min_y + (this.max_y - this.min_y)* (1 - y / parseFloat(this.frame.style.height));
}

JSGraph.prototype.gauge_log_x = function () {
  var max, min, i, m, width, height, x, n;

  if(this.max_x <= 0 || this.min_x <= 0) {
    return;
  }

  max = Math.log10(this.max_x);
  min = Math.log10(this.min_x);
  if(max - min < 1){
    this.gauge_x();
    return;
  } else if (max - min > 20) {
    inc = Math.ceil((max - min) / 10) + 1;
  } else {
    inc = 1;
  }

  for(i = Math.ceil(min); i < max; i += inc){
    x = Math.pow(10, i);

    if (x > this.max_x) {
      break;
    }

    str = i.toFixed(0); 
    n = this.get_x(x);
    len = str.length;
    text = new Text("10<sup>" + str + "</sup>");
    text.init(this.scale_x, n - (len + 1) * Font_size / 4, this.scale_x.offset);
    this.draw_gauge1_x(n);
  }

  for(i = Math.floor(min); i < max; i += inc){
    x = Math.pow(10, i);

    n = this.get_x(x);
    if (inc == 1) {
      for(m = 2; m < 10; ++m){
	n = this.get_x(x * m);
	if (m == 5) {
	  this.draw_gauge2_x(n);
	} else {
	  this.draw_gauge3_x(n);
	}
      }
    } else {
      for (m = 1; m <= inc; m++) {
	n = this.get_x(x *= 10);
	this.draw_gauge3_x(n);
      }
    }
  }
}

JSGraph.prototype.gauge_log_y = function () {
  var max, min, i, m, width, height, n, y, inc;

  if(this.max_y <= 0 || this.min_y <= 0) {
    return;
  }

  max = Math.log10(this.max_y);
  min = Math.log10(this.min_y);
  if(max - min < 1){
    this.gauge_y();
    return;
  } else if (max - min > 20) {
    inc = Math.ceil((max - min) / 10) + 1;
  } else {
    inc = 1;
  }

  for(i = Math.ceil(min); i < max; i += inc){
    y = Math.pow(10, i);

    if (y > this.max_y) {
      break;
    }

    str = i.toFixed(0); 
    n = this.get_y(y);
    len = str.length;
    text = new Text("10<sup>" + str + "</sup>");
    text.init(this.scale_y,
	      this.scale_y.offset - len * Font_size / 2, n - Font_size);
    this.draw_gauge1_y(n);
  }

  for(i = Math.floor(min); i < max; i += inc){
    y = Math.pow(10, i);

    n = this.get_y(y);
    if (inc == 1) {
      for(m = 2; m < 10; ++m){
	n = this.get_y(y * m);
	if (m == 5) {
	  this.draw_gauge2_y(n);
	} else {
	  this.draw_gauge3_y(n);
	}
      }
    } else {
      for (m = 1; m <= inc; m++) {
	n = this.get_y(y *= 10);
	this.draw_gauge3_y(n);
      }
    }
  }
  return;
}

JSGraph.prototype.update_position = function () {
  var parent_frame = this.parent_frame;
  var frame = this.frame;
  var width  = parseInt(parent_frame.style.width);
  var height = parseInt(parent_frame.style.height);
  var left   = parseInt(parent_frame.style.left);
  var top    = parseInt(parent_frame.style.top);

  frame.style.width = parent_frame.style.width;
  frame.style.height = parent_frame.style.height;

  this.title.x(left + this.title.text.offset_x);
  this.title.y(top  + this.title.text.offset_y);

  this.caption_y.x(left + this.caption_y.text.offset_x);
  this.caption_y.y(top  + this.caption_y.text.offset_y);

  this.caption_x.x(left + this.caption_x.text.offset_x);
  this.caption_x.y(top + height + this.caption_x.text.offset_y);

  this.scale_x.style.left = left + 'px';
  this.scale_x.style.top  = (top + height + this.scale_x.offset) + 'px';

  this.scale_y.style.left = (left + this.scale_y.offset) + 'px';
  this.scale_y.style.top  = top + 'px';

  this.legend.style.left = (left + width + this.legend.offset_x) + 'px';
  this.legend.style.top = (top + this.legend.offset_y) + 'px';
}

JSGraph.prototype.clear = function () {
  var node;

  node = this.frame.childNodes;
  while (node.length > 0) {
    this.frame.removeChild(node[0]);
  }

  node = this.scale_x.childNodes;
  while (node.length > 0) {
    this.scale_x.removeChild(node[0]);
  }

  node = this.scale_y.childNodes;
  while (node.length > 0) {
    this.scale_y.removeChild(node[0]);
  }

  node = this.legend;
  while (node.rows.length > 0) {
    node.deleteRow(0);
  }
}

JSGraph.prototype.draw = function () {
  document.body.style.cursor='wait';
  this.clear();
  this.update_position();
  if (this.scale_x.type == 0) {
    this.gauge_x();
  } else {
    this.gauge_log_x();
  }
  if (this.scale_y.type == 0) {
    this.gauge_y();
  } else {
    this.gauge_log_y();
  }
  this.draw_data();
  document.body.style.cursor='auto';
}

JSGraph.prototype.scale_x_type = function (type) {
  if (type == "linear") {
    this.scale_x.type = 0;
  } else {
    this.scale_x.type = 1;
  }
}

JSGraph.prototype.scale_y_type = function (type) {
  if (type == "linear") {
    this.scale_y.type = 0;
  } else {
    this.scale_y.type = 1;
  }
}

/**********************************************************************
Definition of Data Object.
***********************************************************************/
function Data() {
  this.color = '#000000';
  this.size  = 6;
  this.data = new Array(0);
  this.min_x = 0;
  this.max_x = 1;
  this.min_y = 0;
  this.max_y = 1;
  this.draw = false;
  this.caption = "Data";
}

Data.prototype.length = function () {
  return this.data.length;
}

Data.prototype.clear = function () {
  this.min_x = 0;
  this.max_x = 1;
  this.min_y = 0;
  this.max_y = 1;
  this.data.length = 0;
}

Data.prototype.add_data = function (x, y) {
  if (!isFinite(x) || !isFinite(y)) {
    return;
  }
  if (this.data.length < 1){
    this.min_x = x;
    this.max_x = x;
    this.min_y = y;
    this.max_y = y;
    this.draw = true;
  } else {
    if (x < this.min_x) {
      this.min_x = x;
    } else if(x > this.max_x) {
      this.max_x = x;
    }
    
    if (y < this.min_y) {
      this.min_y = y;
    } else if(y > this.max_y) {
      this.max_y = y;
    }
  }
  this.data.push([x, y]);
}

Data.prototype.str2data = function (s, sep1, sep2) {
  var i;
  var data = s.split(sep1);
  var xy_data;

  for (i = 0; i < data.length; i++) {
    xy_data = data[i].split(sep2);
    if (xy_data.length > 1) {
      this.add_data(parseFloat(xy_data[0]), parseFloat(xy_data[1]));
    }
  }
}

Data.prototype.autoscale = function () {
  var minx = Infinity;
  var maxx = -Infinity;
  var miny = Infinity;
  var maxy = -Infinity;
  var i;

  if (this.data.length < 1) {
    this.draw = false;
    return;
  }

  for (i = 0; i < this.data.length; i++) {
    if (! isFinite(this.data[i][0]) || ! isFinite(this.data[i][1])) {
      continue;
    }
    if (this.data[i][0] < minx) {
      minx = this.data[i][0];
    }
    if(this.data[i][0] > maxx) {
      maxx = this.data[i][0];
    }

    if (this.data[i][1] < miny) {
      miny = this.data[i][1];
    }
    if (this.data[i][1] > maxy) {
      maxy = this.data[i][1];
    }
  }

  if (! isFinite(minx) || ! isFinite(maxx) || ! isFinite(miny) || ! isFinite(maxy)) {
    minx = 0;
    maxx = 0;
    miny = 0;
    maxy = 0;
    this.draw = false;
  }

  this.min_x = minx;
  this.max_x = maxx;
  this.min_y = miny;
  this.max_y = maxy;
}

Data.prototype.set_text = function (s) {
  this.caption = s;
}

Data.prototype.set_color = function (s) {
  this.color = s;
}

Data.prototype.set_style = function (s) {
  this.style = s;
}
