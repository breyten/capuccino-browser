var Radiobox2Api = window.Radiobox2Api || {
  data: {
    currentChannelId: 2,
    currentBroadcast: undefined,
    currentTrack: undefined,
    _gettingBroadcastInfo: false, // avoid doing the same request twice and stuff
    currentItems: undefined,
    _gettingCurrentItems: false,
    currentTrack: undefined,
    _gettingCurrentTrack: false,
    currentSongfile: undefined,
    _gettingCurrentSongfile: false,
    full_channels: {},
    channels: {}
  },
};

Radiobox2Api.init = function(looping) {
  Radiobox2Api.getChannels();
  
  if (looping) {
    setInterval(function() {
        Radiobox2Api.getCurrentBroadcast();
        Radiobox2Api.getCurrentItems();
    }, 60000);
  
    setInterval(function() {
      Radiobox2Api.getCurrentTrack();
    }, 10000);
  }
};

Radiobox2Api.getChannels = function() {
  $.get('http://radiobox2.omroep.nl/channel/search.json?q=', function(data) {
    console.dir(data);
    Radiobox2Api.data.full_channels = {};
    Radiobox2Api.data.channels = {};
    for (var i in data.results) {
      Radiobox2Api.data.full_channels[data.results[i].id] = data.results[i];
      Radiobox2Api.data.channels[data.results[i].id] = data.results[i].name;
    }
    $(document).trigger('Radiobox2.channelsReceived', [data]);    
  }, 'json');
};

Radiobox2Api.getChannelId = function() {
  return Radiobox2Api.data.currentChannelId;
};

Radiobox2Api.setChannelId = function(channelId) {
  Radiobox2Api.data.currentChannelId = channelId;
  // some more stuff needs to happen.. clearing broadcast en track
  Radiobox2Api.getCurrentBroadcast();
  $(document).trigger('Radiobox2.channelChanged', [channelId]);
};

Radiobox2Api.getCurrentBroadcast = function() {
  if (Radiobox2Api.data._gettingBroadcastInfo) {
    return;
  }
  Radiobox2Api.data._gettingBroadcastInfo = true;
  $.get(
    "http://radiobox2.omroep.nl/broadcast/search.json?q=channel.id:'" + Radiobox2Api.getChannelId() + "'%20AND%20startdatetime%3CNOW%20AND%20stopdatetime%3ENOW'&order=startdatetime:desc&max-results=5",
    function(data) {
      console.dir(data);
      var broadcast = data.results[0];
      Radiobox2Api.data._gettingBroadcastInfo = false;
      if ((typeof(Radiobox2Api.data.currentBroadcast) !== 'undefined') && (broadcast.id == Radiobox2Api.data.currentBroadcast.id)) {
        // do nothing?
      } else {
        Radiobox2Api.data.currentBroadcast = broadcast;
        $(document).trigger('Radiobox2.broadcastChanged', [broadcast]);
      }
    }
  , 'json');
};

Radiobox2Api.getCurrentItems = function() {
  if (Radiobox2Api.data._gettingCurrentItems) {
    return;
  }
  Radiobox2Api.data._gettingCurrentItems = true;
  $.get(
    "http://radiobox2.omroep.nl/item/search.json?q=channel.id:'" + Radiobox2Api.getChannelId() + "'%20AND%20startdatetime%3CNOW%20AND%20stopdatetime%3ENOW'&order=startdatetime:desc&max-results=5",
    function(data) {
      console.log('item:');
      console.dir(data);
      Radiobox2Api.data._gettingCurrentItems = false;
      Radiobox2Api.data.currentItems = data.results;
      // FIXME: should compare before calling change event ...
      $(document).trigger('Radiobox2.itemsChanged', [data.results]);
    }
  , 'json');
};

