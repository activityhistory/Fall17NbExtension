console.log("FigureCap is working!");

require([
	"base/js/namespace",
	"base/js/events"
], 
	function(Jupyter, events){
		console.log("hello2");	
		events.on('output_appended.OutputArea', function(){
			var cell1 = Jupyter.notebook.get_selected_cell();
			cell_id = Jupyter.notebook.find_cell_index(cell1);
			var cell2 = Jupyter.notebook.get_cell(cell_id-1);
			try{
				if(cell2.output_area.outputs["0"].data["image/png"]!==null){
					console.log('meow')
				var newCell = Jupyter.notebook.insert_cell_above();
				Jupyter.notebook.to_markdown(Jupyter.notebook.find_cell_index(newCell));
				var newMcell = Jupyter.notebook.get_selected_cell()
				newMcell.set_text("### Figure caption: ")
				}
				else{
					console.log('hi')
				}
			}
			catch(e){

			} 
		});
		
});



