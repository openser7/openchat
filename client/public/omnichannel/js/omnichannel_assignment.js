$OMNICHANNEL_ASSIGNMENT = {
	start: function(){
		console.log("start omnichannel assignment");
		var ctrl = this, $view = $("#omnichannel_assignment").parent();
		ctrl.$view = $view;
		ctrl.$popup = $("#omnichannel_assignment");
		ctrl.$popup.loading();
		$("html").addClass("hasPopup");
		
		// Controles
		ctrl.$group = $view.find(".cmbGroup");		
		ctrl.$txtSearch = $view.find(".txtSearch");
		ctrl.$divResults = $view.find(".divResults");
		ctrl.$resultsText = $view.find(".divResults .text");
		ctrl.$results = $view.find(".divResults .results");
		ctrl.$noResults = $view.find(".divResults .noResults");
		ctrl.$cancel = $view.find(".footer .cancel");
		ctrl.$accept = $view.find(".footer .accept");

		// Etiquetas
		$view.find(".title .text").html(lang.assignation);
		ctrl.$txtSearch.attr("placeholder", lang.search);
		ctrl.$resultsText.html(lang.results);
		ctrl.$noResults.html(lang.agents_no_connected_group);
		ctrl.$cancel.html(lang.cancel);
		ctrl.$accept.html(lang.assign);
		
		ctrl.getGroups();

		// Botones
		ctrl.$accept.click(function(){
			ctrl.save();
		});
        
        // Eventos
        // Cerrar popup
        $view.click(function(){
        	var $target = $(event.target);
        	if($target.hasClass("popupBackground") || $target.hasClass("close") || $target.hasClass("cancel")){
        		ctrl.close();
        	}
        });
        // Buscar el nombre del agente
        ctrl.$txtSearch.keyup(function(){
        	var search = ctrl.$txtSearch.valTrim().toLowerCase().removeAccents();

        	var result = ctrl.$results.find(".agent .name").filter(function(){
        		var $agent = $(this).parent();
        		if($(this).text().toLowerCase().indexOf(search) == -1)
        			$agent.removeClass("selected").hide();
				else
				    $agent.show();
        	});
        });        
	},

	close: function(){
		var ctrl = this, $view = ctrl.$view;
		if(ctrl.$popup[0].$loading) ctrl.$popup[0].$loading.remove();
		$view.remove();
		$("html").removeClass("hasPopup");
	},

	getAgentsOnline: function(data){
		console.log("getAgentsOnline");
		console.log(data);

		var ctrl = this, $view = ctrl.$view;
		if(!$view) return;
		ctrl.$results.html("");
		ctrl.$popup.unloading();

		// Verificar si está asignado a algún agente la convesación
		var $divMessages = $("#divMessages");
		var $conversation = $divMessages.find(".items .item.selected");

		var idUser_agent, idUser_client;
		if($conversation.length){
			idUser_agent = $conversation.attr("idUser_agent");
			idUser_client = $conversation.attr("idUser_client");
		}
		else {
			var selected = $OMNICHANNEL.conversationSelected;
			if(selected){
				idUser_agent= selected.idUser_agent;
				idUser_client = selected.idUser_client;
			}
			else {
				ctrl.close();
				return;
			}
		}

        
        // Mostrar los agentes disponibles
		data.forEach(function(item){
			// Ocultar al agente asignado y al cliente
			if(item.idUser.matchAny([idUser_agent, idUser_client])){
				return;
			}

			var profile = chatProfile({ IdUsuario: item.idUser, Imagen: item.image });
			var html = 
			'<div class="agent">'+
			    profile +
			    '<span class="name">'+ item.name +'</span>'+
			    '<span class="chats"><strong>'+ (item.conversations || '0') + '</strong><div>'+ lang.conversations +'</div></span>'+
			'</div>';
			ctrl.$results.append(html);
			ctrl.$results.find(".agent:last")[0].data = item;
		});

		// No hay agentes conectados en este grupo
		if(!ctrl.$results.find(".agent").length){
			ctrl.$divResults.addClass("empty");
			return;
		}
		ctrl.$divResults.removeClass("empty");
		
		// Seleccionar agente
		var $agents = ctrl.$results.find(".agent");
		$agents.click(function(){
			$agents.removeClass("selected");
			$(this).addClass("selected");
		});
	},
    
    // Combo de grupos
	getGroups: function(){
		var ctrl = this, $view = ctrl.$view;
        SVC({
			Url: getUrl('Grupo', 'ConsultarCatalogo?filter=[{"property":"Activo","operator":"=","value":true}]&node=root&limit=9999'),
			Funcion: function (response) {
				var options = [{ id: 0, text: lang.omnichannel }]; // Opción por default
				response.Lista.forEach(function(item){
					options.push({ id: item.IdGrupo, text: item.text });
				});

				var $selectize = ctrl.$group.selectize({
					openOnFocus: false,
					placeholder: lang.select_group,
					options: options,
					valueField: 'id',
					labelField: 'text',
					searchField: ['text'],
					onChange: function(idGroup){
						// Sin selección
						if(idGroup == ""){
							ctrl.$results.html("");
							ctrl.$divResults.removeClass("empty");
							return;
						}

						ctrl.$popup.loading();

						// Mostrar todos los agentes conectados
						if(idGroup == 0){
							socketOmnichannel._emit('get agents online', { countChats: true });
							return;
						}

						// Mostrar solo los agentes del grupo seleccionado
						SVC({
							Url: getUrl('Agente', 'ConsultarCombo?idGrupo='+idGroup+'&idAgente='+localStorage.IdAgente+'&idPerfil='+localStorage.IdPerfil+'&idCliente=0&page=1&start=0&limit=9999'),
							Funcion: function(_response){
								var arrUsers = [];
								_response.Lista.forEach(function(item){
									arrUsers.push(item.IdUsuario);									
								});

								// Buscar a los agentes del grupo que están conectados
						        socketOmnichannel._emit('get agents online', { countChats: true, arrUsers: arrUsers });
							}
						});
					}
				});

				ctrl.$popup.unloading();
				ctrl.$cmbGroupS = $selectize[0].selectize;
				ctrl.$cmbGroupS.setValue(0);
				ctrl.$txtSearch.focus();
			}
		});
	},

	save: function(){
		console.log("save");

		var ctrl = this, $view = ctrl.$view;
		var validation = ctrl.validation();
		if (typeof validation == "function") {
			validation();
			return;
		}

		//ctrl.$popup.loading();
		socketOmnichannel._emit('conversation assign', validation);
	},

	validation: function(){
		console.log("validation");

		var ctrl = this, $view = ctrl.$view;

		// Grupo seleccionado
		var idGroup = ctrl.$cmbGroupS.getValue();
		if(idGroup === ""){
			return function(){ warning(lang.error_group); }
		}
		
		// Debe haber un agente seleccionado
		var $agent = ctrl.$results.find(".agent.selected");
		if(!$agent.length){
			return function(){ warning(lang.error_agent); }
		}
        
        /*
		var $conversation = $("#divMessages .items .item.selected");
		if(!$conversation.length){
			ctrl.close();
			return;
		}*/
		if(!$OMNICHANNEL.conversationSelected){
			ctrl.close();
			return;
		}
		var conversationID = $OMNICHANNEL.conversationSelected.conversationID; // $conversation.attr("conversationid");

        var jData = {
        	conversationID: conversationID,
        	idGroup: idGroup,
        	idUser: $agent[0].data.idUser,
        	isPopup: true
		}
		return jData;
	},

	assigned: function(data){
		console.log("assigned");

		var ctrl = this, $view = ctrl.$view;
		ctrl.close();
		success(lang.chat_assignedAgent.replace("|AGENT|", data.agentName));

		// Si la convesación yo la tenía asignada => eliminar de conversaciones activas y deshabilitar conversación
		var $conversation = $("#divMessages .listLeft .items .active .item[conversationid="+data.conversationID+"]");
		if($conversation.length && data.idUser != localStorage.IdUsuario){
			$conversation.remove();
			$("#divMessages .conversation").addClass("finished");
			$OMNICHANNEL.sortConversations();
		}

		// Crear actividad al reasignar conversación, es necesario contar con un ticket
		if(data.reassignment && data.ticket){
			var description = $OMNICHANNEL.systemMessage(data.text);
			$OMNICHANNEL.createActivity({ solveTime: 60, idTicket: +data.ticket.match(/[0-9]+/), description: description });
		}
	}
}