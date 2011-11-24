var static = require('node-static');

var file = new(static.Server)('./content');

require('http').createServer(function (request, response) {
  request.addListener('end', function () {
    file.serve(request, response);
  });
}).listen(8024);
