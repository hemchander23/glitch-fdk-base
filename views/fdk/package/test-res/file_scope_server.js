var handler = require('./lib/handle-response');

var hello = "world";

exports = {

  callRemote: function(args) {
  	console.log(hello);
    if (args.localVarTest) {
      console.log(localVar);
    } else if (args.globalVarTest) {
      console.log(globalVar);
    }
    var url = args['url'];
    renderData();
  }

};