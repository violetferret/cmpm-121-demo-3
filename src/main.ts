// todo
import "./style.css";

const app: HTMLDivElement = document.querySelector("#app")!;

const gameName = "My Cool Game";
document.title = gameName;

const header = document.createElement("h1");
header.innerHTML = gameName;
app.append(header);

const button  = document.createElement("button");
button.innerHTML = "Click me!";
app.append(button);

button.addEventListener("click", function() {
    alert("You clicked me! :o");
})