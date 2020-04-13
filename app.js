const express = require("express");
const app = express();
const config = require('./config.js');
const session = require('express-session');
const request = require('request-promise');
const server = require('http').Server(app);       //  Used for creating sockets for open communication between the client and the server
const io = require('socket.io')(server);          //  ^

// const fs = require('fs');
// const readline = require('readline');
// const {google} = require('googleapis');


// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// const TOKEN_PATH = 'token.json';

app.use(express.static(__dirname + '/js'));

app.set("view engine", "ejs");

// Set up OAuth 2.0 authentication through the passport.js library.
const passport = require('passport');
const auth = require('./auth');
auth(passport);

// Set up a session middleware to handle user sessions.
// NOTE: A secret is used to sign the cookie. This is just used for this sample
// app and should be changed.
const sessionMiddleware = session({
  resave: true,
  saveUninitialized: true,
  secret: 'photo frame sample',
});

// Enable user session handling.
app.use(sessionMiddleware);
app.use('/images', express.static(__dirname + '/images'));

// Set up passport and session handling.
app.use(passport.initialize());
app.use(passport.session());

var sessions = {};
var items = [];


app.get("/", async(req, res) => {
	//console.log(req.user);
	if(req.user) {
		sessions[req.user.profile.id] = {};
		sessions[req.user.profile.id].albumIds = [];
		sessions[req.user.profile.id].scores = [];
		sessions[req.user.profile.id].photos = [];
		sessions[req.user.profile.id].token = req.user.token;
		const data = await libraryApiGetAlbums(req.user.token);
		for(var i = 0; i < data.albums.length; i++) {
			if(data.albums[i].title.substring(0,5) == "Group")
				sessions[req.user.profile.id].albumIds[parseInt(data.albums[i].title.substring(6,7)) - 1] = data.albums[i].id;
		}
		//console.log(sessions[req.user.profile.id].albumIds[0]);
		pullPhotos(req.user.profile.id, function() {
			res.redirect("/album")
		});
		
		//res.redirect("album");
		// console.log(req.user.token);
		
		
		//const filters = {contentFilter: {}, mediaTypeFilter: {mediaTypes: ['PHOTO']}};
		//const parameters = {filters};
		//const parameters = {albumId:data.albums[0].id};
		//const data1 = await libraryApiSearch(req.user.token, parameters);
		//const data2 = await getOnePhoto(req.user.token, data1.photos[0].id);
		//res.send(data2);
		//console.log(data1);
	}
	else	
	res.render("intro");
});

app.get("/photo/:num", async(req, res) => { 
	if(Number(req.params.num) < 1) {
		res.redirect("/photo/100");
	}
	else if(Number(req.params.num) > 100) {
		res.redirect("/photo/1");
	}
	else {
		readFromGoogle(function() {
			var photos = [];
			var matchedWith = [];
			var returnCount = 0;
			//console.log(sessions[req.user.profile.id].photos[0][0]);
			for(let i = 0; i < 6; i++) {
				photos[i] = sessions[req.user.profile.id].photos[i][req.params.num-1];
				if(!isNaN(sessions[req.user.profile.id].matchedWith[i][req.params.num-1])) {
					matchedWith[i] = "Matched with #" + (sessions[req.user.profile.id].matchedWith[i][req.params.num-1]+1) + " " + (getItem(sessions[req.user.profile.id].matchedWith[i][req.params.num-1]+1)); 
				}
			}
			var items = [];
			for(let i = 0; i < 100; i++) {
				items[i] = getItem(i+1);
			}

		res.render("photo", {photos:photos, page:req.params.num, items:items, scores:sessions[req.user.profile.id].scores, matchedWith:matchedWith, id:req.user.profile.id, fullMatchedWith:sessions[req.user.profile.id].matchedWith});
		});
	}
});

