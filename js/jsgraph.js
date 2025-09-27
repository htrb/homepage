/* 
 * Copyright (C) 2003-2006, Hiroyuki Ito. ZXB01226@nifty.com
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

/* $Id: jsgraph.js,v 1.67 2009-05-20 05:15:55 hito Exp $ */

/**********************************************************************
Global variables.
***********************************************************************/
var Is_mouse_down = false;
var Is_mouse_down_scale = false;
var Is_mouse_move_scale = false;
var Scale_region_size_min = 6;
var Mouse_x = 0;
var Mouse_y = 0;
var Mouse_position = 'C';
var Edge_width = 30;
var Font_size = 16; /* px */
var XMLHttp = null;
var IE = false;

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
    element.removeEventListener = function (ev, fun) {
      this["on" + ev] = event_none_dom;
    }
    element.addEventListener("selectstart", event_none_dom);
    return element;
  }
  if (!document.namespaces.v) {
    document.namespaces.add("v", "urn:schemas-microsoft-com:vml");
    document.createStyleSheet().cssText = "v\\:polyline, v\\:rect, v\\:oval { behavior: url(#default#VML); display:inline-block; }";
  }
  IE = true;
}


/**********************************************************************
Utility functions
***********************************************************************/
create_http_request = function () {
  var xmlhttp = false;

  try {
    xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
  } catch (e) {
    try {
      xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    } catch (E) {
      xmlhttp = false;
    }
  }

  if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
    xmlhttp = new XMLHttpRequest();
  }
  return xmlhttp;
}

XMLHttp = create_http_request();

Math.log10 = function(x) {
  return this.log(x) / this.LN10;
}

Date.prototype.getMJD = function () {
  return 40587 + this.getTime()/86400000;
}

Date.prototype.setMJD = function (mjd) {
  this.setTime((mjd - 40587) * 86400000);
}

Date.prototype.getUnix = function () {
  return this.getTime() / 1000;
}

Date.prototype.setUnix = function (unix) {
  this.setTime(unix * 1000);
}

Date.prototype.set_ymd = function (y, m, d) {
  if (y) {
    this.setUTCFullYear(y);
  }
  if (m) {
    // CAUTION!!  m = 1..12 because following code does not run when m == 0.
    this.setUTCMonth(m - 1);
  }
  if (d) {
    this.setUTCDate(d);
  }
  this.setUTCHours(0);
  this.setUTCMinutes(0);
  this.setUTCSeconds(0);
  //  this.setMilliSeconds(0);
}

Date.prototype.nextMonth = function () {
  var m = this.getUTCMonth(), y = this.getUTCFullYear();

  if (m == 11) {
    y++;
    m = 0;
  } else {
    m++;
  }

  this.setUTCMonth(m);
  this.setUTCFullYear(y);
}

Date.prototype.nextDate = function () {
  var t = this.getTime(), mul = 1;

  if (arguments.length > 0) {
    mul = arguments[0];
  }
  this.setTime(t + 86400000 * mul);
}

Date.prototype.nextHour = function () {
  var t = this.getTime(), mul = 1;

  if (arguments.length > 0) {
    mul = arguments[0];
  }
  this.setTime(t + 3600000 * mul);
}


/**********************************************************************
Definition of IE_Canvas Object.
***********************************************************************/

function IE_Canvas(div) {
  this.lineWidth = 1.0;
  this.strokeStyle = "#000000";
  this.fillStyle = "#000000";
  this.lineJoin = "round";
  this.restore_buf = new Array(0);
  this.path = new Array(0);
  this.parent = div;
  this.current_shape = null;
}

IE_Canvas.prototype = {

  create_vml_element: function(shape, x, y, w, h) {
    var e = document.createElement(shape);
    e.fillcolor = this.fillStyle;
    e.strokecolor = this.fillStyle;
    e.style.position = "absolute";
    e.style.left = x + "px";
    e.style.top = y + "px";
    e.style.width = w + "px";
    e.style.height = h + "px";
    this.parent.appendChild(e);
    return e;
  },

  arc: function (x, y, r, sa, ea, dir) {
    this.create_vml_element("v:oval", x - r, y - r, r * 2, r * 2);
    this.current_shape = 'arc';
  },

  fillRect: function (x, y, w, h) {
    this.create_vml_element("v:rect", x, y, w, h);
    this.current_shape = 'rect';
  },

  restore: function () {
    var style;
    style = this.restore_buf.pop;
    if (style) {
      this.strokeStyle = style[0];
      this.fillStyle = style[1];
      this.lineWidth = style[2];
    }
  },

  save: function () {
    this.restore_buf.push([this.strokeStyle, this.fillStyle, this.lineWidth]);
  },

  beginPath: function () {
    this.path.length = 0;
  },

  lineTo: function (x, y) {
    this.path.push([x, y]);
    this.current_shape = 'line';
  },

  moveTo: function (x, y) {
    this.path.push([x, y]);
  },

  end_path: function (fill) {
    var line, i, n, path;
    if (this.current_shape != 'line') {
      return;
    }

    line = document.createElement("v:polyline");
    line.style.position = "absolute";
    line.filled = fill;
    line.fillcolor = this.fillStyle;
    if (fill) {
      line.strokecolor = this.fillStyle;
    } else {
      line.strokecolor = this.strokeStyle;
    }
    line.strokeweight = this.lineWidth + "px";
    line.joinstyle = this.lineJoin;
    line.points = ""
    n = this.path.length;
    path = this.path;
    for (i = 0; i < n; i++) {
      line.points += " " + path[i][0] + "," + path[i][1] + "px";
    }
    this.current_shape = null;
    this.parent.appendChild(line);
  },

  stroke: function () {
    this.end_path(false);
  },

  fill: function () {
    this.end_path(true);
  },

  clearRect: function () {
    while (this.parent.childNodes.length > 0) {
      this.parent.removeChild(this.parent.firstChild);
    }
  }
};

