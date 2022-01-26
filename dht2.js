var dht = require('kademlia')
var node = new dht.KNode({ address: '127.0.0.1', port: 10778 });
node.connect('127.0.0.1', 10777, function(err) {
  if(err === 'null') {
    console.log("DHT node connection established.");
    node.set('foo', 'bar');

    node.get('foo', function(err, data) {
        console.log("Retrieved", data, "from DHT");
        console.log(data == 'bar');
    });
  }

});