Radiobox2Api.getCurrentTrack = function() {
  if (Radiobox2Api.data._gettingCurrentTrack) {
    return;
  }
  Radiobox2Api.data._gettingCurrentTrack = true;
  $.get(
    '/channels/' + Radiobox2Api.getChannelId() + '/current_track',
    function(data) {
      console.log('track:');
      console.dir(data);
      Radiobox2Api.data._gettingCurrentTrack = false;
      var track = undefined;
      if (data.results.length > 0) {
        track = data.results[0];
      }
      
      var trackChanged = (typeof(track) != typeof(Radiobox2Api.data.currentTrack)) || (track.id != Radiobox2Api.data.currentTrack.id);
      if (trackChanged) {
        Radiobox2Api.data.currentTrack = track;
        Radiobox2Api.getCurrentSongfile();
        $(document).trigger('Radiobox2.trackChanged', [track]);        
      }
    }
  , 'json');
};

Radiobox2Api.getCurrentSongfile = function() {
  if (Radiobox2Api.data._gettingCurrentSongfile) {
    return;
  }
  Radiobox2Api.data._gettingCurrentSongfile = true;

  var track = Radiobox2Api.data.currentTrack;
  $.get(
    "http://radiobox2.omroep.nl/songversion/search.json?q=songfile.id:'" + track.songfile.id + "'",
    function (data) {
      Radiobox2Api.data._gettingCurrentSongfile = false;

      var songfile = undefined;
      if (data.results.length > 0) {
        console.log('got songfile!');
        songfile = data.results[0];
        console.dir(songfile);
      }
      
      Radiobox2Api.data.currentSongfile = songfile;
      $(document).trigger('Radiobox2.songfileChanged', [songfile]);        
    }
  , 'json');   
};

/* Actual app */

var Radiobox2 = window.Radiobox2 || {
  data: {},
};

Radiobox2.emptyChannelInfo = function() {
  $('#radio-info img').attr('src', '');
  $('#radio-info h1').text('');
  $('#radio-info h3').text('');
  $('#radio-info p.description').text('');
  $('#radio-info p.tags').text('');  
};

Radiobox2.emptyBroadcast = function() {
  $('#programme img').attr('src', '');
  $('#programme-info h2 .title').text('');
  $('#programme-info #programme-description').html('');
  $('#programme-info #programme-start').text('');
  $('#programme-info #programme-end').text('');  
};

Radiobox2.emptyPresenter = function() {
  //$('#presenter img').attr('src', broadcast.image.url);
  $('#presenter h2').text('');
  $('#presenter #presenter-description').html('');  
};

Radiobox2.emptyTrack = function() {
  $('#track h1 .glyphicon').removeClass('glyphicon-play').addClass('glyphicon-stop');
  $('#track h1 .artist').text('');
  $('#track h1 .title').text('');
  $('#track .start').text('');
  $('#track .end').text('');
  $('.track .player').html('');
  //$('#track .player').attr('data-youtube-id', '');
};

Radiobox2.emptySongfile = function() {
  $('#track .player').html('');  
};

Radiobox2.emptyPage = function() {
  Radiobox2.emptyChannelInfo();
  Radiobox2.emptyBroadcast();
  Radiobox2.emptyPresenter();
  Radiobox2.emptyTrack();
  Radiobox2.emptySongfile();
};

Radiobox2.channelChanged = function() {
  Radiobox2.emptyPage();

  var radioId = Radiobox2Api.getChannelId();
  $('#radios select').val(radioId);

  var radioInfo = Radiobox2Api.data.full_channels[radioId];
  $('#radio-info img').attr('src', radioInfo.image.url);
  $('#radio-info h1').text(radioInfo.name);
  $('#radio-info h3').text(radioInfo.epg_shortdescription);
  $('#radio-info p.description').text(radioInfo.description);
  $('#radio-info p.tags').text(radioInfo.tags);
  
};

