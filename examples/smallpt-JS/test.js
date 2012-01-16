// 1==diffuse, 2==specular, 3==refraction
// build scene
//


/*

   var spheres = new Array(

   new Array (1e5, new Array(+1e5+1,  40.8, 81.6), new Array(.75,.25,.25), new Array(0,0,0), 1),    // left

   new Array (1e5, new Array(-1e5+99, 40.8, 81.6), new Array(.25,.25,.75), new Array(0,0,0), 1),	   // right

   new Array (1e5, new Array(50,      40.8, 1e5 ), new Array(.75,.75,.75), new Array(0,0,0), 1),    // back

   new Array (1e5, new Array(50,    40.8,-1e5+170), new Array(0, 0, 0   ), new Array(0,0,0), 1),    // front

   new Array (1e5, new Array(50,   1e5, 81.6), 	   new Array(.75,.75,.75), new Array(0,0,0), 1),    // top

   new Array (1e5, new Array(50, -1e5+81.6, 81.6), new Array(.75,.75,.75),  new Array(0,0,0),1),    // bottom

   new Array(16.5, new Array(27,      16.5, 47  ), new Array(.999,.999,.999), new Array(0,0,0),2),   // mirror

   new Array(16.5, new Array(73,      16.5, 78  ), new Array(.999,.999,.999), new Array(0,0,0), 3), // glass

   new Array(600, new Array(50,     681.33, 81.6), new Array(0,0,0), new Array(12,12,12), 1)     // light

   );

   */
//var spheres_rad = new Array(1e5, 1e5, 1e5, 1e5, 1e5, 1e5, 16.5, 16.5, 600);
//var spheres_cnt = new Array([+1e5+1,  40.8, 81.6], [-1e5+99, 40.8, 81.6], [50, 40.8, 1e5], [50, 40.8,-1e5+170], [50,   1e5, 81.6], [50, -1e5+81.6, 81.6], [27, 16.5, 47 ], [73, 16.5, 78], [50, 681.33, 81.6]);
//var spheres_clr = new Array([.75, .25, .25], [.25,.25,.75], [.75,.75,.75], [0, 0, 0 ], [.75,.75,.75], [.75,.75,.75], [.999,.999,.999], [.999,.999,.999], [0,0,0]);
//var spheres_ems = new Array([0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [12,12,12]);
//var spheres_rfl = new Array(1,1,1,1,1,1,2,3,1);


var spheres_rad = [1e5, 1e5, 1e5, 1e5, 1e5, 1e5, 16.5, 16.5, 600];

//var spheres_cnt = [[+1e5+1,  40.8, 81.6], [-1e5+99, 40.8, 81.6], [50, 40.8, 1e5], [50, 40.8,-1e5+170], [50,   1e5, 81.6], [50, -1e5+81.6, 81.6], [27, 16.5, 47 ], [73, 16.5, 78], [50, 681.33, 81.6]];

/*

   var spheres_cnt0 = [+1e5+1,  40.8, 81.6];

   var spheres_cnt1 = [-1e5+99, 40.8, 81.6] ;

   var spheres_cnt2 = [50, 40.8, 1e5] ;

   var spheres_cnt3 = [50, 40.8,-1e5+170] ;

   var spheres_cnt4 = [50,   1e5, 81.6] ;

   var spheres_cnt5 = [50, -1e5+81.6, 81.6] ;

   var spheres_cnt6 = [27, 16.5, 47 ] ;

   var spheres_cnt7 = [73, 16.5, 78] ;

   var spheres_cnt8 = [50, 681.33, 81.6] ;

   */
var spheres_cnt = [+1e5+1, 40.8, 81.6, -1e5+99, 40.8, 81.6, 50, 40.8, 1e5, 50, 40.8,-1e5+170, 50, 1e5, 81.6, 50, -1e5+81.6, 81.6, 27, 16.5, 47, 73, 16.5, 78, 50, 681.33, 81.6] ;


//var spheres_clr = [[.75, .25, .25], [.25,.25,.75], [.75,.75,.75], [0, 0, 0 ], [.75,.75,.75], [.75,.75,.75], [.999,.999,.999], [.999,.999,.999], [0,0,0]];
var spheres_clr = [.75, .25, .25, .25,.25,.75, .75,.75,.75, 0, 0, 0 , .75,.75,.75, .75,.75,.75, .999,.999,.999, .999,.999,.999, 0,0,0];

/*

   var spheres_clr0 = [.75, .25, .25] ;

   var spheres_clr1 = [.25,.25,.75] ;

   var spheres_clr2 = [.75,.75,.75] ;

   var spheres_clr3 = [0, 0, 0 ] ;

   var spheres_clr4 = [.75,.75,.75] ;

   var spheres_clr5 = [.75,.75,.75] ;

   var spheres_clr6 = [.999,.999,.999] ;

   var spheres_clr7 = [.999,.999,.999] ;

   var spheres_clr8 = [0,0,0] ;

   */
//var spheres_ems = [[0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0], [12,12,12]];
var spheres_ems = [0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 12,12,12];
/*

   var spheres_ems0 = [0,0,0] ;

   var spheres_ems1 = [0,0,0] ;

   var spheres_ems2 = [0,0,0] ;

   var spheres_ems3 = [0,0,0] ;

   var spheres_ems4 = [0,0,0] ;

   var spheres_ems5 = [0,0,0] ;

   var spheres_ems6 = [0,0,0] ;

   var spheres_ems7 = [0,0,0] ;

   var spheres_ems8 = [12,12,12] ;

   */
var spheres_rfl = [1,1,1,1,1,1,2,3,1];


/*

   Cen = new Array (50,40.8,-860);

   var spheres = new Array(//Scene: radius, position, emission, color, material

   new Array(1600, array_scaled(new Array(1,0,2), 3000) , array_scaled(new Array(1,.9,.8), 1.2e1*1.56*2), new Array(0,0,0), 1), // sun

   new Array(1560, array_scaled(new Array(1,0,2), 3500) , array_scaled(new Array(1,.5,.05), 4.8e1*1.56*2), new Array(0,0,0), 1), // horizon sun2

//   Sphere(10000,Cen+Vec(0,0,-200), Vec(0.0627, 0.188, 0.569)*6e-2*8, Vec(.7,.7,1)*.25,  DIFF), // sky

new Array(10000, array_plus(Cen, new Array(0,0,-200)), array_scaled(new Array(0.00063842, 0.02001478, 0.28923243), 6e-2*8), array_scaled(new Array(.7,.7,1), .25), 1), // sky

new Array (100000, new Array(50, -100000, 0),  new Array(0,0,0), new Array(.3,.3,.3), 1), // grnd

new Array(110000, new Array(50, -110048.5, 0), array_scaled(new Array(.9,.5,.05), 4), new Array(0,0,0), 1),// horizon brightener

new Array(4e4, new Array(50, -4e4-30, -3000),  new Array(0,0,0) , new Array(.2,.2,.2), 1),// mountains

//  Sphere(3.99e4, Vec(50, -3.99e4+20.045, -3000),  Vec(),Vec(.7,.7,.7),DIFF),// mountains snow



new Array(26.5, new Array(22,26.5,42),  new Array(0,0,0), array_scaled(new Array(1,1,1), .596), 2), // white Mirr

new Array(13, new Array(75,13,82),  new Array(0,0,0) , array_scaled(new Array(.96,.96,.96), .96), 3),// Glas

new Array(22, new Array(87,22,24), new Array(0,0,0), array_scaled(new Array(.6,.6,.6), .696), 3)    // Glas2

);

*/
/*** Notes:

 * var c dimensions

 * erand48 - can we replace it with Math.random() safely ?

 *

 ***/
