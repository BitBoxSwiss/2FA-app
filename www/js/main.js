/*
 
 The MIT License (MIT)

 Copyright (c) 2015 Douglas J. Bakkum, Shift Devices AG

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the "Software"),
 to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 and/or sell copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

*/


var Crypto = require("crypto");
var Bitcore = require("bitcore");
var Script = Bitcore.Script;
var Ripemd160 = require('ripemd160');
var Base58Check = require('bs58check')

const PORT=25698;
const COINNET='TESTNET'; // TESTNET or MAINNET

var ws = null,
    wsIp = null,
    wsAddr = '',
    wsName = '',
    wsPollInterval = 1000; // msec

var pairIcon,
    pairDialog,
    pwDialog,
    ipDialog,
    pwText,
    ipText,
    clearButton,
    pairBeginButton,
    pairCancelButton,
    pairManualButton,
    settingsIcon,
    optionButtons,
    scanButton, 
    infoTextDiv,
    pairStrengthDiv;

var ecdh,
    ecdh_secret,
    ecdh_pubkey, 
    blinkcode = [],
    keyFile = null,
    key;

ecdh = Crypto.createECDH('secp256k1');



// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
	document.querySelector("#clearButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#cancelButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#cancelIpButton").addEventListener("touchstart", cancelClear, false);
    //document.querySelector("#changepwButton").addEventListener("touchstart", setKey, false);
    document.querySelector("#submitpwButton").addEventListener("touchstart", saveKey, false);
    document.querySelector("#submitIpButton").addEventListener("touchstart", setIP, false);
    document.querySelector("#forgetpwButton").addEventListener("touchstart", forget, false);
    document.querySelector("#settingsIcon").addEventListener("touchstart", displaySettings, false);
    document.querySelector("#pairOptionButton").addEventListener("touchstart", pairEnter, false);
    document.querySelector("#pairBeginButton").addEventListener("touchstart", pairPc, false);
    document.querySelector("#pairCancelButton").addEventListener("touchstart", cancelClear, false);
    document.querySelector("#pairManualButton").addEventListener("touchstart", pairManual, false);
    document.querySelector("#pairIcon").addEventListener("touchstart", pairStatus, false);
    document.querySelector("#showScanButton").addEventListener("touchstart", startScan, false);
    //document.querySelector("#showScanButton").addEventListener("touchstart", showScanButton, false);
    //document.querySelector("#scanButton").addEventListener("touchstart", startScan, false);
    
    
    document.querySelector("#blinkDelButton").addEventListener("touchstart", blinkDel, false);
    document.querySelector("#blink1Button").addEventListener("touchstart", blinkPress1, false);
    document.querySelector("#blink2Button").addEventListener("touchstart", blinkPress2, false);
    document.querySelector("#blink3Button").addEventListener("touchstart", blinkPress3, false);
    document.querySelector("#blink4Button").addEventListener("touchstart", blinkPress4, false);
    
    pwText = document.getElementById("pwText");
    ipText = document.getElementById("ipText");
    pwDialog = document.getElementById("pwDialog");
    ipDialog = document.getElementById("ipDialog");
	pairStrengthDiv = document.querySelector("#pairStrength");
    pairIcon = document.getElementById("pairIcon");
    pairDialog = document.getElementById("pairDialog");
	infoTextDiv = document.querySelector("#infoText");
    clearButton = document.getElementById("clearButton");
    pairBeginButton = document.getElementById("pairBeginButton");
    pairCancelButton = document.getElementById("pairCancelButton");
    pairManualButton = document.getElementById("pairManualButton");
    settingsIcon = document.getElementById("settingsIcon");
    optionButtons = document.getElementById("optionButtons");
    scanButton = document.getElementById("scanButton");

    openFile();
    setInterval(wsFind, wsPollInterval);
}


// ----------------------------------------------------------------------------
// Network status
//

function checkConnection() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';

    console.log('Connection type: ' + states[networkState]);
}


// ----------------------------------------------------------------------------
// Websockets
//

function wsStart() {
    if(!ws || ws.readyState == ws.CLOSED) {
        console.log('WebSocket found at ', wsAddr);
        
        ws = new WebSocket(wsAddr);
    
        ws.onopen = function () {
            pairIcon.style.visibility = "visible";
            console.log('WebSocket openned');
            wsSend('{"tfa": "Hello dbb app!"}');
        };

        ws.onmessage = function (event) {
            console.log('WebSocket received: ', event.data);
            infoTextDiv.innerHTML = parseData(event.data);
            showInfoDialog();
        };

        ws.onerror = function () {
            console.log('WebSocket error!');
        };

        ws.onclose = function (event) {
            console.log('WebSocket closed ', event.code);
            pairIcon.style.visibility = "hidden";
            wsAddr = '';
            wsName = '';
        };
    }
};

