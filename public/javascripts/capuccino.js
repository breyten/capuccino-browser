var CapuccinoApi = window.CapuccinoApi || {
  data: {
    _gettingTracks: false,
    tracks: []
  },
};

CapuccinoApi.is_live = function() {
  var d = new Date();
  return ((d.getDay() == 6) && (d.getHours() >= 9) && (d.getHours() <= 12));
};

CapuccinoApi.get_latest_broadcast = function() {
  if (Radiobox2Api.data._gettingBroadcastInfo) {
    return;
  }
  Radiobox2Api.data._gettingBroadcastInfo = true;
  $.get(
    "http://radiobox2.omroep.nl/broadcast/search.json?q=channel.id:'" + Radiobox2Api.getChannelId() + "'%20AND%20programme.name:'Cappuccino'%20AND%20startdatetime<NOW&order=startdatetime:desc&max-results=5",
    function(data) {
      //console.dir(data);
      var broadcast = data.results[0];
      console.dir(broadcast);
      Radiobox2Api.data._gettingBroadcastInfo = false;
      //if ((typeof(Radiobox2Api.data.currentBroadcast) !== 'undefined') && (broadcast.id == Radiobox2Api.data.currentBroadcast.id)) {
        // do nothing?
      //} else {
      Radiobox2Api.data.currentBroadcast = broadcast;
      Radiobox2Api.getCurrentItems();
      $(document).trigger('Radiobox2.broadcastChanged', [broadcast]);
      //}
    }
  , 'json');
};

CapuccinoApi.get_programme_info = function() {
  if (Radiobox2Api.data._gettingCurrentProgram) {
    return;
  }

  Radiobox2Api.data._gettingCurrentProgram = true;

  $.get(
    "http://radiobox2.omroep.nl/programme/rest/123.json",
    function(data) {
      Radiobox2Api.data._gettingCurrentProgram = false;
      Radiobox2Api.data.currentProgram = data;
      $(document).trigger('Radiobox2.programChanged', [data]);
    }
  , 'json');  
};


CapuccinoApi.get_tracks_during_broadcast = function() {
  if (CapuccinoApi.data._gettingTracks) {
    return;
  }
  CapuccinoApi.data._gettingTracks = true;
  
  var broadcast = Radiobox2Api.data.currentBroadcast;
  
  $.get(
    "http://radiobox2.omroep.nl/track/search.json?q=channel.id:'2' AND startdatetime>'" + broadcast.startdatetime + "' AND stopdatetime<'" + broadcast.stopdatetime + "' AND songfile.id>'0'",
    function (data) {
      console.dir(data);
      $('#tracks ul').html(''); // clear
      CapuccinoApi.data._gettingTracks = false;
      if (data.results.length > 0) {
        $.each(data.results, function (idx, track) {
          $('#tracks ul').append($('<li>' + track.songfile.artist + ' - ' + track.songfile.title + '</li>'));
        });
      } else {
        $('#tracks ul').html('<li>Geen nummers afgespeeld helaas ...');
      }
    }
  , 'json');
};

$(document).ready(function() {
  CapuccinoApi.get_programme_info();
  if (CapuccinoApi.is_live()) {
    console.log('capuccino live');
    Radiobox2.init();
  } else {
    console.log('capuccino niet live');
    // what now? -- get latest broadcast
    Radiobox2.delayed_init();
    CapuccinoApi.get_latest_broadcast();
  }
});
