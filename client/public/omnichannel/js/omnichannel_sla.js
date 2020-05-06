$OMNICHANNEL_SLA = {
	start: function(){
		console.log("start omnichannel sla");
		var ctrl = this, $view = $("#omnichannel_sla");
		ctrl.$view = $view;
		
		// Etiquetas
		$view.find(".lblName").html(lang.sla_name);
		$view.find(".lblObjective").html(lang.operational_objective);
		$view.find(".lblObjectives_title").html(lang.sla_objectives);
		$view.find(".lblBoxAdvise").html(lang.omnichannel_sla_important);
		$view.find(".lblWaiting").html(lang.waiting_time);
		$view.find(".lblSolution").html(lang.solution_time);
		$view.find(".lblWaitingEffective").html(lang.effectiveness_waiting);
		$view.find(".lblSolutionEffective").html(lang.effectiveness_solution);
		
		// Controles
		ctrl.$name = $view.find(".name");
		ctrl.$objective = $view.find(".objective");		
		ctrl.$waitingTime = $view.find(".waitingTime");
		ctrl.$waitingEffective = $view.find(".waitingEffective");
		ctrl.$solutionTime = $view.find(".solutionTime");
		ctrl.$solutionEffective = $view.find(".solutionEffective");
		
		// Campos de hora
		inputTime($view.find(".waitingTime"));
		inputTime($view.find(".solutionTime"));
		
		// Campos de porcentaje		
		$view.find(".txtPercent").val("0").keypress(function(e){
			// Solo aceptar numeros
			if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57))
				return false;
		}).on("input", function(){
			this.value = +this.value;
			if(isNaN(+this.value))
				this.value = 0;
			else if(this.value > 100)
				this.value = 100;
		});

		// Obtener la información guardada anteriormente
		socketOmnichannel._emit('sla get');

		// Botones
		$view.find(".btnSave").html(lang.save).click(function(){
			ctrl.save();
		});

		ctrl.$name.focus();
	},

	got: function(data){
		console.log("got");
		console.log(data);

		if(!data) return;
		var ctrl = this, $view = ctrl.$view;

		ctrl.$name.val(data.name);
		ctrl.$objective.val(data.objective);				
		ctrl.$waitingTime.val(secondsToTime(data.waitingTime));
		ctrl.$waitingEffective.val(data.waitingEffective);
		ctrl.$solutionTime.val(secondsToTime(data.solutionTime));
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

        var waitingTime = validacionTiempo(ctrl.$waitingTime.val()).seconds;
        var solutionTime = validacionTiempo(ctrl.$solutionTime.val()).seconds;        

        var jData = {
        	idEnterprise: localStorage.Enterprise,
        	name: name, 
        	objective: objective,         	
        	waitingTime: waitingTime, 
        	waitingEffective: ctrl.$waitingEffective.val(), 
        	solutionTime: solutionTime,
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