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

var infoTextDiv;
var pairStrengthDiv;
var keyFile = null;
var key;
var ws = null;
var wsPollState;
var wsPollInterval = 500; // msec
var blinkcode = [];

var pairIcon,
    pairDialog,
    pwDialog,
    pwText,
    clearButton,
    settingsIcon,
    optionButtons,
    scanButton; 


const PORT = 25698;


// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
    document.querySelector("#scanButton").addEventListener("touchstart", startScan, false);
	document.querySelector("#clearButton").addEventListener("touchstart", clearResults, false);
	
    document.querySelector("#cancelButton").addEventListener("touchstart", cancel, false);
    document.querySelector("#changepwButton").addEventListener("touchstart", setKey, false);
    document.querySelector("#submitpwButton").addEventListener("touchstart", saveKey, false);
    document.querySelector("#forgetpwButton").addEventListener("touchstart", forgetKey, false);
    document.querySelector("#settingsIcon").addEventListener("touchstart", displaySettings, false);
    document.querySelector("#showScanButton").addEventListener("touchstart", showScanButton, false);
    document.querySelector("#pairButton").addEventListener("touchstart", pairPc, false);
    
    document.querySelector("#blinkDelButton").addEventListener("touchstart", blinkDel, false);
    document.querySelector("#blink1Button").addEventListener("touchstart", blinkPress1, false);
    document.querySelector("#blink2Button").addEventListener("touchstart", blinkPress2, false);
    document.querySelector("#blink3Button").addEventListener("touchstart", blinkPress3, false);
    document.querySelector("#blink4Button").addEventListener("touchstart", blinkPress4, false);
    
    pwText = document.getElementById("pwText");
    pwDialog = document.getElementById("pwDialog");
	pairStrengthDiv = document.querySelector("#pairStrength");
    pairIcon = document.getElementById("pairIcon");
    pairDialog = document.getElementById("pairDialog");
	infoTextDiv = document.querySelector("#infoText");
    clearButton = document.getElementById("clearButton");
    settingsIcon = document.getElementById("settingsIcon");
    optionButtons = document.getElementById("optionButtons");
    scanButton = document.getElementById("scanButton");

    openFile();
    wsPoll();
}


// ----------------------------------------------------------------------------
// Websockets
//

function wsPoll() {
    wsPollState = setInterval(wsFind, wsPollInterval);
}