/*

   function array_gamma(a, s) {

   var b = new Array(3);

   var inv = 1/s;

   b[0] = Math.pow(a[0], inv);

   b[1] = Math.pow(a[1], inv);

   b[2] = Math.pow(a[2], inv);

   return b;

   }

   */
/*

   function array_dot(a, b) {

   return (a[0]*b[0] + a[1]*b[1] + a[2]*b[2]);

   }

   */
/*

   function array_clamped(a) {

   var b = new Array(3);

//for(var j = 0; j<3; j++) {b[j] = a[j];}

for(var i =0;i<3;i++) {

if(a[i] < 0) {

b[i] = 0;

}

else if(a[i] > 1) {

b[i] = 1;

}

else {

b[i] = a[i];

}

}

return b;

}

*/
/*

   function array_normalized(a) {

   var b = new Array(3);

   var len = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);

   b[0] = a[0]/len;

   b[1] = a[1]/len;

   b[2] = a[2]/len;

   return b;

   }

   */
/*

   function cross_product(a, b) {

   var c = new Array(3);

   c[0] = a[1] * b[2] - a[2]*b[1];

   c[1] = a[2] * b[0] - a[0]*b[2];

   c[2] = a[0] * b[1] - a[1]*b[0];

   return c;

   }

   */
/*

   function array_scaled(a, s) {

   var b = new Array(3);

   b[0] = a[0]*s;

   b[1] = a[1]*s;

   b[2] = a[2]*s;

   return b;

   }

   */
/*

   function array_plus(a, b) {

   var c = new Array(3);

   c[0] = a[0] + b[0];

   c[1] = a[1] + b[1];

   c[2] = a[2] + b[2];

   return c;

   }

   */
/*

   function array_mult(a, b) {

   var c = new Array(3);

   c[0] = a[0] * b[0];

   c[1] = a[1] * b[1];

   c[2] = a[2] * b[2];

   return c;

   }

   */
/*

   function array_minus(a, b) {

   var c = new Array(3);

   c[0] = a[0] - b[0];

   c[1] = a[1] - b[1];

   c[2] = a[2] - b[2];

   return c;

   }

   */
/*

   function filter_array(a, b) {

   var r = new Array(3);

   r[0] = a[0]*b[0];

   r[1] = a[1]*b[1];

   r[2] = a[2]*b[2];

   return r;

   }

   */
/*

   function reverse(a) {

   var b = new Array(3);

   b[0] = -a[0];

   b[1] = -a[1];

   b[2] = -a[2];

   return b;

   }

   */
function get_random() {
 return Math.random();
}

var CoordX = new Array(1,0,0);
var CoordY = new Array(0,1,0);


function intersect_sphere(sindex, ray) {
 var op = [spheres_cnt[sindex][0] - ray[0][0], spheres_cnt[sindex][1]-ray[0][1], spheres_cnt[sindex][2]-ray[0][2]];
 var b = (op[0]*ray[1][0] + op[1]*ray[1][1] + op[2]*ray[1][2]);
 //var det = b*b - op.dot(op) + this.radius*this.radius;
 var det = b*b - (op[0]*op[0] + op[1]*op[1] + op[2]*op[2]) + spheres_rad[sindex]*spheres_rad[sindex];
 if(det < 0) {
  return 0;
 }
 var t;
 det = Math.sqrt(det);
 t = b - det;
 if (t > eps)
  return t;
 t = b + det;
 if (t > eps)
  return t;
 // no hit
 return 0;
}

function intersect(r, t) {
 var result = new Array(-1, 1e20);
 var d;
 var len = spheres_cnt.length;
 for(var i = 0; i < len; i++) {
  if((d=intersect_sphere(i, r)) && (d < result[1])) {
   result[0] = i;
   result[1] = d;
  }
 }
 return result;
}


