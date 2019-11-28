// Require dependencies
var path = require('path');
var express = require('express');
var StoreDB = require('./StoreDB.js');

// Declare application parameters
var PORT = process.env.PORT || 3000;
var STATIC_ROOT = path.resolve(__dirname, './public');

// Defining CORS middleware to enable CORS.
// (should really be using "express-cors",
// but this function is provided to show what is really going on when we say "we enable CORS")
function cors(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  	res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS,PUT");
  	next();
}

// Instantiate an express.js application
var app = express();

//Instantiate an databse object
var db = StoreDB('mongodb://localhost:27017', 'cpen400a-bookstore');

// Configure the app to use a bunch of middlewares
app.use(express.json());							// handles JSON payload
app.use(express.urlencoded({ extended : true }));	// handles URL encoded payload
app.use(cors);										// Enable CORS

app.use('/', express.static(STATIC_ROOT));			// Serve STATIC_ROOT at URL "/" as a static resource

// Configure '/products' endpoint
app.get('/products', function(request, response) {
	db.getProducts(request.query)
	.then(	(result) => response.json(result))
	.catch(	(error) => response.status(500).error("Unable to find products."));
});

app.post('/checkout', function(request, response) {
	var valid = 1;
	var body = request.body;
	console.log(body);
	if(!body.hasOwnProperty("client_id") || typeof(body.client_id)!= "string")
		valid = 0;
	else if(!body.hasOwnProperty("cart"))
		valid = 0;
	else if(!body.hasOwnProperty("total") || typeof(body.total)!= "number" || body.total < 0)
		valid = 0;
	//not checking other corner cases
	// else{
	// 	for(let item in body.cart){
	// 		if(db.collection("products").find({_id : item}) == null)
	// 			valid = 0;
	// 		else if(db.collection("products").find({_id : item}).quantity < body.cart[item])
	// 			valid = 0;
	// 	}
	// }
	if(valid){
		var order = body;
		db.addOrder(order)
		.then(	(result) => response.json(result))
		.catch(	(error) => response.status(500).error("Unable to process order."));
	}
	else{
		console.log("not valid");
		response.status(500).error("not a valid order.");
	}
});

// Start listening on TCP port
app.listen(PORT, function(){
    console.log('Express.js server started, listening on PORT '+PORT);
});

