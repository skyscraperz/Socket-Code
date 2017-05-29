var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  io.emit('chat message', '[name] came online');
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(){
	 io.emit('chat message', '[name] went offline');
  });
}
);

http.listen(3000, function(){
  console.log('listening on *:3000');
});