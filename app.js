var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	users = {};
	var  express = require('express');
  var  fs = require('fs');


server.listen(3000);
//mongoose.connect('mongodb://192.254.67.45/chatData', function(err){
mongoose.connect('mongodb://192.168.1.2/chatData', function(err){
	if(err){
		console.log(err);
	} else{
		console.log('Connected to mongodb!');
	}
});
var chatSchema = mongoose.Schema({
	nick: String,//senderId
	msg: String,//receiverId
	img: String,
	receiver: String,
	imgFlag: Number,
	isImgDownloaded:{type: Number, default: 0},
	created: {type: Date, default: Date.now},
	chatId:String,
	readUnreadFlg:Number,
	groupId:Number,
	groupOwnerId:Number,
	groupMemberId:String,
	groupName:String,
	isBlocked:{type: Number, default: 0},
	loginUserId:String
});
var Chat = mongoose.model('Message', chatSchema);

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', "http://"+req.headers.host+':8100');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  next();
  }
);

app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
	socket.on('new user', function(data, callback){
        console.log("this is my new user"+data)
		if (data in users){
            console.log("data exist in user");
			callback(true);
		} else{
		console.log("data doesnot exist in user");
			socket.nickname = data;
			users[socket.nickname] = socket;
            console.log("receiver we got is "+users[socket.nickname])
          	Chat.find().where({receiver:data}).exec(function abc(err, docs){
					if(err) throw err;
					console.log('emit here========');
					socket.emit('img received', docs);
					//socket.emit('load old msgs', docs);
                callback(true);
                 console.log("emitted  data is "+docs)
					updateNicknames();
				});
		}
	});
    
    socket.on('request load old msgs', function(data, callback){
		
		socket.nickname = data;
        console.log("ios requested for offline message  for "+data);
        Chat.find().where({receiver:data}).exec(function abc(err, docs){
        if(err) throw err ;
           // socket.emit('load old msgs', docs);
             console.log("send data to iOS "+docs)
           
        });
        callback(true); 
	});
    
    socket.on('get oldmsg done', function(data){
		
		Chat.remove({receiver:data.receiver}).where({imgFlag:0}).exec();
	});
    
    socket.on('get img done', function(data){
        console.log('data==============>>>',data.length);
        //delete from tbl...where({imgflg==0})0 for msgs
        //remove chat only dont remove imgs.
        for (var i = 0; i < data.length; i++) {
            //data[i]
            console.log('its i>>',data[i]._id);
            console.log('its img>>',data[i].img);
            //Chat.update({id:data[i].id},{isImgDownloaded:1}).exec();
            var conditions = {id:data._id}, update = {isImgDownloaded:1}, options = { multi: true };
            Chat.update(conditions, update, options, callback);
            function callback (err, numAffected) {
                        }
		}
	});
            
            
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}
    
    socket.on('typing', function(data, callback){
        if(data.oppUser in users)
        {
            users[data.oppUser].emit('typing',{oppUser:data.oppUser,currentUser:data.currentUser});
            console.log('typing ..... ');
            }
    });
    
    socket.on('stop typing', function(data, callback){
        if(data.oppUser in users)
        {
            users[data.oppUser].emit('stop typing');
            console.log('Stop typing ..... ');
        }
    });
     
	socket.on('send message', function(data, callback){
		var msg = data.trim();
		console.log('after trimming message is: ' + msg);
		if(msg.substr(0,3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
                    console.log('sending message to user!');
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('message sent is: ' + msg);
                    console.log('message sent nickname: ' + socket.nickname);
					console.log('Whisper!');
				} else{
					//insert data here
					var newMsg = new Chat({msg: msg, img:null, nick: socket.nickname, receiver:name,imgFlag:0});
					newMsg.save(function(err){
						if(err) throw err;
						io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
					});
					callback(false);
				}
			} else{
				//callback('Error!  Please enter a message for your whisper.');
			}
		} else{
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
		}
	});
	
    socket.on('user image', function(msg,callback){
        console.log('on user img.....');
        fs.exists(__dirname + "/" + msg.imageMetaData, function (exists) {
                  if (!exists) {
                  fs.mkdir(__dirname + "/" + msg.imageMetaData, function (e) {
                           if (!e) {
                           console.log("Created new directory without errors." + client.id);
                           } else {
                           console.log("Exception while creating new directory....");
                           throw e;
                           }
                           });
                  }
                  });
        fs.writeFile(__dirname + "/" + msg.imageMetaData + "/" + msg.imageMetaData + ".jpg",           msg.imageData, function (err) {
                     if (err) {
                     console.log('ERROR:: ' + err);
                     throw err;
                     }
                     });
        console.log('msg>>> ',msg);
    
        if(msg.toUserId in users){
        console.log(msg.toUserId);
        users[msg.toUserId].emit('user image',{image:msg.imageData, nick: socket.nickname});
        
        console.log('Whisper!');
        } else{
            console.log('***error--');
        //callback('Error!  Enter a valid user.');
        }
        //io.sockets.emit('user image',msg.imageData);
    });
          
    socket.on('share contact',function(data,callback){
        var dtc=JSON.stringify(data.contactdetails);
        console.log("contactdetails>>>>>>"+dtc);
        if(data.toUserId in users)
        {       
           users[data.toUserId].emit('share contact',{contact:data.contactdetails, nick: socket.nickname});
        }
        else
        {
            console.log('***error--');
        //callback('Error!  Enter a valid user.');
        }
    });  
    
	socket.on('disconnect', function(data){
        console.log("@@@@@@@@@@@@@@@@##################@@@@@@@@@@@@###########");
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});
