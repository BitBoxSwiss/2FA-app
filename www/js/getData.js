'use strict';

onmessage = function(get) {
    var req = new XMLHttpRequest();
    req.open("GET", get.data, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                postMessage([req.responseText, req.responseURL]);
            }
        }
    }
    req.send();
}