function wsSend(message) {
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            ws.send(message);
        }
    }
}



function wsFind() {
    if (wsIp) {
        wsAddr = 'ws://' + wsIp + ':' + PORT;
        wsName = 'Manually entered';
        wsStart();
    } else if (navigator.connection.type === Connection.WIFI) {
        ZeroConf.watch("_dbb._tcp.local.", wsFound); // does not reconnect if turn off/on wifi
    } else {
        checkConnection();
    }
}

function wsFound(obj) {
    wsAddr = 'ws://' + obj.service.addresses[0] + ':' + obj.service.port;
    //wsAddr = 'ws://' + obj.service.server + ':' + obj.service.port;
    wsName = obj.service.name;
    wsStart();
}

//function mdnsAdvertise() {
    //const PORT = 25698;
    //ZeroConf.register("_http._tcp.local.", "DBBapp", PORT, "name=DBBapp_text");
//}


// ----------------------------------------------------------------------------
// General UI
//

function showInfoDialog() {
    hideOptionButtons();
    hidePairDialog();
    pwDialog.style.display = "none";
    ipDialog.style.display = "none";
    clearButton.style.display = "inline";
}


function showPairDialog() {
    pairDialog.style.display = "block";
    infoTextDiv.innerHTML = "Number of LED blinks:";
    blinkcode = [];
}


function hidePairDialog() {
    settingsIcon.style.visibility = "visible";
    pairBeginButton.style.display = "none";
    pairCancelButton.style.display = "none";
    pairDialog.style.display = "none";
    pairStrengthDiv.innerHTML = "";
    blinkcode = [];
}


function showNoWSDialog() {
    infoTextDiv.innerHTML = 'Cannot find the Digital Bitbox PC app.';
    pairManualButton.style.display = "inline";
    clearButton.style.display = "inline";
    settingsIcon.style.visibility = "hidden";
    hideOptionButtons();
}


function showIpDialog() {
    cancelClear();
    infoTextDiv.innerHTML = "Enter the IP address of your PC";
    hideOptionButtons();
    settingsIcon.style.visibility = "hidden";
    ipDialog.style.display = "block";
}


function hideIpDialog() {
    pairManualButton.style.display = "none";
    settingsIcon.style.visibility = "visible";
    ipDialog.style.display = "none";
    ipText.value = "";
}


function showPasswordDialog() {
    hideOptionButtons();
    settingsIcon.style.visibility = "hidden";
    pwDialog.style.display = "block";
    //pwText.focus();
}


function hidePasswordDialog() {
    settingsIcon.style.visibility = "visible";
    pwDialog.style.display = "none";
    pwText.value = "";
}


function showOptionButtons() {
    optionButtons.style.display = "inline";
}


function hideOptionButtons() {
    optionButtons.style.display = "none";
}


function showScanButton() {
    hideOptionButtons();
    scanButton.style.display = "inline";
}


function displaySettings() {
    
    wsSend('Touched settings button');
    
    if(optionButtons.style.display == "inline") {
        hideOptionButtons();
    } else {
        showOptionButtons();
        scanButton.style.display = "none";
    }
}


// ----------------------------------------------------------------------------
// ECDH pairing UI
//

function blinkCodeStrength() {
    if (blinkcode.length == 0) {
        pairStrengthDiv.innerHTML = "";
    } else if (blinkcode.length < 3) {
        pairStrengthDiv.innerHTML = "Low strength";
        pairStrengthDiv.style.color = "#C00";
    } else if (blinkcode.length < 5) {
        pairStrengthDiv.innerHTML = "Medium strength";
        pairStrengthDiv.style.color = "#880";
    } else if (blinkcode.length > 6) {
        pairStrengthDiv.innerHTML = 'When ready to end:<br>Tap the touch button on the Digital Bitbox.</pre>';
        pairStrengthDiv.style.color = "#000";
    } else {
        pairStrengthDiv.innerHTML = "";
    }
}


