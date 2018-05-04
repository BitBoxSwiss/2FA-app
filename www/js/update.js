require("./global");

// Updates

exports.checkUpdatePost = function(success_callback, failure_callback) {
    var rn = Math.floor((Math.random() * 100000) + 1);
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                success_callback(JSON.parse(req.responseText))
            } else {
                failure_callback()
            }
        }
    }
    req.open("POST", UPDATE_SERVER.url + '?rn=' + rn, true);
    req.setRequestHeader('Content-type','application/text; charset=utf-8');
    req.send(JSON.stringify({version: VERSION, target: 'smartverification', key: UPDATE_SERVER.key}));
}

exports.followUrl = function(url, callback) {
    console.log('Following Url', url);
    cordova.InAppBrowser.open(url, '_blank', 'location=yes');
    callback();
}


