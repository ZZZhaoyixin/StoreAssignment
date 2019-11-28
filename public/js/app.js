/**
The website does not inform the user when the item is back to stock. 
It only alerts the unavaliability when there is a change to zero of the total stock for an item.
**/

//stores the keys of products that will be displayed in the view
var displayed =[];
function Store(serverUrl){
	this.serverUrl = serverUrl;
	this.stock = [];
	this.cart = {};
	this.onUpdate = null;
};

Store.prototype.addItemToCart = function addItemToCart(itemName) {
	if(!this.cart.hasOwnProperty(itemName)){
		this.cart[itemName] = 1;
		this.stock[itemName].quantity --;
	}
	else{
		if(this.stock[itemName].quantity == 0){
			alert("This item is out of stock.");
		}
		else{
			this.cart[itemName] ++;
			this.stock[itemName].quantity --;
		}
	}
	this.onUpdate(itemName);
};


Store.prototype.removeItemFromCart = function removeItemFromCart(itemName) {

	if(this.cart.hasOwnProperty(itemName)){

		this.cart[itemName] --;
		this.stock[itemName].quantity ++;

		if(this.cart[itemName] == 0){
			delete this.cart[itemName];
			alert("This item is no longer in your cart.");
		}
	}
	else{
		alert("This item is not in your cart.");
	}
	this.onUpdate(itemName);
};

Store.prototype.queryProducts = function(query, callback){
	var self = this;
	var queryString = Object.keys(query).reduce(function(acc, key){
			return acc + (query[key] ? ((acc ? '&':'') + key + '=' + query[key]) : '');
		}, '');
	ajaxGet(this.serverUrl+"/products?"+queryString,
		function(products){
			Object.keys(products)
				.forEach(function(itemName){
					var rem = products[itemName].quantity - (self.cart[itemName] || 0);
					if (rem >= 0){
						self.stock[itemName].quantity = rem;
					}
					else {
						self.stock[itemName].quantity = 0;
						self.cart[itemName] = products[itemName].quantity;
						if (self.cart[itemName] === 0) delete self.cart[itemName];
					}
					
					self.stock[itemName] = Object.assign(self.stock[itemName], {
						price: products[itemName].price,
						label: products[itemName].label,
						imageUrl: products[itemName].imageUrl
					});
				});
			self.onUpdate();
			callback(null, products);
		},
		function(error){
			callback(error);
		}
	)
}

function renderMenu(container, storeInstance){
	while (container.lastChild) container.removeChild(container.lastChild);
	if (!container._filters) {
		container._filters = {
			minPrice: null,
			maxPrice: null,
			category: ''
		};
		container._refresh = function(){
			storeInstance.queryProducts(container._filters, function(err, products){
					if (err){
						alert('Error occurred trying to query products');
						console.log(err);
					}
					else {
						displayed = Object.keys(products);
						renderProductList(document.getElementById('productView'), storeInstance, displayed);
					}
				});
		}
	}

	var box = document.createElement('div'); container.appendChild(box);
		box.id = 'price-filter';
		var input = document.createElement('input'); box.appendChild(input);
			input.type = 'number';
			input.value = container._filters.minPrice;
			input.min = 0;
			input.placeholder = 'Min Price';
			input.addEventListener('blur', function(event){
				container._filters.minPrice = event.target.value;
				container._refresh();
			});

		input = document.createElement('input'); box.appendChild(input);
			input.type = 'number';
			input.value = container._filters.maxPrice;
			input.min = 0;
			input.placeholder = 'Max Price';
			input.addEventListener('blur', function(event){
				container._filters.maxPrice = event.target.value;
				container._refresh();
			});

	var list = document.createElement('ul'); container.appendChild(list);
		list.id = 'menu';
		var listItem = document.createElement('li'); list.appendChild(listItem);
			listItem.className = 'menuItem' + (container._filters.category === '' ? ' active': '');
			listItem.appendChild(document.createTextNode('All Items'));
			listItem.addEventListener('click', function(event){
				container._filters.category = '';
				container._refresh()
			});
	var CATEGORIES = [ 'Clothing', 'Technology', 'Office', 'Outdoor' ];
	for (var i in CATEGORIES){
		var listItem = document.createElement('li'); list.appendChild(listItem);
			listItem.className = 'menuItem' + (container._filters.category === CATEGORIES[i] ? ' active': '');
			listItem.appendChild(document.createTextNode(CATEGORIES[i]));
			listItem.addEventListener('click', (function(i){
				return function(event){
					container._filters.category = CATEGORIES[i];
					container._refresh();
				}
			})(i));
	}
}

//create a new store
var store = new Store("http://localhost:3000");

Store.prototype.checkOut = function checkOut(onFinish){
	this.syncWithServer(onSync);
	if(onFinish)
		onFinish();
}

