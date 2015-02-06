function SpecializeConst(n) {
  var a=new Array(n+1);
  for (var i=0;i<n+1;i++) { a[i]=0; }
  return a;
}
function GetSpecializedConst(c) { return c.length-1; }

function IndexInPABounds(p,ind) {
  var inBounds=true;
  var dim=p.getShape();
  for (var i=0;i<ind.length;i++) {
    if (ind[i]<0||ind[i]>=dim[i]) { inBounds=false; }
  }
  return inBounds;
}