app.get("/album", async(req,res) => {
	var albums = [];
	var items = [];
	var returnCount = 0;
	readFromGoogle( function() {
		for(let i = 0; i < 100; i++) {
			items[i] = getItem(i+1);
		}
		for(let i = 0; i < 6; i++) {
			const parameters = {albumId:sessions[req.user.profile.id].albumIds[i]};

			libraryApiSearch(req.user.token, parameters, function(data) {
				var found = false;
				returnCount++;
				if(parameters.albumId) {
					albums[i] = [];
					for(let j = 0; j < data.photos.length; j++) {
						if(data.photos[j].description) 
							albums[i][j] = {baseUrl:data.photos[j].baseUrl, description:data.photos[j].description.trim()};
						else
							albums[i][j] = {baseUrl:data.photos[j].baseUrl, description:""};
						albums[i][j].description = albums[i][j].description.replace("\n", " ");

					}
				}
				if(returnCount == 6) {
					res.render("album", {albums:albums, notFound: "https://f4.bcbits.com/img/a0252633309_16.jpg", items:items});
				}

			});



		}
	});
	//res.render("album", {albums:[]});
});
		
// Star the OAuth login process for Google.
app.get('/auth/google', passport.authenticate('google', {
  scope: config.scopes,
  failureFlash: true,  // Display errors to the user.
  session: true,
}));

// Callback receiver for the OAuth process after log in.
app.get(
    '/auth/google/callback',
    passport.authenticate(
        'google', {failureRedirect: '/', failureFlash: true, session: true}),
    (req, res) => {
      // User has logged in.
      //logger.info('User has logged in.');
      res.redirect('/');
    });
 app.get("/auth/googlesheets/callback", (req,res) => {
	 res.send("Got Here");
 });

