var MongoClient = require('mongodb').MongoClient;	// require the mongodb driver

/**
 * Uses mongodb v3.1.9 - [API Documentation](http://mongodb.github.io/node-mongodb-native/3.1/api/)
 * StoreDB wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our bookstore app.
 */
function StoreDB(mongoUrl, dbName){
	if (!(this instanceof StoreDB)) return new StoreDB(mongoUrl, dbName);
	this.connected = new Promise(function(resolve, reject){
		MongoClient.connect(
			mongoUrl,
			{
				useNewUrlParser: true
			},
			function(err, client){
				if (err) reject(err);
				else {
					console.log('[MongoClient] Connected to '+mongoUrl+'/'+dbName);
					resolve(client.db(dbName));
				}
			}
		)
	});
}

StoreDB.prototype.getProducts = function(queryParams){
	return this.connected.then(function(db){
		return new Promise(function(resolve, reject){
			db.collection("products").find({}).toArray(function(err, result) {
				if (err) 
					reject(err);
				else
				{	
					var resultArr = result;
					var products = {};
					//creating an arrayt with all valid products
					for(var i = 0; i < resultArr.length; i ++){
						var add = 1;
						if(queryParams.hasOwnProperty("minPrice")){
							if(resultArr[i].price >= queryParams.minPrice)
								add = 1;
							else
								add = 0;
						}
						if (queryParams.hasOwnProperty("maxPrice") && add) {
							if(resultArr[i].price <= queryParams.maxPrice)
								add = 1;
							else
								add = 0;

						}
						if(queryParams.hasOwnProperty("category") && add){
							if(resultArr[i].category === queryParams.category)
								add = 1;
							else
								add = 0;
						}
						if(add){
							//converting result array into a Products object
							products[resultArr[i]._id] = {
								"label": resultArr[i].label,
								"price": resultArr[i].price,
								"quantity": resultArr[i].quantity,
								"imageUrl": resultArr[i].imageUrl
							}
						}
					}
					resolve(products);
				}
			});
		});
	})
}

StoreDB.prototype.addOrder = function(order){
	return this.connected.then(function(db){
		return new Promise(function(resolve, reject){
			// function updateDoc(id){
			// 	var arr = [];
			// 	for(var item in order.cart){
			// 		arr.push(item.toString());
			// 	}
			// 	console.log("the order is");
			// 	console.log(order);
			// 	var docs = db.collection("products").find({_id:{ $in: arr}});
			// 	docs.forEach(
			// 		function(doc){
			// 			var newQ = doc.quantity - order.cart[doc._id];
			// 			console.log("this doc id is " + doc._id);
			// 			console.log(newQ);
			// 			db.collection("products").update({}, {$set: {quantity: newQ}}	);
			// 		});
			// }
			
			if(!order.hasOwnProperty("cart"))
				reject("not having cart");
			else
				{
					db.collection("orders").insertOne(order, function(err, result){
						if(err)
							reject(err);
						else{
							resolve(result.insertedId);
							}
						});
				}
			});

		});
}

module.exports = StoreDB;