$OMNICHANNEL_DASHBOARD = {
	start: function(){
		console.log("start omnichannel dashboard");
		var ctrl = this, $view = $("#omnichannel_dashboard");
		ctrl.$view = $view;

		$(".start_title").html(lang.omnichannel + ' <i class="fa fa-caret-right"></i> Dashboard');

		// Scroll
		$("#omnichannelView .x-panel-body").css("overflow-y", "auto");
		$("#omnichannelView .x-container").css("background-color", "white");

		// Etiquetas
		$view.find(".lblPeriod").html(lang.period+":");
		$view.find(".lblGroups").html(lang.groups+":");
		$view.find(".lblChannel").html(lang.channel+":");		
		
		// Controles
		ctrl.$period = $view.find(".period");
		ctrl.$groups = $view.find(".groups");
		ctrl.$group = $view.find(".group");
		ctrl.$agent = $view.find(".agent");
		ctrl.$channel = $view.find(".channel");
		
		// Obtener la información guardada anteriormente
		//socketOmnichannel._emit('dashboard get', { idEnterprise: localStorage.Enterprise });
		
		// Periodo
		setCombo_selectize({ service: 'Dashboard', method: 'ConsultarComboFecha', $combo: ctrl.$period });

		// Grupos
		setCombo_selectize({ service: 'Dashboard', method: 'ConsultarComboGrupo', $combo: ctrl.$groups, afterLoad: function(){
			var description = localStorage.Supervisor == "true" ? lang.supervised_group : lang.all;
			var selectize = ctrl.$groups[0].selectize;
			selectize.setValue(selectize.search(description).items[0].id);

			selectize.on('change', function() {
		  		var value = selectize.getValue();
		  		var option = selectize.getOption(value)[0].innerText.toUpperCase().removeAccents();
		  		var methodGroup = 'ConsultarCombo?&idPerfil=' + localStorage.IdPerfil + '&idAgente=' + localStorage.IdAgente;
				switch (option) {
					case lang.specific_group.toUpperClean():
						//ctrl.$group.show();
						setCombo_selectize({ service: 'Grupo', method: methodGroup, $combo: ctrl.$group });
						$(".selectize-control.group").show();
						/*$filter2.minChars = 0;
						$filter2.setEmptyText(lang.select_group).show()
							.bindStore(getStore({ url: grupoURL, pageSize: 10, autoLoad: false }));
						$filter2.store.load();*/
						break;

					case lang.specific_agent.toUpperClean():
						/*$filter2.minChars = 0;
						$filter2.setEmptyText(lang.select_group).show()
							.bindStore(getStore({ url: grupoURL, pageSize: 10, autoLoad: false, extraParams: { filtro: "todos" } }));
						$filter2.store.load();*/
						break;
					
					default:
						$(".selectize-control.group, .selectize-control.agent").hide();
						break;
				}			  	
			});
		} });

		ctrl.$group.attr("placeholder", lang.select_group);
		ctrl.$agent.attr("placeholder", lang.select_agent);

		// Canal
		ctrl.$channel.append('<option value="1">Todos</option>').selectize();

        //getUrl(Servicio.Dashboard, '')
	},

	got: function(data){
		console.log("got");

		if(!data) return;
		var ctrl = this, $view = ctrl.$view;

		ctrl.$name.val(data.name);
		ctrl.$objective.val(data.objective);
		ctrl.$responseTime.val(getTime(data.responseTime));
		ctrl.$solveTime.val(getTime(data.solveTime));
		ctrl.$waitingEffective.val(data.waitingEffective);
		ctrl.$solutionEffective.val(data.solutionEffective);
	},

	save: function(){
		console.log("save");

		var ctrl = this, $view = ctrl.$view;
		var validation = ctrl.validation();
		if (typeof validation == "function") {
			validation();
			return;
		}

		_$("main-panel").mask()
		socketOmnichannel._emit('sla save', validation);
	},

	validation: function(){
		console.log("validation");

		var ctrl = this, $view = ctrl.$view;
		var jValidate = { error: "", $fieldError: "" }
		
		// Nombre
		jValidate = { type: "TEXT", $cmp: ctrl.$name, msgError: lang.error_name, error: jValidate.error, $fieldError: jValidate.$fieldError }
		var name = jValidation(jValidate);

		// Objetivo operativo
		jValidate = { type: "TEXT", $cmp: ctrl.$objective, msgError: lang.error_operational_objective, error: jValidate.error, $fieldError: jValidate.$fieldError }
		var objective = jValidation(jValidate);		

		if (jValidate.error != ""){
			return function(){
				warning(jValidate.error); 
				if(jValidate.$fieldError) 
					jValidate.$fieldError.focus(); 
			}
        }

        var responseTime = validacionTiempo(ctrl.$responseTime.val()).tiempoFinal;
        var solveTime = validacionTiempo(ctrl.$solveTime.val()).tiempoFinal;

        var jData = {
        	idEnterprise: localStorage.Enterprise,
        	name: name, 
        	objective: objective, 
        	responseTime: responseTime, 
        	solveTime: solveTime, 
        	waitingEffective: ctrl.$waitingEffective.val(), 
        	solutionEffective: ctrl.$solutionEffective.val()
		}
		return jData;
	},

	saved: function(data){
		console.log("saved");

		var ctrl = this, $view = ctrl.$view;
		_$("main-panel").unmask()
		if(data == true)
			success(lang.successfully_updated);		
		else
			warning(lang.error_save_information);
	}
}