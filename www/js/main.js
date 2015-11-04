/*
 
 The MIT License (MIT)

 Copyright (c) 2015 Douglas J. Bakkum

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

var resultDiv;
var keyFile = null;
var key;

document.addEventListener("deviceready", init, false);

function init()
{
    document.querySelector("#scanButton").addEventListener("touchstart", startScan, false);
	document.querySelector("#clearButton").addEventListener("touchstart", clearResults, false);
	
    document.querySelector("#cancelpwButton").addEventListener("touchstart", cancel, false);
    document.querySelector("#changepwButton").addEventListener("touchstart", setKey, false);
    document.querySelector("#submitpwButton").addEventListener("touchstart", saveKey, false);
    document.querySelector("#forgetpwButton").addEventListener("touchstart", forgetKey, false);
    document.querySelector("#settingsIcon").addEventListener("touchstart", displaySettings, false);
    
	resultDiv = document.querySelector("#scanResults");
    
    openFile();
}


function showScanDialog() {
    document.getElementById("scanDialog").style.visibility = "visible";
    document.getElementById("clearButton").style.display = "inline";
}
 

function hideScanDialog() {
    document.getElementById("scanDialog").style.visibility = "hidden";
    document.getElementById("clearButton").style.display = "none";
}


function showPasswordDialog() {
    hideOptionButtons();
    document.getElementById("settingsIcon").style.visibility = "hidden";
    document.getElementById("pwDialog").style.visibility = "visible";
    //document.getElementById("pwText").focus();
}


function hidePasswordDialog() {
    document.getElementById("pwDialog").style.visibility = "hidden";
    document.getElementById("settingsIcon").style.visibility = "visible";
    document.getElementById("pwText").value = "";
}


function showOptionButtons() {
    document.getElementById("optionButtons").style.display = "inline";
}


function hideOptionButtons() {
    document.getElementById("optionButtons").style.display = "none";
}


function displaySettings() {
    if(document.getElementById("optionButtons").style.display == "inline") {
       hideOptionButtons();
    } else {
       showOptionButtons();
    }
}


function setKey() {
    hideScanDialog();
    resultDiv.innerHTML = "";
    showPasswordDialog();
}


function forgetKey() {
    key = "";
    writeKey();
    hideOptionButtons();
    showScanDialog();
    resultDiv.innerHTML = "Password erased";
}


function saveKey() {
    try {
        key = document.getElementById("pwText").value;
        
        writeKey();
        
        hidePasswordDialog();
        showScanDialog();
        resultDiv.innerHTML = "Password set";
    
    }
    catch(err) {
        resultDiv.innerHTML = err.message;
        console.log(err.message);
    }
}
           

function cancel() {
    hidePasswordDialog();
    showScanDialog();
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
        resultDiv.innerHTML = err.message;
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
        resultDiv.innerHTML = err.message;
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
        resultDiv.innerHTML = err.message;
        console.log(err.message);
    }
}



function startScan()
{
	try {
    cordova.plugins.barcodeScanner.scan(
		function (result)
        {
            resultDiv.innerHTML = prettyprint(aes_cbc_b64_decrypt(result.text));
            showScanDialog();
        }, 
		function (error) {
			console.log("Scanning failed: " + error);
		}
	)
    }
    catch(err) {
        resultDiv.innerHTML = err.message;
        console.log(err.message);
    }

}


function clearResults() 
{
    resultDiv.innerHTML = "";
    document.getElementById("clearButton").style.display = "none" ;
}


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
    // if JSON string, pretty print result
    var pprnt;
    var s;
    try {
        pprnt = JSON.parse(res);
           
        // if crypto-currency 'ouputs', cleanly print result
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
        } else {
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