/**********************************************************************
Event Handlers.
***********************************************************************/
function change_curser (node, x, y) {
  var width  = parseInt(node.style.width);
  var height = parseInt(node.style.height);
  var cursor = node.style.cursor;
  if (node.frame) {
    node = node.frame;
  }

  if (x >= Edge_width && width - x >= Edge_width &&
      y >= Edge_width && height - y >= Edge_width) {
    node.style.cursor = 'move';
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
  case 'NW':
    node.style.left = (left + x) + 'px';
    node.style.top = (top + y) + 'px';
    node.style.width = (width - x) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 'NE':
    node.style.top = (top + y) + 'px';
    node.style.width = (width + x) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 'SE':
    node.style.width = (width + x) + 'px';
    node.style.height = (height + y) + 'px';
    break;
  case 'SW':
    node.style.left = (left + x) + 'px';
    node.style.width = (width - x) + 'px';
    node.style.height = (height + y) + 'px';
    break;
  case 'N':
    node.style.top = (top + y) + 'px';
    node.style.height = (height - y) + 'px';
    break;
  case 'E':
    node.style.width = (width + x) + 'px';
    break;
  case 'S':
    node.style.height = (height + y) + 'px';
    break;
  case 'W':
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

function mouse_resize_move_dom () {
  var e, x, y, is_frame = false;

  if (IE) {
    e = window.event;
  } else {
    e = arguments[0];
  }

  if (Is_mouse_down) {
    resize_move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
    if (this.frame) {
      if (this.firstChild) {
	var i, n;
	n = this.childNodes.length;
	for (i = 0; i < n; i++) {
	  this.removeChild(this.firstChild);
	}
      }
      this.graph.update_position();
    }

    return;
  }

  if (IE) {
    x = e.offsetX;
    y = e.offsetY;
    is_frame = true;
  } else {
    x = e.layerX;
    y = e.layerY;
    if (e.currentTarget == e.target && this.parent_frame) {
      is_frame = true;
    }
  }

  if (is_frame) {
    change_curser(this, x, y);
  }
}

function mouse_move_dom () {
  var e;
  if (IE) {
    e = window.event;
  } else {
    e = arguments[0];
  }
  if (Is_mouse_down) {
    move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
    if (this.moved) {
      this.moved();
    }
  }
}

function mouse_down_dom () {
  var e, x, y;
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
    e = arguments[0];
    x = e.layerX;
    y = e.layerY;
    if (e.button != 0) {
      return;
    }
  }

  Mouse_x = e.clientX;
  Mouse_y = e.clientY;
  if (x < Edge_width && y < Edge_width) {
    Mouse_position = 'NW';
  } else if (width - x < Edge_width && y < Edge_width) {
    Mouse_position = 'NE';
  } else if (width - x < Edge_width && height - y < Edge_width) {
    Mouse_position = 'SE';
  } else if (x < Edge_width && height - y < Edge_width) {
    Mouse_position = 'SW';
  } else if (y < Edge_width) {
    Mouse_position = 'N';
  } else if (width - x < Edge_width) {
    Mouse_position = 'E';
  } else if (height - y < Edge_width) {
    Mouse_position = 'S';
  } else if (x < Edge_width) {
    Mouse_position = 'W';
  } else {
    Mouse_position = "C";
  }

  Is_mouse_down = true;
}

function mouse_up_dom () {
  if (this.graph && Is_mouse_down) {
    if (!this.firstChild) {
      this.appendChild(this.frame);
      this.appendChild(this.frame.scale_div);
    }
    if (Mouse_position != 0) {
      this.graph.clear();
      this.graph.draw();
    } else {
      this.graph.update_position();
      this.graph.draw();
    }
  }
  Is_mouse_down = false;
}

function mouse_over_dom () {
  this.style.cursor='move';
}

function mouse_down_scale_dom () {
  var e, x, y;

  if (IE) {
    e = window.event;
    if (e.button != 1) {
      return;
    }
    if (e.srcElement.tagName != "DIV") {
      x = e.offsetX + e.srcElement.offsetLeft;
      y = e.offsetY + e.srcElement.offsetTop;
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }
    e.cancelBubble = true;
  } else {
    e = arguments[0];
    x = e.layerX;
    y = e.layerY;
    if (e.button != 0) {
      return;
    }
  }

  if (! this.scale_div) {
    return false;
  }

  Mouse_x = x;
  Mouse_y = y;

  Mouse_client_x = e.clientX;
  Mouse_client_y = e.clientY;

  Is_mouse_down_scale = true;
}

function mouse_up_scale_dom () {
  var scale;

  if (this.scale_div) {
    scale = this.scale_div;
  } else if (this.graph) {
    scale = this;
  } else {
    Is_mouse_down_scale = false;
    Is_mouse_move_scale = false;
    return false;
  }
  if (Is_mouse_down_scale) {
    var x, y, w, h;
    if (Is_mouse_move_scale) {
      x = parseInt(scale.style.left);
      y = parseInt(scale.style.top);
      w = parseInt(scale.style.width);
      h = parseInt(scale.style.height);
      if (w > Scale_region_size_min && h > Scale_region_size_min) {
	scale.graph.set_scale(scale.graph.get_data_x(x),
			      scale.graph.get_data_y(y),
			      scale.graph.get_data_x(x + w),
			      scale.graph.get_data_y(y + h));
      }
    } else {
      x = scale.graph.get_data_x(Mouse_x);
      y = scale.graph.get_data_y(Mouse_y);
      scale.graph.centering(x, y);
    }
  }
  Is_mouse_down_scale = false;
  Is_mouse_move_scale = false;
  scale.graph.draw();
  scale.style.visibility = 'hidden';
  scale.style.left = '0px';
  scale.style.top  = '0px';
  scale.style.width = '0px';
  scale.style.height = '0px';
}

function mouse_move_scale_dom () {
  var e, x, y;

  if (IE) {
    e = window.event;
    if (e.srcElement.tagName != "DIV") {
      x = e.offsetX + e.srcElement.offsetLeft;
      y = e.offsetY + e.srcElement.offsetTop;
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }
  } else {
    e = arguments[0];
    x = e.layerX;
    y = e.layerY;
  }

  if (Is_mouse_down_scale) {
    var w, h, scale;

    Is_mouse_move_scale = true;
    if (this.scale_div) {
      scale = this.scale_div;
      w = Math.abs(Mouse_x - x);
      h = Math.abs(Mouse_y - y);
      x = Math.min(Mouse_x, x);
      y = Math.min(Mouse_y, y);
      scale.style.left = x + 'px';
      scale.style.top  = y + 'px';
    } else if (this.graph) {
      scale = this;
      w = x;
      h = y;
      if (Mouse_client_x > e.clientX) {
	x = parseInt(scale.style.left) + w;
	w = parseInt(scale.style.width) - w;
	x--;
	scale.style.left = x + 'px';
      }
      if (Mouse_client_y > e.clientY) {
	y = parseInt(scale.style.top) + h;
	h = parseInt(scale.style.height) - h;
	y--;
	scale.style.top = y + 'px';
      }
      w++;
      h++;
    } else {
      return false;
    }
    scale.style.visibility = 'visible';
    scale.style.width = w + 'px';
    scale.style.height = h + 'px';
  } else {
    if (e.currentTarget == e.target && this.parent_frame) {
      window.status = "X: " + this.graph.get_data_x(x).toExponential(8) +
	"  Y: " + this.graph.get_data_y(y).toExponential(8);
    }
  }
}

function event_none_dom () {
  return false;
}
/**********************************************************************
Definition of Text Object.
***********************************************************************/

function Text() {
  var text = document.createElement('span');

  text.style.position = 'absolute';
  text.style.fontSize = Font_size + 'px';
  text.style.whiteSpace = 'nowrap';
  if (arguments.length > 0) {
    text.innerHTML = arguments[0];
  }
  this.text = text;
}

Text.prototype = {
  init: function (node, x, y) {
    this.text.style.left = x + 'px';
    this.text.style.top = y + 'px';

    node.appendChild(this.text);
  },

  set_text: function (s) {
    if (s == null) {
      this.text.style.visibility = 'hidden';
    } else {
      this.text.innerHTML = String(s);
      this.text.style.visibility = 'visible';
    }
  },

  get_text: function () {
    if (this.text.style.visibility == 'hidden') {
      return null;
    } else {
      return this.text.innerHTML;
    }
  },

  size: function (size) {
    this.text.style.fontSize = size + 'px';
  },

  x: function (x) {
    this.text.style.left = x + 'px';
  },

  y: function (y) {
    this.text.style.top = y + 'px';
  },

  offset_x: function (x) {
    this.text.offset_x = x;
  },

  offset_y: function (y) {
    this.text.offset_y = y;
  },

  get_width: function () {
    return this.text.clientWidth;
  },

  get_height: function () {
    return this.text.clientHeight;
  },

  get_x: function (x) {
    return this.text.offsetLeft;
  },

  get_y: function (y) {
    return this.text.offsetTop;
  }
};

/**********************************************************************
Definition of Caption Object.
***********************************************************************/
function Caption(s) {
  var text = document.create_element('span');

  text.style.position = 'absolute';
  text.style.whiteSpace = 'nowrap';
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

  this.moved = false;
  text.obj = this;
  text.moved = function () {
    this.obj.moved = true;
  }
}

Caption.prototype = new Text("");

/**********************************************************************
Definition of JSGraph Object.
***********************************************************************/
function JSGraph() {
  if (arguments.length > 0) {
    this.init(arguments[0]);
  }
  this.Colors = [
		'#9900cc',
		'#669900',
		'#6699cc',
		'#ff99ff',
		'#cccc99',
		'#999999',
		'#ffcc00',
		'#ffffcc',
		'#ccffff',
		'#ffccff',
		'#003366',
		'#990066',
		'#993300',
		'#669900',
		'#6699cc',
		'#0066cc',
		];
  this.Style = "lc";
  this.X = 1;
  this.Y = 2;
  this.FS = new RegExp("[ ,\t]+");
  this.RS = "\n";
}

JSGraph.prototype = {
  init: function(id) {
    var w, h;
    var parent_frame = document.create_element('div');
    var legend    = document.create_element('table');
    var scale_x   = document.createElement('div');
    var scale_y   = document.createElement('div');
    var scale_div = document.create_element('div');
    var graph     = document.getElementById(id);
    var frame     = this.create_canvas();
    var offset_x, offset_y;

    this.SCALE_TYPE_LINEAR = 0;
    this.SCALE_TYPE_LOG    = 1;
    this.SCALE_TYPE_UNIX   = 2;
    this.SCALE_TYPE_MJD    = 3;

    this.graph = graph;

    offset_x = 140;
    offset_y = 60;
    w = parseInt(graph.style.width) - offset_x - 200;
    h = parseInt(graph.style.height) - offset_y - 80;

    parent_frame.style.position = 'absolute';
    parent_frame.style.overflow = 'hidden';
    parent_frame.style.backgroundColor = '#c0c0c0';
    parent_frame.style.top = (graph.offsetTop + offset_y) + 'px';
    parent_frame.style.left = (graph.offsetLeft + offset_x) + 'px';
    parent_frame.style.width = w + 'px';
    parent_frame.style.height = h + 'px';
    parent_frame.style.borderColor = '#000000';
    parent_frame.style.borderWidth = '3px';
    parent_frame.style.borderStyle = 'ridge';
    parent_frame.graph = this;

    graph.appendChild(parent_frame);
    this.parent_frame = parent_frame;

    //  frame.style.position = 'absolute';
    frame.style.overflow = 'hidden';
    frame.style.backgroundColor = '#c0c0c0';
    frame.style.top = '0px';
    frame.style.left = '0px';
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    frame.width = w;
    frame.height = h;
    frame.style.borderColor = '#FF0000';
    frame.style.borderWidth = '1px';
    frame.style.borderStyle = 'none';

    frame.gauge = new Object();
    frame.gauge.width = '1';
    frame.gauge.length = '5';
    frame.gauge.color = '#000000';
    frame.graph = this;
    frame.parent_frame = parent_frame;
    frame.scale_div = scale_div;

    scale_div.style.position = 'absolute';
    scale_div.style.borderColor = '#000000';
    scale_div.style.borderWidth = '1px';
    scale_div.style.borderStyle = 'dotted';
    scale_div.style.visibility = 'hidden';
    scale_div.style.width = '100px';
    scale_div.style.height = '100px';
    scale_div.style.left = '0px';
    scale_div.style.top = '0px';
    scale_div.style.margin = '0px';
    scale_div.addEventListener("mouseup",   mouse_up_scale_dom, true);
    scale_div.addEventListener("mousemove", mouse_move_scale_dom, true);
    scale_div.graph = this;

    this.frame = frame;
    this.canvas = frame.getContext('2d');
    this.canvas.lineCap  = "round";
    this.canvas.lineJoin = "round";
    parent_frame.frame = frame;
    parent_frame.appendChild(frame);
    parent_frame.appendChild(scale_div);

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
    scale_x.type = this.SCALE_TYPE_LINEAR;
    this.scale_x = scale_x;
    graph.appendChild(scale_x);

    scale_y.style.position = 'absolute';
    scale_y.style.overflow = 'visible';
    scale_y.style.backgroundColor = '#c0c0c0';
    scale_y.offset = -2;
    scale_y.graph = this;
    scale_y.type = this.SCALE_TYPE_LINEAR;
    this.scale_y = scale_y;
    graph.appendChild(scale_y);

    this.min_x = 0;
    this.max_x = 10;
    this.min_y = -53000;
    this.max_y = -50000;

    this.zoom_ratio = 1.4;

    this.data = new Array(0);
    this.scale_mode();
    this.update_position();
  },

  create_canvas: function() {
    if (IE) {
      var div;
      div = document.create_element('div');
      div.getContext = function (s) {
	var canvas;
	canvas = new IE_Canvas(this);
	return canvas;
      }
      return div;
    } else {
      return document.create_element('canvas');
    }
  },

  resize_mode: function () {
    this.frame.style.cursor='move';
    this.parent_frame.addEventListener("mousemove", mouse_resize_move_dom, true);
    this.parent_frame.addEventListener("mousedown", mouse_down_dom, true);
    this.parent_frame.addEventListener("mouseup",   mouse_up_dom, true);
    this.parent_frame.addEventListener("mouseout",  mouse_up_dom, true);

    this.frame.addEventListener("mousemove", mouse_resize_move_dom, true);
    this.frame.removeEventListener("mousedown", mouse_down_scale_dom, true);
    this.frame.removeEventListener("mouseup",   mouse_up_scale_dom, true);
    this.frame.removeEventListener("mousemove", mouse_move_scale_dom, true);
  },

  scale_mode: function () {
    this.frame.style.cursor='default';
    this.parent_frame.removeEventListener("mousemove", mouse_resize_move_dom, true);
    this.parent_frame.removeEventListener("mousedown", mouse_down_dom, true);
    this.parent_frame.removeEventListener("mouseup",   mouse_up_dom, true);
    this.parent_frame.removeEventListener("mouseout",  mouse_up_dom, true);

    this.frame.removeEventListener("mousemove", mouse_resize_move_dom, true);
    this.frame.addEventListener("mousedown", mouse_down_scale_dom, true);
    this.frame.addEventListener("mouseup",   mouse_up_scale_dom, true);
    this.frame.addEventListener("mousemove", mouse_move_scale_dom, true);
  },

  set_color: function (color) {
    this.legend.style.backgroundColor = color;
    this.frame.style.backgroundColor = color;
  },

  set_border_color: function (color) {
    this.legend.style.borderColor = color;
    this.frame.style.borderColor = color;
  },

  add_legend: function (str, color) {
    var table = this.legend;
    var row = table.rows.length;

    if (str == null) {
      return;
    }

    table.insertRow(row);
    table.rows[row].insertCell(0);
    table.rows[row].cells[0].style.color = color;
    table.rows[row].cells[0].appendChild(document.createTextNode(str));
  },

  autoscale: function () {
    var i, n;
    var minx = Infinity;
    var maxx = -Infinity;
    var miny = Infinity;
    var maxy = -Infinity;
    var data = this.data;

    if (data.length < 1) {
      return;
    }

    n = data.length;
    for (i = 0; i < n; i++) {
      data[i].autoscale();

      if (! data[i].draw) {
	continue;
      }

      if (data[i].min_x < minx) {
	minx = data[i].min_x;
      }
      if (data[i].max_x > maxx) {
	maxx = data[i].max_x
      }

      if (data[i].min_y < miny) {
	miny = data[i].min_y;
      }
      if (data[i].max_y > maxy) {
	maxy = data[i].max_y
      }
    }

    if (! isFinite(minx) || ! isFinite(maxx) || ! isFinite(miny) || ! isFinite(maxy)) {
      minx = -1;
      maxx =  1;
      miny = -1;
      maxy =  1;
    }

    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x = minx * 0.9;
      this.max_x = maxx * 1.1;
    } else {
      if (maxx - minx < 1E-15) {
	minx -= Math.abs(minx) * 0.1;
	maxx += Math.abs(maxx) * 0.1;
      }
      this.min_x = minx - (maxx - minx) * 0.05;
      this.max_x = maxx + (maxx - minx) * 0.05;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y = miny * 0.9;
      this.max_y = maxy * 1.1;
    } else {
      if (maxy - miny < 1E-15) {
	miny -= Math.abs(miny) * 0.1;
	maxy += Math.abs(maxy) * 0.1;
      }
      this.min_y = miny - (maxy - miny) * 0.05;
      this.max_y = maxy + (maxy - miny) * 0.05;
    }
  },

  draw_each_data_l: function (data) {
    var i, n, d, di, canvas;

    canvas = this.canvas;
    canvas.save();

    canvas.strokeStyle = data.color;
    canvas.lineWidth = data.width;
    canvas.lineJoin = "round";
    canvas.beginPath();

    n = data.length();
    d = data.data;

    canvas.moveTo(this.get_x(d[0][0]), this.get_y(d[0][1]));
    for (i = 1; i < n; i++) {
      di = d[i];
      canvas.lineTo(this.get_x(di[0]), this.get_y(di[1]));
    }
    canvas.stroke();
    canvas.restore();
  },

  draw_each_data_c: function (data) {
    var i, x, y, n, s, c, d, di;

    n = data.length();
    s = data.size / 2.0;
    c = data.color;
    d = data.data;

    for (i = 0; i < n; i++) {
      di = d[i];
      x = this.get_x(di[0]);
      y = this.get_y(di[1]);

      this.fill_circle(x, y, s, c);
    }
  },

  draw_each_data_r: function (data) {
    var i, x, y, n, s1, s2, c, d, di;

    n = data.length();
    s1 = data.size;
    s2 = s1 / 2.0;
    c = data.color;
    d = data.data;

    for (i = 0; i < n; i++) {
      di = d[i];
      x = this.get_x(di[0]);
      y = this.get_y(di[1]);

      this.fill_rectangle(x - s2,
			  y - s2,
			  s1, s1, c);
    }
  },

  draw_data: function () {
    var i, n, x, y;
    var data = this.data;

    n = data.length;
    for (i = 0; i < n; i++) {
      if (data[i].draw && data[i].length() > 0) {
	switch (data[i].style) {
	case "c":
	  this.draw_each_data_c(data[i]);
	  break;
	case "l":
	  this.draw_each_data_l(data[i]);
	  break;
	case "lc":
	  this.draw_each_data_l(data[i]);
	  this.draw_each_data_c(data[i]);
	  break;
	case "lr":
	  this.draw_each_data_l(data[i]);
	  this.draw_each_data_r(data[i]);
	  break;
	default:
	  this.draw_each_data_r(data[i]);
	}
	this.add_legend(data[i].caption, data[i].color);
      }
    }
  },

  add_data: function (data) {
    this.data.push(data);
  },

  fill_rectangle: function (x, y, width, height, color) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }

    if (this.frame) {
      var canvas;

      canvas = this.canvas;
      canvas.fillStyle = color;
      canvas.fillRect (x, y, width, height);
    }
  },


  fill_circle: function (x, y, r, color) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }

    if (this.frame) {
      var canvas;

      canvas = this.canvas;
      canvas.save();

      canvas.fillStyle = color;
      canvas.beginPath();
      canvas.arc(x, y, r, 0, 360, false);
      canvas.fill();

      canvas.restore();
    }
  },

  line: function (x1, y1, x2, y2, color) {
    var canvas;

    canvas = this.canvas;

    canvas.save();

    canvas.strokeStyle = color;
    canvas.beginPath();
    canvas.lineWidth = 1.0;
    canvas.moveTo(x1, y1);
    canvas.lineTo(x2, y2);
    canvas.stroke();

    canvas.restore();
  },

  create_gauge_x: function (x, y, len) {
    this.line(x, y, x, y + len, '#000000');
  },

  create_gauge_y: function (x, y, len) {
    this.line(x, y, x + len, y, '#000000');
  },

  draw_gauge1_x: function (x) {
    this.create_gauge_x(x, 0, this.frame.height);
  },

  draw_gauge1_y: function (y) {
    this.create_gauge_y(0, y, this.frame.width);
  },

  draw_gauge2_x: function (x) {
    var frame = this.frame;
    var len = frame.gauge.length * 2;
    var y;

    this.create_gauge_x(x, 0, len);
    y = parseInt(frame.style.height) - len;
    this.create_gauge_x(x, y, len);
  },

  draw_gauge2_y: function (y) {
    var frame = this.frame;
    var len = frame.gauge.length * 2;
    var x;

    this.create_gauge_y(0, y, len);
    x = parseInt(frame.style.width) - len;
    this.create_gauge_y(x, y, len);
  },

  draw_gauge3_x: function (x) {
    var frame = this.frame;
    var len = frame.gauge.length;
    var y;

    this.create_gauge_x(x, 0, len);
    y = parseInt(frame.style.height) - len;
    this.create_gauge_x(x, y, len);
  },

  draw_gauge3_y: function (y) {
    var frame = this.frame;
    var len = frame.gauge.length;
    var x;

    this.create_gauge_y(0, y, len); 
    x = parseInt(frame.style.width) - len;
    this.create_gauge_y(x, y, len);
  },

  gauge_x: function () {
    var inc, d, j, start, l, len, n, m, diff;
    var str, text;
    var frame = this.frame;
    var width  = parseInt(frame.style.width);

    if (this.min_x == this.max_x) {
      this.min_x -= 1;
      this.max_x += 1;
    } else if (this.min_x > this.max_x) {
      d = this.min_x;
      this.min_x = this.max_x;
      this.max_x = d;
    }

    m = Math.ceil(Math.log10(this.max_x - this.min_x));
    inc = Math.pow(10, m - 1);

    if ((this.max_x - this.min_x) / inc < 2) {
      inc /= 5;
      diff = 2;
    } else {
      diff = 1;
    }

    start = Math.ceil(this.min_x / inc);
    str = Math.abs(start * diff).toFixed(0);
    len = str.length;

    m = this.max_x / inc;
    for (j = start; j <= m; j++) {
      var decpt;

      str = (j * diff).toFixed(0);
      l = str.length;
      decpt = 1 + (l - len);

      if (l > decpt) {
	str = str.substring(0, decpt) + "." + str.substring(decpt, l); 
      }
      n = this.get_x(j * inc);
      text = new Text(String(str));
      text.init(this.scale_x, n, this.scale_x.offset);
      text.x(n - text.get_width() / 2);
    }

    m = Math.floor(Math.log10(inc * Math.abs((start == 0)? 1: start)) * (1 + 2E-16));
    // "1 + 2E-16" exist for underflow

    if (m != 0) {
      text = new Text('&times;10<sup>' + m + '</sup>');
      text.init(this.scale_x, width, this.scale_x.offset + Font_size);
    }
    
    for (m = 1, d = start - 0.1; m < 10; m++, d -= 0.1) {
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
      for (m = 1, d = start + 0.1; m < 10; m++, d += 0.1) {
	n = this.get_x(d * inc);
	if (m == 5) {
	  this.draw_gauge2_x(n);
	} else {
	  this.draw_gauge3_x(n);
	}
      }
    }
  },

  gauge_date_x: function () {
    var d, inc = 0, span, style, len, n, m, date_conv, str, text, i, j;
    var frame = this.frame;
    var min_date = new Date(), date = new Date(), max_date = new Date();

    if (this.min_x == this.max_x) {
      this.min_x -= 1;
      this.max_x += 1;
    } else if (this.min_x > this.max_x) {
      d = this.min_x;
      this.min_x = this.max_x;
      this.max_x = d;
    }

    switch (this.scale_x.type) {
      case this.SCALE_TYPE_UNIX:
      date_conv = 86400; 
      date.setUnix(this.min_x);
      min_date.setUnix(this.min_x);
      max_date.setUnix(this.max_x);
      break;
      case this.SCALE_TYPE_MJD:
      date_conv = 1;
      date.setMJD(this.min_x);
      min_date.setMJD(this.min_x);
      max_date.setMJD(this.max_x);
      break;
    }

    span = (this.max_x - this.min_x) / date_conv;
    if (span > 4000) {
      var min, max;

      min = this.min_x;
      max = this.max_x;

      switch (this.scale_x.type) {
      case this.SCALE_TYPE_UNIX:
	min_date.setUnix(this.min_x);
	max_date.setUnix(this.max_x);
	break;
      case this.SCALE_TYPE_MJD:
	min_date.setMJD(this.min_x);
	max_date.setMJD(this.max_x);
	break;
      }
      this.min_x = 1970 + min_date.getTime() / (365.2425 * 24 * 60 * 60 * 1000);
      this.max_x = 1970 + max_date.getTime() / (365.2425 * 24 * 60 * 60 * 1000);

      this.gauge_x();
      
      this.min_x = min;
      this.max_x = max;

      return;
    } else if (span > 400) {
      style = "year";
      date.set_ymd(false, 1, 1);
    } else if (span > 60) {
      style = "month";
      date.set_ymd(false, false, 1);
    } else if (span > 1) {
      style = "day";
      d = date.getUTCDate();
      if (span > 20) {
	inc = 4;
	d = Math.floor((d - 1) / inc) * inc + 1;
      } else if (span > 12) {
	inc = 2;
	d = Math.floor((d - 1) / inc) * inc + 1;
      } else {
	inc = 1;
      }
      date.set_ymd(false, false, d);
    } else {
      style = "hour";
      if (span > 0.5) {
	inc = 2;
      } else {
	inc = 1;
      }
      date.set_ymd(false, false, d);
    }

    while (date.getTime() < max_date.getTime()) {
      switch (this.scale_x.type) {
	case this.SCALE_TYPE_UNIX:
	d = date.getUnix();
	break;
	case this.SCALE_TYPE_MJD:
	d = date.getMJD();
	break;
      }

      n = this.get_x(d);

      switch (style) {
      case "year":
	if (date.getUTCMonth() == 0) {
	  if (d < this.min_x) {
	    break;
	  }
	  this.draw_gauge1_x(n);
	  text = new Text(String(date.getUTCFullYear()));
	  text.init(this.scale_x, n - 3 * Font_size / 4, this.scale_x.offset);
	} else {
	  this.draw_gauge3_x(n);
	}
	break;
      case "month":
	if (date.getUTCDate() == 1) {
	  if (d < this.min_x) {
	    break;
	  }
	  this.draw_gauge1_x(n);
	  if (date.getUTCMonth() == 0) {
	    str = (date.getUTCFullYear()) + "/1";
	    len = 6;
	  } else {
	    str = String(date.getUTCMonth() + 1);
	    len = str.length;
	  }
	  if (d > this.min_x) {
	    text = new Text((str));
	    text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
	  }
	} else {
	  this.draw_gauge3_x(n);
	}
	break;
      case "day":
	if (date.getUTCMonth() == 0 && date.getUTCDate() == 1) {
	  str = "1/1<br>" + (date.getUTCFullYear());
	  len = 3;
	} else if (date.getUTCDate() == 1) {
	  str = (date.getUTCMonth() + 1) + "/" + date.getUTCDate();
	  len = str.length;
	} else {
	  str = String(date.getUTCDate());
	  len = str.length;
	}
	if (d > this.min_x && (inc != 4 || date.getUTCDate() < 28)) {
	  text = new Text((str));
	  text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
	  this.draw_gauge1_x(n);
	} else {
	  this.draw_gauge2_x(n);
	}
	for (i = 3 * inc; i < 24 * inc; i += 3 * inc) {
	  switch (this.scale_x.type) {
	  case this.SCALE_TYPE_UNIX:
	    n = this.get_x(d + 60 * 60 * i);
	    break;
	  case this.SCALE_TYPE_MJD:
	    n = this.get_x(d + i / 24.0);
	    break;
	  }
	  if (i % 24 == 0 || inc == 1 && i % 12 == 0) {
	    this.draw_gauge2_x(n);
	  } else {
	    this.draw_gauge3_x(n);
	  }
	}
	break;
      case "hour":
	var h, x;
	h = date.getUTCHours();
	for (i = 0; i < inc; i++, h++) {
	  if (inc == 1 || h % 2 == 0) {
	    this.draw_gauge1_x(n);
	    if (d > this.min_x) {
	      if (h == 0) {
		str = "0<br>" + date.getUTCFullYear() + "/" + (date.getUTCMonth() + 1) + "/" + date.getUTCDate();
		len = 1;
	      } else {
		str = String(h);
		len = str.length;
	      }
	      text = new Text(str);
	      text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
	    }
	  }
	  x = d;
	  if (inc == 2) {
	    for (j = 0; j < 2; j++) {
	      switch (this.scale_x.type) {
	      case this.SCALE_TYPE_UNIX:
		d += 30 * 60;
		n = this.get_x(d);
		break;
	      case this.SCALE_TYPE_MJD:
		d += 1 / 48.0;
		n = this.get_x(d);
		break;
	      }
	      if (j == 0) {
		this.draw_gauge3_x(n);
	      } else {
		this.draw_gauge2_x(n);
	      }
	    }
	  } else if (inc == 1) {
	    for (j = 0; j < 6; j++) {
	      switch (this.scale_x.type) {
	      case this.SCALE_TYPE_UNIX:
		d +=  10 * 60;
		n = this.get_x(d);
		break;
	      case this.SCALE_TYPE_MJD:
		d += 1 / 24.0 / 6;
		n = this.get_x(d);
		break;
	      }
	      if (j == 2) {
		this.draw_gauge2_x(n);
	      } else {
		this.draw_gauge3_x(n);
	      }
	    }
	  }
	}
	break;
      }
      switch (style) {
	case "year":
	date.nextMonth();
	break;
	case "month":
	  switch (date.getUTCDate()) {
	  case 1:
	    date.set_ymd(false, false, 10);
	    break;
	  case 10:
	    date.set_ymd(false, false, 20);
	    break;
	  case 20:
	    date.nextMonth();
	    date.setUTCDate(1);
	    break;
	  }
	//	  l += date.getUTCFullYear() + " ";
	  break;
	case "day":
	  m = date.getUTCMonth();
	  date.nextDate(inc);
	  if (m != date.getUTCMonth()) {
	    date.setUTCDate(1);
	  }
	  break;
	case "hour":
	  date.nextHour(inc);
	  break;
      default:
	date.nextDate();
	break;
      }
    }

    switch (style) {
      case "year":
      break;
      case "month":
      if (min_date.getUTCFullYear() != max_date.getUTCFullYear()) {
	break;
      } else {
	text = new Text(String(min_date.getUTCFullYear()));
	text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
      break;
      case "day":
      if (min_date.getUTCFullYear() != max_date.getUTCFullYear()) {
	break;
      } else if (min_date.getUTCMonth() != max_date.getUTCMonth()) {
	text = new Text(String(min_date.getUTCFullYear()));
	text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      } else if (min_date.getUTCDate() != max_date.getUTCDate()) {
	text = new Text(min_date.getUTCFullYear() + "/" + (min_date.getUTCMonth() + 1));
	text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      } else {
	text = new Text(min_date.getUTCFullYear()
			+ "/"
			+ (min_date.getUTCMonth() + 1)
			+ "/"
			+ min_date.getUTCDate());
	text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
      break;
      case "hour":
      if (min_date.getUTCDate() == max_date.getUTCDate()) {
	text = new Text(min_date.getUTCFullYear()
			+ "/"
			+ (min_date.getUTCMonth() + 1)
			+ "/"
			+ (min_date.getUTCDate()));
	text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
    }
  },

  get_x: function (x) {
    var w, min, max;

    w = this.frame.width;
    min = this.min_x;
    max = this.max_x;

    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      if (max <= 0 || min <= 0 || x <= 0) {
	return -1;
      }
      return w * (Math.log10(x) - Math.log10(min))
      / (Math.log10(max) - Math.log10(min));
    } else {
      return w * (x - min)/(max - min);
    }
  },

  get_data_x: function (x) {
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      return Math.pow(10,
		      x / this.frame.width * (Math.log10(this.max_x) - Math.log10(this.min_x))
		      + Math.log10(this.min_x));
    } else {
      return this.min_x + (this.max_x - this.min_x) * x / this.frame.width;
    }
  },

  caption_y_auto_set_position: function (x) {
    if (! this.caption_y.moved) {
      var x0, x1;

      x0 = this.caption_y.get_x() + this.caption_y.get_width();
      x1 = this.scale_y.offsetLeft + x;
      if (x1 < x0) {
	this.caption_y.x(this.caption_y.get_x() - (x0 - x1) - 10);
      }
    }
  },

  gauge_y: function () {
    var inc, d, j, start, l, len, n, m, diff, x;
    var str, text;
    var frame = this.frame;

    if (this.min_y == this.max_y) {
      this.min_y -= 1;
      this.max_y += 1;
    } else if (this.min_y > this.max_y) {
      d = this.min_y;
      this.min_y = this.max_y;
      this.max_y = d;
    }

    m = Math.ceil(Math.log10(this.max_y - this.min_y));
    inc = Math.pow(10, m - 1);

    if ((this.max_y - this.min_y) / inc < 2) {
      inc /= 5;
      diff = 2;
    } else {
      diff = 1;
    }

    start = Math.ceil(this.min_y / inc);
    str = Math.abs(start * diff).toFixed(0);
    len = str.length;

    m = this.max_y / inc;
    x = this.scale_y.offset;
    for (j = start; j <= m; j++) {
      var decpt, x0;

      str = (j * diff).toFixed(0);
      l = str.length;
      decpt = 1 + (l - len);

      if (l > decpt) {
	str = str.substring(0, decpt) + "." + str.substring(decpt, l); 
      }
      n = this.get_y(j * inc);
      text = new Text(String(str));
      text.init(this.scale_y, this.scale_y.offset, n);
      x0 = this.scale_y.offset - text.get_width();
      text.x(x0);
      text.y(n - text.get_height() / 2);
      x = (x0 < x) ? x0 : x;
    }

    this.caption_y_auto_set_position(x);

    m = Math.floor(Math.log10(inc * Math.abs((start == 0)? 1: start)) * (1 + 2E-16));
    // "1 + 2E-16" exist for underflow

    if (m != 0) {
      text = new Text('&times;10<sup>' + m + '</sup>');
      text.init(this.scale_y, this.scale_y.offset - 40,  -30);
    }

    for (m = 1, d = start - 0.1; m < 10; m++, d -= 0.1) {
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
      for (m = 1, d = start + 0.1; m < 10; m++, d += 0.1) {
	n = this.get_y(d*inc);
	if (m == 5) {
	  this.draw_gauge2_y(n);
	} else {
	  this.draw_gauge3_y(n);
	}
      }
    }
  },

  get_y: function (y) {
    var h, min, max;

    h = this.frame.height;
    min = this.min_y;
    max = this.max_y;

    if (this.scale_y.type == 0) {
      return h * (1 - (y - min)/(max - min));
    } else {
      if (max <= 0 || min <= 0 || y <= 0) {
	return -1;
      }
      return h * (Math.log10(max) - Math.log10(y))
      / (Math.log10(max) - Math.log10(min));
    }
  },

  get_data_y: function (y) {
    if (this.scale_y.type == 0) {
      return this.min_y + (this.max_y - this.min_y)* (1 - y / this.frame.height);
    } else {
      return Math.pow(10,
		      Math.log10(this.max_y) - y / this.frame.height *
		      (Math.log10(this.max_y) - Math.log10(this.min_y)));
    }
  },

  gauge_log_x: function () {
    var max, min, i, m, width, height, x, n;

    if (this.max_x <= 0 || this.min_x <= 0) {
      return;
    }

    max = Math.log10(this.max_x);
    min = Math.log10(this.min_x);
    if (max - min < 1) {
      this.gauge_x();
      return;
    } else if (max - min > 20) {
      inc = Math.ceil((max - min) / 10) + 1;
    } else {
      inc = 1;
    }

    for (i = Math.ceil(min); i < max; i += inc) {
      x = Math.pow(10, i);
      if (x > this.max_x) {
	break;
      }

      str = i.toFixed(0); 
      n = this.get_x(x);
      len = str.length;
      text = new Text("10<sup>" + str + "</sup>");
      text.init(this.scale_x, n, this.scale_x.offset);
      text.x(n - text.get_width() / 2);
      this.draw_gauge1_x(n);
    }

    for (i = Math.floor(min); i < max; i += inc) {
      x = Math.pow(10, i);

      n = this.get_x(x);
      if (inc == 1) {
	for (m = 2; m < 10; m++) {
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
  },

  gauge_log_y: function () {
    var max, min, i, m, width, height, n, y, inc, x;

    if (this.max_y <= 0 || this.min_y <= 0) {
      return;
    }

    max = Math.log10(this.max_y);
    min = Math.log10(this.min_y);
    if (max - min < 1) {
      this.gauge_y();
      return;
    } else if (max - min > 20) {
      inc = Math.ceil((max - min) / 10) + 1;
    } else {
      inc = 1;
    }

    x = this.scale_y.offset;
    for (i = Math.ceil(min); i < max; i += inc) {
      var x0;

      y = Math.pow(10, i);
      if (y > this.max_y) {
	break;
      }

      str = i.toFixed(0); 
      n = this.get_y(y);
      len = str.length;
      text = new Text("10<sup>" + str + "</sup>");
      text.init(this.scale_y, this.scale_y.offset, n - Font_size);
      x0 = this.scale_y.offset - text.get_width();
      text.x(x0);
      this.draw_gauge1_y(n);
      x = (x0 < x) ? x0 : x;
    }

    this.caption_y_auto_set_position(x);

    for (i = Math.floor(min); i < max; i += inc) {
      y = Math.pow(10, i);

      n = this.get_y(y);
      if (inc == 1) {
	for (m = 2; m < 10; m++) {
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
  },

  set_size: function (w, h) {
    this.parent_frame.style.width = w + "px";
    this.parent_frame.style.height = h + "px";
    update_position();
  },

  move_to_center: function(obj, left, width) {
    if (! obj.moved) {
      var w;
      w = obj.get_width();
      obj.x(left + (width - w) / 2);
    } else {
      obj.x(left + obj.text.offset_x);
    }
  },

  update_position: function () {
    var parent_frame = this.parent_frame;
    var frame = this.frame;
    var width  = parseInt(parent_frame.style.width);
    var height = parseInt(parent_frame.style.height);
    var left   = parseInt(parent_frame.style.left);
    var top    = parseInt(parent_frame.style.top);

    frame.style.width = parent_frame.style.width;
    frame.style.height = parent_frame.style.height;
    frame.width = width;
    frame.height = height;

    this.move_to_center(this.title, left, width);
    this.title.y(top + this.title.text.offset_y);

    this.caption_y.x(left + this.caption_y.text.offset_x);
    this.caption_y.y(top  + this.caption_y.text.offset_y);

    this.move_to_center(this.caption_x, left, width);
    this.caption_x.y(top + height + this.caption_x.text.offset_y);

    this.scale_x.style.left = left + 'px';
    this.scale_x.style.top  = (top + height + this.scale_x.offset) + 'px';

    this.scale_y.style.left = (left + this.scale_y.offset) + 'px';
    this.scale_y.style.top  = top + 'px';

    this.legend.style.left = (left + width + this.legend.offset_x) + 'px';
    this.legend.style.top = (top + this.legend.offset_y) + 'px';
  },

  clear: function () {
    var node;

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

    this.canvas.clearRect(0, 0, this.frame.width, this.frame.height);
  },

  draw: function () {
    document.body.style.cursor='wait';
    this.clear();
    this.update_position();
    switch (this.scale_x.type) {
    case this.SCALE_TYPE_LINEAR:
      this.gauge_x();
      break;
    case this.SCALE_TYPE_LOG:
      this.gauge_log_x();
      break;
    case this.SCALE_TYPE_UNIX:
    case this.SCALE_TYPE_MJD:
      this.gauge_date_x();
      break;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.gauge_log_y();
    } else {
      this.gauge_y();
    }
    this.draw_data();
    document.body.style.cursor='auto';
    if (this.draw_event_listner) {
      this.draw_event_listner(this);
    }
  },

  set_draw_event_listner: function (func) {
    this.draw_event_listner = func;
  },

  scale_x_type: function (type) {
    switch (type) {
      case "linear":
      this.scale_x.type = this.SCALE_TYPE_LINEAR;
      break;
      case "log":
      this.scale_x.type = this.SCALE_TYPE_LOG;
      break;
      case "unix":
      this.scale_x.type = this.SCALE_TYPE_UNIX;
      break;
      case "mjd":
      this.scale_x.type = this.SCALE_TYPE_MJD;
      break;
      default:
      this.scale_x.type = this.SCALE_TYPE_LINEAR;
    }
  },

  scale_y_type: function (type) {
    if (type == "log") {
      this.scale_y.type = this.SCALE_TYPE_LOG;
    } else {
      this.scale_y.type = this.SCALE_TYPE_LINEAR;
    }
  },

  zoom_out_x: function () {
    var w;
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x /= this.zoom_ratio;
      this.max_x *= this.zoom_ratio;
    } else {
      w = (this.max_x - this.min_x) * (this.zoom_ratio - 1) / 2;
      this.min_x -= w;
      this.max_x += w;
    }
  },

  zoom_out_y: function () {
    var h;
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y /= this.zoom_ratio;
      this.max_y *= this.zoom_ratio;
    } else {
      h = (this.max_y - this.min_y) * (this.zoom_ratio - 1) / 2;
      this.min_y -= h;
      this.max_y += h;
    }
  },

  zoom_out: function () {
    this.zoom_out_x();
    this.zoom_out_y();
  },

  zoom_in_x: function () {
    var w;
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x *= this.zoom_ratio;
      this.max_x /= this.zoom_ratio;
    } else {
      w = (this.max_x - this.min_x) * (1 - 1 / this.zoom_ratio) / 2;
      this.min_x += w;
      this.max_x -= w;
    }
  },

  zoom_in_y: function () {
    var h;
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y *= this.zoom_ratio;
      this.max_y /= this.zoom_ratio;
    } else {
      h = (this.max_y - this.min_y) * (1 - 1 / this.zoom_ratio) / 2;
      this.min_y += h;
      this.max_y -= h;
    }
  },

  zoom_in: function () {
    this.zoom_in_x();
    this.zoom_in_y();
  },

  set_scale: function (minx, miny, maxx, maxy) {
    if (minx) {
      this.min_x = minx;
    }
    if (maxx) {
      this.max_x = maxx;
    }
    if (miny) {
      this.min_y = miny;
    }
    if (maxy) {
      this.max_y = maxy;
    }
  },

  centering: function (x, y) {
    var w, h, minx, maxx, miny, maxy;
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      w = Math.sqrt(this.max_x / this.min_x);
      minx = x / w;
      maxx = x * w;
    } else {
      w = this.max_x - this.min_x;
      minx = x - w / 2;
      maxx = x + w / 2;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      h = Math.sqrt(this.max_y / this.min_y);
      miny = y / h;
      maxy = y * h;
    } else {
      h = this.max_y - this.min_y;
      miny = y - h / 2;
      maxy = y + h / 2;
    }
    this.set_scale(minx, miny, maxx, maxy);
  },

  load: function() {
    var self = this, title = this.title.get_text();
    var recursive_load = function(files, i) {
      var data = new Data();
      self.title.set_text("Data loading... [" + (i + 1) + "/" + files.length + "]");
      self.add_data(data);
      data.set_color(self.Colors[i % self.Colors.length]);
      data.set_style(self.Style);
      data.load(files[i], self.X, self.Y, self.FS, self.RS);
      data.set_text(files[i]);
      data.wait(function() {
	if (i < files.length - 1) {
	  recursive_load(files, i + 1);
	} else {
	  self.title.set_text(title);
	  self.autoscale();
	  self.draw();
	}
      });
    }
    recursive_load(arguments, 0);
  }
};

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
  this.caption = null;
  this.width = 2;
  this.style = "c";
  this.loaded = false;
  this.maxDataNum = -1;
}

