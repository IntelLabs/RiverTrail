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
 *       River Trail Demo Configuration
 *       
 *       Feel free to edit the variables below.
 */

// Note: Particle counts must match the dropdown list. Suggestted value is 4000

// debug
var diagnose_keycode = false;

// keynote settings
var swap_implementation_key_code = 32;              //spacebar=32. For a full list: http://www.expandinghead.net/keycode.html


// text layout
var showfloor_titles_fontsize = "50px";             // set to 0px to hide titles
var showfloor_fps_fontsize = "50px";

// demo settings
var showfloor_default_particle_count = 4000;

// camera control
var demo_camera_mouse_power = 3;                    // good setting is 3 

// imagery settings
var particle_color = 0xff4a1a;                      // use hexidecimal
var particle_color_b = 0xfcfcaa;
var show_planet = true;
var show_moon = true;


// playback and controls
var play_pause_button = 80;                         // 80 for 'p'
var show_hide_controls = 67;                        // 67 for 'c'


/*
*        These are the settings used when Intel CTO Justin Rattner delivered his IDF Keynote speech. 
*        Kept for posterity, and in case you want to demo it with a nicer look.
*/

var is_keynote = true;

var display_linebreak = false;
var keynote_titles_fontsize = "60px";              // must be in unit px or pt 
var keynote_fps_fontsize = "60px";

var keynote_sequential_name = "Sequential";
var keynote_sequential_name_line_2 = "<br/>";       // to leave line 2 blank, use <br/> to fill the empty space
var keynote_paralell_name = "River Trail";
var keynote_paralell_name_line_2 = "<br/>";
var keynote_camera_mouse_power = 1;                 // good setting is 1 because of auto camera movement


var keynote_default_implementation = "parallel";    // options are parallel or sequential
var keynote_particle_count = 4000;


var keynote_camera_speed = .005;                    // good value is .001
