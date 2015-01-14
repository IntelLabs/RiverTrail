// Content script for prefs.

"use strict";

self.port.on("platform-data", function(platforms) {
    for (let i = 0; i < platforms.length; i++) {
        let name = platforms[i].name;
        let version = platforms[i].version;
        let vendor = platforms[i].vendor;
        let devices = platforms[i].deviceNames;
        let platformTable = document.getElementById("platforms");
        let platformRow = platformTable.insertRow(1); // insert first row after header row
        let buttonCell = platformRow.insertCell(0);
        let input = document.createElement("input");
        input.type = "radio";
        input.name = "platform";
        input.id = "platform_" + i;
        input.value = i;
        // Select the first item
        if (i == 0) {
            input.checked = "checked";
        }
        buttonCell.appendChild(input);
        let nameCell = platformRow.insertCell(1);
        let nameLabel = document.createElement("label");
        nameLabel.setAttribute("for", input.id);
        nameLabel.innerHTML = name;
        nameCell.appendChild(nameLabel);
        let versionCell = platformRow.insertCell(2);
        let versionLabel = document.createElement("label");
        versionLabel.setAttribute("for", input.id);
        versionLabel.innerHTML = version;
        versionCell.appendChild(versionLabel);
        let vendorCell = platformRow.insertCell(3);
        let vendorLabel = document.createElement("label");
        vendorLabel.setAttribute("for", input.id);
        vendorLabel.innerHTML = vendor;
        vendorCell.appendChild(vendorLabel);

        // Create an event listener that will repopulate device info
        // when a new platform is selected.  Device stuff gets
        // populated individually, per platform.
        platformRow.addEventListener('click', function onclick(event) {
            // If the clicked row isn't already selected...
            let input = platformRow.cells[0].getElementsByTagName("input")[0];
            if (!input.checked) {
                populateDevices(devices);
            }
        }, false);

        // Pre-populate device info for the currently selected platform.
        if (i == 0) {
            populateDevices(devices);
        }
    };
});

let button = document.getElementById("done");
button.addEventListener('click', function onclick(event) {

    // Send a message to hide the prefs panel.
    self.port.emit("button-clicked");

    let platforms = document.getElementsByName("platform");
    let devices = document.getElementsByName("device");

    // Send messages saying which platform and device were selected.
    for (let i = 0; i < platforms.length; i++) {
        if (platforms[i].checked) {
            self.port.emit("platform-selected", platforms[i].value);
        }
    }

    for (let i = 0; i < devices.length; i++) {
        if (devices[i].checked) {
            self.port.emit("device-selected", devices[i].value);
        }
    }

}, false);

function populateDevices(devices) {

    // First, get rid of any devices that are there.
    let deviceTable = document.getElementById("devices");
    for (let i = 0; i < deviceTable.rows.length; i++) {
        deviceTable.deleteRow(i);
    }

    // Now add the devices that should be there.
    for (let i = 0; i < devices.length; i++) {
        let type = devices[i].trim();
        if (devices[i] === "Unknown Device" || devices[i] === "") {
            continue;
        }
        let deviceRow = deviceTable.insertRow(0);
        let buttonCell = deviceRow.insertCell(0);
        let input = document.createElement("input");
        input.type = "radio";
        input.name = "device";
        input.id = "device_" + i;
        input.value = i;
        // Select the first item
        if (i == 0) {
            input.checked = "checked";
        }
        buttonCell.appendChild(input);
        let typeCell = deviceRow.insertCell(1);
        let label = document.createElement("label");
        label.setAttribute("for", input.id);
        label.innerHTML = type;
        typeCell.appendChild(label);
    }
}