function blinkPress1() { blinkPress(1); }
function blinkPress2() { blinkPress(2); }
function blinkPress3() { blinkPress(3); }
function blinkPress4() { blinkPress(4); }
function blinkPress(p) {
    blinkcode.push(p);
    infoTextDiv.innerHTML = '<b>' + Array(blinkcode.length + 1).join(" * ") + '</b>';
    blinkCodeStrength();
}


function blinkDel() {
    if (blinkcode.length == 0) {
        cancelClear();
    } else {
        blinkcode.pop();
        if (blinkcode.length == 0) {
            infoTextDiv.innerHTML = "Number of LED blinks:";
        } else {
            infoTextDiv.innerHTML = '<b>' + Array(blinkcode.length + 1).join(" * ") + '</b>';
        }
    }
    blinkCodeStrength();
}


function pairEnter() {
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            hideOptionButtons();
            clearButton.style.display = "none" ;
            settingsIcon.style.visibility = "hidden";
            pairBeginButton.style.display = "inline";
            pairCancelButton.style.display = "inline";
            infoTextDiv.innerHTML = 'Your Digital Bitbox will begin to blink.<br><br><pre>- Count the number of blinks in each set.\n- Enter those numbers here.\n- Tap the touch button on the Digital Bitbox to end.</pre>';
            return; 
        }
    }
    
    if (navigator.connection.type != Connection.WIFI) {
        infoTextDiv.innerHTML = 'A WiFi connection is needed for pairing.';
        showInfoDialog(); 
    } else {
        showNoWSDialog();
    }
}

function pairPc() {
    pairBeginButton.style.display = "none";
    pairCancelButton.style.display = "none";
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            ecdhPubkey();
            showPairDialog();
            return; 
        }
    }
    showNoWSDialog();
}

function pairManual() {
    showIpDialog();
}

function setIP() {
    wsIp = ipText.value;
    cancelClear();   
}

function pairStatus() {
    if(clearButton.style.display == "inline"){
        cancelClear();
    } else {
        infoTextDiv.innerHTML = 'Digital Bitbox PC app connect at:<br>' + wsAddr + '<br>' + wsName;
        showInfoDialog(); 
    }
}


// ----------------------------------------------------------------------------
// Password UI
// 

function setKey() {
    infoTextDiv.innerHTML = "";
    showPasswordDialog();
}


function forget() {
    wsIp = null;
    key = "";
    writeKey();
    hideOptionButtons();
    showInfoDialog();
    infoTextDiv.innerHTML = "Settings erased";
}


function saveKey() {
    try {
        key = pwText.value;
        
        writeKey();
        
        hidePasswordDialog();
        showInfoDialog();
        infoTextDiv.innerHTML = "Password set";
    
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}
           

function cancelClear() {
    hidePasswordDialog();
    hidePairDialog();
    hideIpDialog();
    showInfoDialog();
    infoTextDiv.innerHTML = "";
    clearButton.style.display = "none";
    scanButton.style.display = "none";
}


function openFile() {
	try {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
		    dir.getFile("keyfile.txt", {create:true}, function(file) {
			    keyFile = file;
		        readKey(); 
            })
	    })
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}


function readKey() {
    try {    
        keyFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                key = e.target.result;
            }
            reader.readAsText(file);
        })
        return key; 
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
        return null;
    }
}