app.get('/logout', (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

server.listen(process.env.PORT || 3000, process.env.IP, () => {
    console.log('Server is running on port 3000');
});

function pullPhotos(id, callback) {
	//console.log("Starting pull photos");
	var albums = [];
	var returnCount = 0;
	for(let alb = 0; alb < 6; alb++) {
		const parameters = {albumId:sessions[id].albumIds[alb]};

		libraryApiSearch(sessions[id].token, parameters, function(data) {
			let found = false;
			let newPhotos = [];
			let newMatchedWith = [];
	
			if(!parameters.albumId) data.photos = [];
	
			returnCount++;
			albums[alb] = [];
			for(let j = 0; j < data.photos.length; j++) {
				if(data.photos[j].description) 
					albums[alb][j] = {baseUrl:data.photos[j].baseUrl, description:data.photos[j].description.trim()};
				else
					albums[alb][j] = {baseUrl:data.photos[j].baseUrl, description:""};
				albums[alb][j].description = albums[alb][j].description.replace("\n", " ");
			}
			
			for(let i = 0; i < 100; i++) {
				if(newPhotos[i]) continue;
				let found = false;
				for(let j = 0; j < albums[alb].length; j++) { 
					if(albums[alb][j].description && albums[alb][j].description.split(" ")[0].trim() == "#" + (i+1)) {
						found = true;
						if(albums[alb][j].description.split(" ")[1] && albums[alb][j].description.split(" ")[1].substring(0,1) == "#" && 
						   !isNaN(albums[alb][j].description.split(" ")[1].substring(1)) && 
						   parseInt(albums[alb][j].description.split(" ")[1].substring(1)) > 0 &&
						   parseInt(albums[alb][j].description.split(" ")[1].substring(1)) <= 100) {
							let match = parseInt(albums[alb][j].description.split(" ")[1].substring(1)) - 1;
							if(newMatchedWith[match]) {
								newMatchedWith[i] = "Failed Match with #" + (match+1) + ". Is matched with #" + (newMatchedWith[match]+1) + ".";
							}
							else {
								newMatchedWith[i] = match;
								newMatchedWith[match] = i;
								newPhotos[match] = albums[alb][j].baseUrl;
							}
						}
						newPhotos[i] = albums[alb][j].baseUrl;
					}
				}
				if(!found && !newPhotos[i]) {
					newPhotos[i] = "https://f4.bcbits.com/img/a0252633309_16.jpg";
				}
			}
			if(!sessions[id].photos) sessions[id].photos = [];
			if(!sessions[id].photos[alb]) sessions[id].photos[alb] = [];
			if(!sessions[id].matchedWith) sessions[id].matchedWith = [];
			if(!sessions[id].matchedWith[alb]) sessions[id].matchedWith[alb] = [];
			if(!sessions[id].scores) sessions[id].scores = [];
			if(!sessions[id].scores[alb]) sessions[id].scores[alb] = [];
			
			for(let review = 0; review < 100; review++) {
				if(sessions[id].photos[alb][review] != newPhotos[review]) {
					sessions[id].scores[alb][review] = 0;
				}
				sessions[id].photos[alb][review] = newPhotos[review];
				sessions[id].matchedWith[alb][review] = newMatchedWith[review];
			}
			if(returnCount == 6) {
				callback();
			}
		});
	}
}

io.on('connection', function(socket) {
	socket.on('change score', function(data) {
		if(!sessions[data.id].scores) sessions[data.id].scores = [];
		if(!sessions[data.id].scores[data.group]) sessions[data.id].scores[data.group] = [];
		sessions[data.id].scores[data.group][data.photo] = data.score;
		
		if(data.score == "2") {
			sessions[data.id].scores[data.group][sessions[data.id].matchedWith[data.group][data.photo]] = 1;
		}
		socket.emit('update score', {scores:sessions[data.id].scores, matchedWith:sessions[data.id].matchedWith});
	})
	
	socket.on('pull photos', function(id) {
		pullPhotos(id.id, function() {
			socket.emit("refresh");
		})
	});
	
});;

async function libraryApiGetAlbums(authToken) {
  let albums = [];
  let nextPageToken = null;
  let error = null;
  let parameters = {pageSize: config.albumPageSize};

  try {
    // Loop while there is a nextpageToken property in the response until all
    // albums have been listed.
    do {
      //logger.verbose(`Loading albums. Received so far: ${albums.length}`);
      // Make a GET request to load the albums with optional parameters (the
      // pageToken if set).
      const result = await request.get(config.apiEndpoint + '/v1/albums', {
        headers: {'Content-Type': 'application/json'},
        qs: parameters,
        json: true,
        auth: {'bearer': authToken},
      });
		// console.log("/////////")
		// console.log(parameters);
		// console.log("/////////")
		// console.log(result);
      //logger.debug(`Response: ${result}`);

      if (result && result.albums) {
        //logger.verbose(`Number of albums received: ${result.albums.length}`);
        // Parse albums and add them to the list, skipping empty entries.
        const items = result.albums.filter(x => !!x);

        albums = albums.concat(items);
      }
      parameters.pageToken = result.nextPageToken;
      // Loop until all albums have been listed and no new nextPageToken is
      // returned.
    } while (parameters.pageToken != null);

  } catch (err) {
    // If the error is a StatusCodeError, it contains an error.error object that
    // should be returned. It has a name, statuscode and message in the correct
    // format. Otherwise extract the properties.
    error = err.error.error ||
        {name: err.name, code: err.statusCode, message: err.message};
    //logger.error(error);
  }

  //logger.info('Albums loaded.');
  return {albums, error};
}

async function libraryApiSearch(authToken, parameters, callback) {
  let photos = [];
  let nextPageToken = null;
  let error = null;

  parameters.pageSize = config.searchPageSize;

  try {
    // Loop while the number of photos threshold has not been met yet
    // and while there is a nextPageToken to load more items.
    do {
      //logger.info(
        //  `Submitting search with parameters: ${JSON.stringify(parameters)}`);

      // Make a POST request to search the library or album
      const result =
          await request.post(config.apiEndpoint + '/v1/mediaItems:search', {
            headers: {'Content-Type': 'application/json'},
            json: parameters,
            auth: {'bearer': authToken},
          });

      //logger.debug(`Response: ${result}`);

      // The list of media items returned may be sparse and contain missing
      // elements. Remove all invalid elements.
      // Also remove all elements that are not images by checking its mime type.
      // Media type filters can't be applied if an album is loaded, so an extra
      // filter step is required here to ensure that only images are returned.
		//console.log(result);
      const items = result && result.mediaItems ?
          result.mediaItems
              .filter(x => x)  // Filter empty or invalid items.
              // Only keep media items with an image mime type.
              .filter(x => x.mimeType && x.mimeType.startsWith('image/')) :
          [];

      photos = photos.concat(items);

      // Set the pageToken for the next request.
      parameters.pageToken = result.nextPageToken;

      // logger.verbose(
      //     `Found ${items.length} images in this request. Total images: ${
      //         photos.length}`);

      // Loop until the required number of photos has been loaded or until there
      // are no more photos, ie. there is no pageToken.
    } while (photos.length < config.photosToLoad &&
             parameters.pageToken != null);

  } catch (err) {
    // If the error is a StatusCodeError, it contains an error.error object that
    // should be returned. It has a name, statuscode and message in the correct
    // format. Otherwise extract the properties.
    error = err.error.error ||
        {name: err.name, code: err.statusCode, message: err.message};
    //logger.error(error);
  }

  //logger.info('Search complete.');
	if(callback) callback({photos, parameters, error});
	else
  return {photos, parameters, error};
}

async function getOnePhoto(authToken, id) {
	let photo;
	try {
		const result = await request.get(config.apiEndpoint + '/v1/mediaItems/' + id, {
		 headers: {'Content-Type': 'application/json'},
		 auth: {'bearer': authToken},
		 });

		//console.log(result);
		photo = result;

	} catch (err) {
    
    error = err.error.error ||
        {name: err.name, code: err.statusCode, message: err.message};
    //logger.error(error);
  }
	return photo;
	
}

function getItem(num) {
	//return "It's a secret until the Easter!"
	return items[num];
	// if(num == 1) return	"A Blue Slide";
	// if(num == 2) return "A Satellite Dish";
	// if(num == 3) return "A Poinsettia";
	// if(num == 4) return "\"Smokes Tbone Slump\" grafitti";
	// if(num == 5) return "A Nativity Scene";
	// if(num == 6) return "Entrada";
	// if(num == 7) return "A Doctor/Dentist Office";
	// if(num == 8) return "FACP Inside";
	// if(num == 9) return "Student Station";
	// if(num == 10) return "A Tree with little to no leaves";
	// if(num == 11) return "A Palm Tree";
	// if(num == 12) return "Taipei Café";
	// if(num == 13) return "Letter To Santa";
	// if(num == 14) return "No Golfing";
	// if(num == 15) return "Use Other Door";
	// if(num == 16) return "A Green Water Fountain";
	// if(num == 17) return "Police next to Fire Dept";
	// if(num == 18) return "2-Person Chest Press";
	// if(num == 19) return "A Nutcracker";
	// if(num == 20) return "License Plate 4MM1449";
	// if(num == 21) return "Icicle Christmas Lights";
	// if(num == 22) return "No Outlet";
	// if(num == 23) return "Deflated Christmas Decorations";
	// if(num == 24) return "A Manhole Cover";
	// if(num == 25) return "Be Kind";
	// if(num == 26) return "Locker 492";
	// if(num == 27) return "Private Property";
	// if(num == 28) return "A Padlock";
	// if(num == 29) return "Rowland Elementary School";
	// if(num == 30) return "Not A Through Street";
	// if(num == 31) return "A Security Camera";
	// if(num == 32) return "A Green Basketball Court";
	// if(num == 33) return "A Liquor Store (from the outside!!)";
	// if(num == 34) return "Tobacco Free Facility";
	// if(num == 35) return "A Large White Cross";
	// if(num == 36) return "End County Maintenance Road";
	// if(num == 37) return "A Stone Bench (without a table attached)";
	// if(num == 38) return "A Fire Hydrant";
	// if(num == 39) return "A Florist";
	// if(num == 40) return "Princess Leah";
	// if(num == 41) return "An \"End\" Sign";
	// if(num == 42) return "A Frog Near A Snail";
	// if(num == 43) return "An Empty Lot";
	// if(num == 44) return "A Messy Front Yard";
	// if(num == 45) return "Room C4";
	// if(num == 46) return "The Christian Flag";
	// if(num == 47) return "Blandford Elementary";
	// if(num == 48) return "An Apartment Building";
	// if(num == 49) return "No Dumping";
	// if(num == 50) return "A Payphone";
	// if(num == 51) return "A Canopy That Says \"Security\"";
	// if(num == 52) return "Christmas Bells";
	// if(num == 53) return "A Parking Spot for Paris Yu";
	// if(num == 54) return "A door with both a door knob and a door handle";
	// if(num == 55) return "A Boat";
	// if(num == 56) return "Beware of Dog";
	// if(num == 57) return "18222";
	// if(num == 58) return "La Guardia & Sierra Leone";
	// if(num == 59) return "Peter Lin\'s School Picture";
	// if(num == 60) return "A White Fence";
	// if(num == 61) return "\"Southland\" (no s on the end)";
	// if(num == 62) return "Ms. Aguirre\'s Room";
	// if(num == 63) return "A Gas Station";
	// if(num == 64) return "A BBQ Grill";
	// if(num == 65) return "All You Can Eat";
	// if(num == 66) return "Birds Of Paradise";
	// if(num == 67) return "A Sundial";
	// if(num == 68) return "A Building with a Rectangular Roof";
	// if(num == 69) return "23 above 15";
	// if(num == 70) return "A Wreath On A Door";
	// if(num == 71) return "An Anti-Bully Poster";
	// if(num == 72) return "Ball Diamond Rental";
	// if(num == 73) return "Dolphins";
	// if(num == 74) return "Red Bricks That Don\'t Follow the Placement Pattern";
	// if(num == 75) return "A Shopping Cart";
	// if(num == 76) return "Rowland Pony Baseball";
	// if(num == 77) return "A Pothole";
	// if(num == 78) return "A Basketball Hoop In The Front Yard";
	// if(num == 79) return "A Covered Vehicle";
	// if(num == 80) return "A Two-Story House";
	// if(num == 81) return "A Storage Shed";
	// if(num == 82) return "\"Excellence\" Banner";
	// if(num == 83) return "A Blue Prius";
	// if(num == 84) return "Room 80";
	// if(num == 85) return "Santa Ysabela";
	// if(num == 86) return "A picture that has at least 100 people";
	// if(num == 87) return "Los Padres & Farjardo";
	// if(num == 88) return "Jeff Annoreno Fitness Center";
	// if(num == 89) return "A Blue Trashcan";
	// if(num == 90) return "First-Time Visitor";
	// if(num == 91) return "A Mural With Birds";
	// if(num == 92) return "A Tree with Candy Cane Decorations";
	// if(num == 93) return "Going Out Of Business";
	// if(num == 94) return "Cactus";
	// if(num == 95) return "Men's & Women's Bathroom next to each other";
	// if(num == 96) return "A Scarecrow";
	// if(num == 97) return "A Soccer Goal";
	// if(num == 98) return "Huskee";
	// if(num == 99) return "18500";
	// if(num == 100) return "*Take a photo with your ENTIRE team and an SCS Main Office worker*";
	// return "";
}

////////////////////////////////////Read from google sheets stuff

//readFromGoogle();

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
function readFromGoogle(callback) {
	fs.readFile('credentials.json', (err, content) => {
	  if (err) return console.log('Error loading client secret file:', err);
	  // Authorize a client with credentials, then call the Google Sheets API.
	  authorize(JSON.parse(content), refreshItems, callback);
	});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, callback2) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, callback2);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function refreshItems(auth, callback) {
	const sheets = google.sheets({version: 'v4', auth});
	sheets.spreadsheets.values.get({
    	spreadsheetId: '1o47nGn3lv07RqsrbT3dOjxiJrx4NI315ranAe5Wx3Vo',
    	range: 'Combined!A3:H27',
	}, (err, res) => {
    	if (err) return console.log('The API returned an error: ' + err);
    	const rows = res.data.values;
    	if (rows.length) {
			for(var i = 0; i < rows.length; i++) {
				items[parseInt(rows[i][0].substring(1))] = rows[i][1];
				items[parseInt(rows[i][2].substring(1))] = rows[i][3];
				items[parseInt(rows[i][4].substring(1))] = rows[i][5];
				items[parseInt(rows[i][6].substring(1))] = rows[i][7];
			}
    	} else {
      	console.log('No data found.');
    	}
		if(callback) callback();
  	});
}