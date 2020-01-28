var socket = io.connect({transports: ['websocket']});

function changeScore() {
	socket.emit("change score", {photo:this.id.split(" ")[0], group:this.id.split(" ")[1], score:this.id.split(" ")[2], id:id})
}

function updatePhotos() {
	socket.emit("pull photos", {id:id});
}

document.getElementById("update").addEventListener("click", updatePhotos);

var buttons = document.getElementsByClassName("score");

for(let i = 0; i < buttons.length; i++) {
	buttons[i].addEventListener("click", changeScore);
}



socket.on("update score", function(data) {
	scores = data.scores;
	var sums = [];
	for(let i = 0; i < 6; i++) {
		sums[i] = 0;
		for(let j = 0; j < 100; j++) {
			if(scores[i] && scores[i][j])
				sums[i] += Number(scores[i][j]);
		}
	}
	document.getElementById("score1").innerHTML = sums[0];
	document.getElementById("score2").innerHTML = sums[1];
	document.getElementById("score3").innerHTML = sums[2];
	document.getElementById("score4").innerHTML = sums[3];
	document.getElementById("score5").innerHTML = sums[4];
	document.getElementById("score6").innerHTML = sums[5];
	var modalScores = document.getElementsByClassName("modalScore");
	console.log(modalScores.length);
	for(let i = 0; i < modalScores.length; i++) {
		modalScores[i].innerHTML = scores[modalScores[i].id.split(" ")[0]][modalScores[i].id.split(" ")[1]];
		if(modalScores[i].innerHTML == 2) {
			modalScores[i].innerHTML += " (#" + data.matchedWith[modalScores[i].id.split(" ")[0]][modalScores[i].id.split(" ")[1]]+")"
		}
	}
	
});

socket.on("refresh", function() {
	window.location.reload(true);
});
