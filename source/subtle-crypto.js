// https://davidmyers.dev/blog/a-practical-guide-to-the-web-cryptography-api

class EncryptionError extends Error {
  constructor (message, name = 'EncryptionError') {
    super(message)
    this.name = name
  }
}

const generateKey = async (algorithm = 'AES-CBC') => {
  return window.crypto.subtle.generateKey({
    name: algorithm,
    length: 256,
  }, true, ['encrypt', 'decrypt'])
}

/*
* Turns a string into a Uint8Array so it can be encrypted.
* @param {String} data
* @return {Uint8Array} 
*/
const encode = (data) => {
  const encoder = new TextEncoder()
  return encoder.encode(data)
}

/*
* Generates an IV for encryption.
* @return {Uint8Array} 
*/
const generateIv = () => {
  // https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
  return crypto.getRandomValues(new Uint8Array(16))
}

/*
* Turns a Uint8Array into a Base64 String. Used for transporting the IV.
* @param {Uint8Array} u8
* @return {String} 
*/
const uint8ArrayToBase64 = (u8) => {
  return btoa(String.fromCharCode.apply(null, u8))
}

/*
* Turns a Base64 string into a Uint8Array. Used for transporting the IV.
* @param {String} a
* @return {Uint8Array} 
*/
const base64ToUintArray = (a) => {
  return new Uint8Array(unpack(a))
}

/*
* Turns a string that is URL-safe Base64-encoded into a more standard Base64-encoded string.
* @param {String} base64
* @return {String} 
*/
function urlSafeToB64 (base64) {
  return base64.replaceAll('-', '+').replaceAll('_', '/')
}

/*
* Turns an ArrayBuffer into a Base64-encoded String.
* @param {ArrayBuffer} buffer
* @return {String} 
*/
const pack = (buffer) => {
  return btoa(
    String.fromCharCode.apply(null, new Uint8Array(buffer))
  )
}

/*
* Turns a Base64-encoded String into an ArrayBuffer.
* @param {String} base64
* @return {ArrayBuffer} 
*/
const unpack = (packed) => {
  try {
    var string = atob(urlSafeToB64(packed))

  } catch (e) {
    if (e.message.includes('The string to be decoded is not correctly encoded.')) {
      throw new EncryptionError('Base64 string is not properly encoded, and cannot be decoded.', 'EncodingError')
    } else {
      throw e
    }
  }
  const buffer = new ArrayBuffer(string.length)
  const bufferView = new Uint8Array(buffer)
  for (let i = 0; i < string.length; i++) {
    bufferView[i] = string.charCodeAt(i)
  }
  return buffer
}

/*
* Turns an ArrayBuffer into human-readable string.
* @param {ArrayBuffer} bytestream
* @return {String} 
*/
const decode = (bytestream) => {
  const decoder = new TextDecoder()
  return decoder.decode(bytestream)
}

/*
* Turns a Base64-encoded key into a CryptoKey object. If it is already an object, it just returns the key that was given. 
* @param {String} key
* @param {String} algorithm: The algorithm being used.
* @return {CryptoKey} 
*/
async function keyFromB64 (key, algorithm = 'AES-CBC') {
  const keyType = typeof key
  switch (keyType) {
    case 'string': {
      try {
        return await crypto.subtle.importKey(
          'raw',
          unpack(key),
          algorithm,
          true,
          ['encrypt', 'decrypt']
        )
      } catch (e) {
        switch (e.name) {
          case 'EncodingError': {
            throw new EncryptionError(`The Base64 encryption key provided is not properly encoded. Please make sure it is properly encoded: ${key}`, 'EncodingError')
          } default: {
            throw e
          }
        }
      }
    } case 'object': {
      return key
    } default: {
      throw new EncryptionError(`Invalid key type "${keyType}".`)
    }
  }
}

async function b64FromKey (key) {
  return pack(await crypto.subtle.exportKey('raw', key))
}

/*
* Encrypts data using the given key. 
* @param {String} data: The data that will be encrypted.
* @param {CryptoKey, String} key: Encryption key used to encrypt the data. It can be either a CryptoKey object that is all prepared, or a Base64-encoded key as a String that the function will turn into a CryptoKey object.
* @return {Array[String]} First item is the ciphertext, second is the IV. Both are Base64-encoded strings.
*/
const subtleEncrypt = async (data, key, algorithm = 'AES-CBC') => {
  try {
    var decodedKey = await keyFromB64(key, algorithm)
  } catch (e) {
    switch (e.name) {
      case 'EncodingError': {
        throw new EncryptionError(`The Base64 encryption key provided is not properly encoded. Please make sure it is properly encoded: ${key}`, 'EncodingError')
      } default: {
        throw e
      }
    }
  }
  
  const encoded = encode(data)
  const iv = generateIv()
  const cipher = await crypto.subtle.encrypt({
    name: algorithm,
    iv: iv,
  }, decodedKey, encoded)
  return [
    pack(cipher),
    uint8ArrayToBase64(iv),]

}

/*
* Decrypts data using the given key. 
* @param {String} ciphertext: The data that will be decrypted.
* @param {CryptoKey, String} key: Encryption key used to encrypt the data, which will now be used to decrypt the data. It can be either a CryptoKey object that is all prepared, or a Base64-encoded key as a String that the function will turn into a CryptoKey object.
* @param {String} iv: The IV that was used to encrypt the data.
* @return {CryptoKey} 
*/
const subtleDecrypt = async (ciphertext, iv, key, algorithm = 'AES-CBC') => {

  try {
    var raw_ciphertext = unpack(ciphertext)
  } catch (e) {
    switch (e.name) {
      case 'EncodingError': {
        throw new EncryptionError(`The Base64 ciphertext provided is not properly encoded. Please make sure it is properly encoded: ${ciphertext}`, 'EncodingError')
      } default: {
        throw e
      }
    }
  }

  try {
    var raw_iv = base64ToUintArray(iv)
  } catch (e) {
    switch (e.name) {
      case 'EncodingError': {
        throw new EncryptionError(`The Base64 IV provided is not properly encoded. Please make sure it is properly encoded: ${iv}`, 'EncodingError')
      } default: {
        throw e
      }
    }
  }

  var subtleCryptoKey = await keyFromB64(key, algorithm)

  try {

    var encoded = await crypto.subtle.decrypt({
      name: algorithm,
      iv: raw_iv,
    }, subtleCryptoKey, raw_ciphertext)
  } catch (e) {
    switch (e.name) {
      case 'OperationError': {
        throw new EncryptionError(`Unable to decrypt data using the information provided. Please check your ciphertext and encryption key.`)
      } default: {
        throw e
      }
    }
  }


  return decode(encoded)
}