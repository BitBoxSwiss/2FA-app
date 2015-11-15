// mkdir websocket && cd websocket
// [copy this js file to `server.js`]
// npm install ws
// npm install mdns
// node server.js

const PORT=25698;

// -------------------------------------------------------
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: PORT});

wss.on('connection', function(ws) {
    ws.on('error', function() {
        console.log('error\n');
    });
    
    ws.on('close', function() {
        console.log('closed\n');
    });
    
    ws.on('message', function(message) {
        console.log('received: %s', message);
    });
    
    ws.send('Server connected');
});

wss.broadcast = function broadcast(data) {
    console.log('Broadcasting: ' + data);
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
};


// -------------------------------------------------------
var mdns = require('mdns');
var ad = mdns.createAdvertisement(mdns.tcp('dbb'), PORT);
ad.start();
console.log("mDNS advertised");






// -------------------------------------------------------
// -------------------------------------------------------
// WIP
// 

var wssSendQueue = null;
var wssSendData = "";

function wssSend(data) {
    if (wssSendQueue == null) {
        wssSendData = data;
        wssSendQueue = setInterval(wssBroadcast, 100);
    } else {
        setTimeout(function(data) { wssSend(data); }, 1000);
    }
}

function wssBroadcast() {
    //console.log('waiting for client to connect');
    if (wss.clients.length) {
        wss.broadcast(wssSendData);
        clearInterval(wssSendQueue); 
        wssSendQueue = null; 
    }
}


setTimeout(function() { 
    wssSend('{"ecdh":"kdjaflajlfdk"}');

    setTimeout(function() {
        wssSend('{"ecdh":"stop"}'); 
    
        setTimeout(function() { 
            wssSend('{"message":"stop"}'); 
        
        }, 2000);
    }, 2000);
}, 1000);

