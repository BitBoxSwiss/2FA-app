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

var ws = null,
    wsPollInterval = 1000; // msec

var pairIcon,
    pairDialog,
    pwDialog,
    pwText,
    clearButton,
    pairBeginButton,
    pairCancelButton,
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

const PORT = 25698;


// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
	document.querySelector("#clearButton").addEventListener("touchstart", clearResults, false);
	
    document.querySelector("#cancelButton").addEventListener("touchstart", cancel, false);
    document.querySelector("#changepwButton").addEventListener("touchstart", setKey, false);
    document.querySelector("#submitpwButton").addEventListener("touchstart", saveKey, false);
    document.querySelector("#forgetpwButton").addEventListener("touchstart", forgetKey, false);
    document.querySelector("#settingsIcon").addEventListener("touchstart", displaySettings, false);
    document.querySelector("#pairOptionButton").addEventListener("touchstart", pairEnter, false);
    document.querySelector("#pairBeginButton").addEventListener("touchstart", pairPc, false);
    document.querySelector("#pairCancelButton").addEventListener("touchstart", cancel, false);
    document.querySelector("#showScanButton").addEventListener("touchstart", startScan, false);
    //document.querySelector("#showScanButton").addEventListener("touchstart", showScanButton, false);
    //document.querySelector("#scanButton").addEventListener("touchstart", startScan, false);
    
    
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
    pairBeginButton = document.getElementById("pairBeginButton");
    pairCancelButton = document.getElementById("pairCancelButton");
    settingsIcon = document.getElementById("settingsIcon");
    optionButtons = document.getElementById("optionButtons");
    scanButton = document.getElementById("scanButton");

    openFile();
    setInterval(wsFind, wsPollInterval);
}


// ----------------------------------------------------------------------------
// Websockets
//

function wsStart(addr, name) {
    
    if(!ws || ws.readyState == ws.CLOSED) {
        console.log('WebSocket found at ', addr);
        
        ws = new WebSocket(addr);
    
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
    ZeroConf.watch("_dbb._tcp.local.", wsFound);
}

function wsFound(obj) {
    var addr = 'ws://' + obj.service.addresses[0] + ':' + obj.service.port;
    //var addr = 'ws://' + obj.service.server + ':' + obj.service.port;
    var name = obj.service.name;
    wsStart(addr, name);
}

//function mdnsAdvertise() {
    //ZeroConf.register("_http._tcp.local.", "DBBapp", PORT, "name=DBBapp_text");
//}


// ----------------------------------------------------------------------------
// General UI
//

function showInfoDialog() {
    hideOptionButtons();
    hidePairDialog();
    pwDialog.style.display = "none";
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


function pairEnter() {
    if(ws) {
        if(ws.readyState == ws.OPEN) {
            hideOptionButtons();
            clearButton.style.display = "none" ;
            settingsIcon.style.visibility = "hidden";
            pairBeginButton.style.display = "inline";
            pairCancelButton.style.display = "inline";
            infoTextDiv.innerHTML = 'Your Digital Bitbox will begin to blink.<br>Count the number of blinks in each set.<br>Then enter the number here.<br>Breifly tap the touch button on the Digital Bitbox to end.';
            return; 
        }
    }
    infoTextDiv.innerHTML = 'Open your Digital Bitbox PC app before pairing.';
    showInfoDialog();
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
    infoTextDiv.innerHTML = 'Open your Digital Bitbox PC app before pairing.';
    showInfoDialog();
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
        
        console.log('aes dbg key: ', key);
        
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
            parse = aes_cbc_b64_decrypt(ciphertext);
       
            if (parse === ciphertext) {
                parse = 'Could not parse:<br><br>' + JSON.stringify(parse, undefined, 4);
            }
            //if (parse.slice(0,4).localeCompare('xpub') == 0) {
                //var xpub = new Bitcore.HDPublicKey(parse); 
                //var addr = new Bitcore.Address(xpub.publicKey, "livenet"); // get ripemd not supported err after broswerify'ing
                //parse = addr.toString();
            //}
        
        }
        else {
            parse = 'Could not parse:<br><br>' + JSON.stringify(parse, undefined, 4);
            console.log('Could not parse data.');
        }
    
    }
    catch(err) {
        console.log(err);
        parse = data;
    }

    if (parse == "") {
        parse = "--";
    }

    return parse;
}

   

