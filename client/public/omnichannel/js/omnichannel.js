$OMNICHANNEL = {
	pendingAgentMsg: [],
	pendingChatMsg: [],
	scrollUp: false,

	start: function () {
		console.log("start");
		var ctrl = this, $view = $("#FdivMessages");
		ctrl.$view = $view;

		ctrl.starting = true;
		$view.loading({ text: lang.connecting_server });

		// Controles		
		ctrl.$txtWrite = $view.find(".txtWrite");
		ctrl.$conversation = $view.find(".conversation");
		ctrl.$content = ctrl.$conversation.find(".content");
		ctrl.$header = ctrl.$conversation.find(".header");
		ctrl.$body = ctrl.$conversation.find(".body");
		ctrl.$divIcoDown = ctrl.$conversation.find(".divIcoDown");
		ctrl.$notifyCount = ctrl.$conversation.find(".notifyCount");
		ctrl.$attachment = $view.find(".fa-paperclip");
		ctrl.$file = $view.find(".file");
		ctrl.$search = $view.find(".search .txtSearch");
		ctrl.$filter = $view.find(".search .fa-filter");
		ctrl.$searchLine = $view.find(".searchLine");
		ctrl.$txtSearchLine = $view.find(".txtSearchLine");
		ctrl.$searchLineClose = ctrl.$searchLine.find(".fa-times");
		ctrl.$eye = $view.find(".search .fa-eye");
		ctrl.$actions = $view.find(".fa-ellipsis-v");
		ctrl.$actionSearch = $view.find(".actions .fa-search");
		ctrl.$lblActive = $view.find(".listLeft .lblActive");
		ctrl.$lblAvailable = $view.find(".listLeft .lblAvailable");
		ctrl.$lblByAgent = $view.find(".listLeft .lblByAgent");
		ctrl.$items = $view.find(".listLeft .items");
		ctrl.$itemsAll = ctrl.$items.find(".all");

		// Etiquetas
		ctrl.$lblActive.html(lang.active_conversations);
		ctrl.$lblAvailable.html(lang.available_conversations);
		ctrl.$lblByAgent.html(lang.conversations_by_agent);
		$view.find(".acceptConversation").append(lang.acceptConversation);
		$view.find(".items .spnNoResults").html(lang.results_not_found.replace('.', ''));
		$view.find(".search .menu .option[data=favorites] .type").html(lang.favorites);
		ctrl.$txtWrite.attr("placeholder", lang.write_msg);
		ctrl.$search.attr("placeholder", lang.search);
		ctrl.$filter.attr("title", lang.filters);
		ctrl.$actions.attr("title", lang.actions);

		/*
		var $items = $view.find(".listLeft .items"); 
		var jData =
		[{ source: "whatsapp", user: { name: "Usuario 001" }, lastMessage: "Me podrías ayudar?", favorite: true, lastUpdate: "2019-07-15T21:49:54.041Z" },
		{ source: "facebook", user: { name: "Usuario 002" }, lastMessage: "Gracias!", readed: true, favorite: true, lastUpdate: "2019-07-15T20:04:54.041Z" },
		{ source: "email", user: { name: "Jesus Macias" }, lastMessage: "Su ticket es el número 154782", lastUpdate: "2019-07-15T22:22:54.041Z" },
		{ source: "whatsapp", user: { name: "+5218116890584" }, lastMessage: "Listo!", lastTime: "8:32 AM", readed: true },
		{ source: "email", user: { name: "Jorge Palacios" }, lastMessage: "De nada", lastTime: "Sábado", favorite: true },
		{ source: "whatsapp", user: { name: "+5218116890585" }, lastMessage: "El folio es 543245", lastTime: "Sábado" },			
		{ source: "whatsapp", user: { name: "Juan Moreno" }, lastMessage: "Mi número de serie es YT4353234543", lastTime: "Viernes", readed: true },
		{ source: "facebook", user: { name: "Adriana Pesina" }, lastMessage: "Quiero reestablecer la contraseña", lastTime: "Viernes" }];

		jData.forEach(function(data){
			ctrl.addConversation(data);	 			
		});
		*/

		delete ctrl.timeoutClient;

		ctrl.events();
		ctrl.itemEvents();
		_shortcuts.change("OMNICHANNEL");

		getPermissions({
			afterFunction: function () {
				ctrl.getConversations_emit();
				socketOmnichannel._emit('settings get'); // Obtener el timeout del cliente
				ctrl.starting = false;

				var permissions = JSON.parse(localStorage.permissions);
				ctrl.viewAll = permissions.omnichannelAll;
				//ctrl.assignAvailable = permissions.omnichannelAssign;
				if (permissions.omnichannelAssign)
					$view.addClass("assign");

				if (permissions.omnichannelAll)
					$view.addClass("viewAll");
			}
		});
	},

	// Eventos de la pantalla de agente
	events: function () {
		var ctrl = this, $view = ctrl.$view;

		// Búsqueda de usuarios
		var fSearch = setTimeout(null);
		ctrl.$search.keyup(function(){
			clearTimeout(fSearch);
			fSearch = setTimeout(function () {
				var search = ctrl.$search.val().trim();
				console.log("searching: " + search);

				// Filtrar
				var $itemList = $view.find(".listLeft .item");
				$itemList.hide();
				$itemList.find(".user:icontains('" + search + "')").each(function () {
					//console.log(this);
					var $item = $(this).parents(".item:first");
					$item.show();
					$item.parents(".agent").show();
				});

				ctrl.sortConversations({ isSearch: true, search: search });
			}, 150);
		});

		var $filterIcon = $view.find(".fa-filter");
		var $menuFilter = $view.find(".search .menu");
		var $actionsIcon = $view.find(".conversation .header .actions .fa-ellipsis-v");
		var $menuActions = $view.find(".conversation .header .actions .menu");

		// Acciones de la conversacion
		$menuActions.html(
			'<span option="assign">' + lang.assign + '</span>' +
			'<span option="createTicket">' + lang.create_ticket + '</span>' +
			'<span option="endConversation">' + lang.finish_conversation + '</span>' +
			'<span option="finishNSolve">' + lang.chat_finish_resolve_ticket + '</span>' +
			'<span option="asignarCliente"> ' + lang.select_client + '</span>'
		);
		/* Transferir, Bloquear Usuario */

		// Onclick filter			
		$filterIcon.click(function () {
			console.log("click filter");

			if (!$menuFilter.is(":visible"))
				setTimeout(function () { $menuFilter.show(); }, 0);
		});

		// Onclick filter option
		$view.find(".search .menu .option").click(function () {
			console.log("filtering");
			$(this).toggleClass("selected");

			ctrl.filter();
		});
        
        // Buscar texto en la conversación
		ctrl.$actionSearch.click(function(){
            console.log("click search");
            
            ctrl.$searchLine.addClass("showFlex");
            ctrl.$txtSearchLine.focus();
		});
		// Cerrar búsqueda
		ctrl.$searchLineClose.click(function(){
			ctrl.$searchLine.removeClass("showFlex searching");
            ctrl.$txtSearchLine.val("");
            ctrl.$body.find(".message").unmark();
		});
		// Ejecutar la búsqueda
		var searchTimeout;
		var $count = ctrl.$searchLine.find(".count"), $index = $count.find(".index"), 
		    $total = $count.find(".total"), $searchUp = ctrl.$searchLine.find(".fa-chevron-up"),
		    $searchDown = ctrl.$searchLine.find(".fa-chevron-down");
		ctrl.$txtSearchLine.keyup(function(){
			if(event.keyCode == 13) return;

			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(function(){
				console.log("search");
				var search = ctrl.$txtSearchLine.val().toLowerCase();
				ctrl.$searchLine.removeClass("searching");
				var $messages = ctrl.$body.find(".message");
				
				if(!search.length){
					$messages.unmark();
					return;
				} 

				if(search.length) ctrl.$searchLine.addClass("searching");
				
                // Buscar la palabra en la conversación
                $messages.unmark({
				  done: function() {
					$messages.mark(search, {
						separateWordSearch: false,
						exclude: [".time"],
						done: function(count){
							$index.text(count ? "1" : "0");
							$total.text(count);

							// Seleccionar a la primer coincidencia en caso de que existan
							if(count)
    							_selectSearch("start");
						}
					});
				  }
				});
			}, 350);
		}).keydown(function(){
			if(event.keyCode == 27)
				ctrl.$searchLineClose.click();

			// Buscar la siguiente coincidencia
			if(event.keyCode == 13){ // Enter
			    $searchDown.click();
			}
		});
		$searchUp.click(function(){
			_selectSearch("previous");
		});
		$searchDown.click(function(){
			_selectSearch("next");
		});
		function _selectSearch(select){
			var $marks = ctrl.$body.find("mark");
			if(!$marks.length) return;
			var $markSelected = ctrl.$body.find("mark.selected");
			var indexSelected = $markSelected.length ? $marks.index($markSelected) : 0;
			$marks.removeClass("selected");

            switch(select){
            	case "start": indexSelected = 0; break;
            	case "next": indexSelected++; break;
            	case "previous": indexSelected--; break;
            }

            if(indexSelected >= $marks.length) indexSelected = 0;
            if(indexSelected < 0) indexSelected = $marks.length - 1;

            $index.text(indexSelected+1);
            var $mark = $marks.eq(indexSelected).addClass("selected");

			// Mover el scroll a donde está el elemento seleccionado
			//if(!isScrolledIntoView({ $divScroll: ctrl.$body, $element: $mark })){
				var offsetTop = $mark.offset().top;
				var scrollTop = offsetTop - ctrl.$body.offset().top - 35;
				scrollTop += ctrl.$body.scrollTop();
				ctrl.$body.scrollTop(scrollTop);
			//}
		}

		// Onclick actions			
		$actionsIcon.click(function () {
			console.log("click actions");
			if (!$menuActions.is(":visible")) {
				setTimeout(function () { $menuActions.show(); }, 0);
			}
		});
		$menuActions.click(function () {
			console.log("click menu action");
			$menuActions.hide();

			switch ($(event.target).attr("option")) {
				case "assign":
					ctrl.assign();
					break;

				case "endConversation":
					ctrl.finish_conversation();
					break;
				
				case "finishNSolve":
				    ctrl.finishNSolve();
				    break;

				case "createTicket":
					ctrl.model_select();
					break;

				case "asignarCliente":
					console.log('Asignar Cliente');
					ctrl.client_selected();
					break;
			}
		});

		// Onclick body
		$("body").click(function () {
			//console.log("click body");

			if (event) {
				// Ocultar filtros
				if (!$menuFilter.find(event.target).length && $menuFilter[0] != event.target) {
					$menuFilter.hide();
				}

				if ($(event.target).hasClass("fa-filter")) {

				}
			}

			$menuActions.hide();
		});

		// Scroll hacia arriba cancela el scrollEnd
		ctrl.$body.on("scroll", function () {
			var body = ctrl.$body[0];
			if (body.offsetHeight + body.scrollTop + 1 >= body.scrollHeight) {
				ctrl.$conversation.addClass("finishDown");
				ctrl.$notifyCount.html("").hide();
				ctrl.scrollUp = false;
			}
			else {
				ctrl.$conversation.removeClass("finishDown");
				ctrl.scrollUp = true;

				if (ctrl.$notifyCount.html() != "")
					ctrl.$notifyCount.show();
			}
		});

		// Click en icoDown
		ctrl.$divIcoDown.click(function () {
			ctrl.scrollUp = false;
			ctrl.scrollEnd();
		});

		ctrl.filter();

		// Expandir/Colapsar conversaciones
		ctrl.$lblActive.click(function () { ctrl.toggleList({ $div: $view.find(".listLeft .items .active"), $label: ctrl.$lblActive }); });
		ctrl.$lblAvailable.click(function () { ctrl.toggleList({ $div: $view.find(".listLeft .items .available"), $label: ctrl.$lblAvailable }); });

		// Aceptar conversación
		$view.find(".acceptConversation").click(function () {
			console.log("Aceptar conversación");
			ctrl.$content.loading();

			var conversation = $view.find(".items .item.selected");
			var conversationID = conversation.attr("conversationid");
			socketOmnichannel._emit('agent accept conversation', { conversationID: conversationID, agent: { id: socketOmnichannel.user._id } });
		});

		// Keydown del txtWrite
		ctrl.$txtWrite.keydown(function () {
			var text = ctrl.$txtWrite.val().trim();

			// No empezar con espacios
			if (text == "" && event.keyCode == 32)
				event.preventDefault();

			// Enter al enviar mensajes desde el agente
			if (event.keyCode = 13 && text) {
				// Agregar el mensaje
				console.log("Enter agent message");
				var conversation = $view.find(".items .item.selected");
				var idConversation = conversation.attr("conversationid");
				var source = conversation.attr("source");
				text = text.slice(0, 1500);
				ctrl.scrollUp = false;
				ctrl.addMessage({
					text: text,
					sender: { idUser: localStorage.IdUsuario },
					mediaURL: "", idConversation: idConversation,
					register: true, idEnterprise: localStorage.Enterprise, source: source, agent: true
				});
				ctrl.$txtWrite.val("");
				//ctrl.scrollEnd();
			}
		});

		// Adjuntar archivos
		ctrl.$attachment.click(function () {
			console.log("click attachment");
			ctrl.$file[0].value = "";
			ctrl.$file.click();
		});
		ctrl.$file.change(function () {
			ctrl.file_change({ isChat: false });
		});

		// Emoticons
		var $icoEmoticons = $view.find(".fa-smile-o");
		ctrl.createEmoticons({ $icoEmoticons: $icoEmoticons, $txtWrite: ctrl.$txtWrite });

		ctrl.$eye.attr("title", lang.chat_view_all_conversations).click(function () {
			//$view.loading();
			ctrl.$search.val("");
			ctrl.$eye.toggleClass("active");
			if (ctrl.$eye.hasClass("active")) {
				ctrl.getAllConversations_emit();
			}
			else {
				console.log("Ver las conversaciones del agente actual");
				ctrl.$items.loading();
				ctrl.$items.find(".item").remove();
				socketOmnichannel._emit('get conversations', { idUser: localStorage.IdUsuario });
				$view.removeClass("allConversations");
			}
		});

		$(window).resize(function () { ctrl.resize(); }).resize();
	},

	createEmoticons: function (data) {
		var ctrl = this, $view = ctrl.$view;
		var $icoEmoticons = data.$icoEmoticons;
		$icoEmoticons.click(function (e) {
			console.log("emoticons");

			// Si no existe, se crea
			var $txtWrite = data.$txtWrite;
			var iconClicked = false;
			var $emoticons = $("body > .emoticons");
			if ($emoticons.length) {
				_show();
			}
			else {
				// Crear div emoticons
				$.ajax({
					url: localStorage.rutaBase + "app/store/Emoticons.json",
					dataType: 'script',
					success: function (strData) {
						console.log("Emoticons loaded");

						$emoticons = $(
						'<div class="emoticons x-mask finalRemove" tabindex="0">' +
							'<div class="content window-tooltip">' +
								'<div class="tabs"></div>' +
								'<div class="icons"></div>' +
							'</div>' +
						'</div>');
						$("body").append($emoticons);

						var data = JSON.parse(strData);
						var categories = data[0].categories;

						var html = "";
						Object.keys(categories).forEach(function (name, index) {
							// Agregar el nombre de la categoria como un label
							//html += '<div class="category">'+eval(name)+'</div>';
							html += '<div class="category"></div>';

							var category = categories[name];
							category.forEach(function (icons) {
								icons.split(" ").forEach(function (icon, index) {
									var tag = '<span>' + icon + '</span>';
									if (index == 0) {
										$emoticons.find(".tabs").append(tag);
									}
									html += tag;
								});
							});
						});
						var $icons = $emoticons.find(".icons");
						$icons.html(html);
						_show();
					},
					async: true
				});
			}

			function _show() {
				$emoticons.show();
				var $content = $emoticons.find(".content");
				var icoPosition = $icoEmoticons.offset(); //.position();
				var left = icoPosition.left, // + $icoEmoticons.width(), // - $content.width(),
					top = icoPosition.top - $content.height() - + $icoEmoticons.height(); // + $icoEmoticons.height() 
				if (data.isChat) {
					if($("#divChat").hasClass("maximized"))
					    left -= 7;
					else
    					left -= 140;
				}
				$content.css({ top: top, left: left });
				$emoticons.focus();

				// Eventos creados aparte para evitar conflictos en las dos ventanas
				var $icons = $emoticons.find(".icons");
				// Agregar icono al txtWrite
				$emoticons.find("span").off("click").click(function () {
					if (iconClicked) return;
					$txtWrite.val($txtWrite.val() + $(this).html());
					iconClicked = true;
					setTimeout(function () { iconClicked = false; }, 100);
				});
				// Click en una categoría
				var $tabs = $emoticons.find(".tabs span");
				$tabs.off("click").on("click", function(){
					console.log("change tab");

					//$window.find(".txtSearch").focus();
					$tabs.removeClass("selected");
					$(this).addClass("selected");

					var indexCategory = $(this).index();

					iconClicked = true;
					$icons.find(".category").eq(indexCategory).get(0).scrollIntoView();
					setTimeout(function () { iconClicked = false; }, 100);
				});
				// Click en un icono
				$emoticons.off("click").click(function () {
					if (iconClicked) return;
					if (!$(event.target).hasClass("emoticons")) return;
					$emoticons.hide();
					$txtWrite.focus();
				});
				$icons.scroll(function (event) {
					if (iconClicked) return;

					var scroll = $icons.scrollTop();

					// Buscar a que sección corresponde
					var indexScroll = 0;
					$icons.find(".category").each(function (index, category) {
						if (category.offsetTop < scroll + 50)
							indexScroll = index;
						else
							return;
					});

					$tabs.removeClass("selected");
					$tabs.eq(indexScroll).addClass("selected");
				});
				$icons.scroll();

				$emoticons.on('keydown', function (event) {
					switch (event.keyCode) {
						case 13: // Enter
						case 27: // Esc
							$emoticons.click();
							break;
					}
				});

				$emoticons.off("resize").on("resize", function(){
				    if($("#divChat").hasClass("maximized")){
				    	$emoticons.hide();
				    }
				});
			}

			$(window).on("resize", function () {
				$emoticons.hide();
			});
		});
	},

	getAllConversations_emit: function () {
		console.log("Ver todas las conversaciones de cada agente");
		var ctrl = this, $view = ctrl.$view;
		ctrl.$items.loading().find(".item").remove();
		$view.addClass("allConversations");
		socketOmnichannel._emit('get all conversations');
	},

	toggleList: function (data) {
		var ctrl = this;
		var $div = data.$div, $label = data.$label;
		var $content = data.$content || $div.find(".content");
		$content.toggle();
		$label.toggleClass("iconExpanded iconCollapsed");
		if ($content.is(":visible"))
			$div.removeClass("collapsed").addClass("expanded");
		else
			$div.removeClass("expanded").addClass("collapsed");

		ctrl.sortConversations({ isToggle: true });
	},

	itemEvents: function () {
		var ctrl = this, $view = $("#divMessages");

		// Onclick conversation
		var $itemList = $view.find(".listLeft .item");
		$itemList.off("click").click(function () {
			console.log("click item");

			// No aplica en click a favoritos
			if (event && $(event.target).hasClass("fa")) return;

			var $item = $(this);
			var idUser_client = $item.attr("iduser_client");
			var idUser_agent = $item.attr("iduser_agent");

			// Verificar si es la vista normal o la vista por agente
			var isByAgent = Boolean(ctrl.$itemsAll.find($item).length);

			$itemList.removeClass("selected");
			$item.addClass("selected");
			if (!isByAgent)
				$item.addClass("readed");

			$view.addClass("selection");

			var $header = ctrl.$conversation.find(".header");
			$header.find(".user").html($item.find(".user").html());
			$header.find(".img").removeClass("email facebook whatsapp openser").addClass($item.attr("source"));

			// Obtener la conversación completa
			var conversationID = $item.attr("conversationid");
			if (conversationID) {
				ctrl.$conversation.find(".content").loading();
				socketOmnichannel._emit('getConversation', { conversationID: conversationID });
			}

			ctrl.scrollUp = false;
			ctrl.$conversation.removeClass("finished").addClass("finishDown");

			// Clase para identificar si se puede aceptar la conversación o si se puede escribir
			ctrl.$conversation.removeClass("active available onlyView");
			if (!isByAgent) {
				if ($view.find(".items .active .item.selected").length)
					ctrl.$conversation.addClass("active");
				else
					ctrl.$conversation.addClass("available");
			}
			else {
				// Si el usuario es el mismo de la sesión, si podrá escribir
				if (localStorage.IdUsuario == idUser_agent) {
					ctrl.$conversation.addClass("active");
				}
				else {
					// Solo podrá ver la conversación y elegir acciones
					ctrl.$conversation.addClass("onlyView");
				}
			}

			// Verificar si el usuario es de openser
			ctrl.$conversation.removeClass("unknownUser");
			if (!$item.attr("openser") && !idUser_client)
				ctrl.$conversation.addClass("unknownUser");

			// Agregar atributo si la conversación está ligada a un ticket
			ctrl.$conversation.removeClass("ticket");
			ctrl.$conversation.removeAttr("ticket solveTime");
			ctrl.$header.find(".info .ticketBox").remove();
			var ticket = $item.attr("ticket");
			if (ticket) {
				ctrl.$conversation.addClass("ticket").attr("ticket", ticket);

				// Mostrar el número de ticket al lado del nombre
				var ticketHTML = '<span class="ticketBox" onclick="window.open(\'#Consult/' + ticket.match(/[0-9]+/) + '\')">' + ticket + '</span>';
				ctrl.$header.find(".info").append(ticketHTML);
			}

			// Nombre de usuario
			ctrl.$conversation.removeAttr("openser");
			if ($item.attr("openser")) {
				ctrl.$conversation.attr("openser", $item.attr("openser"));
			}

			// Limpiar el timeout para finalizar la conversación
			clearTimeout(ctrl.conversation_startTimer_);
            
            ctrl.$searchLineClose.click();
			ctrl.resize();
		});

		// Onclick favorites			
		var $favorites = $view.find(".listLeft .item .fa");
		$favorites.off("click").click(function () {
			console.log("click favorites");

			var $icon = $(this);
			var $item = $icon.parents(".item:first");
			if ($icon.hasClass("fa-star")) {
				$icon.removeClass("fa-star").addClass("fa-star-o");
				$item.removeClass("favorite");
			}
			else if ($icon.hasClass("fa-star-o")){
				$icon.removeClass("fa-star-o").addClass("fa-star");
				$item.addClass("favorite");
			}
			if($icon.hasClass("favoriteicon")){
				ctrl.filter();
			}

			event.stopPropagation();
		});
	},

	scrollEnd: function () {
		var ctrl = this, $view = ctrl.$view;
		if (!ctrl.$body) return;

		if (!ctrl.scrollUp)
			ctrl.$body.scrollTop(ctrl.$body.prop("scrollHeight"));
		else if (ctrl.newMessageScroll && ctrl.$divIcoDown.is(":visible")) {
			console.log("add notify");
			var count = ctrl.$notifyCount.html();
			if (count != "9+") {
				count = !isNaN(count) ? +count + 1 : 1;
				if (count >= 10) count = "9+";
			}
			ctrl.$notifyCount.html(count).show();
		}

		ctrl.messages_groupByDate({ $body: ctrl.$body });
	},

	chat_scrollEnd: function () {
		var ctrl = this;
		var $body = $("#divChat .messages");
		$body.scrollTop($body.prop("scrollHeight"));
		ctrl.messages_groupByDate({ $body: $body });
	},

	// Separar los mensajes por día
	messages_groupByDate: function (data) {
		var $messages = data.$body.find(".message:not(.dated)");
		if (!$messages.length) return;

		// Actualizar las fechas existentes, cuando cambia el dia es necesario
		data.$body.find('.date').each(function () {
			var date = $(this).attr("date");
			var jDate = getDateStringToDate(date);
			$(this).html(jDate.daysAgo2);
		});

		$messages.each(function (index, message) {
			var $message = $(message);
			var date = $message.attr("date");
			if (date) {
				var jDate = getDateStringToDate(date);
				//var dateAttr = jDate.dateISO;
				var dateAttr = jDate.dateObj.toString("yyyy/MM/dd");

				if (!data.$body.find('.date[date="' + dateAttr + '"]').length)
					$message.before('<div class="date" date="' + dateAttr + '">' + jDate.daysAgo2 + '</div>');

				$message.addClass("dated");
			}
		});
	},

	// Obtiene las conversaciones del usuario actual
	getConversations_emit: function () {
		console.log("getConversations_emit");
		var ctrl = this, $view = ctrl.$view;

		var user = { idUser: localStorage.IdUsuario }

		ctrl.conversations_loading = true;
		if (socketOmnichannel.omnichannelLoaded) {
			socketOmnichannel._emit('get conversations', user);
			//delete socketOmnichannel.omnichannelLoaded;
		}
		else {
			$view.loading({ text: lang.connecting_server });
			if (!socketOmnichannel.connected)
				socketOmnichannel.connect();
			socketOmnichannel.afterConnect = function () {
				socketOmnichannel._emit('get conversations', user);
			}
		}
	},
	getConversations_receive: function (data) {
		console.log("getConversations_receive");
		console.log(data);

		var ctrl = this, $view = ctrl.$view;
		if (!$view || !$view.is(":visible")) return;

		// Eliminar las conversaciones que no pertenecen al grupo, a menos que tenga permisos para ver todas las conversaciones
		var _data = [], groups = localStorage.Grupos ? localStorage.Grupos.split(",") : [];
		data.forEach(function (item) {
			if (item.agent && item.agent.idUser == localStorage.IdUsuario) {
				_data.push(item);
			}
			else if (item.idGroup) {
				if (groups.indexOf(item.idGroup.toString()) != -1) // Solo se valida cuando hay grupo
					_data.push(item);
			}
			else {
				_data.push(item);
			}
		});

		var $noSelection_text = $view.find(".noSelection span"), noSelection_text;
		if (!_data.length) {
			// No hay conversacioones disponibles    		
			noSelection_text = lang.chat_noConversations;
		}
		else {
			noSelection_text = lang.select_element;
			$view.removeClass("noData");
			_data.forEach(function (item) {
				item.noSort = true;
				if (item.client.id != socketOmnichannel.user._id)
					ctrl.addConversation(item);
				// //_$('badgeOmnichannel').addTotalMessage(1)
			});
			ctrl.sortConversations();
		}

		ctrl.conversations_loading = false;
		//$noSelection_text.show().html(noSelection_text);
		$noSelection_text.show().html(lang.select_element);
		ctrl.$items.unloading();
		$view.unloading();
		ctrl.resize();
	},

	// Obtiene los mensajes de la conversación seleccionada
	getConversation_selected: function (data) {
		console.log("getConversation_selected");
		console.log(data);

		var ctrl = this, $view = ctrl.$view;
		ctrl.conversationSelected = data.conversation;
		ctrl.$body.html("");

		var $selected = $view.find(".items .item.selected");
		data.conversation.clientName = $selected.find(".user").text();
		var source = $selected.attr("source");
		var messages = data.messages;
		messages.forEach(function (item) {
			item.source = source;
			ctrl.addMessage(item);
		});

		$view.find(".conversation .content").unloading();

		ctrl.conversation_info(data.conversation);
		ctrl.$txtWrite.focus();

		// Si es parte de las conversaciones por agente => salir
		if (ctrl.$itemsAll.find($selected).length)
			return;

		// Si está finalizada, ya no verificar lo demás
		if (data.conversation.isFinished)
			return;

		// Marcar los mensajes del cliente como leídos, solamente cuando sean conversaciones activas
		if ($selected.length) {
			var conversationID = $view.find(".items .item.selected").attr("conversationid");
			socketOmnichannel._emit('conversation_setReaded_agent', { conversationID: conversationID, readed: true, idEnterprise: localStorage.Enterprise });
		}
		else {
			// Conversaciones disponibles, no mostrar el área para enviar mensajes, sólo el botón para aceptar la conversación

		}

		// Verificar si el último mensaje lo mandó el agente para iniciar el timer del timeout del cliente
		var timerDate;
		var userID = $selected.attr("userid");
		messages.reverse();
		if (messages[0].system != true) { // Si el último mensaje es del sistema => omitir el timeout
			messages.every(function (item) {
				if (!item.sender) return true; // Pasar a la siguiente iteración

				if (item.sender.id == userID) {
					// Lo mandó el cliente, salir del ciclo solamente
				}
				else {
					// Lo mandó el agente, salir del ciclo e iniciar el timer
					timerDate = item.date;
				}

				return false; // Salir del ciclo
			});

			if (timerDate) {
				ctrl.conversation_startTimer({ date: timerDate });
			}
		}
	},

	conversation_startTimer: function (data) {
		console.log("conversation_startTimer");
		var ctrl = this, $view = ctrl.$view;

		clearTimeout(ctrl.conversation_startTimer_);
		var date = data && data.date ? new Date(data.date) : new Date();

		// Verificar cuanto tiempo falta para llegar al timeout 
		var remainingSeconds = ctrl.timeoutClient - (new Date() - date) / 1000;
		if (remainingSeconds < 0) {
			// Timeout completo
			_confirm();
		}
		else {
			ctrl.conversation_startTimer_ = setTimeout(function () {
				_confirm();
			}, remainingSeconds * 1000);
		}

		function _confirm() {
			// Validar que no esté finalizada
			if (ctrl.$conversation.hasClass("finished")) {
				return;
			}

			$confirm(lang.timeout, lang.finish_conversation_timeout, function (response) {
				if (response.matchAny(["yes"])) {
					// Finalizar conversación
					var msgTimeout = "";
					if ($OMNICHANNEL._settings && $OMNICHANNEL._settings.timeoutMessage) {
						msgTimeout = $OMNICHANNEL._settings.timeoutMessage;
					}
					ctrl.finish_conversation({ noConfirm: true, msgTimeout: msgTimeout });
				}
			});
		}
	},

	// Ordenar las conversacioones de la más reciente a la más antigua
	sortConversations: function (data) {
		console.log("sortConversations");
		var ctrl = this, $view = ctrl.$view;
		if (!data) data = {}

		// Si es búsqueda, se expanden los agentes
		var isSearch = Boolean(data.isSearch), search = data.search;
		if (isSearch) {
			ctrl.$itemsAll.find(".conversations").show();
			ctrl.$items.find(".content").show();

			ctrl.$itemsAll.find(".agent .name").add(ctrl.$lblAvailable).add(ctrl.$lblActive)
				.removeClass("iconCollapsed").addClass("iconExpanded");

			ctrl.$items.find(".active, .available")
				.removeClass("collapsed").addClass("expanded")
		}

		// Conversaciones activas
		var arrActiveItems = [];
		$view.find(".listLeft .items .active .item:visible").each(function () {
			arrActiveItems.push({ tag: this, date: $(this).attr("lastUpdate") });
		});
		// Conversaciones disponibles
		var arrAvailableItems = [];
		$view.find(".listLeft .items .available .item:visible").each(function () {
			arrAvailableItems.push({ tag: this, date: $(this).attr("lastUpdate") });
		});
		// Conversaciones por agente
		var arrByAgentItems = [];
		ctrl.$itemsAll.find(".item:visible").each(function () {
			arrByAgentItems.push({ tag: this, date: $(this).attr("lastUpdate") });
		});

		// Crear un arreglo de items con su respectiva fecha del último mensaje
		function _sort(a, b) { if (a.date < b.date) return -1; if (a.date > b.date) return 1; return 0; }
		//arrActiveItems.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0));
		arrActiveItems.sort(_sort);
		arrAvailableItems.sort(_sort);
		arrByAgentItems.sort(_sort);
		//arrAvailableItems.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0));

		// Bajar las conversaciones disponibles según las conversaciones activas
		$view.find(".listLeft .items .available").css("marginTop", 60 * arrActiveItems.length);

		function _translate(item, index) { $(item.tag).css("transform", "translateY(" + (index * 60) + "px)"); }
		arrActiveItems.forEach(_translate);
		arrAvailableItems.forEach(_translate);

		// Por agente funciona diferente
		function _orderAgents() {
			var $agents = ctrl.$itemsAll.find(".agent");
			if (!$agents.length || !$view.hasClass("allConversations")) return; // Tiene que haber agentes y estar en la vista de ver todo
			$agents.css("marginTop", 0); // Posición inicial de cada agente
			$agents.each(function () {
				var $agent = $(this);
				var $items = $agent.find(".item:visible");

				// Eliminar/Ocultar a los agentes que no tienen conversaciones visibles
				if (!$items.length && !data.isToggle) {
					if (isSearch && search) { // Tiene que venir de búsqueda y tener texto la búsqueda
						$agent.hide(); // Si es búsqueda => se oculta
						return true;
					}
					else {
						$agent.remove();
						_orderAgents();
						return false;
					}
				}

				$items.each(function (index) {
					$(this).css("transform", "translateY(" + (index * 60) + "px)");
				});

				var $nextAgent = $agent.next();
				while(!$nextAgent.is(":visible") && $nextAgent.length && 
				    !$nextAgent.find(".item:visible").length && !data.isToggle){ // Tiene que ser visible el agente y tener conversaciones visibles
					$nextAgent = $nextAgent.next();
				}
				$nextAgent.css("marginTop", 60 * $items.length);

				return true;
			});
		}
		_orderAgents();

		// Verificar si ya no hay conversaciones en la lista
		if (!$view.find(".items .item").length && !$view.hasClass("selection")) {
			$("#divMessages").addClass("noData");
			//$view.find(".noSelection span").html(lang.chat_noConversations);
		}

		_noResults($view.find(".items .active"));
		_noResults($view.find(".items .available"));
		function _noResults($div) {
			$div.find(".content .item:visible").length ? $div.removeClass("noResults") : $div.addClass("noResults");
		}

		// Por agente
		ctrl.$itemsAll.find(".agent:visible").length ? ctrl.$itemsAll.removeClass("noResults") : ctrl.$itemsAll.addClass("noResults");
	},

	setMessageSended: function (data) {
		console.log("setMessageSended");
		var ctrl = this, $view = ctrl.$view;

		var message = data.message, isChat = data.isChat, $chat = $("#divChat");
		if (message) {
			// Mensaje enviado desde otro socket, agregar a la conversación para mantenerla actualizada
			if (message.anotherSocket) {
				message.isChat = true;
				message.text = message.lastMessage;
				ctrl.addMessage(message);
				return;
			}

			var sameConversation = true, $messages, pendingMsgs;
			if (isChat) {
				$messages = $chat.find(".messages");
				pendingMsgs = ctrl.pendingChatMsg;
			}
			else {
				// Verificar que sea la misma conversación seleccionada
				var idConversation = $view.find(".items .item.selected").attr("conversationid");
				if (idConversation != message.conversationID)
					sameConversation = false;

				$messages = $view.find(".conversation .content .body");
				pendingMsgs = ctrl.pendingAgentMsg;
			}

			if (sameConversation) {
				var $message = $messages.find(".message[messageid=" + message.messageID + "]");
				if ($message.length) {
					var $statusWaiting = $message.find(".fa-clock-o");
					$statusWaiting.removeClass("fa-clock-o").addClass("fa-check");

					if (message.mediaURL) {
						var ext = message.mediaURL.replace(/^.*\./, '');
						$message.removeClass("_loading");
						if (ext.matchAny(["jpeg", "jpg", "png"])) {
							//$message.attr("src", message.mediaURL);
						}
						else { // if (ext == "pdf") {
							$message.attr("link", message.mediaURL);
							ctrl.downloadFile_click({ $message: $message });
						}
						
						if (isChat)
							ctrl.chat_scrollEnd();
						else
							ctrl.scrollEnd();
					}

					if (message.agentSent) {
						ctrl.conversation_startTimer({ date: message.lastUpdate });
					}
				}
			}

			if (data.duplicated) {
				var x = 1;
			}

			if (isChat) {
				// Verificar si no tiene agente y tiene ticket, para iniciar la asignación automática
				var conversationID = $chat.attr("conversationid"), ticket = $chat.attr("ticket"), idGroup = $chat.attr("idGroup"),
					iduser_agent = $chat.attr("iduser_agent"), idUser_client = $chat.attr("idUser_client"), setAutomaticAssign = $chat.attr("setAutomaticAssign");
				if (ticket && idGroup && !iduser_agent && !setAutomaticAssign) {
					console.log("automatic assign");

					// Solo mandar una vez la petición, guardar attr
					$chat.attr("setAutomaticAssign", "true");

					// Obtener los agenetes del grupo
					var idClient = 0;
					
				}
			}

			// Eliminar el mensaje enviado de los pendientes
			var indexRemove = -1;
			pendingMsgs.forEach(function (item, index) {
				if (item.messageID == message.messageID) {
					indexRemove = index;
				}
			});
			if(indexRemove != -1)
    			pendingMsgs.splice(indexRemove, 1);
		}

		var reconnect = message ? false : true;
		var duplicated = message && message.duplicated ? true : false;
		ctrl.pendingMessages({ reconnect: reconnect, isChat: isChat, duplicated: duplicated });
	},

	pendingMessages: function (data) {
		var ctrl = this, $view = ctrl.$view;

		var arrPending = [], emit;
		switch (data.isChat) {
			case true:
				arrPending = ctrl.pendingChatMsg;
				emit = "send chat message";
				break;

			case false:
				arrPending = ctrl.pendingAgentMsg;
				emit = "send agent message";
				break;
		}

		var log = "pendingMessages: " + arrPending.length;
		log += data.isChat ? " - chat" : " - agent";
		console.log(log);

		if (arrPending.length){
			var toSend = arrPending[0];

			// Verificar si ya se envió el mensaje pero se perdió la conexión, para no mandarlo doble, tiempo limite 10 segundos
			if (toSend.sendingDate) {
				var maxSeconds = 23;
				if (data.reconnect) {
					maxSeconds = 10;
				}

				var _dateDiff = dateDiff(toSend.sendingDate, new Date());
				if (_dateDiff.SecondsFull > maxSeconds) {
					_emit();
				}
				else {
					_emit(); // se agrega de nuevo porque no se envian a veces, si funciona entonces borrar este código de tiempo
				}
			}
			else {
				// Solo se debe enviar una vez por conexión, en la siguiente reconexión se intentará de nuevo
				_emit();
			}

			/*
			if(arrPending.length > 2){
				setTimeout(function(){
					socketOmnichannel.disconnect();
					setTimeout(function(){ socketOmnichannel.connect(); }, 2000);
				}, 2500);
			}
			*/
		}

		// Al tener mensajes duplicados, se soluciona desconectando y conectando el socket
		if (data.duplicated) {
			var x = 1;
			//socketOmnichannel.disconnect();
			//socketOmnichannel.connect();
		}

		function _emit() {
			if (socketOmnichannel.connected) {
				toSend.sendingDate = new Date();
				socketOmnichannel._emit(emit, toSend);
			}
			else {
				socketOmnichannel.connect();
			}
		}
	},

	resize: function () {
		var ctrl = this, $view = ctrl.$view;

		// Vista
		var viewHeight = $(window).height() - $("#topHeader").height() - $(".titleInicio").height() - 32;
		$view.height(viewHeight);

		// Listado de conversaciones
		var conversationsHeight = viewHeight - $view.find(".search").height() - 15;
		$view.find(".listLeft .items").height(conversationsHeight);

		// Height del contenido la conversación
		ctrl.$body.height(conversationsHeight - $view.find(".conversation .write").outerHeight() - 20);
	},

	filter: function () {
		console.log("filter");

		var ctrl = this, $view = $("#divMessages");
		var $items = $view.find(".listLeft .items");

		$view.find(".search .menu .option").each(function () {
			var $option = $(this);
			var type = $(this).attr("data");

			if ($option.hasClass("selected"))
				$items.addClass(type);
			else
				$items.removeClass(type);
		});

		// Ocultar los restantes que no son favoritos
		if ($items.hasClass("favorites"))
			$items.find(".item:not(.favorite):visible").addClass("hide");
		else
			$items.find(".item").removeClass("hide");

		ctrl.sortConversations();
	},

	// Mensaje para el agente
	getMessageToAgent: function (data) {
		console.log("getMessageToAgent: " + data.lastMessage);
		console.log(data);
		if (!data) return;

		var ctrl = this, $view = ctrl.$view;
		var $chat = $("#divChat");

		if (!$view || !$view.is(":visible")) {
			if($chat.attr("conversationID") == data.conversationID){
				if(!$chat.find(".messages .message[messageid=" + data.messageID + "]").length){
					data.anotherSocket = true; // Nuevo mensaje
				}

				ctrl.setMessageSended({ message: data, isChat: true });
			}
			else {
				// Si no está abierta la página del omnichannel, mostrar una notificación
				ctrl.handlerNotificacion(data);
			}
			
			return true;
		}

		// No mostrar la conversación con el mismo usuario, solo al por agente
		if (data.user && data.user.id == socketOmnichannel.user._id && !$view.hasClass("allConversations"))
			return;

		// En caso de que la ventana ESTE ABIERTA del OMNICHANEL, Mostrar badget.
		ctrl.handlerBadget(data);

		if ($view.hasClass("noData")) {
			$view.removeClass("noData").find(".noSelection span").html("Seleccione un elemento");
		}

		if (data.system) {
			var parse = JSON.tryParse(data.lastMessage);
			if (parse == false && data.messageType != "TIMEOUT")
				delete data.system;
		}

		var $selected = $view.find(".items .item.selected");
		var conversationID = $selected.attr("conversationid");
		if(!conversationID && ctrl.conversationSelected)
			conversationID = ctrl.conversationSelected.conversationID;

		// En la vista por agentes, recargar el listado
		if (data.messageType == "ASSIGNED_AGENT" && $view.hasClass("allConversations")) {
			ctrl.getAllConversations_emit();
			// Después de traer la información, volver a seleccionar la conversación
			ctrl.afterGetAll = function(){
				var id = conversationID;
				if(!id && ctrl.conversationSelected) id = ctrl.conversationSelected.conversationID;
				var $conversation = $view.find(".items .all .item[conversationID=" + id + "]");
				$conversation.click();
			}
			return;
		}

		// Agregar mensaje en caso de que la conversación esté seleccionada
		data.readed = false;
		if (conversationID == data.conversationID) {
			data.readed = true;

			var jData = {
				text: data.lastMessage, mediaURL: data.mediaURL, idConversation: conversationID,
				readed: data.readed, date: data.lastUpdate, messageID: data.messageID,
				mediaName: data.mediaName, source: data.source, system: data.system, type: data.messageType
			}

			if (data.lastMessage.matchAny(["@@PHOTO@@__img__.jpeg@@PHOTO@@", "@@PHOTO@@__img__@@PHOTO@@"]))
				delete jData.text;

			if (data.sender == "agent" || data.sender == "client") {
				jData.sender = data.sender;
			}
			else if (data.user) {
				jData.sender = { whatsapp: data.user.whatsapp, name: data.user.name, idUser: data.user.idUser }
			}

			/*
						var parse = JSON.tryParse(jData.text);
						if(parse !== false){
							if(parse.text == "TICKET_CREATED"){
								delete jData.system;
								delete jData.text;
								jData.ticketRegistered = parse.ticket;
							}
						}
						*/

			ctrl.addMessage(jData);

			if (data.user) {
				$selected.find(".user").html(data.user.name);
				$view.find(".conversation .header .user").html(data.user.name);
			}

			// Marcar la conversación como leída
			socketOmnichannel._emit('conversation_setReaded_agent', { conversationID: conversationID, readed: data.readed });

			// Enviar mensaje al whatsapp de agente asignado
			if (jData.source == "whatsapp") {
				if (jData.type == "ASSIGNED_AGENT") {
					var jEmit = { conversationID: conversationID, idEnterprise: localStorage.Enterprise, messages: [] }

					// Mensaje
					var message = ctrl.$body.find(".message[messagetype=ASSIGNED_AGENT] .text").html();
					jEmit.messages.push("_" + message + "_");

					socketOmnichannel._emit('send_whatsapp', jEmit);
				}
			}

			if (jData.type == "ASSIGNED_AGENT") {
				ctrl.agentAcceptedConversation({
					conversationID: jData.idConversation, agentID: data.agent.id,
					agentName: data.agent.name, idUser_agent: data.agent.idUser, run: true
				});
			}

			// Limpiar timeout
			clearTimeout(ctrl.conversation_startTimer_);

			// El scroll solo bajarlo cuando se encuentre hasta abajo
			ctrl.scrollEnd();
		}

		ctrl.addConversation(data);
	},

	// Verificar si el mensaje es un json
	systemMessage: function (message) {
		var _message = message, parse = JSON.tryParse(message);
		if (parse !== false) {
			switch (parse.text) {
				case "ASSIGNED_AGENT":
					_message = lang.chat_assignedAgent.replace("|AGENT|", parse.agentName);
					break;

				case "FINISHED_BY_CLIENT":
					_message = lang.chat_finished_by_client;
					break;

				case "TICKET_CREATED":
					_message = lang.chat_ticket_registered_empty;
					break;				

				case "TICKET_RESOLVED":
					_message = lang.ticket_resolved;
					break;
			}
		}

		return _message;
	},

	addConversation: function (data) {
		console.log("addConversation");

		var ctrl = this, $view = ctrl.$view;
		if (!$view || data.messageType == "TICKET_CREATED") return;

		// Verificar si tiene el permiso de ver todas las conversaciones (Operador)
		if (!data.agent || !data.agent.id) {
			if (!ctrl.viewAll) {
				return; // Si no tiene permiso, se omite
			}
		}

		var $items = data.$items || $view.find(".listLeft .items");

		// Usuario
		var userid = openser = whatsapp = "";
		data.user = data.user || data.client;
		if (data.user) {
			userid = data.user.id;
			openser = data.user.openser || "";
			whatsapp = data.user.whatsapp ? data.user.whatsapp.replace("+", "") : "";
		}

		// No mostrar la conversación con el mismo usuario
		if (userid == socketOmnichannel.user._id && !$view.hasClass("allConversations"))
			return;

		data.lastMessage = ctrl.systemMessage(data.lastMessage);
		data.lastMessage = noInjection(data.lastMessage);

		// last time
		var _date = data.lastUpdate;
		if (_date) {
			if (typeof data.lastUpdate == "string") {
				_date = new Date(data.lastUpdate);
			}
			data.lastTime = _date.toString("h:mm tt").toUpperCase();
			var jDate = getDateStringToDate(_date);
			data.lastTime = jDate.chat_lastUpdate;
			data.lastTime = moment(_date).fromNow();
			data.lastUpdate = _date.toISOString();
		}

		// Buscar si ya existe la conversación
		var $item;
		if (data.conversationID)
			$item = $items.find(".item[conversationid=" + data.conversationID + "]");

		if (data.lastMessage) {
			if (data.lastMessage.indexOf("@@PHOTO@@") == 0) {
				data.fileType = "jpg";
				data.lastMessage = data.lastMessage.replace(/@@PHOTO@@/g, "");
				if (data.lastMessage.matchAny(["__img__.jpeg", "__img__"]))
					data.lastMessage = lang.photo;
			}
			else if (data.lastMessage.indexOf("@@FILE@@") == 0) {
				data.fileType = "pdf";
				data.lastMessage = data.lastMessage.replace(/@@FILE@@/g, "");

				var ext = data.lastMessage.indexOf(".") != -1 ? data.lastMessage.replace(/^.*\./, '').toLowerCase() : "";
				if (ext) {
					var name = data.lastMessage.replace("." + ext, "");
					if (name == "__img__")
						data.lastMessage = lang.photo;
					if(name == "__audio__")
						data.lastMessage = lang.voz;
				}
				switch (ext) {
					case "png":
						data.fileType = "png";
						break;
					case "ogg":
						data.fileType = "ogg";
						break;
					case "mp4":
						data.fileType = "mp4";
							break;
				}
			}
		}
		//LASTMESSAGE _ icon en caso de tener conversacion con archivo
		if (data.fileType) {
			//Si tiene algu tipo de archivo ponemos un icono
			if (data.fileType.matchAny(["jpeg", "jpg", "png"])) {
				data.lastMessage = '<i class="fa fa-camera"></i>' + data.lastMessage;
			}
			else if (data.fileType == "pdf"){
				data.lastMessage = '<i class="fa fa-file-text"></i>' + data.lastMessage;
			}
			else if(data.fileType == "ogg"){
				data.lastMessage = '<i class="fa fa-file-audio"></i>' + data.lastMessage;
			}
			else if(data.fileType == "mp4"){
				data.lastMessage = '<i class="fa fa-file-video"></i>' + "Video";
			}
		}

		//LASTEMESSAGE _ en caso de ser cliente o agente


		//Colocar icono de agente o cliente dependiendo quien lo manod
		if(data.lastSender == "client"){
			data.lastMessage = "<i class='fa fa-user' style='margin-right: 5px;margin-left: 0px;'></i>"+ data.lastMessage;
		} else { 
			data.lastMessage = "<i class='fa fa-user-o' style='margin-right: 5px;margin-left: 0px;'></i>"+ data.lastMessage;
		}
		
		if ($item && $item.length) { // Actualizar conversación
			var lastMessage = data.lastMessage;
			var titleMessage = $("<i>" + lastMessage + "</i>").text().replace(/"/g, "'");
			if(data.fileType) titleMessage = lastMessage;
			$item.find(".lastMessage").html(lastMessage).attr("title", titleMessage);
			$item.find(".lastTime").html(data.lastTime);
			$item.attr("lastUpdate", data.lastUpdate);

			// Leído
			if (data.readed != false)
				$item.addClass("readed");
			else
				$item.removeClass("readed");

			// Si es una conversación activa, entonces mostrar notificacion de escritorio 
			/*if($item.parent().parent().hasClass("active") && !ctrl.conversations_loading && data.agent != true){
				ctrl.notification({ body: data.lastMessage, from: data.user.name });
				// document.hidden tab active or not
			}
			*/
		}
		else {
			// Nueva conversación
			ctrl.newConversation(data);
			ctrl.itemEvents();
		}

		// Reordenar el listado de conversaciones
		if (!data.noSort)
			ctrl.sortConversations();
	},
    /**
	 * Mostrar el contador de mensajes no leeidos en caso de estar en la pantalla omnichanel sobre la conversación
	 * en caso de no estar en la pantalla mostrar el contador de alerta de mensajes en header
	 * @param {} data 
	 */
	handlerBadget: function (data) {
		//TODO AUMENTAR EN CASO DE TENER ESTO

	},
	/**
	 * Decide cuando enviar o no la notificacion al usuario logeado.
	 * @param {data} data 
	 */
	handlerNotificacion: function (data) {
		console.log("Mostrar notificacion => Nuevo mensaje");
		var ctrl = this;

		// No mandar si el cliente es el mismo logueado
		if (data.user && data.user.idUser == localStorage.IdUsuario)
			return;

		// Si eres al agente que le envio el mensaje un usuario 	
		if (data.agent && data.agent.idUser == localStorage.IdUsuario && data.user) {
			ctrl.notification({ body: data.lastMessage, from: data.user.name });
		}
		//Sin agente pero con usuario, de ayuda general
		else if (data.ticket) {
			var idT = data.ticket.slice(3);
			/*getService({
				Url: getUrl('Omnichannel', 'ValidarEnvioMensaje?idIncidente=' + idT + '&idAgente=' + localStorage.IdAgente),
				Metodo: 'GET',
				Datos: data,
				Funcion: function (response) {
					if (response) {
						notificacion({
							title: data.user.name,
							body: lang.omnichannel_notify_new,
							onclick: function () {
								window.open(urlRoot() + "Account/Index#Omnichannel");
							}
						});

						ctrl.agregarPanelNotificacion(data.user.name + " " + lang.omnichannel_notify_new);
					}
				},
				FuncionError_noAlert: function (response) {
					$view.find(".conversation .content").unloading();
					warning(response.msg);
				}
			});*/
		} else if (data.agent && !data.agent.name && data.user) {
			if ($OMNICHANNEL_PERMISO) {
				notificacion({
					title: data.user.name,
					body: lang.omnichannel_notify_new,
					onclick: function () {
						window.open(urlRoot() + "Account/Index#Omnichannel");
					}
				});
				ctrl.agregarPanelNotificacion(data.user.name + " " + lang.omnichannel_notify_new);
			}
		}

		//SI no tienes tipo de mensaje y es la asignacion del agente
		if (data.messageType == "ASSIGNED_AGENT") {
			//Este mensaje le debe llegar al cliente
			if (localStorage.IdUsuario == data.agent.idUser) {
				notificacion({ title: lang.assignation, body: lang.chat_assigned_notify });
				ctrl.agregarPanelNotificacion(lang.chat_assigned_notify);
			}
		}
	},

	agregarPanelNotificacion: function (texto) {
		/*var actualizacion = [{
			xtype: 'notificationDefault',
			mensaje: texto,
			title: lang.omnichannel
			//fechaNotificacion: new Date().toString(lang.format_date + ' - hh:mm tt')
		}];
		agregarElementos(actualizacion, 'pnlNotifications');
		*/
		//_$('notificationsEmtpyLabel').hide();
		//_$('badge-notifications').addTotalNotifications(1);

		$NOTIFICATIONS.add({ type: "OMNICHANNEL", text: texto });
	},

	notification: function (data) {
		var ctrl = this;
		var icon = getUrlRoot() + "app/utileria/omnichannel/images/openser.png";
		var body = $("<div>" + data.body + "</div>").text();
		var title, onclick;
		if (data.from == "agent") {
			title = lang.chat_newMessage_agent;
			onclick = function () {
				ctrl.showChat();
			}
		}
		else {
			title = lang.chat_newMessage_from + data.from;
		}
		var jData = { icon: icon, title: title, body: body, onclick: onclick }
		notificacion(jData);

		//  ctrl.agregarPanelNotificacion(data.user.name + " " + lang.omnichannel_notify_new);
	},

	// Nueva conversación
	newConversation: function (data) {
		var ctrl = this, $view = $("#divMessages");

		//var source = data.source ? " " + data.source : "";
		var source = data.source;
		if (!source)
			return;

		var readed = data.readed ? " readed" : "";
		var favorite = data.favorite ? "" : "-o";
		var favoriteClass = data.favorite ? " favorite " : "";
		var itemClass = "item " + source + readed + favoriteClass;
		var ticket = data.ticket ? data.ticket : false;

		// Cliente
		var userid = userName = openser = whatsapp = idUser_client = "";
		if (data.user) {
			userid = data.user.id ? data.user.id : "";
			idUser_client = data.user.idUser ? data.user.idUser : "";
			openser = data.user.openser || "";
			userName = data.user.name || openser || data.user.whatsapp || userid;

			if (data.source == "whatsapp")
				whatsapp = data.user.whatsapp ? data.user.whatsapp.replace("+", "") : "";
		}
		else {
			idUser_client = data.idUser_client;
			userName = data.clientName;
			if (!userName && source == "whatsapp")
				userName = data.whatsapp;
		}

		// Agente
		var idUser_agent = "";
		if (data.agent) {
			idUser_agent = data.agent.idUser;
		}
		else {
			idUser_agent = data.idUser_agent;
		}

        
		var lastMessage = data.lastMessage ? data.lastMessage : "";
		//TODO Se puede validar que el ultimo mensaje no tenga agente para marcarlo como Necesario de atencion
		var titleMessage = $("<i>" + lastMessage + "</i>").text().replace(/"/g, "'");
		var conversationID = data.conversationID ? data.conversationID : "";
		var lastUpdate = data.lastUpdate ? data.lastUpdate : "";
		var idGroup = data.idGroup ? data.idGroup : "";

		var attr = " ";
		if (userid) attr += 'userid="' + userid + '" ';
		if (openser) attr += 'openser="' + openser + '" ';
		if (whatsapp) attr += 'whatsapp="' + whatsapp + '" ';
		if (conversationID) attr += 'conversationID="' + conversationID + '" ';
		if (lastUpdate) attr += 'lastUpdate="' + lastUpdate + '" ';
		if (source) attr += 'source="' + source + '" ';
		if (ticket) attr += 'ticket="' + ticket + '" ';
		if (idGroup) attr += 'idGroup="' + idGroup + '" ';
		if (idUser_agent) attr += 'idUser_agent="' + idUser_agent + '" ';
		if (idUser_client) attr += 'idUser_client="' + idUser_client + '" ';

		var item =
			'<div class="' + itemClass + '" ' + attr + '>' +
			'<div class="img"></div>' +
			'<div class="info">' +
			'<span class="user" title="' + userName + '">' + userName + '</span>' +
			'<i class="fa fa-star' + favorite + ' favoriteicon"></i>' +
			'<div class="secondLine">' +
			'<span class="lastMessage" title="' + titleMessage + '">' + lastMessage + '</span>' +			
			'<span class="lastTime">' + data.lastTime + '</span>' +
			'</div>' +
			'</div>' +
			'</div>';

		/*if($view.hasClass("allConversations")){
			item.addAgents = true;
			item.$items = ctrl.$itemsAll;
			item.$content = ctrl.$itemsAll.find(".content");
		}
		*/

		// Si tiene agente, agregar a las conversaciones activas, sino a las disponibles
		var $content = data.agent && data.agent.id ? $view.find(".items .active .content") : $view.find(".items .available .content");

		if ($view.hasClass("allConversations")) { //if(data.addAgents){
			// Verificar si ya existe el agente, sino agregarlo
			$content = ctrl.$itemsAll.find(".content");
			var idUser_agent = data.idUser_agent, agentName = data.agentName;
			if (!data.idUser_agent) {
				if (data.agent && data.agent.idUser) {
					idUser_agent = data.agent.idUser;
					agentName = data.agent.name;
				}
				else {
					idUser_agent = 0;
					agentName = lang.unassigned;
				}
			}
			var $agent = $content.find(".agent[idUser=" + idUser_agent + "]");
			if (!$agent.length) {
				$content.append(
					'<div class="agent" idUser="' + idUser_agent + '">' +
					'<div class="name iconExpanded"><i class="fa fa-user-o"></i>' + agentName + '</div>' +
					'<div class="conversations"></div>' +
					'</div>');
				$agent = $content.find(".agent:last");
			}

			var $conversations = $agent.find(".conversations");
			$conversations.append(item);
			$conversations.find(".item:last")[0].data = data;
		}
		else {
			// Vista normal del agente
			var $items = data.$items || $view.find(".items");
			if (ctrl.starting) {
				$content.append(item);
				$items.find(".item:last")[0].data = data;
			}
			else {
				$content.prepend(item);
				$items.find(".item:first")[0].data = data;

				// Esto ocurre al asignar una conversación, volver a seleccionarla si ya estaba anteriormente
				if (ctrl.conversationSelected && ctrl.conversationSelected.conversationID == data.conversationID) {
					setTimeout(function () {
						$items.find(".item:first").click();
						//$items.find(".item:first")[0].click();
					}, 0);
				}
			}
		}
	},

	showChat: function (data) {
		console.log("showChat");
		var ctrl = this;

		if (!data) data = {}
		var ticket = data.ticket; // || 0;

		// Verificar si ya existe el chat
		var $chat = $("body #divChat");
		if ($chat.length) {
			var chatData = $chat[0].data || {};

			// Si es diferente conversación, cerrar el chat y iniciar de nuevo
			if (data.ticket != chatData.ticket) {
				ctrl.chat_close();
				setTimeout(function () { _open(); }, 320);
				return;
			}
		}
		else {
			var html =
				'<div id="divChat" class="omnichannel closed">' +

				// Header
				'<div class="header backgroundCustomed">' +
				'<div class="title"><span class="text">Chat</span> <div class="image"></div></div>' +

				// Minimizar					
				'<i class="minimize fa fa-window-minimize"></i>' +

				// Restaurar
				'<i class="restore fa fa-window-restore"></i>' +

				// Maximizar
				'<i class="maximize fa fa-window-maximize"></i>' +

				// Cerrar				
				'<i class="close fa fa-close"></i>' +
				'</div>' +

				// Body
				'<div class="body">' +

				// Messages
				'<div class="messages">' +

				'</div>' +

				// Write
				'<div class="write">' +
				'<div class="write-body">' +
				// Emoticons
				'<i class="fa fa-smile-o"></i>' +
				'<input class="txtWrite" placeholder="' + lang.write_msg + '" maxlength="1500">' +
				'<i class="fa fa-paperclip"></i>' +
				// Adjuntos
				'<input type="file" class="file" multiple>' +
				'</div>' +
				'</div>' +

				'</div>' +

				'</div>';

			var $html = $(html);
			$("body").append($html);

			ctrl.$attachment_chat = $html.find(".fa-paperclip");
			ctrl.$file_chat = $html.find(".file");
			ctrl.chat_events();
			$chat = $("body #divChat");
		}

		_open();
		function _open() {
			$chat[0].data = data;
			if (!$chat.hasClass("closed")) {
				// Chat abierto		
				if ($chat.hasClass("loading")) {
					return;
				}

				if ($chat.hasClass("minimized")) {
					$chat.find(".restore").click();
				}
			}
			else {
				// Abrir el chat
				var $title = $chat.find(".header .title .text");
				$title.html("Chat");

				$chat.find(".txtWrite").val("");
				$chat.show().removeClass("closed")
				    .attr("idUser_assigned", data.idUser_agent).attr("iduser_client", data.idUser_client); // iduser_client
				ctrl.chat_getConversation({
					ticket: ticket, idGroup: data.idGroup, idAgent: data.idAgent,
					idUser_agent: data.idUser_agent, idUser_client: data.idUser_client
				});
                
                // Atributo para saber quien manda el mensaje desde el chat
				var userData = socketOmnichannel.user;
				if (userData && userData._id){
					var idUser_agent = $chat.attr("idUser_agent") || $chat.attr("iduser_assigned");
					var sender = idUser_agent == userData.idUser ? "agent" : "client";
					if(data.idUser_client == userData.idUser)
					    sender = "client";
					$chat.attr("sender", sender);
				}
			}
		}
	},

	// Cargar la conversación
	chat_getConversation: function (data) {
		console.log("chat_getConversation");
		var $chat = $("body #divChat");
		$chat.addClass("loading minimized").removeClass("maximized");

		setTimeout(function () {
			socketOmnichannel._emit('getConversation', {
				source: "openser", idUser: localStorage.IdUsuario, chat: true,
				ticket: data.ticket, idGroup: data.idGroup, idAgent: data.idAgent,
				idUser_agent: data.idUser_agent, idUser_client: data.idUser_client
			});
		}, 150);
	},

	chat_finish: function () {
		var $chat = $("body #divChat");
		var ticket, conversationID, jEmit = { source: "openser", user: "client" };
		if ($chat.length) {
			ticket = $chat[0].data ? $chat[0].data.ticket : null;
			conversationID = $chat.attr("conversationid");
			jEmit.conversationID = conversationID;

			// Si tiene ticket, entonces crear la actividad
			if (ticket) {
				jEmit.createActivity = true;
				jEmit.ticket = ticket;
			}

			// Si el cliente cierra el chat => mostrar que el cliente ha finalizado la conversación
			if($chat.attr("sender") == "client")
			    jEmit.finishedByClient = true;
		}

		socketOmnichannel._emit('conversation_finish', jEmit);
	},

	chat_close: function () {
		var $chat = $("body #divChat");
		if (!$chat.length) return;
		$chat.removeClass("loading maximized minimized").addClass("closed");
		$chat.removeAttr("conversationID ticket idAgent idGroup idUser_client idUser_agent idUser_assigned setAutomaticAssign sender");
		delete $chat[0].data;
	},

	chat_events: function () {
		console.log("chat_events");
		var ctrl = this;

		var $chat = $("body #divChat");
		var $txtWrite = $chat.find(".txtWrite");

		// Cerrar
		$chat.find(".close").click(function () {
			console.log("close chat");
			event.stopPropagation();

			var conversationID = $chat.attr("conversationid");
			// No preguntar nada si ya está finalizada la conversación o si está vacía
			if ($chat.hasClass("finished") || $chat.find(".body .messages .message").length < 2 || !conversationID) {
				ctrl.chat_close();
			}
			else {
				$confirm(lang.finish_conversation, lang.chat_WantEnd, function (response) {
					if (response.matchAny(["yes"]))
						ctrl.chat_finish();

					ctrl.chat_close();
				});
			}
		});

		// Minimizar
		var $body = $chat.find(".body");
		$chat.find(".minimize").click(function () {
			console.log("Toggle chat");

			// Si está cargando, cancelar el toggle
			if ($chat.hasClass("loading"))
				return;

			// Minimizar chat
			$chat.addClass("minimized");
			$chat.removeClass("loading maximized");
		});

		// Restaurar
		$chat.find(".restore").click(function () {
			console.log("Restore chat");
			$chat.removeClass("minimized maximized");
			_afterShow();
		});

		// Maximizar
		$chat.find(".maximize").click(function () {
			console.log("Maximize chat");
			$chat.toggleClass("maximized").removeClass("minimized");
			_afterShow();
		});

		function _afterShow() {
			$txtWrite.focus();
			ctrl.chat_scrollEnd();
			////_$('chat-badge').clear();
			ctrl.chat_messagesUnread_setReaded();
		}

		// Enviar mensaje		
		$txtWrite.keydown(function () {
			// No empezar con espacios
			var text = $txtWrite.val().trim();
			if (text == "" && event.keyCode == 32)
				event.preventDefault();

			// Enter al enviar mensajes desde el chat
			if (event.keyCode ==13 && text) {
				// Agregar el mensaje
				console.log("Enter chat message");
				var userData = socketOmnichannel.user;
				if (userData && userData._id){
					var sender = $chat.attr("sender");
					ctrl.addMessage({
						text: text, mediaURL: "", register: true, source: "openser", type: "chat", isChat: true,
						sender: sender, sender_idUser: userData.idUser
					});
					$txtWrite.val("");
				}
			}
		});

		// Adjuntar archivos
		ctrl.$attachment_chat.click(function () {
			console.log("click attachment");
			ctrl.$file_chat[0].value = "";
			ctrl.$file_chat.click();
		});
		ctrl.$file_chat.change(function () {
			ctrl.file_change({ isChat: true });
		});

		// Emoticons
		var $icoEmoticons = $chat.find(".fa-smile-o");
		ctrl.createEmoticons({ $icoEmoticons: $icoEmoticons, $txtWrite: $txtWrite, isChat: true });
	},

	file_change: function (data) {
		console.log("file selected");
		var ctrl = this, $view = ctrl.$view;

		// Consultar los formatos permitidos
		if (localStorage.allowedExt) {
			_continue();
		}
		else {
			getService({
				Url: getUrl('Documento', 'ConsultarExtension'),
				Funcion: function (response) {
					if (response.Lista.length) {
						localStorage.allowedExt = JSON.stringify(response.Lista.map(function (x) { return x.Descripcion }));
					}

					_continue();
				}
			});
		}

		function _continue() {
			var $chat = $("#divChat"), isChat = data.isChat;
			var allowedExt = JSON.parse(localStorage.allowedExt);

			// Agregar los archivos al body
			var files = isChat ? ctrl.$file_chat[0].files : ctrl.$file[0].files;
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var sizeMB = file.size / 1024 / 1024;

				// El tamaño máximo es de 5MB
				if (sizeMB > 5) {
					ctrl.addMessage({ warning: lang.error_uploading_size + ' 5 MB', isChat: isChat });
					continue;
				}

				var conversationID, source;
				if (isChat) {
					conversationID = $chat.attr("conversationid");
					source = "openser";
				}
				else {
					var $conversation = $view.find(".items .item.selected");
					conversationID = $conversation.attr("conversationid");
					source = $conversation.attr("source");
				}

				// Validar los formatos permitidos
				var ext = file.name.indexOf(".") != -1 ? file.name.replace(/^.*\./, '').toLowerCase() : "";
				var errorExt = lang.error_extension;
				if (source != "openser") {
					// Whatsapp (jpg, jpeg, png, pdf)
					allowedExt = ["jpeg", "jpg", "png", "pdf"];
					errorExt = lang.chat_invalid_formats;
				}

				if (allowedExt.indexOf(ext) == -1) {
					ctrl.addMessage({ warning: errorExt, isChat: isChat });
					continue;
				}

				var mediaName = file.name.match(/^.*\./, '')[0] + ext;
				var jMessage = {
					file: file, fileType: ext, mediaName: mediaName, conversationID: conversationID, source: source,
					register: true, sender: { id: socketOmnichannel.user._id, idUser: localStorage.IdUsuario },
					idEnterprise: localStorage.Enterprise, isChat: isChat
				}

				ctrl.addMessage(jMessage);
			}
		}
	},

	addMessage: function (data) {
		var ctrl = this;

		if (data.system && JSON.tryParse(data.text) == false && data.type != "TIMEOUT") {
			delete data.system;
		}

		var parse = JSON.tryParse(data.text);
		if (parse !== false) {
			if (parse.text == "TICKET_CREATED") {
				delete data.system;
				delete data.text;
				data.ticketRegistered = parse.ticket || "@ticketRegistered@";
			}
			else if (parse.text == "ASSIGNED_AGENT") {
				data.system = true;
			}
		}
        
        var $chat = $("#divChat");
		var isChat = data.isChat || false; // data.type == "chat" ||
		var $messages, conversationID;
		if (isChat) {
			$messages = $chat.find(".messages");
			conversationID = $chat.attr("conversationID");
		}
		else {
			$messages = ctrl.$body;
			conversationID = data.conversationID || data.idConversation;
		}

		if (data.conversationID && data.conversationID != conversationID) {
			console.log("Different conversation => Exit");
			return;
		}

		var html = "";
		if (data.warning) {
			// Mensaje de alerta
			html =
				'<div class="warning">' +
				'<i class="fa fa-exclamation-triangle"></i>' +
				'<span class="data">' + data.warning + '</span>' +
				'</div>'
		}
		else if (data.finished) {
			// Sólo puede mostrarse una vez
			if ($messages.find(".conversation_ended").length)
				return;

			// Mostrar mensaje de conversación finalizada
			var txtFinished = lang.conversation_finished.toUpperCase();
			html = '<div class="bigMessage conversation_ended">' + txtFinished + '</div>';

			//if ($("#divChat").is(":visible") && !$("#divChat .body").is(":visible"))
				//_$('chat-badge').addTotalMessage(1);
		}
		else if (data.ticketRegistered) {
			var _class = "";
			if (data.ticketRegistered == "@ticketRegistered@") {
				_class = "hide";
			}
			html =
				'<div class="bigMessage ticketCreated backgroundCustomed mouse ' + _class + '" onclick="ticketConsult(\'' + data.ticketRegistered + '\', true)">' +
				lang.chat_ticket_registered + '<b>' + data.ticketRegistered + '</b>' +
				'</div>';
		}
		else if (data.system) {
			// Mensaje del sistema, se puede agregar opción múltiple
			var $system = $('<div class="system message"></div>');
			//ctrl.$body.append($system);

			// Agregar fecha
			var date = data.date ? new Date(data.date) : new Date();
			$system.attr("date", date.toISOString())

			// Tipo de mensaje
			if (data.type)
				$system.attr("messageType", data.type);

			// Verificar si el mensaje es un json
			var _message = ctrl.systemMessage(data.text);
			var $text = $('<span class="text">' + _message + '</span>');

			if (data.loading) {
				$text.prepend('<div class="_loading"></div>');
			}

			$system.append($text);

			if (data.options) {
				var $options = $('<div class="options"></div>');
				data.options.forEach(function (item) {
					$options.append('<div class="option" _id="' + item.id + '">' + item.text + '</div>');
				});

				$system.append($options);

				// Click en una opción
				$system.find(".option").click(function () {
					var $option = $(this);
					if (data.option_click)
						data.option_click($option);
				});
			}

			html = $system.wrap("<div></div>").parent().html();
		}
		else {
			if (data.register || data.generateID) {
				// Agregar un ID al mensaje
				data.messageID = uuidv4();
			}

			// Verificar que no haya sido agregado el mensaje
			var messageID = data.messageID, _messageID = "";
			if (messageID) {
				//console.log("check message added");
				if ($messages.find(".message[messageid=" + messageID + "]").length)
					return;

				_messageID = ' messageID="' + messageID + '" ';
			}

			// Fecha
			var date = data.date ? new Date(data.date) : new Date();
			var _date = ' date="' + date.toISOString() + '" ';
			var time = date.toString("h:mm tt").toUpperCase();

			var sender, readed, timeHtml = "";
			if (isChat) {
				//sender = data.sender && data.sender.id == socketOmnichannel.user._id ? "me" : "agent";
				if (data.sender == "agent")
					sender = "agent";
				else if(typeof data.sender == "string" && data.sender.matchAny(["client", "user"]))
					sender = "user";
				else if($chat.attr("iduser_client") && typeof data.sender == "object"){
					sender = $chat.attr("iduser_client") == data.sender.idUser ? "user" : "agent";
				}
				else
					sender = data.sender && data.sender.id == socketOmnichannel.user._id ? "user" : "agent";

				if (sender == "agent")
					readed = true;
				else
					readed = false;
			}
			else {
				timeHtml = '<span class="time">' + time + '</span>';
				var $selected = ctrl.$view.find(".listLeft .item.selected");
				var openser = $selected.attr("openser"), whatsappSelected = $selected.attr("whatsapp"), idUser_client = $selected.attr("iduser_client");

				// Detectar al usuario con el whatsapp o con el id de openser
				readed = true;
				sender = "agent";
				if(data.sender == "client") sender = "user";
				if (data.sender && data.sender != "agent" && !data.agent) {
					if (data.sender.idUser == idUser_client || +data.sender.whatsapp == whatsappSelected) {
						//if(data.sender.openser == openser || +data.sender.whatsapp == whatsappSelected){
						sender = "user";
						readed = false;
					}
				}
			}

			var status = "";
			if (sender == "agent") {
				var icon = "fa-check";
				if (data.register)
					icon = "fa-clock-o";

				status = '<span class="status fa ' + icon + '"></span>';
			}

			var _class = "message ";
			_class += (sender == "user") ? sender : sender + " backgroundCustomed";

			var text = data.text || "";
			text = text.replace(/</g, "&#60;");
			text = text.replace(/\n/g, "<br>");

			// Archivo    	
			var image = file = link = "";
			if (data.mediaURL || data.file) {
				var mediaName = data.mediaName;
				if (!data.mediaName) {
					if (data.source == "whatsapp") {
						if (text == "image/jpeg") {
							mediaName = "file.jpg";
							text = "";
						}
					}
					else {
						mediaName = data.mediaName = "file." + data.mediaURL.replace(/^.*\./, '');
					}
				}

				var ext = mediaName && mediaName.indexOf(".") != -1 ? mediaName.replace(/^.*\./, '').toLowerCase() : "";
				data.fileType = ext;

				switch (ext) {
					case "ogg":
						{//Ahora regreso el mediaContentType aqui.
							var iconClass = "default";
							file = '<div class="icon gif"></div><div class="icon ' + iconClass + '"></div><div class="name">' + mediaName + '</div>';
							file = '' +
								'<audio controls>' +
								'<source src="' + data.mediaURL + '" type="audio/ogg">' +
								'<source src="' + data.mediaURL + '" type="audio/mpeg">' +
								'Your browser does not support the audio element.' +
								'</audio>';
							_class += " file";
							text = "";
						}
						break;

					case "mp4":
						{//Ahora regreso el mediaContentType aqui.
							var iconClass = "default";
							file = '<div class="icon gif"></div><div class="icon ' + iconClass + '"></div><div class="name">' + mediaName + '</div>';
							file = '' +
								'<video controls>' +
								'<source src="' + data.mediaURL + '" type="video/mp4">' +
								'<source src="' + data.mediaURL + '" type="audio/ogg">' +
								'Your browser does not support the audio element.' +
								'</video>';
							_class += " file";
							text = "";
						}
						break;
					case "pdf":
					default:
						var iconClass = "default";
						if (ext == "pdf") iconClass = "pdf";
						if (ext == "txt") iconClass = "txt";
						if (ext.matchAny(["rar", "zip"])) iconClass = "zip";
						if (ext.matchAny(["doc", "docx"])) iconClass = "doc";
						if (ext.matchAny(["xls", "xlsx"])) iconClass = "xls";

						file = '<div class="icon gif"></div><div class="icon ' + iconClass + '"></div><div class="name">' + mediaName + '</div>';
						_class += " file";
						text = "";

						if (data.mediaURL)
							link = ' link="' + data.mediaURL + '"';
						else
							_class += " _loading";

						break;

					// Imagen
					case "jpeg":
					case "jpg":
					case "png":
						image = '<img class="image" src="' + (data.mediaURL || "") + '"><div class="loading"><div class="loading_items"><div class="image"></div></div></div>';
						_class += " imageFile";
						if(text == "@@PHOTO@@__img__@@PHOTO@@") text = "";
						text = text.replace(/@@PHOTO@@/g, "");
						//if(text == "@@PHOTO@@") text = "";
						break;

					/*					
					default:
						console.log("Extensión no permitida");
						break;
					*/
				}

			}

			// Tipo de mensaje
			var messageType = "";
			if (data.type) {
				messageType = ' messageType="' + data.type + '" ';
			}

			if (!text){
				_class += " noText";
				text = timeHtml;
			}
			else {
				text = '<label class="text">' + text + timeHtml + '</label>';
				//timeHtml = "";
			}
			    
			var dataHtml = image + text + file;
			if (!dataHtml) return;

			html =
				'<div class="' + _class + '" ' + _messageID + _date + link + messageType + '>' +
				'<span class="data">' + dataHtml + '</span>' +
				//timeHtml + status +
				status +
				'</div>'
		}

		if (!data.noAdd) {
			var $message = $(html);
			$messages.append($message);
		}

		// Archivos
		//if(data.fileType == "pdf"){
		if (link) {
			ctrl.downloadFile_click({ $message: $message });
			/*
			$message.find(".data").click(function(){
				var mediaURL = $message.attr("link");
				console.log("link: " + mediaURL);
				//window.open(data.mediaURL);				
				if (mediaURL)
					downloadURL(mediaURL, data.mediaName);
				//window.location.href = data.mediaURL;
			});*/
		}

		// Imagenes
		if (image) {
			$message.hide();
			var $image = $message.find("img.image");
			if (data.file) {
				// Imagen adjunta desde el navegador
				var reader = new FileReader();
				reader.onload = function (e) {
					$image.attr('src', e.target.result);
					setTimeout(function () {
						_painting();
					}, 0);
				}
				reader.readAsDataURL(data.file);
			}
			else {
				// Imagen guardada en el servidor
				_painting();
				$message.find(".image")[0].onload = function () {
					$message.removeClass("_loading");
					$message.show();
					scrollEnd();

					if (data.onLoadImage)
						data.onLoadImage();
				};
			}

			function _painting() {
				// Centrar loaging
				var $loading = $message.find(".loading");
				var size = 35;
				$message.addClass("_loading").show();
				var top = ($image.outerHeight() - size) / 2, left = ($image.outerWidth() - (size + 15)) / 2;
				//$loading.find(".loading_items").css({ top: top, left: left });
				$loading.find(".loading_items").css({ top: top });
				scrollEnd();
			}
		}

		// Scroll hasta abajo
		ctrl.newMessageScroll = true;
		scrollEnd();
		ctrl.newMessageScroll = false;

		function scrollEnd() {
			if (isChat)
				ctrl.chat_scrollEnd();
			else
				ctrl.scrollEnd();
		}

		// Guardar el mensaje en la base de datos, y actualizar la conversación con el mensaje y su fecha		
		if (data.register && conversationID) {
			var jConversation = {
				conversationID: conversationID, lastUpdate: new Date(),
				lastMessage: data.text, readed: readed,
				fileType: data.fileType, agent: data.agent
			}

			if(!data.text && data.mediaName){
				if(_class.indexOf("imageFile") != -1)
    				jConversation.lastMessage = "@@PHOTO@@__img__@@PHOTO@@";
				else
				    jConversation.lastMessage = data.mediaName;
			}

			data.conversationID = conversationID;
			if (data.sender && data.sender.idUser)
				jConversation.user = { idUser: data.sender.idUser }

			if (!isChat)
				ctrl.addConversation(jConversation);

			if (data.file) {
				//$message.addClass("_loading");
				convertToBase64(data.file, function (base64) {
					//var source = $conversation.attr("source");
					data.base64 = base64;
					//data.mediaName = data.file.name;
					_pendingMessages();
				})

			}
			else {
				_pendingMessages();
			}
		}

		function _pendingMessages() {
			delete data.file;
			delete data.register;

			if (isChat) {
				ctrl.pendingChatMsg.push(data);
				ctrl.pendingMessages({ isChat: true });
			}
			else {
				ctrl.pendingAgentMsg.push(data);
				ctrl.pendingMessages({ isChat: false });
			}
		}

		return $message;
	},

	downloadFile_click: function(data){
		data.$message.find(".data").click(function(){
			var mediaURL = data.$message.attr("link");
			console.log("link: " + mediaURL);
			//window.open(data.mediaURL);				
			if (mediaURL)
			    downloadURL(mediaURL);
				//downloadURL(mediaURL, data.mediaName);
			//window.location.href = data.mediaURL;
		});
	},

	chat_messagesUnread_setReaded: function () {
		// Marcar los mensajes del agente como leídos
		var conversationID = $("#divChat").attr("conversationID");
		if (!conversationID) return;
		socketOmnichannel._emit('chat_messagesUnread', { idConversation: conversationID, setReaded: true });
	},

	agentToChat: function (message) {
		// Nuevo mensaje del agente al cliente
		console.log("agentToChat: " + message.message);
		var ctrl = this;

		if ($("#divChat").is(":visible")) {
			// Agregar el mensaje directo en el chat
			ctrl.addMessage({
				text: message.message, messageID: message.messageID, conversationID: message.conversationID,
				mediaURL: message.mediaURL, mediaName: message.mediaName, isChat: true, system: message.system
			});
		}

		if (!$("#divChat .body").is(":visible")) {
			// Mostrar notificación
			//_$('chat-badge').addTotalMessage(1);
			ctrl.notification({ body: message.message, from: "agent" });
		}
		else {
			// Marcar mensajes como leídos
			ctrl.chat_messagesUnread_setReaded();
		}
	},

	// Verificar si el agente abre el chat, pero está asignado para alguien más
	chatAssignedAnotherAgent: function(data){
		console.log("chatAssignedAnotherAgent");
		var ctrl = this;
		var $chat = $("#divChat");
		if($chat.attr("sender") == "agent"){
			// Deshabilitar chat
			if(data.idUser_agent && localStorage.IdUsuario != data.idUser_agent){
				// Mostrar alerta y cerrar el chat
				warning(lang.chat_assigned_another);
				ctrl.chat_close();
				return true;
			}
		}

		return false;
	},

	conversationToChat: function (data) {
		console.log("conversationToChat");
		console.log(data);

		var ctrl = this, $view = ctrl.$view;
		var $chat = $("body #divChat");
		var $body = $chat.find(".body");
		var $messages = $chat.find(".body .messages");
		var $txtWrite = $chat.find(".txtWrite");
        
        if(ctrl.chatAssignedAnotherAgent({ idUser_agent: data.conversation.idUser_agent }))
            return;

		$messages.html("");
		data.messages.forEach(function(item){
			item.isChat = true;
			ctrl.addMessage(item);
		});

		$chat.removeClass("loading finished minimized");
		//if(!$body.is(":visible")){
		$body.slideDown();
		$txtWrite.focus();
		ctrl.chat_scrollEnd();
		//_$('chat-badge').clear();

		/*
		setTimeout(function(){
			if(!$body.is(":visible"))
				$body.show();
		}, 50);    		*/
		//}

		ctrl.chat_setInfo(data.conversation);

		// Marcar como leídos los mensajes
		ctrl.chat_messagesUnread_setReaded();
	},

	model_select: function () {
		console.log("model_select");
		var ctrl = this, $view = ctrl.$view;
		//TODO REMPLAZAR PARA OTRAS HERRAMIENTAS
		Ext.create('OpenSer.view.incident.RegisterTemplateView', { omnichannel: true });
		var $conversation = $view.find(".items .item.selected");
		delete $conversation[0].idModel;
	},

	client_selected: function(){
		console.log("Show modal selected client");
		//TODO REMAPLZARA PARA CUANDO SE USE FUERA DE OPENSER
		Ext.create('OpenSer.view.asignacion.AsignacionView',{
			invitarUsuario: true, //Esto oculta algunas cosas para hace rsimple la vista
			omnichannel : true, // Lo usuaremos para cambiar el metodo de asignacion
			aceptar : function(){
				console.log("Se asignara el cliente a la conversacion");
				alert("Pendiente proceso nodejs");
			}
		});

	},

	model_selected: function (data) {
		console.log("model_selected");
		var ctrl = this, $view = ctrl.$view;

		var $conversation = $view.find(".items .item.selected");
		$conversation[0].idModel = data.idModel;

		var conversationID = $conversation.attr("conversationid");

		$view.find(".conversation .content").loading();

		// Obtener la conversación completa para armar la descripción
		socketOmnichannel._emit('getConversation', { conversationID: conversationID, idEnterprise: localStorage.Enterprise, createTicket: true });
	},
    /**
	 * Regresa toda la conversación este metodo se usa para crear el ticket y la actividad.
	 * 
	 * @param {any} data Objeto de Node Js
	 */
	getConversation_HTML: function (data, client) {
		var ctrl = this, $view = ctrl.$view;

		var idUser_client = data.idUser_client;
		var description = lang.chat_content_conversation + "<br><br>";
		description += '<table><tbody>';
		data.messages.forEach(function (item) {
			// Detectar al usuario con el id del cliente
			var sender = lang.agent;
			if (!item.agent && item.sender && item.sender.idUser == idUser_client) {
				sender = data.clientName;
			}

			var message = ctrl.systemMessage(item.text) || "";
			if (item.system || (message && message != item.text))
				sender = lang.system;

			if (item.mediaURL) {
				var ext = item.mediaURL.indexOf(".") != -1 ? item.mediaURL.replace(/^.*\./, '') : "";
				//TODO REMPLAZAR PARA OTRAS HERRAMIENTAS
				if (ext.matchAny(["jpeg", "jpg", "png"])) {
					// Mostrar la imagen
					message = '<img src="' + item.mediaURL + '" style="max-width: 350px;display: block;' +
						'background-size: contain;background-repeat: no-repeat;background-position: center;min-height: 30px;' +
						'margin-bottom: 5px;">' + message;
				}//TODO REMPLAZAR PARA OTRAS HERRAMIENTAS
				else if (ext.matchAny(["pdf"])) {
					message = '<a href="' + item.mediaURL + '" download>' + item.mediaName + '</a>';
				}
				else { // if (ext.matchAny(["ogg"])) {
					message = '<a href="' + item.mediaURL + '" download>' + item.mediaURL + '</a>';
				}
			}

			description += '<tr style="vertical-align: top;"><td style="">' + sender + '</td><td style="width: 12px;">:</td><td>' + message + '</td></tr>';
		});

		description += '</tbody></table>';
		return description;
	},

	getConversation_createTicket: function (data) {
		console.log("getConversation_createTicket");
		var ctrl = this, $view = ctrl.$view;

		var $conversation = $view.find(".items .item.selected"), conversationID = $conversation.attr("conversationid"),
			idUser_client = $conversation.attr("idUser_client"), openser = $conversation.attr("openser"),
			whatsapp = $conversation.attr("whatsapp"), client = $conversation.find(".user").text();

		// Descripcion
		var description = ctrl.getConversation_HTML({ messages: data.messages, clientName: client, idUser_client: idUser_client });

		var idModel = $conversation[0].idModel, source = $conversation.attr("source"), ticket = $conversation.attr("ticket");

		var idFuente;
		switch (source) {
			case "whatsapp": idFuente = -1; break;
			case "openser": idFuente = -2; break;
			case "email": idFuente = 3; break;
		}


		//Datos para crear el ticket
		data = {
			CveUsuarioCliente: openser || "admin",
			CveUsuarioRegistra: localStorage.CveUsuario,
			Descripcion: description,
			IdPlantillaRegistro: idModel,
			IdFuente: idFuente,
			Omnichannel: true
		}
		getService({
			Url: getUrl('Bot', 'CrearTicket'),
			Metodo: 'POST',
			Datos: data,
			Funcion: function (response) {
				$conversation[0].ticket = response.Ticket;
				ctrl.finish_conversation({ ticket: response.Ticket });
				//socketOmnichannel._emit('conversation_finish', { conversationID: conversationID, idEnterprise: localStorage.Enterprise });
			},
			FuncionError_noAlert: function (response) {
				$view.find(".conversation .content").unloading();
				warning(response.msg);
			}
		});
	},

	getConversation_createActivity: function (data) {
		console.log("getConversation_createActivity");
		var ctrl = this, $view = ctrl.$view;
		if (!data.ticket) return;

		var solveTime = data.solveTime || 0;
		var idTicket = +data.ticket.match(/[0-9]+/);
		var description = ctrl.getConversation_HTML({ messages: data.messages, clientName: data.clientName, idUser_client: data.idUser_client });

    	ctrl.createActivity({ description: description, solveTime: solveTime, idTicket: idTicket, idUser_agent: data.idUser_agent });
    },

	conversation_finished_addMessage_agent: function () {
		var ctrl = this, $view = ctrl.$view;
		if (!$view) return;

		var $body = $view.find(".conversation .content .body");
		if (!$body.find("div:last-child").hasClass("conversation_ended")) {
			var txtFinished = lang.conversation_finished.toUpperCase();
			$body.append('<div class="bigMessage conversation_ended">' + txtFinished + '</div>');
			ctrl.scrollEnd();
		}
	},

	conversation_finished_agent: function (data) {
		console.log("conversation_finished_agent");
		var ctrl = this, $view = ctrl.$view;

		if(!$view){
			var $chat = $("#divChat");
			if($chat.length && $chat.attr("conversationid") == data.id){
				// Finalizar conversación del chat
				ctrl.conversation_finished_client({ conversationID: data.id, ticket: data.ticket });
			}

			return;
		}

		var $conversation = $view.find(".items .item.selected");
		var conversationID = $conversation.attr("conversationid");
		var $body = $view.find(".conversation .content .body");
		var source = $conversation.attr("source");

		if ($conversation.length && conversationID == data.id) {

			/*
			// Ticket registrado
			var ticket = $conversation[0].ticket;
			if(ticket){
				ctrl.addMessage({ ticketRegistered: ticket });
				//$body.append('<div class="bigMessage ticketCreated backgroundCustomed">' + lang.chat_ticket_registered + '<b>' + ticket + '</b></div>');
				//ctrl.scrollEnd();
			}
			*/

			// Mensaje de conversación finalizada		
			ctrl.conversation_finished_addMessage_agent();

			// Bloquear el envío de mensajes
			$conversation.remove();
			$view.find(".conversation").addClass("finished");
		}
		else {
			// Eliminar la conversación del listado
			$conversation = $view.find(".items .item[conversationid=" + data.id + "]");
			$conversation.remove();
		}

		// Mandar el mensaje final a whatsapp (Ticket creado + Mensaje de despedida + Conversacion finalizada)
		if (source == "whatsapp" && data.idSocket == socketOmnichannel.id) {
			var jEmit = { conversationID: conversationID, messages: [] }

			// Ticket creado
			var ticketCreated = ctrl.$body.find(".ticketCreated").text();
			if(ticketCreated)
    			jEmit.messages.push(ticketCreated);

			// Mensaje de despedida
			var farewell = ctrl.$body.find(".message[messagetype=FAREWELL] .text").html();
			farewell = farewell.split('<span class="time"')[0];
			jEmit.messages.push(farewell);

			// Conversacion finalizada
			jEmit.messages.push("_" + lang.conversation_finished.toUpperCase() + "_");
			socketOmnichannel._emit('send_whatsapp', jEmit);
		}

		// Agregar solveTime
		ctrl.$conversation.attr("solveTime", (data.solveTime || 0));

		//ctrl.finish_conversation();
		ctrl.sortConversations();
		$view.find(".conversation .content").unloading();
	},

	conversation_finished_client: function (data) {
		console.log("conversation_finished_client");
		var ctrl = this, $view = ctrl.$view;

		// Bloquear el envío de mensajes
		var $chat = $("body #divChat");
		if ($chat.length) {
			if ($chat.attr("conversationid") != data.conversationID) return; // Diferente conversación

			if (data && data.ticket) {
				var $ticket = $chat.find(".body .messages .ticketCreated");
				if ($ticket.length) {
					var noTicket = +data.ticket.match(/[0-9]+/);
					$ticket.attr("onclick", 'ticketConsult(\'' + noTicket + '\', true)');
					$ticket.html($ticket.html().replace(/@ticketRegistered@/g, data.ticket));
					$ticket.removeClass("hide");
					//ctrl.addMessage({ ticketRegistered: data.ticket, isChat: true });
				}
			}

			ctrl.addMessage({ finished: true, isChat: true });
			$chat.addClass("finished");
		}
		else {
			//_$('chat-badge').clear();
		}
	},

	finish_conversation: function (data) {
		console.log("finish_conversation");
		var ctrl = this, $view = ctrl.$view;

		if (!data) data = {}

		if (data.ticket || data.noConfirm) {
			_continue();
			return;
		}

		// Mostrar mensaje de confirmación
		$confirm(lang.finish_conversation, lang.chat_WantEnd, function (response) {
			_continue(response);
		});

		function _continue(response) {
			if (response && response.matchAny(["no", "cancel"])) return;

			$view.find(".conversation .content").loading();

			// Mandar mensaje de conversación finalizada
			var $conversation = $view.find(".items .item.selected");
			var conversationID = $conversation.attr("conversationid");
			var source = $conversation.attr("source");

			var jEmit = { conversationID: conversationID, text: lang.conversation_finished.toUpperCase() }
			if (source == "whatsapp")
				jEmit.text = "_*" + jEmit.text + "*_";
			if (data.ticket) {
				jEmit.ticket = data.ticket;

				// Mensaje para whatsapp
				jEmit.text = lang.chat_ticket_registered + data.ticket + "\n\n" + jEmit.text;

				// Mostrar el mensaje oculto que contiene el ticket creado
				var $ticket = ctrl.$body.find(".ticketCreated");
				var noTicket = +data.ticket.match(/[0-9]+/);
				$ticket.attr("onclick", 'ticketConsult(\'' + noTicket + '\', true)');
				$ticket.html($ticket.html().replace(/@ticketRegistered@/g, data.ticket));
				$ticket.removeClass("hide");
			}

			// Si tiene ticket, entonces crear la actividad.
			var idTicket = $conversation.attr("ticket") ? +$conversation.attr("ticket").match(/[0-9]+/) : 0;
			if (idTicket)
				jEmit.createActivity = true;

			// Si el cliente cierra el chat => mostrar que el cliente ha finalizado la conversación
            
            // Al finalizar el ticket
            if(data.ticketResolved)
    			jEmit.ticketResolved = true;

			// Finalización por tiempo de espera
			if (data.msgTimeout)
				jEmit.msgTimeout = data.msgTimeout;

			socketOmnichannel._emit('conversation_finish', jEmit);
			clearTimeout(ctrl.conversation_startTimer_);
		}

    	/*var $body = $view.find(".conversation .content .body");
    	if(!$body.find("div:last-child").hasClass("conversation_ended")){
    		var txtFinished = lang.conversation_finished.toUpperCase();
    		$body.append('<div class="bigMessage conversation_ended">'+txtFinished+'</div>');
    		ctrl.scrollEnd();

    		// En la conversación seleccionada, agregar un atributo

    		
    		
    		//var data = { text: "_*"+txtFinished+"*_", sender: { openser: localStorage.CveUsuario }, idConversation: conversationID, finish: true, idEnterprise: localStorage.Enterprise }
    		//socketOmnichannel._emit('send agent message', data);
    	} 
    	*/
	},

    /**
	 * 
	 * 
	 * @param {any} descripcion Es el contenido de la conversación.
	 * @param {any} tiempoDedicado TimeSpan 0:0:0  este regresa en la propiedad data.solveTime del Node
	 */
    createActivity: function (data) {
    	// Mínimo debe aparecer un minuto en el tiempo dedicado
    	var timeSpent = data.solveTime;
    	if(timeSpent < 60)
    	    timeSpent = 60;
		timeSpent = "P0DT0H0M"+timeSpent+"S";
        
        var date = new Date();
        var datos = {
            Descripcion: data.description,
            Fecha: '\/Date(' + date.getTime() + ')\/',
            FechaDT: {
                "DateTime": "/Date(" + date.getTime() + date.getUTCOffset() + ")/",
                "OffsetMinutes": date.getTimezoneOffset()
            },
            IdUsuario: data.idUser_agent || 0, // localStorage.IdUsuario,
            IdIncidente: data.idTicket,
            IdTipoActividad: -2,
            Privado: false,
            TiempoDedicado: timeSpent
        }
        
        // var $consult = //_$("incident_consult");
        // var jData = {
        //     Url: getUrl('Actividad', 'Guardar'),
        //     Metodo: 'POST',
        //     Datos: datos,
        //     Funcion: function (response) {
        //     	console.log(lang.activity_added);

        //     	// Recargar info si está en la pantalla del mismo ticket y no tiene agente asignado
        //     	$consult = //_$("incident_consult");
        //     	if($consult){
        //     		var dataIncident = $consult.dataIncident;
        //     		if(data.idTicket == dataIncident.IdIncidente && !dataIncident.Agente.IdAgente){
        //     			$consult.controller.reloadIncidentGeneral();
        //     		}
        //     	}
        //     }
        // }
        if($consult) jData.$mask = $consult;
        getService(jData);
    },

	chat_messagesUnreadCount_result: function (data) {
		console.log("chat_messagesUnreadCount_result");
		//_$('chat-badge').clear().addTotalMessage(data.countUnread);
	},

	chat_setInfo: function (data) {
		console.log("set info chat");
		var ctrl = this;
		var $chat = $("#divChat");

		// Obtener el titulo del chat
		socketOmnichannel._emit('settings get');

		if (data.conversationID)
			$chat.attr("conversationID", data.conversationID);

		//$chat.removeAttr("ticket");
		var ticket = data.ticket, agent = data.agentName || "";
		if (ticket)
			$chat.attr("ticket", ticket);
		if (data.idGroup != null)
			$chat.attr("idGroup", data.idGroup);
		if (data.idAgent != null)
			$chat.attr("idAgent", data.idAgent);
		if (data.idGroup === 0) {
			$chat.removeAttr("idGroup idAgent");
		}
		if (data.idUser_client)
			$chat.attr("idUser_client", data.idUser_client);
		if (data.idUser_agent){
			if(ctrl.chatAssignedAnotherAgent({ idUser_agent: data.idUser_agent }))
				return;

			$chat.attr("idUser_agent", data.idUser_agent);
		}

		// Asignar el titulo del chat
		if (ticket) {
			var group = "";
			if (data.idGroup === 0) { // Grupo Omnichannel
				var timeout = $OMNICHANNEL._settings ? 0 : 800;
				setTimeout(function () { // Para esperar a que cargue el servicio de settings
					group = lang.omnichannel;
					_setTitle();
				}, timeout);
			}
			else if (data.idGroup || data.idAgent) {
				var _data = {};
				if (data.idGroup) _data.Grupo = [{ Id: data.idGroup }]

				getService({
					Url: getUrl("Omnichannel", "ObtenerCatalogo"),
					Metodo: 'POST',
					Datos: _data,
					Funcion: function (jData) {
						group = jData.Grupo ? jData.Grupo[0].Descripcion : "";
						_setTitle();
					}
				});
			}
		}

		function _setTitle() {
			var titleChatTicket, _header = "";
			if ($OMNICHANNEL._settings) {
				titleChatTicket = $OMNICHANNEL._settings.titleChatTicket
			}

			var $header = $chat.find(".header .title .text");
			if (titleChatTicket) {
				_header = titleChatTicket.replace(/\|AGENT\|/g, agent).replace(/\|GROUP\|/g, group).replace(/\|TICKET\|/g, ticket);
				$header.html(_header).attr("title", _header);
			}
			else {
				// Si no tiene configuración, pero tiene ticket, mostrar el ticket en el título
				if (ticket) {
					_header = ticket;
					$header.html(_header).attr("title", _header);
				}
			}

			// Agregar el mensaje de agente asignado si no lo tiene
			setTimeout(function () {
				if (data.idAgent && !$chat.find(".message[messagetype=ASSIGNED_AGENT]").length && !data.noAddMessage) {
					socketOmnichannel._emit('conversation assign', { conversationID: data.conversationID, idUser_agent: data.idUser_agent, idGroup: data.idGroup });
				}
			}, 1000);
		}
	},

	agentAcceptedConversation: function (data) {
		console.log("agentAcceptedConversation");
		var ctrl = this, $view = ctrl.$view;

		// Verificar si es la conversación del chat
		if ($('#divChat').length && $('#divChat').attr("conversationID") == data.conversationID) {
			// Actualizar la info del chat
			data.noAddMessage = true;
			ctrl.chat_setInfo(data);
		}

        /* ???
		if(!$view || !data.run)
			return;		
		*/

		if (!$view)
			return;

		// Buscar la conversación en el listado
		var $conversation = $view.find(".items .item[conversationid=" + data.conversationID + "]");
		if (!$conversation.length) return;

		// Agregar el id del agente
		$conversation.attr("idUser_agent", data.idUser_agent);

		// Verificar si es la vista por agentes
		if ($view.hasClass("allConversations")) {
			return;
		}
		else {
			// Vista normal
			if (socketOmnichannel.user._id == data.agentID) {
				// Si es del mismo agente, entonces mover a las conversaciones activas
				$view.find(".items .active .content").append($conversation);

				// Activar conversación seleccionada en caso de que sea la misma
				var conversation = $view.find(".items .item.selected");
				var conversationID = conversation.attr("conversationid");
				if (conversationID == data.conversationID) {
					ctrl.$content.unloading();
					ctrl.$conversation.removeClass("available").addClass("active");
					ctrl.$txtWrite.focus();
				}
			}
			else {
				// Eliminar del listado de conversaciones disponibles, ya que fue asignada para otro agente
				if ($conversation.hasClass("selected")) {
					ctrl.$conversation.addClass("finished");
				}
				$conversation.remove();
			}
		}

		// Ordenar conversaciones
		ctrl.sortConversations();
	},

	conversation_info: function (data) {
		console.log("conversation_info");
		console.log(data);
		var ctrl = this, $view = ctrl.$view;

		if (data.isFinished) {
			// Verificar si es la conversación seleccionada
			var $conversation = $view.find(".items .item.selected");
			var conversationID = $conversation.attr("conversationid");
			if (conversationID == data.conversationID) {
				ctrl.$conversation.addClass("finished");
				ctrl.conversation_finished_addMessage_agent();
				$conversation.remove();
				ctrl.sortConversations();
			}
		}
		else {
			// Buscar conversación en las disponibles
			var $conversation = $view.find(".items .available .item[conversationid=" + data.conversationID + "]");

			// Si estaba disponible y ya tiene agente
			if (data.idUser_agent && $conversation.length) {
				// Pasa a activa si es el mismo agente
				if (data.idUser_agent == localStorage.IdUsuario) {
					$view.find(".items .active .content").append($conversation);
					ctrl.sortConversations();

					var $conversationSelected = $view.find(".items .item.selected");
					var idSelected = $conversationSelected.attr("conversationID");
					if (idSelected == data.conversationID) {
						ctrl.$conversation.removeClass("available").addClass("active");
						ctrl.$txtWrite.focus();
					}
				}
				else {
					// Si es la misma seleccionada, deshabilitar conversación
					var $conversationSelected = $view.find(".items .item.selected");
					var idSelected = $conversationSelected.attr("conversationID");
					if (idSelected == data.conversationID) {
						ctrl.$conversation.addClass("finished");
					}

					// Si es otro agente, eliminar
					$conversation.remove();
				}
			}
		}
	},

	conversation_notExists: function (data) {
		console.log("conversation_notExists");
		var ctrl = this;

		var arrPending = data.isChat ? ctrl.pendingChatMsg : ctrl.pendingAgentMsg;
		arrPending.splice(0, 1);
		ctrl.pendingMessages({ reconnect: false, isChat: data.isChat });
	},

	settings_got: function (data) {
		console.log("settings_got");
		console.log(data);
		var ctrl = this, $view = ctrl.$view;
		ctrl.timeoutClient = data.timeoutClient;
	},

	assign: function () {
		console.log("assign");
		var ctrl = this, $view = ctrl.$view;

		var url = getUrlRoot() + "app/utileria/omnichannel/assignment.html";
		$("body").append("<div class='popupBackground'></div>");
		$("body .popupBackground").load(url);
	},

	// Verificar si es un agente y si tiene acceso al omnichannel para poder asignarle un chat
	assignableAgent: function () {
		return false;
		if (!isAgent()) return false;
		if (!localStorage.menu) return;

		var jsonMenu = JSON.parse(localStorage.menu);
		var index = jsonMenu.urls.indexOf("Omnichannel");
		if (index == -1) return false;

		return true;
	},

	getAllConversations: function (data) {
		console.log("getAllConversations");
		console.log(data);

		var ctrl = this, $view = ctrl.$view;
		if (!$view || !$view.is(":visible")) return;

		var $noSelection_text = $view.find(".noSelection span"), noSelection_text;
		if (!data.length) {
			// No hay conversacioones disponibles
			ctrl.$itemsAll.addClass("noData");
		}
		else {
			//noSelection_text = lang.select_element;
			//$view.removeClass("noData");
			ctrl.$itemsAll.removeClass("noData");

			// Ordenar conversaciones por el nombre del agente
			function compare(a, b) { if (a.agentName < b.agentName) return -1; if (a.agentName > b.agentName) return 1; return 0; }
			data.sort(compare);

			// Agregar conversaciones
			data.forEach(function (item) {
				item.noSort = true;
				ctrl.addConversation(item);
			});
			//ctrl.sortConversations();

			ctrl.$itemsAll.find(".agent .name").off("click").click(function () {
				var $agent = $(this).parent();
				ctrl.toggleList({ $div: $agent, $label: $(this), $content: $agent.find(".conversations") });
			});
		}

		if (typeof ctrl.afterGetAll == "function") {
			ctrl.afterGetAll();
		}
		delete ctrl.afterGetAll;

		ctrl.$search.keyup();
		ctrl.resize();
		setTimeout(function () {
			ctrl.$items.unloading();
			$view.unloading();
		}, 150);
	},

	chatAssigned: function (data) {
		console.log("chatAssigned");
		var ctrl = this, $view = ctrl.$view;
		var $chat = $("#divChat");
		if (!$chat.length) return;
		var conversationID = $chat.attr("conversationid");
		if (data.conversationID != conversationID) return;
		ctrl.chat_setInfo(data);
	},

	finishNSolve: function(){
		console.log("finishNSolve");
		var ctrl = this, $view = ctrl.$view;
        
		$view.loading();
		socketOmnichannel._emit('getConversation', { 
		    conversationID: ctrl.conversationSelected.conversationID, resolveTicket: true });		
	},

	getConversation_resolveTicket: function(data){
		console.log("getConversation_resolveTicket");
		var ctrl = this, $view = ctrl.$view;
        
		// Copiar conversación en la descripción
		var conversation = ctrl.conversationSelected;
		var idUser_client = conversation.idUser_client;
		var clientName = conversation.clientName;
		var description = ctrl.getConversation_HTML({ messages: data.messages, 
			clientName: clientName, idUser_client: idUser_client });
		
        var idTicket = +ctrl.$conversation.attr("ticket").match(/[0-9]+/);
        var _ctrl = getController("TicketUnsolved_Controller"); 
		_ctrl.load({
			idTicket: idTicket,
			isFromOmnichannel: true,
			resolveDescription: description,
			afterFn: function(){
				$view.unloading();
				//_$("tabpanel_TicketUnsolved").setActiveTab(2);
			}
		});
	}
}

// notificacion({ icon: "https://powerstreet.openser.com/content/images/LOGOPower_Street.png", title: "Tiene un nuevo mensaje", body: "Ayuda por favor" })