function onSync(delta){
		var result = [];
		for(var item in delta){
			if(delta[item].price){
				var oldPrice = store.stock[item].price - delta[item].price;
				result.push("Price of " + item + " changed from $" + oldPrice + " to $" + store.stock[item].price + "\n");
			}
			if(delta[item].quantity){
				if(store.cart.hasOwnProperty(item)){
					var number = store.stock[item].quantity - delta[item].quantity + store.cart[item];
					if(number == 0)
						alert("something is 0 now");
					var current = store.stock[item].quantity + store.cart[item];
				}
				else{
					var number = store.stock[item].quantity - delta[item].quantity;
					var current = store.stock[item].quantity;
				}
				result.push("Quantity of " + item + " changed from " + number + " to " + current + "\n");
			}
		}
		var msg = result.join("");
		if(msg == ""){
			var totalPrice = 0;
			var cId = Math.floor(Math.random() * 20).toString();

			for(let item in store.cart){
				totalPrice += store.stock[item].price * store.cart[item];
			}

			var order = {
				"_id":"",
   				"client_id": cId,
			    "cart": store.cart,
			    "total": totalPrice
			}

			// when checkout successfully
			ajaxPost(store.serverUrl + "/checkout", order, 
				function(response){alert("Checkout Successfully!"); enableButton(); store.cart = {}; store.onUpdate();},  
				function(err){alert("We encountered error while processing your order.");enableButton();} );
		}
		else{
			alert(msg);
			renderCart(document.getElementById("modal-content"), store);
			enableButton();
		}
}

store.onUpdate = function(itemName){
	if(itemName == null){
		renderProductList(document.getElementById("productView"), this, displayed);
		renderMenu(document.getElementById("menuView"), this);
		renderCart(document.getElementById("modal-content"), this);
	}
	else{
		var e = document.getElementById("product-" + itemName );
		renderProduct(e, this, itemName);
		renderCart(document.getElementById("modal-content"), this);
		renderMenu(document.getElementById("menuView"), this);
	}
}

var totalRequests = 0;

function ajaxGet(url, onSuccess, onError){

	var x = new XMLHttpRequest();

	totalRequests++;

	x.onload = function() {
	    if (x.status == 200) {
			var products = JSON.parse(x.responseText);
	    	totalRequests = 0;
			onSuccess(products);
	    }
	    else{
	    	if(totalRequests < 4){
	    		ajaxGet(url, onSuccess, onError);
	    	}
	    	else{
				console.log("giving up after 3 requests");
				totalRequests = 0;
	    		onError(x.status);
	    	}
	    }
 	};
	x.ontimeout = function(){
		if(totalRequests<4){
			ajaxGet(url, onSuccess, onError);
			totalRequests ++;
		}
		else {
			console.log("timeout");
			totalRequests = 0;
    		onError(x.status);
		}
	};
	x.onerror = function(){
		if(totalRequests<4){
			ajaxGet(url, onSuccess, onError);
			totalRequests ++;
		}
		else {
			console.log("timeout");
			totalRequests = 0;
    		onError(x.status);
		}
	};

	x.timeout = 2000;
	x.open("GET", url, true);
	x.send();
}

function ajaxPost(url, data, onSuccess, onError){

	var postReq = new XMLHttpRequest();
	var jsonData = JSON.stringify(data);

	postReq.onload = function() {
	    if (postReq.status == 200) {
			var response = JSON.parse(postReq.responseText);
			onSuccess(response);
	    }
 	};

 	postReq.ontimeout = function(){
 		onError(postReq.status);
 	};

 	postReq.onerror = function(){
 		onError(postReq.status);
 	};
	
 	postReq.timeout = 2000;
	postReq.open("POST", url, true);
	postReq.setRequestHeader("Content-type", "application/json;charset=UTF-8");
	postReq.send(jsonData);
}