Radiobox2.channelsReceived = function(looping) {
  console.log('channels received !');
  for (var i in Radiobox2Api.data.full_channels) {
    if (Radiobox2Api.data.full_channels[i].type == "main") {
      $('#radios select').append(
      $('<option value="' + Radiobox2Api.data.full_channels[i].id + '">' + Radiobox2Api.data.full_channels[i].name + '</option>'));
    }
  }
  
  if (!looping) {
    Radiobox2Api.setChannelId(Radiobox2Api.getChannelId());
  }
};

Radiobox2.broadcastChanged = function() {
  console.log('changing broadcast!');
  var broadcast = Radiobox2Api.data.currentBroadcast;

  Radiobox2.emptyBroadcast();
  Radiobox2.emptyPresenter();

  if (typeof(broadcast) !== 'undefined') {
    $('#programme img').attr('src', broadcast.image.url);
    $('#programme-info h2 .title').text(broadcast.name);
    $('#programme-info #programme-description').html(broadcast.description);
    $('#programme-info #programme-start').text(moment(broadcast.startdatetime).fromNow());
    $('#programme-info #programme-end').text(moment(broadcast.stopdatetime).fromNow());

    //$('#presenter img').attr('src', broadcast.image.url);
    $('#presenter h2').text(broadcast.presenter[0].full_name);
    $('#presenter #presenter-description').html(broadcast.presenter[0].biography);  
  }
};

Radiobox2.trackChanged = function() {
  var track = Radiobox2Api.data.currentTrack;
  
  Radiobox2.emptyTrack();
  Radiobox2.emptySongfile();

  $('#track h1 .glyphicon').removeClass('glyphicon-stop').addClass('glyphicon-play');
  $('#track h1 .artist').text(track.songfile.artist);
  $('#track h1 .title').text(track.songfile.title);
  $('#track .start').text(moment(track.startdatetime).fromNow());
  $('#track .end').text(moment(track.stopdatetime).fromNow());
  
};


Radiobox2.updateTimes = function() {
  // track stuff first
  var track = Radiobox2Api.data.currentTrack;
  
  if (typeof(track) !== 'undefined') {
    $('#track .start').text(moment(track.startdatetime).fromNow());
    $('#track .end').text(moment(track.stopdatetime).fromNow());
  }
  
  // now programme stuff
  var broadcast = Radiobox2Api.data.currentBroadcast;
  if (typeof(broadcast) !== 'undefined') {
    $('#programme-info #programme-start').text(moment(broadcast.startdatetime).fromNow());
    $('#programme-info #programme-end').text(moment(broadcast.stopdatetime).fromNow());
  } 
};

Radiobox2.songfileChanged = function() {
  var songfile = Radiobox2Api.data.currentSongfile;
  
  if (typeof(songfile) === 'undefined') {
    return;
  }

  console.dir(songfile);
  if (songfile.youtube_id != '') {
    $.get('/youtube/embed/' + songfile.youtube_id,
      function(data){
        console.log('got youtube data!');
        console.dir(data);
        $('#track .player').html(data.html);
      }
    , 'json');
  } else if ((typeof(songfile.audiofile) !== 'undefined') && (songfile.audiofile.url != '') ){
    // what now?
  }
};

Radiobox2.init = function(do_loops) {
  var looping = do_loops;

  $(document).bind('Radiobox2.channelsReceived', function() {
    Radiobox2.channelsReceived(looping);
  }).bind('Radiobox2.channelChanged', function() {
    Radiobox2.channelChanged();
  }).bind('Radiobox2.broadcastChanged', function() {
    Radiobox2.broadcastChanged();
  }).bind('Radiobox2.trackChanged', function() {
    Radiobox2.trackChanged();
  }).bind('Radiobox2.songfileChanged', function() {
    Radiobox2.songfileChanged();
  });
  
  $('#radios select').change(function (what) {
    var channelId = parseInt($('#radiobox2-form-channel').val());
    Radiobox2Api.setChannelId(channelId);
  });

  Radiobox2Api.init(looping);
  
  setInterval(function() {
      Radiobox2.updateTimes();
  }, 1000);
};

$(document).ready(function() {
  //console.log('hoi');
  //Radiobox2.init();
});
