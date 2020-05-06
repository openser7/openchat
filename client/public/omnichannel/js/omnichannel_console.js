$OMNICHANNEL_CONSOLE = {
	start: function(){
		console.log("start omnichannel > console");
		var ctrl = this, $view = $("#omnichannel_console");
		ctrl.$view = $view;

		// Etiquetas
		$view.find(".lblPeriod").html(lang.period+":");
		$view.find(".lblGroups").html(lang.groups+":");		
		
		// Controles
		ctrl.$period = $view.find(".period");
		ctrl.$groups = $view.find(".groups");
		ctrl.$grid = $view.find(".grid");

		// Obtener la información guardada anteriormente
		//socketOmnichannel._emit('settings get', { idEnterprise: localStorage.Enterprise });

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
				var grupoURL = getUrl('Grupo', 'ConsultarCombo?&idPerfil=' + localStorage.IdPerfil + '&idAgente=' + localStorage.IdAgente);
				switch (option) {
					case lang.specific_group.toUpperClean():
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
				}

			  	
			});
		} });

		// Información del grid
		var jData = [{ assignedTo: "Adriana Pesina", assignedGroup: "Soporte Técnico", SLA: "bRed", ticket: "INC318", client: "Miguel Aleman", channel: "Chat", responseTime: "28s", solutionTime: "10m 4s" },
		{ assignedTo: "Juan Moreno", assignedGroup: "Calidad", SLA: "bGreen", ticket: "INC317", client: "Uriel Ugarte", channel: "Twitter", responseTime: "40s", solutionTime: "9m 11s" },
		{ assignedTo: "Jorge Palacios", assignedGroup: "CAO", SLA: "bRed", ticket: "INC316", client: "Marco Lazaro", channel: "Correo", responseTime: "9s", solutionTime: "11m 56s" },
		{ assignedTo: "Victoria Martínez", assignedGroup: "Soporte Técnico", SLA: "bRed", ticket: "", client: "Armando Flores", channel: "Whatsapp", responseTime: "15s", solutionTime: "3m 0s" },
		{ assignedTo: "Jorge Palacios", assignedGroup: "CAO", SLA: "bYellow", ticket: "", client: "Roberto Saldivar", channel: "Facebook", responseTime: "18s", solutionTime: "21m 23s" },
		{ assignedTo: "Juan Moreno", assignedGroup: "Calidad", SLA: "bGreen", ticket: "INC315", client: "Fernanda Sánchez", channel: "Whatsapp", responseTime: "23s", solutionTime: "5m 28s" }];
		
		var rows = "";
		jData.forEach(function(item){
			rows += '<tr>'+
				'<td class="check"></td>'+
				'<td>'+item.assignedTo+'</td>'+
				'<td>'+item.assignedGroup+'</td>'+
				'<td><i class="stateSLA '+item.SLA+'"></i></td>'+
				'<td>'+item.ticket+'</td>'+
				'<td>'+item.client+'</td>'+
				'<td>'+item.channel+'</td>'+
				'<td>'+item.responseTime+'</td>'+
				'<td>'+item.solutionTime+'</td>'+
			'</tr>';
		});
		ctrl.$grid.find("tbody").append(rows);
		ctrl.$grid.find("tbody tr:eq(4)").addClass("selected");
	},

	got: function(data){
		console.log("got");

		if(!data) return;
		var ctrl = this, $view = ctrl.$view;

		ctrl.$welcome.val(data.welcome);
		ctrl.$farewell.val(data.farewell);
	}
}