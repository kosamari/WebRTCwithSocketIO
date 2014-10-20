var local = document.getElementById('local');
var remote = document.getElementById('remote');
var video_stream;
var videoFlag = 0;
var connection;
var started = false;
var settings = {'mandatory': {'OfferToReceiveAudio':false, 'OfferToReceiveVideo':true }};

//button control
function connect() {
  if(started){disconnect(); return;}
  if (!started && video_stream && socket_ready) { 
    sendOffer();
    document.getElementById('connectbtn').innerHTML = 'Disconnect';
  } else {
    alert('sorry your video streaming is not ready yet');
  }
}

function disconnect(){
  connection.close();
  connection = null;
  started = false;
  document.getElementById('connectbtn').innerHTML = 'Connect';
}

//video 
function video() {
  if(videoFlag ===1){
    videoFlag = 0;
    local.src = '';
    video_stream.stop();
    disconnect();
    document.getElementById('videobtn').innerHTML = 'Video Start';
    return;
  }
  videoFlag = 1;
  navigator.webkitGetUserMedia({video: true, audio: false},
    function (stream) {
      video_stream = stream;
      local.volume = 0;
      local.src = window.webkitURL.createObjectURL(stream);
      local.play();
      document.getElementById('videobtn').innerHTML = 'Video Stop';
    },
    function (error) {
      console.error('error! (' + error.code+')');
      return;
    }
  );
}


// socket
var socket_ready = false;
//socket is prepped in index.html
socket.on('connect', function(){socket_ready = true;})
      .on('message', socket_message);

// job dispatcher
function socket_message(evt) {
  if (evt.type === 'offer') { onOffer(evt);}
  if (evt.type === 'answer' && started) { onAnswer(evt);}
  if (evt.type === 'candidate' && started) { onCandidate(evt); }
  if (evt.type === 'user dissconnected' && started) { stop(); }
}

function onOffer(evt) {
  setOffer(evt);
  sendAnswer(evt);
  started = true;
}

function onAnswer(evt) {
  if (! connection) {console.error('There is no connection'); return;}
  connection.setRemoteDescription(new RTCSessionDescription(evt));
}

function onCandidate(evt) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex:evt.sdpMLineIndex,
    sdpMid:evt.sdpMid,
    candidate:evt.candidate
  });
  connection.addIceCandidate(candidate);
}

function socketSend(data) {
  socket.json.send(data);
}

// connection
function NewConnection() {
  var cnnectionConfig = {iceServers:[]};
  var peer;

  // create peer
  try {
    peer = new webkitRTCPeerConnection(cnnectionConfig);
  } catch (e) {
    console.log('Failed to create connection, exception: ' + e.message);
  }

  // send ice candidates to remort
  peer.onicecandidate = function (evt) {
    if (evt.candidate) {
      var data = {
        type: 'candidate', 
        sdpMLineIndex: evt.candidate.sdpMLineIndex,
        sdpMid: evt.candidate.sdpMid,
        candidate: evt.candidate.candidate
      };
      socketSend(data);
    }
  };

  peer.addStream(video_stream);

  //remote stream event listener
  peer.addEventListener('addstream', function(){
    remote.src = window.webkitURL.createObjectURL(event.stream);
  }, false);
  peer.addEventListener('removestream', function(){
    remote.src = '';
  }, false)

  return peer;
}

function sendOffer() {
  connection = NewConnection();
  connection.createOffer(function (desc) {
    connection.setLocalDescription(desc);
    socketSend(desc);
    started = true;
  }, function () { 
    console.log('Something went wrong at sendOffer');
  }, settings);
}

function setOffer(evt) {
  if (connection) {
    console.error('connection already exist');
  }
  connection = NewConnection();
  connection.setRemoteDescription(new RTCSessionDescription(evt));
}

function sendAnswer(evt) {
  if (! connection) {
    console.error('connection does not exist');
    return;
  }
  connection.createAnswer(function (desc) { // in case of success
    connection.setLocalDescription(desc);
    socketSend(desc);
  }, function () {
    console.log('Something went wrong at sendAnswer');
  }, settings);
}
