// mkdir websocket && cd websocket
// [copy this js file to `client.js`]
// npm install ws
// npm install mdns
// node client.js



// -------------------------------------------------------
var WebSocket = require('ws');
var ws = null;

function wsStart(addr, name) {
    if(!ws) {

        ws = new WebSocket(addr);
        
        ws.onopen = function () {
            wsSend('Hello dbb app!');
            console.log('WebSocket openned paired to:<br>' + name);
        };

        ws.onmessage = function (event) {
            console.log('WebSocket received: ', event.data);
        };

        ws.onerror = function () {
            console.log('WebSocket error!');
        };

        ws.onclose = function (event) {
            console.log('WebSocket closed ', event.code);
            ws = null;
        };
    }
};

function wsStop(message){
    if(ws) {
        ws.close();
    }
}

function wsSend(message){
    if(ws) {
        ws.send(message);
    }
}

// -------------------------------------------------------
var mdns = require('mdns');
var browser = mdns.createBrowser(mdns.tcp('dbb'));

browser.on('serviceUp', function(service) {
    //console.log("service up: ", service);
    console.log("service up");
    var addr = 'ws://' + service.host + ':' + service.port;
    var name = service.name;
    wsStart(addr, name);
});

browser.on('serviceDown', function(service) {
    console.log("service down: ", service);
});

browser.start();


