'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';
// eslint-disable-next-line
const KEY = '783b3c9b0994985e3f08945000982cad';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';


function encryptToken(token){
  // eslint-disable-next-line
  const IV = new Buffer(crypto.randomBytes(16));
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let crypted = cipher.update(token, inputEncoding, outputEncoding);

  crypted += cipher.final(outputEncoding);

  return `${IV.toString(outputEncoding)}:${crypted.toString()}`;
}

function decryptToken(encryptedtoken){
  const textParts = encryptedtoken.split(':');
  const IV = new Buffer(textParts.shift(), outputEncoding);
  const encryptedText = new Buffer(textParts.join(':'), outputEncoding);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encryptedText, outputEncoding, inputEncoding);

  decrypted += decipher.final(inputEncoding);

  return decrypted.toString();
}

module.exports = {
  encryptToken,
  decryptToken
};