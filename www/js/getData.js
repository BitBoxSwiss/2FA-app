'use strict';

onmessage = function(get) {
    var req = new XMLHttpRequest();
    req.open("GET", get.data.url, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200)
                postMessage({ 'response': req.responseText, 'meta': get.data.meta });
            else
                postMessage(null);
        }
    }
    req.send();
}
