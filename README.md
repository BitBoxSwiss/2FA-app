## Digital Bitbox | Two factor authentication app


This mobile app works with the [Digital Bitbox](https://digitalbitbox.com) hardware wallet to provide the highest level of security.


## Installation

- [Google Play Store for Android](https://play.google.com/store/apps/details?id=com.digitalbitbox.tfa)
- App Store for iOS at a later date


## Installation from source

Requires:
  1. [**Node.js** and **npm**](https://nodejs.org/) (tested with Node.js v4.2.2 and npm v2.14.7)
  2. **Cordova command line interface** installed using npm `sudo npm install -g cordova` (OSX and Linux).
  3. For Android devices: [**Android SDK**](https://developer.android.com/sdk/)
  4. For iOS devices: [**Xcode**](https://developer.apple.com/xcode/)

Command line build and install:

```
git clone https://github.com/digitalbitbox/2FA-app.git 
cordova create digitalbitbox2FA com.digitalbitbox.tfa "DigitalBitbox2FA" --copy-from=./2FA-app/
cd digitalbitbox2FA
cordova platform add android 
cordova plugin add https://github.com/wildabeast/BarcodeScanner
cordova plugin add cordova-plugin-file
cordova plugin add https://github.com/digitalbitbox/ZeroConf
cordova plugin add cordova-plugin-crosswalk-webview  #  supports websockets
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-whitelist
npm install bitcore-lib ripemd160 bs58check buffer-reverse
browserify www/js/main.js -o www/js/app.js
cordova build android
```

To install on an Android phone, connect it to your computer and type  `cordova run android`. [Developer permissions](https://developer.android.com/tools/device.html) are required. 

To install on an iPhone, replace `android` with `ios` and open the file `platforms/ios/Digital Bitbox QR.xcodeproj` in Xcode. An iOS Developer Program membership, or a jailbroke phone, is required.




