## Digital Bitbox QR app

This is a Cordova application for Digital Bitbox QR-code verification. Use this app to verify you are signing the correct transaction. This avoids handcrafted man-in-the-middle attacks on compromised computers.

The app also functions as a general purpose barcode scanner. It uses the wildabeast BarcodeScanner plugin.


## Installation

From app stores at a later date.


## Installation from source

Requires:
  1. `node.js` and `npm` from https://nodejs.org/
  2. `cordova command line interface` install using npm `sudo npm install -g cordova` (OSX and Linux). Further instructions are at https://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html
  3. `Browserify` install using npm `sudo npm install -g browserify`
  4. For Android devices: `Android SDK` from https://developer.android.com/sdk/index.html
  5. For iOS devices: `Xcode` from https://developer.apple.com/xcode/

Command line build and install:

  - `git clone https://github.com/digitalbitbox/QR_app.git`
  - `cordova create digitalbitboxQR --copy-from=./QR_code/` 
  - `cd digitalbitboxQR`
  - `cordova platform add android`  
  - `cordova plugins add https://github.com/wildabeast/BarcodeScanner`
  - `browserify www/js/main.js -o www/js/app.js`
  - `cordova build android`

To install on your phone, connect your phone to your computer and run  `cordova run android`. Developer permissions are needed (https://developer.android.com/tools/device.html).

Replace `android` with `ios` for iPhones.

