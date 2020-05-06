$OMNICHANNEL_SETTINGS = {
	start: function(){
		console.log("start omnichannel > settings");
		var ctrl = this, $view = $("#omnichannel_settings");
		ctrl.$view = $view;
		
		// Etiquetas
		$view.find(".lblWelcome").html(lang.welcome_message);
		$view.find(".lblFarewell").html(lang.farewell_message);
		$view.find(".lblOutsideHours").html(lang.chat_outside_hours);		
		$view.find(".lblTimeout").html(lang.chat_timeout_client);
		$view.find(".lblTimeoutMessage").html(lang.chat_timeoutEnd_client);
		$view.find('.lblTitleFromTicket').html(lang.chat_title_from_ticket);
		// Controles
		ctrl.$welcome = $view.find(".welcome");
		ctrl.$farewell = $view.find(".farewell");
		ctrl.$outsideHours = $view.find(".outsideHours");
		ctrl.$txtTimeout = $view.find(".txtTimeout");
		ctrl.$txtTimeoutMessage = $view.find(".txtTimeoutMessage");		
		ctrl.$txtTitleFromTicketValue = $view.find(".txtTitleFromTicketValue");

		// Campos de hora
		inputTime(ctrl.$txtTimeout);

		// Obtener la información guardada anteriormente
		socketOmnichannel._emit('settings get');

		//Evento al seleccionar una opcion del combo
		$view.find(".comboOptionTitle").change(function (e) {
			var value = e.target.value;
			if(value)
			    ctrl.$txtTitleFromTicketValue.val(ctrl.$txtTitleFromTicketValue.val() + '|'+value+'|');
		});

		// Botones
		$view.find(".btnSave").html(lang.save).click(function(){
			ctrl.save();
		});

		// Maxlength
		$view.find("input[type=text]").attr("maxlength", 100);
		$view.find("textarea").attr("maxlength", 250);

		// Obligatorios
		$view.find(".required").append(' <span class="labelRequired">*</span>');

		ctrl.$welcome.focus();
	},

	got: function(data){
		console.log("got");

		if(!data) return;
		var ctrl = this, $view = ctrl.$view;

		ctrl.$welcome.val(data.welcome);
		ctrl.$farewell.val(data.farewell);
		ctrl.$outsideHours.val(data.outsideHours);
		ctrl.$txtTimeout.val(secondsToTime(data.timeoutClient));
		ctrl.$txtTimeoutMessage.val(data.timeoutMessage);
		ctrl.$txtTitleFromTicketValue.val(data.titleChatTicket);
	},

	save: function(){
		console.log("save");

		var ctrl = this, $view = ctrl.$view;
		var validation = ctrl.validation();
		if (typeof validation == "function") {
			validation();
			return;
		}

		_$("main-panel").mask();
		socketOmnichannel._emit('settings save', validation);
	},

	validation: function(){
		console.log("validation");

		var ctrl = this, $view = ctrl.$view;
		var jValidate = { error: "", $fieldError: "" }
		
		// Bienvenida
		jValidate = { type: "TEXT", $cmp: ctrl.$welcome, msgError: lang.error_welcome_message, error: jValidate.error, $fieldError: jValidate.$fieldError }
		var welcome = jValidation(jValidate);

		// Despedida
		jValidate = { type: "TEXT", $cmp: ctrl.$farewell, msgError: lang.error_farewell_message, error: jValidate.error, $fieldError: jValidate.$fieldError }
		var farewell = jValidation(jValidate);		

		if (jValidate.error != ""){
			return function(){
				warning(jValidate.error); 
				if(jValidate.$fieldError) 
					jValidate.$fieldError.focus(); 
			}
        }

        // Fuera de horario
        var outsideHours = ctrl.$outsideHours.valTrim();

        // Timeout
        var timeoutClient = validacionTiempo(ctrl.$txtTimeout.val()).seconds;

        // Mensaje de timeout
        var timeoutMessage = ctrl.$txtTimeoutMessage.valTrim();

        // Título
		var titleChatTicket = ctrl.$txtTitleFromTicketValue.valTrim();

        var jData = {
        	welcome: welcome, 
			farewell: farewell,
			outsideHours: outsideHours,
        	timeoutClient: timeoutClient,
        	timeoutMessage: timeoutMessage,
        	titleChatTicket: titleChatTicket
		}
		return jData;
	},

	saved: function(data){
		console.log("saved");

		var ctrl = this, $view = ctrl.$view;
		_$("main-panel").unmask();
		if(data == true)
			success(lang.successfully_updated);		
		else
			warning(lang.error_save_information);
	}
}