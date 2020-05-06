var rutabase = "https://empresarial.openser.com/public/omnichannel";

function init() {
    loadScript(rutabase+ '/js/omnichannel.js');
    loadCss(rutabase+ '/css/omnichannel.css');

    console.log("Se inicio el script del wdiget del omnichanel");
    switch (getLenguaje()) {
        case 1: loadScript(rutabase + '/js/language-es.js');
            break;
        case 2: loadScript(rutabase + '/js/language-en.js');
            break;
    };
}

function validDate() {
    if (Date.now() == Date.now())
        return true;
}

function loadScript(route) {
    var oc_JS = document.createElement('script');
    oc_JS.type = 'text/javascript';
    oc_JS.src = route + '?t=' + Date.now();
    (document.body ? document.body : document.getElementsByTagName('head')[0]).appendChild(oc_JS);
}
function loadCss(route) {
    var oc_CSS = document.createElement('link');
    oc_CSS.type = 'text/css';
    oc_CSS.rel = 'stylesheet';
    oc_CSS.href = route + '?t=' + Date.now();
    (document.body ? document.body : document.getElementsByTagName('head')[0]).appendChild(oc_CSS);
}

function getLenguaje() {
    if (navigator.language.indexOf("es") > 0 )
        return 1
    else
        return 2

}
if (validDate())
    init();
else console.log("ERROR LOAD OMINCHANNEL WIDGET");