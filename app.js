/*
  Description:

  JavaScript code for the mbed GATT example app.

  Credits:

  ARM mbed [-_-]~

  http://mbed.org
*/

/**
 * Object that holds application data and functions.
 */
var app = {};

app.state = 0;

/**
 * Name of device to connect to.
 */
app.deviceName = 'Dave';

/**
 * state defines
 */
app.button2press = 6;
app.button1press = 5;
app.ledFastFlash2 = 4;
app.ledFastFlash1 = 3;
app.ledSlowFlash2 = 2;
app.ledSlowFlash1 = 1;
app.ledOFF  = 0;
app.ledON = 1;

app.numFalls = 1;

app.emailAddress = "michael.murphy@capgemini.com";

/**
 * Connected device.
 */
app.device = null;

/**
 * Initialise the application.
 */
app.initialize = function() {
    document.addEventListener(
	'deviceready',
	function() { evothings.scriptsLoaded(app.onDeviceReady) },
	false);
};

app.initialiseAccelerometer = function() {
    function onSuccess(acceleration) {
	app.accelerometerHandler(acceleration.x, acceleration.y, acceleration.z)
    }

    function onError(error) {
	console.log('Accelerometer error: ' + error)
    }

    navigator.accelerometer.watchAcceleration (
	onSuccess,
	onError,
	{ frequency: 50 }
    )
};

app.accelerometerHandler = function(accelerationX, accelerationY, accelerationZ) {
    function absGrav(x) {
	return (Math.abs(x) / 9.8)-1;
    }

    var grav = 9.81;
    var dx = absGrav(accelerationX);
    var dy = absGrav(accelerationY);
    var dz = absGrav(accelerationZ);
    document.getElementById("accInfo").innerHTML = "dx: " + dx + " ; dy: " + dy + " ; dz: " + dz;

    if(dx+dy+dz > 2){
	console.log(app.numFalls + " falls detected!!");
	app.numFalls++;
	app.onToggleButton();
	app.sendPost("Fall Detected");
    }
}

app.sendPost = function(postType) {
    console.log("Post Type: " + postType);
    console.log("Email Address: " + app.emailAddress);
    var url = "https://www.salesforce.com/servlet/servlet.WebToCase";
    var method = "POST";
    var postData = "?encoding=UTF-8&debug=1&orgid=00D24000000dWDe&origin=Web&Type=Debug"
	+"&subject=" + postType 
	+"&description=" + postType 
	+"&email="+ app.emailAddress;
    var async = false;
    var request = new XMLHttpRequest();

    request.onLoad = function() {
	var status = request.status;
	var data = request.responseText;
	console.log("response: " + data);
    }

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send(postData);
}

/**
 * When low level initialization complete, this function is called.
 */
app.onDeviceReady = function()
{
    // Report status.
    app.showInfo('Enter BLE device name and tap Connect');

    // Show the saved device name, if any.
    var name = localStorage.getItem('deviceName');
    if (name) {
	app.deviceName = name;
    }
    $('#deviceName').val(app.deviceName);

    // start accelerometer
    app.initialiseAccelerometer();
    console.log("Initialise accelerometer");
};

/**
 * Print debug info to console and application UI.
 */
app.showInfo = function(info)
{
    document.getElementById('info').innerHTML = info;
    console.log(info);
};

/**
 * Scan for device and connect.
 */
app.startScan = function()
{
    evothings.easyble.startScan(
	function(device)
	{
	    // Do not show un-named devices.
	    var deviceName = device.advertisementData ?
		device.advertisementData.kCBAdvDataLocalName : null
	    if (!device.name) { return }

	    // Print "name : mac address" for every device found.
	    console.log(device.name + ' : ' + device.address.toString().split(':').join(''))

	    // If my device is found connect to it.
	    if (device.hasName(app.deviceName))
	    {
		app.showInfo('Status: Device found: ' + deviceName);
		evothings.easyble.stopScan();
		app.connectToDevice(device);
	    }
	},
	function(error)
	{
	    app.showInfo('Error: startScan: ' + error);
	});
};

app.pollStatus = setInterval(function() {
    // read data from BLE device if connceted
    if(app.device != null) {
	app.device.readCharacteristic(
    	    '0000a001-0000-1000-8000-00805f9b34fb',
    	    function(data) {
		var view = new Uint8Array(data);
		document.getElementById("statusInfo").innerHTML = "Sent: " + app.state
		    + ", Current: " + view[0];
		if(view[0] == 4 || view[0] == 5) {
		    app.device.writeCharacteristic(
    			'0000a002-0000-1000-8000-00805f9b34fb',
    			0,
    			function() { console.log('LED toggled successfully!'); },
    			function(error) { console.log('LED toggle failed: ' + error); }
		    );
		    app.sendPost("Fall Alert Cancelled");
		}
	    }, 
	    function(error) {
    		console.log("Error: Read characteristic failed: " + error);
	    }
	);
    }
}, 500);

/**
 * Read services for a device.
 */
app.connectToDevice = function(device)
{
    app.showInfo('Status: Connecting...');
    device.connect(
	function(device) {
	    app.device = device;
	    app.showInfo('Status: Connected');
	    app.readServices(app.device);
	    app.pollStatus();
	},
	function(errorCode) {
	    app.showInfo('Error: Connection failed: ' + errorCode);
	});
};

/**
 * Dump all information on named device to the console
 */
app.readServices = function(device)
{
    // Read all services.
    device.readServices(
	null,
	function() {
	    console.log("readServices success");

	    // Debug logging of all services, characteristics and descriptors
	    // reported by the BLE board.
	    app.logAllServices(app.device);
	},
	function(error) {
	    console.log('Error: Failed to read services: ' + error);
	});
};

