var CapuccinoApi = window.CapuccinoApi || {
  data: {
    _gettingTracks: false,
    tracks: [],
    broadcasts: {},
  },
};

CapuccinoApi.is_live = function() {
  //var d = new Date();
  //return ((d.getDay() == 6) && (d.getHours() >= 9) && (d.getHours() <= 12));
  return false;
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
      CapuccinoApi.set_broadcast(broadcast);
    }
  , 'json');
};

CapuccinoApi.set_broadcast = function(broadcast) {
  Radiobox2Api.data.currentBroadcast = broadcast;
  //Radiobox2Api.getCurrentItems();
  $(document).trigger('Radiobox2.broadcastChanged', [broadcast]);  

  CapuccinoApi.get_items_for_broadcast(broadcast.id);
  CapuccinoApi.get_tracks_during_broadcast();
};

CapuccinoApi.get_items_for_broadcast = function(broadcast_id) {
// http://radiobox2.omroep.nl/item/search.json?q=broadcast.id:'11329'
  if (Radiobox2Api.data._gettingCurrentItems) {
    return;
  }
  console.log('trying to get current items ...');
  Radiobox2Api.data._gettingCurrentItems = true;
  $.get(
    "http://radiobox2.omroep.nl/item/search.json?q=broadcast.id:'" + broadcast_id + "'",
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
    "http://radiobox2.omroep.nl/track/search.json?q=channel.id:'2' AND startdatetime>'" + broadcast.startdatetime + "' AND stopdatetime<'" + broadcast.stopdatetime + "' AND songfile.id>'0'&order=startdatetime:desc",
    function (data) {
      console.dir(data);
      $('#tracks ul').html(''); // clear
      CapuccinoApi.data._gettingTracks = false;
      if (data.results.length > 0) {
        $.each(data.results, function (idx, track) {
          $('#tracks ul').append($('<li>' + moment(track.startdatetime).format('H:mm') + ' ' + track.songfile.artist + ' - ' + track.songfile.title + '</li>'));
        });
      } else {
        $('#tracks ul').html('<li>Geen nummers afgespeeld helaas ...');
      }
    }
  , 'json');
};

CapuccinoApi.get_all_broadcasts = function() {
  $.get(
  "http://radiobox2.omroep.nl/broadcast/search.json?q=channel.id:'2' AND programme.id:'123' AND startdatetime<NOW&order=startdatetime:desc",
    function (data) {
      console.dir(data);
      $.each(data.results, function (idx, broadcast) {
        $('#broadcasts-dropdown ul.dropdown-menu').append(
          $('<li><a href="#' + broadcast.id + '">' + broadcast.name + ' ' + moment(broadcast.startdatetime.replace(/T.*$/, '')).format("D MMM YYYY") + '</a></li>')
        );
        CapuccinoApi.data.broadcasts[broadcast.id] = broadcast;
      });
      
      $('#broadcasts-dropdown ul.dropdown-menu li a').click(function() {
        var broadcast_id = $(this).attr('href').replace('#', '');
        console.log('Aflevering ' + broadcast_id + ' geselecteerd!');
        console.dir(CapuccinoApi.data.broadcasts[broadcast_id]);
        CapuccinoApi.set_broadcast(CapuccinoApi.data.broadcasts[broadcast_id]);
      });
    }
  , 'json');  
}

$(document).ready(function() {
  CapuccinoApi.get_programme_info();
  CapuccinoApi.get_all_broadcasts();
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
