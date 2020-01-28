var buttons = document.getElementsByClassName("btn");
var canvas = document.getElementById("main");
var pictures = [];
var matchedWith = [];
var active = 0;

var myCanvas = document.getElementById("mainCanvas");
myCanvas.width = document.documentElement.clientWidth*.8;
myCanvas.height = (myCanvas.width * 1000 / 1500)*.8
myCanvas.addEventListener("mousedown", mouseClicked);
myCanvas.addEventListener("mousemove", mouseClicked);

window.addEventListener("resize", resizeCanvas, false);

function resizeCanvas(e) {
	var myCanvas = document.getElementById("mainCanvas");
	myCanvas.width = document.documentElement.clientWidth*.8;
	myCanvas.height = (myCanvas.width * 1000 / 1500)*.8;
};

function mouseClicked(e) {
	if(pictures[0]) {
		var can = document.getElementById("mainCanvas");
		var rect = can.getBoundingClientRect();
		e.getX = Math.floor((e.clientX - rect.left)*1500/can.width);
		e.getY = Math.floor((e.clientY - rect.top)*1000/can.height);
		var itemNum = Math.floor(e.getX/100) + Math.floor(e.getY/100)*10;
		if(e.getX > 0 && e.getX < 1000 && e.getY > 0 && e.getY < 1000) {
			active = itemNum;
			showAlbum();
		}
	}
	
}

var showAlbum = function() {
	var preCanvas = document.createElement("canvas");
	preCanvas.width = 1500;
	preCanvas.height = 1000;
	gfx = preCanvas.getContext("2d");
	gfx.fillStyle = "#ffffff";
	gfx.fillRect(0,0,1500,1000);
	for(let i = 0; i < 100; i++) {
		gfx.drawImage(pictures[i],0,0,pictures[i].width, pictures[i].height,(i%10)*100,Math.floor(i/10)*100, 100, 100);
	}
	let ratioH = 900/pictures[active].height;
	let ratioW = 500/pictures[active].width;
	let usedRatio = Math.min(ratioH, ratioW);
	gfx.drawImage(pictures[active],0,0,pictures[active].width, pictures[active].height,
				 1250-Math.floor(pictures[active].width/2*usedRatio),500-Math.floor(pictures[active].height/2*usedRatio),
				  pictures[active].width*usedRatio, pictures[active].height*usedRatio);
	gfx.fillStyle = "#000000";	
	gfx.font = "40px Arial";
	var text = "#" + (active+1) + " " + items[active];
	text = text.replace(/&#34;/g, "\"");
	text = text.replace(/&#39;/g, "\'");
	text = text.replace(/&amp;/g, "&");
	//console.log(text);
	gfx.fillText(text,1250-Math.min(gfx.measureText(text).width,480)/2,40,480);
	if(matchedWith[active]) {
		if(isNaN(matchedWith[active])) {
			gfx.fillText(matchedWith[active],1250-Math.min(gfx.measureText(matchedWith[active]).width,480)/2,1000,480);
		}
		else {
			gfx.fillText("Matched with #" + (matchedWith[active]+1),1250-Math.min(gfx.measureText("Matched with #" + (matchedWith[active]+1)).width,480)/2,1000,480);
		}
									 
	}
	
	var mainCan = document.getElementById("mainCanvas")
	
	mainCan.getContext("2d").drawImage(preCanvas,0,0,preCanvas.width, preCanvas.height,0,0,mainCan.width, mainCan.height);
}

var changeAlbum = function() {
	var albumNum = Number(this.innerHTML.substring(6,7));
	matchedWith = [];
	pictures = [];
	var loadedPic = 0;
	var loading = 0;
	for(let i = 0; i < 100; i++) {
		if(pictures[i]) continue;
		let found = false;
		for(let j = 0; j < albums[albumNum-1].length; j++) { 
			if(albums[albumNum-1][j].description && albums[albumNum-1][j].description.split(" ")[0].trim() == "#" + (i+1)) {
				found = true;
				loading++;
				if(albums[albumNum-1][j].description.split(" ")[1] && albums[albumNum-1][j].description.split(" ")[1].substring(0,1) == "#" && 
				   !isNaN(albums[albumNum-1][j].description.split(" ")[1].substring(1)) && 
				   parseInt(albums[albumNum-1][j].description.split(" ")[1].substring(1)) > 0 &&
				   parseInt(albums[albumNum-1][j].description.split(" ")[1].substring(1)) <= 100) {
					let match = parseInt(albums[albumNum-1][j].description.split(" ")[1].substring(1))-1;
					if(matchedWith[match]) {
						matchedWith[i] = "Failed Match with #" + (match+1) + ". Is matched with #" + (matchedWith[match]+1) + ".";
					}
					else {
						matchedWith[i] = match;
						matchedWith[match] = i;
						loading++;
						pictures[match] = document.createElement('img');
						pictures[match].setAttribute("src", albums[albumNum-1][j].baseUrl);
						pictures[match].onload = function() {
							loadedPic++;
							if(loadedPic == loading) showAlbum();
						}
					}
				}
				pictures[i] = document.createElement('img');
				pictures[i].setAttribute("src", albums[albumNum-1][j].baseUrl);
				pictures[i].onload = function() {
					loadedPic++;
					if(loadedPic == loading) showAlbum();
				}
			}
		}
		if(!found && !pictures[i]) {
			loading++;
			pictures[i] = document.createElement('img');
			pictures[i].setAttribute("src", notFound);
			pictures[i].onload = function() {
				loadedPic++;
				if(loadedPic == loading) showAlbum();
			}
		}
		
	}	
	//console.log(loading + " pictures requested")
}


// this.gfx = document.createElement('img');
// 		this.gfx.setAttribute("src", "AreaData/" + mapData[1 + (this.height)*5].substring(0,mapData[1 + (this.height)*5].length-4)+".png");
// 		this.gfx.onload = function() {
//         	// this.parent.finishedLoadingImage();
//         	this.isLoaded = true;
//         	this.createImage();
//         }.bind(this);

for(let i = 0; i < buttons.length; i++) {
	buttons[i].addEventListener('click',changeAlbum);
}