function radiance(ray_, depth_) {
 var t = 1e20;
 var id = -1;
 var r = ray_;
 var depth = depth_
  var sphere;

 var cl = new Array(0,0,0);
 var cf = new Array(1,1,1);

 while(1) {
  //console.log(cl);
  var contact = intersect(r, t);
  if(contact[0] === -1)
   return cl;
  id = contact[0];
  //console.log("Returning id = ", id);
  sphere = spheres[id];
  //r[2] = contact[1];
  if(sphere === null)
   return Black;

  var x = [(r[0])[0] + ([r[1][0]*contact[1], r[1][1]*contact[1], r[1][2]*contact[1]])[0], (r[0])[1] + ([r[1][0]*contact[1], r[1][1]*contact[1], r[1][2]*contact[1]])[1], (r[0])[2] + ([r[1][0]*contact[1], r[1][1]*contact[1], r[1][2]*contact[1]])[2]];
  var n = [[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0]/Math.sqrt([x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]), [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1]/Math.sqrt([x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]), [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]/Math.sqrt([x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][0] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][1] + [x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2]*[x[0] - sphere[1][0], x[1]-sphere[1][1], x[2]-sphere[1][2]][2])];
  var nl = (n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]) < 0 ? n : [n[0]*-1, n[1]*-1, n[2]*-1];
  var f = sphere[2];
  var p = Math.max(sphere[2][0], sphere[2][1], sphere[2][2]);
  cl = [(cl)[0] + ([cf[0]*sphere[3][0], cf[1]*sphere[3][1], cf[2]*sphere[3][2]])[0], (cl)[1] + ([cf[0]*sphere[3][0], cf[1]*sphere[3][1], cf[2]*sphere[3][2]])[1], (cl)[2] + ([cf[0]*sphere[3][0], cf[1]*sphere[3][1], cf[2]*sphere[3][2]])[2]];
  if(++depth > 5) if(get_random() < p) f = [f[0]*1/p, f[1]*1/p, f[2]*1/p]; else return cl;
  cf = [cf[0]*f[0], cf[1]*f[1], cf[2]*f[2]];

  if(sphere[4] === 1) {
   // TODO: Add Math.PI codegen
   //var r1 = 2*Math.PI*get_random();
   var r1 = 2*3.14159265*get_random();
   var r2 = Math.random();
   var r2s = Math.sqrt(r2);
   var w = nl; var u;
   if(Math.abs(w[0] > 0.3)) {
    u = CoordX;
   }
   // CoordX and CoordY seem to be reversed in the JS implementation !!
   else {
    u = CoordY;
   }
   u = [u[1] * w[2] - u[2]*w[1], u[2] * w[0] - u[0]*w[2], u[0] * w[1] - u[1]*w[0]];
   u = [u[0]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2]), u[1]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2]), u[2]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2])];
   var v = [w[1] * u[2] - w[2]*u[1], w[2] * u[0] - w[0]*u[2], w[0] * u[1] - w[1]*u[0]];
   var d = [[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0]/Math.sqrt([([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]), [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1]/Math.sqrt([([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]), [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]/Math.sqrt([([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][0] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][1] + [([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2]*[([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[0] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[0], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[1] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[1], ([([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[0] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[0], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[1] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[1], ([u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s])[2] + ([v[0]*Math.sin(r1)*r2s, v[1]*Math.sin(r1)*r2s, v[2]*Math.sin(r1)*r2s])[2]])[2] + ([w[0]*Math.sqrt(1-r2), w[1]*Math.sqrt(1-r2), w[2]*Math.sqrt(1-r2)])[2]][2])];

   r = new Array(x, d, 0);
   continue;
  }
  else if(sphere[4] === 2) {
   //r = new Array(x, array_minus(r[1], array_mult(n, (array_scaled(array_dot(n, r[1]), 2)))), 0);
   r = new Array(x, [r[1][0] - [n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][0], r[1][1]-[n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][1], r[1][2]-[n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][2]], 0);
   continue;
  }
  //var reflRay = new Array(x, array_minus(r[1], array_mult(n, (array_scaled(array_dot(n, r[1]), 2)))), 0);
  var reflRay = new Array(x, [r[1][0] - [n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][0], r[1][1]-[n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][1], r[1][2]-[n[0]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[1]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2]), n[2]*2*(n[0]*r[1][0] + n[1]*r[1][1] + n[2]*r[1][2])][2]], 0);
  var into = (n[0]*nl[0] + n[1]*nl[1] + n[2]*nl[2]) > 0;
  var nc = 1; var nt = 1.5; var nnt = into ? nc/nt:nt/nc;
  var ddn = (r[1][0]*nl[0] + r[1][1]*nl[1] + r[1][2]*nl[2]); var cos2t;
  if((cos2t=1-nnt*nnt*(1-ddn*ddn)) < 0) {
   r =reflRay;
   continue;
  }

  var tdir = [[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0]/Math.sqrt([[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]), [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1]/Math.sqrt([[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]), [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]/Math.sqrt([[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][0] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][1] + [[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2]*[[r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][0] - [n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][0], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][1]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][1], [r[1][0]*nnt, r[1][1]*nnt, r[1][2]*nnt][2]-[n[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))][2]][2])];
  var a = nt-nc; var b = nt+nc; var R0 = a*a/(b*b); var c = 1-(into?-ddn:(tdir[0]*n[0] + tdir[1]*n[1] + tdir[2]*n[2]));
  var Re = R0+(1-R0)*c*c*c*c*c; var Tr = 1-Re; var P = 0.25+0.5*Re; var RP = Re/P; var TP = Tr/(1-P);
  if(get_random() < P) {
   cf = [cf[0]*RP, cf[1]*RP, cf[2]*RP];
   r = reflRay;
  }
  else {
   cf = [cf[0]*TP, cf[1]*TP, cf[2]*TP];
   r = new Array(x, tdir, 0);
  }
  continue;
 }
}

function combine_kernel2(index, samps, cx, cy, cam, c, canvasdim) {
 var w = canvasdim[0]; var h = canvasdim[1];
 //var Xi = new Array(0,0,16);
 //var x = Math.floor(index/h);
 //var y = index - x*h;
 var x = index[0]; var y = index[1];
 var color = new Array(3); color[0] = 0; color[1] = 0; color[2] = 0;
 for(var s = 0; s < samps; s++) {
  var d = [([cx[0]*x/w-0.5, cx[1]*x/w-0.5, cx[2]*x/w-0.5])[0] + ([cy[0]*y/h-0.5, cy[1]*y/h-0.5, cy[2]*y/h-0.5])[0], ([cx[0]*x/w-0.5, cx[1]*x/w-0.5, cx[2]*x/w-0.5])[1] + ([cy[0]*y/h-0.5, cy[1]*y/h-0.5, cy[2]*y/h-0.5])[1], ([cx[0]*x/w-0.5, cx[1]*x/w-0.5, cx[2]*x/w-0.5])[2] + ([cy[0]*y/h-0.5, cy[1]*y/h-0.5, cy[2]*y/h-0.5])[2]];
  d = [[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0]/Math.sqrt([(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]), [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1]/Math.sqrt([(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]), [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]/Math.sqrt([(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][0] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][1] + [(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2]*[(d)[0] + (cam[1])[0], (d)[1] + (cam[1])[1], (d)[2] + (cam[1])[2]][2])];
  var co = [(cam[0])[0] + ([d[0]*140, d[1]*140, d[2]*140])[0], (cam[0])[1] + ([d[0]*140, d[1]*140, d[2]*140])[1], (cam[0])[2] + ([d[0]*140, d[1]*140, d[2]*140])[2]];
  var ray = new Array(co, d, 0);
  var color1 = radiance(ray, 0, 0);
  console.log("Doing x = ", x, " y = ", y, " sample# = ", s, " color = ", color1);
  //color = array_plus(color, array_scaled(radiance(ray, 0, 0), 1/s));
  //var color = array_clamped(color1);
  //acc_color = array_plus(acc_color, color);
  //acc_color = array_gamma(array_scaled(acc_color, 1/s),2.2);
 }
 return [[(color)[0]<0?0:((color)[0]>1?1:(color)[0]), (color)[1]<0?0:((color)[1]>1?1:(color)[1]), (color)[2]<0?0:((color)[2]>1?1:(color)[2])][0]*0.25, [(color)[0]<0?0:((color)[0]>1?1:(color)[0]), (color)[1]<0?0:((color)[1]>1?1:(color)[1]), (color)[2]<0?0:((color)[2]>1?1:(color)[2])][1]*0.25, [(color)[0]<0?0:((color)[0]>1?1:(color)[0]), (color)[1]<0?0:((color)[1]>1?1:(color)[1]), (color)[2]<0?0:((color)[2]>1?1:(color)[2])][2]*0.25];
}

function combine_kernel(index, samps, Xi, cx, cy, cam, c, canvasdim) {
 //y = h/2; x = w/2;
 //var Xi = new Array(0,0,y*y*y);
 var x = index[0]; var y = index[1];
 var w = canvasdim[0]; var h = canvasdim[1];
 //var x = Math.floor(index/h);
 //var y = index - x*h;

 var r = new Array(3);
 //for(var sy = 0, i = (h-y-1)*w+x; sy<2; sy++) {
 //	for(var sx = 0; sx < 2; sx++) {
 r[0] = 0; r[1] = 0; r[2] = 0;
 //for(var s = 0; s < samps; s++) {
 var r1 = 2*get_random();
 var dx = r1 < 1 ? Math.sqrt(r1) - 1 : 1-Math.sqrt(2-r1);
 var r2 = 2*get_random();
 var dy = r2 < 1 ? Math.sqrt(r2) - 1 : 1-Math.sqrt(2-r2);
 var scale1 = (((sx+0.5+dx)/2 + x)/w - 0.5);
 var scale2 = (((sy+0.5+dy)/2 + y)/h - 0.5);
 var d = [([([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[0] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[0], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[1] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[1], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[2] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[2]])[0] + (cam[1])[0], ([([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[0] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[0], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[1] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[1], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[2] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[2]])[1] + (cam[1])[1], ([([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[0] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[0], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[1] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[1], ([cx[0]*scale1, cx[1]*scale1, cx[2]*scale1])[2] + ([cy[0]*scale2, cy[1]*scale2, cy[2]*scale2])[2]])[2] + (cam[1])[2]];
 var newRay = new Array([(cam[0])[0] + ([d[0]*140, d[1]*140, d[2]*140])[0], (cam[0])[1] + ([d[0]*140, d[1]*140, d[2]*140])[1], (cam[0])[2] + ([d[0]*140, d[1]*140, d[2]*140])[2]], [d[0]/Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]), d[1]/Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]), d[2]/Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2])], 0);


 var rad_result = radiance(newRay, 0, Xi);

 rad_result = [rad_result[0]*1/samps, rad_result[1]*1/samps, rad_result[2]*1/samps];
 r = [(r)[0] + (rad_result)[0], (r)[1] + (rad_result)[1], (r)[2] + (rad_result)[2]];
 //}
 //this[i] = array_plus(this.get(i), array_scaled(array_clamped(r), 0.25));
 c[i] = [(c[i])[0] + ([[(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][0]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][1]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][2]*0.25])[0], (c[i])[1] + ([[(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][0]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][1]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][2]*0.25])[1], (c[i])[2] + ([[(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][0]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][1]*0.25, [(r)[0]<0?0:((r)[0]>1?1:(r)[0]), (r)[1]<0?0:((r)[1]>1?1:(r)[1]), (r)[2]<0?0:((r)[2]>1?1:(r)[2])][2]*0.25])[2]];
 //}
 //}
}

var test_array = [0.90 ,0.95, 0.95, 0.95, 0.85, 0.94, 0.95, 0.95];
function combine_test1(index, test_array) {
 var j = 0;

 for(var i = 0; i < 3; i++) {
  if(0) {
   j = 0;
  }
 }
 if (j===-1) return [0,0,0];

 var a = test_array[j]; // Compilation of this statement fails: “range is undefined” (while doing range.lb === undefined)
 var b = [a, a, a];
 return b;
}

function combine_test2(index, test_array) {
 var a = 0; var x = 0; for(var i = 0;i<3; i++) { x = 0;}
 if(x == 0) { a = test_array[0]; }
 if(x == 1) { a = test_array[1]; }
 if(x == 2) { a = test_array[2]; }

 var b = [a, a, a];
 return b;
}

function combine_test3(index, test_array) {
 var n = 3; var a = 0.3;
 for(var i = 0; i < 4; i++) {
  if(i == 2) {
   continue;
  }
 }
 //a = test_array[i];
 //console.log("Returning ", a);
 a = i/5;
 var b = [a*1, a*0.8, a*0.8];
 return b;
}

function combine_test4(index, test_array) {
 var a = 0;
 for(var i = 0; i < 4; i++) {
  a = test_array[i];
 }
 a = test_array[i-1];
 var b = [a, a, a];
 return b;
}

function combine_test5(index, test_array) {
 var min = 0.99;

 for(var i =0; i<8; i++) {
  if(test_array[i] < min) {
   min = test_array[i];
   //  min = i;
   continue;
  }
 }
 //min = min/16;

 var b = [min, min, min];
 return b;
}

function combine_test7(index, test_array) {
 var a = [[0.55, 0.25, 0.25]];
 var c = a[0];
 return c;
}


function combine_test11(index, test_array) {
 var a1 = [0.2, 0.3, 0.4];
 var a2 = [a1[0]+a1[1], a1[1]+a1[2], a1[2]+a1[0]];
 return a2;
}

function combine_test10(index, test_array) {
 var a1 = [0.24, 0.22, 0.98];
 var a2 = [[0,0,0], [a1[2], a1[1], a1[0]]];
 return a2[1];
}

function combine_test9(index, test_array) {
 var a1 = [0.24, 0.22, 0.98];
 var a2 = [[0.55, 0.36, 0.74], a1, [a1[2], a1[1], a1[0]]];
 var a3 = a2[2];
 var a4 = [a3, a2[0], a1];
 var a5 = [a4[1][2]*a1[0], a3[2], a4[0][0]];
 //console.log("Returning ", a5);
 return a5;
}

function combine_test8(index, test_array) {
 var a1 = [0.24, 0.22, 0.98];
 var a2 = [a1, a1, a1];
 var a3 = [a2, a2, a2];
 var a4 = [a3, a3, a3];
 return a4[2][1][1];
}
function combine_test12(index, test_array) {
 var a = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9], [0.22, 0.33, 0.44]];
 var b = a;
 return b;
}

function combine_test6(index, test_array) {
 var a = [[[0.25], [0.64], [0.95]], [[0.5], [0.5], [0.44]], [[0.75], [0.75], [0.75]], [[0.4], [0.2], [0.44]]];
 var at = [0.25, 0.64, 0.44];
 var bt = [0.90, 0.57, 0.22];
 var dt = [at, bt, [0.22, 0.41, 0.90]];
 var ct = [dt[2][2], dt[0][2], dt[1][1]];

 //var a = [[0.25, [0.5, 0.75]], [0.52, [0.11, 0.90]]];
 //var a = [[0.5], [0.5], [0.5]];
 //var a = [0.05, 0.25, 0.25];
 //var b = [0.5, 0.5, 0.5];
 //var c = [a[0], b[1], b[2]];
 //var a = [[0.20, 0.50, 0.90], [0.90, 0.50, 0.20], [0.50, 0.90, 0.20]];
 //return [a[0], a[1], a[2]];
 //var c = a[1];
 //var c = [0.25, 0.5, 0.75];
 //var c = [a, b];
 //var d = c[1][1];
 //var e = [d, d, d];
 //return c[1];
 //var b = [a[0][0], a[1][0], a[2][0]] ;
 //return b;

 var b1 = a[0][1][0];
 var b2 = a[1][2][0];
 var b3 = a[3][2][0];

 var c = [b1, b2, b3];
 //var c = a[1];
 return c;
 //return ct;
 //return e;
}


//function combine3(index, samps, cx, cy, cam, canvasdim) 
function combine3(index, samps, cx, cy, cam, canvasdim, spheres_cnt, spheres_rad, spheres_clr, spheres_ems, spheres_rfl)
{
 var eps = 1e-4;
 var Xi = [0,0,4];
 var w = canvasdim[0]; var h = canvasdim[1];
 // Math.random() is not supported, prepare an array of random numbers
 // on the host program and pass it in.
 var random_nums = [0.5, 0.5]; // We'll just use Math.random() in the sequential version
 var sum = [0,0,0];



 var yp = h - 1 - Math.floor(index[0]/w);
 var xp = index[0] - (h-yp-1)*w;

 var ii=0;
 for(var sy = 0; sy<2; sy++) {
  for(var sx = 0; sx < 2; sx++) {
   var r_o = [0,0,0];
   //r_o[0] = 0; r_o[1] = 0; r_o[2] = 0;
   for(var s = 1; s < samps; s++) {
    //var r11 = 2*random_nums[0];
    var r11 = 2*Math.random();
    var dx = r11 < 1 ? Math.sqrt(r11) - 1 : 1-Math.sqrt(2-r11);
    var r21 = 2*Math.random();
    var dy = r21 < 1 ? Math.sqrt(r21) - 1 : 1-Math.sqrt(2-r21);
    var scale1 = (((sx+0.5+dx)/2 + xp)/w - 0.5);
    var scale2 = (((sy+0.5+dy)/2 + yp)/h - 0.5);
    //var d1 = array_plus(array_plus(array_scaled(cx, scale1), array_scaled(cy, scale2)), cam[1]);
    var d1 = [cx[0]*scale1+cy[0]*scale2+cam[1][0], cx[1]*scale1+cy[1]*scale2+cam[1][1], cx[2]*scale1+cy[2]*scale2+cam[1][2]];

    //var newRay = new Array(array_plus(cam[0], array_scaled(d1, 140)), array_normalized(d1), 0);
    var d1_len = Math.sqrt(d1[0]*d1[0] + d1[1]*d1[1] + d1[2]*d1[2]);
    //var newRay = [[cam[0][0]+d1[0]*140, cam[0][1]+d1[1]*140, cam[0][2]+d1[2]*140], [d1[0]/d1_len, d1[1]/d1_len, d1[2]/d1_len], [0,0,0]];
    var newRay_origin = [cam[0][0]+d1[0]*140, cam[0][1]+d1[1]*140, cam[0][2]+d1[2]*140];
    var newRay_direction = [d1[0]/d1_len, d1[1]/d1_len, d1[2]/d1_len];
    //console.log(newRay);
    //console.log(array_scaled(radiance(newRay, 0), 1/s));

    var rad_result = [0,0,0];
    //var rad_result = radiance(newRay, 0);

    var t = 1e20;
    var id = -1;
    //var r = newRay;
    var r_origin = newRay_origin;
    var r_direction = newRay_direction;
    var depth = 0;
    //var sphere;	

    var cl = [0,0,0];
    var cf = [1,1,1];
    var contact;
    //var spheres_cnt = [spheres_cnt0, spheres_cnt1, spheres_cnt2, spheres_cnt3, spheres_cnt4, spheres_cnt5, spheres_cnt6, spheres_cnt7, spheres_cnt8];
    //var spheres_clr = [spheres_clr0, spheres_clr1, spheres_clr2, spheres_clr3, spheres_clr4, spheres_clr5, spheres_clr6, spheres_clr7, spheres_clr8];
    //var spheres_ems = [spheres_ems0, spheres_ems1, spheres_ems2, spheres_ems3, spheres_ems4, spheres_ems5, spheres_ems6, spheres_ems7, spheres_ems8];
    var break_flag1 = false;
    var break_flag2 = false;
    var continue_flag3 = false;
    var continue_flag4 = false;
    while(1 && !break_flag1 && !break_flag2 ) {
     break_flag1 = false;
     break_flag2 = false;
     continue_flag3 = false;
     continue_flag4 = false;
     //var result = new Array(-1, 1e20);
     //contact = [-1, 1e20];
     var sphere_contact_index = -1;
     //var sphere_contact_index = 0;
     var sphere_contact_distance = 1e20;
     //var d;
     //var len = spheres_cnt.length;
     //var len = 9;
     for(var sindex = 0; sindex < 9; sindex++) {
      var continue_flag1 = false;
      var continue_flag2 = false;
      //console.log("Sphere index: ", sindex);
      var contact_index = -1;
      var contact_distance = 1e20;
      var sphere_cnt_x = spheres_cnt[sindex*3];
      var sphere_cnt_y = spheres_cnt[sindex*3+1];
      var sphere_cnt_z = spheres_cnt[sindex*3+2];
      var op_i = [sphere_cnt_x - r_origin[0], sphere_cnt_y - r_origin[1], sphere_cnt_z - r_origin[2]];


      var b_i = op_i[0]*r_direction[0] + op_i[1]*r_direction[1] + op_i[2]*r_direction[2];

      var det_i = b_i*b_i - (op_i[0]*op_i[0]+op_i[1]*op_i[1]+op_i[2]*op_i[2]) + spheres_rad[sindex]*spheres_rad[sindex];
      if(det_i < 0) {
       continue_flag1 = true;
       //continue;
      }
      if(!continue_flag1) {
       var t_i;
       det_i = Math.sqrt(det_i);
       t_i = b_i - det_i;
       if (t_i > eps) {
        contact_index = sindex;
        contact_distance = t_i;
       }
       else {
        t_i = b_i + det_i;
        if (t_i > eps) {
         contact_index = sindex;
         contact_distance = t_i;
        }
        else {
         continue_flag2 = true;
         //continue;
        }
       }
       if(!continue_flag2) {
        if(contact_distance < sphere_contact_distance && contact_index >=0) {
         sphere_contact_index = contact_index;
         sphere_contact_distance = contact_distance;
        }
       }
      }
     }

     if(sphere_contact_index == -1 || sphere_contact_distance == 1e20) {
      rad_result = cl;
      break_flag1 = true;
      //break;
     }
     if(!break_flag1) {
      id = sphere_contact_index;

      var pos_sphere; // = spheres_cnt[sphere_contact_index];
      var rad_sphere; // = spheres_rad[sphere_contact_index];
      var clr_sphere; // = spheres_clr[sphere_contact_index];
      var ems_sphere; // = spheres_ems[sphere_contact_index];
      var rfl_sphere; // = spheres_rfl[sphere_contact_index];

      if(sphere_contact_index == 0) {
       rad_sphere = spheres_rad[0]; pos_sphere = [spheres_cnt[0], spheres_cnt[1], spheres_cnt[2]]; clr_sphere = [spheres_clr[0], spheres_clr[1], spheres_clr[2]] ; ems_sphere = [spheres_ems[0], spheres_ems[1], spheres_ems[2]]; rfl_sphere = spheres_rfl[0]; }
      else if(sphere_contact_index == 1) {
       rad_sphere = spheres_rad[1]; pos_sphere = [spheres_cnt[3], spheres_cnt[4], spheres_cnt[5]]; clr_sphere = [spheres_clr[3], spheres_clr[4], spheres_clr[5]] ; ems_sphere = [spheres_ems[3], spheres_ems[4], spheres_ems[5]]; rfl_sphere = spheres_rfl[1]; }
      else if(sphere_contact_index == 2) {
       rad_sphere = spheres_rad[2]; pos_sphere = [spheres_cnt[6], spheres_cnt[7], spheres_cnt[8]]; clr_sphere = [spheres_clr[6], spheres_clr[7], spheres_clr[8]] ; ems_sphere = [spheres_ems[6], spheres_ems[7], spheres_ems[8]]; rfl_sphere = spheres_rfl[2]; }
      else if(sphere_contact_index == 3) {
       rad_sphere = spheres_rad[3]; pos_sphere = [spheres_cnt[9], spheres_cnt[10], spheres_cnt[11]]; clr_sphere = [spheres_clr[9], spheres_clr[10], spheres_clr[11]] ; ems_sphere = [spheres_ems[9], spheres_ems[10], spheres_ems[11]]; rfl_sphere = spheres_rfl[3]; }
      else if(sphere_contact_index == 4) {
       rad_sphere = spheres_rad[4]; pos_sphere = [spheres_cnt[12], spheres_cnt[13], spheres_cnt[14]]; clr_sphere = [spheres_clr[12], spheres_clr[13], spheres_clr[14]] ; ems_sphere = [spheres_ems[12], spheres_ems[13], spheres_ems[14]]; rfl_sphere = spheres_rfl[4]; }
      else if(sphere_contact_index == 5) {
       rad_sphere = spheres_rad[5]; pos_sphere = [spheres_cnt[15], spheres_cnt[16], spheres_cnt[17]]; clr_sphere = [spheres_clr[15], spheres_clr[16], spheres_clr[17]] ; ems_sphere = [spheres_ems[15], spheres_ems[16], spheres_ems[17]]; rfl_sphere = spheres_rfl[5]; }
      else if(sphere_contact_index == 6) {
       rad_sphere = spheres_rad[6]; pos_sphere = [spheres_cnt[18], spheres_cnt[19], spheres_cnt[20]]; clr_sphere = [spheres_clr[18], spheres_clr[19], spheres_clr[20]] ; ems_sphere = [spheres_ems[18], spheres_ems[19], spheres_ems[20]]; rfl_sphere = spheres_rfl[6]; }
      else if(sphere_contact_index == 7) {
       rad_sphere = spheres_rad[7]; pos_sphere = [spheres_cnt[21], spheres_cnt[22], spheres_cnt[23]]; clr_sphere = [spheres_clr[21], spheres_clr[22], spheres_clr[23]] ; ems_sphere = [spheres_ems[21], spheres_ems[22], spheres_ems[23]]; rfl_sphere = spheres_rfl[7]; }
      else if(sphere_contact_index == 8) {
       rad_sphere = spheres_rad[8]; pos_sphere = [spheres_cnt[24], spheres_cnt[25], spheres_cnt[26]]; clr_sphere = [spheres_clr[24], spheres_clr[25], spheres_clr[26]] ; ems_sphere = [spheres_ems[24], spheres_ems[25], spheres_ems[26]]; rfl_sphere = spheres_rfl[8]; }


      var x_0 = r_origin[0]+r_direction[0]*sphere_contact_distance;
      var x_1 = r_origin[1]+r_direction[1]*sphere_contact_distance;
      var x_2 = r_origin[2]+r_direction[2]*sphere_contact_distance;

      var x = [x_0, x_1, x_2];

      var n_0 =x_0-pos_sphere[0];
      var n_1 =x_1-pos_sphere[1];
      var n_2 =x_2-pos_sphere[2];

      var n_tmp_mag = 0;
      n_tmp_mag = n_0*n_0 + n_1*n_1 + n_2*n_2;
      var n_tmp_len = Math.sqrt(n_tmp_mag);
      n_0 = n_0/n_tmp_len;
      n_1 = n_1/n_tmp_len;
      n_2 = n_2/n_tmp_len;



      var nl_0, nl_1, nl_2;
      if(n_0*r_direction[0]+n_1*r_direction[1]+n_2*r_direction[2] < 0) {
       nl_0 = n_0;
       nl_1 = n_1;
       nl_2 = n_2;
      }
      else {
       nl_0 = -1*n_0;
       nl_1 = -1*n_1;
       nl_2 = -1*n_2;
      }


      var f = clr_sphere;
      var p = Math.max(clr_sphere[0], clr_sphere[1], clr_sphere[2]);
      cl = [(cl)[0] + ([cf[0]*ems_sphere[0], cf[1]*ems_sphere[1], cf[2]*ems_sphere[2]])[0], (cl)[1] + ([cf[0]*ems_sphere[0], cf[1]*ems_sphere[1], cf[2]*ems_sphere[2]])[1], (cl)[2] + ([cf[0]*ems_sphere[0], cf[1]*ems_sphere[1], cf[2]*ems_sphere[2]])[2]];
      if(++depth > 5) {
       if(Math.random() < p) {
        f = [f[0]*1/p, f[1]*1/p, f[2]*1/p];
       }
       else {
        rad_result = cl;
        break_flag2 = true;
        //break;
       }
      }
      if(!break_flag2) {
       cf = [cf[0]*f[0], cf[1]*f[1], cf[2]*f[2]];

       if(rfl_sphere == 1) {
        // TODO: Add Math.PI codegen
        //var r1 = 2*Math.PI*Math.random();
        var r1 = 2*3.14159265*Math.random();
        var r2 = Math.random();
        var r2s = Math.sqrt(r2);
        //var wt = nl;
        var wt = [nl_0, nl_1, nl_2];
        var u;
        if(Math.abs(wt[0] > 0.3)) {
         //u = CoordX;
         u = [1,0,0];
        }
        // CoordX and CoordY seem to be reversed in the JS implementation !!
        else {
         //u = CoordY;
         u = [0,1,0];
        }
        u = [u[1] * wt[2] - u[2]*wt[1], u[2] * wt[0] - u[0]*wt[2], u[0] * wt[1] - u[1]*wt[0]];
        u = [u[0]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2]), u[1]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2]), u[2]/Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2])];
        var v = [wt[1] * u[2] - wt[2]*u[1], wt[2] * u[0] - wt[0]*u[2], wt[0] * u[1] - wt[1]*u[0]];
        //var d = array_normalized(array_plus(array_plus(array_scaled(u, Math.cos(r1)*r2s), array_scaled(v, Math.sin(r1)*r2s)) , array_scaled(wt, Math.sqrt(1-r2))));
        var d_tmp1 = [u[0]*Math.cos(r1)*r2s, u[1]*Math.cos(r1)*r2s, u[2]*Math.cos(r1)*r2s];
        var d_tmp2 = [v[0]*Math.sin(r1*r2s), v[1]*Math.sin(r1*r2s), v[2]*Math.sin(r1*r2s)];
        var d_tmp3 = [wt[0]*Math.sqrt(1-r2), wt[1]*Math.sqrt(1-r2), wt[2]*Math.sqrt(1-r2)];
        var d_tmp4 = [(d_tmp1)[0] + (d_tmp2)[0], (d_tmp1)[1] + (d_tmp2)[1], (d_tmp1)[2] + (d_tmp2)[2]];
        var d_tmp5 = [(d_tmp4)[0] + (d_tmp3)[0], (d_tmp4)[1] + (d_tmp3)[1], (d_tmp4)[2] + (d_tmp3)[2]];
        var d = [d_tmp5[0]/Math.sqrt(d_tmp5[0]*d_tmp5[0] + d_tmp5[1]*d_tmp5[1] + d_tmp5[2]*d_tmp5[2]), d_tmp5[1]/Math.sqrt(d_tmp5[0]*d_tmp5[0] + d_tmp5[1]*d_tmp5[1] + d_tmp5[2]*d_tmp5[2]), d_tmp5[2]/Math.sqrt(d_tmp5[0]*d_tmp5[0] + d_tmp5[1]*d_tmp5[1] + d_tmp5[2]*d_tmp5[2])];

        //r = [x, d, [0, 0, 0]];
        //r_origin = x;
        r_origin = x;
        r_direction = d;
        //continue;
        continue_flag3 = true;
       }
       else if(rfl_sphere === 2 && !continue_flag3) {
        //r = new Array(x, array_minus(r[1], array_mult(n, (array_scaled(array_dot(n, r[1]), 2)))), 0);
        //r = [x, array_minus(r[1], array_scaled(n, 2*array_dot(n, r[1]))), [0, 0, 0]];
        r_origin = x;
        //r_direction =array_minus(r_direction, array_scaled([n_0, n_1, n_2], 2*array_dot([n_0, n_1, n_2], r_direction))); 
        var r_tmp0 = [n_0, n_1, n_2]; // CPP doesnt like passing anonymous arrays.
        var r_tmp1 = 2*(r_tmp0[0]*r_direction[0] + r_tmp0[1]*r_direction[1] + r_tmp0[2]*r_direction[2]);
        var r_tmp2 = [r_tmp0[0]*r_tmp1, r_tmp0[1]*r_tmp1, r_tmp0[2]*r_tmp1];
        r_direction = [r_direction[0] - r_tmp2[0], r_direction[1]-r_tmp2[1], r_direction[2]-r_tmp2[2]];
        continue_flag3 = true;
        //continue;
       }
       if(!continue_flag3) {
        //var reflRay = new Array(x, array_minus(r[1], array_mult(n, (array_scaled(array_dot(n, r[1]), 2)))), 0);
        var n_tmp0 = [n_0, n_1, n_2];
        var nl_tmp0 = [nl_0, nl_1, nl_2];
        //var reflRay = [x, array_minus(r_direction, array_scaled(n_tmp0, 2*array_dot(n_tmp0, r_direction))), [0, 0, 0]];
        var reflRay_0 = x;
        var reflRay_1 = [r_direction[0] - [n_tmp0[0]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[1]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[2]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2])][0], r_direction[1]-[n_tmp0[0]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[1]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[2]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2])][1], r_direction[2]-[n_tmp0[0]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[1]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2]), n_tmp0[2]*2*(n_tmp0[0]*r_direction[0] + n_tmp0[1]*r_direction[1] + n_tmp0[2]*r_direction[2])][2]];

        //var into = array_dot(n, nl) > 0;
        var into = (n_tmp0[0]*nl_tmp0[0] + n_tmp0[1]*nl_tmp0[1] + n_tmp0[2]*nl_tmp0[2]) > 0;
        var nc = 1; var nt = 1.5; var nnt = into ? nc/nt:nt/nc;
        var ddn = (r_direction[0]*nl_tmp0[0] + r_direction[1]*nl_tmp0[1] + r_direction[2]*nl_tmp0[2]); var cos2t;
        if((cos2t=1-nnt*nnt*(1-ddn*ddn)) < 0) {
         //r =reflRay;
         //r_origin = reflRay[0];
         //r_direction = reflRay[1];
         r_origin = reflRay_0;
         r_direction = reflRay_1;
         continue_flag4 = true;
         //continue;
        }
        if(!continue_flag4) {
         //var tdir = array_normalized(array_minus(array_scaled(r[1], nnt), array_scaled(n, (into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)))));
         //var tdir = array_normalized(array_minus(array_scaled(r_direction, nnt), array_scaled(n_tmp0, (into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)))));
         var tdir_tmp1 = [n_tmp0[0]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n_tmp0[1]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t)), n_tmp0[2]*(into?1:-1)*(ddn*nnt+Math.sqrt(cos2t))];
         var tdir_tmp2 = [r_direction[0]*nnt, r_direction[1]*nnt, r_direction[2]*nnt];
         var tdir_tmp3 = [tdir_tmp2[0] - tdir_tmp1[0], tdir_tmp2[1]-tdir_tmp1[1], tdir_tmp2[2]-tdir_tmp1[2]];
         var tdir = [tdir_tmp3[0]/Math.sqrt(tdir_tmp3[0]*tdir_tmp3[0] + tdir_tmp3[1]*tdir_tmp3[1] + tdir_tmp3[2]*tdir_tmp3[2]), tdir_tmp3[1]/Math.sqrt(tdir_tmp3[0]*tdir_tmp3[0] + tdir_tmp3[1]*tdir_tmp3[1] + tdir_tmp3[2]*tdir_tmp3[2]), tdir_tmp3[2]/Math.sqrt(tdir_tmp3[0]*tdir_tmp3[0] + tdir_tmp3[1]*tdir_tmp3[1] + tdir_tmp3[2]*tdir_tmp3[2])];

         var a = nt-nc; var b = nt+nc; var R0 = a*a/(b*b); var c = 1-(into?-ddn:(tdir[0]*n_tmp0[0] + tdir[1]*n_tmp0[1] + tdir[2]*n_tmp0[2]));
         var Re = R0+(1-R0)*c*c*c*c*c; var Tr = 1-Re; var P = 0.25+0.5*Re; var RP = Re/P; var TP = Tr/(1-P);
         if(Math.random() < P) {
          cf = [cf[0]*RP, cf[1]*RP, cf[2]*RP];
          //r = reflRay;
          //r_origin = reflRay[0];
          //r_direction = reflRay[1];
          r_origin = reflRay_0;
          r_direction = reflRay_1;
         }
         else {
          cf = [cf[0]*TP, cf[1]*TP, cf[2]*TP];
          //r = [x, tdir, [0, 0, 0]];
          r_origin = x;
          r_direction = tdir;
         }
        } //!continue_flag4
       } // !continue_flag3
       //continue;
      }
     } // !break_flag1
    } // while




    rad_result = [rad_result[0]*1/s, rad_result[1]*1/s, rad_result[2]*1/s];
    r_o = [(r_o)[0] + (rad_result)[0], (r_o)[1] + (rad_result)[1], (r_o)[2] + (rad_result)[2]];
    //console.log(r);
   }
   //sum = array_plus(sum, array_scaled(array_clamped(r_o), 0.25));
   r_o = [(r_o)[0]<0?0:((r_o)[0]>1?1:(r_o)[0]), (r_o)[1]<0?0:((r_o)[1]>1?1:(r_o)[1]), (r_o)[2]<0?0:((r_o)[2]>1?1:(r_o)[2])];
   sum = [(sum)[0] + ([r_o[0]*0.25, r_o[1]*0.25, r_o[2]*0.25])[0], (sum)[1] + ([r_o[0]*0.25, r_o[1]*0.25, r_o[2]*0.25])[1], (sum)[2] + ([r_o[0]*0.25, r_o[1]*0.25, r_o[2]*0.25])[2]];
  }
 }
 //console.log("Returning " + sum);
 return sum;
}



