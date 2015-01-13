// Content script for prefs.

var platforms = document.getElementsByName("platform");
var button = document.getElementById("done");

button.addEventListener('click', function onclick(event) {

    // Send a message to hide the prefs panel.
    self.port.emit("button-clicked");

    // Send a message saying which platform was selected.
    for (var j = 0; j < platforms.length; j++) {
        if (platforms[j].checked) {
            self.port.emit("platform-selected", platforms[j].value);
        }
    }

}, false);
