var express = require('express')
var app = express();
var hbs = require('hbs');
var fs = require('fs');
var ip;
var port = 8000;
var ioport = 9001;

//look up machine's ip address
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  ip=add;
})

//express sever serving index.html
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.get('/', function (req, res) {
  res.render('index',{
    'ip': ip,
    'port':ioport
  });
})
app.use(express.static(__dirname + '/javascript'));
app.listen(port);
console.log('listening on port '+port);


//socket.io connetion
var io = require('socket.io').listen(ioport);
console.log('listening on port '+ioport);
 
io.sockets.on('connection', function(socket) {
  socket.on('message', function(message) {
    socket.broadcast.emit('message', message);
  });
  socket.on('disconnect', function() {
    socket.broadcast.emit('disconnected');
  });
});