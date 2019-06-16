'use strict';

const minEditDistance = require('./minEditDistance');

const commands = ['create', 'run', 'validate', 'pack', 'version', 'help', 'generate'];
// eslint-disable-next-line
const threshold = Math.max.apply(null, commands.map(x=>x.length))+4;


function suggestUser(userCommand){

  if (userCommand.length<2) {return null;}
  if (userCommand.length > threshold) {return null;}

  var minDistArray=commands.map(x => minEditDistance(x, userCommand));
  var minDist = Math.min.apply(null, minDistArray);
  var suggestCommand = commands[minDistArray.findIndex(x=>x===minDist)];

  if (userCommand[0]!==suggestCommand[0]&&
    userCommand[userCommand.length-1]!==suggestCommand[suggestCommand.length-1]){
    return null;
  }

  return suggestCommand;
}

module.exports = suggestUser;