Store.prototype.syncWithServer = function syncWithServer(onSync){

	var self = this;

	if(onSync == null)
		ajaxGet(self.serverUrl + "/products", init, function(err){alert("we have error connecting." + err);enableButton();});
	else
		ajaxGet(self.serverUrl + "/products", findDelta, function(err){alert("Encountered Error " + err);enableButton();});


	function init(response){
		self.stock = response;
		updateDisplayed(response);
	}

	function findDelta(response){
		var delta = [];
		if(self.stock.length < 1){
			init(response);
		}
		for(var product in response){
			var priceChange = response[product].price - self.stock[product].price;
			if(priceChange != 0){
				//if there is a price change, create the product in delta and log the change
				delta[product] = {};
				delta[product].price  = priceChange;
			}

			//if the cart is not empty and it has this item in it
			if(self.cart != null && self.cart.hasOwnProperty(product)){
				var numChange = response[product].quantity - self.stock[product].quantity - self.cart[product];
				if(numChange != 0){
					//only create it if there is a quantity change and log it
					if(delta[product] == null){
						delta[product] = {};
					}
					delta[product].quantity = numChange;
				}
			}
			//cart does not have this item
			else{
				var numChange = response[product].quantity - self.stock[product].quantity;
				//only create it if there is a quantity change and log it
				if(numChange != 0){
					if(delta[product] == null){
						delta[product] = {};
					}
					delta[product].quantity = numChange;
				}
			}
		}

		for(var item in delta){
			//only update the price when there is a change
			if(delta[item].price != null)
				self.stock[item].price = self.stock[item].price + delta[item].price;

			//only update the price when there is a change
			if(delta[item].quantity != null){
				var newStock = delta[item].quantity + self.stock[item].quantity;

				if(delta[item].quantity > 0){
					//more number in stock
					self.stock[item].quantity = newStock;
				}
				else if(newStock < 0){
					var newCart = newStock + self.cart[item];
					//need to delete item from the user's cart
						//synced stock is 0, remove all item from the cart and zero the stock, alert the user
					if( newCart == 0 ){
						alert(item + " is not avaliable now.");
						self.stock[item].quantity = 0;
						delete self.cart[item];
					}
						//synced stock is less than what had before, only leave the rest in user's cart
					else{
						self.stock[item].quantity = 0;
						self.cart[item] = newCart;
					}
				}
				else if(newStock >= 0){
					if(newStock == 0)
						alert(item + " is not avaliable now.");
					//only need to decrease number in stock
					self.stock[item].quantity = newStock;
				}
			}
		}
		self.onUpdate();
		// console.log(store.onUpdate());// DO NOT DELETE!
		onSync(delta);
	}
}

function updateDisplayed(delta){
	var newDisplay = [];
	var i = 0;
	for(let item in delta){
		newDisplay[i] = item;
		i ++;
	}
	if(newDisplay.length != 0)
		displayed = newDisplay;
	renderProductList(document.getElementById("productView"), store, displayed);
}

store.syncWithServer(updateDisplayed);

function hideCart(){document.getElementById("modal").style.visibility = "hidden";}

function renderCart(container, storeInstance){
	var totalPrice = 0;
	var tbl = document.createElement("div");

	var modalHeader = document.createElement("div");
	modalHeader.className = "modal-header";

	var modalTitle = document.createElement("h2");
	var titleTxt = document.createTextNode("My Cart");
	modalTitle.appendChild(titleTxt);
	modalHeader.appendChild(modalTitle);


	var btnHideCart = document.createElement("button");
	var hideTxt = document.createTextNode("x");
	btnHideCart.appendChild(hideTxt);
	btnHideCart.id = "btn-hide-cart";
	btnHideCart.setAttribute("onclick", 'hideCart()');
	modalHeader.appendChild(btnHideCart);
	tbl.appendChild(modalHeader);

	for(let item in storeInstance.cart){
		var tblItem = document.createElement("div");
		tblItem.className = "tblItem";

		var d1 = document.createElement("div");
		var p1 = document.createElement("p");
		var txt = document.createTextNode(storeInstance.stock[item].label);
		p1.appendChild(txt);
		d1.appendChild(p1);
		d1.className = "columnLeft";
		tblItem.appendChild(d1);

		var d2 = document.createElement("div");
		d2.className = "columnRight";
		createPMBtn(storeInstance, d2, item, "-");
		var count = document.createTextNode(storeInstance.cart[item]);
		d2.appendChild(count);
		createPMBtn(storeInstance, d2, item, "+");
		tblItem.appendChild(d2);
		tbl.appendChild(tblItem);

		totalPrice += storeInstance.stock[item].price * storeInstance.cart[item];
	}
	var modalFooter = document.createElement("div");
	modalFooter.className = "modal-footer";

	var p = document.createElement("p");
	var price = document.createTextNode("Total Price: $"+totalPrice);
	price.className = "price";
	p.appendChild(price);
	modalFooter.appendChild(p);

	var checkOutBtn = document.createElement("button");
	checkOutBtn.id = "btn-check-out";
	var t = document.createTextNode("Check Out");
	checkOutBtn.appendChild(t);
	checkOutBtn.setAttribute("onclick", 'checkOutListener()');
	p.appendChild(checkOutBtn);
	
	tbl.appendChild(modalFooter);

	container.innerHTML = tbl.outerHTML;
	
	//BONUS: Hide the cart modal when the user presses esc key
	document.onkeyup = function (event) {
  		if (event.which == 27 || event.keyCode == 27) {
    		hideCart();
  		}
	};
}

function enableButton(){
	var e = document.getElementById("btn-check-out");
	e.removeAttribute("disabled");
}

function checkOutListener(){
	var e = document.getElementById("btn-check-out");
	e.setAttribute("disabled",true);
	store.checkOut();
}

