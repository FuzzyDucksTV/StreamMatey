//imports
import { displayError } from './errorHandling.js';

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
        // Convert the encryption key to a usable format
        window.crypto.subtle.importKey('jwk', data.encryptionKey, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
          .then(key => encryptionKey = key)
          .catch(err => displayError('Error loading encryption key: ' + err.message));
      } else {
        displayError('Error: Encryption key not found');
      }
    });
  }
//return the encrypted access token
  export async function GetencryptedAccessToken(accessToken, encryptionKey) {
    return encrypt(accessToken, encryptionKey);
  }

  // Function to generate a new encryption key
  function generateNewEncryptionKey() {
    window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
      .then(key => window.crypto.subtle.exportKey('jwk', key)) // Convert key to a storable format
      .then(keyData => {
          // Save the key data to Chrome's sync storage
          chrome.storage.sync.set({ encryptionKey: keyData }, () => {
            if (chrome.runtime.lastError) {
              displayError('Error saving encryption key: ' + chrome.runtime.lastError.message);
            } else {
              console.log('Encryption key saved successfully');
              loadEncryptionKey(); // Load the new encryption key
            }
          });
        })
        .catch(err => displayError('Error generating encryption key: ' + err.message));
    }
// Function to convert ArrayBuffer to Hexadecimal
function buf2hex(buffer) { 
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }
  
  // Encryption function
  export async function encrypt(data, jwk) {
    // Import the JWK back to a CryptoKey
    const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  
    let encoded = new TextEncoder().encode(JSON.stringify(data));
    let iv = window.crypto.getRandomValues(new Uint8Array(12));
  
    try {
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encoded
        );
       // Convert to Base64 and prepend IV for storage
       let encryptedStr = btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(encrypted)))));
       return btoa(unescape(encodeURIComponent(String.fromCharCode.apply(null, iv)))) + ',' + encryptedStr;
    } catch (err) {
        console.error(err);
        displayError('Error encrypting data: ' + err.message);
        throw err; // Propagate the error
    }
  }
  
  export async function decrypt(data, jwk) {
    // Import the JWK back to a CryptoKey
    const key = await window.crypto.subtle.importKey('jwk', jwk, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  
    let parts = data.split(',');
    let iv = new Uint8Array(decodeURIComponent(escape(atob(parts[0]))).split('').map(c => c.charCodeAt(0)));
    let encrypted = new Uint8Array(decodeURIComponent(escape(atob(parts[1]))).split('').map(c => c.charCodeAt(0)));
  
    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encrypted
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (err) {
        console.error(err);
        displayError('Error decrypting data: ' + err.message);
        throw err; // Propagate the error
    }
  }

  // Function to get the encryption key
  export function getEncryptionKey() {
    //get the encryption key from chrome's storage
    chrome.storage.sync.get(['encryptionKey'], data => {
      if (data.encryptionKey) {
        return data.encryptionKey;
      } else {
        generateNewEncryptionKey(); // Generate a new encryption key if it doesn't exist
        
        return data.encryptionKey;
      }
    });
  }


