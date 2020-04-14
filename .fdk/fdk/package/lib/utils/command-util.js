'use strict';

const commands = ['create', 'run', 'validate', 'pack', 'version', 'help', 'generate'];
// eslint-disable-next-line
const threshold = Math.max.apply(null, commands.map(x => x.length)) + 4;

function minEditDistance(a, b) {
  const distanceMatrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) {
    distanceMatrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    distanceMatrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;

      distanceMatrix[j][i] = Math.min(
        distanceMatrix[j][i - 1] + 1,
        distanceMatrix[j - 1][i] + 1,
        distanceMatrix[j - 1][i - 1] + indicator);
    }
  }

  return distanceMatrix[b.length][a.length];
}


function suggestCommand(userCommand) {

  if (userCommand.length < 2) { return null; }
  if (userCommand.length > threshold) { return null; }

  var minDistArray = commands.map(x => minEditDistance(x, userCommand));
  var minDist = Math.min.apply(null, minDistArray);
  var suggestCommand = commands[minDistArray.findIndex(x => x === minDist)];

  if (userCommand[0] !== suggestCommand[0] &&
    userCommand[userCommand.length - 1] !== suggestCommand[suggestCommand.length - 1]) {
    return null;
  }

  return suggestCommand;
}



module.exports = {
  minEditDistance,
  suggestCommand
};
