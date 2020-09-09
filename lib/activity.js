import { state } from "./state.js";

const root = "audio";
const users = "users_test";
const usersInRoom = new Map();

function displayActiveUsers() {
	state.gunDB
		.get(root)
		.get(users)
		.map((user) => (user.currentRoom === state.room ? user : undefined))
		.on(function (user, id) {
			console.log(id);
			if (user.state == "active") {
				usersInRoom.set(user.pid, user.state);
			} else {
				usersInRoom.delete(user.pid);
			}
			console.log(usersInRoom.size);
			if (usersInRoom.size > 1) {
				// usersCounter.textContent = usersInRoom.size + " users online";
			} else {
				// usersCounter.textContent = usersInRoom.size + " user online";
			}
		});
}

function setPresence(currentState, pid) {
	state.gunDB
		.get(root)
		.get(users)
		.get(pid)
		.put({ pid: pid, currentRoom: state.room, state: currentState });
}

export function init() {
	let pid = sessionStorage.getItem("pid");
	if (pid == null || pid == undefined) {
		pid = state.gunDB._.opt.pid;
		sessionStorage.setItem("pid", pid);
	}

	console.log(pid);

	window.onunload = window.onbeforeunload = function () {
		console.log("leaving " + pid);
		setPresence("left", pid);
	};

	window.onload = function () {
		console.log("entering " + pid);
		setPresence("active", pid);
	};

	displayActiveUsers();
}
