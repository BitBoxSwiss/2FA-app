'use strict';

onmessage = function(api) {
    var req = new XMLHttpRequest();
    req.open("GET", api.data, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                postMessage([req.responseText, req.responseURL]);
            }
        }
    }
    req.send();
}
