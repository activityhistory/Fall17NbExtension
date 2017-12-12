define(["require", "jquery", "base/js/namespace", 'services/config', 
    'base/js/events', 'base/js/utils', 'notebook/js/codecell'
], function(require, $, Jupyter, configmod, events, utils, codecell) {

    var Notebook = require('notebook/js/notebook').Notebook 
    "use strict";
    var mod_name = "varInspector";
    var log_prefix = '[' + mod_name + '] ';


    // ...........Parameters configuration......................
    // define default values for config parameters if they were not present in general settings (notebook.json)
    var cfg = {
        'window_display': false,
        'cols': {
            'lenName': 16,
            'lenType': 16,
            'lenVar': 40
        },
        'kernels_config' : {
            'python': {
                library: 'var_list.py',
                delete_cmd_prefix: 'del ',
                delete_cmd_postfix: '',
                varRefreshCmd: 'print(var_dic_list())'
            },
            'r': {
                library: 'var_list.r',
                delete_cmd_prefix: 'rm(',
                delete_cmd_postfix: ') ',
                varRefreshCmd: 'cat(var_dic_list()) '
            }
        },
        'types_to_exclude': ['module', 'function', 'builtin_function_or_method', 'instance', '_Feature']
    }



    //.....................global variables....


    var st = {}
    st.config_loaded = false;
    st.extension_initialized = false;
    st.code_init = "";

    function read_config(cfg, callback) { // read after nb is loaded
        // create config object to load parameters
        var base_url = utils.get_body_data("baseUrl");
        var initial_cfg = $.extend(true, {}, cfg);
        var config = Jupyter.notebook.config; //new configmod.ConfigSection('notebook', { base_url: base_url });
        config.loaded.then(function() {
            // config may be specified at system level or at document level.
            // first, update defaults with config loaded from server
            cfg = $.extend(true, cfg, config.data.varInspector);
            // then update cfg with some vars found in current notebook metadata
            // and save in nb metadata (then can be modified per document)

            // window_display is taken from notebook metadata
            if (Jupyter.notebook.metadata.varInspector) {
                if (Jupyter.notebook.metadata.varInspector.window_display)
                    cfg.window_display = Jupyter.notebook.metadata.varInspector.window_display;
            }

            cfg = Jupyter.notebook.metadata.varInspector = $.extend(true,
            cfg, Jupyter.notebook.metadata.varInspector);       

            // but cols and kernels_config are taken from system (if defined)
            if (config.data.varInspector) {
                if (config.data.varInspector.cols) {
                    cfg.cols = $.extend(true, cfg.cols, config.data.varInspector.cols);  
                }
                if (config.data.varInspector.kernels_config) {
                    cfg.kernels_config = $.extend(true, cfg.kernels_config, config.data.varInspector.kernels_config);  
                }
            }

            // call callbacks
            callback && callback();
            st.config_loaded = true;
        })
        config.load();
        return cfg;
    }

    var sortable;

    function toggleVarInspector() {
        toggle_varInspector(cfg, st)
    }

    var varInspector_button = function() {
        if (!Jupyter.toolbar) {
            events.on("app_initialized.NotebookApp", varInspector_button);
            return;
        }
        if ($("#varInspector_button").length === 0) {
            Jupyter.toolbar.add_buttons_group([{
                'label': 'Variable Inspector',
                'icon': 'fa-crosshairs',
                'callback': toggleVarInspector,
                'id': 'varInspector_button'
            }]);
        }
    };

    var load_css = function() {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = require.toUrl("./main.css");
        document.getElementsByTagName("head")[0].appendChild(link);
    };

function getIn(var_list){
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

    var Ins_list = []
    namespace_vars: /*label of for loop to break nested for loop*/
    for (var n = 0; n < var_list.length; n++){
    var substring = var_list[n];

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
                    Ins_list.push(Ins_sort[i])
                    break all_cell
                }
            }
        }
    }
    return(Ins_list)

}

