console.log("overrides");Ext.language={};var lang={};Ext.override(Ext.field.Text,{validate:function(){if(this.validation==null||this.validation===true){this.removeCls("error")}else{this.addCls("error")}return this},listeners:{painted:function(a){var b=a.component;if(b._inputCls){a.down(".x-before-el").addCls(b._inputCls)}if(b.intNumbers||b.floatNumbers){$(a.down("input").dom).attr("type","number"),$(a.down("input").dom).keydown(function(d){var c=[8,9,27,13];if(b.floatNumbers){c.push(46,110,190)}if($.inArray(d.keyCode,c)!==-1||(d.keyCode===65&&(d.ctrlKey===true||d.metaKey===true))||(d.keyCode>=35&&d.keyCode<=40)){if(d.keyCode.matchAny([46,110,190])&&this.value.split(".").length>=2){d.preventDefault()}return}if((d.shiftKey||(d.keyCode<48||d.keyCode>57))&&(d.keyCode<96||d.keyCode>105)){d.preventDefault()}})}},focus:function(a,f,c){var h=$(a.el.dom),g=h.parents(".popup"),b,d=0;if(g.length){b=g.find(".popup-inner");d=h.offset().top+50}else{b=h.parents(".x-scroller:first");d=h[0].offsetTop}return;setTimeout(function(){b.scrollTop(d)},0);setTimeout(function(){b.scrollTop(d)},200);setTimeout(function(){b.scrollTop(d)},400);setTimeout(function(){b.scrollTop(d)},800)}}});Ext.override(Ext.field.Number,{listeners:{focus:function(a,d,c){var b=$(a.el.dom).parents(".x-scroller:first");setTimeout(function(){b.scrollTop(a.element.dom.offsetTop)},400);setTimeout(function(){b.scrollTop(a.element.dom.offsetTop)},800)}}});Ext.override(Ext.form.Panel,{_down:function(a){if(this.el.down(a)){return this.el.down(a).component}},$down:function(a){if(this.el.down(a)){return $(this.el.down(a).dom)}}});Ext.override(Ext.Container,{_down:function(a){if(this.el.down(a)){return this.el.down(a).component}},$down:function(a){if(this.el.down(a)){return $(this.el.down(a).dom)}},mask:function(a){this.setMasked(a||true)},unmask:function(){this.setMasked(false)}});Ext.override(Ext.app.Application,{getController:function(b,a){var k=this,d=k.controllers,h,f,g,e,j,l;f=d.get(b);if(!f){l=d.items;for(e=0,g=l.length;e<g;++e){j=l[e];if(typeof j.getModuleClassName=="function"){h=j.getModuleClassName()}if(h&&h===b){f=j;break}}}if(!f&&!a){h=k.getModuleClassName(b,"controller");f=Ext.create(h,{application:k,moduleClassName:h});d.add(f);if(k._initialized){if(typeof f.doInit=="function"){f.doInit(k)}}}return f}});Ext.override(Ext.Label,{toggle:function(){this.isVisible()?this.hide():this.show()}});