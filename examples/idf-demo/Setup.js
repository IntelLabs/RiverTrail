/*
 * Copyright (c) 2011, Intel Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

/*
*   Setup.js
*
*   @description performs actions based on config.js to customize the look, 
*                feel and controls of the demo.
*
*   @author vance@fashionbuddha.com
*
*/


function runConfig() {

    document.getElementById("keynote-display").innerHTML =

    "<div class='keynote-text' ><div id='sequential-display' style='opacity:.4;' onclick='goSequential();'>" + keynote_sequential_name + "<br/>" + keynote_sequential_name_line_2 + "</div>" +

    "<div id='parallel-display' onclick='goParallel()' style=''>&nbsp;" + keynote_paralell_name + "<br/>" + keynote_paralell_name_line_2 + "</div></div>";

    if (display_linebreak == true) {
        document.getElementById("sequential-display").style.display = "inherit";
        document.getElementById("parallel-display").style.display = "inherit";
    }


    if (is_keynote == true) {

        selectOption(keynote_particle_count);
        document.getElementById("fps-display").style.fontSize = "120px";
        implementation = keynote_default_implementation;


        // hide the controls
        document.getElementById("controls").style.display = "none";

        // start everything up automagically
        NBody.init(keynote_default_implementation);

        document.getElementById("sequential-display").style.fontSize = keynote_titles_fontsize;
        document.getElementById("parallel-display").style.fontSize = keynote_titles_fontsize;
        document.getElementById("fps-display").style.fontSize = keynote_fps_fontsize;


        camXPower = keynote_camera_mouse_power;

    } else {

        selectOption(showfloor_default_particle_count);
        camXPower = demo_camera_mouse_power;

        document.getElementById("sequential-display").style.marginTop = "60px";
        document.getElementById("sequential-display").style.fontSize = showfloor_titles_fontsize;

        document.getElementById("sequential-display").style.fontSize = showfloor_titles_fontsize;
        document.getElementById("parallel-display").style.fontSize = showfloor_titles_fontsize;
        document.getElementById("fps-display").style.fontSize = showfloor_fps_fontsize;
    }




    toggleImplementationDisplay();
}


function goSequential() {
    toggleImplementation("sequential");
    toggleImplementationDisplay();
}

function goParallel() {

    toggleImplementation("parallel");
    toggleImplementationDisplay();
}


function selectOption(num) {
    var dropdown = document.getElementById('bodies');

    for (var i = 0; i < dropdown.options.length; i++) {

        if (dropdown.options[i].text == String(num))
            dropdown.selectedIndex = i;
    }

}


window.onkeydown = function (e) {

    var code;
    if (!e) var e = window.event;

    if (e.keyCode) code = e.keyCode;
    else if (e.which) code = e.which;

    if (code == Number(swap_implementation_key_code)) {

        toggleImplementation();
        toggleImplementationDisplay();
    }

    if (code == play_pause_button)
        if (NBody.private.stop == true) NBody.resume(); else NBody.pause();

    if (code == show_hide_controls)
        if (document.getElementById("controls").style.display == "none")
            document.getElementById("controls").style.display = "inline-block";
        else
            document.getElementById("controls").style.display = "none";

    if (diagnose_keycode == true)
        alert("keycode: " + code);
    
}

function toggleImplementationDisplay() {

  
        if (implementation == "parallel") {

            document.getElementById("sequential-display").style.opacity = .4;
            document.getElementById("parallel-display").style.opacity = 1;
        } else {
            document.getElementById("sequential-display").style.opacity = 1;
            document.getElementById("parallel-display").style.opacity = .4;
        }
    

 }


 function toggleImplementation(imp) {


     if (imp) 
         implementation = imp;
     else if (implementation == "parallel")
         implementation = "sequential";
     else if (implementation == "sequential")
         implementation = "parallel";

     NBody.init(implementation);
 }

