//imports
import { displayError } from './errorHandling.js';
import getNetlifyFunctionUrl from './handleNetlifyAPI.js';
// Variables for encryption
let encryptionKey = null;

// Check if the encryption key exists
// Function to check if the encryption key exists
export function checkEncryptionKeyExists() {
    chrome.storage.sync.get(['encryptionKey'], data => {
      if (!data.encryptionKey) {
        generateNewEncryptionKey(); // Generate a new encryption key if it doesn't exist
      } else {
        loadEncryptionKey(); // Load the encryption key if it exists
      }
      setTimeout(checkEncryptionKeyExists, 5000); // Check again after 5 seconds
    });
  }
  
  // Function to load the encryption key
  function loadEncryptionKey() {
    chrome.storage.sync.get(['encryptionKey'], data => {
      if (data.encryptionKey) {
        encryptionKey = data.encryptionKey;
      } else {
        displayError('Error: Encryption key not found');
      }
    });
  }
//return the encrypted access token
  export async function GetencryptedAccessToken(accessToken, encryptionKey) {
    return encrypt(accessToken, encryptionKey);
  }

  import forge from 'node-forge';
import { Buffer } from 'buffer';

// Function to convert a string to a hexadecimal
function stringToHex(str) {
  let hex = '';
  for(let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return hex;
}

// Function to convert hexadecimal to a string
function hexToString(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// Encryption function
export function encrypt(data, keyIV) {
  // Split the keyIV string into the key and IV
  let rawKeyIV = Buffer.from(keyIV, 'base64');
  let key = rawKeyIV.slice(0, 16);
  let iv = rawKeyIV.slice(16);

  // Convert key and iv into a format usable by Forge
  key = forge.util.createBuffer(key.toString(), 'raw');
  iv = forge.util.createBuffer(iv.toString(), 'raw');

  let cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(JSON.stringify(data), 'utf8'));
  cipher.finish();
  let encrypted = cipher.output;
  let tag = cipher.mode.tag;

  // Convert to hex and return as an object
  return {
    data: stringToHex(encrypted.getBytes()),
    iv: stringToHex(iv.getBytes()),
    tag: stringToHex(tag.getBytes())
  };
}

// Decryption function
export function decrypt(encrypted, keyIV) {
  // Split the keyIV string into the key and IV
  let rawKeyIV = Buffer.from(keyIV, 'base64');
  let key = rawKeyIV.slice(0, 16);
  let iv = rawKeyIV.slice(16);

  // Convert key and iv into a format usable by Forge
  key = forge.util.createBuffer(key.toString(), 'raw');
  iv = forge.util.createBuffer(iv.toString(), 'raw');

  let decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({
    iv: iv,
    tag: hexToString(encrypted.tag)
  });
  decipher.update(forge.util.createBuffer(hexToString(encrypted.data), 'raw'));
  decipher.finish();

  return JSON.parse(decipher.output.toString('utf8'));
}

// Generate a new encryption key and store it
function generateNewEncryptionKey() {
  let key = forge.random.getBytesSync(16);
  let iv = forge.random.getBytesSync(16);
  let keyIV = Buffer.from(key + iv).toString('base64');

  // Save the key data to Chrome's sync storage
  chrome.storage.sync.set({ encryptionKey: keyIV }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving encryption key: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Encryption key saved successfully');
      // Load the new encryption key
      chrome.storage.sync.get(['encryptionKey'], result => {
        console.log('Encryption key loaded: ' + result.encryptionKey);
      });
    }
  });
}
async function getEncryptionKey() {
  //Get encryption key from Netlify api function
  return new Promise((resolve, reject) => {
      const url = getNetlifyFunctionUrl('getEncryptionKey');
      const headers = {
          'Content-Type': 'application/json'
      };
      fetch(url, { headers })
        .then(response => response.json())
        .then(data => {
              if (data.error) {
                  reject(new Error(data.message));
              }
              const encryptionKey = data.build_data.secret;
              resolve(encryptionKey);
          })
        .catch(error => reject(error));
  });
}


