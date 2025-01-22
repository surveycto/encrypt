var parameters = fieldProperties.PARAMETERS
var dataList = []
var numParameters = parameters.length

// GET PARAMETERS
var passkey
var separator = ' '
for (var p = 0; p < numParameters; p++) {
  var pa = parameters[p]
  var key = pa['key']
  var value = pa['value']
  switch (key) {
    case 'key': {
      passkey = value
      break
    }
    case 'separator': {
      separator = value
      break
    }
    default: {
      dataList.push(value)
    }
  }
}

// MAIN FUNCTION
encryptAll()

/*
* Encrypt a single piece of plaintext data.
* @param {String} plaintext: Data to encrupt
* @param {String} key: AES Base64-encoded encryption key.
* @param {String} mode: Encryption mode. (Currently unused.)
* @return {Array[String]} First item is the ciphertext, second is the IV. Both are Base64-encoded strings.
*/
async function encrypt (plaintext, key, mode = 'cbc') {
  var data = await subtleEncrypt(plaintext, key)
  return data
}

// Go through each parameter with plaintext data to be encrypted, and encrypt it.
async function encryptAll () {
  var ciphertext = []
  var displayHtml = []
  var results = []

  // Used for saving the results to metadata and displaying them to the enumerator.
  const addResult = (d) => {
    results.push(d)
    displayHtml.push(`<li>${d}</li>`)
  }

  // Go through each piece of plaintext, and encrypt it.
  for (var c = 0; c < dataList.length; c++) {
    try {
      ciphertext.push((await encrypt(dataList[c], passkey)).join('|'))
      addResult('Success')
    } catch (e) {
      if (['EncodingError', 'EncryptionError'].includes(e.name)) {
        var result = `Failed: ${e.message}`
      } else {
        var result = `Unexpected error:<br>Name: ${e.name}<br>Message: ${e.message}<br>Stack: ${e.stack}`
      }
      ciphertext.push(result)
      addResult(result)
    }
  }

  setAnswer(ciphertext.join(separator))
  setMetaData(results.join('|'))
  document.querySelector('#decrypted').innerHTML = displayHtml.join('\n')
}
