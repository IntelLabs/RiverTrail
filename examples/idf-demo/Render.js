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
*   Render.js
*
*   @description Initialize and update the OGL scene. Utilizes the Three.js libray. Thanks primarily to mrdoob. 
*   https://github.com/mrdoob/three.js/
*
*   @author vance@fashionbuddha.com
*
*/



// main parent for render context
var container;

var camera, wallLeft, wallRight, scene, rightTargetTexture, leftTargetTexture, sceneCube, renderer, particles, geometry, materials = [], parameters, i, h, color;


var geometry, group,  cube;

// track the mouse
var mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', onDocumentMouseMove, false);

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var hasInit = false;

var renderParticles = new Array();

// one system for each color
var particles;
var particlesB;
var particleSystem;
var particleSystemB;

// intro tube
var cylinder;

var earthContainer;

// determines orbit radius of camera if orbiting is enabled
var cameraRadius;

// an easing value to smooth out the transition from automated  camera movement to mouse control
var transitionMouse;

function initRender(isReset) {

    if( isReset == true ) {
        time = 0;
        cameraRadius = 10000;
        transitionMouse = 0;
    }

    if (hasInit == false) {

        // gl context
        container = document.getElementById("left-scene");
        

        // main scene
        scene = new THREE.Scene();

        // scene where left and right quads sit
        finalScene = new THREE.Scene();

        // open GL render engine
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(1200, 700);
        renderer.sortObjects = false;
        renderer.setClearColorHex(0x111122, 1);
        container.appendChild(renderer.domElement);
        
        // camera to render the finalScene
        camera = new THREE.Camera(75, 1.7, 1, 190000);
        camera.updateMatrix();
        camera.position.z = -25;

        //left target
        leftTargetTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat });
        var materialLeft = new THREE.MeshBasicMaterial({ map: leftTargetTexture, color: 0xffffff, size: 1024 });

        //left target plane
        var planeLeft = new THREE.PlaneGeometry(50, 50, 10000);
        wallLeft = new THREE.Mesh(planeLeft, materialLeft);
        wallLeft.position.x = 25;
        wallLeft.rotation.x = degToRad(180);
        wallLeft.rotation.y = degToRad(180);
        wallLeft.doubleSided = true;
        finalScene.addChild(wallLeft);


        //right target
        rightTargetTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat });
        var materialRight = new THREE.MeshBasicMaterial({ map: rightTargetTexture, color: 0xffffff, size: 1024 });

        //left target plane
        var planeRight = new THREE.PlaneGeometry(50, 50, 10000);
        wallRight = new THREE.Mesh(planeRight, materialRight);
        wallRight.doubleSided = true;
        wallRight.position.x = -25;
        wallRight.rotation.x = degToRad(180);
        wallRight.rotation.y = degToRad(180);
        finalScene.addChild(wallRight);

    }

    // CLEANUP BETWEEN ROUNDS
    if (particleSystem != null) {
        scene.removeChild(particleSystem);
        particleSystem.removeChild(particles);
        scene.removeChild(particleSystemB);
        particleSystemB.removeChild(particlesB);
        particles.vertices = null; particlesB.vertices = null;
        particles = null; particlesB = null;
    }


    // PARTICLES
        var pMaterial = new THREE.ParticleBasicMaterial({
            color: particle_color,
            size: 1500,
            map: THREE.ImageUtils.loadTexture(
            "images/particle.png" ),
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false
        });

        

        particles = new THREE.Geometry();
        particleSystem = new THREE.ParticleSystem(particles, pMaterial);
        scene.addChild(particleSystem);

        // normal  bodies
        for (var p = 0; p < Math.round( numBodies/2)  ; p++) {

           var particle = new THREE.Vertex( new THREE.Vector3(0, 0, 0));
            particles.vertices.push(particle);
        }

        // PARTILCES B (Alternate Color)
        
                    var pMaterialB = new THREE.ParticleBasicMaterial({
                        color: particle_color_b,
                        size: 1500,
                        map: THREE.ImageUtils.loadTexture(
                        "images/particle.png"),
                        blending: THREE.AdditiveBlending,
                        transparent: true,
                        depthTest: false
                    });

                    particlesB = new THREE.Geometry();
                    particleSystemB = new THREE.ParticleSystem(particlesB, pMaterialB);
                    scene.addChild(particleSystemB);

                    // normal  bodies
                    for (var p = 0; p < Math.round( numBodies / 2) ; p++) {

                        var particleB = new THREE.Vertex(new THREE.Vector3(0, 0, 0));
                        particlesB.vertices.push(particleB);
                        
                    }

        if( isReset == true ) {
            if( cylinder != null )
                scene.removeChild( cylinder );  

            var tunnelMaterial = new THREE.MeshBasicMaterial({
                map: THREE.ImageUtils.loadTexture('images/tunnel_gradient_wide.png'),
                blending: THREE.AdditiveBlending,            
            });

            geometry = new THREE.CylinderGeometry(50, 12000, 12000, 50000);
            material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            cylinder = new THREE.Mesh(geometry, tunnelMaterial);
            cylinder.rotation.x = 1.5;
            cylinder.doubleSided = true;
            cylinder.position.y = camera.position.y - 20000;
            scene.addChild(cylinder);

            tFov = 3;

        }


    // first render only. Don't need to respawn the lights or skycube
    if (hasInit == true) return;


    var ambient = new THREE.AmbientLight(0x110000);
    scene.addLight(ambient);

    light1 = new THREE.PointLight(0xcdcccc);
    scene.addLight(light1);

    light1.position.x = -50000;
    light1.position.y = 79000;
    light1.position.z = 27000;


    // MOON ========================================================================================================
        if (show_moon == true) {
            var moonMaterial = new THREE.MeshLambertMaterial({
            ambient: 0x000000, color: 0xccaaaa, specular: 0x999999, shininess: 20, shading: THREE.SmoothShading,
            map: THREE.ImageUtils.loadTexture('images/moon.jpg')

        });

        var moonContainer = new THREE.Object3D();

        moon = new THREE.Mesh(new THREE.SphereGeometry(9000, 24, 24), moonMaterial);
        moon.overdraw = true;
        moonContainer.addChild(moon);
        scene.addObject(moonContainer);

        moonContainer.position.x = -45000;
        moonContainer.position.y = 56000;
        moonContainer.position.z = -10500;

        moonContainer.rotation.y = 1.4;
    }

    // EARTH ========================================================================================================
    if (show_planet == true) {
        earthContainer = new THREE.Object3D();
        var earthMaterial = new THREE.MeshLambertMaterial({
            ambient: 0x010101, color: 0xffffff, specular: 0x991111, shininess: 50, shading: THREE.SmoothShading,
            map: THREE.ImageUtils.loadTexture('images/jupiter.jpg')
        });

        earth = new THREE.Mesh(new THREE.SphereGeometry(11000, 24, 32), earthMaterial);
        earth.overdraw = true;

        earthContainer.addChild(earth);
        scene.addObject(earthContainer);

        earthContainer.position.x = 42500;
        earthContainer.position.y = 38000;
        earthContainer.position.z = 5500;

        earthContainer.rotation.z = -.78;
        earthContainer.rotation.y = -3.25;
    }
       
                    // build the environment

                    var path = "images/";
                    var format = '.png';
                    var urls;

                        urls = [
					                path + 'ship-right' + format, path + 'ship-left' + format,
					                path + 'ship-up' + format, path + 'ship-down' + format,
					                path + 'ship-front' + format, path + 'ship-back' + format
				                ];
                                
                   
                    var textureCube = THREE.ImageUtils.loadTextureCube(urls);
                    var material = new THREE.MeshBasicMaterial({ color: 0x000000, envMap: camera, size:1024 });

                    // Skybox
                    var shader = THREE.ShaderUtils.lib["cube"];
                    shader.uniforms["tCube"].texture = textureCube;


                    var material = new THREE.MeshShaderMaterial({
                        fragmentShader: shader.fragmentShader,
                        vertexShader: shader.vertexShader,
                        uniforms: shader.uniforms

                    });

                    // this is a really big cube
                    var mesh = new THREE.Mesh(new THREE.CubeGeometry(100000, 100000, 100000, 1, 1, 1, null, true), material);
                    mesh.rotation.y = 1.5;
                    scene.addObject(mesh);


    animateThree();
    hasInit = true;
    onResize();
}