function wsStart(addr, name) {
    if(!ws || ws.readyState == ws.CLOSED) {
        console.log('WebSocket found at ', addr);
        
        ws = new WebSocket(addr);
    
        ws.onopen = function () {
            console.log('WebSocket openned');
            wsSend('Hello dbb app!');
            clearInterval(wsPollState);
            pairIcon.style.visibility = "visible";
        };

        ws.onmessage = function (event) {
            console.log('WebSocket received: ', event.data);
            parseData(event.data);
        };

        ws.onerror = function () {
            console.log('WebSocket error!');
        };

        ws.onclose = function (event) {
            console.log('WebSocket closed ', event.code);
            pairIcon.style.visibility = "hidden";
            wsPoll();
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
    ZeroConf.watch("_dbb._tcp.local.", wsFindSuccess);
}

function wsFindSuccess(obj) {
    var addr = 'ws://' + obj.service.addresses[0] + ':' + obj.service.port;
    //var addr = 'ws://' + obj.service.server + ':' + obj.service.port;
    var name = obj.service.name;
    wsStart(addr, name);
    //console.log(obj.service);
}

//function mdnsAdvertise() {
    //ZeroConf.register("_http._tcp.local.", "DBBapp", PORT, "name=DBBapp_text");
//}


// ----------------------------------------------------------------------------
// General UI
//

function showInfoDialog() {
    hideOptionButtons();
    pwDialog.style.display = "none";
    clearButton.style.display = "inline";
}


function showPairDialog() {
    hideOptionButtons();
    settingsIcon.style.visibility = "hidden";
    pairDialog.style.display = "block";
    infoTextDiv.innerHTML = "Number of LED blinks:";
    blinkcode = [];
}


function hidePairDialog() {
    settingsIcon.style.visibility = "visible";
    pairDialog.style.display = "none";
    infoTextDiv.innerHTML = "";
    blinkcode = [];
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


function clearResults() 
{
    infoTextDiv.innerHTML = "";
    clearButton.style.display = "none" ;
    scanButton.style.display = "none";
}


// ----------------------------------------------------------------------------
// ECDH pairing UI
//
function blinkCodeStrength() {
    if (blinkcode.length == 0) {
        pairStrengthDiv.innerHTML = "";
    } else if (blinkcode.length < 4) {
        pairStrengthDiv.innerHTML = "Low strength";
        pairStrengthDiv.style.color = "#C00";
    } else if (blinkcode.length < 6) {
        pairStrengthDiv.innerHTML = "Medium strength";
        pairStrengthDiv.style.color = "#880";
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
    console.log('button press: ' + blinkcode);
}

function blinkDel() {
    if (blinkcode.length == 0) {
        cancel();
    } else {
        blinkcode.pop();
        if (blinkcode.length == 0) {
            infoTextDiv.innerHTML = "Number of LED blinks:";
        } else {
            infoTextDiv.innerHTML = '<b>' + Array(blinkcode.length + 1).join(" * ") + '</b>';
        }
        console.log('button press: ' + blinkcode);
    }
    blinkCodeStrength();
}

function pairPc() {
    hideOptionButtons();
    showPairDialog();
}


// ----------------------------------------------------------------------------
// Password UI
// 

function setKey() {
    infoTextDiv.innerHTML = "";
    showPasswordDialog();
}


function forgetKey() {
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
           

function cancel() {
    hidePasswordDialog();
    hidePairDialog();
    showInfoDialog();
    clearResults();
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
    }
    catch(err) {
        infoTextDiv.innerHTML = err.message;
        console.log(err.message);
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
            infoTextDiv.innerHTML = prettyprint(aes_cbc_b64_decrypt(result.text));
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


function prettyprint(res)
{
    // If JSON string, pretty print result
    var pprnt;
    var s;
    try {
        pprnt = JSON.parse(res);
           
        // If crypto-currency 'ouputs', cleanly print result
        if (typeof pprnt.verify_output == "object") {
            var pptmp = "Sending:\n\n";
            for (var i = 0; i < pprnt.verify_output.length; i++) {
                s = new Buffer(pprnt.verify_output[i].script, "hex");
                s = new Script(s);
                s = s.toAddress("livenet").toString();
                pptmp += pprnt.verify_output[i].value / 100000000 + " BTC\n" + s + "\n\n";
            }
            if (typeof pprnt.pin == "string") {
                pptmp += "\nLock code:  " + pprnt.pin;
            }
            pprnt = pptmp ;
        }
        else {
            pprnt = JSON.stringify(pprnt, undefined, 4);
        }
        
        pprnt = "<pre>" + pprnt + "</pre>";
    }
    catch(err) {
        console.log(err);
        pprnt = res;
    }

    if (pprnt == "") {
        pprnt = "--";
    }
    
    return pprnt;
}


function parseData(data)
{
    var res;
    try {
        res = JSON.parse(data);
           
        if (typeof res.ecdh == "string") {
            if (res.ecdh == "stop") {
                hidePairDialog();
                infoTextDiv.innerHTML = "Successfully paired.";
                clearButton.style.display = "inline";
            } else {
                showPairDialog();
            }
        } 
        else {
            //infoTextDiv.innerHTML = prettyprint(aes_cbc_b64_decrypt(data));
            infoTextDiv.innerHTML = prettyprint(data);
            clearButton.style.display = "inline";
            console.log('Could not parse data.');
        }
    }
    catch(err) {
        console.log(err);
        res = data;
    }

    return res;
}



/*
// ECDH example 
var alice = Crypto.createECDH('secp256k1');
var bob = Crypto.createECDH('secp256k1');

alice.generateKeys();
bob.generateKeys();

var alice_secret = alice.computeSecret(bob.getPublicKey(), null, 'hex');
var bob_secret = bob.computeSecret(alice.getPublicKey(), null, 'hex');

// alice_secret and bob_secret should be the same 
alice_pubkey = alice.getPublicKey('hex','compressed'); // 33 bytes
console.log(alice_pubkey);
console.log(alice_pubkey.length);
console.log(alice_secret == bob_secret);
*/




