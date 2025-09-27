window.onload=draw;

Math.cosh = function(x) {
  return (this.exp(x) + this.exp(-x)) / 2;
}

Math.sinh = function(x) {
  return (this.exp(x) - this.exp(-x)) / 2;
}

Math.tanh = function(x) {
  return (this.exp(x) - this.exp(-x)) / (this.exp(x) + this.exp(-x));
}

Math.atanh = function(x) {
  return this.log((1 + x) / (1 - x))/2
}

Math.asinh = function(x) {
  return this.log(x + this.sqrt(x * x + 1));
}

Math.acosh = function(x) {
  return this.log(x + this.sqrt(x * x - 1));
}

Math.log10 = function(x) {
  return this.log(x) / this.LN10;
}

Color = [
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
	 ]
N = 3;
Data_file = "time_difference";
graph = new JSGraph('mygraph');

for (var i = 0; i < N; i++) {
  var data = new Data();
  data.set_color(Color[i]);
  data.set_style("l");
  graph.add_data(data);
}

function resize_mode() {
  var chk;
  chk = document.getElementById("resize_mode").checked;
  if (chk) {
    graph.resize_mode();
  } else {
    graph.scale_mode();
  }
}

function set_style(style) {
  for (n = 0; n < N; n++) {
    graph.data[n].set_style(style);
  }
}

function set_axis_style(style) {
  graph.scale_x_type(style);
}

function change_axis_style() {
  var utc = document.getElementById("type_utc").selected;
  var is_func = document.getElementById("type_func").selected;

  if (is_func) {
    return;
  }

  if (utc) {
    set_axis_style("mjd");
  } else {
    set_axis_style("linear");
  }
  graph.draw();
}

function set_line_width() {
  var lw = document.getElementById("line_width").selectedIndex + 1;
  for (n = 0; n < N; n++) {
    graph.data[n].set_line_width(lw);
  }
}

function set_mark_size() {
  var s = document.getElementById("mark_size").selectedIndex + 1;
  for (n = 0; n < N; n++) {
    graph.data[n].set_mark_size(s);
  }
}

function load_data(n, lw, ms) {
  var chk;
  chk = document.getElementById("data" + (n + 1)).checked;
  if (chk) {
    graph.data[n].load(Data_file + (n + 1));
    graph.data[n].set_text(Data_file + (n + 1));
    graph.data[n].set_line_width(lw);
    graph.data[n].set_mark_size(ms);
    graph.data[n].draw = true;
  }
  return chk;
}

function draw() {
  var data, chk, div, min, max, eqn, inc, func, i, n;
  var math_rex = new RegExp("([A-Z]+)|([a-z]{2,})", "g");
  var is_func = document.getElementById("type_func").checked;
  var is_utc =  document.getElementById("type_utc").checked;
  var line_width = document.getElementById("line_width").selectedIndex + 1;
  var mark_size = document.getElementById("mark_size").selectedIndex + 1;

    if (is_func) {
      graph.scale_x_type("linear");
      for (n = 0; n < N; n++) {
	div = Number(document.getElementById("div" + (n + 1)).value);
	min = Number(document.getElementById("min" + (n + 1)).value);
	max = Number(document.getElementById("max" + (n + 1)).value);
	eqn = document.getElementById("eqn" + (n + 1)).value;
	chk = document.getElementById("draw" + (n + 1)).checked;

	data = graph.data[n];
	data.set_text(eqn);
	data.set_line_width(line_width);
	data.set_mark_size(mark_size);

	if (!chk) {
	  data.clear();
	  data.draw = false;
	  continue;
	}

	if (div < 1) {
	  break;
	}

	if (min == max) {
	  break;
	}
	eqn = eqn.replace(math_rex, "Math.$&");
	func = new Function("x", "return " + eqn);

	inc = (max - min) / (div - 1);
	data.clear();
	for (i = 0; i < div; i++) {
	  var x = min + inc * i;
	  data.add_data(x, func(x));
	}
      }
      graph.autoscale();
      graph.draw();
    } else {
      if (is_utc) {
	graph.scale_x_type("mjd");
      } else {
	graph.scale_x_type("linear");
      }
      for (n = 0; n < N; n++) {
	graph.data[n].set_text(null);
	graph.data[n].clear();
	graph.data[n].draw = false;
      }
      var draw_data2 = function(n) {
	if (load_data(1, line_width, mark_size)) {
	  graph.data[1].wait(function() {
	    graph.autoscale();
	    graph.draw();
	  });
	} else {
	  graph.autoscale();
	  graph.draw();
	}
      }
      if (load_data(0, line_width, mark_size)) {
	graph.data[0].wait(draw_data2);
      } else {
	draw_data2();
      }
    }
  try {
  } catch (e) {
    window.alert(e.toString());
  }
}
