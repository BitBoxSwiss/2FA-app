exports.touchStart = function(e)
{
    e.style.color = '#eee';
    e.style.backgroundColor = '#555';
}

exports.touchEnd = function(e)
{
    // match with index.css
    e.style.color = '#000';
    e.style.backgroundColor = '#fff';
}

exports.fade = function(element) {
    var op = 1;  // opaque
    var timer = setInterval(function () {
        if (op <= 0.01){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ')';
        op -= 0.05;
    }, 20);
}

exports.initDialogs = function(ui) {
    let dialog = {};
    // Create user interface object
    for (var u in ui) {
      var id = u.replace(/([A-Z])/g, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + u;
      }
      ui[u] = element;

      if (u.includes('Dialog'))
          dialog[u.replace('Dialog', '')] = element;
    }
    return dialog;
}

exports.displayDialog = function(D, dialogs) {
    for (var d in dialogs)
        dialogs[d].style.display = "none";
    if (D)
        D.style.display = "block";
}

exports.registerTouch = function(element, f) {
    var fWrapped = function(evt) { evt.preventDefault(); f(); };
    element.addEventListener("touchend", fWrapped, false);
    // click event for debugging in the browser.
    element.addEventListener("click", fWrapped, false);
}

