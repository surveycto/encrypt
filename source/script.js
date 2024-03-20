/* global setAnswer, fieldProperties */

// var fieldProperties = {
//   CURRENT_ANSWER: '',
//   READONLY: false,
//   PARAMETERS: [
//     {
//       "key": "key",
//       "value": 'RQmHY+vQ5UQOeufZZQHZhg=='
//     },
//     {
//       "key": "c1",
//       "value": "Secret message!"
//     },
//     {
//       "key": "c2",
//       "value": "I'll be hidden!"
//     }
//   ]
// }

// function setAnswer (a) {
//   console.log('New answer:')
//   console.log(a)
// }

var parameters = fieldProperties.PARAMETERS

var dataList = []

var numParameters = parameters.length

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

encryptAll()

async function encryptAll () {
  var ciphertext = []
  var displayHtml = []

  const addWarning = (d) => {
    ciphertext.push(d)
    displayHtml.push(`<li>${d}</li>`)
  }

  for (var c = 0; c < dataList.length; c++) {
    try {

      ciphertext.push((await encrypt(dataList[c], passkey)).join('|'))
      displayHtml.push('<li>Success</li>')
    } catch (e) {
      if (['EncodingError', 'EncryptionError'].includes(e.name)) {
        addWarning(`Failed: ${e.message}`)
      } else {
        throw e
      }
    }
  }

  setAnswer(ciphertext.join(separator))
  document.querySelector('#decrypted').innerHTML = displayHtml.join('\n')
}

async function encrypt (plaintext, key, mode = 'cbc') {
  var data = await subtleEncrypt(plaintext, key)
  return data
}
