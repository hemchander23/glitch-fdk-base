'use strict';

const expect = require('chai').expect;

const minEditDistance = require('../lib/utils/minEditDistance');
const suggest = require('../lib/utils/commandSuggestionHelper');
const cryptoUtil = require('../lib/utils/crypto-util');

describe('Minimum Edit Distance', () => {
  it('Should pass basic levenshtein distance between 2 words', () =>{
    /*eslint-disable */
    expect(minEditDistance('', '')).eql(0);
    expect(minEditDistance('a', '')).eql(1);
    expect(minEditDistance('', 'a')).eql(1);
    expect(minEditDistance('abc', '')).eql(3);
    expect(minEditDistance('', 'abc')).eql(3);


    expect(minEditDistance('create', 'crete')).eql(1);

    expect(minEditDistance('run', 'boo')).eql(3);

    expect(minEditDistance('validate', 'valid')).eql(3);
    /*eslint-enable */
  });
});

describe('Typos in user input', ()=>{
  it('Should suggest nearest command in case of typo', ()=>{
    expect(suggest('crete')).eql('create');
    expect(suggest('un')).eql('run');
    expect(suggest('valid')).eql('validate');

    expect(suggest('create')).eql('create');

    expect(suggest('u')).eql(null);

    expect(suggest('This is a beautiful day is not a command')).eql(null);
  });
});

describe('Encryption and Decryption Tests', ()=>{
  it('Should decryt data', () => {
    var data = 'This is the data';
    var encrypteddata = cryptoUtil.encryptToken(data);

    expect(cryptoUtil.decryptToken(encrypteddata)).eql(data);
  });
});