/*now the namespace is fake, need to be updated by real data from python*/
fake_namespace = ['x', 'y', 'a']

i = 0;
var Ins = []
var inds =[]
while (Jupyter.notebook.is_valid_cell_index(i)==true) { 
    cell_now = Jupyter.notebook.get_cell(i);
    In = cell_now.input_prompt_number;
    Ins.push(In)
    inds.push(i)
    i = i+1
}

/*sort inds according to Inds*/
var all = [];

for (var i = 0; i < inds.length; i++) {
    all.push( [ Ins[i], inds[i] ] );
}

var all_sort = all.sort(function(a, b) {
  return b[0] - a[0];
});

Ins_sort = [];
inds_sort = [];

$.each(all_sort, function(index, value) {
    Ins_sort.push(value[0]);
    inds_sort.push(value[1]);
});  

namespace_vars: /*label of for loop to break nested for loop*/
for (var n = 0; n < fake_namespace.length; n++){
var substring = fake_namespace[n];

	all_cell:
	for (var i = 0; i < inds.length; i++) {
	    cell_now = Jupyter.notebook.get_cell(inds_sort[i]);
	    cell_content = cell_now.get_text();
	    cell_lines = cell_content.split("\n");

	    inline:
	    for (var j = 0; j < cell_lines.length; j++) {
	    	line = cell_lines[j];
	    	line = line.replace(/\s+/g, '');
	    	line_parsed = line.split("=");
	    	if (line_parsed[0]==substring){ /*after split by "=", check if the segment before "=" equals to namespace*/
	    		console.log("In for "+substring+" is "+Ins_sort[i])
	    		break all_cell
	    	}
	    }
	}
}