// setup the stage/camera aspect etc.
onResize();
window.onresize = function resize() { onResize(); };

function onResize() {
    document.getElementById("left-scene").width = window.innerWidth;
    document.getElementById("left-scene").height = window.innerHeight;

    if (camera != null) {
        camera.aspect = (window.innerWidth - 10) / (window.innerHeight - 50);
        camera.updateProjectionMatrix();
    }
    if (renderer != null) renderer.setSize(window.innerWidth - 10, window.innerHeight - 50);
}




// initial Field of View 
var tFov = 3;
var cameraEaseIn = 0;


// kickoff the render loop
function animateThree() {
    window.mozRequestAnimationFrame(animateThree);    
    NBody.display.tick();
    render();
}

var time = 0;

var targX = 0;
var targY = 0;
var targZ = 0;

var autoCamZ = 5;
var camXPower=3;

/* main render pass */
function render() {

    averagePosition = new Array();
    averagePosition = [0, 0, 0];
    var i = 0;

    if (implementation == "parallel") {

        // we have to make sure the PA's buffer is actually available in case LazyBufferCommunication is enabled
        NBody.private.pos.materialize();
        for (i = 0; i < numBodies ; i++) {
           
            if (i < Math.round(numBodies / 2)){
                var particle = particles.vertices[i];
            } else {
                particle = particlesB.vertices[i - Math.round( numBodies / 2) ];
            }

            if (particle) {
           
                // grab the vertices from NBody data
                // note that .get() is not used because it is slow outside of the parallel combine
                particle.position.x = NBody.private.pos.data[i * 4 + 0];
                particle.position.y = NBody.private.pos.data[i * 4 + 1];
                particle.position.z = NBody.private.pos.data[i * 4 + 2];

                averagePosition[0] += NBody.private.pos.data[i * 4 + 0];
                averagePosition[1] += NBody.private.pos.data[i * 4 + 1];
                averagePosition[2] += NBody.private.pos.data[i * 4 + 2];
                
            }

        }

    } else {

        for (i = 0; i < numBodies; i++) {

                
            if (i < Math.round(numBodies / 2)){
                var particle = particles.vertices[i];
            } else {
                particle = particlesB.vertices[i - Math.round( numBodies / 2) ];
            }

            if (particle) {

                // get the data from the typed array
                particle.position.x = NBody.private.posTA[i * 3 + 0];
                particle.position.y = NBody.private.posTA[i * 3 + 1];
                particle.position.z = NBody.private.posTA[i * 3 + 2];

                averagePosition[0] += NBody.private.posTA[i * 3 + 0];
                averagePosition[1] += NBody.private.posTA[i * 3 + 1];
                averagePosition[2] += NBody.private.posTA[i * 3 + 2];
            }
        }

    }

    // flag the particles for geometry update
    particleSystem.geometry.__dirtyVertices = true;
    particleSystemB.geometry.__dirtyVertices = true;

    // rotate the planets
    // this had a more of an effect when the demo was set in outter space
    if (show_planet == true)
        earth.rotation.y += .0025;

    if (show_moon)
        moon.rotation.y += .0045;

    // track the centroid of the particles
    averagePosition[0] = averagePosition[0] / numBodies;
    averagePosition[1] = averagePosition[1] / numBodies;
    averagePosition[2] = averagePosition[2] / numBodies;

    // define the lookat point for the camera
    var lookAt = new THREE.Vector3(averagePosition[0], averagePosition[1], averagePosition[2]);

    targX += (mouseX*camXPower - targX) * .2;
    targY += (-mouseY * 3 -targY) * .2;
    targZ = 7000;

    if (NBody.private.stop == false) {

        if (is_keynote == true ) {
            // auto-pilot the camera
            autoCamZ = Math.sin(time * keynote_camera_speed) * 28000 + 10000;
            camera.position.x = Math.cos(time * keynote_camera_speed) * 20000
            camera.position.z = autoCamZ ;
            camera.position.y += ((averagePosition[1] / 4) + Math.sin(time * keynote_camera_speed) * 20000 - camera.position.y) * .1;
              
        } else {

            // automated
            autoCamZ = Math.sin(time * keynote_camera_speed) * 28000 ;
            if( time < 1000){
               
                camera.position.x = Math.cos(time * keynote_camera_speed) * 20000
                camera.position.y += ((averagePosition[1] / 4) + Math.sin(time * keynote_camera_speed) * 20000 - camera.position.y) * .1;
                camera.position.z = autoCamZ;

                // smooth the transition to mouse control
                targX =  camera.position.x;
                targY = camera.position.y;

            }
            // ease in mouse control
            if( time > 500 ) {

                 camera.position.x += (targX*cameraEaseIn-camera.position.x) * .2;
                 camera.position.y += (targY*cameraEaseIn-camera.position.y) * .2;
                 camera.position.z = autoCamZ;
                 if( cameraEaseIn < 1 ) cameraEaseIn += .01;
            }

        }


        camera.target.position = (lookAt);
    
        // zoom out camera
        if (tFov < 60 && time > 180 )
            tFov += .12;

        camera.fov = tFov;
        camera.updateMatrix();
        camera.updateProjectionMatrix();


        // this is the tube that is supposed to have particles emerge. 
        // because of the rush on this, never quite go the position/rotation/camera view quite right. 
        // It is mostly a camera trick for now
        cylinder.position.x = camera.position.x;                       
        cylinder.position.z = camera.position.z;
        cylinder.lookAt = lookAt;

        cylinder.rotation.z = 1.6;
        cylinder.rotation.x = degToRad( 90 );
        cylinder.position.y -=time*2.5;

        renderer.render(scene, camera);
    }

    if( time == 500) 
        scene.removeChild( cylinder);

    time++;
}


function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 10;
    mouseY = (event.clientY - windowHalfY) * 10;
}



function radToDeg(rad) {
    var pi = Math.PI;
   return (rad) * (180 / pi);

}


function degToRad(deg) {
    var pi = Math.PI;
    return (deg) * (pi / 180);

}