function showCart(cart){
	document.getElementById("modal").style.visibility = "visible";
	renderCart(document.getElementById("modal-content"), store);
}

var inactiveTime = 0;

function inactivityTracker(){
	inactiveTime ++;
	if(inactiveTime >= 3){
		alert("Hi, are you still there?");
		inactiveTime = 0;
	}
}

function resetCount() {
    inactiveTime = 0;
}

function AddClickEventListeners(elements) {

    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('click', resetCount);
    }
}

function RemoveClickEventListeners(elements) {

    for (var i = 0; i < elements.length; i++) {
        elements[i].addEventListener('click', resetCount);
    }
}

//create buttons for the modal
function createPMBtn(storeInstance, pNode, itemName, text){
	var btn = document.createElement("button");
	var str = document.createTextNode(text);
	btn.appendChild(str);
	if(text == "+"){
		btn.className = "plusBtn";
		btn.setAttribute("onclick", "store.addItemToCart('"+itemName+"')");
	}
	else if(text == "-"){
		btn.className = "minusBtn";
		btn.setAttribute("onclick", "store.removeItemFromCart('"+itemName+"')");
	}
	pNode.appendChild(btn);
}

function createAddBtn(storeInstance, pNode, itemName){
	var addBtn = document.createElement("button");
	var addTxt = document.createTextNode("Add");
	addBtn.appendChild(addTxt);
	addBtn.className = "btn-add";
	addBtn.setAttribute("onclick", "store.addItemToCart('"+itemName+"')");
	pNode.appendChild(addBtn);
}

function createRemoveBtn(storeInstance, pNode, itemName){
	var removeBtn = document.createElement("button");
	var removeTxt = document.createTextNode("Remove");
	removeBtn.appendChild(removeTxt);
	removeBtn.className = "btn-remove";
	removeBtn.setAttribute("onclick", "store.removeItemFromCart('"+itemName+"')");
	pNode.appendChild(removeBtn);
}


function renderProduct(container, storeInstance, itemName){
	//create the list
	var newContainer = document.createElement("div");

	//add image src
	var img = document.createElement("img");
	img.className = "productImage";
	img.src = storeInstance.stock[itemName].imageUrl;
	newContainer.appendChild(img);

	//add price
	var divP = document.createElement("div");
	divP.className = "price";
	var sign = "$";
	var price = document.createTextNode(storeInstance.stock[itemName].price);
	divP.appendChild(price);
	newContainer.appendChild(divP);

	//add buttons

	//When there is stock avaliable and no product in cart, only render add button
	if(storeInstance.cart[itemName] == null && storeInstance.stock[itemName].quantity > 0){
		createAddBtn(storeInstance, newContainer, itemName);
	}
	//if stock is 0, and no item in cart
	else if(storeInstance.stock[itemName].quantity <= 0 && storeInstance.cart[itemName] == null){
		//not gonna render any button for unavaliable item.
	}
	//if stock is 0 but item is in the cart
	else if(storeInstance.stock[itemName].quantity == 0)
		createRemoveBtn(storeInstance, newContainer, itemName);
	//render both add and remove button
	else{
		createAddBtn(storeInstance, newContainer, itemName);
		createRemoveBtn(storeInstance, newContainer, itemName);
	}
	//add label
	var divN = document.createElement("div");
	var productName = document.createTextNode(storeInstance.stock[itemName].label);
	divN.appendChild(productName);
	divN.className = "productName";
	newContainer.appendChild(divN);

	container.innerHTML = newContainer.outerHTML;
}

/**
* Drew the whole list of products in the given container
* @param contianer 	placeholder, where the products will be placed.
* @param displayed	a array of keys of products to be draw.
**/

function renderProductList(container, storeInstance, displayed){
	var ul = document.createElement("ul");
	ul.id = "productList";

	//for each item in the displayed array, create a new li, append it to the ul and replace the content with productBox
	for(var i = 0; i < displayed.length; i ++){
		var productBox = document.createElement("li");
		ul.appendChild(productBox);
		ul.childNodes[i].id = "product-"+displayed[i];
		ul.childNodes[i].className = "product";
		renderProduct(ul.childNodes[i], storeInstance, displayed[i]);
	}
	container.innerHTML = ul.outerHTML;
}

window.onload = function() {
    // Add click event listeners to the cart buttons
    document.getElementById("btn-show-cart").addEventListener('click', resetCount);
    var addButtons = document.getElementsByClassName("btn-add");
    var removeButtons = document.getElementsByClassName("btn-remove");
    AddClickEventListeners(addButtons);
    RemoveClickEventListeners(removeButtons);
	renderProductList(document.getElementById("productView"), store, displayed);

    // setInterval(inactivityTracker, 30000);
}