function writeKey() {
	try {
        if(!keyFile) return;
        keyFile.createWriter(function(fileWriter) {
            //fileWriter.seek(fileWriter.length); // append
            var blob = new Blob([key], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }
}


// ----------------------------------------------------------------------------
// Scan UI
// 

function startScan()
{
	try {
    cordova.plugins.barcodeScanner.scan(
		function (result)
        {
            infoTextDiv.innerHTML = parseData(aes_cbc_b64_decrypt(result.text));
            showInfoDialog();
        }, 
		function (error) {
			console.log("Scanning failed: " + error);
		}
	)
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
    }

}


// ----------------------------------------------------------------------------
// Parsing JSON and crypto ops
// 

function aes_cbc_b64_decrypt(ciphertext)
{
    var res;
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var k    = new Buffer(key, "hex");
        var decipher = Crypto.createDecipheriv("aes-256-cbc", k, iv);
        var dec = decipher.update(enc) + decipher.final();
        res = dec.toString("utf8");
    }
    catch(err) {
        console.log(err);
        res = ciphertext;
        //return err.message;
    }
    
    return res;
}


function aes_cbc_b64_encrypt(plaintext)
{
    try {
        var iv = Crypto.pseudoRandomBytes(16);
        var k  = new Buffer(key, "hex");
        var cipher = Crypto.createCipheriv("aes-256-cbc", k, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    }
    catch(err) {
        console.log(err);
        //return err.message;
    }
}


function ecdhPubkey() {
    ecdh.generateKeys();
    var ecdh_pubkey = ecdh.getPublicKey('hex','compressed'); // 33 bytes
    var msg = '{"ecdh":"' + ecdh_pubkey + '"}';
    wsSend(msg);   
}    


function parseData(data)
{
    var parse;
    
    try {
        parse = JSON.parse(data);
                
        if (typeof parse.verify_output == "object") {
            // QR scan
            // If crypto-currency 'ouputs', cleanly print result
            var pptmp = "Sending:\n\n";
            for (var i = 0; i < parse.verify_output.length; i++) {
                var s;
                s = new Buffer(parse.verify_output[i].script, "hex");
                s = new Script(s);
                s = s.toAddress("livenet").toString();
                pptmp += parse.verify_output[i].value / 100000000 + " BTC\n" + s + "\n\n";
            }
            if (typeof parse.pin == "string") {
                pptmp += "\nLock code:  " + parse.pin;
            }
            parse = "<pre>" + pptmp + "</pre>";
        }
        else if (typeof parse.verifypass == "object") {
            // 2FA - PC pairing
            var ciphertext = parse.verifypass.ciphertext;
            var pubkey = parse.verifypass.ecdh;
            ecdh_secret = ecdh.computeSecret(pubkey, 'hex', 'hex');
            
            key = Crypto.createHash('sha256').update(new Buffer(ecdh_secret, 'hex')).digest('hex');
            key = Crypto.createHash('sha256').update(new Buffer(key, 'hex')).digest('hex');
            var k = new Buffer(key, "hex");
            for (var i = 0; i < blinkcode.length; i++) {
                k[i % 32] ^= blinkcode[i]; 
            }
            key = k.toString('hex');
            key = Crypto.createHash('sha256').update(new Buffer(key, 'ascii')).digest('hex');
            key = Crypto.createHash('sha256').update(new Buffer(key, 'hex')).digest('hex');

            writeKey();
            var message = aes_cbc_b64_decrypt(ciphertext);
            console.log(blinkcode);
            console.log('ecdh check message: ', message);
            
            if (message === 'Digital Bitbox 2FA')
                parse = "Successfully paired.";
            else 
                parse = "Pairing failed!";
        } 
        else if (typeof parse.echo == "string") {
            // Echo verification
            console.log('Echo');
            var ciphertext = parse.echo;
            plaintext = aes_cbc_b64_decrypt(ciphertext);
       
            if (plaintext === ciphertext) {
                parse = 'Could not parse:<br><br>' + JSON.stringify(plaintext, undefined, 4);
            }
            if (plaintext.slice(0,4).localeCompare('xpub') == 0) {
                // Recreate receiving address from xpub
                var xpub = parse.xpub;
                if (!(xpub === plaintext)) {
                    parse = "Error: Addresses do not match!";
                } else {
                    parse = Base58Check.decode(plaintext).slice(-33).toString('hex');
                    parse = '51' + '21' + parse + '51' + 'ae'; // 51 ... 51 = 1 of 1 multisig
                                                               // 21 = number of bytes to push for a compressed pubkey
                                                               // ae = op check multisig
                    parse = Crypto.createHash('sha256').update(new Buffer(parse, 'hex')).digest();
                    parse = Ripemd160(parse);
                    var header = 'Receiving address:\n\n';
                    if (COINNET === 'MAINNET') {
                        parse = Base58Check.encode(new Buffer('05' + parse.toString('hex'), 'hex'));
                    } else if (COINNET === 'TESTNET') {
                        parse = Base58Check.encode(new Buffer('c4' + parse.toString('hex'), 'hex'));
                    } else {
                        header = '';
                        parse = 'Error: Coin network not defined.';
                    }
                    parse = "<pre>" + header + parse + "\n\n</pre>";
                }
            }
        }
        else {
            parse = 'Could not parse:<br><br>' + JSON.stringify(parse, undefined, 4);
            console.log('Could not parse data.');
        }
    
    }
    catch(err) {
        console.log(err);
        parse = "Unknown error. Data received was:<br><br>" + data;
    }

    if (parse == "") {
        parse = "--";
    }

    return parse;
}

   

