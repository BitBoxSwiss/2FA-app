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


//
//  Run
//

var resultDiv;

document.getElementById("clearButton").style.visibility = "hidden";
document.addEventListener("deviceready", init, false);

function init()
{
	document.querySelector("#scanButton").addEventListener("click", startScan, false);
	document.querySelector("#clearButton").addEventListener("click", clearResults, false);
	resultDiv = document.querySelector("#scanResults");
}


function startScan()
{
	cordova.plugins.barcodeScanner.scan(
		function (result)
        {
            resultDiv.innerHTML = prettyprint(aes_cbc_b64_decrypt(key, result.text));
            document.getElementById("scanResults").style.visibility = "visible";
            document.getElementById("clearButton").style.visibility = "visible";
        }, 
		function (error) {
			alert("Scanning failed: " + error);
		}
	);
}


function clearResults() 
{
    resultDiv.innerHTML = "";
    document.getElementById("clearButton").style.visibility = "hidden"; 
}



//
//  AES-256-CBC with base64 encoding
//

var Crypto = require("crypto");
var Bitcore = require("bitcore");
var Script = Bitcore.Script;

 
aes_cbc_b64_decrypt = function(key, ciphertext)
{
    var res;
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var decipher = Crypto.createDecipheriv("aes-256-cbc", key, iv);
        var dec = decipher.update(enc) + decipher.final();
        res = dec.toString("utf8");
    }
    catch(err) {
        console.log(err)
        res = ciphertext;
        //return err.message;
    }
    
    return res;
}


aes_cbc_b64_encrypt = function(key, plaintext)
{
    try {
        var iv = Crypto.pseudoRandomBytes(16);
        var cipher = Crypto.createCipheriv("aes-256-cbc", key, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    }
    catch(err) {
        console.log(err)
        return err.message;
    }
}


prettyprint = function(res)
{
    // if JSON string, pretty print result
    var pprnt;
    var s;
    try {
        pprnt = JSON.parse(res);
           
        // if crypto currency ouputs, clean print result
        if (typeof pprnt.outputs == "object") {
            var pptmp = "Sending:\n\n";
            for (var i = 0; i < pprnt.outputs.length; i++) {
                s = new Buffer(pprnt.outputs[i].script, 'hex');
                s = new Script(s);
                s = s.toAddress('livenet').toString();
                pptmp += pprnt.outputs[i].value / 100000000 + " BTC\n" + s + "\n\n";
            }
            pprnt = pptmp; 
        } else {
            pprnt = JSON.stringify(pprnt, undefined, 4);
        }
        
        pprnt = "<pre>" + pprnt + "</pre>";
    }
    catch(err) {
        console.log(err)
        pprnt = res;
    }

    if (pprnt == "") {
        pprnt = "--"
    }
    
    return pprnt;
}


//
//  Load key 
//            TODO user input password, hardcoded for now
//

var key = "0000";
key = Crypto.createHash("sha256").update(key).digest();
key = Crypto.createHash("sha256").update(key).digest();



