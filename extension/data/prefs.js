// Content script for prefs.

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
            // First, get rid of everything that's there
            let deviceTable = document.getElementById("devices");
            // j = 1 because we shouldn't delete the header row.
            for (let j = 1; j < deviceTable.rows.length; j++) {
                deviceTable.deleteRow(j);
            }

            // Now add the devices that should be there.
            for (let j = 0; j < devices.length; j++) {
                let type = devices[j].trim();
                let deviceRow = deviceTable.insertRow(1); // insert after header row
                let buttonCell = deviceRow.insertCell(0);
                let input = document.createElement("input");
                input.type = "radio";
                input.name = "device";
                input.id = "device_" + j;
                input.value = j;
                // Select the first item
                if (j == 0) {
                    input.checked = "checked";
                }
                buttonCell.appendChild(input);
                let typeCell = deviceRow.insertCell(1);
                let label = document.createElement("label");
                label.setAttribute("for", input.id);
                label.innerHTML = type;
                typeCell.appendChild(label);
            }
        }, false);
    };
});

var button = document.getElementById("done");
button.addEventListener('click', function onclick(event) {

    // Send a message to hide the prefs panel.
    self.port.emit("button-clicked");

    var platforms = document.getElementsByName("platform");
    var devices = document.getElementsByName("device");

    // Send a message saying which platform and device were selected.
    for (var j = 0; j < platforms.length; j++) {
        if (platforms[j].checked) {
            self.port.emit("platform-selected", platforms[j].value);
        }
    }

    for (var j = 0; j < devices.length; j++) {
        if (devices[j].checked) {
            self.port.emit("device-selected", devices[j].value);
        }
    }

}, false);
