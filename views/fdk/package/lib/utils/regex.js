'use strict';

/* eslint-disable  max-len, no-useless-escape*/

const DEFAULT_REGEX_FIELDS = {

  email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

  number: /^-?\d*\.?\d*\d$/,

  url: /https:\/\/(www\.)?[-a-zA-Z0-9@:*%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/,

  phone_number: /(^\d{10}$)|(^\d{3}-\d{3}-\d{4}$)/,

  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

};

module.exports = DEFAULT_REGEX_FIELDS;