/**
 * when low level initialization complete,
 * this function is called
 */
app.onConnectButton = function() {
    // Get device name from text field.
    app.deviceName = $('#deviceName').val();
    app.emailAddress= $('#emailAddress').val();

    // Save it for next time we use the app.
    localStorage.setItem('deviceName', app.deviceName);

    // Call stop before you start, just in case something else is running.
    evothings.easyble.stopScan();
    evothings.easyble.closeConnectedDevices();

    // Only report devices once.
    evothings.easyble.reportDeviceOnce(true);

    // Start scanning.
    app.startScan();
    app.showInfo('Status: Scanning...');
};

/**
 * Toggle the LED on/off.
 */
app.onToggleButton = function() {
    function getRandomArbitrary(min, max) {
    	return Math.random() * (max - min) + min;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     * Using Math.round() will give you a non-uniform distribution!
     */
    function getRandomInt (min, max) {
    	return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    app.state = getRandomInt(0, 3);
    console.log("state: " + app.state);

    var ledState = new Uint8Array(1);

    /* for now just do this randomly */
    ledState[0] = app.state;

    app.device.writeCharacteristic(
    	'0000a002-0000-1000-8000-00805f9b34fb',
    	ledState,
    	function() { console.log('LED toggled successfully!'); },
    	function(error) { console.log('LED toggle failed: ' + error); }
    );

        // app.device.readCharacteristic(
	// '0000a001-0000-1000-8000-00805f9b34fb',
	// function(data)
	// {
	//     var view = new Uint8Array(data);
	//     var led = new Uint8Array(1);
	//     if(view[0] == app.ledON)
	//     {
	// 	$('#toggleButton').removeClass('green');
	// 	$('#toggleButton').addClass('red');
	// 	led[0] = app.ledOFF;
	//     }
	//     else if (view[0] == app.ledOFF)
	//     {
	// 	$('#toggleButton').removeClass('red');
	// 	$('#toggleButton').addClass('green');
	// 	led[0] = app.ledON;
	//     }
	//     app.device.writeCharacteristic(
	// 	'0000a002-0000-1000-8000-00805f9b34fb',
	// 	led,
	// 	function() { console.log('LED toggled successfully!') },
	// 	function(error) { console.log('LED toggle failed: ' + error) });

	// },
	// function(error)
	// {
	//     console.log('Error: Read characteristic failed: ' + error);
	// });
    // app.device.readCharacteristic(
    // 	'0000a001-0000-1000-8000-00805f9b34fb',
    // 	function(data)
    // 	{

    // 	    //console.log(data);

    // 	    /**
    // 	     * Returns a random number between min (inclusive) and max (exclusive)
    // 	     */
    // 	    function getRandomArbitrary(min, max) {
    // 		return Math.random() * (max - min) + min;
    // 	    }

    // 	    /**
    // 	     * Returns a random integer between min (inclusive) and max (inclusive)
    // 	     * Using Math.round() will give you a non-uniform distribution!
    // 	     */
    // 	    function getRandomInt (min, max) {
    // 		return Math.floor(Math.random() * (max - min + 1)) + min;
    // 	    }


    // 	    app.state = getRandomInt(0, 3);
    // 	    console.log("state: " + app.state);

    // 	    var view = new Uint8Array(data);
    // 	    var ledState = new Uint8Array(1); // 7 states
    // 	    if(view[0] == 0)
    // 	    {
    // 		$('#toggleButton').removeClass('green');
    // 		$('#toggleButton').addClass('red');
		
    // 		/* do this randomlyl for now */
    // 		ledState[0] = app.state;
    // 	    }
    // 	    else if (view[0] != 0)
    // 	    {
    // 		$('#toggleButton').removeClass('red');
    // 		$('#toggleButton').addClass('green');

    // 		/* for now just do this randomly */
    // 		ledState[0] = app.state;
    // 	    }
    // 	    app.device.writeCharacteristic(
    // 		'0000a002-0000-1000-8000-00805f9b34fb',
    // 		ledState,
    // 		function() { console.log('LED toggled successfully!'); },
    // 		function(error) { console.log('LED toggle failed: ' + error); }
    // 	    );
	    
    // 	    document.getElementById("statusInfo").innerHTML = "Sent: " + app.state
    // 		+ ", Received: " + view[0];
    // 	},
    // 	function(error)
    // 	{
    // 	     console.log("Error: Read characteristic failed: " + error);
    // 	});
}

/**
 * Debug logging of found services, characteristics and descriptors.
 */
app.logAllServices = function(device)
{
    // Here we simply print found services, characteristics,
    // and descriptors to the debug console in Evothings Workbench.

    // Notice that the fields prefixed with "__" are arrays that
    // contain services, characteristics and notifications found
    // in the call to device.readServices().

    // Print all services.
    console.log('Found services:');
    for (var serviceUUID in device.__services)
    {
	var service = device.__services[serviceUUID];
	console.log('  service: ' + service.uuid);

	// Print all characteristics for service.
	for (var characteristicUUID in service.__characteristics)
	{
	    var characteristic = service.__characteristics[characteristicUUID];
	    console.log('    characteristic: ' + characteristic.uuid);

	    // Print all descriptors for characteristic.
	    for (var descriptorUUID in characteristic.__descriptors)
	    {
		var descriptor = characteristic.__descriptors[descriptorUUID];
		console.log('      descriptor: ' + descriptor.uuid);
	    }
	}
    }
};

// Initialize the app.
app.initialize();