function render() {
 var canvas = document.getElementById('myCanvas');
 var canvas2 = document.getElementById('myCanvasZoomed');
 var context = canvas.getContext('2d');
 var context2 = canvas2.getContext('2d');
 var width = canvas.width;
 var height = canvas.height;

 var stretchX = canvas2.width / canvas.width;
 var stretchY = canvas2.height / canvas.height;
 context2.scale(stretchX, stretchY);

 var image = context.createImageData(width, height);
 var pix = image.data;
 console.log("width: ",width, "height :", height);


 /* Start of forward computation */
 var w = width, h = height;
 var samps = 10;
 var camera_origin = new Array(50, 52, 295.6);
 var camera_direction_raw = new Array(0, -0.042612, -1);
 var camera_direction = [camera_direction_raw[0]/Math.sqrt(camera_direction_raw[0]*camera_direction_raw[0] + camera_direction_raw[1]*camera_direction_raw[1] + camera_direction_raw[2]*camera_direction_raw[2]), camera_direction_raw[1]/Math.sqrt(camera_direction_raw[0]*camera_direction_raw[0] + camera_direction_raw[1]*camera_direction_raw[1] + camera_direction_raw[2]*camera_direction_raw[2]), camera_direction_raw[2]/Math.sqrt(camera_direction_raw[0]*camera_direction_raw[0] + camera_direction_raw[1]*camera_direction_raw[1] + camera_direction_raw[2]*camera_direction_raw[2])];
 var cam = new Array(camera_origin, camera_direction, [0,0,0]);
 var cx = new Array(w*0.5135/h, 0, 0);

 //var cy = array_scaled(array_normalized(cross_product(cx, cam[1])), 0.5135);
 var cy_tmp1 = [cx[1] * cam[1][2] - cx[2]*cam[1][1], cx[2] * cam[1][0] - cx[0]*cam[1][2], cx[0] * cam[1][1] - cx[1]*cam[1][0]];
 var cy_tmp2 = [cy_tmp1[0]/Math.sqrt(cy_tmp1[0]*cy_tmp1[0] + cy_tmp1[1]*cy_tmp1[1] + cy_tmp1[2]*cy_tmp1[2]), cy_tmp1[1]/Math.sqrt(cy_tmp1[0]*cy_tmp1[0] + cy_tmp1[1]*cy_tmp1[1] + cy_tmp1[2]*cy_tmp1[2]), cy_tmp1[2]/Math.sqrt(cy_tmp1[0]*cy_tmp1[0] + cy_tmp1[1]*cy_tmp1[1] + cy_tmp1[2]*cy_tmp1[2])];
 var cy = [cy_tmp2[0]*0.5135, cy_tmp2[1]*0.5135, cy_tmp2[2]*0.5135];


 var r = new Array(3);
 var c = new Array(w*h); // Is this correct ? Check it.
 for(var ci = 0; ci < c.length; ci++) {
  c[ci] = new Array(0,0,0);
 }
 var index = new Array(2);
 var canvasdim= new Array(2);
 canvasdim[0] = w;
 canvasdim[1] = h;
 var Xi = new Array(0,0,16);

 /*	

		for(var y = 0; y < h; y++) {

		for(var x = 0; x < w; x++) {

		index[0] = x; index[1] = y;

	//combine_kernel(index, samps, Xi, cx, cy, cam, c, canvasdim);

	//c[y*width+x] = array_plus(c[y*width+x], combine_kernel2(index, samps, cx, cy, cam, c, canvasdim));

	combine3(index, samps, cx, cy, cam, c, canvasdim);

	}

	}

	*/
 /*

	   for(var i = 0; i < c.length; i++) {

	//index[1] = Math.floor(i/w);

	//index[0] = i - index[1];

	index = i;

	c[i] = combine3(index, samps, cx, cy, cam, canvasdim);

	}

	*/
 var pararr = new ParallelArray(c);
 //var result = pararr.combine(combine_test12, test_array); 
 //console.log(result.join());
 //var result = pararr.combine(combine_test5, test_array); 
 //var result = pararr.combine(combine_test4, test_array); 
 //var result = pararr.combine(combine_test2, test_array); 
 //var result = pararr.combine(combine_test1, test_array); 
 var result = pararr.combine(combine3, samps, cx, cy, cam, canvasdim, spheres_cnt, spheres_rad, spheres_clr, spheres_ems, spheres_rfl );
 //var result = pararr.combineSeq(combine3, samps, cx, cy, cam, canvasdim ); 

 /*

	   var result = pararr.combine(combine3, samps, cx, cy, cam, canvasdim, spheres_cnt0, spheres_cnt1, spheres_cnt2, spheres_cnt3, spheres_cnt4, spheres_cnt5, spheres_cnt6, spheres_cnt7, spheres_cnt8,

	   spheres_rad,

	   spheres_clr0, spheres_clr1, spheres_clr2, spheres_clr3, spheres_clr4, spheres_clr5, spheres_clr6, spheres_clr7, spheres_clr8,

	   spheres_ems0, spheres_ems1, spheres_ems2, spheres_ems3, spheres_ems4, spheres_ems5, spheres_ems6, spheres_ems7, spheres_ems8,

	   spheres_rfl ); 

	   */
 //var result = pararr.combine(combine3, samps, cx, cy, cam, canvasdim); 

 // Output to canvas;
 //console.log("C length is: ", result.length, result.get(0).length);
 //console.log(c);
 /*

	   for(var k = 0 ; k < c.length; k++) {

	//console.log("Writing pixel at :", 4*k);

	pix[4*k] = 255*c[k][0];

	pix[4*k+1] = 255*c[k][1];

	pix[4*k+2] = 255*c[k][2];

	//pix[4*k+2] = 200;

	pix[4*k+3] = 255;

	}

	*/
 for(var k = 0 ; k < result.length; k++) {
  //console.log("Writing pixel at :", 4*k);
  pix[4*k] = 255*result.get([k, 0]);
  pix[4*k+1] = 255*result.get([k, 1]);
  pix[4*k+2] = 255 * result.get([k, 2]);
  //pix[4*k+2] = 200;
  pix[4*k+3] = 255;
 }


 context.putImageData(image, 0, 0);
 context2.drawImage(canvas, 0, 0);

 /*

	   for (var x0 = 0; x0 < width; x0++) {

	   for (var y0 = 0; y0 < height; y0++) {

	   offset = y0*width+x0;

	   var pix_off = offset;

	   offset *=4;

	   pix[offset] = c[pix_off][0];

	   pix[offset+1] = c[pix_off][1];

	   pix[offset+2] = c[pix_off][2];

	   pix[offset+3] = 255;

	   }

	   }

	   */
 /*

	   for (var x0 = 0; x0 < width; x0++) {

	   for (var y0 = 0; y0 < height; y0++) {

	   offset = y0*width+x0;

	   offset *=4;

	   pix[offset] = 0;

	   pix[offset+1] = 0;

	   pix[offset+2] = 255;

	   pix[offset+3] = 255;

	   }

	   }

	   context.putImageData(image, 0, 0);

	   */
}