function html_table(jsonVars) {
    function _trunc(x, L) {
        x = String(x)
        if (x.length < L) return x
        else return x.substring(0, L - 3) + '...'
    }
    var kernelLanguage = Jupyter.notebook.metadata.kernelspec.language.toLowerCase()
    var kernel_config = cfg.kernels_config[kernelLanguage];
    var varList = JSON.parse(String(jsonVars))

    var beg_table = '<div class=\"inspector\"><table class=\"table fixed table-condensed table-nonfluid \"><col /> \
 <col  /><col /><thead><tr><th >Name</th><th >Type</th><th >Size</th><th >Value</th><th >Last Updated</th></tr></thead><tr><td> \
 </td></tr>'
    var nb_vars = varList.length;
    var nameSpace_list = []
    for (var i = 0; i < nb_vars; i++) {
        nameSpace_list.push(varList[i].varName)
    }
    var InNumber_list = getIn(nameSpace_list)
    for (var i = 0; i < nb_vars; i++) {
        var InNumber = "In["+InNumber_list[i]+"]"
        if(varList[i].varType=='DataFrame'){
            beg_table = beg_table +
                '<tr>' +
                '<td>' + _trunc(varList[i].varName, cfg.cols.lenName) + '</td><td>' + _trunc(varList[i].varType, cfg.cols.lenType) +
                '</td><td>' + varList[i].varSize + '</td><td>' + 'dataframe' + '</td><td>' + InNumber +
                '</td></tr>'
        }
        else {
            beg_table = beg_table +
                '<tr>' +
                '<td>' + _trunc(varList[i].varName, cfg.cols.lenName) + '</td><td>' + _trunc(varList[i].varType, cfg.cols.lenType) +
                '</td><td>' + varList[i].varSize + '</td><td>' + _trunc(varList[i].varContent, cfg.cols.lenVar) + '</td><td>' + InNumber +
                '</td></tr>'
        }
    }
    var full_table = beg_table + '</table></div>'
    return full_table
}



    function code_exec_callback(msg) {
        var jsonVars = msg.content['text'];
        if (jsonVars == undefined) varInspector_init() 
        //means that msg.text is undefined, that is var_dic_list was cleared ==> need to retart the enxtesnion
        else $('#varInspector').html(html_table(jsonVars))
        
        require(['nbextensions/varInspector/jquery.tablesorter.min'],
            function() {
        setTimeout(function() { if ($('#varInspector').length>0)
            $('#varInspector table').tablesorter()}, 50)
        });
    }

    function tableSort() {
        require(['nbextensions/varInspector/jquery.tablesorter.min'])
        $('#varInspector table').tablesorter()
    }

    var varRefresh = function() {
        var kernelLanguage = Jupyter.notebook.metadata.kernelspec.language.toLowerCase()
        var kernel_config = cfg.kernels_config[kernelLanguage];
        require(['nbextensions/varInspector/jquery.tablesorter.min'],
            function() {
                Jupyter.notebook.kernel.execute(
                    kernel_config.varRefreshCmd, { iopub: { output: code_exec_callback } }, { silent: false }
                );
            });
    }


    var varInspector_init = function() {
        // Define code_init
        // read and execute code_init 
        function read_code_init(lib) {
            var baseUrl = require('base/js/utils').get_body_data("baseUrl")
            var libName = baseUrl + "nbextensions/varInspector/" + lib;
            $.get(libName).done(function(data) {
                st.code_init = data;
                st.code_init = st.code_init.replace('lenName', cfg.cols.lenName).replace('lenType', cfg.cols.lenType)
                        .replace('lenVar', cfg.cols.lenVar)
                        //.replace('types_to_exclude', JSON.stringify(cfg.types_to_exclude).replace(/\"/g, "'"))
                require(
                        [
                            'nbextensions/varInspector/jquery.tablesorter.min'
                            //'nbextensions/varInspector/colResizable-1.6.min'
                        ],
                        function() {
                            Jupyter.notebook.kernel.execute(st.code_init, { iopub: { output: code_exec_callback } }, { silent: false });
                        })
                    variable_inspector(cfg, st);  // create window if not already present      
                console.log(log_prefix + 'loaded library');
            }).fail(function() {
                console.log(log_prefix + 'failed to load ' + lib + ' library')
            });
        }

            // read configuration  

            cfg = read_config(cfg, function() {                
            // Called when config is available
                if (typeof Jupyter.notebook.kernel !== "undefined" && Jupyter.notebook.kernel !== null) {
                    var kernelLanguage = Jupyter.notebook.metadata.kernelspec.language.toLowerCase()
                    var kernel_config = cfg.kernels_config[kernelLanguage];
                    if (kernel_config === undefined) { // Kernel is not supported
                        console.warn(log_prefix + " Sorry, can't use kernel language " + kernelLanguage + ".\n" +
                            "Configurations are currently only defined for the following languages:\n" +
                            Object.keys(cfg.kernels_config).join(', ') + "\n" +
                            "See readme for more details.");
                        if ($("#varInspector_button").length > 0) { // extension was present
                            $("#varInspector_button").remove(); 
                            $('#varInspector-wrapper').remove();
                            // turn off events
                            events.off('execute.CodeCell', varRefresh); 
                            events.off('varRefresh', varRefresh);
                        }
                        return
                    }
                    varInspector_button(); // In case button was removed 
                    // read and execute code_init (if kernel is supported)
                    read_code_init(kernel_config.library);
                    // console.log("code_init-->", st.code_init)
                    } else {
                    console.warn(log_prefix + "Kernel not available?");
                    }
            }); // called after config is stable  

            // event: on cell execution, update the list of variables 
            events.on('execute.CodeCell', varRefresh);
            events.on('varRefresh', varRefresh);
            }


    var create_varInspector_div = function(cfg, st) {
        function save_position(){
            Jupyter.notebook.metadata.varInspector.position = {
                'left': $('#varInspector-wrapper').css('left'),
                'top': $('#varInspector-wrapper').css('top'),
                'width': $('#varInspector-wrapper').css('width'),
                'height': $('#varInspector-wrapper').css('height'),
                'right': $('#varInspector-wrapper').css('right')
            };
        }
        var varInspector_wrapper = $('<div id="varInspector-wrapper"/>')
            .append(
                $('<div id="varInspector-header"/>')
                .addClass("header")
                .text("Variable Inspector ")
                .append(
                    $("<a/>")
                    .attr("href", "#")
                    .text("[x]")
                    .addClass("kill-btn")
                    .attr('title', 'Close window')
                    .click(function() {
                        toggleVarInspector();
                        return false;
                    })
                )
                .append(
                    $("<a/>")
                    .attr("href", "#")
                    .addClass("hide-btn")
                    .attr('title', 'Hide Variable Inspector')
                    .text("[-]")
                    .click(function() {
                        $('#varInspector-wrapper').css('position', 'fixed');
                        $('#varInspector').slideToggle({
                            start: function(event, ui) {
                                // $(this).width($(this).width());
                            },
                            'complete': function() {
                                    Jupyter.notebook.metadata.varInspector['varInspector_section_display'] = $('#varInspector').css('display');
                                    save_position();
                                    Jupyter.notebook.set_dirty();
                            }
                        });
                        $('#varInspector-wrapper').toggleClass('closed');
                        if ($('#varInspector-wrapper').hasClass('closed')) {
                            cfg.oldHeight = $('#varInspector-wrapper').height(); //.css('height');
                            $('#varInspector-wrapper').css({ height: 40 });
                            $('#varInspector-wrapper .hide-btn')
                                .text('[+]')
                                .attr('title', 'Show Variable Inspector');
                        } else {
                            $('#varInspector-wrapper').height(cfg.oldHeight); //css({ height: cfg.oldHeight });
                            $('#varInspector').height(cfg.oldHeight - $('#varInspector-header').height() - 30 )
                            $('#varInspector-wrapper .hide-btn')
                                .text('[-]')
                                .attr('title', 'Hide Variable Inspector');
                        }
                        return false;
                    })
                ).append(
                    $("<a/>")
                    .attr("href", "#")
                    .text("  \u21BB")
                    .addClass("reload-btn")
                    .attr('title', 'Reload Variable Inspector')
                    .click(function() {
                        //variable_inspector(cfg,st); 
                        varRefresh();
                        return false;
                    })
                ).append(
                    $("<span/>")
                    .html("&nbsp;&nbsp")
                ).append(
                    $("<span/>")
                    .html("&nbsp;&nbsp;")
                )
            ).append(
                $("<div/>").attr("id", "varInspector").addClass('varInspector')
            )

        $("body").append(varInspector_wrapper);
        // Ensure position is fixed
        $('#varInspector-wrapper').css('position', 'fixed');

        // enable dragging and save position on stop moving
        $('#varInspector-wrapper').draggable({
            drag: function(event, ui) {}, //end of drag function
            start: function(event, ui) {
                $(this).width($(this).width());
            },
            stop: function(event, ui) { // on save, store window position
                    save_position();
                    Jupyter.notebook.set_dirty();
                // Ensure position is fixed (again)
                $('#varInspector-wrapper').css('position', 'fixed');
            },
        });

        $('#varInspector-wrapper').resizable({
            resize: function(event, ui) {
                $('#varInspector').height($('#varInspector-wrapper').height() - $('#varInspector-header').height());
            },
            start: function(event, ui) {
                //$(this).width($(this).width());
                $(this).css('position', 'fixed');
            },
            stop: function(event, ui) { // on save, store window position
                    save_position();
                    $('#varInspector').height($('#varInspector-wrapper').height() - $('#varInspector-header').height())
                    Jupyter.notebook.set_dirty();
                // Ensure position is fixed (again)
                //$(this).css('position', 'fixed');
            }
        })

        // restore window position at startup
            if (Jupyter.notebook.metadata.varInspector.position !== undefined) {
                $('#varInspector-wrapper').css(Jupyter.notebook.metadata.varInspector.position);
            }
        // Ensure position is fixed
        $('#varInspector-wrapper').css('position', 'fixed');

        // Restore window display 
            if (Jupyter.notebook.metadata.varInspector !== undefined) {
                if (Jupyter.notebook.metadata.varInspector['varInspector_section_display'] !== undefined) {
                    $('#varInspector').css('display', Jupyter.notebook.metadata.varInspector['varInspector_section_display'])
                    //$('#varInspector').css('height', $('#varInspector-wrapper').height() - $('#varInspector-header').height())
                    if (Jupyter.notebook.metadata.varInspector['varInspector_section_display'] == 'none') {
                        $('#varInspector-wrapper').addClass('closed');
                        $('#varInspector-wrapper').css({ height: 40 });
                        $('#varInspector-wrapper .hide-btn')
                            .text('[+]')
                            .attr('title', 'Show Variable Inspector');
                    }
                }
                if (Jupyter.notebook.metadata.varInspector['window_display'] !== undefined) {
                    console.log(log_prefix + "Restoring Variable Inspector window");
                    $('#varInspector-wrapper').css('display', Jupyter.notebook.metadata.varInspector['window_display'] ? 'block' : 'none');
                    if ($('#varInspector-wrapper').hasClass('closed')){
                        $('#varInspector').height(cfg.oldHeight - $('#varInspector-header').height())
                    }else{
                        $('#varInspector').height($('#varInspector-wrapper').height() - $('#varInspector-header').height()-30)
                    }
                    
                }
            }
        // if varInspector-wrapper is undefined (first run(?), then hide it)
        if ($('#varInspector-wrapper').css('display') == undefined) $('#varInspector-wrapper').css('display', "none") //block

        varInspector_wrapper.addClass('varInspector-float-wrapper');
    }

    var variable_inspector = function(cfg, st) {

        var varInspector_wrapper = $("#varInspector-wrapper");
        if (varInspector_wrapper.length === 0) {
            create_varInspector_div(cfg, st);
        }

        $(window).resize(function() {
            $('#varInspector').css({ maxHeight: $(window).height() - 30 });
            $('#varInspector-wrapper').css({ maxHeight: $(window).height() - 10 });
        });

        $(window).trigger('resize');
        varRefresh();
    };

    var toggle_varInspector = function(cfg, st) {
        // toggle draw (first because of first-click behavior)
        $("#varInspector-wrapper").toggle({
            'progress': function() {},
            'complete': function() {
                    Jupyter.notebook.metadata.varInspector['window_display'] = $('#varInspector-wrapper').css('display') == 'block';
                    Jupyter.notebook.set_dirty();
                // recompute:
                variable_inspector(cfg, st);
            }
        });
    };


    var load_jupyter_extension = function() {
        load_css(); //console.log("Loading css")
        varInspector_button(); //console.log("Adding varInspector_button")

        // If a kernel is available, 
        if (typeof Jupyter.notebook.kernel !== "undefined" && Jupyter.notebook.kernel !== null) {
            console.log(log_prefix + "Kernel is available -- varInspector initializing ")
            varInspector_init();
        }
        // if a kernel wasn't available, we still wait for one. Anyway, we will run this for new kernel 
        // (test if is is a Python kernel and initialize)
        // on kernel_ready.Kernel, a new kernel has been started and we shall initialize the extension
        events.on("kernel_ready.Kernel", function(evt, data) {
            console.log(log_prefix + "Kernel is available -- reading configuration");
            varInspector_init();
        });
    };

    return {
        load_ipython_extension: load_jupyter_extension,
        varRefresh: varRefresh
    };

});
