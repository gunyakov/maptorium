var dht = require('kademlia')
var node = new dht.KNode({ address: '127.0.0.1', port: 10777 });
//node.connect('existing peer ip', port);
//node.set('foo', 'bar');

/*node.get('foo', function(err, data) {
    console.log("Retrieved", data, "from DHT");
    console.log(data == 'bar');
});*/