Data.prototype = {
  length: function () {
    return this.data.length;
  },

  clear: function () {
    this.min_x = 0;
    this.max_x = 1;
    this.min_y = 0;
    this.max_y = 1;
    this.data.length = 0;
  },

  add_data: function (x, y) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }
    if (this.data.length < 1) {
      this.min_x = x;
      this.max_x = x;
      this.min_y = y;
      this.max_y = y;
      this.draw = true;
    } else {
      if (x < this.min_x) {
	this.min_x = x;
      } else if (x > this.max_x) {
	this.max_x = x;
      }
    
      if (y < this.min_y) {
	this.min_y = y;
      } else if (y > this.max_y) {
	this.max_y = y;
      }
    }
    this.data.push([x, y]);
    if (this.maxDataNum > 0 && this.data.length > this.maxDataNum) {
      this.data.shift();
    }
  },

  str2data: function (s, sep1, sep2) {
    /* this function is obsolete */
    var i, n;
    var data = s.split(sep1);
    var xy_data;

    n = data.length;
    for (i = 0; i < n; i++) {
      xy_data = data[i].split(sep2);
      if (xy_data.length > 1) {
	this.add_data(parseFloat(xy_data[0]), parseFloat(xy_data[1]));
      }
    }
  },

  read_data: function (s) {
    var i, n, m, x, y, col_x = 0, col_y = 1, rs = "\n", fs = new RegExp("[ ,\t]+");
    var data, xy_data;

    switch (arguments.length) {
    case 5:
      rs = arguments[4];
    case 4:
      fs = arguments[3];
    case 3:
      col_y = parseInt(arguments[2]) - 1;
      col_x = parseInt(arguments[1]) - 1;
      break;
    }
    data = s.split(rs);
    n = data.length;

    x = col_x;
    y = col_y;

    for (i = 0; i < n; i++) {
      xy_data = data[i].split(fs);
      m = xy_data.length;

      if (col_x < 0) {
	x = col_x + m + 1;
      }

      if (col_y < 0) {
	y = col_y + m + 1;
      }

      if (xy_data.length > 1) {
	this.add_data(parseFloat(xy_data[x]),
		      parseFloat(xy_data[y]));
      }
    }
  },

  load: function (path) {
    var i, self, arg;

    self = this;
    this.loaded = false;
    arg = arguments;

    XMLHttp.open('GET', path, true);
    XMLHttp.onreadystatechange = function() {
      var text, a;
      if (XMLHttp.readyState == 4) {
	if (XMLHttp.status != 200) {
	  self.loaded = true;
	  return;
	}
	arg[0] = XMLHttp.responseText;
	self.read_data.apply(self, arg);
	self.loaded = true;
      }
    }
    XMLHttp.send(null);
  },

  wait: function(cb) {
    var data = this;
    wait_until_data_loaded = function () {
      if (data.loaded) {
	cb();
	return;
      } else {
	window.setTimeout("wait_until_data_loaded()", 100);
      }
    }
    wait_until_data_loaded();
  },

  autoscale: function () {
    var minx = Infinity;
    var maxx = -Infinity;
    var miny = Infinity;
    var maxy = -Infinity;
    var i, n;

    if (this.data.length < 1) {
      this.draw = false;
      return;
    }

    n = this.data.length;
    for (i = 0; i < n; i++) {
      if (! isFinite(this.data[i][0]) || ! isFinite(this.data[i][1])) {
	continue;
      }
      if (this.data[i][0] < minx) {
	minx = this.data[i][0];
      }
      if (this.data[i][0] > maxx) {
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
  },

  set_text: function (s) {
    this.caption = s;
  },

  set_color: function (s) {
    this.color = s;
  },

  set_style: function (s) {
    this.style = s;
  },

  set_line_width: function (w) {
    this.width = w;
  },

  set_mark_size: function (s) {
    this.size = s;
  }
};
